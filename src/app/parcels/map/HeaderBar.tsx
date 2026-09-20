"use client";
import { GOLD } from "@/lib/design-tokens";
import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { sound } from "@/lib/sound";
import { SignOutButton } from "@/components/SignOutButton";
import { apiFetch } from "@/lib/api-fetch";
import { ChromeBtn } from "@/components/ChromeBtn";
import { PANEL_BLUR, PANEL_BORDER_COLOR, CHROME_BTN_BG, CHROME_BTN_SIZE_COMPACT } from "@/lib/design-tokens";
import { ChromeTheme } from "./map-styles";

// Inline ChromeBtn function moved out (Phase 1 style unification,
// 2026-05-31) — now imported from "@/components/ChromeBtn" at the
// top of this file. Single source of truth for the glass button
// chrome across page.tsx, modals, and any future surface.
export function HeaderBar({
  c,
  isDark,
  onFly,
  onFindInTiles,
  onSelectParcel,
  onOpenAddModal,
  vaultOnlyMode,
  onToggleVaultOnly,
  filterPanelOpen,
  activeFilterCount,
  onToggleFilterPanel,
}: {
  c: ChromeTheme;
  isDark: boolean;
  onFly: (lng: number, lat: number) => void;
  /** Backlog #13 — viewport search across the PMTiles land layers. */
  onFindInTiles: (plotNumber: string) => { lng: number; lat: number } | null;
  onSelectParcel: (id: string) => void;
  onOpenAddModal: () => void;
  vaultOnlyMode: boolean;
  onToggleVaultOnly: () => void;
  filterPanelOpen: boolean;
  activeFilterCount: number;
  onToggleFilterPanel: () => void;
}) {
  const [find, setFind] = useState("");
  const [findOpen, setFindOpen] = useState(false);
  const [findError, setFindError] = useState<string | null>(null);
  const [findBusy, setFindBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  // Music / SFX master switch — local subscription so the button icon
  // updates when the user toggles. The sound module is a singleton.
  const [soundOn, setSoundOn] = useState(false);
  useEffect(() => {
    sound.init();
    return sound.subscribe(setSoundOn);
  }, []);

  // Admin detection — probes /api/admin/me on mount. If ok, shows the
  // admin link in the header. Non-admins never see the link. Handled
  // here rather than in a context so it stays a single-component concern.
  const [isAdmin, setIsAdmin] = useState(false);
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await apiFetch("/api/admin/me");
        if (!cancelled && res.ok) setIsAdmin(true);
      } catch {
        /* non-admin; silently ignore */
      }
    })();
    return () => { cancelled = true; };
  }, []);

  async function doFind() {
    const plotNumber = find.trim();
    if (!plotNumber) return;
    // Primary CTA (founder backlog #33).
    sound.uiClick();
    setFindError(null);
    setFindBusy(true);
    try {
      const r = await apiFetch("/api/parcels/map");
      // r.ok was previously unchecked: a 401/500 fell through to r.json(),
      // `data.items` came back undefined and `.find` threw a TypeError that
      // surfaced as the generic "Network error" — indistinguishable from a
      // genuine miss.
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      const data = (await r.json()) as {
        items?: Array<{ id: string; plotNumber: string; geometry: GeoJSON.Polygon | null }>;
      };
      const items = data.items ?? [];
      // Normalised compare — the field is free text and a stray space or a
      // pasted number would miss under strict ===.
      const needle = plotNumber.toLowerCase();
      const hit = items.find((it) => (it.plotNumber ?? "").trim().toLowerCase() === needle);
      if (!hit) {
        // Not one of ours — try the PMTiles land layers before declaring a
        // miss (backlog #13). A hit there flies the camera but opens no
        // panel: those parcels have no database row, so there is nothing to
        // show. Saying "not found" for a plot visibly on screen was the bug.
        const tileHit = onFindInTiles(plotNumber);
        if (tileHit) {
          onFly(tileHit.lng, tileHit.lat);
          setFind("");
          setFindOpen(false);
        } else {
          setFindError(
            `No plot found for “${plotNumber}” — registry plots are searched only ` +
              `within the loaded map area, so pan or zoom to it and try again`,
          );
        }
      } else if (!hit.geometry) {
        // Distinct from "not found": the plot exists but has no polygon, so
        // there is nothing to fly to. Previously both produced the same
        // "Plot not found".
        setFindError(`Plot ${plotNumber} has no mapped boundary`);
      } else {
        const ring = hit.geometry.coordinates[0];
        const lng = ring.reduce((s, p) => s + p[0], 0) / ring.length;
        const lat = ring.reduce((s, p) => s + p[1], 0) / ring.length;
        onFly(lng, lat);
        // Wait for the 2s flyTo animation to land before popping the side panel.
        setTimeout(() => onSelectParcel(hit.id), 2000);
        setFind("");
        setFindOpen(false);
      }
    } catch {
      setFindError("Network error");
    } finally {
      setFindBusy(false);
    }
  }

  return (
    <header
      style={{
        position: "absolute",
        top: 0,
        left: 0,
        right: 0,
        height: 44,
        background: "transparent",
        borderBottom: "none",
        display: "flex",
        alignItems: "center",
        padding: "0 12px",
        zIndex: 10,
        boxShadow: "0 8px 20px rgba(0, 0, 0, 0.3), inset 0 1px 0 rgba(255, 255, 255, 0.08)",
        gap: 10,
        // Mobile fallback: horizontal scroll instead of squishing the
        // search inputs together. Touch users can swipe to reach the
        // remaining controls. A proper mobile redesign (collapse into a
        // hamburger) is still TODO.
        overflowX: "auto",
        whiteSpace: "nowrap",
        // Constrain mobile touch to horizontal panning only — vertical
        // swipes inside this 44px bar previously got hijacked by the
        // browser (body bounce / pull-to-refresh) and competed with map
        // gestures. Desktop mouse unaffected.
        touchAction: "pan-x",
      }}
    >
      <div style={{ display: "flex", alignItems: "baseline", gap: 8 }}>
        <div
          style={{
            fontFamily: 'Georgia, "Times New Roman", serif',
            fontSize: 18,
            fontWeight: 700,
            letterSpacing: "0.22em",
            color: GOLD,
            textShadow: "0 1px 4px rgba(0,0,0,0.4)",
          }}
        >
          ZAAHI
        </div>
        <div
          style={{
            fontSize: 8,
            color: "rgba(255,255,255,0.6)",
            letterSpacing: "0.18em",
            textTransform: "uppercase",
            textShadow: "0 1px 3px rgba(0,0,0,0.4)",
          }}
        >
          Real Estate OS
        </div>
      </div>

      {msg && (
        <div
          style={{
            fontSize: 11,
            color: msg.startsWith("✕") ? "#EF4444" : GOLD,
            marginLeft: 8,
          }}
        >
          {msg}
        </div>
      )}

      <div style={{ marginLeft: "auto", display: "flex", gap: 8, alignItems: "center" }}>
        {/* Phase 1 unification (2026-05-31): all HeaderBar buttons
            migrated from the inline `hdrBtnStyle` legacy chrome (28×28,
            navy 0.5, always-gold border) to the shared ChromeBtn size
            COMPACT (28×28, CHROME_BTN_BG, neutral border, gold only on
            hover/active). Toggle/permanent-gold affordances use the
            `active` prop. */}
        <ChromeBtn
          title="Add Plot"
          onClick={onOpenAddModal}
          size={CHROME_BTN_SIZE_COMPACT}
        >
          <span style={{ fontSize: 15, color: GOLD, fontWeight: 700 }}>+</span>
        </ChromeBtn>
        <FindLauncher
          c={c}
          open={findOpen}
          setOpen={(v) => { setFindOpen(v); if (!v) { setFindError(null); setFind(""); } }}
          value={find}
          setValue={(v) => { setFind(v); if (findError) setFindError(null); }}
          onSubmit={doFind}
          busy={findBusy}
          error={findError}
        />
        {/* Filters — moved from the left vertical rail to the header
            (founder spec 2026-06-03). Sits next to Find because they
            share intent: Find narrows visibility to a single plot,
            Filter narrows it to a set. Same toggle / active-state
            behaviour as before; badge counter shows active filter
            dimensions. */}
        <span style={{ position: "relative", display: "inline-block" }}>
          <ChromeBtn
            title={
              filterPanelOpen
                ? "Close filters"
                : activeFilterCount > 0
                  ? `Filters · ${activeFilterCount} active`
                  : "Filters"
            }
            ariaLabel="Toggle filter panel"
            active={filterPanelOpen}
            onClick={onToggleFilterPanel}
            size={CHROME_BTN_SIZE_COMPACT}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
              <polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3" />
            </svg>
          </ChromeBtn>
          {activeFilterCount > 0 && (
            <span
              style={{
                position: "absolute",
                top: -4,
                right: -4,
                minWidth: 16,
                height: 16,
                padding: "0 4px",
                background: GOLD,
                color: "#1A1A2E",
                borderRadius: 8,
                fontSize: 10,
                fontWeight: 700,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontVariantNumeric: "tabular-nums",
                pointerEvents: "none",
                lineHeight: 1,
                boxShadow: "0 1px 3px rgba(0, 0, 0, 0.4)",
              }}
              aria-label={`${activeFilterCount} filters active`}
            >
              {activeFilterCount}
            </span>
          )}
        </span>
        {/* Check DLD — links to the dedicated /parcels/check-plot page
            where the user enters the 3+4-digit split and lands on DLD's
            inquiry form with the number copied. Stays as Next <Link>
            (client-side nav) — it's a pill-shaped 28h text affordance
            with the ✓ glyph rather than a square ChromeBtn footprint.
            Phase 1: styled with the same tokens as ChromeBtn (
            CHROME_BTN_BG, PANEL_BORDER_COLOR, GOLD hover) so it
            reads as part of the same family. */}
        <Link
          href="/parcels/check-plot"
          title="Check Plot Status on DLD"
          aria-label="Check Plot Status on DLD"
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 6,
            height: 28,
            padding: "0 12px",
            borderRadius: 8,
            border: `1px solid ${PANEL_BORDER_COLOR}`,
            background: CHROME_BTN_BG,
            backdropFilter: PANEL_BLUR,
            WebkitBackdropFilter: PANEL_BLUR,
            color: GOLD,
            fontSize: 15,
            fontWeight: 700,
            letterSpacing: 0,
            textDecoration: "none",
            fontFamily: "inherit",
            transition: "border-color 150ms ease, background 150ms ease",
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.borderColor = GOLD;
            e.currentTarget.style.background = "rgba(200, 169, 110, 0.25)";
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.borderColor = PANEL_BORDER_COLOR;
            e.currentTarget.style.background = CHROME_BTN_BG;
          }}
        >
          ✓
        </Link>
        <ChromeBtn
          title={soundOn ? "Mute" : "Unmute"}
          ariaLabel={soundOn ? "Mute" : "Unmute"}
          onClick={() => sound.toggle()}
          size={CHROME_BTN_SIZE_COMPACT}
        >
          <span style={{ fontSize: 13 }}>{soundOn ? "🎵" : "🔇"}</span>
        </ChromeBtn>
        {isAdmin && (
          // Step 12 audit B-3: Step 2 deleted /admin/ambassadors;
          // /admin/queue (Step 7) is the cohort-pilot admin destination.
          // Phase 1: always-`active` so the chrome stays gold even
          // without hover (preserves the prior "admin = always lit"
          // affordance).
          <ChromeBtn
            as="a"
            href="/admin/queue"
            title="Admin — Cohort queue"
            ariaLabel="Admin"
            size={CHROME_BTN_SIZE_COMPACT}
            active
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={GOLD} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 2 L4 6 V12 C4 17 7.5 20.5 12 22 C16.5 20.5 20 17 20 12 V6 Z" />
            </svg>
          </ChromeBtn>
        )}
        {/* Vault — flips vault-only mode on the map (founder spec
            2026-05-30). No longer redirects to /vault; that page is
            still reachable from /dashboard. Active state lifts the
            button to the gold tint so it visually matches the
            highlighted vault entries on the map. */}
        <ChromeBtn
          title={vaultOnlyMode ? "Exit vault view" : "Private Plot Vault"}
          ariaLabel="Toggle vault view"
          onClick={onToggleVaultOnly}
          size={CHROME_BTN_SIZE_COMPACT}
          active={vaultOnlyMode}
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={GOLD} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
            <rect x="5" y="11" width="14" height="10" rx="2" />
            <path d="M8 11V7a4 4 0 0 1 8 0v4" />
          </svg>
        </ChromeBtn>
        <ChromeBtn
          as="a"
          href="/dashboard"
          title="Profile"
          size={CHROME_BTN_SIZE_COMPACT}
        >
          <span style={{ fontSize: 13 }}>👤</span>
        </ChromeBtn>
        {/* Step 12 — quick-access global sign-out next to Profile.
            Same component as Dashboard Settings so the confirm dialog
            and signOut({ scope: 'global' }) logic live in one place. */}
        <SignOutButton variant="compact" />
      </div>
    </header>
  );
}

// hdrBtnStyle removed (Phase 1 style unification, 2026-05-31) — all
// callsites migrated to <ChromeBtn size={CHROME_BTN_SIZE_COMPACT}>.

// ── Add Plot modal ─────────────────────────────────────────────────
// AddPlotModal moved to ./AddPlotModal (broker + owner flows).

// Click-to-open Find launcher: starts as a 32×32 icon button, expands into
// an input on click. Enter submits, Escape closes, error shows below.
export function FindLauncher({
  c, open, setOpen, value, setValue, onSubmit, busy, error,
}: {
  c: ChromeTheme;
  open: boolean;
  setOpen: (v: boolean) => void;
  value: string;
  setValue: (v: string) => void;
  onSubmit: () => void;
  busy: boolean;
  error: string | null;
}) {
  const ref = useRef<HTMLInputElement>(null);
  useEffect(() => {
    if (open) ref.current?.focus();
  }, [open]);

  if (!open) {
    return (
      <ChromeBtn
        title="Find Plot"
        ariaLabel="Find plot"
        onClick={() => setOpen(true)}
        size={CHROME_BTN_SIZE_COMPACT}
      >
        <span style={{ fontSize: 12 }}>🔍</span>
      </ChromeBtn>
    );
  }

  return (
    <div style={{ position: "relative" }}>
      <label
        style={{
          display: "flex",
          alignItems: "center",
          height: 28,
          padding: "0 4px 0 8px",
          borderRadius: 6,
          border: `1px solid ${error ? "#EF4444" : GOLD}`,
          background: "rgba(10, 22, 40, 0.5)",
          color: c.text,
          boxShadow: "0 8px 20px rgba(0, 0, 0, 0.3), inset 0 1px 0 rgba(255, 255, 255, 0.08)",
          gap: 4,
        }}
      >
        <span style={{ fontSize: 11 }}>🔍</span>
        <input
          ref={ref}
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              onSubmit();
            } else if (e.key === "Escape") {
              e.preventDefault();
              setOpen(false);
            }
          }}
          placeholder={busy ? "Searching…" : "Plot number..."}
          disabled={busy}
          style={{
            width: 110,
            height: 22,
            padding: "0 4px",
            border: "none",
            background: "transparent",
            color: c.text,
            fontSize: 12,
            outline: "none",
          }}
        />
        <button
          onClick={() => setOpen(false)}
          aria-label="Close"
          style={{
            background: "transparent",
            border: 0,
            color: c.textDim,
            fontSize: 14,
            cursor: "pointer",
            lineHeight: 1,
            padding: "0 2px",
          }}
        >
          ×
        </button>
      </label>
      {error && (
        <div
          style={{
            position: "absolute",
            top: "100%",
            left: 0,
            right: 0,
            marginTop: 4,
            padding: "4px 8px",
            background: "rgba(10, 22, 40, 0.9)",
            border: "1px solid #EF4444",
            borderRadius: 4,
            color: "#EF4444",
            fontSize: 12,
            fontWeight: 600,
            textAlign: "center",
            boxShadow: "0 8px 20px rgba(0, 0, 0, 0.3), inset 0 1px 0 rgba(255, 255, 255, 0.08)",
          }}
        >
          {error}
        </div>
      )}
    </div>
  );
}
