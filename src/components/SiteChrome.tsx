'use client';

import { useChromeHidden } from './SolarSystemContext';

/**
 * Wraps the site's header, content and footer so the orrery can take over the
 * viewport. Hidden chrome is faded out, made inert to the pointer, and removed
 * from the accessibility tree.
 */
export default function SiteChrome({ children }: { children: React.ReactNode }) {
  const hidden = useChromeHidden();

  return (
    <div
      aria-hidden={hidden}
      className={`relative z-10 flex min-h-screen flex-col transition-opacity duration-500 ${
        hidden ? 'pointer-events-none opacity-0' : 'opacity-100'
      }`}
    >
      {children}
    </div>
  );
}
