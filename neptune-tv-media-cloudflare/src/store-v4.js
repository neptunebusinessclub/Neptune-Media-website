import { StudioStore as LegacyStore } from './store-v3.js';
import { ensurePortalSchema } from './portal-schema.js';
import { json } from './security.js';
import {
  autopilotAction,
  autopilotPulse,
  autopilotReconcile,
  autopilotSnapshot,
  autopilotUndo,
} from './portal-autopilot-v3.js';

export class StudioStore extends LegacyStore {
  async fetch(request) {
    const url = new URL(request.url);
    const method = request.method.toUpperCase();
    if (url.pathname.startsWith('/portal/autopilot-')) {
      try {
        ensurePortalSchema(this);
        const body = method === 'GET' ? {} : await request.clone().json().catch(() => ({}));
        if (url.pathname === '/portal/autopilot-snapshot' && method === 'POST') return autopilotSnapshot(this, body);
        if (url.pathname === '/portal/autopilot-reconcile' && method === 'POST') return autopilotReconcile(this, body);
        if (url.pathname === '/portal/autopilot-action' && method === 'POST') return autopilotAction(this, body);
        if (url.pathname === '/portal/autopilot-undo' && method === 'POST') return autopilotUndo(this, body);
        if (url.pathname === '/portal/autopilot-pulse' && method === 'POST') return autopilotPulse(this, body);
      } catch (error) {
        const operation = url.pathname.slice('/portal/autopilot-'.length) || 'unknown';
        console.error('portal_autopilot_failed', {
          operation,
          name: error?.name || 'Error',
          message: String(error?.message || error || 'unknown').slice(0, 500),
        });
        return json({ error: `autopilot_${operation}_failed`, stage: operation }, 500);
      }
    }
    return super.fetch(request);
  }
}
