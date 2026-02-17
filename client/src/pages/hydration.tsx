import Layout from "@/components/layout";
import { ChevronLeft, Plus, Minus, Droplets, History, Settings } from "lucide-react";
import { useLocation } from "wouter";
import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";

export default function HydrationScreen() {
  const [, setLocation] = useLocation();
  const [intake, setIntake] = useState(1250); // Current intake in ml
  const goal = 2500; // Daily goal in ml
  const [history, setHistory] = useState([
    { time: "08:00", amount: 250 },
    { time: "10:30", amount: 500 },
    { time: "13:15", amount: 500 },
  ]);

  const percentage = Math.min((intake / goal) * 100, 100);

  const addWater = (amount: number) => {
    setIntake(prev => prev + amount);
    const now = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    setHistory(prev => [{ time: now, amount }, ...prev]);
  };

  return (
    <Layout>
      <div className="bg-[#FAFBF8] min-h-screen pb-24 flex flex-col">
        {/* Header */}
        <header className="px-6 pt-14 pb-4 flex items-center justify-between sticky top-0 bg-[#FAFBF8]/95 backdrop-blur-sm z-10">
          <button 
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
          
          {/* Main Display */}
          <section className="flex-1 flex flex-col items-center justify-center py-8 relative">
            {/* Water Level Visualization */}
            <div className="relative w-64 h-80 bg-[#E8EBE5]/50 rounded-[3rem] border-4 border-white shadow-xl shadow-[#3D7A8C]/10 overflow-hidden mb-8">
              {/* Liquid */}
              <motion.div 
                className="absolute bottom-0 left-0 right-0 bg-[#3D7A8C]/80 backdrop-blur-sm"
                initial={{ height: `${percentage}%` }}
                animate={{ height: `${percentage}%` }}
                transition={{ type: "spring", stiffness: 50, damping: 20 }}
              >
                {/* Wave effect at top */}
                <div className="absolute top-0 left-0 right-0 h-4 bg-[#4A8B9F] opacity-50 rounded-[50%]" style={{ transform: "translateY(-50%)" }} />
                
                {/* Bubbles animation could go here */}
              </motion.div>

              {/* Text Overlay */}
              <div className="absolute inset-0 flex flex-col items-center justify-center z-10 mix-blend-overlay text-white">
                 <span className="font-display text-6xl font-bold">{intake}</span>
                 <span className="text-sm font-medium uppercase tracking-widest opacity-80">ml</span>
              </div>
            </div>

            {/* Goal Info */}
            <div className="text-center mb-8">
              <p className="text-xs text-[#8B9286] uppercase tracking-wider mb-1">Meta Diária</p>
              <div className="flex items-center justify-center gap-2">
                <span className="font-bold text-2xl text-[#2F5641]">{goal} ml</span>
                {percentage >= 100 && (
                  <span className="bg-[#648D4A] text-white text-[10px] font-bold px-2 py-0.5 rounded-full">Meta Batida! 🎉</span>
                )}
              </div>
            </div>

            {/* Quick Add Buttons */}
            <div className="grid grid-cols-3 gap-4 w-full">
               <button 
                 onClick={() => addWater(250)}
                 className="flex flex-col items-center gap-2 p-4 bg-white rounded-2xl shadow-sm border border-[#E8EBE5] hover:border-[#3D7A8C] active:scale-95 transition-all group"
               >
                 <div className="w-10 h-10 rounded-full bg-[#3D7A8C]/10 flex items-center justify-center text-[#3D7A8C] group-hover:bg-[#3D7A8C] group-hover:text-white transition-colors">
                   <Plus size={16} strokeWidth={3} />
                 </div>
                 <span className="text-xs font-bold text-[#2F5641]">250ml</span>
               </button>

               <button 
                 onClick={() => addWater(500)}
                 className="flex flex-col items-center gap-2 p-4 bg-white rounded-2xl shadow-sm border border-[#E8EBE5] hover:border-[#3D7A8C] active:scale-95 transition-all group"
               >
                 <div className="w-10 h-10 rounded-full bg-[#3D7A8C]/10 flex items-center justify-center text-[#3D7A8C] group-hover:bg-[#3D7A8C] group-hover:text-white transition-colors">
                   <Plus size={16} strokeWidth={3} />
                 </div>
                 <span className="text-xs font-bold text-[#2F5641]">500ml</span>
               </button>

               <button 
                 onClick={() => addWater(750)}
                 className="flex flex-col items-center gap-2 p-4 bg-white rounded-2xl shadow-sm border border-[#E8EBE5] hover:border-[#3D7A8C] active:scale-95 transition-all group"
               >
                 <div className="w-10 h-10 rounded-full bg-[#3D7A8C]/10 flex items-center justify-center text-[#3D7A8C] group-hover:bg-[#3D7A8C] group-hover:text-white transition-colors">
                   <Plus size={16} strokeWidth={3} />
                 </div>
                 <span className="text-xs font-bold text-[#2F5641]">Garrafa</span>
               </button>
            </div>
          </section>

          {/* History */}
          <section className="mt-6 mb-6">
            <div className="flex items-center gap-2 mb-4">
               <History size={16} className="text-[#8B9286]" />
               <h3 className="text-xs font-bold text-[#8B9286] uppercase tracking-wider">Histórico de Hoje</h3>
            </div>
            
            <div className="bg-white rounded-2xl border border-[#E8EBE5] overflow-hidden">
               {history.map((entry, idx) => (
                 <div key={idx} className="flex justify-between items-center p-4 border-b border-[#E8EBE5] last:border-0">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-[#3D7A8C]/10 flex items-center justify-center text-[#3D7A8C]">
                        <Droplets size={14} />
                      </div>
                      <span className="text-sm font-medium text-[#2F5641]">Água</span>
                    </div>
                    <div className="flex items-center gap-3">
                       <span className="text-xs text-[#8B9286]">{entry.time}</span>
                       <span className="text-sm font-bold text-[#2F5641]">{entry.amount}ml</span>
                    </div>
                 </div>
               ))}
               {history.length === 0 && (
                 <div className="p-6 text-center text-xs text-[#8B9286]">
                   Nenhum registro hoje. Beba água! 💧
                 </div>
               )}
            </div>
          </section>

        </main>
      </div>
    </Layout>
  );
}
