import Layout from "@/components/layout";
import { ChevronLeft, Camera, Settings, Smartphone, User, Activity, Heart, Moon, Footprints, Flame, ChevronRight, LogOut, AlertCircle, X } from "lucide-react";
import { useLocation } from "wouter";
import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";

export default function ProfileScreen() {
  const [, setLocation] = useLocation();
  const [showLogoutModal, setShowLogoutModal] = useState(false);
  const [errors, setErrors] = useState<{ [key: string]: string }>({});
  
  // Mock User Data
  const [user, setUser] = useState({
    name: "Pedro",
    surname: "Santos",
    email: "pedro.santos@email.com",
    photo: "https://api.dicebear.com/7.x/avataaars/svg?seed=Pedro",
    height: "178", // cm (string for input handling)
    weight: "72.5", // kg (string for input handling)
    birthDate: "1995-05-20",
    gender: "M",
    activityLevel: "moderate" // sedentary, light, moderate, active
  });

  // Mock Goals
  const [goals, setGoals] = useState({
    steps: 10000,
    calories: 2200,
    water: 2500,
    sleep: 8, // hours
    weight: 70.0
  });

  // Mock Devices
  const [devices, setDevices] = useState([
    { id: 1, name: "Xiaomi Body Composition Scale 2", mac: "C0:11:22:33:44:55", type: "scale", connected: true }
  ]);

  // Mock Professionals
  const professionals = [
    { id: 1, name: "Dr. Ana Silva", role: "Nutricionista", image: "https://api.dicebear.com/7.x/avataaars/svg?seed=Ana" },
    { id: 2, name: "Carlos Oliveira", role: "Personal Trainer", image: "https://api.dicebear.com/7.x/avataaars/svg?seed=Carlos" }
  ];

  const validate = () => {
    const newErrors: { [key: string]: string } = {};

    if (!user.name.trim()) newErrors.name = "Informe seu nome.";
    
    if (!user.height || isNaN(parseInt(user.height)) || parseInt(user.height) <= 0) {
      newErrors.height = "Informe uma altura válida em centímetros.";
    }

    if (!user.birthDate) {
      newErrors.birthDate = "Informe sua data de nascimento.";
    } else {
      const date = new Date(user.birthDate);
      if (date > new Date()) {
        newErrors.birthDate = "Informe uma data de nascimento válida.";
      }
    }

    if (!user.gender) newErrors.gender = "Selecione seu sexo.";
    if (!user.activityLevel) newErrors.activityLevel = "Selecione seu nível de atividade.";

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSave = () => {
    if (validate()) {
      alert("Perfil atualizado com sucesso.");
    } else {
      alert("Não foi possível salvar agora. Revise os dados e tente de novo.");
    }
  };

  const handleLogout = () => {
    setShowLogoutModal(false);
    setLocation("/welcome");
  };

  return (
    <Layout>
      <div className="bg-[#FAFBF8] min-h-screen pb-32">
        {/* Header */}
        <header className="px-6 pt-14 pb-4 flex items-center justify-between sticky top-0 bg-[#FAFBF8]/95 backdrop-blur-sm z-10">
          <button 
            onClick={() => setLocation("/home")}
            className="w-10 h-10 -ml-2 flex items-center justify-center text-[#2F5641]"
          >
            <ChevronLeft size={24} />
          </button>
          <h1 className="font-display text-lg font-semibold text-[#2F5641]">Meu Perfil</h1>
          <button className="w-10 h-10 flex items-center justify-center text-[#2F5641]">
            <Settings size={20} />
          </button>
        </header>

        <main className="px-6 space-y-8">
          
          {/* Profile Photo & Basic Info */}
          <section className="flex flex-col items-center">
            <div className="relative mb-6">
              <div className="w-24 h-24 rounded-full border-4 border-white shadow-lg overflow-hidden bg-[#E8EBE5]">
                <img src={user.photo} alt="Profile" className="w-full h-full object-cover" />
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
                       value={user.name}
                       onChange={(e) => setUser({...user, name: e.target.value})}
                       placeholder="Digite seu nome"
                       className={`w-full bg-white border rounded-xl px-4 py-3 text-sm font-medium text-[#2F5641] focus:outline-none focus:border-[#2F5641] ${errors.name ? 'border-[#BE4E35]' : 'border-[#E8EBE5]'}`}
                     />
                     {errors.name && <p className="text-[#BE4E35] text-[10px] mt-1 flex items-center gap-1"><AlertCircle size={10} /> {errors.name}</p>}
                   </div>
                   <div>
                     <label className="text-[10px] font-bold uppercase tracking-wider text-[#8B9286] mb-1 block">Sobrenome</label>
                     <input 
                       type="text" 
                       value={user.surname}
                       onChange={(e) => setUser({...user, surname: e.target.value})}
                       placeholder="Digite seu sobrenome"
                       className="w-full bg-white border border-[#E8EBE5] rounded-xl px-4 py-3 text-sm font-medium text-[#2F5641] focus:outline-none focus:border-[#2F5641]"
                     />
                   </div>
                   <div>
                     <label className="text-[10px] font-bold uppercase tracking-wider text-[#8B9286] mb-1 block">E-mail</label>
                     <input 
                       type="email" 
                       value={user.email}
                       disabled
                       placeholder="seuemail@exemplo.com"
                       className="w-full bg-[#F5F3EE] border border-[#E8EBE5] rounded-xl px-4 py-3 text-sm font-medium text-[#8B9286] cursor-not-allowed"
                     />
                   </div>
                 </div>
               </div>
            </div>
          </section>

          {/* Personal Data */}
          <section>
            <h2 className="text-sm font-bold text-[#2F5641] uppercase tracking-wide mb-4">
              Dados pessoais
            </h2>
            <div className="grid grid-cols-2 gap-3">
               <div>
                 <label className="text-[10px] font-bold uppercase tracking-wider text-[#8B9286] mb-1 block">Altura (cm)</label>
                 <input 
                   type="number" 
                   value={user.height}
                   onChange={(e) => setUser({...user, height: e.target.value})}
                   placeholder="Ex.: 178"
                   className={`w-full bg-white border rounded-xl px-4 py-3 text-sm font-medium text-[#2F5641] focus:outline-none focus:border-[#2F5641] ${errors.height ? 'border-[#BE4E35]' : 'border-[#E8EBE5]'}`}
                 />
                 {errors.height && <p className="text-[#BE4E35] text-[10px] mt-1">{errors.height}</p>}
               </div>
               <div>
                 <label className="text-[10px] font-bold uppercase tracking-wider text-[#8B9286] mb-1 block">Peso (kg)</label>
                 <input 
                   type="number" 
                   value={user.weight}
                   readOnly
                   placeholder="Ex.: 72,5"
                   className="w-full bg-[#F5F3EE] border border-[#E8EBE5] rounded-xl px-4 py-3 text-sm font-medium text-[#8B9286] cursor-not-allowed focus:outline-none"
                 />
               </div>
               <div>
                 <label className="text-[10px] font-bold uppercase tracking-wider text-[#8B9286] mb-1 block">Nascimento</label>
                 <input 
                   type="text" 
                   value={user.birthDate.split('-').reverse().join('/')}
                   onChange={(e) => {
                     const raw = e.target.value.replace(/\D/g, '').slice(0, 8);
                     let formatted = raw;
                     if (raw.length > 2) formatted = raw.slice(0, 2) + '/' + raw.slice(2);
                     if (raw.length > 4) formatted = raw.slice(0, 2) + '/' + raw.slice(2, 4) + '/' + raw.slice(4);
                     const parts = formatted.split('/');
                     if (parts.length === 3 && parts[2].length === 4) {
                       setUser({...user, birthDate: `${parts[2]}-${parts[1]}-${parts[0]}`});
                     } else {
                       setUser({...user, birthDate: formatted});
                     }
                   }}
                   placeholder="DD/MM/AAAA"
                   inputMode="numeric"
                   maxLength={10}
                   className={`w-full bg-white border rounded-xl px-4 py-3 text-sm font-medium text-[#2F5641] focus:outline-none focus:border-[#2F5641] ${errors.birthDate ? 'border-[#BE4E35]' : 'border-[#E8EBE5]'}`}
                 />
                 {errors.birthDate && <p className="text-[#BE4E35] text-[10px] mt-1">{errors.birthDate}</p>}
               </div>
               <div>
                 <label className="text-[10px] font-bold uppercase tracking-wider text-[#8B9286] mb-1 block">Sexo</label>
                 <select 
                   value={user.gender}
                   onChange={(e) => setUser({...user, gender: e.target.value})}
                   className={`w-full bg-white border rounded-xl px-4 py-3 text-sm font-medium text-[#2F5641] focus:outline-none focus:border-[#2F5641] ${errors.gender ? 'border-[#BE4E35]' : 'border-[#E8EBE5]'}`}
                 >
                   <option value="" disabled>Selecione</option>
                   <option value="M">Masculino</option>
                   <option value="F">Feminino</option>
                 </select>
                 {errors.gender && <p className="text-[#BE4E35] text-[10px] mt-1">{errors.gender}</p>}
               </div>
            </div>
            
            <div className="mt-3">
               <label className="text-[10px] font-bold uppercase tracking-wider text-[#8B9286] mb-1 block">Nível de atividade</label>
               <select 
                 value={user.activityLevel}
                 onChange={(e) => setUser({...user, activityLevel: e.target.value})}
                 className={`w-full bg-white border rounded-xl px-4 py-3 text-sm font-medium text-[#2F5641] focus:outline-none focus:border-[#2F5641] ${errors.activityLevel ? 'border-[#BE4E35]' : 'border-[#E8EBE5]'}`}
               >
                 <option value="" disabled>Selecione</option>
                 <option value="sedentary">Sedentário</option>
                 <option value="light">Atividade leve</option>
                 <option value="moderate">Atividade moderada</option>
                 <option value="active">Muito ativo</option>
               </select>
               {errors.activityLevel && <p className="text-[#BE4E35] text-[10px] mt-1">{errors.activityLevel}</p>}
            </div>
            <p className="text-[10px] text-[#8B9286] mt-2 opacity-80">
              Seus dados ajudam a personalizar recomendações e metas.
            </p>
          </section>

          {/* Goals */}
          <section>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-sm font-bold text-[#2F5641] uppercase tracking-wide">
                Meus objetivos
              </h2>
              <button className="text-[10px] font-bold text-[#C7AE6A] uppercase tracking-wider hover:underline">
                Gerenciar objetivos
              </button>
            </div>
            
            {Object.keys(goals).length > 0 ? (
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
            ) : (
              <div className="text-center py-6 bg-white rounded-xl border border-[#E8EBE5] border-dashed">
                <p className="text-xs text-[#8B9286] mb-2">Você ainda não definiu objetivos.</p>
                <button className="text-xs font-bold text-[#2F5641] bg-[#E8EBE5] px-3 py-1.5 rounded-lg">
                  Definir objetivos
                </button>
              </div>
            )}
          </section>

          {/* Devices */}
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
                     <button className="text-[10px] text-[#BE4E35] underline opacity-80 hover:opacity-100">Excluir</button>
                   </div>
                </div>
              ))}
              {devices.length === 0 && (
                <div className="text-center py-6 bg-white rounded-xl border border-[#E8EBE5] border-dashed">
                  <h3 className="text-sm font-bold text-[#2F5641] mb-1">Nenhum dispositivo vinculado</h3>
                  <p className="text-xs text-[#8B9286] mb-3">Vincule um dispositivo para registrar medições automáticas.</p>
                  <button 
                    onClick={() => setLocation("/biometrics/devices")}
                    className="text-xs font-bold text-[#2F5641] bg-[#E8EBE5] px-3 py-1.5 rounded-lg"
                  >
                    Adicionar dispositivo
                  </button>
                </div>
              )}
            </div>
          </section>

          {/* Professionals */}
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
              {professionals.length === 0 && (
                <div className="text-center py-6 bg-white rounded-xl border border-[#E8EBE5] border-dashed">
                  <h3 className="text-sm font-bold text-[#2F5641] mb-1">Nenhum profissional vinculado</h3>
                  <p className="text-xs text-[#8B9286]">Você ainda não possui profissionais vinculados.</p>
                </div>
              )}
            </div>
          </section>

          {/* Logout */}
          <button 
            onClick={() => setShowLogoutModal(true)}
            className="w-full py-4 text-[#BE4E35] font-semibold text-sm flex items-center justify-center gap-2 hover:bg-[#BE4E35]/5 rounded-xl transition-colors"
          >
            <LogOut size={16} /> Sair da conta
          </button>

          {/* Save Button (Sticky) */}
          <div className="fixed bottom-[90px] left-6 right-6 max-w-[382px] mx-auto z-20">
             <button 
               onClick={handleSave}
               className="w-full bg-[#2F5641] text-white py-4 rounded-2xl font-bold text-lg shadow-xl shadow-[#2F5641]/25 active:scale-[0.98] transition-all"
             >
               Salvar alterações
             </button>
          </div>

        </main>

        {/* Logout Modal */}
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

