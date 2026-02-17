import { sql } from "drizzle-orm";
import {
  pgTable,
  uuid,
  text,
  timestamp,
  real,
  integer,
  jsonb,
  index,
  uniqueIndex,
  boolean,
} from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// ---------------------------------------------------------------------------
// USERS
// ---------------------------------------------------------------------------
export const users = pgTable(
  "users",
  {
    id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
    username: text("username").notNull().unique(),
    passwordHash: text("password_hash"),
    displayName: text("display_name"),
    email: text("email"),
    avatarUrl: text("avatar_url"),
    heightCm: real("height_cm"),
    birthDate: text("birth_date"),
    sex: text("sex"),
    activityLevel: text("activity_level"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
    deletedAt: timestamp("deleted_at", { withTimezone: true }),
  },
  (t) => [
    index("idx_users_updated_at").on(t.updatedAt),
  ]
);

// ---------------------------------------------------------------------------
// DEVICES (dispositivos)
// ---------------------------------------------------------------------------
export const devices = pgTable(
  "devices",
  {
    id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
    userId: uuid("user_id").notNull().references(() => users.id),
    name: text("name").notNull(),
    type: text("type").notNull().default("scale"),
    macAddress: text("mac_address"),
    manufacturer: text("manufacturer"),
    model: text("model"),
    lastSeenAt: timestamp("last_seen_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
    deletedAt: timestamp("deleted_at", { withTimezone: true }),
  },
  (t) => [
    index("idx_devices_user_id").on(t.userId),
    index("idx_devices_updated_at").on(t.updatedAt),
    uniqueIndex("idx_devices_mac_user").on(t.userId, t.macAddress),
  ]
);

// ---------------------------------------------------------------------------
// BODY RECORDS (leituras biométricas)
// ---------------------------------------------------------------------------
export const bodyRecords = pgTable(
  "body_records",
  {
    id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
    userId: uuid("user_id").notNull().references(() => users.id),
    deviceId: uuid("device_id").references(() => devices.id),
    weightKg: real("weight_kg").notNull(),
    fatPercent: real("fat_percent"),
    muscleMassKg: real("muscle_mass_kg"),
    bmi: real("bmi"),
    impedance: real("impedance"),
    source: text("source").notNull().default("manual"),
    measuredAt: timestamp("measured_at", { withTimezone: true }).notNull().defaultNow(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
    deletedAt: timestamp("deleted_at", { withTimezone: true }),
  },
  (t) => [
    index("idx_body_records_user_id").on(t.userId),
    index("idx_body_records_updated_at").on(t.updatedAt),
    index("idx_body_records_measured_at").on(t.measuredAt),
  ]
);

// ---------------------------------------------------------------------------
// GOALS (metas)
// ---------------------------------------------------------------------------
export const goals = pgTable(
  "goals",
  {
    id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
    userId: uuid("user_id").notNull().references(() => users.id),
    type: text("type").notNull(),
    targetValue: real("target_value").notNull(),
    currentValue: real("current_value").default(0),
    unit: text("unit").notNull().default("kg"),
    startDate: timestamp("start_date", { withTimezone: true }).notNull().defaultNow(),
    endDate: timestamp("end_date", { withTimezone: true }),
    status: text("status").notNull().default("active"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
    deletedAt: timestamp("deleted_at", { withTimezone: true }),
  },
  (t) => [
    index("idx_goals_user_id").on(t.userId),
    index("idx_goals_updated_at").on(t.updatedAt),
  ]
);

// ---------------------------------------------------------------------------
// FOODS (alimentos)
// ---------------------------------------------------------------------------
export const foods = pgTable(
  "foods",
  {
    id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
    name: text("name").notNull(),
    brand: text("brand"),
    barcode: text("barcode"),
    servingSizeG: real("serving_size_g").notNull().default(100),
    caloriesKcal: real("calories_kcal").notNull().default(0),
    proteinG: real("protein_g").notNull().default(0),
    carbsG: real("carbs_g").notNull().default(0),
    fatG: real("fat_g").notNull().default(0),
    fiberG: real("fiber_g"),
    sodiumMg: real("sodium_mg"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
    deletedAt: timestamp("deleted_at", { withTimezone: true }),
  },
  (t) => [
    index("idx_foods_updated_at").on(t.updatedAt),
    index("idx_foods_barcode").on(t.barcode),
  ]
);

// ---------------------------------------------------------------------------
// FOOD STOCK (despensa)
// ---------------------------------------------------------------------------
export const foodStock = pgTable(
  "food_stock",
  {
    id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
    userId: uuid("user_id").notNull().references(() => users.id),
    foodId: uuid("food_id").notNull().references(() => foods.id),
    quantityG: real("quantity_g").notNull().default(0),
    expiresAt: timestamp("expires_at", { withTimezone: true }),
    location: text("location"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
    deletedAt: timestamp("deleted_at", { withTimezone: true }),
  },
  (t) => [
    index("idx_food_stock_user_id").on(t.userId),
    index("idx_food_stock_updated_at").on(t.updatedAt),
  ]
);

// ---------------------------------------------------------------------------
// HYDRATION RECORDS (registros de hidratação)
// ---------------------------------------------------------------------------
export const hydrationRecords = pgTable(
  "hydration_records",
  {
    id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
    userId: uuid("user_id").notNull().references(() => users.id),
    amountMl: integer("amount_ml").notNull(),
    beverageType: text("beverage_type").notNull().default("water"),
    label: text("label").notNull().default("Água"),
    recordedAt: timestamp("recorded_at", { withTimezone: true }).notNull().defaultNow(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
    deletedAt: timestamp("deleted_at", { withTimezone: true }),
  },
  (t) => [
    index("idx_hydration_user_id").on(t.userId),
    index("idx_hydration_updated_at").on(t.updatedAt),
    index("idx_hydration_recorded_at").on(t.recordedAt),
  ]
);

// ---------------------------------------------------------------------------
// SYNC LOG GLOBAL (registro_sincronizacao_global)
// ---------------------------------------------------------------------------
export const syncLog = pgTable(
  "sync_log",
  {
    id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
    tableName: text("table_name").notNull(),
    recordId: uuid("record_id").notNull(),
    action: text("action").notNull(),
    userId: uuid("user_id").references(() => users.id),
    clientId: text("client_id"),
    payload: jsonb("payload"),
    idempotencyKey: text("idempotency_key"),
    syncedAt: timestamp("synced_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index("idx_sync_log_synced_at").on(t.syncedAt),
    index("idx_sync_log_table_record").on(t.tableName, t.recordId),
    uniqueIndex("idx_sync_log_idempotency").on(t.idempotencyKey),
  ]
);

// ---------------------------------------------------------------------------
// SESSIONS (for auth)
// ---------------------------------------------------------------------------
export const sessions = pgTable("sessions", {
  sid: text("sid").primaryKey(),
  sess: jsonb("sess").notNull(),
  expire: timestamp("expire", { withTimezone: true }).notNull(),
});

// ---------------------------------------------------------------------------
// Zod Schemas (Insert)
// ---------------------------------------------------------------------------

export const insertUserSchema = createInsertSchema(users).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
  deletedAt: true,
});

export const insertDeviceSchema = createInsertSchema(devices).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
  deletedAt: true,
});

export const insertBodyRecordSchema = createInsertSchema(bodyRecords).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
  deletedAt: true,
});

export const insertGoalSchema = createInsertSchema(goals).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
  deletedAt: true,
});

export const insertFoodSchema = createInsertSchema(foods).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
  deletedAt: true,
});

export const insertFoodStockSchema = createInsertSchema(foodStock).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
  deletedAt: true,
});

export const insertHydrationRecordSchema = createInsertSchema(hydrationRecords).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
  deletedAt: true,
});

// ---------------------------------------------------------------------------
// Sync API Schemas
// ---------------------------------------------------------------------------

export const syncPullQuerySchema = z.object({
  cursor: z.string().optional(),
  limit: z.coerce.number().int().min(1).max(500).default(100),
  tables: z.string().optional(),
});

export const syncPushChangeSchema = z.object({
  id: z.string().uuid().optional(),
  table: z.string(),
  action: z.enum(["create", "update", "delete"]),
  data: z.record(z.any()),
});

export const syncPushRequestSchema = z.object({
  changes: z.array(syncPushChangeSchema),
  clientId: z.string().optional(),
  idempotencyKey: z.string().optional(),
});

// ---------------------------------------------------------------------------
// Exported Types
// ---------------------------------------------------------------------------

export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;

export type InsertDevice = z.infer<typeof insertDeviceSchema>;
export type Device = typeof devices.$inferSelect;

export type InsertBodyRecord = z.infer<typeof insertBodyRecordSchema>;
export type BodyRecord = typeof bodyRecords.$inferSelect;

export type InsertGoal = z.infer<typeof insertGoalSchema>;
export type Goal = typeof goals.$inferSelect;

export type InsertFood = z.infer<typeof insertFoodSchema>;
export type Food = typeof foods.$inferSelect;

export type InsertFoodStock = z.infer<typeof insertFoodStockSchema>;
export type FoodStock = typeof foodStock.$inferSelect;

export type InsertHydrationRecord = z.infer<typeof insertHydrationRecordSchema>;
export type HydrationRecord = typeof hydrationRecords.$inferSelect;

export type SyncPullQuery = z.infer<typeof syncPullQuerySchema>;
export type SyncPushChange = z.infer<typeof syncPushChangeSchema>;
export type SyncPushRequest = z.infer<typeof syncPushRequestSchema>;
