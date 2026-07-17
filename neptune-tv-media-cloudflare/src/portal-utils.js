import { sanitizeText, sanitizeUrl } from './security.js';

export const CODE_TTL = 10 * 60;
export const SESSION_TTL = 12 * 60 * 60;
export const ORDER_STEPS = [
  ['payment','Paiement confirmé'],['reservation','Réservation enregistrée'],
  ['appointment','Rendez-vous confirmé'],['preparation','Préparation de l’interview'],
  ['filming','Tournage planifié'],['shot','Tournage réalisé'],
  ['editing','Montage en cours'],['approval','Validation demandée'],
  ['delivery','Livrables disponibles'],['done','Projet terminé'],
];
export const STATUS_PROGRESS = {
  payment_confirmed:1,reservation_confirmed:2,appointment_confirmed:3,preparation:3,
  preparation_complete:4,filming_scheduled:4,filmed:6,editing:6,approval:7,delivered:9,completed:10,
};
export function normalizeEmail(value){const email=sanitizeText(value,254).toLowerCase();return /^[^\s@]+@[^\s@]+\.[^\s@]+$/u.test(email)?email:'';}
export function nullableIso(value){const text=sanitizeText(value,80);if(!text)return null;const date=new Date(text);return Number.isNaN(date.getTime())?null:date.toISOString();}
export function safeInteger(value,min=0,max=100000000){const number=Number(value);return Number.isFinite(number)?Math.min(max,Math.max(min,Math.round(number))):min;}
export function cleanOrderPayload(payload={}){return {
  email:normalizeEmail(payload.email),fullName:sanitizeText(payload.fullName||payload.name,160),company:sanitizeText(payload.company,180),
  externalPaymentId:sanitizeText(payload.externalPaymentId||payload.stripePaymentId||payload.paymentIntentId||payload.checkoutSessionId,220),
  orderReference:sanitizeText(payload.orderReference,160),productCode:sanitizeText(payload.productCode,100),
  title:sanitizeText(payload.title,200),format:sanitizeText(payload.format,100),paymentStatus:sanitizeText(payload.paymentStatus,40).toLowerCase()||'paid',
  amountTotal:safeInteger(payload.amountTotal),currency:sanitizeText(payload.currency,10).toLowerCase()||'eur',
  status:sanitizeText(payload.status,60)||'reservation_confirmed',appointmentAt:nullableIso(payload.appointmentAt),filmingAt:nullableIso(payload.filmingAt),
  nextAction:sanitizeText(payload.nextAction,320),preparationUrl:sanitizeUrl(payload.preparationUrl,1200),bookingUrl:sanitizeUrl(payload.bookingUrl,1200),
};}
export function createSteps(store,orderId,status,now){const progress=STATUS_PROGRESS[status]??2;for(let i=0;i<ORDER_STEPS.length;i+=1){const [key,label]=ORDER_STEPS[i];const pos=i+1;const state=pos<progress?'done':pos===progress?'current':'pending';store.sql.exec(`INSERT OR IGNORE INTO portal_steps (id,order_id,step_key,label,state,display_order,completed_at,note) VALUES (?,?,?,?,?,?,?,?)`,crypto.randomUUID(),orderId,key,label,state,pos*10,state==='done'?now:null,'');}}
export function syncSteps(store,orderId,status,now){createSteps(store,orderId,status,now);const progress=STATUS_PROGRESS[status]??2;for(let i=0;i<ORDER_STEPS.length;i+=1){const pos=i+1,state=pos<progress?'done':pos===progress?'current':'pending';store.sql.exec(`UPDATE portal_steps SET state=?,completed_at=CASE WHEN ?='done' THEN COALESCE(completed_at,?) ELSE NULL END WHERE order_id=? AND step_key=?`,state,state,now,orderId,ORDER_STEPS[i][0]);}}
