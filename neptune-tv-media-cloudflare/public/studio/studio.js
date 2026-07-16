const $ = (selector) => document.querySelector(selector);
const $$ = (selector) => [...document.querySelectorAll(selector)];
const escapeHtml = (value) => String(value ?? '').replace(/[&<>"']/g, (character) => ({
  '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
}[character]));

let state = null;
let tab = 'dashboard';
let csrfToken = sessionStorage.getItem('neptune_csrf') || '';
let activePlan = null;
let activePlanId = null;

const titles = {
  dashboard: 'Vue d’ensemble', programs: 'Programmes', episodes: 'Émissions', ads: 'Publicités',
  users: 'Utilisateurs', ai: 'Neptune Copilot', audit: 'Journal d’audit',
};

bindAuth();
load();

function bindAuth() {
  $('#login').addEventListener('submit', async (event) => {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    try {
      const result = await api('/api/auth/login', {
        method: 'POST',
        body: JSON.stringify({ email: form.get('email'), password: form.get('password') }),
      }, false);
      csrfToken = result.csrfToken;
      sessionStorage.setItem('neptune_csrf', csrfToken);
      await load();
    } catch (error) { $('#authMsg').textContent = humanError(error.message); }
  });
  $('#bootstrap').addEventListener('click', async () => {
    const form = new FormData($('#login'));
    try {
      await api('/api/auth/bootstrap', {
        method: 'POST',
        body: JSON.stringify({
          email: form.get('email'), password: form.get('password'), fullName: form.get('fullName'), token: form.get('token'),
        }),
      }, false);
      $('#authMsg').textContent = 'Administrateur créé. Connectez-vous avec les mêmes identifiants.';
    } catch (error) { $('#authMsg').textContent = humanError(error.message); }
  });
  $('#logout').addEventListener('click', async () => {
    await api('/api/auth/logout', { method: 'POST' }, false).catch(() => {});
    sessionStorage.removeItem('neptune_csrf');
    location.reload();
  });
  $('#refresh').addEventListener('click', load);
  $$('[data-tab]').forEach((button) => button.addEventListener('click', () => {
    tab = button.dataset.tab;
    render();
  }));
}

async function api(url, options = {}, addCsrf = true) {
  const headers = { Accept: 'application/json', ...(options.headers || {}) };
  if (options.body) headers['Content-Type'] = 'application/json';
  if (addCsrf && options.method && options.method !== 'GET') headers['X-CSRF-Token'] = csrfToken;
  const response = await fetch(url, { ...options, headers });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.error || `http_${response.status}`);
  return data;
}

async function load() {
  $('#syncState').textContent = 'Synchronisation…';
  try {
    const auth = await api('/api/auth/status', {}, false);
    csrfToken = auth.csrfToken;
    sessionStorage.setItem('neptune_csrf', csrfToken);
    state = await api('/api/admin/state');
    $('#auth').hidden = true;
    $('#app').hidden = false;
    applyRoleVisibility();
    $('#accountName').textContent = state.user.fullName || state.user.email;
    $('#accountRole').textContent = state.user.role;
    $('#syncState').textContent = 'Synchronisé';
    render();
  } catch {
    $('#auth').hidden = false;
    $('#app').hidden = true;
  }
}

function applyRoleVisibility() {
  $$('[data-role]').forEach((element) => {
    const roles = element.dataset.role.split(',');
    element.hidden = !roles.includes(state.user.role);
  });
  const current = $(`[data-tab="${tab}"]`);
  if (current?.hidden) tab = 'dashboard';
}

function render() {
  $('#title').textContent = titles[tab];
  $$('[data-tab]').forEach((button) => button.classList.toggle('active', button.dataset.tab === tab));
  if (tab === 'dashboard') renderDashboard();
  if (tab === 'programs') renderPrograms();
  if (tab === 'episodes') renderEpisodes();
  if (tab === 'ads') renderAds();
  if (tab === 'users') renderUsers();
  if (tab === 'ai') renderAi();
  if (tab === 'audit') renderAudit();
}

function renderDashboard() {
  const stats = state.stats;
  const topViews = Math.max(1, ...state.episodes.map((episode) => stats.byEpisode[episode.id]?.views || 0));
  $('#content').innerHTML = `
    <div class="cards">
      ${metric(formatNumber(stats.views), 'Vues')}
      ${metric(formatDuration(stats.watchSeconds), 'Watch time')}
      ${metric(formatNumber(stats.uniqueViewers), 'Spectateurs uniques')}
      ${metric(formatNumber(stats.shares), 'Partages')}
      ${metric(formatNumber(stats.bookingClicks), 'Clics réservation')}
    </div>
    <div class="layout2">
      <div class="panel"><h2>Performance par émission</h2><div class="barList">
        ${state.episodes.map((episode) => {
          const value = stats.byEpisode[episode.id] || {};
          const width = Math.max(2, Math.round((Number(value.views || 0) / topViews) * 100));
          return `<div class="barRow"><div><strong>${escapeHtml(episode.title)}</strong><br><small>${formatNumber(value.views || 0)} vues · ${formatDuration(value.watchSeconds || 0)}</small></div><div class="barTrack"><span style="width:${width}%"></span></div><small>${conversionRate(value.bookingClicks, value.views)} vers réservation</small></div>`;
        }).join('') || '<p class="empty">Aucune donnée.</p>'}
      </div></div>
      <div class="panel"><h2>Rétention globale</h2>${retentionBlock(stats)}</div>
    </div>
    <div class="panel"><h2>Conversions attribuées</h2><div class="cards">
      ${metric(formatNumber(stats.conversions.count), 'Conversions payées')}
      ${metric(formatCurrency(stats.conversions.revenueCents), 'Revenu attribué')}
      ${metric(conversionRate(stats.bookingClicks, stats.views), 'Taux clic réservation')}
    </div></div>`;
}

function renderPrograms() {
  $('#content').innerHTML = `<div class="toolbar"><p>Organisez les univers éditoriaux de la chaîne.</p><button class="primary" id="newProgram">Nouveau programme</button></div><div class="panel list">${state.programs.map((program) => `<div class="row"><div><strong>${escapeHtml(program.name)}</strong><br><small>${escapeHtml(program.slug)} · ordre ${program.displayOrder} · ${program.active ? 'public' : 'masqué'}</small></div><div class="actions"><button data-program="${program.id}">Modifier</button><button class="danger" data-delete-program="${program.id}">Supprimer</button></div></div>`).join('')}</div><div id="editor"></div>`;
  $('#newProgram').addEventListener('click', () => editProgram({ active: true }));
  $$('[data-program]').forEach((button) => button.addEventListener('click', () => editProgram(state.programs.find((program) => program.id === button.dataset.program))));
  $$('[data-delete-program]').forEach((button) => button.addEventListener('click', async () => {
    if (!confirm('Supprimer ce programme vide ?')) return;
    await apply('delete_program', { id: button.dataset.deleteProgram });
  }));
}

function editProgram(program) {
  $('#editor').innerHTML = `<form class="panel editor" id="programForm">
    <input type="hidden" name="id" value="${escapeHtml(program.id || '')}">
    ${field('Nom', 'name', program.name, true)}${field('Slug', 'slug', program.slug)}
    ${field('Description', 'description', program.description, false, 'textarea', 'full')}
    ${field('URL couverture', 'coverUrl', program.coverUrl, false, 'input', 'full')}
    ${field('Ordre', 'displayOrder', program.displayOrder ?? 100, false, 'number')}
    <label class="inline"><input name="active" type="checkbox" ${program.active !== false ? 'checked' : ''}> Programme visible</label>
    <div class="formActions"><button type="button" class="secondary" data-cancel>Annuler</button><button class="primary">Enregistrer</button></div>
  </form>`;
  const form = $('#programForm');
  form.querySelector('[data-cancel]').onclick = () => { $('#editor').innerHTML = ''; };
  form.onsubmit = async (event) => {
    event.preventDefault();
    const data = Object.fromEntries(new FormData(form));
    data.active = form.active.checked;
    data.displayOrder = Number(data.displayOrder);
    await apply('save_program', data);
  };
}

function renderEpisodes() {
  const sorted = [...state.episodes].sort((a, b) => a.displayOrder - b.displayOrder);
  $('#content').innerHTML = `<div class="toolbar"><p>Glissez les lignes pour modifier l’ordre d’antenne.</p><button class="primary" id="newEpisode">Nouvelle émission</button></div><div class="panel list" id="episodeList">${sorted.map((episode) => episodeRow(episode)).join('')}</div><div id="editor"></div>`;
  $('#newEpisode').addEventListener('click', () => editEpisode({ status: 'draft', displayOrder: (sorted.length + 1) * 10, programId: state.programs[0]?.id }));
  $$('[data-edit-episode]').forEach((button) => button.addEventListener('click', () => editEpisode(state.episodes.find((episode) => episode.id === button.dataset.editEpisode))));
  $$('[data-delete-episode]').forEach((button) => button.addEventListener('click', async () => {
    if (!confirm('Supprimer définitivement cette émission et son historique éditorial ?')) return;
    await apply('delete_episode', { id: button.dataset.deleteEpisode });
  }));
  bindReorder();
}

function episodeRow(episode) {
  const performance = state.stats.byEpisode[episode.id] || {};
  return `<div class="row" draggable="true" data-episode-row="${episode.id}"><span class="drag" aria-label="Déplacer">⋮⋮</span><div><strong>${escapeHtml(episode.title)}</strong> <span class="tag ${escapeHtml(episode.status)}">${escapeHtml(episode.status)}</span><br><small>${escapeHtml(programName(episode.programId))} · ordre ${episode.displayOrder} · ${formatNumber(performance.views || 0)} vues · ${formatDuration(performance.watchSeconds || 0)}</small></div><div class="actions"><button data-move="up" data-id="${episode.id}">↑</button><button data-move="down" data-id="${episode.id}">↓</button><button data-edit-episode="${episode.id}">Modifier</button><button class="danger" data-delete-episode="${episode.id}">Supprimer</button></div></div>`;
}

function bindReorder() {
  const list = $('#episodeList');
  let dragged = null;
  list.querySelectorAll('[data-episode-row]').forEach((row) => {
    row.addEventListener('dragstart', () => { dragged = row; row.classList.add('dragging'); });
    row.addEventListener('dragend', async () => { row.classList.remove('dragging'); dragged = null; await saveCurrentOrder(); });
    row.addEventListener('dragover', (event) => {
      event.preventDefault();
      if (!dragged || dragged === row) return;
      const box = row.getBoundingClientRect();
      list.insertBefore(dragged, event.clientY < box.top + box.height / 2 ? row : row.nextSibling);
    });
  });
  $$('[data-move]').forEach((button) => button.addEventListener('click', async () => {
    const row = button.closest('[data-episode-row]');
    if (button.dataset.move === 'up' && row.previousElementSibling) list.insertBefore(row, row.previousElementSibling);
    if (button.dataset.move === 'down' && row.nextElementSibling) list.insertBefore(row.nextElementSibling, row);
    await saveCurrentOrder();
  }));
}

async function saveCurrentOrder() {
  const ids = $$('#episodeList [data-episode-row]').map((row) => row.dataset.episodeRow);
  await apply('reorder_episodes', { ids });
}

function editEpisode(episode) {
  $('#editor').innerHTML = `<form class="panel editor" id="episodeForm">
    <input type="hidden" name="id" value="${escapeHtml(episode.id || '')}">
    ${field('Titre', 'title', episode.title, true)}${field('Slug', 'slug', episode.slug)}
    <label class="field"><span>Programme</span><select name="programId">${state.programs.map((program) => `<option value="${program.id}">${escapeHtml(program.name)}</option>`).join('')}</select></label>
    <label class="field"><span>Statut</span><select name="status"><option value="draft">Brouillon</option><option value="scheduled">Programmé</option><option value="published">Publié</option><option value="archived">Archivé</option></select></label>
    ${field('Description', 'description', episode.description, false, 'textarea', 'full')}
    ${field('URL vidéo Cloudflare / externe', 'videoUrl', episode.videoUrl, true, 'input', 'full')}
    ${field('URL miniature', 'posterUrl', episode.posterUrl, false, 'input', 'full')}
    ${field('Durée en secondes', 'durationSeconds', episode.durationSeconds ?? 0, false, 'number')}
    ${field('Ordre', 'displayOrder', episode.displayOrder ?? 100, false, 'number')}
    ${field('Publication', 'publishedAt', dateForInput(episode.publishedAt), false, 'datetime-local')}
    ${field('Programmation', 'scheduledAt', dateForInput(episode.scheduledAt), false, 'datetime-local')}
    <div class="formActions"><button type="button" class="secondary" data-cancel>Annuler</button><button class="primary">Enregistrer</button></div>
  </form>`;
  const form = $('#episodeForm');
  form.programId.value = episode.programId || state.programs[0]?.id || '';
  form.status.value = episode.status || 'draft';
  form.querySelector('[data-cancel]').onclick = () => { $('#editor').innerHTML = ''; };
  form.onsubmit = async (event) => {
    event.preventDefault();
    const data = Object.fromEntries(new FormData(form));
    data.durationSeconds = Number(data.durationSeconds);
    data.displayOrder = Number(data.displayOrder);
    await apply('save_episode', data);
  };
}

function renderAds() {
  $('#content').innerHTML = `<div class="toolbar"><p>Programmez les placements, leur période et leur fréquence.</p><button class="primary" id="newAd">Nouvelle campagne</button></div><div class="panel list">${state.ads.map((ad) => {
    const metrics = state.stats.adStats[ad.id] || {};
    return `<div class="row"><div><strong>${escapeHtml(ad.name)}</strong> <span class="tag ${ad.active ? 'active' : 'inactive'}">${ad.active ? 'active' : 'inactive'}</span><br><small>${escapeHtml(ad.placement)} · ${formatNumber(metrics.impressions || 0)} impressions · ${formatNumber(metrics.clicks || 0)} clics · CTR ${conversionRate(metrics.clicks, metrics.impressions)}</small></div><div class="actions"><button data-edit-ad="${ad.id}">Modifier</button><button class="danger" data-delete-ad="${ad.id}">Supprimer</button></div></div>`;
  }).join('') || '<p class="empty">Aucune campagne.</p>'}</div><div id="editor"></div>`;
  $('#newAd').addEventListener('click', () => editAd({ placement: 'preroll', assetType: 'video', frequencyCap: 3, active: false }));
  $$('[data-edit-ad]').forEach((button) => button.addEventListener('click', () => editAd(state.ads.find((ad) => ad.id === button.dataset.editAd))));
  $$('[data-delete-ad]').forEach((button) => button.addEventListener('click', async () => {
    if (!confirm('Supprimer cette campagne ?')) return;
    await apply('delete_ad', { id: button.dataset.deleteAd });
  }));
}

function editAd(ad) {
  $('#editor').innerHTML = `<form class="panel editor" id="adForm">
    <input type="hidden" name="id" value="${escapeHtml(ad.id || '')}">
    ${field('Nom campagne', 'name', ad.name, true)}${field('Annonceur', 'advertiserName', ad.advertiserName)}
    <label class="field"><span>Placement</span><select name="placement"><option>preroll</option><option>midroll</option><option>postroll</option><option>banner</option></select></label>
    <label class="field"><span>Type de média</span><select name="assetType"><option value="video">Vidéo</option><option value="image">Image</option></select></label>
    ${field('URL média', 'assetUrl', ad.assetUrl, false, 'input', 'full')}
    ${field('URL de clic', 'clickUrl', ad.clickUrl, false, 'input', 'full')}
    ${field('Début', 'startAt', dateForInput(ad.startAt), false, 'datetime-local')}
    ${field('Fin', 'endAt', dateForInput(ad.endAt), false, 'datetime-local')}
    ${field('Fréquence maximale / jour', 'frequencyCap', ad.frequencyCap ?? 3, false, 'number')}
    <label class="inline"><input name="active" type="checkbox" ${ad.active ? 'checked' : ''}> Campagne active</label>
    <div class="formActions"><button type="button" class="secondary" data-cancel>Annuler</button><button class="primary">Enregistrer</button></div>
  </form>`;
  const form = $('#adForm');
  form.placement.value = ad.placement || 'preroll';
  form.assetType.value = ad.assetType || 'video';
  form.querySelector('[data-cancel]').onclick = () => { $('#editor').innerHTML = ''; };
  form.onsubmit = async (event) => {
    event.preventDefault();
    const data = Object.fromEntries(new FormData(form));
    data.active = form.active.checked;
    data.frequencyCap = Number(data.frequencyCap);
    await apply('save_ad', data);
  };
}

function renderUsers() {
  $('#content').innerHTML = `<div class="toolbar"><p>Attribuez des rôles sans partager le compte administrateur.</p><button class="primary" id="newUser">Nouvel utilisateur</button></div><div class="panel list">${state.users.map((user) => `<div class="row"><div><strong>${escapeHtml(user.fullName || user.email)}</strong> <span class="tag ${user.active ? 'active' : 'inactive'}">${escapeHtml(user.role)}</span><br><small>${escapeHtml(user.email)} · dernière connexion ${user.lastLoginAt ? formatDate(user.lastLoginAt) : 'jamais'}</small></div><div class="actions"><button data-edit-user="${user.id}">Modifier</button>${user.id !== state.user.id ? `<button class="danger" data-delete-user="${user.id}">Supprimer</button>` : ''}</div></div>`).join('')}</div><div id="editor"></div>`;
  $('#newUser').addEventListener('click', () => editUser({ role: 'analyst', active: true }));
  $$('[data-edit-user]').forEach((button) => button.addEventListener('click', () => editUser(state.users.find((user) => user.id === button.dataset.editUser))));
  $$('[data-delete-user]').forEach((button) => button.addEventListener('click', async () => {
    if (!confirm('Supprimer cet accès ?')) return;
    await apply('delete_user', { id: button.dataset.deleteUser });
  }));
}

function editUser(user) {
  $('#editor').innerHTML = `<form class="panel editor" id="userForm">
    <input type="hidden" name="id" value="${escapeHtml(user.id || '')}">
    ${field('Nom', 'fullName', user.fullName)}${field('Email', 'email', user.email, true, 'email')}
    <label class="field"><span>Rôle</span><select name="role"><option value="admin">Administrateur</option><option value="editor">Éditeur</option><option value="analyst">Analyste</option><option value="advertiser">Annonceur</option></select></label>
    ${field(user.id ? 'Nouveau mot de passe (laisser vide pour conserver)' : 'Mot de passe initial (12 caractères minimum)', 'password', '', !user.id, 'password')}
    <label class="inline"><input name="active" type="checkbox" ${user.active !== false ? 'checked' : ''}> Accès actif</label>
    <div class="formActions"><button type="button" class="secondary" data-cancel>Annuler</button><button class="primary">Enregistrer</button></div>
  </form>`;
  const form = $('#userForm');
  form.role.value = user.role || 'analyst';
  form.querySelector('[data-cancel]').onclick = () => { $('#editor').innerHTML = ''; };
  form.onsubmit = async (event) => {
    event.preventDefault();
    const data = Object.fromEntries(new FormData(form));
    data.active = form.active.checked;
    await apply('save_user', data);
  };
}

function renderAi() {
  $('#content').innerHTML = `<div class="copilot"><div class="panel"><p class="eyebrow">WORKERS AI · GPT-OSS-120B</p><h2>Demander à Neptune Copilot</h2><p>Il analyse les données réelles du Studio. Toute action exige votre validation.</p><textarea id="prompt" placeholder="Exemple : analyse la rétention des émissions, explique les abandons et propose un nouvel ordre d’antenne."></textarea><button class="primary" id="ask">Analyser le Studio</button></div><div class="panel"><h2>Plan proposé</h2><div id="plan" class="plan">Aucune analyse lancée.</div><div id="recommendations"></div><div id="aiActions"></div></div></div>`;
  $('#ask').addEventListener('click', askAi);
  if (activePlan) displayPlan(activePlan);
}

async function askAi() {
  const prompt = $('#prompt').value.trim();
  if (!prompt) return;
  $('#plan').textContent = 'Analyse des données réelles en cours…';
  $('#ask').disabled = true;
  try {
    const result = await api('/api/admin/ai', { method: 'POST', body: JSON.stringify({ prompt }) });
    activePlan = result.plan;
    activePlanId = result.actionLogId;
    displayPlan(activePlan);
  } catch (error) {
    $('#plan').textContent = humanError(error.message);
  } finally { $('#ask').disabled = false; }
}

function displayPlan(plan) {
  if (!$('#plan')) return;
  $('#plan').textContent = plan.summary || 'Analyse terminée.';
  $('#recommendations').innerHTML = (plan.recommendations || []).map((item) => `<p class="recommendation">${escapeHtml(item)}</p>`).join('');
  $('#aiActions').innerHTML = (plan.actions || []).map((action, index) => `<div class="aiAction"><div><strong>${escapeHtml(action.label || action.action)}</strong><br><code>${escapeHtml(action.action)}</code></div><button class="primary" data-ai-action="${index}">Valider</button></div>`).join('');
  $$('[data-ai-action]').forEach((button) => button.addEventListener('click', async () => {
    const action = plan.actions[Number(button.dataset.aiAction)];
    if (!confirm(`Appliquer cette action ?\n\n${action.label || action.action}`)) return;
    await apply(action.action, action.payload, false);
    if (activePlanId) await apply('mark_ai_action', { id: activePlanId, status: 'executed' }, false);
    activePlan = null;
    activePlanId = null;
    toast('Action validée et journalisée.');
    tab = 'dashboard';
    render();
  }));
}

function renderAudit() {
  $('#content').innerHTML = `<div class="panel"><h2>150 dernières actions</h2><div class="audit">${state.audit.map((item) => `<article><strong>${escapeHtml(item.action)}</strong> · ${escapeHtml(item.entityType)} ${escapeHtml(item.entityId)}<br><time>${formatDate(item.occurredAt)}</time></article>`).join('') || '<p class="empty">Aucune action journalisée.</p>'}</div></div>`;
}

async function apply(action, payload, reload = true) {
  $('#syncState').textContent = 'Enregistrement…';
  try {
    await api('/api/admin/apply', { method: 'POST', body: JSON.stringify({ action, payload }) });
    toast('Modification enregistrée.');
    if (reload) await load();
  } catch (error) {
    $('#syncState').textContent = 'Erreur';
    toast(humanError(error.message), true);
    throw error;
  }
}

function field(label, name, value = '', required = false, type = 'input', className = '') {
  const tag = type === 'textarea'
    ? `<textarea name="${name}" ${required ? 'required' : ''}>${escapeHtml(value || '')}</textarea>`
    : `<input name="${name}" type="${type}" value="${escapeHtml(value ?? '')}" ${required ? 'required' : ''}>`;
  return `<label class="field ${className}"><span>${escapeHtml(label)}</span>${tag}</label>`;
}

function metric(value, label) { return `<div class="metric"><strong>${escapeHtml(value)}</strong><span>${escapeHtml(label)}</span></div>`; }
function programName(id) { return state.programs.find((program) => program.id === id)?.name || id; }
function formatNumber(value) { return new Intl.NumberFormat('fr-FR').format(Number(value || 0)); }
function formatCurrency(cents) { return new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' }).format(Number(cents || 0) / 100); }
function formatDuration(seconds) { const value = Math.round(Number(seconds || 0)); if (value < 60) return `${value}s`; const hours = Math.floor(value / 3600); const minutes = Math.floor((value % 3600) / 60); return hours ? `${hours}h ${minutes}min` : `${minutes}min`; }
function conversionRate(numerator, denominator) { const rate = Number(denominator || 0) ? (Number(numerator || 0) / Number(denominator)) * 100 : 0; return `${rate.toFixed(1).replace('.', ',')} %`; }
function formatDate(value) { return new Intl.DateTimeFormat('fr-FR', { dateStyle: 'short', timeStyle: 'short' }).format(new Date(value)); }
function dateForInput(value) { return value ? new Date(value).toISOString().slice(0, 16) : ''; }
function retentionBlock(stats) {
  const totals = Object.values(stats.byEpisode || {}).reduce((sum, item) => ({
    views: sum.views + Number(item.views || 0), p25: sum.p25 + Number(item.progress25 || 0), p50: sum.p50 + Number(item.progress50 || 0), p75: sum.p75 + Number(item.progress75 || 0), complete: sum.complete + Number(item.completions || 0),
  }), { views: 0, p25: 0, p50: 0, p75: 0, complete: 0 });
  return `<div class="retention"><div><strong>${conversionRate(totals.p25, totals.views)}</strong><span>25 % vus</span></div><div><strong>${conversionRate(totals.p50, totals.views)}</strong><span>50 % vus</span></div><div><strong>${conversionRate(totals.p75, totals.views)}</strong><span>75 % vus</span></div><div><strong>${conversionRate(totals.complete, totals.views)}</strong><span>Terminées</span></div></div>`;
}
function humanError(code) {
  return ({
    invalid_credentials: 'Identifiants incorrects.', too_many_attempts: 'Trop de tentatives. Réessayez dans 15 minutes.',
    already_initialized: 'Le premier administrateur existe déjà.', invalid_bootstrap_token: 'Jeton d’amorçage incorrect.',
    password_too_short: 'Le mot de passe doit contenir au moins 12 caractères.', program_not_empty: 'Déplacez ou supprimez les émissions avant ce programme.',
    csrf_failed: 'Session de sécurité expirée. Actualisez la page.', unauthorized: 'Votre session a expiré.',
    workers_ai_binding_missing: 'Workers AI n’est pas activé sur le déploiement.', internal_error: 'Erreur serveur. Consultez les logs Cloudflare.',
  }[code] || code.replaceAll('_', ' '));
}
function toast(message, error = false) { const element = $('#toast'); element.textContent = message; element.classList.toggle('error', error); element.hidden = false; clearTimeout(toast.timer); toast.timer = setTimeout(() => { element.hidden = true; }, 3500); }
