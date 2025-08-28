// src/api/client.ts
export const API_BASE =
  (import.meta.env.VITE_API_BASE_URL as string | undefined)?.replace(/\/+$/, "") ||
  "http://localhost:5175/api"; // fallback

async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    headers: {
      "Content-Type": "application/json",
      ...(init.headers || {}),
    },
    ...init,
  });

  // ASP.NET Core default response: { success, message, data, ... }
  const text = await res.text();
  const json = text ? JSON.parse(text) : null;

  if (!res.ok) {
    // Hata gövdesi JSON ise onu fırlat
    const err: any = new Error(json?.message || res.statusText);
    err.status = res.status;
    err.response = json;
    throw err;
  }
  return json as T;
}

export const http = {
  get: <T>(path: string) => request<T>(path),
  post: <T>(path: string, body?: unknown) =>
    request<T>(path, { method: "POST", body: JSON.stringify(body ?? {}) }),
  put: <T>(path: string, body?: unknown) =>
    request<T>(path, { method: "PUT", body: JSON.stringify(body ?? {}) }),
  del: <T>(path: string) => request<T>(path, { method: "DELETE" }),
};
