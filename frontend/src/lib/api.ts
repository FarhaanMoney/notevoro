// Typed fetch layer over the FastAPI backend. Base is the relative "/api" prefix so the
// same code works in dev (Vite proxies /api → :8001) and behind a single origin in prod.
// In production, if VITE_API_BASE_URL is set, use it instead of relative "/api".
const BASE = import.meta.env.VITE_API_BASE_URL || "/api";

// Fields are declared, not constructor parameter properties: tsconfig sets
// erasableSyntaxOnly, which rejects `constructor(readonly status: number)`.
export class ApiError extends Error {
  status: number;
  body: unknown;

  constructor(status: number, body: unknown) {
    super(`request failed with ${status}`);
    this.name = "ApiError";
    this.status = status;
    this.body = body;
  }
}

type JsonBody = unknown;

// Get Supabase auth token if available
async function getAuthHeaders(): Promise<HeadersInit> {
  const headers: HeadersInit = {};
  
  // If using Supabase auth, include the Authorization header
  if (import.meta.env.VITE_SUPABASE_URL && import.meta.env.VITE_SUPABASE_ANON_KEY) {
    try {
      const { getSupabaseSession } = await import('./auth');
      const session = await getSupabaseSession();
      if (session?.access_token) {
        headers['Authorization'] = `Bearer ${session.access_token}`;
      }
    } catch (e) {
      // Auth module not initialized or error - continue without auth header
      console.warn('Failed to get Supabase session:', e);
    }
  }
  
  return headers;
}

// Retry configuration for free-tier cold starts
const MAX_RETRIES = 3;
const RETRY_DELAY = 1000; // 1 second between retries
const REQUEST_TIMEOUT = 30000; // 30 second timeout

async function requestWithTimeout<T>(
  fetcher: () => Promise<Response>,
  timeout: number
): Promise<Response> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeout);
  
  try {
    const response = await fetcher();
    clearTimeout(timeoutId);
    return response;
  } catch (error) {
    clearTimeout(timeoutId);
    throw error;
  }
}

async function request<T>(method: string, path: string, body?: JsonBody, retryCount = 0): Promise<T> {
  // Get auth headers for Supabase integration
  const authHeaders = await getAuthHeaders();
  
  const headers: HeadersInit = {
    ...(body !== undefined && { "Content-Type": "application/json" }),
    ...authHeaders,
  };
  
  try {
    const res = await requestWithTimeout(
      () => fetch(`${BASE}${path}`, {
        method,
        headers,
        body: body === undefined ? undefined : JSON.stringify(body),
      }),
      REQUEST_TIMEOUT
    );

    // FastAPI reports request-validation failures as 422 with a {detail: [...]} body.
    if (!res.ok) {
      const errBody = await res.json().catch(() => null);
      
      // Retry on 503 (service unavailable) or 504 (gateway timeout) for free-tier cold starts
      if ((res.status === 503 || res.status === 504) && retryCount < MAX_RETRIES) {
        console.warn(`Request failed with ${res.status}, retrying (${retryCount + 1}/${MAX_RETRIES})...`);
        await new Promise(resolve => setTimeout(resolve, RETRY_DELAY * (retryCount + 1)));
        return request<T>(method, path, body, retryCount + 1);
      }
      
      throw new ApiError(res.status, errBody);
    }

    if (res.status === 204) return undefined as T;
    return (await res.json()) as T;
  } catch (error) {
    // Retry on network errors for free-tier cold starts
    if (error instanceof TypeError && retryCount < MAX_RETRIES) {
      console.warn(`Network error, retrying (${retryCount + 1}/${MAX_RETRIES})...`);
      await new Promise(resolve => setTimeout(resolve, RETRY_DELAY * (retryCount + 1)));
      return request<T>(method, path, body, retryCount + 1);
    }
    
    // Re-throw other errors
    if (error instanceof ApiError) throw error;
    throw new ApiError(0, { message: "Network error or request timeout" });
  }
}

// The response type is yours to declare: nothing infers across the Python boundary, so a
// TS interface here mirrors the endpoint's Pydantic model by hand — keep the two in sync.
export const apiGet = <T>(path: string) => request<T>("GET", path);
export const apiPost = <T>(path: string, body?: JsonBody) => request<T>("POST", path, body ?? null);
export const apiPut = <T>(path: string, body?: JsonBody) => request<T>("PUT", path, body ?? null);
export const apiPatch = <T>(path: string, body?: JsonBody) =>
  request<T>("PATCH", path, body ?? null);
export const apiDelete = <T>(path: string) => request<T>("DELETE", path);
