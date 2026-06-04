"use client";

// /admin — minimal landing for admin tools. AdminLayout
// (src/app/admin/layout.tsx) handles auth gating; this page is just
// a router for the admin to find tools.

import Link from "next/link";
import { GOLD, TEXT_DIM, TEXT_FADE, card } from "./queue/styles";

interface Tool {
  href: string;
  title: string;
  desc: string;
}

const TOOLS: Tool[] = [
  {
    href: "/admin/queue",
    title: "Cohort queue",
    desc: "Pending / Waitlist / Approved registrations · Title Deed · Plot Claim verification.",
  },
  {
    href: "/admin/dda-refresh",
    title: "Refresh DDA",
    desc: "Bulk re-pull DDA polygon + AffectionPlan for public ZAAHI listings (LISTED / VERIFIED / IN_DEAL).",
  },
];

export default function AdminLanding() {
  return (
    <div style={{ padding: 24, maxWidth: 900, margin: "0 auto" }}>
      <h1
        style={{
          fontFamily: "Georgia, serif",
          fontSize: 32,
          marginBottom: 4,
          letterSpacing: "-0.02em",
        }}
      >
        Admin
      </h1>
      <p style={{ color: TEXT_DIM, marginBottom: 24, fontSize: 13 }}>
        Operations tools for ZAAHI administrators.
      </p>
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))",
          gap: 14,
        }}
      >
        {TOOLS.map((t) => (
          <Link
            key={t.href}
            href={t.href}
            style={{
              ...card,
              padding: 18,
              textDecoration: "none",
              color: "inherit",
              display: "block",
              transition: "border-color 150ms ease, background 150ms ease",
            }}
          >
            <div
              style={{
                color: GOLD,
                fontFamily: "Georgia, serif",
                fontSize: 18,
                marginBottom: 6,
                letterSpacing: "-0.01em",
              }}
            >
              {t.title}
            </div>
            <div style={{ color: TEXT_FADE, fontSize: 12, lineHeight: 1.5 }}>{t.desc}</div>
          </Link>
        ))}
      </div>
    </div>
  );
}
