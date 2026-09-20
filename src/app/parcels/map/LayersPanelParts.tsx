"use client";
import { GOLD } from "@/lib/design-tokens";
import { sound } from "@/lib/sound";
import { ChromeTheme } from "./map-styles";

export function LayerToggle({
  label,
  description,
  checked,
  onChange,
  color,
  requiredTier,
  comingSoon,
}: {
  label: string;
  /** Optional one-line description shown as native tooltip on row hover. */
  description?: string;
  checked: boolean;
  onChange: (v: boolean) => void;
  color: string;
  requiredTier?: "GOLD" | "PLATINUM";
  /** Disabled toggle for Phase 2 placeholders — dim opacity, not-allowed
   * cursor, gold "Soon" badge in place of LockBadge. Founder spec
   * 2026-05-23. */
  comingSoon?: boolean;
}) {
  return (
    <label
      title={description}
      style={{
        display: "flex",
        alignItems: "center",
        gap: 8,
        // Founder spec 2026-05-29: compact 4px vertical padding +
        // 12px indent step for the in-group hierarchy + readable
        // body text colour rgba(255,255,255,0.7).
        padding: "4px 14px 4px 36px",
        fontSize: 12,
        cursor: comingSoon ? "not-allowed" : "pointer",
        color: checked ? GOLD : "rgba(255, 255, 255, 0.85)",
        opacity: comingSoon ? 0.4 : 1,
        lineHeight: 1.3,
        borderBottom: "1px solid rgba(255, 255, 255, 0.04)",
        transition: "background 150ms ease, color 150ms ease",
      }}
      onMouseEnter={(e) => {
        if (!comingSoon) e.currentTarget.style.background = "rgba(255, 255, 255, 0.05)";
      }}
      onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; }}
    >
      <input
        type="checkbox"
        checked={comingSoon ? false : checked}
        disabled={comingSoon}
        onChange={(e) => {
          if (comingSoon) return;
          sound.toggleSfx();
          onChange(e.target.checked);
        }}
        style={{
          accentColor: GOLD,
          width: 13,
          height: 13,
          margin: 0,
          cursor: comingSoon ? "not-allowed" : "pointer",
        }}
      />
      <span style={{ flex: 1, minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{label}</span>
      {comingSoon ? <SoonBadge /> : requiredTier && <LockBadge tier={requiredTier} />}
    </label>
  );
}

// Visual-only "Soon" pill for Phase 2 layer placeholders. Same visual
// language as LockBadge (gold border, gold text, serif weight) but with
// a clock icon and "Soon" text instead of the padlock + tier name.
export function SoonBadge() {
  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 3,
        padding: "2px 6px",
        border: `1px solid ${GOLD}`,
        borderRadius: 3,
        fontSize: 11,
        letterSpacing: "0.08em",
        color: GOLD,
        background: "rgba(200, 169, 110, 0.12)",
        fontFamily: 'Georgia, "Times New Roman", serif',
        fontWeight: 700,
        flexShrink: 0,
        textTransform: "uppercase",
      }}
    >
      <svg width="8" height="8" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="9" />
        <path d="M12 7v5l3 2" />
      </svg>
      Soon
    </span>
  );
}

// Visual-only lock badge for Phase 1 — indicates a tier-gated layer.
// Non-interactive (the upgrade flow target was the now-removed /join
// page; cohort-pilot doesn't ship a tier upgrade flow). Toggle still
// works; Phase 3 will disable the checkbox once `useAccess()` lands.
export function LockBadge({ tier }: { tier: "GOLD" | "PLATINUM" }) {
  const accent = tier === "PLATINUM" ? "#B4E5FF" : GOLD;
  const bgTint = tier === "PLATINUM" ? "rgba(180, 229, 255, 0.1)" : "rgba(200, 169, 110, 0.12)";
  return (
    <span
      title={`${tier} tier required`}
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 3,
        padding: "2px 6px",
        border: `1px solid ${accent}`,
        borderRadius: 3,
        fontSize: 11,
        letterSpacing: "0.08em",
        color: accent,
        background: bgTint,
        fontFamily: 'Georgia, "Times New Roman", serif',
        fontWeight: 700,
        flexShrink: 0,
      }}
    >
      <svg width="8" height="8" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
        <rect x="4" y="11" width="16" height="10" rx="2" />
        <path d="M8 11V7a4 4 0 0 1 8 0v4" />
      </svg>
      {tier}
    </span>
  );
}

// ── Searchable, sortable, collapsible layer group with All/None ──
// Used as a category sub-section inside a CountryGroup. Phase 1 adds
// `requiredTier` (lock badge, visual only) + `hideCollapseCaret` (so
// categories inside a country don't render a per-section ▸/▾ caret —
// the country accordion is the primary collapse control).
export function LayerGroup({
  c, title, open, onToggle, search, items, isOn, onChange, hideCollapseCaret, customBadge,
}: {
  c: ChromeTheme;
  title: string;
  open: boolean;
  onToggle: () => void;
  search: string;
  items: Array<{ key: string; label: string; description?: string; requiredTier?: "GOLD" | "PLATINUM"; comingSoon?: boolean }>;
  isOn: (key: string) => boolean;
  onChange: (key: string, v: boolean) => void;
  hideCollapseCaret?: boolean;
  /** Override the default "(onCount/total)" toggle counter. Used by the
   *  "Shared with me" vault category to show a real record-count badge
   *  fetched from /api/vault/shared-with-me instead of toggle state. */
  customBadge?: string;
}) {
  const q = search.trim().toLowerCase();
  const sorted = [...items].sort((a, b) => a.label.localeCompare(b.label));
  const filtered = q ? sorted.filter((i) => i.label.toLowerCase().includes(q)) : sorted;
  // Coming-soon rows don't count toward on/total and the section
  // tri-state "All" toggle must skip them — they aren't real layers.
  const realItems = items.filter((i) => !i.comingSoon);
  const onCount = realItems.filter((i) => isOn(i.key)).length;
  const total = realItems.length;
  // When the user is searching, force-open the group so matches are visible.
  const effectivelyOpen = q ? filtered.length > 0 : open;
  if (q && filtered.length === 0) return null;

  return (
    <div>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "8px 12px 6px 20px",
          background: "rgba(255, 255, 255, 0.02)",
          borderBottom: "1px solid rgba(255, 255, 255, 0.08)",
          fontFamily: 'Georgia, "Times New Roman", serif',
          fontSize: 11,
          letterSpacing: "0.14em",
          textTransform: "uppercase",
          color: "#FFFFFF",
          gap: 4,
        }}
      >
        <button
          onClick={onToggle}
          disabled={!!q}
          style={{
            flex: 1,
            background: "transparent",
            border: 0,
            color: "rgba(255, 255, 255, 0.85)",
            cursor: q ? "default" : "pointer",
            padding: 0,
            textAlign: "left",
            fontFamily: "inherit",
            fontSize: "inherit",
            letterSpacing: "inherit",
            textTransform: "inherit",
            display: "flex",
            alignItems: "center",
            gap: 6,
          }}
        >
          {!hideCollapseCaret && <span>{effectivelyOpen ? "▾" : "▸"}</span>}
          <span>{title}</span>
          <span style={{ color: GOLD, fontFamily: '"SF Mono", Menlo, monospace', letterSpacing: 0 }}>
            {customBadge ?? `(${onCount}/${total})`}
          </span>
        </button>
        <SectionCheckbox
          allOn={onCount === total}
          someOn={onCount > 0 && onCount < total}
          onClick={() => {
            // tri-state semantics:
            //   ✓ all on  → click → turn all off
            //   ☐ all off → click → turn all on (and lazy-load)
            //   ▪ some on → click → turn all on
            const target = !(onCount === total);
            for (const i of filtered) {
              if (i.comingSoon) continue;
              if (isOn(i.key) !== target) onChange(i.key, target);
            }
          }}
        />
      </div>
      {/* Animated collapse — maxHeight transition gives a smooth 200ms
          slide without needing per-item measurement. 2000px ceiling is
          well above any realistic category (DDA districts ≈ 206 rows ×
          24px ≈ 5000px — that one breaks past the cap and snaps, which
          is acceptable for the largest list in the registry). */}
      <div
        style={{
          maxHeight: effectivelyOpen ? 2000 : 0,
          overflow: "hidden",
          transition: "max-height 200ms ease",
        }}
      >
        {filtered.map((i) => (
          <LayerToggle
            key={i.key}
            label={i.label}
            description={i.description}
            checked={isOn(i.key)}
            onChange={(v) => onChange(i.key, v)}
            color="rgba(255, 255, 255, 0.7)"
            requiredTier={i.requiredTier}
            comingSoon={i.comingSoon}
          />
        ))}
      </div>
    </div>
  );
}

// Country-level accordion header — wraps one or more LayerGroup
// sub-sections (Base / DDA / Master Plans / Land Plots / …). Collapsible
// via ▾/▸ caret; force-opens when search is active. Count shown as
// ON/TOTAL across all layers in the country.
export function CountryGroup({
  c: _c, title, open, searchActive, onToggle, onCount, total, children,
}: {
  c: ChromeTheme;
  title: string;
  open: boolean;
  searchActive: boolean;
  onToggle: () => void;
  onCount: number;
  total: number;
  children: React.ReactNode;
}) {
  const anyOn = onCount > 0;
  return (
    <div>
      <button
        onClick={onToggle}
        disabled={searchActive}
        style={{
          width: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 6,
          padding: "11px 14px",
          background: open ? "rgba(200, 169, 110, 0.06)" : "transparent",
          border: 0,
          borderTop: "1px solid rgba(255, 255, 255, 0.08)",
          borderBottom: open ? "1px solid rgba(255, 255, 255, 0.08)" : "none",
          color: anyOn || open ? GOLD : "rgba(255, 255, 255, 0.9)",
          cursor: searchActive ? "default" : "pointer",
          fontFamily: 'Georgia, "Times New Roman", serif',
          fontSize: 11,
          letterSpacing: "0.12em",
          textTransform: "uppercase",
          fontWeight: 700,
          textAlign: "left",
          transition: "background 150ms ease, color 150ms ease",
        }}
        onMouseEnter={(e) => {
          if (searchActive) return;
          e.currentTarget.style.background = "rgba(200, 169, 110, 0.1)";
          e.currentTarget.style.color = GOLD;
        }}
        onMouseLeave={(e) => {
          if (searchActive) return;
          e.currentTarget.style.background = open ? "rgba(200, 169, 110, 0.06)" : "transparent";
          e.currentTarget.style.color = anyOn || open ? GOLD : "rgba(255, 255, 255, 0.9)";
        }}
      >
        <span style={{ display: "inline-flex", alignItems: "center", gap: 8 }}>
          <span style={{ fontSize: 11, color: "rgba(255, 255, 255, 0.65)", width: 8, transition: "transform 200ms ease", transform: open ? "rotate(0deg)" : "rotate(-90deg)", display: "inline-block" }}>▾</span>
          <span>{title}</span>
        </span>
        <span
          style={{
            color: anyOn ? GOLD : "rgba(255, 255, 255, 0.7)",
            fontFamily: '"SF Mono", Menlo, monospace',
            letterSpacing: 0,
            fontSize: 12,
            textTransform: "none",
            padding: "1px 6px",
            borderRadius: 3,
            border: `1px solid ${anyOn ? "rgba(200, 169, 110, 0.4)" : "rgba(200, 169, 110, 0.25)"}`,
            background: anyOn ? "rgba(200, 169, 110, 0.1)" : "rgba(255, 255, 255, 0.04)",
          }}
        >
          {onCount}/{total}
        </span>
      </button>
      {open && <div>{children}</div>}
    </div>
  );
}

// Tri-state section checkbox: ☐ none / ▪ some / ✓ all. Replaces the old
// pair of "All" and "None" text buttons in each LayerGroup header.
export function SectionCheckbox({
  allOn,
  someOn,
  onClick,
}: {
  allOn: boolean;
  someOn: boolean;
  onClick: () => void;
}) {
  return (
    <input
      type="checkbox"
      checked={allOn}
      ref={(el) => {
        if (el) el.indeterminate = someOn;
      }}
      onChange={onClick}
      onClick={(e) => e.stopPropagation()}
      style={{
        accentColor: GOLD,
        width: 13,
        height: 13,
        margin: 0,
        cursor: "pointer",
      }}
      title={allOn ? "Disable all" : "Enable all"}
    />
  );
}
