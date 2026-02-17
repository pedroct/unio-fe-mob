import { describe, it, expect, beforeAll } from "bun:test";

const BASE = "http://localhost:5000";

let accessToken = "";
let userId = "";

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

describe("Nutrition TBCA E2E", () => {
  beforeAll(async () => {
    const suffix = Date.now();
    await register(`nuttest_${suffix}@test.com`, "Test1234!", `nutuser_${suffix}`);
    const loginRes = await login(`nuttest_${suffix}@test.com`, "Test1234!");
    accessToken = loginRes.accessToken;
    userId = loginRes.user.id;
  });

  describe("TBCA Lookup Endpoints", () => {
    it("GET /api/nutricao/tbca/grupos returns food groups", async () => {
      const res = await fetch(`${BASE}/api/nutricao/tbca/grupos`, {
        headers: authHeaders(accessToken),
      });
      expect(res.status).toBe(200);
      const data = await res.json();
      expect(Array.isArray(data)).toBe(true);
      expect(data.length).toBeGreaterThanOrEqual(10);
      expect(data[0]).toHaveProperty("codigo");
      expect(data[0]).toHaveProperty("descricao");
    });

    it("GET /api/nutricao/tbca/tipos returns food types", async () => {
      const res = await fetch(`${BASE}/api/nutricao/tbca/tipos`, {
        headers: authHeaders(accessToken),
      });
      expect(res.status).toBe(200);
      const data = await res.json();
      expect(Array.isArray(data)).toBe(true);
      expect(data.length).toBeGreaterThanOrEqual(5);
      expect(data[0]).toHaveProperty("codigo");
    });

    it("GET /api/nutricao/tbca/nutrientes returns nutrients", async () => {
      const res = await fetch(`${BASE}/api/nutricao/tbca/nutrientes`, {
        headers: authHeaders(accessToken),
      });
      expect(res.status).toBe(200);
      const data = await res.json();
      expect(Array.isArray(data)).toBe(true);
      expect(data.length).toBeGreaterThanOrEqual(10);
      const energiaNutrient = data.find((n: any) => n.codigo === "ENERGIA");
      expect(energiaNutrient).toBeDefined();
      expect(energiaNutrient.unidade).toBe("kcal");
    });
  });

  describe("TBCA Food Search", () => {
    it("GET /api/nutricao/tbca/alimentos returns paginated results", async () => {
      const res = await fetch(`${BASE}/api/nutricao/tbca/alimentos?limite=5`, {
        headers: authHeaders(accessToken),
      });
      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data).toHaveProperty("itens");
      expect(data).toHaveProperty("total");
      expect(data.itens.length).toBeLessThanOrEqual(5);
      expect(data.total).toBeGreaterThanOrEqual(15);
    });

    it("search by text filters correctly", async () => {
      const res = await fetch(`${BASE}/api/nutricao/tbca/alimentos?q=frango`, {
        headers: authHeaders(accessToken),
      });
      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.itens.length).toBeGreaterThanOrEqual(1);
      expect(data.itens[0].descricao.toLowerCase()).toContain("frango");
    });

    it("GET by ID returns food with composition", async () => {
      const listRes = await fetch(`${BASE}/api/nutricao/tbca/alimentos?q=banana&limite=1`, {
        headers: authHeaders(accessToken),
      });
      const list = await listRes.json();
      const bananaId = list.itens[0].id;

      const res = await fetch(`${BASE}/api/nutricao/tbca/alimentos/${bananaId}`, {
        headers: authHeaders(accessToken),
      });
      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data).toHaveProperty("descricao");
      expect(data).toHaveProperty("composicao");
      expect(Array.isArray(data.composicao)).toBe(true);
      expect(data.composicao.length).toBeGreaterThanOrEqual(5);
    });

    it("GET by codigo returns food", async () => {
      const res = await fetch(`${BASE}/api/nutricao/tbca/alimentos/codigo/F0001`, {
        headers: authHeaders(accessToken),
      });
      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.codigoTbca).toBe("F0001");
      expect(data.descricao.toLowerCase()).toContain("frango");
    });

    it("GET by invalid codigo returns 404", async () => {
      const res = await fetch(`${BASE}/api/nutricao/tbca/alimentos/codigo/INVALID999`, {
        headers: authHeaders(accessToken),
      });
      expect(res.status).toBe(404);
    });
  });

  describe("Nutritional Calculation", () => {
    it("POST /api/nutricao/tbca/calcular computes nutrients for quantity", async () => {
      const listRes = await fetch(`${BASE}/api/nutricao/tbca/alimentos/codigo/A0002`, {
        headers: authHeaders(accessToken),
      });
      const arroz = await listRes.json();

      const res = await fetch(`${BASE}/api/nutricao/tbca/calcular`, {
        method: "POST",
        headers: authHeaders(accessToken),
        body: JSON.stringify({
          alimento_tbca_id: arroz.id,
          quantidade_g: 200,
        }),
      });
      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.quantidade_g).toBe(200);
      expect(data.nutrientes).toHaveProperty("ENERGIA");
      expect(data.nutrientes.ENERGIA.valor).toBe(256);
    });

    it("rejects missing alimento_tbca_id", async () => {
      const res = await fetch(`${BASE}/api/nutricao/tbca/calcular`, {
        method: "POST",
        headers: authHeaders(accessToken),
        body: JSON.stringify({ quantidade_g: 100 }),
      });
      expect(res.status).toBe(422);
    });
  });

  describe("Bridge: TBCA → Consumo", () => {
    let preparedFoodId = "";

    it("POST preparar-para-consumo creates linked food", async () => {
      const tbcaRes = await fetch(`${BASE}/api/nutricao/tbca/alimentos/codigo/E0001`, {
        headers: authHeaders(accessToken),
      });
      const salmon = await tbcaRes.json();

      const res = await fetch(`${BASE}/api/nutricao/alimentos/preparar-para-consumo`, {
        method: "POST",
        headers: authHeaders(accessToken),
        body: JSON.stringify({ alimento_tbca_id: salmon.id }),
      });
      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data).toHaveProperty("alimento_id");
      expect(data.fonte_dados).toBe("TBCA");
      preparedFoodId = data.alimento_id;
    });

    it("deduplication: second call returns same food", async () => {
      const tbcaRes = await fetch(`${BASE}/api/nutricao/tbca/alimentos/codigo/E0001`, {
        headers: authHeaders(accessToken),
      });
      const salmon = await tbcaRes.json();

      const res = await fetch(`${BASE}/api/nutricao/alimentos/preparar-para-consumo`, {
        method: "POST",
        headers: authHeaders(accessToken),
        body: JSON.stringify({ alimento_tbca_id: salmon.id }),
      });
      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.alimento_id).toBe(preparedFoodId);
    });

    it("rejects invalid TBCA ID", async () => {
      const res = await fetch(`${BASE}/api/nutricao/alimentos/preparar-para-consumo`, {
        method: "POST",
        headers: authHeaders(accessToken),
        body: JSON.stringify({ alimento_tbca_id: "00000000-0000-0000-0000-000000000000" }),
      });
      expect(res.status).toBe(404);
    });
  });

  describe("Unified Search", () => {
    it("GET buscar returns both TBCA and legacy foods", async () => {
      const res = await fetch(`${BASE}/api/nutricao/alimentos-unificados/buscar?q=&limite=50`, {
        headers: authHeaders(accessToken),
      });
      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data).toHaveProperty("itens");
      expect(data).toHaveProperty("total");

      const fontes = new Set(data.itens.map((i: any) => i.fonte_dados));
      expect(fontes.has("LEGADO")).toBe(true);
      expect(fontes.has("TBCA")).toBe(true);
    });

    it("filters by fonte=TBCA", async () => {
      const res = await fetch(`${BASE}/api/nutricao/alimentos-unificados/buscar?fonte=TBCA&limite=5`, {
        headers: authHeaders(accessToken),
      });
      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.itens.every((i: any) => i.fonte_dados === "TBCA")).toBe(true);
    });

    it("filters by fonte=LEGADO", async () => {
      const res = await fetch(`${BASE}/api/nutricao/alimentos-unificados/buscar?fonte=LEGADO&limite=5`, {
        headers: authHeaders(accessToken),
      });
      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.itens.every((i: any) => i.fonte_dados === "LEGADO")).toBe(true);
    });

    it("returns normalized macro data for all sources", async () => {
      const res = await fetch(`${BASE}/api/nutricao/alimentos-unificados/buscar?q=frango&limite=10`, {
        headers: authHeaders(accessToken),
      });
      expect(res.status).toBe(200);
      const data = await res.json();
      for (const item of data.itens) {
        expect(item).toHaveProperty("resumo_macros_100g");
        expect(item.resumo_macros_100g).toHaveProperty("calorias");
        expect(item.resumo_macros_100g).toHaveProperty("proteinas");
        expect(item.resumo_macros_100g).toHaveProperty("carboidratos");
        expect(item.resumo_macros_100g).toHaveProperty("gorduras");
      }
    });

    it("rejects invalid fonte", async () => {
      const res = await fetch(`${BASE}/api/nutricao/alimentos-unificados/buscar?fonte=INVALIDO`, {
        headers: authHeaders(accessToken),
      });
      expect(res.status).toBe(422);
    });
  });

  describe("Advanced Diary Registration", () => {
    it("POST registrar-avancado with legacy food ID", async () => {
      const foodsRes = await fetch(`${BASE}/api/foods`, {
        headers: authHeaders(accessToken),
      });
      const foods = await foodsRes.json();
      const food = foods[0];

      const res = await fetch(`${BASE}/api/nutricao/diario/registrar-avancado`, {
        method: "POST",
        headers: authHeaders(accessToken),
        body: JSON.stringify({
          alimento_id: food.id,
          quantidade: 150,
          meal_slot: "breakfast",
          origem: "MANUAL",
        }),
      });
      expect(res.status).toBe(201);
      const data = await res.json();
      expect(data).toHaveProperty("id");
      expect(data.alimento_id).toBe(food.id);
      expect(data.quantidade_g).toBe(150);
      expect(data.meal_slot).toBe("breakfast");
      expect(data).toHaveProperty("macros_calculados");
      expect(data.macros_calculados).toHaveProperty("calorias");
    });

    it("POST registrar-avancado with TBCA ID (auto-prepare)", async () => {
      const tbcaRes = await fetch(`${BASE}/api/nutricao/tbca/alimentos/codigo/N0002`, {
        headers: authHeaders(accessToken),
      });
      const lentilha = await tbcaRes.json();

      const res = await fetch(`${BASE}/api/nutricao/diario/registrar-avancado`, {
        method: "POST",
        headers: authHeaders(accessToken),
        body: JSON.stringify({
          alimento_tbca_id: lentilha.id,
          quantidade: 200,
          meal_slot: "lunch",
          origem: "TBCA",
        }),
      });
      expect(res.status).toBe(201);
      const data = await res.json();
      expect(data).toHaveProperty("id");
      expect(data.alimento_tbca_id).toBe(lentilha.id);
      expect(data.quantidade_g).toBe(200);
      expect(data.macros_calculados.calorias).toBeGreaterThan(0);
    });

    it("rejects when neither alimento_id nor alimento_tbca_id provided", async () => {
      const res = await fetch(`${BASE}/api/nutricao/diario/registrar-avancado`, {
        method: "POST",
        headers: authHeaders(accessToken),
        body: JSON.stringify({
          quantidade: 100,
          meal_slot: "snack",
        }),
      });
      expect(res.status).toBe(422);
    });

    it("rejects zero quantity", async () => {
      const foodsRes = await fetch(`${BASE}/api/foods`, {
        headers: authHeaders(accessToken),
      });
      const foods = await foodsRes.json();

      const res = await fetch(`${BASE}/api/nutricao/diario/registrar-avancado`, {
        method: "POST",
        headers: authHeaders(accessToken),
        body: JSON.stringify({
          alimento_id: foods[0].id,
          quantidade: 0,
          meal_slot: "dinner",
        }),
      });
      expect(res.status).toBe(422);
    });
  });

  describe("Legacy Regression", () => {
    it("GET /api/foods still works", async () => {
      const res = await fetch(`${BASE}/api/foods`, {
        headers: authHeaders(accessToken),
      });
      expect(res.status).toBe(200);
      const data = await res.json();
      expect(Array.isArray(data)).toBe(true);
      expect(data.length).toBeGreaterThanOrEqual(15);
    });

    it("POST /api/meal-entries still works", async () => {
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

    it("GET meal summary includes both legacy and TBCA entries", async () => {
      const today = new Date().toISOString().slice(0, 10);
      const res = await fetch(`${BASE}/api/users/${userId}/meals/summary?date=${today}`, {
        headers: authHeaders(accessToken),
      });
      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data).toHaveProperty("totalCalories");
      expect(data.totalCalories).toBeGreaterThan(0);
    });
  });
});
