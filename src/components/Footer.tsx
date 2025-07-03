const Footer = () => {
  return (
    <footer className="mt-16 py-8 border-t border-gray-200 dark:border-gray-800">
      <div className="max-w-2xl mx-auto px-6">
        <p className="text-sm text-gray-600 dark:text-gray-400 text-center">
          © {new Date().getFullYear()} Vinay Shah. All rights reserved.
        </p>
      </div>
    </footer>
  )
}

export default Footer