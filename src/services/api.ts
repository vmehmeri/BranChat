/**
 * @deprecated This module is deprecated. Import from '@/services/llm' instead.
 *
 * This file is kept for backward compatibility and re-exports all public APIs
 * from the new llm module.
 */

export {
  streamChatMessage,
  sendChatMessage,
  getSupportedMimeTypes,
  isMimeTypeSupported,
} from './llm';

export type { StreamCallback, ApiKeys, StreamOptions } from './llm';
