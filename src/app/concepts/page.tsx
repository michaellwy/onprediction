import type { Metadata } from "next";
import { conceptDefinitions } from "@/lib/concepts";
import { siteConfig } from "@/lib/siteConfig";
import { JsonLd } from "@/components/JsonLd";
import { ConceptsContent } from "@/components/ConceptsContent";

const conceptCount = Object.keys(conceptDefinitions).length;

export const metadata: Metadata = {
  title: "Concepts",
  description: `${conceptCount} prediction market concepts across 6 clusters — oracle design, liquidity, information theory, mechanism design, governance, and business.`,
  alternates: {
    canonical: `${siteConfig.url}/concepts`,
  },
  openGraph: {
    title: "Prediction Market Concepts | On Prediction",
    description: `Explore ${conceptCount} prediction market concepts organized into 6 clusters.`,
    url: `${siteConfig.url}/concepts`,
  },
  twitter: {
    title: "Prediction Market Concepts | On Prediction",
    description: `Explore ${conceptCount} prediction market concepts organized into 6 clusters.`,
  },
};

export default function ConceptsPage() {
  const definedTermSetJsonLd = {
    "@context": "https://schema.org",
    "@type": "DefinedTermSet",
    name: "Prediction Market Concepts",
    description: `${conceptCount} key concepts in prediction market theory and practice`,
    hasDefinedTerm: Object.entries(conceptDefinitions)
      .filter(([, def]) => def)
      .map(([name, def]) => ({
        "@type": "DefinedTerm",
        name,
        description: def,
      })),
  };

  return (
    <>
      <JsonLd data={definedTermSetJsonLd} />
      {/* Pre-rendered concept definitions for crawlers */}
      <div className="sr-only" aria-hidden="false">
        <h1>Prediction Market Concepts</h1>
        <p>
          {conceptCount} concepts across 6 clusters: Oracle &amp; Resolution,
          Liquidity &amp; Trading, Information Theory, Mechanism Design,
          Governance &amp; Decisions, Business &amp; Platforms.
        </p>
        <dl>
          {Object.entries(conceptDefinitions)
            .sort(([a], [b]) => a.localeCompare(b))
            .map(([name, def]) => (
              <div key={name}>
                <dt>{name}</dt>
                <dd>{def || "Definition pending."}</dd>
              </div>
            ))}
        </dl>
      </div>
      <ConceptsContent />
    </>
  );
}
