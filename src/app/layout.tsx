import type { Metadata } from 'next';
import { Instrument_Sans, Newsreader } from 'next/font/google';
import Link from 'next/link';
import { Analytics } from '@vercel/analytics/next';
import { SpeedInsights } from '@vercel/speed-insights/next';
import Navigation from '@/components/Navigation';
import Footer from '@/components/Footer';
import './globals.css';
import './editorial.css';

const sansFont = Instrument_Sans({
  subsets: ['latin'],
  variable: '--font-sans',
  display: 'swap',
});

const serifFont = Newsreader({
  subsets: ['latin'],
  weight: ['400', '500'],
  style: ['normal', 'italic'],
  variable: '--font-serif',
  display: 'swap',
});

export const metadata: Metadata = {
  metadataBase: new URL('https://vinayshah.dev'),
  title: {
    default: 'Vinay Shah | Product-minded software engineer',
    template: '%s | Vinay Shah',
  },
  description:
    'Vinay Shah builds practical AI systems, mobile tools, and reliable product infrastructure.',
  keywords: [
    'Vinay Shah',
    'software engineer',
    'AI agents',
    'iOS',
    'TypeScript',
    'product engineering',
  ],
  authors: [{ name: 'Vinay Shah', url: 'https://vinayshah.dev' }],
  creator: 'Vinay Shah',
  alternates: {
    canonical: '/',
  },
  openGraph: {
    type: 'website',
    locale: 'en_US',
    url: '/',
    title: 'Vinay Shah | Product-minded software engineer',
    description:
      'Practical AI systems, mobile tools, and reliable product infrastructure.',
    siteName: 'Vinay Shah',
    images: [
      {
        url: '/opengraph-image',
        width: 1200,
        height: 630,
        alt: 'Vinay Shah - product-minded software engineer',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Vinay Shah | Product-minded software engineer',
    description:
      'Practical AI systems, mobile tools, and reliable product infrastructure.',
    images: ['/opengraph-image'],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${sansFont.variable} ${serifFont.variable}`}
    >
      <body>
        <a className="skip-link" href="#main-content">
          Skip to content
        </a>
        <div className="site-frame">
          <header className="site-header">
            <div className="shell site-header-inner">
              <Link href="/" className="site-brand" aria-label="Vinay Shah, home">
                <span className="site-brand-name">Vinay Shah</span>
              </Link>
              <Navigation />
            </div>
          </header>
          <main id="main-content" className="site-main">
            {children}
          </main>
          <Footer />
        </div>
        <Analytics />
        <SpeedInsights />
      </body>
    </html>
  );
}
