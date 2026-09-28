"use client";

import { useEffect, useRef } from "react";

/**
 * Widget do Cloudflare Turnstile (CAPTCHA gratuito e leve).
 *
 * Só renderiza se a variável NEXT_PUBLIC_TURNSTILE_SITE_KEY estiver configurada.
 * Chama onToken com o token gerado (ou "" ao expirar/resetar).
 */

declare global {
  interface Window {
    turnstile?: {
      render: (
        el: HTMLElement,
        options: {
          sitekey: string;
          callback: (token: string) => void;
          "expired-callback"?: () => void;
          "error-callback"?: () => void;
          theme?: "light" | "dark" | "auto";
        },
      ) => string;
      reset: (widgetId?: string) => void;
    };
  }
}

const SCRIPT_SRC = "https://challenges.cloudflare.com/turnstile/v0/api.js";

export default function Turnstile({ onToken }: { onToken: (token: string) => void }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const widgetIdRef = useRef<string | null>(null);
  const siteKey = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY;

  useEffect(() => {
    if (!siteKey) return;

    function renderWidget() {
      if (!window.turnstile || !containerRef.current || widgetIdRef.current) return;
      widgetIdRef.current = window.turnstile.render(containerRef.current, {
        sitekey: siteKey!,
        theme: "auto",
        callback: (token: string) => onToken(token),
        "expired-callback": () => onToken(""),
        "error-callback": () => onToken(""),
      });
    }

    // Carrega o script uma única vez.
    const existing = document.querySelector(`script[src="${SCRIPT_SRC}"]`);
    if (existing) {
      renderWidget();
    } else {
      const script = document.createElement("script");
      script.src = SCRIPT_SRC;
      script.async = true;
      script.defer = true;
      script.onload = renderWidget;
      document.head.appendChild(script);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [siteKey]);

  // Sem chave configurada: não renderiza nada (fallback — o site funciona sem CAPTCHA).
  if (!siteKey) return null;

  return <div ref={containerRef} style={{ marginBottom: 8 }} />;
}
