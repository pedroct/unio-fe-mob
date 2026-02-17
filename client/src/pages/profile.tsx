import Layout from "@/components/layout";
import { ChevronLeft, Camera, Settings, LogOut, AlertCircle, Loader2 } from "lucide-react";
import { useLocation } from "wouter";
import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useAuth } from "@/lib/auth";
import { apiFetch } from "@/lib/api";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

interface StagingProfile {
  id: number;
  usuario_id: number;
  tipo: string | null;
  altura_cm: number | null;
  peso_meta_kg: number | null;
  objetivo: string | null;
  data_nascimento: string | null;
  sexo: string | null;
  foto_url: string | null;
  mac_balanca: string | null;
  idade: number | null;
  criado_em: string;
}

interface FieldError {
  field: string;
  message: string;
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
    first_name: "",
    last_name: "",
    email: "",
    altura_cm: "",
    data_nascimento: "",
    sexo: "",
    objetivo: "",
  });

  const profileQuery = useQuery<StagingProfile>({
    queryKey: ["profile"],
    queryFn: async () => {
      const res = await apiFetch("/api/nucleo/perfil");
      if (!res.ok) throw new Error("Erro ao carregar perfil.");
      return res.json();
    },
  });

  useEffect(() => {
    if (user) {
      setForm((prev) => ({
        ...prev,
        first_name: user.first_name || "",
        last_name: user.last_name || "",
        email: user.email || "",
      }));
    }
  }, [user]);

  useEffect(() => {
    if (profileQuery.data) {
      const p = profileQuery.data;
      setForm((prev) => ({
        ...prev,
        altura_cm: p.altura_cm ? String(p.altura_cm) : "",
        data_nascimento: p.data_nascimento || "",
        sexo: p.sexo || "",
        objetivo: p.objetivo || "",
      }));
      setBirthDateDisplay(isoToDisplay(p.data_nascimento));
    }
  }, [profileQuery.data]);

  const saveMutation = useMutation({
    mutationFn: async (data: { userPayload: Record<string, any>; profilePayload: Record<string, any> }) => {
      const [userRes, profileRes] = await Promise.all([
        apiFetch("/api/nucleo/eu", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(data.userPayload),
        }),
        apiFetch("/api/nucleo/perfil", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(data.profilePayload),
        }),
      ]);
      if (!userRes.ok) {
        const err = await userRes.json();
        throw err;
      }
      if (!profileRes.ok) {
        const err = await profileRes.json();
        throw err;
      }
      const profileData = await profileRes.json();
      return profileData as StagingProfile;
    },
    onSuccess: async (data) => {
      setFieldErrors({});
      queryClient.setQueryData(["profile"], data);
      await refreshUser();
      setForm((prev) => ({
        ...prev,
        altura_cm: data.altura_cm ? String(data.altura_cm) : "",
        data_nascimento: data.data_nascimento || "",
        sexo: data.sexo || "",
        objetivo: data.objetivo || "",
      }));
      setBirthDateDisplay(isoToDisplay(data.data_nascimento));
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
        setFieldErrors({ _general: err?.error || err?.detail || "Erro ao salvar perfil." });
      }
    },
  });

  const validateClient = (): boolean => {
    const errs: Record<string, string> = {};

    if (!form.first_name.trim()) errs.first_name = "Nome é obrigatório.";

    if (form.data_nascimento) {
      const d = new Date(form.data_nascimento);
      if (isNaN(d.getTime())) {
        errs.data_nascimento = "Data de nascimento inválida.";
      } else if (d > new Date()) {
        errs.data_nascimento = "Data de nascimento não pode ser futura.";
      }
    }

    if (form.altura_cm) {
      const h = parseFloat(form.altura_cm);
      if (isNaN(h) || h <= 0) errs.altura_cm = "Altura deve ser um número positivo.";
    }

    if (form.sexo && !["M", "F"].includes(form.sexo)) {
      errs.sexo = "Sexo deve ser M ou F.";
    }

    setFieldErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSave = () => {
    if (!validateClient()) return;
    const userPayload: Record<string, any> = {
      first_name: form.first_name,
      last_name: form.last_name,
    };
    const profilePayload: Record<string, any> = {
      data_nascimento: form.data_nascimento || null,
      altura_cm: form.altura_cm ? parseFloat(form.altura_cm) : null,
      sexo: form.sexo || null,
      objetivo: form.objetivo || null,
    };
    saveMutation.mutate({ userPayload, profilePayload });
  };

  const handleLogout = async () => {
    setShowLogoutModal(false);
    await logout();
    setLocation("/auth");
  };

  const photo = `https://api.dicebear.com/7.x/avataaars/svg?seed=${user?.username || "user"}`;

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
                      value={form.first_name}
                      onChange={(e) => setForm({ ...form, first_name: e.target.value })}
                      placeholder="Digite seu nome"
                      className={`w-full bg-white border rounded-xl px-4 py-3 text-sm font-medium text-[#2F5641] focus:outline-none focus:border-[#2F5641] ${fieldErrors.first_name ? "border-[#BE4E35]" : "border-[#E8EBE5]"}`}
                      data-testid="input-name"
                    />
                    {fieldErrors.first_name && (
                      <p className="text-[#BE4E35] text-[10px] mt-1 flex items-center gap-1" data-testid="error-name">
                        <AlertCircle size={10} /> {fieldErrors.first_name}
                      </p>
                    )}
                  </div>
                  <div>
                    <label className="text-[10px] font-bold uppercase tracking-wider text-[#8B9286] mb-1 block">Sobrenome</label>
                    <input
                      type="text"
                      value={form.last_name}
                      onChange={(e) => setForm({ ...form, last_name: e.target.value })}
                      placeholder="Digite seu sobrenome"
                      className="w-full bg-white border rounded-xl px-4 py-3 text-sm font-medium text-[#2F5641] focus:outline-none focus:border-[#2F5641] border-[#E8EBE5]"
                      data-testid="input-last-name"
                    />
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
                  value={form.altura_cm}
                  onChange={(e) => setForm({ ...form, altura_cm: e.target.value })}
                  placeholder="Ex.: 178"
                  className={`w-full bg-white border rounded-xl px-4 py-3 text-sm font-medium text-[#2F5641] focus:outline-none focus:border-[#2F5641] ${fieldErrors.altura_cm ? "border-[#BE4E35]" : "border-[#E8EBE5]"}`}
                  data-testid="input-height"
                />
                {fieldErrors.altura_cm && (
                  <p className="text-[#BE4E35] text-[10px] mt-1" data-testid="error-height">
                    <AlertCircle size={10} className="inline mr-1" />{fieldErrors.altura_cm}
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
                      setForm({ ...form, data_nascimento: iso });
                    } else if (display === "") {
                      setForm({ ...form, data_nascimento: "" });
                    }
                  }}
                  placeholder="DD/MM/AAAA"
                  inputMode="numeric"
                  maxLength={10}
                  className={`w-full bg-white border rounded-xl px-4 py-3 text-sm font-medium text-[#2F5641] focus:outline-none focus:border-[#2F5641] ${fieldErrors.data_nascimento ? "border-[#BE4E35]" : "border-[#E8EBE5]"}`}
                  data-testid="input-birthdate"
                />
                {fieldErrors.data_nascimento && (
                  <p className="text-[#BE4E35] text-[10px] mt-1" data-testid="error-birthdate">
                    <AlertCircle size={10} className="inline mr-1" />{fieldErrors.data_nascimento}
                  </p>
                )}
              </div>
              <div>
                <label className="text-[10px] font-bold uppercase tracking-wider text-[#8B9286] mb-1 block">Sexo</label>
                <select
                  value={form.sexo}
                  onChange={(e) => setForm({ ...form, sexo: e.target.value })}
                  className={`w-full bg-white border rounded-xl px-4 py-3 text-sm font-medium text-[#2F5641] focus:outline-none focus:border-[#2F5641] ${fieldErrors.sexo ? "border-[#BE4E35]" : "border-[#E8EBE5]"}`}
                  data-testid="select-sex"
                >
                  <option value="" disabled>Selecione</option>
                  <option value="M">Masculino</option>
                  <option value="F">Feminino</option>
                </select>
                {fieldErrors.sexo && (
                  <p className="text-[#BE4E35] text-[10px] mt-1" data-testid="error-sex">
                    <AlertCircle size={10} className="inline mr-1" />{fieldErrors.sexo}
                  </p>
                )}
              </div>
              <div>
                <label className="text-[10px] font-bold uppercase tracking-wider text-[#8B9286] mb-1 block">Objetivo</label>
                <select
                  value={form.objetivo}
                  onChange={(e) => setForm({ ...form, objetivo: e.target.value })}
                  className="w-full bg-white border rounded-xl px-4 py-3 text-sm font-medium text-[#2F5641] focus:outline-none focus:border-[#2F5641] border-[#E8EBE5]"
                  data-testid="select-objetivo"
                >
                  <option value="" disabled>Selecione</option>
                  <option value="perder_peso">Perder peso</option>
                  <option value="manter_peso">Manter peso</option>
                  <option value="ganhar_massa">Ganhar massa</option>
                </select>
              </div>
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
