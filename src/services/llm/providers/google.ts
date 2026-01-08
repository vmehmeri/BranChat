import { GoogleGenAI } from '@google/genai';
import { ModelProvider, Message } from '@/types/chat';
import { BaseLLMProvider } from '../base';
import { ChatRequest, StreamCallback, Citation, LLMProviderConfig } from '../types';
import { buildSystemPrompt } from '../utils';

// Google/Gemini message format types
interface GeminiPart {
  text?: string;
  inlineData?: { mimeType: string; data: string };
}

interface GeminiContent {
  role: 'user' | 'model';
  parts: GeminiPart[];
}

/**
 * Google (Gemini) LLM provider.
 * Supports Gemini models with streaming, web search, and multimodal inputs.
 */
export class GoogleProvider extends BaseLLMProvider {
  readonly provider: ModelProvider = 'google';

  private client: GoogleGenAI;

  constructor(config: LLMProviderConfig) {
    super(config);
    this.client = new GoogleGenAI({
      apiKey: this.apiKey,
      httpOptions: { timeout: this.timeout },
    });
  }

  async stream(request: ChatRequest, onChunk: StreamCallback): Promise<void> {
    const { messages, model, userBio, options } = request;
    const contents = this.convertMessages(messages);
    const systemPrompt = buildSystemPrompt(userBio);

    // Build tools array if web search is enabled
    const tools = options?.webSearchEnabled ? [{ googleSearch: {} }] : undefined;

    const response = await this.client.models.generateContentStream({
      model: model.id,
      contents,
      config: {
        systemInstruction: systemPrompt || undefined,
        tools,
        maxOutputTokens: 4096,
      },
    });

    const citations: Citation[] = [];
    let hasContent = false;

    for await (const chunk of response) {
      // Handle text content
      if (chunk.text) {
        hasContent = true;
        onChunk(chunk.text, false);
      }

      // Handle grounding metadata (web search citations)
      this.extractCitations(chunk, citations);
    }

    this.assertHasContent(hasContent, 'Google');

    // Append citations if we have them
    if (citations.length > 0) {
      onChunk(this.formatCitations(citations), false);
    }

    onChunk('', true);
  }

  /**
   * Converts internal message format to Gemini content format.
   * Handles multimodal content including images and documents.
   */
  private convertMessages(messages: Message[]): GeminiContent[] {
    return messages.map((msg) => {
      const parts: GeminiPart[] = [];

      // Add all attachments (images and documents)
      if (msg.attachments) {
        for (const attachment of msg.attachments) {
          // Skip attachments without data (blob not loaded)
          if (!attachment.data || attachment.data.length === 0) {
            console.warn(`Skipping attachment ${attachment.id}: no data loaded`);
            continue;
          }

          parts.push({
            inlineData: {
              mimeType: attachment.mimeType,
              data: attachment.data,
            },
          });
        }
      }

      // Add text
      if (msg.content) {
        parts.push({ text: msg.content });
      }

      return {
        role: msg.role === 'assistant' ? 'model' : 'user',
        parts,
      };
    });
  }

  /**
   * Extracts citations from grounding metadata in a response chunk.
   */
  private extractCitations(
    chunk: {
      candidates?: Array<{
        groundingMetadata?: {
          groundingChunks?: Array<{
            web?: { uri?: string; title?: string };
          }>;
        };
      }>;
    },
    citations: Citation[]
  ): void {
    const groundingMetadata = chunk.candidates?.[0]?.groundingMetadata;
    if (groundingMetadata?.groundingChunks) {
      for (const grounding of groundingMetadata.groundingChunks) {
        if (grounding.web) {
          citations.push({
            url: grounding.web.uri || '',
            title: grounding.web.title || grounding.web.uri || '',
          });
        }
      }
    }
  }
}
