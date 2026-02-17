import type { Metadata } from "next";
import { Analytics } from "@vercel/analytics/react";
import "./globals.css";
import { Header } from "@/components/Header";
import { Providers } from "@/components/Providers";

export const metadata: Metadata = {
  title: "On Prediction",
  description: "Prediction market reading list for builders & researchers",
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
        <Analytics />
      </body>
    </html>
  );
}
