import Layout from "@/components/layout";
import { ChevronLeft, Plus, Pill, Clock, CheckCircle2, AlertCircle } from "lucide-react";
import { useLocation } from "wouter";
import { useState } from "react";
import { motion } from "framer-motion";

const SUPPLEMENTS = [
  {
    id: 1,
    name: "Creatina Monohidratada",
    dosage: "5g",
    timing: "Pós-treino",
    taken: true,
    timeTaken: "08:45",
    stock: "Baixo",
    color: "#2F5641"
  },
  {
    id: 2,
    name: "Multivitamínico",
    dosage: "1 cápsula",
    timing: "Almoço",
    taken: false,
    timeTaken: null,
    stock: "Bom",
    color: "#D97952"
  },
  {
    id: 3,
    name: "Omega 3",
    dosage: "2 cápsulas",
    timing: "Jantar",
    taken: false,
    timeTaken: null,
    stock: "Bom",
    color: "#3D7A8C"
  },
  {
    id: 4,
    name: "Whey Protein",
    dosage: "30g",
    timing: "Lanche da Tarde",
    taken: false,
    timeTaken: null,
    stock: "Crítico",
    color: "#C7AE6A"
  }
];

export default function SupplementsScreen() {
  const [, setLocation] = useLocation();
  const [supplements, setSupplements] = useState(SUPPLEMENTS);

  const toggleTaken = (id: number) => {
    setSupplements(prev => prev.map(s => {
      if (s.id === id) {
        return { ...s, taken: !s.taken, timeTaken: !s.taken ? new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : null };
      }
      return s;
    }));
  };

  return (
    <Layout>
      <div className="bg-[#FAFBF8] min-h-screen pb-24">
        {/* Header */}
        <header className="px-6 pt-14 pb-4 flex items-center justify-between sticky top-0 bg-[#FAFBF8]/80 backdrop-blur-md z-10">
          <button 
            onClick={() => setLocation("/home")}
            className="w-10 h-10 -ml-2 flex items-center justify-center text-[#2F5641]"
          >
            <ChevronLeft size={24} />
          </button>
          <h1 className="font-display text-lg font-semibold text-[#2F5641]">Suplementação</h1>
          <button className="w-10 h-10 flex items-center justify-center text-[#2F5641]">
            <Plus size={20} />
          </button>
        </header>

        <main className="px-6 space-y-6">
          {/* Status Card */}
          <section className="bg-[#2F5641] rounded-3xl p-6 text-white shadow-lg shadow-[#2F5641]/20">
             <div className="flex justify-between items-start mb-6">
               <div>
                 <p className="text-[10px] font-bold uppercase tracking-widest opacity-80 mb-1">Status do Dia</p>
                 <h2 className="font-display text-2xl">1 / 4 <span className="text-sm opacity-70 font-sans font-normal">Protocolos</span></h2>
               </div>
               <div className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center">
                 <Pill size={20} />
               </div>
             </div>
             
             {/* Progress Bar */}
             <div className="h-2 bg-white/20 rounded-full overflow-hidden mb-2">
               <div className="h-full bg-[#C7AE6A] rounded-full transition-all duration-500" style={{ width: '25%' }} />
             </div>
             <p className="text-[10px] text-center opacity-70">Mantenha a constância para melhores resultados.</p>
          </section>

          {/* List */}
          <div className="space-y-3">
            {supplements.map((item) => (
              <motion.div 
                key={item.id}
                layout
                className={`bg-white p-4 rounded-2xl border transition-colors ${item.taken ? 'border-[#648D4A]/30 bg-[#648D4A]/5' : 'border-[#E8EBE5]'} shadow-sm flex items-center justify-between`}
              >
                 <div className="flex items-center gap-4">
                   <div 
                     className={`w-12 h-12 rounded-xl flex items-center justify-center transition-colors ${item.taken ? 'bg-[#648D4A] text-white' : 'bg-[#F5F3EE] text-[#8B9286]'}`}
                   >
                     <Pill size={20} />
                   </div>
                   
                   <div>
                     <h3 className={`font-semibold text-sm ${item.taken ? 'text-[#648D4A] line-through' : 'text-[#2F5641]'}`}>
                       {item.name}
                     </h3>
                     <div className="flex items-center gap-2 mt-1">
                       <span className="text-xs text-[#8B9286]">{item.dosage}</span>
                       <span className="w-1 h-1 rounded-full bg-[#E8EBE5]" />
                       <span className="text-[10px] font-bold uppercase tracking-wide text-[#C7AE6A]">{item.timing}</span>
                     </div>
                   </div>
                 </div>

                 <button 
                   onClick={() => toggleTaken(item.id)}
                   className={`w-8 h-8 rounded-full flex items-center justify-center transition-all active:scale-90 ${
                     item.taken 
                       ? 'bg-[#648D4A] text-white shadow-md' 
                       : 'border-2 border-[#E8EBE5] text-[#E8EBE5] hover:border-[#C7AE6A] hover:text-[#C7AE6A]'
                   }`}
                 >
                   <CheckCircle2 size={18} />
                 </button>
              </motion.div>
            ))}
          </div>

          {/* Low Stock Warning */}
          <div className="bg-[#D97952]/10 border border-[#D97952]/20 rounded-2xl p-4 flex items-center gap-3">
            <AlertCircle size={20} className="text-[#D97952]" />
            <div>
              <p className="text-sm font-semibold text-[#D97952]">Estoque Crítico</p>
              <p className="text-xs text-[#D97952]/80">Whey Protein está acabando. Adicionar à lista?</p>
            </div>
            <button className="ml-auto text-xs font-bold bg-[#D97952] text-white px-3 py-1.5 rounded-lg">
              Repor
            </button>
          </div>
        </main>
      </div>
    </Layout>
  );
}
