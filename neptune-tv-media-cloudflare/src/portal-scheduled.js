import { sendFeedbackRequest, sendPracticalReminder } from './portal-email.js';

const DEFAULT_ORIGIN = 'https://tv.neptunebusiness.com';

export async function runPortalScheduled(env, studio) {
  const response = await callStore(studio, '/portal/notifications-due', {});
  const result = await response.json().catch(() => ({}));
  if (!response.ok) {
    console.error('portal_notification_candidates_failed', { status: response.status, result });
    return;
  }

  const origin = env.PUBLIC_ORIGIN || DEFAULT_ORIGIN;
  for (const item of result.items || []) {
    const sent = await sendPracticalReminder(env, origin, item.email, item);
    if (!sent.ok) {
      console.error('portal_practical_reminder_failed', {
        orderId: item.orderId,
        notificationKey: item.notificationKey,
        error: sent.error,
      });
      continue;
    }
    await callStore(studio, '/portal/notification-mark', {
      orderId: item.orderId,
      notificationKey: item.notificationKey,
      emailId: sent.id || '',
    });
  }
}

export async function sendFeedbackForOrder(env, requestUrl, studio, orderId) {
  const response = await callStore(studio, '/portal/feedback-prepare', { orderId });
  const result = await response.json().catch(() => ({}));
  if (!response.ok) return { ok: false, error: result.error || 'feedback_prepare_failed' };
  if (!result.send) return { ok: true, skipped: true };

  const sent = await sendFeedbackRequest(env, requestUrl, result.email, result);
  if (!sent.ok) return sent;

  await callStore(studio, '/portal/notification-mark', {
    orderId,
    notificationKey: 'feedback_request',
    emailId: sent.id || '',
  });
  return sent;
}

async function callStore(studio, path, body) {
  return studio.fetch(`https://store${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body || {}),
  });
}
