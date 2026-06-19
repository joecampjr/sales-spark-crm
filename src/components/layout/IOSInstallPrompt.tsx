"use client";

import { useEffect, useState } from "react";
import { Share, PlusSquare, X } from "lucide-react";
import { Button } from "@/components/ui/button";

export function IOSInstallPrompt() {
  const [showPrompt, setShowPrompt] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;

    // Detecta se o dispositivo é iOS
    const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) && !(window as any).MSStream;

    // Detecta se já está rodando no modo standalone (instalado)
    const isStandalone = 
      (window.navigator as any).standalone === true || 
      window.matchMedia("(display-mode: standalone)").matches;

    // Verifica se já dispensou o prompt nesta sessão
    const hasDismissed = sessionStorage.getItem("ios-pwa-prompt-dismissed");

    if (isIOS && !isStandalone && !hasDismissed) {
      // Exibe o prompt com um pequeno delay para melhor UX
      const timer = setTimeout(() => {
        setShowPrompt(true);
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, []);

  const handleDismiss = () => {
    sessionStorage.setItem("ios-pwa-prompt-dismissed", "true");
    setShowPrompt(false);
  };

  if (!showPrompt) return null;

  return (
    <div className="fixed bottom-20 left-4 right-4 md:left-auto md:right-4 md:w-96 z-50 animate-in slide-in-from-bottom duration-300">
      <div className="bg-slate-900/95 border border-slate-800 backdrop-blur-md rounded-2xl p-4 shadow-[0_8px_30px_rgb(0,0,0,0.4)] flex flex-col gap-3 relative">
        <button 
          onClick={handleDismiss} 
          className="absolute top-2 right-2 text-slate-400 hover:text-slate-200 transition-colors p-1 rounded-full"
        >
          <X className="w-4 h-4" />
        </button>

        <div className="flex gap-3 items-start">
          <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-cyan-500 to-emerald-500 flex items-center justify-center shrink-0 shadow-lg shadow-cyan-500/10">
            <span className="text-slate-950 font-bold text-lg">SS</span>
          </div>
          <div className="flex flex-col gap-1 pr-4">
            <h4 className="text-sm font-semibold text-slate-100">Instalar Sales Spark no iPhone</h4>
            <p className="text-xs text-slate-400 leading-relaxed">
              Adicione o CRM à sua tela de início para usá-lo como um aplicativo em tela cheia e com melhor performance.
            </p>
          </div>
        </div>

        <div className="border-t border-slate-800/80 pt-3 flex flex-col gap-2.5 text-xs text-slate-300">
          <div className="flex items-center gap-2.5">
            <span className="w-5 h-5 rounded-full bg-slate-800 flex items-center justify-center text-[10px] font-bold text-cyan-400 shrink-0">1</span>
            <span className="flex-1">Toque no botão de **Compartilhar** na barra do Safari:</span>
            <Share className="w-4 h-4 text-cyan-400 shrink-0" />
          </div>
          <div className="flex items-center gap-2.5">
            <span className="w-5 h-5 rounded-full bg-slate-800 flex items-center justify-center text-[10px] font-bold text-cyan-400 shrink-0">2</span>
            <span className="flex-1">Role a lista e escolha **Adicionar à Tela de Início**:</span>
            <PlusSquare className="w-4 h-4 text-cyan-400 shrink-0" />
          </div>
        </div>

        <Button 
          onClick={handleDismiss} 
          variant="outline" 
          size="sm" 
          className="w-full text-xs border-slate-800 hover:bg-slate-800 text-slate-200"
        >
          Entendido
        </Button>
      </div>
    </div>
  );
}
