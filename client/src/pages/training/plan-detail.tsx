import Layout from "@/components/layout";
import {
  ChevronLeft,
  Pencil,
  Trash2,
  Plus,
  Play,
  Loader2,
  AlertCircle,
  X,
  Search,
  Dumbbell,
  Timer,
  Weight,
  Repeat,
  Layers,
} from "lucide-react";
import { useLocation, useParams } from "wouter";
import { useState } from "react";
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

interface Exercicio {
  id: number;
  nome: string;
  grupo_muscular: string;
  observacoes: string;
  personalizado: boolean;
  criado_em: string;
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

function formatDescanso(segundos: number): string {
  if (segundos < 60) return `${segundos}s`;
  const min = Math.floor(segundos / 60);
  const sec = segundos % 60;
  return sec > 0 ? `${min}:${String(sec).padStart(2, "0")}` : `${min}min`;
}

function formatCarga(carga: string): string {
  if (!carga || carga === "0" || carga === "0.0") return "—";
  const num = parseFloat(carga);
  if (isNaN(num)) return "—";
  return `${num % 1 === 0 ? num.toFixed(0) : num.toFixed(1)} kg`;
}

export default function PlanDetailScreen() {
  const [, setLocation] = useLocation();
  const params = useParams<{ planoId: string }>();
  const planoId = Number(params.planoId);
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const { toast } = useToast();

  const [showEditPlan, setShowEditPlan] = useState(false);
  const [editNome, setEditNome] = useState("");
  const [editObjetivo, setEditObjetivo] = useState("");

  const [showEditItem, setShowEditItem] = useState(false);
  const [editingItem, setEditingItem] = useState<PlanoItem | null>(null);
  const [editSeries, setEditSeries] = useState("");
  const [editRepeticoes, setEditRepeticoes] = useState("");
  const [editCarga, setEditCarga] = useState("");
  const [editDescanso, setEditDescanso] = useState("");
  const [editObs, setEditObs] = useState("");

  const [showAddExercicio, setShowAddExercicio] = useState(false);
  const [exercicioSearch, setExercicioSearch] = useState("");

  const planQueryKey = ["treino", "plano", planoId] as const;

  const {
    data: plano,
    isLoading,
    isError,
    refetch,
  } = useQuery<Plano>({
    queryKey: planQueryKey,
    queryFn: async () => {
      const res = await apiFetch(`/api/treino/planos/${planoId}`);
      if (res.status === 403 || res.status === 404) {
        const err = await res.json().catch(() => ({}));
        throw { status: res.status, ...err };
      }
      if (!res.ok) throw new Error("Erro ao buscar plano");
      return res.json();
    },
    enabled: !!user && !isNaN(planoId),
  });

  const { data: exerciciosData, isLoading: loadingExercicios } = useQuery<{
    itens: Exercicio[];
    total_itens: number;
  }>({
    queryKey: ["treino", "exercicios"],
    queryFn: async () => {
      const res = await apiFetch("/api/treino/exercicios");
      if (!res.ok) throw new Error("Erro ao buscar exercícios");
      return res.json();
    },
    enabled: !!user && showAddExercicio,
  });

  const updatePlanMutation = useMutation({
    mutationFn: async (body: Partial<{ nome: string; objetivo: string; ativo: boolean }>) => {
      const res = await apiFetch(`/api/treino/planos/${planoId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        const err = await res.json();
        throw { status: res.status, ...err };
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: planQueryKey });
      setShowEditPlan(false);
      toast({ title: "Plano atualizado" });
    },
    onError: (err: any) => {
      if (err?.status === 403 || err?.status === 404) {
        toast({ title: "Erro", description: "Plano não encontrado ou sem permissão.", variant: "destructive" });
        setLocation("/training");
        return;
      }
      if (isApiError422(err)) {
        toast({ title: "Erro de validação", description: err.errors.map((e) => e.message).join("; "), variant: "destructive" });
      } else {
        toast({ title: "Erro", description: "Não foi possível atualizar o plano.", variant: "destructive" });
      }
    },
  });

  const addItemMutation = useMutation({
    mutationFn: async (body: { exercicio_id: number; series?: number; repeticoes?: number; descanso_segundos?: number }) => {
      const res = await apiFetch(`/api/treino/planos/${planoId}/itens`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        const err = await res.json();
        throw { status: res.status, ...err };
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: planQueryKey });
      setShowAddExercicio(false);
      setExercicioSearch("");
      toast({ title: "Exercício adicionado" });
    },
    onError: (err: any) => {
      if (err?.status === 403 || err?.status === 404) {
        toast({ title: "Erro", description: "Plano não encontrado ou sem permissão.", variant: "destructive" });
        setLocation("/training");
        return;
      }
      if (isApiError422(err)) {
        toast({ title: "Erro de validação", description: err.errors.map((e) => e.message).join("; "), variant: "destructive" });
      } else {
        toast({ title: "Erro", description: "Não foi possível adicionar exercício.", variant: "destructive" });
      }
    },
  });

  const updateItemMutation = useMutation({
    mutationFn: async ({ itemId, body }: { itemId: number; body: Partial<PlanoItem> }) => {
      const res = await apiFetch(`/api/treino/itens/${itemId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        const err = await res.json();
        throw { status: res.status, ...err };
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: planQueryKey });
      setShowEditItem(false);
      setEditingItem(null);
      toast({ title: "Exercício atualizado" });
    },
    onError: (err: any) => {
      if (err?.status === 403 || err?.status === 404) {
        toast({ title: "Erro", description: "Item não encontrado ou sem permissão.", variant: "destructive" });
        return;
      }
      if (isApiError422(err)) {
        toast({ title: "Erro de validação", description: err.errors.map((e) => e.message).join("; "), variant: "destructive" });
      } else {
        toast({ title: "Erro", description: "Não foi possível atualizar exercício.", variant: "destructive" });
      }
    },
  });

  const deleteItemMutation = useMutation({
    mutationFn: async (itemId: number) => {
      const res = await apiFetch(`/api/treino/itens/${itemId}`, { method: "DELETE" });
      if (!res.ok) {
        const err = await res.json();
        throw { status: res.status, ...err };
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: planQueryKey });
      toast({ title: "Exercício removido" });
    },
    onError: (err: any) => {
      if (err?.status === 403) {
        toast({ title: "Acesso negado", description: "Você não tem permissão para remover este item.", variant: "destructive" });
      } else if (err?.status === 404) {
        toast({ title: "Não encontrado", description: "Este item já foi removido.", variant: "destructive" });
        queryClient.invalidateQueries({ queryKey: planQueryKey });
      } else {
        toast({ title: "Erro", description: "Não foi possível remover. Tente novamente.", variant: "destructive" });
      }
    },
  });

  const openEditPlan = () => {
    if (!plano) return;
    setEditNome(plano.nome);
    setEditObjetivo(plano.objetivo || "");
    setShowEditPlan(true);
  };

  const handleSavePlan = () => {
    const body: Partial<{ nome: string; objetivo: string }> = {};
    if (editNome.trim() && editNome !== plano?.nome) body.nome = editNome.trim();
    if (editObjetivo !== (plano?.objetivo || "")) body.objetivo = editObjetivo.trim();
    if (Object.keys(body).length === 0) {
      setShowEditPlan(false);
      return;
    }
    updatePlanMutation.mutate(body);
  };

  const openEditItem = (item: PlanoItem) => {
    setEditingItem(item);
    setEditSeries(String(item.series));
    setEditRepeticoes(String(item.repeticoes));
    setEditCarga(item.carga_kg || "");
    setEditDescanso(String(item.descanso_segundos));
    setEditObs(item.observacoes || "");
    setShowEditItem(true);
  };

  const handleSaveItem = () => {
    if (!editingItem) return;
    const body: Record<string, unknown> = {};
    const s = parseInt(editSeries);
    const r = parseInt(editRepeticoes);
    const d = parseInt(editDescanso);
    if (!isNaN(s) && s !== editingItem.series) body.series = s;
    if (!isNaN(r) && r !== editingItem.repeticoes) body.repeticoes = r;
    if (!isNaN(d) && d !== editingItem.descanso_segundos) body.descanso_segundos = d;
    if (editCarga !== (editingItem.carga_kg || "")) body.carga_kg = editCarga;
    if (editObs !== (editingItem.observacoes || "")) body.observacoes = editObs;
    if (Object.keys(body).length === 0) {
      setShowEditItem(false);
      setEditingItem(null);
      return;
    }
    updateItemMutation.mutate({ itemId: editingItem.id, body });
  };

  const handleAddExercicio = (exercicio: Exercicio) => {
    addItemMutation.mutate({
      exercicio_id: exercicio.id,
      series: 3,
      repeticoes: 10,
      descanso_segundos: 60,
    });
  };

  const handleToggleAtivo = () => {
    if (!plano) return;
    updatePlanMutation.mutate({ ativo: !plano.ativo });
  };

  const filteredExercicios = exerciciosData?.itens?.filter((e) =>
    e.nome.toLowerCase().includes(exercicioSearch.toLowerCase())
  ) || [];

  if (isError) {
    return (
      <Layout>
        <div className="min-h-screen flex flex-col items-center justify-center px-6 gap-4" data-testid="error-plan-detail">
          <AlertCircle className="w-12 h-12 text-[#BE4E35]" />
          <p className="text-sm text-[#BE4E35] text-center">Não foi possível carregar o plano de treino.</p>
          <button
            onClick={() => refetch()}
            className="bg-[#2F5641] text-white px-6 py-2 rounded-xl text-sm font-medium"
            data-testid="button-retry"
          >
            Tentar novamente
          </button>
          <button
            onClick={() => setLocation("/training")}
            className="text-sm text-[#8B9286] underline"
            data-testid="button-back-error"
          >
            Voltar
          </button>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="bg-[#FAFBF8] min-h-screen pb-32">
        <header className="px-6 pt-14 pb-4 flex items-center justify-between sticky top-0 bg-[#FAFBF8]/95 backdrop-blur-sm z-10">
          <button
            data-testid="button-back"
            onClick={() => setLocation("/training")}
            className="w-10 h-10 -ml-2 flex items-center justify-center text-[#2F5641]"
          >
            <ChevronLeft size={24} />
          </button>
          <h1 className="font-display text-lg font-semibold text-[#2F5641] truncate max-w-[200px]" data-testid="text-plan-name">
            {isLoading ? "Carregando..." : plano?.nome || "Plano"}
          </h1>
          <button
            data-testid="button-edit-plan"
            onClick={openEditPlan}
            className="w-10 h-10 flex items-center justify-center text-[#2F5641]"
            disabled={isLoading}
            aria-label="Editar plano"
          >
            <Pencil size={18} />
          </button>
        </header>

        {isLoading ? (
          <div className="flex-1 flex items-center justify-center py-20" data-testid="loading-plan">
            <Loader2 className="w-8 h-8 animate-spin text-[#2F5641]" />
          </div>
        ) : plano ? (
          <main className="px-6 space-y-6">
            <section className="bg-white rounded-2xl border border-[#E8EBE5] p-4" data-testid="section-plan-info">
              <div className="flex items-start justify-between mb-2">
                <div className="flex-1">
                  <h2 className="font-display text-xl font-semibold text-[#2F5641]" data-testid="text-plan-title">
                    {plano.nome}
                  </h2>
                  {plano.objetivo && (
                    <p className="text-sm text-[#8B9286] mt-1" data-testid="text-plan-objetivo">
                      {plano.objetivo}
                    </p>
                  )}
                </div>
              </div>
              <div className="flex items-center justify-between mt-3 pt-3 border-t border-[#E8EBE5]">
                <span className="text-xs font-medium text-[#8B9286] tracking-wider">Status</span>
                <button
                  data-testid="button-toggle-ativo"
                  onClick={handleToggleAtivo}
                  disabled={updatePlanMutation.isPending}
                  className={`px-3 py-1 rounded-full text-xs font-bold transition-colors ${
                    plano.ativo
                      ? "bg-[#2F5641]/10 text-[#2F5641]"
                      : "bg-[#8B9286]/10 text-[#8B9286]"
                  }`}
                >
                  {plano.ativo ? "Ativo" : "Inativo"}
                </button>
              </div>
              {plano.ativo && (
                <p className="text-xs text-[#8B9286] mt-2">Apenas um plano pode estar ativo por vez.</p>
              )}
            </section>

            <section>
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-sm font-bold text-[#2F5641] tracking-wide" data-testid="text-items-count">
                  {(plano.itens?.length || 0) === 0 ? "Exercícios" : (plano.itens?.length || 0) === 1 ? "1 exercício" : `${plano.itens?.length} exercícios`}
                </h2>
                <button
                  data-testid="button-add-exercicio"
                  onClick={() => { setExercicioSearch(""); setShowAddExercicio(true); }}
                  className="flex items-center gap-1.5 text-xs font-semibold text-[#C7AE6A] hover:underline"
                >
                  <Plus size={14} />
                  Adicionar exercício
                </button>
              </div>

              {!plano.itens?.length ? (
                <div className="bg-white rounded-2xl border border-[#E8EBE5] p-8 text-center" data-testid="text-empty-items">
                  <Dumbbell className="w-10 h-10 text-[#E8EBE5] mx-auto mb-3" />
                  <p className="text-sm text-[#8B9286]">Este plano ainda não tem exercícios.</p>
                  <p className="text-xs text-[#8B9286] mt-1">Toque em "+ Adicionar exercício" para montar sua rotina.</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {plano.itens
                    .sort((a, b) => a.ordem - b.ordem)
                    .map((item) => (
                      <motion.div
                        key={item.id}
                        layout
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        data-testid={`card-item-${item.id}`}
                        className="bg-white p-4 rounded-2xl border border-[#E8EBE5] shadow-sm"
                      >
                        <div className="flex items-start justify-between mb-2">
                          <h3 className="font-semibold text-[#2F5641] text-sm flex-1 mr-2" data-testid={`text-exercicio-nome-${item.id}`}>
                            {item.exercicio_nome}
                          </h3>
                          <div className="flex items-center gap-1 shrink-0">
                            <button
                              data-testid={`button-edit-item-${item.id}`}
                              onClick={() => openEditItem(item)}
                              className="w-8 h-8 flex items-center justify-center rounded-full text-[#8B9286] hover:bg-[#E8EBE5] transition-colors"
                            >
                              <Pencil size={14} />
                            </button>
                            <button
                              data-testid={`button-delete-item-${item.id}`}
                              onClick={() => deleteItemMutation.mutate(item.id)}
                              disabled={deleteItemMutation.isPending}
                              className="w-8 h-8 flex items-center justify-center rounded-full text-[#BE4E35]/60 hover:bg-[#BE4E35]/10 transition-colors disabled:opacity-30"
                            >
                              <Trash2 size={14} />
                            </button>
                          </div>
                        </div>
                        <div className="flex items-center gap-3 text-xs text-[#8B9286]">
                          <span className="flex items-center gap-1">
                            <Layers size={12} />
                            {item.series} × {item.repeticoes}
                          </span>
                          <span className="w-1 h-1 rounded-full bg-[#E8EBE5]" />
                          <span className="flex items-center gap-1">
                            <Weight size={12} />
                            {formatCarga(item.carga_kg)}
                          </span>
                          <span className="w-1 h-1 rounded-full bg-[#E8EBE5]" />
                          <span className="flex items-center gap-1">
                            <Timer size={12} />
                            {formatDescanso(item.descanso_segundos)}
                          </span>
                        </div>
                        {item.observacoes && (
                          <p className="text-xs text-[#8B9286] mt-2 italic" data-testid={`text-obs-${item.id}`}>
                            {item.observacoes}
                          </p>
                        )}
                      </motion.div>
                    ))}
                </div>
              )}
            </section>
          </main>
        ) : null}

        <div className="fixed bottom-[84px] left-0 right-0 p-6 bg-gradient-to-t from-[#FAFBF8] via-[#FAFBF8] to-transparent z-40 max-w-[430px] mx-auto">
          {plano?.itens?.length ? (
            <button
              data-testid="button-iniciar-treino"
              onClick={() => setLocation(`/training/player/${planoId}`)}
              disabled={isLoading}
              className="w-full bg-[#2F5641] text-white py-4 rounded-2xl font-semibold text-lg shadow-xl shadow-[#2F5641]/25 flex items-center justify-center gap-3 active:scale-[0.98] transition-transform disabled:opacity-50"
            >
              <Play size={20} fill="white" /> Iniciar treino
            </button>
          ) : (
            <button
              data-testid="button-iniciar-treino"
              disabled
              className="w-full bg-[#2F5641] text-white py-4 rounded-2xl font-semibold text-lg flex items-center justify-center opacity-40 cursor-not-allowed"
            >
              Adicione exercícios para iniciar
            </button>
          )}
        </div>

        <AnimatePresence>
          {showEditPlan && (
            <>
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 bg-black/40 backdrop-blur-sm z-40"
                onClick={() => setShowEditPlan(false)}
              />
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="fixed top-1/2 left-6 right-6 -translate-y-1/2 bg-white rounded-3xl p-6 z-50 max-w-[380px] mx-auto shadow-2xl"
                data-testid="modal-edit-plan"
              >
                <h2 className="text-lg font-bold text-[#2F5641] mb-4 text-center">Editar Plano</h2>
                <div className="space-y-4">
                  <div>
                    <label className="text-[10px] font-bold uppercase tracking-wider text-[#8B9286] mb-1 block">Nome</label>
                    <input
                      data-testid="input-plan-nome"
                      type="text"
                      value={editNome}
                      onChange={(e) => setEditNome(e.target.value)}
                      className="w-full bg-white border border-[#E8EBE5] rounded-xl px-4 py-3 text-sm font-medium text-[#2F5641] focus:outline-none focus:border-[#2F5641]"
                      placeholder="Nome do plano"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-bold uppercase tracking-wider text-[#8B9286] mb-1 block">Objetivo</label>
                    <input
                      data-testid="input-plan-objetivo"
                      type="text"
                      value={editObjetivo}
                      onChange={(e) => setEditObjetivo(e.target.value)}
                      className="w-full bg-white border border-[#E8EBE5] rounded-xl px-4 py-3 text-sm font-medium text-[#2F5641] focus:outline-none focus:border-[#2F5641]"
                      placeholder="Ex.: Hipertrofia, Resistência..."
                    />
                  </div>
                </div>
                <div className="flex gap-3 mt-6">
                  <button
                    data-testid="button-cancel-edit-plan"
                    onClick={() => setShowEditPlan(false)}
                    className="flex-1 border border-[#E8EBE5] text-[#8B9286] py-3 rounded-xl font-semibold text-sm"
                  >
                    Cancelar
                  </button>
                  <button
                    data-testid="button-save-plan"
                    onClick={handleSavePlan}
                    disabled={updatePlanMutation.isPending}
                    className="flex-1 bg-[#2F5641] text-white py-3 rounded-xl font-semibold text-sm disabled:opacity-50"
                  >
                    {updatePlanMutation.isPending ? "Salvando..." : "Salvar"}
                  </button>
                </div>
              </motion.div>
            </>
          )}
        </AnimatePresence>

        <AnimatePresence>
          {showEditItem && editingItem && (
            <motion.div
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              exit={{ y: "100%" }}
              transition={{ type: "spring", damping: 25, stiffness: 200 }}
              className="fixed inset-x-0 bottom-0 bg-white rounded-t-3xl z-[60] shadow-2xl max-w-[430px] mx-auto"
              data-testid="modal-edit-item"
            >
              <div className="px-6 pt-6 pb-2 flex items-center justify-between">
                <h2 className="text-lg font-bold text-[#2F5641]">Editar Exercício</h2>
                <button
                  data-testid="button-close-edit-item"
                  onClick={() => { setShowEditItem(false); setEditingItem(null); }}
                  className="w-10 h-10 flex items-center justify-center rounded-full bg-[#FAFBF8] text-[#2F5641]"
                >
                  <X size={20} />
                </button>
              </div>
              <p className="px-6 text-sm text-[#8B9286] mb-4">{editingItem.exercicio_nome}</p>
              <div className="px-6 space-y-3 pb-4">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-[10px] font-bold uppercase tracking-wider text-[#8B9286] mb-1 block">Séries</label>
                    <input
                      data-testid="input-item-series"
                      type="number"
                      value={editSeries}
                      onChange={(e) => setEditSeries(e.target.value)}
                      min={1}
                      className="w-full bg-[#FAFBF8] border border-[#E8EBE5] rounded-xl px-4 py-3 text-sm font-medium text-[#2F5641] focus:outline-none focus:border-[#2F5641]"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-bold uppercase tracking-wider text-[#8B9286] mb-1 block">Repetições</label>
                    <input
                      data-testid="input-item-repeticoes"
                      type="number"
                      value={editRepeticoes}
                      onChange={(e) => setEditRepeticoes(e.target.value)}
                      min={1}
                      className="w-full bg-[#FAFBF8] border border-[#E8EBE5] rounded-xl px-4 py-3 text-sm font-medium text-[#2F5641] focus:outline-none focus:border-[#2F5641]"
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-[10px] font-bold uppercase tracking-wider text-[#8B9286] mb-1 block">Carga (kg)</label>
                    <input
                      data-testid="input-item-carga"
                      type="text"
                      value={editCarga}
                      onChange={(e) => setEditCarga(e.target.value)}
                      placeholder="0"
                      className="w-full bg-[#FAFBF8] border border-[#E8EBE5] rounded-xl px-4 py-3 text-sm font-medium text-[#2F5641] focus:outline-none focus:border-[#2F5641]"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-bold uppercase tracking-wider text-[#8B9286] mb-1 block">Descanso (s)</label>
                    <input
                      data-testid="input-item-descanso"
                      type="number"
                      value={editDescanso}
                      onChange={(e) => setEditDescanso(e.target.value)}
                      min={0}
                      className="w-full bg-[#FAFBF8] border border-[#E8EBE5] rounded-xl px-4 py-3 text-sm font-medium text-[#2F5641] focus:outline-none focus:border-[#2F5641]"
                    />
                  </div>
                </div>
                <div>
                  <label className="text-[10px] font-bold uppercase tracking-wider text-[#8B9286] mb-1 block">Observações</label>
                  <input
                    data-testid="input-item-obs"
                    type="text"
                    value={editObs}
                    onChange={(e) => setEditObs(e.target.value)}
                    placeholder="Opcional"
                    className="w-full bg-[#FAFBF8] border border-[#E8EBE5] rounded-xl px-4 py-3 text-sm font-medium text-[#2F5641] focus:outline-none focus:border-[#2F5641]"
                  />
                </div>
              </div>
              <div className="px-6 pb-8 pt-2">
                <button
                  data-testid="button-save-item"
                  onClick={handleSaveItem}
                  disabled={updateItemMutation.isPending}
                  className="w-full bg-[#2F5641] text-white py-3.5 rounded-xl font-bold text-base shadow-lg shadow-[#2F5641]/25 active:scale-[0.98] transition-all disabled:opacity-50"
                >
                  {updateItemMutation.isPending ? "Salvando..." : "Salvar Alterações"}
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <AnimatePresence>
          {showAddExercicio && (
            <motion.div
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              exit={{ y: "100%" }}
              transition={{ type: "spring", damping: 25, stiffness: 200 }}
              className="fixed inset-0 bg-[#FAFBF8] z-[60] flex flex-col max-w-[430px] mx-auto"
              data-testid="modal-add-exercicio"
            >
              <div className="px-6 pt-14 pb-2 flex items-center justify-between shrink-0">
                <h2 className="text-lg font-bold text-[#2F5641]">Adicionar Exercício</h2>
                <button
                  data-testid="button-close-add-exercicio"
                  onClick={() => { setShowAddExercicio(false); setExercicioSearch(""); }}
                  className="w-10 h-10 flex items-center justify-center rounded-full bg-white text-[#2F5641] shadow-sm"
                >
                  <X size={20} />
                </button>
              </div>

              <div className="px-6 py-3 shrink-0">
                <div className="relative">
                  <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-[#8B9286]" />
                  <input
                    data-testid="input-search-exercicio"
                    type="text"
                    value={exercicioSearch}
                    onChange={(e) => setExercicioSearch(e.target.value)}
                    placeholder="Buscar exercício..."
                    className="w-full bg-white border border-[#E8EBE5] rounded-xl pl-10 pr-4 py-3 text-sm text-[#2F5641] focus:outline-none focus:border-[#2F5641]"
                  />
                </div>
              </div>

              <div className="flex-1 overflow-y-auto px-6 pb-8">
                {loadingExercicios ? (
                  <div className="flex items-center justify-center py-12" data-testid="loading-exercicios">
                    <Loader2 className="w-6 h-6 animate-spin text-[#2F5641]" />
                  </div>
                ) : !filteredExercicios.length ? (
                  <div className="text-center py-12" data-testid="text-empty-exercicios">
                    <p className="text-sm text-[#8B9286]">Nenhum exercício encontrado.</p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {filteredExercicios.map((ex) => (
                      <button
                        key={ex.id}
                        data-testid={`button-select-exercicio-${ex.id}`}
                        onClick={() => handleAddExercicio(ex)}
                        disabled={addItemMutation.isPending}
                        className="w-full text-left bg-white p-4 rounded-2xl border border-[#E8EBE5] hover:border-[#C7AE6A] active:scale-[0.98] transition-all disabled:opacity-50"
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex-1">
                            <h3 className="text-sm font-semibold text-[#2F5641]">{ex.nome}</h3>
                            <p className="text-xs text-[#8B9286] mt-0.5">
                              {ex.grupo_muscular}
                              {ex.personalizado && (
                                <span className="ml-2 text-[#C7AE6A] font-medium">• Personalizado</span>
                              )}
                            </p>
                          </div>
                          <Plus size={16} className="text-[#C7AE6A] shrink-0" />
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </Layout>
  );
}
