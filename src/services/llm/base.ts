import { ModelProvider } from '@/types/chat';
import { LLMProvider, LLMProviderConfig, ChatRequest, StreamCallback, Citation } from './types';
import { API_TIMEOUT_MS, DEFAULT_SUPPORTED_MIME_TYPES, withRetry, isRetryableError } from './utils';

/**
 * Abstract base class for LLM providers.
 * Provides shared behavior for citation formatting and response validation.
 */
export abstract class BaseLLMProvider implements LLMProvider {
  abstract readonly provider: ModelProvider;

  /** MIME types supported by this provider */
  readonly supportedMimeTypes: string[] = DEFAULT_SUPPORTED_MIME_TYPES;

  /** API key for authentication */
  protected readonly apiKey: string;

  /** Request timeout in milliseconds */
  protected readonly timeout: number;

  constructor(config: LLMProviderConfig) {
    this.apiKey = config.apiKey;
    this.timeout = config.timeout ?? API_TIMEOUT_MS;
  }

  /**
   * Stream a chat response with retry logic.
   * Wraps the actual stream implementation with exponential backoff retries.
   */
  async stream(request: ChatRequest, onChunk: StreamCallback): Promise<void> {
    await withRetry(
      () => this.streamWithRetry(request, onChunk),
      {
        maxAttempts: 3,
        baseDelayMs: 1000,
        maxDelayMs: 10000,
        backoffMultiplier: 2,
      }
    );
  }

  /**
   * Actual stream implementation. Must be implemented by each provider.
   * This method will be called by the retry wrapper.
   */
  protected abstract streamWithRetry(request: ChatRequest, onChunk: StreamCallback): Promise<void>;

  /**
   * Formats citations as a markdown list for appending to responses.
   * Deduplicates citations by URL.
   * @param citations - Array of citations to format
   * @returns Formatted citation string or empty string if no citations
   */
  protected formatCitations(citations: Citation[]): string {
    if (citations.length === 0) return '';

    // Deduplicate by URL
    const unique = citations.filter(
      (c, i, arr) => arr.findIndex((x) => x.url === c.url) === i
    );

    return (
      '\n\n---\n**Sources:**\n' +
      unique.map((c, i) => `${i + 1}. [${c.title}](${c.url})`).join('\n')
    );
  }

  /**
   * Throws an error if no content was received from the provider.
   * This error will be retryable by the retry logic.
   * @param hasContent - Whether any content was received
   * @param providerName - Display name of the provider for error message
   */
  protected assertHasContent(hasContent: boolean, providerName: string): void {
    if (!hasContent) {
      const error = new Error(
        `Empty response received from ${providerName}. Please try again.`
      );
      // Mark this error as retryable by adding a custom property
      (error as unknown as Record<string, unknown>).isRetryable = true;
      (error as unknown as Record<string, unknown>).errorType = 'empty_response';
      throw error;
    }
  }
}
