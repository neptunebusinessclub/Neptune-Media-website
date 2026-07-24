import { Resend } from 'resend';
import { isSameOrigin, json } from './security.js';

const FROM_EMAIL = 'Neptune Media <contact@neptunebusiness.com>';
const REPLY_TO_EMAIL = 'contact@neptunebusiness.com';
const STORE_NAME = 'neptune-media-main';

export async function handleClientCodeRequest(request, env) {
  if (!isSameOrigin(request)) return json({ error: 'origin_forbidden' }, 403);

  const payload = await request.json().catch(() => ({}));
  const email = String(payload.email || '').trim().toLowerCase();
  const studio = env.STUDIO.get(env.STUDIO.idFromName(STORE_NAME));
  const storeResponse = await callStore(studio, '/portal/request-code', { email });
  const result = await storeResponse.json().catch(() => ({}));

  if (!storeResponse.ok) return json(result, storeResponse.status);

  if (!result.deliver || !result.code) {
    if (result.retryAfter || result.throttled) {
      return json({
        ok: true,
        delivered: false,
        codeExpected: true,
        retryAfter: Number(result.retryAfter || 0),
        throttled: Boolean(result.throttled),
      });
    }

    return json({
      error: result.reason === 'client_not_found' ? 'client_not_found' : 'email_send_failed',
      reason: result.reason || 'access_not_found',
    }, 404);
  }

  const sent = await sendLoginCode(env, request.url, email, result.code);
  if (!sent.ok) {
    await revokeCode(studio, email);
    console.error('client_login_email_failed', {
      to: email,
      providerStatus: sent.providerStatus,
      providerCode: sent.providerCode,
      providerMessage: sent.providerMessage,
    });

    return json({
      error: 'email_send_failed',
      providerStatus: sent.providerStatus,
      providerCode: sent.providerCode,
      providerMessage: sent.providerMessage,
    }, 503);
  }

  console.log('client_login_email_sent', { to: email, emailId: sent.id });
  return json({
    ok: true,
    delivered: true,
    codeExpected: true,
    emailId: sent.id,
    retryAfter: 0,
    throttled: false,
  });
}

async function sendLoginCode(env, requestUrl, email, code) {
  const keys = resendApiKeys(env);
  if (!keys.length) {
    return failure(0, 'missing_api_key', 'Aucune clé Resend exploitable n’est liée au Worker.');
  }

  const url = new URL('/espace-client/', new URL(requestUrl).origin);
  url.searchParams.set('email', email);
  url.searchParams.set('step', 'code');
  url.hash = new URLSearchParams({ code }).toString();

  const mail = {
    from: FROM_EMAIL,
    to: [email],
    replyTo: REPLY_TO_EMAIL,
    subject: `${code} · Votre accès Neptune Media`,
    html: emailLayout(code, url.toString()),
    text: `Ouvrez directement votre espace Neptune Media : ${url}\nCode de secours : ${code}. Le lien expire dans 10 minutes.`,
  };

  let lastFailure = failure(0, 'resend_unknown_error', 'Resend n’a pas confirmé l’envoi.');

  for (const apiKey of keys) {
    try {
      const resend = new Resend(apiKey);
      const { data, error } = await resend.emails.send(mail);
      if (!error && data?.id) return { ok: true, id: data.id, providerStatus: 200 };

      lastFailure = normalizeProviderError(error);
      console.error('resend_sdk_failed', {
        providerStatus: lastFailure.providerStatus,
        providerCode: lastFailure.providerCode,
        providerMessage: lastFailure.providerMessage,
        to: email,
      });

      if (![401, 403].includes(lastFailure.providerStatus)) break;
    } catch (error) {
      lastFailure = normalizeProviderError(error);
      console.error('resend_sdk_exception', {
        providerStatus: lastFailure.providerStatus,
        providerCode: lastFailure.providerCode,
        providerMessage: lastFailure.providerMessage,
        to: email,
      });
    }
  }

  return lastFailure;
}

function resendApiKeys(env) {
  return [
    env?.RESEND_API_KEY,
    env?.RESEND_API_TOKEN,
    env?.RESEND_KEY,
    env?.RESEND_TOKEN,
  ]
    .map(normalizeApiKey)
    .filter((value, index, values) => value && values.indexOf(value) === index);
}

function normalizeApiKey(value) {
  return String(value || '')
    .trim()
    .replace(/^Bearer\s+/iu, '')
    .replace(/^(["'])(.*)\1$/u, '$2')
    .replace(/[\r\n]/gu, '')
    .trim();
}

function normalizeProviderError(error) {
  const providerStatus = Number(error?.statusCode || error?.status || error?.response?.status || 0);
  const providerCode = String(error?.name || error?.code || 'resend_error').slice(0, 80);
  const providerMessage = String(error?.message || error?.response?.data?.message || 'Resend a refusé la demande.').slice(0, 240);
  return failure(providerStatus, providerCode, providerMessage);
}

function failure(providerStatus, providerCode, providerMessage) {
  return {
    ok: false,
    providerStatus: Number(providerStatus || 0),
    providerCode: String(providerCode || '').slice(0, 80),
    providerMessage: String(providerMessage || '').slice(0, 240),
  };
}

async function revokeCode(studio, email) {
  try {
    await callStore(studio, '/portal/invalidate-code', { email });
  } catch (error) {
    console.error('client_login_code_revoke_failed', {
      to: email,
      message: String(error?.message || error || 'unknown').slice(0, 200),
    });
  }
}

function callStore(studio, path, body) {
  return studio.fetch(`https://store${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body || {}),
  });
}

function emailLayout(code, directUrl) {
  return `<div style="font-family:Arial,sans-serif;max-width:620px;margin:auto;padding:34px;color:#121326"><p style="letter-spacing:.16em;color:#6d55e8;font-weight:700">NEPTUNE MEDIA</p><h1>Votre accès sécurisé</h1><p>Cliquez sur le bouton pour ouvrir directement votre espace client.</p><p><a href="${escapeHtml(directUrl)}" style="display:inline-block;padding:14px 22px;border-radius:999px;background:linear-gradient(120deg,#4267ff,#8d4cff,#ef4ba2);color:#fff;text-decoration:none;font-weight:700">Me connecter automatiquement</a></p><p style="font-size:13px;color:#666">Le lien expire dans 10 minutes et ne peut être utilisé qu’une fois.</p><p style="font-size:13px;color:#666">Code de secours : <strong>${escapeHtml(code)}</strong></p></div>`;
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
