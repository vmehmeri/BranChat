import Anthropic from '@anthropic-ai/sdk';
import { ModelProvider, Message } from '@/types/chat';
import { BaseLLMProvider } from '../base';
import { ChatRequest, StreamCallback, Citation, LLMProviderConfig } from '../types';
import { buildSystemPrompt } from '../utils';

// Anthropic message format types
type AnthropicImageMediaType = 'image/jpeg' | 'image/png' | 'image/gif' | 'image/webp';
type AnthropicDocumentMediaType = 'application/pdf';

type AnthropicContentPart =
  | { type: 'text'; text: string }
  | {
      type: 'image';
      source: { type: 'base64'; media_type: AnthropicImageMediaType; data: string };
    }
  | {
      type: 'document';
      source: { type: 'base64'; media_type: AnthropicDocumentMediaType; data: string };
    };

type AnthropicContent = string | AnthropicContentPart[];

interface AnthropicMessage {
  role: 'user' | 'assistant';
  content: AnthropicContent;
}

/**
 * Anthropic LLM provider.
 * Supports Claude models with streaming, web search, and multimodal inputs.
 */
export class AnthropicProvider extends BaseLLMProvider {
  readonly provider: ModelProvider = 'anthropic';

  private client: Anthropic;

  constructor(config: LLMProviderConfig) {
    super(config);
    this.client = new Anthropic({
      apiKey: this.apiKey,
      dangerouslyAllowBrowser: true,
      timeout: this.timeout,
    });
  }

  protected async streamWithRetry(request: ChatRequest, onChunk: StreamCallback): Promise<void> {
    const { messages, model, userBio, options } = request;
    const systemPrompt = buildSystemPrompt(userBio);
    const apiMessages = this.convertMessages(messages);

    // Build tools array if web search is enabled
    const tools = options?.webSearchEnabled
      ? [
          {
            type: 'web_search_20250305' as const,
            name: 'web_search' as const,
            max_uses: 5,
          },
        ]
      : undefined;

    const stream = this.client.messages.stream({
      model: model.id,
      max_tokens: 4096,
      system: systemPrompt || undefined,
      messages: apiMessages,
      tools,
    });

    const citations: Citation[] = [];
    let hasContent = false;

    for await (const event of stream) {
      // Handle text delta events
      if (
        event.type === 'content_block_delta' &&
        event.delta.type === 'text_delta'
      ) {
        hasContent = true;
        onChunk(event.delta.text, false);
      }

      // Handle content block start with citations (for web search)
      if (
        event.type === 'content_block_start' &&
        event.content_block.type === 'text'
      ) {
        this.extractCitations(event.content_block, citations);
      }

      // Handle message_stop - append citations if we have them
      if (event.type === 'message_stop' && citations.length > 0) {
        onChunk(this.formatCitations(citations), false);
      }
    }

    this.assertHasContent(hasContent, 'Anthropic');
    onChunk('', true);
  }

  /**
   * Converts internal message format to Anthropic message format.
   * Handles multimodal content including images and documents.
   */
  private convertMessages(messages: Message[]): AnthropicMessage[] {
    return messages.map((msg) => {
      const hasAttachments = msg.attachments && msg.attachments.length > 0;

      if (!hasAttachments) {
        return {
          role: msg.role as 'user' | 'assistant',
          content: msg.content,
        };
      }

      // Multimodal message with attachments
      const content: AnthropicContentPart[] = [];

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
            source: {
              type: 'base64',
              media_type: attachment.mimeType as AnthropicImageMediaType,
              data: attachment.data,
            },
          });
        } else if (attachment.type === 'document') {
          // Document attachment (PDF)
          content.push({
            type: 'document',
            source: {
              type: 'base64',
              media_type: attachment.mimeType as AnthropicDocumentMediaType,
              data: attachment.data,
            },
          });
        }
      }

      if (msg.content) {
        content.push({ type: 'text', text: msg.content });
      }

      return {
        role: msg.role as 'user' | 'assistant',
        content,
      };
    });
  }

  /**
   * Extracts citations from a content block with web search results.
   */
  private extractCitations(
    block: { citations?: unknown[] },
    citations: Citation[]
  ): void {
    if ('citations' in block && Array.isArray(block.citations)) {
      for (const citation of block.citations) {
        const cit = citation as {
          type?: string;
          url?: string;
          title?: string;
        };
        if (cit.type === 'web_search_result_location' && cit.url) {
          citations.push({
            url: cit.url,
            title: cit.title || cit.url,
          });
        }
      }
    }
  }
}
