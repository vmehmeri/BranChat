import React from 'react';
import { Check, ChevronDown } from 'lucide-react';
import { Model, MODELS, ModelProvider } from '@/types/chat';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';
import { useApiKeys } from '@/contexts/ApiKeyContext';

interface ModelSelectorProps {
  selectedModel: Model;
  onSelectModel: (model: Model) => void;
  compact?: boolean;
}

const providerLabels: Record<ModelProvider, string> = {
  openai: 'OpenAI',
  anthropic: 'Anthropic',
  google: 'Google',
  xai: 'xAI',
};

// OpenAI logo icon
const OpenAIIcon = ({ className }: { className?: string }) => (
  <svg viewBox="0 0 24 24" fill="currentColor" className={className}>
    <path d="M22.282 9.821a5.985 5.985 0 0 0-.516-4.91 6.046 6.046 0 0 0-6.51-2.9A6.065 6.065 0 0 0 4.981 4.18a5.985 5.985 0 0 0-3.998 2.9 6.046 6.046 0 0 0 .743 7.097 5.98 5.98 0 0 0 .51 4.911 6.051 6.051 0 0 0 6.515 2.9A5.985 5.985 0 0 0 13.26 24a6.056 6.056 0 0 0 5.772-4.206 5.99 5.99 0 0 0 3.997-2.9 6.056 6.056 0 0 0-.747-7.073zM13.26 22.43a4.476 4.476 0 0 1-2.876-1.04l.141-.081 4.779-2.758a.795.795 0 0 0 .392-.681v-6.737l2.02 1.168a.071.071 0 0 1 .038.052v5.583a4.504 4.504 0 0 1-4.494 4.494zM3.6 18.304a4.47 4.47 0 0 1-.535-3.014l.142.085 4.783 2.759a.771.771 0 0 0 .78 0l5.843-3.369v2.332a.08.08 0 0 1-.033.062L9.74 19.95a4.5 4.5 0 0 1-6.14-1.646zM2.34 7.896a4.485 4.485 0 0 1 2.366-1.973V11.6a.766.766 0 0 0 .388.676l5.815 3.355-2.02 1.168a.076.076 0 0 1-.071 0l-4.83-2.786A4.504 4.504 0 0 1 2.34 7.872zm16.597 3.855l-5.833-3.387L15.119 7.2a.076.076 0 0 1 .071 0l4.83 2.791a4.494 4.494 0 0 1-.676 8.105v-5.678a.79.79 0 0 0-.407-.667zm2.01-3.023l-.141-.085-4.774-2.782a.776.776 0 0 0-.785 0L9.409 9.23V6.897a.066.066 0 0 1 .028-.061l4.83-2.787a4.5 4.5 0 0 1 6.68 4.66zm-12.64 4.135l-2.02-1.164a.08.08 0 0 1-.038-.057V6.075a4.5 4.5 0 0 1 7.375-3.453l-.142.08L8.704 5.46a.795.795 0 0 0-.393.681zm1.097-2.365l2.602-1.5 2.607 1.5v2.999l-2.597 1.5-2.607-1.5z" />
  </svg>
);

// Anthropic logo icon
const AnthropicIcon = ({ className }: { className?: string }) => (
  <svg viewBox="0 0 24 24" fill="currentColor" className={className}>
    <path d="M17.304 3.541h-3.672l6.696 16.918h3.672l-6.696-16.918zm-10.608 0L0 20.459h3.744l1.368-3.6h6.624l1.368 3.6h3.744L10.152 3.541H6.696zm.456 10.8l2.304-6.072 2.304 6.072H7.152z" />
  </svg>
);

// Google logo icon
const GoogleIcon = ({ className }: { className?: string }) => (
  <svg viewBox="0 0 24 24" className={className}>
    <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
    <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
    <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
    <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
  </svg>
);

// xAI logo icon
const XAIIcon = ({ className }: { className?: string }) => (
  <svg viewBox="0 0 24 24" fill="currentColor" className={className}>
    <path d="M2.87 4h4.225l5.652 8.14L6.97 20H2l6.177-8.56L2.87 4zm9.845 8.7L18.545 4h4.225l-6.61 9.54L22.77 20h-4.17l-5.885-7.3z" />
  </svg>
);

export const ProviderIcon = ({ provider, className }: { provider: ModelProvider; className?: string }) => {
  switch (provider) {
    case 'openai':
      return <OpenAIIcon className={className} />;
    case 'anthropic':
      return <AnthropicIcon className={className} />;
    case 'google':
      return <GoogleIcon className={className} />;
    case 'xai':
      return <XAIIcon className={className} />;
  }
};

export function ModelSelector({ selectedModel, onSelectModel, compact = false }: ModelSelectorProps) {
  const { hasApiKey } = useApiKeys();

  const groupedModels = MODELS.reduce((acc, model) => {
    if (!acc[model.provider]) {
      acc[model.provider] = [];
    }
    acc[model.provider].push(model);
    return acc;
  }, {} as Record<ModelProvider, Model[]>);

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          className={cn(
            "gap-1 font-medium",
            compact ? "px-2 h-7 text-xs" : "px-3 h-9 text-sm gap-2"
          )}
        >
          <ProviderIcon provider={selectedModel.provider} className={compact ? "h-3 w-3" : "h-4 w-4"} />
          {selectedModel.name}
          <ChevronDown className={cn("opacity-50", compact ? "h-2.5 w-2.5" : "h-3 w-3")} />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-[280px] p-0 max-h-[var(--radix-dropdown-menu-content-available-height,400px)] overflow-y-auto">
          <div className="p-1">
            {(Object.keys(groupedModels) as ModelProvider[]).map((provider, index) => (
              <React.Fragment key={provider}>
                {index > 0 && <DropdownMenuSeparator />}
                <DropdownMenuLabel className="flex items-center gap-2">
                  <ProviderIcon provider={provider} className="h-4 w-4" />
                  {providerLabels[provider]}
                </DropdownMenuLabel>
                <DropdownMenuGroup>
                  {groupedModels[provider].map((model) => {
                    const isDisabled = !hasApiKey(model.provider);
                    const menuItem = (
                      <DropdownMenuItem
                        key={model.id}
                        onClick={(e) => {
                          if (isDisabled) {
                            e.preventDefault();
                            return;
                          }
                          onSelectModel(model);
                        }}
                        className={cn(
                          "flex items-center justify-between",
                          isDisabled
                            ? "opacity-50 cursor-not-allowed"
                            : "cursor-pointer",
                          selectedModel.id === model.id && "bg-accent"
                        )}
                      >
                        <div className="flex flex-col">
                          <span className="font-medium">{model.name}</span>
                          <span className="text-xs text-muted-foreground">{model.description}</span>
                        </div>
                        {selectedModel.id === model.id && (
                          <Check className="h-4 w-4 text-primary" />
                        )}
                      </DropdownMenuItem>
                    );

                    if (isDisabled) {
                      return (
                        <Tooltip key={model.id}>
                          <TooltipTrigger asChild>
                            {menuItem}
                          </TooltipTrigger>
                          <TooltipContent side="left">
                            <p>API key missing for {providerLabels[model.provider]}</p>
                          </TooltipContent>
                        </Tooltip>
                      );
                    }

                    return menuItem;
                  })}
                </DropdownMenuGroup>
              </React.Fragment>
            ))}
          </div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
