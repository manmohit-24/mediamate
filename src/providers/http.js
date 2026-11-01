const RETRYABLE_STATUS = new Set([408, 429, 500, 502, 503, 504]);
const SAFE_METHODS = new Set(["GET", "HEAD"]);

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function readError(response) {
    const text = await response.text().catch(() => "");
    try {
        const data = JSON.parse(text);
        return data.status_message || data.message || data.Message || text;
    } catch {
        return text;
    }
}

/**
 * fetch with timeout and retries (network errors, 429, 5xx). Non-GET requests
 * are not retried unless `retryUnsafe` is set.
 * `as` is "json" or "buffer".
 */
export async function request(
    url,
    {
        method = "GET",
        headers = {},
        body,
        timeoutMs = 10_000,
        retries = 3,
        retryUnsafe = false,
        as = "json",
    } = {}
) {
    const canRetry = SAFE_METHODS.has(method) || retryUnsafe;
    const attempts = canRetry ? retries + 1 : 1;

    const once = async () => {
        let response;
        try {
            response = await fetch(url, {
                method,
                headers,
                body,
                signal: AbortSignal.timeout(timeoutMs),
            });
        } catch (error) {
            if (error.name === "TimeoutError")
                error.message = `Request timed out after ${timeoutMs}ms`;
            error.retryable = true;
            throw error;
        }

        if (response.ok) {
            if (as === "buffer") return Buffer.from(await response.arrayBuffer());
            return response.json();
        }

        const error = new Error(
            `HTTP ${response.status}: ${(await readError(response)) || response.statusText}`
        );
        error.status = response.status;
        error.retryable = RETRYABLE_STATUS.has(response.status);

        const retryAfter = Number(response.headers.get("retry-after"));
        if (retryAfter > 0 && retryAfter <= 10) error.retryAfterMs = retryAfter * 1000;
        throw error;
    };

    for (let attempt = 1; ; attempt++) {
        try {
            return await once();
        } catch (error) {
            if (!canRetry || !error.retryable || attempt >= attempts) throw error;
            await sleep(error.retryAfterMs ?? Math.min(1000 * 2 ** (attempt - 1), 8000));
        }
    }
}

export const requestJSON = (url, options) => request(url, { ...options, as: "json" });
export const requestBuffer = (url, options) =>
    request(url, { timeoutMs: 20_000, ...options, as: "buffer" });
