import Layout from "@/components/layout";
import { ChevronLeft, Calendar, Plus, Package, Scale, Trash2 } from "lucide-react";
import { useLocation } from "wouter";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/lib/auth";
import { apiFetch } from "@/lib/api";

interface ResumoHoje {
  data: string;
  consumido: { calorias: number; carboidratos: number; proteinas: number; gorduras: number; fibras?: number | null };
  meta: { calorias: number; carboidratos: number; proteinas: number; gorduras: number };
  saldo: { calorias: number; carboidratos: number; proteinas: number; gorduras: number };
  percentual_meta: { calorias: number; carboidratos: number; proteinas: number; gorduras: number };
  total_registros: number;
  calculo: { tmb: number; get: number; deficit_aplicado: number };
}

interface RefeicaoItem {
  id: number;
  nome: string;
  horario_lembrete: string | null;
  ordem: number;
  ativa: boolean;
}

interface RegistroAlimentar {
  id: number;
  alimento: {
    id: number;
    nome: string;
    marca: string;
    calorias: number;
    carboidratos: number;
    proteinas: number;
    gorduras: number;
    fibras: number;
    unidade_medida: string;
  };
  refeicao: RefeicaoItem | null;
  quantidade: number;
  data_consumo: string;
  origem: string;
  observacao: string;
  calorias_consumidas: number;
  carboidratos_consumidos: number;
  proteinas_consumidas: number;
  gorduras_consumidas: number;
  fibras_consumidas: number;
}

export default function NutritionScreen() {
  const [, setLocation] = useLocation();
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const { data: summary, isLoading } = useQuery<ResumoHoje>({
    queryKey: ["nutricao", "resumo-hoje"],
    queryFn: async () => {
      const res = await apiFetch("/api/nutricao/resumo-hoje");
      if (!res.ok) throw new Error("Erro ao buscar resumo nutricional");
      return res.json();
    },
    enabled: !!user,
  });

  const { data: refeicoes } = useQuery<RefeicaoItem[]>({
    queryKey: ["nutricao", "refeicoes"],
    queryFn: async () => {
      const res = await apiFetch("/api/nutricao/refeicoes");
      if (!res.ok) throw new Error("Erro ao buscar refeições");
      return res.json();
    },
    enabled: !!user,
  });

  const { data: registros } = useQuery<RegistroAlimentar[]>({
    queryKey: ["nutricao", "diario", "registros"],
    queryFn: async () => {
      const res = await apiFetch("/api/nutricao/diario/registros");
      if (!res.ok) throw new Error("Erro ao buscar registros");
      return res.json();
    },
    enabled: !!user,
  });

  const deleteMutation = useMutation({
    mutationFn: async (registroId: number) => {
      const res = await apiFetch(`/api/nutricao/diario/registros/${registroId}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Erro ao remover registro");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["nutricao"] });
    },
  });

  const registrosPorRefeicao = (refeicaoId: number | null) => {
    if (!registros) return [];
    return registros.filter(r => {
      if (refeicaoId === null) return r.refeicao === null;
      return r.refeicao?.id === refeicaoId;
    });
  };

  const caloriasRefeicao = (refeicaoId: number | null) => {
    return registrosPorRefeicao(refeicaoId).reduce((sum, r) => sum + r.calorias_consumidas, 0);
  };

  const registrosSemRefeicao = registros?.filter(r => r.refeicao === null) ?? [];

  const totalCal = summary?.consumido?.calorias ?? 0;
  const totalProt = summary?.consumido?.proteinas ?? 0;
  const totalCarbs = summary?.consumido?.carboidratos ?? 0;
  const totalFat = summary?.consumido?.gorduras ?? 0;
  const metaCal = summary?.meta?.calorias ?? 2200;
  const metaProt = summary?.meta?.proteinas ?? 160;
  const metaCarbs = summary?.meta?.carboidratos ?? 200;
  const metaFat = summary?.meta?.gorduras ?? 70;
  const available = summary?.saldo?.calorias ?? (metaCal - totalCal);
  const proteinPct = Math.min(100, summary?.percentual_meta?.proteinas ?? (totalProt / metaProt) * 100);
  const carbsPct = Math.min(100, summary?.percentual_meta?.carboidratos ?? (totalCarbs / metaCarbs) * 100);
  const fatPct = Math.min(100, summary?.percentual_meta?.gorduras ?? (totalFat / metaFat) * 100);

  const mealsToShow = refeicoes?.filter(r => r.ativa).sort((a, b) => a.ordem - b.ordem) ?? [];

  return (
    <Layout>
      <div className="bg-[#FAFBF8] min-h-screen pb-24">
        <header className="px-6 pt-14 pb-4 flex items-center justify-between sticky top-0 bg-[#FAFBF8]/80 backdrop-blur-md z-10">
          <button
            onClick={() => setLocation("/home")}
            className="w-10 h-10 -ml-2 flex items-center justify-center text-[#2F5641]"
            data-testid="button-back"
          >
            <ChevronLeft size={24} />
          </button>
          <h1 className="font-display text-lg font-semibold text-[#2F5641]">Diário Alimentar</h1>
          <button className="w-10 h-10 flex items-center justify-center text-[#2F5641]">
            <Calendar size={20} />
          </button>
        </header>

        <main className="px-6 space-y-6">
          <section className="bg-[#2F5641] rounded-3xl p-6 text-white shadow-lg shadow-[#2F5641]/20">
            <div className="flex justify-between items-end mb-6">
              <div>
                <p className="text-xs font-medium opacity-80 uppercase tracking-wider mb-1">Calorias Disponíveis</p>
                <h2 className="font-display text-4xl font-semibold" data-testid="text-calories-available">
                  {isLoading ? "..." : Math.round(available)} <span className="text-lg font-sans font-medium opacity-60">kcal</span>
                </h2>
              </div>
              <div className="text-right">
                <p className="text-xs font-medium opacity-80 uppercase tracking-wider mb-1">Consumido</p>
                <p className="font-semibold text-lg" data-testid="text-calories-consumed">
                  {isLoading ? "..." : `${Math.round(totalCal)} / ${Math.round(metaCal)}`}
                </p>
              </div>
            </div>

            <div className="space-y-4">
              <div>
                <div className="flex justify-between text-xs font-medium mb-1.5">
                  <span className="text-[#EFECB6]">Proteína</span>
                  <span>{Math.round(totalProt)}g / {Math.round(metaProt)}g</span>
                </div>
                <div className="h-2 bg-white/20 rounded-full overflow-hidden">
                  <div className="h-full bg-[#EFECB6] rounded-full transition-all" style={{ width: `${proteinPct}%` }} />
                </div>
              </div>
              <div>
                <div className="flex justify-between text-xs font-medium mb-1.5">
                  <span className="text-[#D97952]">Carboidratos</span>
                  <span>{Math.round(totalCarbs)}g / {Math.round(metaCarbs)}g</span>
                </div>
                <div className="h-2 bg-white/20 rounded-full overflow-hidden">
                  <div className="h-full bg-[#D97952] rounded-full transition-all" style={{ width: `${carbsPct}%` }} />
                </div>
              </div>
              <div>
                <div className="flex justify-between text-xs font-medium mb-1.5">
                  <span className="text-[#C7AE6A]">Gorduras</span>
                  <span>{Math.round(totalFat)}g / {Math.round(metaFat)}g</span>
                </div>
                <div className="h-2 bg-white/20 rounded-full overflow-hidden">
                  <div className="h-full bg-[#C7AE6A] rounded-full transition-all" style={{ width: `${fatPct}%` }} />
                </div>
              </div>
            </div>
          </section>

          <section className="mb-6">
            <div className="grid grid-cols-2 gap-3">
              <div
                onClick={() => setLocation("/pantry")}
                className="bg-[#2F5641] rounded-2xl p-4 text-white shadow-lg shadow-[#2F5641]/20 relative overflow-hidden cursor-pointer active:scale-[0.98] transition-transform"
                data-testid="link-pantry"
              >
                <div className="absolute top-0 right-0 p-3 opacity-10"><Package size={48} /></div>
                <div className="relative z-10">
                  <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center mb-3 backdrop-blur-sm"><Package size={16} /></div>
                  <h3 className="font-display text-lg mb-0.5">Despensa</h3>
                  <p className="text-[10px] opacity-80 uppercase tracking-wider font-medium">Gerenciar estoque</p>
                </div>
              </div>
              <div
                className="bg-white rounded-2xl p-4 shadow-sm border border-[#E8EBE5] relative overflow-hidden cursor-pointer active:scale-[0.98] transition-transform"
                onClick={() => setLocation("/nutrition/scale")}
                data-testid="link-scale"
              >
                <div className="flex justify-between items-start mb-2">
                  <div className="w-8 h-8 rounded-full bg-[#FAFBF8] flex items-center justify-center text-[#2F5641]"><Scale size={16} /></div>
                  <span className="text-[10px] font-bold text-[#648D4A] bg-[#648D4A]/10 px-2 py-1 rounded-lg">Online</span>
                </div>
                <h3 className="font-display text-sm text-[#2F5641]">Balança</h3>
                <p className="text-[10px] text-[#8B9286]">Conectada</p>
              </div>
            </div>
          </section>

          <div className="space-y-4">
            {mealsToShow.map((refeicao) => {
              const items = registrosPorRefeicao(refeicao.id);
              const kcal = caloriasRefeicao(refeicao.id);
              return (
                <div key={refeicao.id} className="bg-white rounded-2xl border border-[#E8EBE5] overflow-hidden shadow-sm" data-testid={`card-meal-${refeicao.id}`}>
                  <div className="p-4 flex items-center justify-between bg-[#F5F3EE]/50">
                    <h3 className="font-semibold text-[#2F5641]">{refeicao.nome}</h3>
                    <div className="flex items-center gap-3">
                      {kcal > 0 && (
                        <span className="text-sm font-medium text-[#8B9286]">{Math.round(kcal)} kcal</span>
                      )}
                      <button
                        onClick={() => setLocation(`/nutrition/add?refeicao_id=${refeicao.id}`)}
                        className="w-7 h-7 rounded-full bg-[#C7AE6A] flex items-center justify-center text-white hover:bg-[#AD8C48] transition-colors"
                        data-testid={`button-add-meal-${refeicao.id}`}
                      >
                        <Plus size={14} strokeWidth={3} />
                      </button>
                    </div>
                  </div>

                  {items.length > 0 ? (
                    <div className="px-4 pb-3 pt-1">
                      {items.map((reg) => (
                        <div key={reg.id} className="flex justify-between items-center py-3 border-b border-[#E8EBE5] last:border-0" data-testid={`row-registro-${reg.id}`}>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-[#5F6B5A] truncate">{reg.alimento.nome}</p>
                            <p className="text-xs text-[#8B9286]">{reg.quantidade}g · {Math.round(reg.calorias_consumidas)} kcal</p>
                          </div>
                          <div className="flex items-center gap-2 ml-2">
                            <div className="flex gap-1 text-[10px]">
                              <span className="text-[#648D4A]">P{Math.round(reg.proteinas_consumidas)}</span>
                              <span className="text-[#D97952]">C{Math.round(reg.carboidratos_consumidos)}</span>
                              <span className="text-[#C7AE6A]">G{Math.round(reg.gorduras_consumidas)}</span>
                            </div>
                            <button
                              onClick={() => deleteMutation.mutate(reg.id)}
                              className="w-6 h-6 rounded-full flex items-center justify-center text-[#BE4E35] hover:bg-[#BE4E35]/10 transition-colors"
                              data-testid={`button-delete-${reg.id}`}
                            >
                              <Trash2 size={12} />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="px-4 py-4 text-center">
                      <button
                        onClick={() => setLocation(`/nutrition/add?refeicao_id=${refeicao.id}`)}
                        className="text-xs font-semibold text-[#C7AE6A] uppercase tracking-wider hover:underline"
                      >
                        Adicionar Alimentos
                      </button>
                    </div>
                  )}
                </div>
              );
            })}

            {registrosSemRefeicao.length > 0 && (
              <div className="bg-white rounded-2xl border border-[#E8EBE5] overflow-hidden shadow-sm" data-testid="card-meal-avulso">
                <div className="p-4 flex items-center justify-between bg-[#F5F3EE]/50">
                  <h3 className="font-semibold text-[#2F5641]">Avulso</h3>
                  <span className="text-sm font-medium text-[#8B9286]">
                    {Math.round(registrosSemRefeicao.reduce((s, r) => s + r.calorias_consumidas, 0))} kcal
                  </span>
                </div>
                <div className="px-4 pb-3 pt-1">
                  {registrosSemRefeicao.map((reg) => (
                    <div key={reg.id} className="flex justify-between items-center py-3 border-b border-[#E8EBE5] last:border-0" data-testid={`row-registro-${reg.id}`}>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-[#5F6B5A] truncate">{reg.alimento.nome}</p>
                        <p className="text-xs text-[#8B9286]">{reg.quantidade}g · {Math.round(reg.calorias_consumidas)} kcal</p>
                      </div>
                      <div className="flex items-center gap-2 ml-2">
                        <button
                          onClick={() => deleteMutation.mutate(reg.id)}
                          className="w-6 h-6 rounded-full flex items-center justify-center text-[#BE4E35] hover:bg-[#BE4E35]/10 transition-colors"
                          data-testid={`button-delete-${reg.id}`}
                        >
                          <Trash2 size={12} />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </main>
      </div>
    </Layout>
  );
}
