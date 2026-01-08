export interface KeychainService {
  getApiKey(provider: string): Promise<string | null>;
  setApiKey(provider: string, key: string): Promise<boolean>;
  deleteApiKey(provider: string): Promise<boolean>;
  getAllApiKeys(): Promise<Record<string, string | null>>;
}

export type ApiKeyProvider = 'openai' | 'anthropic' | 'google' | 'xai';

export const API_KEY_PROVIDERS: ApiKeyProvider[] = ['openai', 'anthropic', 'google', 'xai'];

export const API_KEY_LABELS: Record<ApiKeyProvider, string> = {
  openai: 'OpenAI',
  anthropic: 'Anthropic',
  google: 'Google AI',
  xai: 'xAI',
};

export const API_KEY_PLACEHOLDERS: Record<ApiKeyProvider, string> = {
  openai: 'sk-...',
  anthropic: 'sk-ant-...',
  google: 'AIza...',
  xai: 'xai-...',
};
