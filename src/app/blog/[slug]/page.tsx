import { notFound } from 'next/navigation';
import Link from 'next/link';
import { getAllPosts, getPostBySlug } from '@/lib/blog';
import MarkdownContent from '@/components/MarkdownContent';

interface PageProps {
  params: Promise<{ slug: string }>;
}

export async function generateStaticParams() {
  const posts = getAllPosts();
  return posts.map((post) => ({
    slug: post.slug,
  }));
}

export async function generateMetadata({ params }: PageProps) {
  const { slug } = await params;
  const post = getPostBySlug(slug);

  if (!post) {
    return {
      title: 'Post Not Found',
    };
  }

  return {
    title: `${post.title} - Vinay Shah`,
    description: post.excerpt,
    openGraph: {
      title: post.title,
      description: post.excerpt,
      type: 'article',
      publishedTime: post.date,
      tags: post.tags,
    },
  };
}

export default async function BlogPostPage({ params }: PageProps) {
  const { slug } = await params;
  const post = getPostBySlug(slug);

  if (!post) {
    notFound();
  }

  return (
    <article className="max-w-4xl mx-auto px-6 py-16">
      <Link
        href="/blog"
        className="inline-block mb-8 cozy-link"
      >
        ← Back to Blog
      </Link>

      <header className="mb-8">
        <p className="page-kicker">Notes &amp; fixes</p>
        <h1 className="page-title mb-4">{post.title}</h1>

        <div className="flex items-center gap-4 text-ink-soft">
          <time dateTime={post.date}>
            {new Date(post.date).toLocaleDateString('en-US', {
              year: 'numeric',
              month: 'long',
              day: 'numeric',
            })}
          </time>

          {post.tags.length > 0 && (
            <div className="flex gap-2">
              {post.tags.map((tag) => (
                <span
                  key={tag}
                  className="cozy-tag"
                >
                  {tag}
                </span>
              ))}
            </div>
          )}
        </div>
      </header>

      <div className="border-t border-line pt-8">
        <MarkdownContent content={post.content} />
      </div>

      <footer className="mt-12 pt-8 border-t border-line">
        <Link
          href="/blog"
          className="cozy-link"
        >
          ← Back to Blog
        </Link>
      </footer>
    </article>
  );
}
