import ProjectList from '@/components/ProjectList';
import { getPostBySlug } from '@/lib/blog';
import { pageMeta } from '@/lib/meta';
import { more, projects } from '@/lib/projects';

export const metadata = pageMeta(
  '/projects/',
  'projects',
  'kiro-cli, Kiro Orbits, this website, LuckyNumber, and Gita Swipe, with a small working demo of each where I could make one.',
);

export default function Projects() {
  const listed = projects.map((p) => ({
    ...p,
    posts: p.posts.map((slug) => ({ slug, title: getPostBySlug(slug)!.title })),
  }));
  return (
    <div className="bd projects">
      <ProjectList projects={listed} more={more} />
    </div>
  );
}
