import Layout from "@/components/layout";
import { ChevronLeft, Search, ScanBarcode, Plus, X } from "lucide-react";
import { useLocation } from "wouter";
import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";

const RECENT_FOODS = [
  { name: "Ovo de Galinha (Cozido)", serving: "1 unidade (50g)", kcal: 78, p: 6, c: 0.6, f: 5 },
  { name: "Pão Francês", serving: "1 unidade (50g)", kcal: 135, p: 4, c: 28, f: 0 },
  { name: "Banana Prata", serving: "1 unidade média", kcal: 68, p: 1, c: 18, f: 0 },
  { name: "Arroz Branco (Cozido)", serving: "100g", kcal: 130, p: 2, c: 28, f: 0 },
];

export default function NutritionAddScreen() {
  const [, setLocation] = useLocation();
  const [searchTerm, setSearchTerm] = useState("");
  const [showScanner, setShowScanner] = useState(false);

  return (
    <Layout>
      <div className="bg-[#FAFBF8] min-h-screen pb-24 relative">
        {/* Header */}
        <header className="px-6 pt-14 pb-4 flex items-center gap-4 sticky top-0 bg-[#FAFBF8]/80 backdrop-blur-md z-10">
          <button 
            onClick={() => setLocation("/nutrition")}
            className="w-10 h-10 -ml-2 flex items-center justify-center text-[#2F5641]"
          >
            <ChevronLeft size={24} />
          </button>
          
          <div className="flex-1 relative">
             <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-[#8B9286]" size={18} />
             <input 
               type="text" 
               placeholder="Buscar alimentos..."
               value={searchTerm}
               onChange={(e) => setSearchTerm(e.target.value)}
               className="w-full bg-white border border-[#E8EBE5] rounded-xl pl-10 pr-4 py-3 text-sm text-[#2F5641] focus:outline-none focus:border-[#C7AE6A] transition-colors"
               autoFocus
             />
          </div>

          <button 
            onClick={() => setShowScanner(true)}
            className="w-10 h-10 flex items-center justify-center bg-[#2F5641] text-white rounded-xl shadow-md active:scale-95 transition-transform"
          >
            <ScanBarcode size={20} />
          </button>
        </header>

        <main className="px-6 pt-2">
          {/* Quick Tabs */}
          <div className="flex gap-2 mb-6 overflow-x-auto pb-2 no-scrollbar">
             {["Recentes", "Favoritos", "Minhas Receitas", "Criar Novo"].map((tab, i) => (
               <button 
                 key={tab}
                 className={`px-4 py-2 rounded-full text-xs font-semibold whitespace-nowrap border ${i === 0 ? "bg-[#C7AE6A]/10 border-[#C7AE6A] text-[#AD8C48]" : "bg-white border-[#E8EBE5] text-[#8B9286]"}`}
               >
                 {tab}
               </button>
             ))}
          </div>

          {/* Results List */}
          <div className="space-y-2">
            {RECENT_FOODS.filter(f => f.name.toLowerCase().includes(searchTerm.toLowerCase())).map((food, idx) => (
              <button 
                key={idx}
                className="w-full bg-white p-4 rounded-xl border border-[#E8EBE5] shadow-sm flex items-center justify-between hover:border-[#C7AE6A] transition-colors group"
              >
                 <div className="text-left">
                   <h3 className="font-semibold text-[#2F5641]">{food.name}</h3>
                   <p className="text-xs text-[#8B9286] mt-0.5">{food.serving} • {food.kcal} kcal</p>
                   <div className="flex gap-2 mt-2">
                      <span className="text-[10px] px-1.5 py-0.5 bg-[#648D4A]/10 text-[#648D4A] rounded">P: {food.p}g</span>
                      <span className="text-[10px] px-1.5 py-0.5 bg-[#D97952]/10 text-[#D97952] rounded">C: {food.c}g</span>
                      <span className="text-[10px] px-1.5 py-0.5 bg-[#C7AE6A]/10 text-[#C7AE6A] rounded">G: {food.f}g</span>
                   </div>
                 </div>
                 <div className="w-8 h-8 rounded-full bg-[#FAFBF8] flex items-center justify-center text-[#C7AE6A] group-hover:bg-[#C7AE6A] group-hover:text-white transition-colors">
                    <Plus size={18} />
                 </div>
              </button>
            ))}
          </div>
        </main>

        {/* Mock Scanner Overlay */}
        <AnimatePresence>
          {showScanner && (
            <motion.div 
              initial={{ opacity: 0, y: "100%" }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: "100%" }}
              className="fixed inset-0 z-50 bg-black flex flex-col"
            >
              <div className="flex justify-between items-center p-6 pt-14 bg-gradient-to-b from-black/50 to-transparent absolute top-0 left-0 right-0 z-10">
                 <button onClick={() => setShowScanner(false)} className="text-white">
                   <X size={28} />
                 </button>
                 <span className="text-white font-semibold">Escanear Código</span>
                 <div className="w-7" />
              </div>
              
              <div className="flex-1 relative flex items-center justify-center">
                 {/* Camera Mock */}
                 <div className="absolute inset-0 bg-[#1a1a1a]">
                    <div className="w-full h-full opacity-30 bg-[url('https://images.unsplash.com/photo-1542838132-92c53300491e?q=80&w=2574&auto=format&fit=crop')] bg-cover bg-center" />
                 </div>
                 
                 {/* Scanning Frame */}
                 <div className="relative w-64 h-64 border-2 border-white/50 rounded-3xl overflow-hidden">
                    <div className="absolute inset-0 border-2 border-[#C7AE6A] rounded-3xl animate-pulse" />
                    <motion.div 
                      className="absolute left-0 right-0 h-0.5 bg-[#C7AE6A] shadow-[0_0_20px_#C7AE6A]"
                      animate={{ top: ["10%", "90%", "10%"] }}
                      transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
                    />
                 </div>
                 
                 <p className="absolute bottom-32 text-white/80 text-sm font-medium">
                   Aponte para o código de barras
                 </p>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </Layout>
  );
}
