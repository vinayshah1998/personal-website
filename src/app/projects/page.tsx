import { projects } from '@/lib/projects';

export default function Projects() {
  return (
    <div className="max-w-4xl mx-auto px-6 py-16">
      <p className="page-kicker">Things I built</p>
      <h1 className="page-title mb-8">
        Projects
      </h1>
      <p className="page-lede mb-10">
        Here are some of the projects I've worked on. Each one represents a learning 
        journey and an opportunity to solve interesting problems.
      </p>
      
      <div className="space-y-6">
        {projects.map((project) => (
          <div key={project.id} className="cozy-card p-6">
            <h2 className="font-display text-2xl font-bold mb-3 text-ink">
              {project.title}
            </h2>
            <p className="text-ink-soft mb-4 leading-relaxed">
              {project.description}
            </p>
            
            <div className="mb-4">
              <h3 className="text-sm font-medium text-ink mb-2">
                Technologies Used
              </h3>
              <div className="flex flex-wrap gap-2">
                {project.tech.map((tech) => (
                  <span 
                    key={tech}
                    className="cozy-tag"
                  >
                    {tech}
                  </span>
                ))}
              </div>
            </div>
            
            <div className="flex gap-4">
              <a
                href={project.link}
                target="_blank"
                rel="noopener noreferrer"
                className="cozy-link text-sm"
              >
                View Code →
              </a>
              {project.demo && (
                <a
                  href={project.demo}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="cozy-link text-sm"
                >
                  Live Demo →
                </a>
              )}
            </div>
          </div>
        ))}
      </div>
      
      <div className="mt-12 p-6 cozy-card bg-chip">
        <h2 className="font-display text-xl font-bold mb-3 text-ink">
          Want to collaborate?
        </h2>
        <p className="text-ink-soft mb-4">
          I'm always open to working on interesting projects. If you have an idea 
          or want to collaborate, let's chat!
        </p>
        <a 
          href="mailto:vinayshah2006@gmail.com"
          className="cozy-link"
        >
          Get in touch →
        </a>
      </div>
    </div>
  )
}