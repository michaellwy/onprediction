/**
 * Shared timeout helpers for the OnPrediction scanner.
 *
 * Why this exists: several fetch() calls in the scan pipeline had NO timeout
 * (arXiv, HN, DeepSeek, Anthropic, Telegram). One stalled connection hung the
 * whole scan past the cron wrapper's 420s kill → SCAN_TIMEOUT every night.
 * Every network call in the pipeline should go through fetchWithTimeout.
 */

/** fetch() with an AbortController timeout. Throws on timeout or network error. */
export async function fetchWithTimeout(url, options = {}, timeoutMs = 15000) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetch(url, { ...options, signal: controller.signal });
    return response;
  } catch (err) {
    if (err.name === "AbortError") {
      throw new Error(`fetch timeout after ${timeoutMs}ms: ${url}`);
    }
    throw err;
  } finally {
    clearTimeout(timer);
  }
}

/**
 * Race a promise against a deadline. Rejects when the deadline fires even if
 * the underlying promise never settles. The underlying promise keeps running
 * in the background — callers that use this on long-lived work should expect
 * that and rely on the process exiting to clean up.
 */
export function withDeadline(promise, timeoutMs, label = "task") {
  let timer;
  const timeout = new Promise((_, reject) => {
    timer = setTimeout(
      () => reject(new Error(`${label} exceeded ${timeoutMs}ms deadline`)),
      timeoutMs
    );
  });
  return Promise.race([promise, timeout]).finally(() => clearTimeout(timer));
}
