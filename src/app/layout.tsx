import type { Metadata } from "next";
import "./globals.css";
import CookieConsent from "@/components/CookieConsent";

export const metadata: Metadata = {
  title: "ZAAHI — Real Estate OS",
  description: "Land Intelligence Platform for UAE & Saudi Arabia. Access 100,000+ land plots across Dubai, Abu Dhabi, and Saudi Arabia.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="bg-black text-white antialiased">
        {children}
        <CookieConsent />
      </body>
    </html>
  );
}
