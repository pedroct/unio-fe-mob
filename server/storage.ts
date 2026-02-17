import { eq, and, gt, gte, lt, isNull, asc, desc, or, sql } from "drizzle-orm";
import { db } from "./db";
import {
  users,
  devices,
  bodyRecords,
  goals,
  foods,
  mealEntries,
  foodStock,
  purchaseRecords,
  hydrationRecords,
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
  type MealEntry,
  type InsertMealEntry,
  type FoodStock,
  type InsertFoodStock,
  type PurchaseRecord,
  type InsertPurchaseRecord,
  type HydrationRecord,
  type InsertHydrationRecord,
} from "@shared/schema";

const SYNC_TABLES = {
  users,
  devices,
  body_records: bodyRecords,
  goals,
  foods,
  meal_entries: mealEntries,
  food_stock: foodStock,
  purchase_records: purchaseRecords,
  hydration_records: hydrationRecords,
} as const;

type SyncTableName = keyof typeof SYNC_TABLES;

function notDeleted(table: { deletedAt: any }) {
  return isNull(table.deletedAt);
}

export interface IStorage {
  getUser(id: string): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  getUserByEmail(email: string): Promise<User | undefined>;
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

  getFoodStockWithStatus(userId: string): Promise<(FoodStock & { status: string })[]>;

  createPurchaseRecord(record: InsertPurchaseRecord): Promise<PurchaseRecord>;
  getPendingPurchasesByUser(userId: string): Promise<PurchaseRecord[]>;
  getPurchaseHistoryByUser(userId: string): Promise<PurchaseRecord[]>;
  confirmPurchase(purchaseId: string, actualQuantity: number): Promise<{ purchase: PurchaseRecord; stock: FoodStock }>;
  confirmAllPurchases(userId: string, items: Array<{ purchaseId: string; actualQuantity: number }>): Promise<{ confirmed: number }>;

  getMealEntry(id: string): Promise<MealEntry | undefined>;
  getMealEntriesByUserDate(userId: string, date: string): Promise<(MealEntry & { food: Food })[]>;
  getMealSummaryByUserDate(userId: string, date: string): Promise<{
    totalCalories: number;
    totalProtein: number;
    totalCarbs: number;
    totalFat: number;
    meals: Record<string, { items: (MealEntry & { food: Food })[]; calories: number; protein: number; carbs: number; fat: number }>;
  }>;
  createMealEntry(entry: InsertMealEntry): Promise<MealEntry>;
  updateMealEntry(id: string, data: Partial<InsertMealEntry>): Promise<MealEntry | undefined>;
  softDeleteMealEntry(id: string): Promise<void>;

  getBodyRecordsByUserWithRange(userId: string, range?: string): Promise<BodyRecord[]>;
  getLatestBodyRecord(userId: string): Promise<BodyRecord | undefined>;

  createHydrationRecord(record: InsertHydrationRecord): Promise<HydrationRecord>;
  getHydrationByUserToday(userId: string): Promise<HydrationRecord[]>;
  getHydrationTotalToday(userId: string): Promise<{ totalMl: number; goal: number; records: HydrationRecord[] }>;
  softDeleteHydrationRecord(id: string): Promise<void>;

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

  async getUserByEmail(email: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(and(eq(users.email, email), notDeleted(users)));
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

  private computeStockStatus(quantityG: number, minQuantityG: number): string {
    if (minQuantityG <= 0) return "good";
    const ratio = quantityG / minQuantityG;
    if (ratio <= 0.1) return "critical";
    if (ratio <= 0.4) return "low";
    if (ratio <= 0.7) return "medium";
    return "good";
  }

  async getFoodStockWithStatus(userId: string): Promise<(FoodStock & { status: string })[]> {
    const items = await db.select().from(foodStock).where(and(eq(foodStock.userId, userId), notDeleted(foodStock)));
    return items.map(item => ({
      ...item,
      status: this.computeStockStatus(item.quantityG, item.minQuantityG),
    }));
  }

  // ── Purchase Records ──
  async createPurchaseRecord(data: InsertPurchaseRecord): Promise<PurchaseRecord> {
    const [r] = await db.insert(purchaseRecords).values(data).returning();
    await this.logSync("purchase_records", r.id, "create", r);
    return r;
  }

  async getPendingPurchasesByUser(userId: string): Promise<PurchaseRecord[]> {
    return db
      .select()
      .from(purchaseRecords)
      .where(
        and(
          eq(purchaseRecords.userId, userId),
          eq(purchaseRecords.status, "pending"),
          notDeleted(purchaseRecords)
        )
      )
      .orderBy(desc(purchaseRecords.createdAt));
  }

  async getPurchaseHistoryByUser(userId: string): Promise<PurchaseRecord[]> {
    return db
      .select()
      .from(purchaseRecords)
      .where(
        and(
          eq(purchaseRecords.userId, userId),
          eq(purchaseRecords.status, "confirmed"),
          notDeleted(purchaseRecords)
        )
      )
      .orderBy(desc(purchaseRecords.purchasedAt));
  }

  async confirmPurchase(purchaseId: string, actualQuantity: number): Promise<{ purchase: PurchaseRecord; stock: FoodStock }> {
    const [purchase] = await db
      .update(purchaseRecords)
      .set({ actualQuantity, status: "confirmed", purchasedAt: new Date(), updatedAt: new Date() })
      .where(eq(purchaseRecords.id, purchaseId))
      .returning();

    if (!purchase) throw new Error("Purchase not found");

    const [currentStock] = await db.select().from(foodStock).where(eq(foodStock.id, purchase.foodStockId));
    if (!currentStock) throw new Error("Stock item not found");

    const newQuantity = currentStock.quantityG + actualQuantity;
    const [updatedStock] = await db
      .update(foodStock)
      .set({ quantityG: newQuantity, updatedAt: new Date() })
      .where(eq(foodStock.id, purchase.foodStockId))
      .returning();

    await this.logSync("purchase_records", purchase.id, "update", purchase);
    await this.logSync("food_stock", updatedStock.id, "update", updatedStock);

    return { purchase, stock: updatedStock };
  }

  async confirmAllPurchases(userId: string, items: Array<{ purchaseId: string; actualQuantity: number }>): Promise<{ confirmed: number }> {
    let confirmed = 0;
    for (const item of items) {
      try {
        await this.confirmPurchase(item.purchaseId, item.actualQuantity);
        confirmed++;
      } catch {}
    }
    return { confirmed };
  }

  // ── Meal Entries ──
  async getMealEntry(id: string): Promise<MealEntry | undefined> {
    const [e] = await db.select().from(mealEntries).where(and(eq(mealEntries.id, id), notDeleted(mealEntries)));
    return e;
  }

  async getMealEntriesByUserDate(userId: string, date: string): Promise<(MealEntry & { food: Food })[]> {
    const dayStart = new Date(date + "T00:00:00.000Z");
    const dayEnd = new Date(date + "T23:59:59.999Z");

    const rows = await db
      .select({ entry: mealEntries, food: foods })
      .from(mealEntries)
      .innerJoin(foods, eq(mealEntries.foodId, foods.id))
      .where(
        and(
          eq(mealEntries.userId, userId),
          gte(mealEntries.consumedAt, dayStart),
          lt(mealEntries.consumedAt, dayEnd),
          notDeleted(mealEntries)
        )
      )
      .orderBy(asc(mealEntries.consumedAt));

    return rows.map((r) => ({ ...r.entry, food: r.food }));
  }

  async getMealSummaryByUserDate(userId: string, date: string) {
    const entries = await this.getMealEntriesByUserDate(userId, date);

    const meals: Record<string, { items: (MealEntry & { food: Food })[]; calories: number; protein: number; carbs: number; fat: number }> = {};
    let totalCalories = 0;
    let totalProtein = 0;
    let totalCarbs = 0;
    let totalFat = 0;

    for (const entry of entries) {
      const ratio = entry.quantityG / (entry.food.servingSizeG || 100);
      const kcal = Math.round(entry.food.caloriesKcal * ratio);
      const prot = Math.round(entry.food.proteinG * ratio * 10) / 10;
      const carbs = Math.round(entry.food.carbsG * ratio * 10) / 10;
      const fat = Math.round(entry.food.fatG * ratio * 10) / 10;

      totalCalories += kcal;
      totalProtein += prot;
      totalCarbs += carbs;
      totalFat += fat;

      if (!meals[entry.mealSlot]) {
        meals[entry.mealSlot] = { items: [], calories: 0, protein: 0, carbs: 0, fat: 0 };
      }
      meals[entry.mealSlot].items.push(entry);
      meals[entry.mealSlot].calories += kcal;
      meals[entry.mealSlot].protein += prot;
      meals[entry.mealSlot].carbs += carbs;
      meals[entry.mealSlot].fat += fat;
    }

    return {
      totalCalories: Math.round(totalCalories),
      totalProtein: Math.round(totalProtein * 10) / 10,
      totalCarbs: Math.round(totalCarbs * 10) / 10,
      totalFat: Math.round(totalFat * 10) / 10,
      meals,
    };
  }

  async createMealEntry(data: InsertMealEntry): Promise<MealEntry> {
    const [e] = await db.insert(mealEntries).values(data).returning();
    await this.logSync("meal_entries", e.id, "create", e);
    return e;
  }

  async updateMealEntry(id: string, data: Partial<InsertMealEntry>): Promise<MealEntry | undefined> {
    const [e] = await db
      .update(mealEntries)
      .set({ ...data, updatedAt: new Date() })
      .where(and(eq(mealEntries.id, id), notDeleted(mealEntries)))
      .returning();
    if (e) await this.logSync("meal_entries", e.id, "update", e);
    return e;
  }

  async softDeleteMealEntry(id: string): Promise<void> {
    const now = new Date();
    await db.update(mealEntries).set({ deletedAt: now, updatedAt: now }).where(eq(mealEntries.id, id));
    await this.logSync("meal_entries", id, "delete", null);
  }

  // ── Body Records (enhanced) ──
  async getBodyRecordsByUserWithRange(userId: string, range?: string): Promise<BodyRecord[]> {
    const now = new Date();
    let since: Date | null = null;

    if (range === "7d") since = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    else if (range === "30d") since = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    else if (range === "3m") since = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
    else if (range === "1y") since = new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000);

    const conditions = [eq(bodyRecords.userId, userId), notDeleted(bodyRecords)];
    if (since) conditions.push(gte(bodyRecords.measuredAt, since));

    return db
      .select()
      .from(bodyRecords)
      .where(and(...conditions))
      .orderBy(asc(bodyRecords.measuredAt));
  }

  async getLatestBodyRecord(userId: string): Promise<BodyRecord | undefined> {
    const [r] = await db
      .select()
      .from(bodyRecords)
      .where(and(eq(bodyRecords.userId, userId), notDeleted(bodyRecords)))
      .orderBy(desc(bodyRecords.measuredAt))
      .limit(1);
    return r;
  }

  // ── Hydration Records ──
  async createHydrationRecord(data: InsertHydrationRecord): Promise<HydrationRecord> {
    const [r] = await db.insert(hydrationRecords).values(data).returning();
    await this.logSync("hydration_records", r.id, "create", r);
    return r;
  }

  async getHydrationByUserToday(userId: string): Promise<HydrationRecord[]> {
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    const todayEnd = new Date();
    todayEnd.setHours(23, 59, 59, 999);

    return db
      .select()
      .from(hydrationRecords)
      .where(
        and(
          eq(hydrationRecords.userId, userId),
          gte(hydrationRecords.recordedAt, todayStart),
          lt(hydrationRecords.recordedAt, todayEnd),
          notDeleted(hydrationRecords)
        )
      )
      .orderBy(desc(hydrationRecords.recordedAt));
  }

  async getHydrationTotalToday(userId: string): Promise<{ totalMl: number; goal: number; records: HydrationRecord[] }> {
    const records = await this.getHydrationByUserToday(userId);
    const totalMl = records.reduce((sum, r) => sum + r.amountMl, 0);
    return { totalMl, goal: 2500, records };
  }

  async softDeleteHydrationRecord(id: string): Promise<void> {
    const now = new Date();
    await db.update(hydrationRecords).set({ deletedAt: now, updatedAt: now }).where(eq(hydrationRecords.id, id));
    await this.logSync("hydration_records", id, "delete", null);
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
    const DATE_FIELDS = ["createdAt", "updatedAt", "deletedAt", "measuredAt", "expiresAt", "syncedAt", "lastSeenAt", "startDate", "endDate", "consumedAt"];
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
