import type { Express, Request, Response, NextFunction } from "express";
import { type Server } from "http";
import { storage } from "./storage";
import bcrypt from "bcrypt";
import rateLimit from "express-rate-limit";
import {
  insertUserSchema,
  insertDeviceSchema,
  insertBodyRecordSchema,
  insertGoalSchema,
  insertFoodSchema,
  insertMealEntrySchema,
  insertFoodStockSchema,
  insertPurchaseRecordSchema,
  insertHydrationRecordSchema,
  createHydrationSchema,
  updateMetaSchema,
  BEVERAGE_TYPES,
  syncPullQuerySchema,
  syncPushRequestSchema,
  updateProfileSchema,
  prepararParaConsumoSchema,
  registrarAvancadoSchema,
  calcularNutricionalSchema,
  ingestaoBalancaSchema,
  associarPesagemSchema,
  UNIDADES_BALANCA,
} from "@shared/schema";
import {
  parseIcomonPacket,
  convertToGrams,
  validatePhysicalLimits,
  buildDedupSignature,
} from "./ble-parser";
import {
  generateCorrelationId,
  auditLog,
  incIngestaoSucesso,
  incIngestaoErro,
  incDedup,
  incRateLimitBloqueio,
  incAssociacaoSucesso,
  incAssociacaoErro,
  incDescarteSucesso,
  incDescarteErro,
  getMetrics,
} from "./ble-metrics";
import { ZodError } from "zod";
import { fromZodError } from "zod-validation-error";
import {
  generateAccessToken,
  generateRefreshToken,
  createAuthSession,
  findValidSession,
  rotateRefreshToken,
  revokeSession,
  revokeAllUserSessions,
  incrementTokenVersion,
  requireAuth,
  setRefreshCookie,
  clearRefreshCookie,
  getClientIp,
} from "./auth";

function handleZodError(err: unknown) {
  if (err instanceof ZodError) {
    return { status: 400, body: { error: fromZodError(err).message } };
  }
  return { status: 500, body: { error: String(err) } };
}

function handleZodFieldErrors(err: unknown) {
  if (err instanceof ZodError) {
    const errors = err.issues.map((issue) => ({
      field: issue.path.join(".") || "unknown",
      message: issue.message,
    }));
    return { status: 400, body: { errors } };
  }
  return { status: 500, body: { errors: [{ field: "unknown", message: String(err) }] } };
}

const PROFILE_FIELDS = ["displayName", "email", "heightCm", "birthDate", "sex", "activityLevel", "scaleMac", "avatarUrl"] as const;

function sanitizeProfile(user: any) {
  const result: Record<string, any> = {};
  for (const key of PROFILE_FIELDS) {
    result[key] = user[key] ?? null;
  }
  return result;
}

const DATE_FIELDS = ["createdAt", "updatedAt", "deletedAt", "measuredAt", "expiresAt", "syncedAt", "lastSeenAt", "startDate", "endDate", "consumedAt"];
function coerceDates(data: Record<string, any>): Record<string, any> {
  const result = { ...data };
  for (const key of DATE_FIELDS) {
    if (key in result && typeof result[key] === "string") {
      result[key] = new Date(result[key]);
    }
  }
  return result;
}

function sanitizeUser(user: any) {
  const { passwordHash, tokenVersion, failedLoginAttempts, lastLoginIp, lastLoginUserAgent, ...rest } = user;
  return rest;
}


function getUserId(req: Request): string {
  return (req as any).userId;
}

const loginLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 5,
  keyGenerator: (req) => {
    const ip = getClientIp(req);
    const email = req.body?.email || "unknown";
    return `${ip}:${email}`;
  },
  handler: (_req, res) => {
    res.status(429).json({
      error: "Muitas tentativas. Aguarde um momento antes de tentar novamente.",
      code: "RATE_LIMITED",
    });
  },
  standardHeaders: true,
  legacyHeaders: false,
});

const refreshLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 10,
  keyGenerator: (req) => getClientIp(req),
  handler: (_req, res) => {
    res.status(429).json({
      error: "Muitas tentativas de renovação. Aguarde.",
      code: "RATE_LIMITED",
    });
  },
  standardHeaders: true,
  legacyHeaders: false,
});

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {

  // ── Auth ──
  app.post("/api/auth/register", loginLimiter, async (req, res) => {
    try {
      const { email, password, displayName } = req.body;
      if (!email || !password) {
        return res.status(400).json({ error: "E-mail e senha são obrigatórios." });
      }
      if (password.length < 6) {
        return res.status(400).json({ error: "A senha deve ter pelo menos 6 caracteres." });
      }

      const existing = await storage.getUserByEmail(email);
      if (existing) {
        return res.status(409).json({ error: "Este e-mail já está em uso." });
      }

      const passwordHash = await bcrypt.hash(password, 10);
      const username = email.split("@")[0] + "_" + Date.now().toString(36);

      const user = await storage.createUser({
        username,
        email,
        passwordHash,
        displayName: displayName || email.split("@")[0],
      });

      const ip = getClientIp(req);
      const userAgent = req.headers["user-agent"] || "";

      await storage.updateUser(user.id, {
        lastLoginAt: new Date(),
        lastLoginIp: ip,
        lastLoginUserAgent: userAgent,
      } as any);

      const accessToken = generateAccessToken(user.id, 0);
      const refreshToken = generateRefreshToken();
      await createAuthSession(user.id, refreshToken, ip, userAgent);

      setRefreshCookie(res, refreshToken);
      res.status(201).json({ user: sanitizeUser(user), accessToken });
    } catch (err) {
      const { status, body } = handleZodError(err);
      res.status(status).json(body);
    }
  });

  app.post("/api/auth/login", loginLimiter, async (req, res) => {
    try {
      const { email, password } = req.body;
      if (!email || !password) {
        return res.status(400).json({ error: "E-mail e senha são obrigatórios." });
      }

      const user = await storage.getUserByEmail(email);
      if (!user || !user.passwordHash) {
        return res.status(401).json({ error: "E-mail ou senha incorretos." });
      }

      const valid = await bcrypt.compare(password, user.passwordHash);
      if (!valid) {
        await storage.updateUser(user.id, {
          failedLoginAttempts: (user.failedLoginAttempts || 0) + 1,
        } as any);
        return res.status(401).json({ error: "E-mail ou senha incorretos." });
      }

      const ip = getClientIp(req);
      const userAgent = req.headers["user-agent"] || "";

      await storage.updateUser(user.id, {
        failedLoginAttempts: 0,
        lastLoginAt: new Date(),
        lastLoginIp: ip,
        lastLoginUserAgent: userAgent,
      } as any);

      const accessToken = generateAccessToken(user.id, user.tokenVersion);
      const refreshToken = generateRefreshToken();
      await createAuthSession(user.id, refreshToken, ip, userAgent);

      setRefreshCookie(res, refreshToken);
      res.json({ user: sanitizeUser(user), accessToken });
    } catch (err) {
      res.status(500).json({ error: "Erro interno ao fazer login." });
    }
  });

  app.post("/api/auth/refresh", refreshLimiter, async (req, res) => {
    try {
      const refreshToken = req.cookies?.refreshToken;
      if (!refreshToken) {
        return res.status(401).json({ error: "Token de atualização ausente.", code: "NO_REFRESH_TOKEN" });
      }

      const session = await findValidSession(refreshToken);
      if (!session) {
        clearRefreshCookie(res);
        return res.status(401).json({ error: "Sessão inválida ou expirada.", code: "INVALID_SESSION" });
      }

      const user = await storage.getUser(session.userId);
      if (!user) {
        clearRefreshCookie(res);
        return res.status(401).json({ error: "Usuário não encontrado.", code: "USER_NOT_FOUND" });
      }

      const ip = getClientIp(req);
      const userAgent = req.headers["user-agent"] || "";
      const newRefreshToken = generateRefreshToken();

      await rotateRefreshToken(session, newRefreshToken, ip, userAgent);

      const accessToken = generateAccessToken(user.id, user.tokenVersion);
      setRefreshCookie(res, newRefreshToken);
      res.json({ user: sanitizeUser(user), accessToken });
    } catch (err) {
      clearRefreshCookie(res);
      res.status(500).json({ error: "Erro ao renovar sessão." });
    }
  });

  app.post("/api/auth/logout", async (req, res) => {
    try {
      const refreshToken = req.cookies?.refreshToken;
      if (refreshToken) {
        await revokeSession(refreshToken);
      }
      clearRefreshCookie(res);
      res.json({ ok: true });
    } catch {
      res.status(500).json({ error: "Erro ao encerrar sessão." });
    }
  });

  app.post("/api/auth/logout-all", requireAuth, async (req, res) => {
    try {
      const userId = getUserId(req);
      await revokeAllUserSessions(userId);
      await incrementTokenVersion(userId);
      const refreshToken = req.cookies?.refreshToken;
      if (refreshToken) {
        clearRefreshCookie(res);
      }
      res.json({ ok: true });
    } catch {
      res.status(500).json({ error: "Erro ao encerrar todas as sessões." });
    }
  });

  app.get("/api/auth/me", requireAuth, async (req, res) => {
    const userId = getUserId(req);
    const user = await storage.getUser(userId);
    if (!user) {
      return res.status(401).json({ error: "Usuário não encontrado." });
    }
    res.json(sanitizeUser(user));
  });

  app.get("/api/auth/profile", requireAuth, async (req, res) => {
    const userId = getUserId(req);
    const user = await storage.getUser(userId);
    if (!user) {
      return res.status(401).json({ error: "Usuário não encontrado." });
    }
    res.json(sanitizeProfile(user));
  });

  app.patch("/api/auth/profile", requireAuth, async (req, res) => {
    try {
      const userId = getUserId(req);
      const parsed = updateProfileSchema.parse(req.body);
      const updateData: Record<string, any> = { displayName: parsed.displayName };
      if (parsed.birthDate !== undefined) updateData.birthDate = parsed.birthDate;
      if (parsed.heightCm !== undefined) updateData.heightCm = parsed.heightCm;
      if (parsed.sex !== undefined) updateData.sex = parsed.sex;
      if (parsed.activityLevel !== undefined) updateData.activityLevel = parsed.activityLevel;
      if (parsed.scaleMac !== undefined) updateData.scaleMac = parsed.scaleMac;

      const user = await storage.updateUser(userId, updateData as any);
      if (!user) {
        return res.status(404).json({ errors: [{ field: "unknown", message: "Usuário não encontrado." }] });
      }
      res.json(sanitizeProfile(user));
    } catch (err) {
      const { status, body } = handleZodFieldErrors(err);
      res.status(status).json(body);
    }
  });

  // ── Users ──
  app.get("/api/users/:id", requireAuth, async (req, res) => {
    if (req.params.id !== getUserId(req)) return res.status(403).json({ error: "Acesso negado." });
    const user = await storage.getUser(req.params.id);
    if (!user) return res.status(404).json({ error: "User not found" });
    res.json(sanitizeUser(user));
  });

  app.patch("/api/users/:id", requireAuth, async (req, res) => {
    try {
      if (req.params.id !== getUserId(req)) return res.status(403).json({ error: "Acesso negado." });
      const data = insertUserSchema.partial().parse(req.body);
      const user = await storage.updateUser(req.params.id, data);
      if (!user) return res.status(404).json({ error: "User not found" });
      res.json(sanitizeUser(user));
    } catch (err) {
      const { status, body } = handleZodError(err);
      res.status(status).json(body);
    }
  });

  app.delete("/api/users/:id", requireAuth, async (req, res) => {
    if (req.params.id !== getUserId(req)) return res.status(403).json({ error: "Acesso negado." });
    await storage.softDeleteUser(req.params.id);
    res.status(204).end();
  });

  // ── Devices ──
  app.get("/api/users/:userId/devices", requireAuth, async (req, res) => {
    if (req.params.userId !== getUserId(req)) return res.status(403).json({ error: "Acesso negado." });
    const devs = await storage.getDevicesByUser(req.params.userId);
    res.json(devs);
  });

  app.get("/api/devices/:id", requireAuth, async (req, res) => {
    const d = await storage.getDevice(req.params.id);
    if (!d) return res.status(404).json({ error: "Device not found" });
    res.json(d);
  });

  app.post("/api/devices", requireAuth, async (req, res) => {
    try {
      const data = insertDeviceSchema.parse({ ...req.body, userId: getUserId(req) });
      const d = await storage.createDevice(data);
      res.status(201).json(d);
    } catch (err) {
      const { status, body } = handleZodError(err);
      res.status(status).json(body);
    }
  });

  app.delete("/api/devices/:id", requireAuth, async (req, res) => {
    await storage.softDeleteDevice(req.params.id);
    res.status(204).end();
  });

  // ── Body Records ──
  app.get("/api/users/:userId/body-records", requireAuth, async (req, res) => {
    if (req.params.userId !== getUserId(req)) return res.status(403).json({ error: "Acesso negado." });
    const range = req.query.range as string | undefined;
    const records = await storage.getBodyRecordsByUserWithRange(req.params.userId, range);
    res.json(records);
  });

  app.get("/api/users/:userId/body-records/latest", requireAuth, async (req, res) => {
    if (req.params.userId !== getUserId(req)) return res.status(403).json({ error: "Acesso negado." });
    const record = await storage.getLatestBodyRecord(req.params.userId);
    if (!record) return res.json(null);
    res.json(record);
  });

  app.get("/api/body-records/:id", requireAuth, async (req, res) => {
    const record = await storage.getBodyRecord(req.params.id);
    if (!record) return res.status(404).json({ error: "Record not found" });
    res.json(record);
  });

  app.post("/api/body-records", requireAuth, async (req, res) => {
    try {
      const data = insertBodyRecordSchema.parse(coerceDates({ ...req.body, userId: getUserId(req) }));
      const record = await storage.createBodyRecord(data);
      res.status(201).json(record);
    } catch (err) {
      const { status, body } = handleZodError(err);
      res.status(status).json(body);
    }
  });

  app.patch("/api/body-records/:id", requireAuth, async (req, res) => {
    try {
      const data = insertBodyRecordSchema.partial().parse(coerceDates(req.body));
      const record = await storage.updateBodyRecord(req.params.id, data);
      if (!record) return res.status(404).json({ error: "Record not found" });
      res.json(record);
    } catch (err) {
      const { status, body } = handleZodError(err);
      res.status(status).json(body);
    }
  });

  app.delete("/api/body-records/:id", requireAuth, async (req, res) => {
    await storage.softDeleteBodyRecord(req.params.id);
    res.status(204).end();
  });

  // ── Biometria Xiaomi ──

  app.post("/api/biometria/dispositivos/:id/preparar-pesagem", requireAuth, async (req, res) => {
    try {
      const userId = getUserId(req);
      const deviceId = req.params.id;
      const device = await storage.getDevice(deviceId);
      if (!device || device.userId !== userId) {
        return res.status(404).json({ erro: "Dispositivo não encontrado" });
      }
      const emEsperaAte = new Date(Date.now() + 5 * 60 * 1000);
      const updated = await storage.updateDevice(deviceId, { emEsperaAte });
      if (!updated) {
        return res.status(500).json({ erro: "Erro ao preparar pesagem." });
      }
      res.json({
        id: updated.id,
        tipo: updated.type,
        tipo_display: updated.type === "MISCALE2" ? "Xiaomi Mi Body Composition Scale 2" : updated.type,
        nome: updated.name,
        categoria: "corporal",
        modelo_hardware: updated.model || "",
        fabricante: updated.manufacturer || "",
        chipset: "",
        mac_address: updated.macAddress || "",
        status: "pendente",
        observacao: "",
        ultima_sincronizacao: updated.lastSeenAt?.toISOString() || null,
        em_espera_ate: updated.emEsperaAte?.toISOString() || emEsperaAte.toISOString(),
        criado_em: updated.createdAt.toISOString(),
      });
    } catch (err) {
      console.error("[biometria] preparar-pesagem error:", err);
      res.status(500).json({ erro: "Erro interno ao preparar pesagem." });
    }
  });

  app.post("/api/biometria/registrar/xiaomi", async (req, res) => {
    try {
      const { mac_address, peso, impedancia, data_registro } = req.body;
      if (!mac_address || typeof peso !== "number") {
        return res.status(400).json({ erro: "Campos obrigatórios: mac_address, peso (número)." });
      }

      const deviceWithUser = await storage.getDeviceByMacWithActiveWindow(mac_address);
      if (!deviceWithUser) {
        return res.status(400).json({
          erro: `Nenhuma janela de pesagem ativa encontrada para o MAC ${mac_address}. Inicie a pesagem no aplicativo antes de subir na balança.`,
        });
      }

      const user = deviceWithUser.user!;
      const userId = deviceWithUser.userId;
      const deviceId = deviceWithUser.id;

      let imp: number | null = impedancia ?? null;
      if (imp === 0 || imp === 65534) imp = null;

      const heightM = user.heightCm ? user.heightCm / 100 : null;
      const bmi = heightM ? parseFloat((peso / (heightM * heightM)).toFixed(1)) : null;

      const existing = await storage.findDuplicateBodyRecord(userId, deviceId, peso, imp, 60);
      if (existing) {
        return res.status(201).json({
          sucesso: true,
          mensagem: "Leitura duplicada ignorada (já existe registro similar nos últimos 60s)",
          leitura_id: existing.id,
          usuario_email: user.email || "",
          duplicata: true,
          dados: {
            peso_kg: existing.weightKg,
            imc: existing.bmi,
            gordura_percentual: existing.fatPercent,
            massa_muscular_kg: existing.muscleMassKg,
          },
        });
      }

      const measuredAt = data_registro ? new Date(data_registro) : new Date();
      const record = await storage.createBodyRecord({
        userId,
        deviceId,
        weightKg: peso,
        impedance: imp,
        bmi,
        source: "dispositivo",
        measuredAt,
      });

      await storage.updateDevice(deviceId, {
        emEsperaAte: null,
        lastSeenAt: new Date(),
      });

      res.status(201).json({
        sucesso: true,
        mensagem: `Leitura registrada para ${user.email || userId}`,
        leitura_id: record.id,
        usuario_email: user.email || "",
        duplicata: false,
        dados: {
          peso_kg: record.weightKg,
          imc: record.bmi,
          gordura_percentual: record.fatPercent,
          massa_muscular_kg: record.muscleMassKg,
        },
      });
    } catch (err) {
      console.error("[biometria] registrar/xiaomi error:", err);
      res.status(500).json({ erro: "Erro interno ao registrar leitura." });
    }
  });

  app.get("/api/biometria/estado-atual", requireAuth, async (req, res) => {
    try {
      const userId = getUserId(req);
      const latest = await storage.getLatestBodyRecord(userId);

      const now = new Date();
      const since7d = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      const since30d = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

      const records7d = await storage.getBodyRecordsByUserWithRange(userId, "7d");
      const records30d = await storage.getBodyRecordsByUserWithRange(userId, "30d");
      const allRecords = await storage.getBodyRecordsByUser(userId);

      let variacao7d: number | null = null;
      let variacao30d: number | null = null;

      if (latest && records7d.length > 0) {
        const oldest7d = records7d[0];
        variacao7d = parseFloat((latest.weightKg - oldest7d.weightKg).toFixed(1));
      }
      if (latest && records30d.length > 0) {
        const oldest30d = records30d[0];
        variacao30d = parseFloat((latest.weightKg - oldest30d.weightKg).toFixed(1));
      }

      const weightGoal = await (async () => {
        const goals = await storage.getGoalsByUser(userId);
        return goals.find((g) => g.type === "weight" && g.status === "active");
      })();

      const metaPesoKg = weightGoal?.targetValue ?? null;
      const pesoAteMeta = latest && metaPesoKg !== null
        ? parseFloat((latest.weightKg - metaPesoKg).toFixed(1))
        : null;

      res.json({
        ultima_leitura: latest
          ? {
              id: latest.id,
              peso_kg: latest.weightKg,
              impedancia_ohm: latest.impedance,
              gordura_percentual: latest.fatPercent,
              massa_muscular_kg: latest.muscleMassKg,
              massa_ossea_kg: latest.boneMassKg,
              agua_percentual: latest.waterPercent,
              gordura_visceral: latest.visceralFat,
              imc: latest.bmi,
              tmb_kcal: latest.bmr,
              idade_metabolica: null,
              massa_magra_kg: null,
              proteina_percentual: null,
              tipo_corporal: null,
              origem: latest.source,
              dispositivo_id: latest.deviceId,
              registrado_em: latest.measuredAt.toISOString(),
              criado_em: latest.createdAt.toISOString(),
            }
          : null,
        peso_atual_kg: latest?.weightKg ?? null,
        variacao_peso_7d: variacao7d,
        variacao_peso_30d: variacao30d,
        total_leituras: allRecords.length,
        meta_peso_kg: metaPesoKg,
        peso_ate_meta: pesoAteMeta,
      });
    } catch (err) {
      console.error("[biometria] estado-atual error:", err);
      res.status(500).json({ erro: "Erro ao buscar estado atual." });
    }
  });

  app.get("/api/biometria/historico", requireAuth, async (req, res) => {
    try {
      const userId = getUserId(req);
      const dias = parseInt(req.query.dias as string) || 30;
      const limite = parseInt(req.query.limite as string) || 0;

      const rangeMap: Record<number, string> = { 7: "7d", 30: "30d", 90: "3m", 365: "1y" };
      const rangeKey = rangeMap[dias] || `${dias}d`;

      let records: any[];
      if (Object.values(rangeMap).includes(rangeKey)) {
        records = await storage.getBodyRecordsByUserWithRange(userId, rangeKey);
      } else {
        const since = new Date(Date.now() - dias * 24 * 60 * 60 * 1000);
        const all = await storage.getBodyRecordsByUser(userId);
        records = all.filter((r) => r.measuredAt >= since);
        records.sort((a, b) => a.measuredAt.getTime() - b.measuredAt.getTime());
      }

      if (limite > 0) records = records.slice(-limite);

      const pontos = records.map((r: any) => ({
        data: r.measuredAt.toISOString(),
        peso_kg: r.weightKg,
        gordura_percentual: r.fatPercent,
        imc: r.bmi,
      }));

      const weights = records.map((r: any) => r.weightKg);
      const mediaPeso = weights.length > 0 ? parseFloat((weights.reduce((a: number, b: number) => a + b, 0) / weights.length).toFixed(1)) : null;
      const pesoMinimo = weights.length > 0 ? parseFloat(Math.min(...weights).toFixed(1)) : null;
      const pesoMaximo = weights.length > 0 ? parseFloat(Math.max(...weights).toFixed(1)) : null;

      res.json({
        pontos,
        media_peso_kg: mediaPeso,
        peso_minimo_kg: pesoMinimo,
        peso_maximo_kg: pesoMaximo,
      });
    } catch (err) {
      console.error("[biometria] historico error:", err);
      res.status(500).json({ erro: "Erro ao buscar histórico." });
    }
  });

  // ── Goals ──
  app.get("/api/users/:userId/goals", requireAuth, async (req, res) => {
    if (req.params.userId !== getUserId(req)) return res.status(403).json({ error: "Acesso negado." });
    const g = await storage.getGoalsByUser(req.params.userId);
    res.json(g);
  });

  app.post("/api/goals", requireAuth, async (req, res) => {
    try {
      const data = insertGoalSchema.parse(coerceDates({ ...req.body, userId: getUserId(req) }));
      const g = await storage.createGoal(data);
      res.status(201).json(g);
    } catch (err) {
      const { status, body } = handleZodError(err);
      res.status(status).json(body);
    }
  });

  app.patch("/api/goals/:id", requireAuth, async (req, res) => {
    try {
      const data = insertGoalSchema.partial().parse(req.body);
      const g = await storage.updateGoal(req.params.id, data);
      if (!g) return res.status(404).json({ error: "Goal not found" });
      res.json(g);
    } catch (err) {
      const { status, body } = handleZodError(err);
      res.status(status).json(body);
    }
  });

  app.delete("/api/goals/:id", requireAuth, async (req, res) => {
    await storage.softDeleteGoal(req.params.id);
    res.status(204).end();
  });

  // ── Foods ──
  app.get("/api/foods", requireAuth, async (_req, res) => {
    const allFoods = await storage.getAllFoods();
    res.json(allFoods);
  });

  app.get("/api/foods/:id", requireAuth, async (req, res) => {
    const food = await storage.getFood(req.params.id);
    if (!food) return res.status(404).json({ error: "Food not found" });
    res.json(food);
  });

  app.post("/api/foods", requireAuth, async (req, res) => {
    try {
      const data = insertFoodSchema.parse(req.body);
      const food = await storage.createFood(data);
      res.status(201).json(food);
    } catch (err) {
      const { status, body } = handleZodError(err);
      res.status(status).json(body);
    }
  });

  app.patch("/api/foods/:id", requireAuth, async (req, res) => {
    try {
      const data = insertFoodSchema.partial().parse(req.body);
      const food = await storage.updateFood(req.params.id, data);
      if (!food) return res.status(404).json({ error: "Food not found" });
      res.json(food);
    } catch (err) {
      const { status, body } = handleZodError(err);
      res.status(status).json(body);
    }
  });

  app.delete("/api/foods/:id", requireAuth, async (req, res) => {
    await storage.softDeleteFood(req.params.id);
    res.status(204).end();
  });

  // ── Meal Entries ──
  app.get("/api/users/:userId/meals", requireAuth, async (req, res) => {
    if (req.params.userId !== getUserId(req)) return res.status(403).json({ error: "Acesso negado." });
    const date = (req.query.date as string) || new Date().toISOString().slice(0, 10);
    const entries = await storage.getMealEntriesByUserDate(req.params.userId, date);
    res.json(entries);
  });

  app.get("/api/users/:userId/meals/summary", requireAuth, async (req, res) => {
    if (req.params.userId !== getUserId(req)) return res.status(403).json({ error: "Acesso negado." });
    const date = (req.query.date as string) || new Date().toISOString().slice(0, 10);
    const summary = await storage.getMealSummaryByUserDate(req.params.userId, date);
    res.json(summary);
  });

  app.post("/api/meal-entries", requireAuth, async (req, res) => {
    try {
      const data = insertMealEntrySchema.parse(coerceDates({ ...req.body, userId: getUserId(req) }));
      const entry = await storage.createMealEntry(data);
      res.status(201).json(entry);
    } catch (err) {
      const { status, body } = handleZodError(err);
      res.status(status).json(body);
    }
  });

  app.get("/api/meal-entries/:id", requireAuth, async (req, res) => {
    const entry = await storage.getMealEntry(req.params.id);
    if (!entry) return res.status(404).json({ error: "Entrada não encontrada." });
    if (entry.userId !== getUserId(req)) return res.status(403).json({ error: "Acesso negado." });
    res.json(entry);
  });

  app.patch("/api/meal-entries/:id", requireAuth, async (req, res) => {
    try {
      const existing = await storage.getMealEntry(req.params.id);
      if (!existing) return res.status(404).json({ error: "Entrada não encontrada." });
      if (existing.userId !== getUserId(req)) return res.status(403).json({ error: "Acesso negado." });
      const data = insertMealEntrySchema.partial().parse(coerceDates(req.body));
      const entry = await storage.updateMealEntry(req.params.id, data);
      res.json(entry);
    } catch (err) {
      const { status, body } = handleZodError(err);
      res.status(status).json(body);
    }
  });

  app.delete("/api/meal-entries/:id", requireAuth, async (req, res) => {
    const existing = await storage.getMealEntry(req.params.id);
    if (!existing) return res.status(404).json({ error: "Entrada não encontrada." });
    if (existing.userId !== getUserId(req)) return res.status(403).json({ error: "Acesso negado." });
    await storage.softDeleteMealEntry(req.params.id);
    res.status(204).end();
  });

  // ── Food Stock ──
  app.get("/api/users/:userId/food-stock", requireAuth, async (req, res) => {
    if (req.params.userId !== getUserId(req)) return res.status(403).json({ error: "Acesso negado." });
    const stock = await storage.getFoodStockByUser(req.params.userId);
    res.json(stock);
  });

  app.post("/api/food-stock", requireAuth, async (req, res) => {
    try {
      const data = insertFoodStockSchema.parse(coerceDates({ ...req.body, userId: getUserId(req) }));
      const stock = await storage.createFoodStock(data);
      res.status(201).json(stock);
    } catch (err) {
      const { status, body } = handleZodError(err);
      res.status(status).json(body);
    }
  });

  app.patch("/api/food-stock/:id", requireAuth, async (req, res) => {
    try {
      const data = insertFoodStockSchema.partial().parse(req.body);
      const stock = await storage.updateFoodStock(req.params.id, data);
      if (!stock) return res.status(404).json({ error: "Stock not found" });
      res.json(stock);
    } catch (err) {
      const { status, body } = handleZodError(err);
      res.status(status).json(body);
    }
  });

  app.delete("/api/food-stock/:id", requireAuth, async (req, res) => {
    await storage.softDeleteFoodStock(req.params.id);
    res.status(204).end();
  });

  app.get("/api/users/:userId/food-stock/status", requireAuth, async (req, res) => {
    if (req.params.userId !== getUserId(req)) return res.status(403).json({ error: "Acesso negado." });
    try {
      const items = await storage.getFoodStockWithStatus(req.params.userId);
      res.json(items);
    } catch (err) {
      const { status, body } = handleZodError(err);
      res.status(status).json(body);
    }
  });

  // ── Purchase Records ──
  app.get("/api/users/:userId/purchases/pending", requireAuth, async (req, res) => {
    if (req.params.userId !== getUserId(req)) return res.status(403).json({ error: "Acesso negado." });
    const purchases = await storage.getPendingPurchasesByUser(req.params.userId);
    res.json(purchases);
  });

  app.get("/api/users/:userId/purchases/history", requireAuth, async (req, res) => {
    if (req.params.userId !== getUserId(req)) return res.status(403).json({ error: "Acesso negado." });
    const purchases = await storage.getPurchaseHistoryByUser(req.params.userId);
    res.json(purchases);
  });

  app.post("/api/purchases", requireAuth, async (req, res) => {
    try {
      const data = insertPurchaseRecordSchema.parse({ ...req.body, userId: getUserId(req) });
      const purchase = await storage.createPurchaseRecord(data);
      res.status(201).json(purchase);
    } catch (err) {
      const { status, body } = handleZodError(err);
      res.status(status).json(body);
    }
  });

  app.post("/api/purchases/:id/confirm", requireAuth, async (req, res) => {
    try {
      const { actualQuantity } = req.body;
      if (typeof actualQuantity !== "number" || actualQuantity < 0) {
        return res.status(400).json({ error: "actualQuantity must be a non-negative number" });
      }
      const result = await storage.confirmPurchase(req.params.id, actualQuantity);
      res.json(result);
    } catch (err: any) {
      res.status(404).json({ error: err.message || "Purchase not found" });
    }
  });

  app.post("/api/users/:userId/purchases/confirm-all", requireAuth, async (req, res) => {
    if (req.params.userId !== getUserId(req)) return res.status(403).json({ error: "Acesso negado." });
    try {
      const { items } = req.body;
      if (!Array.isArray(items)) {
        return res.status(400).json({ error: "items must be an array" });
      }
      const result = await storage.confirmAllPurchases(req.params.userId, items);
      res.json(result);
    } catch (err: any) {
      res.status(500).json({ error: err.message || "Failed to confirm purchases" });
    }
  });

  // ── Hidratação ──

  // GET /api/hidratacao/meta
  app.get("/api/hidratacao/meta", requireAuth, async (req, res) => {
    try {
      const userId = getUserId(req);
      const meta = await storage.getHydrationMeta(userId);
      res.json(meta);
    } catch (err) {
      res.status(500).json({ error: "Erro ao buscar meta de hidratação." });
    }
  });

  // PATCH /api/hidratacao/meta
  app.patch("/api/hidratacao/meta", requireAuth, async (req, res) => {
    try {
      const userId = getUserId(req);
      const parsed = updateMetaSchema.parse(req.body);
      const result = await storage.updateHydrationMeta(userId, parsed.ml_meta_diaria);
      res.json(result);
    } catch (err) {
      const { status, body } = handleZodFieldErrors(err);
      res.status(status === 500 ? 500 : 422).json(body);
    }
  });

  // POST /api/hidratacao/registros
  app.post("/api/hidratacao/registros", requireAuth, async (req, res) => {
    try {
      const userId = getUserId(req);
      const body = { ...req.body };
      if (body.tipo_bebida && typeof body.tipo_bebida === "string") {
        body.tipo_bebida = body.tipo_bebida.toUpperCase();
      }
      const parsed = createHydrationSchema.parse(body);

      const record = await storage.createHydrationRecord({
        userId,
        amountMl: parsed.quantidade_ml,
        beverageType: parsed.tipo_bebida ?? "AGUA",
        recordedAt: parsed.registrado_em ? new Date(parsed.registrado_em) : undefined,
      });

      const recordDate = (record.recordedAt ?? new Date()).toISOString().slice(0, 10);
      const resumo = await storage.getHydrationSummary(userId, recordDate);

      res.status(201).json({
        id: record.id,
        quantidade_ml: record.amountMl,
        tipo_bebida: record.beverageType,
        registrado_em: record.recordedAt?.toISOString() ?? new Date().toISOString(),
        resumo_dia: resumo,
        mensagem: "Registro de hidratação criado com sucesso.",
      });
    } catch (err) {
      const { status, body } = handleZodFieldErrors(err);
      res.status(status === 500 ? 500 : 422).json(body);
    }
  });

  // GET /api/hidratacao/registros?inicio=&fim=
  app.get("/api/hidratacao/registros", requireAuth, async (req, res) => {
    try {
      const userId = getUserId(req);
      const today = new Date().toISOString().slice(0, 10);
      const inicio = (req.query.inicio as string) || today;
      const fim = (req.query.fim as string) || today;

      if (!/^\d{4}-\d{2}-\d{2}$/.test(inicio) || !/^\d{4}-\d{2}-\d{2}$/.test(fim)) {
        return res.status(422).json({ errors: [{ field: "inicio/fim", message: "Datas devem estar no formato YYYY-MM-DD." }] });
      }

      const records = await storage.getHydrationRecordsByRange(userId, inicio, fim);
      const itens = records.map((r) => ({
        id: r.id,
        quantidade_ml: r.amountMl,
        tipo_bebida: r.beverageType,
        registrado_em: r.recordedAt?.toISOString() ?? "",
      }));

      res.json({ itens, total_itens: itens.length });
    } catch (err) {
      res.status(500).json({ error: "Erro ao buscar registros." });
    }
  });

  // DELETE /api/hidratacao/registros/:id
  app.delete("/api/hidratacao/registros/:id", requireAuth, async (req, res) => {
    try {
      const userId = getUserId(req);
      const record = await storage.getHydrationRecord(req.params.id);

      if (!record) {
        return res.status(404).json({ error: "Registro não encontrado." });
      }
      if (record.userId !== userId) {
        return res.status(403).json({ error: "Acesso negado." });
      }

      const recordDate = (record.recordedAt ?? new Date()).toISOString().slice(0, 10);
      await storage.softDeleteHydrationRecord(req.params.id);
      const resumo = await storage.getHydrationSummary(userId, recordDate);

      res.json({
        id: req.params.id,
        removido: true,
        resumo_dia: resumo,
        mensagem: "Registro removido com sucesso.",
      });
    } catch (err) {
      res.status(500).json({ error: "Erro ao remover registro." });
    }
  });

  // GET /api/hidratacao/resumo?data=
  app.get("/api/hidratacao/resumo", requireAuth, async (req, res) => {
    try {
      const userId = getUserId(req);
      const date = (req.query.data as string) || new Date().toISOString().slice(0, 10);

      if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
        return res.status(422).json({ errors: [{ field: "data", message: "Data deve estar no formato YYYY-MM-DD." }] });
      }

      const resumo = await storage.getHydrationSummary(userId, date);
      res.json(resumo);
    } catch (err) {
      res.status(500).json({ error: "Erro ao buscar resumo." });
    }
  });

  // ── Nutrição TBCA ──

  app.get("/api/nutricao/tbca/grupos", requireAuth, async (_req, res) => {
    try {
      const grupos = await storage.getAllGrupos();
      res.json(grupos);
    } catch (err) {
      res.status(500).json({ error: "Erro ao buscar grupos alimentares." });
    }
  });

  app.get("/api/nutricao/tbca/tipos", requireAuth, async (_req, res) => {
    try {
      const tipos = await storage.getAllTipos();
      res.json(tipos);
    } catch (err) {
      res.status(500).json({ error: "Erro ao buscar tipos de alimento." });
    }
  });

  app.get("/api/nutricao/tbca/nutrientes", requireAuth, async (_req, res) => {
    try {
      const nutrientes = await storage.getAllNutrientes();
      res.json(nutrientes);
    } catch (err) {
      res.status(500).json({ error: "Erro ao buscar nutrientes." });
    }
  });

  app.get("/api/nutricao/tbca/alimentos", requireAuth, async (req, res) => {
    try {
      const q = (req.query.q as string) || "";
      const grupoId = req.query.grupo_id as string | undefined;
      const tipoId = req.query.tipo_id as string | undefined;
      const limite = parseInt(req.query.limite as string) || 20;
      const offset = parseInt(req.query.offset as string) || 0;
      const result = await storage.searchAlimentosTbca(q, grupoId, tipoId, limite, offset);
      res.json(result);
    } catch (err) {
      res.status(500).json({ error: "Erro ao buscar alimentos TBCA." });
    }
  });

  app.get("/api/nutricao/tbca/alimentos/:id", requireAuth, async (req, res) => {
    try {
      const alimento = await storage.getAlimentoTbca(req.params.id);
      if (!alimento) return res.status(404).json({ error: "Alimento TBCA não encontrado." });
      const composicao = await storage.getAlimentoNutrientes(req.params.id);
      res.json({ ...alimento, composicao });
    } catch (err) {
      res.status(500).json({ error: "Erro ao buscar alimento TBCA." });
    }
  });

  app.get("/api/nutricao/tbca/alimentos/codigo/:codigo", requireAuth, async (req, res) => {
    try {
      const alimento = await storage.getAlimentoTbcaByCodigo(req.params.codigo);
      if (!alimento) return res.status(404).json({ error: "Alimento TBCA não encontrado." });
      const composicao = await storage.getAlimentoNutrientes(alimento.id);
      res.json({ ...alimento, composicao });
    } catch (err) {
      res.status(500).json({ error: "Erro ao buscar alimento TBCA por código." });
    }
  });

  app.post("/api/nutricao/tbca/calcular", requireAuth, async (req, res) => {
    try {
      const parsed = calcularNutricionalSchema.parse(req.body);
      const alimento = await storage.getAlimentoTbca(parsed.alimento_tbca_id);
      if (!alimento) return res.status(404).json({ error: "Alimento TBCA não encontrado." });
      const resultado = await storage.calcularNutricional(parsed.alimento_tbca_id, parsed.quantidade_g);
      res.json({
        alimento_tbca_id: parsed.alimento_tbca_id,
        descricao: alimento.descricao,
        quantidade_g: parsed.quantidade_g,
        nutrientes: resultado,
      });
    } catch (err) {
      const { status, body } = handleZodFieldErrors(err);
      res.status(status === 500 ? 500 : 422).json(body);
    }
  });

  // ── Bridge TBCA → Consumo ──

  app.post("/api/nutricao/alimentos/preparar-para-consumo", requireAuth, async (req, res) => {
    try {
      const parsed = prepararParaConsumoSchema.parse(req.body);
      const food = await storage.prepararParaConsumo(parsed.alimento_tbca_id, parsed.descricao_customizada);
      res.json({
        alimento_id: food.id,
        alimento_tbca_id: parsed.alimento_tbca_id,
        nome: food.name,
        fonte_dados: "TBCA",
      });
    } catch (err: any) {
      if (err.message === "Alimento TBCA não encontrado.") {
        return res.status(404).json({ error: err.message });
      }
      const { status, body } = handleZodFieldErrors(err);
      res.status(status === 500 ? 500 : 422).json(body);
    }
  });

  // ── Busca Unificada ──

  app.get("/api/nutricao/alimentos-unificados/buscar", requireAuth, async (req, res) => {
    try {
      const q = (req.query.q as string) || "";
      const fonte = ((req.query.fonte as string) || "TODOS").toUpperCase();
      const limite = parseInt(req.query.limite as string) || 20;
      const offset = parseInt(req.query.offset as string) || 0;

      if (!["LEGADO", "TBCA", "TODOS"].includes(fonte)) {
        return res.status(422).json({ errors: [{ field: "fonte", message: "Fonte deve ser LEGADO, TBCA ou TODOS." }] });
      }

      const result = await storage.searchAlimentosUnificados(q, fonte, limite, offset);
      res.json(result);
    } catch (err) {
      res.status(500).json({ error: "Erro ao buscar alimentos." });
    }
  });

  // ── Registro Avançado no Diário ──

  app.post("/api/nutricao/diario/registrar-avancado", requireAuth, async (req, res) => {
    try {
      const userId = getUserId(req);
      const parsed = registrarAvancadoSchema.parse(req.body);

      let foodId = parsed.alimento_id;

      if (parsed.alimento_tbca_id && !foodId) {
        const food = await storage.prepararParaConsumo(parsed.alimento_tbca_id);
        foodId = food.id;
      }

      if (!foodId) {
        return res.status(422).json({ errors: [{ field: "alimento_id", message: "Alimento não identificado." }] });
      }

      const food = await storage.getFood(foodId);
      if (!food) {
        return res.status(404).json({ error: "Alimento não encontrado." });
      }

      const mealSlot = parsed.meal_slot || parsed.refeicao_id || "lanche";
      const entry = await storage.createMealEntry({
        userId,
        foodId,
        mealSlot,
        quantityG: parsed.quantidade,
        unit: "g",
      });

      const fator = parsed.quantidade / (food.servingSizeG || 100);
      const macros = {
        calorias: Math.round((food.caloriesKcal * fator) * 100) / 100,
        proteinas: Math.round((food.proteinG * fator) * 100) / 100,
        carboidratos: Math.round((food.carbsG * fator) * 100) / 100,
        gorduras: Math.round((food.fatG * fator) * 100) / 100,
      };

      res.status(201).json({
        id: entry.id,
        alimento_id: foodId,
        alimento_tbca_id: food.alimentoTbcaId || parsed.alimento_tbca_id || null,
        descricao: food.name,
        quantidade_g: parsed.quantidade,
        meal_slot: mealSlot,
        origem: parsed.origem,
        macros_calculados: macros,
        mensagem: "Registro alimentar criado com sucesso.",
      });
    } catch (err: any) {
      if (err.message === "Alimento TBCA não encontrado.") {
        return res.status(404).json({ error: err.message });
      }
      const { status, body } = handleZodFieldErrors(err);
      res.status(status === 500 ? 500 : 422).json(body);
    }
  });

  // ── BLE Balança de Cozinha ──

  const BLE_RATE_LIMIT_WINDOW_MS = 60 * 1000;
  const BLE_RATE_LIMIT_MAX = 30;

  const bleRateLimit = rateLimit({
    windowMs: BLE_RATE_LIMIT_WINDOW_MS,
    max: BLE_RATE_LIMIT_MAX,
    keyGenerator: (req) => {
      const userId = getUserId(req);
      const mac = req.body?.mac_balanca;
      return mac ? `ble:${userId}:${mac}` : `ble:${userId}`;
    },
    handler: (req, res) => {
      const userId = getUserId(req);
      const cid = generateCorrelationId(req);
      incRateLimitBloqueio();
      auditLog(cid, "RATE_LIMIT_BLOQUEADO", userId, { mac: req.body?.mac_balanca || null });
      res.status(429).json({
        erro: "Limite de requisições BLE excedido.",
        codigo: "BLE_RATE_LIMIT",
        detalhe: `Máximo de ${BLE_RATE_LIMIT_MAX} requisições por minuto. Tente novamente em breve.`,
      });
    },
  });

  app.get("/api/ble/metrics", requireAuth, (_req, res) => {
    res.json(getMetrics());
  });

  app.post("/api/nutricao/diario/balanca-cozinha", requireAuth, bleRateLimit, async (req, res) => {
    const cid = generateCorrelationId(req);
    try {
      const userId = getUserId(req);
      const parsed = ingestaoBalancaSchema.parse(req.body);

      let pesoOriginal: number;
      let unidadeOriginal: string;
      let pesoGramas: number;
      let pacoteHex = parsed.pacote_hex || null;

      if (parsed.pacote_hex) {
        const result = parseIcomonPacket(parsed.pacote_hex);
        if ("error" in result) {
          incIngestaoErro();
          auditLog(cid, "INGESTAO_PARSE_ERRO", userId, { erro: result.message });
          return res.status(400).json({ error: result.message });
        }
        pesoOriginal = result.pesoOriginal;
        unidadeOriginal = result.unidadeOriginal;
        pesoGramas = result.pesoGramas;
      } else {
        pesoOriginal = parsed.peso!;
        unidadeOriginal = parsed.unidade!;
        const conv = convertToGrams(parsed.peso!, parsed.unidade!);
        pesoGramas = conv.pesoGramas;
        if (!conv.unidadeReconhecida) {
          auditLog(cid, "UNIDADE_DESCONHECIDA", userId, { unidade: parsed.unidade });
        }
      }

      const limitError = validatePhysicalLimits(pesoGramas);
      if (limitError) {
        incIngestaoErro();
        auditLog(cid, "INGESTAO_LIMITE_ERRO", userId, { pesoGramas, erro: limitError });
        return res.status(400).json({ error: limitError });
      }

      const macBalanca = parsed.mac_balanca || null;
      const assinatura = buildDedupSignature(userId, pesoGramas, unidadeOriginal, macBalanca);

      const dup = await storage.findDuplicatePesagem(userId, assinatura, 5);
      if (dup) {
        incDedup();
        auditLog(cid, "DEDUP", userId, { pesagemId: dup.id, assinatura });
        return res.status(200).json({
          sucesso: true,
          duplicata: true,
          pesagem_id: dup.id,
          peso_original: dup.pesoOriginal,
          unidade_original: dup.unidadeOriginal,
          peso_gramas: dup.pesoGramas,
          aguardando_alimento: dup.status === "PENDENTE" && !dup.alimentoId,
          mensagem: "Leitura duplicada detectada na janela de 5 segundos.",
        });
      }

      let alimentoId = parsed.alimento_id || null;
      if (parsed.alimento_tbca_id && !alimentoId) {
        try {
          const food = await storage.prepararParaConsumo(parsed.alimento_tbca_id);
          alimentoId = food.id;
        } catch (err: any) {
          if (err.message === "Alimento TBCA não encontrado.") {
            incIngestaoErro();
            auditLog(cid, "INGESTAO_ALIMENTO_NAO_ENCONTRADO", userId, { alimentoTbcaId: parsed.alimento_tbca_id });
            return res.status(404).json({ error: err.message });
          }
        }
      }

      const pesagem = await storage.createPesagemPendente({
        userId,
        pesoOriginal,
        unidadeOriginal,
        pesoGramas,
        macBalanca,
        pacoteHex,
        assinaturaDedup: assinatura,
        status: "PENDENTE",
        origem: "BLE",
      });

      auditLog(cid, "INGESTAO_SUCESSO", userId, { pesagemId: pesagem.id, pesoGramas, mac: macBalanca });

      if (alimentoId) {
        const t0 = Date.now();
        const mealSlot = parsed.meal_slot || parsed.refeicao_id || "lanche";
        const { pesagem: updated, registro } = await storage.associarPesagem(pesagem.id, alimentoId, mealSlot, userId);
        incAssociacaoSucesso(Date.now() - t0);
        const food = await storage.getFood(alimentoId);
        const fator = pesoGramas / (food?.servingSizeG || 100);
        const macros = food ? {
          calorias: Math.round(food.caloriesKcal * fator * 100) / 100,
          proteinas: Math.round(food.proteinG * fator * 100) / 100,
          carboidratos: Math.round(food.carbsG * fator * 100) / 100,
          gorduras: Math.round(food.fatG * fator * 100) / 100,
        } : null;

        incIngestaoSucesso();
        auditLog(cid, "INGESTAO_COM_ASSOCIACAO", userId, { pesagemId: updated.id, alimentoId, registroId: registro.id });
        return res.status(201).json({
          sucesso: true,
          registro_id: registro.id,
          pesagem_id: updated.id,
          peso_original: pesoOriginal,
          unidade_original: unidadeOriginal,
          peso_gramas: pesoGramas,
          aguardando_alimento: false,
          macros_calculados: macros,
          mensagem: "Leitura registrada e associada ao alimento.",
        });
      }

      incIngestaoSucesso();
      res.status(201).json({
        sucesso: true,
        pesagem_id: pesagem.id,
        peso_original: pesoOriginal,
        unidade_original: unidadeOriginal,
        peso_gramas: pesoGramas,
        aguardando_alimento: true,
        mensagem: "Leitura registrada. Aguardando associação com alimento.",
      });
    } catch (err) {
      incIngestaoErro();
      if (err instanceof ZodError) {
        auditLog(cid, "INGESTAO_VALIDACAO_ERRO", "unknown", { tipo: "zod" });
        const { body } = handleZodFieldErrors(err);
        return res.status(422).json(body);
      }
      auditLog(cid, "INGESTAO_ERRO_INTERNO", "unknown", {});
      console.error("[BLE] Erro na ingestão:", err);
      res.status(500).json({ error: "Erro ao processar leitura da balança." });
    }
  });

  app.get("/api/nutricao/diario/pesagens-pendentes", requireAuth, async (req, res) => {
    try {
      const userId = getUserId(req);
      const pendentes = await storage.listPesagensPendentes(userId);
      res.json({
        itens: pendentes.map((p) => ({
          id: p.id,
          peso_original: p.pesoOriginal,
          unidade_original: p.unidadeOriginal,
          peso_gramas: p.pesoGramas,
          mac_balanca: p.macBalanca,
          origem: p.origem,
          criado_em: p.createdAt.toISOString(),
        })),
        total: pendentes.length,
      });
    } catch (err) {
      res.status(500).json({ error: "Erro ao listar pesagens pendentes." });
    }
  });

  app.post("/api/nutricao/diario/pesagens-pendentes/:pesagem_id/associar", requireAuth, async (req, res) => {
    const cid = generateCorrelationId(req);
    const t0 = Date.now();
    try {
      const userId = getUserId(req);
      const pesagemId = req.params.pesagem_id;
      const parsed = associarPesagemSchema.parse(req.body);

      let alimentoId = parsed.alimento_id || null;

      if (parsed.alimento_tbca_id && !alimentoId) {
        const food = await storage.prepararParaConsumo(parsed.alimento_tbca_id);
        alimentoId = food.id;
      }

      if (!alimentoId) {
        incAssociacaoErro();
        return res.status(422).json({ error: "Alimento não identificado." });
      }

      const food = await storage.getFood(alimentoId);
      if (!food) {
        incAssociacaoErro();
        return res.status(404).json({ error: "Alimento não encontrado." });
      }

      const mealSlot = parsed.meal_slot || "lanche";
      const { pesagem, registro } = await storage.associarPesagem(pesagemId, alimentoId, mealSlot, userId);

      const fator = pesagem.pesoGramas / (food.servingSizeG || 100);
      const macros = {
        calorias: Math.round(food.caloriesKcal * fator * 100) / 100,
        proteinas: Math.round(food.proteinG * fator * 100) / 100,
        carboidratos: Math.round(food.carbsG * fator * 100) / 100,
        gorduras: Math.round(food.fatG * fator * 100) / 100,
      };

      incAssociacaoSucesso(Date.now() - t0);
      auditLog(cid, "ASSOCIACAO_SUCESSO", userId, { pesagemId, alimentoId, registroId: registro.id });

      res.json({
        sucesso: true,
        pesagem_id: pesagem.id,
        registro_id: registro.id,
        peso_gramas: pesagem.pesoGramas,
        alimento: food.name,
        macros_calculados: macros,
        mensagem: "Pesagem associada com sucesso.",
      });
    } catch (err: any) {
      incAssociacaoErro();
      if (err.message === "Pesagem não encontrada.") {
        auditLog(cid, "ASSOCIACAO_NAO_ENCONTRADA", "unknown", { pesagemId: req.params.pesagem_id });
        return res.status(404).json({ error: err.message });
      }
      if (err.message?.includes("não pode ser associada") || err.message?.includes("já associada")) {
        auditLog(cid, "ASSOCIACAO_STATUS_INVALIDO", "unknown", { pesagemId: req.params.pesagem_id, erro: err.message });
        return res.status(400).json({ error: err.message });
      }
      if (err.message === "Alimento TBCA não encontrado.") {
        return res.status(404).json({ error: err.message });
      }
      if (err instanceof ZodError) {
        const { body } = handleZodFieldErrors(err);
        return res.status(422).json(body);
      }
      auditLog(cid, "ASSOCIACAO_ERRO_INTERNO", "unknown", {});
      console.error("[BLE] Erro na associação:", err);
      res.status(500).json({ error: "Erro ao associar pesagem." });
    }
  });

  app.delete("/api/nutricao/diario/pesagens-pendentes/:pesagem_id", requireAuth, async (req, res) => {
    const cid = generateCorrelationId(req);
    try {
      const userId = getUserId(req);
      const pesagemId = req.params.pesagem_id;

      const updated = await storage.descartarPesagem(pesagemId, userId);

      incDescarteSucesso();
      auditLog(cid, "DESCARTE_SUCESSO", userId, { pesagemId });

      res.json({
        sucesso: true,
        pesagem_id: updated.id,
        status: updated.status,
        mensagem: "Pesagem descartada com sucesso.",
      });
    } catch (err: any) {
      incDescarteErro();
      if (err.message === "Pesagem não encontrada.") {
        auditLog(cid, "DESCARTE_NAO_ENCONTRADA", "unknown", { pesagemId: req.params.pesagem_id });
        return res.status(404).json({ error: err.message });
      }
      if (err.message?.includes("já associada") || err.message?.includes("já foi descartada")) {
        auditLog(cid, "DESCARTE_STATUS_INVALIDO", "unknown", { pesagemId: req.params.pesagem_id, erro: err.message });
        return res.status(400).json({ error: err.message });
      }
      auditLog(cid, "DESCARTE_ERRO_INTERNO", "unknown", {});
      console.error("[BLE] Erro no descarte:", err);
      res.status(500).json({ error: "Erro ao descartar pesagem." });
    }
  });

  // ── Sync Pull (GET /api/sync/pull) ──
  app.get("/api/sync/pull", requireAuth, async (req, res) => {
    try {
      const query = syncPullQuerySchema.parse(req.query);
      const result = await storage.syncPull({
        cursor: query.cursor,
        limit: query.limit,
        tables: query.tables ? query.tables.split(",") : undefined,
      });
      res.json(result);
    } catch (err) {
      const { status, body } = handleZodError(err);
      res.status(status).json(body);
    }
  });

  // ── Sync Push (POST /api/sync/push) ──
  app.post("/api/sync/push", requireAuth, async (req, res) => {
    try {
      const body = syncPushRequestSchema.parse(req.body);
      const result = await storage.syncPush({
        changes: body.changes,
        clientId: body.clientId,
        idempotencyKey: body.idempotencyKey,
      });
      res.json(result);
    } catch (err) {
      const { status, body } = handleZodError(err);
      res.status(status).json(body);
    }
  });

  // ── OpenAPI v1 Contract ──
  app.get("/api/v1/openapi.json", (_req, res) => {
    res.json(openApiSpec);
  });
  app.get("/api/openapi.json", (_req, res) => {
    res.json(openApiSpec);
  });

  return httpServer;
}

const openApiSpec = {
  openapi: "3.1.0",
  info: {
    title: "UNIO Health & Fitness API",
    version: "1.0.0",
    description: "Backend API for UNIO — unified health tracking with offline-first sync",
  },
  servers: [{ url: "/api" }],
  paths: {
    "/auth/login": {
      post: {
        operationId: "login",
        summary: "Authenticate user and receive JWT access + refresh tokens",
        requestBody: {
          required: true,
          content: { "application/json": { schema: { type: "object", required: ["email", "password"], properties: { email: { type: "string" }, password: { type: "string" } } } } },
        },
        responses: {
          "200": { description: "Login successful", content: { "application/json": { schema: { type: "object", properties: { user: { $ref: "#/components/schemas/User" }, accessToken: { type: "string" } } } } } },
          "401": { description: "Invalid credentials" },
          "429": { description: "Rate limited" },
        },
      },
    },
    "/auth/refresh": {
      post: {
        operationId: "refreshToken",
        summary: "Rotate refresh token and get new access token",
        responses: {
          "200": { description: "Tokens rotated", content: { "application/json": { schema: { type: "object", properties: { user: { $ref: "#/components/schemas/User" }, accessToken: { type: "string" } } } } } },
          "401": { description: "Invalid or expired refresh token" },
        },
      },
    },
    "/auth/logout": {
      post: { operationId: "logout", summary: "Revoke current session", responses: { "200": { description: "Session revoked" } } },
    },
    "/auth/logout-all": {
      post: { operationId: "logoutAll", summary: "Revoke all sessions and increment token version", responses: { "200": { description: "All sessions revoked" } } },
    },
    "/auth/me": {
      get: { operationId: "getCurrentUser", summary: "Get authenticated user data", responses: { "200": { description: "User data", content: { "application/json": { schema: { $ref: "#/components/schemas/User" } } } }, "401": { description: "Not authenticated" } } },
    },
    "/sync/pull": {
      get: {
        operationId: "syncPull",
        summary: "Pull incremental changes since cursor",
        parameters: [
          { name: "cursor", in: "query", schema: { type: "string", format: "date-time" } },
          { name: "limit", in: "query", schema: { type: "integer", default: 100, minimum: 1, maximum: 500 } },
          { name: "tables", in: "query", schema: { type: "string" } },
        ],
        responses: { "200": { description: "Sync response", content: { "application/json": { schema: { $ref: "#/components/schemas/SyncPullResponse" } } } } },
      },
    },
    "/sync/push": {
      post: {
        operationId: "syncPush",
        summary: "Push local changes to server",
        requestBody: { required: true, content: { "application/json": { schema: { $ref: "#/components/schemas/SyncPushRequest" } } } },
        responses: { "200": { description: "Push result", content: { "application/json": { schema: { $ref: "#/components/schemas/SyncPushResponse" } } } } },
      },
    },
  },
  components: {
    securitySchemes: {
      bearerAuth: { type: "http", scheme: "bearer", bearerFormat: "JWT" },
    },
    schemas: {
      Error: { type: "object", properties: { error: { type: "string" } }, required: ["error"] },
      User: {
        type: "object",
        properties: {
          id: { type: "string", format: "uuid" },
          username: { type: "string" },
          displayName: { type: "string", nullable: true },
          email: { type: "string", nullable: true },
          heightCm: { type: "number", nullable: true },
          birthDate: { type: "string", nullable: true },
          sex: { type: "string", nullable: true },
          activityLevel: { type: "string", nullable: true },
          lastLoginAt: { type: "string", format: "date-time", nullable: true },
          createdAt: { type: "string", format: "date-time" },
          updatedAt: { type: "string", format: "date-time" },
        },
      },
      SyncPullResponse: {
        type: "object",
        required: ["eventos", "cursor_proximo", "tem_mais", "timestamp"],
        properties: {
          eventos: { type: "object", additionalProperties: { type: "object" } },
          cursor_proximo: { type: "string", format: "date-time", nullable: true },
          tem_mais: { type: "boolean" },
          timestamp: { type: "number" },
        },
      },
      SyncPushRequest: {
        type: "object",
        required: ["changes"],
        properties: {
          changes: { type: "array", items: { type: "object", required: ["table", "action", "data"], properties: { id: { type: "string", format: "uuid" }, table: { type: "string" }, action: { type: "string", enum: ["create", "update", "delete"] }, data: { type: "object" } } } },
          clientId: { type: "string" },
          idempotencyKey: { type: "string" },
        },
      },
      SyncPushResponse: {
        type: "object",
        required: ["applied", "errors"],
        properties: { applied: { type: "integer" }, errors: { type: "array", items: { type: "object", properties: { index: { type: "integer" }, error: { type: "string" } } } } },
      },
    },
  },
  security: [{ bearerAuth: [] }],
};
