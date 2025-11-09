import { projects } from '@/lib/projects';

export default function Projects() {
  return (
    <div className="max-w-4xl mx-auto px-6 py-16">
      <h1 className="text-4xl font-bold mb-8 text-gray-900 dark:text-gray-100">
        Projects
      </h1>
      <p className="text-lg text-gray-600 dark:text-gray-400 mb-12 leading-relaxed">
        Here are some of the projects I've worked on. Each one represents a learning 
        journey and an opportunity to solve interesting problems.
      </p>
      
      <div className="space-y-12">
        {projects.map((project) => (
          <div key={project.id} className="border-b border-gray-200 dark:border-gray-800 pb-12 last:border-b-0">
            <h2 className="text-2xl font-semibold mb-4 text-gray-900 dark:text-gray-100">
              {project.title}
            </h2>
            <p className="text-gray-600 dark:text-gray-400 mb-4 leading-relaxed">
              {project.description}
            </p>
            
            <div className="mb-4">
              <h3 className="text-sm font-medium text-gray-900 dark:text-gray-100 mb-2">
                Technologies Used
              </h3>
              <div className="flex flex-wrap gap-2">
                {project.tech.map((tech) => (
                  <span 
                    key={tech}
                    className="px-3 py-1 text-xs bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 rounded-full"
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
                className="text-blue-600 dark:text-blue-400 hover:underline text-sm"
              >
                View Code →
              </a>
              {project.demo && (
                <a
                  href={project.demo}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-600 dark:text-blue-400 hover:underline text-sm"
                >
                  Live Demo →
                </a>
              )}
            </div>
          </div>
        ))}
      </div>
      
      <div className="mt-16 p-6 bg-gray-50 dark:bg-gray-800 rounded-lg">
        <h2 className="text-xl font-semibold mb-3 text-gray-900 dark:text-gray-100">
          Want to collaborate?
        </h2>
        <p className="text-gray-600 dark:text-gray-400 mb-4">
          I'm always open to working on interesting projects. If you have an idea 
          or want to collaborate, let's chat!
        </p>
        <a 
          href="mailto:vinayshah2006@gmail.com"
          className="text-blue-600 dark:text-blue-400 hover:underline"
        >
          Get in touch →
        </a>
      </div>
    </div>
  )
}