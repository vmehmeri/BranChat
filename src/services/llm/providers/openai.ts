import OpenAI from 'openai';
import { ModelProvider, Message } from '@/types/chat';
import { BaseLLMProvider } from '../base';
import { ChatRequest, StreamCallback, Citation, LLMProviderConfig } from '../types';
import { buildSystemPrompt } from '../utils';

// OpenAI Responses API content types
type OpenAIContentPart =
  | { type: 'input_text'; text: string }
  | { type: 'input_image'; image_url: string }
  | { type: 'input_file'; filename: string; file_data: string };

type OpenAIMessage =
  | { role: 'developer'; content: string }
  | { role: 'assistant'; content: string }
  | { role: 'user'; content: string | OpenAIContentPart[] };

/**
 * OpenAI LLM provider.
 * Supports GPT models with streaming, web search, and multimodal inputs.
 */
export class OpenAIProvider extends BaseLLMProvider {
  readonly provider: ModelProvider = 'openai';

  private client: OpenAI;

  constructor(config: LLMProviderConfig) {
    super(config);
    this.client = new OpenAI({
      apiKey: this.apiKey,
      dangerouslyAllowBrowser: true,
      timeout: this.timeout,
    });
  }

  protected async streamWithRetry(request: ChatRequest, onChunk: StreamCallback): Promise<void> {
    const { messages, model, userBio, options } = request;
    const systemPrompt = buildSystemPrompt(userBio);

    // Convert messages to Responses API format
    const input = this.convertMessages(messages, systemPrompt);

    // Only include web search tool when enabled
    const tools = options?.webSearchEnabled
      ? [{ type: 'web_search' as const }]
      : undefined;

    const stream = await this.client.responses.create({
      model: model.id,
      input: input as Parameters<typeof this.client.responses.create>[0]['input'],
      tools,
      stream: true,
    });

    const citations: Citation[] = [];
    let hasContent = false;

    for await (const event of stream) {
      // Handle text delta events
      if (event.type === 'response.output_text.delta') {
        hasContent = true;
        onChunk(event.delta, false);
      }

      // Handle completed message with annotations for citations (web search)
      if (
        event.type === 'response.output_item.done' &&
        event.item?.type === 'message'
      ) {
        // Extract citations from the message content
        const messageContent = (event.item as { content?: Array<{ annotations?: unknown[] }> }).content;
        this.extractCitationsFromContent(messageContent, citations);
      }

      // Handle response.done - append citations if any
      if (event.type === 'response.completed' && citations.length > 0) {
        onChunk(this.formatCitations(citations), false);
      }
    }

    this.assertHasContent(hasContent, 'OpenAI');
    onChunk('', true);
  }

  /**
   * Converts internal message format to OpenAI Responses API format.
   * Handles multimodal content including images and files.
   */
  private convertMessages(
    messages: Message[],
    systemPrompt: string | null
  ): OpenAIMessage[] {
    const input: OpenAIMessage[] = [];

    if (systemPrompt) {
      input.push({ role: 'developer', content: systemPrompt });
    }

    for (const msg of messages) {
      const hasAttachments = msg.attachments && msg.attachments.length > 0;

      if (!hasAttachments) {
        // Simple text message
        input.push({
          role: msg.role === 'assistant' ? 'assistant' : 'user',
          content: msg.content,
        });
      } else if (msg.role === 'assistant') {
        // Assistant messages are always text-only
        input.push({
          role: 'assistant',
          content: msg.content,
        });
      } else {
        // User message with attachments - create multimodal content
        const content: OpenAIContentPart[] = [];

        // Add attachments first
        for (const attachment of msg.attachments!) {
          // Skip attachments without data (blob not loaded)
          if (!attachment.data) {
            console.warn(`Skipping attachment ${attachment.id}: no data loaded`);
            continue;
          }

          if (attachment.type === 'image') {
            // Image attachment
            content.push({
              type: 'input_image',
              image_url: `data:${attachment.mimeType};base64,${attachment.data}`,
            });
          } else if (attachment.type === 'document') {
            // Document/file attachment (PDF, etc.)
            content.push({
              type: 'input_file',
              filename: attachment.name,
              file_data: `data:${attachment.mimeType};base64,${attachment.data}`,
            });
          }
        }

        // Add text content
        if (msg.content) {
          content.push({ type: 'input_text', text: msg.content });
        }

        input.push({
          role: 'user',
          content,
        });
      }
    }

    return input;
  }

  /**
   * Extracts citations from message content.
   */
  private extractCitationsFromContent(
    content: Array<{ annotations?: unknown[] }> | undefined,
    citations: Citation[]
  ): void {
    const firstContent = content?.[0];
    if (
      firstContent &&
      'annotations' in firstContent &&
      Array.isArray(firstContent.annotations)
    ) {
      for (const annotation of firstContent.annotations) {
        const ann = annotation as { type?: string; url?: string; title?: string };
        if (ann.type === 'url_citation' && ann.url) {
          citations.push({
            url: ann.url,
            title: ann.title || ann.url,
          });
        }
      }
    }
  }
}

// ============================================================================
// Image Generation (Commented out for v1)
// ============================================================================

/*
// TODO: Re-enable when ImageProvider is implemented

export class OpenAIImageProvider implements ImageProvider {
  readonly provider: ModelProvider = 'openai';
  private client: OpenAI;

  constructor(config: LLMProviderConfig) {
    this.client = new OpenAI({
      apiKey: config.apiKey,
      dangerouslyAllowBrowser: true,
      timeout: config.timeout ?? API_TIMEOUT_MS,
    });
  }

  async generate(input: ImageInput): Promise<ImageOutput> {
    const response = await this.client.images.generate({
      model: 'gpt-image-1.5',
      prompt: input.text,
    });

    const imageData = response.data?.[0];
    if (!imageData?.b64_json) {
      throw new Error('No image data in response');
    }

    return {
      image: {
        data: imageData.b64_json,
        mimeType: 'image/png',
      },
    };
  }
}
*/
