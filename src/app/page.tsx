import Link from 'next/link';
import { projects } from '@/lib/projects';
import { planets } from '@/lib/solar-system';

export default function Home() {
  const recentProjects = projects.slice(0, 3);
  // Everything except Earth, which is the page you are already standing on.
  const destinations = planets.filter((planet) => planet.path !== '/');

  return (
    <div className="mx-auto max-w-4xl px-6 pb-16 pt-20 md:pt-28">
      <section className="mb-20 max-w-2xl">
        <p className="mb-4 text-[0.7rem] uppercase tracking-[0.28em] text-white/40">
          Earth · 1 AU · you are here
        </p>
        <h1 className="mb-5 text-5xl font-bold leading-tight text-white md:text-6xl">
          Hi, I&apos;m Vinay.
        </h1>
        <p className="mb-6 text-xl leading-relaxed text-white/70">
          I&apos;m a software engineer. I like to build things, bake bread, and play sports.
          Welcome to my corner of the internet.
        </p>
        <p className="leading-relaxed text-white/55">
          I enjoy building things that make a difference. Currently working on exciting
          projects and always learning something new. Every section of this site is a
          different planet — pick one and I&apos;ll fly you there.
        </p>
      </section>

      <section className="mb-20">
        <h2 className="mb-6 text-[0.7rem] uppercase tracking-[0.28em] text-white/40">
          Destinations
        </h2>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          {destinations.map((planet) => (
            <Link
              key={planet.id}
              href={planet.path}
              className="panel-soft group flex items-baseline justify-between gap-4 px-5 py-4 transition-colors hover:border-white/20 hover:bg-white/[0.07]"
            >
              <span className="text-sm text-white/85 transition-colors group-hover:text-white">
                {planet.tagline.split(' — ')[0]}
              </span>
              <span className="text-[0.65rem] uppercase tracking-[0.18em] text-white/35 transition-colors group-hover:text-white/60">
                {planet.name}
              </span>
            </Link>
          ))}
        </div>
      </section>

      <section className="panel p-6 md:p-8">
        <div className="mb-6 flex items-center justify-between">
          <h2 className="text-2xl font-semibold text-white">Recent Work</h2>
          <Link
            href="/projects"
            className="text-sm text-blue-300 transition-colors hover:text-blue-200"
          >
            View all →
          </Link>
        </div>
        <div className="space-y-6">
          {recentProjects.map((project) => (
            <div key={project.id} className="border-l-2 border-white/15 pl-4">
              <h3 className="mb-2 font-medium text-white/90">{project.title}</h3>
              <p className="mb-3 text-sm text-white/55">
                {project.description.length > 200
                  ? `${project.description.substring(0, 200)}...`
                  : project.description}
              </p>
              <div className="flex flex-wrap gap-2">
                {project.tech.slice(0, 4).map((tech) => (
                  <span
                    key={tech}
                    className="rounded bg-white/10 px-2 py-1 text-xs text-white/70"
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
