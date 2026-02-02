const BOOKMARKS_KEY = "frontier-market-bookmarks";

export function getBookmarks(): Set<number> {
  if (typeof window === "undefined") {
    return new Set();
  }
  try {
    const stored = localStorage.getItem(BOOKMARKS_KEY);
    if (stored) {
      const parsed = JSON.parse(stored);
      return new Set(parsed);
    }
  } catch (e) {
    console.error("Failed to load bookmarks:", e);
  }
  return new Set();
}

export function saveBookmarks(bookmarks: Set<number>): void {
  if (typeof window === "undefined") {
    return;
  }
  try {
    localStorage.setItem(BOOKMARKS_KEY, JSON.stringify(Array.from(bookmarks)));
  } catch (e) {
    console.error("Failed to save bookmarks:", e);
  }
}

export function toggleBookmark(
  bookmarks: Set<number>,
  articleId: number
): Set<number> {
  const newBookmarks = new Set(bookmarks);
  if (newBookmarks.has(articleId)) {
    newBookmarks.delete(articleId);
  } else {
    newBookmarks.add(articleId);
  }
  return newBookmarks;
}
