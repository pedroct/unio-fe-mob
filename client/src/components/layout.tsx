import { useLocation } from "wouter";
import { Home, Leaf, Plus, Dumbbell, Scale, Pill } from "lucide-react";
import { ReactNode } from "react";

interface LayoutProps {
  children: ReactNode;
}

export default function Layout({ children }: LayoutProps) {
  const [location, setLocation] = useLocation();

  // Helper to check if a route is active (or a sub-route)
  const isActive = (path: string) => {
    if (path === "/home" && location === "/home") return true;
    if (path !== "/home" && location.startsWith(path)) return true;
    return false;
  };

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

        {/* FAB - Quick Add (Center) */}
        {/* Replacing with Supplements for this PRD request or keeping it? 
            The previous layout didn't have 5 items in the bottom bar, it had a FAB.
            Let's adapt to fit 5 items + FAB if needed, or replace FAB with item.
            Given the PRD has 5 main modules (Nutrition, Training, Biometrics, Supplements, Pantry),
            we need better navigation. I will replace the FAB with Training to make space, or just squeeze them.
            Let's use a standard 5-icon tab bar for now to ensure Supplements is accessible.
        */}
        
        {/* Training */}
        <button 
          onClick={() => setLocation("/training")}
          className={`flex flex-col items-center gap-1 w-14 ${isActive("/training") ? "text-[#2F5641]" : "text-[#8B9286]"}`}
        >
          <Dumbbell size={24} strokeWidth={isActive("/training") ? 2.5 : 2} />
          <span className="text-[10px] font-medium">Treino</span>
        </button>

        {/* Biometrics */}
        <button 
          onClick={() => setLocation("/biometrics")}
          className={`flex flex-col items-center gap-1 w-14 ${isActive("/biometrics") ? "text-[#2F5641]" : "text-[#8B9286]"}`}
        >
          <Scale size={24} strokeWidth={isActive("/biometrics") ? 2.5 : 2} />
          <span className="text-[10px] font-medium">Biometria</span>
        </button>

        {/* Supplements */}
        <button 
          onClick={() => setLocation("/supplements")}
          className={`flex flex-col items-center gap-1 w-14 ${isActive("/supplements") ? "text-[#2F5641]" : "text-[#8B9286]"}`}
        >
          <Pill size={24} strokeWidth={isActive("/supplements") ? 2.5 : 2} />
          <span className="text-[10px] font-medium">Suplem.</span>
        </button>
      </div>
    </div>
  );
}
