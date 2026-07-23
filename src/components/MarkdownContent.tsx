'use client';

import ReactMarkdown from 'react-markdown';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { vscDarkPlus } from 'react-syntax-highlighter/dist/esm/styles/prism';

interface MarkdownContentProps {
  content: string;
}

export default function MarkdownContent({ content }: MarkdownContentProps) {
  return (
    <div className="article-prose">
      <ReactMarkdown
        components={{
          a({ href, children }) {
            const external = href?.startsWith('http');

            return (
              <a
                href={href}
                target={external ? '_blank' : undefined}
                rel={external ? 'noopener noreferrer' : undefined}
              >
                {children}
                {external && <span className="sr-only"> (opens in a new tab)</span>}
              </a>
            );
          },
          code({ className, children }) {
            const match = /language-(\w+)/.exec(className || '');
            const inline = !match;

            return inline ? (
              <code className={className}>{children}</code>
            ) : (
              <SyntaxHighlighter
                style={vscDarkPlus}
                language={match[1]}
                PreTag="div"
                customStyle={{
                  margin: 0,
                  borderRadius: '6px',
                  fontSize: '0.88rem',
                }}
              >
                {String(children).replace(/\n$/, '')}
              </SyntaxHighlighter>
            );
          },
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
}
