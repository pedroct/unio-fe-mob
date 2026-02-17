import { eq, and, gt, isNull, asc, or, sql } from "drizzle-orm";
import { db } from "./db";
import {
  users,
  devices,
  bodyRecords,
  goals,
  foods,
  foodStock,
  syncLog,
  type User,
  type InsertUser,
  type Device,
  type InsertDevice,
  type BodyRecord,
  type InsertBodyRecord,
  type Goal,
  type InsertGoal,
  type Food,
  type InsertFood,
  type FoodStock,
  type InsertFoodStock,
} from "@shared/schema";

const SYNC_TABLES = {
  users,
  devices,
  body_records: bodyRecords,
  goals,
  foods,
  food_stock: foodStock,
} as const;

type SyncTableName = keyof typeof SYNC_TABLES;

function notDeleted(table: { deletedAt: any }) {
  return isNull(table.deletedAt);
}

export interface IStorage {
  getUser(id: string): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  updateUser(id: string, data: Partial<InsertUser>): Promise<User | undefined>;
  softDeleteUser(id: string): Promise<void>;

  getDevice(id: string): Promise<Device | undefined>;
  getDevicesByUser(userId: string): Promise<Device[]>;
  createDevice(device: InsertDevice): Promise<Device>;
  updateDevice(id: string, data: Partial<InsertDevice>): Promise<Device | undefined>;
  softDeleteDevice(id: string): Promise<void>;

  getBodyRecord(id: string): Promise<BodyRecord | undefined>;
  getBodyRecordsByUser(userId: string): Promise<BodyRecord[]>;
  createBodyRecord(record: InsertBodyRecord): Promise<BodyRecord>;
  updateBodyRecord(id: string, data: Partial<InsertBodyRecord>): Promise<BodyRecord | undefined>;
  softDeleteBodyRecord(id: string): Promise<void>;

  getGoal(id: string): Promise<Goal | undefined>;
  getGoalsByUser(userId: string): Promise<Goal[]>;
  createGoal(goal: InsertGoal): Promise<Goal>;
  updateGoal(id: string, data: Partial<InsertGoal>): Promise<Goal | undefined>;
  softDeleteGoal(id: string): Promise<void>;

  getFood(id: string): Promise<Food | undefined>;
  getAllFoods(): Promise<Food[]>;
  createFood(food: InsertFood): Promise<Food>;
  updateFood(id: string, data: Partial<InsertFood>): Promise<Food | undefined>;
  softDeleteFood(id: string): Promise<void>;

  getFoodStock(id: string): Promise<FoodStock | undefined>;
  getFoodStockByUser(userId: string): Promise<FoodStock[]>;
  createFoodStock(stock: InsertFoodStock): Promise<FoodStock>;
  updateFoodStock(id: string, data: Partial<InsertFoodStock>): Promise<FoodStock | undefined>;
  softDeleteFoodStock(id: string): Promise<void>;

  syncPull(opts: {
    cursor?: string;
    limit: number;
    tables?: string[];
    userId?: string;
  }): Promise<{
    eventos: Record<string, { created: any[]; updated: any[]; deleted: string[] }>;
    cursor_proximo: string | null;
    tem_mais: boolean;
    timestamp: number;
  }>;

  syncPush(opts: {
    changes: Array<{ id?: string; table: string; action: string; data: Record<string, any> }>;
    clientId?: string;
    idempotencyKey?: string;
    userId?: string;
  }): Promise<{
    applied: number;
    errors: Array<{ index: number; error: string }>;
  }>;

  checkIdempotency(key: string): Promise<boolean>;
}

export class DatabaseStorage implements IStorage {
  // ── Users ──
  async getUser(id: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(and(eq(users.id, id), notDeleted(users)));
    return user;
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(and(eq(users.username, username), notDeleted(users)));
    return user;
  }

  async createUser(data: InsertUser): Promise<User> {
    const [user] = await db.insert(users).values(data).returning();
    await this.logSync("users", user.id, "create", user);
    return user;
  }

  async updateUser(id: string, data: Partial<InsertUser>): Promise<User | undefined> {
    const [user] = await db
      .update(users)
      .set({ ...data, updatedAt: new Date() })
      .where(and(eq(users.id, id), notDeleted(users)))
      .returning();
    if (user) await this.logSync("users", user.id, "update", user);
    return user;
  }

  async softDeleteUser(id: string): Promise<void> {
    const now = new Date();
    await db.update(users).set({ deletedAt: now, updatedAt: now }).where(eq(users.id, id));
    await this.logSync("users", id, "delete", null);
  }

  // ── Devices ──
  async getDevice(id: string): Promise<Device | undefined> {
    const [d] = await db.select().from(devices).where(and(eq(devices.id, id), notDeleted(devices)));
    return d;
  }

  async getDevicesByUser(userId: string): Promise<Device[]> {
    return db.select().from(devices).where(and(eq(devices.userId, userId), notDeleted(devices)));
  }

  async createDevice(data: InsertDevice): Promise<Device> {
    const [d] = await db.insert(devices).values(data).returning();
    await this.logSync("devices", d.id, "create", d);
    return d;
  }

  async updateDevice(id: string, data: Partial<InsertDevice>): Promise<Device | undefined> {
    const [d] = await db
      .update(devices)
      .set({ ...data, updatedAt: new Date() })
      .where(and(eq(devices.id, id), notDeleted(devices)))
      .returning();
    if (d) await this.logSync("devices", d.id, "update", d);
    return d;
  }

  async softDeleteDevice(id: string): Promise<void> {
    const now = new Date();
    await db.update(devices).set({ deletedAt: now, updatedAt: now }).where(eq(devices.id, id));
    await this.logSync("devices", id, "delete", null);
  }

  // ── Body Records ──
  async getBodyRecord(id: string): Promise<BodyRecord | undefined> {
    const [r] = await db.select().from(bodyRecords).where(and(eq(bodyRecords.id, id), notDeleted(bodyRecords)));
    return r;
  }

  async getBodyRecordsByUser(userId: string): Promise<BodyRecord[]> {
    return db.select().from(bodyRecords).where(and(eq(bodyRecords.userId, userId), notDeleted(bodyRecords)));
  }

  async createBodyRecord(data: InsertBodyRecord): Promise<BodyRecord> {
    const [r] = await db.insert(bodyRecords).values(data).returning();
    await this.logSync("body_records", r.id, "create", r);
    return r;
  }

  async updateBodyRecord(id: string, data: Partial<InsertBodyRecord>): Promise<BodyRecord | undefined> {
    const [r] = await db
      .update(bodyRecords)
      .set({ ...data, updatedAt: new Date() })
      .where(and(eq(bodyRecords.id, id), notDeleted(bodyRecords)))
      .returning();
    if (r) await this.logSync("body_records", r.id, "update", r);
    return r;
  }

  async softDeleteBodyRecord(id: string): Promise<void> {
    const now = new Date();
    await db.update(bodyRecords).set({ deletedAt: now, updatedAt: now }).where(eq(bodyRecords.id, id));
    await this.logSync("body_records", id, "delete", null);
  }

  // ── Goals ──
  async getGoal(id: string): Promise<Goal | undefined> {
    const [g] = await db.select().from(goals).where(and(eq(goals.id, id), notDeleted(goals)));
    return g;
  }

  async getGoalsByUser(userId: string): Promise<Goal[]> {
    return db.select().from(goals).where(and(eq(goals.userId, userId), notDeleted(goals)));
  }

  async createGoal(data: InsertGoal): Promise<Goal> {
    const [g] = await db.insert(goals).values(data).returning();
    await this.logSync("goals", g.id, "create", g);
    return g;
  }

  async updateGoal(id: string, data: Partial<InsertGoal>): Promise<Goal | undefined> {
    const [g] = await db
      .update(goals)
      .set({ ...data, updatedAt: new Date() })
      .where(and(eq(goals.id, id), notDeleted(goals)))
      .returning();
    if (g) await this.logSync("goals", g.id, "update", g);
    return g;
  }

  async softDeleteGoal(id: string): Promise<void> {
    const now = new Date();
    await db.update(goals).set({ deletedAt: now, updatedAt: now }).where(eq(goals.id, id));
    await this.logSync("goals", id, "delete", null);
  }

  // ── Foods ──
  async getFood(id: string): Promise<Food | undefined> {
    const [f] = await db.select().from(foods).where(and(eq(foods.id, id), notDeleted(foods)));
    return f;
  }

  async getAllFoods(): Promise<Food[]> {
    return db.select().from(foods).where(notDeleted(foods));
  }

  async createFood(data: InsertFood): Promise<Food> {
    const [f] = await db.insert(foods).values(data).returning();
    await this.logSync("foods", f.id, "create", f);
    return f;
  }

  async updateFood(id: string, data: Partial<InsertFood>): Promise<Food | undefined> {
    const [f] = await db
      .update(foods)
      .set({ ...data, updatedAt: new Date() })
      .where(and(eq(foods.id, id), notDeleted(foods)))
      .returning();
    if (f) await this.logSync("foods", f.id, "update", f);
    return f;
  }

  async softDeleteFood(id: string): Promise<void> {
    const now = new Date();
    await db.update(foods).set({ deletedAt: now, updatedAt: now }).where(eq(foods.id, id));
    await this.logSync("foods", id, "delete", null);
  }

  // ── Food Stock ──
  async getFoodStock(id: string): Promise<FoodStock | undefined> {
    const [s] = await db.select().from(foodStock).where(and(eq(foodStock.id, id), notDeleted(foodStock)));
    return s;
  }

  async getFoodStockByUser(userId: string): Promise<FoodStock[]> {
    return db.select().from(foodStock).where(and(eq(foodStock.userId, userId), notDeleted(foodStock)));
  }

  async createFoodStock(data: InsertFoodStock): Promise<FoodStock> {
    const [s] = await db.insert(foodStock).values(data).returning();
    await this.logSync("food_stock", s.id, "create", s);
    return s;
  }

  async updateFoodStock(id: string, data: Partial<InsertFoodStock>): Promise<FoodStock | undefined> {
    const [s] = await db
      .update(foodStock)
      .set({ ...data, updatedAt: new Date() })
      .where(and(eq(foodStock.id, id), notDeleted(foodStock)))
      .returning();
    if (s) await this.logSync("food_stock", s.id, "update", s);
    return s;
  }

  async softDeleteFoodStock(id: string): Promise<void> {
    const now = new Date();
    await db.update(foodStock).set({ deletedAt: now, updatedAt: now }).where(eq(foodStock.id, id));
    await this.logSync("food_stock", id, "delete", null);
  }

  // ── Sync Pull (cursor-based, deterministic ordering) ──
  async syncPull(opts: {
    cursor?: string;
    limit: number;
    tables?: string[];
    userId?: string;
  }): Promise<{
    eventos: Record<string, { created: any[]; updated: any[]; deleted: string[] }>;
    cursor_proximo: string | null;
    tem_mais: boolean;
    timestamp: number;
  }> {
    const now = Date.now();
    const cursorDate = opts.cursor ? new Date(opts.cursor) : new Date(0);
    const tablesToSync: SyncTableName[] = opts.tables
      ? (opts.tables.filter((t) => t in SYNC_TABLES) as SyncTableName[])
      : (Object.keys(SYNC_TABLES) as SyncTableName[]);

    const eventos: Record<string, { created: any[]; updated: any[]; deleted: string[] }> = {};
    let latestUpdatedAt: Date | null = null;
    let totalRows = 0;

    for (const tableName of tablesToSync) {
      const table = SYNC_TABLES[tableName];

      const allRows = await db
        .select()
        .from(table)
        .where(gt(table.updatedAt, cursorDate))
        .orderBy(asc(table.updatedAt), asc(table.id))
        .limit(opts.limit);

      const created: any[] = [];
      const updated: any[] = [];
      const deleted: string[] = [];

      for (const row of allRows) {
        totalRows++;
        const r = row as any;
        if (r.updatedAt && (!latestUpdatedAt || r.updatedAt > latestUpdatedAt)) {
          latestUpdatedAt = r.updatedAt;
        }
        if (r.deletedAt) {
          deleted.push(r.id);
        } else if (r.createdAt > cursorDate) {
          created.push(row);
        } else {
          updated.push(row);
        }
      }

      eventos[tableName] = { created, updated, deleted };
    }

    const tem_mais = totalRows >= opts.limit;
    const cursor_proximo = latestUpdatedAt ? latestUpdatedAt.toISOString() : null;

    return { eventos, cursor_proximo, tem_mais, timestamp: now };
  }

  // ── Sync Push (with idempotency) ──
  async syncPush(opts: {
    changes: Array<{ id?: string; table: string; action: string; data: Record<string, any> }>;
    clientId?: string;
    idempotencyKey?: string;
    userId?: string;
  }): Promise<{ applied: number; errors: Array<{ index: number; error: string }> }> {
    if (opts.idempotencyKey) {
      const exists = await this.checkIdempotency(opts.idempotencyKey);
      if (exists) {
        return { applied: 0, errors: [{ index: -1, error: "Idempotency key already processed" }] };
      }
    }

    let applied = 0;
    const errors: Array<{ index: number; error: string }> = [];

    for (let i = 0; i < opts.changes.length; i++) {
      const change = opts.changes[i];
      try {
        if (!(change.table in SYNC_TABLES)) {
          errors.push({ index: i, error: `Unknown table: ${change.table}` });
          continue;
        }

        const table = SYNC_TABLES[change.table as SyncTableName];

        switch (change.action) {
          case "create": {
            const insertData = this.coerceDates({ ...change.data });
            if (change.id) insertData.id = change.id;
            delete insertData._status;
            delete insertData._changed;
            delete insertData._id;
            await db.insert(table).values(insertData).onConflictDoNothing();
            await this.logSync(change.table, change.id || insertData.id, "create", insertData, opts.userId, opts.clientId, opts.idempotencyKey);
            applied++;
            break;
          }
          case "update": {
            const updateData: Record<string, any> = this.coerceDates({ ...change.data, updatedAt: new Date() });
            delete updateData.id;
            delete updateData._status;
            delete updateData._changed;
            delete updateData._id;
            const recordId = change.id || change.data.id;
            if (recordId) {
              await db.update(table).set(updateData).where(eq(table.id, recordId));
              await this.logSync(change.table, recordId, "update", updateData, opts.userId, opts.clientId, opts.idempotencyKey);
              applied++;
            }
            break;
          }
          case "delete": {
            const deleteId = change.id || change.data.id;
            if (deleteId) {
              const now = new Date();
              await db
                .update(table)
                .set({ deletedAt: now, updatedAt: now } as any)
                .where(eq(table.id, deleteId));
              await this.logSync(change.table, deleteId, "delete", null, opts.userId, opts.clientId, opts.idempotencyKey);
              applied++;
            }
            break;
          }
          default:
            errors.push({ index: i, error: `Unknown action: ${change.action}` });
        }
      } catch (err: any) {
        errors.push({ index: i, error: err.message || String(err) });
      }
    }

    return { applied, errors };
  }

  async checkIdempotency(key: string): Promise<boolean> {
    const [existing] = await db
      .select({ id: syncLog.id })
      .from(syncLog)
      .where(eq(syncLog.idempotencyKey, key))
      .limit(1);
    return !!existing;
  }

  // ── Helpers ──
  private coerceDates(data: Record<string, any>): Record<string, any> {
    const DATE_FIELDS = ["createdAt", "updatedAt", "deletedAt", "measuredAt", "expiresAt", "syncedAt", "lastSeenAt", "startDate", "endDate"];
    for (const key of DATE_FIELDS) {
      if (key in data && typeof data[key] === "string") {
        data[key] = new Date(data[key]);
      }
    }
    return data;
  }

  private async logSync(
    tableName: string,
    recordId: string,
    action: string,
    payload: any,
    userId?: string,
    clientId?: string,
    idempotencyKey?: string
  ): Promise<void> {
    try {
      await db.insert(syncLog).values({
        tableName,
        recordId,
        action,
        payload,
        userId: userId || null,
        clientId: clientId || null,
        idempotencyKey: idempotencyKey || null,
      });
    } catch {
    }
  }
}

export const storage = new DatabaseStorage();
