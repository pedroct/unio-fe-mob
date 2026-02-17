import Layout from "@/components/layout";
import { ChevronLeft, RefreshCw, X, Check } from "lucide-react";
import { useLocation, useSearch } from "wouter";
import { useState, useEffect, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { apiFetch } from "@/lib/api";
import { useAuth } from "@/lib/auth";

type ScanState = "preparing" | "waiting" | "success" | "timeout" | "error";

interface LeituraData {
  peso_kg: number | null;
  imc: number | null;
  gordura_percentual: number | null;
  massa_muscular_kg: number | null;
  massa_ossea_kg: number | null;
  agua_percentual: number | null;
  gordura_visceral: number | null;
  tmb_kcal: number | null;
  registrado_em: string | null;
}

export default function BiometricsScanScreen() {
  const [, setLocation] = useLocation();
  const search = useSearch();
  const { user } = useAuth();

  const params = new URLSearchParams(search);
  const deviceId = params.get("deviceId");
  const emEsperaAteParam = params.get("emEsperaAte");

  const [scanState, setScanState] = useState<ScanState>(emEsperaAteParam ? "waiting" : "preparing");
  const [timeLeft, setTimeLeft] = useState(300);
  const [leitura, setLeitura] = useState<LeituraData | null>(null);
  const [errorMsg, setErrorMsg] = useState("");
  const pollingRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const baselineRef = useRef<string | null>(null);
  const emEsperaAteRef = useRef<Date | null>(null);

  const stopPolling = useCallback(() => {
    if (pollingRef.current) {
      clearInterval(pollingRef.current);
      pollingRef.current = null;
    }
  }, []);

  useEffect(() => {
    if (emEsperaAteParam) {
      emEsperaAteRef.current = new Date(emEsperaAteParam);
      startPolling();
    } else if (deviceId) {
      prepararPesagem();
    }
    return () => stopPolling();
  }, []);

  const prepararPesagem = async () => {
    if (!deviceId) {
      setScanState("error");
      setErrorMsg("Nenhum dispositivo selecionado.");
      return;
    }
    setScanState("preparing");
    try {
      const res = await apiFetch(`/api/biometria/dispositivos/${deviceId}/preparar-pesagem`, {
        method: "POST",
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.erro || "Erro ao preparar pesagem.");
      }
      const data = await res.json();
      emEsperaAteRef.current = new Date(data.em_espera_ate);
      setScanState("waiting");
      startPolling();
    } catch (err: any) {
      setScanState("error");
      setErrorMsg(err.message || "Erro ao preparar pesagem.");
    }
  };

  const startPolling = () => {
    stopPolling();

    (async () => {
      try {
        const res = await apiFetch("/api/biometria/estado-atual");
        if (res.ok) {
          const data = await res.json();
          baselineRef.current = data.ultima_leitura?.registrado_em || null;
        }
      } catch {}
    })();

    pollingRef.current = setInterval(async () => {
      const deadline = emEsperaAteRef.current;
      if (deadline && new Date() >= deadline) {
        stopPolling();
        setScanState("timeout");
        return;
      }

      try {
        const res = await apiFetch("/api/biometria/estado-atual");
        if (!res.ok) return;
        const data = await res.json();
        const lastReading = data.ultima_leitura;
        if (lastReading && lastReading.registrado_em !== baselineRef.current) {
          stopPolling();
          setLeitura({
            peso_kg: lastReading.peso_kg,
            imc: lastReading.imc,
            gordura_percentual: lastReading.gordura_percentual,
            massa_muscular_kg: lastReading.massa_muscular_kg,
            massa_ossea_kg: lastReading.massa_ossea_kg,
            agua_percentual: lastReading.agua_percentual,
            gordura_visceral: lastReading.gordura_visceral,
            tmb_kcal: lastReading.tmb_kcal,
            registrado_em: lastReading.registrado_em,
          });
          setScanState("success");
        }
      } catch {}
    }, 2500);
  };

  useEffect(() => {
    if (scanState !== "waiting") return;

    const timer = setInterval(() => {
      const deadline = emEsperaAteRef.current;
      if (!deadline) return;
      const remaining = Math.max(0, Math.floor((deadline.getTime() - Date.now()) / 1000));
      setTimeLeft(remaining);
      if (remaining <= 0) {
        clearInterval(timer);
        stopPolling();
        setScanState("timeout");
      }
    }, 1000);

    return () => clearInterval(timer);
  }, [scanState, stopPolling]);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  };

  const handleRetry = () => {
    setTimeLeft(300);
    setScanState("preparing");
    prepararPesagem();
  };

  return (
    <Layout>
      <div className="bg-[#FAFBF8] min-h-screen pb-24 relative overflow-hidden">
        <header className="px-6 pt-14 pb-4 flex items-center justify-between sticky top-0 z-10">
          <button
            onClick={() => setLocation("/biometrics/devices")}
            className="w-10 h-10 -ml-2 flex items-center justify-center text-[#2F5641]"
            data-testid="button-back"
          >
            <ChevronLeft size={24} />
          </button>
          <div className="w-10 h-10" />
        </header>

        <main className="px-6 flex flex-col items-center h-[calc(100vh-140px)] justify-center">
          <AnimatePresence mode="wait">
            {scanState === "preparing" && (
              <motion.div
                key="preparing"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="flex flex-col items-center"
              >
                <div className="w-16 h-16 border-4 border-[#C7AE6A] border-t-transparent rounded-full animate-spin mb-6" />
                <p className="text-[#8B9286] text-sm">Preparando pesagem...</p>
              </motion.div>
            )}

            {scanState === "waiting" && (
              <motion.div
                key="waiting"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="flex flex-col items-center w-full"
              >
                <div className="relative w-[240px] h-[240px] flex items-center justify-center mb-12">
                  <div className="absolute inset-0 bg-[#C7AE6A]/5 rounded-full animate-ping opacity-75" style={{ animationDuration: "3s" }} />
                  <div className="absolute inset-4 bg-[#C7AE6A]/10 rounded-full animate-ping opacity-50" style={{ animationDuration: "3s", animationDelay: "1s" }} />
                  <div className="w-[180px] h-[180px] rounded-full border border-[#C7AE6A]/30 flex items-center justify-center relative">
                    <div className="absolute inset-0 border-t-2 border-[#C7AE6A] rounded-full animate-spin" style={{ animationDuration: "4s" }} />
                    <span className="font-display text-4xl font-bold text-[#2F5641]" data-testid="text-timer">
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

                {timeLeft <= 30 && timeLeft > 0 && (
                  <div className="bg-[#D97952]/10 px-4 py-2 rounded-xl mb-4">
                    <p className="text-[#D97952] text-xs font-semibold text-center">
                      Últimos {timeLeft} segundos!
                    </p>
                  </div>
                )}

                <div className="flex flex-col gap-3 w-full">
                  <button
                    onClick={() => {
                      stopPolling();
                      setLocation("/biometrics/devices");
                    }}
                    className="w-full py-4 text-[#8B9286] font-medium text-sm"
                    data-testid="button-cancel"
                  >
                    Cancelar
                  </button>
                </div>
              </motion.div>
            )}

            {scanState === "success" && leitura && (
              <motion.div
                key="success"
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                className="flex flex-col items-center w-full"
              >
                <div className="w-20 h-20 rounded-full bg-[#648D4A]/10 flex items-center justify-center mb-8">
                  <div className="w-12 h-12 rounded-full bg-[#648D4A] flex items-center justify-center text-white">
                    <Check size={24} />
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
                    <h3 className="font-display text-5xl font-semibold text-[#2F5641] mt-1" data-testid="text-weight-result">
                      {leitura.peso_kg ?? "—"} <span className="text-lg font-sans font-medium text-[#8B9286]">kg</span>
                    </h3>
                  </div>

                  <div className="grid grid-cols-2 gap-4 border-t border-[#E8EBE5] pt-4">
                    {leitura.imc !== null && (
                      <div className="text-center">
                        <span className="text-[10px] text-[#8B9286] uppercase">IMC</span>
                        <p className="font-semibold text-[#2F5641]" data-testid="text-bmi-result">{leitura.imc}</p>
                      </div>
                    )}
                    {leitura.gordura_percentual !== null && (
                      <div className="text-center">
                        <span className="text-[10px] text-[#8B9286] uppercase">Gordura</span>
                        <p className="font-semibold text-[#2F5641]">{leitura.gordura_percentual}%</p>
                      </div>
                    )}
                    {leitura.massa_muscular_kg !== null && (
                      <div className="text-center">
                        <span className="text-[10px] text-[#8B9286] uppercase">Músculo</span>
                        <p className="font-semibold text-[#2F5641]">{leitura.massa_muscular_kg} kg</p>
                      </div>
                    )}
                    {leitura.agua_percentual !== null && (
                      <div className="text-center">
                        <span className="text-[10px] text-[#8B9286] uppercase">Água</span>
                        <p className="font-semibold text-[#2F5641]">{leitura.agua_percentual}%</p>
                      </div>
                    )}
                  </div>
                </div>

                <div className="flex flex-col gap-3 w-full">
                  <button
                    onClick={() => setLocation("/biometrics")}
                    className="w-full bg-[#2F5641] text-white py-4 rounded-xl font-semibold text-sm shadow-lg shadow-[#2F5641]/20"
                    data-testid="button-done"
                  >
                    Concluir
                  </button>
                  <button
                    onClick={() => setLocation("/biometrics")}
                    className="w-full py-4 text-[#8B9286] font-medium text-sm"
                    data-testid="button-view-history"
                  >
                    Ver histórico
                  </button>
                </div>
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
                    onClick={handleRetry}
                    className="w-full bg-[#2F5641] text-white py-4 rounded-xl font-semibold text-sm shadow-lg shadow-[#2F5641]/20"
                    data-testid="button-retry"
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

            {scanState === "error" && (
              <motion.div
                key="error"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="flex flex-col items-center w-full"
              >
                <div className="w-20 h-20 rounded-full bg-[#D97952]/10 flex items-center justify-center mb-8">
                  <X size={40} className="text-[#D97952]" />
                </div>

                <h2 className="font-display text-2xl font-semibold text-[#2F5641] mb-2 text-center">
                  Erro
                </h2>
                <p className="text-[#8B9286] text-center max-w-[280px] mb-8">
                  {errorMsg}
                </p>

                <button
                  onClick={() => setLocation("/biometrics/devices")}
                  className="w-full bg-[#2F5641] text-white py-4 rounded-xl font-semibold text-sm shadow-lg shadow-[#2F5641]/20"
                >
                  Voltar
                </button>
              </motion.div>
            )}
          </AnimatePresence>
        </main>
      </div>
    </Layout>
  );
}
