// Thin fetch wrapper. Base URL is empty because the Vite dev server
// proxies /api/* and /actuator/* to localhost:8080 (see vite.config.ts).
// In Phase 4 / production, set VITE_API_BASE at build time.

const BASE = (import.meta as any).env?.VITE_API_BASE ?? '';

export type RequestOptions = Omit<RequestInit, 'body'> & {
  body?: unknown;
};

export async function http<T>(path: string, opts: RequestOptions = {}): Promise<T> {
  const headers = new Headers(opts.headers);
  let body: BodyInit | undefined;
  if (opts.body !== undefined && opts.body !== null) {
    headers.set('Content-Type', 'application/json');
    body = JSON.stringify(opts.body);
  }
  const res = await fetch(BASE + path, { ...opts, body, headers });
  if (!res.ok) {
    let message = `${res.status} ${res.statusText}`;
    try {
      const text = await res.text();
      if (text) message += ` — ${text}`;
    } catch { /* ignore */ }
    throw new Error(message);
  }
  if (res.status === 204) return undefined as T;
  const ct = res.headers.get('content-type') ?? '';
  if (ct.includes('application/json')) return (await res.json()) as T;
  return (await res.text()) as unknown as T;
}
