import Layout from "@/components/layout";
import { ChevronLeft, Plus, Trash2, Loader2, AlertCircle, Clock, CheckCircle, Play, ChevronDown, ChevronUp, Calendar } from "lucide-react";
import { useLocation } from "wouter";
import { useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/lib/auth";
import { apiFetch } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";

interface Sessao {
  id: number;
  plano_id: number | null;
  plano_nome: string | null;
  iniciado_em: string;
  finalizado_em: string | null;
  duracao_min: number | null;
  concluida: boolean;
  observacoes: string;
}

interface SessoesResponse {
  inicio: string;
  fim: string;
  itens: Sessao[];
  total_itens: number;
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

type DateRange = "7d" | "30d" | "custom";

function formatDate(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function getDateRange(range: DateRange): { inicio: string; fim: string } {
  const now = new Date();
  const fim = formatDate(now);
  const start = new Date(now);
  if (range === "7d") {
    start.setDate(start.getDate() - 6);
  } else {
    start.setDate(start.getDate() - 29);
  }
  return { inicio: formatDate(start), fim };
}

function formatDateTime(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" }) +
    " às " +
    d.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
}

export default function SessionsScreen() {
  const [, setLocation] = useLocation();
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const { toast } = useToast();

  const [dateRange, setDateRange] = useState<DateRange>("7d");
  const [expandedId, setExpandedId] = useState<number | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<number | null>(null);

  const { inicio, fim } = useMemo(() => getDateRange(dateRange), [dateRange]);

  const { data, isLoading, isError, refetch } = useQuery<SessoesResponse>({
    queryKey: ["treino", "sessoes", inicio, fim],
    queryFn: async () => {
      const res = await apiFetch(`/api/treino/sessoes?inicio=${inicio}&fim=${fim}`);
      if (!res.ok) throw new Error("Erro ao buscar sessões");
      return res.json();
    },
    enabled: !!user,
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      const res = await apiFetch(`/api/treino/sessoes/${id}`, { method: "DELETE" });
      if (!res.ok) {
        const err = await res.json();
        throw { status: res.status, ...err };
      }
      return res.json();
    },
    onSuccess: (data) => {
      setConfirmDeleteId(null);
      queryClient.invalidateQueries({ queryKey: ["treino", "sessoes"] });
      toast({ title: "Sessão removida", description: data.mensagem || "Sessão removida com sucesso." });
    },
    onError: (err: any) => {
      setConfirmDeleteId(null);
      if (err?.status === 403) {
        toast({ title: "Acesso negado", variant: "destructive" });
      } else if (err?.status === 404) {
        toast({ title: "Não encontrado", variant: "destructive" });
        queryClient.invalidateQueries({ queryKey: ["treino", "sessoes"] });
      } else {
        toast({ title: "Erro", description: "Não foi possível remover. Tente novamente.", variant: "destructive" });
      }
    },
  });

  const sessoes = data?.itens ?? [];

  if (isError) {
    return (
      <Layout>
        <div className="min-h-screen flex flex-col items-center justify-center px-6 gap-4" data-testid="error-sessions">
          <AlertCircle className="w-12 h-12 text-[#BE4E35]" />
          <p className="text-sm text-[#BE4E35] text-center">Não foi possível carregar sessões.</p>
          <button onClick={() => refetch()} className="bg-[#2F5641] text-white px-6 py-2 rounded-xl text-sm font-medium" data-testid="button-retry">
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
          <button data-testid="button-back" onClick={() => setLocation("/training")} className="w-10 h-10 -ml-2 flex items-center justify-center text-[#2F5641]">
            <ChevronLeft size={24} />
          </button>
          <h1 className="font-display text-lg font-semibold text-[#2F5641]">Sessões</h1>
          <div className="w-10 h-10" />
        </header>

        <main className="px-6 flex-1 flex flex-col">
          <div className="flex items-center gap-2 mb-4" data-testid="filter-date-range">
            <Calendar size={14} className="text-[#8B9286]" />
            {(["7d", "30d"] as DateRange[]).map((range) => (
              <button
                key={range}
                data-testid={`filter-range-${range}`}
                onClick={() => setDateRange(range)}
                className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-colors ${
                  dateRange === range
                    ? "bg-[#2F5641] text-white border-[#2F5641]"
                    : "bg-white text-[#8B9286] border-[#E8EBE5]"
                }`}
              >
                {range === "7d" ? "7 dias" : "30 dias"}
              </button>
            ))}
          </div>

          {isLoading ? (
            <div className="flex-1 flex items-center justify-center" data-testid="loading-sessions">
              <Loader2 className="w-8 h-8 animate-spin text-[#2F5641]" />
            </div>
          ) : sessoes.length === 0 ? (
            <div className="flex-1 flex flex-col items-center justify-center gap-3 py-12" data-testid="empty-sessions">
              <Clock className="w-12 h-12 text-[#E8EBE5]" />
              <p className="text-sm text-[#8B9286]">Nenhuma sessão registrada</p>
            </div>
          ) : (
            <div className="flex flex-col gap-3">
              {sessoes.map((sessao) => {
                const isExpanded = expandedId === sessao.id;
                const isConfirming = confirmDeleteId === sessao.id;

                return (
                  <motion.div
                    key={sessao.id}
                    data-testid={`card-session-${sessao.id}`}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="bg-white rounded-2xl border border-[#E8EBE5] overflow-hidden shadow-sm"
                  >
                    <button
                      data-testid={`button-expand-${sessao.id}`}
                      onClick={() => setExpandedId(isExpanded ? null : sessao.id)}
                      className="w-full p-4 text-left"
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <h3 className="text-sm font-semibold text-[#2F5641]" data-testid={`text-session-plan-${sessao.id}`}>
                            {sessao.plano_nome || "Treino Livre"}
                          </h3>
                          <p className="text-xs text-[#8B9286] mt-1" data-testid={`text-session-date-${sessao.id}`}>
                            {formatDateTime(sessao.iniciado_em)}
                          </p>
                        </div>
                        <div className="flex items-center gap-2">
                          {sessao.concluida ? (
                            <span
                              data-testid={`badge-complete-${sessao.id}`}
                              className="flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-[#2F5641]/10 text-[#2F5641]"
                            >
                              <CheckCircle size={10} />
                              Concluída
                            </span>
                          ) : (
                            <span
                              data-testid={`badge-ongoing-${sessao.id}`}
                              className="flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-[#C7AE6A]/20 text-[#C7AE6A]"
                            >
                              <Play size={10} />
                              Em andamento
                            </span>
                          )}
                          {isExpanded ? (
                            <ChevronUp size={16} className="text-[#8B9286]" />
                          ) : (
                            <ChevronDown size={16} className="text-[#8B9286]" />
                          )}
                        </div>
                      </div>

                      <div className="flex items-center gap-3 mt-2">
                        <span className="text-xs text-[#8B9286]" data-testid={`text-session-duration-${sessao.id}`}>
                          {sessao.duracao_min != null ? `${sessao.duracao_min} min` : "Em andamento"}
                        </span>
                      </div>
                    </button>

                    <AnimatePresence>
                      {isExpanded && (
                        <motion.div
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: "auto", opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          transition={{ duration: 0.2 }}
                          className="overflow-hidden"
                        >
                          <div className="px-4 pb-4 border-t border-[#E8EBE5] pt-3">
                            {sessao.observacoes ? (
                              <p className="text-xs text-[#8B9286] mb-3" data-testid={`text-session-obs-${sessao.id}`}>
                                {sessao.observacoes}
                              </p>
                            ) : (
                              <p className="text-xs text-[#8B9286]/50 italic mb-3">Sem observações</p>
                            )}

                            {sessao.finalizado_em && (
                              <p className="text-xs text-[#8B9286] mb-3">
                                Finalizado: {formatDateTime(sessao.finalizado_em)}
                              </p>
                            )}

                            <div className="flex items-center justify-end gap-2">
                              {isConfirming ? (
                                <div className="flex items-center gap-2">
                                  <span className="text-xs text-[#BE4E35] font-medium">Confirmar exclusão?</span>
                                  <button
                                    data-testid={`button-confirm-delete-${sessao.id}`}
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      deleteMutation.mutate(sessao.id);
                                    }}
                                    disabled={deleteMutation.isPending}
                                    className="px-3 py-1 rounded-lg text-xs font-medium bg-[#BE4E35] text-white disabled:opacity-50"
                                  >
                                    {deleteMutation.isPending ? "..." : "Sim"}
                                  </button>
                                  <button
                                    data-testid={`button-cancel-delete-${sessao.id}`}
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setConfirmDeleteId(null);
                                    }}
                                    className="px-3 py-1 rounded-lg text-xs font-medium bg-[#E8EBE5] text-[#8B9286]"
                                  >
                                    Não
                                  </button>
                                </div>
                              ) : (
                                <button
                                  data-testid={`button-delete-${sessao.id}`}
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setConfirmDeleteId(sessao.id);
                                  }}
                                  className="w-8 h-8 rounded-full flex items-center justify-center text-[#BE4E35]/60 hover:bg-[#BE4E35]/10 transition-colors"
                                >
                                  <Trash2 size={14} />
                                </button>
                              )}
                            </div>
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </motion.div>
                );
              })}
            </div>
          )}
        </main>

        <button
          data-testid="button-new-session"
          onClick={() => setLocation("/training")}
          className="fixed bottom-28 right-6 w-14 h-14 bg-[#2F5641] text-white rounded-full shadow-lg shadow-[#2F5641]/30 flex items-center justify-center active:scale-95 transition-transform z-20 max-w-[430px]"
        >
          <Plus size={22} />
        </button>
      </div>
    </Layout>
  );
}
