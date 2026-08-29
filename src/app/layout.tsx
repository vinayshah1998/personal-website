import type { Metadata } from "next";
import { Inter } from "next/font/google";
import Link from "next/link";
import "./globals.css";
import Navigation from "@/components/Navigation";
import Footer from "@/components/Footer";
import SolarSystem from "@/components/SolarSystem";
import PlanetHud from "@/components/PlanetHud";
import { SpeedInsights } from "@vercel/speed-insights/next";
import { Analytics } from "@vercel/analytics/next";

const inter = Inter({
  subsets: ["latin"],
  display: "swap",
});

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

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`dark ${inter.className}`}>
      <body className="antialiased text-white">
        <SolarSystem />
        <PlanetHud />
        <div className="relative z-10 min-h-screen flex flex-col">
          <header className="sticky top-0 z-20 border-b border-white/10 bg-[#04060d]/70 backdrop-blur-xl">
            <div className="max-w-4xl mx-auto px-6 py-4 flex justify-between items-center gap-4">
              <Link href="/" className="group">
                <h1 className="text-lg font-semibold whitespace-nowrap text-white/90 transition-colors group-hover:text-white">
                  Vinay Shah
                </h1>
              </Link>
              <Navigation />
            </div>
          </header>
          <main className="flex-1 px-4 md:px-6">
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
