import type { Metadata } from 'next';
import Link from 'next/link';
import { ArrowRight, ExternalLink, ShieldCheck } from 'lucide-react';
import ProjectVisual from '@/components/ProjectVisual';

export const metadata: Metadata = {
  title: 'Foolish Enterprises',
  description:
    'The independent product label behind Vinay Shah\'s small, useful software experiments.',
  alternates: {
    canonical: '/foolish-enterprises',
  },
};

export default function FoolishEnterprisesPage() {
  return (
    <>
      <header className="studio-hero">
        <div className="shell studio-hero-grid">
          <div className="studio-hero-copy reveal">
            <p className="page-kicker">Independent product label</p>
            <h1 className="page-heading">Foolish Enterprises</h1>
            <p className="studio-thesis">
              Small software products built around behavior worth changing.
            </p>
            <p className="lede">
              This is the label I use for independent product work: focused
              experiments that begin with a real irritation and earn their way
              into a reliable tool.
            </p>
            <div className="hero-actions">
              <Link className="button button-primary" href="/projects/llm-time-blocker">
                View the current product
                <ArrowRight size={16} aria-hidden="true" />
              </Link>
              <a className="button button-secondary" href="mailto:vinayshah2006@gmail.com">
                Product inquiries
              </a>
            </div>
          </div>
          <ProjectVisual
            kind="gate"
            label="LLM Time Blocker system diagram, the current Foolish Enterprises product"
          />
        </div>
      </header>

      <section className="shell studio-product page-section">
        <div className="studio-product-heading">
          <p className="eyebrow">Current build / LLM Time Blocker</p>
          <h2 className="section-heading">A website blocker that asks for a reason, not a bypass click.</h2>
        </div>
        <div className="studio-product-grid">
          <article>
            <span className="mono">01</span>
            <h3 className="subheading">Useful friction</h3>
            <p>
              A conversational gate makes the exception intentional while still
              allowing legitimate, time-sensitive access.
            </p>
          </article>
          <article>
            <span className="mono">02</span>
            <h3 className="subheading">Product infrastructure</h3>
            <p>
              The extension connects to authentication, policy, persistence,
              subscriptions, and an LLM-backed decision path.
            </p>
          </article>
          <article>
            <span className="mono">03</span>
            <h3 className="subheading">Trust documented</h3>
            <p>
              The product privacy policy names local data, server data,
              third-party processors, and retention behavior directly.
            </p>
          </article>
        </div>
        <div className="studio-product-actions">
          <Link className="text-link" href="/projects/llm-time-blocker">
            Read the case study
            <ArrowRight size={16} aria-hidden="true" />
          </Link>
          <Link className="text-link" href="/foolish-enterprises/llm-time-blocker/privacy-policy">
            <ShieldCheck size={16} aria-hidden="true" />
            Privacy policy
          </Link>
          <a
            className="text-link"
            href="https://github.com/vinayshah1998/llm_time_blocker"
            target="_blank"
            rel="noopener noreferrer"
          >
            Public repository
            <ExternalLink size={15} aria-hidden="true" />
            <span className="sr-only">(opens in a new tab)</span>
          </a>
        </div>
      </section>

      <section className="studio-principle">
        <div className="shell studio-principle-inner">
          <p className="eyebrow">The name is a reminder</p>
          <blockquote>
            Start with the slightly foolish version of the idea. Then do the
            disciplined work required to find out whether it is useful.
          </blockquote>
        </div>
      </section>
    </>
  );
}
