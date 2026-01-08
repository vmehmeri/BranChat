import { Message, Model, ModelProvider } from '@/types/chat';

// ============================================================================
// Callback Types
// ============================================================================

/**
 * Callback for streaming chat responses.
 * @param chunk - The text chunk received
 * @param done - Whether this is the final chunk
 */
export type StreamCallback = (chunk: string, done: boolean) => void;

// ============================================================================
// API Configuration Types
// ============================================================================

/**
 * API keys for each provider, passed from the UI layer.
 */
export interface ApiKeys {
  openai?: string | null;
  anthropic?: string | null;
  google?: string | null;
  xai?: string | null;
}

/**
 * Options for streaming chat requests.
 */
export interface StreamOptions {
  webSearchEnabled?: boolean;
}

// ============================================================================
// Provider Configuration
// ============================================================================

/**
 * Configuration passed to LLM provider constructors.
 * Supports dependency injection of API credentials.
 */
export interface LLMProviderConfig {
  apiKey: string;
  timeout?: number;
}

// ============================================================================
// Request/Response Types
// ============================================================================

/**
 * Request object for chat streaming.
 */
export interface ChatRequest {
  messages: Message[];
  model: Model;
  userBio?: string;
  options?: StreamOptions;
}

/**
 * Citation from web search results.
 */
export interface Citation {
  url: string;
  title: string;
}

// ============================================================================
// LLM Provider Interface (Chat)
// ============================================================================

/**
 * Interface for LLM chat providers.
 * Each provider implements streaming chat with multimodal support.
 */
export interface LLMProvider {
  /** The provider identifier */
  readonly provider: ModelProvider;

  /** MIME types this provider supports for attachments */
  readonly supportedMimeTypes: string[];

  /**
   * Stream a chat response.
   * @param request - The chat request with messages and options
   * @param onChunk - Callback invoked for each text chunk
   */
  stream(request: ChatRequest, onChunk: StreamCallback): Promise<void>;
}

/**
 * Factory function type for creating LLM providers.
 */
export type LLMProviderFactory = (config: LLMProviderConfig) => LLMProvider;

// ============================================================================
// Image Provider Interface (Future - v2)
// ============================================================================

/**
 * Input for image generation/editing.
 * @future This interface is defined but not implemented in v1.
 */
export interface ImageInput {
  /** Text prompt for generation */
  text: string;
  /** Optional reference image for editing/variation */
  image?: {
    data: string;
    mimeType: string;
  };
}

/**
 * Output from image generation.
 * @future This interface is defined but not implemented in v1.
 */
export interface ImageOutput {
  /** Generated image */
  image: {
    data: string;
    mimeType: string;
  };
  /** Optional description or metadata */
  text?: string;
}

/**
 * Interface for image generation providers.
 * @future This interface is defined but not implemented in v1.
 */
export interface ImageProvider {
  readonly provider: ModelProvider;
  generate(input: ImageInput): Promise<ImageOutput>;
}
