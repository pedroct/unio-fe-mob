import Layout from "@/components/layout";
import {
  TrendingUp,
  Droplets,
  Bone,
  Activity,
  Scale,
  Plus,
  ChevronLeft,
  Calendar,
  Loader2,
} from "lucide-react";
import {
  AreaChart,
  Area,
  ResponsiveContainer,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from "recharts";
import { useState } from "react";
import { useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/lib/auth";
import { apiFetch } from "@/lib/api";

const RANGE_DIAS: Record<string, number> = {
  "7D": 7,
  "30D": 30,
  "3M": 90,
  "1Y": 365,
};

interface EstadoAtual {
  ultima_leitura: {
    id: string;
    peso_kg: number;
    impedancia_ohm: number | null;
    gordura_percentual: number | null;
    massa_muscular_kg: number | null;
    massa_ossea_kg: number | null;
    agua_percentual: number | null;
    gordura_visceral: number | null;
    imc: number | null;
    tmb_kcal: number | null;
    origem: string;
    dispositivo_id: string | null;
    registrado_em: string;
    criado_em: string;
  } | null;
  peso_atual_kg: number | null;
  variacao_peso_7d: number | null;
  variacao_peso_30d: number | null;
  total_leituras: number;
  meta_peso_kg: number | null;
  peso_ate_meta: number | null;
}

interface Historico {
  pontos: { data: string; peso_kg: number; gordura_percentual: number | null; imc: number | null }[];
  media_peso_kg: number | null;
  peso_minimo_kg: number | null;
  peso_maximo_kg: number | null;
}

export default function BiometricsScreen() {
  const [, setLocation] = useLocation();
  const { user } = useAuth();
  const [timeRange, setTimeRange] = useState<string>("7D");

  const { data: estado, isLoading: loadingEstado } = useQuery<EstadoAtual>({
    queryKey: ["/api/biometria/estado-atual"],
    queryFn: async () => {
      const res = await apiFetch("/api/biometria/estado-atual");
      if (!res.ok) throw new Error("Erro ao buscar estado");
      return res.json();
    },
    enabled: !!user,
  });

  const { data: historico, isLoading: loadingHistorico } = useQuery<Historico>({
    queryKey: ["/api/biometria/historico", timeRange],
    queryFn: async () => {
      const dias = RANGE_DIAS[timeRange] || 30;
      const res = await apiFetch(`/api/biometria/historico?dias=${dias}`);
      if (!res.ok) throw new Error("Erro ao buscar histórico");
      return res.json();
    },
    enabled: !!user,
  });

  const chartData = (historico?.pontos || []).map((p) => {
    const d = new Date(p.data);
    return {
      date: `${d.getDate().toString().padStart(2, "0")}/${(d.getMonth() + 1).toString().padStart(2, "0")}`,
      weight: p.peso_kg,
    };
  });

  const currentWeight = estado?.peso_atual_kg;
  const weightDelta = estado?.variacao_peso_7d;
  const latest = estado?.ultima_leitura;

  const metrics = [
    { label: "Gordura", value: latest?.gordura_percentual != null ? `${latest.gordura_percentual}%` : "—", icon: Activity, color: "#D97952" },
    { label: "Músculo", value: latest?.massa_muscular_kg != null ? `${latest.massa_muscular_kg} kg` : "—", icon: TrendingUp, color: "#2F5641" },
    { label: "Água", value: latest?.agua_percentual != null ? `${latest.agua_percentual}%` : "—", icon: Droplets, color: "#3D7A8C" },
    { label: "Osso", value: latest?.massa_ossea_kg != null ? `${latest.massa_ossea_kg} kg` : "—", icon: Bone, color: "#8B9286" },
    { label: "Visceral", value: latest?.gordura_visceral != null ? `${latest.gordura_visceral}` : "—", icon: Activity, color: "#C7AE6A" },
    { label: "TMB", value: latest?.tmb_kcal != null ? `${latest.tmb_kcal}` : "—", icon: Activity, color: "#648D4A" },
  ];

  const isLoading = loadingEstado || loadingHistorico;

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
          <h1 className="font-display text-lg font-semibold text-[#2F5641]">Biometria</h1>
          <button className="w-10 h-10 flex items-center justify-center text-[#2F5641]">
            <Calendar size={20} />
          </button>
        </header>

        <main className="px-6 space-y-6">
          <section className="bg-white rounded-3xl p-6 shadow-sm border border-[#E8EBE5]">
            <div className="flex items-center justify-between mb-6">
              <div>
                <span className="text-xs font-medium text-[#8B9286] uppercase tracking-wider">Peso Atual</span>
                <h2 className="font-display text-4xl font-semibold text-[#2F5641] mt-1" data-testid="text-current-weight">
                  {isLoading ? (
                    <Loader2 size={24} className="animate-spin text-[#8B9286]" />
                  ) : currentWeight != null ? (
                    <>{currentWeight} <span className="text-lg font-sans font-medium text-[#8B9286]">kg</span></>
                  ) : (
                    <span className="text-lg font-sans text-[#8B9286]">Sem dados</span>
                  )}
                </h2>
              </div>
              {weightDelta != null && weightDelta !== 0 && (
                <div className="bg-[#E8EBE5]/50 px-3 py-1.5 rounded-full">
                  <span className="text-xs font-semibold text-[#2F5641]" data-testid="text-weight-delta">
                    {weightDelta > 0 ? "+" : ""}{weightDelta} kg (7d)
                  </span>
                </div>
              )}
            </div>

            {estado?.meta_peso_kg != null && estado?.peso_ate_meta != null && (
              <div className="bg-[#F5F3EE] px-4 py-3 rounded-xl mb-4">
                <div className="flex justify-between items-center">
                  <span className="text-xs text-[#8B9286]">Meta de peso</span>
                  <span className="text-xs font-semibold text-[#2F5641]">{estado.meta_peso_kg} kg</span>
                </div>
                <div className="flex justify-between items-center mt-1">
                  <span className="text-xs text-[#8B9286]">Faltam</span>
                  <span className="text-xs font-semibold text-[#C7AE6A]">{Math.abs(estado.peso_ate_meta).toFixed(1)} kg</span>
                </div>
              </div>
            )}

            {chartData.length > 1 ? (
              <div className="h-[200px] w-full -ml-4">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={chartData}>
                    <defs>
                      <linearGradient id="weightGradient" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#3D7A8C" stopOpacity={0.2} />
                        <stop offset="95%" stopColor="#3D7A8C" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E8EBE5" />
                    <XAxis
                      dataKey="date"
                      axisLine={false}
                      tickLine={false}
                      tick={{ fontSize: 10, fill: "#8B9286" }}
                      dy={10}
                    />
                    <YAxis domain={["dataMin - 1", "dataMax + 1"]} hide />
                    <Tooltip
                      contentStyle={{
                        borderRadius: "12px",
                        border: "none",
                        boxShadow: "0 4px 12px rgba(0,0,0,0.1)",
                      }}
                    />
                    <Area
                      type="monotone"
                      dataKey="weight"
                      stroke="#3D7A8C"
                      strokeWidth={3}
                      fillOpacity={1}
                      fill="url(#weightGradient)"
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <div className="h-[200px] flex items-center justify-center">
                <p className="text-sm text-[#8B9286]">
                  {isLoading ? "Carregando..." : "Registre sua primeira pesagem para ver o gráfico"}
                </p>
              </div>
            )}

            <div className="flex justify-between mt-6 bg-[#F5F3EE] p-1 rounded-xl">
              {(["7D", "30D", "3M", "1Y"] as const).map((range) => (
                <button
                  key={range}
                  onClick={() => setTimeRange(range)}
                  className={`flex-1 py-2 text-xs font-semibold rounded-lg transition-all ${
                    timeRange === range
                      ? "bg-white text-[#2F5641] shadow-sm"
                      : "text-[#8B9286] hover:text-[#5F6B5A]"
                  }`}
                  data-testid={`button-range-${range}`}
                >
                  {range}
                </button>
              ))}
            </div>

            {historico && (
              <div className="flex justify-between mt-4 text-[10px] text-[#8B9286]">
                {historico.peso_minimo_kg != null && <span>Mín: {historico.peso_minimo_kg} kg</span>}
                {historico.media_peso_kg != null && <span>Média: {historico.media_peso_kg} kg</span>}
                {historico.peso_maximo_kg != null && <span>Máx: {historico.peso_maximo_kg} kg</span>}
              </div>
            )}
          </section>

          <section className="grid grid-cols-2 gap-3">
            {metrics.map((metric, index) => (
              <div key={index} className="bg-white p-4 rounded-2xl border border-[#E8EBE5] shadow-sm" data-testid={`card-metric-${metric.label}`}>
                <div className="flex items-center gap-2 mb-2">
                  <div
                    className="w-6 h-6 rounded-full flex items-center justify-center bg-opacity-10"
                    style={{ backgroundColor: `${metric.color}20` }}
                  >
                    <metric.icon size={14} color={metric.color} />
                  </div>
                  <span className="text-[10px] font-bold text-[#8B9286] uppercase tracking-wide">
                    {metric.label}
                  </span>
                </div>
                <p className="font-display text-xl font-semibold text-[#2F5641]">{metric.value}</p>
              </div>
            ))}
          </section>

          {estado && (
            <div className="text-center text-[10px] text-[#8B9286]">
              {estado.total_leituras} leituras registradas
            </div>
          )}

          <div className="flex gap-3">
            <button
              onClick={() => setLocation("/biometrics/devices")}
              className="flex-1 bg-[#2F5641] text-white p-4 rounded-2xl shadow-lg shadow-[#2F5641]/20 flex flex-col items-center justify-center gap-2 active:scale-[0.98] transition-transform"
              data-testid="button-start-weighing"
            >
              <Scale size={24} />
              <span className="font-semibold text-sm">Iniciar Pesagem</span>
            </button>
            <button
              onClick={() => setLocation("/biometrics/devices")}
              className="flex-1 bg-white text-[#2F5641] p-4 rounded-2xl border border-[#2F5641] flex flex-col items-center justify-center gap-2 active:scale-[0.98] transition-transform"
              data-testid="button-devices"
            >
              <Activity size={24} />
              <span className="font-semibold text-sm">Meus Dispositivos</span>
            </button>
          </div>

          <button
            onClick={() => setLocation("/biometrics/scan")}
            className="w-full bg-white text-[#8B9286] p-4 rounded-2xl border border-[#E8EBE5] flex items-center justify-center gap-3 active:scale-[0.98] transition-transform hover:border-[#2F5641] hover:text-[#2F5641]"
            data-testid="button-manual-entry"
          >
            <Plus size={20} />
            <span className="font-semibold text-sm">Registrar Manualmente</span>
          </button>
        </main>
      </div>
    </Layout>
  );
}
