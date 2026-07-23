import Link from 'next/link';
import { ArrowUpRight } from 'lucide-react';
import type { Project } from '@/lib/projects';

export default function ProjectCard({
  project,
}: {
  project: Project;
}) {
  return (
    <article className="project-card">
      <div className="project-card-meta">
        <span>{project.year}</span>
        <span>{project.category}</span>
      </div>
      <div className="project-card-content">
        <h3 className="subheading">
          <Link href={`/projects/${project.slug}`}>{project.title}</Link>
        </h3>
        <p>{project.summary}</p>
      </div>
      <p className="project-result">{project.resultLabel}</p>
      <Link
        className="project-card-action"
        href={`/projects/${project.slug}`}
        aria-label={`Read the ${project.title} case study`}
      >
        <ArrowUpRight size={19} aria-hidden="true" />
      </Link>
    </article>
  );
}
