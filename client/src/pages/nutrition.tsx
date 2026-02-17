import Layout from "@/components/layout";
import { ChevronLeft, Calendar, Plus, Package, Scale, Trash2 } from "lucide-react";
import { useLocation } from "wouter";
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/lib/auth";
import { apiFetch } from "@/lib/api";

const MEAL_SLOTS = [
  { id: "breakfast", name: "Café da Manhã" },
  { id: "lunch", name: "Almoço" },
  { id: "snack", name: "Lanche da Tarde" },
  { id: "dinner", name: "Jantar" },
];

const DEFAULT_GOALS = { kcal: 2200, proteina: 160, carboidrato: 200, gordura: 70 };

interface ResumoHoje {
  total_calorias?: number;
  total_proteinas?: number;
  total_carboidratos?: number;
  total_gorduras?: number;
  meta_calorias?: number;
  meta_proteinas?: number;
  meta_carboidratos?: number;
  meta_gorduras?: number;
  totalCalories?: number;
  totalProtein?: number;
  totalCarbs?: number;
  totalFat?: number;
  meals?: Record<string, { items: any[]; calories: number; protein: number; carbs: number; fat: number }>;
  refeicoes?: Record<string, { itens: any[]; calorias: number; proteinas: number; carboidratos: number; gorduras: number }>;
}

function extractSummary(s: ResumoHoje | undefined) {
  const cal = s?.total_calorias ?? s?.totalCalories ?? 0;
  const prot = s?.total_proteinas ?? s?.totalProtein ?? 0;
  const carbs = s?.total_carboidratos ?? s?.totalCarbs ?? 0;
  const fat = s?.total_gorduras ?? s?.totalFat ?? 0;
  const metaCal = s?.meta_calorias ?? DEFAULT_GOALS.kcal;
  const metaProt = s?.meta_proteinas ?? DEFAULT_GOALS.proteina;
  const metaCarbs = s?.meta_carboidratos ?? DEFAULT_GOALS.carboidrato;
  const metaFat = s?.meta_gorduras ?? DEFAULT_GOALS.gordura;
  return { cal, prot, carbs, fat, metaCal, metaProt, metaCarbs, metaFat };
}

export default function NutritionScreen() {
  const [, setLocation] = useLocation();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const today = new Date().toISOString().slice(0, 10);

  const { data: summary, isLoading } = useQuery<ResumoHoje>({
    queryKey: ["nutricao", "resumo-hoje"],
    queryFn: async () => {
      const res = await apiFetch("/api/nutricao/resumo-hoje");
      if (!res.ok) throw new Error("Erro ao buscar resumo nutricional");
      return res.json();
    },
    enabled: !!user,
  });

  const deleteMutation = useMutation({
    mutationFn: async (entryId: string) => {
      const res = await apiFetch(`/api/nutricao/diario/registros/${entryId}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Erro ao remover registro");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["nutricao", "resumo-hoje"] });
    },
  });

  const { cal: totalCal, prot: totalProt, carbs: totalCarbs, fat: totalFat, metaCal, metaProt, metaCarbs, metaFat } = extractSummary(summary);
  const available = metaCal - totalCal;
  const proteinPct = Math.min(100, (totalProt / metaProt) * 100);
  const carbsPct = Math.min(100, (totalCarbs / metaCarbs) * 100);
  const fatPct = Math.min(100, (totalFat / metaFat) * 100);

  const meals = summary?.meals || summary?.refeicoes || {};

  function getMealData(slotId: string) {
    const m = (meals as any)?.[slotId];
    if (!m) return { items: [], calories: 0 };
    return {
      items: m.items || m.itens || [],
      calories: m.calories ?? m.calorias ?? 0,
    };
  }

  function itemName(item: any) {
    return item?.food?.name || item?.alimento?.descricao || item?.descricao || "Alimento";
  }

  function itemQty(item: any) {
    return item?.quantityG ?? item?.quantidade_g ?? item?.quantidade ?? 0;
  }

  function itemKcal(item: any) {
    if (item?.calorias != null) return Math.round(item.calorias);
    const food = item?.food || item?.alimento;
    if (!food) return 0;
    const serving = food.servingSizeG || food.porcao_g || 100;
    const ratio = itemQty(item) / serving;
    return Math.round((food.caloriesKcal || food.calorias || 0) * ratio);
  }

  return (
    <Layout>
      <div className="bg-[#FAFBF8] min-h-screen pb-24">
        <header className="px-6 pt-14 pb-4 flex items-center justify-between sticky top-0 bg-[#FAFBF8]/80 backdrop-blur-md z-10">
          <button
            onClick={() => setLocation("/home")}
            className="w-10 h-10 -ml-2 flex items-center justify-center text-[#2F5641]"
            data-testid="button-back"
          >
            <ChevronLeft size={24} />
          </button>
          <h1 className="font-display text-lg font-semibold text-[#2F5641]">Diário Alimentar</h1>
          <button className="w-10 h-10 flex items-center justify-center text-[#2F5641]">
            <Calendar size={20} />
          </button>
        </header>

        <main className="px-6 space-y-6">
          <section className="bg-[#2F5641] rounded-3xl p-6 text-white shadow-lg shadow-[#2F5641]/20">
            <div className="flex justify-between items-end mb-6">
              <div>
                <p className="text-xs font-medium opacity-80 uppercase tracking-wider mb-1">Calorias Disponíveis</p>
                <h2 className="font-display text-4xl font-semibold" data-testid="text-calories-available">
                  {isLoading ? "..." : available} <span className="text-lg font-sans font-medium opacity-60">kcal</span>
                </h2>
              </div>
              <div className="text-right">
                <p className="text-xs font-medium opacity-80 uppercase tracking-wider mb-1">Consumido</p>
                <p className="font-semibold text-lg" data-testid="text-calories-consumed">
                  {isLoading ? "..." : `${totalCal} / ${metaCal}`}
                </p>
              </div>
            </div>

            <div className="space-y-4">
              <div>
                <div className="flex justify-between text-xs font-medium mb-1.5">
                  <span className="text-[#EFECB6]">Proteína</span>
                  <span>{Math.round(totalProt)}g / {metaProt}g</span>
                </div>
                <div className="h-2 bg-white/20 rounded-full overflow-hidden">
                  <div className="h-full bg-[#EFECB6] rounded-full transition-all" style={{ width: `${proteinPct}%` }} />
                </div>
              </div>
              <div>
                <div className="flex justify-between text-xs font-medium mb-1.5">
                  <span className="text-[#D97952]">Carboidratos</span>
                  <span>{Math.round(totalCarbs)}g / {metaCarbs}g</span>
                </div>
                <div className="h-2 bg-white/20 rounded-full overflow-hidden">
                  <div className="h-full bg-[#D97952] rounded-full transition-all" style={{ width: `${carbsPct}%` }} />
                </div>
              </div>
              <div>
                <div className="flex justify-between text-xs font-medium mb-1.5">
                  <span className="text-[#C7AE6A]">Gorduras</span>
                  <span>{Math.round(totalFat)}g / {metaFat}g</span>
                </div>
                <div className="h-2 bg-white/20 rounded-full overflow-hidden">
                  <div className="h-full bg-[#C7AE6A] rounded-full transition-all" style={{ width: `${fatPct}%` }} />
                </div>
              </div>
            </div>
          </section>

          <section className="mb-6">
            <div className="grid grid-cols-2 gap-3">
              <div
                onClick={() => setLocation("/pantry")}
                className="bg-[#2F5641] rounded-2xl p-4 text-white shadow-lg shadow-[#2F5641]/20 relative overflow-hidden cursor-pointer active:scale-[0.98] transition-transform"
                data-testid="link-pantry"
              >
                <div className="absolute top-0 right-0 p-3 opacity-10"><Package size={48} /></div>
                <div className="relative z-10">
                  <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center mb-3 backdrop-blur-sm"><Package size={16} /></div>
                  <h3 className="font-display text-lg mb-0.5">Despensa</h3>
                  <p className="text-[10px] opacity-80 uppercase tracking-wider font-medium">Gerenciar estoque</p>
                </div>
              </div>
              <div
                className="bg-white rounded-2xl p-4 shadow-sm border border-[#E8EBE5] relative overflow-hidden cursor-pointer active:scale-[0.98] transition-transform"
                onClick={() => setLocation("/nutrition/scale")}
                data-testid="link-scale"
              >
                <div className="flex justify-between items-start mb-2">
                  <div className="w-8 h-8 rounded-full bg-[#FAFBF8] flex items-center justify-center text-[#2F5641]"><Scale size={16} /></div>
                  <span className="text-[10px] font-bold text-[#648D4A] bg-[#648D4A]/10 px-2 py-1 rounded-lg">Online</span>
                </div>
                <h3 className="font-display text-sm text-[#2F5641]">Balança</h3>
                <p className="text-[10px] text-[#8B9286]">Conectada</p>
              </div>
            </div>
          </section>

          <div className="space-y-4">
            {MEAL_SLOTS.map((slot) => {
              const mealData = getMealData(slot.id);
              const items = mealData.items;
              const mealCalories = mealData.calories;

              return (
                <div key={slot.id} className="bg-white rounded-2xl border border-[#E8EBE5] overflow-hidden shadow-sm" data-testid={`card-meal-${slot.id}`}>
                  <div className="p-4 flex items-center justify-between bg-[#F5F3EE]/50">
                    <h3 className="font-semibold text-[#2F5641]">{slot.name}</h3>
                    <div className="flex items-center gap-3">
                      <span className="text-sm font-medium text-[#8B9286]" data-testid={`text-meal-calories-${slot.id}`}>{mealCalories} kcal</span>
                      <div className="flex gap-1">
                        <button
                          onClick={() => setLocation("/nutrition/scale")}
                          className="w-6 h-6 rounded-full bg-[#648D4A] flex items-center justify-center text-white hover:bg-[#52743C] transition-colors"
                          title="Usar Balança"
                        >
                          <Scale size={12} strokeWidth={2.5} />
                        </button>
                        <button
                          onClick={() => setLocation(`/nutrition/add?slot=${slot.id}`)}
                          className="w-6 h-6 rounded-full bg-[#C7AE6A] flex items-center justify-center text-white hover:bg-[#AD8C48] transition-colors"
                          title="Adicionar Manualmente"
                          data-testid={`button-add-${slot.id}`}
                        >
                          <Plus size={14} strokeWidth={3} />
                        </button>
                      </div>
                    </div>
                  </div>

                  {items.length > 0 ? (
                    <div className="px-4 pb-4 pt-1">
                      {items.map((item: any) => (
                        <div key={item.id} className="flex justify-between items-center py-3 border-b border-[#E8EBE5] last:border-0" data-testid={`row-meal-item-${item.id}`}>
                          <div>
                            <p className="text-sm font-medium text-[#5F6B5A]">{itemName(item)}</p>
                            <p className="text-xs text-[#8B9286]">{itemQty(item)}g</p>
                          </div>
                          <div className="flex items-center gap-3">
                            <span className="text-sm font-semibold text-[#2F5641]">{itemKcal(item)}</span>
                            <button
                              onClick={() => deleteMutation.mutate(item.id)}
                              className="w-6 h-6 rounded-full flex items-center justify-center text-[#BE4E35] hover:bg-[#BE4E35]/10 transition-colors"
                              data-testid={`button-delete-${item.id}`}
                            >
                              <Trash2 size={12} />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="px-4 py-6 text-center">
                      <p className="text-xs text-[#8B9286] mb-3">Nenhum alimento registrado</p>
                      <button
                        onClick={() => setLocation(`/nutrition/add?slot=${slot.id}`)}
                        className="text-xs font-semibold text-[#C7AE6A] uppercase tracking-wider hover:underline"
                      >
                        Adicionar Alimentos
                      </button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </main>
      </div>
    </Layout>
  );
}
