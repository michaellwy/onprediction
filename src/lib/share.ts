export function buildShareUrl(articleId: number): string {
  return `${window.location.origin}/?article=${articleId}`;
}

export async function copyShareLink(articleId: number): Promise<boolean> {
  const url = buildShareUrl(articleId);
  try {
    await navigator.clipboard.writeText(url);
    return true;
  } catch {
    // Fallback for older browsers / insecure contexts
    const textarea = document.createElement("textarea");
    textarea.value = url;
    textarea.style.position = "fixed";
    textarea.style.opacity = "0";
    document.body.appendChild(textarea);
    textarea.select();
    try {
      document.execCommand("copy");
      return true;
    } catch {
      return false;
    } finally {
      document.body.removeChild(textarea);
    }
  }
}
