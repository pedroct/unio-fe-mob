/**
 * UNIO — Tipos TypeScript extraídos do web app (módulo Balança Inteligente)
 * Fonte: client/src/pages/nutrition/scale.tsx + client/src/lib/auth.tsx
 *
 * Pronto para copiar num projeto React Native.
 * Nenhuma dependência de React, DOM ou bibliotecas web.
 */

// ─────────────────────────────────────────────
// Autenticação
// ─────────────────────────────────────────────

export interface AuthUser {
  id: number;
  email: string;
  username: string;
  first_name: string;
  last_name: string;
  is_active: boolean;
  criado_em: string;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface LoginResponse {
  access: string;
  refresh: string;
}

export interface RefreshRequest {
  refresh: string;
}

export interface RefreshResponse {
  access: string;
}

export interface RegisterRequest {
  email: string;
  password: string;
  username: string;
}

// ─────────────────────────────────────────────
// Alimentos — Base App
// ─────────────────────────────────────────────

export interface AlimentoItem {
  id: number;
  nome: string;
  marca: string;
  codigo_barras: string | null;
  calorias: number;
  carboidratos: number;
  proteinas: number;
  gorduras: number;
  fibras: number;
  unidade_medida: string;
}

// ─────────────────────────────────────────────
// Alimentos — TBCA (fallback)
// ─────────────────────────────────────────────

export interface GrupoAlimentar {
  id: string;
  codigo_tbca: string;
  nome: string;
}

export interface AlimentoTBCAItem {
  id: string;
  codigo_tbca: string;
  descricao: string;
  nome_cientifico: string | null;
  grupo_alimentar: GrupoAlimentar | null;
  fonte_dados: string;
}

// ─────────────────────────────────────────────
// Alimento Selecionado (discriminated union)
// ─────────────────────────────────────────────

export type SelectedFood =
  | { source: "app"; data: AlimentoItem }
  | { source: "tbca"; data: AlimentoTBCAItem };

export type FoodSource = "app" | "tbca";

// ─────────────────────────────────────────────
// Pesagens Pendentes
// ─────────────────────────────────────────────

export type StatusPesagem = "PENDENTE" | "ASSOCIADA" | "CANCELADA";

export interface PesagemPendente {
  id: number;
  peso_original: number;
  unidade_original: string;
  peso_gramas: number;
  status: StatusPesagem | string;
  mac_balanca: string | null;
  pesado_em: string;
  associado_em: string | null;
  registro_alimentar_id: number | null;
}

export interface PesagensPendentesResponse {
  pesagens: PesagemPendente[];
  total: number;
}

// ─────────────────────────────────────────────
// Requests — Balança / Associação
// ─────────────────────────────────────────────

export interface RegistrarPesoRequest {
  peso: number;
  unidade: string;
  mac_balanca?: string;
}

export interface RegistrarPesoResponse {
  sucesso: boolean;
  aguardando_alimento: boolean;
  pesagem_id?: number;
  mensagem?: string;
}

export interface AssociarPesagemBaseApp {
  alimento_id: number;
  refeicao_id?: number;
  observacao?: string;
}

export interface AssociarPesagemTBCA {
  alimento_tbca_id: string;
  refeicao_id?: number;
  observacao?: string;
}

export type AssociarPesagemRequest = AssociarPesagemBaseApp | AssociarPesagemTBCA;

export interface AssociarPesagemResponse {
  sucesso: boolean;
  registro_alimentar?: Record<string, unknown>;
  mensagem?: string;
}

export interface CancelarPesagemResponse {
  sucesso: boolean;
  mensagem?: string;
}

// ─────────────────────────────────────────────
// Registro alimentar direto (sem pesagem pendente)
// ─────────────────────────────────────────────

export interface RegistrarAlimentoDiretoRequest {
  peso: number;
  unidade: string;
  alimento_id?: number;
  alimento_tbca_id?: string;
}

// ─────────────────────────────────────────────
// Refeições
// ─────────────────────────────────────────────

export interface Refeicao {
  id: number;
  nome: string;
  ordem?: number;
}

// ─────────────────────────────────────────────
// Status BLE — 4 estados do indicador Bluetooth
// ─────────────────────────────────────────────

export type StatusBLE = "buscando" | "conectando" | "conectado" | "desconectado";

// ─────────────────────────────────────────────
// Macros calculados (proporcional ao peso)
// ─────────────────────────────────────────────

export interface MacrosCalculados {
  kcal: number;
  proteinas: number;
  carboidratos: number;
  gorduras: number;
}

// ─────────────────────────────────────────────
// Erro da API (formato padrão do backend Django)
// ─────────────────────────────────────────────

export interface ApiError {
  detail?: string;
  mensagem?: string;
  error?: string;
}
