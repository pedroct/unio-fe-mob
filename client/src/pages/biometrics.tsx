import Layout from "@/components/layout";
import { 
  TrendingUp, 
  Droplets, 
  Bone, 
  Activity, 
  Scale, 
  Plus, 
  ChevronLeft,
  Calendar
} from "lucide-react";
import { 
  AreaChart, 
  Area, 
  ResponsiveContainer, 
  XAxis, 
  YAxis, 
  Tooltip,
  CartesianGrid
} from "recharts";
import { useState } from "react";
import { useLocation } from "wouter";

// Mock Data
const WEIGHT_HISTORY = [
  { date: '10/02', weight: 73.2 },
  { date: '11/02', weight: 73.0 },
  { date: '12/02', weight: 72.8 },
  { date: '13/02', weight: 72.6 },
  { date: '14/02', weight: 72.5 },
  { date: '15/02', weight: 72.2 },
  { date: 'Hoje', weight: 72.0 },
];

const METRICS = [
  { label: "Gordura", value: "14.5%", icon: Activity, color: "#D97952" },
  { label: "Músculo", value: "38.2 kg", icon: TrendingUp, color: "#2F5641" },
  { label: "Água", value: "61%", icon: Droplets, color: "#3D7A8C" },
  { label: "Osso", value: "3.2 kg", icon: Bone, color: "#8B9286" },
  { label: "Visceral", value: "4.0", icon: Activity, color: "#C7AE6A" },
  { label: "TMB", value: "1750", icon: Activity, color: "#648D4A" },
];

export default function BiometricsScreen() {
  const [, setLocation] = useLocation();
  const [timeRange, setTimeRange] = useState<"7D" | "30D" | "3M">("7D");

  return (
    <Layout>
      <div className="bg-[#FAFBF8] min-h-screen pb-24">
        {/* Header */}
        <header className="px-6 pt-14 pb-4 flex items-center justify-between sticky top-0 bg-[#FAFBF8]/80 backdrop-blur-md z-10">
          <button 
            onClick={() => setLocation("/home")}
            className="w-10 h-10 -ml-2 flex items-center justify-center text-[#2F5641]"
          >
            <ChevronLeft size={24} />
          </button>
          <h1 className="font-display text-lg font-semibold text-[#2F5641]">Biometria</h1>
          <button className="w-10 h-10 flex items-center justify-center text-[#2F5641]">
            <Calendar size={20} />
          </button>
        </header>

        <main className="px-6 space-y-6">
          {/* Main Weight Card */}
          <section className="bg-white rounded-3xl p-6 shadow-sm border border-[#E8EBE5]">
            <div className="flex items-center justify-between mb-6">
              <div>
                <span className="text-xs font-medium text-[#8B9286] uppercase tracking-wider">Peso Atual</span>
                <h2 className="font-display text-4xl font-semibold text-[#2F5641] mt-1">
                  72.0 <span className="text-lg font-sans font-medium text-[#8B9286]">kg</span>
                </h2>
              </div>
              <div className="bg-[#E8EBE5]/50 px-3 py-1.5 rounded-full">
                <span className="text-xs font-semibold text-[#2F5641]">-1.2 kg</span>
              </div>
            </div>

            {/* Chart */}
            <div className="h-[200px] w-full -ml-4">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={WEIGHT_HISTORY}>
                  <defs>
                    <linearGradient id="weightGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#3D7A8C" stopOpacity={0.2}/>
                      <stop offset="95%" stopColor="#3D7A8C" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E8EBE5" />
                  <XAxis 
                    dataKey="date" 
                    axisLine={false} 
                    tickLine={false} 
                    tick={{ fontSize: 10, fill: '#8B9286' }} 
                    dy={10}
                  />
                  <YAxis 
                    domain={['dataMin - 1', 'dataMax + 1']} 
                    hide
                  />
                  <Tooltip 
                    contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}
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

            {/* Time Range Selector */}
            <div className="flex justify-between mt-6 bg-[#F5F3EE] p-1 rounded-xl">
              {["7D", "30D", "3M", "1Y"].map((range) => (
                <button
                  key={range}
                  onClick={() => setTimeRange(range as any)}
                  className={`flex-1 py-2 text-xs font-semibold rounded-lg transition-all ${
                    timeRange === range 
                      ? "bg-white text-[#2F5641] shadow-sm" 
                      : "text-[#8B9286] hover:text-[#5F6B5A]"
                  }`}
                >
                  {range}
                </button>
              ))}
            </div>
          </section>

          {/* Metrics Grid */}
          <section className="grid grid-cols-2 gap-3">
            {METRICS.map((metric, index) => (
              <div key={index} className="bg-white p-4 rounded-2xl border border-[#E8EBE5] shadow-sm">
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
                <p className="font-display text-xl font-semibold text-[#2F5641]">
                  {metric.value}
                </p>
              </div>
            ))}
          </section>

          {/* Actions */}
          <div className="flex gap-3">
             <button 
               onClick={() => setLocation("/biometrics/scan")}
               className="flex-1 bg-[#2F5641] text-white p-4 rounded-2xl shadow-lg shadow-[#2F5641]/20 flex flex-col items-center justify-center gap-2 active:scale-[0.98] transition-transform"
             >
               <Scale size={24} />
               <span className="font-semibold text-sm">Iniciar Pesagem</span>
             </button>

             <button 
               onClick={() => setLocation("/biometrics/devices")}
               className="flex-1 bg-white text-[#2F5641] p-4 rounded-2xl border border-[#2F5641] flex flex-col items-center justify-center gap-2 active:scale-[0.98] transition-transform"
             >
               <Activity size={24} />
               <span className="font-semibold text-sm">Meus Dispositivos</span>
             </button>
          </div>

          {/* Manual Entry */}
          <button className="w-full bg-white text-[#8B9286] p-4 rounded-2xl border border-[#E8EBE5] flex items-center justify-center gap-3 active:scale-[0.98] transition-transform hover:border-[#2F5641] hover:text-[#2F5641]">
            <Plus size={20} />
            <span className="font-semibold text-sm">Registrar Manualmente</span>
          </button>
        </main>
      </div>
    </Layout>
  );
}
