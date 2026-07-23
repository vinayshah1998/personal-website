import type { Metadata } from 'next';
import ProjectCard from '@/components/ProjectCard';
import { projects } from '@/lib/projects';

export const metadata: Metadata = {
  title: 'Selected work',
  description:
    'Case studies across AI systems, browser extensions, agent payments, and privacy-focused iOS engineering.',
  alternates: {
    canonical: '/projects',
  },
};

export default function ProjectsPage() {
  return (
    <>
      <header className="shell work-header page-section">
        <p className="page-kicker">Work</p>
        <h1 className="page-heading">Selected projects</h1>
        <p className="lede">
          Product and engineering work across AI, mobile software, and
          infrastructure.
        </p>
      </header>

      <section className="shell project-list" aria-label="Project case studies">
        {projects.map((project) => (
          <ProjectCard key={project.slug} project={project} />
        ))}
      </section>

      <section className="work-cta">
        <div className="shell work-cta-inner">
          <div>
            <p className="eyebrow">Contact</p>
            <h2 className="section-heading">Interested in working together?</h2>
          </div>
          <a className="text-link" href="mailto:vinayshah2006@gmail.com">
            Send an email
          </a>
        </div>
      </section>
    </>
  );
}
