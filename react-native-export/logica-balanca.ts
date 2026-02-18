/**
 * UNIO — Lógica de negócio pura (módulo Balança Inteligente)
 * Fonte: client/src/pages/nutrition/scale.tsx
 *
 * Sem JSX, sem React, sem DOM. Apenas funções TypeScript puras.
 * Pronto para copiar num projeto React Native.
 *
 * NOTA: A lógica BLE (scan, connect, handshake ICOMON, decodificação de peso)
 * NÃO está incluída aqui porque depende de react-native-ble-plx (nativo).
 * Consulte a especificação do app React Native para o hook useBalancaBLE
 * e o protocolo ICOMON completo (seções 5.1–5.4 do documento de handoff).
 */

import type {
  AlimentoItem,
  AlimentoTBCAItem,
  SelectedFood,
  MacrosCalculados,
  AssociarPesagemRequest,
  RegistrarAlimentoDiretoRequest,
  PesagemPendente,
} from "./tipos";

import {
  buscarAlimentos,
  buscarAlimentosTBCA,
  associarPesagem,
  registrarAlimentoDireto,
} from "./api-nutricao";

// ─────────────────────────────────────────────
// Labels e subtítulos de alimento
// ─────────────────────────────────────────────

export function getFoodLabel(food: SelectedFood): string {
  return food.source === "app" ? food.data.nome : food.data.descricao;
}

export function getFoodSubtitle(food: SelectedFood): string | null {
  if (food.source === "app" && food.data.marca) return food.data.marca;
  if (food.source === "tbca" && food.data.grupo_alimentar) return food.data.grupo_alimentar.nome;
  return null;
}

export function getFoodId(food: SelectedFood): number | string {
  return food.data.id;
}

// ─────────────────────────────────────────────
// Truncação inteligente de texto
// ─────────────────────────────────────────────

export function smartTruncate(text: string, maxLen: number = 48): string {
  if (text.length <= maxLen) return text;
  const trimmed = text.slice(0, maxLen);
  const lastSpace = trimmed.lastIndexOf(" ");
  if (lastSpace <= 0) return trimmed + "\u2026";
  return trimmed.slice(0, lastSpace) + "\u2026";
}

// ─────────────────────────────────────────────
// Debounce genérico
// ─────────────────────────────────────────────

export function createDebounce<T extends (...args: any[]) => void>(
  fn: T,
  delayMs: number = 300
): { call: (...args: Parameters<T>) => void; cancel: () => void } {
  let timer: ReturnType<typeof setTimeout> | null = null;

  return {
    call: (...args: Parameters<T>) => {
      if (timer) clearTimeout(timer);
      timer = setTimeout(() => {
        fn(...args);
        timer = null;
      }, delayMs);
    },
    cancel: () => {
      if (timer) {
        clearTimeout(timer);
        timer = null;
      }
    },
  };
}

// ─────────────────────────────────────────────
// Busca com fallback automático (base app → TBCA)
// ─────────────────────────────────────────────

export interface ResultadoBusca {
  alimentosApp: AlimentoItem[];
  alimentosTBCA: AlimentoTBCAItem[];
  fonte: "app" | "tbca" | "ambos" | "nenhum";
}

export async function buscarComFallback(
  termo: string,
  limiteApp: number = 20,
  limiteTBCA: number = 50
): Promise<ResultadoBusca> {
  if (termo.length < 2) {
    return { alimentosApp: [], alimentosTBCA: [], fonte: "nenhum" };
  }

  const alimentosApp = await buscarAlimentos(termo, limiteApp);

  if (alimentosApp.length > 0) {
    return { alimentosApp, alimentosTBCA: [], fonte: "app" };
  }

  const alimentosTBCA = await buscarAlimentosTBCA(termo, limiteTBCA);

  if (alimentosTBCA.length > 0) {
    return { alimentosApp: [], alimentosTBCA, fonte: "tbca" };
  }

  return { alimentosApp: [], alimentosTBCA: [], fonte: "nenhum" };
}

// ─────────────────────────────────────────────
// Mapeamento de campos: base app vs TBCA
// ─────────────────────────────────────────────

export function alimentoAppToSelected(item: AlimentoItem): SelectedFood {
  return { source: "app", data: item };
}

export function alimentoTBCAToSelected(item: AlimentoTBCAItem): SelectedFood {
  return { source: "tbca", data: item };
}

// ─────────────────────────────────────────────
// Cálculo de macros proporcional ao peso
// ─────────────────────────────────────────────

export function calcularMacros(alimento: AlimentoItem, pesoGramas: number): MacrosCalculados {
  const fator = pesoGramas / 100;
  return {
    kcal: Math.round(alimento.calorias * fator),
    proteinas: Math.round(alimento.proteinas * fator * 10) / 10,
    carboidratos: Math.round(alimento.carboidratos * fator * 10) / 10,
    gorduras: Math.round(alimento.gorduras * fator * 10) / 10,
  };
}

export function calcularMacrosFromSelected(food: SelectedFood, pesoGramas: number): MacrosCalculados | null {
  if (food.source === "app") {
    return calcularMacros(food.data, pesoGramas);
  }
  return null;
}

// ─────────────────────────────────────────────
// Montar body de associação (base app vs TBCA)
// ─────────────────────────────────────────────

export function montarBodyAssociacao(
  food: SelectedFood,
  options?: { refeicao_id?: number; observacao?: string }
): AssociarPesagemRequest {
  const base: Record<string, unknown> = {};

  if (options?.refeicao_id) base.refeicao_id = options.refeicao_id;
  if (options?.observacao) base.observacao = options.observacao;

  if (food.source === "app") {
    return { ...base, alimento_id: food.data.id } as AssociarPesagemRequest;
  } else {
    return { ...base, alimento_tbca_id: food.data.id } as AssociarPesagemRequest;
  }
}

// ─────────────────────────────────────────────
// Confirmar registro (pesagem pendente OU direto)
// ─────────────────────────────────────────────

export async function confirmarRegistro(params: {
  food: SelectedFood;
  pesoGramas: number;
  pendingPesagemId: number | null;
  weightMatchesPending: boolean;
  observacao?: string;
  refeicao_id?: number;
}): Promise<{ sucesso: boolean; mensagem?: string }> {
  const { food, pesoGramas, pendingPesagemId, weightMatchesPending, observacao, refeicao_id } = params;

  if (!food || pesoGramas === 0) {
    throw new Error("Selecione um alimento e peso");
  }

  if (pendingPesagemId && weightMatchesPending) {
    const body = montarBodyAssociacao(food, {
      observacao: observacao || "Registrado via balança inteligente",
      refeicao_id,
    });
    return associarPesagem(pendingPesagemId, body);
  } else {
    const body: RegistrarAlimentoDiretoRequest = {
      peso: pesoGramas,
      unidade: "g",
      ...(food.source === "app"
        ? { alimento_id: food.data.id }
        : { alimento_tbca_id: food.data.id }),
    };
    return registrarAlimentoDireto(body);
  }
}

// ─────────────────────────────────────────────
// Validações
// ─────────────────────────────────────────────

export function validarPesoParaRegistro(peso: number): { valido: boolean; erro?: string } {
  if (peso <= 0) return { valido: false, erro: "Peso deve ser maior que zero" };
  if (peso > 10000) return { valido: false, erro: "Peso máximo é 10kg" };
  return { valido: true };
}

export function validarTermoBusca(termo: string): { valido: boolean; erro?: string } {
  if (termo.length < 2) return { valido: false, erro: "Digite pelo menos 2 caracteres" };
  if (termo.length > 100) return { valido: false, erro: "Termo muito longo" };
  return { valido: true };
}

export function podeConfirmar(food: SelectedFood | null, peso: number, isPending: boolean): boolean {
  return food !== null && peso > 0 && !isPending;
}

// ─────────────────────────────────────────────
// Limpeza de input de peso (somente dígitos)
// ─────────────────────────────────────────────

export function limparInputPeso(valor: string): { texto: string; numero: number } {
  const cleaned = valor.replace(/[^0-9]/g, "");
  const num = parseInt(cleaned, 10);
  return {
    texto: cleaned,
    numero: isNaN(num) ? 0 : num,
  };
}

// ─────────────────────────────────────────────
// Verificar se peso corresponde à pesagem pendente
// ─────────────────────────────────────────────

export function pesoCorrespondePendente(
  pesoAtual: number,
  pesagemPendente: PesagemPendente | null
): boolean {
  if (!pesagemPendente) return false;
  return pesoAtual === Math.round(pesagemPendente.peso_gramas);
}

// ─────────────────────────────────────────────
// Extrair pesagem pendente mais recente
// ─────────────────────────────────────────────

export function extrairPesagemPendente(
  pesagens: PesagemPendente[] | undefined
): PesagemPendente | null {
  if (!pesagens || pesagens.length === 0) return null;
  const pendente = pesagens.find((p) => p.status === "PENDENTE");
  return pendente ?? null;
}
