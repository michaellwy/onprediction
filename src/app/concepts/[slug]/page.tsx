import type { Metadata } from "next";
import {
  getAllConceptSlugs,
  slugToConceptName,
  conceptNameToSlug,
  getConceptPageData,
  conceptDefinitions,
  clusterMeta,
  getConceptCluster,
} from "@/lib/concepts";
import { siteConfig } from "@/lib/siteConfig";
import { JsonLd } from "@/components/JsonLd";
import { ConceptPageContent } from "./ConceptPageContent";
import { notFound } from "next/navigation";

export function generateStaticParams() {
  return getAllConceptSlugs().map((slug) => ({ slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const conceptName = slugToConceptName(slug);
  if (!conceptName) return { title: "Concept Not Found" };

  const definition = conceptDefinitions[conceptName] || "";
  const cluster = getConceptCluster(conceptName);
  const clusterLabel = clusterMeta[cluster].label;
  const description = definition
    ? `${conceptName} — ${definition}`
    : `Learn about ${conceptName} in prediction markets. Part of the ${clusterLabel} cluster.`;

  return {
    title: conceptName,
    description,
    alternates: {
      canonical: `${siteConfig.url}/concepts/${slug}`,
    },
    openGraph: {
      title: `${conceptName} | ${siteConfig.name}`,
      description,
      url: `${siteConfig.url}/concepts/${slug}`,
    },
    twitter: {
      title: `${conceptName} | ${siteConfig.name}`,
      description,
    },
  };
}

export default async function ConceptPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const conceptName = slugToConceptName(slug);
  if (!conceptName) notFound();

  const data = getConceptPageData(conceptName);

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "DefinedTerm",
    name: data.name,
    description: data.definition || `A prediction market concept in the ${data.clusterLabel} cluster.`,
    inDefinedTermSet: {
      "@type": "DefinedTermSet",
      name: "Prediction Market Concepts",
      url: `${siteConfig.url}/concepts`,
    },
    url: `${siteConfig.url}/concepts/${slug}`,
  };

  return (
    <>
      <JsonLd data={jsonLd} />
      {/* Pre-rendered content for crawlers */}
      <div className="sr-only" aria-hidden="false">
        <h1>{data.name}</h1>
        <p>{data.definition || "Definition pending."}</p>
        <p>Cluster: {data.clusterLabel}</p>
        {data.relatedConcepts.length > 0 && (
          <>
            <h2>Related Concepts</h2>
            <ul>
              {data.relatedConcepts.map((rc) => (
                <li key={rc.slug}>
                  <a href={`/concepts/${rc.slug}`}>{rc.name}</a>
                  {rc.definition && ` — ${rc.definition}`}
                </li>
              ))}
            </ul>
          </>
        )}
        {data.articles.length > 0 && (
          <>
            <h2>Articles about {data.name}</h2>
            <ul>
              {data.articles.map((a) => (
                <li key={a.id}>
                  <a href={a.url || "#"}>
                    {a.title} by {a.author}
                  </a>
                </li>
              ))}
            </ul>
          </>
        )}
      </div>
      <ConceptPageContent data={data} />
    </>
  );
}
