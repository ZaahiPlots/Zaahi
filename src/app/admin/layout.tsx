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
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { apiFetch } from "@/lib/api-fetch";
import { GOLD, TEXT, TEXT_FADE } from "./queue/styles";

// ── Shared admin nav (2026-09-13) ────────────────────────────────────
// The map's Admin button deep-links to /admin/queue, so the /admin
// landing (and its Users card) was never seen. This bar is rendered by
// the layout on every /admin/* page: exactly two entries, same chrome
// as the queue Tabs (gold tint + gold text when active, 150 ms).
const ADMIN_NAV: Array<{ href: string; label: string }> = [
  { href: "/admin/queue", label: "Queue" },
  { href: "/admin/users", label: "Users" },
];

function AdminNav() {
  const pathname = usePathname() ?? "";
  return (
    <nav
      aria-label="Admin"
      style={{
        display: "flex",
        alignItems: "center",
        gap: 4,
        padding: "10px 24px",
        borderBottom: "1px solid rgba(255,255,255,0.08)",
        background: "rgba(0, 0, 0, 0.3)",
        backdropFilter: "blur(16px)",
        WebkitBackdropFilter: "blur(16px)",
      }}
    >
      <span
        style={{
          fontFamily: 'Georgia, "Times New Roman", serif',
          fontSize: 11,
          letterSpacing: "0.18em",
          textTransform: "uppercase",
          color: TEXT_FADE,
          marginRight: 12,
        }}
      >
        Admin
      </span>
      {ADMIN_NAV.map((item) => {
        const isActive = pathname === item.href || pathname.startsWith(`${item.href}/`);
        return (
          <Link
            key={item.href}
            href={item.href}
            aria-current={isActive ? "page" : undefined}
            style={{
              padding: "8px 12px",
              background: isActive ? "rgba(200,169,110,0.12)" : "transparent",
              border: isActive ? `1px solid ${GOLD}55` : "1px solid transparent",
              borderRadius: 6,
              color: isActive ? GOLD : TEXT,
              fontSize: 11,
              letterSpacing: "0.06em",
              textTransform: "uppercase",
              fontWeight: isActive ? 700 : 500,
              textDecoration: "none",
              transition: "background 150ms ease, border-color 150ms ease, color 150ms ease",
            }}
            onMouseEnter={(e) => {
              if (!isActive) e.currentTarget.style.background = "rgba(200,169,110,0.08)";
            }}
            onMouseLeave={(e) => {
              if (!isActive) e.currentTarget.style.background = "transparent";
            }}
          >
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}

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
          background: "linear-gradient(180deg, #0A1628 0%, #050B18 100%)",
          color: "rgba(255, 255, 255, 0.5)",
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
        background: "linear-gradient(180deg, #0A1628 0%, #050B18 100%)",
        color: "#FFFFFF",
        fontFamily: '-apple-system, "Segoe UI", Roboto, sans-serif',
      }}
    >
      <AdminNav />
      {children}
    </div>
  );
}
