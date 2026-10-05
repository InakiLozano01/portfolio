// Short-lived, in-memory list cache. Never persists private data in storage.
const listUrls = new Set([
  '/api/projects?view=summary', '/api/blogs?view=summary',
  '/api/skills', '/api/sections', '/api/stats',
]);
const entries = new Map<string, { expires: number; response: Response }>();
const pending = new Map<string, Promise<Response>>();
let generation = 0;

export function clearAdminCache() {
  generation++;
  entries.clear();
  pending.clear();
}

export async function adminFetch(url: string, options?: RequestInit): Promise<Response> {
  const method = (options?.method || 'GET').toUpperCase();
  if (method !== 'GET') {
    // Invalidate before AND after a write, including reads racing with it.
    clearAdminCache();
    try {
      const response = await fetch(url, options);
      clearAdminCache();
      if (response.ok && typeof window !== 'undefined' && /^\/api\/(admin\/)?comments(?:\/|$)/.test(url)) {
        window.dispatchEvent(new Event('admin-comments-changed'));
      }
      return response;
    } finally { clearAdminCache(); }
  }
  if (!listUrls.has(url) || options) return fetch(url, options);
  const cached = entries.get(url);
  if (cached && cached.expires > Date.now()) return cached.response.clone();
  const existing = pending.get(url);
  if (existing) return (await existing).clone();

  const startedGeneration = generation;
  const request = fetch(url).then(response => {
    if (response.ok && startedGeneration === generation) {
      entries.set(url, { expires: Date.now() + 30000, response: response.clone() });
    }
    return response;
  }).finally(() => {
    if (pending.get(url) === request) pending.delete(url);
  });
  pending.set(url, request);
  return (await request).clone();
}
