/**
 * Shared API fetch utility with 429 rate-limit backoff.
 *
 * All frontend components should use `apiFetch()` instead of raw `fetch()`
 * for API calls. On 429, it waits using the Retry-After header (or exponential
 * backoff) and retries automatically — preventing retry storms that exhaust
 * the rate limit budget.
 */

import { logger } from "./browser-logger";

const MAX_RETRIES = 3;
const BASE_DELAY_MS = 2000;

/**
 * Fetch wrapper that handles 429 (Too Many Requests) with exponential backoff.
 * Retries up to MAX_RETRIES times on 429. All other errors are passed through.
 */
export async function apiFetch(
  input: RequestInfo | URL,
  init?: RequestInit,
): Promise<Response> {
  let lastResponse: Response | undefined;

  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    const response = await fetch(input, init);

    if (response.status !== 429) {
      return response;
    }

    lastResponse = response;

    if (attempt === MAX_RETRIES) {
      break;
    }

    // Determine wait time from Retry-After header or exponential backoff
    const retryAfter = response.headers.get("Retry-After");
    const resetHeader = response.headers.get("X-RateLimit-Reset");
    let waitMs: number;

    if (retryAfter) {
      // Retry-After can be seconds or a date string
      const seconds = parseInt(retryAfter, 10);
      waitMs = isNaN(seconds) ? BASE_DELAY_MS : seconds * 1000;
    } else if (resetHeader) {
      const resetTime = new Date(resetHeader).getTime();
      waitMs = Math.max(resetTime - Date.now(), BASE_DELAY_MS);
    } else {
      // Exponential backoff: 2s, 4s, 8s
      waitMs = BASE_DELAY_MS * Math.pow(2, attempt);
    }

    logger.warn(
      `[apiFetch] 429 on ${typeof input === "string" ? input : "request"}, ` +
        `retry ${attempt + 1}/${MAX_RETRIES} in ${Math.round(waitMs / 1000)}s`,
    );

    await new Promise((resolve) => setTimeout(resolve, waitMs));
  }

  // All retries exhausted — return the last 429 response
  return lastResponse!;
}
