(() => {
  const ready = (fn) => document.readyState === 'loading' ? document.addEventListener('DOMContentLoaded', fn, { once: true }) : fn();
  ready(() => {
    enhanceLogin();
    enhanceNavigation();
    enhanceTopbar();
    observeApplication();
  });

  function enhanceLogin() {
    const form = document.querySelector('#login');
    if (!form || form.querySelector('.studio-public-access')) return;
    const access = document.createElement('div');
    access.className = 'studio-public-access';
    access.innerHTML = '<a href="/direct/">● Regarder la Web TV 24h/24</a><a href="/emissions/">Voir toutes les émissions</a>';
    form.querySelector('h1 + p')?.after(access);
    const note = document.createElement('p');
    note.className = 'studio-security-note';
    note.textContent = 'Le Studio est réservé à l’équipe Neptune. La Web TV publique reste accessible sans connexion.';
    form.append(note);
  }

  function enhanceNavigation() {
    const ads = document.querySelector('[data-tab="ads"]');
    if (ads) ads.innerHTML = '<span>◈</span>Publicités & campagnes';
    const dashboard = document.querySelector('[data-tab="dashboard"]');
    if (dashboard) dashboard.innerHTML = '<span>⌁</span>Centre de contrôle';
    const episodes = document.querySelector('[data-tab="episodes"]');
    if (episodes) episodes.innerHTML = '<span>▶</span>Émissions & diffusion';
  }

  function enhanceTopbar() {
    const actions = document.querySelector('.top-actions');
    if (!actions) return;
    const webTv = actions.querySelector('a[href="/"]');
    if (webTv) { webTv.href = '/direct/'; webTv.textContent = 'Voir le direct'; }
    if (!actions.querySelector('[href="/emissions/"]')) {
      const catalog = document.createElement('a');
      catalog.className = 'btn';
      catalog.href = '/emissions/';
      catalog.target = '_blank';
      catalog.rel = 'noopener';
      catalog.textContent = 'Catalogue public';
      actions.prepend(catalog);
    }
    if (!actions.querySelector('[data-open-ads]')) {
      const ads = document.createElement('button');
      ads.className = 'btn studio-quick-ad';
      ads.type = 'button';
      ads.dataset.openAds = '';
      ads.textContent = 'Gérer les publicités';
      ads.addEventListener('click', () => document.querySelector('[data-tab="ads"]')?.click());
      actions.prepend(ads);
    }
  }

  function observeApplication() {
    const content = document.querySelector('#content');
    const app = document.querySelector('#app');
    if (!content || !app) return;
    const apply = () => {
      if (app.hidden) return;
      enhanceTopbar();
      const title = document.querySelector('#title')?.textContent?.trim();
      if (title === 'Vue d’ensemble' || title === 'Centre de contrôle') addControlHub(content);
    };
    const observer = new MutationObserver(apply);
    observer.observe(app, { attributes: true, attributeFilter: ['hidden'] });
    observer.observe(content, { childList: true, subtree: false });
    apply();
  }

  function addControlHub(content) {
    if (content.querySelector('.studio-command-hub')) return;
    const hub = document.createElement('section');
    hub.className = 'studio-command-hub';
    hub.innerHTML = `<div class="studio-command-head"><div><p class="eyebrow">WEB TV + STUDIO MEDIA</p><h2>Tout le média Neptune depuis un seul espace.</h2><p>La publication d’une émission, son passage à l’antenne, ses publicités et ses performances sont synchronisés avec la Web TV publique.</p></div><div class="studio-command-links"><a class="btn btn-primary" href="/direct/" target="_blank" rel="noopener">Ouvrir le direct</a><a class="btn" href="/emissions/" target="_blank" rel="noopener">Voir le catalogue</a></div></div><div class="studio-command-grid">${card('live','●','Antenne 24/24','Activer, retirer et réordonner les émissions de la boucle permanente.')}${card('episodes','▶','Émissions','Publier, programmer, enrichir le SEO et gérer chaque contenu vidéo.')}${card('ads','◈','Publicités','Créer les campagnes, définir les emplacements et suivre les résultats.')}${card('dashboard','⌁','Audience & conversions','Suivre les vues, le temps regardé, les clics et la transformation.')}${card('programs','▦','Programmes','Organiser Hors Norme, Concept Libre et les futurs formats.')}${card('users','◎','Accès & sécurité','Gérer les rôles, utilisateurs et traces d’administration.')}</div>`;
    content.prepend(hub);
    hub.querySelectorAll('[data-command-tab]').forEach((button) => button.addEventListener('click', () => document.querySelector(`[data-tab="${button.dataset.commandTab}"]`)?.click()));
  }

  function card(tab, icon, title, text) {
    return `<button type="button" data-command-tab="${tab}"><span>${icon}</span><strong>${title}</strong><small>${text}</small><b>Ouvrir →</b></button>`;
  }
})();