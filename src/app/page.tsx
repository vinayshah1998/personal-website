export default function Home() {
  return (
    <div className="max-w-2xl mx-auto px-6 py-16">
      <section className="mb-16">
        <h1 className="text-4xl font-bold mb-4 text-gray-900 dark:text-gray-100">
          Hi, I'm Vinay.
        </h1>
        <p className="text-xl text-gray-600 dark:text-gray-400 mb-6 leading-relaxed">
          I'm a software engineer. I like to build things, bake bread, and play sports. 
          Welcome to my corner of the internet.
        </p>
        <p className="text-gray-600 dark:text-gray-400 leading-relaxed">
          I enjoy building things that make a difference. Currently working on 
          exciting projects and always learning something new. 
          Feel free to explore my work and get in touch.
        </p>
      </section>

      <section>
        <h2 className="text-2xl font-semibold mb-6 text-gray-900 dark:text-gray-100">
          Recent Work
        </h2>
        <div className="space-y-6">
          <div className="border-l-2 border-gray-200 dark:border-gray-700 pl-4">
            <h3 className="font-medium text-gray-900 dark:text-gray-100 mb-2">
              Project One
            </h3>
            <p className="text-gray-600 dark:text-gray-400 text-sm">
              Brief description of your most recent or important project.
            </p>
          </div>
          <div className="border-l-2 border-gray-200 dark:border-gray-700 pl-4">
            <h3 className="font-medium text-gray-900 dark:text-gray-100 mb-2">
              Project Two
            </h3>
            <p className="text-gray-600 dark:text-gray-400 text-sm">
              Another project that showcases your skills and interests.
            </p>
          </div>
        </div>
      </section>
    </div>
  );
}
