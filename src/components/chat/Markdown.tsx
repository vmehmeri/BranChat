import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { oneDark } from 'react-syntax-highlighter/dist/esm/styles/prism';
import { Copy, Check, Download } from 'lucide-react';
import { useState } from 'react';
import { cn } from '@/lib/utils';
import {
  Dialog,
  DialogContent,
  DialogTrigger,
} from '@/components/ui/dialog';

interface MarkdownProps {
  content: string;
  className?: string;
}

// Parse special image markers {{IMAGE:url}} and render them separately
function parseContentWithImages(content: string): Array<{ type: 'text' | 'image'; content: string }> {
  const parts: Array<{ type: 'text' | 'image'; content: string }> = [];
  const imageRegex = /\{\{IMAGE:([\s\S]*?)\}\}/g;
  let lastIndex = 0;
  let match;

  while ((match = imageRegex.exec(content)) !== null) {
    // Add text before the image
    if (match.index > lastIndex) {
      parts.push({ type: 'text', content: content.slice(lastIndex, match.index) });
    }
    // Add the image
    parts.push({ type: 'image', content: match[1] });
    lastIndex = imageRegex.lastIndex;
  }

  // Add remaining text
  if (lastIndex < content.length) {
    parts.push({ type: 'text', content: content.slice(lastIndex) });
  }

  return parts.length > 0 ? parts : [{ type: 'text', content }];
}

export function Markdown({ content, className }: MarkdownProps) {
  const parts = parseContentWithImages(content);

  return (
    <div className={cn("prose prose-sm dark:prose-invert max-w-none", className)}>
      {parts.map((part, index) => {
        if (part.type === 'image') {
          return <ImageWithDialog key={index} src={part.content} alt="Generated image" />;
        }
        return (
          <ReactMarkdown
            key={index}
            remarkPlugins={[remarkGfm]}
            components={markdownComponents}
          >
            {part.content}
          </ReactMarkdown>
        );
      })}
    </div>
  );
}

const markdownComponents = {
  code({ className, children, ...props }: { className?: string; children?: React.ReactNode }) {
    const match = /language-(\w+)/.exec(className || '');
    const isInline = !match && !String(children).includes('\n');

    if (isInline) {
      return (
        <code
          className="px-1.5 py-0.5 rounded bg-muted font-mono text-sm"
          {...props}
        >
          {children}
        </code>
      );
    }

    return (
      <CodeBlock language={match?.[1] || 'text'}>
        {String(children).replace(/\n$/, '')}
      </CodeBlock>
    );
  },
  pre({ children }: { children?: React.ReactNode }) {
    return <>{children}</>;
  },
  p({ children }: { children?: React.ReactNode }) {
    return <p className="mb-3 last:mb-0 leading-relaxed">{children}</p>;
  },
  ul({ children }: { children?: React.ReactNode }) {
    return <ul className="list-disc pl-5 mb-3 space-y-1">{children}</ul>;
  },
  ol({ children }: { children?: React.ReactNode }) {
    return <ol className="list-decimal pl-5 mb-3 space-y-1">{children}</ol>;
  },
  li({ children }: { children?: React.ReactNode }) {
    return <li className="leading-relaxed">{children}</li>;
  },
  h1({ children }: { children?: React.ReactNode }) {
    return <h1 className="text-xl font-bold mb-3 mt-4 first:mt-0">{children}</h1>;
  },
  h2({ children }: { children?: React.ReactNode }) {
    return <h2 className="text-lg font-bold mb-2 mt-4 first:mt-0">{children}</h2>;
  },
  h3({ children }: { children?: React.ReactNode }) {
    return <h3 className="text-base font-bold mb-2 mt-3 first:mt-0">{children}</h3>;
  },
  blockquote({ children }: { children?: React.ReactNode }) {
    return (
      <blockquote className="border-l-4 border-muted-foreground/30 pl-4 italic my-3">
        {children}
      </blockquote>
    );
  },
  a({ href, children }: { href?: string; children?: React.ReactNode }) {
    return (
      <a
        href={href}
        target="_blank"
        rel="noopener noreferrer"
        className="text-primary underline hover:no-underline"
      >
        {children}
      </a>
    );
  },
  table({ children }: { children?: React.ReactNode }) {
    return (
      <div className="overflow-x-auto my-3">
        <table className="min-w-full border-collapse border border-border">
          {children}
        </table>
      </div>
    );
  },
  th({ children }: { children?: React.ReactNode }) {
    return (
      <th className="border border-border px-3 py-2 bg-muted font-semibold text-left">
        {children}
      </th>
    );
  },
  td({ children }: { children?: React.ReactNode }) {
    return (
      <td className="border border-border px-3 py-2">
        {children}
      </td>
    );
  },
  hr() {
    return <hr className="my-4 border-border" />;
  },
};

function CodeBlock({ children, language }: { children: string; language: string }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    await navigator.clipboard.writeText(children);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="relative group/code my-3 rounded-lg overflow-hidden">
      <div className="flex items-center justify-between px-4 py-2 bg-[#282c34] text-xs text-gray-400">
        <span>{language}</span>
        <button
          onClick={handleCopy}
          className="flex items-center gap-1 hover:text-white transition-colors"
        >
          {copied ? (
            <>
              <Check className="h-3.5 w-3.5" />
              Copied
            </>
          ) : (
            <>
              <Copy className="h-3.5 w-3.5" />
              Copy
            </>
          )}
        </button>
      </div>
      <SyntaxHighlighter
        style={oneDark}
        language={language}
        PreTag="div"
        customStyle={{
          margin: 0,
          borderRadius: 0,
          fontSize: '0.875rem',
        }}
      >
        {children}
      </SyntaxHighlighter>
    </div>
  );
}

function ImageWithDialog({ src, alt }: { src: string; alt: string }) {
  const [imageError, setImageError] = useState(false);

  const handleDownload = async () => {
    try {
      // For base64 images
      if (src.startsWith('data:')) {
        const link = document.createElement('a');
        link.href = src;
        link.download = `generated-image-${Date.now()}.png`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
      } else {
        // For URL images, fetch and download
        const response = await fetch(src);
        const blob = await response.blob();
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `generated-image-${Date.now()}.png`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
      }
    } catch (error) {
      console.error('Failed to download image:', error);
    }
  };

  if (imageError) {
    return (
      <div className="my-3 p-4 rounded-lg bg-muted/50 text-muted-foreground text-sm">
        Failed to load image: {alt}
      </div>
    );
  }

  return (
    <Dialog>
      <DialogTrigger asChild>
        <button className="my-3 block rounded-lg overflow-hidden hover:opacity-90 transition-opacity cursor-zoom-in">
          <img
            src={src}
            alt={alt}
            className="max-w-full h-auto max-h-96 rounded-lg"
            onError={() => setImageError(true)}
          />
        </button>
      </DialogTrigger>
      <DialogContent className="max-w-4xl p-0 overflow-hidden">
        <div className="relative">
          <img
            src={src}
            alt={alt}
            className="w-full h-auto"
          />
          <button
            onClick={handleDownload}
            className="absolute top-2 right-2 p-2 rounded-full bg-black/50 hover:bg-black/70 text-white transition-colors"
            title="Download image"
          >
            <Download className="h-5 w-5" />
          </button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
