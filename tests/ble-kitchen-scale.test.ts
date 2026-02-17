import { describe, it, expect, beforeAll } from "bun:test";

const BASE = "http://localhost:5000";

let accessToken = "";
let accessToken2 = "";
let userId = "";
let userId2 = "";

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

function makeHex14B(weightGrams: number, unit: number = 0x01, stable: boolean = true): string {
  const buf = Buffer.alloc(14);
  const ctrl = (stable ? 0x20 : 0x00) | (unit & 0x0F);
  buf[0] = ctrl;
  buf.writeUInt16BE(weightGrams, 11);
  return buf.toString("hex");
}

function makeHex20B(weightGrams: number, unit: number = 0x01, stable: boolean = true): string {
  const buf = Buffer.alloc(20);
  const ctrl = (stable ? 0x20 : 0x00) | (unit & 0x0F);
  buf[0] = ctrl;
  buf.writeUInt16BE(weightGrams, 3);
  return buf.toString("hex");
}

describe("BLE Kitchen Scale E2E", () => {
  beforeAll(async () => {
    const suffix = Date.now();
    await register(`bletest1_${suffix}@test.com`, "Test1234!", `bleuser1_${suffix}`);
    const login1 = await login(`bletest1_${suffix}@test.com`, "Test1234!");
    accessToken = login1.accessToken;
    userId = login1.user.id;

    await register(`bletest2_${suffix}@test.com`, "Test1234!", `bleuser2_${suffix}`);
    const login2 = await login(`bletest2_${suffix}@test.com`, "Test1234!");
    accessToken2 = login2.accessToken;
    userId2 = login2.user.id;
  });

  describe("5.1 Ingestão e parsing", () => {
    it("1. Ingestão por pacote_hex válido 14B cria pendência", async () => {
      const hex = makeHex14B(250);
      const res = await fetch(`${BASE}/api/nutricao/diario/balanca-cozinha`, {
        method: "POST",
        headers: authHeaders(accessToken),
        body: JSON.stringify({ pacote_hex: hex }),
      });
      expect(res.status).toBe(201);
      const data = await res.json();
      expect(data.sucesso).toBe(true);
      expect(data.peso_gramas).toBe(250);
      expect(data.aguardando_alimento).toBe(true);
      expect(data.pesagem_id).toBeDefined();
    });

    it("2. Ingestão por pacote_hex válido 20B cria pendência", async () => {
      const hex = makeHex20B(180);
      const res = await fetch(`${BASE}/api/nutricao/diario/balanca-cozinha`, {
        method: "POST",
        headers: authHeaders(accessToken),
        body: JSON.stringify({ pacote_hex: hex }),
      });
      expect(res.status).toBe(201);
      const data = await res.json();
      expect(data.sucesso).toBe(true);
      expect(data.peso_gramas).toBe(180);
      expect(data.aguardando_alimento).toBe(true);
    });

    it("3. pacote_hex inválido retorna erro 400", async () => {
      const res = await fetch(`${BASE}/api/nutricao/diario/balanca-cozinha`, {
        method: "POST",
        headers: authHeaders(accessToken),
        body: JSON.stringify({ pacote_hex: "ZZZZ" }),
      });
      expect(res.status).toBe(400);
      const data = await res.json();
      expect(data.error).toContain("inválido");
    });

    it("3b. pacote_hex com tamanho errado retorna 400", async () => {
      const res = await fetch(`${BASE}/api/nutricao/diario/balanca-cozinha`, {
        method: "POST",
        headers: authHeaders(accessToken),
        body: JSON.stringify({ pacote_hex: "aabb" }),
      });
      expect(res.status).toBe(400);
      const data = await res.json();
      expect(data.error).toContain("tamanho");
    });

    it("4. peso manual com unidade válida é convertido corretamente", async () => {
      const res = await fetch(`${BASE}/api/nutricao/diario/balanca-cozinha`, {
        method: "POST",
        headers: authHeaders(accessToken),
        body: JSON.stringify({ peso: 10, unidade: "oz" }),
      });
      expect(res.status).toBe(201);
      const data = await res.json();
      expect(data.sucesso).toBe(true);
      expect(data.peso_gramas).toBeCloseTo(283.5, 0);
      expect(data.unidade_original).toBe("oz");
    });

    it("4b. peso manual com unidade desconhecida usa fallback", async () => {
      const res = await fetch(`${BASE}/api/nutricao/diario/balanca-cozinha`, {
        method: "POST",
        headers: authHeaders(accessToken),
        body: JSON.stringify({ peso: 100, unidade: "xpto" }),
      });
      expect(res.status).toBe(201);
      const data = await res.json();
      expect(data.peso_gramas).toBe(100);
    });

    it("4c. peso <= 0 é rejeitado", async () => {
      const res = await fetch(`${BASE}/api/nutricao/diario/balanca-cozinha`, {
        method: "POST",
        headers: authHeaders(accessToken),
        body: JSON.stringify({ peso: 0, unidade: "g" }),
      });
      expect(res.status).toBe(400);
    });

    it("4d. peso acima de 5000g é rejeitado", async () => {
      const res = await fetch(`${BASE}/api/nutricao/diario/balanca-cozinha`, {
        method: "POST",
        headers: authHeaders(accessToken),
        body: JSON.stringify({ peso: 6000, unidade: "g" }),
      });
      expect(res.status).toBe(400);
      const data = await res.json();
      expect(data.error).toContain("5000");
    });

    it("4e. sem peso e sem pacote_hex retorna 422", async () => {
      const res = await fetch(`${BASE}/api/nutricao/diario/balanca-cozinha`, {
        method: "POST",
        headers: authHeaders(accessToken),
        body: JSON.stringify({}),
      });
      expect(res.status).toBe(422);
    });
  });

  describe("5.2 Deduplicação e idempotência", () => {
    it("5. Mesmo payload em janela curta não duplica pendência", async () => {
      const uniqueMac = `AA:BB:CC:DD:${Date.now().toString(16).slice(-2).toUpperCase()}:01`;
      const payload = { peso: 333, unidade: "g", mac_balanca: uniqueMac };

      const res1 = await fetch(`${BASE}/api/nutricao/diario/balanca-cozinha`, {
        method: "POST",
        headers: authHeaders(accessToken),
        body: JSON.stringify(payload),
      });
      expect(res1.status).toBe(201);
      const data1 = await res1.json();
      expect(data1.duplicata).toBeUndefined();

      const res2 = await fetch(`${BASE}/api/nutricao/diario/balanca-cozinha`, {
        method: "POST",
        headers: authHeaders(accessToken),
        body: JSON.stringify(payload),
      });
      expect(res2.status).toBe(200);
      const data2 = await res2.json();
      expect(data2.duplicata).toBe(true);
      expect(data2.pesagem_id).toBe(data1.pesagem_id);
      expect(data2.mensagem).toContain("duplicada");
    });

    it("6. Payload com variação de peso cria novo item", async () => {
      const uniqueMac = `AA:BB:CC:DD:${Date.now().toString(16).slice(-2).toUpperCase()}:02`;

      const res1 = await fetch(`${BASE}/api/nutricao/diario/balanca-cozinha`, {
        method: "POST",
        headers: authHeaders(accessToken),
        body: JSON.stringify({ peso: 400, unidade: "g", mac_balanca: uniqueMac }),
      });
      expect(res1.status).toBe(201);
      const data1 = await res1.json();

      const res2 = await fetch(`${BASE}/api/nutricao/diario/balanca-cozinha`, {
        method: "POST",
        headers: authHeaders(accessToken),
        body: JSON.stringify({ peso: 410, unidade: "g", mac_balanca: uniqueMac }),
      });
      expect(res2.status).toBe(201);
      const data2 = await res2.json();
      expect(data2.pesagem_id).not.toBe(data1.pesagem_id);
      expect(data2.duplicata).toBeUndefined();
    });
  });

  describe("5.3 Associação e descarte", () => {
    let pendingPesagemId = "";
    let pendingPesagemId2 = "";

    beforeAll(async () => {
      const res1 = await fetch(`${BASE}/api/nutricao/diario/balanca-cozinha`, {
        method: "POST",
        headers: authHeaders(accessToken),
        body: JSON.stringify({ peso: 150, unidade: "g", mac_balanca: "11:22:33:44:55:A1" }),
      });
      const d1 = await res1.json();
      pendingPesagemId = d1.pesagem_id;

      const res2 = await fetch(`${BASE}/api/nutricao/diario/balanca-cozinha`, {
        method: "POST",
        headers: authHeaders(accessToken),
        body: JSON.stringify({ peso: 200, unidade: "g", mac_balanca: "11:22:33:44:55:A2" }),
      });
      const d2 = await res2.json();
      pendingPesagemId2 = d2.pesagem_id;
    });

    it("7. Associar pendência cria registro alimentar e muda status", async () => {
      const foodsRes = await fetch(`${BASE}/api/foods`, {
        headers: authHeaders(accessToken),
      });
      const foods = await foodsRes.json();
      const foodId = foods[0].id;

      const res = await fetch(`${BASE}/api/nutricao/diario/pesagens-pendentes/${pendingPesagemId}/associar`, {
        method: "POST",
        headers: authHeaders(accessToken),
        body: JSON.stringify({ alimento_id: foodId, meal_slot: "lunch" }),
      });
      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.sucesso).toBe(true);
      expect(data.registro_id).toBeDefined();
      expect(data.macros_calculados).toHaveProperty("calorias");
    });

    it("8. Associar pendência inexistente retorna 404", async () => {
      const res = await fetch(`${BASE}/api/nutricao/diario/pesagens-pendentes/00000000-0000-0000-0000-000000000000/associar`, {
        method: "POST",
        headers: authHeaders(accessToken),
        body: JSON.stringify({ alimento_id: "00000000-0000-0000-0000-000000000001" }),
      });
      expect(res.status).toBe(404);
    });

    it("9. Associar pendência já associada retorna 400", async () => {
      const foodsRes = await fetch(`${BASE}/api/foods`, {
        headers: authHeaders(accessToken),
      });
      const foods = await foodsRes.json();

      const res = await fetch(`${BASE}/api/nutricao/diario/pesagens-pendentes/${pendingPesagemId}/associar`, {
        method: "POST",
        headers: authHeaders(accessToken),
        body: JSON.stringify({ alimento_id: foods[0].id }),
      });
      expect(res.status).toBe(400);
      const data = await res.json();
      expect(data.error).toContain("ASSOCIADA");
    });

    it("10. Descartar pendência muda status sem exclusão física", async () => {
      const res = await fetch(`${BASE}/api/nutricao/diario/pesagens-pendentes/${pendingPesagemId2}`, {
        method: "DELETE",
        headers: authHeaders(accessToken),
      });
      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.sucesso).toBe(true);
      expect(data.status).toBe("DESCARTADA");
    });

    it("11. Descartar pendência já associada retorna 400", async () => {
      const res = await fetch(`${BASE}/api/nutricao/diario/pesagens-pendentes/${pendingPesagemId}`, {
        method: "DELETE",
        headers: authHeaders(accessToken),
      });
      expect(res.status).toBe(400);
      const data = await res.json();
      expect(data.error).toContain("associada");
    });
  });

  describe("5.3b Concorrência na associação", () => {
    it("Duas associações simultâneas da mesma pesagem: apenas 1 sucesso", async () => {
      const createRes = await fetch(`${BASE}/api/nutricao/diario/balanca-cozinha`, {
        method: "POST",
        headers: authHeaders(accessToken),
        body: JSON.stringify({ peso: 321, unidade: "g", mac_balanca: "CC:CC:CC:CC:CC:01" }),
      });
      const createData = await createRes.json();
      const pesagemId = createData.pesagem_id;

      const foodsRes = await fetch(`${BASE}/api/foods`, {
        headers: authHeaders(accessToken),
      });
      const foods = await foodsRes.json();
      const foodId = foods[0].id;

      const associarPayload = JSON.stringify({ alimento_id: foodId, meal_slot: "lunch" });
      const url = `${BASE}/api/nutricao/diario/pesagens-pendentes/${pesagemId}/associar`;

      const [res1, res2] = await Promise.all([
        fetch(url, { method: "POST", headers: authHeaders(accessToken), body: associarPayload }),
        fetch(url, { method: "POST", headers: authHeaders(accessToken), body: associarPayload }),
      ]);

      const statuses = [res1.status, res2.status].sort();
      expect(statuses).toEqual([200, 400]);

      const successRes = res1.status === 200 ? res1 : res2;
      const failRes = res1.status === 400 ? res1 : res2;

      const successData = await successRes.json();
      expect(successData.sucesso).toBe(true);
      expect(successData.registro_id).toBeDefined();

      const failData = await failRes.json();
      expect(failData.error).toBeDefined();

      const pendentesRes = await fetch(`${BASE}/api/nutricao/diario/pesagens-pendentes`, {
        headers: authHeaders(accessToken),
      });
      const pendentesData = await pendentesRes.json();
      const found = pendentesData.itens.find((i: any) => i.id === pesagemId);
      expect(found).toBeUndefined();
    });
  });

  describe("5.4 Segurança e isolamento", () => {
    let user1PesagemId = "";

    beforeAll(async () => {
      const res = await fetch(`${BASE}/api/nutricao/diario/balanca-cozinha`, {
        method: "POST",
        headers: authHeaders(accessToken),
        body: JSON.stringify({ peso: 777, unidade: "g", mac_balanca: "CC:DD:EE:FF:00:11" }),
      });
      const data = await res.json();
      user1PesagemId = data.pesagem_id;
    });

    it("12. Usuário B não pode listar pendências do usuário A", async () => {
      const res = await fetch(`${BASE}/api/nutricao/diario/pesagens-pendentes`, {
        headers: authHeaders(accessToken2),
      });
      expect(res.status).toBe(200);
      const data = await res.json();
      const ids = data.itens.map((i: any) => i.id);
      expect(ids).not.toContain(user1PesagemId);
    });

    it("12b. Usuário B não pode associar pendência do usuário A", async () => {
      const foodsRes = await fetch(`${BASE}/api/foods`, {
        headers: authHeaders(accessToken2),
      });
      const foods = await foodsRes.json();

      const res = await fetch(`${BASE}/api/nutricao/diario/pesagens-pendentes/${user1PesagemId}/associar`, {
        method: "POST",
        headers: authHeaders(accessToken2),
        body: JSON.stringify({ alimento_id: foods[0].id }),
      });
      expect(res.status).toBe(404);
    });

    it("12c. Usuário B não pode descartar pendência do usuário A", async () => {
      const res = await fetch(`${BASE}/api/nutricao/diario/pesagens-pendentes/${user1PesagemId}`, {
        method: "DELETE",
        headers: authHeaders(accessToken2),
      });
      expect(res.status).toBe(404);
    });

    it("13. Endpoint BLE exige autenticação", async () => {
      const res = await fetch(`${BASE}/api/nutricao/diario/balanca-cozinha`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ peso: 100, unidade: "g" }),
      });
      expect(res.status).toBe(401);
    });
  });

  describe("5.5 Regressão funcional", () => {
    it("15. Fluxo legado de diário continua funcionando", async () => {
      const foodsRes = await fetch(`${BASE}/api/foods`, {
        headers: authHeaders(accessToken),
      });
      const foods = await foodsRes.json();

      const res = await fetch(`${BASE}/api/meal-entries`, {
        method: "POST",
        headers: authHeaders(accessToken),
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

    it("16. Resumo diário inclui registros originados por BLE", async () => {
      const today = new Date().toISOString().slice(0, 10);
      const res = await fetch(`${BASE}/api/users/${userId}/meals/summary?date=${today}`, {
        headers: authHeaders(accessToken),
      });
      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.totalCalories).toBeGreaterThan(0);
    });

    it("GET pesagens-pendentes lista itens pendentes do usuário", async () => {
      const res = await fetch(`${BASE}/api/nutricao/diario/pesagens-pendentes`, {
        headers: authHeaders(accessToken),
      });
      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data).toHaveProperty("itens");
      expect(data).toHaveProperty("total");
      expect(Array.isArray(data.itens)).toBe(true);
    });
  });
});
