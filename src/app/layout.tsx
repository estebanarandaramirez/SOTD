import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "SOTD – Song of the Day",
  description: "Share one song a day with the people you care about.",
  openGraph: {
    title: "SOTD – Song of the Day",
    description: "Share one song a day with the people you care about.",
    type: "website",
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="dark">
      <body className={inter.className}>{children}</body>
    </html>
  );
}
