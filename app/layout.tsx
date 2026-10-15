import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { TooltipProvider } from "@/components/ui/tooltip";
import { LeagueProvider } from "@/components/league-provider";
import { SiteHeader } from "@/components/site-header";
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
  title: "Courtbook",
  description:
    "Fantasy basketball rankings, trades, waivers, and scouting from last-season rates.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} dark h-full antialiased`}
    >
      <body className="min-h-full bg-background text-foreground">
        <TooltipProvider>
          <LeagueProvider>
            <SiteHeader />
            <main className="mx-auto w-full max-w-7xl px-4 py-6">{children}</main>
          </LeagueProvider>
        </TooltipProvider>
      </body>
    </html>
  );
}
