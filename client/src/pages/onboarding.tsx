import { useState, useRef, useEffect } from "react";
import { useLocation } from "wouter";
import { motion, AnimatePresence, useAnimation } from "framer-motion";
import { 
  Leaf, 
  Dumbbell, 
  User, 
  ChevronRight, 
  Check 
} from "lucide-react";

// Slide Configuration
const SLIDES = [
  {
    id: "nutrition",
    module: "NUTRIÇÃO",
    title: "Nutrição\nUnificada",
    description: "Registre refeições em segundos com scanner, balança BLE e base inteligente. Seus macros, sempre atualizados.",
    color: "var(--mod-nutricao)",
    hex: "#648D4A",
    icon: Leaf,
    features: ["Scanner de código de barras", "Balança BLE integrada", "Macros em tempo real"]
  },
  {
    id: "training",
    module: "TREINO",
    title: "Treino\nInteligente",
    description: "Prescrição profissional com execução guiada. Timer automático, progressão de carga e histórico completo.",
    color: "var(--mod-treino)",
    hex: "#D97952",
    icon: Dumbbell,
    features: ["Prescrição profissional", "Timer automático", "Progressão de carga"]
  },
  {
    id: "biometrics",
    module: "BIOMETRIA",
    title: "Corpo\nConectado",
    description: "Composição corporal via balança inteligente. Correlacione treino, dieta e evolução em um só lugar.",
    color: "var(--mod-corpo)",
    hex: "#3D7A8C",
    icon: User,
    features: ["Composição corporal", "Balança inteligente", "Correlação cruzada"]
  }
];

export default function OnboardingScreen() {
  const [currentSlide, setCurrentSlide] = useState(0);
  const [, setLocation] = useLocation();
  const directionRef = useRef(0);
  const controls = useAnimation();

  const activeSlide = SLIDES[currentSlide];

  const handleNext = () => {
    if (currentSlide < SLIDES.length - 1) {
      directionRef.current = 1;
      setCurrentSlide(prev => prev + 1);
    } else {
      setLocation("/welcome");
    }
  };

  const handleSkip = () => {
    setLocation("/welcome");
  };

  const handleDotClick = (index: number) => {
    directionRef.current = index > currentSlide ? 1 : -1;
    setCurrentSlide(index);
  };

  const onDragEnd = (event: any, info: any) => {
    const swipeThreshold = 50;
    if (info.offset.x < -swipeThreshold) {
      if (currentSlide < SLIDES.length - 1) {
        handleNext();
      }
    } else if (info.offset.x > swipeThreshold) {
      if (currentSlide > 0) {
        directionRef.current = -1;
        setCurrentSlide(prev => prev - 1);
      }
    }
  };

  return (
    <div className="relative w-full h-[100vh] bg-[#FAFBF8] flex flex-col overflow-hidden max-w-[430px] mx-auto">
      {/* Top Bar */}
      <div className="absolute top-0 left-0 right-0 pt-[56px] px-6 flex justify-end z-20">
        <button 
          onClick={handleSkip}
          className="text-[#8B9286] font-medium text-sm hover:opacity-70 transition-opacity"
          aria-label="Pular introdução"
        >
          Pular
        </button>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col relative mt-[80px]">
        
        {/* Illustration Area */}
        <div className="relative h-[300px] flex items-center justify-center mb-4">
          <AnimatePresence mode="wait">
            <motion.div
              key={activeSlide.id}
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.8, opacity: 0 }}
              transition={{ type: "spring", stiffness: 300, damping: 30 }}
              className="relative"
            >
              {/* Outer Decorative Ring */}
              <div 
                className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[224px] h-[224px] rounded-full border border-current opacity-[0.08]"
                style={{ color: activeSlide.hex }}
              />
              
              {/* Floating Dots */}
              {[0, 120, 240].map((deg, i) => (
                <div 
                  key={i}
                  className="absolute w-1.5 h-1.5 rounded-full opacity-20"
                  style={{ 
                    backgroundColor: activeSlide.hex,
                    top: `calc(50% + ${Math.sin(deg * Math.PI / 180) * 120}px)`,
                    left: `calc(50% + ${Math.cos(deg * Math.PI / 180) * 120}px)`,
                  }}
                />
              ))}

              {/* Main Circle */}
              <div 
                className="w-[200px] h-[200px] rounded-full flex items-center justify-center transition-colors duration-500"
                style={{ backgroundColor: `${activeSlide.hex}12` }} // 7% opacity approx
              >
                <activeSlide.icon 
                  size={88} 
                  color={activeSlide.hex} 
                  strokeWidth={1.5}
                />
              </div>
            </motion.div>
          </AnimatePresence>
        </div>

        {/* Text Content */}
        <div className="flex-1 px-8 relative overflow-hidden">
          <AnimatePresence mode="wait" initial={false} custom={directionRef.current}>
            <motion.div
              key={currentSlide}
              custom={directionRef.current}
              initial={{ x: directionRef.current > 0 ? 50 : -50, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              exit={{ x: directionRef.current > 0 ? -50 : 50, opacity: 0 }}
              transition={{ duration: 0.4, ease: "easeOut" }}
              className="absolute inset-0 px-8"
              drag="x"
              dragConstraints={{ left: 0, right: 0 }}
              dragElastic={0.2}
              onDragEnd={onDragEnd}
            >
              {/* Module Badge */}
              <div className="flex items-center gap-2 mb-4">
                <div 
                  className="w-2 h-2 rounded-[1px]" 
                  style={{ backgroundColor: activeSlide.hex }} 
                />
                <span 
                  className="text-[11px] font-semibold tracking-[2px] uppercase transition-colors duration-500"
                  style={{ color: activeSlide.hex }}
                >
                  {activeSlide.module}
                </span>
              </div>

              {/* Title */}
              <h2 className="font-display text-[34px] leading-[1.15] font-semibold text-[#2F5641] mb-4 whitespace-pre-line">
                {activeSlide.title}
              </h2>

              {/* Description */}
              <p className="font-body text-[15px] leading-[1.6] text-[#5F6B5A] mb-8 max-w-[320px]">
                {activeSlide.description}
              </p>

              {/* Feature Chips */}
              <div className="flex flex-wrap gap-2">
                {activeSlide.features.map((feature, idx) => (
                  <span
                    key={idx}
                    className="px-3.5 py-1.5 rounded-[20px] text-[12px] font-medium border transition-colors duration-500"
                    style={{ 
                      backgroundColor: `${activeSlide.hex}12`, // 7%
                      borderColor: `${activeSlide.hex}1F`, // 12%
                      color: activeSlide.hex
                    }}
                  >
                    {feature}
                  </span>
                ))}
              </div>
            </motion.div>
          </AnimatePresence>
        </div>

        {/* Bottom Controls */}
        <div className="pb-12 px-8 pt-4 flex items-center justify-between mt-auto">
          
          {/* Dot Indicators */}
          <div className="flex gap-2">
            {SLIDES.map((_, index) => (
              <button
                key={index}
                onClick={() => handleDotClick(index)}
                aria-label={`Slide ${index + 1} de ${SLIDES.length}`}
                className="h-2 rounded-full transition-all duration-500 ease-[cubic-bezier(0.34,1.56,0.64,1)]"
                style={{
                  width: currentSlide === index ? 24 : 8,
                  backgroundColor: currentSlide === index ? activeSlide.hex : '#8B9286',
                  opacity: currentSlide === index ? 1 : 0.19
                }}
              />
            ))}
          </div>

          {/* Action Button */}
          <button
            onClick={handleNext}
            className={`flex items-center gap-2 font-semibold text-white shadow-lg transition-all duration-500`}
            style={{
              backgroundColor: currentSlide === 2 ? '#2F5641' : activeSlide.hex, // Gradient for last slide handled below
              backgroundImage: currentSlide === 2 ? 'linear-gradient(135deg, #2F5641, #4A7246)' : 'none',
              padding: currentSlide === 2 ? '14px 32px' : '12px 24px',
              borderRadius: currentSlide === 2 ? '28px' : '24px',
              fontSize: currentSlide === 2 ? '16px' : '14px',
              boxShadow: currentSlide === 2 
                ? '0 8px 24px rgba(47, 86, 65, 0.25)' 
                : `0 4px 16px ${activeSlide.hex}30`
            }}
          >
            {currentSlide === 2 ? "Começar" : "Próximo"}
            <ChevronRight size={16} strokeWidth={3} />
          </button>
        </div>
      </div>
    </div>
  );
}
