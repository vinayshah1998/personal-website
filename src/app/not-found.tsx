import Link from 'next/link';
import { ArrowRight, FileQuestion } from 'lucide-react';

export default function NotFound() {
  return (
    <section className="shell not-found page-section">
      <div className="not-found-mark" aria-hidden="true">
        <FileQuestion size={34} />
        <span className="mono">404</span>
      </div>
      <div>
        <p className="page-kicker">Route not found</p>
        <h1 className="page-heading">This path does not lead to a field note.</h1>
        <p className="lede">
          The page may have moved. The useful routes are still close by.
        </p>
        <div className="not-found-links">
          <Link className="button button-primary" href="/projects">
            Selected work
            <ArrowRight size={16} aria-hidden="true" />
          </Link>
          <Link className="button button-secondary" href="/blog">Writing</Link>
          <a className="button button-secondary" href="mailto:vinayshah2006@gmail.com">
            Contact
          </a>
        </div>
      </div>
    </section>
  );
}
