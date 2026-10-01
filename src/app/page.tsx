import Link from 'next/link';
import IslandWorld from '@/components/island/IslandWorld';
import { projects } from '@/lib/projects';

const PATHS = [
  { href: '/about', label: 'About me', note: 'who I am' },
  { href: '/projects', label: 'Projects', note: 'things I built' },
  { href: '/blog', label: 'Blog', note: 'notes & fixes' },
  { href: '/stats', label: 'Running stats', note: 'miles on Strava' },
];

export default function Home() {
  const recentProjects = projects.slice(0, 3);

  return (
    <div className="home">
      <section className="island-hero" aria-labelledby="home-title">
        <div className="island-intro">
          <p className="island-kicker">A tiny island on the internet</p>
          <h1 id="home-title" className="island-title">
            Hi, I'm Vinay.
          </h1>
          <p className="island-lede">
            I'm a software engineer. I like to build things, bake bread, and play sports. Welcome to my corner of the internet.
          </p>
          <nav aria-label="Explore the site" className="island-paths">
            {PATHS.map((path) => (
              <Link key={path.href} href={path.href} className="island-path">
                <span>{path.label}</span>
                <small>{path.note}</small>
              </Link>
            ))}
          </nav>
        </div>
        <IslandWorld />
      </section>

      <div className="home-content">
        <section className="home-card">
          <p className="text-lg leading-relaxed text-ink-soft">
            I enjoy building things that make a difference. Currently working on exciting projects and always learning something new.
            Feel free to explore my work and get in touch.
          </p>
        </section>

        <section>
          <div className="flex justify-between items-baseline mb-6">
            <h2 className="home-heading">Recent Work</h2>
            <Link href="/projects" className="cozy-link text-sm">
              View all →
            </Link>
          </div>
          <div className="grid gap-5 md:grid-cols-3">
            {recentProjects.map((project) => (
              <article key={project.id} className="cozy-card p-5">
                <h3 className="font-semibold text-ink mb-2">{project.title}</h3>
                <p className="text-ink-soft text-sm mb-3 leading-relaxed">
                  {project.description.length > 200 ? `${project.description.substring(0, 200)}...` : project.description}
                </p>
                <div className="flex flex-wrap gap-2">
                  {project.tech.slice(0, 4).map((tech) => (
                    <span key={tech} className="cozy-tag">
                      {tech}
                    </span>
                  ))}
                </div>
              </article>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}
