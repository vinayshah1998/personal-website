import Link from 'next/link';
import { getAllPosts } from '@/lib/blog';

export const metadata = {
  title: 'Blog - Vinay Shah',
  description: 'Technical writing, project retrospectives, and thoughts on software engineering.',
};

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
