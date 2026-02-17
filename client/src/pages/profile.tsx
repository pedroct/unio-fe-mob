import Layout from "@/components/layout";
import { ChevronLeft, Camera, Settings, LogOut, AlertCircle, Loader2 } from "lucide-react";
import { useLocation } from "wouter";
import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useAuth } from "@/lib/auth";
import { apiFetch } from "@/lib/api";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

interface ProfileData {
  displayName: string | null;
  email: string | null;
  heightCm: number | null;
  birthDate: string | null;
  sex: string | null;
  activityLevel: string | null;
  scaleMac: string | null;
  avatarUrl: string | null;
}

interface FieldError {
  field: string;
  message: string;
}

function formatMacInput(value: string): string {
  const hex = value.toUpperCase().replace(/[^A-F0-9]/g, "").slice(0, 12);
  const parts: string[] = [];
  for (let i = 0; i < hex.length; i += 2) {
    parts.push(hex.slice(i, i + 2));
  }
  return parts.join(":");
}

function formatBirthDateInput(raw: string): { display: string; iso: string | null } {
  const digits = raw.replace(/\D/g, "").slice(0, 8);
  let display = digits;
  if (digits.length > 2) display = digits.slice(0, 2) + "/" + digits.slice(2);
  if (digits.length > 4) display = digits.slice(0, 2) + "/" + digits.slice(2, 4) + "/" + digits.slice(4);

  let iso: string | null = null;
  if (digits.length === 8) {
    const dd = digits.slice(0, 2);
    const mm = digits.slice(2, 4);
    const yyyy = digits.slice(4, 8);
    iso = `${yyyy}-${mm}-${dd}`;
  }
  return { display, iso };
}

function isoToDisplay(iso: string | null): string {
  if (!iso) return "";
  if (iso.includes("-")) {
    const parts = iso.split("-");
    if (parts.length === 3) return `${parts[2]}/${parts[1]}/${parts[0]}`;
  }
  return iso;
}

export default function ProfileScreen() {
  const [, setLocation] = useLocation();
  const { user, logout, refreshUser } = useAuth();
  const queryClient = useQueryClient();
  const [showLogoutModal, setShowLogoutModal] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [birthDateDisplay, setBirthDateDisplay] = useState("");

  const [form, setForm] = useState({
    displayName: "",
    email: "",
    heightCm: "",
    birthDate: "",
    sex: "",
    activityLevel: "",
    scaleMac: "",
  });

  const profileQuery = useQuery<ProfileData>({
    queryKey: ["profile"],
    queryFn: async () => {
      const res = await apiFetch("/api/auth/profile");
      if (!res.ok) throw new Error("Erro ao carregar perfil.");
      return res.json();
    },
  });

  useEffect(() => {
    if (profileQuery.data) {
      const p = profileQuery.data;
      setForm({
        displayName: p.displayName || "",
        email: p.email || "",
        heightCm: p.heightCm ? String(p.heightCm) : "",
        birthDate: p.birthDate || "",
        sex: p.sex || "",
        activityLevel: p.activityLevel || "",
        scaleMac: p.scaleMac || "",
      });
      setBirthDateDisplay(isoToDisplay(p.birthDate));
    }
  }, [profileQuery.data]);

  const saveMutation = useMutation({
    mutationFn: async (data: Record<string, any>) => {
      const res = await apiFetch("/api/auth/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      const json = await res.json();
      if (!res.ok) {
        throw json;
      }
      return json as ProfileData;
    },
    onSuccess: async (data) => {
      setFieldErrors({});
      queryClient.setQueryData(["profile"], data);
      await refreshUser();
      const p = data;
      setForm({
        displayName: p.displayName || "",
        email: p.email || "",
        heightCm: p.heightCm ? String(p.heightCm) : "",
        birthDate: p.birthDate || "",
        sex: p.sex || "",
        activityLevel: p.activityLevel || "",
        scaleMac: p.scaleMac || "",
      });
      setBirthDateDisplay(isoToDisplay(p.birthDate));
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    },
    onError: (err: any) => {
      if (err?.errors && Array.isArray(err.errors)) {
        const mapped: Record<string, string> = {};
        for (const e of err.errors as FieldError[]) {
          mapped[e.field] = e.message;
        }
        setFieldErrors(mapped);
      } else {
        setFieldErrors({ _general: err?.error || "Erro ao salvar perfil." });
      }
    },
  });

  const validateClient = (): boolean => {
    const errs: Record<string, string> = {};

    if (!form.displayName.trim()) errs.displayName = "Nome é obrigatório.";

    if (form.birthDate) {
      const d = new Date(form.birthDate);
      if (isNaN(d.getTime())) {
        errs.birthDate = "Data de nascimento inválida.";
      } else if (d > new Date()) {
        errs.birthDate = "Data de nascimento não pode ser futura.";
      }
    }

    if (form.heightCm) {
      const h = parseFloat(form.heightCm);
      if (isNaN(h) || h <= 0) errs.heightCm = "Altura deve ser um número positivo.";
    }

    if (form.sex && !["M", "F"].includes(form.sex)) {
      errs.sex = "Sexo deve ser M ou F.";
    }

    if (form.scaleMac) {
      if (!/^([0-9A-F]{2}:){5}[0-9A-F]{2}$/.test(form.scaleMac)) {
        errs.scaleMac = "MAC inválido. Use o formato AA:BB:CC:DD:EE:FF.";
      }
    }

    setFieldErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSave = () => {
    if (!validateClient()) return;
    const payload: Record<string, any> = {
      displayName: form.displayName,
    };
    payload.birthDate = form.birthDate || null;
    payload.heightCm = form.heightCm ? parseFloat(form.heightCm) : null;
    payload.sex = form.sex || null;
    payload.activityLevel = form.activityLevel || null;
    payload.scaleMac = form.scaleMac || null;
    saveMutation.mutate(payload);
  };

  const handleLogout = async () => {
    setShowLogoutModal(false);
    await logout();
    setLocation("/auth");
  };

  const photo = user?.avatarUrl || `https://api.dicebear.com/7.x/avataaars/svg?seed=${user?.displayName || "user"}`;

  if (profileQuery.isLoading) {
    return (
      <Layout>
        <div className="min-h-screen flex items-center justify-center" data-testid="loading-profile">
          <Loader2 className="w-8 h-8 animate-spin text-[#2F5641]" />
        </div>
      </Layout>
    );
  }

  if (profileQuery.isError) {
    return (
      <Layout>
        <div className="min-h-screen flex flex-col items-center justify-center px-6 gap-4" data-testid="error-profile">
          <AlertCircle className="w-12 h-12 text-[#BE4E35]" />
          <p className="text-sm text-[#BE4E35] text-center">Não foi possível carregar seu perfil.</p>
          <button
            onClick={() => profileQuery.refetch()}
            className="bg-[#2F5641] text-white px-6 py-2 rounded-xl text-sm font-medium"
            data-testid="button-retry"
          >
            Tentar novamente
          </button>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="bg-[#FAFBF8] min-h-screen pb-32">
        <header className="px-6 pt-14 pb-4 flex items-center justify-between sticky top-0 bg-[#FAFBF8]/95 backdrop-blur-sm z-10">
          <button
            onClick={() => setLocation("/home")}
            className="w-10 h-10 -ml-2 flex items-center justify-center text-[#2F5641]"
            data-testid="button-back"
          >
            <ChevronLeft size={24} />
          </button>
          <h1 className="font-display text-lg font-semibold text-[#2F5641]">Meu Perfil</h1>
          <button className="w-10 h-10 flex items-center justify-center text-[#2F5641]">
            <Settings size={20} />
          </button>
        </header>

        <main className="px-6 space-y-8">

          <AnimatePresence>
            {saveSuccess && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                className="bg-[#648D4A]/10 border border-[#648D4A]/20 rounded-xl px-4 py-3 text-sm text-[#648D4A] font-medium"
                data-testid="text-save-success"
              >
                Perfil atualizado com sucesso.
              </motion.div>
            )}
          </AnimatePresence>

          {fieldErrors._general && (
            <div className="bg-[#BE4E35]/10 border border-[#BE4E35]/20 rounded-xl px-4 py-3 text-sm text-[#BE4E35]" data-testid="text-save-error">
              {fieldErrors._general}
            </div>
          )}

          <section className="flex flex-col items-center">
            <div className="relative mb-6">
              <div className="w-24 h-24 rounded-full border-4 border-white shadow-lg overflow-hidden bg-[#E8EBE5]">
                <img src={photo} alt="Profile" className="w-full h-full object-cover" />
              </div>
              <button
                className="absolute bottom-0 right-0 w-8 h-8 rounded-full bg-[#2F5641] text-white flex items-center justify-center border-2 border-[#FAFBF8] shadow-sm"
                title="Alterar foto de perfil"
                aria-label="Alterar foto de perfil"
              >
                <Camera size={14} />
              </button>
            </div>

            <div className="w-full space-y-4">
              <div>
                <h2 className="text-sm font-bold text-[#2F5641] uppercase tracking-wide mb-3">Conta</h2>
                <div className="space-y-3">
                  <div>
                    <label className="text-[10px] font-bold uppercase tracking-wider text-[#8B9286] mb-1 block">Nome</label>
                    <input
                      type="text"
                      value={form.displayName}
                      onChange={(e) => setForm({ ...form, displayName: e.target.value })}
                      placeholder="Digite seu nome"
                      className={`w-full bg-white border rounded-xl px-4 py-3 text-sm font-medium text-[#2F5641] focus:outline-none focus:border-[#2F5641] ${fieldErrors.displayName ? "border-[#BE4E35]" : "border-[#E8EBE5]"}`}
                      data-testid="input-name"
                    />
                    {fieldErrors.displayName && (
                      <p className="text-[#BE4E35] text-[10px] mt-1 flex items-center gap-1" data-testid="error-name">
                        <AlertCircle size={10} /> {fieldErrors.displayName}
                      </p>
                    )}
                  </div>
                  <div>
                    <label className="text-[10px] font-bold uppercase tracking-wider text-[#8B9286] mb-1 block">E-mail</label>
                    <input
                      type="email"
                      value={form.email}
                      disabled
                      placeholder="seuemail@exemplo.com"
                      className="w-full bg-[#F5F3EE] border border-[#E8EBE5] rounded-xl px-4 py-3 text-sm font-medium text-[#8B9286] cursor-not-allowed"
                      data-testid="input-email"
                    />
                  </div>
                </div>
              </div>
            </div>
          </section>

          <section>
            <h2 className="text-sm font-bold text-[#2F5641] uppercase tracking-wide mb-4">
              Dados pessoais
            </h2>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-[10px] font-bold uppercase tracking-wider text-[#8B9286] mb-1 block">Altura (cm)</label>
                <input
                  type="number"
                  value={form.heightCm}
                  onChange={(e) => setForm({ ...form, heightCm: e.target.value })}
                  placeholder="Ex.: 178"
                  className={`w-full bg-white border rounded-xl px-4 py-3 text-sm font-medium text-[#2F5641] focus:outline-none focus:border-[#2F5641] ${fieldErrors.heightCm ? "border-[#BE4E35]" : "border-[#E8EBE5]"}`}
                  data-testid="input-height"
                />
                {fieldErrors.heightCm && (
                  <p className="text-[#BE4E35] text-[10px] mt-1" data-testid="error-height">
                    <AlertCircle size={10} className="inline mr-1" />{fieldErrors.heightCm}
                  </p>
                )}
              </div>
              <div>
                <label className="text-[10px] font-bold uppercase tracking-wider text-[#8B9286] mb-1 block">Nascimento</label>
                <input
                  type="text"
                  value={birthDateDisplay}
                  onChange={(e) => {
                    const { display, iso } = formatBirthDateInput(e.target.value);
                    setBirthDateDisplay(display);
                    if (iso) {
                      setForm({ ...form, birthDate: iso });
                    } else if (display === "") {
                      setForm({ ...form, birthDate: "" });
                    }
                  }}
                  placeholder="DD/MM/AAAA"
                  inputMode="numeric"
                  maxLength={10}
                  className={`w-full bg-white border rounded-xl px-4 py-3 text-sm font-medium text-[#2F5641] focus:outline-none focus:border-[#2F5641] ${fieldErrors.birthDate ? "border-[#BE4E35]" : "border-[#E8EBE5]"}`}
                  data-testid="input-birthdate"
                />
                {fieldErrors.birthDate && (
                  <p className="text-[#BE4E35] text-[10px] mt-1" data-testid="error-birthdate">
                    <AlertCircle size={10} className="inline mr-1" />{fieldErrors.birthDate}
                  </p>
                )}
              </div>
              <div>
                <label className="text-[10px] font-bold uppercase tracking-wider text-[#8B9286] mb-1 block">Sexo</label>
                <select
                  value={form.sex}
                  onChange={(e) => setForm({ ...form, sex: e.target.value })}
                  className={`w-full bg-white border rounded-xl px-4 py-3 text-sm font-medium text-[#2F5641] focus:outline-none focus:border-[#2F5641] ${fieldErrors.sex ? "border-[#BE4E35]" : "border-[#E8EBE5]"}`}
                  data-testid="select-sex"
                >
                  <option value="" disabled>Selecione</option>
                  <option value="M">Masculino</option>
                  <option value="F">Feminino</option>
                </select>
                {fieldErrors.sex && (
                  <p className="text-[#BE4E35] text-[10px] mt-1" data-testid="error-sex">
                    <AlertCircle size={10} className="inline mr-1" />{fieldErrors.sex}
                  </p>
                )}
              </div>
              <div>
                <label className="text-[10px] font-bold uppercase tracking-wider text-[#8B9286] mb-1 block">Nível atividade</label>
                <select
                  value={form.activityLevel}
                  onChange={(e) => setForm({ ...form, activityLevel: e.target.value })}
                  className="w-full bg-white border rounded-xl px-4 py-3 text-sm font-medium text-[#2F5641] focus:outline-none focus:border-[#2F5641] border-[#E8EBE5]"
                  data-testid="select-activity"
                >
                  <option value="" disabled>Selecione</option>
                  <option value="sedentary">Sedentário</option>
                  <option value="light">Atividade leve</option>
                  <option value="moderate">Atividade moderada</option>
                  <option value="active">Muito ativo</option>
                </select>
              </div>
            </div>
          </section>

          <section>
            <h2 className="text-sm font-bold text-[#2F5641] uppercase tracking-wide mb-4">
              Dispositivos
            </h2>
            <div>
              <label className="text-[10px] font-bold uppercase tracking-wider text-[#8B9286] mb-1 block">MAC da balança</label>
              <input
                type="text"
                value={form.scaleMac}
                onChange={(e) => {
                  const formatted = formatMacInput(e.target.value);
                  setForm({ ...form, scaleMac: formatted });
                }}
                placeholder="AA:BB:CC:DD:EE:FF"
                maxLength={17}
                className={`w-full bg-white border rounded-xl px-4 py-3 text-sm font-medium font-mono text-[#2F5641] focus:outline-none focus:border-[#2F5641] ${fieldErrors.scaleMac ? "border-[#BE4E35]" : "border-[#E8EBE5]"}`}
                data-testid="input-scale-mac"
              />
              {fieldErrors.scaleMac && (
                <p className="text-[#BE4E35] text-[10px] mt-1" data-testid="error-scale-mac">
                  <AlertCircle size={10} className="inline mr-1" />{fieldErrors.scaleMac}
                </p>
              )}
              <p className="text-[10px] text-[#8B9286] mt-2 opacity-80">
                Endereço MAC da sua Xiaomi Mi Scale 2 para conexão Bluetooth.
              </p>
            </div>
          </section>

          <button
            onClick={() => setShowLogoutModal(true)}
            className="w-full py-4 text-[#BE4E35] font-semibold text-sm flex items-center justify-center gap-2 hover:bg-[#BE4E35]/5 rounded-xl transition-colors"
            data-testid="button-logout"
          >
            <LogOut size={16} /> Sair da conta
          </button>

          <div className="fixed bottom-[90px] left-6 right-6 max-w-[382px] mx-auto z-20">
            <button
              onClick={handleSave}
              disabled={saveMutation.isPending}
              className="w-full bg-[#2F5641] text-white py-4 rounded-2xl font-bold text-lg shadow-xl shadow-[#2F5641]/25 active:scale-[0.98] transition-all disabled:opacity-60"
              data-testid="button-save"
            >
              {saveMutation.isPending ? "Salvando..." : "Salvar alterações"}
            </button>
          </div>

        </main>

        <AnimatePresence>
          {showLogoutModal && (
            <>
              <motion.div
                initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                className="fixed inset-0 bg-black/40 backdrop-blur-sm z-40"
                onClick={() => setShowLogoutModal(false)}
              />
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }}
                className="fixed top-1/2 left-6 right-6 -translate-y-1/2 bg-white rounded-3xl p-6 z-50 max-w-[380px] mx-auto shadow-2xl"
              >
                <div className="text-center mb-6">
                  <div className="w-12 h-12 rounded-full bg-[#BE4E35]/10 flex items-center justify-center text-[#BE4E35] mx-auto mb-4">
                    <LogOut size={24} />
                  </div>
                  <h2 className="text-lg font-bold text-[#2F5641] mb-2">Sair da conta?</h2>
                  <p className="text-sm text-[#8B9286]">Você precisará entrar novamente para acessar seus dados.</p>
                </div>
                <div className="flex flex-col gap-3">
                  <button
                    onClick={handleLogout}
                    className="w-full bg-[#BE4E35] text-white py-3.5 rounded-xl font-bold text-sm shadow-lg shadow-[#BE4E35]/20 active:scale-[0.98] transition-all"
                    data-testid="button-confirm-logout"
                  >
                    Confirmar
                  </button>
                  <button
                    onClick={() => setShowLogoutModal(false)}
                    className="w-full bg-[#F5F3EE] text-[#8B9286] py-3.5 rounded-xl font-bold text-sm active:scale-[0.98] transition-all"
                    data-testid="button-cancel-logout"
                  >
                    Cancelar
                  </button>
                </div>
              </motion.div>
            </>
          )}
        </AnimatePresence>
      </div>
    </Layout>
  );
}
