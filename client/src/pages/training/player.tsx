import { ChevronLeft, Check, FastForward, Play, Pause, Trophy, Dumbbell, Loader2, AlertCircle, X } from "lucide-react";
import { useLocation, useParams } from "wouter";
import { useState, useEffect, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/lib/auth";
import { apiFetch } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";

interface PlanoItem {
  id: number;
  plano_id: number;
  exercicio_id: number;
  exercicio_nome: string;
  ordem: number;
  series: number;
  repeticoes: number;
  descanso_segundos: number;
  carga_kg: string;
  observacoes: string;
}

interface Plano {
  id: number;
  nome: string;
  objetivo: string;
  ativo: boolean;
  atualizado_em: string;
  itens: PlanoItem[];
}

export default function TrainingPlayerScreen() {
  const [, setLocation] = useLocation();
  const params = useParams<{ planoId: string }>();
  const planoId = Number(params.planoId);
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const { toast } = useToast();

  const [currentExerciseIndex, setCurrentExerciseIndex] = useState(0);
  const [currentSet, setCurrentSet] = useState(1);
  const [isResting, setIsResting] = useState(false);
  const [restTimeLeft, setRestTimeLeft] = useState(0);
  const [elapsedTime, setElapsedTime] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const [isCompleted, setIsCompleted] = useState(false);
  const [showQuitConfirm, setShowQuitConfirm] = useState(false);
  const [sessionId, setSessionId] = useState<number | null>(null);
  const sessionCreated = useRef(false);

  const {
    data: plano,
    isLoading,
    isError,
  } = useQuery<Plano>({
    queryKey: ["treino", "plano", planoId],
    queryFn: async () => {
      const res = await apiFetch(`/api/treino/planos/${planoId}`);
      if (!res.ok) throw new Error("Erro ao buscar plano");
      return res.json();
    },
    enabled: !!user && !isNaN(planoId) && planoId > 0,
  });

  const createSessionMutation = useMutation({
    mutationFn: async () => {
      const res = await apiFetch("/api/treino/sessoes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          plano_id: planoId,
          iniciado_em: new Date().toISOString(),
          concluida: false,
        }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw { status: res.status, ...err };
      }
      return res.json();
    },
    onSuccess: (data) => {
      setSessionId(data.id);
    },
    onError: (err: any) => {
      if (err?.status === 403) {
        toast({ title: "Acesso negado", variant: "destructive" });
      } else if (err?.errors?.length) {
        toast({ title: "Erro de validação", description: err.errors.map((e: any) => e.message).join("; "), variant: "destructive" });
      } else {
        toast({ title: "Erro", description: "Não foi possível iniciar a sessão.", variant: "destructive" });
      }
    },
  });

  const completeSessionMutation = useMutation({
    mutationFn: async (duration: number) => {
      if (!sessionId) return;
      const res = await apiFetch(`/api/treino/sessoes/${sessionId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          concluida: true,
          duracao_min: Math.round(duration / 60),
          finalizado_em: new Date().toISOString(),
        }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw { status: res.status, ...err };
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["treino", "sessoes"] });
    },
    onError: (err: any) => {
      if (err?.status === 404) {
        toast({ title: "Sessão não encontrada", variant: "destructive" });
      } else {
        toast({ title: "Erro", description: "Não foi possível salvar a sessão.", variant: "destructive" });
      }
    },
  });

  useEffect(() => {
    if (plano && plano.itens?.length > 0 && !sessionCreated.current) {
      sessionCreated.current = true;
      createSessionMutation.mutate();
    }
  }, [plano]);

  useEffect(() => {
    if (isPaused || isCompleted) return;
    const interval = setInterval(() => setElapsedTime((t) => t + 1), 1000);
    return () => clearInterval(interval);
  }, [isPaused, isCompleted]);

  useEffect(() => {
    if (!isResting || isPaused) return;
    if (restTimeLeft <= 0) {
      setIsResting(false);
      return;
    }
    const interval = setInterval(() => setRestTimeLeft((t) => t - 1), 1000);
    return () => clearInterval(interval);
  }, [isResting, restTimeLeft, isPaused]);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  };

  const formatCarga = (carga: string) => {
    if (!carga || carga === "0" || carga === "0.0" || carga === "0.00") return "—";
    const num = parseFloat(carga);
    if (isNaN(num)) return "—";
    return `${num % 1 === 0 ? num.toFixed(0) : num.toFixed(1)}`;
  };

  const sortedItems = plano?.itens?.slice().sort((a, b) => a.ordem - b.ordem) || [];
  const currentExercise = sortedItems[currentExerciseIndex];
  const isLastSet = currentExercise ? currentSet === currentExercise.series : false;
  const isLastExercise = currentExerciseIndex === sortedItems.length - 1;

  const handleCompleteSet = useCallback(() => {
    if (!currentExercise) return;

    if (isLastSet && isLastExercise) {
      setIsCompleted(true);
      completeSessionMutation.mutate(elapsedTime);
      return;
    }

    if (isLastSet) {
      setCurrentExerciseIndex((prev) => prev + 1);
      setCurrentSet(1);
    } else {
      setCurrentSet((prev) => prev + 1);
    }

    setRestTimeLeft(currentExercise.descanso_segundos);
    setIsResting(true);
  }, [currentExercise, isLastSet, isLastExercise, elapsedTime]);

  const handleSkipRest = () => {
    setIsResting(false);
    setRestTimeLeft(0);
  };

  const handleQuit = () => {
    setShowQuitConfirm(false);
    setLocation("/training");
  };

  if (isNaN(planoId) || planoId <= 0) {
    return (
      <div className="bg-[#FAFBF8] min-h-screen flex flex-col items-center justify-center px-6 gap-4 max-w-[430px] mx-auto" data-testid="error-invalid-plan">
        <AlertCircle className="w-12 h-12 text-[#D97952]" />
        <p className="text-sm text-[#D97952] text-center font-medium">Plano inválido.</p>
        <button
          onClick={() => setLocation("/training")}
          className="bg-[#2F5641] text-white px-6 py-3 rounded-xl text-sm font-semibold"
          data-testid="button-back-error"
        >
          Voltar
        </button>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="bg-[#FAFBF8] min-h-screen flex flex-col items-center justify-center gap-3 max-w-[430px] mx-auto" data-testid="loading-player">
        <Loader2 className="w-8 h-8 animate-spin text-[#2F5641]" />
        <p className="text-sm text-[#8B9286]">Carregando treino...</p>
      </div>
    );
  }

  if (isError || !plano) {
    return (
      <div className="bg-[#FAFBF8] min-h-screen flex flex-col items-center justify-center px-6 gap-4 max-w-[430px] mx-auto" data-testid="error-plan-fetch">
        <AlertCircle className="w-12 h-12 text-[#D97952]" />
        <p className="text-sm text-[#D97952] text-center font-medium">Não foi possível carregar o plano.</p>
        <button
          onClick={() => setLocation("/training")}
          className="bg-[#2F5641] text-white px-6 py-3 rounded-xl text-sm font-semibold"
          data-testid="button-back-error"
        >
          Voltar
        </button>
      </div>
    );
  }

  if (!sortedItems.length) {
    return (
      <div className="bg-[#FAFBF8] min-h-screen flex flex-col items-center justify-center px-6 gap-4 max-w-[430px] mx-auto" data-testid="empty-plan">
        <Dumbbell className="w-12 h-12 text-[#E8EBE5]" />
        <p className="text-sm text-[#8B9286] text-center font-medium">Plano sem exercícios</p>
        <p className="text-xs text-[#8B9286] text-center">Adicione exercícios ao plano antes de iniciar.</p>
        <button
          onClick={() => setLocation("/training")}
          className="bg-[#2F5641] text-white px-6 py-3 rounded-xl text-sm font-semibold"
          data-testid="button-back-empty"
        >
          Voltar
        </button>
      </div>
    );
  }

  if (isCompleted) {
    return (
      <div className="bg-[#FAFBF8] min-h-screen flex flex-col max-w-[430px] mx-auto" data-testid="screen-completed">
        <div className="flex-1 flex flex-col items-center justify-center px-6 gap-6">
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ type: "spring", damping: 12, stiffness: 200 }}
            className="w-24 h-24 rounded-full bg-[#2F5641] flex items-center justify-center shadow-xl shadow-[#2F5641]/25"
          >
            <Trophy className="w-12 h-12 text-[#C7AE6A]" />
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="text-center"
          >
            <h1 className="font-display text-2xl font-bold text-[#2F5641] mb-2" data-testid="text-completed-title">
              Treino Concluído!
            </h1>
            <p className="text-sm text-[#8B9286]">{plano.nome}</p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 }}
            className="bg-white rounded-2xl border border-[#E8EBE5] p-6 w-full"
          >
            <div className="flex justify-around text-center">
              <div>
                <span className="text-[10px] text-[#8B9286] uppercase tracking-wider block mb-1">Duração</span>
                <span className="text-2xl font-bold text-[#2F5641] tabular-nums" data-testid="text-completed-duration">
                  {formatTime(elapsedTime)}
                </span>
              </div>
              <div className="w-[1px] bg-[#E8EBE5]" />
              <div>
                <span className="text-[10px] text-[#8B9286] uppercase tracking-wider block mb-1">Exercícios</span>
                <span className="text-2xl font-bold text-[#2F5641]" data-testid="text-completed-exercises">
                  {sortedItems.length}
                </span>
              </div>
            </div>
          </motion.div>

          <motion.button
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.7 }}
            onClick={() => setLocation("/training")}
            className="w-full bg-[#2F5641] text-white py-4 rounded-2xl font-semibold text-lg shadow-xl shadow-[#2F5641]/25 active:scale-[0.98] transition-transform"
            data-testid="button-voltar-completed"
          >
            Voltar
          </motion.button>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-[#FAFBF8] min-h-screen flex flex-col relative overflow-hidden max-w-[430px] mx-auto" data-testid="screen-player">
      <header className="px-6 pt-14 pb-4 flex items-center justify-between bg-white z-10 border-b border-[#E8EBE5]">
        <button
          onClick={() => setShowQuitConfirm(true)}
          className="w-10 h-10 -ml-2 flex items-center justify-center text-[#2F5641]"
          data-testid="button-quit"
        >
          <ChevronLeft size={24} />
        </button>

        <div className="flex flex-col items-center">
          <span className="text-[10px] font-bold text-[#8B9286] uppercase tracking-wider">Tempo Total</span>
          <span className="font-display text-xl font-semibold text-[#2F5641] tabular-nums" data-testid="text-elapsed-time">
            {formatTime(elapsedTime)}
          </span>
        </div>

        <button
          onClick={() => setIsPaused(!isPaused)}
          className={`w-10 h-10 flex items-center justify-center rounded-full ${isPaused ? "bg-[#D97952] text-white" : "bg-[#E8EBE5] text-[#2F5641]"}`}
          data-testid="button-pause-resume"
        >
          {isPaused ? <Play size={18} fill="currentColor" /> : <Pause size={18} fill="currentColor" />}
        </button>
      </header>

      <main className="flex-1 flex flex-col px-6 pt-6 pb-8">
        <div className="flex-1 flex flex-col">
          <div className="mb-4">
            <span className="text-xs font-bold text-[#C7AE6A] uppercase tracking-wider mb-1 block" data-testid="text-exercise-counter">
              Exercício {currentExerciseIndex + 1}/{sortedItems.length}
            </span>
            <h1 className="font-display text-2xl font-semibold text-[#2F5641] leading-tight" data-testid="text-exercise-name">
              {currentExercise.exercicio_nome}
            </h1>
          </div>

          <div className="flex gap-2 mb-6" data-testid="set-indicators">
            {[...Array(currentExercise.series)].map((_, i) => {
              const setNum = i + 1;
              const isCompletedSet = setNum < currentSet;
              const isCurrent = setNum === currentSet;

              return (
                <motion.div
                  key={i}
                  layout
                  className={`flex-1 h-12 rounded-lg flex items-center justify-center border transition-all duration-300
                    ${isCompletedSet ? "bg-[#2F5641] border-[#2F5641] text-white" : isCurrent ? "bg-[#C7AE6A] border-[#C7AE6A] text-white scale-105 shadow-md" : "bg-white border-[#E8EBE5] text-[#8B9286]"}
                  `}
                  data-testid={`set-indicator-${setNum}`}
                >
                  {isCompletedSet ? <Check size={16} /> : <span className="font-bold text-sm">{setNum}</span>}
                </motion.div>
              );
            })}
          </div>

          <div className="bg-white rounded-2xl p-6 border border-[#E8EBE5] shadow-sm mb-6" data-testid="card-target-info">
            <div className="flex justify-between items-center text-center">
              <div>
                <span className="text-[10px] text-[#8B9286] uppercase tracking-wider block mb-1">Repetições</span>
                <span className="text-2xl font-bold text-[#2F5641]" data-testid="text-repeticoes">
                  {currentExercise.repeticoes}
                </span>
              </div>
              <div className="w-[1px] h-8 bg-[#E8EBE5]" />
              <div>
                <span className="text-[10px] text-[#8B9286] uppercase tracking-wider block mb-1">Carga (kg)</span>
                <span className="text-2xl font-bold text-[#2F5641]" data-testid="text-carga">
                  {formatCarga(currentExercise.carga_kg)}
                </span>
              </div>
              <div className="w-[1px] h-8 bg-[#E8EBE5]" />
              <div>
                <span className="text-[10px] text-[#8B9286] uppercase tracking-wider block mb-1">Descanso</span>
                <span className="text-2xl font-bold text-[#2F5641]" data-testid="text-descanso">
                  {currentExercise.descanso_segundos}s
                </span>
              </div>
            </div>
          </div>

          <AnimatePresence>
            {isResting && (
              <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9 }}
                className="bg-[#2F5641] rounded-2xl p-8 text-center mb-6 shadow-lg"
                data-testid="rest-timer"
              >
                <span className="text-[10px] uppercase font-bold tracking-wider text-white/70 block mb-2">Descanso</span>
                <span className="font-display text-5xl font-bold text-white tabular-nums block mb-1" data-testid="text-rest-countdown">
                  {formatTime(restTimeLeft)}
                </span>
              </motion.div>
            )}
          </AnimatePresence>

          {currentExercise.observacoes && (
            <div className="bg-[#C7AE6A]/10 rounded-xl p-4 mb-6 border border-[#C7AE6A]/20">
              <p className="text-xs text-[#2F5641] italic" data-testid="text-observacoes">
                {currentExercise.observacoes}
              </p>
            </div>
          )}
        </div>

        <div className="pt-2">
          {isResting ? (
            <button
              onClick={handleSkipRest}
              className="w-full bg-[#D97952] text-white py-5 rounded-2xl font-semibold text-lg shadow-xl shadow-[#D97952]/25 flex items-center justify-center gap-2 active:scale-[0.98] transition-transform"
              data-testid="button-skip-rest"
            >
              <FastForward size={24} fill="currentColor" /> Pular Descanso
            </button>
          ) : (
            <button
              onClick={handleCompleteSet}
              className="w-full bg-[#2F5641] text-white py-5 rounded-2xl font-semibold text-lg shadow-xl shadow-[#2F5641]/25 flex items-center justify-center gap-2 active:scale-[0.98] transition-transform"
              data-testid="button-complete-set"
            >
              <Check size={24} />
              {isLastSet && isLastExercise ? "Finalizar Treino" : "Concluir Série"}
            </button>
          )}
        </div>
      </main>

      <AnimatePresence>
        {showQuitConfirm && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/40 backdrop-blur-sm z-40"
              onClick={() => setShowQuitConfirm(false)}
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="fixed top-1/2 left-6 right-6 -translate-y-1/2 bg-white rounded-3xl p-6 z-50 max-w-[380px] mx-auto shadow-2xl"
              data-testid="modal-quit-confirm"
            >
              <button
                onClick={() => setShowQuitConfirm(false)}
                className="absolute top-4 right-4 w-8 h-8 flex items-center justify-center text-[#8B9286]"
                data-testid="button-close-quit"
              >
                <X size={18} />
              </button>
              <h2 className="font-display text-lg font-bold text-[#2F5641] mb-2 text-center">Tem certeza?</h2>
              <p className="text-sm text-[#8B9286] text-center mb-6">
                Seu progresso neste treino será perdido.
              </p>
              <div className="flex gap-3">
                <button
                  onClick={() => setShowQuitConfirm(false)}
                  className="flex-1 border border-[#E8EBE5] text-[#8B9286] py-3 rounded-xl font-semibold text-sm"
                  data-testid="button-cancel-quit"
                >
                  Continuar
                </button>
                <button
                  onClick={handleQuit}
                  className="flex-1 bg-[#D97952] text-white py-3 rounded-xl font-semibold text-sm"
                  data-testid="button-confirm-quit"
                >
                  Sair
                </button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
