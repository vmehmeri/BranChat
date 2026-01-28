export interface KeychainService {
  getApiKey(provider: string): Promise<string | null>;
  setApiKey(provider: string, key: string): Promise<boolean>;
  deleteApiKey(provider: string): Promise<boolean>;
  getAllApiKeys(): Promise<Record<string, string | null>>;
}

export type ApiKeyProvider = 'openai' | 'anthropic' | 'google' | 'xai' | 'openrouter';

export const API_KEY_PROVIDERS: ApiKeyProvider[] = ['openai', 'anthropic', 'google', 'xai', 'openrouter'];

export const API_KEY_LABELS: Record<ApiKeyProvider, string> = {
  openai: 'OpenAI',
  anthropic: 'Anthropic',
  google: 'Google AI',
  xai: 'xAI',
  openrouter: 'OpenRouter',
};

export const API_KEY_PLACEHOLDERS: Record<ApiKeyProvider, string> = {
  openai: 'sk-...',
  anthropic: 'sk-ant-...',
  google: 'AIza...',
  xai: 'xai-...',
  openrouter: 'sk-or-v1-...',
};
