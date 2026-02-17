import Layout from "@/components/layout";
import { Bell, ChevronRight, Droplets, Plus, TrendingUp, Dumbbell } from "lucide-react";
import { AreaChart, Area, ResponsiveContainer } from "recharts";
import { motion } from "framer-motion";
import { useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/lib/auth";
import { apiFetch } from "@/lib/api";

const DEFAULT_GOALS = { kcal: 2200, proteina: 160, carboidrato: 200, gordura: 70 };


export default function HomeScreen() {
  const [, setLocation] = useLocation();
  const { user } = useAuth();
  const userId = String(user?.id ?? "");

  const now = new Date();
  const today = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;

  const { data: hydrationData, isError: hydrationError } = useQuery<{ consumido_ml: number; meta_ml: number; restante_ml: number; percentual: number; atingiu_meta: boolean }>({
    queryKey: ["hydration", "resumo", today],
    queryFn: async () => {
      const res = await apiFetch(`/api/hidratacao/resumo?data=${today}`);
      if (!res.ok) throw new Error("Erro");
      return res.json();
    },
    enabled: !!userId,
    retry: 1,
  });

  const { data: planosData, isError: planosError } = useQuery<{
    itens: { id: number; nome: string; objetivo: string; ativo: boolean; atualizado_em: string }[];
    total_itens: number;
  }>({
    queryKey: ["treino", "planos"],
    queryFn: async () => {
      const res = await apiFetch("/api/treino/planos");
      if (!res.ok) throw new Error("Erro");
      return res.json();
    },
    enabled: !!userId,
    retry: 1,
  });

  const planoAtivo = planosData?.itens?.find(p => p.ativo) || planosData?.itens?.[0];

  const { data: estadoBio } = useQuery<{
    ultima_leitura: {
      peso_kg: number;
      gordura_percentual: number | null;
      massa_muscular_kg: number | null;
      agua_percentual: number | null;
    } | null;
    peso_atual_kg: number | null;
  }>({
    queryKey: ["biometria", "estado-atual"],
    queryFn: async () => {
      const res = await apiFetch("/api/biometria/estado-atual");
      if (!res.ok) throw new Error("Erro");
      return res.json();
    },
    enabled: !!userId,
  });

  const { data: historicoBio } = useQuery<{
    pontos: { data: string; peso_kg: number }[];
  }>({
    queryKey: ["biometria", "historico", "7d"],
    queryFn: async () => {
      const res = await apiFetch("/api/biometria/historico?dias=7");
      if (!res.ok) throw new Error("Erro");
      return res.json();
    },
    enabled: !!userId,
  });

  const weightChartData = (historicoBio?.pontos || []).map((p) => ({
    day: new Date(p.data).toLocaleDateString("pt-BR", { weekday: "short" }).replace(".", ""),
    weight: p.peso_kg,
  }));

  const { data: mealSummary } = useQuery<any>({
    queryKey: ["nutricao", "resumo-hoje"],
    queryFn: async () => {
      const res = await apiFetch("/api/nutricao/resumo-hoje");
      if (!res.ok) throw new Error("Erro ao buscar resumo nutricional");
      return res.json();
    },
    enabled: !!userId,
  });

  const totalCal = mealSummary?.consumido?.calorias ?? 0;
  const totalProt = Math.round(mealSummary?.consumido?.proteinas ?? 0);
  const totalCarbs = Math.round(mealSummary?.consumido?.carboidratos ?? 0);
  const totalFat = Math.round(mealSummary?.consumido?.gorduras ?? 0);
  const metaCal = mealSummary?.meta?.calorias ?? DEFAULT_GOALS.kcal;
  const calRemaining = Math.max(0, mealSummary?.saldo?.calorias ?? (metaCal - totalCal));
  const calProgress = Math.min(1, (mealSummary?.percentual_meta?.calorias ?? (metaCal > 0 ? (totalCal / metaCal) * 100 : 0)) / 100);
  const mealCount = mealSummary?.total_registros ?? 0;

  const hour = new Date().getHours();
  const greeting = hour < 12 ? "Bom dia" : hour < 18 ? "Boa tarde" : "Boa noite";

  const hydrationMl = hydrationData?.consumido_ml ?? 0;
  const hydrationGoal = hydrationData?.meta_ml ?? 2500;
  const hydrationL = (hydrationMl / 1000).toFixed(1);
  const hydrationGoalL = (hydrationGoal / 1000).toFixed(1);
  const hydrationDots = Math.min(Math.ceil((hydrationMl / hydrationGoal) * 5), 5);

  return (
    <Layout>
      {/* Header */}
      <header className="px-6 pt-14 pb-28 bg-gradient-to-b from-[#FAFBF8] to-[#F5F3EE]">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div 
              onClick={() => setLocation("/profile")}
              className="w-10 h-10 rounded-full bg-[#E8EBE5] overflow-hidden cursor-pointer active:scale-95 transition-transform"
            >
               <img src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${user?.username || "user"}`} alt="User" />
            </div>
            <div 
              onClick={() => setLocation("/profile")}
              className="cursor-pointer"
            >
              <p className="text-xs text-[#8B9286] font-medium uppercase tracking-wider">{greeting},</p>
              <h1 className="font-display text-xl text-[#2F5641]" data-testid="text-username">{user?.first_name || user?.username || "Usuário"}</h1>
            </div>
          </div>
          <button className="relative p-2 text-[#2F5641]">
            <Bell size={24} />
            <span className="absolute top-2 right-2.5 w-2 h-2 bg-[#D97952] rounded-full border border-[#FAFBF8]" />
          </button>
        </div>

        {/* Caloric Gauge Section */}
        <div className="flex flex-col items-center relative mb-2">
           {/* Semicircle Gauge SVG */}
           <div className="relative w-[240px] h-[132px] mb-4">
             <svg viewBox="0 0 240 132" className="w-full h-full">
               {(() => {
                 const cx = 120, cy = 120, r = 108;
                 const arcLength = Math.PI * r;
                 const filled = arcLength * Math.min(calProgress, 1);
                 return (
                   <>
                     <path
                       d={`M ${cx - r} ${cy} A ${r} ${r} 0 0 1 ${cx + r} ${cy}`}
                       fill="none"
                       stroke="#E8EBE5"
                       strokeWidth="12"
                       strokeLinecap="round"
                     />
                     {calProgress > 0 && (
                       <path
                         d={`M ${cx - r} ${cy} A ${r} ${r} 0 0 1 ${cx + r} ${cy}`}
                         fill="none"
                         stroke="#648D4A"
                         strokeWidth="12"
                         strokeLinecap="round"
                         strokeDasharray={`${arcLength}`}
                         strokeDashoffset={`${arcLength - filled}`}
                         className="transition-all duration-1000 ease-out"
                       />
                     )}
                   </>
                 );
               })()}
             </svg>
             
             {/* Center Stats */}
             <div className="absolute bottom-0 left-1/2 -translate-x-1/2 text-center mb-2">
               <span className="block text-4xl font-display font-semibold text-[#2F5641]" data-testid="text-home-calories">{totalCal.toLocaleString("pt-BR")}</span>
               <span className="text-[10px] text-[#8B9286] uppercase tracking-widest font-medium">Kcal Consumidas</span>
             </div>
           </div>
           
           {/* Left/Right Stats */}
           <div className="absolute top-[60px] left-0 text-left">
             <span className="block text-sm font-bold text-[#8B9286]">{calRemaining}</span>
             <span className="text-[9px] text-[#8B9286] uppercase">Restantes</span>
           </div>
           <div className="absolute top-[60px] right-0 text-right">
             <span className="block text-sm font-bold text-[#8B9286]">{mealCount}</span>
             <span className="text-[9px] text-[#8B9286] uppercase">Refeições</span>
           </div>
           
           {/* Macro Circles */}
           <div className="flex gap-8 mt-2">
             <div className="flex flex-col items-center gap-1">
               <div className="w-10 h-10 rounded-full border-2 border-[#648D4A] flex items-center justify-center text-xs font-bold text-[#2F5641]">{totalProt}g</div>
               <span className="text-[9px] font-medium text-[#8B9286]">PROT</span>
             </div>
             <div className="flex flex-col items-center gap-1">
               <div className="w-10 h-10 rounded-full border-2 border-[#D97952] flex items-center justify-center text-xs font-bold text-[#2F5641]">{totalCarbs}g</div>
               <span className="text-[9px] font-medium text-[#8B9286]">CARB</span>
             </div>
             <div className="flex flex-col items-center gap-1">
               <div className="w-10 h-10 rounded-full border-2 border-[#C7AE6A] flex items-center justify-center text-xs font-bold text-[#2F5641]">{totalFat}g</div>
               <span className="text-[9px] font-medium text-[#8B9286]">GORD</span>
             </div>
           </div>
        </div>
      </header>

      <main className="px-6 space-y-6 -mt-20 relative z-10">
        {/* Daily Goal Cards */}
        <div className="grid grid-cols-2 gap-3">
          <motion.button 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="bg-white p-4 rounded-2xl shadow-lg shadow-[#2F5641]/5 border border-[#E8EBE5] text-left active:scale-[0.98] transition-transform"
          >
            <h3 className="font-display text-sm font-semibold text-[#2F5641] mb-1">Bater Macros</h3>
            <p className="text-[11px] text-[#8B9286] leading-tight">Registre refeições para atingir a meta.</p>
          </motion.button>
          
          <motion.button
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            onClick={() => setLocation("/hydration")}
            className="bg-white p-4 rounded-2xl shadow-lg shadow-[#2F5641]/5 border border-[#E8EBE5] text-left active:scale-[0.98] transition-transform"
          >
            <h3 className="font-display text-sm font-semibold text-[#2F5641] mb-1">Meta Água</h3>
            <p data-testid="text-water-goal-card" className="text-[11px] text-[#8B9286] leading-tight">{hydrationL}L de {hydrationGoalL}L <br/><span className="text-[#3D7A8C] font-medium">{hydrationMl >= hydrationGoal ? "Meta batida!" : hydrationMl > 0 ? "Continue assim!" : "Comece a beber!"}</span></p>
          </motion.button>
        </div>

        {/* Food Log Summary */}
        <section>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-bold text-[#2F5641] uppercase tracking-wide">Últimas Refeições</h2>
            <button 
              onClick={() => setLocation("/nutrition")}
              className="text-[11px] font-semibold text-[#C7AE6A] hover:underline"
            >
              Ver tudo
            </button>
          </div>
          
          {mealCount > 0 ? (
            <div className="bg-white p-4 rounded-xl border border-[#E8EBE5] shadow-sm">
              <div className="grid grid-cols-3 gap-3 text-center">
                <div>
                  <p className="text-xs text-[#8B9286]">Prot</p>
                  <p className="text-sm font-semibold text-[#648D4A]">{totalProt}g</p>
                </div>
                <div>
                  <p className="text-xs text-[#8B9286]">Carb</p>
                  <p className="text-sm font-semibold text-[#D97952]">{totalCarbs}g</p>
                </div>
                <div>
                  <p className="text-xs text-[#8B9286]">Gord</p>
                  <p className="text-sm font-semibold text-[#C7AE6A]">{totalFat}g</p>
                </div>
              </div>
            </div>
          ) : (
            <div className="bg-white p-4 rounded-xl border border-[#E8EBE5] shadow-sm text-center">
              <p className="text-xs text-[#8B9286]">Nenhuma refeição registrada hoje</p>
              <button onClick={() => setLocation("/nutrition")} className="text-xs font-semibold text-[#C7AE6A] mt-2 hover:underline">Registrar agora</button>
            </div>
          )}
        </section>

        {/* Workout of the Day */}
        <section
          onClick={() => setLocation(planoAtivo ? `/training/plans/${planoAtivo.id}` : "/training")}
          className="bg-[#2F5641] rounded-2xl p-5 text-white shadow-lg shadow-[#2F5641]/20 relative overflow-hidden cursor-pointer active:scale-[0.98] transition-transform"
        >
          <div className="absolute top-0 right-0 p-4 opacity-10">
            <Dumbbell size={80} />
          </div>
          
          <div className="relative z-10">
            <h2 className="text-[10px] font-bold uppercase tracking-widest text-[#648D4A] mb-1">Treino</h2>
            {planosError || !planoAtivo ? (
              <>
                <h3 className="font-display text-xl mb-4" data-testid="text-training-card">Crie seu primeiro plano</h3>
                <button 
                  onClick={(e) => { e.stopPropagation(); setLocation("/training"); }}
                  className="w-full bg-[#C7AE6A] text-white py-3 rounded-xl font-semibold text-sm shadow-md hover:bg-[#D5BD95] transition-colors flex items-center justify-center gap-2"
                  data-testid="button-go-training"
                >
                  Ver Treinos <ChevronRight size={16} />
                </button>
              </>
            ) : (
              <>
                <h3 className="font-display text-xl mb-2" data-testid="text-training-card">{planoAtivo.nome}</h3>
                {planoAtivo.objetivo && (
                  <p className="text-xs opacity-70 mb-4">{planoAtivo.objetivo}</p>
                )}
                <div className="flex items-center gap-3 mb-5">
                  <span className="text-[10px] px-2 py-0.5 bg-[#648D4A] rounded-full font-bold uppercase">Ativo</span>
                  <span className="text-[10px] opacity-60">{planosData?.total_itens ?? 0} plano(s)</span>
                </div>
                <button 
                  onClick={(e) => { e.stopPropagation(); setLocation(`/training/player/${planoAtivo.id}`); }}
                  className="w-full bg-[#C7AE6A] text-white py-3 rounded-xl font-semibold text-sm shadow-md hover:bg-[#D5BD95] transition-colors flex items-center justify-center gap-2"
                  data-testid="button-start-training"
                >
                  Iniciar Treino <ChevronRight size={16} />
                </button>
              </>
            )}
          </div>
        </section>

        {/* Body Composition Card */}
        <section 
          className="bg-white p-5 rounded-2xl border border-[#E8EBE5] shadow-sm relative overflow-hidden"
        >
           <div 
             onClick={() => setLocation("/biometrics")}
             className="cursor-pointer active:scale-[0.98] transition-transform"
           >
             <div className="flex items-center justify-between mb-4 pr-12">
               <h2 className="text-sm font-bold text-[#2F5641] uppercase tracking-wide flex items-center gap-2">
                 <TrendingUp size={16} /> Composição
               </h2>
               <span className="text-xs font-semibold text-[#2F5641]" data-testid="text-body-weight">
                 {estadoBio?.peso_atual_kg != null ? `${estadoBio.peso_atual_kg} kg` : "—"}
               </span>
             </div>
             
             <div className="h-[60px] w-full mb-4">
               {weightChartData.length > 1 ? (
                 <ResponsiveContainer width="100%" height="100%">
                   <AreaChart data={weightChartData}>
                     <defs>
                       <linearGradient id="colorWeight" x1="0" y1="0" x2="0" y2="1">
                         <stop offset="5%" stopColor="#3D7A8C" stopOpacity={0.3}/>
                         <stop offset="95%" stopColor="#3D7A8C" stopOpacity={0}/>
                       </linearGradient>
                     </defs>
                     <Area type="monotone" dataKey="weight" stroke="#3D7A8C" strokeWidth={2} fillOpacity={1} fill="url(#colorWeight)" />
                   </AreaChart>
                 </ResponsiveContainer>
               ) : (
                 <div className="flex items-center justify-center h-full">
                   <p className="text-[10px] text-[#8B9286]">Registre pesagens para ver o gráfico</p>
                 </div>
               )}
             </div>
             
             <div className="flex justify-between border-t border-[#E8EBE5] pt-3">
                <div className="text-center">
                   <span className="block text-xs font-bold text-[#2F5641]">
                     {estadoBio?.ultima_leitura?.gordura_percentual != null ? `${estadoBio.ultima_leitura.gordura_percentual}%` : "—"}
                   </span>
                   <span className="text-[9px] text-[#8B9286] uppercase">Gordura</span>
                </div>
                <div className="text-center">
                   <span className="block text-xs font-bold text-[#2F5641]">
                     {estadoBio?.ultima_leitura?.massa_muscular_kg != null ? `${estadoBio.ultima_leitura.massa_muscular_kg}kg` : "—"}
                   </span>
                   <span className="text-[9px] text-[#8B9286] uppercase">Músculo</span>
                </div>
                <div className="text-center">
                   <span className="block text-xs font-bold text-[#2F5641]">
                     {estadoBio?.ultima_leitura?.agua_percentual != null ? `${estadoBio.ultima_leitura.agua_percentual}%` : "—"}
                   </span>
                   <span className="text-[9px] text-[#8B9286] uppercase">Água</span>
                </div>
             </div>
           </div>

           {/* Quick Action Overlay Button */}
           <button 
             onClick={(e) => {
               e.stopPropagation();
               setLocation("/biometrics/scan");
             }}
             className="absolute top-4 right-4 w-8 h-8 rounded-full bg-[#2F5641] text-white flex items-center justify-center shadow-md active:scale-90 transition-transform"
             data-testid="button-add-body-reading"
           >
             <Plus size={16} />
           </button>
        </section>

        {/* Water Card */}
        <section className="bg-[#3D7A8C] text-white p-5 rounded-2xl shadow-lg shadow-[#3D7A8C]/20 flex items-center justify-between">
           <div
             onClick={() => setLocation("/hydration")}
             className="cursor-pointer"
           >
             <div className="flex items-center gap-2 mb-2">
               <Droplets size={18} className="fill-current" />
               <h2 className="text-xs font-bold uppercase tracking-wide">Hidratação</h2>
             </div>
             {hydrationError ? (
               <p data-testid="text-hydration-card" className="text-lg font-display mb-1 opacity-70">Toque para ver</p>
             ) : (
               <>
                 <p data-testid="text-hydration-card" className="text-2xl font-display mb-1">{hydrationL} <span className="text-sm opacity-70">/ {hydrationGoalL} L</span></p>
                 <div className="flex gap-1 mt-2">
                   {[1, 2, 3, 4, 5].map(i => (
                     <div key={i} className={`w-3 h-3 rounded-full border border-white ${i <= hydrationDots ? "bg-white" : "bg-transparent"}`} />
                   ))}
                 </div>
               </>
             )}
           </div>

           <button
             data-testid="button-add-hydration"
             onClick={() => setLocation("/hydration")}
             className="bg-white text-[#3D7A8C] w-12 h-12 rounded-full flex items-center justify-center shadow-md hover:scale-105 active:scale-90 transition-transform"
           >
             <Plus size={24} strokeWidth={3} />
           </button>
        </section>

      </main>
    </Layout>
  );
}
