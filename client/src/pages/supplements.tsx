import Layout from "@/components/layout";
import {
  ChevronLeft,
  Pill,
  Clock,
  CheckCircle2,
  SkipForward,
  Loader2,
  AlertCircle,
  CalendarDays,
  ListChecks,
  Zap,
  Package,
  ChevronRight,
} from "lucide-react";
import { useLocation } from "wouter";
import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/lib/auth";
import { apiFetch } from "@/lib/api";

interface Suplemento {
  id: number;
  nome: string;
  marca: string;
  forma: string;
  ativo: boolean;
}

interface Horario {
  id: number;
  horario: string;
  dias_semana: number[];
  lembrete_ativo: boolean;
  minutos_antecedencia: number;
}

interface ItemProtocolo {
  id: number;
  suplemento: Suplemento;
  dosagem: string;
  instrucoes: string;
  ordem: number;
  ativo: boolean;
  horarios: Horario[];
}

interface Protocolo {
  id: number;
  nome: string;
  objetivo: string;
  data_inicio: string;
  data_fim: string | null;
  ativo: boolean;
  itens: ItemProtocolo[];
}

interface AgendaItem {
  item_horario_id: number;
  item_protocolo_id: number;
  suplemento_nome: string;
  dosagem: string;
  instrucoes: string;
  horario: string;
  horario_planejado: string;
  status: "pendente" | "tomado" | "pulado";
  lembrete_ativo: boolean;
  minutos_antecedencia: number;
}

interface AgendaResponse {
  data: string;
  itens: AgendaItem[];
  total: number;
}

interface ResumoResponse {
  total_planejado_7d: number;
  total_tomado_7d: number;
  aderencia_7d: number;
  total_planejado_30d: number;
  total_tomado_30d: number;
  aderencia_30d: number;
}

function AdherenceRing({ percentage, size = 96 }: { percentage: number; size?: number }) {
  const strokeWidth = 8;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (percentage / 100) * circumference;
  const center = size / 2;

  return (
    <div className="relative" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle
          cx={center}
          cy={center}
          r={radius}
          fill="none"
          stroke="#E8EBE5"
          strokeWidth={strokeWidth}
        />
        <motion.circle
          cx={center}
          cy={center}
          r={radius}
          fill="none"
          stroke="#C7AE6A"
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeDasharray={circumference}
          initial={{ strokeDashoffset: circumference }}
          animate={{ strokeDashoffset: offset }}
          transition={{ duration: 1, ease: "easeOut" }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="font-display text-xl font-bold text-[#2F5641]">
          {Math.round(percentage)}%
        </span>
        <span className="text-[9px] text-[#8B9286] font-medium uppercase tracking-wider">
          7 dias
        </span>
      </div>
    </div>
  );
}

function SkeletonCard() {
  return (
    <div className="bg-white rounded-2xl border border-[#E8EBE5] p-4 animate-pulse">
      <div className="flex items-center gap-4">
        <div className="w-12 h-12 rounded-xl bg-[#E8EBE5]" />
        <div className="flex-1 space-y-2">
          <div className="h-4 bg-[#E8EBE5] rounded w-3/4" />
          <div className="h-3 bg-[#E8EBE5] rounded w-1/2" />
        </div>
      </div>
    </div>
  );
}

function SkeletonSummary() {
  return (
    <div className="bg-[#2F5641] rounded-3xl p-6 animate-pulse">
      <div className="flex items-center justify-between">
        <div className="space-y-3">
          <div className="h-3 bg-white/20 rounded w-24" />
          <div className="h-6 bg-white/20 rounded w-20" />
          <div className="h-3 bg-white/20 rounded w-32" />
        </div>
        <div className="w-24 h-24 rounded-full bg-white/10" />
      </div>
    </div>
  );
}

function formatTime(time: string): string {
  return time.substring(0, 5);
}

export default function SupplementsScreen() {
  const [, setLocation] = useLocation();
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<"hoje" | "protocolos">("hoje");

  const { data: resumo, isLoading: loadingResumo } = useQuery<ResumoResponse>({
    queryKey: ["/api/nutricao/suplementacao/resumo"],
    queryFn: async () => {
      const res = await apiFetch("/api/nutricao/suplementacao/resumo");
      if (!res.ok) throw new Error("Erro ao buscar resumo");
      return res.json();
    },
    enabled: !!user,
  });

  const {
    data: agenda,
    isLoading: loadingAgenda,
    isError: errorAgenda,
    refetch: refetchAgenda,
  } = useQuery<AgendaResponse>({
    queryKey: ["/api/nutricao/suplementacao/agenda-hoje"],
    queryFn: async () => {
      const res = await apiFetch("/api/nutricao/suplementacao/agenda-hoje");
      if (!res.ok) throw new Error("Erro ao buscar agenda");
      return res.json();
    },
    enabled: !!user,
  });

  const {
    data: protocolos,
    isLoading: loadingProtocolos,
    isError: errorProtocolos,
    refetch: refetchProtocolos,
  } = useQuery<Protocolo[]>({
    queryKey: ["/api/nutricao/suplementacao/protocolos"],
    queryFn: async () => {
      const res = await apiFetch("/api/nutricao/suplementacao/protocolos");
      if (!res.ok) throw new Error("Erro ao buscar protocolos");
      return res.json();
    },
    enabled: !!user,
  });

  const registrarMutation = useMutation({
    mutationFn: async ({
      itemHorarioId,
      status,
    }: {
      itemHorarioId: number;
      status: "tomado" | "pulado";
    }) => {
      const res = await apiFetch(
        `/api/nutricao/suplementacao/agenda/${itemHorarioId}/registrar`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ status, observacao: "" }),
        }
      );
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.detail || "Erro ao registrar");
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["/api/nutricao/suplementacao/agenda-hoje"],
      });
      queryClient.invalidateQueries({
        queryKey: ["/api/nutricao/suplementacao/resumo"],
      });
    },
  });

  const ativarMutation = useMutation({
    mutationFn: async (protocoloId: number) => {
      const res = await apiFetch(
        `/api/nutricao/suplementacao/protocolos/${protocoloId}/ativar`,
        { method: "POST" }
      );
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.detail || "Erro ao ativar protocolo");
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["/api/nutricao/suplementacao/protocolos"],
      });
      queryClient.invalidateQueries({
        queryKey: ["/api/nutricao/suplementacao/agenda-hoje"],
      });
      queryClient.invalidateQueries({
        queryKey: ["/api/nutricao/suplementacao/resumo"],
      });
    },
  });

  const sortedAgenda = [...(agenda?.itens || [])].sort((a, b) =>
    a.horario.localeCompare(b.horario)
  );

  const takenCount = sortedAgenda.filter((i) => i.status === "tomado").length;
  const totalCount = sortedAgenda.length;
  const adherence7d = resumo?.aderencia_7d ?? 0;

  return (
    <Layout>
      <div className="bg-[#FAFBF8] min-h-screen pb-24">
        <header className="px-6 pt-14 pb-4 flex items-center justify-between sticky top-0 bg-[#FAFBF8]/95 backdrop-blur-md z-10">
          <button
            onClick={() => setLocation("/home")}
            className="w-10 h-10 -ml-2 flex items-center justify-center text-[#2F5641]"
            data-testid="button-back"
          >
            <ChevronLeft size={24} />
          </button>
          <h1 className="font-display text-lg font-semibold text-[#2F5641]">
            Suplementação
          </h1>
          <div className="w-10 h-10" />
        </header>

        <div className="px-6 mb-6">
          <div className="flex bg-[#F5F3EE] p-1 rounded-xl">
            <button
              onClick={() => setActiveTab("hoje")}
              className={`flex-1 py-2.5 text-xs font-semibold rounded-lg transition-all ${
                activeTab === "hoje"
                  ? "bg-white text-[#2F5641] shadow-sm"
                  : "text-[#8B9286]"
              }`}
              data-testid="tab-hoje"
            >
              Hoje
            </button>
            <button
              onClick={() => setActiveTab("protocolos")}
              className={`flex-1 py-2.5 text-xs font-semibold rounded-lg transition-all ${
                activeTab === "protocolos"
                  ? "bg-white text-[#2F5641] shadow-sm"
                  : "text-[#8B9286]"
              }`}
              data-testid="tab-protocolos"
            >
              Protocolos
            </button>
          </div>
        </div>

        <AnimatePresence mode="wait">
          {activeTab === "hoje" ? (
            <motion.main
              key="hoje"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.2 }}
              className="px-6 space-y-6"
            >
              {loadingResumo ? (
                <SkeletonSummary />
              ) : (
                <section
                  className="bg-[#2F5641] rounded-3xl p-6 text-white shadow-lg shadow-[#2F5641]/20"
                  data-testid="card-adherence"
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-[10px] font-bold uppercase tracking-widest opacity-80 mb-2">
                        Aderência Semanal
                      </p>
                      <div className="flex items-baseline gap-1 mb-1">
                        <span className="font-display text-3xl font-bold">
                          {resumo?.total_tomado_7d ?? 0}
                        </span>
                        <span className="text-sm opacity-70">
                          / {resumo?.total_planejado_7d ?? 0}
                        </span>
                      </div>
                      <p className="text-[10px] opacity-60">
                        doses nos últimos 7 dias
                      </p>
                      {resumo && resumo.total_planejado_30d > 0 && (
                        <div className="mt-3 bg-white/10 rounded-lg px-3 py-1.5 inline-flex items-center gap-2">
                          <CalendarDays size={12} className="opacity-70" />
                          <span className="text-[10px] opacity-80">
                            30d: {Math.round(resumo.aderencia_30d)}%
                          </span>
                        </div>
                      )}
                    </div>
                    <AdherenceRing percentage={adherence7d} />
                  </div>
                </section>
              )}

              {totalCount > 0 && (
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Clock size={14} className="text-[#8B9286]" />
                    <span className="text-[10px] font-bold uppercase tracking-wider text-[#8B9286]">
                      Agenda de Hoje
                    </span>
                  </div>
                  <span className="text-[10px] font-semibold text-[#C7AE6A]">
                    {takenCount}/{totalCount} tomados
                  </span>
                </div>
              )}

              {errorAgenda ? (
                <div
                  className="flex flex-col items-center justify-center py-12 gap-4"
                  data-testid="error-agenda"
                >
                  <AlertCircle className="w-12 h-12 text-[#D97952]" />
                  <p className="text-sm text-[#D97952] text-center">
                    Não foi possível carregar a agenda.
                  </p>
                  <button
                    onClick={() => refetchAgenda()}
                    className="bg-[#2F5641] text-white px-6 py-2 rounded-xl text-sm font-medium"
                    data-testid="button-retry-agenda"
                  >
                    Tentar novamente
                  </button>
                </div>
              ) : loadingAgenda ? (
                <div className="space-y-3">
                  {[1, 2, 3].map((i) => (
                    <SkeletonCard key={i} />
                  ))}
                </div>
              ) : sortedAgenda.length === 0 ? (
                <div
                  className="flex flex-col items-center justify-center py-16 gap-4"
                  data-testid="empty-agenda"
                >
                  <div className="w-20 h-20 rounded-full bg-[#F5F3EE] flex items-center justify-center">
                    <Pill size={32} className="text-[#8B9286]" />
                  </div>
                  <div className="text-center">
                    <p className="text-sm font-semibold text-[#2F5641] mb-1">
                      Nenhum suplemento agendado
                    </p>
                    <p className="text-xs text-[#8B9286] max-w-[260px]">
                      Ative um protocolo na aba Protocolos para ver seus
                      suplementos do dia.
                    </p>
                  </div>
                </div>
              ) : (
                <div className="space-y-3">
                  {sortedAgenda.map((item, index) => {
                    const isTaken = item.status === "tomado";
                    const isSkipped = item.status === "pulado";
                    const isDone = isTaken || isSkipped;
                    const isPending =
                      registrarMutation.isPending &&
                      registrarMutation.variables?.itemHorarioId ===
                        item.item_horario_id;

                    return (
                      <motion.div
                        key={item.item_horario_id}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: index * 0.05 }}
                        className={`bg-white rounded-2xl border shadow-sm overflow-hidden transition-colors ${
                          isTaken
                            ? "border-[#648D4A]/30 bg-[#648D4A]/5"
                            : isSkipped
                            ? "border-[#D97952]/20 bg-[#D97952]/5"
                            : "border-[#E8EBE5]"
                        }`}
                        data-testid={`card-agenda-${item.item_horario_id}`}
                      >
                        <div className="p-4 flex items-center gap-4">
                          <div className="flex flex-col items-center min-w-[44px]">
                            <span
                              className={`text-xs font-bold ${
                                isTaken
                                  ? "text-[#648D4A]"
                                  : isSkipped
                                  ? "text-[#D97952]"
                                  : "text-[#2F5641]"
                              }`}
                            >
                              {formatTime(item.horario)}
                            </span>
                            <div
                              className={`w-8 h-8 rounded-full flex items-center justify-center mt-1 ${
                                isTaken
                                  ? "bg-[#648D4A] text-white"
                                  : isSkipped
                                  ? "bg-[#D97952]/20 text-[#D97952]"
                                  : "bg-[#F5F3EE] text-[#8B9286]"
                              }`}
                            >
                              {isTaken ? (
                                <CheckCircle2 size={16} />
                              ) : isSkipped ? (
                                <SkipForward size={14} />
                              ) : (
                                <Pill size={14} />
                              )}
                            </div>
                          </div>

                          <div className="flex-1 min-w-0">
                            <h3
                              className={`font-semibold text-sm truncate ${
                                isTaken
                                  ? "text-[#648D4A] line-through"
                                  : isSkipped
                                  ? "text-[#D97952]/70 line-through"
                                  : "text-[#2F5641]"
                              }`}
                            >
                              {item.suplemento_nome}
                            </h3>
                            <div className="flex items-center gap-2 mt-0.5">
                              <span className="text-xs text-[#8B9286]">
                                {item.dosagem}
                              </span>
                              {item.instrucoes && (
                                <>
                                  <span className="w-1 h-1 rounded-full bg-[#E8EBE5]" />
                                  <span className="text-[10px] text-[#8B9286] truncate">
                                    {item.instrucoes}
                                  </span>
                                </>
                              )}
                            </div>
                          </div>

                          {!isDone && (
                            <div className="flex items-center gap-2 shrink-0">
                              <button
                                onClick={() =>
                                  registrarMutation.mutate({
                                    itemHorarioId: item.item_horario_id,
                                    status: "pulado",
                                  })
                                }
                                disabled={isPending}
                                className="w-8 h-8 rounded-full flex items-center justify-center border border-[#E8EBE5] text-[#8B9286] hover:border-[#D97952] hover:text-[#D97952] transition-colors active:scale-90 disabled:opacity-40"
                                data-testid={`button-skip-${item.item_horario_id}`}
                              >
                                <SkipForward size={14} />
                              </button>
                              <button
                                onClick={() =>
                                  registrarMutation.mutate({
                                    itemHorarioId: item.item_horario_id,
                                    status: "tomado",
                                  })
                                }
                                disabled={isPending}
                                className="h-8 px-4 rounded-full bg-[#2F5641] text-white text-xs font-semibold flex items-center gap-1.5 shadow-sm shadow-[#2F5641]/20 active:scale-95 transition-all disabled:opacity-40"
                                data-testid={`button-tomar-${item.item_horario_id}`}
                              >
                                {isPending ? (
                                  <Loader2 size={14} className="animate-spin" />
                                ) : (
                                  <>
                                    <CheckCircle2 size={14} />
                                    Tomar
                                  </>
                                )}
                              </button>
                            </div>
                          )}

                          {isTaken && (
                            <span className="text-[10px] font-bold text-[#648D4A] uppercase tracking-wide shrink-0">
                              Tomado ✓
                            </span>
                          )}
                          {isSkipped && (
                            <span className="text-[10px] font-bold text-[#D97952] uppercase tracking-wide shrink-0">
                              Pulado
                            </span>
                          )}
                        </div>
                      </motion.div>
                    );
                  })}
                </div>
              )}

              {takenCount === totalCount && totalCount > 0 && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="bg-[#648D4A]/10 border border-[#648D4A]/20 rounded-2xl p-5 text-center"
                  data-testid="card-all-taken"
                >
                  <div className="w-12 h-12 rounded-full bg-[#648D4A] text-white flex items-center justify-center mx-auto mb-3">
                    <Zap size={24} />
                  </div>
                  <p className="text-sm font-semibold text-[#2F5641]">
                    Parabéns! Todos os suplementos do dia foram tomados.
                  </p>
                  <p className="text-xs text-[#8B9286] mt-1">
                    Constância é a chave para resultados.
                  </p>
                </motion.div>
              )}
            </motion.main>
          ) : (
            <motion.main
              key="protocolos"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              transition={{ duration: 0.2 }}
              className="px-6 space-y-4"
            >
              {errorProtocolos ? (
                <div
                  className="flex flex-col items-center justify-center py-12 gap-4"
                  data-testid="error-protocolos"
                >
                  <AlertCircle className="w-12 h-12 text-[#D97952]" />
                  <p className="text-sm text-[#D97952] text-center">
                    Não foi possível carregar protocolos.
                  </p>
                  <button
                    onClick={() => refetchProtocolos()}
                    className="bg-[#2F5641] text-white px-6 py-2 rounded-xl text-sm font-medium"
                    data-testid="button-retry-protocolos"
                  >
                    Tentar novamente
                  </button>
                </div>
              ) : loadingProtocolos ? (
                <div className="space-y-3">
                  {[1, 2].map((i) => (
                    <SkeletonCard key={i} />
                  ))}
                </div>
              ) : !protocolos || protocolos.length === 0 ? (
                <div
                  className="flex flex-col items-center justify-center py-16 gap-4"
                  data-testid="empty-protocolos"
                >
                  <div className="w-20 h-20 rounded-full bg-[#F5F3EE] flex items-center justify-center">
                    <ListChecks size={32} className="text-[#8B9286]" />
                  </div>
                  <div className="text-center">
                    <p className="text-sm font-semibold text-[#2F5641] mb-1">
                      Nenhum protocolo encontrado
                    </p>
                    <p className="text-xs text-[#8B9286] max-w-[260px]">
                      Crie seu primeiro protocolo de suplementação para
                      acompanhar seus suplementos diários.
                    </p>
                  </div>
                </div>
              ) : (
                protocolos.map((protocolo) => {
                  const isActive = protocolo.ativo;
                  const itemCount = protocolo.itens?.length ?? 0;
                  const startDate = new Date(
                    protocolo.data_inicio
                  ).toLocaleDateString("pt-BR", {
                    day: "2-digit",
                    month: "short",
                  });
                  const endDate = protocolo.data_fim
                    ? new Date(protocolo.data_fim).toLocaleDateString("pt-BR", {
                        day: "2-digit",
                        month: "short",
                      })
                    : "Em andamento";
                  const isActivating =
                    ativarMutation.isPending &&
                    ativarMutation.variables === protocolo.id;

                  return (
                    <motion.div
                      key={protocolo.id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className={`bg-white rounded-2xl border shadow-sm overflow-hidden ${
                        isActive
                          ? "border-[#2F5641] ring-1 ring-[#2F5641]/10"
                          : "border-[#E8EBE5]"
                      }`}
                      data-testid={`card-protocolo-${protocolo.id}`}
                    >
                      <div className="p-4">
                        <div className="flex items-start justify-between mb-2">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1">
                              <h3 className="font-semibold text-sm text-[#2F5641] truncate">
                                {protocolo.nome}
                              </h3>
                              {isActive && (
                                <span className="shrink-0 bg-[#648D4A] text-white text-[9px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wide">
                                  Ativo
                                </span>
                              )}
                            </div>
                            {protocolo.objetivo && (
                              <p className="text-xs text-[#8B9286] line-clamp-2">
                                {protocolo.objetivo}
                              </p>
                            )}
                          </div>
                          <ChevronRight
                            size={18}
                            className="text-[#E8EBE5] shrink-0 ml-2"
                          />
                        </div>

                        <div className="flex items-center gap-3 mt-3">
                          <div className="flex items-center gap-1.5 text-[10px] text-[#8B9286]">
                            <Package size={12} />
                            <span>
                              {itemCount}{" "}
                              {itemCount === 1 ? "suplemento" : "suplementos"}
                            </span>
                          </div>
                          <span className="w-1 h-1 rounded-full bg-[#E8EBE5]" />
                          <div className="flex items-center gap-1.5 text-[10px] text-[#8B9286]">
                            <CalendarDays size={12} />
                            <span>
                              {startDate} — {endDate}
                            </span>
                          </div>
                        </div>

                        {isActive && protocolo.itens && protocolo.itens.length > 0 && (
                          <div className="mt-3 pt-3 border-t border-[#E8EBE5]">
                            <div className="flex flex-wrap gap-1.5">
                              {protocolo.itens
                                .filter((i) => i.ativo)
                                .slice(0, 4)
                                .map((item) => (
                                  <span
                                    key={item.id}
                                    className="bg-[#F5F3EE] text-[10px] font-medium text-[#2F5641] px-2.5 py-1 rounded-lg"
                                  >
                                    {item.suplemento.nome}
                                  </span>
                                ))}
                              {protocolo.itens.filter((i) => i.ativo).length >
                                4 && (
                                <span className="bg-[#F5F3EE] text-[10px] font-medium text-[#8B9286] px-2.5 py-1 rounded-lg">
                                  +
                                  {protocolo.itens.filter((i) => i.ativo)
                                    .length - 4}
                                </span>
                              )}
                            </div>
                          </div>
                        )}

                        {!isActive && (
                          <button
                            onClick={() =>
                              ativarMutation.mutate(protocolo.id)
                            }
                            disabled={isActivating}
                            className="mt-3 w-full bg-[#F5F3EE] text-[#2F5641] py-2.5 rounded-xl text-xs font-semibold hover:bg-[#2F5641] hover:text-white transition-colors active:scale-[0.98] disabled:opacity-40"
                            data-testid={`button-ativar-${protocolo.id}`}
                          >
                            {isActivating ? (
                              <span className="flex items-center justify-center gap-2">
                                <Loader2
                                  size={14}
                                  className="animate-spin"
                                />
                                Ativando...
                              </span>
                            ) : (
                              "Ativar Protocolo"
                            )}
                          </button>
                        )}
                      </div>
                    </motion.div>
                  );
                })
              )}
            </motion.main>
          )}
        </AnimatePresence>
      </div>
    </Layout>
  );
}
