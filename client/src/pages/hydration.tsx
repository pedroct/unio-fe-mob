import Layout from "@/components/layout";
import { ChevronLeft, Plus, Minus, Droplets, History, Settings, Coffee, GlassWater, Wine, X, Calendar, Clock } from "lucide-react";
import { useLocation } from "wouter";
import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";

export default function HydrationScreen() {
  const [, setLocation] = useLocation();
  const [intake, setIntake] = useState(1250); // Current intake in ml
  const goal = 2500; // Daily goal in ml
  const [history, setHistory] = useState([
    { time: "08:00", amount: 250, type: "water", label: "Água" },
    { time: "10:30", amount: 500, type: "water", label: "Água" },
    { time: "13:15", amount: 500, type: "juice", label: "Suco" },
  ]);

  const [showManualInput, setShowManualInput] = useState(false);
  const [manualAmount, setManualAmount] = useState(250);
  const [manualType, setManualType] = useState("water");
  const [manualTime, setManualTime] = useState(new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }));

  const percentage = Math.min((intake / goal) * 100, 100);

  const BEVERAGE_TYPES = [
    { id: "water", label: "Água", icon: GlassWater, color: "#3D7A8C" },
    { id: "coffee", label: "Café", icon: Coffee, color: "#8C6A3D" },
    { id: "juice", label: "Suco", icon: Wine, color: "#D97952" }, // Using Wine icon as generic glass
    { id: "tea", label: "Chá", icon: Coffee, color: "#648D4A" },
  ];

  const addWater = (amount: number, type: string = "water", label: string = "Água", time: string = "") => {
    setIntake(prev => prev + amount);
    const timeNow = time || new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    setHistory(prev => [{ time: timeNow, amount, type, label }, ...prev]);
  };

  const handleManualSubmit = () => {
    const typeObj = BEVERAGE_TYPES.find(t => t.id === manualType) || BEVERAGE_TYPES[0];
    addWater(manualAmount, manualType, typeObj.label, manualTime);
    setShowManualInput(false);
  };

  const getIconForType = (type: string) => {
    const t = BEVERAGE_TYPES.find(item => item.id === type);
    return t ? t.icon : Droplets;
  };

  const getColorForType = (type: string) => {
    const t = BEVERAGE_TYPES.find(item => item.id === type);
    return t ? t.color : "#3D7A8C";
  };

  return (
    <Layout>
      <div className="bg-[#FAFBF8] min-h-screen pb-24 flex flex-col relative">
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
          <section className="flex-1 flex flex-col items-center justify-center py-6 relative">
            {/* Water Level Visualization */}
            <div className="relative w-56 h-72 bg-[#E8EBE5]/50 rounded-[3rem] border-4 border-white shadow-xl shadow-[#3D7A8C]/10 overflow-hidden mb-6">
              {/* Liquid */}
              <motion.div 
                className="absolute bottom-0 left-0 right-0 bg-[#3D7A8C]/80 backdrop-blur-sm"
                initial={{ height: `${percentage}%` }}
                animate={{ height: `${percentage}%` }}
                transition={{ type: "spring", stiffness: 50, damping: 20 }}
              >
                {/* Wave effect at top */}
                <div className="absolute top-0 left-0 right-0 h-4 bg-[#4A8B9F] opacity-50 rounded-[50%]" style={{ transform: "translateY(-50%)" }} />
              </motion.div>

              {/* Text Overlay */}
              <div className="absolute inset-0 flex flex-col items-center justify-center z-10 mix-blend-overlay text-white">
                 <span className="font-display text-5xl font-bold">{intake}</span>
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
            <div className="grid grid-cols-4 gap-3 w-full">
               <button 
                 onClick={() => addWater(250)}
                 className="flex flex-col items-center gap-2 p-3 bg-white rounded-2xl shadow-sm border border-[#E8EBE5] hover:border-[#3D7A8C] active:scale-95 transition-all group"
               >
                 <div className="w-8 h-8 rounded-full bg-[#3D7A8C]/10 flex items-center justify-center text-[#3D7A8C] group-hover:bg-[#3D7A8C] group-hover:text-white transition-colors">
                   <Plus size={14} strokeWidth={3} />
                 </div>
                 <span className="text-[10px] font-bold text-[#2F5641]">250ml</span>
               </button>

               <button 
                 onClick={() => addWater(500)}
                 className="flex flex-col items-center gap-2 p-3 bg-white rounded-2xl shadow-sm border border-[#E8EBE5] hover:border-[#3D7A8C] active:scale-95 transition-all group"
               >
                 <div className="w-8 h-8 rounded-full bg-[#3D7A8C]/10 flex items-center justify-center text-[#3D7A8C] group-hover:bg-[#3D7A8C] group-hover:text-white transition-colors">
                   <Plus size={14} strokeWidth={3} />
                 </div>
                 <span className="text-[10px] font-bold text-[#2F5641]">500ml</span>
               </button>

               <button 
                 onClick={() => addWater(750)}
                 className="flex flex-col items-center gap-2 p-3 bg-white rounded-2xl shadow-sm border border-[#E8EBE5] hover:border-[#3D7A8C] active:scale-95 transition-all group"
               >
                 <div className="w-8 h-8 rounded-full bg-[#3D7A8C]/10 flex items-center justify-center text-[#3D7A8C] group-hover:bg-[#3D7A8C] group-hover:text-white transition-colors">
                   <Plus size={14} strokeWidth={3} />
                 </div>
                 <span className="text-[10px] font-bold text-[#2F5641]">Garrafa</span>
               </button>

               {/* Manual Add Button */}
               <button 
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

          {/* History */}
          <section className="mt-4 mb-6">
            <div className="flex items-center gap-2 mb-4">
               <History size={16} className="text-[#8B9286]" />
               <h3 className="text-xs font-bold text-[#8B9286] uppercase tracking-wider">Histórico de Hoje</h3>
            </div>
            
            <div className="bg-white rounded-2xl border border-[#E8EBE5] overflow-hidden">
               {history.map((entry, idx) => {
                 const Icon = getIconForType(entry.type);
                 const color = getColorForType(entry.type);
                 return (
                   <div key={idx} className="flex justify-between items-center p-4 border-b border-[#E8EBE5] last:border-0">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full flex items-center justify-center" style={{ backgroundColor: `${color}20`, color: color }}>
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
               })}
               {history.length === 0 && (
                 <div className="p-6 text-center text-xs text-[#8B9286]">
                   Nenhum registro hoje. Beba água! 💧
                 </div>
               )}
            </div>
          </section>
        </main>

        {/* Manual Input Modal */}
        <AnimatePresence>
          {showManualInput && (
            <>
              <motion.div 
                initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                className="fixed inset-0 bg-black/40 backdrop-blur-sm z-40"
                onClick={() => setShowManualInput(false)}
              />
              <motion.div 
                initial={{ y: "100%" }} animate={{ y: 0 }} exit={{ y: "100%" }}
                transition={{ type: "spring", damping: 25, stiffness: 200 }}
                className="fixed bottom-0 left-0 right-0 bg-white rounded-t-3xl p-6 z-50 max-w-[430px] mx-auto pb-12"
              >
                <div className="flex justify-between items-center mb-6">
                  <h2 className="font-display text-xl font-semibold text-[#2F5641]">Registro Manual</h2>
                  <button 
                    onClick={() => setShowManualInput(false)}
                    className="w-8 h-8 rounded-full bg-[#F5F3EE] flex items-center justify-center text-[#8B9286]"
                  >
                    <X size={16} />
                  </button>
                </div>

                {/* Amount Input */}
                <div className="mb-6">
                  <label className="text-[10px] font-bold uppercase tracking-wider text-[#8B9286] mb-2 block">Quantidade (ml)</label>
                  <div className="flex items-center gap-4">
                    <button 
                      onClick={() => setManualAmount(prev => Math.max(0, prev - 50))}
                      className="w-10 h-10 rounded-full border border-[#E8EBE5] flex items-center justify-center text-[#2F5641]"
                    >
                      <Minus size={16} />
                    </button>
                    <div className="flex-1 text-center">
                      <span className="font-display text-4xl font-bold text-[#2F5641]">{manualAmount}</span>
                      <span className="text-sm text-[#8B9286] ml-1">ml</span>
                    </div>
                    <button 
                      onClick={() => setManualAmount(prev => prev + 50)}
                      className="w-10 h-10 rounded-full border border-[#E8EBE5] flex items-center justify-center text-[#2F5641]"
                    >
                      <Plus size={16} />
                    </button>
                  </div>
                </div>

                {/* Beverage Type Selection */}
                <div className="mb-6">
                  <label className="text-[10px] font-bold uppercase tracking-wider text-[#8B9286] mb-2 block">Bebida</label>
                  <div className="grid grid-cols-4 gap-2">
                    {BEVERAGE_TYPES.map((type) => (
                      <button
                        key={type.id}
                        onClick={() => setManualType(type.id)}
                        className={`flex flex-col items-center gap-2 p-3 rounded-2xl border transition-all ${
                          manualType === type.id 
                            ? "bg-[#FAFBF8] border-[#2F5641] ring-1 ring-[#2F5641]" 
                            : "bg-white border-[#E8EBE5] opacity-60"
                        }`}
                      >
                        <type.icon size={20} color={type.color} />
                        <span className="text-[10px] font-medium text-[#2F5641]">{type.label}</span>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Time Input */}
                <div className="mb-8">
                  <label className="text-[10px] font-bold uppercase tracking-wider text-[#8B9286] mb-2 block">Horário</label>
                  <div className="bg-[#FAFBF8] border border-[#E8EBE5] rounded-xl p-3 flex items-center gap-3">
                    <Clock size={16} className="text-[#8B9286]" />
                    <input 
                      type="time" 
                      value={manualTime}
                      onChange={(e) => setManualTime(e.target.value)}
                      className="bg-transparent text-sm font-semibold text-[#2F5641] outline-none w-full"
                    />
                  </div>
                </div>

                <div className="mb-8">
                  <button 
                    onClick={handleManualSubmit}
                    className="w-full bg-[#2F5641] text-white py-4 rounded-2xl font-semibold text-lg shadow-xl shadow-[#2F5641]/20 active:scale-[0.98] transition-all"
                  >
                    Confirmar Registro
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
