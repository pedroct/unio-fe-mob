import Layout from "@/components/layout";
import { ChevronLeft, Check, FastForward, Play, Pause, X } from "lucide-react";
import { useLocation } from "wouter";
import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";

const WORKOUT_DATA = {
  title: "Hipertrofia Superior A",
  exercises: [
    {
      id: 1,
      name: "Supino Reto com Halteres",
      sets: 4,
      reps: "8-10",
      rest: 90,
      image: "https://images.unsplash.com/photo-1571019614242-c5c5dee9f50b?q=80&w=2670&auto=format&fit=crop"
    },
    {
      id: 2,
      name: "Puxada Alta Frontal",
      sets: 4,
      reps: "10-12",
      rest: 60,
      image: "https://images.unsplash.com/photo-1598289431512-b97b0917affc?q=80&w=2674&auto=format&fit=crop"
    },
    {
      id: 3,
      name: "Desenvolvimento Militar",
      sets: 3,
      reps: "10-12",
      rest: 60,
      image: "https://images.unsplash.com/photo-1532029837206-abbe2b7a4bdd?q=80&w=2670&auto=format&fit=crop"
    }
  ]
};

export default function TrainingPlayerScreen() {
  const [, setLocation] = useLocation();
  
  // Workout State
  const [currentExerciseIndex, setCurrentExerciseIndex] = useState(0);
  const [currentSet, setCurrentSet] = useState(1);
  const [isResting, setIsResting] = useState(false);
  const [restTimeLeft, setRestTimeLeft] = useState(0);
  
  // Global Timer
  const [elapsedTime, setElapsedTime] = useState(0);
  const [isPaused, setIsPaused] = useState(false);

  const currentExercise = WORKOUT_DATA.exercises[currentExerciseIndex];
  const isLastSet = currentSet === currentExercise.sets;
  const isLastExercise = currentExerciseIndex === WORKOUT_DATA.exercises.length - 1;

  // Global Timer Effect
  useEffect(() => {
    if (isPaused) return;
    const interval = setInterval(() => setElapsedTime(t => t + 1), 1000);
    return () => clearInterval(interval);
  }, [isPaused]);

  // Rest Timer Effect
  useEffect(() => {
    if (!isResting) return;
    if (restTimeLeft <= 0) {
      setIsResting(false);
      return;
    }
    const interval = setInterval(() => setRestTimeLeft(t => t - 1), 1000);
    return () => clearInterval(interval);
  }, [isResting, restTimeLeft]);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const handleNextSet = () => {
    if (isLastSet) {
      if (isLastExercise) {
        // Finish Workout
        setLocation("/home");
      } else {
        // Next Exercise
        setCurrentExerciseIndex(prev => prev + 1);
        setCurrentSet(1);
      }
    } else {
      // Next Set
      setCurrentSet(prev => prev + 1);
    }
    
    // Start Rest
    setRestTimeLeft(currentExercise.rest);
    setIsResting(true);
  };

  return (
    <div className="bg-[#FAFBF8] min-h-screen flex flex-col relative overflow-hidden">
      {/* Top Bar */}
      <header className="px-6 pt-14 pb-4 flex items-center justify-between bg-white z-10 border-b border-[#E8EBE5]">
        <button 
          onClick={() => setLocation("/training/details")}
          className="w-10 h-10 -ml-2 flex items-center justify-center text-[#2F5641]"
        >
          <ChevronLeft size={24} />
        </button>
        
        <div className="flex flex-col items-center">
          <span className="text-[10px] font-bold text-[#8B9286] uppercase tracking-wider">Tempo Total</span>
          <span className="font-display text-xl font-semibold text-[#2F5641] tabular-nums">
            {formatTime(elapsedTime)}
          </span>
        </div>

        <button 
          onClick={() => setIsPaused(!isPaused)}
          className={`w-10 h-10 flex items-center justify-center rounded-full ${isPaused ? 'bg-[#D97952] text-white' : 'bg-[#E8EBE5] text-[#2F5641]'}`}
        >
          {isPaused ? <Play size={18} fill="currentColor" /> : <Pause size={18} fill="currentColor" />}
        </button>
      </header>

      {/* Main Content */}
      <main className="flex-1 flex flex-col relative">
        {/* Exercise Info */}
        <div className="flex-1 relative">
           <div className="absolute inset-0 top-0 h-2/3 bg-gray-100">
             <img src={currentExercise.image} alt={currentExercise.name} className="w-full h-full object-cover" />
             <div className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-[#FAFBF8]" />
           </div>

           <div className="absolute bottom-0 left-0 right-0 px-6 pb-6 pt-24 bg-gradient-to-t from-[#FAFBF8] via-[#FAFBF8] to-transparent">
              <div className="flex justify-between items-end mb-4">
                 <div>
                   <span className="text-xs font-bold text-[#C7AE6A] uppercase tracking-wider mb-1 block">
                     Exercício {currentExerciseIndex + 1}/{WORKOUT_DATA.exercises.length}
                   </span>
                   <h1 className="font-display text-2xl font-semibold text-[#2F5641] w-3/4 leading-tight">
                     {currentExercise.name}
                   </h1>
                 </div>
                 {isResting && (
                   <div className="bg-[#2F5641] text-white px-4 py-2 rounded-xl flex flex-col items-center shadow-lg animate-pulse">
                     <span className="text-[10px] uppercase font-bold tracking-wider opacity-80">Descanso</span>
                     <span className="font-mono text-lg font-bold">{formatTime(restTimeLeft)}</span>
                   </div>
                 )}
              </div>

              {/* Set Indicators */}
              <div className="flex gap-2 mb-6">
                {[...Array(currentExercise.sets)].map((_, i) => {
                  const setNum = i + 1;
                  const isCompleted = setNum < currentSet;
                  const isCurrent = setNum === currentSet;
                  
                  return (
                    <div 
                      key={i}
                      className={`flex-1 h-12 rounded-lg flex items-center justify-center border transition-all duration-300
                        ${isCompleted ? 'bg-[#2F5641] border-[#2F5641] text-white' : 
                          isCurrent ? 'bg-[#C7AE6A] border-[#C7AE6A] text-white scale-105 shadow-md' : 
                          'bg-white border-[#E8EBE5] text-[#8B9286]'}
                      `}
                    >
                      {isCompleted ? <Check size={16} /> : <span className="font-bold text-sm">{setNum}</span>}
                    </div>
                  )
                })}
              </div>

              {/* Target Reps */}
              <div className="bg-white rounded-2xl p-6 border border-[#E8EBE5] shadow-sm mb-4">
                 <div className="flex justify-between items-center text-center">
                    <div>
                      <span className="text-[10px] text-[#8B9286] uppercase tracking-wider block mb-1">Repetições</span>
                      <span className="text-2xl font-bold text-[#2F5641]">{currentExercise.reps}</span>
                    </div>
                    <div className="w-[1px] h-8 bg-[#E8EBE5]" />
                    <div>
                      <span className="text-[10px] text-[#8B9286] uppercase tracking-wider block mb-1">Carga (kg)</span>
                      <div className="flex items-center gap-2">
                        <button className="w-6 h-6 rounded-full bg-[#E8EBE5] flex items-center justify-center text-[#2F5641]">-</button>
                        <span className="text-xl font-bold text-[#2F5641]">12</span>
                        <button className="w-6 h-6 rounded-full bg-[#E8EBE5] flex items-center justify-center text-[#2F5641]">+</button>
                      </div>
                    </div>
                 </div>
              </div>
           </div>
        </div>

        {/* Controls */}
        <div className="px-6 pb-8 pt-2 bg-[#FAFBF8]">
           {isResting ? (
             <button 
               onClick={() => setIsResting(false)}
               className="w-full bg-[#D97952] text-white py-5 rounded-2xl font-semibold text-lg shadow-xl shadow-[#D97952]/25 flex items-center justify-center gap-2 active:scale-[0.98] transition-transform"
             >
               <FastForward size={24} fill="currentColor" /> Pular Descanso
             </button>
           ) : (
             <button 
               onClick={handleNextSet}
               className="w-full bg-[#2F5641] text-white py-5 rounded-2xl font-semibold text-lg shadow-xl shadow-[#2F5641]/25 flex items-center justify-center gap-2 active:scale-[0.98] transition-transform"
             >
               <Check size={24} /> 
               {isLastSet && isLastExercise ? "Finalizar Treino" : "Concluir Série"}
             </button>
           )}
        </div>
      </main>
    </div>
  );
}
