import React from 'react';
import { GitBranch, MessageSquare, ChevronRight, ChevronDown } from 'lucide-react';
import { Conversation, Branch, Message } from '@/types/chat';
import { useChat } from '@/contexts/ChatContext';
import { cn } from '@/lib/utils';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';

interface TreeNodeProps {
  message: Message;
  depth: number;
  conversation: Conversation;
}

function TreeNode({ message, depth, conversation }: TreeNodeProps) {
  const { openBranch, activeBranches } = useChat();
  const [isOpen, setIsOpen] = React.useState(true);
  
  const branches = conversation.branches.filter(b => b.rootMessageId === message.id);
  const hasBranches = branches.length > 0;

  return (
    <div className="relative">
      {/* Connector line */}
      {depth > 0 && (
        <div 
          className="absolute left-0 top-0 bottom-0 w-px bg-border"
          style={{ left: `${(depth - 1) * 16 + 8}px` }}
        />
      )}
      
      <div 
        className="flex items-center gap-1 py-0.5 text-xs"
        style={{ paddingLeft: `${depth * 16}px` }}
      >
        {hasBranches ? (
          <Collapsible open={isOpen} onOpenChange={setIsOpen}>
            <CollapsibleTrigger className="flex items-center gap-1 hover:bg-accent/50 rounded px-1 py-0.5 transition-colors">
              {isOpen ? (
                <ChevronDown className="h-3 w-3 text-muted-foreground" />
              ) : (
                <ChevronRight className="h-3 w-3 text-muted-foreground" />
              )}
              <span className={cn(
                "truncate max-w-[140px]",
                message.role === 'user' ? "text-foreground" : "text-muted-foreground"
              )}>
                {message.content.slice(0, 30)}...
              </span>
            </CollapsibleTrigger>
            <CollapsibleContent>
              {branches.map((branch) => (
                <BranchNode 
                  key={branch.id} 
                  branch={branch} 
                  depth={depth + 1}
                  conversation={conversation}
                />
              ))}
            </CollapsibleContent>
          </Collapsible>
        ) : (
          <div className="flex items-center gap-1 px-1 py-0.5">
            <MessageSquare className="h-3 w-3 text-muted-foreground" />
            <span className={cn(
              "truncate max-w-[140px]",
              message.role === 'user' ? "text-foreground" : "text-muted-foreground"
            )}>
              {message.content.slice(0, 30)}...
            </span>
          </div>
        )}
      </div>
    </div>
  );
}

interface BranchNodeProps {
  branch: Branch;
  depth: number;
  conversation: Conversation;
}

function BranchNode({ branch, depth, conversation }: BranchNodeProps) {
  const { openBranch, activeBranches } = useChat();
  const [isOpen, setIsOpen] = React.useState(true);
  
  const isActive = activeBranches.some(b => b.id === branch.id);

  return (
    <div className="relative">
      {/* Connector line */}
      <div 
        className="absolute top-0 bottom-0 w-px"
        style={{ 
          left: `${(depth - 1) * 16 + 8}px`,
          backgroundColor: branch.color 
        }}
      />
      
      <Collapsible open={isOpen} onOpenChange={setIsOpen}>
        <CollapsibleTrigger 
          className={cn(
            "flex items-center gap-1 py-0.5 text-xs hover:bg-accent/50 rounded px-1 transition-colors w-full",
            isActive && "bg-accent/30"
          )}
          style={{ paddingLeft: `${depth * 16}px` }}
        >
          <GitBranch 
            className="h-3 w-3 shrink-0" 
            style={{ color: branch.color }}
          />
          <span 
            className="font-medium truncate"
            style={{ color: branch.color }}
          >
            {branch.name}
          </span>
          <span className="text-muted-foreground ml-1">
            ({branch.messages.length})
          </span>
        </CollapsibleTrigger>
        
        <CollapsibleContent>
          <div 
            className="flex items-center gap-1 py-0.5 text-xs cursor-pointer hover:bg-accent/50 rounded transition-colors"
            style={{ paddingLeft: `${(depth + 1) * 16}px` }}
            onClick={() => openBranch(branch.id)}
          >
            <span className="text-muted-foreground italic">
              Click to view branch →
            </span>
          </div>
          
          {branch.messages.slice(0, 3).map((msg) => (
            <div 
              key={msg.id}
              className="flex items-center gap-1 py-0.5 text-xs"
              style={{ paddingLeft: `${(depth + 1) * 16}px` }}
            >
              <MessageSquare className="h-3 w-3 text-muted-foreground" />
              <span className={cn(
                "truncate max-w-[120px]",
                msg.role === 'user' ? "text-foreground" : "text-muted-foreground"
              )}>
                {msg.content.slice(0, 25)}...
              </span>
            </div>
          ))}
          
          {branch.messages.length > 3 && (
            <div 
              className="text-xs text-muted-foreground italic py-0.5"
              style={{ paddingLeft: `${(depth + 1) * 16}px` }}
            >
              +{branch.messages.length - 3} more messages
            </div>
          )}
        </CollapsibleContent>
      </Collapsible>
    </div>
  );
}

interface ConversationTreeViewProps {
  conversation: Conversation;
}

export function ConversationTreeView({ conversation }: ConversationTreeViewProps) {
  // Get only messages that have branches for a cleaner tree view
  const messagesWithBranches = conversation.messages.filter(
    msg => msg.branchIds.length > 0
  );

  if (messagesWithBranches.length === 0 && conversation.branches.length === 0) {
    return (
      <div className="p-3 text-center">
        <GitBranch className="h-6 w-6 mx-auto mb-2 text-muted-foreground" />
        <p className="text-xs text-muted-foreground">
          No branches yet
        </p>
        <p className="text-xs text-muted-foreground mt-1">
          Click the branch icon on any message to create one
        </p>
      </div>
    );
  }

  return (
    <div className="p-2">
      <div className="flex items-center gap-2 px-2 py-1 mb-2">
        <GitBranch className="h-4 w-4 text-primary" />
        <span className="text-sm font-medium">Conversation Tree</span>
      </div>
      
      <div className="space-y-0.5">
        {/* Main trunk indicator */}
        <div className="flex items-center gap-1 px-1 py-0.5 text-xs font-medium">
          <MessageSquare className="h-3 w-3 text-primary" />
          <span>Main ({conversation.messages.length})</span>
        </div>
        
        {/* Show messages with branches */}
        {messagesWithBranches.map((message, index) => (
          <TreeNode 
            key={message.id}
            message={message}
            depth={1}
            conversation={conversation}
          />
        ))}
      </div>
    </div>
  );
}
