(() => {
  let csrfToken = '';
  let adminState = null;
  bootstrap();

  async function bootstrap() {
    try {
      const auth = await fetch('/api/auth/status').then((response) => response.ok ? response.json() : null);
      csrfToken = auth?.csrfToken || '';
      if (csrfToken) adminState = await fetch('/api/admin/state').then((response) => response.ok ? response.json() : null);
    } catch {}
    addStudioLinks();
    const observer = new MutationObserver(() => enhance());
    observer.observe(document.body, { childList: true, subtree: true });
    enhance();
  }

  function enhance() {
    enhanceDashboard();
    enhanceEpisodeForm();
    enhanceAdsForm();
  }

  function addStudioLinks() {
    const actions = document.querySelector('.top-actions');
    if (!actions || actions.querySelector('[data-seo-link]')) return;
    const link = document.createElement('a');
    link.className = 'btn';
    link.dataset.seoLink = '1';
    link.href = '/emissions/';
    link.target = '_blank';
    link.rel = 'noopener';
    link.textContent = 'Catalogue public';
    actions.prepend(link);
  }

  function enhanceDashboard() {
    if (!document.querySelector('[data-tab="dashboard"].active')) return;
    const content = document.querySelector('#content');
    if (!content || content.querySelector('.studio-seo-panel')) return;
    const panel = document.createElement('section');
    panel.className = 'panel studio-seo-panel';
    panel.innerHTML = `<div><p class="eyebrow">VISIBILITÉ ORGANIQUE</p><h2>SEO vidéo, GEO et AEO activés</h2><p>Chaque émission publiée dispose maintenant d’une URL indexable, d’un VideoObject, d’un sitemap vidéo et d’un espace pour sa transcription.</p></div><div class="seo-shortcuts"><a class="btn" href="/sitemap.xml" target="_blank">Sitemap</a><a class="btn" href="/video-sitemap.xml" target="_blank">Sitemap vidéo</a><a class="btn" href="/robots.txt" target="_blank">Robots</a></div>`;
    content.append(panel);
  }

  async function enhanceEpisodeForm() {
    const form = document.querySelector('#episodeForm');
    if (!form || form.dataset.metadataReady) return;
    form.dataset.metadataReady = '1';
    const id = form.querySelector('[name="id"]')?.value;
    if (!adminState && csrfToken) adminState = await fetch('/api/admin/state').then((response) => response.ok ? response.json() : null).catch(() => null);
    const episode = adminState?.episodes?.find((item) => item.id === id) || {};
    const metadata = episode.metadata && typeof episode.metadata === 'object' ? episode.metadata : {};
    const actions = form.querySelector('.formActions');
    const block = document.createElement('fieldset');
    block.className = 'metadata-fields full';
    block.innerHTML = `<legend>Référencement, réponses IA et diffusion</legend>${field('Titre SEO','seoTitle',metadata.seoTitle || episode.title || '')}${field('Méta-description','metaDescription',metadata.metaDescription || episode.description || '','textarea','full')}${field('Nom de l’invité','guestName',metadata.guestName || '')}${field('Entreprise de l’invité','guestCompany',metadata.guestCompany || '')}${field('Questions abordées — une par ligne','questions',listValue(metadata.questions),'textarea','full')}${field('Transcription complète','transcript',metadata.transcript || '','textarea','full transcript-field')}${field('Mots-clés éditoriaux — séparés par des virgules','tags',listValue(metadata.tags),'input','full')}<p class="metadata-help full">Ces informations alimentent la page publique de l’émission, les données structurées et les réponses des moteurs de recherche et assistants IA.</p>`;
    form.insertBefore(block, actions);
    if (id && episode.slug) {
      const preview = document.createElement('a');
      preview.className = 'secondary public-preview';
      preview.href = `/emissions/${encodeURIComponent(episode.slug)}/`;
      preview.target = '_blank';
      preview.rel = 'noopener';
      preview.textContent = 'Prévisualiser la page publique';
      actions.prepend(preview);
    }
    form.addEventListener('submit', saveEpisodeWithMetadata, { capture: true });
  }

  async function saveEpisodeWithMetadata(event) {
    event.preventDefault();
    event.stopImmediatePropagation();
    const form = event.currentTarget;
    const data = Object.fromEntries(new FormData(form));
    data.durationSeconds = Number(data.durationSeconds || 0);
    data.displayOrder = Number(data.displayOrder || 100);
    data.metadata = {
      seoTitle: data.seoTitle || '', metaDescription: data.metaDescription || '',
      guestName: data.guestName || '', guestCompany: data.guestCompany || '',
      questions: lines(data.questions), transcript: data.transcript || '', tags: commaList(data.tags),
    };
    for (const key of ['seoTitle','metaDescription','guestName','guestCompany','questions','transcript','tags']) delete data[key];
    const button = form.querySelector('button[type="submit"],button.primary:last-child');
    if (button) { button.disabled = true; button.textContent = 'Enregistrement…'; }
    try {
      const response = await fetch('/api/admin/apply', { method: 'POST', headers: { 'Content-Type': 'application/json', 'X-CSRF-Token': csrfToken }, body: JSON.stringify({ action: 'save_episode', payload: data }) });
      const result = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(result.error || 'operation_failed');
      adminState = await fetch('/api/admin/state').then((item) => item.json());
      document.querySelector('#refresh')?.click();
    } catch (error) {
      alert(`Enregistrement impossible : ${error.message}`);
      if (button) { button.disabled = false; button.textContent = 'Enregistrer'; }
    }
  }

  function enhanceAdsForm() {
    const form = document.querySelector('#adForm');
    if (!form || form.dataset.helpReady) return;
    form.dataset.helpReady = '1';
    const help = document.createElement('p');
    help.className = 'metadata-help full';
    help.textContent = 'Preroll, midroll et postroll utilisent une vidéo. Banner utilise une image. Les clics, impressions et complétions sont suivis dans les statistiques.';
    form.querySelector('.formActions')?.before(help);
  }

  function field(label,name,value,type='input',className='') {
    const control = type === 'textarea' ? `<textarea name="${name}">${escapeHtml(value)}</textarea>` : `<input name="${name}" value="${escapeHtml(value)}">`;
    return `<label class="field ${className}"><span>${label}</span>${control}</label>`;
  }
  function listValue(value){return Array.isArray(value)?value.join('\n'):String(value||'');}
  function lines(value){return String(value||'').split(/\n|\|/).map((item)=>item.trim()).filter(Boolean);}
  function commaList(value){return String(value||'').split(',').map((item)=>item.trim()).filter(Boolean);}
  function escapeHtml(value){return String(value??'').replace(/[&<>"']/g,(char)=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));}
})();
