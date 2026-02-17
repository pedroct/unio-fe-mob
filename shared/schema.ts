import { sql } from "drizzle-orm";
import {
  pgTable,
  uuid,
  text,
  varchar,
  boolean,
  timestamp,
  real,
  integer,
  bigint,
  jsonb,
} from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const users = pgTable("users", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  username: text("username").notNull().unique(),
  displayName: text("display_name"),
  email: text("email"),
  avatarUrl: text("avatar_url"),
  heightCm: real("height_cm"),
  birthDate: text("birth_date"),
  sex: text("sex"),
  activityLevel: text("activity_level"),
  isDeleted: boolean("is_deleted").notNull().default(false),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const bodyRecords = pgTable("body_records", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: uuid("user_id").notNull().references(() => users.id),
  weightKg: real("weight_kg").notNull(),
  fatPercent: real("fat_percent"),
  muscleMassKg: real("muscle_mass_kg"),
  bmi: real("bmi"),
  source: text("source").notNull().default("manual"),
  measuredAt: timestamp("measured_at", { withTimezone: true }).notNull().defaultNow(),
  isDeleted: boolean("is_deleted").notNull().default(false),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const foods = pgTable("foods", {
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
  isDeleted: boolean("is_deleted").notNull().default(false),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const foodStock = pgTable("food_stock", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: uuid("user_id").notNull().references(() => users.id),
  foodId: uuid("food_id").notNull().references(() => foods.id),
  quantityG: real("quantity_g").notNull().default(0),
  expiresAt: timestamp("expires_at", { withTimezone: true }),
  location: text("location"),
  isDeleted: boolean("is_deleted").notNull().default(false),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const syncLog = pgTable("sync_log", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  tableName: text("table_name").notNull(),
  recordId: uuid("record_id").notNull(),
  action: text("action").notNull(),
  payload: jsonb("payload"),
  syncedAt: timestamp("synced_at", { withTimezone: true }).notNull().defaultNow(),
});

export const insertUserSchema = createInsertSchema(users).omit({
  id: true,
  isDeleted: true,
  createdAt: true,
  updatedAt: true,
});

export const insertBodyRecordSchema = createInsertSchema(bodyRecords).omit({
  id: true,
  isDeleted: true,
  createdAt: true,
  updatedAt: true,
});

export const insertFoodSchema = createInsertSchema(foods).omit({
  id: true,
  isDeleted: true,
  createdAt: true,
  updatedAt: true,
});

export const insertFoodStockSchema = createInsertSchema(foodStock).omit({
  id: true,
  isDeleted: true,
  createdAt: true,
  updatedAt: true,
});

export const syncPullRequestSchema = z.object({
  lastPulledAt: z.number().nullable(),
  tables: z.array(z.string()).optional(),
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
});

export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;

export type InsertBodyRecord = z.infer<typeof insertBodyRecordSchema>;
export type BodyRecord = typeof bodyRecords.$inferSelect;

export type InsertFood = z.infer<typeof insertFoodSchema>;
export type Food = typeof foods.$inferSelect;

export type InsertFoodStock = z.infer<typeof insertFoodStockSchema>;
export type FoodStock = typeof foodStock.$inferSelect;

export type SyncPullRequest = z.infer<typeof syncPullRequestSchema>;
export type SyncPushChange = z.infer<typeof syncPushChangeSchema>;
export type SyncPushRequest = z.infer<typeof syncPushRequestSchema>;
