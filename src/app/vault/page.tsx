// ZAAHI Vault — /vault top-level route.
//
// Day 9 of Phase 2.1. Gated by <AuthGuard> via the existing wrapper.
// Spec: docs/specs/phase-2/private-plot-vault/spec.md §6.3.

"use client";

import { useEffect, useState } from "react";
import AuthGuard from "@/components/AuthGuard";
import { supabaseBrowser } from "@/lib/supabase-browser";
import { VaultListView } from "./VaultListView";

export default function VaultPage() {
  return (
    <AuthGuard>
      <VaultPageBody />
    </AuthGuard>
  );
}

function VaultPageBody() {
  const [userId, setUserId] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const { data } = await supabaseBrowser.auth.getSession();
      if (!cancelled) setUserId(data.session?.user.id ?? null);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  if (!userId) {
    return (
      <div
        style={{
          minHeight: "100vh",
          background: "linear-gradient(180deg, #0A1628 0%, #050B18 100%)",
          color: "rgba(255, 255, 255, 0.5)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontSize: 13,
        }}
      >
        Loading…
      </div>
    );
  }

  return (
    <div
      style={{
        minHeight: "100vh",
        background: "linear-gradient(180deg, #0A1628 0%, #050B18 100%)",
        color: "#FFFFFF",
      }}
    >
      <VaultListView selfUserId={userId} />
    </div>
  );
}
