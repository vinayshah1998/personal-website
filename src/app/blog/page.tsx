import { pageMeta } from '@/lib/meta';
import Link from 'next/link';
import { getAllPosts } from '@/lib/blog';

export const metadata = pageMeta(
  '/blog/',
  'blog',
  'Notes from building and debugging: Stripe webhooks, a missing Express route in production, and a broken MacBook turned media server.',
);

export default function BlogPage() {
  const posts = getAllPosts();

  return (
    <div className="bd">
      {posts.length === 0 ? (
        <div className="row">
          <span className="dim">nothing here yet.</span>
        </div>
      ) : (
        posts.map((post) => (
          <div key={post.slug} className="row">
            <time className="dim" dateTime={post.date}>
              {post.date}
            </time>
            <Link className="lk" href={`/blog/${post.slug}`}>
              {post.title}
            </Link>
          </div>
        ))
      )}
    </div>
  );
}
