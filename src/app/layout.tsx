import type { Metadata, Viewport } from "next";
import { SpeedInsights } from "@vercel/speed-insights/next";
import "./globals.css";

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
    <html lang="en">
      <body className="bg-black text-white antialiased">
        {children}
        <SpeedInsights />
      </body>
    </html>
  );
}
