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
} from "@shared/schema";
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
