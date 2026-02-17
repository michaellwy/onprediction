import type { Metadata } from "next";
import { Analytics } from "@vercel/analytics/react";
import "./globals.css";
import { Header } from "@/components/Header";
import { Providers } from "@/components/Providers";

export const metadata: Metadata = {
  title: "On Prediction",
  description: "Curated content for builders, investors & researchers",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>
        <Providers>
          <Header />
          {children}
        </Providers>
        <footer className="border-t border-border/50 py-6 text-center text-sm text-muted-foreground/70">
          Built by{" "}
          <a
            href="https://x.com/michael_lwy"
            target="_blank"
            rel="noopener noreferrer"
            className="text-muted-foreground hover:text-foreground transition-colors underline underline-offset-2"
          >
            @michael_lwy
          </a>
          {" "}&mdash; feel free to reach out
        </footer>
        <Analytics />
      </body>
    </html>
  );
}
