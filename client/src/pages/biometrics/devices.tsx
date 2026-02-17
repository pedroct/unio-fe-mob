import Layout from "@/components/layout";
import { ChevronLeft, Plus, Scale, Trash2, Loader2 } from "lucide-react";
import { useLocation } from "wouter";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/lib/auth";
import { apiFetch } from "@/lib/api";

interface StagingDevice {
  id: number;
  mac: string;
  nome: string | null;
  tipo: string | null;
  em_espera_ate: string | null;
  criado_em: string;
}

export default function BiometricsDevicesScreen() {
  const [, setLocation] = useLocation();
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const { data: devices, isLoading } = useQuery<StagingDevice[]>({
    queryKey: ["biometria", "dispositivos"],
    queryFn: async () => {
      const res = await apiFetch("/api/biometria/dispositivos");
      if (!res.ok) throw new Error("Erro ao buscar dispositivos");
      const data = await res.json();
      return Array.isArray(data) ? data : data.dispositivos ?? [];
    },
    enabled: !!user,
  });

  const deleteMutation = useMutation({
    mutationFn: async (deviceId: number) => {
      const res = await apiFetch(`/api/biometria/dispositivos/${deviceId}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Erro ao desvincular dispositivo");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["biometria", "dispositivos"] });
    },
  });

  const scaleDevices = devices ?? [];

  return (
    <Layout>
      <div className="bg-[#FAFBF8] min-h-screen pb-24">
        <header className="px-6 pt-14 pb-4 flex items-center justify-between sticky top-0 bg-[#FAFBF8]/80 backdrop-blur-md z-10">
          <button
            onClick={() => setLocation("/biometrics")}
            className="w-10 h-10 -ml-2 flex items-center justify-center text-[#2F5641]"
            data-testid="button-back"
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

          {isLoading ? (
            <div className="text-center py-12">
              <Loader2 size={32} className="mx-auto text-[#8B9286] animate-spin mb-4" />
              <p className="text-[#8B9286] text-sm">Carregando dispositivos...</p>
            </div>
          ) : scaleDevices.length === 0 ? (
            <div className="text-center py-12">
              <Scale size={48} className="mx-auto text-[#E8EBE5] mb-4" />
              <p className="text-[#8B9286] text-sm">Nenhuma balança vinculada ainda.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {scaleDevices.map((device) => (
                <div
                  key={device.id}
                  className="bg-white p-4 rounded-2xl border border-[#E8EBE5] shadow-sm flex items-center justify-between"
                  data-testid={`card-device-${device.id}`}
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-[#648D4A]/10 flex items-center justify-center">
                      <Scale size={20} className="text-[#648D4A]" />
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-[#2F5641]">{device.nome || "Balança"}</p>
                      <p className="text-[10px] text-[#8B9286] font-mono">{device.mac}</p>
                      {device.tipo && <p className="text-[10px] text-[#8B9286]">{device.tipo}</p>}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setLocation(`/biometrics/scan?deviceId=${device.id}`)}
                      className="px-3 py-1.5 bg-[#2F5641] text-white text-xs font-semibold rounded-lg"
                      data-testid={`button-scan-${device.id}`}
                    >
                      Pesar
                    </button>
                    <button
                      onClick={() => deleteMutation.mutate(device.id)}
                      disabled={deleteMutation.isPending}
                      className="w-8 h-8 rounded-full flex items-center justify-center text-[#BE4E35]/60 hover:bg-[#BE4E35]/10 transition-colors disabled:opacity-30"
                      data-testid={`button-delete-${device.id}`}
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}

          <button
            onClick={() => setLocation("/biometrics/link")}
            className="mt-6 w-full py-4 border-2 border-dashed border-[#C7AE6A] rounded-2xl flex flex-col items-center justify-center gap-2 text-[#C7AE6A] hover:bg-[#C7AE6A]/5 transition-colors"
            data-testid="button-link-device"
          >
            <Plus size={24} />
            <span className="font-semibold text-sm">Vincular nova balança</span>
          </button>
        </main>
      </div>
    </Layout>
  );
}
