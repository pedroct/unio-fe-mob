import Layout from "@/components/layout";
import { ChevronLeft, Bluetooth, Scale, Check, RefreshCw, Plus, Search, X } from "lucide-react";
import { useLocation } from "wouter";
import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";

export default function NutritionScaleScreen() {
  const [, setLocation] = useLocation();
  const [connectionStatus, setConnectionStatus] = useState<"searching" | "connected" | "disconnected">("searching");
  const [weight, setWeight] = useState(0);
  
  // Search State
  const [isSearching, setIsSearching] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedFood, setSelectedFood] = useState<any>(null);

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

  // Mock Database
  const FOOD_DATABASE = [
    { name: "Peito de Frango Grelhado", kcal: 165, protein: 31, carbs: 0, fat: 3.6 },
    { name: "Arroz Branco Cozido", kcal: 130, protein: 2.7, carbs: 28, fat: 0.3 },
    { name: "Batata Doce Cozida", kcal: 86, protein: 1.6, carbs: 20, fat: 0.1 },
    { name: "Ovo Cozido", kcal: 155, protein: 13, carbs: 1.1, fat: 11 },
    { name: "Aveia em Flocos", kcal: 389, protein: 16.9, carbs: 66, fat: 6.9 },
    { name: "Banana Prata", kcal: 89, protein: 1.1, carbs: 23, fat: 0.3 },
  ];

  const filteredFoods = FOOD_DATABASE.filter(f => 
    f.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const currentStats = selectedFood ? {
    kcal: Math.round((weight / 100) * selectedFood.kcal),
    protein: Math.round((weight / 100) * selectedFood.protein),
    carbs: Math.round((weight / 100) * selectedFood.carbs),
    fat: Math.round((weight / 100) * selectedFood.fat),
  } : { kcal: 0, protein: 0, carbs: 0, fat: 0 };

  return (
    <Layout>
      <div className="bg-[#FAFBF8] min-h-screen pb-24 relative overflow-hidden flex flex-col">
        {/* Header */}
        <header className="px-6 pt-14 pb-4 flex items-center justify-between sticky top-0 bg-[#FAFBF8]/95 backdrop-blur-sm z-10 shrink-0">
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

        <main className="px-6 flex-1 flex flex-col">
          
          {/* Connection Status */}
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

          {/* Main Weight Display */}
          <div className="relative flex flex-col items-center justify-center py-6 shrink-0">
             {/* Scale Circle Graphic */}
             <div className="w-56 h-56 rounded-full border-4 border-[#E8EBE5] flex items-center justify-center relative bg-white shadow-xl shadow-[#2F5641]/5">
                <motion.div 
                  className="text-center"
                  animate={{ scale: weight > 0 ? [1, 1.02, 1] : 1 }}
                  transition={{ duration: 0.3 }}
                >
                  <span className="font-display text-6xl font-bold text-[#2F5641] tabular-nums">
                    {weight}
                  </span>
                  <span className="block text-base font-medium text-[#8B9286] mt-1">gramas</span>
                </motion.div>
                
                {/* Visual Indicator Ring */}
                <svg className="absolute inset-0 w-full h-full -rotate-90 pointer-events-none">
                  <circle 
                    cx="108" cy="108" r="104" // Adjusted for 56 (224px) size
                    fill="none" 
                    stroke="#648D4A" 
                    strokeWidth="4" 
                    strokeDasharray="653" // 2 * pi * 104
                    strokeDashoffset={653 - (653 * (Math.min(weight, 500) / 500))} 
                    className="transition-all duration-500 ease-out"
                    strokeLinecap="round"
                  />
                </svg>
             </div>

             {/* Tare Button */}
             <button 
               onClick={() => setWeight(0)}
               className="mt-6 text-[10px] font-bold uppercase tracking-widest text-[#C7AE6A] border border-[#C7AE6A] px-5 py-1.5 rounded-full hover:bg-[#C7AE6A]/10 active:scale-95 transition-all"
             >
               Tarar
             </button>
          </div>

          {/* Food Search Section */}
          <div className="flex-1 bg-white rounded-t-3xl shadow-[0_-5px_20px_rgba(0,0,0,0.05)] border-t border-[#E8EBE5] -mx-6 px-6 pt-6 flex flex-col">
            
            {!selectedFood ? (
              <div className="flex-1 flex flex-col">
                <div className="relative mb-4">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-[#8B9286]" size={18} />
                  <input 
                    type="text"
                    placeholder="Buscar alimento (ex: Frango)"
                    className="w-full bg-[#FAFBF8] border border-[#E8EBE5] rounded-xl py-3 pl-10 pr-4 text-sm focus:outline-none focus:border-[#2F5641] transition-colors"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    autoFocus
                  />
                </div>

                <div className="flex-1 overflow-y-auto space-y-2 pb-6">
                  {searchQuery.length > 0 && filteredFoods.map((food, idx) => (
                    <button
                      key={idx}
                      onClick={() => setSelectedFood(food)}
                      className="w-full text-left p-3 rounded-xl hover:bg-[#FAFBF8] border border-transparent hover:border-[#E8EBE5] transition-all flex justify-between items-center group"
                    >
                      <span className="font-medium text-[#2F5641] text-sm">{food.name}</span>
                      <Plus size={16} className="text-[#C7AE6A] opacity-0 group-hover:opacity-100 transition-opacity" />
                    </button>
                  ))}
                  {searchQuery.length === 0 && (
                    <div className="text-center py-8 opacity-40">
                      <Search size={32} className="mx-auto mb-2 text-[#8B9286]" />
                      <p className="text-xs text-[#8B9286]">Digite para buscar na base de dados</p>
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <div className="flex-1 flex flex-col">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <span className="text-[10px] font-bold uppercase tracking-wider text-[#8B9286] block mb-0.5">Alimento Selecionado</span>
                    <h3 className="font-semibold text-[#2F5641] text-lg leading-tight">{selectedFood.name}</h3>
                  </div>
                  <button 
                    onClick={() => setSelectedFood(null)}
                    className="w-8 h-8 rounded-full bg-[#F5F3EE] flex items-center justify-center text-[#8B9286]"
                  >
                    <X size={16} />
                  </button>
                </div>

                <div className="grid grid-cols-4 gap-2 text-center mb-6">
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

                <button 
                  disabled={weight === 0}
                  onClick={() => {
                    alert(`Adicionado: ${selectedFood.name} (${weight}g)`);
                    setLocation("/nutrition");
                  }}
                  className="w-full bg-[#2F5641] disabled:bg-[#E8EBE5] disabled:text-[#8B9286] text-white py-4 rounded-2xl font-semibold text-lg shadow-xl shadow-[#2F5641]/20 flex items-center justify-center gap-2 active:scale-[0.98] transition-all mt-auto mb-6"
                >
                  <Plus size={20} /> Confirmar {weight}g
                </button>
              </div>
            )}
            
            {/* Manual Slider for Demo Purposes (Hidden/Subtle) */}
            <div className="pb-4 opacity-30 hover:opacity-100 transition-opacity">
              <input 
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
