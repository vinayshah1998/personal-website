import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import {
  ArrowLeft,
  ExternalLink,
  LockKeyhole,
} from 'lucide-react';
import { getProjectBySlug, projects } from '@/lib/projects';

interface ProjectPageProps {
  params: Promise<{ slug: string }>;
}

export function generateStaticParams() {
  return projects.map((project) => ({ slug: project.slug }));
}

export async function generateMetadata({
  params,
}: ProjectPageProps): Promise<Metadata> {
  const { slug } = await params;
  const project = getProjectBySlug(slug);

  if (!project) {
    return { title: 'Project not found' };
  }

  return {
    title: project.title,
    description: project.summary,
    alternates: {
      canonical: `/projects/${project.slug}`,
    },
    openGraph: {
      type: 'article',
      title: `${project.title} | Vinay Shah`,
      description: project.summary,
      url: `/projects/${project.slug}`,
      images: ['/opengraph-image'],
    },
  };
}

export default async function ProjectPage({ params }: ProjectPageProps) {
  const { slug } = await params;
  const project = getProjectBySlug(slug);

  if (!project) {
    notFound();
  }

  const structuredData = {
    '@context': 'https://schema.org',
    '@type': 'CreativeWork',
    name: project.title,
    description: project.summary,
    creator: {
      '@type': 'Person',
      name: 'Vinay Shah',
      url: 'https://vinayshah.dev',
    },
    dateCreated: project.year,
    keywords: project.tech.join(', '),
    url: `https://vinayshah.dev/projects/${project.slug}`,
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }}
      />

      <article>
        <header className="case-hero">
          <div className="shell">
            <Link className="case-back" href="/projects">
              <ArrowLeft size={16} aria-hidden="true" />
              Work
            </Link>
            <div className="case-hero-grid">
              <div className="case-hero-copy">
                <p className="page-kicker">{project.category} · {project.year}</p>
                <h1 className="page-heading">{project.title}</h1>
                <p className="lede">{project.summary}</p>
              </div>
              <p className="case-outcome">{project.resultLabel}</p>
            </div>
            <dl className="case-facts">
              <div>
                <dt>Status</dt>
                <dd>{project.status}</dd>
              </div>
              <div>
                <dt>Role</dt>
                <dd>{project.role}</dd>
              </div>
              <div>
                <dt>Outcome</dt>
                <dd>{project.result}</dd>
              </div>
            </dl>
          </div>
        </header>

        <section className="shell case-narrative">
          <div className="case-sidebar">
            <p className="eyebrow">Overview</p>
            <p>{project.description}</p>
            <div className="case-actions">
              {project.repo ? (
                <a
                  className="button button-secondary"
                  href={project.repo}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  View code
                  <ExternalLink size={15} aria-hidden="true" />
                  <span className="sr-only">(opens in a new tab)</span>
                </a>
              ) : (
                <span className="private-repo-note">
                  <LockKeyhole size={16} aria-hidden="true" />
                  Private repository
                </span>
              )}
            </div>
          </div>

          <div className="case-body">
            <section>
              <p className="eyebrow">Problem</p>
              <h2 className="section-heading">The constraint behind the product</h2>
              <p>{project.problem}</p>
            </section>

            <section>
              <p className="eyebrow">Decisions</p>
              <h2 className="section-heading">What shaped the build</h2>
              <ol className="decision-list">
                {project.decisions.map((decision) => (
                  <li key={decision}>
                    <p>{decision}</p>
                  </li>
                ))}
              </ol>
            </section>

            <section>
              <p className="eyebrow">How it works</p>
              <h2 className="section-heading">The product path</h2>
              <div className="system-specimen">
                {project.architecture.map((step) => (
                  <div className="specimen-step" key={step.label}>
                    <h3>{step.label}</h3>
                    <p>{step.detail}</p>
                  </div>
                ))}
              </div>
            </section>

            <section>
              <p className="eyebrow">Outcome</p>
              <h2 className="section-heading">{project.resultLabel}</h2>
              <p>{project.result}</p>
              <div className="tag-list case-tech-list" aria-label="Technologies used">
                {project.tech.map((tech) => (
                  <span className="tag" key={tech}>{tech}</span>
                ))}
              </div>
            </section>
          </div>
        </section>

        <footer className="case-footer">
          <div className="shell case-footer-inner">
            <div>
              <p className="eyebrow">Contact</p>
              <h2 className="section-heading">Want to discuss the work?</h2>
            </div>
            <a className="text-link" href="mailto:vinayshah2006@gmail.com">
              Send an email
            </a>
          </div>
        </footer>
      </article>
    </>
  );
}
