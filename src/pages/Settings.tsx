import { useState, useEffect } from 'react';
import { Moon, Sun, Monitor, Key, Bot, Check, Trash2 } from 'lucide-react';
import { useTheme } from 'next-themes';
import { AppLayout } from '@/components/layout/AppLayout';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useSettings } from '@/contexts/SettingsContext';
import { useApiKeys } from '@/contexts/ApiKeyContext';
import { isElectron } from '@/services/keychain';
import { MODELS, ModelProvider } from '@/types/chat';
import { ApiKeyProvider, API_KEY_LABELS, API_KEY_PLACEHOLDERS, API_KEY_PROVIDERS } from '@/services/keychain/types';

const providerLabels: Record<ModelProvider, string> = {
  openai: 'OpenAI',
  anthropic: 'Anthropic',
  google: 'Google',
  xai: 'xAI',
  openrouter: 'OpenRouter',
};

interface ApiKeyInputProps {
  provider: ApiKeyProvider;
}

function ApiKeyInput({ provider }: ApiKeyInputProps) {
  const { hasApiKey, setApiKey, deleteApiKey } = useApiKeys();
  const [value, setValue] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [keyExists, setKeyExists] = useState(false);

  useEffect(() => {
    setKeyExists(hasApiKey(provider));
  }, [provider, hasApiKey]);

  const handleSave = async () => {
    if (!value.trim()) return;
    setIsSaving(true);
    try {
      const success = await setApiKey(provider, value.trim());
      if (success) {
        setValue('');
        setKeyExists(true);
      }
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async () => {
    setIsDeleting(true);
    try {
      const success = await deleteApiKey(provider);
      if (success) {
        setKeyExists(false);
      }
    } finally {
      setIsDeleting(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && value.trim()) {
      handleSave();
    }
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <Label>{API_KEY_LABELS[provider]} API Key</Label>
        {keyExists && (
          <span className="text-xs text-green-600 dark:text-green-400 flex items-center gap-1">
            <Check className="h-3 w-3" /> Configured
          </span>
        )}
      </div>
      <div className="flex gap-2">
        <input
          type="password"
          placeholder={keyExists ? '••••••••••••' : API_KEY_PLACEHOLDERS[provider]}
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={handleKeyDown}
          className="flex-1 px-3 py-2 bg-input border rounded-md text-sm"
        />
        <Button
          variant="outline"
          onClick={handleSave}
          disabled={isSaving || !value.trim()}
        >
          {isSaving ? 'Saving...' : 'Save'}
        </Button>
        {keyExists && (
          <Button
            variant="destructive"
            size="icon"
            onClick={handleDelete}
            disabled={isDeleting}
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        )}
      </div>
      {isElectron() && (
        <p className="text-xs text-muted-foreground">
          Stored securely in macOS Keychain
        </p>
      )}
    </div>
  );
}

export default function Settings() {
  const { theme, setTheme } = useTheme();
  const { settings, toggleCompactMode, setDefaultModelId } = useSettings();
  const { isLoading: isLoadingApiKeys } = useApiKeys();

  const selectedModel = MODELS.find(m => m.id === settings.defaultModelId) || MODELS[0];

  return (
    <AppLayout>
      <div className="h-full overflow-y-auto p-6 lg:p-8">
        <div className="max-w-3xl mx-auto space-y-8">
          <div>
            <h1 className="text-3xl font-bold">Settings</h1>
            <p className="text-muted-foreground mt-1">
              Manage your application preferences
            </p>
          </div>

          {/* Appearance */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Sun className="h-5 w-5" />
                Appearance
              </CardTitle>
              <CardDescription>
                Customize how BranChat looks on your device
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Theme</Label>
                  <p className="text-sm text-muted-foreground">
                    Select your preferred theme
                  </p>
                </div>
                <Select value={theme} onValueChange={setTheme}>
                  <SelectTrigger className="w-[180px]">
                    <SelectValue placeholder="Select theme" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="light">
                      <div className="flex items-center gap-2">
                        <Sun className="h-4 w-4" />
                        Light
                      </div>
                    </SelectItem>
                    <SelectItem value="dark">
                      <div className="flex items-center gap-2">
                        <Moon className="h-4 w-4" />
                        Dark
                      </div>
                    </SelectItem>
                    <SelectItem value="system">
                      <div className="flex items-center gap-2">
                        <Monitor className="h-4 w-4" />
                        System
                      </div>
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <Separator />

              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Compact mode</Label>
                  <p className="text-sm text-muted-foreground">
                    Use smaller spacing and elements
                  </p>
                </div>
                <Switch
                  checked={settings.compactMode}
                  onCheckedChange={toggleCompactMode}
                />
              </div>
            </CardContent>
          </Card>

          {/* Default Model */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Bot className="h-5 w-5" />
                Default Model
              </CardTitle>
              <CardDescription>
                Choose the default AI model for new conversations
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Model for new conversations</Label>
                  <p className="text-sm text-muted-foreground">
                    This model will be selected when you start a new chat
                  </p>
                </div>
                <Select value={settings.defaultModelId} onValueChange={setDefaultModelId}>
                  <SelectTrigger className="w-[220px]">
                    <SelectValue>
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-muted-foreground">
                          {providerLabels[selectedModel.provider]}
                        </span>
                        <span>{selectedModel.name}</span>
                      </div>
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    {MODELS.map((model) => (
                      <SelectItem key={model.id} value={model.id}>
                        <div className="flex flex-col">
                          <div className="flex items-center gap-2">
                            <span className="text-xs text-muted-foreground">
                              {providerLabels[model.provider]}
                            </span>
                            <span>{model.name}</span>
                          </div>
                          <span className="text-xs text-muted-foreground">
                            {model.description}
                          </span>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>

          {/* API Keys */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Key className="h-5 w-5" />
                API Keys
              </CardTitle>
              <CardDescription>
                Connect your own API keys for AI providers
                {isElectron() && (
                  <span className="block mt-1 text-green-600 dark:text-green-400">
                    Keys are stored securely in your system keychain
                  </span>
                )}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {isLoadingApiKeys ? (
                <div className="text-sm text-muted-foreground">Loading API keys...</div>
              ) : (
                API_KEY_PROVIDERS.map((provider, index) => (
                  <div key={provider}>
                    <ApiKeyInput provider={provider} />
                    {index < API_KEY_PROVIDERS.length - 1 && <Separator className="mt-4" />}
                  </div>
                ))
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </AppLayout>
  );
}
