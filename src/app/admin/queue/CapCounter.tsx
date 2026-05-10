"use client";

// Per-role cap counter strip. Spec §7.3 colours.
// Mobile: horizontal scroll. Desktop: wraps.

import { useEffect, useState } from "react";
import { apiFetch } from "@/lib/api-fetch";
import { ROLE_LABELS, type CohortApplicantRole } from "@/lib/registration-validation";
import { capCounterColor, GOLD, TEXT_DIM } from "./styles";
import type { CapCountsResponse } from "./types";

export function CapCounter({ refreshKey = 0 }: { refreshKey?: number }) {
  const [data, setData] = useState<CapCountsResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await apiFetch("/api/admin/registration/cap-counts");
        if (!res.ok) {
          setError(`Cap counts unavailable (${res.status})`);
          return;
        }
        const json = (await res.json()) as CapCountsResponse;
        if (!cancelled) setData(json);
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : "Network error");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [refreshKey]);

  if (error) {
    return (
      <div style={{ fontSize: 11, color: TEXT_DIM, padding: "8px 0" }}>
        {error}
      </div>
    );
  }

  if (!data) {
    return (
      <div style={{ fontSize: 11, color: TEXT_DIM, padding: "8px 0" }}>
        Loading cap counts…
      </div>
    );
  }

  const roles = Object.keys(data.counts) as CohortApplicantRole[];

  return (
    <div
      style={{
        display: "flex",
        flexWrap: "wrap",
        gap: 6,
        overflowX: "auto",
        paddingBottom: 4,
      }}
    >
      {roles.map((r) => {
        const count = data.counts[r] ?? 0;
        const c = capCounterColor(count, data.capPerRole);
        const shortLabel = ROLE_LABELS[r].split(" — ")[0];
        return (
          <div
            key={r}
            title={`${ROLE_LABELS[r]} — ${count} approved out of ${data.capPerRole}`}
            style={{
              padding: "6px 10px",
              background: c.bg,
              border: `1px solid ${c.fg}33`,
              borderRadius: 6,
              fontSize: 11,
              letterSpacing: "0.04em",
              color: c.fg,
              fontWeight: 600,
              fontFamily: "Georgia, serif",
              whiteSpace: "nowrap",
              display: "inline-flex",
              alignItems: "center",
              gap: 4,
            }}
          >
            {c.warn && <span aria-hidden>⚠</span>}
            <span style={{ color: GOLD }}>{shortLabel}</span>
            <span style={{ opacity: 0.85 }}>{count}/{data.capPerRole}</span>
          </div>
        );
      })}
    </div>
  );
}
