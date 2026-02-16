import Layout from "@/components/layout";
import { ChevronLeft, Calendar, Search, ScanBarcode, Plus, Flame, ChevronRight } from "lucide-react";
import { useLocation } from "wouter";
import { useState } from "react";
import { motion } from "framer-motion";

// Mock Data
const MEALS = [
  {
    id: "breakfast",
    name: "Café da Manhã",
    calories: 420,
    items: [
      { name: "Ovos Mexidos", portion: "2 grandes", kcal: 180 },
      { name: "Pão Integral", portion: "2 fatias", kcal: 140 },
      { name: "Café Preto", portion: "200ml", kcal: 5 },
      { name: "Mamão Papaia", portion: "1/2 unidade", kcal: 95 }
    ]
  },
  {
    id: "lunch",
    name: "Almoço",
    calories: 650,
    items: [
      { name: "Frango Grelhado", portion: "150g", kcal: 240 },
      { name: "Arroz Branco", portion: "100g", kcal: 130 },
      { name: "Feijão Carioca", portion: "1 concha", kcal: 110 },
      { name: "Salada Verde", portion: "à vontade", kcal: 20 },
      { name: "Azeite de Oliva", portion: "1 col. sopa", kcal: 120 }
    ]
  },
  {
    id: "snack",
    name: "Lanche da Tarde",
    calories: 0,
    items: []
  },
  {
    id: "dinner",
    name: "Jantar",
    calories: 0,
    items: []
  }
];

export default function NutritionScreen() {
  const [, setLocation] = useLocation();

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
          <h1 className="font-display text-lg font-semibold text-[#2F5641]">Diário Alimentar</h1>
          <button className="w-10 h-10 flex items-center justify-center text-[#2F5641]">
            <Calendar size={20} />
          </button>
        </header>

        <main className="px-6 space-y-6">
          {/* Summary Card */}
          <section className="bg-[#2F5641] rounded-3xl p-6 text-white shadow-lg shadow-[#2F5641]/20">
             <div className="flex justify-between items-end mb-6">
               <div>
                 <p className="text-xs font-medium opacity-80 uppercase tracking-wider mb-1">Calorias Disponíveis</p>
                 <h2 className="font-display text-4xl font-semibold">780 <span className="text-lg font-sans font-medium opacity-60">kcal</span></h2>
               </div>
               <div className="text-right">
                  <p className="text-xs font-medium opacity-80 uppercase tracking-wider mb-1">Consumido</p>
                  <p className="font-semibold text-lg">1.420 / 2.200</p>
               </div>
             </div>

             {/* Macro Bars */}
             <div className="space-y-4">
               {/* Protein */}
               <div>
                 <div className="flex justify-between text-xs font-medium mb-1.5">
                   <span className="text-[#EFECB6]">Proteína</span>
                   <span>92g / 160g</span>
                 </div>
                 <div className="h-2 bg-white/20 rounded-full overflow-hidden">
                   <div className="h-full bg-[#EFECB6] rounded-full" style={{ width: '57%' }} />
                 </div>
               </div>
               
               {/* Carbs */}
               <div>
                 <div className="flex justify-between text-xs font-medium mb-1.5">
                   <span className="text-[#D97952]">Carboidratos</span>
                   <span>120g / 200g</span>
                 </div>
                 <div className="h-2 bg-white/20 rounded-full overflow-hidden">
                   <div className="h-full bg-[#D97952] rounded-full" style={{ width: '60%' }} />
                 </div>
               </div>

               {/* Fat */}
               <div>
                 <div className="flex justify-between text-xs font-medium mb-1.5">
                   <span className="text-[#C7AE6A]">Gorduras</span>
                   <span>45g / 70g</span>
                 </div>
                 <div className="h-2 bg-white/20 rounded-full overflow-hidden">
                   <div className="h-full bg-[#C7AE6A] rounded-full" style={{ width: '64%' }} />
                 </div>
               </div>
             </div>
          </section>

          {/* Meals List */}
          <div className="space-y-4">
             {MEALS.map((meal) => (
               <div key={meal.id} className="bg-white rounded-2xl border border-[#E8EBE5] overflow-hidden shadow-sm">
                 {/* Meal Header */}
                 <div className="p-4 flex items-center justify-between bg-[#F5F3EE]/50">
                    <h3 className="font-semibold text-[#2F5641]">{meal.name}</h3>
                    <div className="flex items-center gap-3">
                       <span className="text-sm font-medium text-[#8B9286]">{meal.calories} kcal</span>
                       <button 
                         onClick={() => setLocation("/nutrition/add")}
                         className="w-6 h-6 rounded-full bg-[#C7AE6A] flex items-center justify-center text-white hover:bg-[#AD8C48] transition-colors"
                       >
                         <Plus size={14} strokeWidth={3} />
                       </button>
                    </div>
                 </div>

                 {/* Meal Items */}
                 {meal.items.length > 0 ? (
                   <div className="px-4 pb-4 pt-1">
                     {meal.items.map((item, idx) => (
                       <div key={idx} className="flex justify-between py-3 border-b border-[#E8EBE5] last:border-0">
                         <div>
                           <p className="text-sm font-medium text-[#5F6B5A]">{item.name}</p>
                           <p className="text-xs text-[#8B9286]">{item.portion}</p>
                         </div>
                         <span className="text-sm font-semibold text-[#2F5641]">{item.kcal}</span>
                       </div>
                     ))}
                   </div>
                 ) : (
                   <div className="px-4 py-6 text-center">
                     <p className="text-xs text-[#8B9286] mb-3">Nenhum alimento registrado</p>
                     <button 
                       onClick={() => setLocation("/nutrition/add")}
                       className="text-xs font-semibold text-[#C7AE6A] uppercase tracking-wider hover:underline"
                     >
                       Adicionar Alimentos
                     </button>
                   </div>
                 )}
               </div>
             ))}
          </div>

          {/* Create Meal Button (if needed) */}
          <button className="w-full py-4 border-2 border-dashed border-[#C7AE6A] rounded-2xl flex flex-col items-center justify-center gap-2 text-[#C7AE6A] hover:bg-[#C7AE6A]/5 transition-colors">
            <span className="font-semibold text-sm">Criar nova refeição</span>
          </button>

        </main>
      </div>
    </Layout>
  );
}
