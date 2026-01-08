import { ModelProvider } from '@/types/chat';
import { LLMProvider, LLMProviderConfig, ChatRequest, StreamCallback, Citation } from './types';
import { API_TIMEOUT_MS, DEFAULT_SUPPORTED_MIME_TYPES } from './utils';

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
   * Stream a chat response. Must be implemented by each provider.
   */
  abstract stream(request: ChatRequest, onChunk: StreamCallback): Promise<void>;

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
   * @param hasContent - Whether any content was received
   * @param providerName - Display name of the provider for error message
   */
  protected assertHasContent(hasContent: boolean, providerName: string): void {
    if (!hasContent) {
      throw new Error(
        `Empty response received from ${providerName}. Please try again.`
      );
    }
  }
}
