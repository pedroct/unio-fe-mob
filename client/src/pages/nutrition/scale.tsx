import Layout from "@/components/layout";
import { ChevronLeft, Bluetooth, Scale, Check, RefreshCw, Plus } from "lucide-react";
import { useLocation } from "wouter";
import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";

export default function NutritionScaleScreen() {
  const [, setLocation] = useLocation();
  const [connectionStatus, setConnectionStatus] = useState<"searching" | "connected" | "disconnected">("searching");
  const [weight, setWeight] = useState(0);
  const [selectedFood, setSelectedFood] = useState("Peito de Frango Grelhado");

  // Simulate Bluetooth Connection
  useEffect(() => {
    const timer = setTimeout(() => {
      setConnectionStatus("connected");
    }, 2500);
    return () => clearTimeout(timer);
  }, []);

  // Simulate Weight Fluctuation when connected
  useEffect(() => {
    if (connectionStatus === "connected" && weight === 0) {
      // Simulate placing an item after connection
      const timer = setTimeout(() => {
         setWeight(124); 
      }, 1000);
      return () => clearTimeout(timer);
    }
  }, [connectionStatus, weight]);

  // Mock Nutritional Data per 100g
  const FOOD_DATA = {
    name: "Peito de Frango Grelhado",
    kcal: 165,
    protein: 31,
    carbs: 0,
    fat: 3.6
  };

  const currentStats = {
    kcal: Math.round((weight / 100) * FOOD_DATA.kcal),
    protein: Math.round((weight / 100) * FOOD_DATA.protein),
    carbs: Math.round((weight / 100) * FOOD_DATA.carbs),
    fat: Math.round((weight / 100) * FOOD_DATA.fat),
  };

  return (
    <Layout>
      <div className="bg-[#FAFBF8] min-h-screen pb-24 relative overflow-hidden">
        {/* Header */}
        <header className="px-6 pt-14 pb-4 flex items-center justify-between sticky top-0 bg-[#FAFBF8]/95 backdrop-blur-sm z-10">
          <button 
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

        <main className="px-6 space-y-8">
          
          {/* Connection Status */}
          <div className="text-center py-4">
             <AnimatePresence mode="wait">
               {connectionStatus === 'searching' ? (
                 <motion.div 
                   key="searching"
                   initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                   className="flex flex-col items-center gap-2"
                 >
                   <RefreshCw size={24} className="animate-spin text-[#C7AE6A]" />
                   <p className="text-sm font-medium text-[#8B9286]">Buscando dispositivos...</p>
                 </motion.div>
               ) : (
                 <motion.div 
                   key="connected"
                   initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
                   className="flex flex-col items-center gap-2"
                 >
                   <div className="flex items-center gap-2 bg-[#648D4A]/10 px-3 py-1.5 rounded-full">
                     <Check size={14} className="text-[#648D4A]" strokeWidth={3} />
                     <span className="text-xs font-bold text-[#648D4A] uppercase tracking-wide">Conectado</span>
                   </div>
                   <p className="text-xs text-[#8B9286]">Xiaomi Smart Kitchen Scale 2</p>
                 </motion.div>
               )}
             </AnimatePresence>
          </div>

          {/* Main Weight Display */}
          <div className="relative flex flex-col items-center justify-center py-8">
             {/* Scale Circle Graphic */}
             <div className="w-64 h-64 rounded-full border-4 border-[#E8EBE5] flex items-center justify-center relative bg-white shadow-xl shadow-[#2F5641]/5">
                <motion.div 
                  className="text-center"
                  animate={{ scale: weight > 0 ? [1, 1.02, 1] : 1 }}
                  transition={{ duration: 0.3 }}
                >
                  <span className="font-display text-7xl font-bold text-[#2F5641] tabular-nums">
                    {weight}
                  </span>
                  <span className="block text-lg font-medium text-[#8B9286] mt-1">gramas</span>
                </motion.div>
                
                {/* Visual Indicator Ring */}
                <svg className="absolute inset-0 w-full h-full -rotate-90 pointer-events-none">
                  <circle 
                    cx="128" cy="128" r="124" 
                    fill="none" 
                    stroke="#648D4A" 
                    strokeWidth="4" 
                    strokeDasharray="779" // 2 * pi * 124
                    strokeDashoffset={779 - (779 * (Math.min(weight, 500) / 500))} // Max 500g visualization
                    className="transition-all duration-500 ease-out"
                    strokeLinecap="round"
                  />
                </svg>
             </div>

             {/* Tare Button */}
             <button 
               onClick={() => setWeight(0)}
               className="mt-8 text-xs font-bold uppercase tracking-widest text-[#C7AE6A] border border-[#C7AE6A] px-6 py-2 rounded-full hover:bg-[#C7AE6A]/10 active:scale-95 transition-all"
             >
               Tarar (Zerar)
             </button>
          </div>

          {/* Food Selection & Macros */}
          <div className="bg-white rounded-3xl p-6 shadow-lg shadow-[#2F5641]/5 border border-[#E8EBE5]">
             <div className="mb-6">
               <label className="text-[10px] font-bold uppercase tracking-wider text-[#8B9286] mb-2 block">Alimento Selecionado</label>
               <div className="flex items-center justify-between p-3 bg-[#FAFBF8] rounded-xl border border-[#E8EBE5]">
                 <span className="font-semibold text-[#2F5641]">{selectedFood}</span>
                 <ChevronLeft size={16} className="text-[#8B9286] -rotate-90" />
               </div>
             </div>

             <div className="grid grid-cols-4 gap-2 text-center">
                <div className="bg-[#FAFBF8] rounded-xl p-2 border border-[#E8EBE5]">
                   <span className="block text-lg font-bold text-[#2F5641]">{currentStats.kcal}</span>
                   <span className="text-[9px] uppercase font-bold text-[#8B9286]">Kcal</span>
                </div>
                <div className="bg-[#FAFBF8] rounded-xl p-2 border border-[#E8EBE5]">
                   <span className="block text-lg font-bold text-[#648D4A]">{currentStats.protein}g</span>
                   <span className="text-[9px] uppercase font-bold text-[#8B9286]">Prot</span>
                </div>
                <div className="bg-[#FAFBF8] rounded-xl p-2 border border-[#E8EBE5]">
                   <span className="block text-lg font-bold text-[#D97952]">{currentStats.carbs}g</span>
                   <span className="text-[9px] uppercase font-bold text-[#8B9286]">Carb</span>
                </div>
                <div className="bg-[#FAFBF8] rounded-xl p-2 border border-[#E8EBE5]">
                   <span className="block text-lg font-bold text-[#C7AE6A]">{currentStats.fat}g</span>
                   <span className="text-[9px] uppercase font-bold text-[#8B9286]">Gord</span>
                </div>
             </div>
          </div>

          {/* Action Button */}
          <button 
            disabled={weight === 0}
            onClick={() => {
              alert("Alimento adicionado ao diário!");
              setLocation("/nutrition");
            }}
            className="w-full bg-[#2F5641] disabled:bg-[#E8EBE5] disabled:text-[#8B9286] text-white py-4 rounded-2xl font-semibold text-lg shadow-xl shadow-[#2F5641]/20 flex items-center justify-center gap-2 active:scale-[0.98] transition-all"
          >
            <Plus size={20} /> Adicionar ao Diário
          </button>

          {/* Manual Slider for Demo Purposes */}
          <div className="pt-8 opacity-50 hover:opacity-100 transition-opacity">
            <p className="text-center text-[10px] text-[#8B9286] uppercase mb-2">Simulador de Peso (Demo)</p>
            <input 
              type="range" 
              min="0" 
              max="500" 
              value={weight} 
              onChange={(e) => setWeight(parseInt(e.target.value))}
              className="w-full accent-[#2F5641]" 
            />
          </div>

        </main>
      </div>
    </Layout>
  );
}
