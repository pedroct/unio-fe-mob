import Layout from "@/components/layout";
import { ChevronLeft, Plus, History, Settings, Coffee, GlassWater, Wine, X, Calendar, Clock, Mic, Delete, Trash2, Loader2, AlertCircle, Droplets } from "lucide-react";
import { useLocation } from "wouter";
import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/lib/auth";
import { apiFetch } from "@/lib/api";

const BEVERAGE_TYPES = [
  { id: "AGUA", label: "Água", icon: GlassWater, color: "#3D7A8C" },
  { id: "CAFE", label: "Café", icon: Coffee, color: "#8C6A3D" },
  { id: "SUCO", label: "Suco", icon: Wine, color: "#D97952" },
  { id: "LEITE", label: "Leite", icon: Coffee, color: "#C7AE6A" },
  { id: "CHA", label: "Chá", icon: Coffee, color: "#648D4A" },
  { id: "ISOTONICO", label: "Isotônico", icon: GlassWater, color: "#4A90E2" },
  { id: "OUTRO", label: "Outro", icon: Droplets, color: "#8B9286" },
];

interface ResumoData {
  data: string;
  consumido_ml: number;
  meta_ml: number;
  restante_ml: number;
  percentual: number;
  atingiu_meta: boolean;
}

interface RegistroItem {
  id: string;
  quantidade_ml: number;
  tipo_bebida: string;
  registrado_em: string;
}

export default function HydrationScreen() {
  const [, setLocation] = useLocation();
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const [showManualInput, setShowManualInput] = useState(false);
  const [showMetaEdit, setShowMetaEdit] = useState(false);
  const [manualAmount, setManualAmount] = useState("250");
  const [manualType, setManualType] = useState("AGUA");
  const [newMeta, setNewMeta] = useState("");

  const now = new Date();
  const today = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;

  const { data: resumo, isLoading: loadingResumo, isError: errorResumo, refetch: refetchResumo } = useQuery<ResumoData>({
    queryKey: ["hydration", "resumo", today],
    queryFn: async () => {
      const res = await apiFetch(`/api/hidratacao/resumo?data=${today}`);
      if (!res.ok) throw new Error("Erro ao buscar resumo");
      return res.json();
    },
    enabled: !!user,
  });

  const { data: registros, isLoading: loadingRegistros } = useQuery<{ itens: RegistroItem[]; total_itens: number }>({
    queryKey: ["hydration", "registros", today],
    queryFn: async () => {
      const res = await apiFetch(`/api/hidratacao/registros?inicio=${today}&fim=${today}`);
      if (!res.ok) throw new Error("Erro ao buscar registros");
      return res.json();
    },
    enabled: !!user,
  });

  const { data: metaData } = useQuery<{ ml_meta_diaria: number; atualizado_em: string }>({
    queryKey: ["hydration", "meta"],
    queryFn: async () => {
      const res = await apiFetch("/api/hidratacao/meta");
      if (!res.ok) throw new Error("Erro ao buscar meta");
      return res.json();
    },
    enabled: !!user,
  });

  const invalidateAll = () => {
    queryClient.invalidateQueries({ queryKey: ["hydration"] });
  };

  const addMutation = useMutation({
    mutationFn: async (payload: { quantidade_ml: number; tipo_bebida: string }) => {
      const res = await apiFetch("/api/hidratacao/registros", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const err = await res.json();
        throw err;
      }
      return res.json();
    },
    onSuccess: () => invalidateAll(),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await apiFetch(`/api/hidratacao/registros/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Erro ao remover");
      return res.json();
    },
    onSuccess: () => invalidateAll(),
  });

  const metaMutation = useMutation({
    mutationFn: async (ml: number) => {
      const res = await apiFetch("/api/hidratacao/meta", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ml_meta_diaria: ml }),
      });
      if (!res.ok) {
        const err = await res.json();
        throw err;
      }
      return res.json();
    },
    onSuccess: () => {
      invalidateAll();
      setShowMetaEdit(false);
    },
  });

  const intake = resumo?.consumido_ml ?? 0;
  const goal = resumo?.meta_ml ?? metaData?.ml_meta_diaria ?? 2500;
  const percentage = goal > 0 ? Math.min((intake / goal) * 100, 100) : 0;

  const addWater = (amount: number, type: string = "AGUA") => {
    addMutation.mutate({ quantidade_ml: amount, tipo_bebida: type });
  };

  const handleManualSubmit = () => {
    const amount = parseInt(manualAmount);
    if (isNaN(amount) || amount <= 0) return;
    addWater(amount, manualType);
    setShowManualInput(false);
    setManualAmount("250");
  };

  const handleMetaSubmit = () => {
    const val = parseInt(newMeta);
    if (isNaN(val) || val < 500 || val > 10000) return;
    metaMutation.mutate(val);
  };

  const handleKeypadPress = (key: string) => {
    if (key === "backspace") {
      setManualAmount(prev => prev.slice(0, -1) || "0");
    } else {
      setManualAmount(prev => (prev === "0" ? key : prev + key));
    }
  };

  const getTypeInfo = (type: string) => BEVERAGE_TYPES.find(t => t.id === type) || BEVERAGE_TYPES[0];

  if (errorResumo) {
    return (
      <Layout>
        <div className="min-h-screen flex flex-col items-center justify-center px-6 gap-4" data-testid="error-hydration">
          <AlertCircle className="w-12 h-12 text-[#BE4E35]" />
          <p className="text-sm text-[#BE4E35] text-center">Não foi possível carregar dados de hidratação.</p>
          <button onClick={() => refetchResumo()} className="bg-[#2F5641] text-white px-6 py-2 rounded-xl text-sm font-medium" data-testid="button-retry">
            Tentar novamente
          </button>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="bg-[#FAFBF8] min-h-screen pb-24 flex flex-col relative">
        <header className="px-6 pt-14 pb-4 flex items-center justify-between sticky top-0 bg-[#FAFBF8]/95 backdrop-blur-sm z-10">
          <button data-testid="button-back" onClick={() => setLocation("/home")} className="w-10 h-10 -ml-2 flex items-center justify-center text-[#2F5641]">
            <ChevronLeft size={24} />
          </button>
          <h1 className="font-display text-lg font-semibold text-[#2F5641]">Hidratação</h1>
          <button onClick={() => { setNewMeta(String(goal)); setShowMetaEdit(true); }} className="w-10 h-10 flex items-center justify-center text-[#2F5641]" data-testid="button-edit-meta">
            <Settings size={20} />
          </button>
        </header>

        <main className="px-6 flex-1 flex flex-col">
          {loadingResumo ? (
            <div className="flex-1 flex items-center justify-center" data-testid="loading-hydration">
              <Loader2 className="w-8 h-8 animate-spin text-[#3D7A8C]" />
            </div>
          ) : (
            <>
              <section className="flex-1 flex flex-col items-center justify-center py-6 relative">
                <div className="relative w-56 h-72 bg-[#E8EBE5]/50 rounded-[3rem] border-4 border-white shadow-xl shadow-[#3D7A8C]/10 overflow-hidden mb-6">
                  <motion.div
                    className="absolute bottom-0 left-0 right-0 bg-[#3D7A8C]/80 backdrop-blur-sm"
                    initial={{ height: "0%" }}
                    animate={{ height: `${percentage}%` }}
                    transition={{ type: "spring", stiffness: 50, damping: 20 }}
                  >
                    <div className="absolute top-0 left-0 right-0 h-4 bg-[#4A8B9F] opacity-50 rounded-[50%]" style={{ transform: "translateY(-50%)" }} />
                  </motion.div>
                  <div className="absolute inset-0 flex flex-col items-center justify-center z-10 mix-blend-overlay text-white">
                    <span data-testid="text-intake-ml" className="font-display text-5xl font-bold">{intake}</span>
                    <span className="text-sm font-medium uppercase tracking-widest opacity-80">ml</span>
                  </div>
                </div>

                <div className="text-center mb-8">
                  <p className="text-xs text-[#8B9286] uppercase tracking-wider mb-1">Meta Diária</p>
                  <div className="flex items-center justify-center gap-2">
                    <span data-testid="text-goal" className="font-bold text-2xl text-[#2F5641]">{goal} ml</span>
                    {resumo?.atingiu_meta && (
                      <span className="bg-[#648D4A] text-white text-[10px] font-bold px-2 py-0.5 rounded-full">Meta Batida!</span>
                    )}
                  </div>
                  <p className="text-xs text-[#8B9286] mt-1">{Math.round(percentage)}% • Restam {resumo?.restante_ml ?? goal} ml</p>
                </div>

                <div className="grid grid-cols-4 gap-3 w-full">
                  {[
                    { amount: 250, label: "250ml" },
                    { amount: 500, label: "500ml" },
                    { amount: 750, label: "Garrafa" },
                  ].map(({ amount, label }) => (
                    <button
                      key={amount}
                      data-testid={`button-add-${amount}`}
                      onClick={() => addWater(amount)}
                      disabled={addMutation.isPending}
                      className="flex flex-col items-center gap-2 p-3 bg-white rounded-2xl shadow-sm border border-[#E8EBE5] hover:border-[#3D7A8C] active:scale-95 transition-all group disabled:opacity-50"
                    >
                      <div className="w-8 h-8 rounded-full bg-[#3D7A8C]/10 flex items-center justify-center text-[#3D7A8C] group-hover:bg-[#3D7A8C] group-hover:text-white transition-colors">
                        <Plus size={14} strokeWidth={3} />
                      </div>
                      <span className="text-[10px] font-bold text-[#2F5641]">{label}</span>
                    </button>
                  ))}
                  <button
                    data-testid="button-add-custom"
                    onClick={() => setShowManualInput(true)}
                    className="flex flex-col items-center gap-2 p-3 bg-[#2F5641] rounded-2xl shadow-lg shadow-[#2F5641]/20 active:scale-95 transition-all group"
                  >
                    <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center text-white">
                      <Plus size={14} strokeWidth={3} />
                    </div>
                    <span className="text-[10px] font-bold text-white">Outro</span>
                  </button>
                </div>
              </section>

              <section className="mt-4 mb-6">
                <div className="flex items-center gap-2 mb-4">
                  <History size={16} className="text-[#8B9286]" />
                  <h3 className="text-xs font-bold text-[#8B9286] uppercase tracking-wider">Histórico de Hoje</h3>
                </div>

                <div className="bg-white rounded-2xl border border-[#E8EBE5] overflow-hidden">
                  {loadingRegistros ? (
                    <div className="p-6 text-center text-xs text-[#8B9286]">Carregando...</div>
                  ) : !registros?.itens?.length ? (
                    <div className="p-6 text-center text-xs text-[#8B9286]" data-testid="text-empty-history">Nenhum registro hoje. Beba água!</div>
                  ) : (
                    registros.itens.map((entry) => {
                      const info = getTypeInfo(entry.tipo_bebida);
                      const Icon = info.icon;
                      const time = new Date(entry.registrado_em).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
                      return (
                        <div key={entry.id} data-testid={`row-hydration-${entry.id}`} className="flex justify-between items-center p-4 border-b border-[#E8EBE5] last:border-0">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-full flex items-center justify-center" style={{ backgroundColor: `${info.color}20`, color: info.color }}>
                              <Icon size={14} />
                            </div>
                            <span className="text-sm font-medium text-[#2F5641]">{info.label}</span>
                          </div>
                          <div className="flex items-center gap-3">
                            <span className="text-xs text-[#8B9286]">{time}</span>
                            <span className="text-sm font-bold text-[#2F5641]">{entry.quantidade_ml}ml</span>
                            <button
                              data-testid={`button-delete-${entry.id}`}
                              onClick={() => deleteMutation.mutate(entry.id)}
                              disabled={deleteMutation.isPending}
                              className="w-7 h-7 rounded-full flex items-center justify-center text-[#BE4E35]/60 hover:bg-[#BE4E35]/10 transition-colors disabled:opacity-30"
                            >
                              <Trash2 size={12} />
                            </button>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </section>
            </>
          )}
        </main>

        <AnimatePresence>
          {showManualInput && (
            <motion.div
              initial={{ y: "100%" }} animate={{ y: 0 }} exit={{ y: "100%" }}
              transition={{ type: "spring", damping: 25, stiffness: 200 }}
              className="fixed inset-0 bg-[#F5F7FA] z-[60] flex flex-col"
            >
              <div className="px-6 pt-12 pb-2 flex items-center justify-between shrink-0">
                <button className="w-10 h-10 flex items-center justify-center rounded-full bg-white text-[#2F5641] shadow-sm">
                  <Mic size={20} />
                </button>
                <h2 className="text-lg font-bold text-[#2F5641]">Outras bebidas</h2>
                <button data-testid="button-close-manual" onClick={() => setShowManualInput(false)} className="w-10 h-10 flex items-center justify-center rounded-full bg-white text-[#2F5641] shadow-sm">
                  <X size={20} />
                </button>
              </div>

              <div className="flex-1 flex flex-col overflow-y-auto">
                <div className="text-center mt-4 mb-6 shrink-0">
                  <div className="flex items-baseline justify-center gap-1">
                    <span data-testid="text-manual-amount" className="font-display text-6xl font-bold text-[#2F5641] tracking-tight">{manualAmount}</span>
                    <span className="text-2xl font-semibold text-[#2F5641] opacity-60">ml</span>
                  </div>
                  <p className="text-[#8B9286] font-medium mt-1">
                    {getTypeInfo(manualType).label}
                  </p>
                </div>

                <div className="w-full relative h-[140px] overflow-hidden mb-4 shrink-0">
                  <div className="absolute inset-x-0 top-1/2 -translate-y-1/2 h-10 bg-[#E8EBE5]/50 rounded-xl mx-6 -z-10" />
                  <div className="sem-scrollbar h-full overflow-y-auto snap-y snap-mandatory py-[50px] px-6">
                    {BEVERAGE_TYPES.map((type) => (
                      <div
                        key={type.id}
                        data-testid={`option-beverage-${type.id}`}
                        onClick={() => setManualType(type.id)}
                        className={`h-10 flex items-center justify-center gap-3 snap-center cursor-pointer transition-all duration-300 ${manualType === type.id ? 'opacity-100 scale-105 font-bold text-[#2F5641]' : 'opacity-40 scale-95 text-[#8B9286]'}`}
                      >
                        <type.icon size={16} />
                        <span className="text-sm">{type.label}</span>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="mt-auto bg-white rounded-t-3xl shadow-[0_-5px_20px_rgba(0,0,0,0.03)] pt-6 px-6 pb-8 w-full max-w-[430px] mx-auto">
                  <div className="grid grid-cols-3 gap-2 mb-4">
                    {[1, 2, 3, 4, 5, 6, 7, 8, 9].map(num => (
                      <button
                        key={num}
                        data-testid={`button-keypad-${num}`}
                        onClick={() => handleKeypadPress(num.toString())}
                        className="h-10 bg-[#FAFBF8] border border-[#E8EBE5] rounded-lg text-lg font-semibold text-[#2F5641] active:bg-[#E8EBE5] active:scale-95 transition-transform"
                      >
                        {num}
                      </button>
                    ))}
                    <button data-testid="button-keypad-00" onClick={() => handleKeypadPress("00")} className="h-10 bg-[#FAFBF8] border border-[#E8EBE5] rounded-lg text-lg font-semibold text-[#2F5641] active:bg-[#E8EBE5] active:scale-95 transition-transform">00</button>
                    <button data-testid="button-keypad-0" onClick={() => handleKeypadPress("0")} className="h-10 bg-[#FAFBF8] border border-[#E8EBE5] rounded-lg text-lg font-semibold text-[#2F5641] active:bg-[#E8EBE5] active:scale-95 transition-transform">0</button>
                    <button data-testid="button-keypad-backspace" onClick={() => handleKeypadPress("backspace")} className="h-10 bg-[#FAFBF8] border border-[#E8EBE5] rounded-lg flex items-center justify-center text-[#BE4E35] active:bg-[#E8EBE5] active:scale-95 transition-transform">
                      <Delete size={18} />
                    </button>
                  </div>

                  <button
                    data-testid="button-submit-manual"
                    onClick={handleManualSubmit}
                    disabled={addMutation.isPending}
                    className="w-full bg-[#3D7A8C] text-white py-3.5 rounded-xl font-bold text-base shadow-lg shadow-[#3D7A8C]/25 active:scale-[0.98] transition-all disabled:opacity-50"
                  >
                    {addMutation.isPending ? "Adicionando..." : "Adicionar"}
                  </button>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <AnimatePresence>
          {showMetaEdit && (
            <>
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 bg-black/40 backdrop-blur-sm z-40" onClick={() => setShowMetaEdit(false)} />
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }}
                className="fixed top-1/2 left-6 right-6 -translate-y-1/2 bg-white rounded-3xl p-6 z-50 max-w-[380px] mx-auto shadow-2xl"
              >
                <h2 className="text-lg font-bold text-[#2F5641] mb-4 text-center">Alterar Meta Diária</h2>
                <div className="mb-4">
                  <label className="text-[10px] font-bold uppercase tracking-wider text-[#8B9286] mb-1 block">Meta (ml)</label>
                  <input
                    type="number"
                    value={newMeta}
                    onChange={(e) => setNewMeta(e.target.value)}
                    placeholder="Ex.: 2500"
                    min={500}
                    max={10000}
                    className="w-full bg-white border border-[#E8EBE5] rounded-xl px-4 py-3 text-sm font-medium text-[#2F5641] focus:outline-none focus:border-[#2F5641]"
                    data-testid="input-meta"
                  />
                  <p className="text-[10px] text-[#8B9286] mt-1">Mínimo 500ml, máximo 10.000ml.</p>
                </div>
                <div className="flex flex-col gap-3">
                  <button
                    onClick={handleMetaSubmit}
                    disabled={metaMutation.isPending}
                    className="w-full bg-[#2F5641] text-white py-3.5 rounded-xl font-bold text-sm shadow-lg shadow-[#2F5641]/20 active:scale-[0.98] transition-all disabled:opacity-50"
                    data-testid="button-save-meta"
                  >
                    {metaMutation.isPending ? "Salvando..." : "Salvar"}
                  </button>
                  <button onClick={() => setShowMetaEdit(false)} className="w-full bg-[#F5F3EE] text-[#8B9286] py-3.5 rounded-xl font-bold text-sm active:scale-[0.98] transition-all" data-testid="button-cancel-meta">
                    Cancelar
                  </button>
                </div>
              </motion.div>
            </>
          )}
        </AnimatePresence>
      </div>
    </Layout>
  );
}
