import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import { SpeedInsights } from "@vercel/speed-insights/next";
import "./globals.css";

// Inter is the platform's new body typeface (founder spec 2026-05-31
// Phase A). Self-hosted via next/font/google so the same letterforms
// render across macOS / Windows / Linux — the prior system-stack
// fallback gave inconsistent metrics between devices. Georgia stays
// the headings serif (luxury feel preserved). The `tnum` feature is
// enabled so number columns line up without per-callsite styling.
const inter = Inter({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-inter",
});

export const metadata: Metadata = {
  title: "ZAAHI — Real Estate OS",
  description: "Land Intelligence Platform for UAE & Saudi Arabia. Access 100,000+ land plots across Dubai, Abu Dhabi, and Saudi Arabia.",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={inter.variable}>
      <body className="bg-black text-white antialiased">
        {children}
        <SpeedInsights />
      </body>
    </html>
  );
}
