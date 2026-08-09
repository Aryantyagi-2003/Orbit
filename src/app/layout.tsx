import type { Metadata } from "next";
import { Newsreader, IBM_Plex_Sans, IBM_Plex_Mono } from "next/font/google";
import "./globals.css";
import { cn } from "@/lib/utils";

// Serif — page titles and monetary figures, the "typeset ledger" register.
const newsreader = Newsreader({
  subsets: ["latin"],
  variable: "--font-serif",
  style: ["normal", "italic"],
  weight: ["400", "500", "600"],
});

// Sans — UI chrome: labels, buttons, body copy.
const plexSans = IBM_Plex_Sans({
  subsets: ["latin"],
  variable: "--font-sans",
  weight: ["400", "500", "600"],
});

// Mono — dates, IDs, audit-log entries; anything record-like.
const plexMono = IBM_Plex_Mono({
  subsets: ["latin"],
  variable: "--font-mono",
  weight: ["400", "500"],
});

export const metadata: Metadata = {
  title: "Orbit — Team Expense & Budget Tracker",
  description:
    "Track team spend, manage budgets, and keep an auditable record of every change.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={cn(
        newsreader.variable,
        plexSans.variable,
        plexMono.variable,
      )}
    >
      <body className="font-sans antialiased">{children}</body>
    </html>
  );
}
