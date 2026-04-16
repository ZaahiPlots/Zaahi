"use client";

// ── /admin/* client-side guard ───────────────────────────────────────
// On mount, probes /api/admin/me (which calls getAdminUserId() server-
// side — approved + founder-email-or-role-ADMIN). If 401, redirect to
// /parcels/map. While loading, show a minimal glass spinner so the
// admin UI never flashes before auth is proven.
//
// We use client-side probing rather than a Server Component guard
// because Supabase session tokens live in localStorage / client memory
// (attached via apiFetch's Authorization header), not in cookies —
// server components would see no auth header on SPA navigations.

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { apiFetch } from "@/lib/api-fetch";

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const [state, setState] = useState<"checking" | "ok" | "denied">("checking");

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await apiFetch("/api/admin/me");
        if (!cancelled) {
          if (res.ok) setState("ok");
          else setState("denied");
        }
      } catch {
        if (!cancelled) setState("denied");
      }
    })();
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    if (state === "denied") router.replace("/parcels/map");
  }, [state, router]);

  if (state !== "ok") {
    return (
      <div
        style={{
          minHeight: "100vh",
          background: "#0A1628",
          color: "rgba(255, 255, 255, 0.55)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontFamily: '-apple-system, "Segoe UI", Roboto, sans-serif',
          fontSize: 12,
          letterSpacing: "0.12em",
          textTransform: "uppercase",
        }}
      >
        {state === "checking" ? "Verifying access…" : "Redirecting…"}
      </div>
    );
  }

  return (
    <div
      style={{
        minHeight: "100vh",
        background: "#0A1628",
        color: "rgba(255, 255, 255, 0.92)",
        fontFamily: '-apple-system, "Segoe UI", Roboto, sans-serif',
      }}
    >
      {children}
    </div>
  );
}
