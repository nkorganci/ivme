// Short-lived reference data only; never persist student answers or availability.
export function createReadCache(load, { ttl = 30_000, limit = 40, now = Date.now } = {}) {
  const entries = new Map();
  return {
    clear() { entries.clear(); },
    get(key) {
      const existing = entries.get(key);
      if (existing && (existing.pending || existing.expires > now())) return existing.promise;
      const entry = { pending: true, expires: 0 };
      entry.promise = Promise.resolve().then(() => load(key)).then(value => {
        entry.pending = false; entry.expires = now() + ttl;
        return value;
      }, error => {
        if (entries.get(key) === entry) entries.delete(key);
        throw error;
      });
      entries.delete(key);
      entries.set(key, entry);
      if (entries.size > limit) entries.delete(entries.keys().next().value);
      return entry.promise;
    },
  };
}
