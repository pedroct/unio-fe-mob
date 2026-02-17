import pg from "pg";
import { drizzle } from "drizzle-orm/node-postgres";
import { foods, users } from "@shared/schema";
import { eq } from "drizzle-orm";

const SEED_FOODS = [
  { name: "Peito de Frango Grelhado", servingSizeG: 100, caloriesKcal: 165, proteinG: 31, carbsG: 0, fatG: 3.6, fiberG: 0, sodiumMg: 74 },
  { name: "Arroz Branco Cozido", servingSizeG: 100, caloriesKcal: 130, proteinG: 2.7, carbsG: 28, fatG: 0.3, fiberG: 0.4, sodiumMg: 1 },
  { name: "Batata Doce Cozida", servingSizeG: 100, caloriesKcal: 86, proteinG: 1.6, carbsG: 20, fatG: 0.1, fiberG: 3, sodiumMg: 36 },
  { name: "Ovo Cozido", servingSizeG: 100, caloriesKcal: 155, proteinG: 13, carbsG: 1.1, fatG: 11, fiberG: 0, sodiumMg: 124 },
  { name: "Aveia em Flocos", servingSizeG: 100, caloriesKcal: 389, proteinG: 16.9, carbsG: 66, fatG: 6.9, fiberG: 10.6, sodiumMg: 2 },
  { name: "Banana Prata", servingSizeG: 100, caloriesKcal: 89, proteinG: 1.1, carbsG: 23, fatG: 0.3, fiberG: 2.6, sodiumMg: 1 },
  { name: "Whey Protein Isolado", servingSizeG: 30, caloriesKcal: 120, proteinG: 25, carbsG: 1, fatG: 0.5, fiberG: 0, sodiumMg: 50 },
  { name: "Azeite de Oliva Extra Virgem", servingSizeG: 15, caloriesKcal: 119, proteinG: 0, carbsG: 0, fatG: 13.5, fiberG: 0, sodiumMg: 0 },
  { name: "Brócolis Cozido", servingSizeG: 100, caloriesKcal: 35, proteinG: 2.4, carbsG: 7, fatG: 0.4, fiberG: 3.3, sodiumMg: 41 },
  { name: "Salmão Grelhado", servingSizeG: 100, caloriesKcal: 208, proteinG: 20, carbsG: 0, fatG: 13, fiberG: 0, sodiumMg: 59 },
  { name: "Feijão Preto Cozido", servingSizeG: 100, caloriesKcal: 132, proteinG: 8.9, carbsG: 24, fatG: 0.5, fiberG: 8.7, sodiumMg: 1 },
  { name: "Queijo Cottage", servingSizeG: 100, caloriesKcal: 98, proteinG: 11, carbsG: 3.4, fatG: 4.3, fiberG: 0, sodiumMg: 364 },
  { name: "Manteiga de Amendoim", servingSizeG: 30, caloriesKcal: 188, proteinG: 7, carbsG: 6, fatG: 16, fiberG: 1.8, sodiumMg: 152 },
  { name: "Abacate", servingSizeG: 100, caloriesKcal: 160, proteinG: 2, carbsG: 8.5, fatG: 14.7, fiberG: 6.7, sodiumMg: 7 },
  { name: "Iogurte Natural Integral", servingSizeG: 100, caloriesKcal: 61, proteinG: 3.5, carbsG: 4.7, fatG: 3.3, fiberG: 0, sodiumMg: 46 },
];

async function seed() {
  const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });
  const db = drizzle(pool);

  console.log("Seeding foods...");

  const existingFoods = await db.select().from(foods);
  if (existingFoods.length > 0) {
    console.log(`Foods table already has ${existingFoods.length} entries. Skipping seed.`);
  } else {
    await db.insert(foods).values(SEED_FOODS);
    console.log(`Inserted ${SEED_FOODS.length} food items.`);
  }

  const existingUsers = await db.select().from(users);
  if (existingUsers.length === 0) {
    await db.insert(users).values({
      username: "default_user",
      displayName: "Usuário UNIO",
    });
    console.log("Created default user.");
  }

  await pool.end();
  console.log("Seed complete!");
}

seed().catch(console.error);
