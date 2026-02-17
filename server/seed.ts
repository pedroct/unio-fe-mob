import pg from "pg";
import { drizzle } from "drizzle-orm/node-postgres";
import { foods, users, foodStock } from "@shared/schema";

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
    console.log(`Foods table already has ${existingFoods.length} entries. Skipping.`);
  } else {
    await db.insert(foods).values(SEED_FOODS);
    console.log(`Inserted ${SEED_FOODS.length} food items.`);
  }

  let defaultUserId: string;
  const existingUsers = await db.select().from(users);
  if (existingUsers.length === 0) {
    const [u] = await db.insert(users).values({
      username: "default_user",
      displayName: "Usuário UNIO",
    }).returning();
    defaultUserId = u.id;
    console.log("Created default user.");
  } else {
    defaultUserId = existingUsers[0].id;
  }

  const existingStock = await db.select().from(foodStock);
  if (existingStock.length === 0) {
    await db.insert(foodStock).values([
      { userId: defaultUserId, name: "Whey Protein", category: "Suplementos", unit: "g", quantityG: 200, minQuantityG: 900, image: "⚡" },
      { userId: defaultUserId, name: "Arroz Basmati", category: "Grãos", unit: "kg", quantityG: 2000, minQuantityG: 2000, image: "🍚" },
      { userId: defaultUserId, name: "Peito de Frango", category: "Proteínas", unit: "kg", quantityG: 3000, minQuantityG: 2000, image: "🍗" },
      { userId: defaultUserId, name: "Azeite de Oliva", category: "Gorduras", unit: "ml", quantityG: 50, minQuantityG: 500, image: "🫒" },
      { userId: defaultUserId, name: "Aveia em Flocos", category: "Grãos", unit: "g", quantityG: 500, minQuantityG: 1000, image: "🥣" },
      { userId: defaultUserId, name: "Creatina", category: "Suplementos", unit: "g", quantityG: 300, minQuantityG: 300, image: "💪" },
      { userId: defaultUserId, name: "Banana Prata", category: "Frutas", unit: "un", quantityG: 6, minQuantityG: 12, image: "🍌" },
      { userId: defaultUserId, name: "Ovos", category: "Proteínas", unit: "un", quantityG: 30, minQuantityG: 30, image: "🥚" },
    ]);
    console.log("Inserted pantry stock items.");
  } else {
    console.log(`Food stock already has ${existingStock.length} entries. Skipping.`);
  }

  await pool.end();
  console.log("Seed complete!");
}

seed().catch(console.error);
