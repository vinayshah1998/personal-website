'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { planets } from '@/lib/solar-system'

const navItems = [
  { name: 'About', href: '/about' },
  { name: 'Projects', href: '/projects' },
  { name: 'Blog', href: '/blog' },
  { name: 'Stats', href: '/stats' },
  { name: 'Foolish', href: '/foolish-enterprises' },
]

/** Route -> planet name, so each link can say where it will take you. */
const planetNameFor = (href: string) => planets.find((p) => p.path === href)?.name

const Navigation = () => {
  const pathname = usePathname()

  return (
    <nav className="flex items-center gap-3 md:gap-6 overflow-x-auto">
      {navItems.map((item) => {
        const isActive = pathname === item.href || pathname?.startsWith(item.href + '/')
        const planetName = planetNameFor(item.href)

        return (
          <Link
            key={item.name}
            href={item.href}
            title={planetName ? `${item.name} — ${planetName}` : item.name}
            className={`group relative whitespace-nowrap text-sm transition-colors ${
              isActive ? 'text-white' : 'text-white/55 hover:text-white/90'
            }`}
          >
            {item.name}
            {planetName && (
              <span className="ml-1.5 hidden text-[0.6rem] uppercase tracking-widest text-white/30 transition-colors group-hover:text-white/50 lg:inline">
                {planetName}
              </span>
            )}
            <span
              className={`absolute -bottom-1.5 left-0 h-px bg-white/70 transition-all duration-300 ${
                isActive ? 'w-full' : 'w-0 group-hover:w-full'
              }`}
            />
          </Link>
        )
      })}
    </nav>
  )
}

export default Navigation
