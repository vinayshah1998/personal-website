import { projects } from '@/lib/projects';

export const metadata = { title: 'Projects - Vinay Shah' };

export default function Projects() {
  return (
    <div className="bd">
      {projects.map((project) => (
        <div key={project.id} className="row">
          <a className="lk" href={project.link} target="_blank" rel="noopener noreferrer">
            {project.title.toLowerCase()}
          </a>
          <span>{project.summary}</span>
          <span className="dim">{project.tech.join(', ').toLowerCase()}</span>
        </div>
      ))}
    </div>
  );
}
