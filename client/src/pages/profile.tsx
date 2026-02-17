import Layout from "@/components/layout";
import { ChevronLeft, Camera, Settings, Smartphone, Footprints, Flame, Moon, LogOut, AlertCircle } from "lucide-react";
import { useLocation } from "wouter";
import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useAuth } from "@/lib/auth";
import { apiFetch } from "@/lib/api";
import { useMutation } from "@tanstack/react-query";

export default function ProfileScreen() {
  const [, setLocation] = useLocation();
  const { user, logout, refreshUser } = useAuth();
  const [showLogoutModal, setShowLogoutModal] = useState(false);
  const [errors, setErrors] = useState<{ [key: string]: string }>({});
  const [saveSuccess, setSaveSuccess] = useState(false);

  const [form, setForm] = useState({
    displayName: "",
    email: "",
    heightCm: "",
    birthDate: "",
    sex: "",
    activityLevel: "",
  });

  useEffect(() => {
    if (user) {
      setForm({
        displayName: user.displayName || "",
        email: user.email || "",
        heightCm: user.heightCm ? String(user.heightCm) : "",
        birthDate: user.birthDate || "",
        sex: user.sex || "",
        activityLevel: user.activityLevel || "",
      });
    }
  }, [user]);

  const saveMutation = useMutation({
    mutationFn: async (data: Record<string, any>) => {
      const res = await apiFetch(`/api/users/${user!.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Erro ao salvar.");
      }
      return res.json();
    },
    onSuccess: async () => {
      await refreshUser();
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    },
  });

  const validate = () => {
    const newErrors: { [key: string]: string } = {};
    if (!form.displayName.trim()) newErrors.displayName = "Informe seu nome.";
    if (form.heightCm && (isNaN(parseInt(form.heightCm)) || parseInt(form.heightCm) <= 0)) {
      newErrors.heightCm = "Informe uma altura válida em centímetros.";
    }
    if (form.birthDate) {
      const parts = form.birthDate.split("-");
      if (parts.length === 3) {
        const date = new Date(form.birthDate);
        if (date > new Date()) newErrors.birthDate = "Informe uma data de nascimento válida.";
      }
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSave = () => {
    if (!validate()) return;
    const payload: Record<string, any> = {
      displayName: form.displayName,
    };
    if (form.heightCm) payload.heightCm = parseFloat(form.heightCm);
    if (form.birthDate) payload.birthDate = form.birthDate;
    if (form.sex) payload.sex = form.sex;
    if (form.activityLevel) payload.activityLevel = form.activityLevel;
    saveMutation.mutate(payload);
  };

  const handleLogout = async () => {
    setShowLogoutModal(false);
    await logout();
    setLocation("/auth");
  };

  const photo = user?.avatarUrl || `https://api.dicebear.com/7.x/avataaars/svg?seed=${user?.displayName || "user"}`;

  const goals = {
    steps: 10000,
    calories: 2200,
    sleep: 8,
  };

  const devices = user ? [
    { id: 1, name: "Xiaomi Body Composition Scale 2", mac: "C0:11:22:33:44:55", type: "scale", connected: true }
  ] : [];

  const professionals = [
    { id: 1, name: "Dr. Ana Silva", role: "Nutricionista", image: "https://api.dicebear.com/7.x/avataaars/svg?seed=Ana" },
    { id: 2, name: "Carlos Oliveira", role: "Personal Trainer", image: "https://api.dicebear.com/7.x/avataaars/svg?seed=Carlos" }
  ];

  const birthDateDisplay = form.birthDate?.includes("-")
    ? form.birthDate.split("-").reverse().join("/")
    : form.birthDate;

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

          {saveMutation.isError && (
            <div className="bg-[#BE4E35]/10 border border-[#BE4E35]/20 rounded-xl px-4 py-3 text-sm text-[#BE4E35]">
              {saveMutation.error?.message || "Erro ao salvar."}
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
                       onChange={(e) => setForm({...form, displayName: e.target.value})}
                       placeholder="Digite seu nome"
                       className={`w-full bg-white border rounded-xl px-4 py-3 text-sm font-medium text-[#2F5641] focus:outline-none focus:border-[#2F5641] ${errors.displayName ? 'border-[#BE4E35]' : 'border-[#E8EBE5]'}`}
                       data-testid="input-name"
                     />
                     {errors.displayName && <p className="text-[#BE4E35] text-[10px] mt-1 flex items-center gap-1"><AlertCircle size={10} /> {errors.displayName}</p>}
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
                   onChange={(e) => setForm({...form, heightCm: e.target.value})}
                   placeholder="Ex.: 178"
                   className={`w-full bg-white border rounded-xl px-4 py-3 text-sm font-medium text-[#2F5641] focus:outline-none focus:border-[#2F5641] ${errors.heightCm ? 'border-[#BE4E35]' : 'border-[#E8EBE5]'}`}
                   data-testid="input-height"
                 />
                 {errors.heightCm && <p className="text-[#BE4E35] text-[10px] mt-1">{errors.heightCm}</p>}
               </div>
               <div>
                 <label className="text-[10px] font-bold uppercase tracking-wider text-[#8B9286] mb-1 block">Nascimento</label>
                 <input
                   type="text"
                   value={birthDateDisplay}
                   onChange={(e) => {
                     const raw = e.target.value.replace(/\D/g, '').slice(0, 8);
                     let formatted = raw;
                     if (raw.length > 2) formatted = raw.slice(0, 2) + '/' + raw.slice(2);
                     if (raw.length > 4) formatted = raw.slice(0, 2) + '/' + raw.slice(2, 4) + '/' + raw.slice(4);
                     const parts = formatted.split('/');
                     if (parts.length === 3 && parts[2].length === 4) {
                       setForm({...form, birthDate: `${parts[2]}-${parts[1]}-${parts[0]}`});
                     } else {
                       setForm({...form, birthDate: formatted});
                     }
                   }}
                   placeholder="DD/MM/AAAA"
                   inputMode="numeric"
                   maxLength={10}
                   className={`w-full bg-white border rounded-xl px-4 py-3 text-sm font-medium text-[#2F5641] focus:outline-none focus:border-[#2F5641] ${errors.birthDate ? 'border-[#BE4E35]' : 'border-[#E8EBE5]'}`}
                   data-testid="input-birthdate"
                 />
                 {errors.birthDate && <p className="text-[#BE4E35] text-[10px] mt-1">{errors.birthDate}</p>}
               </div>
               <div>
                 <label className="text-[10px] font-bold uppercase tracking-wider text-[#8B9286] mb-1 block">Sexo</label>
                 <select
                   value={form.sex}
                   onChange={(e) => setForm({...form, sex: e.target.value})}
                   className={`w-full bg-white border rounded-xl px-4 py-3 text-sm font-medium text-[#2F5641] focus:outline-none focus:border-[#2F5641] ${errors.sex ? 'border-[#BE4E35]' : 'border-[#E8EBE5]'}`}
                   data-testid="select-sex"
                 >
                   <option value="" disabled>Selecione</option>
                   <option value="M">Masculino</option>
                   <option value="F">Feminino</option>
                 </select>
               </div>
               <div>
                 <label className="text-[10px] font-bold uppercase tracking-wider text-[#8B9286] mb-1 block">Nível atividade</label>
                 <select
                   value={form.activityLevel}
                   onChange={(e) => setForm({...form, activityLevel: e.target.value})}
                   className={`w-full bg-white border rounded-xl px-4 py-3 text-sm font-medium text-[#2F5641] focus:outline-none focus:border-[#2F5641] ${errors.activityLevel ? 'border-[#BE4E35]' : 'border-[#E8EBE5]'}`}
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
            <p className="text-[10px] text-[#8B9286] mt-2 opacity-80">
              Seus dados ajudam a personalizar recomendações e metas.
            </p>
          </section>

          <section>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-sm font-bold text-[#2F5641] uppercase tracking-wide">
                Meus objetivos
              </h2>
              <button className="text-[10px] font-bold text-[#C7AE6A] uppercase tracking-wider hover:underline">
                Gerenciar objetivos
              </button>
            </div>
            <div className="space-y-3">
               <div className="bg-white p-4 rounded-xl border border-[#E8EBE5] flex items-center justify-between">
                 <div className="flex items-center gap-3">
                   <div className="w-8 h-8 rounded-full bg-[#E8EBE5] flex items-center justify-center text-[#2F5641]">
                     <Footprints size={16} />
                   </div>
                   <span className="text-sm font-medium text-[#2F5641]">Meta de passos</span>
                 </div>
                 <span className="font-bold text-[#2F5641]">{goals.steps.toLocaleString()}</span>
               </div>
               <div className="bg-white p-4 rounded-xl border border-[#E8EBE5] flex items-center justify-between">
                 <div className="flex items-center gap-3">
                   <div className="w-8 h-8 rounded-full bg-[#E8EBE5] flex items-center justify-center text-[#D97952]">
                     <Flame size={16} />
                   </div>
                   <span className="text-sm font-medium text-[#2F5641]">Meta de calorias</span>
                 </div>
                 <span className="font-bold text-[#2F5641]">{goals.calories.toLocaleString('pt-BR')} kcal</span>
               </div>
               <div className="bg-white p-4 rounded-xl border border-[#E8EBE5] flex items-center justify-between">
                 <div className="flex items-center gap-3">
                   <div className="w-8 h-8 rounded-full bg-[#E8EBE5] flex items-center justify-center text-[#3D7A8C]">
                     <Moon size={16} />
                   </div>
                   <span className="text-sm font-medium text-[#2F5641]">Meta de sono</span>
                 </div>
                 <span className="font-bold text-[#2F5641]">{goals.sleep} h</span>
               </div>
            </div>
          </section>

          <section>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-sm font-bold text-[#2F5641] uppercase tracking-wide">
                Dispositivos
              </h2>
              <button
                onClick={() => setLocation("/biometrics/devices")}
                className="text-[10px] font-bold text-[#C7AE6A] uppercase tracking-wider hover:underline"
              >
                Gerenciar
              </button>
            </div>
            <div className="space-y-3">
              {devices.map(device => (
                <div key={device.id} className="bg-white p-4 rounded-xl border border-[#E8EBE5] flex items-center justify-between">
                   <div className="flex items-center gap-3">
                     <div className="w-10 h-10 rounded-full bg-[#FAFBF8] border border-[#E8EBE5] flex items-center justify-center text-[#2F5641]">
                       {device.type === 'scale' ? '⚖️' : '⌚'}
                     </div>
                     <div>
                       <p className="text-sm font-semibold text-[#2F5641]">{device.name}</p>
                       <p className="text-[10px] text-[#8B9286] font-mono">{device.mac}</p>
                     </div>
                   </div>
                   <div className="flex flex-col items-end gap-1">
                     <span className="text-[10px] font-bold text-[#648D4A] uppercase tracking-wide">Conectado</span>
                   </div>
                </div>
              ))}
            </div>
          </section>

          <section>
            <h2 className="text-sm font-bold text-[#2F5641] uppercase tracking-wide mb-4">
              Profissionais vinculados
            </h2>
            <div className="space-y-3">
              {professionals.map(prof => (
                <div key={prof.id} className="bg-white p-4 rounded-xl border border-[#E8EBE5] flex items-center justify-between shadow-sm">
                   <div className="flex items-center gap-3">
                     <div className="w-10 h-10 rounded-full bg-[#E8EBE5] overflow-hidden">
                       <img src={prof.image} alt={prof.name} />
                     </div>
                     <div>
                       <p className="text-sm font-semibold text-[#2F5641]">{prof.name}</p>
                       <p className="text-[10px] text-[#8B9286] uppercase tracking-wide">{prof.role}</p>
                     </div>
                   </div>
                </div>
              ))}
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
