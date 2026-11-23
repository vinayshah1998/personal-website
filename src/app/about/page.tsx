import { pageMeta } from '@/lib/meta';
export const metadata = pageMeta(
  '/about/',
  'about',
  'software engineer building iOS apps, Chrome extensions, and AI agent systems. Off screen: running, hiking and mountaineering, baking bread, video games.',
);

export default function About() {
  return (
    <div className="bd">
      <div className="row">
        <span>software engineer.</span>
      </div>
      <div className="row">
        <span>
          I build across the stack: iOS apps, Chrome extensions, and AI agent systems. Lately, finding ways to fit AI into everyday tools.
        </span>
      </div>
      <div className="row">
        <span className="dim">off screen</span>
        <span>running, hiking and mountaineering, baking bread, video games.</span>
      </div>
      <div className="row">
        <span className="dim">elsewhere</span>
        <span className="inline">
          <a className="lk" href="mailto:vinayshah2006@gmail.com">email</a>
          <a className="lk" href="https://github.com/vinayshah1998" target="_blank" rel="noopener noreferrer">github</a>
          <a className="lk" href="https://linkedin.com/in/vinay-s-shah" target="_blank" rel="noopener noreferrer">linkedin</a>
        </span>
      </div>
    </div>
  );
}
