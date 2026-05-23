"use client";

// Military-UAV HUD overlay shown when drone mode is active. Reads
// camera state from the same MapLibre instance the user is flying and
// surfaces it as fixed-screen-space chrome: crosshair, horizon, compass
// tape, DMS coordinates, altitude / vertical-speed / ground-speed /
// heading / pitch readouts, corner brackets, status, time, and zoom.
//
// All elements are pointer-events: none so the HUD never intercepts
// clicks meant for the map or the drone-mode button. Sampling runs at
// 100 ms via setInterval; ground speed + vertical speed are derived
// from delta between consecutive samples (haversine for ground, Δalt
// for vertical). z-index 50 sits below MiniMap (60+) and modals.

import { useEffect, useRef, useState, type RefObject, type CSSProperties } from "react";
import type { Map as MLMap } from "maplibre-gl";

const GREEN = "#00FF41";
const GREEN_SOFT = "rgba(0,255,65,0.8)";
const GREEN_FAINT = "rgba(0,255,65,0.45)";
const FONT = '"Courier New", ui-monospace, monospace';

// Earth equator in metres — used by both the altitude approximation and
// the haversine distance for ground speed.
const EARTH_M = 40075016;
const EARTH_R = 6371008.8;

interface HudSample {
  lng: number;
  lat: number;
  zoom: number;
  bearing: number;
  pitch: number;
  altitudeM: number;
  groundSpeedKmh: number;
  verticalSpeedMs: number;
  timeUTC: string;
}

interface PrevSample {
  lng: number;
  lat: number;
  altitudeM: number;
  ts: number;
}

/** Decimal degrees → DMS string (e.g. 25°04'23"N). */
function toDMS(deg: number, isLat: boolean): string {
  const hemisphere = isLat ? (deg >= 0 ? "N" : "S") : (deg >= 0 ? "E" : "W");
  const abs = Math.abs(deg);
  const d = Math.floor(abs);
  const mFloat = (abs - d) * 60;
  const m = Math.floor(mFloat);
  const s = Math.round((mFloat - m) * 60);
  return `${String(d).padStart(2, "0")}°${String(m).padStart(2, "0")}'${String(s).padStart(2, "0")}"${hemisphere}`;
}

/** Great-circle distance between two lng/lat points in metres. */
function haversineM(lng1: number, lat1: number, lng2: number, lat2: number): number {
  const toRad = (x: number) => (x * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return 2 * EARTH_R * Math.asin(Math.min(1, Math.sqrt(a)));
}

/** Cardinal short name for a degree on the compass tape. */
function cardinal(deg: number): string | null {
  const norm = ((deg % 360) + 360) % 360;
  const idx = Math.round(norm / 45) % 8;
  if (Math.abs(norm - idx * 45) > 0.5) return null;
  return ["N", "NE", "E", "SE", "S", "SW", "W", "NW"][idx];
}

export default function DroneHUD({
  mainMapRef,
  firing = false,
}: {
  mainMapRef: RefObject<MLMap | null>;
  /** When true, the crosshair runs a 3× white→green pulse for ~900 ms
   *  to confirm a fire (Space / map click in drone mode). Parent flips
   *  it back to false via setTimeout. */
  firing?: boolean;
}) {
  const [sample, setSample] = useState<HudSample | null>(null);
  const prevRef = useRef<PrevSample | null>(null);

  useEffect(() => {
    let alive = true;

    const tick = () => {
      if (!alive) return;
      const map = mainMapRef.current;
      if (!map) return;
      const center = map.getCenter();
      const zoom = map.getZoom();
      const bearing = map.getBearing();
      const pitch = map.getPitch();
      // Altitude approximation per founder spec: equator metres divided
      // by tile coverage at this zoom, scaled by screen height. Matches
      // how far away the camera "feels" from the ground for an oblique
      // view of the same scene.
      const screenH = typeof window !== "undefined" ? window.innerHeight : 800;
      const altitudeM = (EARTH_M / (Math.pow(2, zoom) * 256)) * screenH;

      const now = performance.now();
      const prev = prevRef.current;
      let groundSpeedKmh = 0;
      let verticalSpeedMs = 0;
      if (prev) {
        const dt = (now - prev.ts) / 1000;
        if (dt > 0) {
          const dGround = haversineM(prev.lng, prev.lat, center.lng, center.lat);
          groundSpeedKmh = (dGround / dt) * 3.6;
          verticalSpeedMs = (altitudeM - prev.altitudeM) / dt;
        }
      }
      prevRef.current = { lng: center.lng, lat: center.lat, altitudeM, ts: now };

      const d = new Date();
      const timeUTC =
        `${String(d.getUTCFullYear())}-` +
        `${String(d.getUTCMonth() + 1).padStart(2, "0")}-` +
        `${String(d.getUTCDate()).padStart(2, "0")} ` +
        `${String(d.getUTCHours()).padStart(2, "0")}:` +
        `${String(d.getUTCMinutes()).padStart(2, "0")}:` +
        `${String(d.getUTCSeconds()).padStart(2, "0")} UTC`;

      setSample({
        lng: center.lng,
        lat: center.lat,
        zoom,
        bearing,
        pitch,
        altitudeM,
        groundSpeedKmh,
        verticalSpeedMs,
        timeUTC,
      });
    };

    tick();
    const id = window.setInterval(tick, 100);
    return () => {
      alive = false;
      window.clearInterval(id);
      prevRef.current = null;
    };
  }, [mainMapRef]);

  if (!sample) return null;

  // Compass tape — 300px wide window. The strip inside is ~720px and
  // is translated by -bearing * PX_PER_DEG so the current bearing
  // centers under the down-pointing indicator triangle.
  const TAPE_W = 300;
  const PX_PER_DEG = 4;
  const TAPE_HALF_DEG = (TAPE_W / 2) / PX_PER_DEG;
  const tapeOffset = -sample.bearing * PX_PER_DEG + TAPE_W / 2;
  const tapeTicks: Array<{ deg: number; label: string | null }> = [];
  for (let deg = 0; deg < 360; deg += 10) {
    tapeTicks.push({ deg, label: deg % 30 === 0 ? (cardinal(deg) ?? String(deg)) : null });
  }

  // Horizon line: pitch=0 stays centered; pitch ramps it up to ~28% of
  // viewport height by pitch=60. Caps at viewport bounds so very
  // steep pitches don't push the line off-screen.
  const horizonShiftPct = Math.min(0.28, sample.pitch / 60 * 0.28);

  return (
    <div
      aria-hidden
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 50,
        pointerEvents: "none",
        color: GREEN,
        fontFamily: FONT,
        fontSize: 11,
        textShadow: "0 0 4px rgba(0,255,65,0.35)",
      }}
    >
      {/* 9. Corner brackets — military framing on screen edges. */}
      {(["tl", "tr", "bl", "br"] as const).map((corner) => (
        <CornerBracket key={corner} corner={corner} />
      ))}

      {/* 8. Status line — top-left. Blinking red dot + steady green text. */}
      <div
        style={{
          position: "absolute",
          top: 16,
          left: 22,
          fontSize: 11,
          letterSpacing: "0.12em",
          display: "flex",
          alignItems: "center",
          gap: 8,
        }}
      >
        <span
          style={{
            width: 8,
            height: 8,
            borderRadius: "50%",
            background: "#FF3D3D",
            boxShadow: "0 0 6px #FF3D3D",
            animation: "zaahi-hud-blink 1s steps(2, start) infinite",
          }}
        />
        <span>[●] ZAAHI DRONE MODE · ACTIVE</span>
      </div>

      {/* 3. Compass tape — top center. */}
      <div
        style={{
          position: "absolute",
          top: 18,
          left: "50%",
          transform: "translateX(-50%)",
          width: TAPE_W,
          height: 28,
          borderTop: `1px solid ${GREEN_FAINT}`,
          borderBottom: `1px solid ${GREEN_FAINT}`,
          overflow: "hidden",
        }}
      >
        {/* Strip with ticks/labels. Render twice (offset -360 / 0 / +360)
            so the tape wraps continuously across the 0/360 seam. */}
        {([-360, 0, 360] as const).map((wrap) => (
          <div
            key={wrap}
            style={{
              position: "absolute",
              top: 0,
              left: 0,
              height: "100%",
              transform: `translateX(${tapeOffset + wrap * PX_PER_DEG}px)`,
            }}
          >
            {tapeTicks.map((t) => {
              const x = t.deg * PX_PER_DEG;
              // Skip ticks that wouldn't be within the visible window.
              if (Math.abs(t.deg - sample.bearing - wrap) > TAPE_HALF_DEG + 20) {
                return null;
              }
              return (
                <div key={t.deg} style={{ position: "absolute", left: x, top: 0, transform: "translateX(-50%)" }}>
                  <div style={{ width: 1, height: t.label ? 12 : 6, background: GREEN_SOFT }} />
                  {t.label && (
                    <div
                      style={{
                        fontSize: 10,
                        marginTop: 2,
                        whiteSpace: "nowrap",
                        transform: "translateX(-50%)",
                        position: "absolute",
                        left: "50%",
                        top: 12,
                      }}
                    >
                      {t.label}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        ))}
        {/* Center indicator — small down-pointing triangle under the tape. */}
        <div
          style={{
            position: "absolute",
            top: 22,
            left: "50%",
            transform: "translateX(-50%)",
            width: 0,
            height: 0,
            borderLeft: "5px solid transparent",
            borderRight: "5px solid transparent",
            borderTop: `6px solid ${GREEN}`,
          }}
        />
      </div>

      {/* 4. Coordinates — directly under the compass tape. */}
      <div
        style={{
          position: "absolute",
          top: 56,
          left: "50%",
          transform: "translateX(-50%)",
          fontSize: 11,
          letterSpacing: "0.06em",
        }}
      >
        LAT: {toDMS(sample.lat, true)}{"  "}LON: {toDMS(sample.lng, false)}
      </div>

      {/* 2. Horizon line — full width, shifts up with pitch. */}
      <div
        style={{
          position: "absolute",
          top: `calc(50% - ${horizonShiftPct * 100}vh)`,
          left: 0,
          right: 0,
          height: 1,
          borderTop: `1px dashed ${GREEN_FAINT}`,
        }}
      />

      {/* 1. Crosshair — center reticle. Pulses on fire. */}
      <Crosshair firing={firing} />

      {/* 5. Left rail — ALT + VS. Vertically centered. */}
      <div
        style={{
          position: "absolute",
          left: 22,
          top: "50%",
          transform: "translateY(-50%)",
          display: "flex",
          flexDirection: "column",
          gap: 10,
          width: 150,
        }}
      >
        <DataBar label="ALT" value={`${Math.round(sample.altitudeM).toLocaleString()}m`} fill={Math.min(1, sample.altitudeM / 5000)} />
        <DataBar
          label="VS"
          value={`${sample.verticalSpeedMs >= 0 ? "+" : ""}${sample.verticalSpeedMs.toFixed(1)}`}
          fill={Math.min(1, Math.abs(sample.verticalSpeedMs) / 20)}
        />
      </div>

      {/* 6. Right rail — SPD + HDG + PCH. Vertically centered. */}
      <div
        style={{
          position: "absolute",
          right: 22,
          top: "50%",
          transform: "translateY(-50%)",
          display: "flex",
          flexDirection: "column",
          gap: 10,
          width: 150,
        }}
      >
        <DataBar label="SPD" value={`${sample.groundSpeedKmh.toFixed(1)}`} fill={Math.min(1, sample.groundSpeedKmh / 200)} />
        <DataBar
          label="HDG"
          value={`${Math.round(((sample.bearing % 360) + 360) % 360).toString().padStart(3, "0")}°`}
          fill={(((sample.bearing % 360) + 360) % 360) / 360}
        />
        <DataBar
          label="PCH"
          value={`${sample.pitch >= 0 ? "+" : ""}${Math.round(sample.pitch)}°`}
          fill={Math.min(1, Math.abs(sample.pitch) / 85)}
        />
      </div>

      {/* 7a. Bottom-left — UTC datetime. */}
      <div style={{ position: "absolute", bottom: 16, left: 22, fontSize: 11, letterSpacing: "0.06em" }}>
        {sample.timeUTC}
      </div>

      {/* 7b. Bottom-right — zoom + scale. */}
      <div style={{ position: "absolute", bottom: 16, right: 22, fontSize: 11, letterSpacing: "0.06em" }}>
        ZOOM {sample.zoom.toFixed(2)} · {(sample.altitudeM / 1000).toFixed(1)}km
      </div>

      <style>{`
        @keyframes zaahi-hud-blink { 0% { opacity: 1; } 50% { opacity: 0.2; } 100% { opacity: 1; } }
        @keyframes zaahi-hud-fire-arm {
          0%   { background: ${GREEN_SOFT}; filter: brightness(1); box-shadow: none; }
          50%  { background: #FFFFFF;       filter: brightness(3); box-shadow: 0 0 6px #FFFFFF; }
          100% { background: ${GREEN_SOFT}; filter: brightness(1); box-shadow: none; }
        }
        @keyframes zaahi-hud-fire-dot {
          0%   { background: ${GREEN};      filter: brightness(1); box-shadow: 0 0 4px ${GREEN}; }
          50%  { background: #FFFFFF;       filter: brightness(3); box-shadow: 0 0 10px #FFFFFF; }
          100% { background: ${GREEN};      filter: brightness(1); box-shadow: 0 0 4px ${GREEN}; }
        }
      `}</style>
    </div>
  );
}

function Crosshair({ firing }: { firing: boolean }) {
  // Each pulse: 300 ms × 3 = 900 ms total. The parent flips firing back
  // to false on a matching 900 ms timer, so the animation property
  // returns to "none" and is ready to re-trigger on the next fire.
  const armAnim = firing ? "zaahi-hud-fire-arm 300ms ease-in-out 3" : "none";
  const dotAnim = firing ? "zaahi-hud-fire-dot 300ms ease-in-out 3" : "none";

  const armStyle: CSSProperties = {
    position: "absolute",
    background: GREEN_SOFT,
    animation: armAnim,
  };
  return (
    <div
      style={{
        position: "absolute",
        top: "50%",
        left: "50%",
        width: 0,
        height: 0,
      }}
    >
      {/* Up arm */}
      <div style={{ ...armStyle, width: 1, height: 40, left: -0.5, top: -48 }} />
      {/* Down arm */}
      <div style={{ ...armStyle, width: 1, height: 40, left: -0.5, top: 8 }} />
      {/* Left arm */}
      <div style={{ ...armStyle, width: 40, height: 1, top: -0.5, left: -48 }} />
      {/* Right arm */}
      <div style={{ ...armStyle, width: 40, height: 1, top: -0.5, left: 8 }} />
      {/* Center dot 3px */}
      <div
        style={{
          position: "absolute",
          width: 3,
          height: 3,
          left: -1.5,
          top: -1.5,
          background: GREEN,
          borderRadius: "50%",
          boxShadow: `0 0 4px ${GREEN}`,
          animation: dotAnim,
        }}
      />
    </div>
  );
}

function CornerBracket({ corner }: { corner: "tl" | "tr" | "bl" | "br" }) {
  const pos: CSSProperties = { position: "absolute" };
  const armH: CSSProperties = { position: "absolute", height: 2, width: 30, background: GREEN };
  const armV: CSSProperties = { position: "absolute", width: 2, height: 30, background: GREEN };
  switch (corner) {
    case "tl":
      pos.top = 8; pos.left = 8;
      return (
        <div style={pos}>
          <div style={{ ...armH, top: 0, left: 0 }} />
          <div style={{ ...armV, top: 0, left: 0 }} />
        </div>
      );
    case "tr":
      pos.top = 8; pos.right = 8;
      return (
        <div style={pos}>
          <div style={{ ...armH, top: 0, right: 0 }} />
          <div style={{ ...armV, top: 0, right: 0 }} />
        </div>
      );
    case "bl":
      pos.bottom = 8; pos.left = 8;
      return (
        <div style={pos}>
          <div style={{ ...armH, bottom: 0, left: 0 }} />
          <div style={{ ...armV, bottom: 0, left: 0 }} />
        </div>
      );
    case "br":
      pos.bottom = 8; pos.right = 8;
      return (
        <div style={pos}>
          <div style={{ ...armH, bottom: 0, right: 0 }} />
          <div style={{ ...armV, bottom: 0, right: 0 }} />
        </div>
      );
  }
}

function DataBar({ label, value, fill }: { label: string; value: string; fill: number }) {
  const clamped = Math.max(0, Math.min(1, fill));
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 11 }}>
      <span style={{ fontSize: 9, letterSpacing: "0.12em", width: 28, color: GREEN_SOFT }}>{label}</span>
      <div
        style={{
          flex: 1,
          height: 8,
          border: `1px solid ${GREEN_FAINT}`,
          position: "relative",
          background: "rgba(0,0,0,0.25)",
        }}
      >
        <div
          style={{
            position: "absolute",
            inset: 0,
            width: `${clamped * 100}%`,
            background: GREEN_SOFT,
            transition: "width 200ms linear",
          }}
        />
      </div>
      <span style={{ fontSize: 11, minWidth: 56, textAlign: "right", letterSpacing: "0.02em" }}>{value}</span>
    </div>
  );
}
