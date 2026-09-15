import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { Analytics } from "@vercel/analytics/next";
import { SpeedInsights } from "@vercel/speed-insights/next";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "CleanFlow - Clean Your CSV Data",
  description:
    "Clean, analyze, and improve your CSV spreadsheets instantly. CleanFlow helps you remove duplicates, fix messy data, and improve data quality directly in your browser.",
  applicationName: "CleanFlow",
  keywords: [
    "CSV cleaner",
    "CSV cleaning",
    "data cleaning",
    "spreadsheet cleaner",
    "CSV analyzer",
    "duplicate remover",
    "data quality",
    "spreadsheet data cleaning",
  ],
  icons: {
    icon: "/cleanflow-favicon.png",
    shortcut: "/cleanflow-favicon.png",
    apple: "/cleanflow-favicon.png",
  },
  openGraph: {
    title: "CleanFlow - Clean Your CSV Data",
    description:
      "Clean, analyze, and improve your CSV files in seconds.",
    siteName: "CleanFlow",
    type: "website",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        {children}
        <Analytics />
        <SpeedInsights />
      </body>
    </html>
  );
}

