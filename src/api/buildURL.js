export function buildURL(url, params = {}) {
  url = new URL(url);

  for (const [key, value] of Object.entries(params)) {
    if (value != null) {
      url.searchParams.set(key, String(value));
    }
  }

  return url;
}
