const DEFAULT_TIMEOUT_MS = 10_000;
const DEFAULT_RETRIES = 5;

const RETRYABLE_STATUSES = new Set([429, 500, 502, 503, 504]);

const SAFE_METHODS = new Set(["GET", "HEAD", "OPTIONS"]);

export async function requestJSON(
  url,
  {
    method = "GET",
    headers = {},
    body,
    timeoutMs = DEFAULT_TIMEOUT_MS,
    retries = DEFAULT_RETRIES,
    retryUnsafe = false,
  } = {},
) {
  const canRetry = SAFE_METHODS.has(method.toUpperCase()) || retryUnsafe;

  const maxAttempts = canRetry ? retries + 1 : 1;
  let lastError;

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      const response = await fetch(url, {
        method,
        headers,
        body,
        signal: AbortSignal.timeout(timeoutMs),
      });

      const text = await response.text();
      let data = null;

      if (text) {
        try {
          data = JSON.parse(text);
        } catch {
          data = text;
        }
      }

      if (response.ok) return data;

      const message =
        data && typeof data === "object"
          ? (data.status_message ?? data.message ?? response.statusText)
          : response.statusText;

      const error = new Error(`HTTP ${response.status}: ${message}`);

      error.status = response.status;
      error.data = data;

      if (
        !canRetry ||
        !RETRYABLE_STATUSES.has(response.status) ||
        attempt === maxAttempts
      )
        throw error;

      lastError = error;
    } catch (error) {
      lastError = error;

      const retryableStatus =
        error.status != null && RETRYABLE_STATUSES.has(error.status);

      // Do not retry ordinary HTTP errors or unsafe requests.
      if (error.status != null && !retryableStatus) throw error;
      if (!canRetry || attempt === maxAttempts) throw error;
    }

    const delayMs = Math.min(1000 * 2 ** (attempt - 1), 8000);

    await new Promise((resolve) => setTimeout(resolve, delayMs));
  }

  throw lastError;
}
