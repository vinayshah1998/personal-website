import type { Metadata, Viewport } from "next";
import localFont from "next/font/local";
import "./globals.css";
import Ink from "@/components/Ink";
import { KEYFRAMES, PALETTE_JS } from "@/lib/ink";
import { SpeedInsights } from "@vercel/speed-insights/next";
import { Analytics } from "@vercel/analytics/next";

// Departure Mono, OFL licensed (see src/fonts/DepartureMono-LICENSE.txt), self-hosted and preloaded.
const departureMono = localFont({
  src: "../fonts/DepartureMono-Regular.woff2",
  variable: "--font-dm",
  display: "block",
  preload: true,
});

// Before first paint: the ground and text colors for the visitor's local time, and (unless they reduce motion)
// hide the text that is about to decode in. The class is removed when decoding starts, or after 3s regardless.
const themeScript = `(function(){try{var d=new Date(),r=document.documentElement,p=(${PALETTE_JS})(d.getHours()+d.getMinutes()/60,${JSON.stringify(KEYFRAMES)});
r.style.setProperty('--bg',p[0]);r.style.setProperty('--fg',p[1]);
if(!matchMedia('(prefers-reduced-motion: reduce)').matches){r.classList.add('scr-wait');setTimeout(function(){r.classList.remove('scr-wait')},3000)}}catch(e){}})()`;

export const metadata: Metadata = {
  title: "Vinay Shah's Website",
  description: "Personal website and portfolio",
  keywords: ["developer", "portfolio", "projects", "web development"],
  authors: [{ name: "Vinay Shah" }],
  creator: "Vinay Shah",
  openGraph: {
    type: "website",
    locale: "en_US",
    url: "https://vinayshah.dev",
    title: "Vinay Shah - Personal Website",
    description: "Personal website and portfolio",
    siteName: "Vinay Shah",
  },
  twitter: {
    card: "summary_large_image",
    title: "Vinay Shah - Personal Website",
    description: "Personal website and portfolio",
    creator: "@vinayshah1998",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={departureMono.variable} suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      <body>
        <Ink />
        <main data-scr>{children}</main>
        <Analytics />
      </body>
      <SpeedInsights />
    </html>
  );
}
