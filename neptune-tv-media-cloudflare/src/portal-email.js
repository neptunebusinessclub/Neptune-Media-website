import { statusLabel } from './portal-utils.js';

const ADMIN_EMAIL = 'contact@neptunebusiness.com';
const STUDIO_NAME = 'RECBOX';
const STUDIO_COORDINATES = '43°38\'48.8"N 1°30\'46.3"E';
const STUDIO_MAP_URL = 'https://www.google.com/maps?q=43.6468889,1.5128611';
const RESEND_USER_AGENT = 'Neptune-Media-Worker/3.4.1';

function sender(env) {
  return env.AUTH_FROM_EMAIL || 'Neptune Media <onboarding@resend.dev>';
}

async function send(env, payload) {
  if (!env.RESEND_API_KEY) {
    console.error('resend_not_configured');
    return { ok: false, error: 'email_service_not_configured' };
  }

  let response;
  try {
    response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${env.RESEND_API_KEY}`,
        'Content-Type': 'application/json',
        'User-Agent': RESEND_USER_AGENT,
      },
      body: JSON.stringify(payload),
    });
  } catch (error) {
    console.error('resend_unreachable', {
      name: error?.name || 'Error',
      message: String(error?.message || error || 'unknown').slice(0, 300),
      to: payload.to,
    });
    return { ok: false, error: 'email_provider_unreachable' };
  }

  const raw = await response.text();
  const result = parseJson(raw);
  if (!response.ok) {
    const providerCode = result.name || result.code || '';
    const providerMessage = result.message || raw.slice(0, 300);
    console.error('resend_failed', {
      status: response.status,
      code: providerCode,
      message: providerMessage,
      from: payload.from,
      to: payload.to,
    });
    return {
      ok: false,
      error: response.status === 401 || response.status === 403 ? 'email_service_not_configured' : 'email_send_failed',
      providerStatus: response.status,
      providerCode,
      providerMessage,
    };
  }
  if (!result.id) {
    console.error('resend_id_missing', { status: response.status, response: result, to: payload.to });
    return { ok: false, error: 'email_send_unconfirmed', providerStatus: response.status };
  }
  console.log('resend_email_sent', { emailId: result.id, to: payload.to, subject: payload.subject });
  return { ok: true, id: result.id, providerStatus: response.status };
}

export function portalUrl(requestUrl, email, step = '') {
  const url = new URL('/espace-client/', new URL(requestUrl).origin);
  url.searchParams.set('email', email);
  if (step) url.searchParams.set('step', step);
  return url.toString();
}

export async function sendCode(env, requestUrl, email, code) {
  const url = new URL(portalUrl(requestUrl, email, 'code'));
  url.hash = new URLSearchParams({ code }).toString();
  const directUrl = url.toString();
  return send(env, {
    from: sender(env),
    to: [email],
    subject: `${code} · Votre accès Neptune Media`,
    html: layout('Votre accès sécurisé', `<p>Cliquez sur le bouton pour ouvrir directement votre espace client.</p>${button(directUrl, 'Me connecter automatiquement')}<p style="font-size:13px;color:#666">Le lien expire dans 10 minutes et ne peut être utilisé qu’une fois.</p><p style="font-size:13px;color:#666">En cas de besoin, votre code est : <strong>${code}</strong></p>`),
    text: `Ouvrez directement votre espace Neptune Media : ${directUrl}\nCode de secours : ${code}. Le lien expire dans 10 minutes.`,
  });
}

export async function sendAccess(env, requestUrl, email, name = '') {
  const url = portalUrl(requestUrl, email);
  return send(env, {
    from: sender(env),
    to: [email],
    subject: 'Accédez à votre espace Neptune Media',
    html: layout('Votre espace client est prêt', `<p>${name ? `Bonjour ${escapeHtml(name)}, ` : ''}retrouvez vos réservations, votre préparation, votre suivi, vos rushs et vos livrables dans un seul espace permanent.</p>${button(url, 'Accéder à mon espace')}<p>Votre connexion se fait avec un code reçu par e-mail, sans mot de passe.</p>`),
    text: `Votre espace Neptune Media est prêt : ${url}`,
  });
}

export async function sendOrderConfirmation(env, requestUrl, email, payload = {}) {
  const url = portalUrl(requestUrl, email);
  const title = String(payload.title || payload.productName || payload.format || 'Votre passage Neptune Media');
  return send(env, {
    from: sender(env),
    to: uniqueRecipients(email, ADMIN_EMAIL),
    subject: 'Votre réservation Neptune Media est confirmée',
    html: layout('Votre réservation est confirmée', `<p><strong>${escapeHtml(title)}</strong> a été ajouté à votre compte permanent.</p><p>Vous pouvez maintenant choisir ou consulter votre rendez-vous, préparer l’interview et suivre votre passage jusqu’à la livraison.</p>${button(url, 'Accéder à mon espace')}`),
    text: `Votre réservation ${title} est confirmée. Accédez à votre espace : ${url}`,
  });
}

export async function sendAppointmentConfirmation(env, requestUrl, email, payload = {}) {
  const url = portalUrl(requestUrl, email);
  const appointment = formatAppointment(payload.appointmentAt);
  const title = String(payload.title || payload.format || 'Votre passage Neptune Media');
  return send(env, {
    from: sender(env),
    to: uniqueRecipients(email, ADMIN_EMAIL),
    subject: 'Votre rendez-vous Neptune Media est confirmé',
    html: layout('Votre rendez-vous est confirmé', `<p><strong>${escapeHtml(title)}</strong></p><p style="font-size:20px;font-weight:700">${escapeHtml(appointment)}</p><p>Votre espace client est à jour.</p>${button(url, 'Préparer mon passage')}`),
    text: `Votre rendez-vous Neptune Media est confirmé : ${appointment}. ${url}`,
  });
}

export async function sendStatusUpdate(env, requestUrl, email, payload = {}) {
  const url = portalUrl(requestUrl, email);
  const label = statusLabel(payload.status);
  const title = String(payload.title || 'Votre passage Neptune Media');
  const next = String(payload.nextAction || 'Consultez votre espace client pour la suite.');
  const practical = payload.filmingAt ? practicalBlock(payload.filmingAt) : '';
  return send(env, {
    from: sender(env),
    to: uniqueRecipients(email, ADMIN_EMAIL),
    subject: `Neptune Media · ${label}`,
    html: layout(label, `<p><strong>${escapeHtml(title)}</strong></p><p>Le suivi vient d’être mis à jour.</p><div style="padding:18px;border-radius:16px;background:#f3f1ff"><small style="color:#6658a8">PROCHAINE ACTION</small><p style="margin:6px 0 0;font-weight:700">${escapeHtml(next)}</p></div>${practical}${button(url, 'Voir mon suivi')}`),
    text: `${title} — ${label}. Prochaine action : ${next}.${payload.filmingAt ? ` Passage studio : ${formatAppointment(payload.filmingAt)}. ${STUDIO_NAME}, ${STUDIO_COORDINATES}. ${STUDIO_MAP_URL}` : ''} ${url}`,
  });
}

export async function sendPracticalReminder(env, requestUrl, email, payload = {}) {
  const url = portalUrl(requestUrl, email);
  const labels = {
    studio_reminder_15d: ['Votre passage approche', '15 jours'],
    studio_reminder_7d: ['Votre passage a lieu dans une semaine', '7 jours'],
    studio_reminder_48h: ['Votre passage a lieu dans moins de 48 h', '48 heures'],
  };
  const [subjectLabel, delayLabel] = labels[payload.notificationKey] || ['Rappel de votre passage', 'prochainement'];
  const title = String(payload.title || payload.format || 'Votre passage Neptune Media');
  const appointment = formatAppointment(payload.filmingAt);
  return send(env, {
    from: sender(env),
    to: [email],
    subject: `Neptune Media · ${subjectLabel}`,
    html: layout(subjectLabel, `
      <p><strong>${escapeHtml(title)}</strong></p>
      <p>Votre passage est prévu dans environ <strong>${escapeHtml(delayLabel)}</strong>.</p>
      <div style="padding:20px;border-radius:18px;background:#f3f1ff">
        <small style="color:#6658a8;font-weight:700">DATE ET HEURE</small>
        <p style="margin:7px 0 18px;font-size:19px;font-weight:800">${escapeHtml(appointment)}</p>
        <small style="color:#6658a8;font-weight:700">STUDIO D’ENREGISTREMENT</small>
        <p style="margin:7px 0 4px;font-weight:800">${STUDIO_NAME}</p>
        <p style="margin:0;color:#5f6680">${escapeHtml(STUDIO_COORDINATES)}</p>
        ${button(STUDIO_MAP_URL, 'Ouvrir l’emplacement exact')}
      </div>
      <p><strong>Informations pratiques :</strong> prévoyez d’arriver 15 minutes avant le créneau. Aucun texte n’est à apprendre : l’équipe vous guide pendant le tournage. En cas de retard ou d’empêchement, contactez Neptune Media dès que possible.</p>
      ${button(url, 'Voir mon espace client')}`),
    text: `${subjectLabel}. ${title}. Passage : ${appointment}. Studio ${STUDIO_NAME}, emplacement exact ${STUDIO_COORDINATES} : ${STUDIO_MAP_URL}. Arrivez 15 minutes avant. Suivi : ${url}`,
  });
}

export async function sendFeedbackRequest(env, requestUrl, email, payload = {}) {
  const base = new URL('/espace-client/avis/', new URL(requestUrl).origin);
  base.searchParams.set('token', payload.token || '');
  const title = String(payload.title || 'Votre passage Neptune Media');
  const scoreButtons = [1, 2, 3, 4, 5].map((score) => {
    const url = new URL(base);
    url.searchParams.set('score', String(score));
    return `<a href="${url}" style="display:inline-block;min-width:42px;margin:4px;padding:11px 9px;border-radius:12px;background:${score === 5 ? '#5b4df7' : '#eef0f7'};color:${score === 5 ? '#fff' : '#17234e'};text-align:center;text-decoration:none;font-weight:800">${score}</a>`;
  }).join('');
  return send(env, {
    from: sender(env),
    to: [email],
    subject: 'Votre avis sur l’expérience Neptune Media',
    html: layout('Comment s’est passé votre passage ?', `<p><strong>${escapeHtml(title)}</strong></p><p>Votre retour nous aide à améliorer concrètement la préparation, le tournage et la livraison.</p><p style="margin-bottom:6px;font-weight:700">Votre satisfaction en un clic :</p><p>${scoreButtons}</p><p>Vous pourrez ensuite préciser votre retour d’expérience et nous dire à qui vous recommanderiez Neptune Media.</p>${button(base.toString(), 'Partager mon expérience')}`),
    text: `Donnez votre avis sur ${title} : ${base}`,
  });
}

export async function sendDeletionRequest(env, requestUrl, email, payload = {}) {
  const url = portalUrl(requestUrl, email);
  return send(env, {
    from: sender(env),
    to: uniqueRecipients(email, ADMIN_EMAIL),
    subject: 'Demande de suppression de compte Neptune Media',
    html: layout('Demande de suppression enregistrée', `<p>La demande concernant <strong>${escapeHtml(email)}</strong> a été enregistrée.</p><p>Neptune Media vérifiera les obligations légales de conservation avant suppression ou anonymisation.</p>${button(url, 'Consulter mon espace')}`),
    text: `Demande de suppression enregistrée pour ${email}. ${url}`,
  });
}

function practicalBlock(value) {
  const appointment = formatAppointment(value);
  return `<div style="margin-top:18px;padding:18px;border-radius:16px;background:#f7f8fc"><small style="color:#6658a8">PASSAGE STUDIO</small><p style="margin:6px 0;font-weight:800">${escapeHtml(appointment)}</p><p style="margin:0">${STUDIO_NAME} · ${escapeHtml(STUDIO_COORDINATES)}</p><p style="margin:12px 0 0"><a href="${STUDIO_MAP_URL}" style="color:#5b4df7;font-weight:700">Voir l’emplacement exact</a></p></div>`;
}

function layout(title, content) {
  return `<div style="font-family:Arial,sans-serif;max-width:620px;margin:auto;padding:34px;color:#121326"><p style="letter-spacing:.16em;color:#6d55e8;font-weight:700">NEPTUNE MEDIA</p><h1>${escapeHtml(title)}</h1>${content}</div>`;
}

function button(url, label) {
  return `<p><a href="${url}" style="display:inline-block;padding:14px 22px;border-radius:999px;background:linear-gradient(120deg,#4267ff,#8d4cff,#ef4ba2);color:#fff;text-decoration:none;font-weight:700">${escapeHtml(label)}</a></p>`;
}

function formatAppointment(value) {
  const date = new Date(value || '');
  if (Number.isNaN(date.getTime())) return 'Le créneau confirmé est disponible dans votre espace client.';
  return new Intl.DateTimeFormat('fr-FR', {
    dateStyle: 'full',
    timeStyle: 'short',
    timeZone: 'Europe/Paris',
  }).format(date);
}

function uniqueRecipients(...values) {
  return values.filter((value, index, array) => value && array.indexOf(value) === index);
}

function escapeHtml(value) {
  return String(value || '').replace(/[&<>"']/gu, (character) => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;',
  })[character]);
}

function parseJson(value) {
  try { return JSON.parse(String(value || '{}')); } catch { return {}; }
}
