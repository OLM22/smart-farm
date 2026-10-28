const BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:4000/api/";

function buildUrl(url: string) {
  return url.startsWith("http") ? url : BASE_URL + url.replace(/^\//, "");
}

export async function publicApi(
  url: string,
  options: RequestInit = {}
): Promise<Response> {
  // Default to GET if no method is specified
  const opts = { method: "GET", ...options };
  return fetch(buildUrl(url), opts);
}

export const publicApiGet = (url: string, options?: RequestInit) =>
  publicApi(url, { ...options, method: "GET" });

export const publicApiPost = (url: string, body: any, options?: RequestInit) =>
  publicApi(url, {
    ...options,
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(options?.headers || {}),
    },
    body: JSON.stringify(body),
  });

export const publicApiPut = (url: string, body: any, options?: RequestInit) =>
  publicApi(url, {
    ...options,
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
      ...(options?.headers || {}),
    },
    body: JSON.stringify(body),
  });

export const publicApiDelete = (url: string, options?: RequestInit) =>
  publicApi(url, { ...options, method: "DELETE" });
