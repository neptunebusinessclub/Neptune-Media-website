import { parseCookies } from './security.js';

export const CLIENT_COOKIE = '__Host-neptune_client';
export const ADMIN_COOKIE = '__Host-neptune_session';

export function clientToken(request) {
  return parseCookies(request.headers.get('Cookie') || '')[CLIENT_COOKIE] || '';
}

export function adminAuth(request) {
  const cookies = parseCookies(request.headers.get('Cookie') || '');
  return { token: cookies[ADMIN_COOKIE] || '', csrfToken: request.headers.get('X-CSRF-Token') || '' };
}

export function clientCookie(token, requestUrl, maxAge) {
  const url = new URL(requestUrl);
  const secure = !['localhost', '127.0.0.1'].includes(url.hostname) ? 'Secure' : '';
  return [
    `${CLIENT_COOKIE}=${encodeURIComponent(token || '')}`,
    'Path=/',
    'HttpOnly',
    'SameSite=Strict',
    secure,
    `Max-Age=${Math.max(0, Number(maxAge || 0))}`,
  ].filter(Boolean).join('; ');
}

export function unwrapWebhookPayload(raw = {}) {
  return raw?.data?.object && typeof raw.data.object === 'object' ? raw.data.object : raw;
}

export function normalizeOrderPayload(raw = {}, env = {}) {
  const source = unwrapWebhookPayload(raw);
  const metadata = source.metadata && typeof source.metadata === 'object' ? source.metadata : {};
  const clientReference = String(source.client_reference_id || source.clientReferenceId || metadata.client_reference_id || '').trim();
  return {
    email: String(
      source.email
      || source.customerEmail
      || source.customer_email
      || source.customer_details?.email
      || metadata.email
      || '',
    ).trim().toLowerCase(),
    fullName: String(
      source.fullName
      || source.name
      || source.customerName
      || source.customer_details?.name
      || metadata.fullName
      || metadata.name
      || '',
    ).trim(),
    company: String(source.company || metadata.company || metadata.entreprise || '').trim(),
    externalPaymentId: String(
      source.externalPaymentId
      || source.stripePaymentId
      || source.paymentIntentId
      || source.payment_intent
      || source.checkoutSessionId
      || source.id
      || '',
    ).trim(),
    orderReference: String(source.orderReference || source.reference || clientReference || metadata.orderReference || '').trim(),
    productCode: String(source.productCode || source.offer || metadata.productCode || metadata.offer || '').trim(),
    title: String(source.title || source.productName || metadata.title || metadata.productName || '').trim(),
    format: String(source.format || metadata.format || metadata.concept || '').trim(),
    paymentStatus: String(source.paymentStatus || source.payment_status || source.status || 'paid').trim().toLowerCase(),
    amountTotal: Number(source.amountTotal ?? source.amount_total ?? source.amount ?? 0),
    currency: String(source.currency || 'eur').trim().toLowerCase(),
    status: String(source.projectStatus || source.portalStatus || source.statusProject || 'reservation_confirmed').trim(),
    appointmentAt: source.appointmentAt || source.appointment_at || metadata.appointmentAt || null,
    filmingAt: source.filmingAt || source.filming_at || metadata.filmingAt || null,
    nextAction: String(source.nextAction || metadata.nextAction || '').trim(),
    preparationUrl: String(source.preparationUrl || source.preparation_url || metadata.preparationUrl || '').trim(),
    bookingUrl: String(source.bookingUrl || source.booking_url || metadata.bookingUrl || env.BOOKING_URL || '').trim(),
    referralCode: referralCodeFrom(source, metadata, clientReference),
  };
}

function referralCodeFrom(source, metadata, clientReference) {
  const direct = source.referralCode || source.referral_code || source.ref || metadata.referralCode || metadata.referral_code || metadata.ref;
  const raw = String(direct || clientReference || '').toUpperCase();
  const match = raw.match(/(?:NEPTUNE[-_:]?REF[-_:]?)?([A-Z0-9]{6,18})/u);
  return match ? match[1] : '';
}

export function safeFilename(value) {
  return String(value || 'fichier').replace(/[\r\n"\\/]/gu, '_').slice(0, 180) || 'fichier';
}
