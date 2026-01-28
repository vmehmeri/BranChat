export type ModelProvider = 'openai' | 'anthropic' | 'google' | 'xai' | 'openrouter';
export type ModelType = 'chat' | 'image';

export interface Model {
  id: string;
  name: string;
  provider: ModelProvider;
  description: string;
  type?: ModelType; // defaults to 'chat'
  supportsWebSearch?: boolean; // whether the model supports native web search
}

export interface Attachment {
  id: string;
  name: string;
  type: 'image' | 'document';
  mimeType: string;
  data?: string; // base64 encoded - optional, loaded on demand from blob store
  size: number;
}

export interface Message {
  id: string;
  content: string;
  role: 'user' | 'assistant';
  timestamp: Date;
  parentId: string | null;
  branchIds: string[];
  model?: Model;
  attachments?: Attachment[];
}

export interface Branch {
  id: string;
  name: string;
  rootMessageId: string;
  messages: Message[];
  isCollapsed: boolean;
  color: string;
  createdAt: Date;
  model?: Model;
}

export interface Conversation {
  id: string;
  title: string;
  messages: Message[];
  branches: Branch[];
  createdAt: Date;
  updatedAt: Date;
  model: Model;
  starred?: boolean;
}

export const MODELS: Model[] = [
  // Chat models - all chat models support web search
  { id: 'gpt-5.2', name: 'GPT-5.2', provider: 'openai', description: 'Latest OpenAI flagship model', supportsWebSearch: true },
  { id: 'gpt-5.2-pro', name: 'GPT-5.2 Pro', provider: 'openai', description: 'Most capable OpenAI model', supportsWebSearch: true },
  { id: 'gpt-5-mini', name: 'GPT-5 mini', provider: 'openai', description: 'Fast and efficient', supportsWebSearch: true },
  { id: 'claude-opus-4-5', name: 'Opus 4.5', provider: 'anthropic', description: 'Most powerful Claude model', supportsWebSearch: true },
  { id: 'claude-sonnet-4-5', name: 'Sonnet 4.5', provider: 'anthropic', description: 'Balanced performance and speed', supportsWebSearch: true },
  { id: 'gemini-3-pro-preview', name: 'Gemini 3.0 Pro', provider: 'google', description: 'Advanced reasoning capabilities', supportsWebSearch: true },
  { id: 'gemini-3-flash-preview', name: 'Gemini 3.0 Flash', provider: 'google', description: 'Fast and lightweight', supportsWebSearch: true },
  { id: 'grok-4-1-fast', name: 'Grok 4.1 Fast', provider: 'xai', description: 'Fast and efficient xAI model', supportsWebSearch: true },
  { id: 'grok-4-1-fast-reasoning', name: 'Grok 4.1 Fast Reasoning', provider: 'xai', description: 'Fast with reasoning capabilities', supportsWebSearch: true },
  { id: 'z-ai/glm-4.7', name: 'GLM-4.7', provider: 'openrouter', description: 'Zhipu AI language model', supportsWebSearch: true },
  { id: 'moonshotai/kimi-k2-thinking', name: 'Kimi K2 Thinking', provider: 'openrouter', description: 'Moonshot AI reasoning model', supportsWebSearch: true },
  { id: 'deepseek/deepseek-v3.2', name: 'DeepSeek V3.2', provider: 'openrouter', description: 'DeepSeek advanced model', supportsWebSearch: true },
  // Image generation models - commented out for v1
  // { id: 'gpt-image-1.5', name: 'GPT Image 1.5', provider: 'openai', description: 'Generate images with GPT', type: 'image' },
];
