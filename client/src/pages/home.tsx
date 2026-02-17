import Layout from "@/components/layout";
import { Bell, ChevronRight, Droplets, Plus, TrendingUp, Dumbbell } from "lucide-react";
import { AreaChart, Area, ResponsiveContainer } from "recharts";
import { motion } from "framer-motion";
import { useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/lib/auth";
import { apiFetch } from "@/lib/api";

const CALORIE_GOAL = 2200;
const PROTEIN_GOAL = 160;
const CARBS_GOAL = 200;
const FAT_GOAL = 70;

const MEAL_EMOJIS: Record<string, string> = {
  breakfast: "🥣",
  lunch: "🥗",
  snack: "🍎",
  dinner: "🍽️",
};

const MEAL_NAMES: Record<string, string> = {
  breakfast: "Café da Manhã",
  lunch: "Almoço",
  snack: "Lanche da Tarde",
  dinner: "Jantar",
};

const WEIGHT_DATA = [
  { day: 'Seg', weight: 72.5 },
  { day: 'Ter', weight: 72.4 },
  { day: 'Qua', weight: 72.6 },
  { day: 'Qui', weight: 72.3 },
  { day: 'Sex', weight: 72.2 },
  { day: 'Sab', weight: 72.1 },
  { day: 'Dom', weight: 72.0 },
];

export default function HomeScreen() {
  const [, setLocation] = useLocation();
  const { user } = useAuth();
  const userId = String(user?.id ?? "");

  const now = new Date();
  const today = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;

  const { data: hydrationData } = useQuery({
    queryKey: ["hydration", "resumo", today],
    queryFn: async () => {
      return { consumido_ml: 0, meta_ml: 2500, restante_ml: 2500, percentual: 0, atingiu_meta: false } as { consumido_ml: number; meta_ml: number; restante_ml: number; percentual: number; atingiu_meta: boolean };
    },
    enabled: false,
  });

  const { data: mealSummary } = useQuery<{
    totalCalories: number;
    totalProtein: number;
    totalCarbs: number;
    totalFat: number;
    meals: Record<string, { items: any[]; calories: number; protein: number; carbs: number; fat: number }>;
  }>({
    queryKey: ["nutricao", "resumo-hoje"],
    queryFn: async () => {
      const res = await apiFetch("/api/nutricao/resumo-hoje");
      if (!res.ok) throw new Error("Erro ao buscar resumo nutricional");
      return res.json();
    },
    enabled: !!userId,
  });

  const totalCal = mealSummary?.totalCalories ?? 0;
  const totalProt = Math.round(mealSummary?.totalProtein ?? 0);
  const totalCarbs = Math.round(mealSummary?.totalCarbs ?? 0);
  const totalFat = Math.round(mealSummary?.totalFat ?? 0);
  const calRemaining = Math.max(0, CALORIE_GOAL - totalCal);
  const calProgress = Math.min(1, totalCal / CALORIE_GOAL);
  const mealCount = mealSummary?.meals ? Object.values(mealSummary.meals).filter(m => m.items.length > 0).length : 0;
  const recentMeals = mealSummary?.meals
    ? Object.entries(mealSummary.meals).filter(([, m]) => m.items.length > 0).slice(0, 3)
    : [];

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
           {/* Semicircle Gauge CSS */}
           <div className="relative w-[240px] h-[120px] overflow-hidden mb-4">
             <div className="absolute top-0 left-0 w-[240px] h-[240px] rounded-full border-[12px] border-[#E8EBE5]" />
             <div 
               className="absolute top-0 left-0 w-[240px] h-[240px] rounded-full border-[12px] border-[#648D4A] transition-all duration-1000 ease-out"
               style={{ 
                 clipPath: "polygon(0 0, 100% 0, 100% 50%, 0 50%)",
                 transform: "rotate(45deg)" // Represents progress
               }} 
             />
             
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
          
          <div className="space-y-3">
            {recentMeals.length > 0 ? recentMeals.map(([slot, data]) => (
              <div key={slot} className="bg-white p-3 rounded-xl border border-[#E8EBE5] shadow-sm flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-[#648D4A]/10 flex items-center justify-center text-lg">{MEAL_EMOJIS[slot] || "🍽️"}</div>
                  <div>
                    <p className="text-sm font-semibold text-[#2F5641]">{MEAL_NAMES[slot] || slot}</p>
                    <p className="text-[10px] text-[#8B9286]">{Math.round(data.calories)} kcal</p>
                  </div>
                </div>
                <div className="flex gap-1">
                  <span className="w-2 h-2 rounded-full bg-[#648D4A]" title="Protein" />
                  <span className="w-2 h-2 rounded-full bg-[#D97952]" title="Carbs" />
                  <span className="w-2 h-2 rounded-full bg-[#C7AE6A]" title="Fats" />
                </div>
              </div>
            )) : (
              <div className="bg-white p-4 rounded-xl border border-[#E8EBE5] shadow-sm text-center">
                <p className="text-xs text-[#8B9286]">Nenhuma refeição registrada hoje</p>
                <button onClick={() => setLocation("/nutrition")} className="text-xs font-semibold text-[#C7AE6A] mt-2 hover:underline">Registrar agora</button>
              </div>
            )}
          </div>
        </section>

        {/* Workout of the Day */}
        <section className="bg-[#2F5641] rounded-2xl p-5 text-white shadow-lg shadow-[#2F5641]/20 relative overflow-hidden">
          <div className="absolute top-0 right-0 p-4 opacity-10">
            <Dumbbell size={80} />
          </div>
          
          <div className="relative z-10">
            <h2 className="text-[10px] font-bold uppercase tracking-widest text-[#648D4A] mb-1">Treino do Dia</h2>
            <h3 className="font-display text-xl mb-4">Superior: Força & Hipertrofia A</h3>
            
            <div className="flex items-center gap-4 mb-5">
              <div>
                <span className="block text-lg font-bold">55</span>
                <span className="text-[10px] opacity-70 uppercase">Minutos</span>
              </div>
              <div className="w-[1px] h-8 bg-white/20" />
              <div>
                <span className="block text-lg font-bold">8</span>
                <span className="text-[10px] opacity-70 uppercase">Exercícios</span>
              </div>
            </div>
            
            <button 
              onClick={() => setLocation("/training/details")}
              className="w-full bg-[#C7AE6A] text-white py-3 rounded-xl font-semibold text-sm shadow-md hover:bg-[#D5BD95] transition-colors flex items-center justify-center gap-2"
            >
              Iniciar Treino <ChevronRight size={16} />
            </button>
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
               <span className="text-xs font-semibold text-[#2F5641]">72.0 kg</span>
             </div>
             
             <div className="h-[60px] w-full mb-4">
               <ResponsiveContainer width="100%" height="100%">
                 <AreaChart data={WEIGHT_DATA}>
                   <defs>
                     <linearGradient id="colorWeight" x1="0" y1="0" x2="0" y2="1">
                       <stop offset="5%" stopColor="#3D7A8C" stopOpacity={0.3}/>
                       <stop offset="95%" stopColor="#3D7A8C" stopOpacity={0}/>
                     </linearGradient>
                   </defs>
                   <Area type="monotone" dataKey="weight" stroke="#3D7A8C" strokeWidth={2} fillOpacity={1} fill="url(#colorWeight)" />
                 </AreaChart>
               </ResponsiveContainer>
             </div>
             
             <div className="flex justify-between border-t border-[#E8EBE5] pt-3">
                <div className="text-center">
                   <span className="block text-xs font-bold text-[#2F5641]">14.5%</span>
                   <span className="text-[9px] text-[#8B9286] uppercase">Gordura</span>
                </div>
                <div className="text-center">
                   <span className="block text-xs font-bold text-[#2F5641]">38.2kg</span>
                   <span className="text-[9px] text-[#8B9286] uppercase">Músculo</span>
                </div>
                <div className="text-center">
                   <span className="block text-xs font-bold text-[#2F5641]">61%</span>
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
             <p data-testid="text-hydration-card" className="text-2xl font-display mb-1">{hydrationL} <span className="text-sm opacity-70">/ {hydrationGoalL} L</span></p>
             <div className="flex gap-1 mt-2">
               {[1, 2, 3, 4, 5].map(i => (
                 <div key={i} className={`w-3 h-3 rounded-full border border-white ${i <= hydrationDots ? "bg-white" : "bg-transparent"}`} />
               ))}
             </div>
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
