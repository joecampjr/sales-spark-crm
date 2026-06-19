"use client";

import { useEffect } from "react";

export function PWARegistrar() {
  useEffect(() => {
    if (typeof window !== "undefined" && "serviceWorker" in navigator) {
      window.addEventListener("load", () => {
        navigator.serviceWorker
          .register("/sw.js")
          .then((registration) => {
            console.log("Service Worker registrado com sucesso:", registration.scope);
          })
          .catch((error) => {
            console.error("Falha ao registrar o Service Worker:", error);
          });
      });
    }
  }, []);

  return null;
}
