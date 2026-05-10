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
import { TitleDeedList } from "./TitleDeedList";
import { TitleDeedDetail } from "./TitleDeedDetail";
import { PlotClaimList } from "./PlotClaimList";
import { PlotClaimDetail } from "./PlotClaimDetail";
import {
  GOLD,
  TEXT,
  TEXT_DIM,
  TEXT_FADE,
  inputStyle,
  ghostBtn,
} from "./styles";
import { ROLE_LABELS, COHORT_APPLICANT_ROLES } from "@/lib/registration-validation";
import type {
  ListResponse,
  TitleDeedListResponse,
  PlotClaimListResponse,
} from "./types";

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
  const [titleDeedData, setTitleDeedData] = useState<TitleDeedListResponse | null>(null);
  const [plotClaimData, setPlotClaimData] = useState<PlotClaimListResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [openId, setOpenId] = useState<string | null>(null);
  const [openParcelId, setOpenParcelId] = useState<string | null>(null);
  const [openClaimId, setOpenClaimId] = useState<string | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);
  const [error, setError] = useState<string | null>(null);

  // Tab pills now include live counts for the verification queues —
  // fetched whenever the page refreshes so admins see "(3)" after a
  // new claim arrives or "—" once the queue is clear.
  const tabs = useMemo(() => {
    const verificationCounts: Partial<Record<TabKey, number>> = {
      title_deed: titleDeedData?.total,
      plot_claim: plotClaimData?.total,
    };
    return [
      ...TABS.map((t) => ({ ...t })),
      ...VERIFICATION_TABS.map((t) => ({
        ...t,
        count: verificationCounts[t.key],
      })),
    ];
  }, [titleDeedData, plotClaimData]);

  // Fetch list whenever inputs change
  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      setError(null);
      try {
        if (tab === "title_deed") {
          const params = new URLSearchParams();
          if (q.trim()) params.set("q", q.trim());
          params.set("limit", "50");
          const res = await apiFetch(`/api/admin/title-deeds?${params.toString()}`);
          if (!res.ok) {
            setError(`Failed to load (${res.status})`);
            setTitleDeedData(null);
            setLoading(false);
            return;
          }
          const json = (await res.json()) as TitleDeedListResponse;
          if (!cancelled) {
            setTitleDeedData(json);
            setLoading(false);
          }
          return;
        }
        if (tab === "plot_claim") {
          const params = new URLSearchParams();
          if (q.trim()) params.set("q", q.trim());
          if (roleFilter) params.set("role", roleFilter);
          params.set("limit", "50");
          const res = await apiFetch(`/api/admin/plot-claims?${params.toString()}`);
          if (!res.ok) {
            setError(`Failed to load (${res.status})`);
            setPlotClaimData(null);
            setLoading(false);
            return;
          }
          const json = (await res.json()) as PlotClaimListResponse;
          if (!cancelled) {
            setPlotClaimData(json);
            setLoading(false);
          }
          return;
        }
        // Registration tabs (existing flow)
        const params = new URLSearchParams();
        const status = TAB_TO_STATUS[tab];
        if (status) params.set("status", status);
        if (roleFilter) params.set("role", roleFilter);
        if (q.trim()) params.set("q", q.trim());
        params.set("limit", "50");
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

  // Background pull of verification counts so the tab pills stay
  // accurate while the admin is on a registration tab.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const [tdRes, pcRes] = await Promise.all([
          apiFetch("/api/admin/title-deeds?limit=1"),
          apiFetch("/api/admin/plot-claims?limit=1"),
        ]);
        if (tdRes.ok) {
          const j = (await tdRes.json()) as TitleDeedListResponse;
          if (!cancelled) setTitleDeedData((prev) => (prev ? { ...prev, total: j.total } : j));
        }
        if (pcRes.ok) {
          const j = (await pcRes.json()) as PlotClaimListResponse;
          if (!cancelled) setPlotClaimData((prev) => (prev ? { ...prev, total: j.total } : j));
        }
      } catch {
        /* tab pill counts are non-critical */
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [refreshKey]);

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
        {tab !== "title_deed" && (
          <select
            value={roleFilter}
            onChange={(e) => setRoleFilter(e.target.value)}
            style={{ ...inputStyle, maxWidth: 220 }}
          >
            <option value="">All roles</option>
            {(tab === "plot_claim"
              ? (["BROKER", "DEVELOPER", "ARCHITECT", "POA"] as const)
              : COHORT_APPLICANT_ROLES
            ).map((r) => (
              <option key={r} value={r}>
                {tab === "plot_claim" ? r : ROLE_LABELS[r as keyof typeof ROLE_LABELS].split(" — ")[0]}
              </option>
            ))}
          </select>
        )}
        <button
          type="button"
          onClick={() => setRefreshKey((k) => k + 1)}
          style={{ ...ghostBtn, padding: "9px 14px" }}
        >
          ↻ Refresh
        </button>
        {(() => {
          const stats =
            tab === "title_deed"
              ? titleDeedData
                ? { total: titleDeedData.total, shown: titleDeedData.items.length }
                : null
              : tab === "plot_claim"
                ? plotClaimData
                  ? { total: plotClaimData.total, shown: plotClaimData.items.length }
                  : null
                : data
                  ? { total: data.total, shown: data.items.length }
                  : null;
          return stats ? (
            <span style={{ fontSize: 11, color: TEXT_DIM, marginLeft: "auto" }}>
              {stats.total} total · showing {stats.shown}
            </span>
          ) : null;
        })()}
      </div>

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
      {tab === "title_deed" ? (
        <TitleDeedList
          items={titleDeedData?.items ?? []}
          loading={loading}
          onOpen={setOpenParcelId}
        />
      ) : tab === "plot_claim" ? (
        <PlotClaimList
          items={plotClaimData?.items ?? []}
          loading={loading}
          onOpen={setOpenClaimId}
        />
      ) : (
        <ApplicationList
          items={data?.items ?? []}
          loading={loading}
          onOpen={setOpenId}
        />
      )}

      {openId && (
        <ApplicationDetail
          applicationId={openId}
          onClose={() => setOpenId(null)}
          onChanged={() => setRefreshKey((k) => k + 1)}
        />
      )}
      {openParcelId && (
        <TitleDeedDetail
          parcelId={openParcelId}
          onClose={() => setOpenParcelId(null)}
          onChanged={() => setRefreshKey((k) => k + 1)}
        />
      )}
      {openClaimId && (
        <PlotClaimDetail
          claimId={openClaimId}
          onClose={() => setOpenClaimId(null)}
          onChanged={() => setRefreshKey((k) => k + 1)}
        />
      )}
    </div>
  );
}
