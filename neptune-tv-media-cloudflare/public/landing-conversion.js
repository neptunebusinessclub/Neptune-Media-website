(() => {
  const BOOKING = 'https://media.neptunebusiness.com/';
  const ready = (fn) => document.readyState === 'loading' ? document.addEventListener('DOMContentLoaded', fn, { once: true }) : fn();

  ready(() => {
    updateHeader();
    updateHero();
    addProblemSection();
    enhanceCatalog();
    enhanceFormats();
    enhanceDeliverables();
    enhanceStudio();
    enhanceExperience();
    addAudienceSection();
    expandFaq();
    enhanceFinalCta();
    enhanceFooter();
    addMobileBar();
    watchLiveSection();
  });

  function updateHeader() {
    const nav = document.querySelector('.nav');
    const links = nav ? [...nav.querySelectorAll('a:not(.nav-cta)')] : [];
    const labels = ['Neptune TV', 'Les formats', 'Le studio', 'Comment ça se passe', 'Questions'];
    links.slice(-5).forEach((link, index) => { if (labels[index]) link.textContent = labels[index]; });

    const secondary = document.querySelector('.header-actions .btn-secondary');
    if (secondary) {
      secondary.href = '/direct/';
      secondary.textContent = 'Voir le direct';
      secondary.classList.add('header-live-link');
    }
    const primary = document.querySelector('.header-actions .btn-primary');
    if (primary) primary.textContent = 'Voir les créneaux';
    const navCta = document.querySelector('.nav-cta');
    if (navCta) navCta.textContent = 'Voir les créneaux';
  }

  function updateHero() {
    setText('.hero .eyebrow', 'NEPTUNE MEDIA · ÉMISSIONS D’ENTREPRISE');
    setText('.hero-copy > p', 'Neptune transforme votre histoire, votre expertise et vos convictions en une prise de parole professionnelle que votre audience aura réellement envie de regarder.');
    const actions = document.querySelectorAll('.hero-actions a');
    if (actions[0]) { actions[0].href = '/direct/'; actions[0].innerHTML = playIcon() + 'Regarder la Web TV'; }
    if (actions[1]) { actions[1].href = '#formats'; actions[1].textContent = 'Choisir mon format'; }
    const chips = document.querySelectorAll('.hero-proof .proof-chip');
    ['Préparation accompagnée', 'Tournage en studio', 'Montage professionnel', 'Fichiers prêts à diffuser'].forEach((text, index) => { if (chips[index]) chips[index].textContent = text; });
    const liveLabel = document.querySelector('.hero-media .live-label');
    if (liveLabel) liveLabel.textContent = 'WEB TV NEPTUNE';
  }

  function addProblemSection() {
    const anchor = document.querySelector('.reality-strip');
    if (!anchor || document.querySelector('#pourquoi-neptune')) return;
    const section = document.createElement('section');
    section.id = 'pourquoi-neptune';
    section.className = 'section problem-section';
    section.innerHTML = `<div class="container"><div class="section-head"><div><span class="eyebrow">LE PROBLÈME N’EST PAS VOTRE HISTOIRE</span><h2>Le savoir-faire se regarde avant de s’acheter. Encore faut-il savoir le raconter.</h2></div><p>Votre expertise existe déjà. Neptune construit l’angle, le cadre et la conversation qui la rendent claire, humaine et mémorable.</p></div><div class="problem-grid">${problemCard('01','Vous connaissez votre entreprise','Mais vous ne savez pas toujours par quel moment commencer pour captiver.')}${problemCard('02','Vous avez des choses importantes à dire','Mais vous ne voulez ni réciter un texte ni jouer un rôle face caméra.')}${problemCard('03','Vous voulez un résultat professionnel','Sans devoir devenir journaliste, réalisateur ou producteur de votre propre émission.')}</div></div>`;
    anchor.after(section);
  }

  function watchLiveSection() {
    const apply = () => {
      const section = document.querySelector('#direct');
      if (!section || section.dataset.conversionReady) return Boolean(section);
      section.dataset.conversionReady = '1';
      setText('#direct .live-home-head h2', 'Neptune Media diffuse les émissions programmées.');
      setText('#direct .live-home-head p', 'Les émissions complètes s’enchaînent selon la programmation pilotée depuis le Studio Media. Regardez le direct ou choisissez votre émission.');
      const button = section.querySelector('.live-home-head .btn');
      if (button) button.textContent = 'Ouvrir la chaîne en direct';
      const head = section.querySelector('.section-head');
      if (head && !head.querySelector('.live-admin-proof')) {
        const proof = document.createElement('div');
        proof.className = 'live-admin-proof';
        proof.innerHTML = '<span>Émissions pilotées depuis le Studio</span><span>Programmation permanente</span><span>Publicités administrables</span>';
        head.after(proof);
      }
      return true;
    };
    if (apply()) return;
    const observer = new MutationObserver(() => { if (apply()) observer.disconnect(); });
    observer.observe(document.body, { childList: true, subtree: true });
    setTimeout(() => observer.disconnect(), 8000);
  }

  function enhanceCatalog() {
    setText('#a-voir .section-head h2', 'Ce ne sont pas des maquettes. Ce sont de vraies émissions.');
    setText('#a-voir .section-head p', 'Découvrez les programmes produits par Neptune Media et observez le niveau de préparation, de cadrage, d’écoute et de montage proposé aux invités.');
    const container = document.querySelector('#a-voir .container');
    if (container && !container.querySelector('.catalog-conversion-actions')) {
      const actions = document.createElement('div');
      actions.className = 'catalog-conversion-actions';
      actions.innerHTML = '<a class="btn btn-dark" href="/direct/">Regarder le direct</a><a class="btn btn-secondary" href="/emissions/">Voir toutes les émissions</a>';
      container.append(actions);
    }
  }

  function enhanceFormats() {
    setText('#formats .eyebrow', 'DEUX MANIÈRES DE PRENDRE LA PAROLE');
    setText('#formats .section-head h2', 'Le bon format dépend de ce que vous voulez révéler.');
    setText('#formats .section-head p', 'Hors Norme révèle votre trajectoire. Concept Libre construit un programme autour de votre expertise.');
    const cards = document.querySelectorAll('#formats .format-card');
    const configs = [
      { label: 'Hors Norme', image: '/assets/posters/studio-wide.webp', alt: 'Décor canapé sombre du format Hors Norme', promise: 'L’émission qui révèle l’histoire humaine derrière votre entreprise.', items: ['Raconter une trajectoire', 'Revenir sur un déclic ou une épreuve'], program: '/programmes/hors-norme/', cta: 'Voir les créneaux Hors Norme', format: 'horsnorme' },
      { label: 'Concept Libre', image: '/assets/posters/concept-libre-wide.webp', alt: 'Plateau clair du format Concept Libre', promise: 'Une émission conçue autour de votre expertise, de votre marque ou de votre audience.', items: ['Présenter une méthode ou une démonstration', 'Imaginer un jeu, une chronique ou un échange'], program: '/programmes/concept-libre/', cta: 'Construire mon Concept Libre', format: 'libre' }
    ];
    cards.forEach((card, index) => {
      const config = configs[index];
      if (!config) return;
      card.dataset.formatVisual = config.format;
      const image = card.querySelector('img');
      if (image) { image.src = config.image; image.alt = config.alt; }
      const paragraph = card.querySelector('.format-card-content > p');
      if (paragraph) paragraph.textContent = config.promise;
      const oldBenefits = card.querySelector('.format-benefits');
      if (oldBenefits) oldBenefits.remove();
      const benefits = document.createElement('div');
      benefits.className = 'format-benefits';
      benefits.innerHTML = `<strong>Idéal pour</strong><ul>${config.items.map((item) => `<li>${item}</li>`).join('')}</ul>`;
      paragraph?.after(benefits);
      const links = card.querySelectorAll('.format-card-actions a');
      if (links[0]) {
        const url = new URL(BOOKING);
        url.searchParams.set('utm_source', 'webtv');
        url.searchParams.set('utm_medium', 'landing_format');
        url.searchParams.set('utm_campaign', 'neptune_media');
        url.searchParams.set('format', config.format);
        links[0].href = url.toString();
        links[0].textContent = config.cta;
      }
    });
  }

  function enhanceDeliverables() {
    const section = document.querySelector('#livrables');
    if (!section) return;
    setText('#livrables .eyebrow', 'PLUS QU’UN TOURNAGE');
    setText('#livrables .section-head h2', 'Vous n’achetez pas une caméra. Vous achetez une prise de parole maîtrisée.');
    setText('#livrables .section-head p', 'L’angle, la préparation, la conduite de l’échange, le plateau et le montage transforment votre expertise en un contenu durable.');
    if (!section.querySelector('.deliverables-cta')) {
      const cta = document.createElement('div');
      cta.className = 'deliverables-cta';
      cta.innerHTML = `<a class="btn btn-primary" href="#formats">Comparer les deux formats</a><a class="btn btn-secondary" data-funnel href="${BOOKING}">Voir les créneaux disponibles</a>`;
      section.querySelector('.container')?.append(cta);
    }
  }

  function enhanceStudio() {
    setText('#studio .eyebrow', 'UN VRAI PLATEAU · UN VRAI OUTIL DE PILOTAGE');
    setText('#studio h2', 'Entrez sur le plateau en sachant exactement où vous allez tourner.');
    setText('#studio .studio-copy > p', 'Découvrez l’environnement, les cadrages, les micros et l’habillage qui mettront votre parole en valeur. Après production, la Web TV, les émissions et les campagnes sont pilotées depuis le Studio Media.');
    const copy = document.querySelector('#studio .studio-copy');
    if (copy && !copy.querySelector('.studio-control-preview')) {
      const preview = document.createElement('div');
      preview.className = 'studio-control-preview';
      preview.innerHTML = `${controlItem('●','Antenne programmée','Activer, retirer et réordonner les émissions diffusées en continu.')}${controlItem('▶','Émissions','Publier, programmer et enrichir chaque page vidéo.')}${controlItem('◈','Publicités','Gérer les campagnes, emplacements, périodes et statistiques.')}${controlItem('⌁','Audience','Suivre les vues, le temps regardé, les clics et les conversions.')}`;
      copy.append(preview);
      const actions = document.createElement('div');
      actions.className = 'studio-public-actions';
      actions.innerHTML = '<a class="btn btn-dark" href="/direct/">Voir la Web TV</a><a class="btn btn-secondary" href="/studio/">Accéder au Studio Media</a>';
      copy.append(actions);
    }
  }

  function enhanceExperience() {
    setText('#experience .eyebrow', 'UNE EXPÉRIENCE GUIDÉE');
    setText('#experience .section-head h2', 'Vous connaissez votre histoire. Nous construisons le cadre pour la révéler.');
    setText('#experience .section-head p', 'De la préparation au fichier final, chaque étape réduit l’incertitude et vous permet de vous concentrer sur ce que vous avez réellement à transmettre.');
  }

  function addAudienceSection() {
    const questions = document.querySelector('#questions');
    if (!questions || document.querySelector('#pour-qui')) return;
    const section = document.createElement('section');
    section.id = 'pour-qui';
    section.className = 'section audience-section';
    section.innerHTML = `<div class="container"><div class="section-head"><div><span class="eyebrow">POUR QUI</span><h2>Une émission pour les professionnels qui ont quelque chose de réel à transmettre.</h2></div><p>Neptune est conçu pour révéler une trajectoire, une expertise ou un univers — pas pour produire une publicité générique de plus.</p></div><div class="audience-grid"><article class="audience-card positive"><span>✓</span><h3>Cette expérience est faite pour vous si…</h3><ul><li>Votre entreprise est née d’un problème réel.</li><li>Votre audience ne connaît pas encore votre histoire.</li><li>Vous voulez rendre votre expertise plus humaine.</li><li>Vous souhaitez être guidé devant la caméra.</li><li>Vous cherchez un contenu durable et réutilisable.</li></ul></article><article class="audience-card negative"><span>×</span><h3>Ce format n’est probablement pas adapté si…</h3><ul><li>Vous cherchez uniquement une captation rapide.</li><li>Vous voulez réciter un argumentaire mot pour mot.</li><li>Vous refusez toute dimension humaine ou éditoriale.</li><li>Vous ne souhaitez consacrer aucun temps à la préparation.</li></ul></article></div></div>`;
    questions.before(section);
  }

  function expandFaq() {
    setText('#questions .faq-intro h2', 'Avant de passer à l’antenne.');
    setText('#questions .faq-intro p', 'Les réponses essentielles, sans détour.');
    const list = document.querySelector('#questions .faq-list');
    if (!list || list.dataset.normalized === '1') return;
    list.dataset.normalized = '1';
    const items = [
      ['Dois-je être à l’aise face caméra ?', 'Non. La préparation et les relances vous aident à rester naturel.'],
      ['Dois-je apprendre un texte ?', 'Non. Vous préparez des idées et des moments importants, puis la conversation reste naturelle.'],
      ['Mon activité est très technique. Est-ce adapté ?', 'Oui. Neptune relie votre expertise à un problème, une décision et un résultat compréhensibles.'],
      ['Puis-je publier sur mes réseaux et supports ?', 'Les droits d’utilisation sont précisés dans l’offre et les conditions de votre commande.'],
      ['Comment accéder à la Web TV ?', 'Le direct et les émissions à la demande sont accessibles depuis la navigation Neptune Media.']
    ];
    list.innerHTML = items.map(([question, answer], index) => `<article class="faq-item" data-faq><button id="faq-button-${index + 1}" type="button" aria-expanded="false" aria-controls="faq-answer-${index + 1}"><span>${question}</span><span aria-hidden="true">+</span></button><div id="faq-answer-${index + 1}" class="faq-answer" role="region" aria-labelledby="faq-button-${index + 1}" hidden><div><p>${answer}</p></div></div></article>`).join('');
  }

  function enhanceFinalCta() {
    setText('.cta-card .eyebrow', 'VOTRE HISTOIRE EST DÉJÀ LÀ');
    setText('.cta-card h2', 'Le cadre pour la révéler aussi.');
    setText('.cta-card > p', 'Choisissez le format qui correspond à votre objectif, regardez les émissions réelles et consultez les prochains créneaux de tournage.');
    const actions = document.querySelectorAll('.cta-card .cta-actions a');
    if (actions[0]) actions[0].textContent = 'Voir les créneaux disponibles';
    if (actions[1]) { actions[1].href = '/direct/'; actions[1].textContent = 'Regarder la Web TV'; }
  }

  function enhanceFooter() {
    const explore = document.querySelector('.footer-col:nth-child(2)');
    if (explore && !explore.querySelector('a[href="/emissions/"]')) {
      explore.insertAdjacentHTML('afterbegin', '<a href="/direct/">Voir le direct</a><a href="/emissions/">Toutes les émissions</a>');
    }
    const information = document.querySelector('.footer-col:last-child');
    if (information && !information.querySelector('a[href="/studio/"]')) information.insertAdjacentHTML('beforeend', '<a href="/studio/">Studio Media</a>');
  }

  function addMobileBar() {
    if (document.querySelector('.mobile-conversion-bar')) return;
    const bar = document.createElement('div');
    bar.className = 'mobile-conversion-bar';
    bar.innerHTML = `<a href="/direct/"><span>●</span> Web TV</a><a class="primary" data-funnel href="${BOOKING}">Voir les créneaux</a>`;
    document.body.append(bar);
  }

  function problemCard(number, title, text) { return `<article><span>${number}</span><h3>${title}</h3><p>${text}</p></article>`; }
  function controlItem(icon, title, text) { return `<article><span>${icon}</span><div><strong>${title}</strong><small>${text}</small></div></article>`; }
  function playIcon() { return '<svg aria-hidden="true" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="9" stroke="currentColor" stroke-width="1.6"/><path d="M10 8.7v6.6l5-3.3-5-3.3Z" fill="currentColor"/></svg> '; }
  function setText(selector, text) { const element = document.querySelector(selector); if (element) element.textContent = text; }
})();