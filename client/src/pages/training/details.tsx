import Layout from "@/components/layout";
import { ChevronLeft, Clock, Flame, Dumbbell, Play, CheckCircle2, MoreVertical } from "lucide-react";
import { useLocation } from "wouter";
import { motion } from "framer-motion";

const EXERCISES = [
  {
    id: 1,
    name: "Supino Reto com Halteres",
    sets: 4,
    reps: "8-10",
    rest: "90s",
    image: "https://images.unsplash.com/photo-1571019614242-c5c5dee9f50b?q=80&w=2670&auto=format&fit=crop"
  },
  {
    id: 2,
    name: "Puxada Alta Frontal",
    sets: 4,
    reps: "10-12",
    rest: "60s",
    image: "https://images.unsplash.com/photo-1598289431512-b97b0917affc?q=80&w=2674&auto=format&fit=crop"
  },
  {
    id: 3,
    name: "Desenvolvimento Militar",
    sets: 3,
    reps: "10-12",
    rest: "60s",
    image: "https://images.unsplash.com/photo-1541534741688-6078c6bfb5c5?q=80&w=2670&auto=format&fit=crop"
  },
  {
    id: 4,
    name: "Elevação Lateral",
    sets: 3,
    reps: "12-15",
    rest: "45s",
    image: "https://images.unsplash.com/photo-1541534741688-6078c6bfb5c5?q=80&w=2669&auto=format&fit=crop"
  },
  {
    id: 5,
    name: "Tríceps Corda",
    sets: 3,
    reps: "12-15",
    rest: "45s",
    image: "https://images.unsplash.com/photo-1581009146145-b5ef050c2e1e?q=80&w=2670&auto=format&fit=crop"
  }
];

export default function TrainingDetailsScreen() {
  const [, setLocation] = useLocation();

  return (
    <Layout>
      <div className="bg-[#FAFBF8] min-h-screen pb-32">
        {/* Hero Header */}
        <div className="relative h-[300px]">
           <div className="absolute inset-0">
             <img 
               src="https://images.unsplash.com/photo-1581009146145-b5ef050c2e1e?q=80&w=2670&auto=format&fit=crop" 
               alt="Training Header" 
               className="w-full h-full object-cover"
             />
             <div className="absolute inset-0 bg-gradient-to-t from-[#FAFBF8] via-[#2F5641]/40 to-transparent" />
             <div className="absolute inset-0 bg-black/20" />
           </div>

           {/* Navbar Overlay */}
           <header className="absolute top-0 left-0 right-0 px-6 pt-14 flex items-center justify-between z-10 text-white">
             <button 
               onClick={() => setLocation("/training")}
               className="w-10 h-10 -ml-2 flex items-center justify-center bg-white/20 backdrop-blur-md rounded-full"
             >
               <ChevronLeft size={24} />
             </button>
             <button className="w-10 h-10 flex items-center justify-center bg-white/20 backdrop-blur-md rounded-full">
               <MoreVertical size={20} />
             </button>
           </header>

           {/* Header Content */}
           <div className="absolute bottom-0 left-0 right-0 px-6 pb-8">
              <span className="px-2 py-1 bg-[#C7AE6A] text-[10px] font-bold uppercase tracking-wider rounded text-[#2F5641] mb-3 inline-block">
                Intermediário
              </span>
              <h1 className="font-display text-3xl font-semibold text-[#2F5641] mb-2">Hipertrofia Superior A</h1>
              
              <div className="flex items-center gap-6 mt-4">
                <div className="flex items-center gap-2">
                  <div className="p-1.5 bg-[#2F5641]/10 rounded-full text-[#2F5641]">
                    <Clock size={16} />
                  </div>
                  <span className="text-sm font-semibold text-[#5F6B5A]">55 min</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="p-1.5 bg-[#D97952]/10 rounded-full text-[#D97952]">
                    <Flame size={16} />
                  </div>
                  <span className="text-sm font-semibold text-[#5F6B5A]">320 kcal</span>
                </div>
              </div>
           </div>
        </div>

        <main className="px-6 space-y-6 mt-2">
           <div className="flex items-center justify-between">
             <h2 className="text-sm font-bold text-[#2F5641] uppercase tracking-wide">Exercícios (8)</h2>
             <button className="text-xs font-semibold text-[#C7AE6A] hover:underline">Editar Ordem</button>
           </div>

           <div className="space-y-4">
              {EXERCISES.map((exercise, idx) => (
                <div key={exercise.id} className="bg-white p-4 rounded-2xl border border-[#E8EBE5] shadow-sm flex items-center gap-4">
                   <div className="w-16 h-16 rounded-xl bg-[#F5F3EE] overflow-hidden flex-shrink-0">
                     <img src={exercise.image} alt={exercise.name} className="w-full h-full object-cover" />
                   </div>
                   
                   <div className="flex-1">
                     <h3 className="font-semibold text-[#2F5641] text-sm mb-1 line-clamp-1">{exercise.name}</h3>
                     <div className="flex items-center gap-3 text-xs text-[#8B9286]">
                       <span>{exercise.sets} séries</span>
                       <span className="w-1 h-1 rounded-full bg-[#E8EBE5]" />
                       <span>{exercise.reps} reps</span>
                       <span className="w-1 h-1 rounded-full bg-[#E8EBE5]" />
                       <span>{exercise.rest} descanso</span>
                     </div>
                   </div>

                   <button className="w-8 h-8 flex items-center justify-center text-[#E8EBE5] hover:text-[#C7AE6A]">
                     <CheckCircle2 size={24} />
                   </button>
                </div>
              ))}
           </div>
        </main>

        {/* Start Workout FAB */}
        <div className="fixed bottom-[84px] left-0 right-0 p-6 bg-gradient-to-t from-[#FAFBF8] via-[#FAFBF8] to-transparent z-40 max-w-[430px] mx-auto">
          <button 
            onClick={() => setLocation("/training/player")}
            className="w-full bg-[#2F5641] text-white py-4 rounded-2xl font-semibold text-lg shadow-xl shadow-[#2F5641]/25 flex items-center justify-center gap-3 active:scale-[0.98] transition-transform"
          >
             <Play size={20} fill="white" /> Iniciar Treino
          </button>
        </div>
      </div>
    </Layout>
  );
}
