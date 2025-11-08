import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import Navigation from "@/components/Navigation";
import Footer from "@/components/Footer";
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
    <html lang="en" className={inter.className}>
      <body className="antialiased bg-white text-gray-900 dark:bg-gray-900 dark:text-gray-100">
        <div className="min-h-screen flex flex-col">
          <header className="py-6 border-b border-gray-200 dark:border-gray-800">
            <div className="max-w-4xl mx-auto px-6 flex justify-between items-center">
              <h1 className="text-lg font-semibold">Vinay Shah</h1>
              <Navigation />
            </div>
          </header>
          <main className="flex-1">
            {children}
          </main>
          <Footer />
        </div>
        <Analytics />
      </body>
      <SpeedInsights />
    </html>
  );
}
