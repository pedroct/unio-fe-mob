import type { Express } from "express";
import { type Server } from "http";
import { storage } from "./storage";
import {
  insertUserSchema,
  insertBodyRecordSchema,
  insertFoodSchema,
  insertFoodStockSchema,
  syncPullRequestSchema,
  syncPushRequestSchema,
} from "@shared/schema";
import { ZodError } from "zod";
import { fromZodError } from "zod-validation-error";

function handleZodError(err: unknown) {
  if (err instanceof ZodError) {
    return { status: 400, body: { error: fromZodError(err).message } };
  }
  return { status: 500, body: { error: String(err) } };
}

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {

  app.get("/api/users/:id", async (req, res) => {
    const user = await storage.getUser(req.params.id);
    if (!user) return res.status(404).json({ error: "User not found" });
    res.json(user);
  });

  app.post("/api/users", async (req, res) => {
    try {
      const data = insertUserSchema.parse(req.body);
      const user = await storage.createUser(data);
      res.status(201).json(user);
    } catch (err) {
      const { status, body } = handleZodError(err);
      res.status(status).json(body);
    }
  });

  app.patch("/api/users/:id", async (req, res) => {
    try {
      const data = insertUserSchema.partial().parse(req.body);
      const user = await storage.updateUser(req.params.id, data);
      if (!user) return res.status(404).json({ error: "User not found" });
      res.json(user);
    } catch (err) {
      const { status, body } = handleZodError(err);
      res.status(status).json(body);
    }
  });

  app.delete("/api/users/:id", async (req, res) => {
    await storage.softDeleteUser(req.params.id);
    res.status(204).end();
  });

  app.get("/api/users/:userId/body-records", async (req, res) => {
    const records = await storage.getBodyRecordsByUser(req.params.userId);
    res.json(records);
  });

  app.get("/api/body-records/:id", async (req, res) => {
    const record = await storage.getBodyRecord(req.params.id);
    if (!record) return res.status(404).json({ error: "Record not found" });
    res.json(record);
  });

  app.post("/api/body-records", async (req, res) => {
    try {
      const data = insertBodyRecordSchema.parse(req.body);
      const record = await storage.createBodyRecord(data);
      res.status(201).json(record);
    } catch (err) {
      const { status, body } = handleZodError(err);
      res.status(status).json(body);
    }
  });

  app.patch("/api/body-records/:id", async (req, res) => {
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

  app.delete("/api/body-records/:id", async (req, res) => {
    await storage.softDeleteBodyRecord(req.params.id);
    res.status(204).end();
  });

  app.get("/api/foods", async (_req, res) => {
    const allFoods = await storage.getAllFoods();
    res.json(allFoods);
  });

  app.get("/api/foods/:id", async (req, res) => {
    const food = await storage.getFood(req.params.id);
    if (!food) return res.status(404).json({ error: "Food not found" });
    res.json(food);
  });

  app.post("/api/foods", async (req, res) => {
    try {
      const data = insertFoodSchema.parse(req.body);
      const food = await storage.createFood(data);
      res.status(201).json(food);
    } catch (err) {
      const { status, body } = handleZodError(err);
      res.status(status).json(body);
    }
  });

  app.patch("/api/foods/:id", async (req, res) => {
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

  app.delete("/api/foods/:id", async (req, res) => {
    await storage.softDeleteFood(req.params.id);
    res.status(204).end();
  });

  app.get("/api/users/:userId/food-stock", async (req, res) => {
    const stock = await storage.getFoodStockByUser(req.params.userId);
    res.json(stock);
  });

  app.post("/api/food-stock", async (req, res) => {
    try {
      const data = insertFoodStockSchema.parse(req.body);
      const stock = await storage.createFoodStock(data);
      res.status(201).json(stock);
    } catch (err) {
      const { status, body } = handleZodError(err);
      res.status(status).json(body);
    }
  });

  app.patch("/api/food-stock/:id", async (req, res) => {
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

  app.delete("/api/food-stock/:id", async (req, res) => {
    await storage.softDeleteFoodStock(req.params.id);
    res.status(204).end();
  });

  app.get("/api/sync/pull", async (req, res) => {
    try {
      const lastPulledAt = req.query.last_pulled_at
        ? Number(req.query.last_pulled_at)
        : null;
      const tables = req.query.tables
        ? String(req.query.tables).split(",")
        : undefined;

      const result = await storage.pullChanges(lastPulledAt, tables);
      res.json(result);
    } catch (err) {
      res.status(500).json({ error: String(err) });
    }
  });

  app.post("/api/sync/push", async (req, res) => {
    try {
      const body = syncPushRequestSchema.parse(req.body);
      const result = await storage.pushChanges(body.changes);
      res.json(result);
    } catch (err) {
      const { status, body } = handleZodError(err);
      res.status(status).json(body);
    }
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
    description: "Backend API for UNIO health tracking app with sync support",
  },
  servers: [{ url: "/api" }],
  paths: {
    "/sync/pull": {
      get: {
        operationId: "syncPull",
        summary: "Pull incremental changes since last sync",
        parameters: [
          { name: "last_pulled_at", in: "query", schema: { type: "number", nullable: true }, description: "Unix timestamp (ms) of last sync" },
          { name: "tables", in: "query", schema: { type: "string" }, description: "Comma-separated table names to sync" },
        ],
        responses: {
          "200": {
            description: "Sync pull response",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    changes: {
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
                    timestamp: { type: "number" },
                  },
                },
              },
            },
          },
        },
      },
    },
    "/sync/push": {
      post: {
        operationId: "syncPush",
        summary: "Push local changes to server",
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
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
                        table: { type: "string", enum: ["users", "body_records", "foods", "food_stock"] },
                        action: { type: "string", enum: ["create", "update", "delete"] },
                        data: { type: "object" },
                      },
                    },
                  },
                  clientId: { type: "string" },
                },
              },
            },
          },
        },
        responses: {
          "200": {
            description: "Push result",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    applied: { type: "integer" },
                    errors: {
                      type: "array",
                      items: {
                        type: "object",
                        properties: {
                          index: { type: "integer" },
                          error: { type: "string" },
                        },
                      },
                    },
                  },
                },
              },
            },
          },
        },
      },
    },
    "/users": {
      post: {
        operationId: "createUser",
        summary: "Create a new user",
        requestBody: {
          required: true,
          content: { "application/json": { schema: { $ref: "#/components/schemas/InsertUser" } } },
        },
        responses: { "201": { description: "Created user", content: { "application/json": { schema: { $ref: "#/components/schemas/User" } } } } },
      },
    },
    "/users/{id}": {
      get: {
        operationId: "getUser",
        summary: "Get user by ID",
        parameters: [{ name: "id", in: "path", required: true, schema: { type: "string", format: "uuid" } }],
        responses: { "200": { description: "User object", content: { "application/json": { schema: { $ref: "#/components/schemas/User" } } } } },
      },
      patch: {
        operationId: "updateUser",
        summary: "Update user",
        parameters: [{ name: "id", in: "path", required: true, schema: { type: "string", format: "uuid" } }],
        requestBody: { content: { "application/json": { schema: { $ref: "#/components/schemas/InsertUser" } } } },
        responses: { "200": { description: "Updated user" } },
      },
      delete: {
        operationId: "deleteUser",
        summary: "Soft-delete user",
        parameters: [{ name: "id", in: "path", required: true, schema: { type: "string", format: "uuid" } }],
        responses: { "204": { description: "Deleted" } },
      },
    },
    "/body-records": {
      post: {
        operationId: "createBodyRecord",
        summary: "Create a body measurement record",
        requestBody: {
          required: true,
          content: { "application/json": { schema: { $ref: "#/components/schemas/InsertBodyRecord" } } },
        },
        responses: { "201": { description: "Created record", content: { "application/json": { schema: { $ref: "#/components/schemas/BodyRecord" } } } } },
      },
    },
    "/foods": {
      get: {
        operationId: "listFoods",
        summary: "List all active foods",
        responses: { "200": { description: "Array of foods", content: { "application/json": { schema: { type: "array", items: { $ref: "#/components/schemas/Food" } } } } } },
      },
      post: {
        operationId: "createFood",
        summary: "Create a food entry",
        requestBody: {
          required: true,
          content: { "application/json": { schema: { $ref: "#/components/schemas/InsertFood" } } },
        },
        responses: { "201": { description: "Created food" } },
      },
    },
  },
  components: {
    schemas: {
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
          isDeleted: { type: "boolean" },
          createdAt: { type: "string", format: "date-time" },
          updatedAt: { type: "string", format: "date-time" },
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
      BodyRecord: {
        type: "object",
        properties: {
          id: { type: "string", format: "uuid" },
          userId: { type: "string", format: "uuid" },
          weightKg: { type: "number" },
          fatPercent: { type: "number", nullable: true },
          muscleMassKg: { type: "number", nullable: true },
          bmi: { type: "number", nullable: true },
          source: { type: "string" },
          measuredAt: { type: "string", format: "date-time" },
          isDeleted: { type: "boolean" },
          createdAt: { type: "string", format: "date-time" },
          updatedAt: { type: "string", format: "date-time" },
        },
      },
      InsertBodyRecord: {
        type: "object",
        required: ["userId", "weightKg"],
        properties: {
          userId: { type: "string", format: "uuid" },
          weightKg: { type: "number" },
          fatPercent: { type: "number" },
          muscleMassKg: { type: "number" },
          bmi: { type: "number" },
          source: { type: "string" },
          measuredAt: { type: "string", format: "date-time" },
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
          isDeleted: { type: "boolean" },
          createdAt: { type: "string", format: "date-time" },
          updatedAt: { type: "string", format: "date-time" },
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
    },
  },
};
