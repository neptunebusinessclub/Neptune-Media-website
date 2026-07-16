import { StudioStore as BaseStore } from './index.js';
import { hashPassword, json, sanitizeText, sanitizeUrl, sha256 } from './security.js';

export class StudioStore extends BaseStore {
  async fetch(request) {
    const url = new URL(request.url);
    const method = request.method.toUpperCase();
    const body = method === 'GET' ? {} : await request.json().catch(() => ({}));
    if (url.pathname === '/auth/setup-status') return this.setupStatus();
    if (url.pathname === '/auth/recover' && method === 'POST') return this.recoverAccess(body);
    if (url.pathname === '/internal/import-media' && method === 'POST') return this.importMedia(body);
    return super.fetch(request);
  }

  async login(body) {
    const response = await super.login(body);
    if (!response.ok || !body.remember) return response;
    const data = await response.json().catch(() => ({}));
    if (!data.token) return json(data, response.status);
    const expiresIn = 30 * 24 * 60 * 60;
    const tokenHash = await sha256(data.token);
    this.sql.exec('UPDATE sessions SET expires_at=? WHERE token_hash=?', new Date(Date.now() + expiresIn * 1000).toISOString(), tokenHash);
    return json({ ...data, expiresIn });
  }

  setupStatus() {
    const result = this.sql.exec('SELECT COUNT(*) AS count FROM users').one();
    return json({ initialized: Number(result.count) > 0 });
  }

  async recoverAccess(body) {
    if (!this.env.BOOTSTRAP_TOKEN || body.token !== this.env.BOOTSTRAP_TOKEN) return json({ error: 'invalid_bootstrap_token' }, 403);
    const email = sanitizeText(body.email, 240).toLowerCase();
    const password = String(body.password || '');
    if (!email || password.length < 12) return json({ error: 'invalid_credentials' }, 400);
    const user = this.sql.exec("SELECT id FROM users WHERE email=? AND role='admin' AND active=1", email).toArray()[0];
    if (!user) return json({ error: 'admin_not_found' }, 404);
    const passwordData = await hashPassword(password);
    const now = new Date().toISOString();
    this.sql.exec('UPDATE users SET password_hash=?,password_salt=?,password_iterations=?,updated_at=? WHERE id=?', passwordData.hash, passwordData.salt, passwordData.iterations, now, user.id);
    this.sql.exec('DELETE FROM sessions WHERE user_id=?', user.id);
    this.audit(user.id, 'recover_admin_access', 'user', user.id, {});
    return json({ ok: true });
  }

  importMedia(body) {
    const version = sanitizeText(body.version, 120) || 'neptune-launch-emissions-v1';
    const previous = this.sql.exec('SELECT value FROM meta WHERE key=?', 'media_import_version').toArray()[0]?.value;
    if (previous === version && !body.force) return json({ ok: true, skipped: true, version });
    const now = new Date().toISOString();
    for (const program of Array.isArray(body.programs) ? body.programs : []) this.importProgram(program, now);
    let imported = 0;
    for (const episode of Array.isArray(body.episodes) ? body.episodes : []) imported += this.importEpisode(episode, now);
    this.sql.exec('INSERT OR REPLACE INTO meta (key,value) VALUES (?,?)', 'media_import_version', version);
    this.audit(null, 'import_launch_media', 'episode', '', { imported, version });
    return json({ ok: true, imported, version });
  }

  importProgram(program, now) {
    const id = sanitizeText(program.id, 100);
    const name = sanitizeText(program.name, 160);
    if (!id || !name) return;
    this.sql.exec(`INSERT OR IGNORE INTO programs
      (id,name,slug,description,cover_url,display_order,active,created_at,updated_at)
      VALUES (?,?,?,?,?,?,?,?,?)`, id, name, slugify(program.slug || name), sanitizeText(program.description, 1200), sanitizeUrl(program.coverUrl), Number(program.displayOrder || 100), 1, now, now);
  }

  importEpisode(episode, now) {
    const id = sanitizeText(episode.id, 100);
    const programId = sanitizeText(episode.programId, 100);
    const title = sanitizeText(episode.title, 180);
    const videoUrl = sanitizeUrl(episode.videoUrl);
    if (!id || !programId || !title || !videoUrl) return 0;
    const existing = this.sql.exec('SELECT metadata FROM episodes WHERE id=?', id).toArray()[0];
    const currentMetadata = existing?.metadata ? safeParse(existing.metadata) : {};
    const incoming = episode.metadata && typeof episode.metadata === 'object' ? episode.metadata : {};
    const metadata = JSON.stringify({ ...incoming, ...currentMetadata, fullEpisode: true, live: currentMetadata.live !== false });
    const values = [programId, title, slugify(episode.slug || title), sanitizeText(episode.description, 3000), videoUrl, sanitizeUrl(episode.posterUrl), clamp(episode.durationSeconds, 1, 86400), Number(episode.displayOrder || 10), now, metadata, now, id];
    if (existing) {
      this.sql.exec(`UPDATE episodes SET program_id=?,title=?,slug=?,description=?,video_url=?,poster_url=?,duration_seconds=?,status='published',display_order=?,published_at=COALESCE(published_at,?),metadata=?,updated_at=? WHERE id=?`, ...values);
    } else {
      this.sql.exec(`INSERT INTO episodes
        (id,program_id,title,slug,description,video_url,poster_url,duration_seconds,status,display_order,published_at,scheduled_at,metadata,created_at,updated_at)
        VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`, id, programId, title, slugify(episode.slug || title), sanitizeText(episode.description, 3000), videoUrl, sanitizeUrl(episode.posterUrl), clamp(episode.durationSeconds, 1, 86400), 'published', Number(episode.displayOrder || 10), now, null, metadata, now, now);
    }
    return 1;
  }
}

function slugify(value) { return String(value || '').normalize('NFD').replace(/[\u0300-\u036f]/gu, '').toLowerCase().replace(/[^a-z0-9]+/gu, '-').replace(/(^-|-$)/gu, '').slice(0, 120) || crypto.randomUUID(); }
function safeParse(value) { try { return JSON.parse(value); } catch { return {}; } }
function clamp(value, min, max) { const number = Number(value); return Number.isFinite(number) ? Math.min(max, Math.max(min, Math.round(number))) : min; }
