"use client";

// /admin/dda-refresh — Admin tool to bulk-refresh public ZAAHI
// listings (LISTED / VERIFIED / IN_DEAL) from DDA BASIC_LAND_BASE.
//
// AdminLayout (src/app/admin/layout.tsx) gates entry — this page
// assumes the caller is admin once it renders.
//
// Wire-up over scripts/refresh-all-dda.ts. Live NDJSON stream from
// POST /api/admin/dda-refresh-listings drives the per-plot progress
// counter without polling. Closing the tab cancels the batch — each
// per-plot commit is independent so partial progress persists.

import { useCallback, useEffect, useState } from "react";
import { apiFetch } from "@/lib/api-fetch";
import {
  GOLD,
  TEXT,
  TEXT_DIM,
  TEXT_FADE,
  AMBER,
  GREEN,
  RED,
  card,
} from "../queue/styles";

interface Stats {
  totalPublic: number;
  fresh: number;
  stale: number;
  noPlan: number;
  staleDaysCutoff: number;
}

interface ProgressState {
  i: number;
  n: number;
  ok: number;
  failed: number;
  currentPlot: string | null;
}

interface RunResult {
  candidates: number;
  total: number;
  skippedFresh: number;
  ok: number;
  failed: number;
  failures: Array<{ plotNumber: string; reason: string }>;
  startedAt: string;
  finishedAt: string;
  elapsedMs: number;
}

export default function AdminDdaRefreshPage() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [statsErr, setStatsErr] = useState<string | null>(null);
  const [running, setRunning] = useState(false);
  const [progress, setProgress] = useState<ProgressState | null>(null);
  const [runErr, setRunErr] = useState<string | null>(null);
  const [result, setResult] = useState<RunResult | null>(null);

  const loadStats = useCallback(async () => {
    try {
      const r = await apiFetch("/api/admin/dda-refresh-listings/stats");
      if (!r.ok) {
        setStatsErr(`HTTP ${r.status}`);
        return;
      }
      setStats((await r.json()) as Stats);
      setStatsErr(null);
    } catch (e) {
      setStatsErr(e instanceof Error ? e.message : "unknown");
    }
  }, []);

  useEffect(() => {
    void loadStats();
  }, [loadStats]);

  async function runRefresh() {
    if (running) return;
    const willProcess = (stats?.stale ?? 0) + (stats?.noPlan ?? 0);
    if (willProcess === 0) return;
    const estMin = Math.max(1, Math.ceil((willProcess * 5) / 60));
    if (
      !window.confirm(
        `Refresh DDA for ${willProcess} listing(s)? Estimated ~${estMin} min. Keep this tab open.`,
      )
    ) {
      return;
    }

    setRunning(true);
    setRunErr(null);
    setResult(null);
    setProgress({ i: 0, n: 0, ok: 0, failed: 0, currentPlot: null });

    const startedAt = Date.now();
    let total = 0;
    let candidates = 0;
    let skippedFresh = 0;
    let ok = 0;
    let failed = 0;
    let failures: Array<{ plotNumber: string; reason: string }> = [];

    try {
      const r = await apiFetch("/api/admin/dda-refresh-listings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      });
      if (!r.ok || !r.body) {
        setRunErr(`HTTP ${r.status}`);
        return;
      }

      const reader = r.body.getReader();
      const decoder = new TextDecoder();
      let buf = "";
      // NDJSON: one JSON object per line. Buffer across chunk boundaries.
      while (true) {
        const { value, done } = await reader.read();
        if (done) break;
        buf += decoder.decode(value, { stream: true });
        const lines = buf.split("\n");
        buf = lines.pop() ?? "";
        for (const line of lines) {
          const trimmed = line.trim();
          if (!trimmed) continue;
          let msg: Record<string, unknown>;
          try {
            msg = JSON.parse(trimmed) as Record<string, unknown>;
          } catch {
            continue;
          }
          if (msg.kind === "start") {
            total = Number(msg.total ?? 0);
            candidates = Number(msg.candidates ?? 0);
            skippedFresh = Number(msg.skippedFresh ?? 0);
            setProgress({ i: 0, n: total, ok: 0, failed: 0, currentPlot: null });
          } else if (msg.kind === "progress") {
            ok = Number(msg.ok ?? ok);
            failed = Number(msg.failed ?? failed);
            setProgress({
              i: Number(msg.i ?? 0),
              n: Number(msg.n ?? total),
              ok,
              failed,
              currentPlot: typeof msg.plotNumber === "string" ? msg.plotNumber : null,
            });
          } else if (msg.kind === "done") {
            ok = Number(msg.ok ?? ok);
            failed = Number(msg.failed ?? failed);
            failures = Array.isArray(msg.failures)
              ? (msg.failures as Array<{ plotNumber: string; reason: string }>)
              : [];
          }
        }
      }

      setResult({
        candidates,
        total,
        skippedFresh,
        ok,
        failed,
        failures,
        startedAt: new Date(startedAt).toISOString(),
        finishedAt: new Date().toISOString(),
        elapsedMs: Date.now() - startedAt,
      });
      void loadStats();
    } catch (e) {
      setRunErr(e instanceof Error ? e.message : "unknown");
    } finally {
      setRunning(false);
    }
  }

  const percent =
    progress && progress.n > 0 ? Math.round((progress.i / progress.n) * 100) : 0;
  const willProcess = (stats?.stale ?? 0) + (stats?.noPlan ?? 0);

  return (
    <div style={{ padding: 24, maxWidth: 900, margin: "0 auto" }}>
      <h1
        style={{
          fontFamily: "Georgia, serif",
          fontSize: 28,
          marginBottom: 8,
          letterSpacing: "-0.02em",
        }}
      >
        Refresh DDA
      </h1>
      <p style={{ color: TEXT_DIM, marginBottom: 24, fontSize: 13, lineHeight: 1.5 }}>
        Re-pull polygon + latest AffectionPlan from DDA BASIC_LAND_BASE for every
        public ZAAHI listing (LISTED · VERIFIED · IN_DEAL). Append-only on
        AffectionPlan; never touches price, status, owner, or claims. Re-running
        is idempotent — already-fresh rows are skipped via the 30-day staleness
        window.
      </p>

      <div style={{ ...card, padding: 18, marginBottom: 16 }}>
        <SectionLabel>Catalogue</SectionLabel>
        {statsErr && <div style={{ color: AMBER, fontSize: 12 }}>Stats failed: {statsErr}</div>}
        {stats && (
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))",
              gap: 12,
              marginTop: 8,
            }}
          >
            <StatBox label="Public listings" value={stats.totalPublic} />
            <StatBox label={`Fresh (≤${stats.staleDaysCutoff}d)`} value={stats.fresh} color={GREEN} />
            <StatBox label={`Stale (>${stats.staleDaysCutoff}d)`} value={stats.stale} color={AMBER} />
            <StatBox label="No plan ever" value={stats.noPlan} color={TEXT_FADE} />
          </div>
        )}
      </div>

      <div style={{ ...card, padding: 18, marginBottom: 16 }}>
        <SectionLabel>Action</SectionLabel>
        <div style={{ display: "flex", alignItems: "center", gap: 14, marginTop: 8 }}>
          <button
            onClick={runRefresh}
            disabled={running || !stats || willProcess === 0}
            style={{
              padding: "10px 20px",
              background: running ? "rgba(255,255,255,0.06)" : "rgba(200, 169, 110, 0.25)",
              border: `1px solid ${GOLD}`,
              color: GOLD,
              borderRadius: 8,
              fontSize: 12,
              fontWeight: 700,
              cursor: running || willProcess === 0 ? "not-allowed" : "pointer",
              opacity: running || willProcess === 0 ? 0.6 : 1,
              fontFamily: "inherit",
              letterSpacing: "0.06em",
              textTransform: "uppercase",
              transition: "background 150ms ease, opacity 150ms ease",
            }}
          >
            {running ? "Running…" : `▸ Refresh ${willProcess} listing${willProcess === 1 ? "" : "s"}`}
          </button>
          {!running && willProcess === 0 && stats && (
            <span style={{ color: TEXT_FADE, fontSize: 12 }}>
              Everything is fresh — nothing to do.
            </span>
          )}
        </div>

        {progress && (
          <div style={{ marginTop: 14 }}>
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                fontSize: 11,
                color: TEXT_DIM,
                marginBottom: 6,
              }}
            >
              <span>
                {progress.i} / {progress.n} processed
              </span>
              <span>
                <span style={{ color: GREEN }}>{progress.ok} ok</span>
                {progress.failed > 0 && (
                  <>
                    {" · "}
                    <span style={{ color: RED }}>{progress.failed} failed</span>
                  </>
                )}
              </span>
            </div>
            <div
              style={{
                height: 6,
                background: "rgba(255,255,255,0.06)",
                borderRadius: 3,
                overflow: "hidden",
              }}
            >
              <div
                style={{
                  width: `${percent}%`,
                  height: "100%",
                  background: GOLD,
                  transition: "width 200ms ease",
                }}
              />
            </div>
            {running && progress.currentPlot && (
              <div style={{ marginTop: 6, color: TEXT_FADE, fontSize: 11 }}>
                Last: <span style={{ color: GOLD, fontFamily: "monospace" }}>{progress.currentPlot}</span>
              </div>
            )}
            {running && (
              <div style={{ marginTop: 6, color: TEXT_FADE, fontSize: 11 }}>
                Keep this tab open. Closing cancels the batch (already-committed plots persist).
              </div>
            )}
          </div>
        )}

        {runErr && (
          <div style={{ marginTop: 8, color: RED, fontSize: 12 }}>
            Run failed: {runErr}
          </div>
        )}
      </div>

      {result && (
        <div style={{ ...card, padding: 18 }}>
          <SectionLabel>Last run summary</SectionLabel>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(120px, 1fr))",
              gap: 10,
              marginTop: 8,
            }}
          >
            <StatBox label="Candidates" value={result.candidates} />
            <StatBox label="Skipped fresh" value={result.skippedFresh} />
            <StatBox label="Processed" value={result.total} />
            <StatBox label="OK" value={result.ok} color={GREEN} />
            <StatBox label="Failed" value={result.failed} color={result.failed > 0 ? RED : TEXT_FADE} />
            <StatBox
              label="Elapsed"
              value={`${Math.floor(result.elapsedMs / 60_000)}m ${Math.floor((result.elapsedMs % 60_000) / 1000)}s`}
            />
          </div>
          {result.failures.length > 0 && (
            <div style={{ marginTop: 14 }}>
              <div
                style={{
                  color: TEXT_DIM,
                  fontSize: 11,
                  textTransform: "uppercase",
                  letterSpacing: "0.06em",
                  marginBottom: 6,
                }}
              >
                Failures ({result.failures.length} shown)
              </div>
              <table style={{ width: "100%", fontSize: 12, borderCollapse: "collapse" }}>
                <tbody>
                  {result.failures.map((f) => (
                    <tr key={f.plotNumber} style={{ borderTop: "1px solid rgba(255,255,255,0.1)" }}>
                      <td style={{ padding: "6px 8px", color: GOLD, fontWeight: 700, fontFamily: "monospace" }}>
                        {f.plotNumber}
                      </td>
                      <td style={{ padding: "6px 8px", color: TEXT_DIM }}>{f.reason}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <div
      style={{
        color: TEXT_DIM,
        fontSize: 10,
        textTransform: "uppercase",
        letterSpacing: "0.1em",
        fontWeight: 600,
      }}
    >
      {children}
    </div>
  );
}

function StatBox({
  label,
  value,
  color = TEXT,
}: {
  label: string;
  value: number | string;
  color?: string;
}) {
  return (
    <div>
      <div
        style={{
          color: TEXT_FADE,
          fontSize: 10,
          textTransform: "uppercase",
          letterSpacing: "0.08em",
        }}
      >
        {label}
      </div>
      <div style={{ color, fontSize: 22, fontWeight: 800, marginTop: 4, letterSpacing: "-0.02em" }}>
        {value}
      </div>
    </div>
  );
}
