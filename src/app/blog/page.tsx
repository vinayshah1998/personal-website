import type { Metadata } from 'next';
import Link from 'next/link';
import { ArrowRight } from 'lucide-react';
import { formatBlogDate, getAllPosts } from '@/lib/blog';

export const metadata: Metadata = {
  title: 'Engineering notes',
  description:
    'Debugging stories, infrastructure field notes, and practical lessons from building software.',
  alternates: {
    canonical: '/blog',
  },
};

export default function BlogPage() {
  const posts = getAllPosts();

  return (
    <>
      <header className="shell writing-header page-section">
        <p className="page-kicker">Writing</p>
        <h1 className="page-heading">Notes from building and debugging.</h1>
        <p className="lede">
          Practical accounts of production failures, infrastructure, and
          product experiments.
        </p>
      </header>

      <section className="shell writing-list page-section" aria-label="All engineering notes">
        <div className="section-intro">
          <div>
            <p className="eyebrow">Archive</p>
            <h2 className="section-heading">All notes</h2>
          </div>
        </div>
        <div className="post-index">
          {posts.map((post) => (
            <article key={post.slug}>
              <div className="post-index-date">
                <time dateTime={post.date}>{formatBlogDate(post.date)}</time>
              </div>
              <div className="post-index-copy">
                <h3 className="subheading">
                  <Link href={`/blog/${post.slug}`}>{post.title}</Link>
                </h3>
                <p>{post.excerpt}</p>
                <span>{post.readingTime} min read</span>
              </div>
              <Link
                className="post-index-action"
                href={`/blog/${post.slug}`}
                aria-label={`Read ${post.title}`}
              >
                <ArrowRight size={20} aria-hidden="true" />
              </Link>
            </article>
          ))}
        </div>
      </section>
    </>
  );
}
