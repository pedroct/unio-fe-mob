import { describe, it, expect, beforeAll } from "bun:test";

const BASE = "http://localhost:5000";

let accessToken = "";
let userId = "";
let deviceId = "";
const testEmail = `xiaomi_test_${Date.now()}@test.com`;
const testMac = "A4:C1:38:99:88:77";

async function register(email: string, password: string) {
  const res = await fetch(`${BASE}/api/auth/register`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
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

function auth(token: string) {
  return { "Content-Type": "application/json", Authorization: `Bearer ${token}` };
}

beforeAll(async () => {
  await register(testEmail, "test1234");
  const loginData = await login(testEmail, "test1234");
  accessToken = loginData.accessToken;
  userId = loginData.user.id;

  const res = await fetch(`${BASE}/api/devices`, {
    method: "POST",
    headers: auth(accessToken),
    body: JSON.stringify({
      name: "Balança Xiaomi Test",
      type: "MISCALE2",
      macAddress: testMac,
      manufacturer: "Xiaomi",
      model: "Mi Scale 2",
    }),
  });
  const device = await res.json();
  deviceId = device.id;
});

describe("Biometria Xiaomi — Preparar Pesagem", () => {
  it("retorna 404 para device inexistente", async () => {
    const res = await fetch(`${BASE}/api/biometria/dispositivos/00000000-0000-0000-0000-000000000000/preparar-pesagem`, {
      method: "POST",
      headers: auth(accessToken),
    });
    expect(res.status).toBe(404);
    const body = await res.json();
    expect(body.erro).toBeDefined();
  });

  it("abre janela de 5 minutos com sucesso", async () => {
    const res = await fetch(`${BASE}/api/biometria/dispositivos/${deviceId}/preparar-pesagem`, {
      method: "POST",
      headers: auth(accessToken),
    });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.em_espera_ate).toBeDefined();
    expect(body.tipo).toBe("MISCALE2");
    expect(body.tipo_display).toBe("Xiaomi Mi Body Composition Scale 2");
    expect(body.mac_address).toBe(testMac);

    const emEspera = new Date(body.em_espera_ate);
    const diff = emEspera.getTime() - Date.now();
    expect(diff).toBeGreaterThan(4 * 60 * 1000);
    expect(diff).toBeLessThanOrEqual(5 * 60 * 1000 + 2000);
  });
});

describe("Biometria Xiaomi — Registrar (scanner)", () => {
  it("rejeita sem janela ativa (MAC desconhecido)", async () => {
    const res = await fetch(`${BASE}/api/biometria/registrar/xiaomi`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ mac_address: "FF:FF:FF:FF:FF:FF", peso: 80.0 }),
    });
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.erro).toContain("Nenhuma janela de pesagem ativa");
  });

  it("registra leitura com janela ativa", async () => {
    await fetch(`${BASE}/api/biometria/dispositivos/${deviceId}/preparar-pesagem`, {
      method: "POST",
      headers: auth(accessToken),
    });

    const res = await fetch(`${BASE}/api/biometria/registrar/xiaomi`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        mac_address: testMac,
        peso: 79.8,
        impedancia: 402,
        data_registro: new Date().toISOString(),
      }),
    });
    expect(res.status).toBe(201);
    const body = await res.json();
    expect(body.sucesso).toBe(true);
    expect(body.duplicata).toBe(false);
    expect(body.dados.peso_kg).toBe(79.8);
    expect(body.usuario_email).toBe(testEmail);
  });

  it("retorna duplicata para mesma leitura em 60s", async () => {
    await fetch(`${BASE}/api/biometria/dispositivos/${deviceId}/preparar-pesagem`, {
      method: "POST",
      headers: auth(accessToken),
    });

    const res = await fetch(`${BASE}/api/biometria/registrar/xiaomi`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        mac_address: testMac,
        peso: 79.8,
        impedancia: 402,
      }),
    });
    expect(res.status).toBe(201);
    const body = await res.json();
    expect(body.sucesso).toBe(true);
    expect(body.duplicata).toBe(true);
  });

  it("converte impedância 0 para null", async () => {
    await fetch(`${BASE}/api/biometria/dispositivos/${deviceId}/preparar-pesagem`, {
      method: "POST",
      headers: auth(accessToken),
    });

    const res = await fetch(`${BASE}/api/biometria/registrar/xiaomi`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        mac_address: testMac,
        peso: 85.0,
        impedancia: 0,
      }),
    });
    expect(res.status).toBe(201);
    const body = await res.json();
    expect(body.sucesso).toBe(true);
    expect(body.duplicata).toBe(false);
  });

  it("converte impedância 65534 para null", async () => {
    await fetch(`${BASE}/api/biometria/dispositivos/${deviceId}/preparar-pesagem`, {
      method: "POST",
      headers: auth(accessToken),
    });

    const res = await fetch(`${BASE}/api/biometria/registrar/xiaomi`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        mac_address: testMac,
        peso: 86.0,
        impedancia: 65534,
      }),
    });
    expect(res.status).toBe(201);
    const body = await res.json();
    expect(body.sucesso).toBe(true);
    expect(body.duplicata).toBe(false);
  });
});

describe("Biometria Xiaomi — Estado Atual", () => {
  it("retorna estado com última leitura", async () => {
    const res = await fetch(`${BASE}/api/biometria/estado-atual`, {
      headers: auth(accessToken),
    });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.peso_atual_kg).toBeDefined();
    expect(body.total_leituras).toBeGreaterThanOrEqual(1);
    expect(body.ultima_leitura).toBeDefined();
    expect(body.ultima_leitura.peso_kg).toBeDefined();
    expect(body.ultima_leitura.origem).toBe("dispositivo");
    expect(body.variacao_peso_7d).toBeDefined();
    expect(body.variacao_peso_30d).toBeDefined();
  });
});

describe("Biometria Xiaomi — Histórico", () => {
  it("retorna pontos e estatísticas", async () => {
    const res = await fetch(`${BASE}/api/biometria/historico?dias=30`, {
      headers: auth(accessToken),
    });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.pontos).toBeDefined();
    expect(Array.isArray(body.pontos)).toBe(true);
    expect(body.pontos.length).toBeGreaterThanOrEqual(1);
    expect(body.pontos[0].peso_kg).toBeDefined();
    expect(body.media_peso_kg).toBeDefined();
    expect(body.peso_minimo_kg).toBeDefined();
    expect(body.peso_maximo_kg).toBeDefined();
  });
});
