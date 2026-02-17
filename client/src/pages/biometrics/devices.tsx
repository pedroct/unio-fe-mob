import Layout from "@/components/layout";
import { ChevronLeft, Plus, Trash2, Smartphone, Scale, Loader2 } from "lucide-react";
import { useLocation } from "wouter";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/lib/auth";
import { apiFetch } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";
import { useState } from "react";

interface DeviceData {
  id: string;
  name: string;
  type: string;
  macAddress: string | null;
  manufacturer: string | null;
  model: string | null;
  lastSeenAt: string | null;
  emEsperaAte: string | null;
  createdAt: string;
}

export default function BiometricsDevicesScreen() {
  const [, setLocation] = useLocation();
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [preparingId, setPreparingId] = useState<string | null>(null);

  const { data: devicesList = [], isLoading } = useQuery<DeviceData[]>({
    queryKey: [`/api/users/${user?.id}/devices`],
    enabled: !!user,
  });

  const scaleDevices = devicesList.filter(
    (d) => d.type === "MISCALE2" || d.type === "scale"
  );

  const deleteMutation = useMutation({
    mutationFn: async (deviceId: string) => {
      const res = await apiFetch(`/api/devices/${deviceId}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Erro ao remover dispositivo.");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/users/${user?.id}/devices`] });
      toast({ title: "Dispositivo removido" });
    },
    onError: () => {
      toast({ title: "Erro", description: "Não foi possível remover.", variant: "destructive" });
    },
  });

  const handleStartWeighing = async (device: DeviceData) => {
    setPreparingId(device.id);
    try {
      const res = await apiFetch(`/api/biometria/dispositivos/${device.id}/preparar-pesagem`, {
        method: "POST",
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.erro || "Erro ao preparar pesagem.");
      }
      const data = await res.json();
      setLocation(`/biometrics/scan?deviceId=${device.id}&emEsperaAte=${encodeURIComponent(data.em_espera_ate)}`);
    } catch (err: any) {
      toast({ title: "Erro", description: err.message, variant: "destructive" });
    } finally {
      setPreparingId(null);
    }
  };

  const formatLastSeen = (dateStr: string | null) => {
    if (!dateStr) return "Nunca sincronizado";
    const d = new Date(dateStr);
    const now = new Date();
    const diffMs = now.getTime() - d.getTime();
    const diffH = Math.floor(diffMs / (1000 * 60 * 60));
    if (diffH < 1) return "Sincronizado agora";
    if (diffH < 24) return `Sincronizado há ${diffH}h`;
    const diffD = Math.floor(diffH / 24);
    return `Sincronizado há ${diffD}d`;
  };

  const maskMac = (mac: string | null) => {
    if (!mac) return "";
    const parts = mac.split(":");
    if (parts.length < 6) return mac;
    return `${parts[0]}:${parts[1]}:••:••:${parts[4]}:${parts[5]}`;
  };

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
            <div className="flex justify-center py-12">
              <Loader2 size={24} className="animate-spin text-[#8B9286]" />
            </div>
          ) : scaleDevices.length === 0 ? (
            <div className="text-center py-12">
              <Scale size={48} className="mx-auto text-[#E8EBE5] mb-4" />
              <p className="text-[#8B9286] text-sm">Nenhuma balança vinculada ainda.</p>
            </div>
          ) : (
            <div className="space-y-3" data-testid="devices-list">
              {scaleDevices.map((device) => (
                <div
                  key={device.id}
                  className="bg-white p-4 rounded-2xl border border-[#E8EBE5] shadow-sm"
                  data-testid={`card-device-${device.id}`}
                >
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-[#E8EBE5] flex items-center justify-center">
                        <Smartphone size={20} className="text-[#2F5641]" />
                      </div>
                      <div>
                        <h3 className="text-sm font-semibold text-[#2F5641]">{device.name}</h3>
                        <p className="text-[10px] text-[#8B9286]">{formatLastSeen(device.lastSeenAt)}</p>
                        {device.macAddress && (
                          <p className="text-[10px] text-[#8B9286] font-mono">{maskMac(device.macAddress)}</p>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-[#648D4A]" title="Ativo" />
                      <button
                        onClick={() => deleteMutation.mutate(device.id)}
                        className="p-2 text-[#D97952]"
                        data-testid={`button-delete-${device.id}`}
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </div>

                  <button
                    onClick={() => handleStartWeighing(device)}
                    disabled={preparingId === device.id}
                    className="w-full bg-[#2F5641] text-white py-3 rounded-xl font-semibold text-sm shadow-lg shadow-[#2F5641]/20 flex items-center justify-center gap-2 active:scale-[0.98] transition-transform disabled:opacity-70"
                    data-testid={`button-start-weighing-${device.id}`}
                  >
                    {preparingId === device.id ? (
                      <>
                        <Loader2 size={16} className="animate-spin" />
                        Preparando...
                      </>
                    ) : (
                      <>
                        <Scale size={16} />
                        Iniciar Pesagem
                      </>
                    )}
                  </button>
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
