import { parseCookies } from './security.js';
export const CLIENT_COOKIE='__Host-neptune_client';
export const ADMIN_COOKIE='__Host-neptune_session';
export function clientToken(request){return parseCookies(request.headers.get('Cookie')||'')[CLIENT_COOKIE]||'';}
export function adminAuth(request){const cookies=parseCookies(request.headers.get('Cookie')||'');return {token:cookies[ADMIN_COOKIE]||'',csrfToken:request.headers.get('X-CSRF-Token')||''};}
export function clientCookie(token,requestUrl,maxAge){const url=new URL(requestUrl),secure=!['localhost','127.0.0.1'].includes(url.hostname)?'Secure':'';return [`${CLIENT_COOKIE}=${encodeURIComponent(token||'')}`,'Path=/','HttpOnly','SameSite=Strict',secure,`Max-Age=${Math.max(0,Number(maxAge||0))}`].filter(Boolean).join('; ');}
export function normalizeOrderPayload(source={},env={}){return {
 email:String(source.email||source.customerEmail||source.customer_details?.email||'').trim().toLowerCase(),
 fullName:String(source.fullName||source.name||source.customerName||source.customer_details?.name||'').trim(),company:String(source.company||source.metadata?.company||'').trim(),
 externalPaymentId:String(source.externalPaymentId||source.stripePaymentId||source.paymentIntentId||source.payment_intent||source.checkoutSessionId||source.id||'').trim(),
 orderReference:String(source.orderReference||source.reference||source.client_reference_id||'').trim(),productCode:String(source.productCode||source.offer||source.metadata?.productCode||'').trim(),
 title:String(source.title||source.productName||source.metadata?.title||'').trim(),format:String(source.format||source.metadata?.format||'').trim(),
 paymentStatus:String(source.paymentStatus||source.payment_status||source.status||'paid').trim(),amountTotal:Number(source.amountTotal??source.amount_total??source.amount??0),currency:String(source.currency||'eur').trim(),
 status:String(source.projectStatus||source.portalStatus||source.statusProject||'reservation_confirmed').trim(),appointmentAt:source.appointmentAt||source.appointment_at||null,filmingAt:source.filmingAt||source.filming_at||null,
 nextAction:String(source.nextAction||'').trim(),preparationUrl:String(source.preparationUrl||source.preparation_url||'').trim(),bookingUrl:String(source.bookingUrl||source.booking_url||env.BOOKING_URL||'').trim(),
};}
export function safeFilename(value){return String(value||'fichier').replace(/[\r\n"\\/]/gu,'_').slice(0,180)||'fichier';}
