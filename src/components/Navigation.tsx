'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Menu, X } from 'lucide-react';
import { useEffect, useState } from 'react';

const primaryItems = [
  { name: 'Work', href: '/projects' },
  { name: 'Writing', href: '/blog' },
  { name: 'About', href: '/about' },
  { name: 'Running', href: '/stats' },
];

const mobileItems = primaryItems;

function isCurrentPath(pathname: string, href: string) {
  return pathname === href || pathname.startsWith(`${href}/`);
}

function NavLink({
  name,
  href,
  pathname,
  onNavigate,
}: {
  name: string;
  href: string;
  pathname: string;
  onNavigate?: () => void;
}) {
  const active = isCurrentPath(pathname, href);

  return (
    <Link
      href={href}
      className="nav-link"
      aria-current={active ? 'page' : undefined}
      data-active={active}
      onClick={onNavigate}
    >
      {name}
    </Link>
  );
}

export default function Navigation() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  useEffect(() => {
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setOpen(false);
      }
    };

    window.addEventListener('keydown', closeOnEscape);
    return () => window.removeEventListener('keydown', closeOnEscape);
  }, []);

  return (
    <>
      <nav className="desktop-nav" aria-label="Primary navigation">
        {primaryItems.map((item) => (
          <NavLink key={item.href} {...item} pathname={pathname} />
        ))}
        <a className="header-contact" href="mailto:vinayshah2006@gmail.com">
          Email
        </a>
      </nav>

      <button
        type="button"
        className="nav-toggle"
        aria-expanded={open}
        aria-controls="mobile-navigation"
        aria-label={open ? 'Close navigation' : 'Open navigation'}
        title={open ? 'Close navigation' : 'Open navigation'}
        onClick={() => setOpen((current) => !current)}
      >
        {open ? <X size={20} aria-hidden="true" /> : <Menu size={20} aria-hidden="true" />}
      </button>

      <nav
        id="mobile-navigation"
        className="mobile-nav"
        data-open={open}
        aria-label="Mobile navigation"
      >
        <div className="shell mobile-nav-inner">
          {mobileItems.map((item) => (
            <NavLink
              key={item.href}
              {...item}
              pathname={pathname}
              onNavigate={() => setOpen(false)}
            />
          ))}
          <a
            className="nav-link mobile-contact"
            href="mailto:vinayshah2006@gmail.com"
            onClick={() => setOpen(false)}
          >
            Email
          </a>
        </div>
      </nav>
    </>
  );
}
