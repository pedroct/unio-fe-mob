import { useState } from "react";
import { useLocation } from "wouter";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Eye, EyeOff, Check, X, ArrowRight } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import unioIcon from "@assets/icone_1771280291997.png";

// Validation Schemas
const loginSchema = z.object({
  email: z.string().min(1, "Informe seu e-mail").email("Digite um e-mail válido"),
  password: z.string().min(1, "Informe sua senha"),
});

const registerSchema = z.object({
  email: z.string().min(1, "Informe seu e-mail").email("Digite um e-mail válido"),
  password: z.string().min(6, "A senha deve ter pelo menos 6 caracteres"),
  confirmPassword: z.string().min(1, "Confirme sua senha"),
}).refine((data) => data.password === data.confirmPassword, {
  message: "As senhas não coincidem",
  path: ["confirmPassword"],
});

type LoginData = z.infer<typeof loginSchema>;
type RegisterData = z.infer<typeof registerSchema>;

export default function AuthScreen() {
  const [, setLocation] = useLocation();
  const [mode, setMode] = useState<"login" | "register">("login");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  // Forms
  const loginForm = useForm<LoginData>({
    resolver: zodResolver(loginSchema),
    mode: "onChange",
  });

  const registerForm = useForm<RegisterData>({
    resolver: zodResolver(registerSchema),
    mode: "onChange",
  });

  const activeForm = mode === "login" ? loginForm : registerForm;
  const isValid = activeForm.formState.isValid;

  // Submit Handler
  const onSubmit = async (data: any) => {
    setIsLoading(true);
    
    // Simulate API delay
    await new Promise(resolve => setTimeout(resolve, 1500));
    
    setIsLoading(false);
    setLocation("/home");
  };

  const toggleMode = (newMode: "login" | "register") => {
    setMode(newMode);
    // Reset forms when switching
    loginForm.reset();
    registerForm.reset();
  };

  return (
    <div className="min-h-screen bg-[#FAFBF8] flex flex-col items-center px-6 pt-12 pb-8 max-w-[430px] mx-auto relative overflow-hidden">
      
      {/* Background Decor */}
      <div className="absolute top-0 left-0 right-0 h-[200px] bg-gradient-to-b from-[#FAFBF8] to-transparent z-10 pointer-events-none" />
      
      {/* Logo */}
      <motion.div 
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-10 z-20 flex flex-col items-center"
      >
        <div className="w-16 h-16 mb-4 relative">
          <img src={unioIcon} alt="UNIO" className="w-full h-full object-contain" />
        </div>
        <h1 className="font-display text-2xl tracking-[4px] text-[#2F5641]">UNIO</h1>
      </motion.div>

      {/* Tabs */}
      <div className="w-full flex mb-8 relative z-20">
        <button
          onClick={() => toggleMode("login")}
          className={`flex-1 pb-3 text-sm font-medium transition-colors relative ${
            mode === "login" ? "text-[#2F5641]" : "text-[#8B9286]"
          }`}
        >
          Entrar
          {mode === "login" && (
            <motion.div 
              layoutId="activeTab"
              className="absolute bottom-0 left-0 right-0 h-[2px] bg-[#C7AE6A]" 
            />
          )}
        </button>
        <button
          onClick={() => toggleMode("register")}
          className={`flex-1 pb-3 text-sm font-medium transition-colors relative ${
            mode === "register" ? "text-[#2F5641]" : "text-[#8B9286]"
          }`}
        >
          Criar Conta
          {mode === "register" && (
            <motion.div 
              layoutId="activeTab"
              className="absolute bottom-0 left-0 right-0 h-[2px] bg-[#C7AE6A]" 
            />
          )}
        </button>
      </div>

      {/* Form Area */}
      <div className="w-full flex-1 z-20">
        <AnimatePresence mode="wait">
          <motion.form
            key={mode}
            initial={{ opacity: 0, x: mode === "login" ? -20 : 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: mode === "login" ? 20 : -20 }}
            transition={{ duration: 0.3 }}
            onSubmit={activeForm.handleSubmit(onSubmit)}
            className="flex flex-col gap-5"
          >
            {/* Email Field */}
            <div className="space-y-1.5">
              <label className="text-[12px] font-medium text-[#2F5641] uppercase tracking-wide ml-1">
                E-mail
              </label>
              <input
                {...activeForm.register("email" as any)}
                type="email"
                placeholder="seuemail@exemplo.com"
                className="w-full bg-[#F5F3EE] border border-[#E8EBE5] rounded-xl px-4 py-3.5 text-[#2F5641] placeholder-[#8B9286] focus:outline-none focus:border-[#C7AE6A] focus:ring-1 focus:ring-[#C7AE6A] transition-all text-sm"
              />
              {activeForm.formState.errors.email && (
                <p className="text-[#D97952] text-xs ml-1 flex items-center gap-1">
                  <X size={12} /> {activeForm.formState.errors.email?.message as string}
                </p>
              )}
            </div>

            {/* Password Field */}
            <div className="space-y-1.5">
              <label className="text-[12px] font-medium text-[#2F5641] uppercase tracking-wide ml-1">
                Senha
              </label>
              <div className="relative">
                <input
                  {...activeForm.register("password" as any)}
                  type={showPassword ? "text" : "password"}
                  placeholder="Digite sua senha"
                  className="w-full bg-[#F5F3EE] border border-[#E8EBE5] rounded-xl px-4 py-3.5 text-[#2F5641] placeholder-[#8B9286] focus:outline-none focus:border-[#C7AE6A] focus:ring-1 focus:ring-[#C7AE6A] transition-all text-sm pr-12"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-[#8B9286] hover:text-[#2F5641] transition-colors"
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
              {activeForm.formState.errors.password && (
                <p className="text-[#D97952] text-xs ml-1 flex items-center gap-1">
                  <X size={12} /> {activeForm.formState.errors.password?.message as string}
                </p>
              )}
            </div>

            {/* Confirm Password (Register Only) */}
            {mode === "register" && (
              <div className="space-y-1.5">
                <label className="text-[12px] font-medium text-[#2F5641] uppercase tracking-wide ml-1">
                  Confirmar Senha
                </label>
                <div className="relative">
                  <input
                    {...(activeForm as any).register("confirmPassword")}
                    type={showConfirmPassword ? "text" : "password"}
                    placeholder="Confirme sua senha"
                    className="w-full bg-[#F5F3EE] border border-[#E8EBE5] rounded-xl px-4 py-3.5 text-[#2F5641] placeholder-[#8B9286] focus:outline-none focus:border-[#C7AE6A] focus:ring-1 focus:ring-[#C7AE6A] transition-all text-sm pr-12"
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-[#8B9286] hover:text-[#2F5641] transition-colors"
                  >
                    {showConfirmPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
                {activeForm.formState.errors.confirmPassword && (
                  <p className="text-[#D97952] text-xs ml-1 flex items-center gap-1">
                    <X size={12} /> {(activeForm.formState.errors as any).confirmPassword?.message as string}
                  </p>
                )}
              </div>
            )}

            {/* Forgot Password (Login Only) */}
            {mode === "login" && (
              <div className="flex justify-end">
                <button type="button" className="text-xs text-[#8B9286] hover:text-[#2F5641] transition-colors">
                  Esqueci minha senha
                </button>
              </div>
            )}

            {/* Submit Button */}
            <div className="mt-6">
              <button
                type="submit"
                disabled={!isValid || isLoading}
                className={`w-full py-4 rounded-full font-semibold text-sm transition-all duration-300 flex items-center justify-center gap-2
                  ${isValid && !isLoading
                    ? "bg-[#2F5641] text-white shadow-lg shadow-[#2F5641]/20 hover:scale-[1.02]" 
                    : "bg-[#E8EBE5] text-[#8B9286] cursor-not-allowed"
                  }`}
              >
                {isLoading ? (
                  <span className="w-5 h-5 border-2 border-current border-t-transparent rounded-full animate-spin" />
                ) : (
                  <>
                    {mode === "login" ? "Acessar conta" : "Criar minha conta"}
                    {isValid && <ArrowRight size={16} />}
                  </>
                )}
              </button>
            </div>
          </motion.form>
        </AnimatePresence>
      </div>

      {/* Footer / Support */}
      <div className="mt-auto pt-8 z-20">
        <p className="text-[11px] text-[#8B9286] text-center">
          Precisa de ajuda? <button className="text-[#C7AE6A] hover:underline font-medium">Falar com suporte</button>
        </p>
      </div>
    </div>
  );
}
