export default function About() {
  return (
    <div className="max-w-4xl mx-auto px-6 py-16">
      <h1 className="text-4xl font-bold mb-8 text-gray-900 dark:text-gray-100">
        About Me
      </h1>
      
      <div className="prose prose-gray dark:prose-invert max-w-none">
        <p className="text-lg text-gray-600 dark:text-gray-400 mb-6 leading-relaxed">
          I'm a software engineer who loves building across the full stack — from iOS apps
          to Chrome extensions to AI-powered agent systems.
        </p>

        <h2 className="text-2xl font-semibold mb-4 text-gray-900 dark:text-gray-100">
          Background
        </h2>
        <p className="text-gray-600 dark:text-gray-400 mb-6 leading-relaxed">
          I enjoy tackling problems across different platforms and technologies. I've built
          privacy-focused iOS apps like LuckyNumber, explored AI integration with browser
          extensions like LLM Time Blocker, and developed AI agent systems for autonomous
          payment negotiation at hackathons. I'm particularly interested in finding ways to
          integrate AI into everyday tools and workflows.
        </p>
        
        <h2 className="text-2xl font-semibold mb-4 text-gray-900 dark:text-gray-100">
          Skills & Interests
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
          <div>
            <h3 className="font-medium text-gray-900 dark:text-gray-100 mb-3">
              Technical Skills
            </h3>
            <ul className="text-sm text-gray-600 dark:text-gray-400 space-y-1">
              <li>• Swift / SwiftUI</li>
              <li>• TypeScript / JavaScript</li>
              <li>• Python</li>
              <li>• React / Next.js</li>
              <li>• Node.js / Express</li>
              <li>• PostgreSQL / Prisma</li>
            </ul>
          </div>
          <div>
            <h3 className="font-medium text-gray-900 dark:text-gray-100 mb-3">
              Interests
            </h3>
            <ul className="text-sm text-gray-600 dark:text-gray-400 space-y-1">
              <li>• Hiking & Mountaineering</li>
              <li>• Running</li>
              <li>• Sports</li>
              <li>• Baking Bread</li>
              <li>• Video Games</li>
            </ul>
          </div>
        </div>
        
        <h2 className="text-2xl font-semibold mb-4 text-gray-900 dark:text-gray-100">
          Get In Touch
        </h2>
        <p className="text-gray-600 dark:text-gray-400 leading-relaxed">
          I'm always interested in connecting with like-minded people. 
          Feel free to reach out if you'd like to collaborate or just have a chat.
        </p>
        
        <div className="mt-6 flex gap-4">
          <a 
            href="mailto:vinayshah2006@gmail.com" 
            className="text-blue-600 dark:text-blue-400 hover:underline"
          >
            Email
          </a>
          <a 
            href="https://github.com/vinayshah1998" 
            className="text-blue-600 dark:text-blue-400 hover:underline"
            target="_blank" 
            rel="noopener noreferrer"
          >
            GitHub
          </a>
          <a 
            href="https://linkedin.com/in/vinay-s-shah" 
            className="text-blue-600 dark:text-blue-400 hover:underline"
            target="_blank" 
            rel="noopener noreferrer"
          >
            LinkedIn
          </a>
        </div>
      </div>
    </div>
  )
}