/**
 * Shared application error utilities.
 * Use these helpers so UI surfaces actionable, user-safe messages while
 * preserving details in structured logs.
 */
export class AppError extends Error {
  readonly code: string;
  readonly status: number;
  readonly isOperational: boolean;

  constructor(
    message: string,
    options?: {
      code?: string;
      status?: number;
      isOperational?: boolean;
    }
  ) {
    super(message);
    this.name = "AppError";
    this.code = options?.code ?? "APP_ERROR";
    this.status = options?.status ?? 500;
    this.isOperational = options?.isOperational ?? true;
  }
}

/**
 * Converts unknown thrown values into a safe display message.
 */
export function getUserErrorMessage(
  error: unknown,
  fallback = "Something went wrong. Please try again."
): string {
  if (!error) return fallback;
  if (error instanceof AppError) return error.message;
  if (error instanceof Error && error.message.trim().length > 0) {
    return error.message;
  }
  return fallback;
}

/**
 * Normalizes unknown errors into an Error instance for consistent logging.
 */
export function toError(error: unknown): Error {
  if (error instanceof Error) return error;
  return new Error(typeof error === "string" ? error : "Unknown error");
}
