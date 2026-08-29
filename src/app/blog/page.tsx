import Link from 'next/link';
import { getAllPosts } from '@/lib/blog';

export const metadata = {
  title: 'Blog - Vinay Shah',
  description: 'Technical writing, project retrospectives, and thoughts on software engineering.',
};

export default function BlogPage() {
  const posts = getAllPosts();

  return (
    <div className="panel panel-strong max-w-4xl mx-auto my-10 px-6 py-12 md:px-10">
      <h1 className="text-4xl font-bold mb-8">Blog</h1>

      {posts.length === 0 ? (
        <p className="text-white/60">
          No blog posts yet. Check back soon!
        </p>
      ) : (
        <div className="space-y-8">
          {posts.map((post) => (
            <article
              key={post.slug}
              className="border-b border-white/10 pb-8 last:border-0"
            >
              <Link
                href={`/blog/${post.slug}`}
                className="group"
              >
                <h2 className="text-2xl font-bold mb-2 group-hover:text-blue-300 transition-colors">
                  {post.title}
                </h2>
              </Link>

              <div className="flex items-center gap-4 mb-3 text-sm text-white/60">
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
                        className="px-2 py-1 bg-white/10 rounded text-xs"
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                )}
              </div>

              <p className="text-white/70 mb-4">
                {post.excerpt}
              </p>

              <Link
                href={`/blog/${post.slug}`}
                className="text-blue-300 hover:underline"
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
