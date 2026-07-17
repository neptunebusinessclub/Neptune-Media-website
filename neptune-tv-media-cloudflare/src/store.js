import {
  hashPassword,
  json,
  randomToken,
  sanitizeText,
  sanitizeUrl,
  sha256,
  verifyPassword,
} from './security.js';

const SESSION_TTL_SECONDS = 12 * 60 * 60;
const RESET_TTL_SECONDS = 20 * 60;
const STUDIO_EMAIL = 'contact@neptunebusiness.com';
const ROLES = ['admin', 'editor', 'analyst', 'advertiser'];
const EPISODE_STATUSES = ['draft', 'scheduled', 'published', 'archived'];
const AD_PLACEMENTS = ['preroll', 'midroll', 'postroll', 'banner'];
const TRACK_EVENTS = [
  'impression', 'view', 'play', 'watch', 'pause',
  'progress_25', 'progress_50', 'progress_75', 'complete',
  'share', 'booking_click',
];

export class StudioStore {
  constructor(ctx, env) {
    this.ctx = ctx;
    this.env = env;
    this.sql = ctx.storage.sql;
    this.ctx.blockConcurrencyWhile(async () => {
      this.createSchema();
      this.seedCatalog();
    });
  }

  createSchema() {
    this.sql.exec(`
      PRAGMA foreign_keys = ON;
      CREATE TABLE IF NOT EXISTS meta (
        key TEXT PRIMARY KEY,
        value TEXT NOT NULL
      );
      CREATE TABLE IF NOT EXISTS users (
        id TEXT PRIMARY KEY,
        email TEXT NOT NULL UNIQUE,
        full_name TEXT NOT NULL DEFAULT '',
        role TEXT NOT NULL CHECK(role IN ('admin','editor','analyst','advertiser')),
        password_hash TEXT NOT NULL,
        password_salt TEXT NOT NULL,
        password_iterations INTEGER NOT NULL,
        active INTEGER NOT NULL DEFAULT 1,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL,
        last_login_at TEXT
      );
      CREATE TABLE IF NOT EXISTS sessions (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        token_hash TEXT NOT NULL UNIQUE,
        csrf_token TEXT NOT NULL,
        expires_at TEXT NOT NULL,
        created_at TEXT NOT NULL,
        last_seen_at TEXT NOT NULL
      );
      CREATE INDEX IF NOT EXISTS idx_sessions_token_hash ON sessions(token_hash);
      CREATE INDEX IF NOT EXISTS idx_sessions_expires_at ON sessions(expires_at);
      CREATE TABLE IF NOT EXISTS programs (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        slug TEXT NOT NULL UNIQUE,
        description TEXT NOT NULL DEFAULT '',
        cover_url TEXT NOT NULL DEFAULT '',
        display_order INTEGER NOT NULL DEFAULT 100,
        active INTEGER NOT NULL DEFAULT 1,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
      );
      CREATE TABLE IF NOT EXISTS episodes (
        id TEXT PRIMARY KEY,
        program_id TEXT NOT NULL REFERENCES programs(id),
        title TEXT NOT NULL,
        slug TEXT NOT NULL UNIQUE,
        description TEXT NOT NULL DEFAULT '',
        video_url TEXT NOT NULL,
        poster_url TEXT NOT NULL DEFAULT '',
        duration_seconds INTEGER NOT NULL DEFAULT 0,
        status TEXT NOT NULL CHECK(status IN ('draft','scheduled','published','archived')),
        display_order INTEGER NOT NULL DEFAULT 100,
        published_at TEXT,
        scheduled_at TEXT,
        metadata TEXT NOT NULL DEFAULT '{}',
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
      );
      CREATE INDEX IF NOT EXISTS idx_episodes_public ON episodes(status, display_order);
      CREATE INDEX IF NOT EXISTS idx_episodes_program ON episodes(program_id, display_order);
      CREATE TABLE IF NOT EXISTS ads (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        advertiser_name TEXT NOT NULL DEFAULT '',
        placement TEXT NOT NULL CHECK(placement IN ('preroll','midroll','postroll','banner')),
        asset_url TEXT NOT NULL DEFAULT '',
        asset_type TEXT NOT NULL DEFAULT 'video' CHECK(asset_type IN ('video','image')),
        click_url TEXT NOT NULL DEFAULT '',
        start_at TEXT,
        end_at TEXT,
        frequency_cap INTEGER NOT NULL DEFAULT 3,
        active INTEGER NOT NULL DEFAULT 0,
        targeting TEXT NOT NULL DEFAULT '{}',
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
      );
      CREATE TABLE IF NOT EXISTS video_events (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        episode_id TEXT,
        session_id TEXT NOT NULL,
        event_name TEXT NOT NULL,
        position_seconds REAL NOT NULL DEFAULT 0,
        watch_delta_seconds REAL NOT NULL DEFAULT 0,
        referrer TEXT NOT NULL DEFAULT '',
        device TEXT NOT NULL DEFAULT '{}',
        occurred_at TEXT NOT NULL,
        day TEXT NOT NULL
      );
      CREATE INDEX IF NOT EXISTS idx_video_events_day ON video_events(day, event_name);
      CREATE INDEX IF NOT EXISTS idx_video_events_episode ON video_events(episode_id, event_name, occurred_at);
      CREATE INDEX IF NOT EXISTS idx_video_events_session ON video_events(session_id, episode_id, event_name);
      CREATE TABLE IF NOT EXISTS ad_events (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        ad_id TEXT NOT NULL,
        episode_id TEXT,
        session_id TEXT NOT NULL,
        event_name TEXT NOT NULL,
        occurred_at TEXT NOT NULL,
        day TEXT NOT NULL
      );
      CREATE INDEX IF NOT EXISTS idx_ad_events_ad ON ad_events(ad_id, event_name, occurred_at);
      CREATE TABLE IF NOT EXISTS conversions (
        id TEXT PRIMARY KEY,
        session_id TEXT,
        episode_id TEXT,
        format TEXT NOT NULL DEFAULT '',
        external_id TEXT NOT NULL DEFAULT '',
        amount_cents INTEGER,
        currency TEXT NOT NULL DEFAULT 'EUR',
        status TEXT NOT NULL DEFAULT 'created',
        occurred_at TEXT NOT NULL
      );
      CREATE TABLE IF NOT EXISTS ai_actions (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL,
        prompt TEXT NOT NULL,
        plan TEXT NOT NULL,
        status TEXT NOT NULL DEFAULT 'proposed',
        created_at TEXT NOT NULL,
        executed_at TEXT
      );
      CREATE TABLE IF NOT EXISTS audit_log (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id TEXT,
        action TEXT NOT NULL,
        entity_type TEXT NOT NULL DEFAULT '',
        entity_id TEXT NOT NULL DEFAULT '',
        details TEXT NOT NULL DEFAULT '{}',
        occurred_at TEXT NOT NULL
      );
      CREATE INDEX IF NOT EXISTS idx_audit_time ON audit_log(occurred_at DESC);
      CREATE TABLE IF NOT EXISTS login_attempts (
        key TEXT PRIMARY KEY,
        count INTEGER NOT NULL,
        first_at TEXT NOT NULL,
        last_at TEXT NOT NULL
      );
      CREATE TABLE IF NOT EXISTS password_resets (
        id TEXT PRIMARY KEY,
        email TEXT NOT NULL,
        token_hash TEXT NOT NULL UNIQUE,
        expires_at TEXT NOT NULL,
        created_at TEXT NOT NULL,
        used_at TEXT
      );
      CREATE INDEX IF NOT EXISTS idx_password_resets_token ON password_resets(token_hash);
      CREATE INDEX IF NOT EXISTS idx_password_resets_expiry ON password_resets(expires_at);
    `);
  }

  seedCatalog() {
    const existing = this.sql.exec('SELECT COUNT(*) AS count FROM programs').one();
    if (Number(existing.count) > 0) return;
    const now = new Date().toISOString();
    this.sql.exec(
      `INSERT INTO programs (id,name,slug,description,cover_url,display_order,active,created_at,updated_at)
       VALUES (?,?,?,?,?,?,?,?,?),(?,?,?,?,?,?,?,?,?)`,
      'hors-norme', 'Hors Norme', 'hors-norme',
      'Des trajectoires, des ruptures et des déclics qui changent une vie.',
      '/assets/posters/hors-norme-wide.webp', 10, 1, now, now,
      'concept-libre', 'Concept Libre', 'concept-libre',
      'Une parole directe, utile et incarnée, sans formatage corporate.',
      '/assets/posters/concept-libre-wide.webp', 20, 1, now, now,
    );
    const episodes = [
      ['entrepreneuriat-mis-en-lumiere','concept-libre','Votre entrepreneuriat mis en lumière','entrepreneuriat-mis-en-lumiere','Pourquoi une parole entrepreneuriale bien produite change la perception d’une expertise.','/assets/media/neptune-media-mis-en-lumiere.mp4','/assets/posters/poster-neptune-media.webp',44,'published',10],
      ['accident-moto-fin-entreprise','hors-norme','Un accident de moto met fin à son entreprise','accident-moto-fin-entreprise','Un récit de rupture, d’arrêt forcé et de reconstruction.','/assets/media/accident-moto-entreprise.mp4','/assets/posters/poster-accident.webp',20,'published',20],
      ['storytelling-efficace','hors-norme','Le secret d’un storytelling efficace','storytelling-efficace','Retrouver la scène, le vécu et le déclic derrière une activité.','/assets/media/storytelling-efficace.mp4','/assets/posters/poster-storytelling.webp',19,'published',30],
      ['humain-avant-business','concept-libre','L’humain avant le business','humain-avant-business','La collaboration, la confiance et la valeur avant la transaction.','/assets/media/humain-avant-business.mp4','/assets/posters/poster-humain.webp',19,'published',40],
      ['solution-video-professionnelle','concept-libre','Filmer chez soi ? Laissez tomber.','solution-video-professionnelle','Pourquoi un dispositif professionnel change la qualité, la crédibilité et l’impact.','/assets/media/solution-video-pro.mp4','/assets/posters/poster-video-pro.webp',57,'published',50],
    ];
    for (const row of episodes) {
      this.sql.exec(
        `INSERT INTO episodes
         (id,program_id,title,slug,description,video_url,poster_url,duration_seconds,status,display_order,published_at,scheduled_at,metadata,created_at,updated_at)
         VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
        ...row, now, null, '{}', now, now,
      );
    }
    this.sql.exec('INSERT OR REPLACE INTO meta (key,value) VALUES (?,?)', 'schema_version', '2');
  }

  async fetch(request) {
    const url = new URL(request.url);
    const method = request.method.toUpperCase();
    const body = method === 'GET' ? {} : await request.json().catch(() => ({}));

    if (url.pathname === '/public/catalog') return this.publicCatalog();
    if (url.pathname === '/public/track' && method === 'POST') return this.track(body);
    if (url.pathname === '/public/ad-track' && method === 'POST') return this.trackAd(body);
    if (url.pathname === '/auth/bootstrap' && method === 'POST') return this.bootstrap(body);
    if (url.pathname === '/auth/request-reset' && method === 'POST') return this.requestPasswordReset(body);
    if (url.pathname === '/auth/reset-password' && method === 'POST') return this.resetPassword(body);
    if (url.pathname === '/auth/login' && method === 'POST') return this.login(body);
    if (url.pathname === '/auth/session' && method === 'POST') return this.session(body);
    if (url.pathname === '/auth/logout' && method === 'POST') return this.logout(body);
    if (url.pathname === '/admin/state' && method === 'POST') return this.adminState(body);
    if (url.pathname === '/admin/apply' && method === 'POST') return this.apply(body);
    if (url.pathname === '/admin/ai-context' && method === 'POST') return this.aiContext(body);
    if (url.pathname === '/admin/ai-log' && method === 'POST') return this.aiLog(body);
    if (url.pathname === '/webhook/conversion' && method === 'POST') return this.recordConversion(body);
    return json({ error: 'not_found' }, 404);
  }

  publicCatalog() {
    const now = new Date().toISOString();
    const programs = this.sql.exec(
      `SELECT id,name,slug,description,cover_url AS coverUrl,display_order AS displayOrder
       FROM programs WHERE active=1 ORDER BY display_order ASC`,
    ).toArray();
    const episodes = this.sql.exec(
      `SELECT id,program_id AS programId,title,slug,description,video_url AS videoUrl,
              poster_url AS posterUrl,duration_seconds AS durationSeconds,status,
              display_order AS displayOrder,published_at AS publishedAt,metadata
       FROM episodes
       WHERE status='published' AND (published_at IS NULL OR published_at<=?)
       ORDER BY display_order ASC`,
      now,
    ).toArray().map((row) => ({ ...row, metadata: parseJson(row.metadata) }));
    const ads = this.sql.exec(
      `SELECT id,name,advertiser_name AS advertiserName,placement,asset_url AS assetUrl,
              asset_type AS assetType,click_url AS clickUrl,frequency_cap AS frequencyCap,targeting
       FROM ads
       WHERE active=1 AND (start_at IS NULL OR start_at<=?) AND (end_at IS NULL OR end_at>=?)
       ORDER BY created_at DESC`,
      now, now,
    ).toArray().map((row) => ({ ...row, targeting: parseJson(row.targeting) }));
    return json({ programs, episodes, ads }, 200, { 'Cache-Control': 'public, max-age=30' });
  }

  async bootstrap(body) {
    const count = this.sql.exec('SELECT COUNT(*) AS count FROM users').one();
    if (Number(count.count) > 0) return json({ error: 'already_initialized' }, 409);
    if (!this.env.BOOTSTRAP_TOKEN || body.token !== this.env.BOOTSTRAP_TOKEN) {
      return json({ error: 'invalid_bootstrap_token' }, 403);
    }
    const email = normalizeEmail(body.email);
    const password = String(body.password ?? '');
    if (!email || password.length < 12) return json({ error: 'invalid_credentials' }, 400);
    const id = crypto.randomUUID();
    const now = new Date().toISOString();
    const passwordData = await hashPassword(password);
    this.sql.exec(
      `INSERT INTO users
       (id,email,full_name,role,password_hash,password_salt,password_iterations,active,created_at,updated_at)
       VALUES (?,?,?,?,?,?,?,?,?,?)`,
      id, email, sanitizeText(body.fullName, 120), 'admin', passwordData.hash,
      passwordData.salt, passwordData.iterations, 1, now, now,
    );
    this.audit(id, 'bootstrap_admin', 'user', id, { email });
    return json({ ok: true });
  }

  async requestPasswordReset(body) {
    const email = normalizeEmail(body.email);
    if (email !== STUDIO_EMAIL) return json({ ok: true });
    const rawToken = randomToken(32);
    const tokenHash = await sha256(rawToken);
    const now = new Date();
    const expiresAt = new Date(now.getTime() + RESET_TTL_SECONDS * 1000).toISOString();
    this.sql.exec('DELETE FROM password_resets WHERE email=? OR expires_at<? OR used_at IS NOT NULL', email, now.toISOString());
    this.sql.exec(
      `INSERT INTO password_resets (id,email,token_hash,expires_at,created_at,used_at)
       VALUES (?,?,?,?,?,NULL)`,
      crypto.randomUUID(), email, tokenHash, expiresAt, now.toISOString(),
    );
    return json({ ok: true, token: rawToken, expiresIn: RESET_TTL_SECONDS });
  }

  async resetPassword(body) {
    const token = String(body.token || '');
    const password = String(body.password || '');
    if (token.length < 20 || password.length < 12) return json({ error: 'invalid_reset' }, 400);
    const tokenHash = await sha256(token);
    const now = new Date().toISOString();
    const reset = this.sql.exec(
      `SELECT id,email FROM password_resets
       WHERE token_hash=? AND used_at IS NULL AND expires_at>?`,
      tokenHash, now,
    ).toArray()[0];
    if (!reset || reset.email !== STUDIO_EMAIL) return json({ error: 'invalid_or_expired_reset' }, 400);
    const passwordData = await hashPassword(password);
    let user = this.sql.exec('SELECT id FROM users WHERE email=?', STUDIO_EMAIL).toArray()[0];
    if (!user) {
      user = { id: crypto.randomUUID() };
      this.sql.exec(
        `INSERT INTO users
         (id,email,full_name,role,password_hash,password_salt,password_iterations,active,created_at,updated_at)
         VALUES (?,?,?,?,?,?,?,?,?,?)`,
        user.id, STUDIO_EMAIL, 'Neptune Media', 'admin', passwordData.hash,
        passwordData.salt, passwordData.iterations, 1, now, now,
      );
      this.audit(user.id, 'first_login_password_created', 'user', user.id, { email: STUDIO_EMAIL });
    } else {
      this.sql.exec(
        `UPDATE users SET password_hash=?,password_salt=?,password_iterations=?,active=1,updated_at=? WHERE id=?`,
        passwordData.hash, passwordData.salt, passwordData.iterations, now, user.id,
      );
      this.audit(user.id, 'password_reset', 'user', user.id, {});
    }
    this.sql.exec('UPDATE password_resets SET used_at=? WHERE id=?', now, reset.id);
    this.sql.exec('DELETE FROM sessions WHERE user_id=?', user.id);
    return json({ ok: true });
  }

  async login(body) {
    const email = normalizeEmail(body.email);
    const password = String(body.password ?? '');
    const attemptKey = sanitizeText(body.attemptKey, 180) || 'unknown';
    if (this.isLoginBlocked(attemptKey)) return json({ error: 'too_many_attempts' }, 429);
    const user = this.sql.exec(
      `SELECT id,email,full_name,role,password_hash AS hash,password_salt AS salt,
              password_iterations AS iterations,active
       FROM users WHERE email=?`,
      email,
    ).toArray()[0];
    const ok = user && Number(user.active) === 1 && await verifyPassword(password, user);
    if (!ok) {
      this.recordLoginFailure(attemptKey);
      return json({ error: 'invalid_credentials' }, 401);
    }
    this.sql.exec('DELETE FROM login_attempts WHERE key=?', attemptKey);
    const rawToken = randomToken(32);
    const csrfToken = randomToken(24);
    const tokenHash = await sha256(rawToken);
    const now = new Date();
    const expiresAt = new Date(now.getTime() + SESSION_TTL_SECONDS * 1000).toISOString();
    const sessionId = crypto.randomUUID();
    this.sql.exec(
      `INSERT INTO sessions (id,user_id,token_hash,csrf_token,expires_at,created_at,last_seen_at)
       VALUES (?,?,?,?,?,?,?)`,
      sessionId, user.id, tokenHash, csrfToken, expiresAt, now.toISOString(), now.toISOString(),
    );
    this.sql.exec('UPDATE users SET last_login_at=?,updated_at=? WHERE id=?', now.toISOString(), now.toISOString(), user.id);
    this.cleanupExpiredSessions();
    this.audit(user.id, 'login', 'session', sessionId, {});
    return json({
      ok: true,
      token: rawToken,
      csrfToken,
      expiresIn: SESSION_TTL_SECONDS,
      user: publicUser(user),
    });
  }

  async session(body) {
    const session = await this.requireSession(body.token);
    if (!session) return json({ authenticated: false }, 401);
    const now = new Date().toISOString();
    this.sql.exec('UPDATE sessions SET last_seen_at=? WHERE id=?', now, session.sessionId);
    return json({ authenticated: true, csrfToken: session.csrfToken, user: publicUser(session) });
  }

  async logout(body) {
    if (body.token) {
      const tokenHash = await sha256(body.token);
      this.sql.exec('DELETE FROM sessions WHERE token_hash=?', tokenHash);
    }
    return json({ ok: true });
  }

  async adminState(body) {
    const actor = await this.requireSession(body.token);
    if (!actor) return json({ error: 'unauthorized' }, 401);
    const programs = this.sql.exec(
      `SELECT id,name,slug,description,cover_url AS coverUrl,display_order AS displayOrder,active
       FROM programs ORDER BY display_order ASC`,
    ).toArray().map(booleanize('active'));
    const episodes = this.sql.exec(
      `SELECT id,program_id AS programId,title,slug,description,video_url AS videoUrl,
              poster_url AS posterUrl,duration_seconds AS durationSeconds,status,
              display_order AS displayOrder,published_at AS publishedAt,scheduled_at AS scheduledAt,
              metadata,created_at AS createdAt,updated_at AS updatedAt
       FROM episodes ORDER BY display_order ASC`,
    ).toArray().map((row) => ({ ...row, metadata: parseJson(row.metadata) }));
    const ads = this.sql.exec(
      `SELECT id,name,advertiser_name AS advertiserName,placement,asset_url AS assetUrl,
              asset_type AS assetType,click_url AS clickUrl,start_at AS startAt,end_at AS endAt,
              frequency_cap AS frequencyCap,active,targeting,created_at AS createdAt,updated_at AS updatedAt
       FROM ads ORDER BY created_at DESC`,
    ).toArray().map((row) => ({ ...booleanize('active')(row), targeting: parseJson(row.targeting) }));
    const users = actor.role === 'admin' ? this.sql.exec(
      `SELECT id,email,full_name AS fullName,role,active,created_at AS createdAt,last_login_at AS lastLoginAt
       FROM users ORDER BY created_at ASC`,
    ).toArray().map(booleanize('active')) : [];
    return json({
      user: publicUser(actor),
      programs,
      episodes,
      ads,
      users,
      stats: this.getStats(),
      audit: this.sql.exec(
        `SELECT id,user_id AS userId,action,entity_type AS entityType,entity_id AS entityId,
                details,occurred_at AS occurredAt
         FROM audit_log ORDER BY occurred_at DESC LIMIT 150`,
      ).toArray().map((row) => ({ ...row, details: parseJson(row.details) })),
    });
  }

  async apply(body) {
    const actor = await this.requireSession(body.token);
    if (!actor) return json({ error: 'unauthorized' }, 401);
    if (body.csrfToken !== actor.csrfToken) return json({ error: 'csrf_failed' }, 403);
    const action = sanitizeText(body.action, 80);
    const payload = body.payload && typeof body.payload === 'object' ? body.payload : {};
    const allowed = permissionsFor(actor.role);
    if (!allowed.has(action)) return json({ error: 'forbidden' }, 403);

    try {
      if (action === 'save_program') this.saveProgram(actor, payload);
      else if (action === 'delete_program') this.deleteProgram(actor, payload);
      else if (action === 'save_episode') this.saveEpisode(actor, payload);
      else if (action === 'delete_episode') this.deleteEpisode(actor, payload);
      else if (action === 'reorder_episodes') this.reorderEpisodes(actor, payload);
      else if (action === 'save_ad') this.saveAd(actor, payload);
      else if (action === 'delete_ad') this.deleteAd(actor, payload);
      else if (action === 'save_user') await this.saveUser(actor, payload);
      else if (action === 'delete_user') this.deleteUser(actor, payload);
      else if (action === 'change_password') await this.changePassword(actor, payload);
      else if (action === 'mark_ai_action') this.markAiAction(actor, payload);
      else return json({ error: 'unknown_action' }, 400);
      return json({ ok: true });
    } catch (error) {
      return json({ error: error.message || 'operation_failed' }, 400);
    }
  }

  async aiContext(body) {
    const actor = await this.requireSession(body.token);
    if (!actor) return json({ error: 'unauthorized' }, 401);
    if (body.csrfToken !== actor.csrfToken) return json({ error: 'csrf_failed' }, 403);
    return json({
      actor: publicUser(actor),
      episodes: this.sql.exec(
        `SELECT id,title,program_id AS programId,status,display_order AS displayOrder,duration_seconds AS durationSeconds
         FROM episodes ORDER BY display_order ASC`,
      ).toArray(),
      ads: this.sql.exec(
        `SELECT id,name,placement,active,start_at AS startAt,end_at AS endAt FROM ads ORDER BY created_at DESC`,
      ).toArray().map(booleanize('active')),
      stats: this.getStats(),
    });
  }

  async aiLog(body) {
    const actor = await this.requireSession(body.token);
    if (!actor) return json({ error: 'unauthorized' }, 401);
    if (body.csrfToken !== actor.csrfToken) return json({ error: 'csrf_failed' }, 403);
    const id = crypto.randomUUID();
    this.sql.exec(
      `INSERT INTO ai_actions (id,user_id,prompt,plan,status,created_at)
       VALUES (?,?,?,?,?,?)`,
      id, actor.id, sanitizeText(body.prompt, 3000), JSON.stringify(body.plan ?? {}), 'proposed', new Date().toISOString(),
    );
    this.audit(actor.id, 'ai_plan_created', 'ai_action', id, {});
    return json({ ok: true, id });
  }

  async track(body) {
    const event = sanitizeText(body.event, 40);
    const sessionId = sanitizeText(body.sessionId, 100);
    const episodeId = sanitizeText(body.episodeId, 100);
    if (!TRACK_EVENTS.includes(event) || !sessionId || !episodeId) return json({ error: 'invalid_event' }, 400);
    const exists = this.sql.exec('SELECT id FROM episodes WHERE id=?', episodeId).toArray()[0];
    if (!exists) return json({ error: 'episode_not_found' }, 404);
    const now = new Date();
    const position = clampNumber(body.position, 0, 86400);
    const watchDelta = event === 'watch' ? clampNumber(body.delta, 0, 20) : 0;
    const uniqueEvents = ['view', 'progress_25', 'progress_50', 'progress_75', 'complete'];
    if (uniqueEvents.includes(event)) {
      const duplicate = this.sql.exec(
        `SELECT id FROM video_events WHERE session_id=? AND episode_id=? AND event_name=? LIMIT 1`,
        sessionId, episodeId, event,
      ).toArray()[0];
      if (duplicate) return json({ ok: true, deduplicated: true });
    }
    if (event === 'watch') {
      const recent = this.sql.exec(
        `SELECT occurred_at FROM video_events
         WHERE session_id=? AND episode_id=? AND event_name='watch'
         ORDER BY id DESC LIMIT 1`,
        sessionId, episodeId,
      ).toArray()[0];
      if (recent && now.getTime() - new Date(recent.occurred_at).getTime() < 5000) {
        return json({ ok: true, throttled: true });
      }
    }
    this.sql.exec(
      `INSERT INTO video_events
       (episode_id,session_id,event_name,position_seconds,watch_delta_seconds,referrer,device,occurred_at,day)
       VALUES (?,?,?,?,?,?,?,?,?)`,
      episodeId, sessionId, event, position, watchDelta,
      sanitizeText(body.referrer, 800), JSON.stringify(body.device ?? {}), now.toISOString(), now.toISOString().slice(0, 10),
    );
    return json({ ok: true });
  }

  trackAd(body) {
    const event = sanitizeText(body.event, 40);
    const sessionId = sanitizeText(body.sessionId, 100);
    const adId = sanitizeText(body.adId, 100);
    if (!['impression', 'play', 'complete', 'click'].includes(event) || !sessionId || !adId) {
      return json({ error: 'invalid_event' }, 400);
    }
    const ad = this.sql.exec('SELECT id FROM ads WHERE id=? AND active=1', adId).toArray()[0];
    if (!ad) return json({ error: 'ad_not_found' }, 404);
    if (['impression', 'complete'].includes(event)) {
      const duplicate = this.sql.exec(
        'SELECT id FROM ad_events WHERE ad_id=? AND session_id=? AND event_name=? LIMIT 1',
        adId, sessionId, event,
      ).toArray()[0];
      if (duplicate) return json({ ok: true, deduplicated: true });
    }
    const now = new Date().toISOString();
    this.sql.exec(
      `INSERT INTO ad_events (ad_id,episode_id,session_id,event_name,occurred_at,day)
       VALUES (?,?,?,?,?,?)`,
      adId, sanitizeText(body.episodeId, 100), sessionId, event, now, now.slice(0, 10),
    );
    return json({ ok: true });
  }

  async recordConversion(body) {
    const id = sanitizeText(body.id, 120) || crypto.randomUUID();
    this.sql.exec(
      `INSERT OR REPLACE INTO conversions
       (id,session_id,episode_id,format,external_id,amount_cents,currency,status,occurred_at)
       VALUES (?,?,?,?,?,?,?,?,?)`,
      id, sanitizeText(body.sessionId, 100), sanitizeText(body.episodeId, 100),
      sanitizeText(body.format, 80), sanitizeText(body.externalId, 180),
      Number.isFinite(Number(body.amountCents)) ? Math.round(Number(body.amountCents)) : null,
      sanitizeText(body.currency, 8) || 'EUR', sanitizeText(body.status, 40) || 'created',
      sanitizeText(body.occurredAt, 50) || new Date().toISOString(),
    );
    return json({ ok: true });
  }

  saveProgram(actor, payload) {
    const id = sanitizeText(payload.id, 100) || crypto.randomUUID();
    const now = new Date().toISOString();
    const existing = this.sql.exec('SELECT created_at FROM programs WHERE id=?', id).toArray()[0];
    this.sql.exec(
      `INSERT OR REPLACE INTO programs
       (id,name,slug,description,cover_url,display_order,active,created_at,updated_at)
       VALUES (?,?,?,?,?,?,?,?,?)`,
      id, requiredText(payload.name, 120, 'name_required'), slugify(payload.slug || payload.name),
      sanitizeText(payload.description, 1200), sanitizeUrl(payload.coverUrl),
      clampNumber(payload.displayOrder, 0, 100000), payload.active === false ? 0 : 1,
      existing?.created_at || now, now,
    );
    this.audit(actor.id, 'save_program', 'program', id, {});
  }

  deleteProgram(actor, payload) {
    const id = requiredText(payload.id, 100, 'id_required');
    const count = this.sql.exec('SELECT COUNT(*) AS count FROM episodes WHERE program_id=?', id).one();
    if (Number(count.count) > 0) throw new Error('program_not_empty');
    this.sql.exec('DELETE FROM programs WHERE id=?', id);
    this.audit(actor.id, 'delete_program', 'program', id, {});
  }

  saveEpisode(actor, payload) {
    const id = sanitizeText(payload.id, 100) || crypto.randomUUID();
    const programId = requiredText(payload.programId, 100, 'program_required');
    const status = EPISODE_STATUSES.includes(payload.status) ? payload.status : 'draft';
    const now = new Date().toISOString();
    const existing = this.sql.exec('SELECT created_at FROM episodes WHERE id=?', id).toArray()[0];
    const title = requiredText(payload.title, 180, 'title_required');
    const videoUrl = sanitizeUrl(payload.videoUrl);
    if (!videoUrl) throw new Error('video_url_required');
    this.sql.exec(
      `INSERT OR REPLACE INTO episodes
       (id,program_id,title,slug,description,video_url,poster_url,duration_seconds,status,
        display_order,published_at,scheduled_at,metadata,created_at,updated_at)
       VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
      id, programId, title, slugify(payload.slug || title), sanitizeText(payload.description, 3000),
      videoUrl, sanitizeUrl(payload.posterUrl), clampNumber(payload.durationSeconds, 0, 86400),
      status, clampNumber(payload.displayOrder, 0, 100000),
      sanitizeDate(payload.publishedAt) || (status === 'published' ? now : null),
      sanitizeDate(payload.scheduledAt), JSON.stringify(payload.metadata ?? {}),
      existing?.created_at || now, now,
    );
    this.audit(actor.id, 'save_episode', 'episode', id, { status });
  }

  deleteEpisode(actor, payload) {
    const id = requiredText(payload.id, 100, 'id_required');
    this.sql.exec('DELETE FROM episodes WHERE id=?', id);
    this.audit(actor.id, 'delete_episode', 'episode', id, {});
  }

  reorderEpisodes(actor, payload) {
    const ids = Array.isArray(payload.ids) ? payload.ids.map((id) => sanitizeText(id, 100)).filter(Boolean) : [];
    if (!ids.length) throw new Error('ids_required');
    ids.forEach((id, index) => this.sql.exec('UPDATE episodes SET display_order=?,updated_at=? WHERE id=?', (index + 1) * 10, new Date().toISOString(), id));
    this.audit(actor.id, 'reorder_episodes', 'episode', '', { count: ids.length });
  }

  saveAd(actor, payload) {
    const id = sanitizeText(payload.id, 100) || crypto.randomUUID();
    const now = new Date().toISOString();
    const existing = this.sql.exec('SELECT created_at FROM ads WHERE id=?', id).toArray()[0];
    const placement = AD_PLACEMENTS.includes(payload.placement) ? payload.placement : 'preroll';
    this.sql.exec(
      `INSERT OR REPLACE INTO ads
       (id,name,advertiser_name,placement,asset_url,asset_type,click_url,start_at,end_at,
        frequency_cap,active,targeting,created_at,updated_at)
       VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
      id, requiredText(payload.name, 140, 'name_required'), sanitizeText(payload.advertiserName, 140),
      placement, sanitizeUrl(payload.assetUrl), payload.assetType === 'image' ? 'image' : 'video',
      sanitizeUrl(payload.clickUrl), sanitizeDate(payload.startAt), sanitizeDate(payload.endAt),
      clampNumber(payload.frequencyCap, 1, 100), payload.active ? 1 : 0,
      JSON.stringify(payload.targeting ?? {}), existing?.created_at || now, now,
    );
    this.audit(actor.id, 'save_ad', 'ad', id, { placement, active: Boolean(payload.active) });
  }

  deleteAd(actor, payload) {
    const id = requiredText(payload.id, 100, 'id_required');
    this.sql.exec('DELETE FROM ads WHERE id=?', id);
    this.audit(actor.id, 'delete_ad', 'ad', id, {});
  }

  async saveUser(actor, payload) {
    if (actor.role !== 'admin') throw new Error('forbidden');
    const id = sanitizeText(payload.id, 100) || crypto.randomUUID();
    const role = ROLES.includes(payload.role) ? payload.role : 'analyst';
    const email = normalizeEmail(payload.email);
    if (!email) throw new Error('email_required');
    const existing = this.sql.exec('SELECT * FROM users WHERE id=?', id).toArray()[0];
    const now = new Date().toISOString();
    let passwordData = existing ? {
      hash: existing.password_hash,
      salt: existing.password_salt,
      iterations: existing.password_iterations,
    } : null;
    if (payload.password) {
      if (String(payload.password).length < 12) throw new Error('password_too_short');
      passwordData = await hashPassword(String(payload.password));
    }
    if (!passwordData) throw new Error('password_required');
    this.sql.exec(
      `INSERT OR REPLACE INTO users
       (id,email,full_name,role,password_hash,password_salt,password_iterations,active,created_at,updated_at,last_login_at)
       VALUES (?,?,?,?,?,?,?,?,?,?,?)`,
      id, email, sanitizeText(payload.fullName, 140), role, passwordData.hash, passwordData.salt,
      Number(passwordData.iterations), payload.active === false ? 0 : 1,
      existing?.created_at || now, now, existing?.last_login_at || null,
    );
    this.audit(actor.id, 'save_user', 'user', id, { role, active: payload.active !== false });
  }

  deleteUser(actor, payload) {
    if (actor.role !== 'admin') throw new Error('forbidden');
    const id = requiredText(payload.id, 100, 'id_required');
    if (id === actor.id) throw new Error('cannot_delete_self');
    this.sql.exec('DELETE FROM users WHERE id=?', id);
    this.audit(actor.id, 'delete_user', 'user', id, {});
  }

  async changePassword(actor, payload) {
    const targetId = actor.role === 'admin' && payload.userId ? sanitizeText(payload.userId, 100) : actor.id;
    const password = String(payload.password ?? '');
    if (password.length < 12) throw new Error('password_too_short');
    const passwordData = await hashPassword(password);
    this.sql.exec(
      `UPDATE users SET password_hash=?,password_salt=?,password_iterations=?,updated_at=? WHERE id=?`,
      passwordData.hash, passwordData.salt, passwordData.iterations, new Date().toISOString(), targetId,
    );
    this.sql.exec('DELETE FROM sessions WHERE user_id=? AND id<>?', targetId, actor.sessionId);
    this.audit(actor.id, 'change_password', 'user', targetId, {});
  }

  markAiAction(actor, payload) {
    const id = requiredText(payload.id, 100, 'id_required');
    const status = ['approved', 'rejected', 'executed'].includes(payload.status) ? payload.status : 'approved';
    this.sql.exec(
      'UPDATE ai_actions SET status=?,executed_at=? WHERE id=? AND user_id=?',
      status, status === 'executed' ? new Date().toISOString() : null, id, actor.id,
    );
    this.audit(actor.id, 'mark_ai_action', 'ai_action', id, { status });
  }

  getStats() {
    const totals = this.sql.exec(`
      SELECT
        SUM(CASE WHEN event_name='view' THEN 1 ELSE 0 END) AS views,
        SUM(CASE WHEN event_name='watch' THEN watch_delta_seconds ELSE 0 END) AS watchSeconds,
        SUM(CASE WHEN event_name='share' THEN 1 ELSE 0 END) AS shares,
        SUM(CASE WHEN event_name='booking_click' THEN 1 ELSE 0 END) AS bookingClicks,
        SUM(CASE WHEN event_name='complete' THEN 1 ELSE 0 END) AS completions,
        COUNT(DISTINCT session_id) AS uniqueViewers
      FROM video_events
    `).one();
    const byEpisode = {};
    for (const row of this.sql.exec(`
      SELECT episode_id AS episodeId,
        SUM(CASE WHEN event_name='view' THEN 1 ELSE 0 END) AS views,
        SUM(CASE WHEN event_name='watch' THEN watch_delta_seconds ELSE 0 END) AS watchSeconds,
        SUM(CASE WHEN event_name='share' THEN 1 ELSE 0 END) AS shares,
        SUM(CASE WHEN event_name='booking_click' THEN 1 ELSE 0 END) AS bookingClicks,
        SUM(CASE WHEN event_name='progress_25' THEN 1 ELSE 0 END) AS progress25,
        SUM(CASE WHEN event_name='progress_50' THEN 1 ELSE 0 END) AS progress50,
        SUM(CASE WHEN event_name='progress_75' THEN 1 ELSE 0 END) AS progress75,
        SUM(CASE WHEN event_name='complete' THEN 1 ELSE 0 END) AS completions,
        COUNT(DISTINCT session_id) AS uniqueViewers
      FROM video_events GROUP BY episode_id
    `)) byEpisode[row.episodeId] = numericize(row);
    const daily = this.sql.exec(`
      SELECT day,
        SUM(CASE WHEN event_name='view' THEN 1 ELSE 0 END) AS views,
        SUM(CASE WHEN event_name='watch' THEN watch_delta_seconds ELSE 0 END) AS watchSeconds,
        SUM(CASE WHEN event_name='share' THEN 1 ELSE 0 END) AS shares,
        SUM(CASE WHEN event_name='booking_click' THEN 1 ELSE 0 END) AS bookingClicks
      FROM video_events
      WHERE day >= date('now','-29 day')
      GROUP BY day ORDER BY day ASC
    `).toArray().map(numericize);
    const adStats = {};
    for (const row of this.sql.exec(`
      SELECT ad_id AS adId,
        SUM(CASE WHEN event_name='impression' THEN 1 ELSE 0 END) AS impressions,
        SUM(CASE WHEN event_name='play' THEN 1 ELSE 0 END) AS plays,
        SUM(CASE WHEN event_name='complete' THEN 1 ELSE 0 END) AS completions,
        SUM(CASE WHEN event_name='click' THEN 1 ELSE 0 END) AS clicks
      FROM ad_events GROUP BY ad_id
    `)) adStats[row.adId] = numericize(row);
    const conversions = this.sql.exec(`
      SELECT COUNT(*) AS count, COALESCE(SUM(amount_cents),0) AS revenueCents
      FROM conversions WHERE status IN ('paid','completed','succeeded')
    `).one();
    return {
      ...numericize(totals),
      byEpisode,
      daily,
      adStats,
      conversions: numericize(conversions),
    };
  }

  async requireSession(rawToken) {
    if (!rawToken) return null;
    const tokenHash = await sha256(rawToken);
    const row = this.sql.exec(
      `SELECT s.id AS sessionId,s.csrf_token AS csrfToken,s.expires_at AS expiresAt,
              u.id,u.email,u.full_name AS fullName,u.role,u.active
       FROM sessions s JOIN users u ON u.id=s.user_id
       WHERE s.token_hash=?`,
      tokenHash,
    ).toArray()[0];
    if (!row || Number(row.active) !== 1 || new Date(row.expiresAt).getTime() <= Date.now()) {
      if (row?.sessionId) this.sql.exec('DELETE FROM sessions WHERE id=?', row.sessionId);
      return null;
    }
    return row;
  }

  isLoginBlocked(key) {
    const row = this.sql.exec('SELECT count,first_at FROM login_attempts WHERE key=?', key).toArray()[0];
    if (!row) return false;
    const windowMs = 15 * 60 * 1000;
    if (Date.now() - new Date(row.first_at).getTime() > windowMs) {
      this.sql.exec('DELETE FROM login_attempts WHERE key=?', key);
      return false;
    }
    return Number(row.count) >= 6;
  }

  recordLoginFailure(key) {
    const now = new Date().toISOString();
    const row = this.sql.exec('SELECT count,first_at FROM login_attempts WHERE key=?', key).toArray()[0];
    if (!row || Date.now() - new Date(row.first_at).getTime() > 15 * 60 * 1000) {
      this.sql.exec('INSERT OR REPLACE INTO login_attempts (key,count,first_at,last_at) VALUES (?,?,?,?)', key, 1, now, now);
    } else {
      this.sql.exec('UPDATE login_attempts SET count=count+1,last_at=? WHERE key=?', now, key);
    }
  }

  cleanupExpiredSessions() {
    this.sql.exec('DELETE FROM sessions WHERE expires_at<=?', new Date().toISOString());
  }

  audit(userId, action, entityType, entityId, details) {
    this.sql.exec(
      `INSERT INTO audit_log (user_id,action,entity_type,entity_id,details,occurred_at)
       VALUES (?,?,?,?,?,?)`,
      userId || null, action, entityType || '', entityId || '', JSON.stringify(details ?? {}), new Date().toISOString(),
    );
  }
}

function permissionsFor(role) {
  const common = new Set(['change_password', 'mark_ai_action']);
  if (role === 'admin') return new Set([
    ...common, 'save_program', 'delete_program', 'save_episode', 'delete_episode',
    'reorder_episodes', 'save_ad', 'delete_ad', 'save_user', 'delete_user',
  ]);
  if (role === 'editor') return new Set([
    ...common, 'save_program', 'save_episode', 'delete_episode', 'reorder_episodes', 'save_ad', 'delete_ad',
  ]);
  if (role === 'advertiser') return new Set([...common, 'save_ad']);
  return common;
}

function requiredText(value, max, code) {
  const text = sanitizeText(value, max);
  if (!text) throw new Error(code);
  return text;
}

function normalizeEmail(value) {
  const email = sanitizeText(value, 254).toLowerCase();
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/u.test(email) ? email : '';
}

function slugify(value) {
  const slug = sanitizeText(value, 180)
    .normalize('NFD').replace(/[\u0300-\u036f]/gu, '')
    .toLowerCase().replace(/[^a-z0-9]+/gu, '-').replace(/^-|-$/gu, '').slice(0, 140);
  return slug || crypto.randomUUID();
}

function clampNumber(value, min, max) {
  const number = Number(value);
  if (!Number.isFinite(number)) return min;
  return Math.max(min, Math.min(max, number));
}

function sanitizeDate(value) {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
}

function parseJson(value) {
  try { return JSON.parse(value || '{}'); } catch { return {}; }
}

function publicUser(user) {
  return { id: user.id, email: user.email, fullName: user.fullName || user.full_name || '', role: user.role };
}

function booleanize(key) {
  return (row) => ({ ...row, [key]: Boolean(Number(row[key])) });
}

function numericize(row) {
  return Object.fromEntries(Object.entries(row || {}).map(([key, value]) => [key, typeof value === 'number' ? value : Number(value ?? 0)]));
}
