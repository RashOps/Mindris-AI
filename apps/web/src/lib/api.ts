const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";
const RENDERER_BASE = process.env.NEXT_PUBLIC_RENDERER_URL ?? "http://localhost:4000";
const API_KEY = process.env.NEXT_PUBLIC_API_KEY ?? "dev-mindris-api-key";

export const RENDERER_BASE_URL = RENDERER_BASE;

function joinUrl(base: string, path: string): string {
  const normalizedBase = base.replace(/\/$/, "");
  const normalizedPath = path.startsWith("/") ? path : `/${path}`;
  return `${normalizedBase}${normalizedPath}`;
}

export function apiUrl(path: string): string {
  return joinUrl(API_BASE, path);
}

export function rendererUrl(path: string): string {
  return joinUrl(RENDERER_BASE, path);
}

export function apiHeaders(): HeadersInit {
  return { "X-API-Key": API_KEY };
}

export function jsonHeaders(): HeadersInit {
  return { "Content-Type": "application/json", ...apiHeaders() };
}

export function eventSourceUrl(path: string): string {
  const url = new URL(apiUrl(path));
  url.searchParams.set("api_key", API_KEY);
  return url.toString();
}

export function authenticatedApiUrl(path: string): string {
  const url = new URL(apiUrl(path));
  url.searchParams.set("api_key", API_KEY);
  return url.toString();
}
