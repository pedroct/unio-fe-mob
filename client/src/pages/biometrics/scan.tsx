import Layout from "@/components/layout";
import { ChevronLeft, RefreshCw, X } from "lucide-react";
import { useLocation } from "wouter";
import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";

type ScanState = "waiting" | "success" | "timeout";

export default function BiometricsScanScreen() {
  const [, setLocation] = useLocation();
  const [scanState, setScanState] = useState<ScanState>("waiting");
  const [timeLeft, setTimeLeft] = useState(300); // 5 minutes in seconds

  // Timer Logic
  useEffect(() => {
    if (scanState !== "waiting") return;
    
    const timer = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          setScanState("timeout");
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    // Mock Success after 5 seconds for Demo
    const mockSuccess = setTimeout(() => {
      if (Math.random() > 0.1) { // 90% success rate mock
        setScanState("success");
      }
    }, 5000);

    return () => {
      clearInterval(timer);
      clearTimeout(mockSuccess);
    };
  }, [scanState]);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <Layout>
      <div className="bg-[#FAFBF8] min-h-screen pb-24 relative overflow-hidden">
        {/* Header */}
        <header className="px-6 pt-14 pb-4 flex items-center justify-between sticky top-0 z-10">
          <button 
            onClick={() => setLocation("/biometrics/devices")}
            className="w-10 h-10 -ml-2 flex items-center justify-center text-[#2F5641]"
          >
            <ChevronLeft size={24} />
          </button>
          <div className="w-10 h-10" />
        </header>

        <main className="px-6 flex flex-col items-center h-[calc(100vh-140px)] justify-center">
          
          <AnimatePresence mode="wait">
            {scanState === "waiting" && (
              <motion.div 
                key="waiting"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="flex flex-col items-center w-full"
              >
                {/* Radar Animation */}
                <div className="relative w-[240px] h-[240px] flex items-center justify-center mb-12">
                   <div className="absolute inset-0 bg-[#C7AE6A]/5 rounded-full animate-ping opacity-75" style={{ animationDuration: '3s' }} />
                   <div className="absolute inset-4 bg-[#C7AE6A]/10 rounded-full animate-ping opacity-50" style={{ animationDuration: '3s', animationDelay: '1s' }} />
                   
                   <div className="w-[180px] h-[180px] rounded-full border border-[#C7AE6A]/30 flex items-center justify-center relative">
                      <div className="absolute inset-0 border-t-2 border-[#C7AE6A] rounded-full animate-spin" style={{ animationDuration: '4s' }} />
                      <span className="font-display text-4xl font-bold text-[#2F5641]">
                        {formatTime(timeLeft)}
                      </span>
                   </div>
                </div>

                <h2 className="font-display text-2xl font-semibold text-[#2F5641] mb-2 text-center">
                  Aguardando sua pesagem
                </h2>
                <p className="text-[#8B9286] text-center max-w-[280px] mb-8">
                  Suba na balança para registrar a medição. Mantenha os pés secos.
                </p>

                <div className="flex flex-col gap-3 w-full">
                  <button className="w-full bg-[#2F5641] text-white py-4 rounded-xl font-semibold text-sm shadow-lg shadow-[#2F5641]/20">
                     Estou na balança
                  </button>
                  <button 
                    onClick={() => setLocation("/biometrics/devices")}
                    className="w-full py-4 text-[#8B9286] font-medium text-sm"
                  >
                     Cancelar
                  </button>
                </div>
              </motion.div>
            )}

            {scanState === "success" && (
              <motion.div 
                key="success"
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                className="flex flex-col items-center w-full"
              >
                <div className="w-20 h-20 rounded-full bg-[#648D4A]/10 flex items-center justify-center mb-8">
                   <div className="w-12 h-12 rounded-full bg-[#648D4A] flex items-center justify-center text-white">
                      <RefreshCw size={24} /> {/* Icon should probably be check, but using refresh to imply sync */}
                   </div>
                </div>

                <h2 className="font-display text-2xl font-semibold text-[#2F5641] mb-2 text-center">
                  Pesagem registrada
                </h2>
                <p className="text-[#8B9286] text-center mb-8">
                  Sua medição foi salva com sucesso.
                </p>

                <div className="bg-white p-6 rounded-3xl border border-[#E8EBE5] w-full mb-8 shadow-sm">
                   <div className="text-center mb-6">
                      <span className="text-xs font-medium text-[#8B9286] uppercase tracking-wider">Peso</span>
                      <h3 className="font-display text-5xl font-semibold text-[#2F5641] mt-1">
                        72.0 <span className="text-lg font-sans font-medium text-[#8B9286]">kg</span>
                      </h3>
                   </div>
                   
                   <div className="grid grid-cols-2 gap-4 border-t border-[#E8EBE5] pt-4">
                      <div className="text-center">
                         <span className="text-[10px] text-[#8B9286] uppercase">IMC</span>
                         <p className="font-semibold text-[#2F5641]">24.4</p>
                      </div>
                      <div className="text-center">
                         <span className="text-[10px] text-[#8B9286] uppercase">Gordura</span>
                         <p className="font-semibold text-[#2F5641]">18.9%</p>
                      </div>
                   </div>
                </div>

                <button 
                  onClick={() => setLocation("/biometrics")}
                  className="w-full bg-[#2F5641] text-white py-4 rounded-xl font-semibold text-sm shadow-lg shadow-[#2F5641]/20"
                >
                   Concluir
                </button>
              </motion.div>
            )}

            {scanState === "timeout" && (
              <motion.div 
                key="timeout"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="flex flex-col items-center w-full"
              >
                <div className="w-20 h-20 rounded-full bg-[#D97952]/10 flex items-center justify-center mb-8">
                   <X size={40} className="text-[#D97952]" />
                </div>

                <h2 className="font-display text-2xl font-semibold text-[#2F5641] mb-2 text-center">
                  Tempo encerrado
                </h2>
                <p className="text-[#8B9286] text-center max-w-[280px] mb-8">
                  Não recebemos sua pesagem a tempo. Vamos tentar de novo?
                </p>

                <div className="flex flex-col gap-3 w-full">
                  <button 
                    onClick={() => {
                        setScanState("waiting");
                        setTimeLeft(300);
                    }}
                    className="w-full bg-[#2F5641] text-white py-4 rounded-xl font-semibold text-sm shadow-lg shadow-[#2F5641]/20"
                  >
                     Tentar novamente
                  </button>
                  <button 
                    onClick={() => setLocation("/biometrics/devices")}
                    className="w-full py-4 text-[#8B9286] font-medium text-sm"
                  >
                     Voltar
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

        </main>
      </div>
    </Layout>
  );
}
