export interface Project {
  id: number;
  title: string;
  description: string;
  tech: string[];
  link: string;
  demo: string | null;
}

export const projects: Project[] = [
  {
    id: 1,
    title: "LLM Time Blocker",
    description: "A Chrome extension that blocks distracting websites and requires users to convince an AI gatekeeper for temporary access. When navigating to a blocked site, users are redirected to a chat interface where they must persuade a Claude-powered LLM to grant a 30-minute access window. Built with a Node.js/Express backend featuring JWT authentication, Stripe subscriptions, and PostgreSQL for persistence.",
    tech: ["TypeScript", "Chrome Extension", "Node.js", "Express", "PostgreSQL", "Prisma", "Claude API"],
    link: "https://github.com/vinayshah1998/llm_time_blocker",
    demo: null
  },
  {
    id: 2,
    title: "Locus Hackathon",
    description: "An AI-powered payment negotiation system where personalized Claude agents negotiate and handle payments on behalf of users. Agents can seek payments owed to their user or pay debts, each with configurable negotiation personalities. Features a centralized credit-checking API for assessing agent reliability and implements the x402 machine-readable payment protocol for agent-to-agent transactions.",
    tech: ["Python", "Claude Agent SDK", "Locus", "x402 Protocol"],
    link: "https://github.com/vinayshah1998/locus_hackathon",
    demo: null
  },
  {
    id: 3,
    title: "LuckyNumber",
    description: "A privacy-focused iOS app that randomly selects contacts and initiates phone calls with a \"lucky number\" twist. Features multiple selection algorithms including random, weighted-by-frequency, and recency-based strategies. Optimized for 2000+ contacts with background processing and lazy loading, reducing startup time from 3 seconds to under 100ms. Fully supports iOS 18's limited contacts access feature.",
    tech: ["Swift", "SwiftUI", "iOS 18", "MVVM", "Async/Await", "Contacts Framework"],
    link: "https://github.com/vinayshah1998/LuckyNumber",
    demo: null
  }
];
