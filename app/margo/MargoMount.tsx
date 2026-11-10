"use client";

import { useEffect, useRef } from "react";
import { createClient } from "@/lib/supabase/client";

export default function MargoMount({ email, billing = false, featured = null, owner = false }: { email: string; billing?: boolean; featured?: any; owner?: boolean }) {
  const root = useRef<HTMLDivElement>(null);
  useEffect(() => {
    let stop: (() => void) | undefined;
    let cancelled = false;
    import("./app.js").then((m) => {
      if (cancelled || !root.current) return;
      stop = m.mount(root.current, { supabase: createClient(), email, billing, featured, owner });
    });
    if ("serviceWorker" in navigator) navigator.serviceWorker.register("/sw.js").catch(() => {});
    return () => {
      cancelled = true;
      stop?.();
    };
  }, [email, billing, featured, owner]);
  return <div ref={root} />;
}
