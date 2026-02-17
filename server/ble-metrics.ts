import { randomUUID } from "crypto";

export interface BleMetrics {
  ingestao: { sucesso: number; erro: number };
  dedup: number;
  rateLimitBloqueios: number;
  associacao: { sucesso: number; erro: number; latenciaMs: number[] };
  descarte: { sucesso: number; erro: number };
}

const metrics: BleMetrics = {
  ingestao: { sucesso: 0, erro: 0 },
  dedup: 0,
  rateLimitBloqueios: 0,
  associacao: { sucesso: 0, erro: 0, latenciaMs: [] },
  descarte: { sucesso: 0, erro: 0 },
};

const MAX_LATENCY_SAMPLES = 1000;

export function incIngestaoSucesso() { metrics.ingestao.sucesso++; }
export function incIngestaoErro() { metrics.ingestao.erro++; }
export function incDedup() { metrics.dedup++; }
export function incRateLimitBloqueio() { metrics.rateLimitBloqueios++; }
export function incAssociacaoSucesso(latenciaMs: number) {
  metrics.associacao.sucesso++;
  metrics.associacao.latenciaMs.push(latenciaMs);
  if (metrics.associacao.latenciaMs.length > MAX_LATENCY_SAMPLES) {
    metrics.associacao.latenciaMs = metrics.associacao.latenciaMs.slice(-MAX_LATENCY_SAMPLES);
  }
}
export function incAssociacaoErro() { metrics.associacao.erro++; }
export function incDescarteSucesso() { metrics.descarte.sucesso++; }
export function incDescarteErro() { metrics.descarte.erro++; }

export function getMetrics(): BleMetrics & { associacao_latencia_media_ms: number | null } {
  const lat = metrics.associacao.latenciaMs;
  const avg = lat.length > 0 ? Math.round(lat.reduce((a, b) => a + b, 0) / lat.length) : null;
  return {
    ...metrics,
    associacao: {
      sucesso: metrics.associacao.sucesso,
      erro: metrics.associacao.erro,
      latenciaMs: lat,
    },
    associacao_latencia_media_ms: avg,
  };
}

export function resetMetrics() {
  metrics.ingestao.sucesso = 0;
  metrics.ingestao.erro = 0;
  metrics.dedup = 0;
  metrics.rateLimitBloqueios = 0;
  metrics.associacao.sucesso = 0;
  metrics.associacao.erro = 0;
  metrics.associacao.latenciaMs = [];
  metrics.descarte.sucesso = 0;
  metrics.descarte.erro = 0;
}

export function generateCorrelationId(): string {
  return `ble-${randomUUID().slice(0, 8)}`;
}

export function auditLog(
  correlationId: string,
  evento: string,
  userId: string,
  detalhes: Record<string, unknown> = {}
) {
  const safe = { ...detalhes };
  delete safe.token;
  delete safe.jwt;
  delete safe.authorization;
  delete safe.password;
  delete safe.pacote_hex_raw;

  console.log(
    JSON.stringify({
      ts: new Date().toISOString(),
      cid: correlationId,
      modulo: "BLE",
      evento,
      userId,
      ...safe,
    })
  );
}
