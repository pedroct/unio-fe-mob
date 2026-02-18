/**
 * UNIO — Cliente HTTP e funções de API (módulo Balança Inteligente)
 * Fonte: client/src/lib/api.ts + client/src/lib/auth.tsx + scale.tsx
 *
 * Pronto para copiar num projeto React Native.
 * Usa fetch nativo (disponível em RN). Substituir por axios se preferir.
 *
 * Storage é abstraído via TokenStorage interface — implementar com AsyncStorage no RN.
 */

import type {
  LoginRequest,
  LoginResponse,
  RefreshRequest,
  RefreshResponse,
  RegisterRequest,
  AuthUser,
  AlimentoItem,
  AlimentoTBCAItem,
  PesagensPendentesResponse,
  RegistrarPesoRequest,
  RegistrarPesoResponse,
  AssociarPesagemRequest,
  AssociarPesagemResponse,
  CancelarPesagemResponse,
  RegistrarAlimentoDiretoRequest,
  Refeicao,
  ApiError,
} from "./tipos";

// ─────────────────────────────────────────────
// Configuração
// ─────────────────────────────────────────────

const API_BASE_URL = "https://staging.unio.tec.br";

const REFRESH_TOKEN_KEY = "unio_refresh_token";

// ─────────────────────────────────────────────
// Storage adapter (implementar com AsyncStorage no RN)
// ─────────────────────────────────────────────

export interface TokenStorage {
  getItem(key: string): Promise<string | null>;
  setItem(key: string, value: string): Promise<void>;
  removeItem(key: string): Promise<void>;
}

let storage: TokenStorage | null = null;

export function configureStorage(impl: TokenStorage): void {
  storage = impl;
}

// ─────────────────────────────────────────────
// Estado de tokens (em memória)
// ─────────────────────────────────────────────

let accessToken: string | null = null;
let refreshTokenValue: string | null = null;
let refreshPromise: Promise<string | null> | null = null;

export async function loadRefreshToken(): Promise<void> {
  if (!storage) return;
  try {
    refreshTokenValue = await storage.getItem(REFRESH_TOKEN_KEY);
  } catch {
    refreshTokenValue = null;
  }
}

export function setAccessToken(token: string | null): void {
  accessToken = token;
}

export function getAccessToken(): string | null {
  return accessToken;
}

export async function setRefreshToken(token: string | null): Promise<void> {
  refreshTokenValue = token;
  if (!storage) return;
  try {
    if (token) {
      await storage.setItem(REFRESH_TOKEN_KEY, token);
    } else {
      await storage.removeItem(REFRESH_TOKEN_KEY);
    }
  } catch {}
}

export function getRefreshToken(): string | null {
  return refreshTokenValue;
}

// ─────────────────────────────────────────────
// Refresh automático de JWT
// ─────────────────────────────────────────────

async function tryRefresh(): Promise<string | null> {
  if (!refreshTokenValue) {
    accessToken = null;
    return null;
  }
  try {
    const res = await fetch(`${API_BASE_URL}/api/auth/refresh`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ refresh: refreshTokenValue } satisfies RefreshRequest),
    });
    if (!res.ok) {
      setAccessToken(null);
      await setRefreshToken(null);
      return null;
    }
    const data: RefreshResponse = await res.json();
    setAccessToken(data.access);
    return data.access;
  } catch {
    setAccessToken(null);
    await setRefreshToken(null);
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

// ─────────────────────────────────────────────
// Fetch autenticado com interceptor 401
// ─────────────────────────────────────────────

export async function apiFetch(
  path: string,
  init?: RequestInit
): Promise<Response> {
  const url = `${API_BASE_URL}${path}`;
  const headers = new Headers(init?.headers);

  if (accessToken) {
    headers.set("Authorization", `Bearer ${accessToken}`);
  }

  let res = await fetch(url, { ...init, headers });

  if (res.status === 401 && refreshTokenValue) {
    const newToken = await refreshAccessToken();
    if (newToken) {
      headers.set("Authorization", `Bearer ${newToken}`);
      res = await fetch(url, { ...init, headers });
    }
  }

  return res;
}

// ─────────────────────────────────────────────
// Helper: extrair mensagem de erro da API
// ─────────────────────────────────────────────

export async function extrairErroApi(res: Response, fallback: string): Promise<string> {
  try {
    const data: ApiError = await res.json();
    return data.mensagem || data.detail || data.error || fallback;
  } catch {
    return fallback;
  }
}

// ─────────────────────────────────────────────
// Autenticação
// ─────────────────────────────────────────────

export async function login(email: string, password: string): Promise<AuthUser> {
  const res = await fetch(`${API_BASE_URL}/api/auth/pair`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password } satisfies LoginRequest),
  });
  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.detail || data.error || "Erro ao fazer login.");
  }
  const loginData = data as LoginResponse;
  setAccessToken(loginData.access);
  await setRefreshToken(loginData.refresh);
  return fetchUsuarioAtual();
}

export async function registrar(email: string, password: string, username?: string): Promise<AuthUser> {
  const body: RegisterRequest = {
    email,
    password,
    username: username || email.split("@")[0],
  };
  const res = await fetch(`${API_BASE_URL}/api/nucleo/registrar`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.mensagem || data.detail || data.error || "Erro ao criar conta.");
  }
  return login(email, password);
}

export async function fetchUsuarioAtual(): Promise<AuthUser> {
  const res = await apiFetch("/api/nucleo/eu");
  if (!res.ok) {
    throw new Error("Não foi possível obter dados do usuário.");
  }
  return res.json();
}

export async function logout(): Promise<void> {
  const refresh = getRefreshToken();
  if (refresh) {
    fetch(`${API_BASE_URL}/api/auth/blacklist`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ refresh }),
    }).catch(() => {});
  }
  setAccessToken(null);
  await setRefreshToken(null);
}

// ─────────────────────────────────────────────
// Buscar alimentos — Base App
// ─────────────────────────────────────────────

export async function buscarAlimentos(termo: string, limite: number = 20): Promise<AlimentoItem[]> {
  const res = await apiFetch(
    `/api/nutricao/alimentos/buscar?q=${encodeURIComponent(termo)}&limite=${limite}`
  );
  if (!res.ok) {
    throw new Error(await extrairErroApi(res, "Erro ao buscar alimentos"));
  }
  return res.json();
}

// ─────────────────────────────────────────────
// Buscar alimentos — TBCA (fallback)
// ─────────────────────────────────────────────

export async function buscarAlimentosTBCA(
  termo: string,
  limite: number = 50,
  offset: number = 0
): Promise<AlimentoTBCAItem[]> {
  const res = await apiFetch(
    `/api/nutricao/tbca/alimentos?busca=${encodeURIComponent(termo)}&limite=${limite}&offset=${offset}`
  );
  if (!res.ok) {
    throw new Error(await extrairErroApi(res, "Erro ao buscar na TBCA"));
  }
  return res.json();
}

// ─────────────────────────────────────────────
// Pesagens pendentes
// ─────────────────────────────────────────────

export async function listarPesagensPendentes(): Promise<PesagensPendentesResponse> {
  const res = await apiFetch("/api/nutricao/diario/pesagens-pendentes");
  if (!res.ok) {
    throw new Error(await extrairErroApi(res, "Erro ao buscar pesagens pendentes"));
  }
  return res.json();
}

// ─────────────────────────────────────────────
// Registrar peso bruto (sem alimento — cria pesagem pendente)
// ─────────────────────────────────────────────

export async function registrarPeso(body: RegistrarPesoRequest): Promise<RegistrarPesoResponse> {
  const res = await apiFetch("/api/nutricao/diario/balanca-cozinha", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    throw new Error(await extrairErroApi(res, "Erro ao registrar peso"));
  }
  return res.json();
}

// ─────────────────────────────────────────────
// Associar pesagem pendente a um alimento
// ─────────────────────────────────────────────

export async function associarPesagem(
  pesagemId: number,
  body: AssociarPesagemRequest
): Promise<AssociarPesagemResponse> {
  const res = await apiFetch(`/api/nutricao/diario/pesagens-pendentes/${pesagemId}/associar`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    throw new Error(await extrairErroApi(res, "Erro ao associar alimento"));
  }
  return res.json();
}

// ─────────────────────────────────────────────
// Cancelar / descartar pesagem pendente
// ─────────────────────────────────────────────

export async function cancelarPesagem(pesagemId: number): Promise<CancelarPesagemResponse> {
  const res = await apiFetch(`/api/nutricao/diario/pesagens-pendentes/${pesagemId}`, {
    method: "DELETE",
  });
  if (!res.ok) {
    throw new Error(await extrairErroApi(res, "Erro ao descartar pesagem"));
  }
  return res.json();
}

// ─────────────────────────────────────────────
// Registro alimentar direto (peso + alimento, sem pesagem pendente)
// ─────────────────────────────────────────────

export async function registrarAlimentoDireto(body: RegistrarAlimentoDiretoRequest): Promise<AssociarPesagemResponse> {
  const res = await apiFetch("/api/nutricao/diario/balanca-cozinha", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    throw new Error(await extrairErroApi(res, "Erro ao registrar alimento"));
  }
  return res.json();
}

// ─────────────────────────────────────────────
// Listar refeições (para picker de refeição)
// ─────────────────────────────────────────────

export async function listarRefeicoes(): Promise<Refeicao[]> {
  const res = await apiFetch("/api/nutricao/refeicoes");
  if (!res.ok) {
    throw new Error(await extrairErroApi(res, "Erro ao buscar refeições"));
  }
  return res.json();
}
