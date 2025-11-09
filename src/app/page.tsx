import Link from 'next/link';
import { projects } from '@/lib/projects';

export default function Home() {
  // Get the latest 2 projects
  const recentProjects = projects.slice(0, 2);

  return (
    <div className="max-w-4xl mx-auto px-6 py-16">
      <section className="mb-16">
        <h1 className="text-4xl font-bold mb-4 text-gray-900 dark:text-gray-100">
          Hi, I'm Vinay.
        </h1>
        <p className="text-xl text-gray-600 dark:text-gray-400 mb-6 leading-relaxed">
          I'm a software engineer. I like to build things, bake bread, and play sports.
          Welcome to my corner of the internet.
        </p>
        <p className="text-gray-600 dark:text-gray-400 leading-relaxed">
          I enjoy building things that make a difference. Currently working on
          exciting projects and always learning something new.
          Feel free to explore my work and get in touch.
        </p>
      </section>

      <section>
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-semibold text-gray-900 dark:text-gray-100">
            Recent Work
          </h2>
          <Link
            href="/projects"
            className="text-sm text-blue-600 dark:text-blue-400 hover:underline"
          >
            View all →
          </Link>
        </div>
        <div className="space-y-6">
          {recentProjects.map((project) => (
            <div key={project.id} className="border-l-2 border-gray-200 dark:border-gray-700 pl-4">
              <h3 className="font-medium text-gray-900 dark:text-gray-100 mb-2">
                {project.title}
              </h3>
              <p className="text-gray-600 dark:text-gray-400 text-sm mb-3">
                {project.description.length > 200
                  ? `${project.description.substring(0, 200)}...`
                  : project.description}
              </p>
              <div className="flex flex-wrap gap-2">
                {project.tech.slice(0, 4).map((tech) => (
                  <span
                    key={tech}
                    className="px-2 py-1 text-xs bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 rounded"
                  >
                    {tech}
                  </span>
                ))}
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
