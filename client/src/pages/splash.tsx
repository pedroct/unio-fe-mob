import { useState, useEffect } from "react";
import unioIcon from "@assets/icone_1771280291997.png";

export default function SplashScreen({ onComplete }: { onComplete?: () => void }) {
  const [phase, setPhase] = useState<"loading" | "ready" | "exit">("loading");

  useEffect(() => {
    const t1 = setTimeout(() => setPhase("ready"), 800);
    const t2 = setTimeout(() => setPhase("exit"), 3200);
    const t3 = setTimeout(() => {
      if (onComplete) {
        onComplete();
      }
    }, 3800);

    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
      clearTimeout(t3);
    };
  }, [onComplete]);

  return (
    <div
      className="min-h-screen max-w-[430px] mx-auto relative overflow-hidden flex flex-col items-center justify-center font-sans"
      aria-label="UNIO - Carregando"
      role="status"
    >
      <div
        className="absolute inset-0 z-0 transition-opacity duration-1000"
        style={{
          background: "radial-gradient(ellipse at 50% 30%, #4A7246 0%, #2F5641 70%)"
        }}
      />

      <div className="absolute inset-0 z-0 pointer-events-none opacity-50 mix-blend-soft-light">
        <div
          className="absolute inset-0"
          style={{
            background: "radial-gradient(circle at 20% 50%, rgba(255,255,255,0.08) 0%, transparent 60%)"
          }}
        />
        <div
          className="absolute inset-0"
          style={{
            background: "radial-gradient(circle at 80% 20%, rgba(255,255,255,0.05) 0%, transparent 60%)"
          }}
        />
      </div>

      {[...Array(6)].map((_, i) => {
        const isReady = phase === "ready" || phase === "exit";
        const isGold = i % 2 === 0;
        const baseSize = 6 + (i * 2.4);

        const positions = [
          { top: '25%', left: '20%' },
          { top: '30%', left: '75%' },
          { top: '65%', left: '25%' },
          { top: '60%', left: '80%' },
          { top: '20%', left: '55%' },
          { top: '75%', left: '45%' },
        ];

        const pos = positions[i % positions.length];

        return (
          <div
            key={i}
            className="absolute rounded-tl-[50%] rounded-br-[50%] rounded-tr-none rounded-bl-none"
            style={{
              width: baseSize,
              height: baseSize,
              background: isGold ? '#C7AE6A' : '#648D4A',
              opacity: isReady ? (isGold ? 0.39 : 0.25) : 0,
              top: pos.top,
              left: pos.left,
              transform: isReady
                ? `translateY(0) rotate(${i * 45}deg) scale(1)`
                : `translateY(40px) rotate(0deg) scale(0)`,
              transition: `transform ${0.8 + (i * 0.15)}s cubic-bezier(0.34, 1.56, 0.64, 1), opacity 0.8s ease-out`,
              transitionDelay: `${i * 100}ms`
            }}
          />
        );
      })}

      <div
        className={`relative z-10 flex flex-col items-center justify-center w-full transition-all duration-600 ease-out ${phase === "exit" ? "opacity-0 scale-95" : "opacity-100 scale-100"}`}
      >
        <div
          className="mb-6 relative will-change-transform"
          style={{
            transform: phase === "loading" ? "translateY(20px) scale(0.8)" : "translateY(0) scale(1)",
            opacity: phase === "loading" ? 0 : 1,
            transition: "transform 0.8s cubic-bezier(0.34, 1.56, 0.64, 1), opacity 0.8s ease-out"
          }}
        >
          <div
            className="absolute inset-0 rounded-full bg-[#648D4A] blur-2xl transition-opacity duration-1000"
            style={{ opacity: phase === "ready" ? 0.2 : 0 }}
          />

          <img
            src={unioIcon}
            alt="UNIO Icon"
            className="w-[120px] h-[120px] object-contain relative z-10"
            style={{
              filter: "drop-shadow(0 4px 12px rgba(0,0,0,0.15))",
              animation: phase === "ready" ? "pulse-scale 3s ease-in-out infinite" : "none"
            }}
          />
        </div>

        <div
          className="flex flex-col items-center will-change-transform"
          style={{
            transform: phase === "loading" ? "translateY(15px)" : "translateY(0)",
            opacity: phase === "loading" ? 0 : 1,
            transition: "transform 0.6s ease-out, opacity 0.6s ease-out",
            transitionDelay: "400ms"
          }}
        >
          <h1 className="font-display text-[42px] font-light tracking-[14px] text-[#F5F3EE] leading-none ml-[7px]">
            UNIO
          </h1>

          <p
            className="font-body text-[11px] font-medium tracking-[3px] uppercase text-[#C7AE6A] mt-3"
            style={{
              transform: phase === "loading" ? "translateY(10px)" : "translateY(0)",
              opacity: phase === "loading" ? 0 : 1,
              transition: "transform 0.6s ease-out, opacity 0.6s ease-out",
              transitionDelay: "600ms"
            }}
          >
            Dados que cuidam de você
          </p>
        </div>

        <div className="mt-12 w-[32px] h-[2px] bg-[#C7AE6A] bg-opacity-20 rounded-full overflow-hidden">
          <div
            className="h-full bg-[#C7AE6A]"
            style={{
              width: phase === "ready" ? "100%" : "0%",
              transition: "width 1.4s ease-in-out",
              transitionDelay: "200ms"
            }}
          />
        </div>
      </div>

      <div
        className="absolute inset-0 z-20 bg-[#FAFBF8] pointer-events-none transition-opacity duration-600 ease-out"
        style={{ opacity: phase === "exit" ? 1 : 0 }}
      />

      <style>{`
        @keyframes pulse-scale {
          0%, 100% { transform: scale(1); }
          50% { transform: scale(1.02); }
        }
      `}</style>
    </div>
  );
}
