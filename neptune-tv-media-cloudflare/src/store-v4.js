import { StudioStore as LegacyStore } from './store-v3.js';
import { ensurePortalSchema } from './portal-schema.js';
import {
  autopilotAction,
  autopilotPulse,
  autopilotReconcile,
  autopilotSnapshot,
  autopilotUndo,
} from './portal-autopilot-v2.js';

export class StudioStore extends LegacyStore {
  async fetch(request) {
    const url = new URL(request.url);
    const method = request.method.toUpperCase();
    if (url.pathname.startsWith('/portal/autopilot-')) {
      ensurePortalSchema(this);
      const body = method === 'GET' ? {} : await request.clone().json().catch(() => ({}));
      if (url.pathname === '/portal/autopilot-snapshot' && method === 'POST') return autopilotSnapshot(this, body);
      if (url.pathname === '/portal/autopilot-reconcile' && method === 'POST') return autopilotReconcile(this, body);
      if (url.pathname === '/portal/autopilot-action' && method === 'POST') return autopilotAction(this, body);
      if (url.pathname === '/portal/autopilot-undo' && method === 'POST') return autopilotUndo(this, body);
      if (url.pathname === '/portal/autopilot-pulse' && method === 'POST') return autopilotPulse(this, body);
    }
    return super.fetch(request);
  }
}
