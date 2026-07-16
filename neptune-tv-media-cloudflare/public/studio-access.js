(() => {
  const form = document.querySelector('#login');
  if (!form) return;
  const email = form.elements.email;
  const password = form.elements.password;
  const message = document.querySelector('#authMsg');
  const remembered = localStorage.getItem('neptune_studio_email');
  if (remembered) email.value = remembered;

  form.querySelector('.eyebrow').textContent = 'STUDIO NEPTUNE MEDIA';
  form.querySelector('h1').textContent = 'Connexion au Studio';
  form.querySelector('h1 + p').textContent = 'Gérez la chaîne en direct, les émissions, la programmation, les campagnes et les performances.';

  const remember = document.createElement('label');
  remember.className = 'remember-access';
  remember.innerHTML = '<input type="checkbox" name="remember" checked><span>Rester connecté sur cet appareil</span>';
  form.querySelector('button[type="submit"]').before(remember);

  const passwordWrap = password.parentElement;
  passwordWrap.classList.add('password-field');
  const reveal = document.createElement('button');
  reveal.type = 'button'; reveal.className = 'password-reveal'; reveal.textContent = 'Afficher';
  reveal.addEventListener('click', () => { const visible = password.type === 'text'; password.type = visible ? 'password' : 'text'; reveal.textContent = visible ? 'Afficher' : 'Masquer'; });
  passwordWrap.append(reveal);

  const setup = form.querySelector('details');
  setup.id = 'setupDetails';
  setup.querySelector('summary').textContent = 'Créer le premier accès administrateur';

  const recovery = document.createElement('details');
  recovery.id = 'recoveryDetails';
  recovery.innerHTML = `<summary>Accès oublié ou mot de passe perdu</summary><p class="access-help">Utilisez l’adresse administrateur et le BOOTSTRAP_TOKEN enregistré dans GitHub. Le mot de passe doit contenir au moins 12 caractères.</p><label><span>Nouveau mot de passe</span><input name="recoveryPassword" type="password" minlength="12" autocomplete="new-password"></label><label><span>Jeton d’amorçage</span><input name="recoveryToken" type="password" autocomplete="off"></label><button class="btn" type="button" id="recoverAccess">Réinitialiser mon accès</button>`;
  setup.after(recovery);

  fetch('/api/auth/setup-status').then((response) => response.json()).then((data) => {
    setup.hidden = Boolean(data.initialized);
    recovery.hidden = !data.initialized;
    if (!data.initialized) { setup.open = true; setMessage('Créez votre accès administrateur une seule fois, puis le jeton disparaîtra de cet écran.', false); }
  }).catch(() => {});

  form.addEventListener('submit', async (event) => {
    event.preventDefault(); event.stopImmediatePropagation();
    const button = form.querySelector('button[type="submit"]');
    setBusy(button, true, 'Connexion…');
    try {
      const result = await request('/api/auth/login', { email: email.value, password: password.value, remember: form.elements.remember.checked });
      sessionStorage.setItem('neptune_csrf', result.csrfToken || '');
      localStorage.setItem('neptune_studio_email', email.value.trim());
      location.reload();
    } catch (error) { setMessage(humanError(error.message), true); setBusy(button, false, 'Accéder au Studio'); }
  }, true);

  document.querySelector('#bootstrap')?.addEventListener('click', async (event) => {
    event.preventDefault(); event.stopImmediatePropagation();
    const button = event.currentTarget;
    setBusy(button, true, 'Création…');
    try {
      await request('/api/auth/bootstrap', { email: email.value, password: password.value, fullName: form.elements.fullName.value, token: form.elements.token.value });
      setup.hidden = true; recovery.hidden = false; localStorage.setItem('neptune_studio_email', email.value.trim());
      setMessage('Administrateur créé. Cliquez maintenant sur « Accéder au Studio ».', false);
    } catch (error) { setMessage(humanError(error.message), true); }
    setBusy(button, false, 'Créer le premier administrateur');
  }, true);

  recovery.querySelector('#recoverAccess').addEventListener('click', async (event) => {
    const button = event.currentTarget;
    setBusy(button, true, 'Réinitialisation…');
    try {
      await request('/api/auth/recover', { email: email.value, password: form.elements.recoveryPassword.value, token: form.elements.recoveryToken.value });
      password.value = form.elements.recoveryPassword.value; recovery.open = false;
      setMessage('Accès réinitialisé. Vous pouvez vous connecter immédiatement.', false);
    } catch (error) { setMessage(humanError(error.message), true); }
    setBusy(button, false, 'Réinitialiser mon accès');
  });

  async function request(url, payload) {
    const response = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json', Accept: 'application/json' }, body: JSON.stringify(payload) });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(data.error || `http_${response.status}`);
    return data;
  }
  function setMessage(text, error) { message.textContent = text; message.classList.toggle('is-success', !error); }
  function setBusy(button, busy, text) { button.disabled = busy; button.textContent = text; }
  function humanError(code) { return ({ invalid_credentials: 'Adresse e-mail ou mot de passe incorrect.', too_many_attempts: 'Trop de tentatives. Réessayez dans quelques minutes.', invalid_bootstrap_token: 'Jeton d’amorçage incorrect.', admin_not_found: 'Aucun administrateur actif ne correspond à cette adresse.', already_initialized: 'Le Studio est déjà initialisé.', origin_forbidden: 'Cette action doit être effectuée depuis le Studio Neptune.' }[code] || `Connexion impossible : ${code}`); }
})();
