import Link from 'next/link';
import { ArrowRight, ArrowUpRight } from 'lucide-react';
import ProjectCard from '@/components/ProjectCard';
import { formatBlogDate, getAllPosts } from '@/lib/blog';
import { projects } from '@/lib/projects';

export default function HomePage() {
  const recentPosts = getAllPosts().slice(0, 3);

  return (
    <>
      <section className="shell home-hero">
        <div className="home-hero-copy">
          <h1 className="hero-thesis">
            Software engineer building useful products and dependable systems.
          </h1>
          <p className="lede">
            I work across AI products, mobile software, and infrastructure,
            with a bias toward clear behavior and measurable results.
          </p>
          <p className="hero-proof">
            Most recently: reduced an iOS app&apos;s startup time from 3 seconds
            to under 100 ms with more than 2,000 contacts.
          </p>
          <div className="hero-actions">
            <Link className="text-link" href="/projects">
              Selected work
              <ArrowRight size={17} aria-hidden="true" />
            </Link>
            <a className="text-link" href="mailto:vinayshah2006@gmail.com">
              Get in touch
              <ArrowUpRight size={16} aria-hidden="true" />
            </a>
          </div>
        </div>
      </section>

      <section className="shell home-work page-section">
        <div className="section-intro">
          <div>
            <p className="eyebrow">Selected work</p>
            <h2 className="section-heading">A few things I have built.</h2>
          </div>
          <Link className="text-link" href="/projects">
            View all
            <ArrowRight size={16} aria-hidden="true" />
          </Link>
        </div>
        <div className="project-list">
          {projects.map((project) => (
            <ProjectCard key={project.slug} project={project} />
          ))}
        </div>
      </section>

      <section className="home-notes page-section">
        <div className="shell home-notes-grid">
          <div>
            <div className="section-intro">
              <div>
                <p className="eyebrow">Writing</p>
                <h2 className="section-heading">Notes from the work.</h2>
              </div>
              <Link className="text-link" href="/blog">
                All writing
                <ArrowRight size={16} aria-hidden="true" />
              </Link>
            </div>
            <div className="home-post-list">
              {recentPosts.map((post) => (
                <article key={post.slug}>
                  <p className="home-post-meta">{formatBlogDate(post.date)}</p>
                  <h3>
                    <Link href={`/blog/${post.slug}`}>{post.title}</Link>
                  </h3>
                </article>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="home-contact">
        <div className="shell home-contact-inner">
          <div>
            <p className="eyebrow">Contact</p>
            <h2 className="section-heading">Have something interesting in mind?</h2>
          </div>
          <a className="text-link" href="mailto:vinayshah2006@gmail.com">
            Send an email
            <ArrowUpRight size={16} aria-hidden="true" />
          </a>
        </div>
      </section>
    </>
  );
}
