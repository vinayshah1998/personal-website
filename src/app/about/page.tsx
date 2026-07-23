import type { Metadata } from 'next';
import Link from 'next/link';
import { ArrowRight, ArrowUpRight } from 'lucide-react';

export const metadata: Metadata = {
  title: 'About',
  description:
    'How Vinay Shah approaches product engineering, system constraints, and the work outside the editor.',
  alternates: {
    canonical: '/about',
  },
};

const principles = [
  {
    title: 'Instrument before guessing.',
    body:
      'The fastest route through a confusing production failure is usually a better signal, not a stronger opinion. My debugging notes start with the evidence path.',
  },
  {
    title: 'Make the product rule explicit.',
    body:
      'Whether it is a 30-minute access window or limited contacts permission, clear constraints make both the interface and the architecture easier to trust.',
  },
  {
    title: 'Measure the before and after.',
    body:
      'LuckyNumber became meaningfully better when launch performance moved from a vague complaint to a measurable 3 seconds, then under 100ms.',
  },
];

const capabilities = [
  {
    title: 'Product surfaces',
    body: 'SwiftUI, React, Next.js, Chrome extensions, and the interaction details around state.',
  },
  {
    title: 'Service systems',
    body: 'TypeScript, Node.js, Express, Python, PostgreSQL, authentication, billing, and APIs.',
  },
  {
    title: 'AI workflows',
    body: 'Claude-backed product behavior, personal agents, tool boundaries, and observable decisions.',
  },
];

export default function AboutPage() {
  return (
    <>
      <header className="shell about-hero page-section">
        <div className="about-hero-copy">
          <p className="page-kicker">About</p>
          <h1 className="page-heading">I like understanding the whole product.</h1>
          <p className="lede">
            I am a software engineer drawn to work where the quality of the
            interface depends on understanding the system underneath it.
          </p>
        </div>
      </header>

      <section className="about-intro">
        <div className="shell about-intro-grid">
          <p className="eyebrow">Practice</p>
          <div>
            <h2 className="section-heading">Different platforms, similar questions.</h2>
            <p className="lede">
              What behavior should change? What constraint actually matters?
              What evidence will tell us the result is better? Those questions
              have taken me from browser extensions to payment agents and iOS.
            </p>
            <Link className="text-link" href="/projects">
              View selected work
              <ArrowRight size={16} aria-hidden="true" />
            </Link>
          </div>
        </div>
      </section>

      <section className="shell about-principles page-section">
        <div className="section-intro">
          <div>
            <p className="eyebrow">Principles</p>
            <h2 className="section-heading">How I approach ambiguous work.</h2>
          </div>
        </div>
        <div className="principle-list">
          {principles.map((principle) => (
            <article key={principle.title}>
              <h3 className="subheading">{principle.title}</h3>
              <p>{principle.body}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="capability-band">
        <div className="shell">
          <p className="eyebrow">What I work with</p>
          <div className="capability-grid">
            {capabilities.map((capability) => (
              <article key={capability.title}>
                <h2 className="subheading">{capability.title}</h2>
                <p>{capability.body}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="shell about-contact page-section">
        <div>
          <p className="eyebrow">Outside work</p>
          <h2 className="section-heading">Running, climbing, and baking keep me honest.</h2>
          <p className="lede">
            I like pursuits with clear feedback and no convincing shortcut.
            I am always glad to compare notes on software, products, or a good
            route into the mountains.
          </p>
        </div>
        <div className="about-contact-links">
          <a className="text-link" href="mailto:vinayshah2006@gmail.com">
            Email me
            <ArrowUpRight size={15} aria-hidden="true" />
          </a>
          <a
            className="text-link"
            href="https://github.com/vinayshah1998"
            target="_blank"
            rel="noopener noreferrer"
          >
            GitHub
            <ArrowUpRight size={15} aria-hidden="true" />
            <span className="sr-only">(opens in a new tab)</span>
          </a>
          <a
            className="text-link"
            href="https://linkedin.com/in/vinay-s-shah"
            target="_blank"
            rel="noopener noreferrer"
          >
            LinkedIn
            <ArrowUpRight size={15} aria-hidden="true" />
            <span className="sr-only">(opens in a new tab)</span>
          </a>
        </div>
      </section>
    </>
  );
}
