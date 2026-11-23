import { notFound } from 'next/navigation';
import Link from 'next/link';
import { getAllPosts, getPostBySlug } from '@/lib/blog';
import MarkdownContent from '@/components/MarkdownContent';
import { pageMeta } from '@/lib/meta';

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

  return pageMeta(`/blog/${slug}/`, post.title, post.excerpt, { publishedTime: post.date, tags: post.tags });
}

export default async function BlogPostPage({ params }: PageProps) {
  const { slug } = await params;
  const post = getPostBySlug(slug);

  if (!post) {
    notFound();
  }

  return (
    <article className="bd">
      <div className="row">
        <Link className="lk dim" href="/blog">
          ← blog
        </Link>
      </div>
      <header className="row">
        <time className="dim" dateTime={post.date}>
          {post.date}
        </time>
        <h1>{post.title}</h1>
      </header>
      {/* The posts open with their own "# title", already shown above. */}
      <MarkdownContent content={post.content.replace(/^\s*# .*\n/, '')} />
    </article>
  );
}
