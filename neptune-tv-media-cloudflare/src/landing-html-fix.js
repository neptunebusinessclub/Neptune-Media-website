const PROBLEM_CHAT_SECTION = `
  <section class="section problem-chat-static" id="probleme" data-aida-stage="interest">
    <div class="container problem-chat-static__inner">
      <header class="problem-chat-static__header">
        <span class="eyebrow">Ce que vous vous dites déjà</span>
        <h2>Vous avez besoin d’être visible, <span>pas de vous former.</span></h2>
        <p>Alors arrêtez de chercher des solutions épuisantes.</p>
      </header>

      <div class="problem-chat-static__thread" aria-label="Discussion entre un dirigeant et Neptune Media">
        <article class="problem-chat-static__exchange">
          <div class="problem-chat-static__bubble problem-chat-static__bubble--problem">
            <span class="problem-chat-static__sender">Vous</span>
            <p>« Mon entreprise est sérieuse mais je suis inconnu de mon marché. »</p>
          </div>
          <div class="problem-chat-static__bubble problem-chat-static__bubble--answer">
            <span class="problem-chat-static__sender">Neptune Media</span>
            <p>Nous réalisons des émissions qui attirent vos futurs clients naturellement.</p>
          </div>
        </article>

        <article class="problem-chat-static__exchange">
          <div class="problem-chat-static__bubble problem-chat-static__bubble--problem">
            <span class="problem-chat-static__sender">Vous</span>
            <p>« Je sais qu’il faut publier mais je ne sais pas quoi dire. »</p>
          </div>
          <div class="problem-chat-static__bubble problem-chat-static__bubble--answer">
            <span class="problem-chat-static__sender">Neptune Media</span>
            <p>Nous préparons les bons angles avant d’allumer la caméra.</p>
          </div>
        </article>

        <article class="problem-chat-static__exchange">
          <div class="problem-chat-static__bubble problem-chat-static__bubble--problem">
            <span class="problem-chat-static__sender">Vous</span>
            <p>« Je n’ai pas le temps de filmer, monter et recommencer chaque semaine. »</p>
          </div>
          <div class="problem-chat-static__bubble problem-chat-static__bubble--answer">
            <span class="problem-chat-static__sender">Neptune Media</span>
            <p>Et nous non plus. C’est pour ça que nous avons perfectionné le tout en une demi-journée.</p>
          </div>
        </article>

        <article class="problem-chat-static__exchange">
          <div class="problem-chat-static__bubble problem-chat-static__bubble--problem">
            <span class="problem-chat-static__sender">Vous</span>
            <p>« J’ai déjà payé pour de belles vidéos qui n’ont rien changé. »</p>
          </div>
          <div class="problem-chat-static__bubble problem-chat-static__bubble--answer">
            <span class="problem-chat-static__sender">Neptune Media</span>
            <p>Ça fait mal… Ici, vos émissions tourneront sur Neptune TV en continu et vous garderez vos contenus réutilisables à l’infini.</p>
          </div>
        </article>
      </div>

      <div class="problem-chat-static__conclusion">
        <span>C’est un investissement, on le sait mais attendez de savoir la suite…</span>
        <i aria-hidden="true">↓</i>
      </div>
    </div>
  </section>`;

export async function fixLandingAssetOrder(response) {
  let body = await response.text();

  const oldProblemSection = /<section\b[^>]*\bid=["']probleme["'][^>]*>[\s\S]*?<\/section>/i;
  body = oldProblemSection.test(body)
    ? body.replace(oldProblemSection, PROBLEM_CHAT_SECTION)
    : body.replace('</main>', `${PROBLEM_CHAT_SECTION}</main>`);

  body = body.replace('<section class="section experience-voice" id="experience"', '<section class="section experience-voice" id="experience-details"');

  body = body.replace(/<link[^>]+href="\/styles\/problem-solution-v3\.css[^\"]*"[^>]*>/g, '');
  body = body.replace(/<link[^>]+href="\/styles\/problem-chat-static-v1\.css[^\"]*"[^>]*>/g, '');
  body = body.replace('</head>', '<link rel="stylesheet" href="/styles/problem-chat-static-v1.css?v=1"></head>');

  body = body.replace(/<script[^>]+src="\/final-experience-v12\.js[^\"]*"[^>]*><\/script>/g, '');
  body = body.replace(/<script[^>]+src="\/problem-solution-v3\.js[^\"]*"[^>]*><\/script>/g, '');
  body = body.replace(/<script[^>]+src="\/problem-chat-static-v1\.js[^\"]*"[^>]*><\/script>/g, '');

  const scripts = '<script src="/final-experience-v12.js?v=8" defer></script><script src="/problem-chat-static-v1.js?v=1" defer></script>';
  body = body.replace('</body>', `${scripts}</body>`);

  const headers = new Headers(response.headers);
  headers.delete('Content-Length');
  headers.delete('ETag');
  headers.delete('Last-Modified');
  headers.set('Cache-Control', 'no-store, max-age=0, must-revalidate');
  headers.set('Pragma', 'no-cache');

  return new Response(body, {
    status: response.status,
    statusText: response.statusText,
    headers,
  });
}
