"use client";

import { useEffect } from "react";

export function ArticleRedirectClient({ id }: { id: number }) {
  const target = `/?article=${id}`;

  useEffect(() => {
    window.location.replace(target);
  }, [target]);

  return (
    <>
      <meta httpEquiv="refresh" content={`0; url=${target}`} />
      <noscript>
        <div style={{ padding: "24px", fontFamily: "system-ui, sans-serif" }}>
          Redirecting to <a href={target}>the library</a>…
        </div>
      </noscript>
    </>
  );
}
