// JSON fetch 래퍼 — Toss API 등 외부 HTTP 호출용 (옵션 유틸).

export async function fetchJson<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, init);
  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(`fetch ${url} failed (${res.status}): ${text}`);
  }
  return (await res.json()) as T;
}
