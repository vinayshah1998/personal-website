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
    { name: 'Foolish Enterprises', href: '/foolish-enterprises' },
  ]

  return (
    <nav aria-label="Main" className="flex flex-wrap items-center gap-x-3 gap-y-0 sm:gap-x-4 md:gap-8">
      {navItems.map((item) => {
        const isActive = pathname === item.href || pathname?.startsWith(item.href + '/')

        return (
          <Link
            key={item.name}
            href={item.href}
            aria-current={isActive ? 'page' : undefined}
            className={`inline-flex min-h-11 items-center whitespace-nowrap md:min-h-0 text-sm transition-colors hover:text-forest ${
              isActive ? 'text-ink font-semibold underline decoration-saffron decoration-2 underline-offset-8' : 'text-ink-soft'
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