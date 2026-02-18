import Layout from "@/components/layout";
import { ChevronLeft, Dumbbell, Plus, Trash2, Loader2, AlertCircle, X, CheckCircle, History, BookOpen } from "lucide-react";
import { useLocation } from "wouter";
import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/lib/auth";
import { apiFetch } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";

interface Plano {
  id: number;
  nome: string;
  objetivo: string;
  ativo: boolean;
  atualizado_em: string;
}

interface PlanosResponse {
  itens: Plano[];
  total_itens: number;
}

interface CreatePlanoResponse {
  id: number;
  nome: string;
  objetivo: string;
  ativo: boolean;
  atualizado_em: string;
  mensagem: string;
}

interface DeletePlanoResponse {
  id: number;
  removido: boolean;
  mensagem: string;
}

interface ApiError422 {
  errors: { field: string; message: string }[];
}

function isApiError422(err: unknown): err is ApiError422 {
  return (
    typeof err === "object" &&
    err !== null &&
    "errors" in err &&
    Array.isArray((err as ApiError422).errors)
  );
}

function formatCreatedDate(dateStr: string): string {
  const date = new Date(dateStr);
  const now = new Date();
  const dateDay = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  const nowDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const diffDays = Math.round((nowDay.getTime() - dateDay.getTime()) / 86400000);

  if (diffDays === 0) return "Criado hoje";
  if (diffDays === 1) return "Criado ontem";
  return `Criado em ${date.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric" })}`;
}

export default function TrainingScreen() {
  const [, setLocation] = useLocation();
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const { toast } = useToast();
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState<number | null>(null);
  const [nome, setNome] = useState("");
  const [objetivo, setObjetivo] = useState("");
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  const { data: planosData, isLoading, isError, refetch } = useQuery<PlanosResponse>({
    queryKey: ["treino", "planos"],
    queryFn: async () => {
      const res = await apiFetch("/api/treino/planos");
      if (!res.ok) throw new Error("Erro ao buscar planos");
      return res.json();
    },
    enabled: !!user,
  });

  const createMutation = useMutation<CreatePlanoResponse, unknown, { nome: string; objetivo?: string }>({
    mutationFn: async (payload) => {
      const res = await apiFetch("/api/treino/planos", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const err = await res.json();
        throw err;
      }
      return res.json();
    },
    onSuccess: (data) => {
      setFieldErrors({});
      queryClient.invalidateQueries({ queryKey: ["treino", "planos"] });
      setShowCreateModal(false);
      setNome("");
      setObjetivo("");
      toast({ title: "Plano criado", description: data.mensagem || "Seu plano foi criado com sucesso." });
    },
    onError: (err) => {
      if (isApiError422(err)) {
        const mapped: Record<string, string> = {};
        err.errors.forEach((e) => { mapped[e.field] = e.message; });
        setFieldErrors(mapped);
      } else {
        toast({ title: "Erro", description: "Não foi possível criar o plano. Tente novamente.", variant: "destructive" });
      }
    },
  });

  const deleteMutation = useMutation<DeletePlanoResponse, unknown, number>({
    mutationFn: async (planoId) => {
      const res = await apiFetch(`/api/treino/planos/${planoId}`, { method: "DELETE" });
      if (!res.ok) {
        const err = await res.json();
        throw { status: res.status, ...err };
      }
      return res.json();
    },
    onSuccess: (data) => {
      queryClient.setQueryData<PlanosResponse>(
        ["treino", "planos"],
        (old) => {
          if (!old) return { itens: [], total_itens: 0 };
          return {
            itens: old.itens.filter((p) => p.id !== data.id),
            total_itens: Math.max(0, old.total_itens - 1),
          };
        }
      );
      setShowDeleteConfirm(null);
      toast({ title: "Plano removido", description: data.mensagem || "Plano removido com sucesso." });
    },
    onError: (err: any) => {
      setShowDeleteConfirm(null);
      if (err?.status === 404) {
        toast({ title: "Não encontrado", description: "Este plano já foi removido.", variant: "destructive" });
        queryClient.invalidateQueries({ queryKey: ["treino", "planos"] });
      } else {
        toast({ title: "Erro", description: "Não foi possível remover o plano. Tente novamente.", variant: "destructive" });
      }
    },
  });

  const handleCreateSubmit = () => {
    setFieldErrors({});
    if (!nome.trim()) {
      setFieldErrors({ nome: "Nome é obrigatório." });
      return;
    }
    const payload: { nome: string; objetivo?: string } = { nome: nome.trim() };
    if (objetivo.trim()) payload.objetivo = objetivo.trim();
    createMutation.mutate(payload);
  };

  const handleDeleteConfirm = (planoId: number) => {
    deleteMutation.mutate(planoId);
  };

  const planos = planosData?.itens ?? [];

  if (isError) {
    return (
      <Layout>
        <div className="min-h-screen flex flex-col items-center justify-center px-6 gap-4" data-testid="error-training">
          <AlertCircle className="w-12 h-12 text-[#D97952]" />
          <p className="text-sm text-[#D97952] text-center">Não foi possível carregar seus treinos.</p>
          <button
            onClick={() => refetch()}
            className="bg-[#2F5641] text-white px-6 py-2 rounded-xl text-sm font-medium"
            data-testid="button-retry"
          >
            Tentar novamente
          </button>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="bg-[#FAFBF8] min-h-screen pb-24 flex flex-col relative">
        <header className="px-6 pt-14 pb-4 flex items-center justify-between sticky top-0 bg-[#FAFBF8]/95 backdrop-blur-sm z-10">
          <button
            data-testid="button-back"
            onClick={() => setLocation("/home")}
            className="w-10 h-10 -ml-2 flex items-center justify-center text-[#2F5641]"
          >
            <ChevronLeft size={24} />
          </button>
          <h1 className="font-display text-lg font-semibold text-[#2F5641]">Treinos</h1>
          <button
            data-testid="button-exercise-catalog"
            onClick={() => setLocation("/training/exercises")}
            className="w-10 h-10 flex items-center justify-center text-[#2F5641]"
          >
            <BookOpen size={20} />
          </button>
        </header>

        <main className="px-6 flex-1 flex flex-col">
          {isLoading ? (
            <div className="flex-1 flex items-center justify-center" data-testid="loading-training">
              <Loader2 className="w-8 h-8 animate-spin text-[#2F5641]" />
            </div>
          ) : (
            <>
              <section className="space-y-3 mb-6">
                <div className="flex items-center justify-between mb-2">
                  <h2 className="text-sm font-bold text-[#2F5641] tracking-wide">Seus planos</h2>
                  <span className="text-xs text-[#8B9286]">{(planosData?.total_itens ?? 0) === 0 ? "Nenhum plano criado" : (planosData?.total_itens ?? 0) === 1 ? "1 plano" : `${planosData?.total_itens} planos`}</span>
                </div>

                {planos.length === 0 ? (
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="bg-white rounded-2xl border border-[#E8EBE5] p-8 flex flex-col items-center gap-4"
                    data-testid="text-empty-plans"
                  >
                    <div className="w-16 h-16 rounded-full bg-[#E8EBE5]/50 flex items-center justify-center">
                      <Dumbbell className="w-8 h-8 text-[#8B9286]" />
                    </div>
                    <p className="text-sm font-semibold text-[#2F5641] text-center">Você ainda não tem um plano de treino.</p>
                    <p className="text-xs text-[#8B9286] text-center">Monte sua rotina e acompanhe cada sessão aqui.</p>
                    <button
                      data-testid="button-create-first-plan"
                      onClick={() => { setFieldErrors({}); setNome(""); setObjetivo(""); setShowCreateModal(true); }}
                      className="bg-[#2F5641] text-white px-6 py-2.5 rounded-xl text-sm font-medium active:scale-95 transition-transform"
                    >
                      Criar meu primeiro plano
                    </button>
                  </motion.div>
                ) : (
                  <div className="space-y-3">
                    {planos.map((plano) => (
                      <motion.div
                        key={plano.id}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        data-testid={`card-plan-${plano.id}`}
                        className="bg-white rounded-2xl border border-[#E8EBE5] shadow-sm overflow-hidden"
                      >
                        <div className="flex items-center">
                          <button
                            data-testid={`button-open-plan-${plano.id}`}
                            onClick={() => setLocation(`/training/plans/${plano.id}`)}
                            className="flex-1 p-4 text-left active:bg-[#FAFBF8] transition-colors"
                          >
                            <div className="flex items-center gap-2 mb-1">
                              <h3 className="font-display text-base font-semibold text-[#2F5641]">{plano.nome}</h3>
                              {plano.ativo && (
                                <span
                                  data-testid={`badge-ativo-${plano.id}`}
                                  className="inline-flex items-center gap-1 bg-[#2F5641]/10 text-[#2F5641] text-[10px] font-bold px-2 py-0.5 rounded-full"
                                >
                                  <CheckCircle size={10} />
                                  Ativo
                                </span>
                              )}
                            </div>
                            {plano.ativo && (
                              <p className="text-[11px] text-[#8B9286] mb-1">Apenas um plano pode estar ativo por vez.</p>
                            )}
                            {plano.objetivo && (
                              <p className="text-xs text-[#8B9286] mb-1 line-clamp-2">{plano.objetivo}</p>
                            )}
                            <p className="text-[10px] text-[#8B9286]/70">{formatCreatedDate(plano.atualizado_em)}</p>
                          </button>
                          <button
                            data-testid={`button-delete-plan-${plano.id}`}
                            onClick={(e) => { e.stopPropagation(); setShowDeleteConfirm(plano.id); }}
                            className="w-12 h-full flex items-center justify-center text-[#D97952]/60 hover:text-[#D97952] hover:bg-[#D97952]/5 transition-colors self-stretch"
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                      </motion.div>
                    ))}
                  </div>
                )}
              </section>

              <button
                data-testid="button-session-history"
                onClick={() => setLocation("/training/sessions")}
                className="w-full flex items-center gap-3 p-4 bg-white rounded-2xl border border-[#E8EBE5] shadow-sm mb-4 active:scale-[0.98] transition-transform"
              >
                <div className="w-10 h-10 rounded-full bg-[#C7AE6A]/10 flex items-center justify-center">
                  <History size={18} className="text-[#C7AE6A]" />
                </div>
                <div className="flex-1 text-left">
                  <span className="text-sm font-semibold text-[#2F5641]">Histórico de sessões</span>
                  <p className="text-[10px] text-[#8B9286]">Sessões registradas e desempenho por treino</p>
                </div>
                <ChevronLeft size={16} className="text-[#8B9286] rotate-180" />
              </button>

              <button
                data-testid="button-create-plan"
                onClick={() => { setFieldErrors({}); setNome(""); setObjetivo(""); setShowCreateModal(true); }}
                className="w-full py-4 border-2 border-dashed border-[#C7AE6A] rounded-2xl flex items-center justify-center gap-2 text-[#C7AE6A] hover:bg-[#C7AE6A]/5 active:scale-[0.98] transition-all mb-6"
              >
                <Plus size={18} strokeWidth={2.5} />
                <span className="font-semibold text-sm">Criar novo plano</span>
              </button>
            </>
          )}
        </main>

        <AnimatePresence>
          {showCreateModal && (
            <>
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 bg-black/40 backdrop-blur-sm z-[55]"
                onClick={() => setShowCreateModal(false)}
              />
              <motion.div
                initial={{ y: "100%" }}
                animate={{ y: 0 }}
                exit={{ y: "100%" }}
                transition={{ type: "spring", damping: 25, stiffness: 200 }}
                className="fixed bottom-0 left-0 right-0 bg-white rounded-t-2xl z-[60] max-w-[430px] mx-auto shadow-2xl flex flex-col"
                style={{ maxHeight: "90vh" }}
              >
                <div className="px-6 pt-6 pb-3 flex items-center justify-between shrink-0 border-b border-[#E8EBE5]">
                  <h2 className="text-lg font-bold text-[#2F5641] font-display">Novo plano de treino</h2>
                  <button
                    data-testid="button-close-create"
                    onClick={() => setShowCreateModal(false)}
                    className="w-10 h-10 flex items-center justify-center rounded-full bg-[#FAFBF8] text-[#2F5641]"
                  >
                    <X size={20} />
                  </button>
                </div>

                <div className="px-6 pt-5 space-y-5 overflow-y-auto flex-1">
                  <div>
                    <label className="text-xs font-semibold text-[#8B9286] mb-1.5 block">
                      Nome do plano
                    </label>
                    <input
                      data-testid="input-plan-nome"
                      type="text"
                      value={nome}
                      onChange={(e) => { setNome(e.target.value); setFieldErrors((prev) => ({ ...prev, nome: "" })); }}
                      placeholder="Ex.: Hipertrofia A"
                      className={`w-full bg-white border rounded-lg px-4 py-3 text-sm font-medium text-[#2F5641] focus:outline-none focus:border-[#2F5641] placeholder:text-[#8B9286]/50 ${fieldErrors.nome ? "border-[#D97952]" : "border-[#E8EBE5]"}`}
                    />
                    {fieldErrors.nome && (
                      <p className="text-xs text-[#D97952] mt-1" data-testid="error-plan-nome">{fieldErrors.nome}</p>
                    )}
                  </div>

                  <div>
                    <label className="text-xs font-semibold text-[#8B9286] mb-1.5 block">
                      Objetivo
                    </label>
                    <input
                      data-testid="input-plan-objetivo"
                      type="text"
                      value={objetivo}
                      onChange={(e) => { setObjetivo(e.target.value); setFieldErrors((prev) => ({ ...prev, objetivo: "" })); }}
                      placeholder="Ex.: Ganho de massa muscular"
                      className={`w-full bg-white border rounded-lg px-4 py-3 text-sm font-medium text-[#2F5641] focus:outline-none focus:border-[#2F5641] placeholder:text-[#8B9286]/50 ${fieldErrors.objetivo ? "border-[#D97952]" : "border-[#E8EBE5]"}`}
                    />
                    {fieldErrors.objetivo && (
                      <p className="text-xs text-[#D97952] mt-1" data-testid="error-plan-objetivo">{fieldErrors.objetivo}</p>
                    )}
                  </div>

                  <p className="text-[13px] text-[#8B9286] leading-snug">Você poderá adicionar exercícios e definir a frequência no próximo passo.</p>

                  <p className="text-xs text-[#8B9286]">* Campo obrigatório</p>
                </div>

                <div className="px-6 pt-4 pb-8 shrink-0 border-t border-[#E8EBE5] flex gap-3">
                  <button
                    data-testid="button-cancel-plan"
                    onClick={() => setShowCreateModal(false)}
                    className="flex-1 h-12 rounded-lg border border-[#E8EBE5] text-[#2F5641] font-semibold text-sm active:scale-[0.98] transition-all"
                  >
                    Cancelar
                  </button>
                  <button
                    data-testid="button-submit-plan"
                    onClick={handleCreateSubmit}
                    disabled={createMutation.isPending}
                    className="flex-1 h-12 rounded-lg bg-[#2F5641] text-white font-semibold text-sm shadow-lg shadow-[#2F5641]/25 active:scale-[0.98] transition-all disabled:opacity-50"
                  >
                    {createMutation.isPending ? "Criando..." : "Criar plano"}
                  </button>
                </div>
              </motion.div>
            </>
          )}
        </AnimatePresence>

        <AnimatePresence>
          {showDeleteConfirm !== null && (
            <>
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 bg-black/40 backdrop-blur-sm z-40"
                onClick={() => setShowDeleteConfirm(null)}
              />
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="fixed top-1/2 left-6 right-6 -translate-y-1/2 bg-white rounded-3xl p-6 z-50 max-w-[380px] mx-auto shadow-2xl"
              >
                <div className="flex flex-col items-center gap-4">
                  <div className="w-14 h-14 rounded-full bg-[#D97952]/10 flex items-center justify-center">
                    <Trash2 className="w-6 h-6 text-[#D97952]" />
                  </div>
                  <h2 className="text-lg font-bold text-[#2F5641] text-center">Remover plano?</h2>
                  <p className="text-sm text-[#8B9286] text-center">Esta ação não pode ser desfeita. O plano e todos os dados associados serão removidos.</p>
                  <div className="flex gap-3 w-full mt-2">
                    <button
                      data-testid="button-cancel-delete"
                      onClick={() => setShowDeleteConfirm(null)}
                      className="flex-1 py-3 rounded-xl border border-[#E8EBE5] text-sm font-semibold text-[#2F5641] active:scale-95 transition-transform"
                    >
                      Cancelar
                    </button>
                    <button
                      data-testid="button-confirm-delete"
                      onClick={() => handleDeleteConfirm(showDeleteConfirm)}
                      disabled={deleteMutation.isPending}
                      className="flex-1 py-3 rounded-xl bg-[#D97952] text-white text-sm font-semibold active:scale-95 transition-transform disabled:opacity-50"
                    >
                      {deleteMutation.isPending ? "Removendo..." : "Remover"}
                    </button>
                  </div>
                </div>
              </motion.div>
            </>
          )}
        </AnimatePresence>
      </div>
    </Layout>
  );
}
