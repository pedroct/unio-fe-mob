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

const RANGE_MAP: Record<string, string> = {
  "7D": "7d",
  "30D": "30d",
  "3M": "3m",
  "1Y": "1y",
};

export default function BiometricsScreen() {
  const [, setLocation] = useLocation();
  const { user } = useAuth();
  const [timeRange, setTimeRange] = useState<string>("7D");

  const { data: records = [], isLoading } = useQuery<any[]>({
    queryKey: [`/api/users/${user?.id}/body-records`, `?range=${RANGE_MAP[timeRange]}`],
    enabled: !!user,
  });

  const { data: latest } = useQuery<any>({
    queryKey: [`/api/users/${user?.id}/body-records/latest`],
    enabled: !!user,
  });

  const chartData = records.map((r: any) => {
    const d = new Date(r.measuredAt);
    return {
      date: `${d.getDate().toString().padStart(2, "0")}/${(d.getMonth() + 1).toString().padStart(2, "0")}`,
      weight: r.weightKg,
    };
  });

  const currentWeight = latest?.weightKg;
  const firstWeight = records.length > 0 ? records[0].weightKg : null;
  const weightDelta = currentWeight && firstWeight ? (currentWeight - firstWeight).toFixed(1) : null;

  const metrics = [
    { label: "Gordura", value: latest?.fatPercent ? `${latest.fatPercent}%` : "—", icon: Activity, color: "#D97952" },
    { label: "Músculo", value: latest?.muscleMassKg ? `${latest.muscleMassKg} kg` : "—", icon: TrendingUp, color: "#2F5641" },
    { label: "Água", value: latest?.waterPercent ? `${latest.waterPercent}%` : "—", icon: Droplets, color: "#3D7A8C" },
    { label: "Osso", value: latest?.boneMassKg ? `${latest.boneMassKg} kg` : "—", icon: Bone, color: "#8B9286" },
    { label: "Visceral", value: latest?.visceralFat ? `${latest.visceralFat}` : "—", icon: Activity, color: "#C7AE6A" },
    { label: "TMB", value: latest?.bmr ? `${latest.bmr}` : "—", icon: Activity, color: "#648D4A" },
  ];

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
                  {currentWeight ? (
                    <>{currentWeight} <span className="text-lg font-sans font-medium text-[#8B9286]">kg</span></>
                  ) : (
                    <span className="text-lg font-sans text-[#8B9286]">Sem dados</span>
                  )}
                </h2>
              </div>
              {weightDelta && (
                <div className="bg-[#E8EBE5]/50 px-3 py-1.5 rounded-full">
                  <span className="text-xs font-semibold text-[#2F5641]" data-testid="text-weight-delta">
                    {parseFloat(weightDelta) > 0 ? "+" : ""}{weightDelta} kg
                  </span>
                </div>
              )}
            </div>

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
                <p className="text-sm text-[#8B9286]">{isLoading ? "Carregando..." : "Registre sua primeira pesagem para ver o gráfico"}</p>
              </div>
            )}

            <div className="flex justify-between mt-6 bg-[#F5F3EE] p-1 rounded-xl">
              {["7D", "30D", "3M", "1Y"].map((range) => (
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

          <div className="flex gap-3">
            <button
              onClick={() => setLocation("/biometrics/scan")}
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
