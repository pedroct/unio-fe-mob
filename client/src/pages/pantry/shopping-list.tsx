import Layout from "@/components/layout";
import { ChevronLeft, ShoppingCart, Check, Plus, Minus, Trash2 } from "lucide-react";
import { useLocation } from "wouter";
import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";

const INVENTORY_DATA = [
  { id: 1, name: "Whey Protein", category: "Suplementos", quantity: "200g", status: "low", image: "⚡" },
  { id: 2, name: "Arroz Basmati", category: "Grãos", quantity: "2kg", status: "good", image: "🍚" },
  { id: 3, name: "Peito de Frango", category: "Proteínas", quantity: "3kg", status: "good", image: "🍗" },
  { id: 4, name: "Azeite de Oliva", category: "Gorduras", quantity: "100ml", status: "critical", image: "🫒" },
  { id: 5, name: "Aveia em Flocos", category: "Grãos", quantity: "500g", status: "medium", image: "🥣" },
  { id: 6, name: "Creatina", category: "Suplementos", quantity: "150g", status: "good", image: "💪" },
];

export default function ShoppingListScreen() {
  const [, setLocation] = useLocation();
  const [checkedItems, setCheckedItems] = useState<Set<number>>(new Set());
  const [quantities, setQuantities] = useState<Record<number, number>>(() => {
    const initial: Record<number, number> = {};
    INVENTORY_DATA.filter(i => i.status === "low" || i.status === "critical").forEach(i => {
      initial[i.id] = 1;
    });
    return initial;
  });

  const shoppingItems = INVENTORY_DATA.filter(item => item.status === "low" || item.status === "critical");

  const updateQuantity = (id: number, delta: number) => {
    setQuantities(prev => ({
      ...prev,
      [id]: Math.max(1, (prev[id] || 1) + delta),
    }));
  };

  const toggleItem = (id: number) => {
    setCheckedItems(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
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

  const getPriorityLabel = (status: string) => {
    switch (status) {
      case 'critical': return 'Urgente';
      case 'low': return 'Repor em breve';
      default: return '';
    }
  };

  const uncheckedCount = shoppingItems.filter(i => !checkedItems.has(i.id)).length;
  const checkedCount = shoppingItems.filter(i => checkedItems.has(i.id)).length;

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
                  {uncheckedCount === 0
                    ? "Tudo comprado!"
                    : `${uncheckedCount} ${uncheckedCount === 1 ? 'item pendente' : 'itens pendentes'}`}
                </p>
              </div>
            </div>
            <div className="w-full bg-white/20 rounded-full h-2">
              <motion.div
                className="bg-white rounded-full h-2"
                initial={{ width: 0 }}
                animate={{ width: shoppingItems.length > 0 ? `${(checkedCount / shoppingItems.length) * 100}%` : '0%' }}
                transition={{ duration: 0.4, ease: "easeOut" }}
              />
            </div>
          </div>

          {shoppingItems.length === 0 ? (
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
                {shoppingItems
                  .sort((a, b) => {
                    const isAChecked = checkedItems.has(a.id);
                    const isBChecked = checkedItems.has(b.id);
                    if (isAChecked !== isBChecked) return isAChecked ? 1 : -1;
                    if (a.status === 'critical' && b.status !== 'critical') return -1;
                    if (a.status !== 'critical' && b.status === 'critical') return 1;
                    return 0;
                  })
                  .map((item) => {
                    const isChecked = checkedItems.has(item.id);
                    return (
                      <motion.div
                        key={item.id}
                        layout
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.9 }}
                        className={`bg-white p-4 rounded-2xl border shadow-sm flex items-center gap-4 transition-colors ${
                          isChecked ? 'border-[#648D4A]/30 opacity-60' : 'border-[#E8EBE5]'
                        }`}
                        data-testid={`card-shopping-item-${item.id}`}
                      >
                        <button
                          onClick={() => toggleItem(item.id)}
                          className={`w-7 h-7 rounded-full border-2 flex items-center justify-center shrink-0 transition-colors ${
                            isChecked
                              ? 'bg-[#648D4A] border-[#648D4A]'
                              : 'border-[#C7CFC2] bg-transparent'
                          }`}
                          data-testid={`button-toggle-item-${item.id}`}
                        >
                          {isChecked && <Check size={14} className="text-white" strokeWidth={3} />}
                        </button>

                        <div className="w-10 h-10 rounded-xl bg-[#FAFBF8] border border-[#E8EBE5] flex items-center justify-center text-xl shrink-0">
                          {item.image}
                        </div>

                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between gap-2">
                            <div>
                              <h3 className={`font-semibold text-sm ${isChecked ? 'line-through text-[#8B9286]' : 'text-[#2F5641]'}`}>
                                {item.name}
                              </h3>
                              <p className="text-xs text-[#8B9286]">{item.category} • Restam {item.quantity}</p>
                            </div>
                            <span className={`text-[9px] font-bold uppercase px-2 py-0.5 rounded-md text-white shrink-0 ${getStatusColor(item.status)}`}>
                              {getStatusLabel(item.status)}
                            </span>
                          </div>

                          <div className="flex items-center justify-between mt-3">
                            <span className="text-[11px] text-[#8B9286]">Qtd. a comprar:</span>
                            <div className="flex items-center gap-2">
                              <button
                                onClick={() => updateQuantity(item.id, -1)}
                                disabled={isChecked}
                                className="w-7 h-7 rounded-lg bg-[#F0F2ED] border border-[#E8EBE5] flex items-center justify-center text-[#2F5641] disabled:opacity-30"
                                data-testid={`button-decrease-${item.id}`}
                              >
                                <Minus size={14} />
                              </button>
                              <span className="text-sm font-bold text-[#2F5641] w-6 text-center" data-testid={`text-quantity-${item.id}`}>
                                {quantities[item.id] || 1}
                              </span>
                              <button
                                onClick={() => updateQuantity(item.id, 1)}
                                disabled={isChecked}
                                className="w-7 h-7 rounded-lg bg-[#2F5641] flex items-center justify-center text-white disabled:opacity-30"
                                data-testid={`button-increase-${item.id}`}
                              >
                                <Plus size={14} />
                              </button>
                            </div>
                          </div>
                        </div>
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
