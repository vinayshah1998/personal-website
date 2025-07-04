'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'

const Navigation = () => {
  const pathname = usePathname()

  const navItems = [
    { name: 'Home', href: '/' },
    { name: 'About', href: '/about' },
    { name: 'Projects', href: '/projects' },
    { name: 'Stats', href: '/stats' },
  ]

  return (
    <nav className="flex items-center gap-8">
      {navItems.map((item) => (
        <Link
          key={item.name}
          href={item.href}
          className={`text-sm transition-colors hover:text-gray-900 dark:hover:text-gray-100 ${
            pathname === item.href
              ? 'text-gray-900 dark:text-gray-100'
              : 'text-gray-600 dark:text-gray-400'
          }`}
        >
          {item.name}
        </Link>
      ))}
    </nav>
  )
}

export default Navigation