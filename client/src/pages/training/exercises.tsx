import Layout from "@/components/layout";
import { ChevronLeft, Plus, Search, X, Loader2, AlertCircle, Dumbbell, Star } from "lucide-react";
import { useLocation } from "wouter";
import { useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/lib/auth";
import { apiFetch } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";

interface Exercicio {
  id: number;
  nome: string;
  grupo_muscular: string;
  observacoes: string;
  personalizado: boolean;
  criado_em: string;
}

interface ExerciciosResponse {
  itens: Exercicio[];
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

const GRUPO_MUSCULAR_OPTIONS = ["Peito", "Costas", "Pernas", "Ombros", "Braços", "Core"];

const GRUPO_COLORS: Record<string, string> = {
  "Peito": "#D97952",
  "Costas": "#2F5641",
  "Pernas": "#3D7A8C",
  "Ombros": "#C7AE6A",
  "Braços": "#648D4A",
  "Core": "#8B6A9F",
};

function getGrupoColor(grupo: string): string {
  return GRUPO_COLORS[grupo] || "#8B9286";
}

export default function ExercisesScreen() {
  const [, setLocation] = useLocation();
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const { toast } = useToast();

  const [searchQuery, setSearchQuery] = useState("");
  const [selectedGroup, setSelectedGroup] = useState<string | null>(null);
  const [showCreateSheet, setShowCreateSheet] = useState(false);
  const [formNome, setFormNome] = useState("");
  const [formGrupo, setFormGrupo] = useState("");
  const [formObservacoes, setFormObservacoes] = useState("");
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  const { data, isLoading, isError, refetch } = useQuery<ExerciciosResponse>({
    queryKey: ["treino", "exercicios"],
    queryFn: async () => {
      const res = await apiFetch("/api/treino/exercicios");
      if (!res.ok) throw new Error("Erro ao buscar exercícios");
      return res.json();
    },
    enabled: !!user,
  });

  const createMutation = useMutation({
    mutationFn: async (payload: { nome: string; grupo_muscular?: string; observacoes?: string }) => {
      const res = await apiFetch("/api/treino/exercicios", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const err = await res.json();
        throw { status: res.status, ...err };
      }
      return res.json();
    },
    onSuccess: (data) => {
      setFieldErrors({});
      queryClient.invalidateQueries({ queryKey: ["treino", "exercicios"] });
      setShowCreateSheet(false);
      resetForm();
      toast({ title: "Exercício criado", description: data.mensagem || "Exercício adicionado com sucesso." });
    },
    onError: (err: any) => {
      if (isApiError422(err)) {
        const errors: Record<string, string> = {};
        err.errors.forEach((e) => { errors[e.field] = e.message; });
        setFieldErrors(errors);
        toast({ title: "Erro de validação", description: err.errors.map((e) => e.message).join("; "), variant: "destructive" });
      } else if (err?.status === 403) {
        toast({ title: "Acesso negado", variant: "destructive" });
      } else if (err?.status === 404) {
        toast({ title: "Não encontrado", variant: "destructive" });
      } else {
        toast({ title: "Erro", description: "Não foi possível criar exercício. Tente novamente.", variant: "destructive" });
      }
    },
  });

  const resetForm = () => {
    setFormNome("");
    setFormGrupo("");
    setFormObservacoes("");
    setFieldErrors({});
  };

  const handleCreate = () => {
    setFieldErrors({});
    if (formNome.trim().length < 2) {
      setFieldErrors({ nome: "Nome deve ter pelo menos 2 caracteres." });
      return;
    }
    const payload: { nome: string; grupo_muscular?: string; observacoes?: string } = {
      nome: formNome.trim(),
    };
    if (formGrupo) payload.grupo_muscular = formGrupo;
    if (formObservacoes.trim()) payload.observacoes = formObservacoes.trim();
    createMutation.mutate(payload);
  };

  const exercicios = data?.itens ?? [];

  const uniqueGroups = useMemo(() => {
    const groups = new Set<string>();
    exercicios.forEach((e) => {
      if (e.grupo_muscular) groups.add(e.grupo_muscular);
    });
    return Array.from(groups).sort();
  }, [exercicios]);

  const filtered = useMemo(() => {
    let list = exercicios;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      list = list.filter((e) => e.nome.toLowerCase().includes(q));
    }
    if (selectedGroup) {
      list = list.filter((e) => e.grupo_muscular === selectedGroup);
    }
    return list;
  }, [exercicios, searchQuery, selectedGroup]);

  if (isError) {
    return (
      <Layout>
        <div className="min-h-screen flex flex-col items-center justify-center px-6 gap-4" data-testid="error-exercises">
          <AlertCircle className="w-12 h-12 text-[#BE4E35]" />
          <p className="text-sm text-[#BE4E35] text-center">Não foi possível carregar exercícios.</p>
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
          <h1 className="font-display text-lg font-semibold text-[#2F5641]">Exercícios</h1>
          <button
            data-testid="button-open-create"
            onClick={() => { resetForm(); setShowCreateSheet(true); }}
            className="w-10 h-10 flex items-center justify-center text-[#2F5641]"
          >
            <Plus size={20} />
          </button>
        </header>

        <main className="px-6 flex-1 flex flex-col">
          <div className="relative mb-4">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#8B9286]" />
            <input
              data-testid="input-search"
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Buscar exercício..."
              className="w-full bg-white border border-[#E8EBE5] rounded-xl pl-9 pr-4 py-2.5 text-sm text-[#2F5641] placeholder:text-[#8B9286] focus:outline-none focus:border-[#2F5641]"
            />
            {searchQuery && (
              <button
                data-testid="button-clear-search"
                onClick={() => setSearchQuery("")}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-[#8B9286]"
              >
                <X size={14} />
              </button>
            )}
          </div>

          {uniqueGroups.length > 0 && (
            <div className="flex gap-2 overflow-x-auto pb-3 mb-4 sem-scrollbar" data-testid="filter-groups">
              <button
                data-testid="filter-group-all"
                onClick={() => setSelectedGroup(null)}
                className={`shrink-0 px-3 py-1.5 rounded-full text-xs font-medium border transition-colors ${
                  !selectedGroup
                    ? "bg-[#2F5641] text-white border-[#2F5641]"
                    : "bg-white text-[#8B9286] border-[#E8EBE5]"
                }`}
              >
                Todos
              </button>
              {uniqueGroups.map((group) => (
                <button
                  key={group}
                  data-testid={`filter-group-${group}`}
                  onClick={() => setSelectedGroup(selectedGroup === group ? null : group)}
                  className={`shrink-0 px-3 py-1.5 rounded-full text-xs font-medium border transition-colors ${
                    selectedGroup === group
                      ? "bg-[#2F5641] text-white border-[#2F5641]"
                      : "bg-white text-[#8B9286] border-[#E8EBE5]"
                  }`}
                >
                  {group}
                </button>
              ))}
            </div>
          )}

          {isLoading ? (
            <div className="flex-1 flex items-center justify-center" data-testid="loading-exercises">
              <Loader2 className="w-8 h-8 animate-spin text-[#2F5641]" />
            </div>
          ) : filtered.length === 0 ? (
            <div className="flex-1 flex flex-col items-center justify-center gap-3 py-12" data-testid="empty-exercises">
              <Dumbbell className="w-12 h-12 text-[#E8EBE5]" />
              <p className="text-sm text-[#8B9286]">Nenhum exercício encontrado</p>
            </div>
          ) : (
            <div className="flex flex-col gap-3">
              {filtered.map((exercicio) => (
                <motion.div
                  key={exercicio.id}
                  data-testid={`card-exercise-${exercicio.id}`}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="bg-white rounded-2xl border border-[#E8EBE5] p-4 shadow-sm"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <h3 className="text-sm font-semibold text-[#2F5641]" data-testid={`text-exercise-name-${exercicio.id}`}>
                        {exercicio.nome}
                      </h3>
                      <div className="flex items-center gap-2 mt-2 flex-wrap">
                        {exercicio.grupo_muscular && (
                          <span
                            data-testid={`badge-grupo-${exercicio.id}`}
                            className="px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wide text-white"
                            style={{ backgroundColor: getGrupoColor(exercicio.grupo_muscular) }}
                          >
                            {exercicio.grupo_muscular}
                          </span>
                        )}
                        {exercicio.personalizado && (
                          <span
                            data-testid={`badge-custom-${exercicio.id}`}
                            className="flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wide bg-[#C7AE6A]/20 text-[#C7AE6A]"
                          >
                            <Star size={10} />
                            Personalizado
                          </span>
                        )}
                      </div>
                      {exercicio.observacoes && (
                        <p className="text-xs text-[#8B9286] mt-2 line-clamp-2" data-testid={`text-obs-${exercicio.id}`}>
                          {exercicio.observacoes}
                        </p>
                      )}
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          )}
        </main>

        <AnimatePresence>
          {showCreateSheet && (
            <>
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 bg-black/40 backdrop-blur-sm z-40"
                onClick={() => setShowCreateSheet(false)}
              />
              <motion.div
                initial={{ y: "100%" }}
                animate={{ y: 0 }}
                exit={{ y: "100%" }}
                transition={{ type: "spring", damping: 25, stiffness: 200 }}
                className="fixed bottom-0 left-0 right-0 bg-white rounded-t-3xl z-50 max-w-[430px] mx-auto shadow-2xl"
              >
                <div className="p-6">
                  <div className="w-10 h-1 bg-[#E8EBE5] rounded-full mx-auto mb-4" />
                  <h2 className="font-display text-lg font-bold text-[#2F5641] text-center mb-6">Criar Exercício</h2>

                  <div className="space-y-4">
                    <div>
                      <label className="text-[10px] font-bold uppercase tracking-wider text-[#8B9286] mb-1 block">
                        Nome *
                      </label>
                      <input
                        data-testid="input-nome"
                        type="text"
                        value={formNome}
                        onChange={(e) => { setFormNome(e.target.value); setFieldErrors((prev) => ({ ...prev, nome: "" })); }}
                        placeholder="Ex.: Supino Reto"
                        className={`w-full bg-white border rounded-xl px-4 py-3 text-sm font-medium text-[#2F5641] focus:outline-none focus:border-[#2F5641] ${
                          fieldErrors.nome ? "border-[#BE4E35]" : "border-[#E8EBE5]"
                        }`}
                      />
                      {fieldErrors.nome && (
                        <p className="text-xs text-[#BE4E35] mt-1" data-testid="error-nome">{fieldErrors.nome}</p>
                      )}
                    </div>

                    <div>
                      <label className="text-[10px] font-bold uppercase tracking-wider text-[#8B9286] mb-1 block">
                        Grupo Muscular
                      </label>
                      <div className="flex gap-2 flex-wrap">
                        {GRUPO_MUSCULAR_OPTIONS.map((g) => (
                          <button
                            key={g}
                            data-testid={`option-grupo-${g}`}
                            onClick={() => setFormGrupo(formGrupo === g ? "" : g)}
                            className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-colors ${
                              formGrupo === g
                                ? "bg-[#2F5641] text-white border-[#2F5641]"
                                : "bg-white text-[#8B9286] border-[#E8EBE5]"
                            }`}
                          >
                            {g}
                          </button>
                        ))}
                      </div>
                      {fieldErrors.grupo_muscular && (
                        <p className="text-xs text-[#BE4E35] mt-1" data-testid="error-grupo">{fieldErrors.grupo_muscular}</p>
                      )}
                    </div>

                    <div>
                      <label className="text-[10px] font-bold uppercase tracking-wider text-[#8B9286] mb-1 block">
                        Observações
                      </label>
                      <textarea
                        data-testid="input-observacoes"
                        value={formObservacoes}
                        onChange={(e) => setFormObservacoes(e.target.value)}
                        placeholder="Dicas de execução, notas..."
                        rows={3}
                        className={`w-full bg-white border rounded-xl px-4 py-3 text-sm font-medium text-[#2F5641] focus:outline-none focus:border-[#2F5641] resize-none ${
                          fieldErrors.observacoes ? "border-[#BE4E35]" : "border-[#E8EBE5]"
                        }`}
                      />
                      {fieldErrors.observacoes && (
                        <p className="text-xs text-[#BE4E35] mt-1" data-testid="error-observacoes">{fieldErrors.observacoes}</p>
                      )}
                    </div>
                  </div>

                  <button
                    data-testid="button-submit-create"
                    onClick={handleCreate}
                    disabled={createMutation.isPending}
                    className="w-full bg-[#2F5641] text-white py-3.5 rounded-xl font-bold text-base shadow-lg shadow-[#2F5641]/25 active:scale-[0.98] transition-all disabled:opacity-50 mt-6"
                  >
                    {createMutation.isPending ? "Criando..." : "Criar Exercício"}
                  </button>

                  <button
                    data-testid="button-cancel-create"
                    onClick={() => setShowCreateSheet(false)}
                    className="w-full text-[#8B9286] py-3 text-sm font-medium mt-2"
                  >
                    Cancelar
                  </button>
                </div>
              </motion.div>
            </>
          )}
        </AnimatePresence>
      </div>
    </Layout>
  );
}
