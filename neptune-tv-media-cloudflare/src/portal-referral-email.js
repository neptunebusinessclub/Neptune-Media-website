const GOAL = 3;

export async function sendReferralConfirmed(env, requestUrl, email, payload = {}) {
  if (!env.RESEND_API_KEY) return { ok: false, error: 'email_service_not_configured' };
  const count = Math.max(1, Number(payload.confirmedCount || 1));
  const remaining = Math.max(0, GOAL - count);
  const portal = new URL('/espace-client/', new URL(requestUrl).origin).toString();
  const unlocked = Boolean(payload.newlyUnlocked || count >= GOAL);
  const subject = unlocked
    ? 'Objectif atteint · votre émission au prix coûtant est débloquée'
    : `Recommandation confirmée · ${count}/3`;
  const progress = [1, 2, 3].map((step) => `<span style="display:inline-flex;width:42px;height:42px;margin-right:8px;align-items:center;justify-content:center;border-radius:50%;background:${step <= count ? '#5b4df7' : '#edf0f7'};color:${step <= count ? '#fff' : '#68718b'};font-weight:800">${step}</span>`).join('');
  const html = `<div style="font-family:Arial,sans-serif;max-width:620px;margin:auto;padding:34px;color:#121326">
    <p style="letter-spacing:.16em;color:#6d55e8;font-weight:700">NEPTUNE MEDIA</p>
    <h1>${unlocked ? 'Votre avantage est débloqué' : 'Une recommandation vient d’être confirmée'}</h1>
    <p>Une personne passée par votre lien a réservé et son paiement a été validé.</p>
    <p><strong>Votre mise en avant est maintenant prévue dans sa vidéo long format</strong>, sous la forme d’un remerciement pour votre recommandation.</p>
    <div style="margin:24px 0;padding:22px;border-radius:18px;background:#f4f2ff">
      <p style="margin:0 0 14px;color:#6658a8;font-size:12px;font-weight:800;letter-spacing:.12em">OBJECTIF 3 RECOMMANDATIONS</p>
      <div>${progress}</div>
      <p style="margin:15px 0 0;font-weight:800">${unlocked ? '3 recommandations atteintes : une émission au choix au prix coûtant.' : `${remaining} recommandation${remaining > 1 ? 's' : ''} avant votre émission au prix coûtant.`}</p>
    </div>
    <p><a href="${portal}" style="display:inline-block;padding:14px 22px;border-radius:999px;background:linear-gradient(120deg,#4267ff,#8d4cff,#ef4ba2);color:#fff;text-decoration:none;font-weight:700">Voir ma progression</a></p>
    <p style="color:#68718b;font-size:13px">Une recommandation est comptabilisée une seule fois, après réservation confirmée et paiement validé.</p>
  </div>`;
  const text = unlocked
    ? `Objectif atteint : votre émission au choix au prix coûtant est débloquée. Votre mise en avant est prévue dans la vidéo long format de la personne recommandée. ${portal}`
    : `Recommandation confirmée : ${count}/3. Votre mise en avant est prévue dans la vidéo long format de la personne recommandée. Plus que ${remaining} avant votre émission au prix coûtant. ${portal}`;
  const response = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { Authorization: `Bearer ${env.RESEND_API_KEY}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      from: env.AUTH_FROM_EMAIL || 'Neptune Media <onboarding@resend.dev>',
      to: [email],
      subject,
      html,
      text,
    }),
  });
  const result = await response.json().catch(() => ({}));
  if (!response.ok || !result.id) {
    console.error('referral_email_failed', { status: response.status, message: result.message || '', to: email });
    return { ok: false, error: 'email_send_failed' };
  }
  return { ok: true, id: result.id };
}
