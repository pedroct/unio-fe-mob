import { eq, and, gt, inArray, sql } from "drizzle-orm";
import { db } from "./db";
import {
  users,
  bodyRecords,
  foods,
  foodStock,
  syncLog,
  type User,
  type InsertUser,
  type BodyRecord,
  type InsertBodyRecord,
  type Food,
  type InsertFood,
  type FoodStock,
  type InsertFoodStock,
} from "@shared/schema";

const SYNC_TABLES = {
  users,
  body_records: bodyRecords,
  foods,
  food_stock: foodStock,
} as const;

type SyncTableName = keyof typeof SYNC_TABLES;

export interface IStorage {
  getUser(id: string): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  updateUser(id: string, data: Partial<InsertUser>): Promise<User | undefined>;
  softDeleteUser(id: string): Promise<void>;

  getBodyRecord(id: string): Promise<BodyRecord | undefined>;
  getBodyRecordsByUser(userId: string): Promise<BodyRecord[]>;
  createBodyRecord(record: InsertBodyRecord): Promise<BodyRecord>;
  updateBodyRecord(id: string, data: Partial<InsertBodyRecord>): Promise<BodyRecord | undefined>;
  softDeleteBodyRecord(id: string): Promise<void>;

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

  pullChanges(lastPulledAt: number | null, tables?: string[]): Promise<{
    changes: Record<string, { created: any[]; updated: any[]; deleted: string[] }>;
    timestamp: number;
  }>;
  pushChanges(changes: Array<{ id?: string; table: string; action: string; data: Record<string, any> }>): Promise<{
    applied: number;
    errors: Array<{ index: number; error: string }>;
  }>;
}

export class DatabaseStorage implements IStorage {
  async getUser(id: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(and(eq(users.id, id), eq(users.isDeleted, false)));
    return user;
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(and(eq(users.username, username), eq(users.isDeleted, false)));
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
      .where(and(eq(users.id, id), eq(users.isDeleted, false)))
      .returning();
    if (user) await this.logSync("users", user.id, "update", user);
    return user;
  }

  async softDeleteUser(id: string): Promise<void> {
    await db.update(users).set({ isDeleted: true, updatedAt: new Date() }).where(eq(users.id, id));
    await this.logSync("users", id, "delete", null);
  }

  async getBodyRecord(id: string): Promise<BodyRecord | undefined> {
    const [record] = await db.select().from(bodyRecords).where(and(eq(bodyRecords.id, id), eq(bodyRecords.isDeleted, false)));
    return record;
  }

  async getBodyRecordsByUser(userId: string): Promise<BodyRecord[]> {
    return db.select().from(bodyRecords).where(and(eq(bodyRecords.userId, userId), eq(bodyRecords.isDeleted, false)));
  }

  async createBodyRecord(data: InsertBodyRecord): Promise<BodyRecord> {
    const [record] = await db.insert(bodyRecords).values(data).returning();
    await this.logSync("body_records", record.id, "create", record);
    return record;
  }

  async updateBodyRecord(id: string, data: Partial<InsertBodyRecord>): Promise<BodyRecord | undefined> {
    const [record] = await db
      .update(bodyRecords)
      .set({ ...data, updatedAt: new Date() })
      .where(and(eq(bodyRecords.id, id), eq(bodyRecords.isDeleted, false)))
      .returning();
    if (record) await this.logSync("body_records", record.id, "update", record);
    return record;
  }

  async softDeleteBodyRecord(id: string): Promise<void> {
    await db.update(bodyRecords).set({ isDeleted: true, updatedAt: new Date() }).where(eq(bodyRecords.id, id));
    await this.logSync("body_records", id, "delete", null);
  }

  async getFood(id: string): Promise<Food | undefined> {
    const [food] = await db.select().from(foods).where(and(eq(foods.id, id), eq(foods.isDeleted, false)));
    return food;
  }

  async getAllFoods(): Promise<Food[]> {
    return db.select().from(foods).where(eq(foods.isDeleted, false));
  }

  async createFood(data: InsertFood): Promise<Food> {
    const [food] = await db.insert(foods).values(data).returning();
    await this.logSync("foods", food.id, "create", food);
    return food;
  }

  async updateFood(id: string, data: Partial<InsertFood>): Promise<Food | undefined> {
    const [food] = await db
      .update(foods)
      .set({ ...data, updatedAt: new Date() })
      .where(and(eq(foods.id, id), eq(foods.isDeleted, false)))
      .returning();
    if (food) await this.logSync("foods", food.id, "update", food);
    return food;
  }

  async softDeleteFood(id: string): Promise<void> {
    await db.update(foods).set({ isDeleted: true, updatedAt: new Date() }).where(eq(foods.id, id));
    await this.logSync("foods", id, "delete", null);
  }

  async getFoodStock(id: string): Promise<FoodStock | undefined> {
    const [stock] = await db.select().from(foodStock).where(and(eq(foodStock.id, id), eq(foodStock.isDeleted, false)));
    return stock;
  }

  async getFoodStockByUser(userId: string): Promise<FoodStock[]> {
    return db.select().from(foodStock).where(and(eq(foodStock.userId, userId), eq(foodStock.isDeleted, false)));
  }

  async createFoodStock(data: InsertFoodStock): Promise<FoodStock> {
    const [stock] = await db.insert(foodStock).values(data).returning();
    await this.logSync("food_stock", stock.id, "create", stock);
    return stock;
  }

  async updateFoodStock(id: string, data: Partial<InsertFoodStock>): Promise<FoodStock | undefined> {
    const [stock] = await db
      .update(foodStock)
      .set({ ...data, updatedAt: new Date() })
      .where(and(eq(foodStock.id, id), eq(foodStock.isDeleted, false)))
      .returning();
    if (stock) await this.logSync("food_stock", stock.id, "update", stock);
    return stock;
  }

  async softDeleteFoodStock(id: string): Promise<void> {
    await db.update(foodStock).set({ isDeleted: true, updatedAt: new Date() }).where(eq(foodStock.id, id));
    await this.logSync("food_stock", id, "delete", null);
  }

  async pullChanges(
    lastPulledAt: number | null,
    tableNames?: string[]
  ): Promise<{
    changes: Record<string, { created: any[]; updated: any[]; deleted: string[] }>;
    timestamp: number;
  }> {
    const now = Date.now();
    const cursor = lastPulledAt ? new Date(lastPulledAt) : new Date(0);
    const tablesToSync: SyncTableName[] = tableNames
      ? (tableNames.filter((t) => t in SYNC_TABLES) as SyncTableName[])
      : (Object.keys(SYNC_TABLES) as SyncTableName[]);

    const changes: Record<string, { created: any[]; updated: any[]; deleted: string[] }> = {};

    for (const tableName of tablesToSync) {
      const table = SYNC_TABLES[tableName];
      const allRows = await db
        .select()
        .from(table)
        .where(gt(table.updatedAt, cursor));

      const created: any[] = [];
      const updated: any[] = [];
      const deleted: string[] = [];

      for (const row of allRows) {
        if ((row as any).isDeleted) {
          deleted.push((row as any).id);
        } else if ((row as any).createdAt > cursor) {
          created.push(row);
        } else {
          updated.push(row);
        }
      }

      changes[tableName] = { created, updated, deleted };
    }

    return { changes, timestamp: now };
  }

  async pushChanges(
    changes: Array<{ id?: string; table: string; action: string; data: Record<string, any> }>
  ): Promise<{ applied: number; errors: Array<{ index: number; error: string }> }> {
    let applied = 0;
    const errors: Array<{ index: number; error: string }> = [];

    for (let i = 0; i < changes.length; i++) {
      const change = changes[i];
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
            await this.logSync(change.table, change.id || insertData.id, "create", insertData);
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
              await this.logSync(change.table, recordId, "update", updateData);
              applied++;
            }
            break;
          }
          case "delete": {
            const deleteId = change.id || change.data.id;
            if (deleteId) {
              await db
                .update(table)
                .set({ isDeleted: true, updatedAt: new Date() } as any)
                .where(eq(table.id, deleteId));
              await this.logSync(change.table, deleteId, "delete", null);
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

  private coerceDates(data: Record<string, any>): Record<string, any> {
    const DATE_FIELDS = ["createdAt", "updatedAt", "measuredAt", "expiresAt", "syncedAt"];
    for (const key of DATE_FIELDS) {
      if (key in data && typeof data[key] === "string") {
        data[key] = new Date(data[key]);
      }
    }
    return data;
  }

  private async logSync(tableName: string, recordId: string, action: string, payload: any): Promise<void> {
    try {
      await db.insert(syncLog).values({ tableName, recordId, action, payload });
    } catch {
    }
  }
}

export const storage = new DatabaseStorage();
