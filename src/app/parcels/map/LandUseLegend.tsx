"use client";
import { GOLD } from "@/lib/design-tokens";
// APPROVED by founder — 10 canonical categories (extended 2026-06-03
// from 9; INVESTMENT added for ~29K AD off-plan plots that were
// invisible under any land-use filter). NEVER add, remove, or recolor
// further without explicit founder approval. Mirrored in
// ZAAHI_LANDUSE_COLOR (page.tsx + prepare-tiles.ts), SidePanel
// LANDUSE_COLORS, filter-state LAND_USE_OPTIONS, and CLAUDE.md.
export const LAND_USE_LEGEND: { color: string; name: string; desc: string }[] = [
  { color: "#2D6A4F", name: "Residential",          desc: "Жилое" },
  { color: "#1B3A5C", name: "Commercial",           desc: "Коммерческое" },
  { color: "#6B4C9A", name: "Mixed Use",            desc: "Смешанное" },
  { color: "#E8732A", name: "Hotel / Hospitality",  desc: "Отельное" },
  { color: "#495057", name: "Industrial / Warehouse", desc: "Промышленное" },
  { color: "#0077B6", name: "Educational",          desc: "Образовательное" },
  { color: "#E63946", name: "Healthcare",           desc: "Медицина" },
  { color: "#606C38", name: "Agricultural / Farm",  desc: "Сельскохозяйственное" },
  { color: "#A8926E", name: "Future Development",   desc: "Под застройку" },
  { color: "#14B8A6", name: "Investment",           desc: "Инвестиционные (AD off-plan)" },
];

export function LandUseLegend({ legendRef, setLegendOpen }: {
  legendRef: React.RefObject<HTMLDivElement | null>;
  setLegendOpen: React.Dispatch<React.SetStateAction<boolean>>;
}) {
  return (
    <div
      ref={legendRef}
      style={{
        position: "absolute",
        top: 124,
        right: 12,
        width: 280,
        maxHeight: "calc(100vh - 130px)",
        overflowY: "auto",
        background: "rgba(0, 0, 0, 0.3)",
        backdropFilter: "blur(16px)",
        WebkitBackdropFilter: "blur(16px)",
        border: "1px solid rgba(255, 255, 255, 0.15)",
        borderRadius: 12,
        boxShadow: "0 6px 20px rgba(0, 0, 0, 0.3)",
        zIndex: 12,
        color: "#FFFFFF",
        fontFamily: "system-ui, sans-serif",
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "10px 14px",
          borderBottom: "1px solid rgba(200, 169, 110, 0.15)",
        }}
      >
        <div
          style={{
            fontFamily: "Georgia, serif",
            fontSize: 13,
            letterSpacing: "0.1em",
            color: GOLD,
            fontWeight: 700,
          }}
        >
          LAND USE LEGEND
        </div>
        <button
          onClick={() => setLegendOpen(false)}
          aria-label="Close legend"
          style={{
            background: "transparent",
            border: "none",
            color: "rgba(255, 255, 255, 0.55)",
            cursor: "pointer",
            fontSize: 18,
            lineHeight: 1,
            padding: 0,
          }}
        >
          ×
        </button>
      </div>

      <div style={{ padding: "8px 0" }}>
        {LAND_USE_LEGEND.map((item) => (
          <div
            key={item.name}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 10,
              padding: "6px 14px",
            }}
          >
            <div
              style={{
                width: 16,
                height: 16,
                background: item.color,
                border: "1px solid rgba(255, 255, 255, 0.15)",
                borderRadius: 3,
                flexShrink: 0,
              }}
            />
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 12, color: "#FFFFFF", fontWeight: 600 }}>{item.name}</div>
              <div style={{ fontSize: 12, color: "rgba(255, 255, 255, 0.55)", marginTop: 1 }}>{item.desc}</div>
            </div>
          </div>
        ))}
      </div>

      <div
        style={{
          borderTop: "1px solid rgba(200, 169, 110, 0.15)",
          padding: "10px 14px",
          fontSize: 12,
          color: "rgba(255, 255, 255, 0.55)",
          fontStyle: "italic",
          lineHeight: 1.5,
        }}
      >
        Серые участки не подлежат продаже
        <br />
        (utilities, parks, community facilities)
      </div>
    </div>
  );
}
