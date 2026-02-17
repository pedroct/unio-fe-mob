const REFRESH_TOKEN_KEY = "unio_refresh_token";

let accessToken: string | null = null;
let refreshToken: string | null = (() => {
  try { return localStorage.getItem(REFRESH_TOKEN_KEY); } catch { return null; }
})();
let refreshPromise: Promise<string | null> | null = null;

export function setAccessToken(token: string | null) {
  accessToken = token;
}

export function getAccessToken(): string | null {
  return accessToken;
}

export function setRefreshToken(token: string | null) {
  refreshToken = token;
  try {
    if (token) {
      localStorage.setItem(REFRESH_TOKEN_KEY, token);
    } else {
      localStorage.removeItem(REFRESH_TOKEN_KEY);
    }
  } catch {}
}

export function getRefreshToken(): string | null {
  return refreshToken;
}

async function tryRefresh(): Promise<string | null> {
  if (!refreshToken) {
    accessToken = null;
    return null;
  }
  try {
    const res = await fetch("/api/auth/refresh", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ refresh: refreshToken }),
    });
    if (!res.ok) {
      setAccessToken(null);
      setRefreshToken(null);
      return null;
    }
    const data = await res.json();
    setAccessToken(data.access);
    return accessToken;
  } catch {
    setAccessToken(null);
    setRefreshToken(null);
    return null;
  }
}

async function refreshAccessToken(): Promise<string | null> {
  if (refreshPromise) {
    return refreshPromise;
  }
  refreshPromise = tryRefresh().finally(() => {
    refreshPromise = null;
  });
  return refreshPromise;
}

export async function apiFetch(
  input: RequestInfo | URL,
  init?: RequestInit
): Promise<Response> {
  const headers = new Headers(init?.headers);

  if (accessToken) {
    headers.set("Authorization", `Bearer ${accessToken}`);
  }

  let res = await fetch(input, {
    ...init,
    headers,
  });

  if (res.status === 401 && refreshToken) {
    const newToken = await refreshAccessToken();
    if (newToken) {
      headers.set("Authorization", `Bearer ${newToken}`);
      res = await fetch(input, {
        ...init,
        headers,
      });
    }
  }

  return res;
}
