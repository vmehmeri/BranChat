import { ModelProvider } from '@/types/chat';
import { LLMProvider, LLMProviderFactory, ApiKeys } from './types';
import { DEFAULT_SUPPORTED_MIME_TYPES } from './utils';
import {
  OpenAIProvider,
  AnthropicProvider,
  GoogleProvider,
  XAIProvider,
} from './providers';

/**
 * Human-readable names for providers.
 */
const PROVIDER_NAMES: Record<ModelProvider, string> = {
  openai: 'OpenAI',
  anthropic: 'Anthropic',
  google: 'Google',
  xai: 'xAI',
};

/**
 * Registry of provider factories.
 */
const providerFactories: Record<ModelProvider, LLMProviderFactory> = {
  openai: (config) => new OpenAIProvider(config),
  anthropic: (config) => new AnthropicProvider(config),
  google: (config) => new GoogleProvider(config),
  xai: (config) => new XAIProvider(config),
};

/**
 * Cache for provider instances.
 * Key format: `${provider}:${apiKeyHash}` where apiKeyHash is last 8 chars of key.
 */
const providerCache = new Map<string, LLMProvider>();

/**
 * Creates a cache key for a provider with a given API key.
 */
function createCacheKey(provider: ModelProvider, apiKey: string): string {
  // Use last 8 characters of API key for cache key (enough for uniqueness)
  const keyHash = apiKey.slice(-8);
  return `${provider}:${keyHash}`;
}

/**
 * Gets or creates an LLM provider for the given provider type.
 * Provider instances are cached by provider + API key.
 *
 * @param provider - The provider type (openai, anthropic, google, xai)
 * @param apiKeys - API keys object from context
 * @returns The LLM provider instance
 * @throws Error if API key is not configured for the provider
 */
export function getLLMProvider(
  provider: ModelProvider,
  apiKeys: ApiKeys
): LLMProvider {
  const apiKey = apiKeys[provider];

  if (!apiKey) {
    throw new Error(
      `${PROVIDER_NAMES[provider]} API key not configured. Add your API key in Settings.`
    );
  }

  // Check cache first
  const cacheKey = createCacheKey(provider, apiKey);
  const cached = providerCache.get(cacheKey);
  if (cached) {
    return cached;
  }

  // Create new provider
  const factory = providerFactories[provider];
  const llmProvider = factory({ apiKey });

  // Cache and return
  providerCache.set(cacheKey, llmProvider);
  return llmProvider;
}

/**
 * Clears the provider cache.
 * Useful for testing or when API keys are updated.
 */
export function clearProviderCache(): void {
  providerCache.clear();
}

/**
 * Gets the supported MIME types for a given provider.
 * Currently all providers support the same types, but this allows
 * for per-provider customization in the future.
 *
 * @param provider - The provider type
 * @returns Array of supported MIME type strings
 */
export function getSupportedMimeTypes(provider: ModelProvider): string[] {
  // For v1, all providers support the same types
  // In the future, this could query the provider instance
  return DEFAULT_SUPPORTED_MIME_TYPES;
}

/**
 * Checks if a MIME type is supported by a provider.
 *
 * @param provider - The provider type
 * @param mimeType - The MIME type to check
 * @returns True if the MIME type is supported
 */
export function isMimeTypeSupported(
  provider: ModelProvider,
  mimeType: string
): boolean {
  const supported = getSupportedMimeTypes(provider);
  return supported.includes(mimeType);
}

/**
 * Checks if a provider supports file attachments.
 * Currently xAI does not support attachments via the AI SDK.
 *
 * @param provider - The provider type
 * @returns True if the provider supports file attachments
 */
export function supportsAttachments(provider: ModelProvider): boolean {
  // xAI/Grok does not support file attachments through the Vercel AI SDK
  return provider !== 'xai';
}
