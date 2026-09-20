"use client";
import { GOLD } from "@/lib/design-tokens";
import type { Map as MLMap } from "maplibre-gl";
import MapCompassIcon from "./MapCompassIcon";
import { sound } from "@/lib/sound";
import type { BaseMap } from "./map-styles";
import { ChromeBtn } from "@/components/ChromeBtn";

export function MapLeftRail({ autoRotateEnabled, baseMap, baseMapBusy, layersOpen, panelBtnRef, setAutoRotateEnabled, setLayersOpen, setPortalOpen, swapBaseMap }: {
  autoRotateEnabled: boolean;
  baseMap: BaseMap;
  baseMapBusy: boolean;
  layersOpen: boolean;
  panelBtnRef: React.RefObject<HTMLButtonElement | null>;
  setAutoRotateEnabled: React.Dispatch<React.SetStateAction<boolean>>;
  setLayersOpen: React.Dispatch<React.SetStateAction<boolean>>;
  setPortalOpen: React.Dispatch<React.SetStateAction<boolean>>;
  swapBaseMap: (target: BaseMap) => void;
}) {
  return (
    <>
      {/* ── LEFT vertical stack (5×5 symmetry, founder spec 2026-05-24) ──
          Top→bottom: Layers, Basemap Light, Basemap Dark, Basemap
          Satellite, Auto-rotate. Mirrors the right stack horizontally —
          both stacks are 5 buttons at top: 50% translateY(-50%), gap 6,
          so button N on the left is at the same y as button N on the
          right. All buttons use ChromeBtn glassmorphism gold; active
          state shows GOLD-tinted fill. */}
      <div
        style={{
          position: "absolute",
          left: 12,
          top: "50%",
          transform: "translateY(-50%)",
          display: "flex",
          flexDirection: "column",
          gap: 6,
          zIndex: 11,
        }}
      >
        {/* 1. Layers — opens the Layers panel. panelBtnRef stays here so
              the panel's click-outside handler still excludes this
              button. */}
        <span ref={panelBtnRef} style={{ display: "block" }}>
          <ChromeBtn
            title="Layers"
            active={layersOpen}
            onClick={() => {
              // Neutral chrome tap (founder backlog #33).
              sound.uiTap();
              setLayersOpen((o) => !o);
              setPortalOpen(false);
            }}
          >
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polygon points="12 2 2 7 12 12 22 7 12 2" />
              <polyline points="2 17 12 22 22 17" />
              <polyline points="2 12 12 17 22 12" />
            </svg>
          </ChromeBtn>
        </span>
        {/* 2. Basemap Light */}
        <ChromeBtn
          title={baseMapBusy ? "Loading style…" : "Light basemap"}
          active={baseMap === "light"}
          onClick={() => swapBaseMap("light")}
        >
          {/* Sun — solid disc with rays. */}
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="4" />
            <path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41" />
          </svg>
        </ChromeBtn>
        {/* 3. Basemap Dark */}
        <ChromeBtn
          title={baseMapBusy ? "Loading style…" : "Dark basemap"}
          active={baseMap === "dark"}
          onClick={() => swapBaseMap("dark")}
        >
          {/* Crescent moon. */}
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
            <path d="M21 12.79A9 9 0 1 1 11.21 3a7 7 0 0 0 9.79 9.79z" />
          </svg>
        </ChromeBtn>
        {/* 4. Basemap Satellite */}
        <ChromeBtn
          title={baseMapBusy ? "Loading style…" : "Satellite basemap"}
          active={baseMap === "satellite"}
          onClick={() => swapBaseMap("satellite")}
        >
          {/* Satellite dish — minimalist parabolic glyph. */}
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
            <path d="M4 20l8-8" />
            <path d="M14.5 13.5l-3-3" />
            <path d="M9 7c4 0 8 4 8 8" />
            <path d="M11.5 4.5C16 4.5 19.5 8 19.5 12.5" />
            <circle cx="6" cy="18" r="1.6" />
          </svg>
        </ChromeBtn>
        {/* 5. Auto-rotate. */}
        <ChromeBtn
          title={autoRotateEnabled ? "Disable auto-rotate" : "Enable auto-rotate camera"}
          active={autoRotateEnabled}
          onClick={() => {
            sound.whoosh();
            setAutoRotateEnabled((v) => !v);
          }}
        >
          {/* Circular arrow — auto-rotate indicator. */}
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
            <path d="M21 12a9 9 0 1 1-3.5-7.1" />
            <polyline points="21 4 21 9 16 9" />
          </svg>
        </ChromeBtn>
        {/* Filters button moved to the HeaderBar (founder spec
            2026-06-03). The left rail now ends at 5 (Auto-rotate)
            after the drone-mode button was removed 2026-06-11
            (FPS-drone postmortem: режимы дрона убраны вообще,
            клавиатурная навигация добавлена к обычной карте).
            The Parcels portal toggle had previously moved to the
            bottom-centre ParcelsNav pill (founder spec 2026-05-29). */}
      </div>
    </>
  );
}

export function MapRightRail({ is3D, legendBtnRef, legendOpen, mapRef, setIs3D, setLegendOpen, setSunSliderActive, sunSliderActive }: {
  is3D: boolean;
  legendBtnRef: React.RefObject<HTMLElement | null>;
  legendOpen: boolean;
  mapRef: React.RefObject<MLMap | null>;
  setIs3D: React.Dispatch<React.SetStateAction<boolean>>;
  setLegendOpen: React.Dispatch<React.SetStateAction<boolean>>;
  setSunSliderActive: React.Dispatch<React.SetStateAction<boolean>>;
  sunSliderActive: boolean;
}) {
  return (
    <>
      {/* ── RIGHT vertical stack (5×5 symmetry, founder spec 2026-05-24) ──
          Top→bottom: Legend, Zoom+, Zoom−, Reset bearing, 3D/2D.
          Mirrors the LEFT stack horizontally — same y-positions for
          buttons 1..5. */}
      <div
        style={{
          position: "absolute",
          right: 12,
          top: "50%",
          transform: "translateY(-50%)",
          display: "flex",
          flexDirection: "column",
          gap: 6,
          zIndex: 11,
        }}
      >
        {/* 1. Legend — mirrors Layers on the left. data-legend-trigger
              keeps the click-outside handler from re-closing the panel
              when the user clicks this trigger. */}
        <span ref={legendBtnRef} data-legend-trigger style={{ display: "block" }}>
          <ChromeBtn
            title="Legend"
            active={legendOpen}
            onClick={() => {
              sound.uiTap(); // neutral chrome (backlog #33)
              setLegendOpen((o) => !o);
            }}
          >
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="8" y1="6" x2="21" y2="6" />
              <line x1="8" y1="12" x2="21" y2="12" />
              <line x1="8" y1="18" x2="21" y2="18" />
              <circle cx="4" cy="6" r="1.2" fill="currentColor" />
              <circle cx="4" cy="12" r="1.2" fill="currentColor" />
              <circle cx="4" cy="18" r="1.2" fill="currentColor" />
            </svg>
          </ChromeBtn>
        </span>
        {/* 2. Zoom in */}
        <ChromeBtn title="Zoom in" onClick={() => { sound.uiTap(); mapRef.current?.zoomIn(); }}>+</ChromeBtn>
        {/* 3. Zoom out */}
        <ChromeBtn title="Zoom out" onClick={() => { sound.uiTap(); mapRef.current?.zoomOut(); }}>−</ChromeBtn>
        {/* 4. Reset bearing — compass icon rotates with current bearing. */}
        <ChromeBtn
          title="Reset bearing"
          onClick={() => mapRef.current?.easeTo({ bearing: 0, pitch: 45, duration: 500 })}
        >
          <MapCompassIcon mapRef={mapRef} />
        </ChromeBtn>
        {/* 5. 2D/3D toggle */}
        <ChromeBtn
          title={is3D ? "Switch to 2D" : "Switch to 3D"}
          active={is3D}
          onClick={() => {
            const map = mapRef.current;
            if (!map) return;
            const next = !is3D;
            setIs3D(next);
            // 2D/3D toggle gets the brighter uiClick — toggling perspective
            // is a "primary" action, not neutral chrome (backlog #33).
            // Replaces the previous whoosh at this one site; the whooshes on
            // panel open/close are untouched.
            sound.uiClick();
            map.easeTo({ pitch: next ? 45 : 0, duration: 400 });
          }}
        >
          <span style={{ fontFamily: "Georgia, serif", fontWeight: 700, fontSize: 12 }}>
            {is3D ? "3D" : "2D"}
          </span>
        </ChromeBtn>
        {/* 6. Sun-time slider — promoted from the removed MiniMap
            dock to the right rail (founder spec 2026-06-01). The
            slider overlay itself stays rendered at page-level when
            sunSliderActive is true (see L5059). */}
        <ChromeBtn
          title={sunSliderActive ? "Hide sun-time slider" : "Show sun-time slider"}
          active={sunSliderActive}
          onClick={() => {
            sound.whoosh();
            setSunSliderActive((v) => !v);
          }}
        >
          {/* Sun — radiating rays around a centred disc. Same glyph
              that lived in the mini-dock for visual continuity. */}
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="4" />
            <path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41" />
          </svg>
        </ChromeBtn>
      </div>
    </>
  );
}

export function AutoRotateHint() {
  return (
    <div
      style={{
        position: "absolute",
        bottom: 24,
        left: "50%",
        transform: "translateX(-50%)",
        background: "rgba(10,22,40,0.7)",
        backdropFilter: "blur(16px)",
        WebkitBackdropFilter: "blur(16px)",
        border: "1px solid rgba(255,255,255,0.1)",
        color: "rgba(255,255,255,0.9)",
        borderRadius: 12,
        padding: "8px 16px",
        fontSize: 13,
        letterSpacing: "0.02em",
        zIndex: 40,
        pointerEvents: "none",
        boxShadow: "0 6px 20px rgba(0,0,0,0.3)",
      }}
    >
      Auto-rotate ON — touch the map to pause
    </div>
  );
}
