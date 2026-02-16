import Layout from "@/components/layout";
import { ChevronLeft, Plus, Trash2, Smartphone } from "lucide-react";
import { useLocation } from "wouter";
import { motion } from "framer-motion";

export default function BiometricsDevicesScreen() {
  const [, setLocation] = useLocation();

  return (
    <Layout>
      <div className="bg-[#FAFBF8] min-h-screen pb-24">
        {/* Header */}
        <header className="px-6 pt-14 pb-4 flex items-center justify-between sticky top-0 bg-[#FAFBF8]/80 backdrop-blur-md z-10">
          <button 
            onClick={() => setLocation("/biometrics")}
            className="w-10 h-10 -ml-2 flex items-center justify-center text-[#2F5641]"
          >
            <ChevronLeft size={24} />
          </button>
          <h1 className="font-display text-lg font-semibold text-[#2F5641]">Dispositivos</h1>
          <div className="w-10 h-10" />
        </header>

        <main className="px-6">
          <p className="text-[#8B9286] text-sm mb-6">
            Gerencie as balanças vinculadas à sua conta.
          </p>

          {/* Device List */}
          <div className="space-y-3">
             {/* Mock Device */}
             <div className="bg-white p-4 rounded-2xl border border-[#E8EBE5] shadow-sm flex items-center justify-between">
                <div className="flex items-center gap-3">
                   <div className="w-10 h-10 rounded-full bg-[#E8EBE5] flex items-center justify-center">
                     <Smartphone size={20} className="text-[#2F5641]" />
                   </div>
                   <div>
                     <h3 className="text-sm font-semibold text-[#2F5641]">Minha Xiaomi Scale</h3>
                     <p className="text-[10px] text-[#8B9286]">Sincronizado hoje às 08:45</p>
                   </div>
                </div>
                <div className="flex items-center gap-2">
                   <span className="w-2 h-2 rounded-full bg-[#648D4A]" title="Ativo" />
                   <button className="p-2 text-[#D97952]">
                     <Trash2 size={16} />
                   </button>
                </div>
             </div>
          </div>

          {/* Empty State / CTA */}
          <button 
            onClick={() => setLocation("/biometrics/link")}
            className="mt-6 w-full py-4 border-2 border-dashed border-[#C7AE6A] rounded-2xl flex flex-col items-center justify-center gap-2 text-[#C7AE6A] hover:bg-[#C7AE6A]/5 transition-colors"
          >
            <Plus size={24} />
            <span className="font-semibold text-sm">Vincular nova balança</span>
          </button>

          {/* Start Weighing CTA */}
          <button 
            onClick={() => setLocation("/biometrics/scan")}
            className="mt-6 w-full bg-[#2F5641] text-white py-4 rounded-xl font-semibold text-sm shadow-lg shadow-[#2F5641]/20 flex items-center justify-center gap-2 active:scale-[0.98] transition-transform"
          >
            Iniciar Pesagem
          </button>
        </main>
      </div>
    </Layout>
  );
}
