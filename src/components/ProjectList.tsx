'use client';

import Link from 'next/link';
import { useState, type ComponentType } from 'react';
import type { Project, ProjectLink } from '@/lib/projects';
import InkSteps from './InkSteps';
import GitaShots from './mocks/GitaShots';
import KiroCliMock from './mocks/KiroCliMock';
import OrbitsMock from './mocks/OrbitsMock';

const MiniHome = () => <InkSteps mini />;

/** Each project's inline demo. LuckyNumber has none: see its detail text instead. */
const MOCKS: Partial<Record<Project['id'], ComponentType>> = {
  'kiro-cli': KiroCliMock,
  'kiro-orbits': OrbitsMock,
  website: MiniHome,
  'gita-swipe': GitaShots,
};

type Listed = Omit<Project, 'posts'> & { posts: { slug: string; title: string }[] };

const Out = ({ link }: { link: ProjectLink }) => (
  <a className="lk" href={link.href} target="_blank" rel="noopener noreferrer">
    {link.label} ↗
  </a>
);

/** The projects as a quiet list: tapping one opens its demo, links, and posts inline. */
export default function ProjectList({ projects, more }: { projects: Listed[]; more: ProjectLink[] }) {
  const [open, setOpen] = useState<string | null>(null);
  return (
    <>
      {projects.map((p) => {
        const isOpen = open === p.id;
        const Mock = MOCKS[p.id];
        return (
          <section key={p.id} className={isOpen ? 'proj open' : 'proj'}>
            <button
              type="button"
              className="ph"
              aria-expanded={isOpen}
              aria-controls={`p-${p.id}`}
              onClick={() => setOpen(isOpen ? null : p.id)}
            >
              <span className="mk" aria-hidden="true">
                {isOpen ? '−' : '+'}
              </span>
              <span className="t">{p.title}</span>
              <span className="d">{p.summary}</span>
            </button>
            <div className="links inline">
              {p.links.map((l) => (
                <Out key={l.href} link={l} />
              ))}
            </div>
            <div className="pbody" id={`p-${p.id}`} hidden={!isOpen}>
              {isOpen && Mock && <Mock />}
              {p.detail && <span>{p.detail}</span>}
              {p.posts.length > 0 && (
                <div className="row">
                  <span className="dim">blog</span>
                  {p.posts.map((post) => (
                    <Link key={post.slug} className="lk" href={`/blog/${post.slug}/`}>
                      {post.title}
                    </Link>
                  ))}
                </div>
              )}
            </div>
          </section>
        );
      })}
      <div className="row more">
        <span className="dim">more</span>
        <span className="inline">
          {more.map((l) => (
            <Out key={l.href} link={l} />
          ))}
        </span>
      </div>
    </>
  );
}
