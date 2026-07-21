(() => {
  const STORAGE_KEY = 'neptune_referral_attribution_v1';
  const TTL = 90 * 24 * 60 * 60 * 1000;
  const MARKER = 'NEPTUNE-REF-';
  const queryCode = normalize(new URLSearchParams(location.search).get('ref'));
  if (queryCode) save(queryCode);
  const code = queryCode || load();
  if (!code) return;

  decorateDocument(code);
  const observer = new MutationObserver(() => decorateDocument(code));
  observer.observe(document.documentElement, { childList: true, subtree: true });

  document.addEventListener('click', (event) => {
    const link = event.target.closest('a[href]');
    if (link) decorateLink(link, code);
  }, { capture: true });

  function decorateDocument(referralCode) {
    document.querySelectorAll('a[href]').forEach((link) => decorateLink(link, referralCode));
    document.querySelectorAll('form[action]').forEach((form) => decorateForm(form, referralCode));
  }

  function decorateLink(link, referralCode) {
    const raw = link.getAttribute('href') || '';
    if (!raw || raw.startsWith('#') || raw.startsWith('mailto:') || raw.startsWith('tel:') || raw.startsWith('javascript:')) return;
    let url;
    try { url = new URL(raw, location.href); } catch { return; }
    const stripe = ['buy.stripe.com', 'book.stripe.com'].includes(url.hostname);
    const neptuneBooking = url.hostname === 'media.neptunebusiness.com';
    const sameOrigin = url.origin === location.origin;
    if (stripe) {
      const current = String(url.searchParams.get('client_reference_id') || '');
      if (!current.includes(MARKER)) url.searchParams.set('client_reference_id', withReferral(current, referralCode));
    } else if (neptuneBooking || sameOrigin) {
      if (!url.searchParams.has('ref')) url.searchParams.set('ref', referralCode);
    } else {
      return;
    }
    link.href = url.toString();
  }

  function decorateForm(form, referralCode) {
    let action;
    try { action = new URL(form.action, location.href); } catch { return; }
    const stripe = ['buy.stripe.com', 'book.stripe.com'].includes(action.hostname);
    const neptuneBooking = action.hostname === 'media.neptunebusiness.com' || action.origin === location.origin;
    if (!stripe && !neptuneBooking) return;
    const name = stripe ? 'client_reference_id' : 'ref';
    const existing = form.querySelector(`input[name="${name}"]`);
    if (existing) {
      if (stripe && !String(existing.value || '').includes(MARKER)) existing.value = withReferral(existing.value, referralCode);
      else if (!stripe && !existing.value) existing.value = referralCode;
      return;
    }
    const input = document.createElement('input');
    input.type = 'hidden';
    input.name = name;
    input.value = stripe ? withReferral('', referralCode) : referralCode;
    form.append(input);
  }

  function withReferral(existing, referralCode) {
    const prefix = String(existing || '').trim().replace(/-+$/u, '');
    const marker = `${MARKER}${referralCode}`;
    if (!prefix) return marker;
    const maximumPrefixLength = Math.max(0, 190 - marker.length - 1);
    return `${prefix.slice(0, maximumPrefixLength)}-${marker}`;
  }

  function save(referralCode) {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify({ code: referralCode, expiresAt: Date.now() + TTL })); } catch {}
  }

  function load() {
    try {
      const value = JSON.parse(localStorage.getItem(STORAGE_KEY) || 'null');
      if (!value?.code || Number(value.expiresAt || 0) <= Date.now()) {
        localStorage.removeItem(STORAGE_KEY);
        return '';
      }
      return normalize(value.code);
    } catch { return ''; }
  }

  function normalize(value) {
    return String(value || '').toUpperCase().replace(/^NEPTUNE[-_:]?REF[-_:]?/u, '').replace(/[^A-Z0-9]/gu, '').slice(0, 18);
  }
})();
