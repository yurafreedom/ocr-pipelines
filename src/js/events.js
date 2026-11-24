// Cross-module messages. Modules never import each other; they talk through document events.
export const ESTIMATE_EVENT = 'audit:estimate'; // detail: { system, hoursSaved, summary }
export const ESTIMATE_STORAGE_KEY = 'auditEstimate';

export function readStoredEstimate() {
  try {
    return sessionStorage.getItem(ESTIMATE_STORAGE_KEY) || '';
  } catch {
    return '';
  }
}
