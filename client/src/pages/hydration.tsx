import Layout from "@/components/layout";
import { ChevronLeft, Droplets } from "lucide-react";
import { useLocation } from "wouter";

export default function HydrationScreen() {
  const [, setLocation] = useLocation();

  return (
    <Layout>
      <div className="bg-[#FAFBF8] min-h-screen pb-24 flex flex-col relative">
        <header className="px-6 pt-14 pb-4 flex items-center justify-between sticky top-0 bg-[#FAFBF8]/95 backdrop-blur-sm z-10">
          <button data-testid="button-back" onClick={() => setLocation("/home")} className="w-10 h-10 -ml-2 flex items-center justify-center text-[#2F5641]">
            <ChevronLeft size={24} />
          </button>
          <h1 className="font-display text-lg font-semibold text-[#2F5641]">Hidratação</h1>
          <div className="w-10 h-10" />
        </header>

        <main className="px-6 flex-1 flex flex-col items-center justify-center">
          <div className="flex flex-col items-center text-center max-w-[280px]">
            <div className="w-20 h-20 rounded-full bg-[#3D7A8C]/10 flex items-center justify-center mb-6">
              <Droplets size={40} className="text-[#3D7A8C]" />
            </div>
            <h2 className="font-display text-xl font-semibold text-[#2F5641] mb-2" data-testid="text-dev-message">
              Módulo em desenvolvimento
            </h2>
            <p className="text-sm text-[#8B9286] mb-8">
              O controle de hidratação estará disponível em breve. Fique ligado nas próximas atualizações!
            </p>
            <button
              onClick={() => setLocation("/home")}
              className="bg-[#2F5641] text-white px-8 py-3 rounded-xl font-semibold text-sm shadow-lg shadow-[#2F5641]/20"
              data-testid="button-go-home"
            >
              Voltar ao início
            </button>
          </div>
        </main>
      </div>
    </Layout>
  );
}
