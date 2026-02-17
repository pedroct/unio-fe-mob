import type { Express, Request, Response, NextFunction } from "express";
import { type Server } from "http";
import { storage } from "./storage";
import bcrypt from "bcrypt";
import {
  insertUserSchema,
  insertDeviceSchema,
  insertBodyRecordSchema,
  insertGoalSchema,
  insertFoodSchema,
  insertFoodStockSchema,
  insertPurchaseRecordSchema,
  insertHydrationRecordSchema,
  syncPullQuerySchema,
  syncPushRequestSchema,
} from "@shared/schema";
import { ZodError } from "zod";
import { fromZodError } from "zod-validation-error";

declare module "express-session" {
  interface SessionData {
    userId: string;
  }
}

function handleZodError(err: unknown) {
  if (err instanceof ZodError) {
    return { status: 400, body: { error: fromZodError(err).message } };
  }
  return { status: 500, body: { error: String(err) } };
}

function sanitizeUser(user: any) {
  const { passwordHash, ...rest } = user;
  return rest;
}

function requireAuth(req: Request, res: Response, next: NextFunction) {
  if (!req.session.userId) {
    return res.status(401).json({ error: "Não autenticado." });
  }
  next();
}

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {

  // ── Auth ──
  app.post("/api/auth/register", async (req, res) => {
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

      req.session.userId = user.id;
      res.status(201).json(sanitizeUser(user));
    } catch (err) {
      const { status, body } = handleZodError(err);
      res.status(status).json(body);
    }
  });

  app.post("/api/auth/login", async (req, res) => {
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
        return res.status(401).json({ error: "E-mail ou senha incorretos." });
      }

      req.session.userId = user.id;
      res.json(sanitizeUser(user));
    } catch (err) {
      res.status(500).json({ error: "Erro interno ao fazer login." });
    }
  });

  app.post("/api/auth/logout", (req, res) => {
    req.session.destroy((err) => {
      if (err) return res.status(500).json({ error: "Erro ao encerrar sessão." });
      res.clearCookie("connect.sid");
      res.json({ ok: true });
    });
  });

  app.get("/api/auth/me", async (req, res) => {
    if (!req.session.userId) {
      return res.status(401).json({ error: "Não autenticado." });
    }
    const user = await storage.getUser(req.session.userId);
    if (!user) {
      req.session.destroy(() => {});
      return res.status(401).json({ error: "Usuário não encontrado." });
    }
    res.json(sanitizeUser(user));
  });

  // ── Users ──
  app.get("/api/users/:id", requireAuth, async (req, res) => {
    if (req.params.id !== req.session.userId) return res.status(403).json({ error: "Acesso negado." });
    const user = await storage.getUser(req.params.id);
    if (!user) return res.status(404).json({ error: "User not found" });
    res.json(sanitizeUser(user));
  });

  app.patch("/api/users/:id", requireAuth, async (req, res) => {
    try {
      if (req.params.id !== req.session.userId) return res.status(403).json({ error: "Acesso negado." });
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
    if (req.params.id !== req.session.userId) return res.status(403).json({ error: "Acesso negado." });
    await storage.softDeleteUser(req.params.id);
    res.status(204).end();
  });

  // ── Devices ──
  app.get("/api/users/:userId/devices", requireAuth, async (req, res) => {
    if (req.params.userId !== req.session.userId) return res.status(403).json({ error: "Acesso negado." });
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
      const data = insertDeviceSchema.parse({ ...req.body, userId: req.session.userId });
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
    if (req.params.userId !== req.session.userId) return res.status(403).json({ error: "Acesso negado." });
    const records = await storage.getBodyRecordsByUser(req.params.userId);
    res.json(records);
  });

  app.get("/api/body-records/:id", requireAuth, async (req, res) => {
    const record = await storage.getBodyRecord(req.params.id);
    if (!record) return res.status(404).json({ error: "Record not found" });
    res.json(record);
  });

  app.post("/api/body-records", requireAuth, async (req, res) => {
    try {
      const data = insertBodyRecordSchema.parse({ ...req.body, userId: req.session.userId });
      const record = await storage.createBodyRecord(data);
      res.status(201).json(record);
    } catch (err) {
      const { status, body } = handleZodError(err);
      res.status(status).json(body);
    }
  });

  app.patch("/api/body-records/:id", requireAuth, async (req, res) => {
    try {
      const data = insertBodyRecordSchema.partial().parse(req.body);
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
    if (req.params.userId !== req.session.userId) return res.status(403).json({ error: "Acesso negado." });
    const g = await storage.getGoalsByUser(req.params.userId);
    res.json(g);
  });

  app.post("/api/goals", requireAuth, async (req, res) => {
    try {
      const data = insertGoalSchema.parse({ ...req.body, userId: req.session.userId });
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

  // ── Food Stock ──
  app.get("/api/users/:userId/food-stock", requireAuth, async (req, res) => {
    if (req.params.userId !== req.session.userId) return res.status(403).json({ error: "Acesso negado." });
    const stock = await storage.getFoodStockByUser(req.params.userId);
    res.json(stock);
  });

  app.post("/api/food-stock", requireAuth, async (req, res) => {
    try {
      const data = insertFoodStockSchema.parse({ ...req.body, userId: req.session.userId });
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
    if (req.params.userId !== req.session.userId) return res.status(403).json({ error: "Acesso negado." });
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
    if (req.params.userId !== req.session.userId) return res.status(403).json({ error: "Acesso negado." });
    const purchases = await storage.getPendingPurchasesByUser(req.params.userId);
    res.json(purchases);
  });

  app.get("/api/users/:userId/purchases/history", requireAuth, async (req, res) => {
    if (req.params.userId !== req.session.userId) return res.status(403).json({ error: "Acesso negado." });
    const purchases = await storage.getPurchaseHistoryByUser(req.params.userId);
    res.json(purchases);
  });

  app.post("/api/purchases", requireAuth, async (req, res) => {
    try {
      const data = insertPurchaseRecordSchema.parse({ ...req.body, userId: req.session.userId });
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
    if (req.params.userId !== req.session.userId) return res.status(403).json({ error: "Acesso negado." });
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

  // ── Hydration Records ──
  app.get("/api/users/:userId/hydration/today", requireAuth, async (req, res) => {
    if (req.params.userId !== req.session.userId) return res.status(403).json({ error: "Acesso negado." });
    try {
      const result = await storage.getHydrationTotalToday(req.params.userId);
      res.json(result);
    } catch (err) {
      const { status, body } = handleZodError(err);
      res.status(status).json(body);
    }
  });

  app.post("/api/hydration", requireAuth, async (req, res) => {
    try {
      const data = insertHydrationRecordSchema.parse({ ...req.body, userId: req.session.userId });
      const record = await storage.createHydrationRecord(data);
      res.status(201).json(record);
    } catch (err) {
      const { status, body } = handleZodError(err);
      res.status(status).json(body);
    }
  });

  app.delete("/api/hydration/:id", requireAuth, async (req, res) => {
    await storage.softDeleteHydrationRecord(req.params.id);
    res.status(204).end();
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
    "/sync/pull": {
      get: {
        operationId: "syncPull",
        summary: "Pull incremental changes since cursor (deterministic ordering)",
        parameters: [
          { name: "cursor", in: "query", schema: { type: "string", format: "date-time" }, description: "ISO-8601 timestamp cursor from previous pull" },
          { name: "limit", in: "query", schema: { type: "integer", default: 100, minimum: 1, maximum: 500 }, description: "Max records per table" },
          { name: "tables", in: "query", schema: { type: "string" }, description: "Comma-separated table names" },
        ],
        responses: {
          "200": {
            description: "Incremental sync response",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/SyncPullResponse" },
              },
            },
          },
          "400": { description: "Invalid parameters", content: { "application/json": { schema: { $ref: "#/components/schemas/Error" } } } },
        },
      },
    },
    "/sync/push": {
      post: {
        operationId: "syncPush",
        summary: "Push local changes to server (idempotent)",
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/SyncPushRequest" },
            },
          },
        },
        responses: {
          "200": {
            description: "Push result",
            content: { "application/json": { schema: { $ref: "#/components/schemas/SyncPushResponse" } } },
          },
          "400": { description: "Validation error", content: { "application/json": { schema: { $ref: "#/components/schemas/Error" } } } },
        },
      },
    },
    "/users": {
      post: {
        operationId: "createUser",
        summary: "Create user",
        requestBody: { required: true, content: { "application/json": { schema: { $ref: "#/components/schemas/InsertUser" } } } },
        responses: {
          "201": { description: "Created", content: { "application/json": { schema: { $ref: "#/components/schemas/User" } } } },
          "400": { description: "Validation error", content: { "application/json": { schema: { $ref: "#/components/schemas/Error" } } } },
        },
      },
    },
    "/users/{id}": {
      get: {
        operationId: "getUser",
        parameters: [{ name: "id", in: "path", required: true, schema: { type: "string", format: "uuid" } }],
        responses: {
          "200": { description: "User", content: { "application/json": { schema: { $ref: "#/components/schemas/User" } } } },
          "404": { description: "Not found", content: { "application/json": { schema: { $ref: "#/components/schemas/Error" } } } },
        },
      },
      patch: {
        operationId: "updateUser",
        parameters: [{ name: "id", in: "path", required: true, schema: { type: "string", format: "uuid" } }],
        requestBody: { content: { "application/json": { schema: { $ref: "#/components/schemas/InsertUser" } } } },
        responses: {
          "200": { description: "Updated", content: { "application/json": { schema: { $ref: "#/components/schemas/User" } } } },
          "404": { description: "Not found", content: { "application/json": { schema: { $ref: "#/components/schemas/Error" } } } },
        },
      },
      delete: {
        operationId: "softDeleteUser",
        parameters: [{ name: "id", in: "path", required: true, schema: { type: "string", format: "uuid" } }],
        responses: { "204": { description: "Soft-deleted" } },
      },
    },
    "/devices": {
      post: {
        operationId: "createDevice",
        requestBody: { required: true, content: { "application/json": { schema: { $ref: "#/components/schemas/InsertDevice" } } } },
        responses: { "201": { description: "Created", content: { "application/json": { schema: { $ref: "#/components/schemas/Device" } } } } },
      },
    },
    "/body-records": {
      post: {
        operationId: "createBodyRecord",
        requestBody: { required: true, content: { "application/json": { schema: { $ref: "#/components/schemas/InsertBodyRecord" } } } },
        responses: { "201": { description: "Created", content: { "application/json": { schema: { $ref: "#/components/schemas/BodyRecord" } } } } },
      },
    },
    "/goals": {
      post: {
        operationId: "createGoal",
        requestBody: { required: true, content: { "application/json": { schema: { $ref: "#/components/schemas/InsertGoal" } } } },
        responses: { "201": { description: "Created", content: { "application/json": { schema: { $ref: "#/components/schemas/Goal" } } } } },
      },
    },
    "/foods": {
      get: {
        operationId: "listFoods",
        responses: { "200": { description: "Food list", content: { "application/json": { schema: { type: "array", items: { $ref: "#/components/schemas/Food" } } } } } },
      },
      post: {
        operationId: "createFood",
        requestBody: { required: true, content: { "application/json": { schema: { $ref: "#/components/schemas/InsertFood" } } } },
        responses: { "201": { description: "Created" } },
      },
    },
    "/food-stock": {
      post: {
        operationId: "createFoodStock",
        requestBody: { required: true, content: { "application/json": { schema: { $ref: "#/components/schemas/InsertFoodStock" } } } },
        responses: { "201": { description: "Created" } },
      },
    },
  },
  components: {
    schemas: {
      Error: {
        type: "object",
        properties: { error: { type: "string" } },
        required: ["error"],
      },
      SyncPullResponse: {
        type: "object",
        required: ["eventos", "cursor_proximo", "tem_mais", "timestamp"],
        properties: {
          eventos: {
            type: "object",
            additionalProperties: {
              type: "object",
              properties: {
                created: { type: "array", items: { type: "object" } },
                updated: { type: "array", items: { type: "object" } },
                deleted: { type: "array", items: { type: "string", format: "uuid" } },
              },
            },
          },
          cursor_proximo: { type: "string", format: "date-time", nullable: true },
          tem_mais: { type: "boolean" },
          timestamp: { type: "number" },
        },
      },
      SyncPushRequest: {
        type: "object",
        required: ["changes"],
        properties: {
          changes: {
            type: "array",
            items: {
              type: "object",
              required: ["table", "action", "data"],
              properties: {
                id: { type: "string", format: "uuid" },
                table: { type: "string", enum: ["users", "devices", "body_records", "goals", "foods", "food_stock"] },
                action: { type: "string", enum: ["create", "update", "delete"] },
                data: { type: "object" },
              },
            },
          },
          clientId: { type: "string" },
          idempotencyKey: { type: "string" },
        },
      },
      SyncPushResponse: {
        type: "object",
        required: ["applied", "errors"],
        properties: {
          applied: { type: "integer" },
          errors: {
            type: "array",
            items: {
              type: "object",
              properties: { index: { type: "integer" }, error: { type: "string" } },
            },
          },
        },
      },
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
          createdAt: { type: "string", format: "date-time" },
          updatedAt: { type: "string", format: "date-time" },
          deletedAt: { type: "string", format: "date-time", nullable: true },
        },
      },
      InsertUser: {
        type: "object",
        required: ["username"],
        properties: {
          username: { type: "string" },
          displayName: { type: "string" },
          email: { type: "string" },
          heightCm: { type: "number" },
          birthDate: { type: "string" },
          sex: { type: "string" },
          activityLevel: { type: "string" },
        },
      },
      Device: {
        type: "object",
        properties: {
          id: { type: "string", format: "uuid" },
          userId: { type: "string", format: "uuid" },
          name: { type: "string" },
          type: { type: "string" },
          macAddress: { type: "string", nullable: true },
          manufacturer: { type: "string", nullable: true },
          model: { type: "string", nullable: true },
          lastSeenAt: { type: "string", format: "date-time", nullable: true },
          createdAt: { type: "string", format: "date-time" },
          updatedAt: { type: "string", format: "date-time" },
          deletedAt: { type: "string", format: "date-time", nullable: true },
        },
      },
      InsertDevice: {
        type: "object",
        required: ["userId", "name"],
        properties: {
          userId: { type: "string", format: "uuid" },
          name: { type: "string" },
          type: { type: "string", default: "scale" },
          macAddress: { type: "string" },
          manufacturer: { type: "string" },
          model: { type: "string" },
        },
      },
      BodyRecord: {
        type: "object",
        properties: {
          id: { type: "string", format: "uuid" },
          userId: { type: "string", format: "uuid" },
          deviceId: { type: "string", format: "uuid", nullable: true },
          weightKg: { type: "number" },
          fatPercent: { type: "number", nullable: true },
          muscleMassKg: { type: "number", nullable: true },
          bmi: { type: "number", nullable: true },
          impedance: { type: "number", nullable: true },
          source: { type: "string" },
          measuredAt: { type: "string", format: "date-time" },
          createdAt: { type: "string", format: "date-time" },
          updatedAt: { type: "string", format: "date-time" },
          deletedAt: { type: "string", format: "date-time", nullable: true },
        },
      },
      InsertBodyRecord: {
        type: "object",
        required: ["userId", "weightKg"],
        properties: {
          userId: { type: "string", format: "uuid" },
          deviceId: { type: "string", format: "uuid" },
          weightKg: { type: "number" },
          fatPercent: { type: "number" },
          muscleMassKg: { type: "number" },
          bmi: { type: "number" },
          impedance: { type: "number" },
          source: { type: "string", default: "manual" },
          measuredAt: { type: "string", format: "date-time" },
        },
      },
      Goal: {
        type: "object",
        properties: {
          id: { type: "string", format: "uuid" },
          userId: { type: "string", format: "uuid" },
          type: { type: "string" },
          targetValue: { type: "number" },
          currentValue: { type: "number", nullable: true },
          unit: { type: "string" },
          startDate: { type: "string", format: "date-time" },
          endDate: { type: "string", format: "date-time", nullable: true },
          status: { type: "string" },
          createdAt: { type: "string", format: "date-time" },
          updatedAt: { type: "string", format: "date-time" },
          deletedAt: { type: "string", format: "date-time", nullable: true },
        },
      },
      InsertGoal: {
        type: "object",
        required: ["userId", "type", "targetValue"],
        properties: {
          userId: { type: "string", format: "uuid" },
          type: { type: "string" },
          targetValue: { type: "number" },
          unit: { type: "string", default: "kg" },
          endDate: { type: "string", format: "date-time" },
        },
      },
      Food: {
        type: "object",
        properties: {
          id: { type: "string", format: "uuid" },
          name: { type: "string" },
          brand: { type: "string", nullable: true },
          barcode: { type: "string", nullable: true },
          servingSizeG: { type: "number" },
          caloriesKcal: { type: "number" },
          proteinG: { type: "number" },
          carbsG: { type: "number" },
          fatG: { type: "number" },
          fiberG: { type: "number", nullable: true },
          sodiumMg: { type: "number", nullable: true },
          createdAt: { type: "string", format: "date-time" },
          updatedAt: { type: "string", format: "date-time" },
          deletedAt: { type: "string", format: "date-time", nullable: true },
        },
      },
      InsertFood: {
        type: "object",
        required: ["name"],
        properties: {
          name: { type: "string" },
          brand: { type: "string" },
          barcode: { type: "string" },
          servingSizeG: { type: "number" },
          caloriesKcal: { type: "number" },
          proteinG: { type: "number" },
          carbsG: { type: "number" },
          fatG: { type: "number" },
          fiberG: { type: "number" },
          sodiumMg: { type: "number" },
        },
      },
      InsertFoodStock: {
        type: "object",
        required: ["userId", "foodId"],
        properties: {
          userId: { type: "string", format: "uuid" },
          foodId: { type: "string", format: "uuid" },
          quantityG: { type: "number" },
          location: { type: "string" },
          expiresAt: { type: "string", format: "date-time" },
        },
      },
    },
  },
};
