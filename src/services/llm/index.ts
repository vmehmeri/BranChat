import { Message, Model, Attachment } from '@/types/chat';
import { StreamCallback, ApiKeys, StreamOptions } from './types';
import { getLLMProvider, getSupportedMimeTypes, isMimeTypeSupported } from './registry';
import { loadBlob } from '@/services/attachments';

// ============================================================================
// Blob Loading Helpers
// ============================================================================

/**
 * Loads blob data for an attachment if not already present.
 */
async function loadAttachmentBlob(attachment: Attachment): Promise<Attachment> {
  if (attachment.data) {
    return attachment;
  }

  const data = await loadBlob(attachment.id);
  if (!data) {
    console.warn(`Failed to load blob for attachment ${attachment.id}`);
    return attachment;
  }

  return { ...attachment, data };
}

/**
 * Loads blob data for all attachments in a message.
 */
async function loadMessageBlobs(message: Message): Promise<Message> {
  if (!message.attachments || message.attachments.length === 0) {
    return message;
  }

  const attachmentsWithData = await Promise.all(
    message.attachments.map(loadAttachmentBlob)
  );

  return { ...message, attachments: attachmentsWithData };
}

/**
 * Loads blob data for all attachments across all messages.
 * This is called before sending messages to the LLM provider.
 */
async function loadAllBlobs(messages: Message[]): Promise<Message[]> {
  return Promise.all(messages.map(loadMessageBlobs));
}

// ============================================================================
// Public Type Exports
// ============================================================================

export type { StreamCallback, ApiKeys, StreamOptions } from './types';
export { getSupportedMimeTypes, isMimeTypeSupported, supportsAttachments } from './registry';

// ============================================================================
// Public API
// ============================================================================

/**
 * Streams a chat message response from the appropriate LLM provider.
 *
 * @param messages - The conversation history
 * @param model - The model to use for generation
 * @param userBio - Optional user biography for context
 * @param onChunk - Callback invoked for each text chunk
 * @param apiKeys - API keys for authentication
 * @param options - Additional options (e.g., web search)
 */
export async function streamChatMessage(
  messages: Message[],
  model: Model,
  userBio: string | undefined,
  onChunk: StreamCallback,
  apiKeys?: ApiKeys,
  options?: StreamOptions
): Promise<void> {
  // TODO: Re-enable image generation support in v2
  // Image generation models are currently disabled
  if (model.type === 'image') {
    throw new Error(
      'Image generation is temporarily disabled. Please select a chat model.'
    );
  }

  /*
  // Image generation code - commented out for v1
  if (model.type === 'image') {
    const lastUserMessage = [...messages].reverse().find((m) => m.role === 'user');
    const prompt = lastUserMessage?.content || 'Generate an image';

    const imageProvider = getImageProvider(model.provider, apiKeys || {});
    const result = await imageProvider.generate({ text: prompt });

    const imageDataUri = `data:${result.image.mimeType};base64,${result.image.data}`;
    onChunk(`{{IMAGE:${imageDataUri}}}`, false);
    onChunk('', true);
    return;
  }
  */

  // Handle chat models
  const provider = getLLMProvider(model.provider, apiKeys || {});

  // Load blob data for all attachments before sending to provider
  const messagesWithBlobs = await loadAllBlobs(messages);

  await provider.stream(
    { messages: messagesWithBlobs, model, userBio, options },
    onChunk
  );
}

/**
 * Sends a chat message and returns the complete response.
 * Non-streaming version for backward compatibility.
 *
 * @param messages - The conversation history
 * @param model - The model to use for generation
 * @param userBio - Optional user biography for context
 * @param apiKeys - API keys for authentication
 * @param options - Additional options (e.g., web search)
 * @returns The complete response text
 */
export async function sendChatMessage(
  messages: Message[],
  model: Model,
  userBio?: string,
  apiKeys?: ApiKeys,
  options?: StreamOptions
): Promise<string> {
  return new Promise((resolve, reject) => {
    let fullResponse = '';
    streamChatMessage(
      messages,
      model,
      userBio,
      (chunk, done) => {
        if (done) {
          resolve(fullResponse);
        } else {
          fullResponse += chunk;
        }
      },
      apiKeys,
      options
    ).catch(reject);
  });
}
