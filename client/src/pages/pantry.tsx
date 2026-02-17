import Layout from "@/components/layout";
import { ChevronLeft, Plus, ShoppingCart, AlertTriangle } from "lucide-react";
import { useLocation } from "wouter";
import { useState, useRef, useCallback } from "react";
import { motion } from "framer-motion";
import { useQuery } from "@tanstack/react-query";
import type { FoodStock } from "@shared/schema";

const DEFAULT_USER_ID = "5403356d-c894-43f3-846a-513f8e1ad4bb";

type StockItem = FoodStock & { status: string };

function formatQuantity(qty: number, unit: string): string {
  if (unit === "kg") return `${(qty / 1000).toFixed(1).replace(".", ",")}kg`;
  if (unit === "ml") return `${qty}ml`;
  if (unit === "un") return `${qty} un`;
  if (qty >= 1000) return `${(qty / 1000).toFixed(1).replace(".", ",")}kg`;
  return `${qty}g`;
}

export default function PantryScreen() {
  const [, setLocation] = useLocation();
  const [filter, setFilter] = useState("Todos");
  const scrollRef = useRef<HTMLDivElement>(null);
  const isDragging = useRef(false);
  const startX = useRef(0);
  const scrollLeftStart = useRef(0);

  const { data: stockItems = [], isLoading } = useQuery<StockItem[]>({
    queryKey: ["food-stock", "status", DEFAULT_USER_ID],
    queryFn: async () => {
      const res = await fetch(`/api/users/${DEFAULT_USER_ID}/food-stock/status`);
      if (!res.ok) throw new Error("Failed to fetch stock");
      return res.json();
    },
  });

  const onMouseDown = useCallback((e: React.MouseEvent) => {
    const el = scrollRef.current;
    if (!el) return;
    isDragging.current = false;
    startX.current = e.pageX;
    scrollLeftStart.current = el.scrollLeft;

    const onMouseMove = (ev: MouseEvent) => {
      const dx = ev.pageX - startX.current;
      if (Math.abs(dx) > 5) isDragging.current = true;
      el.scrollLeft = scrollLeftStart.current - dx;
    };

    const onMouseUp = () => {
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);
    };

    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);
  }, []);

  const handleChipClick = useCallback((cat: string) => {
    if (!isDragging.current) setFilter(cat);
  }, []);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'good': return 'bg-[#648D4A]';
      case 'medium': return 'bg-[#C7AE6A]';
      case 'low': return 'bg-[#D97952]';
      case 'critical': return 'bg-[#BE4E35]';
      default: return 'bg-gray-400';
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'good': return 'Estoque Cheio';
      case 'medium': return 'Médio';
      case 'low': return 'Baixo';
      case 'critical': return 'Crítico';
      default: return 'Desconhecido';
    }
  };

  const categories = ["Todos", ...Array.from(new Set(stockItems.map(i => i.category)))];

  const filteredItems = filter === "Todos"
    ? stockItems
    : stockItems.filter(item => item.category === filter);

  const lowOrCriticalCount = stockItems.filter(i => i.status === "low" || i.status === "critical").length;

  return (
    <Layout>
      <div className="bg-[#FAFBF8] min-h-screen pb-24">
        <header className="px-6 pt-14 pb-4 flex items-center justify-between sticky top-0 bg-[#FAFBF8]/95 backdrop-blur-sm z-10">
          <button
            onClick={() => setLocation("/home")}
            className="w-10 h-10 -ml-2 flex items-center justify-center text-[#2F5641]"
            data-testid="button-back"
          >
            <ChevronLeft size={24} />
          </button>
          <h1 className="font-display text-lg font-semibold text-[#2F5641]">Despensa & Estoque</h1>
          <button className="w-10 h-10 flex items-center justify-center text-[#2F5641]" data-testid="button-add-stock">
            <Plus size={20} />
          </button>
        </header>

        <main className="px-6 space-y-6">
          {lowOrCriticalCount > 0 && (
            <section
              className="bg-[#2F5641] text-white p-5 rounded-2xl shadow-lg shadow-[#2F5641]/20 flex items-center justify-between cursor-pointer active:scale-[0.98] transition-transform"
              onClick={() => setLocation("/pantry/shopping-list")}
              data-testid="button-shopping-list"
            >
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <ShoppingCart size={18} />
                  <h2 className="text-xs font-bold uppercase tracking-wide">Lista de Compras</h2>
                </div>
                <p className="text-sm opacity-90">
                  {lowOrCriticalCount} {lowOrCriticalCount === 1 ? 'item precisa' : 'itens precisam'} de reposição.
                </p>
              </div>
              <div className="bg-white/20 w-8 h-8 rounded-full flex items-center justify-center">
                <span className="font-bold text-xs">{lowOrCriticalCount}</span>
              </div>
            </section>
          )}

          <div
            ref={scrollRef}
            onMouseDown={onMouseDown}
            className="sem-scrollbar flex gap-2 overflow-x-auto -mx-6 px-6 py-1 cursor-grab active:cursor-grabbing select-none touch-pan-x"
          >
            {categories.map((cat, i, arr) => (
              <button
                key={cat}
                onClick={() => handleChipClick(cat)}
                className={`px-4 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition-colors shrink-0 ${
                  filter === cat
                    ? "bg-[#2F5641] text-white"
                    : "bg-white border border-[#E8EBE5] text-[#8B9286]"
                } ${i === arr.length - 1 ? 'mr-2' : ''}`}
                data-testid={`button-filter-${cat}`}
              >
                {cat}
              </button>
            ))}
          </div>

          {isLoading ? (
            <div className="text-center py-8 text-[#8B9286]">Carregando...</div>
          ) : (
            <div className="grid grid-cols-1 gap-3">
              {filteredItems.map((item) => (
                <motion.div
                  key={item.id}
                  layout
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="bg-white p-4 rounded-2xl border border-[#E8EBE5] shadow-sm flex items-center gap-4"
                  data-testid={`card-stock-item-${item.id}`}
                >
                  <div className="w-12 h-12 rounded-xl bg-[#FAFBF8] border border-[#E8EBE5] flex items-center justify-center text-2xl">
                    {item.image || "📦"}
                  </div>

                  <div className="flex-1">
                    <h3 className="font-semibold text-[#2F5641] text-sm">{item.name}</h3>
                    <p className="text-xs text-[#8B9286]">{item.category} • {formatQuantity(item.quantityG, item.unit)}</p>
                  </div>

                  <div className="flex flex-col items-end gap-1">
                    <span className={`text-[9px] font-bold uppercase px-2 py-0.5 rounded-md text-white ${getStatusColor(item.status)}`}>
                      {getStatusLabel(item.status)}
                    </span>
                    {item.status === 'critical' && (
                      <AlertTriangle size={14} className="text-[#BE4E35]" />
                    )}
                  </div>
                </motion.div>
              ))}
            </div>
          )}
        </main>
      </div>
    </Layout>
  );
}
