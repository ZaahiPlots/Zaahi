"use client";
import { useState } from "react";
import { NUMBER_SMALL } from "@/lib/design-tokens";
import type { PlotHistory, RegisteredProject } from "./plot-history";

// Same palette / type scale as SidePanel's Section + Row (ui-style-guide.md).
const GOLD = "#C8A96E";
const TXT = "#FFFFFF";
const SUBTLE = "rgba(255, 255, 255, 0.78)";
const LINE = "rgba(255, 255, 255, 0.1)";
const TITLE: React.CSSProperties = {
  color: "rgba(255, 255, 255, 0.6)", fontWeight: 700, fontSize: 11, textTransform: "uppercase", letterSpacing: 1.2,
};

const aed = (fils: number) => Math.round(fils / 100).toLocaleString("en-US");

const STATUS: Record<string, string> = {
  FINISHED: "Finished", ACTIVE: "Active", NOT_STARTED: "Not started", PENDING: "Pending",
  CONDITIONAL_ACTIVATING: "Conditionally active", FRIEZED: "Frozen",
};

function Line({ label, value, derived }: { label: string; value: string | null; derived?: boolean }) {
  if (value == null) return null;
  return (
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", gap: 8, lineHeight: 1.4 }}>
      <span style={{ color: SUBTLE, fontSize: 12 }}>
        {label}
        {derived && <span style={{ color: GOLD, fontSize: 9, marginLeft: 6, letterSpacing: 1, textTransform: "uppercase" }}>derived</span>}
      </span>
      <span style={{ ...NUMBER_SMALL, color: TXT, textAlign: "right" }} dir="auto">{value}</span>
    </div>
  );
}

function ProjectBlock({ p }: { p: RegisteredProject }) {
  const body = (() => {
    if (p.state === "unknown") return <div style={{ color: SUBTLE, fontSize: 12 }}>Registered project: unknown — plot not matched to the land registry.</div>;
    if (p.state === "none") return <div style={{ color: SUBTLE, fontSize: 12 }}>No RERA project registered on this plot.</div>;
    return (
      <>
        <Line label="Name" value={p.title} />
        <Line label="Status" value={STATUS[p.status] ?? p.status} />
        <Line label="Completed" value={p.pct != null ? `${p.pct}%` : null} />
        <Line label="Cancelled" value={p.cancel} />
        <Line label="Developer" value={p.dev} />
        <Line label="Escrow agent" value={p.escrow} />
        <div style={{ color: SUBTLE, fontSize: 10, marginTop: 4 }}>RERA project register, snapshot {p.asof}</div>
      </>
    );
  })();
  return (
    <div>
      <div style={{ ...TITLE, marginBottom: 4 }}>Registered project</div>
      <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>{body}</div>
    </div>
  );
}

export function TransactionHistory({ h }: { h: PlotHistory }) {
  const [open, setOpen] = useState(true);
  const extras = [h.mortgages ? `${h.mortgages} mortgage${h.mortgages > 1 ? "s" : ""}` : null, h.gifts ? `${h.gifts} gift${h.gifts > 1 ? "s" : ""}` : null].filter(Boolean);
  const last = h.sales[0];
  const gfaPsf = last && h.gfaSqft ? last.p / h.gfaSqft : null;
  return (
    <>
      {h.sales.length > 0 && (
        <div>
          <button
            type="button"
            aria-expanded={open}
            onClick={() => setOpen((v) => !v)}
            style={{ ...TITLE, width: "100%", background: "transparent", border: 0, padding: 0, marginBottom: 4, cursor: "pointer", display: "flex", justifyContent: "space-between", fontFamily: "inherit" }}
          >
            <span>Transaction history · {h.sales.length}</span>
            <span style={{ color: GOLD }}>{open ? "▾" : "▸"}</span>
          </button>
          <div style={{ display: "grid", gridTemplateRows: open ? "1fr" : "0fr", transition: "grid-template-rows 200ms ease-in-out" }}>
            <div style={{ overflow: "hidden", minHeight: 0 }}>
              <div style={{ display: "flex", flexDirection: "column" }}>
                {h.sales.map((s, i) => (
                  <div key={i} style={{ padding: "6px 0", borderTop: i ? `1px solid ${LINE}` : undefined }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", gap: 8 }}>
                      <span style={{ color: SUBTLE, fontSize: 12 }}>{s.d ?? "—"}</span>
                      <span style={{ ...NUMBER_SMALL, color: GOLD }}>
                        <span style={{ opacity: 0.6, fontSize: 11, marginRight: 4 }}>AED</span>{aed(s.p)}
                      </span>
                    </div>
                    <div style={{ display: "flex", justifyContent: "space-between", gap: 8, color: SUBTLE, fontSize: 11 }}>
                      <span>{s.w ?? s.proc ?? "—"}{s.g != null ? ` · +${s.g}%` : ""}</span>
                      {s.psf != null && (
                        <span>
                          AED {aed(s.psf)}/sqft
                          <span style={{ color: GOLD, fontSize: 9, marginLeft: 4, letterSpacing: 1, textTransform: "uppercase" }}>derived</span>
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
              {extras.length > 0 && <div style={{ color: SUBTLE, fontSize: 11, paddingTop: 4 }}>+ {extras.join(", ")} (not counted as sales)</div>}
            </div>
          </div>
        </div>
      )}
      {(h.far != null || h.gfaSqft != null) && (
        <div>
          <div style={{ ...TITLE, marginBottom: 4 }}>Master plan figures</div>
          <Line label="FAR" value={h.far != null ? String(h.far) : null} derived />
          <Line label="GFA" value={h.gfaSqft != null ? `${Math.round(h.gfaSqft).toLocaleString("en-US")} sqft` : null} derived />
          <Line label="Last price per sqft GFA" value={gfaPsf != null ? `AED ${Math.round(gfaPsf / 100).toLocaleString("en-US")}` : null} derived />
          {h.gfaSrc && <div style={{ color: SUBTLE, fontSize: 10 }}>Source: {h.gfaSrc}</div>}
        </div>
      )}
      <ProjectBlock p={h.project} />
      <div style={{ color: SUBTLE, fontSize: 10, lineHeight: 1.4 }}>Source: {h.source}. Founder research — not for redistribution.</div>
    </>
  );
}
