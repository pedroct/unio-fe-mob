import { useLocation } from "wouter";
import { Home, Leaf, Plus, Dumbbell, User } from "lucide-react";
import { ReactNode } from "react";

interface LayoutProps {
  children: ReactNode;
}

export default function Layout({ children }: LayoutProps) {
  const [location, setLocation] = useLocation();

  const isActive = (path: string) => location === path;

  return (
    <div className="min-h-screen bg-[#FAFBF8] max-w-[430px] mx-auto relative flex flex-col">
      <div className="flex-1 pb-[90px]">
        {children}
      </div>

      {/* Bottom Tab Bar */}
      <div className="fixed bottom-0 left-0 right-0 h-[84px] bg-[#FAFBF8] border-t border-[#E8EBE5] flex items-start justify-between px-6 pt-3 z-50 max-w-[430px] mx-auto pb-6">
        {/* Home */}
        <button 
          onClick={() => setLocation("/home")}
          className={`flex flex-col items-center gap-1 w-14 ${isActive("/home") ? "text-[#2F5641]" : "text-[#8B9286]"}`}
        >
          <Home size={24} strokeWidth={isActive("/home") ? 2.5 : 2} />
          <span className="text-[10px] font-medium">Home</span>
        </button>

        {/* Nutrition */}
        <button 
          onClick={() => setLocation("/nutrition")}
          className={`flex flex-col items-center gap-1 w-14 ${isActive("/nutrition") ? "text-[#2F5641]" : "text-[#8B9286]"}`}
        >
          <Leaf size={24} strokeWidth={isActive("/nutrition") ? 2.5 : 2} />
          <span className="text-[10px] font-medium">Nutrição</span>
        </button>

        {/* FAB - Quick Add */}
        <button 
          className="-mt-6 w-[56px] h-[56px] rounded-full bg-[#C7AE6A] flex items-center justify-center shadow-lg shadow-[#C7AE6A]/40 hover:scale-105 transition-transform"
          aria-label="Registro Rápido"
        >
          <Plus size={28} color="#FFFFFF" strokeWidth={2.5} />
        </button>

        {/* Training */}
        <button 
          onClick={() => setLocation("/training")}
          className={`flex flex-col items-center gap-1 w-14 ${isActive("/training") ? "text-[#2F5641]" : "text-[#8B9286]"}`}
        >
          <Dumbbell size={24} strokeWidth={isActive("/training") ? 2.5 : 2} />
          <span className="text-[10px] font-medium">Treino</span>
        </button>

        {/* Profile */}
        <button 
          onClick={() => setLocation("/profile")}
          className={`flex flex-col items-center gap-1 w-14 ${isActive("/profile") ? "text-[#2F5641]" : "text-[#8B9286]"}`}
        >
          <User size={24} strokeWidth={isActive("/profile") ? 2.5 : 2} />
          <span className="text-[10px] font-medium">Perfil</span>
        </button>
      </div>
    </div>
  );
}
