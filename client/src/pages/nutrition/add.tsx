import Layout from "@/components/layout";
import { ChevronLeft, Search, ScanBarcode, Plus, X, Check, Minus } from "lucide-react";
import { useLocation } from "wouter";
import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/lib/auth";
import { apiFetch } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";

interface FoodItem {
  id: string;
  name: string;
  brand: string | null;
  servingSizeG: number;
  caloriesKcal: number;
  proteinG: number;
  carbsG: number;
  fatG: number;
}

export default function NutritionAddScreen() {
  const [, setLocation] = useLocation();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [searchTerm, setSearchTerm] = useState("");
  const [showScanner, setShowScanner] = useState(false);
  const [selectedFood, setSelectedFood] = useState<FoodItem | null>(null);
  const [quantity, setQuantity] = useState(100);

  const params = new URLSearchParams(window.location.search);
  const mealSlot = params.get("slot") || "breakfast";

  const SLOT_NAMES: Record<string, string> = {
    breakfast: "Café da Manhã",
    lunch: "Almoço",
    snack: "Lanche da Tarde",
    dinner: "Jantar",
  };

  const { data: foods = [], isLoading: foodsLoading } = useQuery<FoodItem[]>({
    queryKey: ["/api/foods"],
    enabled: !!user,
  });

  const filteredFoods = foods.filter((f) =>
    f.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const addMutation = useMutation({
    mutationFn: async (food: FoodItem) => {
      const today = new Date().toISOString();
      const res = await apiFetch("/api/meal-entries", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          foodId: food.id,
          mealSlot,
          quantityG: quantity,
          unit: "g",
          consumedAt: today,
        }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Erro ao adicionar alimento.");
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/users/${user?.id}/meals/summary`] });
      toast({ title: "Alimento adicionado", description: `${selectedFood?.name} adicionado ao ${SLOT_NAMES[mealSlot]}` });
      setSelectedFood(null);
      setQuantity(100);
    },
    onError: (err: Error) => {
      toast({ title: "Erro", description: err.message, variant: "destructive" });
    },
  });

  const calcStats = (food: FoodItem, qty: number) => {
    const ratio = qty / (food.servingSizeG || 100);
    return {
      kcal: Math.round(food.caloriesKcal * ratio),
      protein: Math.round(food.proteinG * ratio * 10) / 10,
      carbs: Math.round(food.carbsG * ratio * 10) / 10,
      fat: Math.round(food.fatG * ratio * 10) / 10,
    };
  };

  return (
    <Layout>
      <div className="bg-[#FAFBF8] min-h-screen pb-24 relative">
        <header className="px-6 pt-14 pb-4 flex items-center gap-4 sticky top-0 bg-[#FAFBF8]/80 backdrop-blur-md z-10">
          <button
            onClick={() => setLocation("/nutrition")}
            className="w-10 h-10 -ml-2 flex items-center justify-center text-[#2F5641]"
            data-testid="button-back"
          >
            <ChevronLeft size={24} />
          </button>

          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-[#8B9286]" size={18} />
            <input
              type="text"
              placeholder="Buscar alimentos..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-white border border-[#E8EBE5] rounded-xl pl-10 pr-4 py-3 text-sm text-[#2F5641] focus:outline-none focus:border-[#C7AE6A] transition-colors"
              autoFocus
              data-testid="input-search"
            />
          </div>

          <button
            onClick={() => setShowScanner(true)}
            className="w-10 h-10 flex items-center justify-center bg-[#2F5641] text-white rounded-xl shadow-md active:scale-95 transition-transform"
            data-testid="button-scanner"
          >
            <ScanBarcode size={20} />
          </button>
        </header>

        <main className="px-6 pt-2">
          <div className="mb-4">
            <p className="text-xs font-medium text-[#8B9286] uppercase tracking-wider">
              Adicionando ao: <span className="text-[#2F5641] font-semibold">{SLOT_NAMES[mealSlot] || mealSlot}</span>
            </p>
          </div>

          {foodsLoading ? (
            <div className="py-12 text-center">
              <p className="text-sm text-[#8B9286]">Carregando alimentos...</p>
            </div>
          ) : filteredFoods.length === 0 ? (
            <div className="py-12 text-center">
              <p className="text-sm text-[#8B9286]">Nenhum alimento encontrado</p>
            </div>
          ) : (
            <div className="space-y-2">
              {filteredFoods.map((food) => (
                <button
                  key={food.id}
                  onClick={() => { setSelectedFood(food); setQuantity(Math.round(food.servingSizeG)); }}
                  className="w-full bg-white p-4 rounded-xl border border-[#E8EBE5] shadow-sm flex items-center justify-between hover:border-[#C7AE6A] transition-colors group"
                  data-testid={`card-food-${food.id}`}
                >
                  <div className="text-left">
                    <h3 className="font-semibold text-[#2F5641]">{food.name}</h3>
                    <p className="text-xs text-[#8B9286] mt-0.5">{food.servingSizeG}g • {Math.round(food.caloriesKcal)} kcal</p>
                    <div className="flex gap-2 mt-2">
                      <span className="text-[10px] px-1.5 py-0.5 bg-[#648D4A]/10 text-[#648D4A] rounded">P: {food.proteinG}g</span>
                      <span className="text-[10px] px-1.5 py-0.5 bg-[#D97952]/10 text-[#D97952] rounded">C: {food.carbsG}g</span>
                      <span className="text-[10px] px-1.5 py-0.5 bg-[#C7AE6A]/10 text-[#C7AE6A] rounded">G: {food.fatG}g</span>
                    </div>
                  </div>
                  <div className="w-8 h-8 rounded-full bg-[#FAFBF8] flex items-center justify-center text-[#C7AE6A] group-hover:bg-[#C7AE6A] group-hover:text-white transition-colors">
                    <Plus size={18} />
                  </div>
                </button>
              ))}
            </div>
          )}
        </main>

        <AnimatePresence>
          {selectedFood && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-50 bg-black/50 flex items-end justify-center"
              onClick={() => setSelectedFood(null)}
            >
              <motion.div
                initial={{ y: "100%" }}
                animate={{ y: 0 }}
                exit={{ y: "100%" }}
                transition={{ type: "spring", damping: 25, stiffness: 300 }}
                className="w-full max-w-[430px] bg-white rounded-t-3xl p-6 pb-10"
                onClick={(e) => e.stopPropagation()}
              >
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-display text-lg font-semibold text-[#2F5641]">{selectedFood.name}</h3>
                  <button onClick={() => setSelectedFood(null)} className="text-[#8B9286]">
                    <X size={20} />
                  </button>
                </div>

                <div className="flex items-center justify-center gap-4 mb-6">
                  <button
                    onClick={() => setQuantity(Math.max(10, quantity - 10))}
                    className="w-10 h-10 rounded-full bg-[#F5F3EE] flex items-center justify-center text-[#2F5641]"
                    data-testid="button-qty-minus"
                  >
                    <Minus size={18} />
                  </button>
                  <div className="text-center">
                    <input
                      type="number"
                      value={quantity}
                      onChange={(e) => setQuantity(Math.max(1, parseInt(e.target.value) || 0))}
                      className="w-20 text-center font-display text-3xl font-semibold text-[#2F5641] bg-transparent focus:outline-none"
                      data-testid="input-quantity"
                    />
                    <p className="text-xs text-[#8B9286]">gramas</p>
                  </div>
                  <button
                    onClick={() => setQuantity(quantity + 10)}
                    className="w-10 h-10 rounded-full bg-[#F5F3EE] flex items-center justify-center text-[#2F5641]"
                    data-testid="button-qty-plus"
                  >
                    <Plus size={18} />
                  </button>
                </div>

                {(() => {
                  const stats = calcStats(selectedFood, quantity);
                  return (
                    <div className="grid grid-cols-4 gap-2 mb-6">
                      <div className="bg-[#F5F3EE] rounded-xl p-3 text-center">
                        <p className="text-xs text-[#8B9286]">Kcal</p>
                        <p className="font-semibold text-[#2F5641]" data-testid="text-calc-kcal">{stats.kcal}</p>
                      </div>
                      <div className="bg-[#F5F3EE] rounded-xl p-3 text-center">
                        <p className="text-xs text-[#8B9286]">Prot</p>
                        <p className="font-semibold text-[#648D4A]">{stats.protein}g</p>
                      </div>
                      <div className="bg-[#F5F3EE] rounded-xl p-3 text-center">
                        <p className="text-xs text-[#8B9286]">Carbs</p>
                        <p className="font-semibold text-[#D97952]">{stats.carbs}g</p>
                      </div>
                      <div className="bg-[#F5F3EE] rounded-xl p-3 text-center">
                        <p className="text-xs text-[#8B9286]">Gord</p>
                        <p className="font-semibold text-[#C7AE6A]">{stats.fat}g</p>
                      </div>
                    </div>
                  );
                })()}

                <button
                  onClick={() => addMutation.mutate(selectedFood)}
                  disabled={addMutation.isPending}
                  className="w-full bg-[#2F5641] text-white py-4 rounded-2xl font-semibold flex items-center justify-center gap-2 active:scale-[0.98] transition-transform disabled:opacity-50"
                  data-testid="button-confirm-add"
                >
                  {addMutation.isPending ? (
                    "Adicionando..."
                  ) : (
                    <>
                      <Check size={18} />
                      Adicionar ao {SLOT_NAMES[mealSlot]}
                    </>
                  )}
                </button>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        <AnimatePresence>
          {showScanner && (
            <motion.div
              initial={{ opacity: 0, y: "100%" }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: "100%" }}
              className="fixed inset-0 z-50 bg-black flex flex-col"
            >
              <div className="flex justify-between items-center p-6 pt-14 bg-gradient-to-b from-black/50 to-transparent absolute top-0 left-0 right-0 z-10">
                <button onClick={() => setShowScanner(false)} className="text-white"><X size={28} /></button>
                <span className="text-white font-semibold">Escanear Código</span>
                <div className="w-7" />
              </div>
              <div className="flex-1 relative flex items-center justify-center">
                <div className="absolute inset-0 bg-[#1a1a1a]" />
                <div className="relative w-64 h-64 border-2 border-white/50 rounded-3xl overflow-hidden">
                  <div className="absolute inset-0 border-2 border-[#C7AE6A] rounded-3xl animate-pulse" />
                  <motion.div
                    className="absolute left-0 right-0 h-0.5 bg-[#C7AE6A] shadow-[0_0_20px_#C7AE6A]"
                    animate={{ top: ["10%", "90%", "10%"] }}
                    transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
                  />
                </div>
                <p className="absolute bottom-32 text-white/80 text-sm font-medium">Aponte para o código de barras</p>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </Layout>
  );
}
