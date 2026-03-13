import type { Metadata } from "next";
import "./globals.css";
import { Providers } from "./providers";
import Navbar from "@/components/layout/navbar";

export const metadata: Metadata = {
  title: "QuoteFast – Instant Home Repair Estimates",
  description:
    "Upload a photo, get an AI-powered price estimate in seconds, then book a local contractor. Stop waiting for quotes.",
  keywords: "home repair estimate, contractor quote, drywall repair, plumbing, electrical, handyman",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="antialiased bg-slate-50 font-sans">
        <Providers>
          <Navbar />
          <main>{children}</main>
        </Providers>
      </body>
    </html>
  );
}
