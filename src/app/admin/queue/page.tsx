"use client";

// /admin/queue — cohort-pilot admin operations console.
//
// Spec §7. AdminLayout (src/app/admin/layout.tsx) gates entry —
// this page assumes the caller is admin once it renders.
//
// Layout: Cap counter strip (per-role 0..10/cap with §7.3 colours)
// → tabs row → search + role filter → list. Click a row to open the
// detail modal (ApplicationDetail).

import { useEffect, useMemo, useState } from "react";
import { apiFetch } from "@/lib/api-fetch";
import { CapCounter } from "./CapCounter";
import { Tabs, type TabKey } from "./Tabs";
import { ApplicationList } from "./ApplicationList";
import { ApplicationDetail } from "./ApplicationDetail";
import {
  GOLD,
  TEXT,
  TEXT_DIM,
  TEXT_FADE,
  inputStyle,
  ghostBtn,
} from "./styles";
import { ROLE_LABELS, COHORT_APPLICANT_ROLES } from "@/lib/registration-validation";
import type { ListResponse } from "./types";

const TABS: Array<{ key: TabKey; label: string }> = [
  { key: "all", label: "All" },
  { key: "pending", label: "Pending" },
  { key: "waitlist", label: "Waitlist" },
  { key: "approved", label: "Approved" },
  { key: "rejected", label: "Rejected" },
];
const VERIFICATION_TABS: Array<{ key: TabKey; label: string }> = [
  { key: "title_deed", label: "Title Deed" },
  { key: "plot_claim", label: "Plot Claim" },
];

const TAB_TO_STATUS: Partial<Record<TabKey, string>> = {
  pending: "PENDING_REVIEW",
  waitlist: "WAITLIST",
  approved: "APPROVED",
  rejected: "REJECTED",
};

export default function AdminQueuePage() {
  const [tab, setTab] = useState<TabKey>("pending");
  const [q, setQ] = useState("");
  const [roleFilter, setRoleFilter] = useState<string>("");
  const [data, setData] = useState<ListResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [openId, setOpenId] = useState<string | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);
  const [error, setError] = useState<string | null>(null);

  const tabs = useMemo(() => {
    const arr = TABS.map((t) => ({ ...t }));
    arr.push(
      ...VERIFICATION_TABS.map((t) => ({
        ...t,
        disabled: true,
        disabledReason: "Available after Step 10 (parcel-verification flow).",
      })),
    );
    return arr;
  }, []);

  // Fetch list whenever inputs change
  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      setError(null);
      const params = new URLSearchParams();
      const status = TAB_TO_STATUS[tab];
      if (status) params.set("status", status);
      if (roleFilter) params.set("role", roleFilter);
      if (q.trim()) params.set("q", q.trim());
      params.set("limit", "50");
      try {
        const res = await apiFetch(`/api/admin/registration?${params.toString()}`);
        if (!res.ok) {
          setError(`Failed to load (${res.status})`);
          setData(null);
          setLoading(false);
          return;
        }
        const json = (await res.json()) as ListResponse;
        if (!cancelled) {
          setData(json);
          setLoading(false);
        }
      } catch (e) {
        if (!cancelled) {
          setError(e instanceof Error ? e.message : "Network error");
          setLoading(false);
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [tab, q, roleFilter, refreshKey]);

  // Special handling for "title_deed" / "plot_claim" tabs (Step 10)
  const isVerificationTab = tab === "title_deed" || tab === "plot_claim";

  return (
    <div
      style={{
        maxWidth: 1100,
        margin: "0 auto",
        padding: "32px 16px 64px",
        fontFamily: "-apple-system, 'Segoe UI', Roboto, sans-serif",
      }}
    >
      <div style={{ marginBottom: 18 }}>
        <h1
          style={{
            fontFamily: "Georgia, serif",
            fontSize: 28,
            fontWeight: 400,
            color: GOLD,
            margin: 0,
            letterSpacing: "0.02em",
          }}
        >
          Admin Queue
        </h1>
        <div
          style={{
            fontSize: 11,
            color: TEXT_FADE,
            letterSpacing: "0.18em",
            textTransform: "uppercase",
            marginTop: 4,
          }}
        >
          Cohort Pilot — registration applications
        </div>
      </div>

      <CapCounter refreshKey={refreshKey} />

      <div style={{ marginTop: 18 }}>
        <Tabs tabs={tabs} active={tab} onChange={setTab} />
      </div>

      {/* Filter row */}
      <div
        style={{
          display: "flex",
          gap: 10,
          flexWrap: "wrap",
          marginTop: 14,
          marginBottom: 14,
          alignItems: "center",
        }}
      >
        <input
          type="search"
          placeholder="Search nickname or email"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          style={{ ...inputStyle, maxWidth: 280 }}
        />
        <select
          value={roleFilter}
          onChange={(e) => setRoleFilter(e.target.value)}
          style={{ ...inputStyle, maxWidth: 220 }}
        >
          <option value="">All roles</option>
          {COHORT_APPLICANT_ROLES.map((r) => (
            <option key={r} value={r}>
              {ROLE_LABELS[r].split(" — ")[0]}
            </option>
          ))}
        </select>
        <button
          type="button"
          onClick={() => setRefreshKey((k) => k + 1)}
          style={{ ...ghostBtn, padding: "9px 14px" }}
        >
          ↻ Refresh
        </button>
        {data && (
          <span style={{ fontSize: 11, color: TEXT_DIM, marginLeft: "auto" }}>
            {data.total} total · showing {data.items.length}
          </span>
        )}
      </div>

      {isVerificationTab ? (
        <div
          style={{
            padding: "32px 16px",
            background: "rgba(255,255,255,0.03)",
            border: "1px dashed rgba(255,255,255,0.12)",
            borderRadius: 12,
            textAlign: "center",
            color: TEXT_DIM,
            fontSize: 13,
            lineHeight: 1.6,
          }}
        >
          {tab === "title_deed" ? "Title Deed verification" : "Plot Claim verification"}{" "}
          tab will be wired up in Step 10. Spec §7.5 + §10.
        </div>
      ) : (
        <>
          {error && (
            <div
              style={{
                padding: "12px 14px",
                background: "rgba(230,57,70,0.08)",
                border: "1px solid rgba(230,57,70,0.3)",
                borderRadius: 8,
                fontSize: 12,
                color: "#ff8a92",
                marginBottom: 12,
              }}
            >
              {error}
            </div>
          )}
          <ApplicationList
            items={data?.items ?? []}
            loading={loading}
            onOpen={setOpenId}
          />
        </>
      )}

      {openId && (
        <ApplicationDetail
          applicationId={openId}
          onClose={() => setOpenId(null)}
          onChanged={() => setRefreshKey((k) => k + 1)}
        />
      )}
    </div>
  );
}
