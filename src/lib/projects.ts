export interface ProjectLink {
  label: string;
  href: string;
}

export interface Project {
  id: 'kiro-cli' | 'kiro-orbits' | 'website' | 'luckynumber' | 'gita-swipe';
  title: string;
  /** One line under the title. */
  summary: string;
  /** Shown when the project is open, for projects without a mock. */
  detail?: string;
  /** The project's site and repo. Private repos say so in their label and still link. */
  links: ProjectLink[];
  /** Slugs of posts about it, in src/app/blog/posts/. */
  posts: string[];
}

const gh = (repo: string, priv = false): ProjectLink => ({
  label: priv ? 'github (private)' : 'github',
  href: `https://github.com/vinayshah1998/${repo}`,
});

export const projects: Project[] = [
  {
    id: 'kiro-cli',
    title: 'kiro-cli',
    summary: 'The terminal agent I work on at Kiro: chat, tools, and approvals in a fast terminal UI, held to strict checks in CI.',
    links: [{ label: 'kiro.dev/cli', href: 'https://kiro.dev/cli' }],
    posts: [
      'ci-fast-enough-to-trust',
      'logins-that-work-everywhere',
      'chunk-that-disappeared',
      'when-the-model-says-no',
      'one-notch-one-line',
      'counting-frames',
      'one-way-back',
      'silent-refusals-lost-bytes',
      '60-second-ghost',
      'where-did-my-context-go',
      'readable-errors',
      'best-fix-was-deleting-it',
    ],
  },
  {
    id: 'kiro-orbits',
    title: 'kiro orbits',
    summary:
      'Durable Kiro agent threads. Start a task in the terminal, steer and approve it from the browser; the runner owns the agent, so closing either one keeps it going.',
    links: [gh('kiro-orbits', true)],
    posts: ['polish-you-can-test', 'who-gets-to-say-yes', 'terminal-feel-like-an-app'],
  },
  {
    id: 'website',
    title: 'this website',
    summary: 'An ASCII ink field you paint with the cursor, colored by your local time of day. Next.js, canvas, Departure Mono.',
    links: [gh('personal-website')],
    posts: ['homepage-you-can-paint-on'],
  },
  {
    id: 'luckynumber',
    title: 'luckynumber',
    summary: 'A privacy-focused iOS app that rolls a random contact to call, so you stay in touch.',
    detail:
      'Roll picks someone from your contacts and shows their name and number; Call rings them, and recent picks stay in a short history. SwiftUI with Liquid Glass, and it works with iOS limited contacts access. Startup went from 3 seconds to under 100 ms with 2,000+ contacts.',
    links: [gh('LuckyNumber', true)],
    posts: [],
  },
  {
    id: 'gita-swipe',
    title: 'gita swipe',
    summary:
      "Scroll the Gita instead of doom-scrolling. All 700 verses, one per page, in Sanskrit, transliteration, and Annie Besant's English, with a journal and a daily streak.",
    links: [gh('gita-swipe', true)],
    posts: ['scroll-the-gita'],
  },
];

/** Smaller public repos, on the "more" line. */
export const more: ProjectLink[] = [
  'pstack-agent-plugin',
  'opencode-provider-kiro',
  'pi-provider-kiro',
  'rust-harness-lab',
  'llm_time_blocker',
  'locus_hackathon',
].map((repo) => ({ label: repo, href: `https://github.com/vinayshah1998/${repo}` }));
