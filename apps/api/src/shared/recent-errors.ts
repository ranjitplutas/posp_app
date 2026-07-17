export type RecentError = {
  timestamp: string;
  statusCode: number;
  code: string;
  message: string;
  path: string;
  requestId: string;
};

const MAX_ENTRIES = 25;
const buffer: RecentError[] = [];

/** In-memory ring buffer of recent 5xx errors, surfaced on the System Health page. Single-process only — resets on restart/redeploy, which is fine for its purpose (recent operational signal, not an audit log). */
export function recordError(entry: Omit<RecentError, "timestamp">): void {
  buffer.unshift({ ...entry, timestamp: new Date().toISOString() });
  buffer.length = Math.min(buffer.length, MAX_ENTRIES);
}

export function getRecentErrors(): RecentError[] {
  return [...buffer];
}
