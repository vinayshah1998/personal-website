import ReactMarkdown from 'react-markdown';

interface MarkdownContentProps {
  content: string;
}

export default function MarkdownContent({ content }: MarkdownContentProps) {
  return (
    <div className="doc">
      <ReactMarkdown>{content}</ReactMarkdown>
    </div>
  );
}
