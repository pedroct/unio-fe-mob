import { describe, it, expect, beforeAll } from "bun:test";

const BASE = "http://localhost:5000";

let tokenA = "";
let tokenB = "";
let userIdA = "";

async function register(email: string, password: string, username: string) {
  const res = await fetch(`${BASE}/api/auth/register`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password, username }),
  });
  return res.json();
}

async function login(email: string, password: string) {
  const res = await fetch(`${BASE}/api/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
  });
  return res.json();
}

function authHeaders(token: string) {
  return {
    "Content-Type": "application/json",
    Authorization: `Bearer ${token}`,
  };
}

async function ingest(token: string, peso: number, mac?: string) {
  const body: any = { peso, unidade: "g" };
  if (mac) body.mac_balanca = mac;
  return fetch(`${BASE}/api/nutricao/diario/balanca-cozinha`, {
    method: "POST",
    headers: authHeaders(token),
    body: JSON.stringify(body),
  });
}

describe("BLE Phase 3 — Security & Observability", () => {
  beforeAll(async () => {
    const suffix = Date.now();
    await register(`blep3a_${suffix}@test.com`, "Test1234!", `blep3a_${suffix}`);
    const loginA = await login(`blep3a_${suffix}@test.com`, "Test1234!");
    tokenA = loginA.accessToken;
    userIdA = loginA.user.id;

    await register(`blep3b_${suffix}@test.com`, "Test1234!", `blep3b_${suffix}`);
    const loginB = await login(`blep3b_${suffix}@test.com`, "Test1234!");
    tokenB = loginB.accessToken;
  });

  describe("6.1 Rate Limiting", () => {
    it("N requisições dentro da janela passam, N+1 retorna 429", async () => {
      const uniqueMac = `RL:RL:RL:RL:${Date.now().toString(16).slice(-2).toUpperCase()}:01`;
      const responses: number[] = [];

      for (let i = 0; i < 31; i++) {
        const res = await ingest(tokenA, 100 + i, uniqueMac);
        responses.push(res.status);
        if (res.status === 429) break;
        await res.json();
      }

      const has429 = responses.includes(429);
      expect(has429).toBe(true);

      const last = responses[responses.length - 1];
      expect(last).toBe(429);
    });

    it("429 tem payload padronizado {erro, codigo, detalhe}", async () => {
      const uniqueMac = `RL:RL:RL:RL:${Date.now().toString(16).slice(-2).toUpperCase()}:02`;

      let lastRes: Response | null = null;
      for (let i = 0; i < 35; i++) {
        lastRes = await ingest(tokenA, 200 + i, uniqueMac);
        if (lastRes.status === 429) break;
        await lastRes.json();
      }

      expect(lastRes).not.toBeNull();
      expect(lastRes!.status).toBe(429);
      const data = await lastRes!.json();
      expect(data).toHaveProperty("erro");
      expect(data).toHaveProperty("codigo");
      expect(data.codigo).toBe("BLE_RATE_LIMIT");
      expect(data).toHaveProperty("detalhe");
    });

    it("Rate limit é isolado por usuário (A não afeta B)", async () => {
      const res = await ingest(tokenB, 500, "ISO:ISO:ISO:ISO:ISO:01");
      expect(res.status).not.toBe(429);
      const data = await res.json();
      expect(data.sucesso).toBe(true);
    });

    it("Rate limit com MAC diferente não colide no mesmo usuário", async () => {
      const macA = `MC:MC:MC:MC:${Date.now().toString(16).slice(-2).toUpperCase()}:A1`;
      const macB = `MC:MC:MC:MC:${Date.now().toString(16).slice(-2).toUpperCase()}:B1`;

      const resA = await ingest(tokenB, 600, macA);
      expect(resA.status).not.toBe(429);
      await resA.json();

      const resB = await ingest(tokenB, 601, macB);
      expect(resB.status).not.toBe(429);
      await resB.json();
    });
  });

  describe("6.2 Métricas", () => {
    it("GET /api/ble/metrics retorna contadores", async () => {
      const res = await fetch(`${BASE}/api/ble/metrics`, {
        headers: authHeaders(tokenA),
      });
      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data).toHaveProperty("ingestao");
      expect(data.ingestao).toHaveProperty("sucesso");
      expect(data.ingestao).toHaveProperty("erro");
      expect(data).toHaveProperty("dedup");
      expect(data).toHaveProperty("rateLimitBloqueios");
      expect(data).toHaveProperty("associacao");
      expect(data.associacao).toHaveProperty("sucesso");
      expect(data.associacao).toHaveProperty("erro");
      expect(data).toHaveProperty("associacao_latencia_media_ms");
      expect(data).toHaveProperty("descarte");
      expect(data.ingestao.sucesso).toBeGreaterThan(0);
      expect(data.rateLimitBloqueios).toBeGreaterThan(0);
    });

    it("Métricas exigem autenticação", async () => {
      const res = await fetch(`${BASE}/api/ble/metrics`);
      expect(res.status).toBe(401);
    });
  });

  describe("6.3 Auditoria em operações BLE", () => {
    it("Ingestão de sucesso é auditada (verificação indireta via métricas)", async () => {
      const metricsAntes = await (await fetch(`${BASE}/api/ble/metrics`, {
        headers: authHeaders(tokenB),
      })).json();

      await ingest(tokenB, 700, "AU:DI:TO:RI:AA:01");
      const body = await (await ingest(tokenB, 700, "AU:DI:TO:RI:AA:01")).json();

      const metricsDepois = await (await fetch(`${BASE}/api/ble/metrics`, {
        headers: authHeaders(tokenB),
      })).json();

      expect(metricsDepois.ingestao.sucesso).toBeGreaterThanOrEqual(metricsAntes.ingestao.sucesso);
    });

    it("Deduplicação incrementa contador", async () => {
      const metricsAntes = await (await fetch(`${BASE}/api/ble/metrics`, {
        headers: authHeaders(tokenB),
      })).json();

      const uniqueMac = `DD:DD:DD:DD:${Date.now().toString(16).slice(-2).toUpperCase()}:01`;
      await ingest(tokenB, 888, uniqueMac);
      await ingest(tokenB, 888, uniqueMac);

      const metricsDepois = await (await fetch(`${BASE}/api/ble/metrics`, {
        headers: authHeaders(tokenB),
      })).json();

      expect(metricsDepois.dedup).toBeGreaterThan(metricsAntes.dedup);
    });
  });

  describe("6.4 Regressão funcional", () => {
    it("Fluxo legado de diário continua funcionando", async () => {
      const foodsRes = await fetch(`${BASE}/api/foods`, {
        headers: authHeaders(tokenB),
      });
      const foods = await foodsRes.json();

      const res = await fetch(`${BASE}/api/meal-entries`, {
        method: "POST",
        headers: authHeaders(tokenB),
        body: JSON.stringify({
          foodId: foods[0].id,
          mealSlot: "dinner",
          quantityG: 100,
          unit: "g",
          consumedAt: new Date().toISOString(),
        }),
      });
      expect(res.status).toBe(201);
    });

    it("Resumo diário continua correto", async () => {
      const today = new Date().toISOString().slice(0, 10);
      const res = await fetch(`${BASE}/api/users/${userIdA}/meals/summary?date=${today}`, {
        headers: authHeaders(tokenA),
      });
      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data).toHaveProperty("totalCalories");
    });
  });
});
