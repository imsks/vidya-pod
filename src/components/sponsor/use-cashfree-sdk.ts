"use client";

import { useState, useEffect, useCallback } from "react";

type CashfreeMode = "sandbox" | "production";

interface CashfreeCheckout {
  checkout: (opts: { paymentSessionId: string; redirectTarget: string }) => void;
}

interface CashfreeFactory {
  (opts: { mode: CashfreeMode }): CashfreeCheckout;
}

const getCashfreeFactory = (): CashfreeFactory | undefined => {
  if (typeof window === "undefined") return undefined;
  return (window as Window & { Cashfree?: CashfreeFactory }).Cashfree;
};

export const useCashfreeSDK = () => {
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    const existing = document.getElementById("cashfree-sdk");
    if (existing) {
      const timer = window.setTimeout(() => setLoaded(true), 0);
      return () => window.clearTimeout(timer);
    }

    const script = document.createElement("script");
    script.id = "cashfree-sdk";
    script.src = "https://sdk.cashfree.com/js/v3/cashfree.js";
    script.onload = () => setLoaded(true);
    document.head.appendChild(script);
  }, []);

  const launchPayment = useCallback(
    (paymentSessionId: string) => {
      const Cashfree = getCashfreeFactory();
      if (!loaded || !Cashfree) return;
      const mode: CashfreeMode =
        process.env.NEXT_PUBLIC_CASHFREE_MODE === "production" ? "production" : "sandbox";
      const cashfree = Cashfree({ mode });
      cashfree.checkout({ paymentSessionId, redirectTarget: "_self" });
    },
    [loaded],
  );

  return { loaded, launchPayment };
};
