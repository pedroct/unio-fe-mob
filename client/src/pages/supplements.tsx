import Layout from "@/components/layout";
import {
  ChevronLeft,
  Pill,
  Clock,
  CheckCircle2,
  X,
  Loader2,
  AlertCircle,
  CalendarDays,
  Zap,
  Package,
  ChevronRight,
  Plus,
  Trash2,
  AlertTriangle,
  History,
  Edit3,
  Save,
  XCircle,
} from "lucide-react";
import { useLocation } from "wouter";
import { useState, useEffect } from "react";
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
  quantidade_por_dose: number;
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
  status: "pendente" | "atrasado" | "tomado" | "adiado" | "ignorado";
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

interface HistoricoRegistro {
  id: number;
  item_protocolo_id: number;
  suplemento_nome: string;
  dosagem: string;
  horario_planejado: string;
  registrado_em: string;
  status: "tomado" | "adiado" | "ignorado";
  observacao: string;
}

interface HistoricoResponse {
  registros: HistoricoRegistro[];
  total: number;
}

interface EstoqueItem {
  suplemento: Suplemento;
  quantidade_atual: number;
  quantidade_minima: number;
}

interface NovoItemProtocolo {
  suplemento_nome: string;
  dosagem: string;
  quantidade_por_dose: number;
  instrucoes: string;
  horarios: string[];
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

function formatDate(dateStr: string): string {
  const d = new Date(dateStr);
  return d.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric" });
}

function formatDateTime(dateStr: string): string {
  const d = new Date(dateStr);
  return d.toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function ErrorToast({ message, onDismiss }: { message: string; onDismiss: () => void }) {
  useEffect(() => {
    const timer = setTimeout(onDismiss, 5000);
    return () => clearTimeout(timer);
  }, [onDismiss]);

  return (
    <motion.div
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className="fixed top-16 left-4 right-4 max-w-[430px] mx-auto z-50"
    >
      <div className="bg-[#D97952] text-white rounded-xl px-4 py-3 flex items-center gap-3 shadow-lg">
        <AlertCircle size={18} className="shrink-0" />
        <p className="text-sm flex-1">{message}</p>
        <button onClick={onDismiss} className="shrink-0" data-testid="button-dismiss-error">
          <X size={16} />
        </button>
      </div>
    </motion.div>
  );
}

type TabType = "hoje" | "protocolos" | "estoque" | "historico";

export default function SupplementsScreen() {
  const [, setLocation] = useLocation();
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<TabType>("hoje");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);

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
      status: "tomado" | "adiado" | "ignorado";
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
        const msg = err.erro || err.detail || "Erro ao registrar";
        if (msg.includes("Estoque insuficiente")) {
          throw new Error("Estoque insuficiente para este suplemento. Verifique seu estoque na aba Estoque.");
        }
        throw new Error(msg);
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
      queryClient.invalidateQueries({
        queryKey: ["/api/nutricao/suplementacao/estoque"],
      });
    },
    onError: (error: Error) => {
      setErrorMessage(error.message);
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
        throw new Error(err.erro || err.detail || "Erro ao ativar protocolo");
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
    onError: (error: Error) => {
      setErrorMessage(error.message);
    },
  });

  const criarProtocoloMutation = useMutation({
    mutationFn: async (payload: {
      nome: string;
      objetivo: string;
      data_inicio: string;
      itens: {
        suplemento_nome: string;
        dosagem: string;
        quantidade_por_dose: number;
        instrucoes: string;
        horarios: { horario: string; dias_semana: number[] }[];
      }[];
    }) => {
      const res = await apiFetch("/api/nutricao/suplementacao/protocolos", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.erro || err.detail || "Erro ao criar protocolo");
      }
      return res.json();
    },
    onSuccess: () => {
      setShowCreateModal(false);
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
    onError: (error: Error) => {
      setErrorMessage(error.message);
    },
  });

  const sortedAgenda = [...(agenda?.itens || [])].sort((a, b) =>
    a.horario.localeCompare(b.horario)
  );

  const doneCount = sortedAgenda.filter(
    (i) => i.status === "tomado" || i.status === "adiado" || i.status === "ignorado"
  ).length;
  const totalCount = sortedAgenda.length;
  const adherence7d = resumo?.aderencia_7d ?? 0;

  const tabs: { key: TabType; label: string }[] = [
    { key: "hoje", label: "Hoje" },
    { key: "protocolos", label: "Protocolos" },
    { key: "estoque", label: "Estoque" },
    { key: "historico", label: "Histórico" },
  ];

  return (
    <Layout>
      <div className="bg-[#FAFBF8] min-h-screen pb-24">
        <AnimatePresence>
          {errorMessage && (
            <ErrorToast
              message={errorMessage}
              onDismiss={() => setErrorMessage(null)}
            />
          )}
        </AnimatePresence>

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
            {tabs.map((tab) => (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                className={`flex-1 py-2.5 text-[10px] font-semibold rounded-lg transition-all ${
                  activeTab === tab.key
                    ? "bg-white text-[#2F5641] shadow-sm"
                    : "text-[#8B9286]"
                }`}
                data-testid={`tab-${tab.key}`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        <AnimatePresence mode="wait">
          {activeTab === "hoje" && (
            <HojeTab
              key="hoje"
              loadingResumo={loadingResumo}
              resumo={resumo}
              adherence7d={adherence7d}
              errorAgenda={errorAgenda}
              loadingAgenda={loadingAgenda}
              sortedAgenda={sortedAgenda}
              doneCount={doneCount}
              totalCount={totalCount}
              refetchAgenda={refetchAgenda}
              registrarMutation={registrarMutation}
            />
          )}
          {activeTab === "protocolos" && (
            <ProtocolosTab
              key="protocolos"
              protocolos={protocolos}
              loadingProtocolos={loadingProtocolos}
              errorProtocolos={errorProtocolos}
              refetchProtocolos={refetchProtocolos}
              ativarMutation={ativarMutation}
              showCreateModal={showCreateModal}
              setShowCreateModal={setShowCreateModal}
              criarProtocoloMutation={criarProtocoloMutation}
              setErrorMessage={setErrorMessage}
            />
          )}
          {activeTab === "estoque" && (
            <EstoqueTab
              key="estoque"
              setErrorMessage={setErrorMessage}
            />
          )}
          {activeTab === "historico" && (
            <HistoricoTab key="historico" />
          )}
        </AnimatePresence>
      </div>
    </Layout>
  );
}

function HojeTab({
  loadingResumo,
  resumo,
  adherence7d,
  errorAgenda,
  loadingAgenda,
  sortedAgenda,
  doneCount,
  totalCount,
  refetchAgenda,
  registrarMutation,
}: {
  loadingResumo: boolean;
  resumo: ResumoResponse | undefined;
  adherence7d: number;
  errorAgenda: boolean;
  loadingAgenda: boolean;
  sortedAgenda: AgendaItem[];
  doneCount: number;
  totalCount: number;
  refetchAgenda: () => void;
  registrarMutation: ReturnType<typeof useMutation<unknown, Error, { itemHorarioId: number; status: "tomado" | "adiado" | "ignorado" }>>;
}) {
  return (
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
            {doneCount}/{totalCount} concluídos
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
            const isTomado = item.status === "tomado";
            const isAdiado = item.status === "adiado";
            const isIgnorado = item.status === "ignorado";
            const isAtrasado = item.status === "atrasado";
            const isPendente = item.status === "pendente";
            const isDone = isTomado || isAdiado || isIgnorado;
            const canAct = isPendente || isAtrasado;
            const isMutating =
              registrarMutation.isPending &&
              registrarMutation.variables?.itemHorarioId ===
                item.item_horario_id;

            let cardBorder = "border-[#E8EBE5]";
            let cardBg = "bg-white";
            if (isTomado) {
              cardBorder = "border-[#648D4A]/30";
              cardBg = "bg-[#648D4A]/5";
            } else if (isAdiado) {
              cardBorder = "border-[#C7AE6A]/30";
              cardBg = "bg-[#C7AE6A]/5";
            } else if (isIgnorado) {
              cardBorder = "border-[#8B9286]/20";
              cardBg = "bg-[#8B9286]/5";
            } else if (isAtrasado) {
              cardBorder = "border-[#D97952]/30";
              cardBg = "bg-[#D97952]/5";
            }

            let timeColor = "text-[#2F5641]";
            if (isTomado) timeColor = "text-[#648D4A]";
            else if (isAdiado) timeColor = "text-[#C7AE6A]";
            else if (isIgnorado) timeColor = "text-[#8B9286]";
            else if (isAtrasado) timeColor = "text-[#D97952]";

            let iconBg = "bg-[#F5F3EE] text-[#8B9286]";
            if (isTomado) iconBg = "bg-[#648D4A] text-white";
            else if (isAdiado) iconBg = "bg-[#C7AE6A]/20 text-[#C7AE6A]";
            else if (isIgnorado) iconBg = "bg-[#8B9286]/20 text-[#8B9286]";
            else if (isAtrasado) iconBg = "bg-[#D97952]/20 text-[#D97952]";

            return (
              <motion.div
                key={item.item_horario_id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05 }}
                className={`${cardBg} rounded-2xl border shadow-sm overflow-hidden transition-colors ${cardBorder}`}
                data-testid={`card-agenda-${item.item_horario_id}`}
              >
                <div className="p-4 flex items-center gap-4">
                  <div className="flex flex-col items-center min-w-[44px]">
                    <span className={`text-xs font-bold ${timeColor}`}>
                      {formatTime(item.horario)}
                    </span>
                    <div
                      className={`w-8 h-8 rounded-full flex items-center justify-center mt-1 ${iconBg}`}
                    >
                      {isTomado ? (
                        <CheckCircle2 size={16} />
                      ) : isAdiado ? (
                        <Clock size={14} />
                      ) : isIgnorado ? (
                        <X size={14} />
                      ) : isAtrasado ? (
                        <AlertTriangle size={14} />
                      ) : (
                        <Pill size={14} />
                      )}
                    </div>
                  </div>

                  <div className="flex-1 min-w-0">
                    <h3
                      className={`font-semibold text-sm truncate ${
                        isTomado
                          ? "text-[#648D4A] line-through"
                          : isIgnorado
                          ? "text-[#8B9286] line-through"
                          : isAdiado
                          ? "text-[#C7AE6A]"
                          : isAtrasado
                          ? "text-[#D97952]"
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

                  {canAct && (
                    <div className="flex items-center gap-1.5 shrink-0">
                      <button
                        onClick={() =>
                          registrarMutation.mutate({
                            itemHorarioId: item.item_horario_id,
                            status: "ignorado",
                          })
                        }
                        disabled={isMutating}
                        className="w-8 h-8 rounded-full flex items-center justify-center border border-[#E8EBE5] text-[#8B9286] hover:border-[#8B9286] transition-colors active:scale-90 disabled:opacity-40"
                        data-testid={`button-ignorar-${item.item_horario_id}`}
                        title="Ignorar"
                      >
                        <X size={14} />
                      </button>
                      <button
                        onClick={() =>
                          registrarMutation.mutate({
                            itemHorarioId: item.item_horario_id,
                            status: "adiado",
                          })
                        }
                        disabled={isMutating}
                        className="w-8 h-8 rounded-full flex items-center justify-center border border-[#C7AE6A]/50 text-[#C7AE6A] hover:border-[#C7AE6A] transition-colors active:scale-90 disabled:opacity-40"
                        data-testid={`button-adiar-${item.item_horario_id}`}
                        title="Adiar"
                      >
                        <Clock size={14} />
                      </button>
                      <button
                        onClick={() =>
                          registrarMutation.mutate({
                            itemHorarioId: item.item_horario_id,
                            status: "tomado",
                          })
                        }
                        disabled={isMutating}
                        className="h-8 px-4 rounded-full bg-[#2F5641] text-white text-xs font-semibold flex items-center gap-1.5 shadow-sm shadow-[#2F5641]/20 active:scale-95 transition-all disabled:opacity-40"
                        data-testid={`button-tomar-${item.item_horario_id}`}
                      >
                        {isMutating ? (
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

                  {isTomado && (
                    <span
                      className="text-[10px] font-bold text-[#648D4A] uppercase tracking-wide shrink-0"
                      data-testid={`badge-tomado-${item.item_horario_id}`}
                    >
                      Tomado ✓
                    </span>
                  )}
                  {isAdiado && (
                    <span
                      className="text-[10px] font-bold text-[#C7AE6A] uppercase tracking-wide shrink-0"
                      data-testid={`badge-adiado-${item.item_horario_id}`}
                    >
                      Adiado
                    </span>
                  )}
                  {isIgnorado && (
                    <span
                      className="text-[10px] font-bold text-[#8B9286] uppercase tracking-wide shrink-0"
                      data-testid={`badge-ignorado-${item.item_horario_id}`}
                    >
                      Ignorado
                    </span>
                  )}
                  {isAtrasado && !isDone && (
                    <span
                      className="text-[10px] font-bold text-[#D97952] uppercase tracking-wide shrink-0"
                      data-testid={`badge-atrasado-${item.item_horario_id}`}
                    >
                      Atrasado
                    </span>
                  )}
                </div>
              </motion.div>
            );
          })}
        </div>
      )}

      {doneCount === totalCount && totalCount > 0 && (
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
            Parabéns! Todos os suplementos do dia foram registrados.
          </p>
          <p className="text-xs text-[#8B9286] mt-1">
            Constância é a chave para resultados.
          </p>
        </motion.div>
      )}
    </motion.main>
  );
}

function ProtocolosTab({
  protocolos,
  loadingProtocolos,
  errorProtocolos,
  refetchProtocolos,
  ativarMutation,
  showCreateModal,
  setShowCreateModal,
  criarProtocoloMutation,
  setErrorMessage,
}: {
  protocolos: Protocolo[] | undefined;
  loadingProtocolos: boolean;
  errorProtocolos: boolean;
  refetchProtocolos: () => void;
  ativarMutation: ReturnType<typeof useMutation<unknown, Error, number>>;
  showCreateModal: boolean;
  setShowCreateModal: (v: boolean) => void;
  criarProtocoloMutation: ReturnType<typeof useMutation<unknown, Error, any>>;
  setErrorMessage: (msg: string | null) => void;
}) {
  return (
    <motion.main
      key="protocolos"
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 20 }}
      transition={{ duration: 0.2 }}
      className="px-6 space-y-4"
    >
      <button
        onClick={() => setShowCreateModal(true)}
        className="w-full flex items-center justify-center gap-2 bg-[#2F5641] text-white py-3 rounded-xl text-sm font-semibold shadow-sm shadow-[#2F5641]/20 active:scale-[0.98] transition-transform"
        data-testid="button-criar-protocolo"
      >
        <Plus size={18} />
        Criar Protocolo
      </button>

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
            <Package size={32} className="text-[#8B9286]" />
          </div>
          <div className="text-center">
            <p className="text-sm font-semibold text-[#2F5641] mb-1">
              Nenhum protocolo criado
            </p>
            <p className="text-xs text-[#8B9286] max-w-[260px]">
              Crie seu primeiro protocolo de suplementação para organizar
              seus suplementos.
            </p>
          </div>
        </div>
      ) : (
        <div className="space-y-3">
          {protocolos.map((protocolo, index) => (
            <motion.div
              key={protocolo.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.05 }}
              className={`bg-white rounded-2xl border shadow-sm overflow-hidden ${
                protocolo.ativo
                  ? "border-[#648D4A]/30"
                  : "border-[#E8EBE5]"
              }`}
              data-testid={`card-protocolo-${protocolo.id}`}
            >
              <div className="p-4">
                <div className="flex items-start justify-between mb-2">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <h3 className="font-semibold text-sm text-[#2F5641] truncate">
                        {protocolo.nome}
                      </h3>
                      {protocolo.ativo && (
                        <span className="text-[9px] font-bold bg-[#648D4A]/10 text-[#648D4A] px-2 py-0.5 rounded-full uppercase">
                          Ativo
                        </span>
                      )}
                    </div>
                    {protocolo.objetivo && (
                      <p className="text-xs text-[#8B9286] mt-0.5 truncate">
                        {protocolo.objetivo}
                      </p>
                    )}
                  </div>
                  <ChevronRight
                    size={16}
                    className="text-[#8B9286] shrink-0 mt-0.5"
                  />
                </div>

                <div className="flex items-center gap-3 text-[10px] text-[#8B9286]">
                  <span>{protocolo.itens.length} itens</span>
                  <span className="w-1 h-1 rounded-full bg-[#E8EBE5]" />
                  <span>
                    Início: {formatDate(protocolo.data_inicio)}
                  </span>
                  {protocolo.data_fim && (
                    <>
                      <span className="w-1 h-1 rounded-full bg-[#E8EBE5]" />
                      <span>
                        Fim: {formatDate(protocolo.data_fim)}
                      </span>
                    </>
                  )}
                </div>

                {!protocolo.ativo && (
                  <button
                    onClick={() => ativarMutation.mutate(protocolo.id)}
                    disabled={ativarMutation.isPending}
                    className="mt-3 w-full py-2 rounded-lg bg-[#2F5641]/10 text-[#2F5641] text-xs font-semibold active:scale-[0.98] transition-all disabled:opacity-40"
                    data-testid={`button-ativar-${protocolo.id}`}
                  >
                    {ativarMutation.isPending ? (
                      <Loader2
                        size={14}
                        className="animate-spin mx-auto"
                      />
                    ) : (
                      "Ativar Protocolo"
                    )}
                  </button>
                )}
              </div>
            </motion.div>
          ))}
        </div>
      )}

      <AnimatePresence>
        {showCreateModal && (
          <CreateProtocoloModal
            onClose={() => setShowCreateModal(false)}
            onSubmit={(payload) => criarProtocoloMutation.mutate(payload)}
            isPending={criarProtocoloMutation.isPending}
          />
        )}
      </AnimatePresence>
    </motion.main>
  );
}

function CreateProtocoloModal({
  onClose,
  onSubmit,
  isPending,
}: {
  onClose: () => void;
  onSubmit: (payload: any) => void;
  isPending: boolean;
}) {
  const today = new Date().toISOString().split("T")[0];
  const [nome, setNome] = useState("");
  const [objetivo, setObjetivo] = useState("");
  const [dataInicio, setDataInicio] = useState(today);
  const [itens, setItens] = useState<NovoItemProtocolo[]>([
    { suplemento_nome: "", dosagem: "", quantidade_por_dose: 1, instrucoes: "", horarios: ["08:00"] },
  ]);

  const addItem = () => {
    setItens([
      ...itens,
      { suplemento_nome: "", dosagem: "", quantidade_por_dose: 1, instrucoes: "", horarios: ["08:00"] },
    ]);
  };

  const removeItem = (idx: number) => {
    if (itens.length <= 1) return;
    setItens(itens.filter((_, i) => i !== idx));
  };

  const updateItem = (idx: number, field: keyof NovoItemProtocolo, value: any) => {
    const updated = [...itens];
    (updated[idx] as any)[field] = value;
    setItens(updated);
  };

  const addHorario = (idx: number) => {
    const updated = [...itens];
    updated[idx].horarios.push("08:00");
    setItens(updated);
  };

  const removeHorario = (itemIdx: number, horIdx: number) => {
    const updated = [...itens];
    if (updated[itemIdx].horarios.length <= 1) return;
    updated[itemIdx].horarios = updated[itemIdx].horarios.filter((_, i) => i !== horIdx);
    setItens(updated);
  };

  const updateHorario = (itemIdx: number, horIdx: number, value: string) => {
    const updated = [...itens];
    updated[itemIdx].horarios[horIdx] = value;
    setItens(updated);
  };

  const canSubmit = nome.trim() && itens.every((it) => it.suplemento_nome.trim() && it.dosagem.trim());

  const handleSubmit = () => {
    if (!canSubmit) return;
    const payload = {
      nome: nome.trim(),
      objetivo: objetivo.trim(),
      data_inicio: dataInicio,
      itens: itens.map((it, idx) => ({
        suplemento_nome: it.suplemento_nome.trim(),
        dosagem: it.dosagem.trim(),
        quantidade_por_dose: Math.max(1, it.quantidade_por_dose),
        instrucoes: it.instrucoes.trim(),
        ordem: idx + 1,
        horarios: it.horarios.map((h) => ({
          horario: h,
          dias_semana: [0, 1, 2, 3, 4, 5, 6],
        })),
      })),
    };
    onSubmit(payload);
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-end justify-center"
      data-testid="modal-criar-protocolo"
    >
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <motion.div
        initial={{ y: "100%" }}
        animate={{ y: 0 }}
        exit={{ y: "100%" }}
        transition={{ type: "spring", damping: 25, stiffness: 300 }}
        className="relative w-full max-w-[430px] bg-[#FAFBF8] rounded-t-3xl max-h-[85vh] overflow-y-auto"
      >
        <div className="sticky top-0 bg-[#FAFBF8] px-6 pt-6 pb-4 border-b border-[#E8EBE5] z-10">
          <div className="flex items-center justify-between mb-1">
            <h2 className="font-display text-lg font-semibold text-[#2F5641]">
              Novo Protocolo de Suplementação
            </h2>
            <button
              onClick={onClose}
              className="w-8 h-8 rounded-full bg-[#F5F3EE] flex items-center justify-center text-[#8B9286]"
              data-testid="button-close-modal"
            >
              <X size={18} />
            </button>
          </div>
        </div>

        <div className="px-6 py-4 space-y-4">
          <div>
            <label className="text-xs font-semibold text-[#2F5641] mb-1 block">
              Nome do protocolo
            </label>
            <input
              type="text"
              value={nome}
              onChange={(e) => setNome(e.target.value)}
              placeholder="Ex.: Recuperação muscular, Imunidade, Foco"
              className="w-full px-4 py-3 rounded-xl border border-[#E8EBE5] bg-white text-sm text-[#2F5641] placeholder-[#8B9286]/60 focus:outline-none focus:ring-2 focus:ring-[#2F5641]/20"
              data-testid="input-protocolo-nome"
            />
            <p className="text-[10px] text-[#8B9286] mt-1.5 px-1">
              Dê um nome que identifique o objetivo geral do protocolo.
            </p>
          </div>

          <div>
            <label className="text-xs font-semibold text-[#2F5641] mb-1 block">
              Objetivo (opcional)
            </label>
            <input
              type="text"
              value={objetivo}
              onChange={(e) => setObjetivo(e.target.value)}
              placeholder="Ex.: Reduzir inflamação pós-treino e acelerar recuperação"
              className="w-full px-4 py-3 rounded-xl border border-[#E8EBE5] bg-white text-sm text-[#2F5641] placeholder-[#8B9286]/60 focus:outline-none focus:ring-2 focus:ring-[#2F5641]/20"
              data-testid="input-protocolo-objetivo"
            />
            <p className="text-[10px] text-[#8B9286] mt-1.5 px-1">
              Descreva o que você quer alcançar com este conjunto de suplementos.
            </p>
          </div>

          <div>
            <label className="text-xs font-semibold text-[#2F5641] mb-1 block">
              Início do protocolo
            </label>
            <input
              type="date"
              value={dataInicio}
              onChange={(e) => setDataInicio(e.target.value)}
              className="w-full px-4 py-3 rounded-xl border border-[#E8EBE5] bg-white text-sm text-[#2F5641] focus:outline-none focus:ring-2 focus:ring-[#2F5641]/20"
              data-testid="input-protocolo-data-inicio"
            />
            <p className="text-[10px] text-[#8B9286] mt-1.5 px-1">
              O protocolo só começa a aparecer na sua agenda a partir desta data.
            </p>
          </div>

          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-xs font-semibold text-[#2F5641]">
                Itens do protocolo
              </label>
              <button
                onClick={addItem}
                className="text-xs font-semibold text-[#C7AE6A] flex items-center gap-1"
                data-testid="button-add-item"
              >
                <Plus size={14} />
                Adicionar suplemento
              </button>
            </div>

            {itens.length === 0 ? (
              <div className="py-6 text-center">
                <p className="text-xs text-[#8B9286]">
                  Nenhum suplemento adicionado ainda. Clique em "+ Adicionar suplemento" para começar.
                </p>
              </div>
            ) : (
            <div className="space-y-4">
              {itens.map((item, idx) => (
                <div
                  key={idx}
                  className="bg-white rounded-xl border border-[#E8EBE5] p-4 space-y-3"
                  data-testid={`item-protocolo-${idx}`}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-bold text-[#8B9286] uppercase tracking-wider">
                      Item {idx + 1}
                    </span>
                    {itens.length > 1 && (
                      <button
                        onClick={() => removeItem(idx)}
                        className="text-[#D97952] p-1"
                        data-testid={`button-remove-item-${idx}`}
                      >
                        <Trash2 size={14} />
                      </button>
                    )}
                  </div>

                  <input
                    type="text"
                    value={item.suplemento_nome}
                    onChange={(e) => updateItem(idx, "suplemento_nome", e.target.value)}
                    placeholder="Nome do suplemento (ex.: Creatina, Vitamina D)"
                    className="w-full px-3 py-2 rounded-lg border border-[#E8EBE5] text-sm text-[#2F5641] placeholder-[#8B9286]/60 focus:outline-none focus:ring-2 focus:ring-[#2F5641]/20"
                    data-testid={`input-item-nome-${idx}`}
                  />

                  <input
                    type="text"
                    value={item.dosagem}
                    onChange={(e) => updateItem(idx, "dosagem", e.target.value)}
                    placeholder="Dosagem (ex.: 5g, 500mg, 1 cápsula)"
                    className="w-full px-3 py-2 rounded-lg border border-[#E8EBE5] text-sm text-[#2F5641] placeholder-[#8B9286]/60 focus:outline-none focus:ring-2 focus:ring-[#2F5641]/20"
                    data-testid={`input-item-dosagem-${idx}`}
                  />

                  <div>
                    <label className="text-[10px] font-semibold text-[#8B9286] mb-1 block">
                      Unidades por dose
                    </label>
                    <input
                      type="number"
                      min={1}
                      value={item.quantidade_por_dose}
                      onChange={(e) =>
                        updateItem(idx, "quantidade_por_dose", Math.max(1, parseInt(e.target.value) || 1))
                      }
                      className="w-20 px-3 py-2 rounded-lg border border-[#E8EBE5] text-sm text-[#2F5641] text-center focus:outline-none focus:ring-2 focus:ring-[#2F5641]/20"
                      data-testid={`input-item-qtd-${idx}`}
                    />
                    <p className="text-[10px] text-[#8B9286] mt-1 px-1">
                      Quantas unidades você toma de uma vez? (padrão: 1)
                    </p>
                  </div>

                  <input
                    type="text"
                    value={item.instrucoes}
                    onChange={(e) => updateItem(idx, "instrucoes", e.target.value)}
                    placeholder="Instruções opcionais (ex.: Tomar com refeição, evitar em jejum)"
                    className="w-full px-3 py-2 rounded-lg border border-[#E8EBE5] text-sm text-[#2F5641] placeholder-[#8B9286]/60 focus:outline-none focus:ring-2 focus:ring-[#2F5641]/20"
                    data-testid={`input-item-instrucoes-${idx}`}
                  />

                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-[10px] font-semibold text-[#8B9286]">
                        Horários de ingestão
                      </span>
                      <button
                        onClick={() => addHorario(idx)}
                        className="text-[10px] font-semibold text-[#C7AE6A]"
                        data-testid={`button-add-horario-${idx}`}
                      >
                        + Adicionar horário
                      </button>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {item.horarios.map((h, hIdx) => (
                        <div key={hIdx} className="flex items-center gap-1">
                          <input
                            type="time"
                            value={h}
                            onChange={(e) => updateHorario(idx, hIdx, e.target.value)}
                            className="px-2 py-1.5 rounded-lg border border-[#E8EBE5] text-xs text-[#2F5641] focus:outline-none focus:ring-2 focus:ring-[#2F5641]/20"
                            data-testid={`input-horario-${idx}-${hIdx}`}
                          />
                          {item.horarios.length > 1 && (
                            <button
                              onClick={() => removeHorario(idx, hIdx)}
                              className="text-[#D97952] p-0.5"
                              data-testid={`button-remove-horario-${idx}-${hIdx}`}
                            >
                              <X size={12} />
                            </button>
                          )}
                        </div>
                      ))}
                    </div>
                    <p className="text-[10px] text-[#8B9286] mt-1.5 px-1">
                      Defina os horários em que este suplemento deve ser tomado. Você receberá lembretes conforme a agenda do dia.
                    </p>
                  </div>
                </div>
              ))}
            </div>
            )}
          </div>
        </div>

        <div className="sticky bottom-0 bg-[#FAFBF8] px-6 py-4 border-t border-[#E8EBE5]">
          <div className="flex gap-3">
            <button
              onClick={onClose}
              className="flex-1 py-3.5 rounded-xl border border-[#E8EBE5] bg-white text-[#2F5641] text-sm font-semibold active:scale-[0.98] transition-all"
              data-testid="button-cancel-protocolo"
            >
              Cancelar
            </button>
            <button
              onClick={handleSubmit}
              disabled={!canSubmit || isPending}
              className="flex-[2] py-3.5 rounded-xl bg-[#2F5641] text-white text-sm font-semibold flex items-center justify-center gap-2 shadow-sm shadow-[#2F5641]/20 active:scale-[0.98] transition-all disabled:opacity-40"
              data-testid="button-submit-protocolo"
            >
              {isPending ? (
                <Loader2 size={18} className="animate-spin" />
              ) : (
                "Salvar protocolo"
              )}
            </button>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
}

function EstoqueTab({ setErrorMessage }: { setErrorMessage: (msg: string | null) => void }) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editQtdAtual, setEditQtdAtual] = useState<number>(0);
  const [editQtdMinima, setEditQtdMinima] = useState<number>(0);

  const {
    data: estoque,
    isLoading,
    isError,
    refetch,
  } = useQuery<EstoqueItem[]>({
    queryKey: ["/api/nutricao/suplementacao/estoque"],
    queryFn: async () => {
      const res = await apiFetch("/api/nutricao/suplementacao/estoque");
      if (!res.ok) throw new Error("Erro ao buscar estoque");
      return res.json();
    },
    enabled: !!user,
  });

  const updateEstoqueMutation = useMutation({
    mutationFn: async ({
      suplementoId,
      quantidade_atual,
      quantidade_minima,
    }: {
      suplementoId: number;
      quantidade_atual: number;
      quantidade_minima: number;
    }) => {
      const res = await apiFetch(
        `/api/nutricao/suplementacao/estoque/${suplementoId}`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ quantidade_atual, quantidade_minima }),
        }
      );
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.erro || err.detail || "Erro ao atualizar estoque");
      }
      return res.json();
    },
    onSuccess: () => {
      setEditingId(null);
      queryClient.invalidateQueries({
        queryKey: ["/api/nutricao/suplementacao/estoque"],
      });
    },
    onError: (error: Error) => {
      setErrorMessage(error.message);
    },
  });

  const startEditing = (item: EstoqueItem) => {
    setEditingId(item.suplemento.id);
    setEditQtdAtual(item.quantidade_atual);
    setEditQtdMinima(item.quantidade_minima);
  };

  const cancelEditing = () => {
    setEditingId(null);
  };

  const saveEditing = (suplementoId: number) => {
    updateEstoqueMutation.mutate({
      suplementoId,
      quantidade_atual: editQtdAtual,
      quantidade_minima: editQtdMinima,
    });
  };

  return (
    <motion.main
      key="estoque"
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 20 }}
      transition={{ duration: 0.2 }}
      className="px-6 space-y-4"
    >
      <div className="flex items-center gap-2 mb-2">
        <Package size={14} className="text-[#8B9286]" />
        <span className="text-[10px] font-bold uppercase tracking-wider text-[#8B9286]">
          Estoque de Suplementos
        </span>
      </div>

      {isError ? (
        <div
          className="flex flex-col items-center justify-center py-12 gap-4"
          data-testid="error-estoque"
        >
          <AlertCircle className="w-12 h-12 text-[#D97952]" />
          <p className="text-sm text-[#D97952] text-center">
            Não foi possível carregar o estoque.
          </p>
          <button
            onClick={() => refetch()}
            className="bg-[#2F5641] text-white px-6 py-2 rounded-xl text-sm font-medium"
            data-testid="button-retry-estoque"
          >
            Tentar novamente
          </button>
        </div>
      ) : isLoading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <SkeletonCard key={i} />
          ))}
        </div>
      ) : !estoque || estoque.length === 0 ? (
        <div
          className="flex flex-col items-center justify-center py-16 gap-4"
          data-testid="empty-estoque"
        >
          <div className="w-20 h-20 rounded-full bg-[#F5F3EE] flex items-center justify-center">
            <Package size={32} className="text-[#8B9286]" />
          </div>
          <div className="text-center">
            <p className="text-sm font-semibold text-[#2F5641] mb-1">
              Nenhum suplemento no estoque
            </p>
            <p className="text-xs text-[#8B9286] max-w-[260px]">
              Registre uma tomada para que o estoque apareça automaticamente.
            </p>
          </div>
        </div>
      ) : (
        <div className="space-y-3">
          {estoque.map((item, index) => {
            const isLow = item.quantidade_atual <= item.quantidade_minima;
            const isEditing = editingId === item.suplemento.id;

            return (
              <motion.div
                key={item.suplemento.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05 }}
                className={`bg-white rounded-2xl border shadow-sm overflow-hidden ${
                  isLow && !isEditing
                    ? "border-[#D97952]/30 bg-[#D97952]/5"
                    : isEditing
                    ? "border-[#C7AE6A]/50"
                    : "border-[#E8EBE5]"
                }`}
                data-testid={`card-estoque-${item.suplemento.id}`}
              >
                <div className="p-4">
                  {isEditing ? (
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <h3 className="font-semibold text-sm text-[#2F5641]">
                          {item.suplemento.nome}
                        </h3>
                        <div className="flex items-center gap-2">
                          <button
                            onClick={cancelEditing}
                            className="w-8 h-8 rounded-full flex items-center justify-center border border-[#E8EBE5] text-[#8B9286]"
                            data-testid={`button-cancel-edit-${item.suplemento.id}`}
                          >
                            <XCircle size={14} />
                          </button>
                          <button
                            onClick={() => saveEditing(item.suplemento.id)}
                            disabled={updateEstoqueMutation.isPending}
                            className="w-8 h-8 rounded-full flex items-center justify-center bg-[#2F5641] text-white disabled:opacity-40"
                            data-testid={`button-save-edit-${item.suplemento.id}`}
                          >
                            {updateEstoqueMutation.isPending ? (
                              <Loader2 size={14} className="animate-spin" />
                            ) : (
                              <Save size={14} />
                            )}
                          </button>
                        </div>
                      </div>
                      <div className="flex gap-3">
                        <div className="flex-1">
                          <label className="text-[10px] font-semibold text-[#8B9286] mb-1 block">
                            Qtd. Atual
                          </label>
                          <input
                            type="number"
                            min={0}
                            value={editQtdAtual}
                            onChange={(e) => setEditQtdAtual(Math.max(0, parseInt(e.target.value) || 0))}
                            className="w-full px-3 py-2 rounded-lg border border-[#E8EBE5] text-sm text-[#2F5641] text-center focus:outline-none focus:ring-2 focus:ring-[#2F5641]/20"
                            data-testid={`input-estoque-atual-${item.suplemento.id}`}
                          />
                        </div>
                        <div className="flex-1">
                          <label className="text-[10px] font-semibold text-[#8B9286] mb-1 block">
                            Qtd. Mínima
                          </label>
                          <input
                            type="number"
                            min={0}
                            value={editQtdMinima}
                            onChange={(e) => setEditQtdMinima(Math.max(0, parseInt(e.target.value) || 0))}
                            className="w-full px-3 py-2 rounded-lg border border-[#E8EBE5] text-sm text-[#2F5641] text-center focus:outline-none focus:ring-2 focus:ring-[#2F5641]/20"
                            data-testid={`input-estoque-minima-${item.suplemento.id}`}
                          />
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div
                      className="flex items-center gap-4 cursor-pointer"
                      onClick={() => startEditing(item)}
                    >
                      <div
                        className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                          isLow
                            ? "bg-[#D97952]/10 text-[#D97952]"
                            : "bg-[#F5F3EE] text-[#8B9286]"
                        }`}
                      >
                        {isLow ? (
                          <AlertTriangle size={18} />
                        ) : (
                          <Package size={18} />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <h3 className="font-semibold text-sm text-[#2F5641] truncate">
                          {item.suplemento.nome}
                        </h3>
                        <div className="flex items-center gap-2 mt-0.5">
                          {item.suplemento.marca && (
                            <span className="text-[10px] text-[#8B9286]">
                              {item.suplemento.marca}
                            </span>
                          )}
                          {item.suplemento.forma && (
                            <>
                              {item.suplemento.marca && (
                                <span className="w-1 h-1 rounded-full bg-[#E8EBE5]" />
                              )}
                              <span className="text-[10px] text-[#8B9286]">
                                {item.suplemento.forma}
                              </span>
                            </>
                          )}
                        </div>
                      </div>
                      <div className="text-right shrink-0">
                        <div className="flex items-baseline gap-1">
                          <span
                            className={`text-lg font-bold ${
                              isLow ? "text-[#D97952]" : "text-[#2F5641]"
                            }`}
                          >
                            {item.quantidade_atual}
                          </span>
                          <span className="text-[10px] text-[#8B9286]">
                            un.
                          </span>
                        </div>
                        <span className="text-[9px] text-[#8B9286]">
                          mín: {item.quantidade_minima}
                        </span>
                        {isLow && (
                          <div className="mt-0.5">
                            <span className="text-[8px] font-bold text-[#D97952] uppercase">
                              Estoque baixo
                            </span>
                          </div>
                        )}
                      </div>
                      <Edit3 size={14} className="text-[#8B9286] shrink-0" />
                    </div>
                  )}
                </div>
              </motion.div>
            );
          })}
        </div>
      )}
    </motion.main>
  );
}

function HistoricoTab() {
  const { user } = useAuth();
  const [dias, setDias] = useState<7 | 30>(7);

  const {
    data: historico,
    isLoading,
    isError,
    refetch,
  } = useQuery<HistoricoResponse>({
    queryKey: ["/api/nutricao/suplementacao/historico", dias],
    queryFn: async () => {
      const res = await apiFetch(
        `/api/nutricao/suplementacao/historico?dias=${dias}`
      );
      if (!res.ok) throw new Error("Erro ao buscar histórico");
      return res.json();
    },
    enabled: !!user,
  });

  const groupedByDate = (historico?.registros || []).reduce<
    Record<string, HistoricoRegistro[]>
  >((acc, reg) => {
    const date = reg.horario_planejado.split("T")[0];
    if (!acc[date]) acc[date] = [];
    acc[date].push(reg);
    return acc;
  }, {});

  const sortedDates = Object.keys(groupedByDate).sort((a, b) =>
    b.localeCompare(a)
  );

  const statusBadge = (status: HistoricoRegistro["status"]) => {
    switch (status) {
      case "tomado":
        return (
          <span className="text-[9px] font-bold bg-[#648D4A]/10 text-[#648D4A] px-2 py-0.5 rounded-full uppercase">
            Tomado
          </span>
        );
      case "adiado":
        return (
          <span className="text-[9px] font-bold bg-[#C7AE6A]/10 text-[#C7AE6A] px-2 py-0.5 rounded-full uppercase">
            Adiado
          </span>
        );
      case "ignorado":
        return (
          <span className="text-[9px] font-bold bg-[#8B9286]/10 text-[#8B9286] px-2 py-0.5 rounded-full uppercase">
            Ignorado
          </span>
        );
    }
  };

  return (
    <motion.main
      key="historico"
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 20 }}
      transition={{ duration: 0.2 }}
      className="px-6 space-y-4"
    >
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <History size={14} className="text-[#8B9286]" />
          <span className="text-[10px] font-bold uppercase tracking-wider text-[#8B9286]">
            Histórico
          </span>
        </div>
        <div className="flex bg-[#F5F3EE] p-0.5 rounded-lg">
          <button
            onClick={() => setDias(7)}
            className={`px-3 py-1.5 text-[10px] font-semibold rounded-md transition-all ${
              dias === 7
                ? "bg-white text-[#2F5641] shadow-sm"
                : "text-[#8B9286]"
            }`}
            data-testid="button-historico-7d"
          >
            7 dias
          </button>
          <button
            onClick={() => setDias(30)}
            className={`px-3 py-1.5 text-[10px] font-semibold rounded-md transition-all ${
              dias === 30
                ? "bg-white text-[#2F5641] shadow-sm"
                : "text-[#8B9286]"
            }`}
            data-testid="button-historico-30d"
          >
            30 dias
          </button>
        </div>
      </div>

      {isError ? (
        <div
          className="flex flex-col items-center justify-center py-12 gap-4"
          data-testid="error-historico"
        >
          <AlertCircle className="w-12 h-12 text-[#D97952]" />
          <p className="text-sm text-[#D97952] text-center">
            Não foi possível carregar o histórico.
          </p>
          <button
            onClick={() => refetch()}
            className="bg-[#2F5641] text-white px-6 py-2 rounded-xl text-sm font-medium"
            data-testid="button-retry-historico"
          >
            Tentar novamente
          </button>
        </div>
      ) : isLoading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <SkeletonCard key={i} />
          ))}
        </div>
      ) : sortedDates.length === 0 ? (
        <div
          className="flex flex-col items-center justify-center py-16 gap-4"
          data-testid="empty-historico"
        >
          <div className="w-20 h-20 rounded-full bg-[#F5F3EE] flex items-center justify-center">
            <History size={32} className="text-[#8B9286]" />
          </div>
          <div className="text-center">
            <p className="text-sm font-semibold text-[#2F5641] mb-1">
              Nenhum registro encontrado
            </p>
            <p className="text-xs text-[#8B9286] max-w-[260px]">
              Seus registros de suplementação aparecerão aqui após tomar,
              adiar ou ignorar um suplemento.
            </p>
          </div>
        </div>
      ) : (
        <div className="space-y-6">
          {sortedDates.map((date) => {
            const records = groupedByDate[date];
            const formattedDate = new Date(date + "T12:00:00").toLocaleDateString(
              "pt-BR",
              {
                weekday: "short",
                day: "2-digit",
                month: "short",
              }
            );

            return (
              <div key={date}>
                <div className="flex items-center gap-3 mb-3">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-[#8B9286]">
                    {formattedDate}
                  </span>
                  <div className="flex-1 h-px bg-[#E8EBE5]" />
                  <span className="text-[10px] text-[#8B9286]">
                    {records.length} registro{records.length !== 1 ? "s" : ""}
                  </span>
                </div>

                <div className="space-y-2">
                  {records.map((reg, idx) => (
                    <motion.div
                      key={reg.id}
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: idx * 0.03 }}
                      className="bg-white rounded-xl border border-[#E8EBE5] p-3"
                      data-testid={`card-historico-${reg.id}`}
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <h4 className="font-semibold text-sm text-[#2F5641] truncate">
                              {reg.suplemento_nome}
                            </h4>
                            {statusBadge(reg.status)}
                          </div>
                          <div className="flex items-center gap-2 mt-1">
                            <span className="text-xs text-[#8B9286]">
                              {reg.dosagem}
                            </span>
                          </div>
                          <div className="flex items-center gap-3 mt-1.5 text-[10px] text-[#8B9286]">
                            <span>
                              Planejado: {formatTime(reg.horario_planejado.split("T")[1] || reg.horario_planejado)}
                            </span>
                            <span>
                              Registrado: {formatDateTime(reg.registrado_em)}
                            </span>
                          </div>
                          {reg.observacao && (
                            <p className="text-[10px] text-[#8B9286] mt-1 italic">
                              "{reg.observacao}"
                            </p>
                          )}
                        </div>
                      </div>
                    </motion.div>
                  ))}
                </div>
              </div>
            );
          })}

          {historico && (
            <div className="text-center py-2">
              <span className="text-[10px] text-[#8B9286]">
                {historico.total} registro{historico.total !== 1 ? "s" : ""} nos
                últimos {dias} dias
              </span>
            </div>
          )}
        </div>
      )}
    </motion.main>
  );
}
