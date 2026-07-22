import { json } from './security.js';
import {
  autopilotAction,
  autopilotPulse,
  autopilotReconcile as reconcileEvidence,
  autopilotSnapshot,
  autopilotUndo,
} from './portal-autopilot-v2.js';

export { autopilotAction, autopilotPulse, autopilotSnapshot, autopilotUndo };

export async function autopilotReconcile(store, body) {
  const response = await reconcileEvidence(store, body);
  if (!response.ok) return response;
  const result = await response.json().catch(() => ({}));
  const latestByOrder = new Map();
  for (const transition of result.transitions || []) {
    if (transition?.orderId) latestByOrder.set(transition.orderId, transition);
  }
  return json({ ...result, transitions: [...latestByOrder.values()] });
}
