"use client";
import { useMemo, useState } from "react";
import type { HeroBuilding, HeroOverride, HeroCoords, HeroOrientation } from "./heroBuildingsRegistry";

// Tokens unified against login reference (src/app/page.tsx).
const GOLD = "#C8A96E";
const PANEL_BG = "rgba(0, 0, 0, 0.3)";
const FIELD_BG = "rgba(255, 255, 255, 0.04)";
const BORDER = "1px solid rgba(255, 255, 255, 0.15)";

// 1° latitude ≈ 111,000m. 1° longitude at Dubai lat 25° ≈ 100,600m.
const M_PER_DEG_LAT = 111_000;
const M_PER_DEG_LNG_DUBAI = 100_600;

function metersToDeg(meters: number, axis: "lng" | "lat"): number {
  return meters / (axis === "lat" ? M_PER_DEG_LAT : M_PER_DEG_LNG_DUBAI);
}

function degToMeters(deg: number, axis: "lng" | "lat"): number {
  return deg * (axis === "lat" ? M_PER_DEG_LAT : M_PER_DEG_LNG_DUBAI);
}

type Props = {
  building: HeroBuilding;
  override: HeroOverride | undefined;
  onChange: (next: HeroOverride) => void;
  onReset: () => void;
  onClose: () => void;
};

export default function HeroBuildingsDevPanel({ building, override, onChange, onReset, onClose }: Props) {
  const [copyFlash, setCopyFlash] = useState(false);

  const coords = override?.coords ?? building.defaultCoords;
  const orientation = override?.orientation ?? building.defaultOrientation;
  const size = override?.size ?? building.defaultSize;

  const lngOffsetM = useMemo(() =>
    Math.round(degToMeters(coords[0] - building.defaultCoords[0], "lng")),
    [coords, building.defaultCoords]);
  const latOffsetM = useMemo(() =>
    Math.round(degToMeters(coords[1] - building.defaultCoords[1], "lat")),
    [coords, building.defaultCoords]);

  function update<K extends keyof HeroOverride>(key: K, value: HeroOverride[K]) {
    onChange({ ...(override ?? {}), [key]: value });
  }

  function setOrientation(idx: 0 | 1 | 2, value: number) {
    const next: HeroOrientation = [
      idx === 0 ? value : orientation[0],
      idx === 1 ? value : orientation[1],
      idx === 2 ? value : orientation[2],
    ];
    update("orientation", next);
  }

  function setLngOffsetMeters(meters: number) {
    const newLng = building.defaultCoords[0] + metersToDeg(meters, "lng");
    const next: HeroCoords = [newLng, coords[1], coords[2]];
    update("coords", next);
  }

  function setLatOffsetMeters(meters: number) {
    const newLat = building.defaultCoords[1] + metersToDeg(meters, "lat");
    const next: HeroCoords = [coords[0], newLat, coords[2]];
    update("coords", next);
  }

  function setElev(meters: number) {
    const next: HeroCoords = [coords[0], coords[1], meters];
    update("coords", next);
  }

  function copyConfig() {
    const config = {
      id: building.id,
      label: building.label,
      coords: [Number(coords[0].toFixed(7)), Number(coords[1].toFixed(7)), coords[2]],
      orientation,
      size: Number(size.toFixed(4)),
    };
    const text =
      `// ${building.label}\n` +
      `defaultCoords: [${config.coords[0]}, ${config.coords[1]}, ${config.coords[2]}],\n` +
      `defaultOrientation: [${config.orientation[0]}, ${config.orientation[1]}, ${config.orientation[2]}],\n` +
      `defaultSize: ${config.size},`;
    navigator.clipboard.writeText(text).then(() => {
      setCopyFlash(true);
      setTimeout(() => setCopyFlash(false), 1200);
    });
  }

  return (
    <div
      style={{
        position: "absolute",
        right: 16,
        bottom: 56,
        width: 320,
        background: PANEL_BG,
        backdropFilter: "blur(16px)",
        WebkitBackdropFilter: "blur(16px)",
        border: BORDER,
        borderRadius: 12,
        boxShadow: "0 6px 20px rgba(0,0,0,0.4)",
        color: "#fff",
        fontFamily: '-apple-system, "Segoe UI", Roboto, sans-serif',
        fontSize: 12,
        zIndex: 30,
        pointerEvents: "auto",
      }}
    >
      {/* Header */}
      <div style={{
        display: "flex", alignItems: "center", justifyContent: "space-between",
        padding: "10px 12px", borderBottom: BORDER,
      }}>
        <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
          <span style={{
            fontFamily: 'Georgia, "Times New Roman", serif', fontSize: 14,
            fontWeight: 600, letterSpacing: "0.02em",
          }}>{building.label}</span>
          <span style={{ fontSize: 9, color: "rgba(255,255,255,0.5)", letterSpacing: "0.04em" }}>
            {building.id} · dev tune
          </span>
        </div>
        <button
          onClick={onClose}
          aria-label="Close dev panel"
          style={{
            width: 22, height: 22, border: "none", borderRadius: 4,
            background: "transparent", color: GOLD, fontSize: 16, cursor: "pointer",
            display: "flex", alignItems: "center", justifyContent: "center",
            transition: "background 150ms ease",
          }}
          onMouseEnter={(e) => { e.currentTarget.style.background = "rgba(200,169,110,0.15)"; }}
          onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; }}
        >×</button>
      </div>

      {/* Body — sliders */}
      <div style={{ padding: "8px 12px 12px", display: "flex", flexDirection: "column", gap: 8 }}>
        <SliderRow label="Yaw" value={orientation[1]} min={-180} max={180} step={1} unit="°"
          onChange={(v) => setOrientation(1, v)} />
        <SliderRow label="Pitch" value={orientation[0]} min={-90} max={90} step={1} unit="°"
          onChange={(v) => setOrientation(0, v)} />
        <SliderRow label="Roll" value={orientation[2]} min={-180} max={180} step={1} unit="°"
          onChange={(v) => setOrientation(2, v)} />
        <SliderRow label="Size" value={size} min={0.5} max={3.0} step={0.01} unit="×"
          onChange={(v) => update("size", v)} format={(v) => v.toFixed(2)} />
        <SliderRow label="Elev" value={coords[2]} min={-50} max={600} step={1} unit="m"
          onChange={setElev} />
        <SliderRow label="LNG offset" value={lngOffsetM} min={-100} max={100} step={1} unit="m"
          onChange={setLngOffsetMeters} />
        <SliderRow label="LAT offset" value={latOffsetM} min={-100} max={100} step={1} unit="m"
          onChange={setLatOffsetMeters} />

        {/* Effective coords readout */}
        <div style={{
          fontSize: 10, color: "rgba(255,255,255,0.55)",
          fontFamily: '"SF Mono", Menlo, monospace', marginTop: 4,
        }}>
          lng {coords[0].toFixed(7)}<br />
          lat {coords[1].toFixed(7)}
        </div>
      </div>

      {/* Footer */}
      <div style={{
        display: "flex", gap: 8, padding: "10px 12px", borderTop: BORDER,
      }}>
        <button
          onClick={onReset}
          style={btnStyle(false)}
          onMouseEnter={(e) => Object.assign(e.currentTarget.style, btnStyle(true))}
          onMouseLeave={(e) => Object.assign(e.currentTarget.style, btnStyle(false))}
        >Reset</button>
        <button
          onClick={copyConfig}
          style={{ ...btnStyle(false), flex: 1, background: copyFlash ? "rgba(200,169,110,0.25)" : btnStyle(false).background }}
          onMouseEnter={(e) => Object.assign(e.currentTarget.style, btnStyle(true))}
          onMouseLeave={(e) => Object.assign(e.currentTarget.style, { ...btnStyle(false), background: copyFlash ? "rgba(200,169,110,0.25)" : btnStyle(false).background })}
        >{copyFlash ? "Copied!" : "Copy Config"}</button>
      </div>
    </div>
  );
}

function btnStyle(hover: boolean): React.CSSProperties {
  return {
    flex: 0,
    padding: "6px 12px",
    background: hover ? "rgba(200, 169, 110, 0.25)" : "rgba(10, 22, 40, 0.4)",
    border: `1px solid ${hover ? GOLD : "rgba(200, 169, 110, 0.3)"}`,
    borderRadius: 6,
    color: GOLD,
    fontFamily: "inherit",
    fontSize: 11,
    fontWeight: 600,
    letterSpacing: "0.04em",
    cursor: "pointer",
    transition: "border-color 150ms ease, background 150ms ease",
  };
}

function SliderRow({
  label, value, min, max, step, unit, onChange, format,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  unit: string;
  onChange: (v: number) => void;
  format?: (v: number) => string;
}) {
  const display = format ? format(value) : value.toString();
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
      <span style={{
        width: 60, fontSize: 10, color: "rgba(255,255,255,0.6)",
        letterSpacing: "0.04em", textTransform: "uppercase",
      }}>{label}</span>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        style={{
          flex: 1, accentColor: GOLD, background: FIELD_BG,
          cursor: "pointer",
        }}
      />
      <span style={{
        width: 52, textAlign: "right", fontSize: 11, color: "#fff",
        fontFamily: '"SF Mono", Menlo, monospace', fontWeight: 600,
      }}>{display}{unit}</span>
    </div>
  );
}
