import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, Clock3 } from 'lucide-react';
import { formatBlogDate, getAllPosts, getPostBySlug } from '@/lib/blog';
import MarkdownContent from '@/components/MarkdownContent';

interface PageProps {
  params: Promise<{ slug: string }>;
}

export function generateStaticParams() {
  return getAllPosts().map((post) => ({ slug: post.slug }));
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const post = getPostBySlug(slug);

  if (!post) {
    return { title: 'Post not found' };
  }

  return {
    title: post.title,
    description: post.excerpt,
    alternates: {
      canonical: `/blog/${post.slug}`,
    },
    openGraph: {
      title: `${post.title} | Vinay Shah`,
      description: post.excerpt,
      type: 'article',
      publishedTime: post.date,
      tags: post.tags,
      url: `/blog/${post.slug}`,
      images: ['/opengraph-image'],
    },
  };
}

export default async function BlogPostPage({ params }: PageProps) {
  const { slug } = await params;
  const post = getPostBySlug(slug);

  if (!post) {
    notFound();
  }

  const structuredData = {
    '@context': 'https://schema.org',
    '@type': 'BlogPosting',
    headline: post.title,
    datePublished: post.date,
    description: post.excerpt,
    author: {
      '@type': 'Person',
      name: 'Vinay Shah',
      url: 'https://vinayshah.dev',
    },
    mainEntityOfPage: `https://vinayshah.dev/blog/${post.slug}`,
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }}
      />
      <article className="article-layout">
        <header className="article-header">
          <div className="reading-shell">
            <Link className="case-back" href="/blog">
              <ArrowLeft size={16} aria-hidden="true" />
              Writing
            </Link>
            <p className="page-kicker">{post.tags[0]}</p>
            <h1 className="page-heading">{post.title}</h1>
            <div className="post-meta article-meta">
              <time dateTime={post.date}>{formatBlogDate(post.date)}</time>
              <span>
                <Clock3 size={14} aria-hidden="true" />
                {post.readingTime} min read
              </span>
            </div>
            <div className="tag-list" aria-label="Article tags">
              {post.tags.map((tag) => (
                <span className="tag" key={tag}>{tag}</span>
              ))}
            </div>
          </div>
        </header>

        <div className="reading-shell article-body">
          <MarkdownContent content={post.content} />
        </div>

        <footer className="reading-shell article-footer">
          <p className="eyebrow">More writing</p>
          <h2 className="subheading">Return to the archive.</h2>
          <Link className="text-link" href="/blog">
            All writing
            <ArrowLeft size={15} aria-hidden="true" />
          </Link>
        </footer>
      </article>
    </>
  );
}
