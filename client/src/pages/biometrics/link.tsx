import Layout from "@/components/layout";
import { ChevronLeft, Scale } from "lucide-react";
import { useLocation } from "wouter";
import { useForm } from "react-hook-form";
import { useState } from "react";
import { useToast } from "@/hooks/use-toast";
import { apiFetch } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { useQueryClient } from "@tanstack/react-query";

interface LinkDeviceForm {
  name: string;
  macAddress: string;
}

export default function BiometricsLinkScreen() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [isLoading, setIsLoading] = useState(false);
  const { register, handleSubmit, formState: { errors } } = useForm<LinkDeviceForm>();

  const onSubmit = async (data: LinkDeviceForm) => {
    setIsLoading(true);
    try {
      const res = await apiFetch("/api/devices", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: data.name,
          type: "MISCALE2",
          macAddress: data.macAddress.toUpperCase(),
          manufacturer: "Xiaomi",
          model: "Mi Body Composition Scale 2",
        }),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Erro ao vincular dispositivo.");
      }
      queryClient.invalidateQueries({ queryKey: [`/api/users/${user?.id}/devices`] });
      toast({
        title: "Balança vinculada com sucesso",
        description: `${data.name} foi adicionada aos seus dispositivos.`,
      });
      setLocation("/biometrics/devices");
    } catch (err: any) {
      toast({
        title: "Erro",
        description: err.message || "Não foi possível vincular o dispositivo.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Layout>
      <div className="bg-[#FAFBF8] min-h-screen pb-24">
        <header className="px-6 pt-14 pb-4 flex items-center justify-between sticky top-0 bg-[#FAFBF8]/80 backdrop-blur-md z-10">
          <button
            onClick={() => setLocation("/biometrics/devices")}
            className="w-10 h-10 -ml-2 flex items-center justify-center text-[#2F5641]"
            data-testid="button-back"
          >
            <ChevronLeft size={24} />
          </button>
          <h1 className="font-display text-lg font-semibold text-[#2F5641]">Vincular Balança</h1>
          <div className="w-10 h-10" />
        </header>

        <main className="px-6">
          <div className="flex justify-center mb-8 mt-4">
            <div className="w-20 h-20 rounded-full bg-[#C7AE6A]/10 flex items-center justify-center">
              <Scale size={40} className="text-[#C7AE6A]" />
            </div>
          </div>

          <p className="text-[#8B9286] text-sm text-center mb-8 px-4">
            Preencha os dados para conectar sua <strong className="text-[#2F5641]">Xiaomi Mi Scale 2</strong>.
          </p>

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
            <div className="space-y-1.5">
              <label className="text-[12px] font-medium text-[#2F5641] uppercase tracking-wide ml-1">
                Nome da balança
              </label>
              <input
                {...register("name", { required: "Informe um nome para a balança" })}
                placeholder="Ex.: Balança da academia"
                className="w-full bg-white border border-[#E8EBE5] rounded-xl px-4 py-3.5 text-[#2F5641] placeholder-[#8B9286] focus:outline-none focus:border-[#C7AE6A] focus:ring-1 focus:ring-[#C7AE6A] transition-all text-sm"
                data-testid="input-device-name"
              />
              {errors.name && <p className="text-[#D97952] text-xs ml-1">{errors.name.message}</p>}
            </div>

            <div className="space-y-1.5">
              <label className="text-[12px] font-medium text-[#2F5641] uppercase tracking-wide ml-1">
                Endereço MAC
              </label>
              <input
                {...register("macAddress", {
                  required: "Informe o endereço MAC",
                  pattern: {
                    value: /^([0-9A-Fa-f]{2}[:-]){5}([0-9A-Fa-f]{2})$/,
                    message: "Formato inválido. Use AA:BB:CC:DD:EE:FF"
                  }
                })}
                placeholder="AA:BB:CC:DD:EE:FF"
                className="w-full bg-white border border-[#E8EBE5] rounded-xl px-4 py-3.5 text-[#2F5641] placeholder-[#8B9286] focus:outline-none focus:border-[#C7AE6A] focus:ring-1 focus:ring-[#C7AE6A] transition-all text-sm uppercase"
                data-testid="input-mac-address"
              />
              <p className="text-[10px] text-[#8B9286] ml-1">
                Você encontra esse código no scanner ou na etiqueta do equipamento.
              </p>
              {errors.macAddress && <p className="text-[#D97952] text-xs ml-1">{errors.macAddress.message}</p>}
            </div>

            <div className="pt-4 flex gap-3">
              <button
                type="button"
                onClick={() => setLocation("/biometrics/devices")}
                className="flex-1 py-4 rounded-xl font-semibold text-sm text-[#5F6B5A] border border-[#E8EBE5] hover:bg-[#F5F3EE] transition-colors"
                data-testid="button-cancel"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={isLoading}
                className="flex-1 bg-[#2F5641] text-white py-4 rounded-xl font-semibold text-sm shadow-lg shadow-[#2F5641]/20 flex items-center justify-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed"
                data-testid="button-submit-link"
              >
                {isLoading ? "Vinculando..." : "Vincular"}
              </button>
            </div>
          </form>
        </main>
      </div>
    </Layout>
  );
}
