import Layout from "@/components/layout";
import { ChevronLeft, Camera, Settings, Smartphone, User, Activity, Heart, Moon, Footprints, Flame, ChevronRight, LogOut } from "lucide-react";
import { useLocation } from "wouter";
import { useState } from "react";
import { motion } from "framer-motion";

export default function ProfileScreen() {
  const [, setLocation] = useLocation();
  
  // Mock User Data
  const [user, setUser] = useState({
    name: "Pedro",
    surname: "Santos",
    email: "pedro.santos@email.com",
    photo: "https://api.dicebear.com/7.x/avataaars/svg?seed=Pedro",
    height: 178, // cm
    weight: 72.5, // kg
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

  const handleSave = () => {
    alert("Perfil atualizado com sucesso!");
  };

  return (
    <Layout>
      <div className="bg-[#FAFBF8] min-h-screen pb-24">
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
            <div className="relative mb-4">
              <div className="w-24 h-24 rounded-full border-4 border-white shadow-lg overflow-hidden bg-[#E8EBE5]">
                <img src={user.photo} alt="Profile" className="w-full h-full object-cover" />
              </div>
              <button className="absolute bottom-0 right-0 w-8 h-8 rounded-full bg-[#2F5641] text-white flex items-center justify-center border-2 border-[#FAFBF8] shadow-sm">
                <Camera size={14} />
              </button>
            </div>
            
            <div className="w-full space-y-3">
               <div>
                 <label className="text-[10px] font-bold uppercase tracking-wider text-[#8B9286] mb-1 block">Nome</label>
                 <input 
                   type="text" 
                   value={user.name}
                   onChange={(e) => setUser({...user, name: e.target.value})}
                   className="w-full bg-white border border-[#E8EBE5] rounded-xl px-4 py-3 text-sm font-medium text-[#2F5641] focus:outline-none focus:border-[#2F5641]"
                 />
               </div>
               <div>
                 <label className="text-[10px] font-bold uppercase tracking-wider text-[#8B9286] mb-1 block">Sobrenome</label>
                 <input 
                   type="text" 
                   value={user.surname}
                   onChange={(e) => setUser({...user, surname: e.target.value})}
                   className="w-full bg-white border border-[#E8EBE5] rounded-xl px-4 py-3 text-sm font-medium text-[#2F5641] focus:outline-none focus:border-[#2F5641]"
                 />
               </div>
               <div>
                 <label className="text-[10px] font-bold uppercase tracking-wider text-[#8B9286] mb-1 block">E-mail</label>
                 <input 
                   type="email" 
                   value={user.email}
                   disabled
                   className="w-full bg-[#F5F3EE] border border-[#E8EBE5] rounded-xl px-4 py-3 text-sm font-medium text-[#8B9286] cursor-not-allowed"
                 />
               </div>
            </div>
          </section>

          {/* Personal Data */}
          <section>
            <h2 className="text-sm font-bold text-[#2F5641] uppercase tracking-wide mb-4 flex items-center gap-2">
              <User size={16} /> Dados Pessoais
            </h2>
            <div className="grid grid-cols-2 gap-3">
               <div>
                 <label className="text-[10px] font-bold uppercase tracking-wider text-[#8B9286] mb-1 block">Altura (cm)</label>
                 <input 
                   type="number" 
                   value={user.height}
                   onChange={(e) => setUser({...user, height: parseInt(e.target.value)})}
                   className="w-full bg-white border border-[#E8EBE5] rounded-xl px-4 py-3 text-sm font-medium text-[#2F5641] focus:outline-none focus:border-[#2F5641]"
                 />
               </div>
               <div>
                 <label className="text-[10px] font-bold uppercase tracking-wider text-[#8B9286] mb-1 block">Peso (kg)</label>
                 <input 
                   type="number" 
                   value={user.weight}
                   onChange={(e) => setUser({...user, weight: parseFloat(e.target.value)})}
                   className="w-full bg-white border border-[#E8EBE5] rounded-xl px-4 py-3 text-sm font-medium text-[#2F5641] focus:outline-none focus:border-[#2F5641]"
                 />
               </div>
               <div>
                 <label className="text-[10px] font-bold uppercase tracking-wider text-[#8B9286] mb-1 block">Nascimento</label>
                 <input 
                   type="date" 
                   value={user.birthDate}
                   onChange={(e) => setUser({...user, birthDate: e.target.value})}
                   className="w-full bg-white border border-[#E8EBE5] rounded-xl px-4 py-3 text-sm font-medium text-[#2F5641] focus:outline-none focus:border-[#2F5641]"
                 />
               </div>
               <div>
                 <label className="text-[10px] font-bold uppercase tracking-wider text-[#8B9286] mb-1 block">Sexo</label>
                 <select 
                   value={user.gender}
                   onChange={(e) => setUser({...user, gender: e.target.value})}
                   className="w-full bg-white border border-[#E8EBE5] rounded-xl px-4 py-3 text-sm font-medium text-[#2F5641] focus:outline-none focus:border-[#2F5641]"
                 >
                   <option value="M">Masculino</option>
                   <option value="F">Feminino</option>
                 </select>
               </div>
            </div>
            
            <div className="mt-3">
               <label className="text-[10px] font-bold uppercase tracking-wider text-[#8B9286] mb-1 block">Nível de Atividade</label>
               <select 
                 value={user.activityLevel}
                 onChange={(e) => setUser({...user, activityLevel: e.target.value})}
                 className="w-full bg-white border border-[#E8EBE5] rounded-xl px-4 py-3 text-sm font-medium text-[#2F5641] focus:outline-none focus:border-[#2F5641]"
               >
                 <option value="sedentary">Sedentário (Pouco ou nenhum exercício)</option>
                 <option value="light">Leve (Exercício leve 1-3 dias/semana)</option>
                 <option value="moderate">Moderado (Exercício moderado 3-5 dias/semana)</option>
                 <option value="active">Muito Ativo (Exercício pesado 6-7 dias/semana)</option>
               </select>
            </div>
          </section>

          {/* Goals */}
          <section>
            <h2 className="text-sm font-bold text-[#2F5641] uppercase tracking-wide mb-4 flex items-center gap-2">
              <Activity size={16} /> Meus Objetivos
            </h2>
            <div className="space-y-3">
               <div className="bg-white p-4 rounded-xl border border-[#E8EBE5] flex items-center justify-between">
                 <div className="flex items-center gap-3">
                   <div className="w-8 h-8 rounded-full bg-[#E8EBE5] flex items-center justify-center text-[#2F5641]">
                     <Footprints size={16} />
                   </div>
                   <span className="text-sm font-medium text-[#2F5641]">Meta de Passos</span>
                 </div>
                 <span className="font-bold text-[#2F5641]">{goals.steps.toLocaleString()}</span>
               </div>
               <div className="bg-white p-4 rounded-xl border border-[#E8EBE5] flex items-center justify-between">
                 <div className="flex items-center gap-3">
                   <div className="w-8 h-8 rounded-full bg-[#E8EBE5] flex items-center justify-center text-[#D97952]">
                     <Flame size={16} />
                   </div>
                   <span className="text-sm font-medium text-[#2F5641]">Meta de Calorias</span>
                 </div>
                 <span className="font-bold text-[#2F5641]">{goals.calories} kcal</span>
               </div>
               <div className="bg-white p-4 rounded-xl border border-[#E8EBE5] flex items-center justify-between">
                 <div className="flex items-center gap-3">
                   <div className="w-8 h-8 rounded-full bg-[#E8EBE5] flex items-center justify-center text-[#3D7A8C]">
                     <Moon size={16} />
                   </div>
                   <span className="text-sm font-medium text-[#2F5641]">Meta de Sono</span>
                 </div>
                 <span className="font-bold text-[#2F5641]">{goals.sleep}h</span>
               </div>
            </div>
          </section>

          {/* Devices */}
          <section>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-sm font-bold text-[#2F5641] uppercase tracking-wide flex items-center gap-2">
                <Smartphone size={16} /> Dispositivos
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
                   <div className="w-2 h-2 rounded-full bg-[#648D4A]" title="Conectado" />
                </div>
              ))}
              {devices.length === 0 && (
                <div className="text-center py-6 bg-white rounded-xl border border-[#E8EBE5] border-dashed">
                  <p className="text-xs text-[#8B9286] mb-2">Nenhum dispositivo vinculado</p>
                  <button className="text-xs font-bold text-[#2F5641] bg-[#E8EBE5] px-3 py-1.5 rounded-lg">
                    Adicionar Dispositivo
                  </button>
                </div>
              )}
            </div>
          </section>

          {/* Professionals */}
          <section>
            <h2 className="text-sm font-bold text-[#2F5641] uppercase tracking-wide mb-4 flex items-center gap-2">
              <Heart size={16} /> Profissionais Vinculados
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
                   <ChevronRight size={16} className="text-[#E8EBE5]" />
                </div>
              ))}
            </div>
          </section>

          {/* Logout */}
          <button className="w-full py-4 text-[#BE4E35] font-semibold text-sm flex items-center justify-center gap-2 hover:bg-[#BE4E35]/5 rounded-xl transition-colors">
            <LogOut size={16} /> Sair da Conta
          </button>

          {/* Save Button (Sticky) */}
          <div className="fixed bottom-[90px] left-6 right-6 max-w-[382px] mx-auto z-20">
             <button 
               onClick={handleSave}
               className="w-full bg-[#2F5641] text-white py-4 rounded-2xl font-bold text-lg shadow-xl shadow-[#2F5641]/25 active:scale-[0.98] transition-all"
             >
               Salvar Alterações
             </button>
          </div>

        </main>
      </div>
    </Layout>
  );
}
