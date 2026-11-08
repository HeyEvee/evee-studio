"use client";

import { useEffect, useRef } from "react";
import { createClient } from "@/lib/supabase/client";

export default function MargoMount({ email, billing = false }: { email: string; billing?: boolean }) {
  const root = useRef<HTMLDivElement>(null);
  useEffect(() => {
    let stop: (() => void) | undefined;
    let cancelled = false;
    import("./app.js").then((m) => {
      if (cancelled || !root.current) return;
      stop = m.mount(root.current, { supabase: createClient(), email, billing });
    });
    if ("serviceWorker" in navigator) navigator.serviceWorker.register("/sw.js").catch(() => {});
    return () => {
      cancelled = true;
      stop?.();
    };
  }, [email, billing]);
  return <div ref={root} />;
}
