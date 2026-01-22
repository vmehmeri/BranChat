import React, { useState, useRef, useEffect } from 'react';
import { MessageSquare, Plus, Trash2, MoreHorizontal, Star, Edit } from 'lucide-react';
import { Conversation } from '@/types/chat';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import { formatDistanceToNow } from 'date-fns';

interface ConversationListProps {
  conversations: Conversation[];
  activeId: string | null;
  onSelect: (id: string) => void;
  onCreate: () => void;
  onDelete: (id: string) => void;
  onToggleStar: (id: string) => void;
  onUpdateTitle: (id: string, title: string) => void;
}

export function ConversationList({
  conversations,
  activeId,
  onSelect,
  onCreate,
  onDelete,
  onToggleStar,
  onUpdateTitle
}: ConversationListProps) {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editValue, setEditValue] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  const starredConversations = conversations.filter(c => c.starred);
  const unstarredConversations = conversations.filter(c => !c.starred);

  // Auto-focus input when entering edit mode
  useEffect(() => {
    if (editingId && inputRef.current) {
      // Use setTimeout to ensure dropdown has closed and input is rendered
      setTimeout(() => {
        inputRef.current?.focus();
        inputRef.current?.select();
      }, 50);
    }
  }, [editingId]);

  // Handle click outside to cancel editing
  useEffect(() => {
    if (!editingId) return;

    const handleMouseDown = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (inputRef.current && !inputRef.current.contains(target)) {
        cancelEdit();
      }
    };

    // Delay adding the listener to avoid catching the click that started edit mode
    const timer = setTimeout(() => {
      document.addEventListener('mousedown', handleMouseDown);
    }, 100);

    return () => {
      clearTimeout(timer);
      document.removeEventListener('mousedown', handleMouseDown);
    };
  }, [editingId]);

  const startEditing = (conversation: Conversation, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setEditingId(conversation.id);
    setEditValue(conversation.title);
  };

  const saveEdit = () => {
    if (editingId && editValue.trim()) {
      onUpdateTitle(editingId, editValue.trim());
    }
    setEditingId(null);
    setEditValue('');
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditValue('');
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      saveEdit();
    } else if (e.key === 'Escape') {
      cancelEdit();
    }
  };

  const renderConversationItem = (conversation: Conversation) => (
    <div
      key={conversation.id}
      className={cn(
        "group flex items-center gap-2 rounded-lg px-3 py-2.5 text-sm cursor-pointer transition-colors",
        activeId === conversation.id
          ? "bg-accent text-accent-foreground"
          : "hover:bg-accent/50"
      )}
      onClick={() => onSelect(conversation.id)}
    >
      <div className="flex-1 min-w-0">
        {editingId === conversation.id ? (
          <Input
            ref={inputRef}
            value={editValue}
            onChange={(e) => setEditValue(e.target.value)}
            onKeyDown={handleKeyDown}
            onClick={(e) => e.stopPropagation()}
            className="h-6 px-1 py-0 text-sm font-medium"
          />
        ) : (
          <p className="truncate font-medium">
            {conversation.title}
          </p>
        )}
        <p className="text-xs text-muted-foreground">
          {formatDistanceToNow(conversation.updatedAt, { addSuffix: true })}
        </p>
      </div>

      {conversation.branches.length > 0 && (
        <span className="text-xs bg-primary/10 text-primary px-1.5 py-0.5 rounded-full">
          {conversation.branches.length}
        </span>
      )}

      <Button
        variant="ghost"
        size="icon"
        className={cn(
          "h-7 w-7 shrink-0",
          conversation.starred ? "text-yellow-500" : "opacity-0 group-hover:opacity-100"
        )}
        onClick={(e) => {
          e.stopPropagation();
          onToggleStar(conversation.id);
        }}
      >
        <Star className={cn("h-4 w-4", conversation.starred && "fill-current")} />
      </Button>

      <DropdownMenu>
        <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7 opacity-0 group-hover:opacity-100"
          >
            <MoreHorizontal className="h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem
            className="cursor-pointer"
            onClick={(e) => {
              e.stopPropagation();
              startEditing(conversation, e);
            }}
          >
            <Edit className="h-4 w-4 mr-2" />
            Edit Title
          </DropdownMenuItem>
          <DropdownMenuItem
            className="cursor-pointer"
            onClick={(e) => {
              e.stopPropagation();
              onToggleStar(conversation.id);
            }}
          >
            <Star className={cn("h-4 w-4 mr-2", conversation.starred && "fill-current text-yellow-500")} />
            {conversation.starred ? 'Unstar' : 'Star'}
          </DropdownMenuItem>
          <DropdownMenuItem
            className="text-destructive cursor-pointer"
            onClick={(e) => {
              e.stopPropagation();
              onDelete(conversation.id);
            }}
          >
            <Trash2 className="h-4 w-4 mr-2" />
            Delete
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );

  return (
    <div className="flex flex-col h-full">
      <div className="px-2 pt-2 pb-1">
        <Button
          onClick={onCreate}
          className="w-full justify-start gap-2 text-muted-foreground hover:text-foreground"
          variant="ghost"
          size="sm"
        >
          <Plus className="h-4 w-4" />
          New Chat
        </Button>
      </div>

      <div className="flex-1 overflow-y-auto px-2">
        {conversations.length === 0 ? (
          <div className="text-center py-8 px-4">
            <MessageSquare className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
            <p className="text-sm text-muted-foreground">
              No conversations yet
            </p>
          </div>
        ) : (
          <div className="space-y-1">
            {starredConversations.length > 0 && (
              <>
                <div className="flex items-center gap-2 px-3 py-2 text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                  <Star className="h-3 w-3 fill-current text-yellow-500" />
                  Starred
                </div>
                {starredConversations.map(renderConversationItem)}
                {unstarredConversations.length > 0 && (
                  <div className="my-2 border-t border-border" />
                )}
              </>
            )}
            {unstarredConversations.map(renderConversationItem)}
          </div>
        )}
      </div>
    </div>
  );
}
