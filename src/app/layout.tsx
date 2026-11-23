import type { Metadata, Viewport } from "next";
import localFont from "next/font/local";
import "./globals.css";
import Ink from "@/components/Ink";
import { KEYFRAMES, PALETTE_JS } from "@/lib/ink";
import { pageMeta, SITE } from "@/lib/meta";
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
  metadataBase: new URL("https://vinayshah.dev"),
  title: { default: SITE, template: `%s - ${SITE}` },
  keywords: ["software engineer", "developer", "portfolio", "projects"],
  authors: [{ name: "Vinay Shah" }],
  creator: "Vinay Shah",
  ...pageMeta("/", null),
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
