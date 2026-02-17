import Layout from "@/components/layout";
import { ChevronLeft, Bluetooth, Scale, Check, RefreshCw, Plus, Search, X, Loader2 } from "lucide-react";
import { useLocation } from "wouter";
import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useSyncEngine } from "@/lib/sync-engine";
import { apiRequest } from "@/lib/queryClient";

interface FoodItem {
  id: string;
  name: string;
  caloriesKcal: number;
  proteinG: number;
  carbsG: number;
  fatG: number;
  servingSizeG: number;
}

export default function NutritionScaleScreen() {
  const [, setLocation] = useLocation();
  const [connectionStatus, setConnectionStatus] = useState<"searching" | "connected" | "disconnected">("searching");
  const [weight, setWeight] = useState(0);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedFood, setSelectedFood] = useState<FoodItem | null>(null);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const queryClient = useQueryClient();
  const syncEngine = useSyncEngine();

  const { data: foods = [], isLoading: foodsLoading } = useQuery<FoodItem[]>({
    queryKey: ["/api/foods"],
  });

  const ensureUserMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/users", {
        username: "default_user",
        displayName: "Usuário UNIO",
      });
      return res.json();
    },
  });

  const saveRecordMutation = useMutation({
    mutationFn: async (payload: { userId: string; weightKg: number; source: string }) => {
      const res = await apiRequest("POST", "/api/body-records", payload);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/body-records"] });
    },
  });

  useEffect(() => {
    const timer = setTimeout(() => {
      setConnectionStatus("connected");
    }, 2500);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (connectionStatus === "connected" && weight === 0) {
      const timer = setTimeout(() => {
        setWeight(124);
      }, 1000);
      return () => clearTimeout(timer);
    }
  }, [connectionStatus, weight]);

  const filteredFoods = foods.filter((f: FoodItem) =>
    f.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const currentStats = selectedFood ? {
    kcal: Math.round((weight / selectedFood.servingSizeG) * selectedFood.caloriesKcal),
    protein: Math.round((weight / selectedFood.servingSizeG) * selectedFood.proteinG * 10) / 10,
    carbs: Math.round((weight / selectedFood.servingSizeG) * selectedFood.carbsG * 10) / 10,
    fat: Math.round((weight / selectedFood.servingSizeG) * selectedFood.fatG * 10) / 10,
  } : { kcal: 0, protein: 0, carbs: 0, fat: 0 };

  const handleConfirm = async () => {
    if (!selectedFood || weight === 0) return;

    try {
      let userId: string;
      try {
        const userRes = await apiRequest("POST", "/api/users", {
          username: "default_user",
          displayName: "Usuário UNIO",
        });
        const user = await userRes.json();
        userId = user.id;
      } catch {
        const pullResult = await syncEngine.pull(["users"]);
        const existingUsers = pullResult?.changes?.users?.created || [];
        if (existingUsers.length > 0) {
          userId = existingUsers[0].id;
        } else {
          throw new Error("No user available");
        }
      }

      syncEngine.pushChange("body_records", "create", {
        userId,
        weightKg: weight / 1000,
        source: "smart_scale",
        measuredAt: new Date().toISOString(),
      });

      setSaveSuccess(true);
      setTimeout(() => {
        setLocation("/nutrition");
      }, 1500);
    } catch (err) {
      console.error("Failed to save:", err);
    }
  };

  return (
    <Layout>
      <div className="bg-[#FAFBF8] min-h-screen pb-24 relative overflow-hidden flex flex-col">
        <header className="px-6 pt-14 pb-4 flex items-center justify-between sticky top-0 bg-[#FAFBF8]/95 backdrop-blur-sm z-10 shrink-0">
          <button
            data-testid="button-back"
            onClick={() => setLocation("/nutrition")}
            className="w-10 h-10 -ml-2 flex items-center justify-center text-[#2F5641]"
          >
            <ChevronLeft size={24} />
          </button>
          <h1 className="font-display text-lg font-semibold text-[#2F5641]">Balança Inteligente</h1>
          <div className={`w-10 h-10 flex items-center justify-center rounded-full transition-colors ${connectionStatus === 'connected' ? 'bg-[#648D4A]/10 text-[#648D4A]' : 'bg-[#E8EBE5] text-[#8B9286]'}`}>
            <Bluetooth size={20} className={connectionStatus === 'searching' ? 'animate-pulse' : ''} />
          </div>
        </header>

        <main className="px-6 flex-1 flex flex-col">
          <div className="text-center py-2 shrink-0 h-12">
            <AnimatePresence mode="wait">
              {connectionStatus === 'searching' ? (
                <motion.div
                  key="searching"
                  initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                  className="flex flex-col items-center gap-1"
                >
                  <RefreshCw size={16} className="animate-spin text-[#C7AE6A]" />
                  <p className="text-xs font-medium text-[#8B9286]">Buscando dispositivos...</p>
                </motion.div>
              ) : (
                <motion.div
                  key="connected"
                  initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
                  className="flex flex-col items-center gap-1"
                >
                  <div className="flex items-center gap-1.5 bg-[#648D4A]/10 px-3 py-1 rounded-full">
                    <Check size={12} className="text-[#648D4A]" strokeWidth={3} />
                    <span className="text-[10px] font-bold text-[#648D4A] uppercase tracking-wide">Conectado</span>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          <div className="relative flex flex-col items-center justify-center py-6 shrink-0">
            <div className="w-56 h-56 rounded-full border-4 border-[#E8EBE5] flex items-center justify-center relative bg-white shadow-xl shadow-[#2F5641]/5">
              <motion.div
                className="text-center"
                animate={{ scale: weight > 0 ? [1, 1.02, 1] : 1 }}
                transition={{ duration: 0.3 }}
              >
                <span data-testid="text-weight" className="font-display text-6xl font-bold text-[#2F5641] tabular-nums">
                  {weight}
                </span>
                <span className="block text-base font-medium text-[#8B9286] mt-1">gramas</span>
              </motion.div>

              <svg className="absolute inset-0 w-full h-full -rotate-90 pointer-events-none">
                <circle
                  cx="108" cy="108" r="104"
                  fill="none"
                  stroke="#648D4A"
                  strokeWidth="4"
                  strokeDasharray="653"
                  strokeDashoffset={653 - (653 * (Math.min(weight, 500) / 500))}
                  className="transition-all duration-500 ease-out"
                  strokeLinecap="round"
                />
              </svg>
            </div>

            <button
              data-testid="button-tare"
              onClick={() => setWeight(0)}
              className="mt-6 text-[10px] font-bold uppercase tracking-widest text-[#C7AE6A] border border-[#C7AE6A] px-5 py-1.5 rounded-full hover:bg-[#C7AE6A]/10 active:scale-95 transition-all"
            >
              Tarar
            </button>
          </div>

          <div className="flex-1 bg-white rounded-t-3xl shadow-[0_-5px_20px_rgba(0,0,0,0.05)] border-t border-[#E8EBE5] -mx-6 px-6 pt-6 flex flex-col">
            {saveSuccess ? (
              <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                className="flex-1 flex flex-col items-center justify-center gap-4"
              >
                <div className="w-16 h-16 rounded-full bg-[#648D4A]/10 flex items-center justify-center">
                  <Check size={32} className="text-[#648D4A]" />
                </div>
                <p className="text-lg font-semibold text-[#2F5641]">Salvo com sucesso!</p>
                <p className="text-sm text-[#8B9286]">Dados persistidos no servidor</p>
              </motion.div>
            ) : !selectedFood ? (
              <div className="flex-1 flex flex-col">
                <div className="relative mb-4">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-[#8B9286]" size={18} />
                  <input
                    data-testid="input-food-search"
                    type="text"
                    placeholder="Buscar alimento (ex: Frango)"
                    className="w-full bg-[#FAFBF8] border border-[#E8EBE5] rounded-xl py-3 pl-10 pr-4 text-sm focus:outline-none focus:border-[#2F5641] transition-colors"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    autoFocus
                  />
                </div>

                <div className="flex-1 overflow-y-auto space-y-2 pb-6">
                  {foodsLoading ? (
                    <div className="text-center py-8">
                      <Loader2 size={24} className="animate-spin mx-auto text-[#8B9286]" />
                      <p className="text-xs text-[#8B9286] mt-2">Carregando alimentos...</p>
                    </div>
                  ) : searchQuery.length > 0 ? (
                    filteredFoods.map((food: FoodItem) => (
                      <button
                        key={food.id}
                        data-testid={`button-food-${food.id}`}
                        onClick={() => setSelectedFood(food)}
                        className="w-full text-left p-3 rounded-xl hover:bg-[#FAFBF8] border border-transparent hover:border-[#E8EBE5] transition-all flex justify-between items-center group"
                      >
                        <span className="font-medium text-[#2F5641] text-sm">{food.name}</span>
                        <Plus size={16} className="text-[#C7AE6A] opacity-0 group-hover:opacity-100 transition-opacity" />
                      </button>
                    ))
                  ) : (
                    <div className="text-center py-8 opacity-40">
                      <Search size={32} className="mx-auto mb-2 text-[#8B9286]" />
                      <p className="text-xs text-[#8B9286]">Digite para buscar na base de dados</p>
                    </div>
                  )}

                  {syncEngine.isSyncing && (
                    <div className="text-center py-2">
                      <Loader2 size={14} className="animate-spin inline mr-1 text-[#C7AE6A]" />
                      <span className="text-xs text-[#8B9286]">Sincronizando...</span>
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <div className="flex-1 flex flex-col">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <span className="text-[10px] font-bold uppercase tracking-wider text-[#8B9286] block mb-0.5">Alimento Selecionado</span>
                    <h3 data-testid="text-selected-food" className="font-semibold text-[#2F5641] text-lg leading-tight">{selectedFood.name}</h3>
                  </div>
                  <button
                    data-testid="button-clear-food"
                    onClick={() => setSelectedFood(null)}
                    className="w-8 h-8 rounded-full bg-[#F5F3EE] flex items-center justify-center text-[#8B9286]"
                  >
                    <X size={16} />
                  </button>
                </div>

                <div className="grid grid-cols-4 gap-2 text-center mb-6">
                  <div className="bg-[#FAFBF8] rounded-xl p-2 border border-[#E8EBE5]">
                    <span data-testid="text-stat-kcal" className="block text-lg font-bold text-[#2F5641]">{currentStats.kcal}</span>
                    <span className="text-[9px] uppercase font-bold text-[#8B9286]">Kcal</span>
                  </div>
                  <div className="bg-[#FAFBF8] rounded-xl p-2 border border-[#E8EBE5]">
                    <span data-testid="text-stat-protein" className="block text-lg font-bold text-[#648D4A]">{currentStats.protein}g</span>
                    <span className="text-[9px] uppercase font-bold text-[#8B9286]">Prot</span>
                  </div>
                  <div className="bg-[#FAFBF8] rounded-xl p-2 border border-[#E8EBE5]">
                    <span data-testid="text-stat-carbs" className="block text-lg font-bold text-[#D97952]">{currentStats.carbs}g</span>
                    <span className="text-[9px] uppercase font-bold text-[#8B9286]">Carb</span>
                  </div>
                  <div className="bg-[#FAFBF8] rounded-xl p-2 border border-[#E8EBE5]">
                    <span data-testid="text-stat-fat" className="block text-lg font-bold text-[#C7AE6A]">{currentStats.fat}g</span>
                    <span className="text-[9px] uppercase font-bold text-[#8B9286]">Gord</span>
                  </div>
                </div>

                <button
                  data-testid="button-confirm"
                  disabled={weight === 0}
                  onClick={handleConfirm}
                  className="w-full bg-[#2F5641] disabled:bg-[#E8EBE5] disabled:text-[#8B9286] text-white py-4 rounded-2xl font-semibold text-lg shadow-xl shadow-[#2F5641]/20 flex items-center justify-center gap-2 active:scale-[0.98] transition-all mt-auto mb-6"
                >
                  <Plus size={20} /> Confirmar {weight}g
                </button>
              </div>
            )}

            <div className="pb-4 opacity-30 hover:opacity-100 transition-opacity">
              <input
                data-testid="slider-weight"
                type="range"
                min="0"
                max="500"
                value={weight}
                onChange={(e) => setWeight(parseInt(e.target.value))}
                className="w-full accent-[#2F5641] h-1 bg-gray-200 rounded-lg appearance-none cursor-pointer"
              />
            </div>
          </div>
        </main>
      </div>
    </Layout>
  );
}
