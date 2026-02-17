import Layout from "@/components/layout";
import { ChevronLeft, ShoppingCart, Check, Plus, Minus, ShoppingBag } from "lucide-react";
import { useLocation } from "wouter";
import { useState, useCallback, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
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

function defaultBuyQty(item: StockItem): number {
  const deficit = item.minQuantityG - item.quantityG;
  if (deficit <= 0) return 1;
  if (item.unit === "un") return Math.ceil(deficit);
  if (item.unit === "kg") return Math.ceil(deficit / 1000);
  return Math.ceil(deficit / 100) * 100;
}

function buyQtyToStockUnits(qty: number, unit: string): number {
  if (unit === "kg") return qty * 1000;
  return qty;
}

function stepSize(unit: string): number {
  if (unit === "kg") return 1;
  if (unit === "un") return 1;
  if (unit === "ml") return 100;
  return 100;
}

function QtyInput({
  value,
  onChange,
  unit,
  size = "sm",
}: {
  value: number;
  onChange: (v: number) => void;
  unit: string;
  size?: "sm" | "md";
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const step = stepSize(unit);
  const unitLabel = unit === "kg" ? "kg" : unit === "ml" ? "ml" : unit === "un" ? "un" : "g";
  const isMd = size === "md";

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value.replace(/[^0-9.,]/g, "").replace(",", ".");
    if (raw === "") return onChange(0);
    const parsed = parseFloat(raw);
    if (!isNaN(parsed) && parsed >= 0) onChange(parsed);
  };

  const handleBlur = () => {
    if (value < 1) onChange(1);
  };

  return (
    <div className="flex items-center gap-1.5">
      <button
        onClick={() => onChange(Math.max(1, value - step))}
        className={`${isMd ? "w-9 h-9" : "w-7 h-7"} rounded-lg bg-[#F0F2ED] border border-[#E8EBE5] flex items-center justify-center text-[#2F5641] active:bg-[#E0E3DB] transition-colors`}
      >
        <Minus size={isMd ? 16 : 14} />
      </button>
      <button
        onClick={() => inputRef.current?.focus()}
        className={`${isMd ? "min-w-[80px] h-9 text-base" : "min-w-[60px] h-7 text-sm"} rounded-lg bg-white border border-[#E8EBE5] flex items-center justify-center font-bold text-[#2F5641] px-2 gap-1 cursor-text`}
      >
        <input
          ref={inputRef}
          type="text"
          inputMode="decimal"
          value={value}
          onChange={handleInputChange}
          onBlur={handleBlur}
          className={`${isMd ? "w-10 text-base" : "w-8 text-sm"} bg-transparent text-center font-bold text-[#2F5641] outline-none`}
          data-testid="input-quantity"
        />
        <span className={`${isMd ? "text-xs" : "text-[10px]"} text-[#8B9286] font-medium`}>{unitLabel}</span>
      </button>
      <button
        onClick={() => onChange(value + step)}
        className={`${isMd ? "w-9 h-9" : "w-7 h-7"} rounded-lg bg-[#2F5641] flex items-center justify-center text-white active:bg-[#264835] transition-colors`}
      >
        <Plus size={isMd ? 16 : 14} />
      </button>
    </div>
  );
}

export default function ShoppingListScreen() {
  const [, setLocation] = useLocation();
  const queryClient = useQueryClient();
  const [buyQuantities, setBuyQuantities] = useState<Record<string, number>>({});
  const [confirmingId, setConfirmingId] = useState<string | null>(null);
  const [confirmedIds, setConfirmedIds] = useState<Set<string>>(new Set());
  const [confirmQty, setConfirmQty] = useState(0);

  const { data: stockItems = [], isLoading } = useQuery<StockItem[]>({
    queryKey: ["food-stock", "status", DEFAULT_USER_ID],
    queryFn: async () => {
      const res = await fetch(`/api/users/${DEFAULT_USER_ID}/food-stock/status`);
      if (!res.ok) throw new Error("Failed to fetch stock");
      return res.json();
    },
  });

  const purchaseMutation = useMutation({
    mutationFn: async ({ stockItem, actualQuantity }: { stockItem: StockItem; actualQuantity: number }) => {
      const plannedQty = buyQuantities[stockItem.id] ?? defaultBuyQty(stockItem);

      const createRes = await fetch("/api/purchases", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: DEFAULT_USER_ID,
          foodStockId: stockItem.id,
          plannedQuantity: buyQtyToStockUnits(plannedQty, stockItem.unit),
          actualQuantity: buyQtyToStockUnits(actualQuantity, stockItem.unit),
          unit: stockItem.unit,
          status: "pending",
        }),
      });
      if (!createRes.ok) throw new Error("Failed to create purchase");
      const purchase = await createRes.json();

      const confirmRes = await fetch(`/api/purchases/${purchase.id}/confirm`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          actualQuantity: buyQtyToStockUnits(actualQuantity, stockItem.unit),
        }),
      });
      if (!confirmRes.ok) throw new Error("Failed to confirm purchase");
      return confirmRes.json();
    },
    onSuccess: (_, vars) => {
      setConfirmedIds(prev => new Set(prev).add(vars.stockItem.id));
      setConfirmingId(null);
      queryClient.invalidateQueries({ queryKey: ["food-stock"] });
    },
  });

  const shoppingItems = stockItems.filter(item => item.status === "low" || item.status === "critical");

  const getBuyQty = useCallback((item: StockItem) => {
    return buyQuantities[item.id] ?? defaultBuyQty(item);
  }, [buyQuantities]);

  const handleBuyClick = (item: StockItem) => {
    const qty = getBuyQty(item);
    setConfirmQty(qty);
    setConfirmingId(item.id);
  };

  const handleConfirm = (item: StockItem) => {
    purchaseMutation.mutate({ stockItem: item, actualQuantity: confirmQty });
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'low': return 'bg-[#D97952]';
      case 'critical': return 'bg-[#BE4E35]';
      default: return 'bg-gray-400';
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'low': return 'Baixo';
      case 'critical': return 'Crítico';
      default: return '';
    }
  };

  const activeItems = shoppingItems.filter(i => !confirmedIds.has(i.id));
  const doneItems = shoppingItems.filter(i => confirmedIds.has(i.id));

  return (
    <Layout>
      <div className="bg-[#FAFBF8] min-h-screen pb-24">
        <header className="px-6 pt-14 pb-4 flex items-center justify-between sticky top-0 bg-[#FAFBF8]/95 backdrop-blur-sm z-10">
          <button
            onClick={() => setLocation("/pantry")}
            className="w-10 h-10 -ml-2 flex items-center justify-center text-[#2F5641]"
            data-testid="button-back"
          >
            <ChevronLeft size={24} />
          </button>
          <h1 className="font-display text-lg font-semibold text-[#2F5641]">Lista de Compras</h1>
          <div className="w-10 h-10" />
        </header>

        <main className="px-6 space-y-6">
          <div className="bg-[#2F5641] text-white p-5 rounded-2xl shadow-lg shadow-[#2F5641]/20">
            <div className="flex items-center gap-3 mb-3">
              <div className="bg-white/20 w-10 h-10 rounded-full flex items-center justify-center">
                <ShoppingCart size={20} />
              </div>
              <div>
                <h2 className="font-semibold text-sm">Itens para Repor</h2>
                <p className="text-xs opacity-80">
                  {activeItems.length === 0
                    ? "Tudo comprado!"
                    : `${activeItems.length} ${activeItems.length === 1 ? 'item pendente' : 'itens pendentes'}`}
                </p>
              </div>
            </div>
            <div className="w-full bg-white/20 rounded-full h-2">
              <motion.div
                className="bg-white rounded-full h-2"
                initial={{ width: 0 }}
                animate={{ width: shoppingItems.length > 0 ? `${(doneItems.length / shoppingItems.length) * 100}%` : '0%' }}
                transition={{ duration: 0.4, ease: "easeOut" }}
              />
            </div>
          </div>

          {isLoading ? (
            <div className="text-center py-8 text-[#8B9286]">Carregando...</div>
          ) : shoppingItems.length === 0 ? (
            <div className="text-center py-12">
              <div className="w-16 h-16 mx-auto mb-4 bg-[#E8EBE5] rounded-full flex items-center justify-center">
                <Check size={28} className="text-[#648D4A]" />
              </div>
              <h3 className="font-semibold text-[#2F5641] mb-1">Estoque em Dia</h3>
              <p className="text-sm text-[#8B9286]">Nenhum item precisa de reposição.</p>
            </div>
          ) : (
            <div className="space-y-3">
              <AnimatePresence mode="popLayout">
                {[...activeItems, ...doneItems]
                  .sort((a, b) => {
                    const aD = confirmedIds.has(a.id);
                    const bD = confirmedIds.has(b.id);
                    if (aD !== bD) return aD ? 1 : -1;
                    if (a.status === 'critical' && b.status !== 'critical') return -1;
                    if (a.status !== 'critical' && b.status === 'critical') return 1;
                    return 0;
                  })
                  .map((item) => {
                    const isDone = confirmedIds.has(item.id);
                    const isConfirming = confirmingId === item.id;

                    return (
                      <motion.div
                        key={item.id}
                        layout
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.9 }}
                        className={`bg-white rounded-2xl border shadow-sm overflow-hidden transition-colors ${
                          isDone ? 'border-[#648D4A]/30 opacity-60' : 'border-[#E8EBE5]'
                        }`}
                        data-testid={`card-shopping-item-${item.id}`}
                      >
                        <div className="p-4 flex items-center gap-3">
                          {isDone ? (
                            <div className="w-7 h-7 rounded-full bg-[#648D4A] flex items-center justify-center shrink-0">
                              <Check size={14} className="text-white" strokeWidth={3} />
                            </div>
                          ) : (
                            <div className="w-10 h-10 rounded-xl bg-[#FAFBF8] border border-[#E8EBE5] flex items-center justify-center text-xl shrink-0">
                              {item.image || "📦"}
                            </div>
                          )}

                          <div className="flex-1 min-w-0">
                            <div className="flex items-start justify-between gap-2">
                              <div>
                                <h3 className={`font-semibold text-sm ${isDone ? 'line-through text-[#8B9286]' : 'text-[#2F5641]'}`}>
                                  {item.name}
                                </h3>
                                <p className="text-xs text-[#8B9286]">
                                  Restam {formatQuantity(item.quantityG, item.unit)}
                                </p>
                              </div>
                              {!isDone && (
                                <span className={`text-[9px] font-bold uppercase px-2 py-0.5 rounded-md text-white shrink-0 ${getStatusColor(item.status)}`}>
                                  {getStatusLabel(item.status)}
                                </span>
                              )}
                            </div>

                            {!isDone && !isConfirming && (
                              <div className="flex items-center justify-between mt-3">
                                <span className="text-[11px] text-[#8B9286]">Comprar:</span>
                                <QtyInput
                                  value={getBuyQty(item)}
                                  onChange={(v) => setBuyQuantities(prev => ({ ...prev, [item.id]: v }))}
                                  unit={item.unit}
                                  size="sm"
                                />
                              </div>
                            )}
                          </div>
                        </div>

                        {!isDone && !isConfirming && (
                          <button
                            onClick={() => handleBuyClick(item)}
                            className="w-full py-3 bg-[#F0F2ED] border-t border-[#E8EBE5] text-[#2F5641] text-xs font-semibold uppercase tracking-wide flex items-center justify-center gap-2 active:bg-[#E8EBE5] transition-colors"
                            data-testid={`button-buy-${item.id}`}
                          >
                            <ShoppingBag size={14} />
                            Comprei
                          </button>
                        )}

                        {isConfirming && (
                          <motion.div
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: "auto", opacity: 1 }}
                            className="border-t border-[#E8EBE5] bg-[#FAFBF8] p-4 space-y-3"
                          >
                            <p className="text-xs text-[#2F5641] font-semibold">Quanto comprou de fato?</p>
                            <div className="flex items-center justify-center">
                              <QtyInput
                                value={confirmQty}
                                onChange={setConfirmQty}
                                unit={item.unit}
                                size="md"
                              />
                            </div>
                            <div className="flex gap-2">
                              <button
                                onClick={() => setConfirmingId(null)}
                                className="flex-1 py-2.5 rounded-xl border border-[#E8EBE5] text-xs font-semibold text-[#8B9286]"
                              >
                                Cancelar
                              </button>
                              <button
                                onClick={() => handleConfirm(item)}
                                disabled={purchaseMutation.isPending}
                                className="flex-1 py-2.5 rounded-xl bg-[#648D4A] text-white text-xs font-semibold disabled:opacity-50"
                                data-testid={`button-confirm-${item.id}`}
                              >
                                {purchaseMutation.isPending ? "Salvando..." : "Confirmar"}
                              </button>
                            </div>
                          </motion.div>
                        )}

                        {isDone && (
                          <div className="px-4 pb-3">
                            <p className="text-[10px] text-[#648D4A] font-medium">Estoque atualizado automaticamente</p>
                          </div>
                        )}
                      </motion.div>
                    );
                  })}
              </AnimatePresence>
            </div>
          )}
        </main>
      </div>
    </Layout>
  );
}
