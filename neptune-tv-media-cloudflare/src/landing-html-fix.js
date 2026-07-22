const PROBLEM_CHAT_SECTION = `
  <section class="section problem-chat-static" id="probleme" data-aida-stage="interest">
    <div class="container problem-chat-static__inner">
      <header class="problem-chat-static__header">
        <span class="eyebrow">Ce que vous vous dites déjà</span>
        <h2><span class="problem-chat-static__title-line problem-chat-static__title-line--primary">Vous avez besoin d’être visible,</span><span class="problem-chat-static__title-line problem-chat-static__title-line--accent">pas de vous former.</span></h2>
        <p>Alors arrêtez de chercher des solutions épuisantes.</p>
      </header>

      <div class="problem-chat-static__thread" aria-label="Discussion entre un dirigeant et Neptune Media">
        <article class="problem-chat-static__exchange"><div class="problem-chat-static__bubble problem-chat-static__bubble--problem"><span class="problem-chat-static__sender">Vous</span><p>« Mon entreprise est sérieuse mais je suis inconnu de mon marché. »</p></div><div class="problem-chat-static__bubble problem-chat-static__bubble--answer"><span class="problem-chat-static__sender">Neptune Media</span><p>Nous réalisons des émissions qui attirent vos futurs clients naturellement.</p></div></article>
        <article class="problem-chat-static__exchange"><div class="problem-chat-static__bubble problem-chat-static__bubble--problem"><span class="problem-chat-static__sender">Vous</span><p>« Je sais qu’il faut publier mais je ne sais pas quoi dire. »</p></div><div class="problem-chat-static__bubble problem-chat-static__bubble--answer"><span class="problem-chat-static__sender">Neptune Media</span><p>Nous préparons les bons angles avant d’allumer la caméra.</p></div></article>
        <article class="problem-chat-static__exchange"><div class="problem-chat-static__bubble problem-chat-static__bubble--problem"><span class="problem-chat-static__sender">Vous</span><p>« Je n’ai pas le temps de filmer, monter et recommencer chaque semaine. »</p></div><div class="problem-chat-static__bubble problem-chat-static__bubble--answer"><span class="problem-chat-static__sender">Neptune Media</span><p>Et nous non plus. C’est pour ça que nous avons perfectionné le tout en une demi-journée.</p></div></article>
        <article class="problem-chat-static__exchange"><div class="problem-chat-static__bubble problem-chat-static__bubble--problem"><span class="problem-chat-static__sender">Vous</span><p>« J’ai déjà payé pour de belles vidéos qui n’ont rien changé. »</p></div><div class="problem-chat-static__bubble problem-chat-static__bubble--answer"><span class="problem-chat-static__sender">Neptune Media</span><p>Ça fait mal… Ici, vos émissions tourneront sur Neptune TV en continu et vous garderez vos contenus réutilisables à l’infini.</p></div></article>
      </div>

      <div class="problem-chat-static__conclusion"><span>C’est un investissement, on le sait mais attendez de savoir la suite…</span><i aria-hidden="true">↓</i></div>
    </div>
  </section>`;

const BACKSTAGE_STUDIO_SECTION = `
  <section class="section backstage-studio-section" id="solution" data-aida-stage="desire" data-backstage-version="10">
    <div class="container backstage-studio-section__inner">
      <header class="backstage-studio-section__header" data-backstage-reveal data-backstage-order="0">
        <span class="eyebrow">Dans les coulisses</span>
        <h2>Une équipe et un studio complet <span>à votre unique disposition.</span></h2>
        <p class="backstage-studio-section__subtitle">C'est simple, vous ne réfléchissez pas et en plus c'est sur-mesure.</p>
        <p class="backstage-studio-section__copy">Venez accompagné avec votre équipe, ça leur fera plaisir, le Jeu Connexio est fait pour ça.</p>
      </header>

      <div class="backstage-studio-section__gallery" aria-label="Quelques extraits exacts de l’expérience vécue au studio Neptune Media">
        <article class="backstage-studio-section__media backstage-studio-section__media--wide" data-backstage-reveal data-backstage-order="1">
          <video src="https://lh3.googleusercontent.com/d/1WlyVRXsKSxMsDov2mapvWhEoak5e8y57" poster="https://lh3.googleusercontent.com/d/1WlyVRXsKSxMsDov2mapvWhEoak5e8y57=w1200" autoplay muted loop playsinline preload="metadata" disablepictureinpicture controlslist="nodownload noplaybackrate" data-backstage-video aria-label="Vidéo backstage Neptune Media : découverte du studio"></video>
          <div class="backstage-studio-section__caption"><div><span>Le studio</span><strong>Tout est prêt avant votre arrivée.</strong></div></div>
        </article>
        <article class="backstage-studio-section__media" data-backstage-reveal data-backstage-order="2">
          <video src="https://lh3.googleusercontent.com/d/16EQ9ZB_bX6l5RxdWr4KURGhKgLKjYoCs" poster="https://lh3.googleusercontent.com/d/16EQ9ZB_bX6l5RxdWr4KURGhKgLKjYoCs=w1200" autoplay muted loop playsinline preload="metadata" disablepictureinpicture controlslist="nodownload noplaybackrate" data-backstage-video aria-label="Vidéo backstage Neptune Media : votre équipe pendant le tournage"></video>
          <div class="backstage-studio-section__caption"><div><span>Votre équipe</span><strong>Elle découvre, réagit et partage le moment avec vous.</strong></div></div>
        </article>
        <article class="backstage-studio-section__media" data-backstage-reveal data-backstage-order="3">
          <video src="https://lh3.googleusercontent.com/d/1zNuZx-QK9qeZvxfwHkHoQ4s-cZs68Ls-" poster="https://lh3.googleusercontent.com/d/1zNuZx-QK9qeZvxfwHkHoQ4s-cZs68Ls-=w1200" autoplay muted loop playsinline preload="metadata" disablepictureinpicture controlslist="nodownload noplaybackrate" data-backstage-video aria-label="Vidéo backstage Neptune Media : la régie"></video>
          <div class="backstage-studio-section__caption"><div><span>La régie</span><strong>Vous vivez le moment, Neptune gère le reste.</strong></div></div>
        </article>
        <article class="backstage-studio-section__media backstage-studio-section__media--landscape backstage-studio-section__media--exact-photo" data-backstage-reveal data-backstage-order="4">
          <img src="https://lh3.googleusercontent.com/d/1QT_UW8AWvBtv48lRdlgNKER0dmis8upO=w1600" alt="Les quatre participants réunis sur le plateau Neptune Media pour le Jeu Connexio" loading="lazy" decoding="async">
          <div class="backstage-studio-section__caption"><div><span>Le Jeu Connexio</span><strong>Le tournage devient une expérience collective.</strong></div></div>
        </article>
      </div>

      <div class="backstage-studio-section__signature" data-backstage-reveal data-backstage-order="5">
        <span aria-hidden="true"></span>
        <p><strong>Le tout servi sur un plateau car c'est VOTRE moment</strong></p>
      </div>
    </div>
  </section>`;

const FORMATS_SHOWCASE_SECTION = `
  <section class="section formats-showcase" id="formats" data-aida-stage="desire" data-formats-showcase-version="1">
    <div class="container formats-showcase__inner">
      <header class="formats-showcase__header">
        <span class="formats-showcase__eyebrow">Deux façons de créer. Un seul objectif : des résultats.</span>
        <h2>Comment avec du contenu je peux avoir plus de client&nbsp;?</h2>
        <p class="formats-showcase__subtitle">En créant de la <span class="trust">confiance</span> et du <span class="link">lien</span> avec votre audience.</p>
      </header>

      <div class="formats-showcase__grid">
        <article class="format-showcase-card format-showcase-card--guided">
          <header class="format-showcase-card__head">
            <span class="format-showcase-card__icon" aria-hidden="true"><img src="/assets/logo-neptune.svg" alt=""></span>
            <div class="format-showcase-card__label">
              <h3>Hors Norme</h3>
              <p class="format-showcase-card__promise">Laissez-vous guider par notre format</p>
            </div>
            <p class="format-showcase-card__description">Nous structurons le fond et la forme pour raconter votre histoire de manière claire, impactante et mémorable.</p>
          </header>

          <div class="format-carousel" data-format-carousel data-interval="4600" role="region" aria-roledescription="carrousel" aria-label="Ambiances Hors Norme">
            <div class="format-carousel__viewport">
              <div class="format-carousel__track" data-format-track>
                <figure class="format-carousel__slide is-active" data-format-slide><span class="format-carousel__visual format-carousel__visual--hn1" role="img" aria-label="Plateau Hors Norme avec deux canapés et une ambiance bleue"></span></figure>
                <figure class="format-carousel__slide" data-format-slide><span class="format-carousel__visual format-carousel__visual--hn2" role="img" aria-label="Plateau Hors Norme avec deux fauteuils et une table ronde"></span></figure>
              </div>
            </div>
            <div class="format-carousel__controls">
              <button class="format-carousel__arrow" type="button" data-format-prev aria-label="Image précédente">‹</button>
              <div class="format-carousel__dots" aria-label="Choisir une image">
                <button class="format-carousel__dot" type="button" data-format-dot aria-current="true"></button>
                <button class="format-carousel__dot" type="button" data-format-dot aria-current="false"></button>
              </div>
              <button class="format-carousel__arrow" type="button" data-format-next aria-label="Image suivante">›</button>
            </div>
          </div>

          <ul class="format-showcase-card__features">
            <li><svg aria-hidden="true" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="8" stroke="currentColor" stroke-width="1.7"/><path d="M12 7v5l3 2" stroke="currentColor" stroke-width="1.7" stroke-linecap="round"/></svg><span>Accompagnement expert</span></li>
            <li><svg aria-hidden="true" viewBox="0 0 24 24" fill="none"><path d="M7 3h8l3 3v15H7z" stroke="currentColor" stroke-width="1.7"/><path d="M10 11h5M10 15h5" stroke="currentColor" stroke-width="1.7" stroke-linecap="round"/></svg><span>Récit structuré et percutant</span></li>
            <li><svg aria-hidden="true" viewBox="0 0 24 24" fill="none"><path d="m4 17 5-5 4 3 7-8" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/><path d="M16 7h4v4" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/></svg><span>Contenu pensé pour l’impact</span></li>
          </ul>
        </article>

        <article class="format-showcase-card format-showcase-card--libre">
          <header class="format-showcase-card__head">
            <span class="format-showcase-card__icon" aria-hidden="true"><svg viewBox="0 0 32 32" fill="none"><path d="M5 10h22M5 22h22" stroke="currentColor" stroke-width="2" stroke-linecap="round"/><circle cx="12" cy="10" r="3" fill="#080b19" stroke="currentColor" stroke-width="2"/><circle cx="21" cy="22" r="3" fill="#080b19" stroke="currentColor" stroke-width="2"/></svg></span>
            <div class="format-showcase-card__label">
              <h3>Concept Libre</h3>
              <p class="format-showcase-card__promise">Réservez le studio en autonomie et créez votre propre projet</p>
            </div>
            <p class="format-showcase-card__description">Profitez d’un studio modulaire, d’équipements haut de gamme et d’une totale liberté pour donner vie à vos idées.</p>
          </header>

          <div class="format-carousel" data-format-carousel data-interval="5100" role="region" aria-roledescription="carrousel" aria-label="Configurations Concept Libre">
            <div class="format-carousel__viewport">
              <div class="format-carousel__track" data-format-track>
                <figure class="format-carousel__slide is-active" data-format-slide><span class="format-carousel__visual format-carousel__visual--cl1" role="img" aria-label="Concept Libre avec un comptoir central et deux tabourets"></span></figure>
                <figure class="format-carousel__slide" data-format-slide><span class="format-carousel__visual format-carousel__visual--cl2" role="img" aria-label="Concept Libre avec deux canapés et une table basse"></span></figure>
                <figure class="format-carousel__slide" data-format-slide><span class="format-carousel__visual format-carousel__visual--cl3" role="img" aria-label="Concept Libre avec trois comptoirs modulaires"></span></figure>
              </div>
            </div>
            <div class="format-carousel__controls">
              <button class="format-carousel__arrow" type="button" data-format-prev aria-label="Image précédente">‹</button>
              <div class="format-carousel__dots" aria-label="Choisir une image">
                <button class="format-carousel__dot" type="button" data-format-dot aria-current="true"></button>
                <button class="format-carousel__dot" type="button" data-format-dot aria-current="false"></button>
                <button class="format-carousel__dot" type="button" data-format-dot aria-current="false"></button>
              </div>
              <button class="format-carousel__arrow" type="button" data-format-next aria-label="Image suivante">›</button>
            </div>
          </div>

          <ul class="format-showcase-card__features">
            <li><svg aria-hidden="true" viewBox="0 0 24 24" fill="none"><rect x="4" y="4" width="6" height="6" rx="1" stroke="currentColor" stroke-width="1.7"/><rect x="14" y="4" width="6" height="6" rx="1" stroke="currentColor" stroke-width="1.7"/><rect x="4" y="14" width="6" height="6" rx="1" stroke="currentColor" stroke-width="1.7"/><rect x="14" y="14" width="6" height="6" rx="1" stroke="currentColor" stroke-width="1.7"/></svg><span>Liberté totale de création</span></li>
            <li><svg aria-hidden="true" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="13" r="8" stroke="currentColor" stroke-width="1.7"/><path d="M12 13V8M9 3h6" stroke="currentColor" stroke-width="1.7" stroke-linecap="round"/></svg><span>Réservez et produisez à votre rythme</span></li>
            <li><svg aria-hidden="true" viewBox="0 0 24 24" fill="none"><rect x="3" y="6" width="13" height="12" rx="2" stroke="currentColor" stroke-width="1.7"/><path d="m16 10 5-3v10l-5-3" stroke="currentColor" stroke-width="1.7" stroke-linejoin="round"/></svg><span>Un studio pro, 100&nbsp;% modulable</span></li>
          </ul>
        </article>
      </div>

      <div class="formats-showcase__note">
        <svg aria-hidden="true" viewBox="0 0 24 24" fill="none"><path d="m12 2 1.7 5.3L19 9l-5.3 1.7L12 16l-1.7-5.3L5 9l5.3-1.7L12 2Z" stroke="currentColor" stroke-width="1.5"/><path d="m19 15 .8 2.2L22 18l-2.2.8L19 21l-.8-2.2L16 18l2.2-.8L19 15Z" stroke="currentColor" stroke-width="1.3"/></svg>
        <span>Que vous soyez accompagné ou totalement autonome, notre studio et notre équipe sont là pour faire de vos idées <strong>du contenu qui marque.</strong></span>
      </div>
    </div>
  </section>`;

export async function fixLandingAssetOrder(response) {
  let body = await response.text();

  const oldProblemSection = /<section\b[^>]*\bid=["']probleme["'][^>]*>[\s\S]*?<\/section>/i;
  body = oldProblemSection.test(body) ? body.replace(oldProblemSection, PROBLEM_CHAT_SECTION) : body.replace('</main>', `${PROBLEM_CHAT_SECTION}</main>`);

  const oldSolutionSection = /<section\b[^>]*\bid=["']solution["'][^>]*>[\s\S]*?<\/section>/i;
  body = oldSolutionSection.test(body) ? body.replace(oldSolutionSection, BACKSTAGE_STUDIO_SECTION) : body.replace('<section class="section format-choice-section"', `${BACKSTAGE_STUDIO_SECTION}<section class="section format-choice-section"`);

  const oldFormatsSection = /<section\b[^>]*\bid=["']formats["'][^>]*>[\s\S]*?<\/section>/i;
  body = oldFormatsSection.test(body) ? body.replace(oldFormatsSection, FORMATS_SHOWCASE_SECTION) : body.replace('<section class="section experience-voice"', `${FORMATS_SHOWCASE_SECTION}<section class="section experience-voice"`);

  body = body.replace('<section class="section experience-voice" id="experience"', '<section class="section experience-voice" id="experience-details"');

  body = body.replace(/<link[^>]+href="\/styles\/problem-solution-v3\.css[^\"]*"[^>]*>/g, '');
  body = body.replace(/<link[^>]+href="\/styles\/problem-chat-static-v1\.css[^\"]*"[^>]*>/g, '');
  body = body.replace(/<link[^>]+href="\/styles\/backstage-studio-v1\.css[^\"]*"[^>]*>/g, '');
  body = body.replace(/<link[^>]+href="\/styles\/backstage-exact-media-v1\.css[^\"]*"[^>]*>/g, '');
  body = body.replace(/<link[^>]+href="\/styles\/backstage-header-single-line-v1\.css[^\"]*"[^>]*>/g, '');
  body = body.replace(/<link[^>]+href="\/styles\/formats-showcase-v1\.css[^\"]*"[^>]*>/g, '');
  body = body.replace(/<link[^>]+href="\/styles\/gift-club-v2\.css[^\"]*"[^>]*>/g, '');
  body = body.replace('</head>', '<link rel="stylesheet" href="/styles/problem-chat-static-v1.css?v=3"><link rel="stylesheet" href="/styles/backstage-studio-v1.css?v=4"><link rel="stylesheet" href="/styles/backstage-exact-media-v1.css?v=2"><link rel="stylesheet" href="/styles/backstage-header-single-line-v1.css?v=1"><link rel="stylesheet" href="/styles/formats-showcase-v1.css?v=1"><link rel="stylesheet" href="/styles/gift-club-v2.css?v=2"></head>');

  body = body.replace(/<script[^>]+src="\/final-experience-v12\.js[^\"]*"[^>]*><\/script>/g, '');
  body = body.replace(/<script[^>]+src="\/problem-solution-v3\.js[^\"]*"[^>]*><\/script>/g, '');
  body = body.replace(/<script[^>]+src="\/problem-chat-static-v1\.js[^\"]*"[^>]*><\/script>/g, '');
  body = body.replace(/<script[^>]+src="\/backstage-studio-v1\.js[^\"]*"[^>]*><\/script>/g, '');
  body = body.replace(/<script[^>]+src="\/formats-showcase-v1\.js[^\"]*"[^>]*><\/script>/g, '');
  body = body.replace(/<script[^>]+src="\/gift-club-v2\.js[^\"]*"[^>]*><\/script>/g, '');

  const scripts = '<script src="/final-experience-v12.js?v=8" defer></script><script src="/gift-club-v2.js?v=2" data-gift-club-v2 defer></script><script src="/problem-chat-static-v1.js?v=3" defer></script><script src="/backstage-studio-v1.js?v=6" defer></script><script src="/formats-showcase-v1.js?v=1" defer></script>';
  body = body.replace('</body>', `${scripts}</body>`);

  const headers = new Headers(response.headers);
  headers.delete('Content-Length');
  headers.delete('ETag');
  headers.delete('Last-Modified');
  headers.set('Cache-Control', 'no-store, max-age=0, must-revalidate');
  headers.set('Pragma', 'no-cache');

  return new Response(body, { status: response.status, statusText: response.statusText, headers });
}
