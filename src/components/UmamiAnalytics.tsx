"use client";
import Script from "next/script";

export function UmamiAnalytics() {
  return (
    <Script
      defer
      src="/u/script.js"
      data-website-id={process.env.NEXT_PUBLIC_UMAMI_WEBSITE_ID}
      strategy="afterInteractive"
    />
  );
}
