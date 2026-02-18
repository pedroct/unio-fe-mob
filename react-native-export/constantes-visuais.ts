/**
 * UNIO — Constantes visuais (módulo Balança Inteligente)
 * Fonte: client/src/pages/nutrition/scale.tsx + client/src/index.css
 *
 * Paleta de cores, estados do indicador BLE, strings/labels da UI.
 * Pronto para copiar num projeto React Native (StyleSheet.create).
 */

import type { StatusBLE } from "./tipos";

// ─────────────────────────────────────────────
// Paleta de cores UNIO (hex)
// ─────────────────────────────────────────────

export const CORES = {
  verdePrincipal: "#2F5641",
  verdeSecundario: "#648D4A",
  dourado: "#C7AE6A",
  laranja: "#D97952",
  creme: "#F5F3EE",
  fundoPrincipal: "#FAFBF8",
  bordaSutil: "#E8EBE5",
  textoSecundario: "#8B9286",
  branco: "#FFFFFF",

  statusAzul: "#3B82F6",
  statusAmarelo: "#F59E0B",
  statusVerde: "#10B981",
  statusVermelho: "#EF4444",
} as const;

// ─────────────────────────────────────────────
// Indicador Bluetooth — 4 estados visuais
// ─────────────────────────────────────────────

export interface ConfigStatusBLE {
  cor: string;
  corFundo: string;
  texto: string;
  pulsando: boolean;
}

export const STATUS_BLE_CONFIG: Record<StatusBLE, ConfigStatusBLE> = {
  buscando: {
    cor: CORES.statusAzul,
    corFundo: CORES.statusAzul + "1A",
    texto: "Buscando balança…",
    pulsando: true,
  },
  conectando: {
    cor: CORES.statusAmarelo,
    corFundo: CORES.statusAmarelo + "1A",
    texto: "Conectando…",
    pulsando: true,
  },
  conectado: {
    cor: CORES.statusVerde,
    corFundo: CORES.statusVerde + "1A",
    texto: "Conectado",
    pulsando: false,
  },
  desconectado: {
    cor: CORES.statusVermelho,
    corFundo: CORES.statusVermelho + "1A",
    texto: "Desconectado",
    pulsando: false,
  },
};

// ─────────────────────────────────────────────
// Strings / Labels da UI (PT-BR)
// ─────────────────────────────────────────────

export const STRINGS = {
  tituloTela: "Balança Inteligente",
  unidadePeso: "gramas",
  botaoTarar: "Tarar",
  botaoBuscar: "Buscar alimento…",
  botaoConfirmar: "Confirmar",
  botaoCancelar: "Cancelar",
  botaoRegistrar: "Registrar",
  botaoRegistrando: "Registrando…",
  botaoAguardandoPeso: "Aguardando peso…",
  placeholderBusca: "Buscar alimento…",
  placeholderPeso: "0",

  labelAlimentoSelecionado: "Alimento selecionado",
  labelQuantidade: "Quantidade (g)",
  labelPesoRegistrado: "Peso registrado",
  labelSelecioneAlimento: "Selecione um alimento para registrar",
  labelColoqueBalnca: "Coloque o alimento na balança para registrar",

  sucessoRegistro: "Registrado com sucesso!",
  sucessoDescricao: "Dados salvos no seu diário",
  sucessoPesagemDescartada: "Pesagem descartada",
  tituloAlimentoRegistrado: "Alimento registrado",

  erroSelecioneAlimento: "Selecione um alimento e peso",
  erroBuscarAlimentos: "Erro ao buscar alimentos",
  erroBuscarTBCA: "Erro ao buscar na TBCA",
  erroPesagensPendentes: "Erro ao buscar pesagens pendentes",
  erroAssociar: "Erro ao associar alimento",
  erroRegistrar: "Erro ao registrar alimento",
  erroDescartar: "Erro ao descartar pesagem",

  labelKcal: "Kcal",
  labelProteina: "Prot",
  labelCarboidrato: "Carb",
  labelGordura: "Gord",

  fonteTBCA: "TBCA",
  fonteApp: "Base UNIO",
} as const;

// ─────────────────────────────────────────────
// Tipografia (fontes usadas no web app)
// ─────────────────────────────────────────────

export const FONTES = {
  display: "Playfair Display",
  body: "Inter",
} as const;

// ─────────────────────────────────────────────
// Dimensões e espaçamentos recorrentes
// ─────────────────────────────────────────────

export const DIMENSOES = {
  circuloPesoDiametro: 224,
  circuloPesoBorda: 4,
  pesoMaximoProgressBar: 500,
  maxWidthApp: 430,
  debounceMs: 300,
  pollingIntervaloMs: 5000,
  redirectDelayMs: 1500,
} as const;

// ─────────────────────────────────────────────
// Limites de busca (compatível com API)
// ─────────────────────────────────────────────

export const LIMITES_BUSCA = {
  limiteAlimentosApp: 20,
  limiteAlimentosTBCA: 50,
  minimoCaracteresBusca: 2,
} as const;
