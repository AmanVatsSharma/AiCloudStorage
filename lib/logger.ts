/**
 * Lightweight structured logger for frontend/server shared usage.
 * Keeps console output consistent and searchable during debugging.
 */
type LogLevel = "debug" | "info" | "warn" | "error";

interface LogPayload {
  traceId?: string;
  scope: string;
  message: string;
  data?: Record<string, unknown>;
}

const LOG_PREFIX = "app-log";

/**
 * Generates a simple trace ID that can be threaded across related logs.
 */
export function createTraceId(prefix = "trace"): string {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

/**
 * Core log writer with consistent JSON payload.
 */
function write(level: LogLevel, payload: LogPayload): void {
  const body = {
    timestamp: new Date().toISOString(),
    level,
    traceId: payload.traceId ?? null,
    scope: payload.scope,
    message: payload.message,
    data: payload.data ?? {},
  };

  if (level === "error") {
    console.error(`${LOG_PREFIX}:`, body);
    return;
  }

  if (level === "warn") {
    console.warn(`${LOG_PREFIX}:`, body);
    return;
  }

  if (level === "info") {
    console.info(`${LOG_PREFIX}:`, body);
    return;
  }

  console.debug(`${LOG_PREFIX}:`, body);
}

/**
 * Public logger API.
 */
export const logger = {
  debug: (payload: LogPayload) => write("debug", payload),
  info: (payload: LogPayload) => write("info", payload),
  warn: (payload: LogPayload) => write("warn", payload),
  error: (payload: LogPayload) => write("error", payload),
};
