// In-memory cache scoped to one command invocation. Failed requests are evicted
// so a later attempt can retry instead of inheriting a rejected promise.
export function createCache() {
  const entries = new Map();

  return {
    getOrFetch(key, fetcher) {
      if (entries.has(key)) return entries.get(key);

      const pending = Promise.resolve()
        .then(fetcher)
        .catch((error) => {
          if (entries.get(key) === pending) entries.delete(key);
          throw error;
        });

      entries.set(key, pending);
      return pending;
    },
    clear() {
      entries.clear();
    },
  };
}
