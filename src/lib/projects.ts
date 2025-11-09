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
    title: "LuckyNumber",
    description: "A privacy-focused iOS app that randomly selects contacts and initiates phone calls with a \"lucky number\" twist. Built to explore iOS contacts permissions and SwiftUI's reactive architecture, the app features multiple selection algorithms including random, weighted-by-frequency, and recency-based strategies. Tackled significant performance challenges when handling 2000+ contacts by implementing background processing and lazy loading, reducing startup time from 3 seconds to under 100ms. The app fully supports iOS 18's new limited contacts access feature, respecting user privacy choices while maintaining full functionality with as few as 1-3 selected contacts.",
    tech: ["Swift", "SwiftUI", "iOS 18", "MVVM", "Async/Await", "Contacts Framework"],
    link: "https://github.com/yourusername/LuckyNumber",
    demo: null
  }
];
