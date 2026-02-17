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

describe("Hydration API E2E", () => {
  beforeAll(async () => {
    const suffix = Date.now();
    await register(`hydtest1_${suffix}@test.com`, "Test1234!", `hyduser1_${suffix}`);
    const login1 = await login(`hydtest1_${suffix}@test.com`, "Test1234!");
    accessToken = login1.accessToken;
    userId = login1.user.id;

    await register(`hydtest2_${suffix}@test.com`, "Test1234!", `hyduser2_${suffix}`);
    const login2 = await login(`hydtest2_${suffix}@test.com`, "Test1234!");
    accessToken2 = login2.accessToken;
    userId2 = login2.user.id;
  });

  it("1. Criação de registro e recálculo do resumo", async () => {
    const res1 = await fetch(`${BASE}/api/hidratacao/registros`, {
      method: "POST",
      headers: authHeaders(accessToken),
      body: JSON.stringify({ quantidade_ml: 300, tipo_bebida: "AGUA" }),
    });
    expect(res1.status).toBe(201);
    const data1 = await res1.json();
    expect(data1.id).toBeDefined();
    expect(data1.quantidade_ml).toBe(300);
    expect(data1.tipo_bebida).toBe("AGUA");
    expect(data1.resumo_dia).toBeDefined();
    expect(data1.resumo_dia.consumido_ml).toBe(300);

    const res2 = await fetch(`${BASE}/api/hidratacao/registros`, {
      method: "POST",
      headers: authHeaders(accessToken),
      body: JSON.stringify({ quantidade_ml: 200, tipo_bebida: "cafe" }),
    });
    expect(res2.status).toBe(201);
    const data2 = await res2.json();
    expect(data2.tipo_bebida).toBe("CAFE");
    expect(data2.resumo_dia.consumido_ml).toBe(500);

    const resumoRes = await fetch(`${BASE}/api/hidratacao/resumo`, {
      headers: authHeaders(accessToken),
    });
    expect(resumoRes.status).toBe(200);
    const resumo = await resumoRes.json();
    expect(resumo.consumido_ml).toBe(500);
    expect(resumo.meta_ml).toBe(2500);
    expect(resumo.restante_ml).toBe(2000);
    expect(resumo.atingiu_meta).toBe(false);

    const delRes = await fetch(`${BASE}/api/hidratacao/registros/${data1.id}`, {
      method: "DELETE",
      headers: authHeaders(accessToken),
    });
    expect(delRes.status).toBe(200);
    const delData = await delRes.json();
    expect(delData.removido).toBe(true);
    expect(delData.resumo_dia.consumido_ml).toBe(200);
  });

  it("2. Alterar meta diária", async () => {
    const getRes = await fetch(`${BASE}/api/hidratacao/meta`, {
      headers: authHeaders(accessToken),
    });
    expect(getRes.status).toBe(200);
    const getMeta = await getRes.json();
    expect(getMeta.ml_meta_diaria).toBe(2500);

    const patchRes = await fetch(`${BASE}/api/hidratacao/meta`, {
      method: "PATCH",
      headers: authHeaders(accessToken),
      body: JSON.stringify({ ml_meta_diaria: 3000 }),
    });
    expect(patchRes.status).toBe(200);
    const patchData = await patchRes.json();
    expect(patchData.ml_meta_diaria).toBe(3000);
    expect(patchData.mensagem).toContain("sucesso");

    const resumoRes = await fetch(`${BASE}/api/hidratacao/resumo`, {
      headers: authHeaders(accessToken),
    });
    const resumo = await resumoRes.json();
    expect(resumo.meta_ml).toBe(3000);
  });

  it("3. Isolamento entre usuários (403)", async () => {
    const res = await fetch(`${BASE}/api/hidratacao/registros`, {
      method: "POST",
      headers: authHeaders(accessToken),
      body: JSON.stringify({ quantidade_ml: 500, tipo_bebida: "AGUA" }),
    });
    const data = await res.json();
    const recordId = data.id;

    const delRes = await fetch(`${BASE}/api/hidratacao/registros/${recordId}`, {
      method: "DELETE",
      headers: authHeaders(accessToken2),
    });
    expect(delRes.status).toBe(403);
  });

  it("4. Acesso sem autenticação (401)", async () => {
    const endpoints = [
      { url: `${BASE}/api/hidratacao/meta`, method: "GET" },
      { url: `${BASE}/api/hidratacao/meta`, method: "PATCH" },
      { url: `${BASE}/api/hidratacao/registros`, method: "POST" },
      { url: `${BASE}/api/hidratacao/registros`, method: "GET" },
      { url: `${BASE}/api/hidratacao/resumo`, method: "GET" },
    ];

    for (const ep of endpoints) {
      const res = await fetch(ep.url, {
        method: ep.method,
        headers: { "Content-Type": "application/json" },
      });
      expect(res.status).toBe(401);
    }
  });

  it("5. Validação de campos (422)", async () => {
    const res1 = await fetch(`${BASE}/api/hidratacao/registros`, {
      method: "POST",
      headers: authHeaders(accessToken),
      body: JSON.stringify({ quantidade_ml: -10 }),
    });
    expect(res1.status).toBe(422);

    const res2 = await fetch(`${BASE}/api/hidratacao/registros`, {
      method: "POST",
      headers: authHeaders(accessToken),
      body: JSON.stringify({ quantidade_ml: 100, tipo_bebida: "INVALIDTYPE" }),
    });
    expect(res2.status).toBe(422);

    const res3 = await fetch(`${BASE}/api/hidratacao/meta`, {
      method: "PATCH",
      headers: authHeaders(accessToken),
      body: JSON.stringify({ ml_meta_diaria: 100 }),
    });
    expect(res3.status).toBe(422);

    const res4 = await fetch(`${BASE}/api/hidratacao/meta`, {
      method: "PATCH",
      headers: authHeaders(accessToken),
      body: JSON.stringify({ ml_meta_diaria: 50000 }),
    });
    expect(res4.status).toBe(422);
  });
});
