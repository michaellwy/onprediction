import type { Metadata } from "next";
import { Analytics } from "@vercel/analytics/react";
import "./globals.css";
import { Header } from "@/components/Header";
import { Providers } from "@/components/Providers";
import { JsonLd } from "@/components/JsonLd";
import { siteConfig } from "@/lib/siteConfig";

export const metadata: Metadata = {
  metadataBase: new URL(siteConfig.url),
  title: {
    default: siteConfig.name,
    template: `%s | ${siteConfig.name}`,
  },
  description: siteConfig.description,
  openGraph: {
    siteName: siteConfig.name,
    locale: siteConfig.locale,
    type: "website",
  },
  twitter: {
    card: "summary",
    creator: siteConfig.author.twitter,
  },
  alternates: {
    types: {
      "application/rss+xml": "/feed.xml",
    },
  },
  icons: {
    icon: "/logo-120.png",
    apple: "/logo-120.png",
  },
};

const siteJsonLd = {
  "@context": "https://schema.org",
  "@type": "WebSite",
  name: siteConfig.name,
  url: siteConfig.url,
  description: siteConfig.description,
  publisher: {
    "@type": "Organization",
    name: siteConfig.name,
    url: siteConfig.url,
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>
        <JsonLd data={siteJsonLd} />
        <Providers>
          <Header />
          {children}
        </Providers>
        <Analytics />
      </body>
    </html>
  );
}
