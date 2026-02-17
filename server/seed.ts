import pg from "pg";
import { drizzle } from "drizzle-orm/node-postgres";
import { foods, users, foodStock, gruposAlimentares, tiposAlimento, nutrientes, alimentosTbca, alimentoNutrientes } from "@shared/schema";

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

const SEED_GRUPOS = [
  { codigo: "A", descricao: "Cereais e derivados" },
  { codigo: "B", descricao: "Verduras, hortaliças e derivados" },
  { codigo: "C", descricao: "Frutas e derivados" },
  { codigo: "D", descricao: "Gorduras e óleos" },
  { codigo: "E", descricao: "Pescados e frutos do mar" },
  { codigo: "F", descricao: "Carnes e derivados" },
  { codigo: "G", descricao: "Leite e derivados" },
  { codigo: "H", descricao: "Bebidas (alcoólicas e não alcoólicas)" },
  { codigo: "I", descricao: "Ovos e derivados" },
  { codigo: "J", descricao: "Produtos açucarados" },
  { codigo: "K", descricao: "Miscelâneas" },
  { codigo: "L", descricao: "Outros alimentos industrializados" },
  { codigo: "M", descricao: "Alimentos preparados" },
  { codigo: "N", descricao: "Leguminosas e derivados" },
];

const SEED_TIPOS = [
  { codigo: "CRU", descricao: "Cru" },
  { codigo: "COZIDO", descricao: "Cozido" },
  { codigo: "GRELHADO", descricao: "Grelhado" },
  { codigo: "FRITO", descricao: "Frito" },
  { codigo: "ASSADO", descricao: "Assado" },
  { codigo: "REFOGADO", descricao: "Refogado" },
  { codigo: "PROCESSADO", descricao: "Processado" },
  { codigo: "DESIDRATADO", descricao: "Desidratado" },
];

const SEED_NUTRIENTES = [
  { codigo: "ENERGIA", nome: "Energia", unidade: "kcal" },
  { codigo: "PROTEINA", nome: "Proteínas", unidade: "g" },
  { codigo: "CARBOIDRATO", nome: "Carboidratos", unidade: "g" },
  { codigo: "GORDURA_TOTAL", nome: "Gorduras totais", unidade: "g" },
  { codigo: "FIBRA", nome: "Fibra alimentar", unidade: "g" },
  { codigo: "CALCIO", nome: "Cálcio", unidade: "mg" },
  { codigo: "FERRO", nome: "Ferro", unidade: "mg" },
  { codigo: "SODIO", nome: "Sódio", unidade: "mg" },
  { codigo: "POTASSIO", nome: "Potássio", unidade: "mg" },
  { codigo: "VITAMINA_C", nome: "Vitamina C", unidade: "mg" },
  { codigo: "VITAMINA_A", nome: "Vitamina A (RE)", unidade: "mcg" },
  { codigo: "COLESTEROL", nome: "Colesterol", unidade: "mg" },
  { codigo: "GORDURA_SATURADA", nome: "Gordura saturada", unidade: "g" },
  { codigo: "GORDURA_MONO", nome: "Gordura monoinsaturada", unidade: "g" },
  { codigo: "GORDURA_POLI", nome: "Gordura poli-insaturada", unidade: "g" },
];

interface AlimentoTbcaSeed {
  codigoTbca: string;
  descricao: string;
  grupoCodigo: string;
  tipoCodigo: string;
  porcaoBaseG: number;
  nutrientes: Record<string, number>;
}

const SEED_ALIMENTOS_TBCA: AlimentoTbcaSeed[] = [
  {
    codigoTbca: "C0001", descricao: "Abacate, cru", grupoCodigo: "C", tipoCodigo: "CRU", porcaoBaseG: 100,
    nutrientes: { ENERGIA: 96, PROTEINA: 1.2, CARBOIDRATO: 6.0, GORDURA_TOTAL: 8.4, FIBRA: 6.3, CALCIO: 8, FERRO: 0.2, SODIO: 0, POTASSIO: 206, VITAMINA_C: 8.7 },
  },
  {
    codigoTbca: "C0002", descricao: "Abacaxi, cru", grupoCodigo: "C", tipoCodigo: "CRU", porcaoBaseG: 100,
    nutrientes: { ENERGIA: 48, PROTEINA: 0.9, CARBOIDRATO: 12.3, GORDURA_TOTAL: 0.1, FIBRA: 1.0, CALCIO: 22, FERRO: 0.3, SODIO: 0, POTASSIO: 131, VITAMINA_C: 34.6 },
  },
  {
    codigoTbca: "C0003", descricao: "Banana, prata, crua", grupoCodigo: "C", tipoCodigo: "CRU", porcaoBaseG: 100,
    nutrientes: { ENERGIA: 98, PROTEINA: 1.3, CARBOIDRATO: 26.0, GORDURA_TOTAL: 0.1, FIBRA: 2.0, CALCIO: 8, FERRO: 0.4, SODIO: 0, POTASSIO: 358, VITAMINA_C: 21.6 },
  },
  {
    codigoTbca: "C0004", descricao: "Manga, crua", grupoCodigo: "C", tipoCodigo: "CRU", porcaoBaseG: 100,
    nutrientes: { ENERGIA: 64, PROTEINA: 0.4, CARBOIDRATO: 16.7, GORDURA_TOTAL: 0.3, FIBRA: 1.6, CALCIO: 12, FERRO: 0.2, SODIO: 0, POTASSIO: 148, VITAMINA_C: 65.5 },
  },
  {
    codigoTbca: "A0001", descricao: "Arroz, integral, cozido", grupoCodigo: "A", tipoCodigo: "COZIDO", porcaoBaseG: 100,
    nutrientes: { ENERGIA: 124, PROTEINA: 2.6, CARBOIDRATO: 25.8, GORDURA_TOTAL: 1.0, FIBRA: 2.7, CALCIO: 5, FERRO: 0.3, SODIO: 1, POTASSIO: 55 },
  },
  {
    codigoTbca: "A0002", descricao: "Arroz, branco, polido, cozido", grupoCodigo: "A", tipoCodigo: "COZIDO", porcaoBaseG: 100,
    nutrientes: { ENERGIA: 128, PROTEINA: 2.5, CARBOIDRATO: 28.1, GORDURA_TOTAL: 0.2, FIBRA: 1.6, CALCIO: 4, FERRO: 0.1, SODIO: 1, POTASSIO: 28 },
  },
  {
    codigoTbca: "A0003", descricao: "Aveia, flocos, crua", grupoCodigo: "A", tipoCodigo: "CRU", porcaoBaseG: 100,
    nutrientes: { ENERGIA: 394, PROTEINA: 13.9, CARBOIDRATO: 66.6, GORDURA_TOTAL: 8.5, FIBRA: 9.1, CALCIO: 48, FERRO: 4.4, SODIO: 5, POTASSIO: 336 },
  },
  {
    codigoTbca: "F0001", descricao: "Frango, peito, sem pele, grelhado", grupoCodigo: "F", tipoCodigo: "GRELHADO", porcaoBaseG: 100,
    nutrientes: { ENERGIA: 159, PROTEINA: 32.0, CARBOIDRATO: 0, GORDURA_TOTAL: 2.5, FIBRA: 0, CALCIO: 4, FERRO: 0.4, SODIO: 51, POTASSIO: 370 },
  },
  {
    codigoTbca: "F0002", descricao: "Carne bovina, patinho, grelhado", grupoCodigo: "F", tipoCodigo: "GRELHADO", porcaoBaseG: 100,
    nutrientes: { ENERGIA: 219, PROTEINA: 35.9, CARBOIDRATO: 0, GORDURA_TOTAL: 7.3, FIBRA: 0, CALCIO: 3, FERRO: 3.4, SODIO: 51, POTASSIO: 390 },
  },
  {
    codigoTbca: "F0003", descricao: "Carne suína, lombo, assado", grupoCodigo: "F", tipoCodigo: "ASSADO", porcaoBaseG: 100,
    nutrientes: { ENERGIA: 210, PROTEINA: 30.2, CARBOIDRATO: 0, GORDURA_TOTAL: 9.1, FIBRA: 0, CALCIO: 8, FERRO: 1.1, SODIO: 56, POTASSIO: 432 },
  },
  {
    codigoTbca: "E0001", descricao: "Salmão, filé, grelhado", grupoCodigo: "E", tipoCodigo: "GRELHADO", porcaoBaseG: 100,
    nutrientes: { ENERGIA: 208, PROTEINA: 27.3, CARBOIDRATO: 0, GORDURA_TOTAL: 10.4, FIBRA: 0, CALCIO: 8, FERRO: 0.3, SODIO: 59, POTASSIO: 363 },
  },
  {
    codigoTbca: "I0001", descricao: "Ovo, galinha, inteiro, cozido", grupoCodigo: "I", tipoCodigo: "COZIDO", porcaoBaseG: 100,
    nutrientes: { ENERGIA: 146, PROTEINA: 13.3, CARBOIDRATO: 0.6, GORDURA_TOTAL: 9.5, FIBRA: 0, CALCIO: 49, FERRO: 1.7, SODIO: 146, COLESTEROL: 397 },
  },
  {
    codigoTbca: "N0001", descricao: "Feijão, preto, cozido", grupoCodigo: "N", tipoCodigo: "COZIDO", porcaoBaseG: 100,
    nutrientes: { ENERGIA: 77, PROTEINA: 4.5, CARBOIDRATO: 14.0, GORDURA_TOTAL: 0.5, FIBRA: 8.4, CALCIO: 29, FERRO: 1.5, SODIO: 2, POTASSIO: 256 },
  },
  {
    codigoTbca: "N0002", descricao: "Lentilha, cozida", grupoCodigo: "N", tipoCodigo: "COZIDO", porcaoBaseG: 100,
    nutrientes: { ENERGIA: 93, PROTEINA: 6.3, CARBOIDRATO: 16.3, GORDURA_TOTAL: 0.5, FIBRA: 7.9, CALCIO: 16, FERRO: 1.5, SODIO: 2, POTASSIO: 220 },
  },
  {
    codigoTbca: "B0001", descricao: "Brócolis, cozido", grupoCodigo: "B", tipoCodigo: "COZIDO", porcaoBaseG: 100,
    nutrientes: { ENERGIA: 25, PROTEINA: 2.1, CARBOIDRATO: 4.4, GORDURA_TOTAL: 0.3, FIBRA: 3.4, CALCIO: 51, FERRO: 0.5, SODIO: 10, POTASSIO: 172, VITAMINA_C: 42 },
  },
  {
    codigoTbca: "B0002", descricao: "Espinafre, refogado", grupoCodigo: "B", tipoCodigo: "REFOGADO", porcaoBaseG: 100,
    nutrientes: { ENERGIA: 20, PROTEINA: 2.0, CARBOIDRATO: 2.6, GORDURA_TOTAL: 0.4, FIBRA: 2.1, CALCIO: 160, FERRO: 2.4, SODIO: 51, POTASSIO: 302, VITAMINA_C: 3 },
  },
  {
    codigoTbca: "G0001", descricao: "Leite, integral", grupoCodigo: "G", tipoCodigo: "CRU", porcaoBaseG: 100,
    nutrientes: { ENERGIA: 58, PROTEINA: 3.0, CARBOIDRATO: 4.5, GORDURA_TOTAL: 3.2, FIBRA: 0, CALCIO: 123, FERRO: 0.1, SODIO: 52, POTASSIO: 140, COLESTEROL: 14 },
  },
  {
    codigoTbca: "G0002", descricao: "Iogurte, natural, integral", grupoCodigo: "G", tipoCodigo: "PROCESSADO", porcaoBaseG: 100,
    nutrientes: { ENERGIA: 51, PROTEINA: 4.1, CARBOIDRATO: 6.1, GORDURA_TOTAL: 3.0, FIBRA: 0, CALCIO: 143, FERRO: 0.1, SODIO: 52, POTASSIO: 186 },
  },
  {
    codigoTbca: "D0001", descricao: "Azeite de oliva, extra virgem", grupoCodigo: "D", tipoCodigo: "CRU", porcaoBaseG: 100,
    nutrientes: { ENERGIA: 884, PROTEINA: 0, CARBOIDRATO: 0, GORDURA_TOTAL: 100, FIBRA: 0, GORDURA_SATURADA: 14, GORDURA_MONO: 73, GORDURA_POLI: 11 },
  },
  {
    codigoTbca: "A0004", descricao: "Batata doce, cozida", grupoCodigo: "A", tipoCodigo: "COZIDO", porcaoBaseG: 100,
    nutrientes: { ENERGIA: 77, PROTEINA: 0.6, CARBOIDRATO: 18.4, GORDURA_TOTAL: 0.1, FIBRA: 2.2, CALCIO: 17, FERRO: 0.2, SODIO: 4, POTASSIO: 340, VITAMINA_C: 23.8 },
  },
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

  console.log("\nSeeding TBCA data...");

  const existingGrupos = await db.select().from(gruposAlimentares);
  if (existingGrupos.length > 0) {
    console.log(`Grupos already has ${existingGrupos.length} entries. Skipping TBCA seed.`);
  } else {
    const insertedGrupos = await db.insert(gruposAlimentares).values(SEED_GRUPOS).returning();
    console.log(`Inserted ${insertedGrupos.length} food groups.`);
    const grupoMap = new Map(insertedGrupos.map(g => [g.codigo, g.id]));

    const insertedTipos = await db.insert(tiposAlimento).values(SEED_TIPOS).returning();
    console.log(`Inserted ${insertedTipos.length} food types.`);
    const tipoMap = new Map(insertedTipos.map(t => [t.codigo, t.id]));

    const insertedNutrientes = await db.insert(nutrientes).values(SEED_NUTRIENTES).returning();
    console.log(`Inserted ${insertedNutrientes.length} nutrients.`);
    const nutrienteMap = new Map(insertedNutrientes.map(n => [n.codigo, n.id]));

    for (const alimento of SEED_ALIMENTOS_TBCA) {
      const [inserted] = await db.insert(alimentosTbca).values({
        codigoTbca: alimento.codigoTbca,
        descricao: alimento.descricao,
        grupoId: grupoMap.get(alimento.grupoCodigo) || null,
        tipoId: tipoMap.get(alimento.tipoCodigo) || null,
        porcaoBaseG: alimento.porcaoBaseG,
      }).returning();

      const nutrientValues = Object.entries(alimento.nutrientes)
        .filter(([codigo]) => nutrienteMap.has(codigo))
        .map(([codigo, valor]) => ({
          alimentoTbcaId: inserted.id,
          nutrienteId: nutrienteMap.get(codigo)!,
          valorPor100g: valor,
        }));

      if (nutrientValues.length > 0) {
        await db.insert(alimentoNutrientes).values(nutrientValues);
      }
    }
    console.log(`Inserted ${SEED_ALIMENTOS_TBCA.length} TBCA foods with nutritional composition.`);
  }

  await pool.end();
  console.log("Seed complete!");
}

seed().catch(console.error);
