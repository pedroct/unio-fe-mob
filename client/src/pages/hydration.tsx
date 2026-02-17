import Layout from "@/components/layout";
import { ChevronLeft, Plus, History, Settings, Coffee, GlassWater, Wine, X, Calendar, Clock, Mic, Delete } from "lucide-react";
import { useLocation } from "wouter";
import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/lib/auth";

const BEVERAGE_TYPES = [
  { id: "water", label: "Água", icon: GlassWater, color: "#3D7A8C" },
  { id: "coffee", label: "Café", icon: Coffee, color: "#8C6A3D" },
  { id: "juice", label: "Suco", icon: Wine, color: "#D97952" },
  { id: "milk", label: "Leite desnatado", icon: Coffee, color: "#E8EBE5" },
  { id: "sport", label: "Bebida esportiva", icon: GlassWater, color: "#648D4A" },
  { id: "shake", label: "Milkshake de proteínas", icon: Coffee, color: "#2F5641" },
  { id: "tea", label: "Chá", icon: Coffee, color: "#C7AE6A" },
  { id: "soda", label: "Refrigerante", icon: Wine, color: "#BE4E35" },
];

export default function HydrationScreen() {
  const [, setLocation] = useLocation();
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const userId = user?.id ?? "";
  const [showManualInput, setShowManualInput] = useState(false);
  const [manualAmount, setManualAmount] = useState("250");
  const [manualType, setManualType] = useState("water");
  const [manualDate, setManualDate] = useState(new Date().toLocaleDateString('pt-BR', { day: 'numeric', month: 'short', year: 'numeric' }));
  const [manualTime, setManualTime] = useState(new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }));

  const { data: hydrationData, isLoading } = useQuery({
    queryKey: ["hydration", "today", userId],
    queryFn: async () => {
      const res = await fetch(`/api/users/${userId}/hydration/today`);
      if (!res.ok) throw new Error("Failed to fetch hydration data");
      return res.json() as Promise<{
        totalMl: number;
        goal: number;
        records: Array<{
          id: string;
          amountMl: number;
          beverageType: string;
          label: string;
          recordedAt: string;
        }>;
      }>;
    },
    refetchOnWindowFocus: true,
    enabled: !!userId,
  });

  const addMutation = useMutation({
    mutationFn: async (payload: { amountMl: number; beverageType: string; label: string }) => {
      const res = await fetch("/api/hydration", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: userId,
          amountMl: payload.amountMl,
          beverageType: payload.beverageType,
          label: payload.label,
        }),
      });
      if (!res.ok) throw new Error("Failed to add hydration record");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["hydration"] });
    },
  });

  const intake = hydrationData?.totalMl ?? 0;
  const goal = hydrationData?.goal ?? 2500;
  const history = (hydrationData?.records ?? []).map((r) => ({
    id: r.id,
    time: new Date(r.recordedAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
    amount: r.amountMl,
    type: r.beverageType,
    label: r.label,
  }));

  const percentage = Math.min((intake / goal) * 100, 100);

  const addWater = (amount: number, type: string = "water", label: string = "Água") => {
    addMutation.mutate({ amountMl: amount, beverageType: type, label });
  };

  const handleManualSubmit = () => {
    const amount = parseInt(manualAmount);
    if (isNaN(amount) || amount <= 0) return;

    const typeObj = BEVERAGE_TYPES.find(t => t.id === manualType) || BEVERAGE_TYPES[0];
    addWater(amount, manualType, typeObj.label);
    setShowManualInput(false);
    setManualAmount("250");
  };

  const handleKeypadPress = (key: string) => {
    if (key === "backspace") {
      setManualAmount(prev => prev.slice(0, -1) || "0");
    } else if (key === "clear") {
      setManualAmount("0");
    } else {
      setManualAmount(prev => (prev === "0" ? key : prev + key));
    }
  };

  const getIconForType = (type: string) => {
    const t = BEVERAGE_TYPES.find(item => item.id === type);
    return t ? t.icon : GlassWater;
  };

  const getColorForType = (type: string) => {
    const t = BEVERAGE_TYPES.find(item => item.id === type);
    return t ? t.color : "#3D7A8C";
  };

  return (
    <Layout>
      <div className="bg-[#FAFBF8] min-h-screen pb-24 flex flex-col relative">
        <header className="px-6 pt-14 pb-4 flex items-center justify-between sticky top-0 bg-[#FAFBF8]/95 backdrop-blur-sm z-10">
          <button
            data-testid="button-back"
            onClick={() => setLocation("/home")}
            className="w-10 h-10 -ml-2 flex items-center justify-center text-[#2F5641]"
          >
            <ChevronLeft size={24} />
          </button>
          <h1 className="font-display text-lg font-semibold text-[#2F5641]">Hidratação</h1>
          <button className="w-10 h-10 flex items-center justify-center text-[#2F5641]">
            <Settings size={20} />
          </button>
        </header>

        <main className="px-6 flex-1 flex flex-col">
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
                {percentage >= 100 && (
                  <span className="bg-[#648D4A] text-white text-[10px] font-bold px-2 py-0.5 rounded-full">Meta Batida!</span>
                )}
              </div>
            </div>

            <div className="grid grid-cols-4 gap-3 w-full">
              <button
                data-testid="button-add-250"
                onClick={() => addWater(250)}
                disabled={addMutation.isPending}
                className="flex flex-col items-center gap-2 p-3 bg-white rounded-2xl shadow-sm border border-[#E8EBE5] hover:border-[#3D7A8C] active:scale-95 transition-all group disabled:opacity-50"
              >
                <div className="w-8 h-8 rounded-full bg-[#3D7A8C]/10 flex items-center justify-center text-[#3D7A8C] group-hover:bg-[#3D7A8C] group-hover:text-white transition-colors">
                  <Plus size={14} strokeWidth={3} />
                </div>
                <span className="text-[10px] font-bold text-[#2F5641]">250ml</span>
              </button>

              <button
                data-testid="button-add-500"
                onClick={() => addWater(500)}
                disabled={addMutation.isPending}
                className="flex flex-col items-center gap-2 p-3 bg-white rounded-2xl shadow-sm border border-[#E8EBE5] hover:border-[#3D7A8C] active:scale-95 transition-all group disabled:opacity-50"
              >
                <div className="w-8 h-8 rounded-full bg-[#3D7A8C]/10 flex items-center justify-center text-[#3D7A8C] group-hover:bg-[#3D7A8C] group-hover:text-white transition-colors">
                  <Plus size={14} strokeWidth={3} />
                </div>
                <span className="text-[10px] font-bold text-[#2F5641]">500ml</span>
              </button>

              <button
                data-testid="button-add-750"
                onClick={() => addWater(750)}
                disabled={addMutation.isPending}
                className="flex flex-col items-center gap-2 p-3 bg-white rounded-2xl shadow-sm border border-[#E8EBE5] hover:border-[#3D7A8C] active:scale-95 transition-all group disabled:opacity-50"
              >
                <div className="w-8 h-8 rounded-full bg-[#3D7A8C]/10 flex items-center justify-center text-[#3D7A8C] group-hover:bg-[#3D7A8C] group-hover:text-white transition-colors">
                  <Plus size={14} strokeWidth={3} />
                </div>
                <span className="text-[10px] font-bold text-[#2F5641]">Garrafa</span>
              </button>

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
              {isLoading ? (
                <div className="p-6 text-center text-xs text-[#8B9286]">Carregando...</div>
              ) : history.length === 0 ? (
                <div className="p-6 text-center text-xs text-[#8B9286]">Nenhum registro hoje. Beba água!</div>
              ) : (
                history.map((entry) => {
                  const Icon = getIconForType(entry.type);
                  const color = getColorForType(entry.type);
                  return (
                    <div key={entry.id} data-testid={`row-hydration-${entry.id}`} className="flex justify-between items-center p-4 border-b border-[#E8EBE5] last:border-0">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full flex items-center justify-center" style={{ backgroundColor: `${color}20`, color }}>
                          <Icon size={14} />
                        </div>
                        <span className="text-sm font-medium text-[#2F5641]">{entry.label}</span>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="text-xs text-[#8B9286]">{entry.time}</span>
                        <span className="text-sm font-bold text-[#2F5641]">{entry.amount}ml</span>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </section>
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
                <button
                  data-testid="button-close-manual"
                  onClick={() => setShowManualInput(false)}
                  className="w-10 h-10 flex items-center justify-center rounded-full bg-white text-[#2F5641] shadow-sm"
                >
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
                    {BEVERAGE_TYPES.find(t => t.id === manualType)?.label || "Selecione"}
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
                  <div className="flex gap-3 mb-4 w-full">
                    <button className="flex-1 bg-[#FAFBF8] border border-[#E8EBE5] py-3 px-2 rounded-xl text-xs font-semibold text-[#2F5641] flex items-center justify-center gap-2">
                      <Calendar size={14} className="opacity-50" />
                      {manualDate}
                    </button>
                    <button className="flex-1 bg-[#FAFBF8] border border-[#E8EBE5] py-3 px-2 rounded-xl text-xs font-semibold text-[#2F5641] flex items-center justify-center gap-2">
                      <Clock size={14} className="opacity-50" />
                      {manualTime}
                    </button>
                  </div>

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
                    <button
                      data-testid="button-keypad-00"
                      onClick={() => handleKeypadPress("00")}
                      className="h-10 bg-[#FAFBF8] border border-[#E8EBE5] rounded-lg text-lg font-semibold text-[#2F5641] active:bg-[#E8EBE5] active:scale-95 transition-transform"
                    >
                      00
                    </button>
                    <button
                      data-testid="button-keypad-0"
                      onClick={() => handleKeypadPress("0")}
                      className="h-10 bg-[#FAFBF8] border border-[#E8EBE5] rounded-lg text-lg font-semibold text-[#2F5641] active:bg-[#E8EBE5] active:scale-95 transition-transform"
                    >
                      0
                    </button>
                    <button
                      data-testid="button-keypad-backspace"
                      onClick={() => handleKeypadPress("backspace")}
                      className="h-10 bg-[#FAFBF8] border border-[#E8EBE5] rounded-lg flex items-center justify-center text-[#BE4E35] active:bg-[#E8EBE5] active:scale-95 transition-transform"
                    >
                      <Delete size={18} />
                    </button>
                  </div>

                  <button
                    data-testid="button-submit-manual"
                    onClick={handleManualSubmit}
                    disabled={addMutation.isPending}
                    className="w-full bg-[#4A90E2] text-white py-3.5 rounded-xl font-bold text-base shadow-lg shadow-[#4A90E2]/25 active:scale-[0.98] transition-all disabled:opacity-50"
                  >
                    {addMutation.isPending ? "Adicionando..." : "Adicionar"}
                  </button>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </Layout>
  );
}
