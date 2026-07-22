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
  <section class="section backstage-studio-section" id="solution" data-aida-stage="desire" data-backstage-version="7">
    <div class="container backstage-studio-section__inner">
      <header class="backstage-studio-section__header" data-backstage-reveal data-backstage-order="0">
        <span class="eyebrow">Dans les coulisses</span>
        <h2>Une équipe et un studio complet <span>à votre unique disposition.</span></h2>
        <p class="backstage-studio-section__subtitle">C'est simple, vous ne réfléchissez pas et en plus c'est sur-mesure.</p>
        <p class="backstage-studio-section__copy">Venez accompagné avec votre équipe, ça leur fera plaisir, le Jeu Connexio est fait pour ça.</p>
      </header>

      <div class="backstage-studio-section__gallery" aria-label="Quelques extraits exacts de l’expérience vécue au studio Neptune Media">
        <article class="backstage-studio-section__media backstage-studio-section__media--wide" data-backstage-reveal data-backstage-order="1">
          <video src="https://drive.usercontent.google.com/download?id=1WlyVRXsKSxMsDov2mapvWhEoak5e8y57&export=download&confirm=t" autoplay muted loop playsinline preload="auto" disablepictureinpicture controlslist="nodownload noplaybackrate" data-backstage-video aria-label="Vidéo backstage Neptune Media : découverte du studio"></video>
          <div class="backstage-studio-section__caption"><div><span>Le studio</span><strong>Tout est prêt avant votre arrivée.</strong></div></div>
        </article>
        <article class="backstage-studio-section__media" data-backstage-reveal data-backstage-order="2">
          <video src="https://drive.usercontent.google.com/download?id=16EQ9ZB_bX6l5RxdWr4KURGhKgLKjYoCs&export=download&confirm=t" autoplay muted loop playsinline preload="auto" disablepictureinpicture controlslist="nodownload noplaybackrate" data-backstage-video aria-label="Vidéo backstage Neptune Media : votre équipe pendant le tournage"></video>
          <div class="backstage-studio-section__caption"><div><span>Votre équipe</span><strong>Elle découvre, réagit et partage le moment avec vous.</strong></div></div>
        </article>
        <article class="backstage-studio-section__media" data-backstage-reveal data-backstage-order="3">
          <video src="https://drive.usercontent.google.com/download?id=1zNuZx-QK9qeZvxfwHkHoQ4s-cZs68Ls-&export=download&confirm=t" autoplay muted loop playsinline preload="auto" disablepictureinpicture controlslist="nodownload noplaybackrate" data-backstage-video aria-label="Vidéo backstage Neptune Media : la régie"></video>
          <div class="backstage-studio-section__caption"><div><span>La régie</span><strong>Vous vivez le moment, Neptune gère le reste.</strong></div></div>
        </article>
        <article class="backstage-studio-section__media backstage-studio-section__media--landscape backstage-studio-section__media--exact-photo" data-backstage-reveal data-backstage-order="4">
          <img src="https://lh3.googleusercontent.com/d/1QT_UW8AWvBtv48lRdlgNKER0dmis8upO=w1600" alt="Les quatre participants réunis sur le plateau Neptune Media pour le Jeu Connexio" loading="lazy" decoding="async">
          <div class="backstage-studio-section__caption"><div><span>Le Jeu Connexio</span><strong>Le tournage devient une expérience collective.</strong></div></div>
        </article>
      </div>

      <div class="backstage-studio-section__signature" data-backstage-reveal data-backstage-order="5">
        <span aria-hidden="true"></span>
        <p>Vous venez avec les bonnes personnes. <strong>Neptune s’occupe de tout le reste.</strong></p>
      </div>
    </div>
  </section>`;

export async function fixLandingAssetOrder(response) {
  let body = await response.text();

  const oldProblemSection = /<section\b[^>]*\bid=["']probleme["'][^>]*>[\s\S]*?<\/section>/i;
  body = oldProblemSection.test(body) ? body.replace(oldProblemSection, PROBLEM_CHAT_SECTION) : body.replace('</main>', `${PROBLEM_CHAT_SECTION}</main>`);

  const oldSolutionSection = /<section\b[^>]*\bid=["']solution["'][^>]*>[\s\S]*?<\/section>/i;
  body = oldSolutionSection.test(body) ? body.replace(oldSolutionSection, BACKSTAGE_STUDIO_SECTION) : body.replace('<section class="section format-choice-section"', `${BACKSTAGE_STUDIO_SECTION}<section class="section format-choice-section"`);

  body = body.replace('<section class="section experience-voice" id="experience"', '<section class="section experience-voice" id="experience-details"');

  body = body.replace(/<link[^>]+href="\/styles\/problem-solution-v3\.css[^\"]*"[^>]*>/g, '');
  body = body.replace(/<link[^>]+href="\/styles\/problem-chat-static-v1\.css[^\"]*"[^>]*>/g, '');
  body = body.replace(/<link[^>]+href="\/styles\/backstage-studio-v1\.css[^\"]*"[^>]*>/g, '');
  body = body.replace(/<link[^>]+href="\/styles\/backstage-exact-media-v1\.css[^\"]*"[^>]*>/g, '');
  body = body.replace(/<link[^>]+href="\/styles\/backstage-header-single-line-v1\.css[^\"]*"[^>]*>/g, '');
  body = body.replace('</head>', '<link rel="stylesheet" href="/styles/problem-chat-static-v1.css?v=3"><link rel="stylesheet" href="/styles/backstage-studio-v1.css?v=4"><link rel="stylesheet" href="/styles/backstage-exact-media-v1.css?v=2"><link rel="stylesheet" href="/styles/backstage-header-single-line-v1.css?v=1"></head>');

  body = body.replace(/<script[^>]+src="\/final-experience-v12\.js[^\"]*"[^>]*><\/script>/g, '');
  body = body.replace(/<script[^>]+src="\/problem-solution-v3\.js[^\"]*"[^>]*><\/script>/g, '');
  body = body.replace(/<script[^>]+src="\/problem-chat-static-v1\.js[^\"]*"[^>]*><\/script>/g, '');
  body = body.replace(/<script[^>]+src="\/backstage-studio-v1\.js[^\"]*"[^>]*><\/script>/g, '');

  const scripts = '<script src="/final-experience-v12.js?v=8" defer></script><script src="/problem-chat-static-v1.js?v=2" defer></script><script src="/backstage-studio-v1.js?v=5" defer></script>';
  body = body.replace('</body>', `${scripts}</body>`);

  const headers = new Headers(response.headers);
  headers.delete('Content-Length');
  headers.delete('ETag');
  headers.delete('Last-Modified');
  headers.set('Cache-Control', 'no-store, max-age=0, must-revalidate');
  headers.set('Pragma', 'no-cache');

  return new Response(body, { status: response.status, statusText: response.statusText, headers });
}
