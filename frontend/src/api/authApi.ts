import { useAuth } from "../contexts/AuthContext";
import { useNavigate } from "react-router-dom";

const BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:4000/api/";
const API_KEY = import.meta.env.VITE_API_KEY;
// console.log('VITE_API_KEY:', API_KEY);

function buildUrl(url: string) {
  return url.startsWith("http") ? url : BASE_URL + url.replace(/^\//, "");
}

export function useAuthApi() {
  const { logout } = useAuth();
  const navigate = useNavigate();

  return async function authApi(
    url: string,
    options: RequestInit = {}
  ): Promise<Response> {
    const headers = new Headers(options.headers || {});
    if (API_KEY) {
      headers.set("x-api-key", API_KEY);
    }
    // console.log('Headers before fetch:', Array.from(headers.entries()));
    const opts = { method: "GET", ...options, headers };
    const response = await fetch(buildUrl(url), opts);
    if (response.status === 401) {
      logout();
      navigate("/login", { replace: true });
      throw new Error("Unauthorized: Redirecting to login");
    }
    return response;
  };
}

export function useAuthApiGet() {
  const authApi = useAuthApi();
  return (url: string, options?: RequestInit) =>
    authApi(url, { ...options, method: "GET" });
}

export function useAuthApiPost() {
  const authApi = useAuthApi();
  return (url: string, body: any, options?: RequestInit) => {
    const headers = {
      "Content-Type": "application/json",
      ...(options?.headers || {}),
    };
    return authApi(url, {
      ...options,
      method: "POST",
      headers,
      body: JSON.stringify(body),
    });
  };
}

export function useAuthApiPut() {
  const authApi = useAuthApi();
  return (url: string, body: any, options?: RequestInit) =>
    authApi(url, {
      ...options,
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        ...(options?.headers || {}),
      },
      body: JSON.stringify(body),
    });
}

export function useAuthApiDelete() {
  const authApi = useAuthApi();
  return (url: string, options?: RequestInit) =>
    authApi(url, { ...options, method: "DELETE" });
}

export function useAuthApiPatch() {
  const authApi = useAuthApi();
  return (url: string, body: any, options?: RequestInit) =>
    authApi(url, {
      ...options,
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        ...(options?.headers || {}),
      },
      body: JSON.stringify(body),
    });
}
