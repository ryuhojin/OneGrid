import type {
  DataSourceError,
  DataSourceRequestKind,
  DataSourceRetryContext,
  DataSourceRetryPolicy,
  DataSourceStatusSnapshot
} from "../types/data.js";

const DEFAULT_MAX_ATTEMPTS = 1;
const DEFAULT_DELAY_MS = 0;
const DEFAULT_MAX_DELAY_MS = 2_000;

export interface ExecuteDataSourceRequestOptions {
  readonly requestKind: DataSourceRequestKind;
  readonly requestId: string;
  readonly retryPolicy?: DataSourceRetryPolicy;
  status?(snapshot: DataSourceStatusSnapshot): void;
}

export async function executeDataSourceRequest<TResult>(
  load: () => Promise<TResult>,
  options: ExecuteDataSourceRequestOptions
): Promise<TResult> {
  const retryPolicy = normalizeRetryPolicy(options.retryPolicy);
  let attempt = 1;
  emitStatus(options, "loading", attempt, retryPolicy.attempts);

  while (true) {
    try {
      const result = await load();
      emitStatus(options, "success", attempt, retryPolicy.attempts);
      return result;
    } catch (error) {
      const normalized = normalizeDataSourceError(error, {
        requestKind: options.requestKind,
        requestId: options.requestId,
        attempt
      });
      const canRetry = shouldRetry(normalized, retryPolicy, options, attempt);
      if (!canRetry) {
        emitStatus(options, "error", attempt, retryPolicy.attempts, normalized);
        throw normalized;
      }

      emitStatus(options, "retrying", attempt, retryPolicy.attempts, normalized);
      await wait(getRetryDelayMs(retryPolicy, attempt));
      attempt += 1;
      emitStatus(options, "loading", attempt, retryPolicy.attempts);
    }
  }
}

export function normalizeDataSourceError(
  error: unknown,
  context: {
    readonly requestKind: DataSourceRequestKind;
    readonly requestId: string;
    readonly attempt: number;
  }
): DataSourceError {
  if (isDataSourceError(error)) {
    return Object.freeze({ ...error, ...context });
  }

  const errorLike = isObject(error) ? error : undefined;
  const name = getString(errorLike, "name") ?? "DataSourceError";
  const message = getString(errorLike, "message") ?? "DataSource request failed.";
  const code = getString(errorLike, "code");
  const statusCode = getNumber(errorLike, "statusCode") ?? getNumber(errorLike, "status");
  const retryable = isRetryableStatus(name, statusCode);
  return Object.freeze({
    name,
    message,
    ...context,
    retryable,
    recoverable: true,
    ...(code === undefined ? {} : { code }),
    ...(statusCode === undefined ? {} : { statusCode }),
    cause: error
  });
}

export function createDataSourceSuccessStatus(
  requestKind: DataSourceRequestKind,
  requestId: string
): DataSourceStatusSnapshot {
  return Object.freeze({
    requestKind,
    requestId,
    status: "success",
    attempt: 1,
    maxAttempts: 1,
    retryable: false,
    recoverable: true
  });
}

function shouldRetry(
  error: DataSourceError,
  policy: NormalizedRetryPolicy,
  options: ExecuteDataSourceRequestOptions,
  attempt: number
): boolean {
  if (attempt >= policy.attempts || !error.retryable) {
    return false;
  }

  const context: DataSourceRetryContext = {
    requestKind: options.requestKind,
    requestId: options.requestId,
    attempt,
    maxAttempts: policy.attempts,
    error
  };
  return options.retryPolicy?.retry?.(context) ?? true;
}

function emitStatus(
  options: ExecuteDataSourceRequestOptions,
  status: DataSourceStatusSnapshot["status"],
  attempt: number,
  maxAttempts: number,
  error?: DataSourceError
): void {
  options.status?.(Object.freeze({
    requestKind: options.requestKind,
    requestId: options.requestId,
    status,
    attempt,
    maxAttempts,
    retryable: error?.retryable ?? false,
    recoverable: error?.recoverable ?? true,
    ...(error === undefined ? {} : { error })
  }));
}

interface NormalizedRetryPolicy {
  readonly attempts: number;
  readonly delayMs: number;
  readonly maxDelayMs: number;
  readonly backoff: "none" | "linear" | "exponential";
}

function normalizeRetryPolicy(policy: DataSourceRetryPolicy | undefined): NormalizedRetryPolicy {
  return {
    attempts: Math.max(1, normalizeCount(policy?.attempts, DEFAULT_MAX_ATTEMPTS)),
    delayMs: normalizeCount(policy?.delayMs, DEFAULT_DELAY_MS),
    maxDelayMs: normalizeCount(policy?.maxDelayMs, DEFAULT_MAX_DELAY_MS),
    backoff: policy?.backoff ?? "none"
  };
}

function getRetryDelayMs(policy: NormalizedRetryPolicy, attempt: number): number {
  const factor = policy.backoff === "exponential"
    ? 2 ** Math.max(0, attempt - 1)
    : policy.backoff === "linear"
      ? attempt
      : 1;
  return Math.min(policy.delayMs * factor, policy.maxDelayMs);
}

function isRetryableStatus(name: string, statusCode: number | undefined): boolean {
  if (name === "AbortError") {
    return false;
  }
  if (statusCode === undefined) {
    return true;
  }
  return statusCode === 408 || statusCode === 409 || statusCode === 425
    || statusCode === 429 || statusCode >= 500;
}

function isDataSourceError(error: unknown): error is DataSourceError {
  return isObject(error)
    && getString(error, "name") !== undefined
    && getString(error, "message") !== undefined
    && getString(error, "requestId") !== undefined
    && getString(error, "requestKind") !== undefined
    && typeof error.retryable === "boolean"
    && typeof error.recoverable === "boolean";
}

function getString(value: Record<string, unknown> | undefined, key: string): string | undefined {
  const result = value?.[key];
  return typeof result === "string" ? result : undefined;
}

function getNumber(value: Record<string, unknown> | undefined, key: string): number | undefined {
  const result = value?.[key];
  return typeof result === "number" && Number.isFinite(result) ? result : undefined;
}

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function normalizeCount(value: number | undefined, fallback: number): number {
  return value === undefined || !Number.isFinite(value) || value < 0 ? fallback : Math.trunc(value);
}

function wait(delayMs: number): Promise<void> {
  if (delayMs <= 0) {
    return Promise.resolve();
  }

  const timers = globalThis as unknown as {
    readonly setTimeout?: (handler: () => void, timeout: number) => unknown;
  };
  return new Promise((resolve) => {
    if (timers.setTimeout) {
      timers.setTimeout(resolve, delayMs);
      return;
    }
    resolve();
  });
}
