import { json, sanitizeText } from './security.js';

const REFERRAL_GOAL = 3;
const PAID_STATUSES = new Set(['paid', 'succeeded', 'complete', 'completed', 'no_payment_required']);

export function normalizeReferralCode(value) {
  return String(value || '')
    .toUpperCase()
    .replace(/^NEPTUNE[-_:]?REF[-_:]?/u, '')
    .replace(/[^A-Z0-9]/gu, '')
    .slice(0, 18);
}

export function ensureReferralCode(store, client) {
  if (!client?.id) return '';
  const existing = store.sql.exec(
    'SELECT code FROM portal_referral_codes WHERE client_id=? LIMIT 1',
    client.id,
  ).toArray()[0];
  if (existing?.code) return existing.code;

  const seed = String(client.email || client.id || 'NEPTUNE');
  const initials = String(client.fullName || client.full_name || 'NP')
    .split(/\s+/u)
    .filter(Boolean)
    .map((part) => part[0])
    .join('')
    .slice(0, 2)
    .toUpperCase()
    .padEnd(2, 'N');
  const base = fnv(seed).toString(36).toUpperCase().padStart(6, '0').slice(0, 6);
  let code = `${initials}${base}`;
  let suffix = 0;
  while (store.sql.exec('SELECT client_id AS clientId FROM portal_referral_codes WHERE code=? LIMIT 1', code).toArray()[0]) {
    suffix += 1;
    code = `${initials}${base.slice(0, 4)}${suffix.toString(36).toUpperCase().padStart(2, '0')}`;
  }
  store.sql.exec(
    'INSERT INTO portal_referral_codes (client_id,code,created_at) VALUES (?,?,?)',
    client.id,
    code,
    new Date().toISOString(),
  );
  return code;
}

export function referralSummary(store, client) {
  const code = ensureReferralCode(store, client);
  const count = Number(store.sql.exec(
    "SELECT COUNT(*) AS count FROM portal_referrals WHERE referrer_client_id=? AND status='effective'",
    client.id,
  ).one().count || 0);
  const reward = store.sql.exec(
    'SELECT status,unlocked_at AS unlockedAt,claimed_at AS claimedAt FROM portal_referral_rewards WHERE client_id=? LIMIT 1',
    client.id,
  ).toArray()[0] || null;
  return {
    code,
    confirmedCount: count,
    goal: REFERRAL_GOAL,
    remaining: Math.max(0, REFERRAL_GOAL - count),
    rewardUnlocked: count >= REFERRAL_GOAL || Boolean(reward),
    rewardStatus: reward?.status || (count >= REFERRAL_GOAL ? 'unlocked' : 'locked'),
    unlockedAt: reward?.unlockedAt || null,
  };
}

export function registerEffectiveReferral(store, body = {}) {
  const orderId = sanitizeText(body.orderId, 100);
  const referredClientId = sanitizeText(body.referredClientId, 100);
  const code = normalizeReferralCode(body.referralCode);
  const paymentStatus = String(body.paymentStatus || 'paid').toLowerCase();
  if (!orderId || !referredClientId || !code || !PAID_STATUSES.has(paymentStatus)) {
    return json({ ok: true, effective: false, reason: 'not_eligible' });
  }

  const referrer = store.sql.exec(
    `SELECT c.id,c.email,c.full_name AS fullName,c.company
     FROM portal_referral_codes r JOIN portal_clients c ON c.id=r.client_id
     WHERE r.code=? AND c.active=1 LIMIT 1`,
    code,
  ).toArray()[0];
  if (!referrer || referrer.id === referredClientId) {
    return json({ ok: true, effective: false, reason: referrer ? 'self_referral' : 'unknown_code' });
  }

  const already = store.sql.exec(
    'SELECT id FROM portal_referrals WHERE order_id=? OR referred_client_id=? LIMIT 1',
    orderId,
    referredClientId,
  ).toArray()[0];
  if (already) return json({ ok: true, effective: true, created: false });

  const now = new Date().toISOString();
  store.sql.exec(
    `INSERT INTO portal_referrals
     (id,referrer_client_id,referred_client_id,order_id,referral_code,status,created_at)
     VALUES (?,?,?,?,?,'effective',?)`,
    crypto.randomUUID(),
    referrer.id,
    referredClientId,
    orderId,
    code,
    now,
  );

  const summary = referralSummary(store, referrer);
  let newlyUnlocked = false;
  if (summary.confirmedCount >= REFERRAL_GOAL) {
    const existingReward = store.sql.exec(
      'SELECT id FROM portal_referral_rewards WHERE client_id=? LIMIT 1',
      referrer.id,
    ).toArray()[0];
    if (!existingReward) {
      newlyUnlocked = true;
      store.sql.exec(
        `INSERT INTO portal_referral_rewards
         (id,client_id,threshold,status,unlocked_at,claimed_at)
         VALUES (?,?,?,'unlocked',?,NULL)`,
        crypto.randomUUID(),
        referrer.id,
        REFERRAL_GOAL,
        now,
      );
    }
  }

  return json({
    ok: true,
    effective: true,
    created: true,
    newlyUnlocked,
    referrerEmail: referrer.email,
    referrerName: referrer.fullName,
    referrerCompany: referrer.company,
    confirmedCount: summary.confirmedCount,
    goal: REFERRAL_GOAL,
  });
}

export function adminReferralList(store) {
  const referrals = store.sql.exec(
    `SELECT r.order_id AS orderId,r.referral_code AS referralCode,r.created_at AS createdAt,
            ref.id AS referrerClientId,ref.email AS referrerEmail,ref.full_name AS referrerName,ref.company AS referrerCompany,
            referred.id AS referredClientId,referred.email AS referredEmail,referred.full_name AS referredName,referred.company AS referredCompany
     FROM portal_referrals r
     JOIN portal_clients ref ON ref.id=r.referrer_client_id
     JOIN portal_clients referred ON referred.id=r.referred_client_id
     WHERE r.status='effective' ORDER BY r.created_at DESC`,
  ).toArray().map((row) => ({
    ...row,
    productionCue: `Intégrer dans la vidéo long format une mise en avant de remerciement pour ${row.referrerName || row.referrerCompany || 'la personne ayant recommandé ce client'}.`,
  }));
  const rewards = store.sql.exec(
    `SELECT w.client_id AS clientId,w.status,w.unlocked_at AS unlockedAt,w.claimed_at AS claimedAt,
            c.email,c.full_name AS fullName,c.company
     FROM portal_referral_rewards w JOIN portal_clients c ON c.id=w.client_id
     ORDER BY w.unlocked_at DESC`,
  ).toArray();
  return json({ ok: true, referrals, rewards });
}

function fnv(value) {
  let hash = 2166136261;
  for (const character of String(value || '')) {
    hash ^= character.charCodeAt(0);
    hash = Math.imul(hash, 16777619);
  }
  return Math.abs(hash);
}
