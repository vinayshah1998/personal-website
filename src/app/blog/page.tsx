import Link from 'next/link';
import { getAllPosts } from '@/lib/blog';

export const metadata = {
  title: 'Blog - Vinay Shah',
  description: 'Technical writing, project retrospectives, and thoughts on software engineering.',
};

export default function BlogPage() {
  const posts = getAllPosts();

  return (
    <div className="max-w-4xl mx-auto px-6 py-16">
      <p className="page-kicker">Notes &amp; fixes</p>
      <h1 className="page-title mb-8">Blog</h1>

      {posts.length === 0 ? (
        <p className="text-ink-soft">
          No blog posts yet. Check back soon!
        </p>
      ) : (
        <div className="space-y-6">
          {posts.map((post) => (
            <article
              key={post.slug}
              className="cozy-card p-6"
            >
              <Link
                href={`/blog/${post.slug}`}
                className="group"
              >
                <h2 className="font-display text-2xl font-bold mb-2 text-ink group-hover:text-forest transition-colors">
                  {post.title}
                </h2>
              </Link>

              <div className="flex items-center gap-4 mb-3 text-sm text-ink-soft">
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

              <p className="text-ink-soft mb-4 leading-relaxed">
                {post.excerpt}
              </p>

              <Link
                href={`/blog/${post.slug}`}
                className="cozy-link"
              >
                Read more →
              </Link>
            </article>
          ))}
        </div>
      )}
    </div>
  );
}
