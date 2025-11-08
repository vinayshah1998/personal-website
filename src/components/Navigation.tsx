'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'

const Navigation = () => {
  const pathname = usePathname()

  const navItems = [
    { name: 'About', href: '/about' },
    { name: 'Projects', href: '/projects' },
    { name: 'Blog', href: '/blog' },
    { name: 'Stats', href: '/stats' },
  ]

  return (
    <nav className="flex items-center gap-4 md:gap-8">
      {navItems.map((item) => {
        const isActive = pathname === item.href || pathname?.startsWith(item.href + '/')

        return (
          <Link
            key={item.name}
            href={item.href}
            className={`text-sm transition-colors hover:text-gray-900 dark:hover:text-gray-100 ${
              isActive
                ? 'text-gray-900 dark:text-gray-100'
                : 'text-gray-600 dark:text-gray-400'
            }`}
          >
            {item.name}
          </Link>
        )
      })}
    </nav>
  )
}

export default Navigation