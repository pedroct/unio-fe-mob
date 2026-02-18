import Layout from "@/components/layout";
import { ChevronLeft, Bluetooth, Check, RefreshCw, Plus, Search, X, Loader2 } from "lucide-react";
import { useLocation } from "wouter";
import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/lib/auth";
import { apiFetch } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";

interface AlimentoItem {
  id: number;
  nome: string;
  marca: string;
  codigo_barras: string | null;
  calorias: number;
  carboidratos: number;
  proteinas: number;
  gorduras: number;
  fibras: number;
  unidade_medida: string;
}

interface AlimentoTBCAItem {
  id: string;
  codigo_tbca: string;
  descricao: string;
  nome_cientifico: string | null;
  grupo_alimentar: { id: string; codigo_tbca: string; nome: string } | null;
  fonte_dados: string;
}

type SelectedFood =
  | { source: "app"; data: AlimentoItem }
  | { source: "tbca"; data: AlimentoTBCAItem };

interface PesagemPendente {
  id: number;
  peso_original: number;
  unidade_original: string;
  peso_gramas: number;
  status: string;
  mac_balanca: string | null;
  pesado_em: string;
  associado_em: string | null;
  registro_alimentar_id: number | null;
}

function getFoodLabel(food: SelectedFood): string {
  return food.source === "app" ? food.data.nome : food.data.descricao;
}

function getFoodSubtitle(food: SelectedFood): string | null {
  if (food.source === "app" && food.data.marca) return food.data.marca;
  if (food.source === "tbca" && food.data.grupo_alimentar) return food.data.grupo_alimentar.nome;
  return null;
}

function smartTruncate(text: string, maxLen: number = 48): string {
  if (text.length <= maxLen) return text;
  const trimmed = text.slice(0, maxLen);
  const lastSpace = trimmed.lastIndexOf(" ");
  if (lastSpace <= 0) return trimmed + "\u2026";
  return trimmed.slice(0, lastSpace) + "\u2026";
}


export default function NutritionScaleScreen() {
  const [, setLocation] = useLocation();
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const searchInputRef = useRef<HTMLInputElement>(null);
  const [connectionStatus, setConnectionStatus] = useState<"searching" | "connecting" | "connected" | "disconnected">("disconnected");
  const [weight, setWeight] = useState(0);
  const [manualWeight, setManualWeight] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [selectedFood, setSelectedFood] = useState<SelectedFood | null>(null);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [pendingPesagemId, setPendingPesagemId] = useState<number | null>(null);
  const [searchOpen, setSearchOpen] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(searchQuery), 300);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  const { data: appFoods = [], isLoading: appFoodsLoading, isFetched: appFoodsFetched, isError: appFoodsError } = useQuery<AlimentoItem[]>({
    queryKey: ["nutricao", "alimentos", "buscar", debouncedSearch],
    queryFn: async () => {
      const res = await apiFetch(`/api/nutricao/alimentos/buscar?q=${encodeURIComponent(debouncedSearch)}&limite=20`);
      if (!res.ok) throw new Error("Erro ao buscar alimentos");
      return res.json();
    },
    enabled: !!user && debouncedSearch.length >= 2,
  });

  const shouldFallbackToTBCA = debouncedSearch.length >= 2 && (appFoodsFetched || appFoodsError) && appFoods.length === 0;

  const { data: tbcaFoods = [], isLoading: tbcaFoodsLoading } = useQuery<AlimentoTBCAItem[]>({
    queryKey: ["nutricao", "tbca", "alimentos", debouncedSearch],
    queryFn: async () => {
      const res = await apiFetch(`/api/nutricao/tbca/alimentos?busca=${encodeURIComponent(debouncedSearch)}&limite=50&offset=0`);
      if (!res.ok) throw new Error("Erro ao buscar na TBCA");
      return res.json();
    },
    enabled: !!user && shouldFallbackToTBCA,
  });

  const { data: pendingData, isLoading: pendingLoading, isError: pendingError } = useQuery<{ pesagens: PesagemPendente[]; total: number }>({
    queryKey: ["nutricao", "pesagens-pendentes"],
    queryFn: async () => {
      const res = await apiFetch("/api/nutricao/diario/pesagens-pendentes");
      if (!res.ok) throw new Error("Erro ao buscar pesagens pendentes");
      return res.json();
    },
    enabled: !!user,
    refetchInterval: 5000,
  });

  useEffect(() => {
    if (pendingData?.pesagens?.length) {
      const latest = pendingData.pesagens[0];
      if (latest.status === "PENDENTE") {
        setWeight(Math.round(latest.peso_gramas));
        setManualWeight(String(Math.round(latest.peso_gramas)));
        setPendingPesagemId(latest.id);
      }
    }
  }, [pendingData]);

  useEffect(() => {
    if (pendingLoading) {
      setConnectionStatus("searching");
    } else if (pendingError) {
      setConnectionStatus("disconnected");
    } else if (pendingData?.pesagens?.length && pendingData.pesagens[0].status === "PENDENTE") {
      setConnectionStatus("connected");
    } else {
      setConnectionStatus("disconnected");
    }
  }, [pendingData, pendingLoading, pendingError]);

  const isSearching = appFoodsLoading || tbcaFoodsLoading;
  const hasFoods = appFoods.length > 0 || tbcaFoods.length > 0;
  const hasAppAndTbca = appFoods.length > 0 && tbcaFoods.length > 0;

  const currentStats = selectedFood?.source === "app" ? {
    kcal: Math.round(selectedFood.data.calorias * (weight / 100)),
    protein: Math.round(selectedFood.data.proteinas * (weight / 100) * 10) / 10,
    carbs: Math.round(selectedFood.data.carboidratos * (weight / 100) * 10) / 10,
    fat: Math.round(selectedFood.data.gorduras * (weight / 100) * 10) / 10,
  } : { kcal: 0, protein: 0, carbs: 0, fat: 0 };

  const pendingWeightOriginal = pendingData?.pesagens?.[0]?.peso_gramas ?? null;
  const weightMatchesPending = pendingPesagemId !== null && pendingWeightOriginal !== null && weight === Math.round(pendingWeightOriginal);

  const confirmMutation = useMutation({
    mutationFn: async () => {
      if (!selectedFood || weight === 0) throw new Error("Selecione um alimento e peso");

      if (pendingPesagemId && weightMatchesPending) {
        const body: Record<string, unknown> = {
          observacao: "Registrado via balança inteligente",
        };
        if (selectedFood.source === "app") {
          body.alimento_id = selectedFood.data.id;
        } else {
          body.alimento_tbca_id = selectedFood.data.id;
        }
        const res = await apiFetch(`/api/nutricao/diario/pesagens-pendentes/${pendingPesagemId}/associar`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        });
        if (!res.ok) {
          const data = await res.json().catch(() => ({}));
          throw new Error(data.mensagem || data.detail || "Erro ao associar alimento");
        }
        return res.json();
      } else {
        const body: Record<string, unknown> = {
          peso: weight,
          unidade: "g",
        };
        if (selectedFood.source === "app") {
          body.alimento_id = selectedFood.data.id;
        } else {
          body.alimento_tbca_id = selectedFood.data.id;
        }
        const res = await apiFetch("/api/nutricao/diario/balanca-cozinha", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        });
        if (!res.ok) {
          const data = await res.json().catch(() => ({}));
          throw new Error(data.mensagem || data.detail || "Erro ao registrar alimento");
        }
        return res.json();
      }
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["nutricao"] });
      setSaveSuccess(true);
      toast({
        title: "Alimento registrado",
        description: data.mensagem || `${getFoodLabel(selectedFood!)} registrado`,
      });
      setTimeout(() => {
        setLocation("/nutrition");
      }, 1500);
    },
    onError: (err: Error) => {
      toast({ title: "Erro", description: err.message, variant: "destructive" });
    },
  });

  useEffect(() => {
    if (confirmMutation.isPending) {
      setConnectionStatus("connecting");
    }
  }, [confirmMutation.isPending]);

  const discardMutation = useMutation({
    mutationFn: async (pesagemId: number) => {
      const res = await apiFetch(`/api/nutricao/diario/pesagens-pendentes/${pesagemId}`, {
        method: "DELETE",
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.mensagem || data.detail || "Erro ao descartar pesagem");
      }
    },
    onSuccess: () => {
      setPendingPesagemId(null);
      setWeight(0);
      setManualWeight("");
      queryClient.invalidateQueries({ queryKey: ["nutricao", "pesagens-pendentes"] });
      toast({ title: "Pesagem descartada" });
    },
  });

  const openSearch = () => {
    setSearchOpen(true);
    setTimeout(() => searchInputRef.current?.focus(), 100);
  };

  const closeSearch = () => {
    setSearchOpen(false);
    setSearchQuery("");
    setDebouncedSearch("");
  };

  const selectFood = (food: SelectedFood) => {
    setSelectedFood(food);
    closeSearch();
  };

  const handleManualWeightChange = (val: string) => {
    const cleaned = val.replace(/[^0-9]/g, "");
    setManualWeight(cleaned);
    const num = parseInt(cleaned, 10);
    setWeight(isNaN(num) ? 0 : num);
  };


  useEffect(() => {
    if (searchOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => { document.body.style.overflow = ""; };
  }, [searchOpen]);

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
          <div className={`w-10 h-10 flex items-center justify-center rounded-full transition-colors ${
            connectionStatus === 'connected' ? 'bg-[#10B981]/10 text-[#10B981]' :
            connectionStatus === 'connecting' ? 'bg-[#F59E0B]/10 text-[#F59E0B]' :
            connectionStatus === 'searching' ? 'bg-[#3B82F6]/10 text-[#3B82F6]' :
            'bg-[#EF4444]/10 text-[#EF4444]'
          }`}>
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
                  <div className="flex items-center gap-1.5 bg-[#3B82F6]/10 px-3 py-1 rounded-full">
                    <RefreshCw size={12} className="animate-spin text-[#3B82F6]" />
                    <span className="text-[10px] font-bold text-[#3B82F6] uppercase tracking-wide">Buscando balança…</span>
                  </div>
                </motion.div>
              ) : connectionStatus === 'connecting' ? (
                <motion.div
                  key="connecting"
                  initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                  className="flex flex-col items-center gap-1"
                >
                  <div className="flex items-center gap-1.5 bg-[#F59E0B]/10 px-3 py-1 rounded-full">
                    <Loader2 size={12} className="animate-spin text-[#F59E0B]" />
                    <span className="text-[10px] font-bold text-[#F59E0B] uppercase tracking-wide">Conectando…</span>
                  </div>
                </motion.div>
              ) : connectionStatus === 'connected' ? (
                <motion.div
                  key="connected"
                  initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
                  className="flex flex-col items-center gap-1"
                >
                  <div className="flex items-center gap-1.5 bg-[#10B981]/10 px-3 py-1 rounded-full">
                    <Check size={12} className="text-[#10B981]" strokeWidth={3} />
                    <span className="text-[10px] font-bold text-[#10B981] uppercase tracking-wide">Conectado</span>
                  </div>
                </motion.div>
              ) : (
                <motion.div
                  key="disconnected"
                  initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                  className="flex flex-col items-center gap-1"
                >
                  <div className="flex items-center gap-1.5 bg-[#EF4444]/10 px-3 py-1 rounded-full">
                    <X size={12} className="text-[#EF4444]" strokeWidth={3} />
                    <span className="text-[10px] font-bold text-[#EF4444] uppercase tracking-wide">Desconectado</span>
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

            {selectedFood && weight === 0 && (
              <p className="text-xs text-[#8B9286] mt-3 text-center">
                Coloque o alimento na balança para registrar
              </p>
            )}

            <div className="flex items-center gap-3 mt-4">
              <button
                data-testid="button-tare"
                onClick={() => {
                  setWeight(0);
                  setManualWeight("");
                  if (pendingPesagemId) {
                    discardMutation.mutate(pendingPesagemId);
                  }
                }}
                className="text-[10px] font-bold uppercase tracking-widest text-[#C7AE6A] border border-[#C7AE6A] px-5 py-1.5 rounded-full hover:bg-[#C7AE6A]/10 active:scale-95 transition-all"
              >
                Tarar
              </button>
              {pendingPesagemId && (
                <span className="text-[10px] text-[#648D4A] font-medium bg-[#648D4A]/10 px-3 py-1 rounded-full">
                  Peso registrado
                </span>
              )}
            </div>
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
                <p className="text-lg font-semibold text-[#2F5641]">Registrado com sucesso!</p>
                <p className="text-sm text-[#8B9286]">Dados salvos no seu diário</p>
              </motion.div>
            ) : !selectedFood ? (
              <div className="flex-1 flex flex-col">
                <button
                  data-testid="button-open-search"
                  onClick={openSearch}
                  className="w-full bg-[#FAFBF8] border border-[#E8EBE5] rounded-xl py-3 px-4 text-sm text-left text-[#8B9286] flex items-center gap-2 mb-4"
                >
                  <Search size={18} className="text-[#8B9286] shrink-0" />
                  Buscar alimento…
                </button>

                <div className="flex-1 flex flex-col items-center justify-center opacity-40">
                  <p className="text-xs text-[#8B9286]">Selecione um alimento para registrar</p>
                </div>
              </div>
            ) : (
              <div className="flex-1 flex flex-col">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex-1 min-w-0">
                    <span className="text-[10px] font-medium tracking-wider text-[#8B9286] block mb-0.5">
                      Alimento selecionado
                    </span>
                    <h3 data-testid="text-selected-food" className="font-medium text-[#2F5641] text-[13px] leading-[1.4] line-clamp-2">
                      {getFoodLabel(selectedFood)}
                    </h3>
                    {getFoodSubtitle(selectedFood) && (
                      <p className="text-xs text-[#8B9286]">{getFoodSubtitle(selectedFood)}</p>
                    )}
                  </div>
                  <button
                    data-testid="button-clear-food"
                    onClick={() => setSelectedFood(null)}
                    className="w-8 h-8 rounded-full bg-[#F5F3EE] flex items-center justify-center text-[#8B9286] shrink-0 ml-2"
                  >
                    <X size={16} />
                  </button>
                </div>

                {selectedFood.source === "app" && weight > 0 && (
                  <div className="grid grid-cols-4 gap-2 text-center mb-4">
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
                )}

                <div className="pt-2 pb-4">
                  <label className="text-xs font-medium tracking-wide text-[#8B9286] block mb-2">
                    Quantidade (g)
                  </label>
                  <input
                    data-testid="input-manual-weight-selected"
                    type="text"
                    inputMode="numeric"
                    placeholder="0"
                    value={manualWeight}
                    onChange={(e) => handleManualWeightChange(e.target.value)}
                    className="w-full bg-[#FAFBF8] border border-[#E8EBE5] rounded-xl py-3 px-4 text-sm text-[#2F5641] font-medium focus:outline-none focus:border-[#2F5641] transition-colors text-center tabular-nums"
                  />
                </div>

                <button
                  data-testid="button-confirm"
                  disabled={weight === 0 || confirmMutation.isPending}
                  onClick={() => confirmMutation.mutate()}
                  className="w-full bg-[#2F5641] disabled:bg-[#E8EBE5] disabled:text-[#8B9286] text-white py-4 rounded-2xl font-semibold text-base shadow-xl shadow-[#2F5641]/20 flex items-center justify-center gap-2 active:scale-[0.98] transition-all mt-auto mb-6"
                >
                  {confirmMutation.isPending ? (
                    <><Loader2 size={20} className="animate-spin" /> Registrando…</>
                  ) : weight === 0 ? (
                    <>Aguardando peso…</>
                  ) : (
                    <><Check size={20} /> Registrar {smartTruncate(getFoodLabel(selectedFood!), 32)}</>
                  )}
                </button>
              </div>
            )}
          </div>
        </main>

        <AnimatePresence>
          {searchOpen && (
            <motion.div
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              exit={{ y: "100%" }}
              transition={{ type: "spring", damping: 30, stiffness: 300 }}
              className="fixed inset-0 top-[env(safe-area-inset-top,0px)] bg-[#FAFBF8] z-[60] flex flex-col"
            >
              <div className="px-4 pt-4 pb-3 flex items-center gap-3 shrink-0 border-b border-[#E8EBE5]">
                <button
                  data-testid="button-close-search"
                  onClick={closeSearch}
                  className="w-10 h-10 flex items-center justify-center text-[#2F5641] shrink-0"
                >
                  <ChevronLeft size={24} />
                </button>
                <div className="flex-1 relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-[#8B9286]" size={18} />
                  <input
                    ref={searchInputRef}
                    data-testid="input-food-search"
                    type="text"
                    placeholder="Buscar alimento…"
                    className="w-full bg-white border border-[#E8EBE5] rounded-xl py-2.5 pl-10 pr-10 text-sm focus:outline-none focus:border-[#2F5641] transition-colors"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                  />
                  {searchQuery && (
                    <button
                      onClick={() => { setSearchQuery(""); setDebouncedSearch(""); }}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-[#8B9286]"
                    >
                      <X size={16} />
                    </button>
                  )}
                </div>
                <button
                  data-testid="button-close-search-x"
                  onClick={closeSearch}
                  className="w-10 h-10 flex items-center justify-center text-[#8B9286] shrink-0"
                >
                  <X size={20} />
                </button>
              </div>

              <div
                className="flex-1 overflow-y-auto px-4 py-3"
                style={{ scrollbarWidth: "none" }}
              >
                {isSearching ? (
                  <div className="text-center py-12">
                    <Loader2 size={24} className="animate-spin mx-auto text-[#8B9286]" />
                    <p className="text-xs text-[#8B9286] mt-2">Buscando alimentos…</p>
                  </div>
                ) : debouncedSearch.length >= 2 && hasFoods ? (
                  <div className="space-y-1">
                    {appFoods.length > 0 && tbcaFoods.length > 0 && (
                      <p className="text-[10px] font-medium text-[#8B9286] uppercase tracking-wider px-1 pt-1 pb-2">Seus alimentos</p>
                    )}
                    {appFoods.map((food) => (
                      <button
                        key={`app-${food.id}`}
                        data-testid={`button-food-app-${food.id}`}
                        onClick={() => selectFood({ source: "app", data: food })}
                        className="w-full text-left p-3 rounded-xl active:bg-[#F5F3EE] border border-transparent active:border-[#E8EBE5] transition-all flex justify-between items-center"
                      >
                        <div className="flex-1 min-w-0">
                          <span className="font-medium text-[#2F5641] text-sm block">{smartTruncate(food.nome)}</span>
                          <div className="flex items-center gap-1.5 mt-0.5">
                            {food.marca && <span className="text-[10px] text-[#8B9286]">{food.marca}</span>}
                            <span className="text-[10px] text-[#648D4A]">{food.calorias} kcal/100g</span>
                          </div>
                        </div>
                        <Plus size={16} className="text-[#C7AE6A] shrink-0 ml-2" />
                      </button>
                    ))}
                    {tbcaFoods.length > 0 && (
                      <>
                        {appFoods.length > 0 && (
                          <div className="border-t border-[#E8EBE5] my-2" />
                        )}
                        {appFoods.length > 0 && (
                          <p className="text-[10px] font-medium text-[#8B9286] uppercase tracking-wider px-1 pt-1 pb-2">Base de alimentos</p>
                        )}
                        {tbcaFoods.map((food) => (
                          <button
                            key={`tbca-${food.id}`}
                            data-testid={`button-food-tbca-${food.id}`}
                            onClick={() => selectFood({ source: "tbca", data: food })}
                            className="w-full text-left p-3 rounded-xl active:bg-[#F5F3EE] border border-transparent active:border-[#E8EBE5] transition-all flex justify-between items-center"
                          >
                            <div className="flex-1 min-w-0">
                              <span className="font-medium text-[#2F5641] text-sm block">{smartTruncate(food.descricao)}</span>
                              {food.grupo_alimentar && (
                                <span className="text-[10px] text-[#8B9286] mt-0.5 block">{food.grupo_alimentar.nome}</span>
                              )}
                            </div>
                            <Plus size={16} className="text-[#C7AE6A] shrink-0 ml-2" />
                          </button>
                        ))}
                      </>
                    )}
                  </div>
                ) : debouncedSearch.length >= 2 && !hasFoods && !isSearching ? (
                  <div className="text-center py-12 opacity-60">
                    <Search size={32} className="mx-auto mb-2 text-[#8B9286]" />
                    <p className="text-sm text-[#8B9286]">Nenhum alimento encontrado</p>
                    <p className="text-xs text-[#8B9286] mt-1">Tente outro termo de busca</p>
                  </div>
                ) : (
                  <div className="text-center py-12 opacity-40">
                    <Search size={32} className="mx-auto mb-2 text-[#8B9286]" />
                    <p className="text-xs text-[#8B9286]">Digite ao menos 2 letras para buscar</p>
                  </div>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </Layout>
  );
}
