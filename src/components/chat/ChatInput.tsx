import React, { useState, useRef, useEffect } from 'react';
import { Send, Paperclip, Mic, StopCircle, X, FileText, Image as ImageIcon, Globe } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { Attachment } from '@/types/chat';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { saveBlob } from '@/services/attachments';

// Extended attachment type for local state (includes data for preview)
interface AttachmentWithPreview extends Attachment {
  data: string; // Required in local state for preview
}

interface ChatInputProps {
  onSend: (message: string, attachments?: Attachment[]) => void;
  isLoading?: boolean;
  placeholder?: string;
  webSearchEnabled?: boolean;
  onWebSearchToggle?: () => void;
  supportsWebSearch?: boolean;
  /** MIME types supported by the current model. If not provided, uses defaults. */
  supportedMimeTypes?: string[];
  /** Whether the current model supports file attachments. Defaults to true. */
  supportsFileAttachments?: boolean;
}

const MAX_FILE_SIZE = 200 * 1024 * 1024; // 200MB
const DEFAULT_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
const DEFAULT_DOC_TYPES = ['application/pdf', 'text/plain', 'text/markdown'];

export function ChatInput({
  onSend,
  isLoading = false,
  placeholder = "Message BranChat...",
  webSearchEnabled = false,
  onWebSearchToggle,
  supportsWebSearch = false,
  supportedMimeTypes,
  supportsFileAttachments = true,
}: ChatInputProps) {
  const [input, setInput] = useState('');
  const [attachments, setAttachments] = useState<AttachmentWithPreview[]>([]);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Use provided MIME types or fall back to defaults
  const allowedMimeTypes = supportedMimeTypes || [...DEFAULT_IMAGE_TYPES, ...DEFAULT_DOC_TYPES];

  // Check if send should be blocked due to unsupported attachments
  const hasUnsupportedAttachments = attachments.length > 0 && !supportsFileAttachments;
  const canSend = (input.trim() || attachments.length > 0) && !isLoading && !hasUnsupportedAttachments;

  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 200)}px`;
    }
  }, [input]);

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;

    const newAttachments: AttachmentWithPreview[] = [];

    for (const file of Array.from(files)) {
      if (file.size > MAX_FILE_SIZE) {
        alert(`File "${file.name}" is too large. Maximum size is 200MB.`);
        continue;
      }

      const isSupported = allowedMimeTypes.includes(file.type);
      const isImage = DEFAULT_IMAGE_TYPES.includes(file.type);

      if (!isSupported) {
        alert(`File type "${file.type}" is not supported by the selected model.`);
        continue;
      }

      try {
        const base64 = await fileToBase64(file);
        newAttachments.push({
          id: `attachment-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
          name: file.name,
          type: isImage ? 'image' : 'document',
          mimeType: file.type,
          data: base64,
          size: file.size,
        });
      } catch (error) {
        console.error('Error reading file:', error);
      }
    }

    setAttachments(prev => [...prev, ...newAttachments]);

    // Reset file input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const fileToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        const result = reader.result as string;
        // Remove the data URL prefix (e.g., "data:image/png;base64,")
        const base64 = result.split(',')[1];
        resolve(base64);
      };
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  };

  const removeAttachment = (id: string) => {
    setAttachments(prev => prev.filter(a => a.id !== id));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if ((input.trim() || attachments.length > 0) && !isLoading) {
      // Save blobs to store and create lightweight refs
      let attachmentRefs: Attachment[] | undefined;
      if (attachments.length > 0) {
        try {
          attachmentRefs = await Promise.all(
            attachments.map(async (att) => {
              // Save blob data to separate store
              await saveBlob(att.id, att.data);
              // Return lightweight ref without data
              const { data: _, ...ref } = att;
              return ref as Attachment;
            })
          );
        } catch (error) {
          console.error('Failed to save attachment blobs:', error);
          // Fall back to sending attachments with data included
          attachmentRefs = attachments;
        }
      }

      onSend(input.trim(), attachmentRefs);
      setInput('');
      setAttachments([]);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e);
    }
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  return (
    <form onSubmit={handleSubmit} className="relative">
      {/* Attachment Previews */}
      {attachments.length > 0 && (
        <div className="mb-2 flex flex-wrap gap-2">
          {attachments.map((attachment) => (
            <div
              key={attachment.id}
              className="relative group flex items-center gap-2 rounded-lg border bg-card p-2 pr-8"
            >
              {attachment.type === 'image' ? (
                <div className="h-10 w-10 rounded overflow-hidden bg-muted flex-shrink-0">
                  <img
                    src={`data:${attachment.mimeType};base64,${attachment.data}`}
                    alt={attachment.name}
                    className="h-full w-full object-cover"
                  />
                </div>
              ) : (
                <div className="h-10 w-10 rounded bg-muted flex items-center justify-center flex-shrink-0">
                  <FileText className="h-5 w-5 text-muted-foreground" />
                </div>
              )}
              <div className="min-w-0">
                <p className="text-xs font-medium truncate max-w-[120px]">{attachment.name}</p>
                <p className="text-xs text-muted-foreground">{formatFileSize(attachment.size)}</p>
              </div>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="absolute right-1 top-1 h-5 w-5 opacity-0 group-hover:opacity-100 transition-opacity"
                onClick={() => removeAttachment(attachment.id)}
              >
                <X className="h-3 w-3" />
              </Button>
            </div>
          ))}
        </div>
      )}

      <div className="relative flex items-end rounded-2xl border bg-card shadow-lg transition-shadow focus-within:shadow-xl">
        <input
          ref={fileInputRef}
          type="file"
          multiple
          accept={allowedMimeTypes.join(',')}
          onChange={handleFileSelect}
          className="hidden"
        />

        <div className="absolute left-2 top-1/2 -translate-y-1/2 flex items-center gap-1">
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <span>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className={cn(
                      "h-8 w-8",
                      supportsFileAttachments
                        ? "text-muted-foreground hover:text-foreground"
                        : "text-muted-foreground/50 cursor-not-allowed"
                    )}
                    onClick={() => supportsFileAttachments && fileInputRef.current?.click()}
                    disabled={!supportsFileAttachments}
                  >
                    <Paperclip className="h-4 w-4" />
                  </Button>
                </span>
              </TooltipTrigger>
              {!supportsFileAttachments && (
                <TooltipContent side="top">
                  <p>This model does not support file attachments</p>
                </TooltipContent>
              )}
            </Tooltip>
          </TooltipProvider>

          {supportsWebSearch && onWebSearchToggle && (
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className={cn(
                      "h-8 w-8 transition-colors",
                      webSearchEnabled
                        ? "text-primary bg-primary/10 hover:bg-primary/20"
                        : "text-muted-foreground hover:text-foreground"
                    )}
                    onClick={onWebSearchToggle}
                  >
                    <Globe className="h-4 w-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="top">
                  <p>{webSearchEnabled ? 'Disable web search' : 'Enable web search'}</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          )}
        </div>

        <textarea
          ref={textareaRef}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          rows={1}
          className={cn(
            "flex-1 resize-none bg-transparent text-sm placeholder:text-muted-foreground focus:outline-none",
            "py-4 max-h-[200px]",
            supportsWebSearch ? "px-24" : "px-12"
          )}
          disabled={isLoading}
        />

        <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1">
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="h-8 w-8 text-muted-foreground hover:text-foreground"
          >
            <Mic className="h-4 w-4" />
          </Button>

          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <span>
                  <Button
                    type="submit"
                    size="icon"
                    className={cn(
                      "h-8 w-8 rounded-lg transition-all",
                      canSend
                        ? "bg-primary text-primary-foreground"
                        : "bg-muted text-muted-foreground"
                    )}
                    disabled={!canSend}
                  >
                    {isLoading ? (
                      <StopCircle className="h-4 w-4" />
                    ) : (
                      <Send className="h-4 w-4" />
                    )}
                  </Button>
                </span>
              </TooltipTrigger>
              {hasUnsupportedAttachments && (
                <TooltipContent side="top">
                  <p>The selected model does not support file attachments</p>
                </TooltipContent>
              )}
            </Tooltip>
          </TooltipProvider>
        </div>
      </div>

      <p className="mt-2 text-center text-xs text-muted-foreground">
        AI models can make mistakes. Consider checking important information.
      </p>
    </form>
  );
}
