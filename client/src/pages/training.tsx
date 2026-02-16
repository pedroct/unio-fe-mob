import Layout from "@/components/layout";
import { ChevronLeft, Calendar, Play, Clock, Flame, Dumbbell, ChevronRight } from "lucide-react";
import { useLocation } from "wouter";

const PROGRAMS = [
  {
    id: 1,
    title: "Hipertrofia A",
    subtitle: "Superior & Core",
    duration: "55 min",
    level: "Intermediário",
    image: "https://images.unsplash.com/photo-1581009146145-b5ef050c2e1e?q=80&w=2670&auto=format&fit=crop",
    active: true
  },
  {
    id: 2,
    title: "Hipertrofia B",
    subtitle: "Inferior Completo",
    duration: "60 min",
    level: "Avançado",
    image: "https://images.unsplash.com/photo-1534438327276-14e5300c3a48?q=80&w=2670&auto=format&fit=crop",
    active: false
  },
  {
    id: 3,
    title: "Cardio & Abs",
    subtitle: "Queima de Gordura",
    duration: "40 min",
    level: "Iniciante",
    image: "https://images.unsplash.com/photo-1518611012118-696072aa579a?q=80&w=2670&auto=format&fit=crop",
    active: false
  }
];

export default function TrainingScreen() {
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
          <h1 className="font-display text-lg font-semibold text-[#2F5641]">Treinos</h1>
          <button className="w-10 h-10 flex items-center justify-center text-[#2F5641]">
            <Calendar size={20} />
          </button>
        </header>

        <main className="px-6 space-y-8">
          {/* Weekly Schedule */}
          <section>
            <h2 className="text-sm font-bold text-[#2F5641] uppercase tracking-wide mb-4">Sua Semana</h2>
            <div className="flex justify-between bg-white p-4 rounded-2xl border border-[#E8EBE5] shadow-sm">
              {['S', 'T', 'Q', 'Q', 'S', 'S', 'D'].map((day, i) => {
                const isToday = i === 0; // Mocking Monday as today
                const isDone = false;
                return (
                  <div key={i} className="flex flex-col items-center gap-2">
                    <span className={`text-[10px] font-bold ${isToday ? 'text-[#2F5641]' : 'text-[#8B9286]'}`}>{day}</span>
                    <div 
                      className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-semibold
                        ${isToday ? 'bg-[#2F5641] text-white shadow-md' : 'bg-[#F5F3EE] text-[#8B9286]'}
                      `}
                    >
                      {16 + i}
                    </div>
                    {isToday && <div className="w-1 h-1 rounded-full bg-[#C7AE6A] mt-1" />}
                  </div>
                )
              })}
            </div>
          </section>

          {/* Programs List */}
          <section className="space-y-4">
            <h2 className="text-sm font-bold text-[#2F5641] uppercase tracking-wide">Seus Treinos</h2>
            
            {PROGRAMS.map((program) => (
              <div 
                key={program.id}
                onClick={() => setLocation("/training/details")}
                className="group relative h-48 rounded-3xl overflow-hidden cursor-pointer active:scale-[0.98] transition-transform"
              >
                {/* Background Image */}
                <div className="absolute inset-0">
                  <img src={program.image} alt={program.title} className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105" />
                  <div className="absolute inset-0 bg-gradient-to-t from-[#2F5641] via-[#2F5641]/60 to-transparent opacity-90" />
                </div>

                {/* Content */}
                <div className="absolute inset-0 p-6 flex flex-col justify-end text-white">
                   <div className="flex items-start justify-between mb-2">
                     <div>
                       <span className="px-2 py-1 bg-[#C7AE6A] text-[10px] font-bold uppercase tracking-wider rounded text-[#2F5641] mb-2 inline-block">
                         {program.level}
                       </span>
                       <h3 className="font-display text-2xl font-semibold">{program.title}</h3>
                       <p className="text-sm opacity-90">{program.subtitle}</p>
                     </div>
                     {program.active && (
                       <div className="w-10 h-10 rounded-full bg-white/20 backdrop-blur-md flex items-center justify-center border border-white/30">
                         <Play size={20} fill="white" className="ml-1" />
                       </div>
                     )}
                   </div>

                   <div className="flex items-center gap-4 mt-2 opacity-80">
                     <div className="flex items-center gap-1.5">
                       <Clock size={14} />
                       <span className="text-xs font-medium">{program.duration}</span>
                     </div>
                     <div className="flex items-center gap-1.5">
                       <Flame size={14} />
                       <span className="text-xs font-medium">320 kcal</span>
                     </div>
                     <div className="flex items-center gap-1.5">
                       <Dumbbell size={14} />
                       <span className="text-xs font-medium">8 exercícios</span>
                     </div>
                   </div>
                </div>
              </div>
            ))}
          </section>

          {/* Create Custom Workout */}
          <button className="w-full py-4 border-2 border-dashed border-[#C7AE6A] rounded-2xl flex flex-col items-center justify-center gap-2 text-[#C7AE6A] hover:bg-[#C7AE6A]/5 transition-colors">
            <span className="font-semibold text-sm">Criar treino personalizado</span>
          </button>
        </main>
      </div>
    </Layout>
  );
}
