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
