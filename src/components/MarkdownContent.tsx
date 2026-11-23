import type { ComponentType } from 'react';
import ReactMarkdown from 'react-markdown';
import InkSteps from '@/components/InkSteps';

/** Components a post can embed with a line of its own: [[name]]. */
const EMBEDS: Record<string, ComponentType> = { 'ink-steps': InkSteps };

interface MarkdownContentProps {
  content: string;
}

export default function MarkdownContent({ content }: MarkdownContentProps) {
  // split() with a capture group alternates markdown and embed names: md, name, md, name, md.
  const parts = content.split(/^\[\[([\w-]+)\]\][ \t]*$/m);
  return (
    <div className="doc">
      {parts.map((part, i) => {
        if (i % 2 === 0) return <ReactMarkdown key={i}>{part}</ReactMarkdown>;
        const Embed = EMBEDS[part];
        return Embed ? <Embed key={i} /> : null;
      })}
    </div>
  );
}
