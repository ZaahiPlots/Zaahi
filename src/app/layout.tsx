import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "ZAAHI — Future of Real Estate",
  description: "Civilizational infrastructure for real estate",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="bg-black text-white antialiased">{children}</body>
    </html>
  );
}
