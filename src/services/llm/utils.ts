/**
 * Timeout for API requests (5 minutes - generous for slow responses from reasoning models)
 */
export const API_TIMEOUT_MS = 5 * 60 * 1000;

/**
 * Default MIME types supported by all providers in v1.
 */
export const DEFAULT_SUPPORTED_MIME_TYPES = [
  'image/jpeg',
  'image/png',
  'image/webp',
  'application/pdf',
  'text/plain'
];

/**
 * Builds a system prompt with user bio context.
 * @param userBio - Optional user biography/context
 * @returns System prompt string or null if no bio provided
 */
export function buildSystemPrompt(userBio?: string): string | null {
  if (!userBio || userBio.trim().length === 0) {
    return null;
  }

  return `Here is some information about the user you're chatting with:\n\n${userBio}\n\nKeep this context in mind when responding.`;
}

// ============================================================================
// Retry Utilities
// ============================================================================

/**
 * Default retry configuration for API requests.
 */
export const DEFAULT_RETRY_CONFIG = {
  maxAttempts: 3,
  baseDelayMs: 1000,
  maxDelayMs: 10000,
  backoffMultiplier: 2,
} as const;

/**
 * Error types that should trigger a retry.
 */
export const RETRYABLE_ERROR_TYPES = [
  'network',
  'timeout',
  'rate_limit',
  'empty_response',
] as const;

/**
 * Determines if an error is retryable based on its type, message, or custom properties.
 * @param error - The error to check
 * @returns True if the error should be retried
 */
export function isRetryableError(error: unknown): boolean {
  if (!error) return false;

  // Check for custom retryable flag
  if (error && typeof error === 'object' && 'isRetryable' in error) {
    return true;
  }

  const errorMessage = error instanceof Error ? error.message.toLowerCase() : String(error).toLowerCase();
  
  // Check for retryable error patterns in the message
  const retryablePatterns = [
    'network error',
    'timeout',
    'rate limit',
    'too many requests',
    'service unavailable',
    'empty response',
    'connection refused',
    'connection reset',
    'connection timeout',
    'read timeout',
    'socket timeout',
  ];

  return retryablePatterns.some(pattern => errorMessage.includes(pattern));
}

/**
 * Sleeps for the specified number of milliseconds.
 * @param ms - Milliseconds to sleep
 */
export function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Calculates exponential backoff delay with jitter.
 * @param attempt - Current attempt number (0-based)
 * @param baseDelayMs - Base delay in milliseconds
 * @param maxDelayMs - Maximum delay in milliseconds
 * @param backoffMultiplier - Multiplier for exponential backoff
 * @returns Delay in milliseconds
 */
export function calculateBackoffDelay(
  attempt: number,
  baseDelayMs: number,
  maxDelayMs: number,
  backoffMultiplier: number
): number {
  // Calculate exponential backoff
  const exponentialDelay = baseDelayMs * Math.pow(backoffMultiplier, attempt);
  
  // Add jitter (±25% random variation) to avoid thundering herd
  const jitterFactor = 0.75 + Math.random() * 0.5; // 0.75 to 1.25
  const delayWithJitter = exponentialDelay * jitterFactor;
  
  // Cap at maximum delay
  return Math.min(delayWithJitter, maxDelayMs);
}

/**
 * Wraps an async function with retry logic and exponential backoff.
 * @param fn - The async function to retry
 * @param config - Retry configuration options
 * @returns Promise that resolves with the function result or rejects with last error
 */
export async function withRetry<T>(
  fn: () => Promise<T>,
  config: Partial<typeof DEFAULT_RETRY_CONFIG> = {}
): Promise<T> {
  const finalConfig = { ...DEFAULT_RETRY_CONFIG, ...config };
  let lastError: unknown;

  for (let attempt = 0; attempt < finalConfig.maxAttempts; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;
      
      // Don't retry on the last attempt
      if (attempt === finalConfig.maxAttempts - 1) {
        break;
      }
      
      // Check if error is retryable
      if (!isRetryableError(error)) {
        break;
      }
      
      // Calculate delay and wait before retrying
      const delay = calculateBackoffDelay(
        attempt,
        finalConfig.baseDelayMs,
        finalConfig.maxDelayMs,
        finalConfig.backoffMultiplier
      );
      
      console.warn(`API request failed (attempt ${attempt + 1}/${finalConfig.maxAttempts}), retrying in ${Math.round(delay)}ms:`, error);
      await sleep(delay);
    }
  }

  // All attempts failed, throw the last error
  throw lastError;
}
