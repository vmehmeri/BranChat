import { createOpenRouter } from '@openrouter/ai-sdk-provider';
import {
  streamText,
  type CoreMessage,
  type TextPart,
  type ImagePart,
} from 'ai';
import { ModelProvider, Message } from '@/types/chat';
import { BaseLLMProvider } from '../base';
import { ChatRequest, StreamCallback, Citation, LLMProviderConfig } from '../types';
import { buildSystemPrompt } from '../utils';

// Content part types for multimodal messages (OpenRouter supports images, not documents/PDFs)
type ContentPart = TextPart | ImagePart;

/**
 * OpenRouter LLM provider.
 * Uses Vercel AI SDK for abstraction.
 * Supports various models with streaming, web search via :online suffix, and multimodal inputs.
 */
export class OpenRouterProvider extends BaseLLMProvider {
  readonly provider: ModelProvider = 'openrouter';

  private openrouter: ReturnType<typeof createOpenRouter>;

  constructor(config: LLMProviderConfig) {
    super(config);
    this.openrouter = createOpenRouter({ apiKey: this.apiKey });
  }

  protected async streamWithRetry(request: ChatRequest, onChunk: StreamCallback): Promise<void> {
    const { messages, model, userBio, options } = request;
    const systemPrompt = buildSystemPrompt(userBio);

    // Convert messages to Vercel AI SDK message format
    const sdkMessages = this.convertMessages(messages);

    // Build model ID with :online suffix for web search
    const modelId = options?.webSearchEnabled ? `${model.id}:online` : model.id;

    const result = streamText({
      model: this.openrouter(modelId),
      system: systemPrompt || undefined,
      messages: sdkMessages,
    });

    // Stream text chunks
    let hasContent = false;
    for await (const chunk of result.textStream) {
      if (chunk) {
        hasContent = true;
        onChunk(chunk, false);
      }
    }

    this.assertHasContent(hasContent, 'OpenRouter');

    // Handle citations from web search (available in response annotations)
    if (options?.webSearchEnabled) {
      await this.appendCitations(result, onChunk);
    }

    onChunk('', true);
  }

  /**
   * Converts internal message format to Vercel AI SDK format.
   * Handles multimodal content including images (documents/PDFs not supported).
   */
  private convertMessages(messages: Message[]): CoreMessage[] {
    return messages.map((msg) => {
      const hasAttachments = msg.attachments && msg.attachments.length > 0;

      if (!hasAttachments) {
        // Simple text message
        return {
          role: msg.role as 'user' | 'assistant',
          content: msg.content,
        };
      }

      if (msg.role === 'assistant') {
        // Assistant messages are always text-only
        return {
          role: 'assistant' as const,
          content: msg.content,
        };
      }

      // User message with attachments - create multimodal content
      const content: ContentPart[] = [];

      for (const attachment of msg.attachments!) {
        // Skip attachments without data (blob not loaded)
        if (!attachment.data) {
          console.warn(`Skipping attachment ${attachment.id}: no data loaded`);
          continue;
        }

        if (attachment.type === 'image') {
          // Image attachment
          content.push({
            type: 'image',
            image: `data:${attachment.mimeType};base64,${attachment.data}`,
          });
        } else if (attachment.type === 'document') {
          // Note: PDF/document attachments are not confirmed to be supported by OpenRouter.
          // For safety, we skip document attachments for now.
          console.warn(`Skipping document attachment ${attachment.id}: OpenRouter PDF/document support unclear`);
        }
      }

      // Add text content
      if (msg.content) {
        content.push({ type: 'text', text: msg.content });
      }

      return {
        role: 'user' as const,
        content,
      };
    });
  }

  /**
   * Appends citations from web search annotations to the response.
   * OpenRouter returns citations in OpenAI-compatible annotation format.
   */
  private async appendCitations(
    result: ReturnType<typeof streamText>,
    onChunk: StreamCallback
  ): Promise<void> {
    try {
      const response = await result.response;
      const messages = response?.messages;

      if (!messages || messages.length === 0) {
        return;
      }

      // Get the last assistant message which should contain annotations
      const lastMessage = messages[messages.length - 1];
      if (!lastMessage || lastMessage.role !== 'assistant') {
        return;
      }

      // Extract annotations from the message content
      const annotations = (lastMessage as Record<string, unknown>).annotations as
        | Array<{ type: string; url?: string; title?: string }>
        | undefined;

      if (!annotations || annotations.length === 0) {
        return;
      }

      const citations: Citation[] = [];
      for (const annotation of annotations) {
        // Look for URL-based annotations (OpenRouter uses OpenAI format)
        if (annotation.url) {
          citations.push({
            url: annotation.url,
            title: annotation.title || this.extractDomainFromUrl(annotation.url),
          });
        }
      }

      if (citations.length > 0) {
        onChunk(this.formatCitations(citations), false);
      }
    } catch {
      // Citations may not be available for all responses, ignore errors
    }
  }

  /**
   * Extracts domain + path from URL for display.
   */
  private extractDomainFromUrl(url: string): string {
    try {
      const urlObj = new URL(url);
      const path =
        urlObj.pathname.length > 30
          ? urlObj.pathname.substring(0, 30) + '...'
          : urlObj.pathname;
      return (
        urlObj.hostname.replace('www.', '') +
        (path !== '/' ? path : '')
      );
    } catch {
      return url;
    }
  }
}
