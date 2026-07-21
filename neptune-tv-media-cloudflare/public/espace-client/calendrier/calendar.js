const $ = (selector, root = document) => root.querySelector(selector);
const $$ = (selector, root = document) => [...root.querySelectorAll(selector)];
const PLATFORM_URLS = { youtube: 'https://www.youtube.com/upload', tiktok: 'https://www.tiktok.com/upload', instagram: 'https://www.instagram.com/' };
const PLATFORM_LABELS = { youtube: 'YouTube', tiktok: 'TikTok', instagram: 'Instagram' };

let data = { assets: [], occurrences: [], publications: [], minimumReuseDays: 30 };
let currentMonth = new Date();
let selectedOccurrenceId = '';
let editorCloseTimer = 0;

$('#previousMonth').addEventListener('click', () => changeMonth(-1));
$('#nextMonth').addEventListener('click', () => changeMonth(1));
$('#closeEditor').addEventListener('click', closeEditor);
$('#editorBackdrop').addEventListener('click', closeEditor);
$$('[data-view]').forEach((button) => button.addEventListener('click', () => switchView(button.dataset.view)));
document.addEventListener('keydown', (event) => {
  if (event.key === 'Escape' && !$('#editor').hidden) closeEditor();
});

load();

async function load(options = {}) {
  try {
    const response = await api('/api/client/content-calendar');
    data = normalizeData(response);
    const first = data.occurrences.find((item) => item.publishAt)?.publishAt;
    if (first && !options.keepMonth) currentMonth = new Date(first);
    render();
    if (options.openOccurrenceId) openEditor(options.openOccurrenceId);
  } catch (error) {
    if (['unauthorized', 'http_401'].includes(error.message)) {
      location.href = '/espace-client/';
      return;
    }
    $('#calendarGrid').innerHTML = `<div class="empty-state">${esc(errorText(error.message))}</div>`;
    $('#projectLibrary').innerHTML = '<div class="empty-state">Impossible de charger la bibliothèque.</div>';
  }
}

function normalizeData(response) {
  const legacyItems = Array.isArray(response.items) ? response.items : [];
  const assets = Array.isArray(response.assets) ? response.assets : legacyItems.map((item) => ({
    ...item,
    usageCount: item.publishAt ? 1 : 0,
    nextReuseAt: item.publishAt ? new Date(new Date(item.publishAt).getTime() + 30 * 86_400_000).toISOString() : new Date().toISOString(),
  }));
  const occurrences = Array.isArray(response.occurrences) ? response.occurrences : legacyItems.filter((item) => item.publishAt).map((item) => ({
    occurrenceId: item.scheduleId || item.fileId,
    sourceScheduleId: item.scheduleId,
    fileId: item.fileId,
    orderId: item.orderId,
    publishAt: item.publishAt,
    networks: item.networks || [],
    title: item.aiTitle,
    description: item.aiDescription,
    hashtags: item.hashtags || [],
    caption: item.caption,
    useIndex: 1,
  }));
  return { ...response, assets, occurrences, publications: response.publications || [], minimumReuseDays: response.minimumReuseDays || 30 };
}

function render() {
  $('#shortCount').textContent = data.assets.length;
  $('#scheduledCount').textContent = data.occurrences.length;
  $('#publishedCount').textContent = data.publications.filter((item) => ['prepared', 'published'].includes(item.status)).length;
  renderCalendar();
  renderLibraries();
}

function switchView(view) {
  const library = view === 'library';
  $('#calendarView').hidden = library;
  $('#libraryView').hidden = !library;
  $('#calendarView').classList.toggle('active', !library);
  $('#libraryView').classList.toggle('active', library);
  $$('[data-view]').forEach((button) => {
    const active = button.dataset.view === view;
    button.classList.toggle('active', active);
    button.setAttribute('aria-selected', String(active));
  });
}

function renderCalendar() {
  const year = currentMonth.getFullYear();
  const month = currentMonth.getMonth();
  $('#monthLabel').textContent = new Intl.DateTimeFormat('fr-FR', { month: 'long', year: 'numeric' }).format(currentMonth);
  const first = new Date(year, month, 1);
  const last = new Date(year, month + 1, 0);
  const offset = (first.getDay() + 6) % 7;
  const cells = [];
  for (let index = 0; index < offset; index += 1) cells.push(dayCell(new Date(year, month, -offset + index + 1), true));
  for (let day = 1; day <= last.getDate(); day += 1) cells.push(dayCell(new Date(year, month, day), false));
  while (cells.length % 7 !== 0) {
    const day = cells.length - offset - last.getDate() + 1;
    cells.push(dayCell(new Date(year, month + 1, day), true));
  }
  $('#calendarGrid').innerHTML = `${['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim'].map((name) => `<div class="calendar-head">${name}</div>`).join('')}${cells.join('')}`;
  $$('[data-occurrence-id]').forEach((entry) => {
    entry.addEventListener('click', () => openEditor(entry.dataset.occurrenceId));
    entry.addEventListener('keydown', (event) => {
      if (event.key === 'Enter' || event.key === ' ') {
        event.preventDefault();
        openEditor(entry.dataset.occurrenceId);
      }
    });
  });
}

function dayCell(date, outside) {
  const entries = data.occurrences.filter((item) => sameDay(item.publishAt, date));
  const today = sameDay(new Date(), date);
  return `<div class="calendar-day${outside ? ' outside' : ''}${today ? ' today' : ''}">
    <span class="calendar-day-number">${date.getDate()}</span>
    ${entries.map(calendarEntryMarkup).join('')}
  </div>`;
}

function calendarEntryMarkup(occurrence) {
  const asset = assetFor(occurrence.fileId);
  const title = occurrence.title || asset?.aiTitle || cleanName(asset?.name) || 'Short Neptune Media';
  const project = asset?.orderTitle || 'Passage Neptune Media';
  return `<article class="calendar-entry" data-occurrence-id="${esc(occurrence.occurrenceId)}" tabindex="0" role="button" aria-label="Modifier ${esc(title)}">
    <span class="entry-use">Utilisation ${Number(occurrence.useIndex || 1)}</span>
    <strong>${esc(title)}</strong>
    <small>${esc(project)}</small>
  </article>`;
}

function renderLibraries() {
  $('#projectLibrary').innerHTML = projectGroupsMarkup();
  bindLibraryActions($('#projectLibrary'));
}

function projectGroupsMarkup() {
  if (!data.assets.length) return '<div class="empty-state"><strong>Vos shorts apparaîtront ici</strong>Ils seront classés automatiquement par passage après leur import par Neptune.</div>';
  const projects = groupBy(data.assets, (asset) => asset.orderId || 'project');
  return [...projects.values()].map((assets, index) => {
    const first = assets[0];
    const date = first.filmingAt || first.createdAt;
    return `<section class="project-group">
      <header class="project-group-head">
        <span class="project-number">${String(index + 1).padStart(2, '0')}</span>
        <div><small>${esc(first.format || 'Format Neptune Media')}</small><h3>${esc(first.orderTitle || 'Passage Neptune Media')}</h3><p>${assets.length} contenu${assets.length > 1 ? 's' : ''} court${assets.length > 1 ? 's' : ''}${date ? ` · ${esc(dateShort(date))}` : ''}</p></div>
      </header>
      <div class="project-short-grid">${assets.map(assetCardMarkup).join('')}</div>
    </section>`;
  }).join('');
}

function assetCardMarkup(asset) {
  const uses = occurrencesFor(asset.fileId);
  const last = uses.at(-1);
  const level = renewalLevel(asset, uses.length);
  const status = level === 'renew_now' ? 'Nouvelle émission conseillée' : level === 'refresh_soon' ? 'À renouveler bientôt' : 'Réutilisable';
  const buttonLabel = uses.length ? 'Reprogrammer' : 'Programmer';
  const title = asset.aiTitle || cleanName(asset.name) || 'Short Neptune Media';
  return `<article class="library-short-card" data-level="${level}" data-open-asset="${esc(asset.fileId)}" tabindex="0" role="button" aria-label="Ouvrir la fiche Neptune IA de ${esc(title)}">
    <div class="library-short-top"><span class="usage-count">${uses.length} utilisation${uses.length > 1 ? 's' : ''}</span><span class="renewal-status">${status}</span></div>
    <h4>${esc(title)}</h4>
    <p>${last ? `Dernière programmation : ${esc(dateShort(last.publishAt))}` : 'Jamais programmé'}<br>Prochain créneau conseillé : ${esc(dateShort(asset.nextReuseAt))}</p>
    <div class="library-card-actions">
      <span class="card-open-label">Voir la fiche Neptune IA <b>→</b></span>
      <button class="reuse-button" type="button" data-reuse-file="${esc(asset.fileId)}">${buttonLabel}</button>
    </div>
  </article>`;
}

function bindLibraryActions(root) {
  $$('[data-open-asset]', root).forEach((card) => {
    card.addEventListener('click', (event) => {
      if (event.target.closest('button,a')) return;
      openAssetSheet(card.dataset.openAsset);
    });
    card.addEventListener('keydown', (event) => {
      if ((event.key === 'Enter' || event.key === ' ') && !event.target.closest('button,a')) {
        event.preventDefault();
        openAssetSheet(card.dataset.openAsset);
      }
    });
  });
  $$('[data-reuse-file]', root).forEach((button) => button.addEventListener('click', (event) => {
    event.stopPropagation();
    openReuseComposer(button.dataset.reuseFile);
  }));
}

function openAssetSheet(fileId) {
  const asset = assetFor(fileId);
  if (!asset) return;
  const uses = occurrencesFor(fileId);
  const last = uses.at(-1);
  const diagnostic = editorialDiagnostic(asset, uses);
  const title = asset.aiTitle || cleanName(asset.name) || 'Short Neptune Media';
  const description = asset.aiDescription || 'L’analyse éditoriale sera complétée dès que Neptune IA aura traité ce contenu.';
  const hashtags = asset.hashtags || [];
  const sources = asset.trendSources || [];
  const level = renewalLevel(asset, uses.length);
  const levelCopy = level === 'renew_now'
    ? 'Une nouvelle émission est recommandée pour apporter de nouveaux angles et de nouvelles images.'
    : level === 'refresh_soon'
      ? 'Ce contenu reste exploitable, mais sa performance doit être surveillée avant de multiplier les rediffusions.'
      : 'Ce contenu peut être reprogrammé avec un angle éditorial différent et au moins 30 jours d’écart.';
  const history = uses.length
    ? uses.map((use) => `<button class="usage-history-item" type="button" data-detail-occurrence="${esc(use.occurrenceId)}"><span>Utilisation ${Number(use.useIndex || 1)}</span><strong>${esc(use.title || title)}</strong><small>${esc(dateTime(use.publishAt))} · ${(use.networks || []).map((network) => PLATFORM_LABELS[network] || network).join(' · ')}</small></button>`).join('')
    : '<div class="detail-empty">Ce short n’a pas encore été programmé.</div>';

  $('#editorEyebrow').textContent = 'FICHE COMPLÈTE · NEPTUNE IA';
  $('#editorTitle').textContent = title;
  $('#editorBody').innerHTML = `<section class="asset-sheet">
    <div class="asset-video"><video controls playsinline preload="metadata" src="${esc(asset.downloadUrl)}" aria-label="${esc(title)}"></video></div>
    <div class="asset-score-card">
      <div class="score-ring" style="--score:${diagnostic.score}"><strong>${diagnostic.score}</strong><span>/100</span></div>
      <div><p class="detail-kicker">DIAGNOSTIC ÉDITORIAL</p><h3>${esc(diagnostic.label)}</h3><p>${esc(levelCopy)}</p></div>
    </div>
    <div class="score-breakdown">${diagnostic.axes.map((axis) => `<div><span><b>${esc(axis.label)}</b><small>${axis.value}/100</small></span><i><em style="width:${axis.value}%"></em></i></div>`).join('')}</div>
    <div class="asset-meta-grid">
      <div><span>Passage d’origine</span><strong>${esc(asset.orderTitle || 'Passage Neptune Media')}</strong></div>
      <div><span>Format</span><strong>${esc(asset.format || 'Neptune Media')}</strong></div>
      <div><span>Utilisations</span><strong>${uses.length}</strong></div>
      <div><span>Réutilisable dès le</span><strong>${esc(dateShort(asset.nextReuseAt))}</strong></div>
    </div>
    <section class="ai-content-block"><p class="detail-kicker">ANGLE NEPTUNE IA</p><h3>${esc(title)}</h3><p>${esc(description)}</p>${hashtags.length ? `<div class="hashtag-list">${hashtags.map((tag) => `<span>#${esc(tag)}</span>`).join('')}</div>` : ''}</section>
    <section class="ai-content-block muted"><p class="detail-kicker">SIGNAL ÉDITORIAL</p><p>${esc(asset.trendSummary || 'Analyse fondée sur le contenu du short et les principes éditoriaux Neptune.')}</p><small>${sources.length ? `Sources : ${esc(sources.join(' · '))}` : 'Aucune source temps réel connectée pour cette analyse.'}</small></section>
    <section class="usage-history"><div class="detail-section-head"><div><p class="detail-kicker">HISTORIQUE</p><h3>Les utilisations de ce contenu</h3></div><span>${uses.length}/5</span></div>${history}</section>
    <div class="asset-sheet-actions"><a class="secondary-sheet-action" href="${esc(asset.downloadUrl)}" download>Télécharger</a><button class="primary-sheet-action" type="button" data-detail-reuse="${esc(asset.fileId)}">${uses.length ? 'Créer une nouvelle utilisation' : 'Programmer ce contenu'}</button></div>
  </section>`;

  $$('[data-detail-occurrence]').forEach((button) => button.addEventListener('click', () => openEditor(button.dataset.detailOccurrence)));
  $('[data-detail-reuse]')?.addEventListener('click', () => openReuseComposer(fileId));
  showEditor();
}

function openEditor(occurrenceId) {
  const occurrence = data.occurrences.find((entry) => entry.occurrenceId === occurrenceId);
  if (!occurrence) return;
  const asset = assetFor(occurrence.fileId);
  selectedOccurrenceId = occurrenceId;
  const title = occurrence.title || asset?.aiTitle || cleanName(asset?.name) || 'Short Neptune Media';
  const description = occurrence.description || asset?.aiDescription || '';
  const hashtags = (occurrence.hashtags || asset?.hashtags || []).join(' ');
  const sources = (asset?.trendSources || []).length ? asset.trendSources.join(' · ') : 'Contexte du short et principes éditoriaux Neptune';
  const useIndex = Number(occurrence.useIndex || 1);
  const warning = useIndex >= 5
    ? '<div class="renewal-callout strong"><strong>Ce contenu a déjà beaucoup servi.</strong><p>Une nouvelle émission est recommandée pour renouveler les angles, les preuves et l’image de votre entreprise.</p><a href="https://media.neptunebusiness.com" target="_blank" rel="noopener">Programmer une nouvelle émission</a></div>'
    : useIndex >= 3
      ? '<div class="renewal-callout"><strong>Surveillez la fatigue du contenu.</strong><p>Comparez ses performances. Une nouvelle émission devient pertinente si la portée ou les interactions baissent.</p></div>'
      : '';
  $('#editorEyebrow').textContent = 'PUBLICATION SÉLECTIONNÉE';
  $('#editorTitle').textContent = title;
  $('#editorBody').innerHTML = `<div class="editor-preview"><strong>${esc(asset?.name || 'Short Neptune Media')}</strong><span>${esc(asset?.orderTitle || 'Production Neptune Media')} · utilisation ${useIndex} · ${dateTime(occurrence.publishAt)}</span></div>
    ${warning}
    <form id="contentForm" class="editor-form">
      <label><span>Titre accrocheur</span><input name="title" maxlength="140" value="${esc(title)}" required></label>
      <label><span>Description qui appelle une réponse</span><textarea name="description" maxlength="1800" required>${esc(description)}</textarea></label>
      <label><span>Hashtags</span><input name="hashtags" value="${esc(hashtags)}" placeholder="entrepreneuriat interview conseils"></label>
      <label><span>Date et heure de publication</span><input name="publishAt" type="datetime-local" value="${esc(toLocalInput(occurrence.publishAt))}" required><small>Le même fichier doit rester espacé d’au moins ${data.minimumReuseDays} jours de ses autres utilisations.</small></label>
      <div><span class="field-label">Canaux de diffusion</span><div class="network-options">${networkOptions(occurrence.networks)}</div></div>
      <div class="ai-signal"><strong>Neptune IA</strong><br>${esc(asset?.trendSummary || 'Texte préparé à partir du contenu disponible.')}<br><b>Sources :</b> ${esc(sources)}</div>
      <button class="editor-save" type="submit">Enregistrer les modifications</button>
    </form>
    <section class="publish-grid"><h3>Publier en mode express</h3><p>La légende est copiée, le fichier est préparé et le canal choisi s’ouvre.</p><div class="publish-buttons">${['youtube', 'tiktok', 'instagram'].map((platform) => `<button class="publish-button" type="button" data-publish-platform="${platform}">${PLATFORM_LABELS[platform]}</button>`).join('')}</div></section>`;
  $('#contentForm').addEventListener('submit', (event) => saveOccurrence(event, occurrence));
  $$('[data-publish-platform]').forEach((button) => button.addEventListener('click', () => publishExpress(occurrence, asset, button.dataset.publishPlatform, button)));
  showEditor();
}

function openReuseComposer(fileId) {
  const asset = assetFor(fileId);
  if (!asset) return;
  const uses = occurrencesFor(fileId).length;
  const nextUse = uses + 1;
  const renewal = nextUse >= 5
    ? '<div class="renewal-callout strong"><strong>Nouvelle émission fortement recommandée.</strong><p>Vous pouvez encore reprogrammer ce short, mais votre audience a besoin de nouveaux angles et de nouvelles images.</p><a href="https://media.neptunebusiness.com" target="_blank" rel="noopener">Réserver une nouvelle émission</a></div>'
    : nextUse >= 3
      ? '<div class="renewal-callout"><strong>Cette vidéo entre dans sa phase de renouvellement.</strong><p>Neptune créera un nouvel angle. Surveillez ensuite sa performance avant une nouvelle réutilisation.</p></div>'
      : '';
  $('#editorEyebrow').textContent = 'NOUVELLE UTILISATION';
  $('#editorTitle').textContent = 'Reprogrammer ce short';
  $('#editorBody').innerHTML = `<div class="editor-preview"><strong>${esc(asset.name || 'Short Neptune Media')}</strong><span>${esc(asset.orderTitle || 'Production Neptune Media')} · future utilisation ${nextUse}</span></div>
    <div class="reuse-explainer"><strong>Ce qui change automatiquement</strong><p>Neptune IA prépare un nouveau titre, une nouvelle description, de nouvelles questions et des hashtags actualisés. La vidéo reste identique.</p></div>
    ${renewal}
    <form id="reuseForm" class="editor-form">
      <label><span>Nouvelle date de publication</span><input name="publishAt" type="datetime-local" min="${esc(toLocalInput(asset.nextReuseAt))}" value="${esc(toLocalInput(asset.nextReuseAt))}" required><small>Premier créneau autorisé : ${esc(dateTime(asset.nextReuseAt))}. Minimum ${data.minimumReuseDays} jours entre deux utilisations.</small></label>
      <div><span class="field-label">Canaux de diffusion</span><div class="network-options">${networkOptions(['youtube', 'tiktok', 'instagram'])}</div></div>
      <button class="editor-save" type="submit">Générer un nouvel angle et programmer</button>
    </form>`;
  $('#reuseForm').addEventListener('submit', (event) => createReuse(event, asset));
  showEditor();
}

function showEditor() {
  clearTimeout(editorCloseTimer);
  const backdrop = $('#editorBackdrop');
  const editor = $('#editor');
  backdrop.hidden = false;
  editor.hidden = false;
  editor.setAttribute('tabindex', '-1');
  document.body.classList.add('editor-open');
  requestAnimationFrame(() => {
    backdrop.classList.add('is-open');
    editor.classList.add('is-open');
    editor.focus({ preventScroll: true });
  });
}

function closeEditor() {
  const backdrop = $('#editorBackdrop');
  const editor = $('#editor');
  backdrop.classList.remove('is-open');
  editor.classList.remove('is-open');
  document.body.classList.remove('editor-open');
  selectedOccurrenceId = '';
  const delay = matchMedia('(prefers-reduced-motion: reduce)').matches ? 0 : 280;
  clearTimeout(editorCloseTimer);
  editorCloseTimer = window.setTimeout(() => {
    backdrop.hidden = true;
    editor.hidden = true;
  }, delay);
}

async function saveOccurrence(event, occurrence) {
  event.preventDefault();
  const form = event.currentTarget;
  const button = $('button[type=submit]', form);
  const values = new FormData(form);
  const networks = values.getAll('networks');
  if (!networks.length) return toast('Choisissez au moins un canal.', true);
  button.disabled = true;
  button.textContent = 'Enregistrement…';
  try {
    const result = await api('/api/client/content-calendar/update', {
      method: 'POST',
      body: JSON.stringify({ occurrenceId: occurrence.occurrenceId, title: values.get('title'), description: values.get('description'), hashtags: values.get('hashtags'), publishAt: new Date(values.get('publishAt')).toISOString(), networks }),
    });
    Object.assign(occurrence, { title: result.title, description: result.description, hashtags: result.hashtags, publishAt: result.publishAt, networks: result.networks, caption: result.caption });
    currentMonth = new Date(result.publishAt);
    render();
    openEditor(occurrence.occurrenceId);
    toast('Publication mise à jour.');
  } catch (error) {
    toast(errorText(error.message, error.payload), true);
  } finally {
    button.disabled = false;
    button.textContent = 'Enregistrer les modifications';
  }
}

async function createReuse(event, asset) {
  event.preventDefault();
  const form = event.currentTarget;
  const button = $('button[type=submit]', form);
  const values = new FormData(form);
  const networks = values.getAll('networks');
  if (!networks.length) return toast('Choisissez au moins un canal.', true);
  button.disabled = true;
  button.textContent = 'Neptune IA prépare le nouvel angle…';
  try {
    const result = await api('/api/client/content-calendar/reuse', {
      method: 'POST',
      body: JSON.stringify({ fileId: asset.fileId, publishAt: new Date(values.get('publishAt')).toISOString(), networks }),
    });
    closeEditor();
    currentMonth = new Date(result.occurrence.publishAt);
    await load({ keepMonth: true, openOccurrenceId: result.occurrence.occurrenceId });
    toast('Nouvelle utilisation programmée avec un texte inédit.');
  } catch (error) {
    toast(errorText(error.message, error.payload), true);
    button.disabled = false;
    button.textContent = 'Générer un nouvel angle et programmer';
  }
}

async function publishExpress(occurrence, asset, platform, button) {
  const title = occurrence.title || asset?.aiTitle || cleanName(asset?.name) || 'Short Neptune Media';
  const caption = [title, occurrence.description, (occurrence.hashtags || []).map((tag) => `#${tag}`).join(' ')].filter(Boolean).join('\n\n');
  const popup = window.open('about:blank', '_blank');
  if (popup) popup.opener = null;
  button.disabled = true;
  try {
    await copyText(caption);
    const shared = await shareFileWhenPossible(asset, caption, title);
    if (shared) {
      try { popup?.close(); } catch {}
    } else {
      download(asset.downloadUrl, asset.name || 'short-neptune.mp4');
      if (popup) popup.location.replace(PLATFORM_URLS[platform]);
      else window.open(PLATFORM_URLS[platform], '_blank', 'noopener');
    }
    await api('/api/client/content-calendar/publish', { method: 'POST', body: JSON.stringify({ occurrenceId: occurrence.occurrenceId, platform }) });
    data.publications = [...data.publications.filter((entry) => !(entry.occurrenceId === occurrence.occurrenceId && entry.platform === platform)), { occurrenceId: occurrence.occurrenceId, platform, status: 'prepared', updatedAt: new Date().toISOString() }];
    render();
    toast(shared ? 'Short envoyé au menu de partage.' : 'Légende copiée, short téléchargé et canal ouvert.');
  } catch (error) {
    try { popup?.close(); } catch {}
    toast(errorText(error.message, error.payload), true);
  } finally {
    button.disabled = false;
  }
}

async function shareFileWhenPossible(asset, caption, title) {
  if (!asset || typeof navigator.share !== 'function' || typeof navigator.canShare !== 'function') return false;
  try {
    const response = await fetch(asset.downloadUrl, { credentials: 'same-origin' });
    if (!response.ok) return false;
    const blob = await response.blob();
    const file = new File([blob], asset.name || 'short-neptune.mp4', { type: blob.type || 'video/mp4' });
    if (!navigator.canShare({ files: [file] })) return false;
    await navigator.share({ title, text: caption, files: [file] });
    return true;
  } catch (error) {
    return error?.name === 'AbortError';
  }
}

function editorialDiagnostic(asset, uses) {
  const title = String(asset.aiTitle || cleanName(asset.name) || '');
  const description = String(asset.aiDescription || '');
  const hashtags = Array.isArray(asset.hashtags) ? asset.hashtags : [];
  const sources = Array.isArray(asset.trendSources) ? asset.trendSources : [];
  const questions = (description.match(/\?/gu) || []).length;
  const hook = clampScore(48 + Math.min(28, title.length * .45) + (/[?!:]/u.test(title) ? 12 : 0));
  const conversation = clampScore(40 + Math.min(36, questions * 18) + Math.min(18, description.length / 45));
  const discoverability = clampScore(38 + Math.min(32, hashtags.length * 7) + (sources.length ? 22 : 0));
  const freshness = clampScore(96 - uses.length * 12 - (uses.length >= 5 ? 12 : 0));
  const score = Math.round(hook * .3 + conversation * .25 + discoverability * .25 + freshness * .2);
  const label = score >= 85 ? 'Très fort potentiel éditorial' : score >= 70 ? 'Prêt à être exploité' : score >= 55 ? 'Bon contenu à optimiser' : 'Angle à retravailler';
  return { score, label, axes: [{ label: 'Accroche', value: hook }, { label: 'Conversation', value: conversation }, { label: 'Référencement', value: discoverability }, { label: 'Fraîcheur', value: freshness }] };
}

function occurrencesFor(fileId) {
  return data.occurrences.filter((item) => item.fileId === fileId).sort((a, b) => new Date(a.publishAt) - new Date(b.publishAt));
}

function networkOptions(selected = []) {
  return ['youtube', 'tiktok', 'instagram'].map((network) => `<label class="network-option"><input name="networks" type="checkbox" value="${network}" ${selected.includes(network) ? 'checked' : ''}><span>${PLATFORM_LABELS[network]}</span></label>`).join('');
}

function renewalLevel(asset, usageCount) {
  if (asset.renewalLevel) return asset.renewalLevel;
  if (usageCount >= 5) return 'renew_now';
  if (usageCount >= 3) return 'refresh_soon';
  return 'reusable';
}

function assetFor(fileId) { return data.assets.find((asset) => asset.fileId === fileId); }
function groupBy(items, keyFn) { const map = new Map(); for (const item of items) { const key = keyFn(item); if (!map.has(key)) map.set(key, []); map.get(key).push(item); } return map; }
function clampScore(value) { return Math.max(0, Math.min(100, Math.round(value))); }
function changeMonth(delta) { currentMonth = new Date(currentMonth.getFullYear(), currentMonth.getMonth() + delta, 1); renderCalendar(); }
async function copyText(value) { if (navigator.clipboard?.writeText && window.isSecureContext) { await navigator.clipboard.writeText(value); return; } const area = document.createElement('textarea'); area.value = value; area.style.position = 'fixed'; area.style.opacity = '0'; document.body.append(area); area.select(); document.execCommand('copy'); area.remove(); }
function download(url, name) { const anchor = document.createElement('a'); anchor.href = url; anchor.download = name; document.body.append(anchor); anchor.click(); anchor.remove(); }
async function api(url, options = {}) { const headers = { Accept: 'application/json', ...(options.headers || {}) }; if (options.body) headers['Content-Type'] = 'application/json'; const response = await fetch(url, { ...options, headers, credentials: 'same-origin' }); const payload = await response.json().catch(() => ({})); if (!response.ok) { const error = new Error(payload.error || `http_${response.status}`); error.payload = payload; throw error; } return payload; }
function sameDay(value, date) { const first = new Date(value || ''); if (Number.isNaN(first.getTime())) return false; return first.getFullYear() === date.getFullYear() && first.getMonth() === date.getMonth() && first.getDate() === date.getDate(); }
function cleanName(value) { return String(value || '').replace(/\.[a-z0-9]{2,5}$/iu, '').replace(/[_-]+/gu, ' ').trim(); }
function dateShort(value) { const date = new Date(value); return Number.isNaN(date.getTime()) ? 'À planifier' : new Intl.DateTimeFormat('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' }).format(date); }
function dateTime(value) { const date = new Date(value); return Number.isNaN(date.getTime()) ? 'À planifier' : new Intl.DateTimeFormat('fr-FR', { dateStyle: 'long', timeStyle: 'short' }).format(date); }
function toLocalInput(value) { const date = new Date(value); if (Number.isNaN(date.getTime())) return ''; const local = new Date(date.getTime() - date.getTimezoneOffset() * 60000); return local.toISOString().slice(0, 16); }
function toast(text, error = false) { const element = $('#toast'); element.textContent = text; element.className = `toast${error ? ' error' : ''}`; element.hidden = false; clearTimeout(toast.timer); toast.timer = setTimeout(() => { element.hidden = true; }, 4600); }
function errorText(code, payload = {}) { return ({ unauthorized: 'Votre session a expiré.', content_not_found: 'Ce short est introuvable.', invalid_publish_date: 'Choisissez une date valide.', invalid_platform: 'Ce canal n’est pas disponible.', reuse_too_soon: `Ce short doit rester espacé d’au moins ${payload.minimumDays || 30} jours. Prochain créneau possible : ${dateTime(payload.nextAllowedAt)}.` })[code] || 'Une erreur est survenue. Réessayez.'; }
function esc(value) { return String(value ?? '').replace(/[&<>"']/gu, (character) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[character]); }
