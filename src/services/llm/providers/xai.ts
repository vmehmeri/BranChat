import { createXai } from '@ai-sdk/xai';
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

// Content part types for multimodal messages (xAI only supports images, not documents/PDFs)
type ContentPart = TextPart | ImagePart;

/**
 * xAI (Grok) LLM provider.
 * Uses Vercel AI SDK for abstraction.
 * Supports Grok models with streaming, web search, and multimodal inputs.
 */
export class XAIProvider extends BaseLLMProvider {
  readonly provider: ModelProvider = 'xai';

  private xai: ReturnType<typeof createXai>;

  constructor(config: LLMProviderConfig) {
    super(config);
    this.xai = createXai({ apiKey: this.apiKey });
  }

  async stream(request: ChatRequest, onChunk: StreamCallback): Promise<void> {
    const { messages, model, userBio, options } = request;
    const systemPrompt = buildSystemPrompt(userBio);

    // Convert messages to Vercel AI SDK message format
    const sdkMessages = this.convertMessages(messages);

    // Use responses API with web search tools when enabled, otherwise use standard chat
    // Web search tools only work with xai.responses(), not xai()
    const useWebSearch = options?.webSearchEnabled;

    const result = streamText({
      model: useWebSearch ? this.xai.responses(model.id) : this.xai(model.id),
      system: systemPrompt || undefined,
      messages: sdkMessages,
      tools: useWebSearch
        ? { web_search: this.xai.tools.webSearch({ enableImageUnderstanding: true }),
            x_search: this.xai.tools.xSearch({
              enableImageUnderstanding: true,
              enableVideoUnderstanding: false,
            }) }
        : undefined,
    });

    // Stream text chunks
    let hasContent = false;
    for await (const chunk of result.textStream) {
      if (chunk) {
        hasContent = true;
        onChunk(chunk, false);
      }
    }

    this.assertHasContent(hasContent, 'xAI');

    // Handle citations from web search (sources are available after streaming completes)
    if (useWebSearch) {
      await this.appendCitations(result, onChunk);
    }

    onChunk('', true);
  }

  /**
   * Converts internal message format to Vercel AI SDK format.
   * Handles multimodal content including images and documents.
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
          // Note: PDF/document attachments are NOT supported by xAI through the Vercel AI SDK.
          // xAI has a native Files API but it works differently (via document_search tool).
          // For now, we skip document attachments for xAI.
          console.warn(`Skipping document attachment ${attachment.id}: xAI does not support PDF/document attachments via AI SDK`);
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
   * Appends citations from web search sources to the response.
   */
  private async appendCitations(
    result: ReturnType<typeof streamText>,
    onChunk: StreamCallback
  ): Promise<void> {
    try {
      const sources = await result.sources;

      if (sources && sources.length > 0) {
        const citations: Citation[] = [];
        for (const source of sources) {
          const sourceAny = source as Record<string, unknown>;
          const url = sourceAny.url as string | undefined;

          if (url) {
            // Extract domain + path from URL as display title
            // (xAI's title field only contains reference numbers, not actual titles)
            let displayTitle = url;
            try {
              const urlObj = new URL(url);
              // Use domain + truncated path for better readability
              const path =
                urlObj.pathname.length > 30
                  ? urlObj.pathname.substring(0, 30) + '...'
                  : urlObj.pathname;
              displayTitle =
                urlObj.hostname.replace('www.', '') +
                (path !== '/' ? path : '');
            } catch {
              // Keep full URL if parsing fails
            }

            citations.push({
              url,
              title: displayTitle,
            });
          }
        }

        if (citations.length > 0) {
          onChunk(this.formatCitations(citations), false);
        }
      }
    } catch {
      // Sources may not be available for all responses, ignore errors
    }
  }
}
