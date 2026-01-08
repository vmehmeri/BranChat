import React, { useState, useEffect } from 'react';
import { GitBranch, Copy, Check, Pencil, X, FileText, Loader2 } from 'lucide-react';
import { Message, Branch, Attachment } from '@/types/chat';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';
import { Markdown } from './Markdown';
import { ProviderIcon } from './ModelSelector';
import { loadBlob } from '@/services/attachments';
import {
  Dialog,
  DialogContent,
  DialogTrigger,
} from '@/components/ui/dialog';

// Component to lazy-load and display image attachments
function ImageAttachment({ attachment, userMessage }: { attachment: Attachment; userMessage: boolean }) {
  const [imageData, setImageData] = useState<string | null>(attachment.data || null);
  const [loading, setLoading] = useState(!attachment.data);
  const [error, setError] = useState(false);

  useEffect(() => {
    if (attachment.data) {
      setImageData(attachment.data);
      setLoading(false);
      return;
    }

    let cancelled = false;
    setLoading(true);
    setError(false);

    loadBlob(attachment.id).then((data) => {
      if (cancelled) return;
      if (data) {
        setImageData(data);
      } else {
        setError(true);
      }
      setLoading(false);
    }).catch(() => {
      if (cancelled) return;
      setError(true);
      setLoading(false);
    });

    return () => { cancelled = true; };
  }, [attachment.id, attachment.data]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-48 w-[200px] rounded-lg bg-muted">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (error || !imageData) {
    return (
      <div className={cn(
        "flex items-center gap-2 px-3 py-2 rounded-lg",
        userMessage ? "bg-primary-foreground/10" : "bg-background/50"
      )}>
        <FileText className="h-4 w-4 flex-shrink-0" />
        <span className="text-xs truncate max-w-[150px]">{attachment.name}</span>
      </div>
    );
  }

  return (
    <Dialog>
      <DialogTrigger asChild>
        <button className="rounded-lg overflow-hidden hover:opacity-90 transition-opacity">
          <img
            src={`data:${attachment.mimeType};base64,${imageData}`}
            alt={attachment.name}
            className="max-h-48 max-w-[200px] object-cover rounded-lg"
          />
        </button>
      </DialogTrigger>
      <DialogContent className="max-w-4xl p-0 overflow-hidden">
        <img
          src={`data:${attachment.mimeType};base64,${imageData}`}
          alt={attachment.name}
          className="w-full h-auto"
        />
      </DialogContent>
    </Dialog>
  );
}

interface ChatMessageProps {
  message: Message;
  branches?: Branch[];
  onBranch?: (messageId: string) => void;
  onOpenBranch?: (branchId: string) => void;
  onEdit?: (messageId: string, newContent: string) => void;
  isInBranch?: boolean;
  branchColor?: string;
}

export function ChatMessage({ 
  message, 
  branches = [], 
  onBranch, 
  onOpenBranch,
  onEdit,
  isInBranch = false,
  branchColor 
}: ChatMessageProps) {
  const [copied, setCopied] = React.useState(false);
  const [isEditing, setIsEditing] = React.useState(false);
  const [editContent, setEditContent] = React.useState(message.content);
  const { toast } = useToast();

  const messageBranches = branches.filter(b => message.branchIds.includes(b.id));

  const handleCopy = async () => {
    await navigator.clipboard.writeText(message.content);
    setCopied(true);
    toast({ description: 'Copied to clipboard' });
    setTimeout(() => setCopied(false), 2000);
  };

  const handleBranch = () => {
    onBranch?.(message.id);
  };

  const handleStartEdit = () => {
    setEditContent(message.content);
    setIsEditing(true);
  };

  const handleCancelEdit = () => {
    setIsEditing(false);
    setEditContent(message.content);
  };

  const handleSaveEdit = () => {
    if (editContent.trim() && editContent !== message.content) {
      onEdit?.(message.id, editContent.trim());
    }
    setIsEditing(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSaveEdit();
    } else if (e.key === 'Escape') {
      handleCancelEdit();
    }
  };

  return (
    <div className={cn(
      "group relative flex gap-4 py-6 message-enter",
      message.role === 'user' ? "flex-row-reverse" : "flex-row"
    )}>
      {branchColor && (
        <div 
          className="branch-indicator absolute left-0 top-0 bottom-0" 
          style={{ backgroundColor: branchColor }}
        />
      )}
      
      <div className={cn(
        "flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-sm font-medium",
        message.role === 'user'
          ? "bg-primary text-primary-foreground"
          : "bg-secondary text-secondary-foreground"
      )}>
        {message.role === 'user' ? 'U' : (
          message.model?.provider ? (
            <ProviderIcon provider={message.model.provider} className="h-4 w-4" />
          ) : 'AI'
        )}
      </div>

      <div className={cn(
        "flex-1 space-y-2",
        message.role === 'user' ? "text-right" : "text-left"
      )}>
        {isEditing ? (
          <div className={cn(
            "inline-block w-full max-w-[85%]",
            message.role === 'user' ? "ml-auto" : "mr-auto"
          )}>
            <Textarea
              value={editContent}
              onChange={(e) => setEditContent(e.target.value)}
              onKeyDown={handleKeyDown}
              className="min-h-[60px] text-sm"
              autoFocus
            />
            <div className="flex items-center gap-2 mt-2 justify-end">
              <Button variant="ghost" size="sm" onClick={handleCancelEdit}>
                <X className="h-3.5 w-3.5 mr-1" />
                Cancel
              </Button>
              <Button size="sm" onClick={handleSaveEdit}>
                <Check className="h-3.5 w-3.5 mr-1" />
                Save & Regenerate
              </Button>
            </div>
          </div>
        ) : (
          <div className={cn(
            "inline-block rounded-2xl px-4 py-3 max-w-[85%]",
            message.role === 'user'
              ? "bg-primary text-primary-foreground rounded-tr-sm"
              : "bg-secondary text-secondary-foreground rounded-tl-sm"
          )}>
            {/* Attachments */}
            {message.attachments && message.attachments.length > 0 && (
              <div className={cn(
                "flex flex-wrap gap-2 mb-2",
                message.role === 'user' ? "justify-end" : "justify-start"
              )}>
                {message.attachments.map((attachment) => (
                  attachment.type === 'image' ? (
                    <ImageAttachment
                      key={attachment.id}
                      attachment={attachment}
                      userMessage={message.role === 'user'}
                    />
                  ) : (
                    <div
                      key={attachment.id}
                      className={cn(
                        "flex items-center gap-2 px-3 py-2 rounded-lg",
                        message.role === 'user'
                          ? "bg-primary-foreground/10"
                          : "bg-background/50"
                      )}
                    >
                      <FileText className="h-4 w-4 flex-shrink-0" />
                      <span className="text-xs truncate max-w-[150px]">{attachment.name}</span>
                    </div>
                  )
                ))}
              </div>
            )}
            {message.content && (
              message.role === 'assistant' ? (
                <Markdown content={message.content} className="text-sm" />
              ) : (
                <p className="whitespace-pre-wrap text-sm leading-relaxed">
                  {message.content}
                </p>
              )
            )}
          </div>
        )}

        {message.model && message.role === 'assistant' && !isEditing && (
          <p className="text-xs text-muted-foreground">
            {message.model.name}
          </p>
        )}

        {!isEditing && (
          <div className={cn(
            "flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity",
            message.role === 'user' ? "justify-end" : "justify-start"
          )}>
            <Button 
              variant="ghost" 
              size="icon" 
              className="h-7 w-7"
              onClick={handleCopy}
            >
              {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
            </Button>
            
            {message.role === 'user' && onEdit && (
              <Button 
                variant="ghost" 
                size="icon" 
                className="h-7 w-7"
                onClick={handleStartEdit}
              >
                <Pencil className="h-3.5 w-3.5" />
              </Button>
            )}
            
            {!isInBranch && onBranch && (
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7"
                onClick={handleBranch}
              >
                <GitBranch className="h-3.5 w-3.5" />
              </Button>
            )}
          </div>
        )}

        {messageBranches.length > 0 && !isEditing && (
          <div className={cn(
            "flex items-center gap-2 mt-2",
            message.role === 'user' ? "justify-end" : "justify-start"
          )}>
            {messageBranches.map(branch => (
              <button
                key={branch.id}
                onClick={() => onOpenBranch?.(branch.id)}
                className="flex items-center gap-1.5 px-2 py-1 rounded-full text-xs font-medium transition-colors hover:opacity-80"
                style={{ 
                  backgroundColor: `${branch.color}20`,
                  color: branch.color 
                }}
              >
                <GitBranch className="h-3 w-3" />
                {branch.name}
                <span className="opacity-60">({branch.messages.length})</span>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
