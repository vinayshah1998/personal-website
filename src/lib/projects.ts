export type ProjectVisualKind = 'gate' | 'agents' | 'phone';

export interface ProjectStep {
  label: string;
  detail: string;
}

export interface Project {
  id: number;
  slug: string;
  title: string;
  category: string;
  summary: string;
  description: string;
  year: string;
  status: string;
  role: string;
  result: string;
  resultLabel: string;
  problem: string;
  decisions: string[];
  architecture: ProjectStep[];
  tech: string[];
  repo: string | null;
  demo: string | null;
  visual: ProjectVisualKind;
  tone: 'teal' | 'blue' | 'coral';
}

export const projects: Project[] = [
  {
    id: 1,
    slug: 'llm-time-blocker',
    title: 'LLM Time Blocker',
    category: 'Browser extension + AI service',
    summary:
      'A distraction blocker that replaces an easy-to-dismiss warning with a conversational gate.',
    description:
      'When a blocked site is opened, the extension redirects the user to a chat where a Claude-powered gatekeeper evaluates the request and can grant a 30-minute access window.',
    year: '2026',
    status: 'Active product experiment',
    role: 'Independent product and engineering build',
    result:
      'Built the full path from browser interception to an authenticated, time-limited approval window.',
    resultLabel: 'End-to-end product flow',
    problem:
      'Conventional website blockers are binary and easy to disable in a moment of low resolve. The product needed to add useful friction without making legitimate exceptions impossible.',
    decisions: [
      'Use a conversation, not a dismissible modal, so the user has to articulate why access is worth the interruption.',
      'Keep approvals short-lived and explicit with a 30-minute access window.',
      'Separate the browser extension from an authenticated service that can manage policy, subscriptions, and persistence.',
    ],
    architecture: [
      {
        label: 'Intercept',
        detail: 'The extension recognizes a blocked navigation and redirects it.',
      },
      {
        label: 'Evaluate',
        detail: 'A Claude-backed conversation evaluates the user request.',
      },
      {
        label: 'Authorize',
        detail: 'The service issues a scoped approval with a fixed expiry.',
      },
      {
        label: 'Resume',
        detail: 'The extension restores access and enforces the time window.',
      },
    ],
    tech: [
      'TypeScript',
      'Chrome Extension',
      'Node.js',
      'Express',
      'PostgreSQL',
      'Prisma',
      'Claude API',
    ],
    repo: 'https://github.com/vinayshah1998/llm_time_blocker',
    demo: null,
    visual: 'gate',
    tone: 'teal',
  },
  {
    id: 2,
    slug: 'locus-hackathon',
    title: 'Locus Hackathon',
    category: 'Agent-to-agent payments',
    summary:
      'Personalized AI agents that negotiate obligations and settle payments on their users\' behalf.',
    description:
      'Agents can seek money owed to their user or pay a debt, each with configurable negotiation behavior and access to a centralized reliability check.',
    year: '2025',
    status: 'Hackathon prototype',
    role: 'Agent workflow and payment protocol build',
    result:
      'Demonstrated a working negotiation path from agent intent through trust checking to machine-readable payment.',
    resultLabel: 'Working protocol demo',
    problem:
      'Autonomous agents can communicate, but financial negotiation also requires trust, boundaries, and a payment format both sides can verify.',
    decisions: [
      'Give each agent an explicit negotiation posture rather than relying on one generic prompt.',
      'Use a central credit-checking service to make counterparty reliability available before settlement.',
      'Represent payment requests with x402 so the final handoff is machine-readable.',
    ],
    architecture: [
      {
        label: 'Intent',
        detail: 'A user delegates a debt or payment goal to a personal agent.',
      },
      {
        label: 'Negotiate',
        detail: 'Two agents exchange proposals within configured boundaries.',
      },
      {
        label: 'Verify',
        detail: 'The workflow checks reliability before accepting terms.',
      },
      {
        label: 'Settle',
        detail: 'An x402 payment request completes the agreed transaction.',
      },
    ],
    tech: ['Python', 'Claude Agent SDK', 'Locus', 'x402 Protocol'],
    repo: 'https://github.com/vinayshah1998/locus_hackathon',
    demo: null,
    visual: 'agents',
    tone: 'blue',
  },
  {
    id: 3,
    slug: 'lucky-number',
    title: 'LuckyNumber',
    category: 'Privacy-focused iOS app',
    summary:
      'An iOS app that turns staying in touch into a lightweight ritual by selecting a contact to call.',
    description:
      'The app supports random, recency-aware, and frequency-weighted selection while respecting iOS 18 limited contacts access.',
    year: '2025',
    status: 'Private iOS build',
    role: 'Independent iOS product and performance work',
    result:
      'Reduced startup time from 3 seconds to under 100ms with more than 2,000 contacts.',
    resultLabel: '3s to under 100ms',
    problem:
      'Contact-heavy apps can become slow and invasive. The experience needed to stay immediate while working with large address books and modern privacy constraints.',
    decisions: [
      'Offer multiple selection strategies so randomness can still reflect real relationships.',
      'Move expensive contact work off the launch path and load data lazily.',
      'Treat limited contacts access as a first-class state rather than an error.',
    ],
    architecture: [
      {
        label: 'Permission',
        detail: 'The app respects the exact contact scope granted by the user.',
      },
      {
        label: 'Index',
        detail: 'Background work prepares a lightweight contact representation.',
      },
      {
        label: 'Select',
        detail: 'A chosen strategy scores and selects an eligible contact.',
      },
      {
        label: 'Connect',
        detail: 'The result moves directly into a clear call action.',
      },
    ],
    tech: [
      'Swift',
      'SwiftUI',
      'iOS 18',
      'MVVM',
      'Async/Await',
      'Contacts Framework',
    ],
    repo: null,
    demo: null,
    visual: 'phone',
    tone: 'coral',
  },
];

export function getProjectBySlug(slug: string) {
  return projects.find((project) => project.slug === slug);
}
