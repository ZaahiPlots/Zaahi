"use client";
import { useEffect, useMemo, useRef, useState } from "react";
import maplibregl, { Map as MLMap, StyleSpecification, MapMouseEvent, FilterSpecification } from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import { Protocol } from "pmtiles";
import { MapboxOverlay } from "@deck.gl/mapbox";
import { ScenegraphLayer } from "@deck.gl/mesh-layers";
import { LightingEffect, AmbientLight, DirectionalLight } from "@deck.gl/core";
import Link from "next/link";
import SidePanel from "./SidePanel";
import ArchibaldChat from "./ArchibaldChat";
import { VaultSidePanelAdapter } from "./VaultSidePanelAdapter";
import WelcomeTour from "./WelcomeTour";
import AddPlotModal from "./AddPlotModal";
import { AddPlotChooser } from "./AddPlotChooser";
import { AddPlotWizardModal } from "./AddPlotWizardModal";
import MiniMap from "./MiniMap";
import DroneHUD from "./DroneHUD";
import SunTimeSlider from "./SunTimeSlider";
import { useSunLight } from "./useSunLight";
import TermsAcceptModal from "./TermsAcceptModal";
import BuildingCard from "./buildings/BuildingCard";
import { useBuildingsLayer, flyToBuilding } from "./buildings/useBuildingsLayer";
import type { BuildingDTO } from "./buildings/types";
import { sound } from "@/lib/sound";
import AuthGuard from "@/components/AuthGuard";
import { SignOutButton } from "@/components/SignOutButton";
import { apiFetch } from "@/lib/api-fetch";
import type { MapControls } from "@/lib/archie-tools";
import { installDroneControls, type DroneController } from "@/lib/drone-controls";
import { installAutoRotate, type AutoRotateController } from "@/lib/auto-rotate";
import { emitSignatureTiers, type SetbackEntry } from "@/lib/zaahi-3d-tiers";
import {
  HERO_BUILDINGS,
  HERO_OVERRIDES_STORAGE_KEY,
  effectiveValues,
  type HeroOverride,
} from "./heroBuildingsRegistry";
import HeroBuildingsDevPanel from "./HeroBuildingsDevPanel";
import ParcelsPortalPanel from "./ParcelsPortalPanel";
import ParcelsNav from "./ParcelsNav";
// Phase 1 style unification (2026-05-31): Layers panel migrated to
// the shared Panel + token foundation as the first proof point.
// Other surfaces (HeaderBar, hover popups, MiniMap dock, SidePanel)
// follow in the next commit after founder review.
import { Panel } from "@/components/Panel";
import { ChromeBtn } from "@/components/ChromeBtn";
import {
  PANEL_BG,
  PANEL_BLUR,
  PANEL_BORDER_COLOR,
  CHROME_BTN_BG,
  CHROME_BTN_SIZE_COMPACT,
  RADIUS_PANEL,
  RADIUS_CARD,
} from "@/lib/design-tokens";

type Theme = "light" | "dark";
type BaseMap = "light" | "dark" | "satellite";

const STYLES: Record<BaseMap, StyleSpecification> = {
  satellite: {
    version: 8,
    sources: {
      esri: {
        type: "raster",
        tiles: [
          "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}",
        ],
        tileSize: 256,
        attribution: "© Esri World Imagery",
      },
    },
    glyphs: "https://fonts.openmaptiles.org/{fontstack}/{range}.pbf",
    layers: [{ id: "esri", type: "raster", source: "esri" }],
  },
  light: {
    version: 8,
    sources: {
      carto: {
        type: "raster",
        tiles: [
          "https://a.basemaps.cartocdn.com/light_all/{z}/{x}/{y}.png",
          "https://b.basemaps.cartocdn.com/light_all/{z}/{x}/{y}.png",
          "https://c.basemaps.cartocdn.com/light_all/{z}/{x}/{y}.png",
        ],
        tileSize: 256,
        attribution: "© CARTO © OpenStreetMap contributors",
      },
    },
    glyphs: "https://fonts.openmaptiles.org/{fontstack}/{range}.pbf",
    layers: [{ id: "carto", type: "raster", source: "carto" }],
  },
  dark: {
    version: 8,
    sources: {
      carto: {
        type: "raster",
        tiles: [
          "https://a.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}.png",
          "https://b.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}.png",
          "https://c.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}.png",
        ],
        tileSize: 256,
        attribution: "© CARTO © OpenStreetMap contributors",
      },
    },
    glyphs: "https://fonts.openmaptiles.org/{fontstack}/{range}.pbf",
    layers: [{ id: "carto", type: "raster", source: "carto" }],
  },
};

const PALETTE: Record<Theme, {
  bg: string;
  text: string;
  textDim: string;
  border: string;
  borderSubtle: string;
  headerShadow: string;
}> = {
  light: {
    bg: "#FFFFFF",
    text: "#1A1A2E",
    textDim: "#8892a0",
    border: "#E5E5E5",
    borderSubtle: "#F0F0F0",
    headerShadow: "0 2px 12px rgba(0,0,0,0.08)",
  },
  dark: {
    bg: "#0A1628",
    text: "#E8E0D0",
    textDim: "#7a8a9c",
    border: "#1E3A5F",
    borderSubtle: "#152840",
    headerShadow: "0 2px 12px rgba(0,0,0,0.6)",
  },
};

const GOLD = "#C8A96E";
const COMMUNITIES_SRC = "communities";
const COMMUNITIES_LINE = "communities-line";
const COMMUNITIES_FILL = "communities-fill"; // invisible, only for hit-testing
// District-name centroid labels — derived client-side from the same
// /api/layers/communities GeoJSON polygon source. Symbol layer renders
// at zoom ≥ 11 so city-level overviews stay clean. Added 2026-05-24
// (founder map UI cleanup); toggled via layers.districtNames.
const DISTRICT_NAMES_SRC = "district-names-src";
const DISTRICT_NAMES_LAYER = "district-names-labels";
const ROADS_SRC = "roads";
const ROADS_LINE = "roads-line";
const METRO_SRC = "metro";
const METRO_LINE = "metro-line";
// Amenities — data.dubai point overlays (icon symbol layers).
const EV_CHARGERS_SRC = "ev-chargers";
const EV_CHARGERS_SYMBOL = "ev-chargers-symbol";
const METRO_STATIONS_SRC = "metro-stations";
const METRO_STATIONS_SYMBOL = "metro-stations-symbol";
const TRAM_STATIONS_SRC = "tram-stations";
const TRAM_STATIONS_SYMBOL = "tram-stations-symbol";
const MARINE_STATIONS_SRC = "marine-stations";
const MARINE_STATIONS_SYMBOL = "marine-stations-symbol";
// Saudi Governorates layer removed 2026-05-24 (founder spec — no
// Saudi coverage on the platform). Same removal pass dropped the
// Riyadh Zones masterplan, the Oman PMTiles, and the per-country
// LayersState flags. data/layers/governorate.kml stays on disk per
// CLAUDE.md's "NEVER delete data/" rule but is no longer served.
// Riyadh Zones layer removed 2026-05-24 — see Saudi Governorates
// comment above. data/layers/zones_masterplan.kml stays on disk.
const AD_MUN_SRC = "ad-municipalities";
const AD_MUN_LINE = "ad-municipalities-line";
const AD_MUN_FILL = "ad-municipalities-fill";
const AD_DIST_SRC = "ad-districts";
const AD_DIST_LINE = "ad-districts-line";
const AD_DIST_FILL = "ad-districts-fill";
const AD_COMM_SRC = "ad-communities";
const AD_COMM_LINE = "ad-communities-line";
const AD_COMM_FILL = "ad-communities-fill";
const UAE_DIST_SRC = "uae-districts";
const UAE_DIST_LINE = "uae-districts-line";
const UAE_DIST_FILL = "uae-districts-fill";
const DDA_PROJ_SRC = "dda-projects";
const DDA_PROJ_LINE = "dda-projects-line";
const DDA_PROJ_FILL = "dda-projects-fill";
const DDA_FZ_SRC = "dda-freezones";
const DDA_FZ_LINE = "dda-freezones-line";
const DDA_FZ_FILL = "dda-freezones-fill";
const ISLANDS_SRC = "dubai-islands";
const ISLANDS_LINE = "dubai-islands-line";
const MEYDAN_SRC = "meydan-horizon";
const MEYDAN_LINE = "meydan-horizon-line";
const FURJAN_SRC = "al-furjan";
const FURJAN_LINE = "al-furjan-line";
const IC23_SRC = "intl-city-23";
const IC23_LINE = "intl-city-23-line";
const RES12_SRC = "residential-12";
const RES12_LINE = "residential-12-line";
const D11_SRC = "d11-parcel-ld";
const D11_LINE = "d11-parcel-ld-line";
const NAD_AL_HAMMER_SRC = "nad-al-hammer";
const NAD_AL_HAMMER_LINE = "nad-al-hammer-line";
const DUBAI_HILLS_SRC = "dda-dubai-hills";
const DUBAI_HILLS_LINE = "dda-dubai-hills-line";
const DAMAC_HILLS_2_SRC = "dda-damac-hills-2";
const DAMAC_HILLS_2_LINE = "dda-damac-hills-2-line";
const DAMAC_LAGOONS_SRC = "dda-damac-lagoons";
const DAMAC_LAGOONS_LINE = "dda-damac-lagoons-line";
const DAMAC_ISLANDS_SRC = "dda-damac-islands";
const DAMAC_ISLANDS_LINE = "dda-damac-islands-line";
const THE_VALLEY_SRC = "dda-the-valley";
const THE_VALLEY_LINE = "dda-the-valley-line";
const DAMAC_HILLS_SRC = "dda-damac-hills";
const DAMAC_HILLS_LINE = "dda-damac-hills-line";
const MUDON_SRC = "dda-mudon";
const MUDON_LINE = "dda-mudon-line";
const JABEL_ALI_HILLS_SRC = "dda-jabel-ali-hills";
const JABEL_ALI_HILLS_LINE = "dda-jabel-ali-hills-line";
const ARABIAN_RANCHES_1_SRC = "dda-arabian-ranches-1";
const ARABIAN_RANCHES_1_LINE = "dda-arabian-ranches-1-line";
const NAS_GARDENS_SRC = "dda-nad-al-sheba-gardens";
const NAS_GARDENS_LINE = "dda-nad-al-sheba-gardens-line";
const DSP_SRC = "dda-dubai-science-park";
const DSP_LINE = "dda-dubai-science-park-line";
const BUSINESS_BAY_SRC = "dda-business-bay";
const BUSINESS_BAY_LINE = "dda-business-bay-line";
const SAMA_AL_JADAF_SRC = "dda-sama-al-jadaf";
const SAMA_AL_JADAF_LINE = "dda-sama-al-jadaf-line";
const ARJAN_SRC = "dda-arjan";
const ARJAN_LINE = "dda-arjan-line";
// ── ZAAHI Plots (real listings from /api/parcels/map) ──
const ZAAHI_PLOTS_SRC = "zaahi-plots";
const ZAAHI_PLOTS_FILL = "zaahi-plots-fill";
const ZAAHI_PLOTS_LINE = "zaahi-plots-line";
const ZAAHI_PLOTS_GLOW = "zaahi-plots-glow";       // wide blurred gold halo
const ZAAHI_PLOTS_GLOW_CRISP = "zaahi-plots-glow-crisp"; // crisp pulsing gold outline
const ZAAHI_BUILDINGS_SRC = "zaahi-plots-buildings";
const ZAAHI_BUILDINGS_3D = "zaahi-plots-buildings-3d";

// ── 3D hero buildings — registry-driven (heroBuildingsRegistry.ts)
// 21 hero GLBs, default coords/orientation/size live in the registry.
// Founder tunes via ?dev=1 + click any hero → HeroBuildingsDevPanel
// → "Copy Config" → paste back into heroBuildingsRegistry.ts.

// ── Private Plot Vault — Phase 3 unified rendering (2026-05-30) ──
// Caller's own VAULT_PRIVATE plots flow through the standard ZAAHI
// listing layers (same source `ZAAHI_PLOTS_SRC`, same fill-extrusion
// layer `ZAAHI_BUILDINGS_3D`, opacity 1, land-use colour). Each feature
// carries `properties.isVault` so the click handler can route to
// VaultSidePanelAdapter instead of the standard SidePanel.
//
// VAULT_SHARED_3D (entries shared TO the caller by other users) still
// rides its own source/layer — it's a different access path and stays
// untouched here.
//
// Conflict-marker dots ride on the unified ZAAHI source with
// `isVault && conflictsWithOthers` filter.
const VAULT_SHARED_SRC = "vault-shared-buildings";
const VAULT_SHARED_3D = "vault-shared-buildings-3d";
const VAULT_CONFLICT_MARKERS_LAYER = "vault-conflict-markers";
// Land-use legend — APPROVED by founder 2026-04-11. NEVER change without
// explicit founder approval. 9 canonical categories. The exact same set
// is duplicated in three other places that MUST stay in sync:
//   - the inline `buildingColor` match expression in loadZaahiPlots
//     (drives the 3D fill-extrusion + outline)
//   - LANDUSE_COLORS in src/app/parcels/map/SidePanel.tsx
//     (the indicator dot in the side-panel land-use list)
//   - LAND_USE_LEGEND in this file (the visible legend popup)
// Source-of-truth in CLAUDE.md "Цвета по Land Use".
const ZAAHI_LANDUSE_COLOR: Record<string, string> = {
  RESIDENTIAL: "#2D6A4F",         // green
  COMMERCIAL: "#1B4965",          // blue
  MIXED_USE: "#6B4C9A",           // purple
  HOTEL: "#9B2226",               // red
  HOSPITALITY: "#9B2226",         // red (alias)
  INDUSTRIAL: "#495057",          // gray
  WAREHOUSE: "#495057",           // gray (alias)
  EDUCATIONAL: "#0077B6",         // sky blue
  EDUCATION: "#0077B6",           // sky blue (alias)
  HEALTHCARE: "#E63946",          // bright red
  AGRICULTURAL: "#606C38",        // olive
  AGRICULTURE: "#606C38",         // olive (alias)
  FUTURE_DEVELOPMENT: "#A8926E",  // sandstone (warm earth · distinct from gold brand colour)
  "FUTURE DEVELOPMENT": "#A8926E",
};
const ZAAHI_DEFAULT_COLOR = "#C8A96E"; // brand gold — used for the outline of unknown-land-use plots only

// Apply / clear selection highlight on the ZAAHI plot + building layers.
function applySelectionPaint(map: MLMap, selectedId: string | null) {
  if (!map.getLayer(ZAAHI_PLOTS_FILL)) return;
  const sel = selectedId ?? "__none__";
  // Plot fill: bright on selected, dim on others when selection is
  // active. Outline-only parcels (hasLandUse === false) ALWAYS render
  // with fill-opacity 0 — selection state must not give them a fill.
  if (selectedId) {
    map.setPaintProperty(ZAAHI_PLOTS_FILL, "fill-opacity", [
      "case",
      ["!=", ["get", "hasLandUse"], true], 0,
      ["==", ["get", "id"], sel], 0.85,
      0.08,
    ]);
  } else {
    map.setPaintProperty(ZAAHI_PLOTS_FILL, "fill-opacity", [
      "case",
      ["==", ["get", "hasLandUse"], true], 0.4,
      0,
    ]);
  }
  // Outline: thick + fully opaque on selected, thin + dim elsewhere so
  // neighbours recede visually.
  if (map.getLayer(ZAAHI_PLOTS_LINE)) {
    if (selectedId) {
      map.setPaintProperty(ZAAHI_PLOTS_LINE, "line-width", [
        "case", ["==", ["get", "id"], sel], 4, 1,
      ]);
      map.setPaintProperty(ZAAHI_PLOTS_LINE, "line-opacity", [
        "case", ["==", ["get", "id"], sel], 1, 0.35,
      ]);
    } else {
      map.setPaintProperty(ZAAHI_PLOTS_LINE, "line-width", 2);
      map.setPaintProperty(ZAAHI_PLOTS_LINE, "line-opacity", 1);
    }
  }
  // Glow filters
  if (map.getLayer(ZAAHI_PLOTS_GLOW)) {
    map.setFilter(ZAAHI_PLOTS_GLOW, ["==", ["id"], sel]);
  }
  if (map.getLayer(ZAAHI_PLOTS_GLOW_CRISP)) {
    map.setFilter(ZAAHI_PLOTS_GLOW_CRISP, ["==", ["id"], sel]);
  }
  // 3D buildings: selected stays in its canonical land-use color, the
  // rest shift to grey so the Signature model is clearly the brightest
  // thing on screen. The 3D features carry `parcelId` (not `id`).
  // `fill-extrusion-color` accepts data expressions (unlike -opacity).
  if (map.getLayer(ZAAHI_BUILDINGS_3D)) {
    if (selectedId) {
      map.setPaintProperty(ZAAHI_BUILDINGS_3D, "fill-extrusion-color", [
        "case",
        ["==", ["get", "parcelId"], sel], ["get", "color"],
        "#7a7a7a",
      ]);
    } else {
      map.setPaintProperty(ZAAHI_BUILDINGS_3D, "fill-extrusion-color", ["get", "color"]);
    }
  }
}

/**
 * Maps a DDA affection-plan landUseMix (or a free-form mainLandUse string)
 * into one of the 9 ZAAHI canonical categories. Returns `null` when DDA
 * has no land-use information at all — callers should render the parcel
 * as outline-only with no 3D extrusion in that case.
 *
 * Categories (founder-approved 2026-04-11):
 *   RESIDENTIAL · COMMERCIAL · MIXED_USE · HOTEL · INDUSTRIAL ·
 *   EDUCATIONAL · HEALTHCARE · AGRICULTURAL · FUTURE_DEVELOPMENT
 *
 * Mapping is case-insensitive `contains` against category + sub strings.
 * Multiple distinct categories in `mix` always collapse to MIXED_USE.
 */
function deriveLandUse(
  mix: Array<{ category: string; sub?: string | null }> | null | undefined,
): string | null {
  if (!mix || mix.length === 0) return null;

  // Map a single string to one of the 9 canonical categories.
  const categorize = (s: string): string | null => {
    const l = s.toLowerCase();
    if (/residential|villa|townhouse|\bapartment\b/.test(l)) return "RESIDENTIAL";
    if (/commercial|office|retail|showroom|\bcbd\b/.test(l)) return "COMMERCIAL";
    if (/hotel|hospitality|resort|serviced\s*apartment/.test(l)) return "HOTEL";
    if (/industrial|warehouse|factory|logistics|storage/.test(l)) return "INDUSTRIAL";
    if (/educat|school|university|academy|nursery/.test(l)) return "EDUCATIONAL";
    if (/health|hospital|clinic|medical/.test(l)) return "HEALTHCARE";
    if (/agricult|\bfarm\b/.test(l)) return "AGRICULTURAL";
    if (/future\s*development/.test(l)) return "FUTURE_DEVELOPMENT";
    return null;
  };

  // Step 1: For each entry, determine its mapped category from category + sub.
  const uniqueCats = new Set<string>();
  for (const u of mix) {
    const fromCat = categorize(u.category || "");
    const fromSub = categorize(u.sub || "");
    if (fromCat) uniqueCats.add(fromCat);
    if (fromSub) uniqueCats.add(fromSub);
  }

  // Step 2: 2+ different mapped categories → Mixed Use.
  if (uniqueCats.size > 1) return "MIXED_USE";

  // Step 3: Exactly 1 category → return it.
  if (uniqueCats.size === 1) return [...uniqueCats][0];

  return null;
}

const DHCC2_SRC = "dda-dhcc-phase2";
const DHCC2_LINE = "dda-dhcc-phase2-line";
const BARSHA_HEIGHTS_SRC = "dda-barsha-heights";
const BARSHA_HEIGHTS_LINE = "dda-barsha-heights-line";
const BARSHA_HEIGHTS_FILL = "dda-barsha-heights-fill";
const DIFC_ZABEEL_SRC = "dda-difc-zabeel";
const DIFC_ZABEEL_LINE = "dda-difc-zabeel-line";
const DIFC_ZABEEL_FILL = "dda-difc-zabeel-fill";
const JADDAF_WF_SRC = "dda-jaddaf-waterfront";
const JADDAF_WF_LINE = "dda-jaddaf-waterfront-line";
const JADDAF_WF_FILL = "dda-jaddaf-waterfront-fill";
const DHCC1_SRC = "dda-dhcc-phase1";
const DHCC1_LINE = "dda-dhcc-phase1-line";
const DHCC1_FILL = "dda-dhcc-phase1-fill";
const DIFC_SRC = "dda-difc";
const DIFC_LINE = "dda-difc-line";
const DIFC_FILL = "dda-difc-fill";
const TILAL_AL_GHAF_SRC = "dda-tilal-al-ghaf";
const TILAL_AL_GHAF_LINE = "dda-tilal-al-ghaf-line";
const TILAL_AL_GHAF_FILL = "dda-tilal-al-ghaf-fill";
const AR2_SRC = "dda-arabian-ranches-2";
const AR2_LINE = "dda-arabian-ranches-2-line";
const AR2_FILL = "dda-arabian-ranches-2-fill";
const THE_VILLA_SRC = "dda-the-villa";
const THE_VILLA_LINE = "dda-the-villa-line";
const THE_VILLA_FILL = "dda-the-villa-fill";
const AR3_SRC = "dda-arabian-ranches-3";
const AR3_LINE = "dda-arabian-ranches-3-line";
const AR3_FILL = "dda-arabian-ranches-3-fill";
const DSC_SRC = "dda-dubai-sports-city";
const DSC_LINE = "dda-dubai-sports-city-line";
const DSC_FILL = "dda-dubai-sports-city-fill";
const VILLANOVA_SRC = "dda-villanova";
const VILLANOVA_LINE = "dda-villanova-line";
const VILLANOVA_FILL = "dda-villanova-fill";
const ACRES_SRC = "dda-the-acres";
const ACRES_LINE = "dda-the-acres-line";
const ACRES_FILL = "dda-the-acres-fill";
const FALCON_SRC = "dda-falcon-city";
const FALCON_LINE = "dda-falcon-city-line";
const FALCON_FILL = "dda-falcon-city-fill";
const AL_ARYAM_SRC = "dda-al-aryam";
const AL_ARYAM_LINE = "dda-al-aryam-line";
const AL_ARYAM_FILL = "dda-al-aryam-fill";
const DIC_SRC = "dda-dubai-industrial-city";
const DIC_LINE = "dda-dubai-industrial-city-line";
const DIC_FILL = "dda-dubai-industrial-city-fill";
const DI2_SRC = "dda-damac-islands-2";
const DI2_LINE = "dda-damac-islands-2-line";
const DI2_FILL = "dda-damac-islands-2-fill";
const WILDS_SRC = "dda-wilds";
const WILDS_LINE = "dda-wilds-line";
const WILDS_FILL = "dda-wilds-fill";
const TOWN_SQ_SRC = "dda-town-square";
const TOWN_SQ_LINE = "dda-town-square-line";
const TOWN_SQ_FILL = "dda-town-square-fill";
const ATHLON_SRC = "dda-athlon";
const ATHLON_LINE = "dda-athlon-line";
const ATHLON_FILL = "dda-athlon-fill";
const CHERRY_SRC = "dda-cherrywoods";
const CHERRY_LINE = "dda-cherrywoods-line";
const CHERRY_FILL = "dda-cherrywoods-fill";
const PORTOFINO_SRC = "dda-portofino";
const PORTOFINO_LINE = "dda-portofino-line";
const PORTOFINO_FILL = "dda-portofino-fill";
const HAVEN_SRC = "dda-haven";
const HAVEN_LINE = "dda-haven-line";
const HAVEN_FILL = "dda-haven-fill";
const AL_BARARI_SRC = "dda-al-barari";
const AL_BARARI_LINE = "dda-al-barari-line";
const AL_BARARI_FILL = "dda-al-barari-fill";
const JAI_SRC = "dda-jabal-ali-industrial";
const JAI_LINE = "dda-jabal-ali-industrial-line";
const JAI_FILL = "dda-jabal-ali-industrial-fill";
const LL_SRC = "dda-living-legends";
const LL_LINE = "dda-living-legends-line";
const LL_FILL = "dda-living-legends-fill";
const SHOROOQ_SRC = "dda-shorooq";
const SHOROOQ_LINE = "dda-shorooq-line";
const SHOROOQ_FILL = "dda-shorooq-fill";
const COA_SRC = "dda-city-of-arabia";
const COA_LINE = "dda-city-of-arabia-line";
const COA_FILL = "dda-city-of-arabia-fill";
const SERENA_SRC = "dda-serena";
const SERENA_LINE = "dda-serena-line";
const SERENA_FILL = "dda-serena-fill";
const DCH_SRC = "dda-dubai-creek-harbour";
const DCH_LINE = "dda-dubai-creek-harbour-line";
const DCH_FILL = "dda-dubai-creek-harbour-fill";
const DPC_SRC = "dda-dubai-production-city";
const DPC_LINE = "dda-dubai-production-city-line";
const DPC_FILL = "dda-dubai-production-city-fill";
const SOBHA_R_SRC = "dda-sobha-reserve";
const SOBHA_R_LINE = "dda-sobha-reserve-line";
const SOBHA_R_FILL = "dda-sobha-reserve-fill";
const JGC_SRC = "dda-jumeirah-garden-city";
const JGC_LINE = "dda-jumeirah-garden-city-line";
const JGC_FILL = "dda-jumeirah-garden-city-fill";
const SOBHA_E_SRC = "dda-sobha-elwood";
const SOBHA_E_LINE = "dda-sobha-elwood-line";
const SOBHA_E_FILL = "dda-sobha-elwood-fill";
const DLRC_SRC = "dda-dlrc";
const DLRC_LINE = "dda-dlrc-line";
const DLRC_FILL = "dda-dlrc-fill";
const PEARL_J_SRC = "dda-pearl-jumeira";
const PEARL_J_LINE = "dda-pearl-jumeira-line";
const PEARL_J_FILL = "dda-pearl-jumeira-fill";
const KHAWANEEJ_SRC = "dda-al-khawaneej";
const KHAWANEEJ_LINE = "dda-al-khawaneej-line";
const KHAWANEEJ_FILL = "dda-al-khawaneej-fill";
const MAJAN_SRC = "dda-majan";
const MAJAN_LINE = "dda-majan-line";
const MAJAN_FILL = "dda-majan-fill";
const LA_MER_SRC = "dda-la-mer";
const LA_MER_LINE = "dda-la-mer-line";
const LA_MER_FILL = "dda-la-mer-fill";
const DUBAI_LAND_SRC = "dda-dubai-land";
const DUBAI_LAND_LINE = "dda-dubai-land-line";
const DUBAI_LAND_FILL = "dda-dubai-land-fill";
const DGC_SRC = "dda-dubai-golf-city";
const DGC_LINE = "dda-dubai-golf-city-line";
const DGC_FILL = "dda-dubai-golf-city-fill";
const MERAAS_UAS_SRC = "dda-meraas-umm-al-sheif";
const MERAAS_UAS_LINE = "dda-meraas-umm-al-sheif-line";
const MERAAS_UAS_FILL = "dda-meraas-umm-al-sheif-fill";
const MAMZAR_SRC = "dda-al-mamzar-front";
const MAMZAR_LINE = "dda-al-mamzar-front-line";
const MAMZAR_FILL = "dda-al-mamzar-front-fill";
const ASMARAN_SRC = "dda-asmaran";
const ASMARAN_LINE = "dda-asmaran-line";
const ASMARAN_FILL = "dda-asmaran-fill";
const JBAY_SRC = "dda-jumeirah-bay";
const JBAY_LINE = "dda-jumeirah-bay-line";
const JBAY_FILL = "dda-jumeirah-bay-fill";
const REPORTAGE_SRC = "dda-reportage-village";
const REPORTAGE_LINE = "dda-reportage-village-line";
const REPORTAGE_FILL = "dda-reportage-village-fill";
const LIWAN_SRC = "dda-liwan";
const LIWAN_LINE = "dda-liwan-line";
const LIWAN_FILL = "dda-liwan-fill";
const DSTUDIO_SRC = "dda-dubai-studio-city";
const DSTUDIO_LINE = "dda-dubai-studio-city-line";
const DSTUDIO_FILL = "dda-dubai-studio-city-fill";
const LIWAN2_SRC = "dda-liwan-2";
const LIWAN2_LINE = "dda-liwan-2-line";
const LIWAN2_FILL = "dda-liwan-2-fill";
const NAIA_SRC = "dda-naia-island";
const NAIA_LINE = "dda-naia-island-line";
const NAIA_FILL = "dda-naia-island-fill";
const ARDH_SRC = "dda-ardh-community";
const ARDH_LINE = "dda-ardh-community-line";
const ARDH_FILL = "dda-ardh-community-fill";
const TIJARA_SRC = "dda-tijara-town";
const TIJARA_LINE = "dda-tijara-town-line";
const TIJARA_FILL = "dda-tijara-town-fill";
const WARSAN_SRC = "dda-warsan-first";
const WARSAN_LINE = "dda-warsan-first-line";
const WARSAN_FILL = "dda-warsan-first-fill";
const MERAAS_MIRDIF_SRC = "dda-meraas-mirdif";
const MERAAS_MIRDIF_LINE = "dda-meraas-mirdif-line";
const MERAAS_MIRDIF_FILL = "dda-meraas-mirdif-fill";
const HABTOOR_SRC = "dda-al-habtoor-polo";
const HABTOOR_LINE = "dda-al-habtoor-polo-line";
const HABTOOR_FILL = "dda-al-habtoor-polo-fill";
const MERAAS_UMA_SRC = "dda-meraas-umm-amaraa";
const MERAAS_UMA_LINE = "dda-meraas-umm-amaraa-line";
const MERAAS_UMA_FILL = "dda-meraas-umm-amaraa-fill";
const D3_DDA_SRC = "dda-d3";
const D3_DDA_LINE = "dda-d3-line";
const D3_DDA_FILL = "dda-d3-fill";
const KHAIL_SRC = "dda-al-khail-gate";
const KHAIL_LINE = "dda-al-khail-gate-line";
const KHAIL_FILL = "dda-al-khail-gate-fill";
const SITE_A_SRC = "dda-site-a";
const SITE_A_LINE = "dda-site-a-line";
const SITE_A_FILL = "dda-site-a-fill";
const RUKAN_SRC = "dda-rukan";
const RUKAN_LINE = "dda-rukan-line";
const RUKAN_FILL = "dda-rukan-fill";
const CALI_SRC = "dda-california-residence";
const CALI_LINE = "dda-california-residence-line";
const CALI_FILL = "dda-california-residence-fill";
const MERAAS_NAH_SRC = "dda-meraas-nadd-al-hamar";
const MERAAS_NAH_LINE = "dda-meraas-nadd-al-hamar-line";
const MERAAS_NAH_FILL = "dda-meraas-nadd-al-hamar-fill";
const PALMAROSA_SRC = "dda-palmarosa";
const PALMAROSA_LINE = "dda-palmarosa-line";
const PALMAROSA_FILL = "dda-palmarosa-fill";
const DIAC_SRC = "dda-diac";
const DIAC_LINE = "dda-diac-line";
const DIAC_FILL = "dda-diac-fill";
const WAHA_SRC = "dda-al-waha";
const WAHA_LINE = "dda-al-waha-line";
const WAHA_FILL = "dda-al-waha-fill";
const HARBOUR_SRC = "dda-dubai-harbour";
const HARBOUR_LINE = "dda-dubai-harbour-line";
const HARBOUR_FILL = "dda-dubai-harbour-fill";
const KLABOUR_SRC = "dda-khawaneej-labour";
const KLABOUR_LINE = "dda-khawaneej-labour-line";
const KLABOUR_FILL = "dda-khawaneej-labour-fill";
const WIND_SRC = "dda-warsan-industrial";
const WIND_LINE = "dda-warsan-industrial-line";
const WIND_FILL = "dda-warsan-industrial-fill";
const DLC_SRC = "dda-dubai-lifestyle-city";
const DLC_LINE = "dda-dubai-lifestyle-city-line";
const DLC_FILL = "dda-dubai-lifestyle-city-fill";
const SUFOUH_SRC = "dda-sufouh-gardens";
const SUFOUH_LINE = "dda-sufouh-gardens-line";
const SUFOUH_FILL = "dda-sufouh-gardens-fill";
const MOTOR_SRC = "dda-motor-city";
const MOTOR_LINE = "dda-motor-city-line";
const MOTOR_FILL = "dda-motor-city-fill";
const TAOR1_SRC = "dda-taormina-1";
const TAOR1_LINE = "dda-taormina-1-line";
const TAOR1_FILL = "dda-taormina-1-fill";
const DPARKS_SRC = "dda-dubai-parks";
const DPARKS_LINE = "dda-dubai-parks-line";
const DPARKS_FILL = "dda-dubai-parks-fill";
const CWALK_SRC = "dda-city-walk";
const CWALK_LINE = "dda-city-walk-line";
const CWALK_FILL = "dda-city-walk-fill";
const ARPOLO_SRC = "dda-ar-polo";
const ARPOLO_LINE = "dda-ar-polo-line";
const ARPOLO_FILL = "dda-ar-polo-fill";
const BARSHA3_SRC = "dda-barsha-third";
const BARSHA3_LINE = "dda-barsha-third-line";
const BARSHA3_FILL = "dda-barsha-third-fill";
const MERAAS_B2_SRC = "dda-meraas-barsha-2";
const MERAAS_B2_LINE = "dda-meraas-barsha-2-line";
const MERAAS_B2_FILL = "dda-meraas-barsha-2-fill";
const DOC_SRC = "dda-dubai-outsource-city";
const DOC_LINE = "dda-dubai-outsource-city-line";
const DOC_FILL = "dda-dubai-outsource-city-fill";
const BURJ_SRC = "dda-burj-khalifa";
const BURJ_LINE = "dda-burj-khalifa-line";
const BURJ_FILL = "dda-burj-khalifa-fill";
const GHAF_SRC = "dda-ghaf-woods";
const GHAF_LINE = "dda-ghaf-woods-line";
const GHAF_FILL = "dda-ghaf-woods-fill";
const TAOR2_SRC = "dda-taormina-2";
const TAOR2_LINE = "dda-taormina-2-line";
const TAOR2_FILL = "dda-taormina-2-fill";
const BIANCA_SRC = "dda-bianca";
const BIANCA_LINE = "dda-bianca-line";
const BIANCA_FILL = "dda-bianca-fill";
const MJL_SRC = "dda-mjl";
const MJL_LINE = "dda-mjl-line";
const MJL_FILL = "dda-mjl-fill";
const DHK1_SRC = "dda-dh-khawaneej-1";
const DHK1_LINE = "dda-dh-khawaneej-1-line";
const DHK1_FILL = "dda-dh-khawaneej-1-fill";
const REMRAAM_SRC = "dda-remraam";
const REMRAAM_LINE = "dda-remraam-line";
const REMRAAM_FILL = "dda-remraam-fill";
const ECHO_SRC = "dda-echo-plex";
const ECHO_LINE = "dda-echo-plex-line";
const ECHO_FILL = "dda-echo-plex-fill";
const SUSCITY_SRC = "dda-sustainable-city";
const SUSCITY_LINE = "dda-sustainable-city-line";
const SUSCITY_FILL = "dda-sustainable-city-fill";
const JBR_SRC = "dda-jbr";
const JBR_LINE = "dda-jbr-line";
const JBR_FILL = "dda-jbr-fill";
const GHOROOB_SRC = "dda-ghoroob";
const GHOROOB_LINE = "dda-ghoroob-line";
const GHOROOB_FILL = "dda-ghoroob-fill";
const DPB3_SRC = "dda-dp-barsha-south-3";
const DPB3_LINE = "dda-dp-barsha-south-3-line";
const DPB3_FILL = "dda-dp-barsha-south-3-fill";
const MARSA_SRC = "dda-marsa-al-arab";
const MARSA_LINE = "dda-marsa-al-arab-line";
const MARSA_FILL = "dda-marsa-al-arab-fill";
const BLUE_SRC = "dda-bluewaters";
const BLUE_LINE = "dda-bluewaters-line";
const BLUE_FILL = "dda-bluewaters-fill";
const SITE_D_SRC = "dda-site-d";
const SITE_D_LINE = "dda-site-d-line";
const SITE_D_FILL = "dda-site-d-fill";
const KHEIGHTS_SRC = "dda-khail-heights";
const KHEIGHTS_LINE = "dda-khail-heights-line";
const KHEIGHTS_FILL = "dda-khail-heights-fill";
const MERAAS_UAD_SRC = "dda-meraas-umm-al-daman";
const MERAAS_UAD_LINE = "dda-meraas-umm-al-daman-line";
const MERAAS_UAD_FILL = "dda-meraas-umm-al-daman-fill";
const DLAND673_SRC = "dda-dubai-land-673";
const DLAND673_LINE = "dda-dubai-land-673-line";
const DLAND673_FILL = "dda-dubai-land-673-fill";
const SHAMAL_Y1_SRC = "dda-shamal-yalayis-1";
const SHAMAL_Y1_LINE = "dda-shamal-yalayis-1-line";
const SHAMAL_Y1_FILL = "dda-shamal-yalayis-1-fill";
const TECOM_Q2_SRC = "dda-tecom-qouz-2";
const TECOM_Q2_LINE = "dda-tecom-qouz-2-line";
const TECOM_Q2_FILL = "dda-tecom-qouz-2-fill";
const GV_SRC = "dda-global-village";
const GV_LINE = "dda-global-village-line";
const GV_FILL = "dda-global-village-fill";
const LAYAN_SRC = "dda-layan";
const LAYAN_LINE = "dda-layan-line";
const LAYAN_FILL = "dda-layan-fill";
const DPGMBR_SRC = "dda-dpg-mbr";
const DPGMBR_LINE = "dda-dpg-mbr-line";
const DPGMBR_FILL = "dda-dpg-mbr-fill";
const DWC_SRC = "dda-dwc";
const DWC_LINE = "dda-dwc-line";
const DWC_FILL = "dda-dwc-fill";
const LQUOZ_SRC = "dda-labour-quoz";
const LQUOZ_LINE = "dda-labour-quoz-line";
const LQUOZ_FILL = "dda-labour-quoz-fill";
const SCHFZ_SRC = "dda-schools-fz";
const SCHFZ_LINE = "dda-schools-fz-line";
const SCHFZ_FILL = "dda-schools-fz-fill";
const DWCNFZ_SRC = "dda-dwc-nfz";
const DWCNFZ_LINE = "dda-dwc-nfz-line";
const DWCNFZ_FILL = "dda-dwc-nfz-fill";
const SHAMAL_JAI1_SRC = "dda-shamal-jai-1";
const SHAMAL_JAI1_LINE = "dda-shamal-jai-1-line";
const SHAMAL_JAI1_FILL = "dda-shamal-jai-1-fill";
const JAI_STAFF_SRC = "dda-jai-staff";
const JAI_STAFF_LINE = "dda-jai-staff-line";
const JAI_STAFF_FILL = "dda-jai-staff-fill";
const SHAMAL_TC2_SRC = "dda-shamal-tc-2";
const SHAMAL_TC2_LINE = "dda-shamal-tc-2-line";
const SHAMAL_TC2_FILL = "dda-shamal-tc-2-fill";
const NUZUL_SRC = "dda-nuzul";
const NUZUL_LINE = "dda-nuzul-line";
const NUZUL_FILL = "dda-nuzul-fill";
const KOA_SRC = "dda-koa";
const KOA_LINE = "dda-koa-line";
const KOA_FILL = "dda-koa-fill";
const SOBHA_S_SRC = "dda-sobha-sanctuary";
const SOBHA_S_LINE = "dda-sobha-sanctuary-line";
const SOBHA_S_FILL = "dda-sobha-sanctuary-fill";
const BOX_SRC = "dda-boxpark";
const BOX_LINE = "dda-boxpark-line";
const BOX_FILL = "dda-boxpark-fill";
const SHAMAL_NAS1_SRC = "dda-shamal-nas-1";
const SHAMAL_NAS1_LINE = "dda-shamal-nas-1-line";
const SHAMAL_NAS1_FILL = "dda-shamal-nas-1-fill";
const LASTEXIT_SRC = "dda-last-exit";
const LASTEXIT_LINE = "dda-last-exit-line";
const LASTEXIT_FILL = "dda-last-exit-fill";
const SCARA_SRC = "dda-scaramanga";
const SCARA_LINE = "dda-scaramanga-line";
const SCARA_FILL = "dda-scaramanga-fill";
const MERAAS_W3_SRC = "dda-meraas-warqa-3";
const MERAAS_W3_LINE = "dda-meraas-warqa-3-line";
const MERAAS_W3_FILL = "dda-meraas-warqa-3-fill";
const JCENTRAL_SRC = "dda-jumeirah-central";
const JCENTRAL_LINE = "dda-jumeirah-central-line";
const JCENTRAL_FILL = "dda-jumeirah-central-fill";
const OASIS_SRC = "dda-oasis-village";
const OASIS_LINE = "dda-oasis-village-line";
const OASIS_FILL = "dda-oasis-village-fill";
const ETD_SRC = "dda-emirates-towers";
const ETD_LINE = "dda-emirates-towers-line";
const ETD_FILL = "dda-emirates-towers-fill";
const MERAAS_Q3_SRC = "dda-meraas-quoz-3";
const MERAAS_Q3_LINE = "dda-meraas-quoz-3-line";
const MERAAS_Q3_FILL = "dda-meraas-quoz-3-fill";
const MARSA_S_SRC = "dda-marsa-alseef";
const MARSA_S_LINE = "dda-marsa-alseef-line";
const MARSA_S_FILL = "dda-marsa-alseef-fill";
const MERAAS_WAS_SRC = "dda-meraas-wadi-alshabak";
const MERAAS_WAS_LINE = "dda-meraas-wadi-alshabak-line";
const MERAAS_WAS_FILL = "dda-meraas-wadi-alshabak-fill";
const SHAMAL_B2_SRC = "dda-shamal-barsha-2";
const SHAMAL_B2_LINE = "dda-shamal-barsha-2-line";
const SHAMAL_B2_FILL = "dda-shamal-barsha-2-fill";
const SHAMAL_N2_SRC = "dda-shamal-nahda-2";
const SHAMAL_N2_LINE = "dda-shamal-nahda-2-line";
const SHAMAL_N2_FILL = "dda-shamal-nahda-2-fill";
const MERAAS_SAIH1_SRC = "dda-meraas-saih-1";
const MERAAS_SAIH1_LINE = "dda-meraas-saih-1-line";
const MERAAS_SAIH1_FILL = "dda-meraas-saih-1-fill";
const DPOL_UAD_SRC = "dda-dubai-police-uad";
const DPOL_UAD_LINE = "dda-dubai-police-uad-line";
const DPOL_UAD_FILL = "dda-dubai-police-uad-fill";
const MERAAS_RAK3_SRC = "dda-meraas-rakhor-3";
const MERAAS_RAK3_LINE = "dda-meraas-rakhor-3-line";
const MERAAS_RAK3_FILL = "dda-meraas-rakhor-3-fill";
const MERAAS_MD_SRC = "dda-meraas-marsa-dubai";
const MERAAS_MD_LINE = "dda-meraas-marsa-dubai-line";
const MERAAS_MD_FILL = "dda-meraas-marsa-dubai-fill";
const SHAMAL_HAD_SRC = "dda-shamal-hadaeq";
const SHAMAL_HAD_LINE = "dda-shamal-hadaeq-line";
const SHAMAL_HAD_FILL = "dda-shamal-hadaeq-fill";
const JBH_SRC = "dda-jbh";
const JBH_LINE = "dda-jbh-line";
const JBH_FILL = "dda-jbh-fill";
const MJUM_SRC = "dda-madinat-jumeirah";
const MJUM_LINE = "dda-madinat-jumeirah-line";
const MJUM_FILL = "dda-madinat-jumeirah-fill";
const TECOM_SAIH_SRC = "dda-tecom-saih";
const TECOM_SAIH_LINE = "dda-tecom-saih-line";
const TECOM_SAIH_FILL = "dda-tecom-saih-fill";
const CV2_SRC = "dda-culture-village-2";
const CV2_LINE = "dda-culture-village-2-line";
const CV2_FILL = "dda-culture-village-2-fill";
const MERAAS_BS2_SRC = "dda-meraas-bs-2";
const MERAAS_BS2_LINE = "dda-meraas-bs-2-line";
const MERAAS_BS2_FILL = "dda-meraas-bs-2-fill";
const SHAMAL_MUH2_SRC = "dda-shamal-muhaisanah-2";
const SHAMAL_MUH2_LINE = "dda-shamal-muhaisanah-2-line";
const SHAMAL_MUH2_FILL = "dda-shamal-muhaisanah-2-fill";
const SHAMAL_Q2_SRC = "dda-shamal-quoz-2";
const SHAMAL_Q2_LINE = "dda-shamal-quoz-2-line";
const SHAMAL_Q2_FILL = "dda-shamal-quoz-2-fill";
const CV3_SRC = "dda-culture-village-3";
const CV3_LINE = "dda-culture-village-3-line";
const CV3_FILL = "dda-culture-village-3-fill";
const MERAAS_SATWA_SRC = "dda-meraas-satwa";
const MERAAS_SATWA_LINE = "dda-meraas-satwa-line";
const MERAAS_SATWA_FILL = "dda-meraas-satwa-fill";
const SHAMAL_MAMZAR_SRC = "dda-shamal-mamzar";
const SHAMAL_MAMZAR_LINE = "dda-shamal-mamzar-line";
const SHAMAL_MAMZAR_FILL = "dda-shamal-mamzar-fill";
const SHAMAL_RAFFA_SRC = "dda-shamal-raffa";
const SHAMAL_RAFFA_LINE = "dda-shamal-raffa-line";
const SHAMAL_RAFFA_FILL = "dda-shamal-raffa-fill";
const MERAAS_MAMZAR_SRC = "dda-meraas-mamzar";
const MERAAS_MAMZAR_LINE = "dda-meraas-mamzar-line";
const MERAAS_MAMZAR_FILL = "dda-meraas-mamzar-fill";
const DH_SAFOUH1_SRC = "dda-dh-safouh-1";
const DH_SAFOUH1_LINE = "dda-dh-safouh-1-line";
const DH_SAFOUH1_FILL = "dda-dh-safouh-1-fill";
const DL_B104_SRC = "dda-dubai-land-b1-04";
const DL_B104_LINE = "dda-dubai-land-b1-04-line";
const DL_B104_FILL = "dda-dubai-land-b1-04-fill";
const DHAM_ROW1_SRC = "dda-dham-rowaiyah-1";
const DHAM_ROW1_LINE = "dda-dham-rowaiyah-1-line";
const DHAM_ROW1_FILL = "dda-dham-rowaiyah-1-fill";
const DL_B208_SRC = "dda-dubai-land-b2-08";
const DL_B208_LINE = "dda-dubai-land-b2-08-line";
const DL_B208_FILL = "dda-dubai-land-b2-08-fill";
const BEACH_SRC = "dda-the-beach";
const BEACH_LINE = "dda-the-beach-line";
const BEACH_FILL = "dda-the-beach-fill";
const SHAMAL_US3_SRC = "dda-shamal-us-3";
const SHAMAL_US3_LINE = "dda-shamal-us-3-line";
const SHAMAL_US3_FILL = "dda-shamal-us-3-fill";
const MERAAS_HEMAIRA_SRC = "dda-meraas-hemaira";
const MERAAS_HEMAIRA_LINE = "dda-meraas-hemaira-line";
const MERAAS_HEMAIRA_FILL = "dda-meraas-hemaira-fill";
const DP_QUOZ2_SRC = "dda-dp-quoz-2";
const DP_QUOZ2_LINE = "dda-dp-quoz-2-line";
const DP_QUOZ2_FILL = "dda-dp-quoz-2-fill";
const DL_B103_SRC = "dda-dubai-land-b1-03";
const DL_B103_LINE = "dda-dubai-land-b1-03-line";
const DL_B103_FILL = "dda-dubai-land-b1-03-fill";
const JG_J2_SRC = "dda-jg-jumeira-2";
const JG_J2_LINE = "dda-jg-jumeira-2-line";
const JG_J2_FILL = "dda-jg-jumeira-2-fill";
const DL_T15_SRC = "dda-dubai-land-t15";
const DL_T15_LINE = "dda-dubai-land-t15-line";
const DL_T15_FILL = "dda-dubai-land-t15-fill";
const SHAMAL_WASL_SRC = "dda-shamal-wasl";
const SHAMAL_WASL_LINE = "dda-shamal-wasl-line";
const SHAMAL_WASL_FILL = "dda-shamal-wasl-fill";
const DL_A304_SRC = "dda-dubai-land-a3-04";
const DL_A304_LINE = "dda-dubai-land-a3-04-line";
const DL_A304_FILL = "dda-dubai-land-a3-04-fill";
const EAHM_SRC = "dda-eahm";
const EAHM_LINE = "dda-eahm-line";
const EAHM_FILL = "dda-eahm-fill";
const MERAAS_ZABEEL2_SRC = "dda-meraas-zabeel-2";
const MERAAS_ZABEEL2_LINE = "dda-meraas-zabeel-2-line";
const MERAAS_ZABEEL2_FILL = "dda-meraas-zabeel-2-fill";
const MERAAS_JAFILIYA_SRC = "dda-meraas-jafiliya";
const MERAAS_JAFILIYA_LINE = "dda-meraas-jafiliya-line";
const MERAAS_JAFILIYA_FILL = "dda-meraas-jafiliya-fill";
const KITE_SRC = "dda-kite-beach";
const KITE_LINE = "dda-kite-beach-line";
const KITE_FILL = "dda-kite-beach-fill";
const MERAAS_ALAMARDI_SRC = "dda-meraas-alamardi";
const MERAAS_ALAMARDI_LINE = "dda-meraas-alamardi-line";
const MERAAS_ALAMARDI_FILL = "dda-meraas-alamardi-fill";
const MERAAS_PORTSAEED_SRC = "dda-meraas-port-saeed";
const MERAAS_PORTSAEED_LINE = "dda-meraas-port-saeed-line";
const MERAAS_PORTSAEED_FILL = "dda-meraas-port-saeed-fill";
const DL_6461281_SRC = "dda-dl-6461281";
const DL_6461281_LINE = "dda-dl-6461281-line";
const DL_6461281_FILL = "dda-dl-6461281-fill";
const SHAMAL_OUDM_SRC = "dda-shamal-oud-metha";
const SHAMAL_OUDM_LINE = "dda-shamal-oud-metha-line";
const SHAMAL_OUDM_FILL = "dda-shamal-oud-metha-fill";
const SHAMAL_Q3_SRC = "dda-shamal-quoz-3";
const SHAMAL_Q3_LINE = "dda-shamal-quoz-3-line";
const SHAMAL_Q3_FILL = "dda-shamal-quoz-3-fill";
const DL_A307_SRC = "dda-dubai-land-a3-07";
const DL_A307_LINE = "dda-dubai-land-a3-07-line";
const DL_A307_FILL = "dda-dubai-land-a3-07-fill";
const WAS3_6456408_SRC = "dda-was3-6456408";
const WAS3_6456408_LINE = "dda-was3-6456408-line";
const WAS3_6456408_FILL = "dda-was3-6456408-fill";
const SHAMAL_Q1_SRC = "dda-shamal-quoz-1";
const SHAMAL_Q1_LINE = "dda-shamal-quoz-1-line";
const SHAMAL_Q1_FILL = "dda-shamal-quoz-1-fill";
const MERAAS_NAS4_SRC = "dda-meraas-nas-4";
const MERAAS_NAS4_LINE = "dda-meraas-nas-4-line";
const MERAAS_NAS4_FILL = "dda-meraas-nas-4-fill";
const SHAMAL_MUH1_SRC = "dda-shamal-muhaisnah-1";
const SHAMAL_MUH1_LINE = "dda-shamal-muhaisnah-1-line";
const SHAMAL_MUH1_FILL = "dda-shamal-muhaisnah-1-fill";
const SHAMAL_J1_SRC = "dda-shamal-jumeira-1";
const SHAMAL_J1_LINE = "dda-shamal-jumeira-1-line";
const SHAMAL_J1_FILL = "dda-shamal-jumeira-1-fill";
const MERAAS_QUSAIS2_SRC = "dda-meraas-qusais-2";
const MERAAS_QUSAIS2_LINE = "dda-meraas-qusais-2-line";
const MERAAS_QUSAIS2_FILL = "dda-meraas-qusais-2-fill";
const SHAMAL_MAHA_SRC = "dda-shamal-maha";
const SHAMAL_MAHA_LINE = "dda-shamal-maha-line";
const SHAMAL_MAHA_FILL = "dda-shamal-maha-fill";
const LUNAYA_SRC = "dda-lunaya";
const LUNAYA_LINE = "dda-lunaya-line";
const LUNAYA_FILL = "dda-lunaya-fill";
const MERAAS_US1_SRC = "dda-meraas-us-1";
const MERAAS_US1_LINE = "dda-meraas-us-1-line";
const MERAAS_US1_FILL = "dda-meraas-us-1-fill";
const SHAMAL_NAHDA1_SRC = "dda-shamal-nahda-1";
const SHAMAL_NAHDA1_LINE = "dda-shamal-nahda-1-line";
const SHAMAL_NAHDA1_FILL = "dda-shamal-nahda-1-fill";
const SHAMAL_SAFOUH1_SRC = "dda-shamal-safouh-1";
const SHAMAL_SAFOUH1_LINE = "dda-shamal-safouh-1-line";
const SHAMAL_SAFOUH1_FILL = "dda-shamal-safouh-1-fill";
const SHAMAL_MARGHAM_SRC = "dda-shamal-margham";
const SHAMAL_MARGHAM_LINE = "dda-shamal-margham-line";
const SHAMAL_MARGHAM_FILL = "dda-shamal-margham-fill";
const WILD_WADI_SRC = "dda-wild-wadi";
const WILD_WADI_LINE = "dda-wild-wadi-line";
const WILD_WADI_FILL = "dda-wild-wadi-fill";
const MERAAS_BS1_SRC = "dda-meraas-bs-1";
const MERAAS_BS1_LINE = "dda-meraas-bs-1-line";
const MERAAS_BS1_FILL = "dda-meraas-bs-1-fill";
const DL_A409_SRC = "dda-dubai-land-a4-09";
const DL_A409_LINE = "dda-dubai-land-a4-09-line";
const DL_A409_FILL = "dda-dubai-land-a4-09-fill";
const ZABEEL1_SRC = "dda-zabeel-first";
const ZABEEL1_LINE = "dda-zabeel-first-line";
const ZABEEL1_FILL = "dda-zabeel-first-fill";
const WAS3_6454931_SRC = "dda-was3-6454931";
const WAS3_6454931_LINE = "dda-was3-6454931-line";
const WAS3_6454931_FILL = "dda-was3-6454931-fill";
const MERAAS_3460266_SRC = "dda-meraas-3460266";
const MERAAS_3460266_LINE = "dda-meraas-3460266-line";
const MERAAS_3460266_FILL = "dda-meraas-3460266-fill";
const MUSEUM_FUTURE_SRC = "dda-museum-future";
const MUSEUM_FUTURE_LINE = "dda-museum-future-line";
const MUSEUM_FUTURE_FILL = "dda-museum-future-fill";
const AL_JALILA_SRC = "dda-al-jalila";
const AL_JALILA_LINE = "dda-al-jalila-line";
const AL_JALILA_FILL = "dda-al-jalila-fill";
const DL_A102_SRC = "dda-dubai-land-a1-02";
const DL_A102_LINE = "dda-dubai-land-a1-02-line";
const DL_A102_FILL = "dda-dubai-land-a1-02-fill";
const MERAAS_WARQA2_SRC = "dda-meraas-warqa-2";
const MERAAS_WARQA2_LINE = "dda-meraas-warqa-2-line";
const MERAAS_WARQA2_FILL = "dda-meraas-warqa-2-fill";
const MERAAS_J1_SRC = "dda-meraas-jumeira-1";
const MERAAS_J1_LINE = "dda-meraas-jumeira-1-line";
const MERAAS_J1_FILL = "dda-meraas-jumeira-1-fill";
const DP_JAFILIYA_SRC = "dda-dp-jafiliya";
const DP_JAFILIYA_LINE = "dda-dp-jafiliya-line";
const DP_JAFILIYA_FILL = "dda-dp-jafiliya-fill";
const BURJ_AA_SRC = "dda-burj-al-arab";
const BURJ_AA_LINE = "dda-burj-al-arab-line";
const BURJ_AA_FILL = "dda-burj-al-arab-fill";
const SHAMAL_BS1_SRC = "dda-shamal-bs-1";
const SHAMAL_BS1_LINE = "dda-shamal-bs-1-line";
const SHAMAL_BS1_FILL = "dda-shamal-bs-1-fill";
const DPA_SRC = "dda-dubai-police-academy";
const DPA_LINE = "dda-dubai-police-academy-line";
const DPA_FILL = "dda-dubai-police-academy-fill";
const SHAMAL_MANKHOOL_SRC = "dda-shamal-mankhool";
const SHAMAL_MANKHOOL_LINE = "dda-shamal-mankhool-line";
const SHAMAL_MANKHOOL_FILL = "dda-shamal-mankhool-fill";

type LayersState = {
  communities: boolean; roads: boolean; metro: boolean;
  // Saudi Governorates / Riyadh Zones / Oman PMTiles flags removed
  // 2026-05-24 (founder spec — Saudi + Oman coverage dropped).
  adMunicipalities: boolean; adDistricts: boolean; adCommunities: boolean;
  uaeDistricts: boolean;
  ddaLandPlots: boolean; adLandPlots: boolean;
  ddaProjects: boolean; ddaFreeZones: boolean;
  // Amenities — data.dubai point overlays (off by default per spec).
  evChargers: boolean;
  metroStations: boolean; tramStations: boolean; marineStations: boolean;
  // Private Plot Vault — share-scoped overlay. "My Vault" plots
  // (owner side) are now rendered through the unified ZAAHI listing
  // layers (Phase 3, 2026-05-30) and don't need their own toggle.
  // `vaultShared` opt-in via the "Shared with me" tab. Data lives in
  // DB (Postgres), not PMTiles.
  vaultShared: boolean;
  // Plot-number labels for DDA districts (zoom > 15). Off by default;
  // user toggles via "Plot Numbers" button in the layers panel.
  plotLabels: boolean;
  // Dubai community/district name labels rendered as a client-side
  // symbol layer (centroids derived from /api/layers/communities).
  // ON by default since this is a navigation aid — see 2026-05-24
  // founder map UI cleanup. Persisted via zaahi-map-layers in
  // localStorage like every other toggle.
  districtNames: boolean;
  islands: boolean; meydan: boolean; d11: boolean;
  alFurjan: boolean; intlCity23: boolean; residential12: boolean;
  nadAlHammer: boolean;
  dubaiHills: boolean; damacHills2: boolean; damacLagoons: boolean; damacIslands: boolean;
  theValley: boolean; damacHills: boolean; mudon: boolean; jabelAliHills: boolean;
  arabianRanches1: boolean; nasGardens: boolean; dsp: boolean; businessBay: boolean;
  samaAlJadaf: boolean; arjan: boolean; dhcc2: boolean; barshaHeights: boolean;
  difcZabeel: boolean; jaddafWaterfront: boolean; dhcc1: boolean; difc: boolean;
  tilalAlGhaf: boolean; arabianRanches2: boolean; theVilla: boolean; arabianRanches3: boolean;
  dubaiSportsCity: boolean; villanova: boolean; theAcres: boolean; falconCity: boolean;
  alAryam: boolean; dubaiIndustrialCity: boolean; damacIslands2: boolean; wilds: boolean;
  townSquare: boolean; athlon: boolean; cherrywoods: boolean; portofino: boolean;
  haven: boolean; alBarari: boolean; jabalAliIndustrial: boolean; livingLegends: boolean;
  shorooq: boolean; cityOfArabia: boolean; serena: boolean; dubaiCreekHarbour: boolean;
  dubaiProductionCity: boolean; sobhaReserve: boolean; jumeirahGardenCity: boolean;
  sobhaElwood: boolean; dlrc: boolean; pearlJumeira: boolean; alKhawaneej: boolean;
  majan: boolean; laMer: boolean; dubaiLand: boolean; dubaiGolfCity: boolean;
  meraasUmmAlSheif: boolean; alMamzarFront: boolean; asmaran: boolean; jumeirahBay: boolean;
  reportageVillage: boolean; liwan: boolean; dubaiStudioCity: boolean; liwan2: boolean;
  naiaIsland: boolean; ardhCommunity: boolean; tijaraTown: boolean; warsanFirst: boolean;
  meraasMirdif: boolean; alHabtoorPolo: boolean; meraasUmmAmaraa: boolean; d3: boolean;
  alKhailGate: boolean; siteA: boolean; rukan: boolean; californiaResidence: boolean;
  meraasNaddAlHamar: boolean; palmarosa: boolean; diac: boolean; alWaha: boolean;
  dubaiHarbour: boolean; khawaneejLabour: boolean; warsanIndustrial: boolean;
  dubaiLifestyleCity: boolean; sufouhGardens: boolean; motorCity: boolean;
  taormina1: boolean; dubaiParks: boolean; cityWalk: boolean; arPolo: boolean;
  barshaThird: boolean; meraasBarsha2: boolean; dubaiOutsourceCity: boolean;
  burjKhalifa: boolean; ghafWoods: boolean; taormina2: boolean; bianca: boolean;
  mjl: boolean; dhKhawaneej1: boolean; remraam: boolean; echoPlex: boolean;
  sustainableCity: boolean; jbr: boolean; ghoroob: boolean; dpBarshaSouth3: boolean;
  marsaAlArab: boolean; bluewaters: boolean; siteD: boolean; khailHeights: boolean;
  meraasUmmAlDaman: boolean; dubaiLand673: boolean; shamalYalayis1: boolean;
  tecomQouz2: boolean; globalVillage: boolean; layan: boolean; dpgMbr: boolean;
  dwc: boolean; labourQuoz: boolean; schoolsFz: boolean; dwcNfz: boolean;
  shamalJai1: boolean; jaiStaff: boolean; shamalTc2: boolean; nuzul: boolean;
  koa: boolean; sobhaSanctuary: boolean; boxpark: boolean; shamalNas1: boolean;
  lastExit: boolean; scaramanga: boolean; meraasWarqa3: boolean; jumeirahCentral: boolean;
  oasisVillage: boolean; emiratesTowers: boolean; meraasQuoz3: boolean; marsaAlseef: boolean;
  meraasWadiAlshabak: boolean; shamalBarsha2: boolean; shamalNahda2: boolean;
  meraasSaih1: boolean; dubaiPoliceUad: boolean; meraasRakhor3: boolean;
  meraasMarsaDubai: boolean; shamalHadaeq: boolean; jbh: boolean; madinatJumeirah: boolean;
  tecomSaih: boolean; cultureVillage2: boolean; meraasBs2: boolean; shamalMuh2: boolean;
  shamalQuoz2: boolean;
  cultureVillage3: boolean;
  meraasSatwa: boolean;
  shamalMamzar: boolean;
  shamalRaffa: boolean;
  meraasMamzar: boolean;
  dhSafouh1: boolean;
  dubaiLandB104: boolean;
  dhamRowaiyah1: boolean;
  dubaiLandB208: boolean;
  theBeach: boolean;
  shamalUs3: boolean;
  meraasHemaira: boolean;
  dpQuoz2: boolean;
  dubaiLandB103: boolean;
  jgJumeira2: boolean;
  dubaiLandT15: boolean;
  shamalWasl: boolean;
  dubaiLandA304: boolean;
  eahm: boolean;
  meraasZabeel2: boolean;
  meraasJafiliya: boolean;
  kiteBeach: boolean;
  meraasAlamardi: boolean;
  meraasPortSaeed: boolean;
  dl6461281: boolean;
  shamalOudMetha: boolean;
  shamalQuoz3: boolean;
  dubaiLandA307: boolean;
  was36456408: boolean;
  shamalQuoz1: boolean;
  meraasNas4: boolean;
  shamalMuhaisnah1: boolean;
  shamalJumeira1: boolean;
  meraasQusais2: boolean;
  shamalMaha: boolean;
  lunaya: boolean;
  meraasUs1: boolean;
  shamalNahda1: boolean;
  shamalSafouh1: boolean;
  shamalMargham: boolean;
  wildWadi: boolean;
  meraasBs1: boolean;
  dubaiLandA409: boolean;
  zabeelFirst: boolean;
  was36454931: boolean;
  meraas3460266: boolean;
  museumFuture: boolean;
  alJalila: boolean;
  dubaiLandA102: boolean;
  meraasWarqa2: boolean;
  meraasJumeira1: boolean;
  dpJafiliya: boolean;
  burjAlArab: boolean;
  shamalBs1: boolean;
  dubaiPoliceAcademy: boolean;
  shamalMankhool: boolean;
};

const DDA_LAYERS: { key: keyof LayersState; srcId: string; lineId: string; label: string }[] = [
  { key: "dubaiHills",       srcId: DUBAI_HILLS_SRC,       lineId: DUBAI_HILLS_LINE,       label: "Dubai Hills" },
  { key: "damacHills2",      srcId: DAMAC_HILLS_2_SRC,     lineId: DAMAC_HILLS_2_LINE,     label: "Damac Hills 2" },
  { key: "damacLagoons",     srcId: DAMAC_LAGOONS_SRC,     lineId: DAMAC_LAGOONS_LINE,     label: "Damac Lagoons" },
  { key: "damacIslands",     srcId: DAMAC_ISLANDS_SRC,     lineId: DAMAC_ISLANDS_LINE,     label: "Damac Islands" },
  { key: "theValley",        srcId: THE_VALLEY_SRC,        lineId: THE_VALLEY_LINE,        label: "The Valley" },
  { key: "damacHills",       srcId: DAMAC_HILLS_SRC,       lineId: DAMAC_HILLS_LINE,       label: "Damac Hills" },
  { key: "mudon",            srcId: MUDON_SRC,             lineId: MUDON_LINE,             label: "Mudon" },
  { key: "jabelAliHills",    srcId: JABEL_ALI_HILLS_SRC,   lineId: JABEL_ALI_HILLS_LINE,   label: "Jabel Ali Hills" },
  { key: "arabianRanches1",  srcId: ARABIAN_RANCHES_1_SRC, lineId: ARABIAN_RANCHES_1_LINE, label: "Arabian Ranches I" },
  { key: "nasGardens",       srcId: NAS_GARDENS_SRC,       lineId: NAS_GARDENS_LINE,       label: "Nad Al Sheba Gardens" },
  { key: "dsp",              srcId: DSP_SRC,               lineId: DSP_LINE,               label: "Dubai Science Park" },
  { key: "businessBay",      srcId: BUSINESS_BAY_SRC,      lineId: BUSINESS_BAY_LINE,      label: "Business Bay" },
  { key: "samaAlJadaf",      srcId: SAMA_AL_JADAF_SRC,     lineId: SAMA_AL_JADAF_LINE,     label: "Sama Al Jadaf" },
  { key: "arjan",            srcId: ARJAN_SRC,             lineId: ARJAN_LINE,             label: "Arjan" },
  { key: "dhcc2",            srcId: DHCC2_SRC,             lineId: DHCC2_LINE,             label: "DHCC Phase 2" },
  { key: "barshaHeights",    srcId: BARSHA_HEIGHTS_SRC,    lineId: BARSHA_HEIGHTS_LINE,    label: "Barsha Heights" },
  { key: "difcZabeel",       srcId: DIFC_ZABEEL_SRC,       lineId: DIFC_ZABEEL_LINE,       label: "DIFC Zabeel" },
  { key: "jaddafWaterfront", srcId: JADDAF_WF_SRC,         lineId: JADDAF_WF_LINE,         label: "Jaddaf Waterfront" },
  { key: "dhcc1",            srcId: DHCC1_SRC,             lineId: DHCC1_LINE,             label: "DHCC Phase 1" },
  { key: "difc",             srcId: DIFC_SRC,              lineId: DIFC_LINE,              label: "DIFC" },
  { key: "tilalAlGhaf",      srcId: TILAL_AL_GHAF_SRC,     lineId: TILAL_AL_GHAF_LINE,     label: "Tilal Al Ghaf" },
  { key: "arabianRanches2",  srcId: AR2_SRC,               lineId: AR2_LINE,               label: "Arabian Ranches II" },
  { key: "theVilla",         srcId: THE_VILLA_SRC,         lineId: THE_VILLA_LINE,         label: "The Villa" },
  { key: "arabianRanches3",  srcId: AR3_SRC,               lineId: AR3_LINE,               label: "Arabian Ranches III" },
  { key: "dubaiSportsCity",  srcId: DSC_SRC,               lineId: DSC_LINE,               label: "Dubai Sports City" },
  { key: "villanova",        srcId: VILLANOVA_SRC,         lineId: VILLANOVA_LINE,         label: "Villanova" },
  { key: "theAcres",         srcId: ACRES_SRC,             lineId: ACRES_LINE,             label: "The Acres" },
  { key: "falconCity",       srcId: FALCON_SRC,            lineId: FALCON_LINE,            label: "Falcon City of Wonders" },
  { key: "alAryam",          srcId: AL_ARYAM_SRC,          lineId: AL_ARYAM_LINE,          label: "Al Aryam" },
  { key: "dubaiIndustrialCity", srcId: DIC_SRC,            lineId: DIC_LINE,               label: "Dubai Industrial City" },
  { key: "damacIslands2",    srcId: DI2_SRC,               lineId: DI2_LINE,               label: "Damac Islands 2" },
  { key: "wilds",            srcId: WILDS_SRC,             lineId: WILDS_LINE,             label: "Wilds 1&2" },
  { key: "townSquare",       srcId: TOWN_SQ_SRC,           lineId: TOWN_SQ_LINE,           label: "Town Square" },
  { key: "athlon",           srcId: ATHLON_SRC,            lineId: ATHLON_LINE,            label: "Athlon by Aldar" },
  { key: "cherrywoods",      srcId: CHERRY_SRC,            lineId: CHERRY_LINE,            label: "Cherrywoods" },
  { key: "portofino",        srcId: PORTOFINO_SRC,         lineId: PORTOFINO_LINE,         label: "Portofino" },
  { key: "haven",            srcId: HAVEN_SRC,             lineId: HAVEN_LINE,             label: "Haven" },
  { key: "alBarari",         srcId: AL_BARARI_SRC,         lineId: AL_BARARI_LINE,         label: "Al Barari" },
  { key: "jabalAliIndustrial", srcId: JAI_SRC,             lineId: JAI_LINE,               label: "Jabal Ali Industrial Dev." },
  { key: "livingLegends",    srcId: LL_SRC,                lineId: LL_LINE,                label: "Living Legends" },
  { key: "shorooq",          srcId: SHOROOQ_SRC,           lineId: SHOROOQ_LINE,           label: "Shorooq" },
  { key: "cityOfArabia",     srcId: COA_SRC,               lineId: COA_LINE,               label: "City of Arabia" },
  { key: "serena",           srcId: SERENA_SRC,            lineId: SERENA_LINE,            label: "Serena" },
  { key: "dubaiCreekHarbour", srcId: DCH_SRC,              lineId: DCH_LINE,               label: "Dubai Creek Harbour" },
  { key: "dubaiProductionCity", srcId: DPC_SRC,            lineId: DPC_LINE,               label: "Dubai Production City" },
  { key: "sobhaReserve",     srcId: SOBHA_R_SRC,           lineId: SOBHA_R_LINE,           label: "Sobha Reserve" },
  { key: "jumeirahGardenCity", srcId: JGC_SRC,             lineId: JGC_LINE,               label: "Jumeirah Garden City" },
  { key: "sobhaElwood",      srcId: SOBHA_E_SRC,           lineId: SOBHA_E_LINE,           label: "Sobha Elwood" },
  { key: "dlrc",             srcId: DLRC_SRC,              lineId: DLRC_LINE,              label: "Dubai Land Residence Complex" },
  { key: "pearlJumeira",     srcId: PEARL_J_SRC,           lineId: PEARL_J_LINE,           label: "Pearl Jumeira" },
  { key: "alKhawaneej",      srcId: KHAWANEEJ_SRC,         lineId: KHAWANEEJ_LINE,         label: "Al Khawaneej District" },
  { key: "majan",            srcId: MAJAN_SRC,             lineId: MAJAN_LINE,             label: "Majan" },
  { key: "laMer",            srcId: LA_MER_SRC,            lineId: LA_MER_LINE,            label: "La Mer" },
  { key: "dubaiLand",        srcId: DUBAI_LAND_SRC,        lineId: DUBAI_LAND_LINE,        label: "Dubai Land" },
  { key: "dubaiGolfCity",    srcId: DGC_SRC,               lineId: DGC_LINE,               label: "Dubai Golf City" },
  { key: "meraasUmmAlSheif", srcId: MERAAS_UAS_SRC,        lineId: MERAAS_UAS_LINE,        label: "Meraas — Umm Al Sheif" },
  { key: "alMamzarFront",    srcId: MAMZAR_SRC,            lineId: MAMZAR_LINE,            label: "Al Mamzar Front" },
  { key: "asmaran",          srcId: ASMARAN_SRC,           lineId: ASMARAN_LINE,           label: "Asmaran" },
  { key: "jumeirahBay",      srcId: JBAY_SRC,              lineId: JBAY_LINE,              label: "Jumeirah Bay" },
  { key: "reportageVillage", srcId: REPORTAGE_SRC,         lineId: REPORTAGE_LINE,         label: "Reportage Village 1&2" },
  { key: "liwan",            srcId: LIWAN_SRC,             lineId: LIWAN_LINE,             label: "Liwan" },
  { key: "dubaiStudioCity",  srcId: DSTUDIO_SRC,           lineId: DSTUDIO_LINE,           label: "Dubai Studio City" },
  { key: "liwan2",           srcId: LIWAN2_SRC,            lineId: LIWAN2_LINE,            label: "Liwan 2" },
  { key: "naiaIsland",       srcId: NAIA_SRC,              lineId: NAIA_LINE,              label: "Naia Island" },
  { key: "ardhCommunity",    srcId: ARDH_SRC,              lineId: ARDH_LINE,              label: "Ardh Community" },
  { key: "tijaraTown",       srcId: TIJARA_SRC,            lineId: TIJARA_LINE,            label: "Tijara Town" },
  { key: "warsanFirst",      srcId: WARSAN_SRC,            lineId: WARSAN_LINE,            label: "Warsan First Dev." },
  { key: "meraasMirdif",     srcId: MERAAS_MIRDIF_SRC,     lineId: MERAAS_MIRDIF_LINE,     label: "Meraas — Mirdif" },
  { key: "alHabtoorPolo",    srcId: HABTOOR_SRC,           lineId: HABTOOR_LINE,           label: "Al Habtoor Polo" },
  { key: "meraasUmmAmaraa",  srcId: MERAAS_UMA_SRC,        lineId: MERAAS_UMA_LINE,        label: "Meraas — Umm Amaraa" },
  { key: "d3",               srcId: D3_DDA_SRC,            lineId: D3_DDA_LINE,            label: "Dubai Design District" },
  { key: "alKhailGate",      srcId: KHAIL_SRC,             lineId: KHAIL_LINE,             label: "Al Khail Gate" },
  { key: "siteA",            srcId: SITE_A_SRC,            lineId: SITE_A_LINE,            label: "Site A" },
  { key: "rukan",            srcId: RUKAN_SRC,             lineId: RUKAN_LINE,             label: "Rukan" },
  { key: "californiaResidence", srcId: CALI_SRC,           lineId: CALI_LINE,              label: "California Residence" },
  { key: "meraasNaddAlHamar", srcId: MERAAS_NAH_SRC,       lineId: MERAAS_NAH_LINE,        label: "Meraas — Nadd Al Hamar" },
  { key: "palmarosa",        srcId: PALMAROSA_SRC,         lineId: PALMAROSA_LINE,         label: "Palmarosa" },
  { key: "diac",             srcId: DIAC_SRC,              lineId: DIAC_LINE,              label: "Dubai Int'l Academic City" },
  { key: "alWaha",           srcId: WAHA_SRC,              lineId: WAHA_LINE,              label: "Al Waha" },
  { key: "dubaiHarbour",     srcId: HARBOUR_SRC,           lineId: HARBOUR_LINE,           label: "Dubai Harbour" },
  { key: "khawaneejLabour",  srcId: KLABOUR_SRC,           lineId: KLABOUR_LINE,           label: "Al Khawaneej Labour City" },
  { key: "warsanIndustrial", srcId: WIND_SRC,              lineId: WIND_LINE,              label: "Al Warsan Industrial" },
  { key: "dubaiLifestyleCity", srcId: DLC_SRC,             lineId: DLC_LINE,               label: "Dubai Lifestyle City" },
  { key: "sufouhGardens",    srcId: SUFOUH_SRC,            lineId: SUFOUH_LINE,            label: "Sufouh Gardens" },
  { key: "motorCity",        srcId: MOTOR_SRC,             lineId: MOTOR_LINE,             label: "Motor City" },
  { key: "taormina1",        srcId: TAOR1_SRC,             lineId: TAOR1_LINE,             label: "Taormina Village 1" },
  { key: "dubaiParks",       srcId: DPARKS_SRC,            lineId: DPARKS_LINE,            label: "Dubai Parks" },
  { key: "cityWalk",         srcId: CWALK_SRC,             lineId: CWALK_LINE,             label: "City Walk" },
  { key: "arPolo",           srcId: ARPOLO_SRC,            lineId: ARPOLO_LINE,            label: "Arabian Ranches Polo Club" },
  { key: "barshaThird",      srcId: BARSHA3_SRC,           lineId: BARSHA3_LINE,           label: "Al Barsha Third Dev." },
  { key: "meraasBarsha2",    srcId: MERAAS_B2_SRC,         lineId: MERAAS_B2_LINE,         label: "Meraas — Al Barsha Second" },
  { key: "dubaiOutsourceCity", srcId: DOC_SRC,             lineId: DOC_LINE,               label: "Dubai Outsource City" },
  { key: "burjKhalifa",      srcId: BURJ_SRC,              lineId: BURJ_LINE,              label: "Burj Khalifa District" },
  { key: "ghafWoods",        srcId: GHAF_SRC,              lineId: GHAF_LINE,              label: "Ghaf Woods" },
  { key: "taormina2",        srcId: TAOR2_SRC,             lineId: TAOR2_LINE,             label: "Taormina Village 2" },
  { key: "bianca",           srcId: BIANCA_SRC,            lineId: BIANCA_LINE,            label: "Bianca" },
  { key: "mjl",              srcId: MJL_SRC,               lineId: MJL_LINE,               label: "Madinat Jumeirah Living" },
  { key: "dhKhawaneej1",     srcId: DHK1_SRC,              lineId: DHK1_LINE,              label: "DH — Al Khawaneej First" },
  { key: "remraam",          srcId: REMRAAM_SRC,           lineId: REMRAAM_LINE,           label: "Remraam" },
  { key: "echoPlex",         srcId: ECHO_SRC,              lineId: ECHO_LINE,              label: "The Echo Plex City" },
  { key: "sustainableCity",  srcId: SUSCITY_SRC,           lineId: SUSCITY_LINE,           label: "Sustainable City" },
  { key: "jbr",              srcId: JBR_SRC,               lineId: JBR_LINE,               label: "Jumeirah Beach Residence" },
  { key: "ghoroob",          srcId: GHOROOB_SRC,           lineId: GHOROOB_LINE,           label: "Ghoroob" },
  { key: "dpBarshaSouth3",   srcId: DPB3_SRC,              lineId: DPB3_LINE,              label: "DP — Al Barsha South 3rd" },
  { key: "marsaAlArab",      srcId: MARSA_SRC,             lineId: MARSA_LINE,             label: "Marsa Al Arab" },
  { key: "bluewaters",       srcId: BLUE_SRC,              lineId: BLUE_LINE,              label: "Bluewaters" },
  { key: "siteD",            srcId: SITE_D_SRC,            lineId: SITE_D_LINE,            label: "Site D" },
  { key: "khailHeights",     srcId: KHEIGHTS_SRC,          lineId: KHEIGHTS_LINE,          label: "Al Khail Heights" },
  { key: "meraasUmmAlDaman", srcId: MERAAS_UAD_SRC,        lineId: MERAAS_UAD_LINE,        label: "Meraas — Umm Al Daman" },
  { key: "dubaiLand673",     srcId: DLAND673_SRC,          lineId: DLAND673_LINE,          label: "Dubai Land (673)" },
  { key: "shamalYalayis1",   srcId: SHAMAL_Y1_SRC,         lineId: SHAMAL_Y1_LINE,         label: "Shamal — Al Yalayis 1" },
  { key: "tecomQouz2",       srcId: TECOM_Q2_SRC,          lineId: TECOM_Q2_LINE,          label: "TECOM — Al Qouz Ind. 2nd" },
  { key: "globalVillage",    srcId: GV_SRC,                lineId: GV_LINE,                label: "Global Village" },
  { key: "layan",            srcId: LAYAN_SRC,             lineId: LAYAN_LINE,             label: "Layan" },
  { key: "dpgMbr",           srcId: DPGMBR_SRC,            lineId: DPGMBR_LINE,            label: "DPG — MBR City" },
  { key: "dwc",              srcId: DWC_SRC,               lineId: DWC_LINE,               label: "Dubai Wholesale City" },
  { key: "labourQuoz",       srcId: LQUOZ_SRC,             lineId: LQUOZ_LINE,             label: "Labour Acc. — Al Quoz" },
  { key: "schoolsFz",        srcId: SCHFZ_SRC,             lineId: SCHFZ_LINE,             label: "Schools — Free Zone" },
  { key: "dwcNfz",           srcId: DWCNFZ_SRC,            lineId: DWCNFZ_LINE,            label: "DWC (Non Free Zone)" },
  { key: "shamalJai1",       srcId: SHAMAL_JAI1_SRC,       lineId: SHAMAL_JAI1_LINE,       label: "Shamal — Jabal Ali Ind. 1st" },
  { key: "jaiStaff",         srcId: JAI_STAFF_SRC,         lineId: JAI_STAFF_LINE,         label: "Jabal Ali Staff Acc." },
  { key: "shamalTc2",        srcId: SHAMAL_TC2_SRC,        lineId: SHAMAL_TC2_LINE,        label: "Shamal — Trade Center 2nd" },
  { key: "nuzul",            srcId: NUZUL_SRC,             lineId: NUZUL_LINE,             label: "Nuzul" },
  { key: "koa",              srcId: KOA_SRC,               lineId: KOA_LINE,               label: "KOA Real Estate Dev." },
  { key: "sobhaSanctuary",   srcId: SOBHA_S_SRC,           lineId: SOBHA_S_LINE,           label: "Sobha Sanctuary" },
  { key: "boxpark",          srcId: BOX_SRC,               lineId: BOX_LINE,               label: "Boxpark" },
  { key: "shamalNas1",       srcId: SHAMAL_NAS1_SRC,       lineId: SHAMAL_NAS1_LINE,       label: "Shamal — Nadd Al Shiba 1st" },
  { key: "lastExit",         srcId: LASTEXIT_SRC,          lineId: LASTEXIT_LINE,          label: "Last Exit" },
  { key: "scaramanga",       srcId: SCARA_SRC,             lineId: SCARA_LINE,             label: "Scaramanga" },
  { key: "meraasWarqa3",     srcId: MERAAS_W3_SRC,         lineId: MERAAS_W3_LINE,         label: "Meraas — Al Warqa'a 3rd" },
  { key: "jumeirahCentral",  srcId: JCENTRAL_SRC,          lineId: JCENTRAL_LINE,          label: "Jumeirah Central" },
  { key: "oasisVillage",     srcId: OASIS_SRC,             lineId: OASIS_LINE,             label: "Oasis Village" },
  { key: "emiratesTowers",   srcId: ETD_SRC,               lineId: ETD_LINE,               label: "Emirates Towers District" },
  { key: "meraasQuoz3",      srcId: MERAAS_Q3_SRC,         lineId: MERAAS_Q3_LINE,         label: "Meraas — Al Qouz 3rd" },
  { key: "marsaAlseef",      srcId: MARSA_S_SRC,           lineId: MARSA_S_LINE,           label: "Marsa Alseef" },
  { key: "meraasWadiAlshabak", srcId: MERAAS_WAS_SRC,      lineId: MERAAS_WAS_LINE,        label: "Meraas — Wadi Alshabak" },
  { key: "shamalBarsha2",    srcId: SHAMAL_B2_SRC,         lineId: SHAMAL_B2_LINE,         label: "Shamal — Al Barsha 2nd" },
  { key: "shamalNahda2",     srcId: SHAMAL_N2_SRC,         lineId: SHAMAL_N2_LINE,         label: "Shamal — Al Nahda 2nd" },
  { key: "meraasSaih1",      srcId: MERAAS_SAIH1_SRC,      lineId: MERAAS_SAIH1_LINE,      label: "Meraas — Saih Shuaib 1" },
  { key: "dubaiPoliceUad",   srcId: DPOL_UAD_SRC,          lineId: DPOL_UAD_LINE,          label: "Dubai Police — Umm Al Daman" },
  { key: "meraasRakhor3",    srcId: MERAAS_RAK3_SRC,       lineId: MERAAS_RAK3_LINE,       label: "Meraas — Ras Al Khor Ind. 3rd" },
  { key: "meraasMarsaDubai", srcId: MERAAS_MD_SRC,         lineId: MERAAS_MD_LINE,         label: "Meraas — Marsa Dubai" },
  { key: "shamalHadaeq",     srcId: SHAMAL_HAD_SRC,        lineId: SHAMAL_HAD_LINE,        label: "Shamal — Hadaeq Sheikh MBR" },
  { key: "jbh",              srcId: JBH_SRC,               lineId: JBH_LINE,               label: "Jumeira Beach Hotel" },
  { key: "madinatJumeirah",  srcId: MJUM_SRC,              lineId: MJUM_LINE,              label: "Madinat Jumeirah" },
  { key: "tecomSaih",        srcId: TECOM_SAIH_SRC,        lineId: TECOM_SAIH_LINE,        label: "TECOM — Saih Al Salam" },
  { key: "cultureVillage2",  srcId: CV2_SRC,               lineId: CV2_LINE,               label: "Culture Village Phase 2" },
  { key: "meraasBs2",        srcId: MERAAS_BS2_SRC,        lineId: MERAAS_BS2_LINE,        label: "Meraas — Al Barsha South 2nd" },
  { key: "shamalMuh2",       srcId: SHAMAL_MUH2_SRC,       lineId: SHAMAL_MUH2_LINE,       label: "Shamal — Muhaisanah 2nd" },
  { key: "shamalQuoz2",      srcId: SHAMAL_Q2_SRC,         lineId: SHAMAL_Q2_LINE,         label: "Shamal — Al Qouz Ind. 2nd" },
  { key: "cultureVillage3",  srcId: CV3_SRC,               lineId: CV3_LINE,               label: "Culture Village Phase 3" },
  { key: "meraasSatwa",      srcId: MERAAS_SATWA_SRC,      lineId: MERAAS_SATWA_LINE,      label: "Meraas — Al Satwa" },
  { key: "shamalMamzar",     srcId: SHAMAL_MAMZAR_SRC,     lineId: SHAMAL_MAMZAR_LINE,     label: "Shamal — Al Mamzar" },
  { key: "shamalRaffa",      srcId: SHAMAL_RAFFA_SRC,      lineId: SHAMAL_RAFFA_LINE,      label: "Shamal — Al Raffa" },
  { key: "meraasMamzar",     srcId: MERAAS_MAMZAR_SRC,     lineId: MERAAS_MAMZAR_LINE,     label: "Meraas — Al Mamzar" },
  { key: "dhSafouh1",        srcId: DH_SAFOUH1_SRC,        lineId: DH_SAFOUH1_LINE,        label: "Dubai Holding — Al Safouh 1st" },
  { key: "dubaiLandB104",    srcId: DL_B104_SRC,           lineId: DL_B104_LINE,           label: "Dubai Land (B1-04)" },
  { key: "dhamRowaiyah1",    srcId: DHAM_ROW1_SRC,         lineId: DHAM_ROW1_LINE,         label: "Dham — Al Rowaiyah 1st" },
  { key: "dubaiLandB208",    srcId: DL_B208_SRC,           lineId: DL_B208_LINE,           label: "Dubai Land (B2-08)" },
  { key: "theBeach",         srcId: BEACH_SRC,             lineId: BEACH_LINE,             label: "The Beach" },
  { key: "shamalUs3",        srcId: SHAMAL_US3_SRC,        lineId: SHAMAL_US3_LINE,        label: "Shamal — Umm Suqeim 3rd" },
  { key: "meraasHemaira",    srcId: MERAAS_HEMAIRA_SRC,    lineId: MERAAS_HEMAIRA_LINE,    label: "Meraas — Le Hemaira" },
  { key: "dpQuoz2",          srcId: DP_QUOZ2_SRC,          lineId: DP_QUOZ2_LINE,          label: "DP — Al Qouz Ind. 2nd" },
  { key: "dubaiLandB103",    srcId: DL_B103_SRC,           lineId: DL_B103_LINE,           label: "Dubai Land (B1-03)" },
  { key: "jgJumeira2",       srcId: JG_J2_SRC,             lineId: JG_J2_LINE,             label: "Jumeirah Group — Jumeira 2nd" },
  { key: "dubaiLandT15",     srcId: DL_T15_SRC,            lineId: DL_T15_LINE,            label: "Dubai Land (T.15)" },
  { key: "shamalWasl",       srcId: SHAMAL_WASL_SRC,       lineId: SHAMAL_WASL_LINE,       label: "Shamal — Al Wasl" },
  { key: "dubaiLandA304",    srcId: DL_A304_SRC,           lineId: DL_A304_LINE,           label: "Dubai Land (A3-04)" },
  { key: "eahm",             srcId: EAHM_SRC,              lineId: EAHM_LINE,              label: "Emirates Academy (EAHM)" },
  { key: "meraasZabeel2",    srcId: MERAAS_ZABEEL2_SRC,    lineId: MERAAS_ZABEEL2_LINE,    label: "Meraas — Za'abeel 2nd" },
  { key: "meraasJafiliya",   srcId: MERAAS_JAFILIYA_SRC,   lineId: MERAAS_JAFILIYA_LINE,   label: "Meraas — Al Jafiliya" },
  { key: "kiteBeach",        srcId: KITE_SRC,              lineId: KITE_LINE,              label: "Kite Beach" },
  { key: "meraasAlamardi",   srcId: MERAAS_ALAMARDI_SRC,   lineId: MERAAS_ALAMARDI_LINE,   label: "Meraas — Wadi Alamardi" },
  { key: "meraasPortSaeed",  srcId: MERAAS_PORTSAEED_SRC,  lineId: MERAAS_PORTSAEED_LINE,  label: "Meraas — Port Saeed" },
  { key: "dl6461281",        srcId: DL_6461281_SRC,        lineId: DL_6461281_LINE,        label: "Dubai Land (6461281)" },
  { key: "shamalOudMetha",   srcId: SHAMAL_OUDM_SRC,       lineId: SHAMAL_OUDM_LINE,       label: "Shamal — Oud Metha" },
  { key: "shamalQuoz3",      srcId: SHAMAL_Q3_SRC,         lineId: SHAMAL_Q3_LINE,         label: "Shamal — Al Qouz 3rd" },
  { key: "dubaiLandA307",    srcId: DL_A307_SRC,           lineId: DL_A307_LINE,           label: "Dubai Land (A3-07)" },
  { key: "was36456408",      srcId: WAS3_6456408_SRC,      lineId: WAS3_6456408_LINE,      label: "Wadi Al Safa 3 (6456408)" },
  { key: "shamalQuoz1",      srcId: SHAMAL_Q1_SRC,         lineId: SHAMAL_Q1_LINE,         label: "Shamal — Al Qouz Ind. 1st" },
  { key: "meraasNas4",       srcId: MERAAS_NAS4_SRC,       lineId: MERAAS_NAS4_LINE,       label: "Meraas — Nadd Al Shiba 4th" },
  { key: "shamalMuhaisnah1", srcId: SHAMAL_MUH1_SRC,       lineId: SHAMAL_MUH1_LINE,       label: "Shamal — Muhaisnah 1st" },
  { key: "shamalJumeira1",   srcId: SHAMAL_J1_SRC,         lineId: SHAMAL_J1_LINE,         label: "Shamal — Jumeira 1st" },
  { key: "meraasQusais2",    srcId: MERAAS_QUSAIS2_SRC,    lineId: MERAAS_QUSAIS2_LINE,    label: "Meraas — Al Qusais Ind. 2nd" },
  { key: "shamalMaha",       srcId: SHAMAL_MAHA_SRC,       lineId: SHAMAL_MAHA_LINE,       label: "Shamal — Al Maha" },
  { key: "lunaya",           srcId: LUNAYA_SRC,            lineId: LUNAYA_LINE,            label: "Lunaya" },
  { key: "meraasUs1",        srcId: MERAAS_US1_SRC,        lineId: MERAAS_US1_LINE,        label: "Meraas — Umm Suqeim 1st" },
  { key: "shamalNahda1",     srcId: SHAMAL_NAHDA1_SRC,     lineId: SHAMAL_NAHDA1_LINE,     label: "Shamal — Al Nahda 1st" },
  { key: "shamalSafouh1",    srcId: SHAMAL_SAFOUH1_SRC,    lineId: SHAMAL_SAFOUH1_LINE,    label: "Shamal — Al Safouh 1st" },
  { key: "shamalMargham",    srcId: SHAMAL_MARGHAM_SRC,    lineId: SHAMAL_MARGHAM_LINE,    label: "Shamal — Margham" },
  { key: "wildWadi",         srcId: WILD_WADI_SRC,         lineId: WILD_WADI_LINE,         label: "Wild Wadi Water Park" },
  { key: "meraasBs1",        srcId: MERAAS_BS1_SRC,        lineId: MERAAS_BS1_LINE,        label: "Meraas — Al Barsha South 1st" },
  { key: "dubaiLandA409",    srcId: DL_A409_SRC,           lineId: DL_A409_LINE,           label: "Dubai Land (A4-09)" },
  { key: "zabeelFirst",      srcId: ZABEEL1_SRC,           lineId: ZABEEL1_LINE,           label: "Za'abeel First Plot" },
  { key: "was36454931",      srcId: WAS3_6454931_SRC,      lineId: WAS3_6454931_LINE,      label: "Wadi Al Safa 3 (6454931)" },
  { key: "meraas3460266",    srcId: MERAAS_3460266_SRC,    lineId: MERAAS_3460266_LINE,    label: "Meraas Plot 3460266" },
  { key: "museumFuture",     srcId: MUSEUM_FUTURE_SRC,     lineId: MUSEUM_FUTURE_LINE,     label: "Museum of the Future" },
  { key: "alJalila",         srcId: AL_JALILA_SRC,         lineId: AL_JALILA_LINE,         label: "Al Jalila Children's Hospital" },
  { key: "dubaiLandA102",    srcId: DL_A102_SRC,           lineId: DL_A102_LINE,           label: "Dubai Land (A1-02)" },
  { key: "meraasWarqa2",     srcId: MERAAS_WARQA2_SRC,     lineId: MERAAS_WARQA2_LINE,     label: "Meraas — Al Warqa'a 2nd" },
  { key: "meraasJumeira1",   srcId: MERAAS_J1_SRC,         lineId: MERAAS_J1_LINE,         label: "Meraas — Jumeira 1st" },
  { key: "dpJafiliya",       srcId: DP_JAFILIYA_SRC,       lineId: DP_JAFILIYA_LINE,       label: "DP — Al Jafiliya" },
  { key: "burjAlArab",       srcId: BURJ_AA_SRC,           lineId: BURJ_AA_LINE,           label: "Burj Al Arab" },
  { key: "shamalBs1",        srcId: SHAMAL_BS1_SRC,        lineId: SHAMAL_BS1_LINE,        label: "Shamal — Al Barsha South 1st" },
  { key: "dubaiPoliceAcademy", srcId: DPA_SRC,             lineId: DPA_LINE,               label: "Dubai Police Academy" },
  { key: "shamalMankhool",   srcId: SHAMAL_MANKHOOL_SRC,   lineId: SHAMAL_MANKHOOL_LINE,   label: "Shamal — Mankhool" },
];

const ddaLabelId = (srcId: string) => `${srcId}-label`;

// ── Phase 1 RBAC scaffold — country + category + lock metadata ──────
// Every toggleable layer key maps to a country (for the hierarchy) and
// a category (for the sub-section inside that country). Optional
// `tier` marks visually-locked layers. Phase 1 is UX only: the toggle
// still works — Phase 3 will actually disable the checkbox once
// `useAccess()` + tier enforcement land.

// Saudi + Oman fully removed 2026-05-24 (founder spec) — the
// `saudiGovernorates`, `riyadhZones`, `omanLandPlots` flags are gone
// from LayersState; the layer definitions, hover handlers, and
// PMTiles binding are dropped below. "amenities" is a pseudo-country
// — its layers are physically Dubai-scoped, but founder spec
// 2026-05-29 surfaces them as a peer top-level group so users find
// them without diving into UAE→Dubai first.
type LayerCountry = "dubai" | "abudhabi" | "otheruae" | "amenities";
type LayerCategory =
  | "base"            // roads / metro / admin boundaries
  | "dda-admin"       // DDA projects, free zones, 99K plots layer
  | "dda-districts"   // individual DDA community layers (206 items)
  | "masterplans"     // 8 master plan KMLs
  | "landplots"       // country-scale PMTiles parcel grids (AD, Oman)
  | "amenities"       // data.dubai point overlays (EV / transit stations)
  | "vault"           // Private Plot Vault v2.1 — personal + shared overlays
  | "coming-soon";    // visual-only placeholders for Phase 2 emirates
type LayerLockTier = "GOLD" | "PLATINUM";

type LayerMeta = {
  country: LayerCountry;
  category: LayerCategory;
  tier?: LayerLockTier;
  /** Disabled toggle + "Soon" badge. Excluded from total/on counts. */
  comingSoon?: true;
};

const LAYER_COUNTRY_ORDER: LayerCountry[] = [
  "dubai", "abudhabi", "otheruae", "amenities",
];

const LAYER_CATEGORY_ORDER: LayerCategory[] = [
  "base", "dda-admin", "masterplans", "dda-districts", "landplots", "amenities", "vault", "coming-soon",
];

const COUNTRY_LABELS: Record<LayerCountry, string> = {
  dubai: "UAE — Dubai",
  abudhabi: "UAE — Abu Dhabi",
  otheruae: "UAE — Other Emirates",
  amenities: "Amenities",
};

const CATEGORY_LABELS: Record<LayerCategory, string> = {
  "base": "Base",
  "dda-admin": "DDA Layers",
  "masterplans": "Master Plans",
  "dda-districts": "DDA Districts",
  "landplots": "Land Plots",
  "amenities": "Amenities",
  "vault": "My Vault",
  "coming-soon": "Coming Soon",
};

// Build-once map: layer-key → metadata. Keys not in this map are treated
// as "unclassified" and land in Dubai/base as a safe default (prevents
// a missing key from silently disappearing from the panel).
const LAYER_META: Record<string, LayerMeta> = (() => {
  const m: Record<string, LayerMeta> = {
    // ── Dubai — base ──
    communities: { country: "dubai", category: "base" },
    roads: { country: "dubai", category: "base" },
    metro: { country: "dubai", category: "base" },
    plotLabels: { country: "dubai", category: "base" },
    // ── Dubai — DDA ──
    ddaProjects: { country: "dubai", category: "dda-admin" },
    ddaFreeZones: { country: "dubai", category: "dda-admin" },
    ddaLandPlots: { country: "dubai", category: "dda-admin", tier: "GOLD" },
    // ── Dubai — amenities (data.dubai point overlays, public open data) ──
    // Amenity overlays surfaced under the "Amenities" top-level
    // group (founder spec 2026-05-29). Data is still Dubai-only;
    // grouping is the only thing that changes.
    evChargers: { country: "amenities", category: "amenities" },
    metroStations: { country: "amenities", category: "amenities" },
    tramStations: { country: "amenities", category: "amenities" },
    marineStations: { country: "amenities", category: "amenities" },
    // ── Dubai — Private Plot Vault — Shared overlay only. ──
    // Owner-side vault rendering merged into the standard ZAAHI listing
    // layers in Phase 3 (2026-05-30). Country=dubai for UI organisation
    // (vault is technically per-user, not per-emirate — but cohort-scale
    // demand is Dubai-centric).
    vaultShared: { country: "dubai", category: "vault" },
    // ── Dubai — environmental layers (Phase 2 placeholders) ──
    // Real-time noise monitoring via Dubai Municipality is on the
    // roadmap but the data ingest isn't wired yet; show as a Soon row
    // so users see the planned coverage now.
    dubaiNoiseLevels: { country: "dubai", category: "coming-soon", comingSoon: true },
    // ── Dubai — master plans (all locked GOLD per mockup) ──
    islands: { country: "dubai", category: "masterplans", tier: "GOLD" },
    meydan: { country: "dubai", category: "masterplans", tier: "GOLD" },
    alFurjan: { country: "dubai", category: "masterplans", tier: "GOLD" },
    intlCity23: { country: "dubai", category: "masterplans", tier: "GOLD" },
    residential12: { country: "dubai", category: "masterplans", tier: "GOLD" },
    d11: { country: "dubai", category: "masterplans", tier: "GOLD" },
    nadAlHammer: { country: "dubai", category: "masterplans", tier: "GOLD" },
    // ── Abu Dhabi — base ──
    adMunicipalities: { country: "abudhabi", category: "base" },
    adDistricts: { country: "abudhabi", category: "base" },
    adCommunities: { country: "abudhabi", category: "base" },
    // ── Abu Dhabi — land plots (PMTiles 362K) ──
    adLandPlots: { country: "abudhabi", category: "landplots", tier: "GOLD" },
    // ── Other UAE ──
    uaeDistricts: { country: "otheruae", category: "base" },
    // Phase 2 emirate placeholders — UI-only "Soon" rows under
    // Other Emirates. No backing PMTiles yet; the toggle is disabled
    // and excluded from on/total counts.
    emirateSharjah:  { country: "otheruae", category: "coming-soon", comingSoon: true },
    emirateRAK:      { country: "otheruae", category: "coming-soon", comingSoon: true },
    emirateAjman:    { country: "otheruae", category: "coming-soon", comingSoon: true },
    emirateFujairah: { country: "otheruae", category: "coming-soon", comingSoon: true },
    emirateUAQ:      { country: "otheruae", category: "coming-soon", comingSoon: true },
  };
  // DDA districts (206 community polygons) — all Dubai, not tier-locked.
  for (const d of DDA_LAYERS) {
    m[d.key] = { country: "dubai", category: "dda-districts" };
  }
  return m;
})();

// Best-effort country detection from a map center. Used once on first
// panel open so the user's current country is auto-expanded.
// ── Map view persistence ─────────────────────────────────────────────
// Saves the user's last camera state (center / zoom / bearing / pitch)
// and active layer toggles so /parcels/map opens where they left it.
// Camera is restored at map-init; layers are restored via lazy useState.
// Save is debounced 500ms inside the map init useEffect.

interface SavedMapView {
  center: [number, number];
  zoom: number;
  bearing: number;
  pitch: number;
}
const MAP_VIEW_STORAGE_KEY = "zaahi-map-view";
const MAP_LAYERS_STORAGE_KEY = "zaahi-map-layers";

function loadSavedMapView(): SavedMapView | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(MAP_VIEW_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<SavedMapView>;
    if (
      !Array.isArray(parsed.center) ||
      parsed.center.length !== 2 ||
      typeof parsed.center[0] !== "number" ||
      typeof parsed.center[1] !== "number" ||
      typeof parsed.zoom !== "number" ||
      typeof parsed.bearing !== "number" ||
      typeof parsed.pitch !== "number"
    ) return null;
    return {
      center: [parsed.center[0], parsed.center[1]],
      zoom: parsed.zoom,
      bearing: parsed.bearing,
      pitch: parsed.pitch,
    };
  } catch {
    return null;
  }
}

function saveMapView(v: SavedMapView): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(MAP_VIEW_STORAGE_KEY, JSON.stringify(v));
  } catch {
    /* ignore quota / private mode */
  }
}

function loadSavedLayers(defaults: Record<string, boolean>): Record<string, boolean> {
  if (typeof window === "undefined") return defaults;
  try {
    const raw = window.localStorage.getItem(MAP_LAYERS_STORAGE_KEY);
    if (!raw) return defaults;
    const parsed = JSON.parse(raw) as Record<string, unknown>;
    // Merge over defaults so new layers added in code default to OFF (and
    // existing toggles aren't lost when shape changes).
    const merged: Record<string, boolean> = { ...defaults };
    for (const k of Object.keys(defaults)) {
      if (typeof parsed[k] === "boolean") merged[k] = parsed[k] as boolean;
    }
    return merged;
  } catch {
    return defaults;
  }
}

function saveLayers(state: Record<string, boolean>): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(MAP_LAYERS_STORAGE_KEY, JSON.stringify(state));
  } catch {
    /* ignore */
  }
}

// Vault-only mode is persisted across sessions. Lazy-readable so both
// `useState` and the matching `useRef` can initialise from the same
// source on the very first render — the v1 implementation (commit
// 485711e, reverted 02e837f) split state init from ref init, which
// left the ref `false` for one frame when the user reopened the map
// in vault-only mode, briefly painting public listings over the vault
// polygons before the hydration effect ran.
function loadVaultOnlyMode(): boolean {
  if (typeof window === "undefined") return false;
  try {
    return window.localStorage.getItem("zaahi-vault-only-mode") === "1";
  } catch {
    return false;
  }
}

function detectCountryFromLngLat(lng: number, lat: number): LayerCountry {
  // Saudi (lng < 50) and Oman (lng > 56.5) panels were removed
  // 2026-05-23 (founder spec); out-of-UAE views fall back to Dubai.
  if (lng < 50 || lng > 56.5) return "dubai";
  // Inside UAE rectangle — distinguish Dubai / AD / other emirates.
  if (lat < 24.85) return "abudhabi";    // AD metro ~24.45, Al Ain ~24.2
  if (lat > 25.35) return "otheruae";    // Sharjah+, RAK, Fujairah
  return "dubai";
}

function ParcelsMapPageInner() {
  const containerRef = useRef<HTMLDivElement>(null);
  const [selectedParcelId, setSelectedParcelId] = useState<string | null>(null);
  // Private Plot Vault — side panel state. Owner-side: set by the
  // ZAAHI_PLOTS_FILL click handler via the isVault branch (Phase 3
  // unification). Share-side: set by the VAULT_SHARED_3D click handler.
  // Parallel to selectedParcelId (which drives the public SidePanel);
  // both can be open at once via separate z-index layers.
  const [selectedVaultEntry, setSelectedVaultEntry] = useState<
    { id: string; mode: "owner" | "share" } | null
  >(null);
  // sound.init() is called from inside HeaderBar's local useEffect now
  // (the music toggle button lives there). The page-level state used
  // to live here for the old floating button which was removed.

  // PMTiles protocol is registered in the map init useEffect below.

  // ── Selection highlight: glow + dim others + 3D building boost ──
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    if (!map.isStyleLoaded()) {
      // Wait for first render before painting expressions on freshly-added layers.
      const onLoad = () => applySelectionPaint(map, selectedParcelId);
      map.once("idle", onLoad);
      return () => { map.off("idle", onLoad); };
    }
    applySelectionPaint(map, selectedParcelId);
    if (selectedParcelId == null) return;

    // Pulse animation for the crisp gold outline (line-width 2 → 4 → 2)
    let raf = 0;
    const t0 = performance.now();
    const tick = () => {
      const map2 = mapRef.current;
      if (!map2 || !map2.getLayer(ZAAHI_PLOTS_GLOW_CRISP)) return;
      const t = (performance.now() - t0) / 1000;
      // 1.5s period, smooth sin oscillation between 2 and 4
      const w = 3 + Math.sin((t * Math.PI * 2) / 1.5);
      try {
        map2.setPaintProperty(ZAAHI_PLOTS_GLOW_CRISP, "line-width", w);
      } catch {
        /* layer not ready yet */
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [selectedParcelId]);

  // Record a ParcelView whenever the user opens a parcel (SidePanel
  // becomes visible). The API throttles at 30s per (user, parcel) so
  // re-opens don't inflate counts. Self-views are filtered out on the
  // server. Best-effort — never blocks the UI.
  useEffect(() => {
    if (!selectedParcelId) return;
    void apiFetch(`/api/parcels/${selectedParcelId}/view`, { method: "POST" }).catch(() => { /* silent */ });
  }, [selectedParcelId]);

  // Defer-close timer so the user can move the cursor from the polygon
  // onto the (now clickable) hover card without it disappearing first.
  const hoverCloseTimerRef = useRef<number | null>(null);
  const [zaahiHover, setZaahiHover] = useState<{
    x: number;
    y: number;
    id: string;
    lng: number;
    lat: number;
    plotNumber: string;
    district: string;
    emirate: string;
    area: number;
    priceAed: number | null;
    landUse: string;
    projectName: string;
    plotAreaSqm: number;
    plotAreaSqft: number;
    maxGfaSqm: number;
    maxGfaSqft: number;
    maxFloors: number;
    maxHeightMeters: number;
    maxHeightCode: string;
    far: number;
    planDateIso: string;
  } | null>(null);
  // Vault hover popup — mirrors zaahiHover so a vault polygon reads
  // the same as a public listing on hover. Click → VaultSidePanelAdapter
  // (via setSelectedVaultEntry), same handshake as ZAAHI listings.
  const [vaultHover, setVaultHover] = useState<{
    x: number;
    y: number;
    id: string;
    plotNumber: string;
    district: string;
    landUse: string;
    projectName: string;
    askingAed: number | null;
    area: number;
    plotAreaSqft: number;
    maxGfaSqft: number;
    maxFloors: number;
    maxHeightMeters: number;
    maxHeightCode: string;
    far: number;
    planDateIso: string;
    mode: "owner" | "share";
  } | null>(null);
  const [ddaLandHover, setDdaLandHover] = useState<{
    x: number; y: number;
    plotNumber: string;
    mainLandUse: string;
    areaSqm: number; areaSqft: number;
    gfaSqm: number; gfaSqft: number;
    status: string;
    source: "dda" | "ad" | "";
    municipality: string;
    district: string;
  } | null>(null);

  // When either SidePanel opens, drop the residual hover card state +
  // any shared maplibre boundary popup. The JSX render is already gated
  // on !selectedParcelId && !selectedVaultEntry (see the hover popup
  // blocks below the style block), but clearing state too keeps DevTools
  // tidy and prevents a flash if the panel closes while the cursor is
  // still on the same polygon.
  useEffect(() => {
    if (!selectedParcelId && !selectedVaultEntry) return;
    setZaahiHover(null);
    setVaultHover(null);
    setDdaLandHover(null);
    if (hoverCloseTimerRef.current != null) {
      window.clearTimeout(hoverCloseTimerRef.current);
      hoverCloseTimerRef.current = null;
    }
    popupRef.current?.remove();
  }, [selectedParcelId, selectedVaultEntry]);
  // Split plotNumber index for PMTiles exclusion (founder spec 2026-05-31,
  // symmetric revision later the same day). Each ref holds one side of
  // the ZAAHI source — listings and the caller's PPV — so the PMTiles
  // exclusion filter can swap direction with the vault-only lock:
  // exclude only what ZAAHI is currently rendering, let PMTiles paint
  // the other side as background. See applyZaahiExclusionToTileLayers
  // below for the full rationale (including why showing a vault plot
  // as a PMTiles background polygon is not a privacy leak — the plot
  // itself is public DDA data; only the vault metadata is gated).
  const zaahiListingPnRef = useRef<Set<string>>(new Set());
  const zaahiVaultPnRef = useRef<Set<string>>(new Set());
  const mapRef = useRef<MLMap | null>(null);
  // deck.gl MapboxOverlay carrying the spike's hero GLB. Created
  // inside the map-init effect after the map instance is ready,
  // torn down in that effect's cleanup. See HERO_GLB_URL above.
  const deckOverlayRef = useRef<MapboxOverlay | null>(null);
  // Lazy-load gate: hero GLBs are only loaded into deck.gl when user is
  // zoomed in (zoom ≥ 14). Saves bandwidth + WebGL memory on initial paint.
  const [glbActive, setGlbActive] = useState(false);
  // True once the deferred MapboxOverlay has been .addControl()-ed.
  // Needed because deckOverlayRef is a ref and won't trigger sync re-run.
  const [overlayReady, setOverlayReady] = useState(false);
  // ── 3D hero buildings — dev-mode tuning panel ──
  // Activated via ?dev=1 in URL. Clicking any hero (deck.gl pickable)
  // opens HeroBuildingsDevPanel for that building. Overrides persist
  // to localStorage; founder later pastes Copy Config into the registry.
  const [devModeHero, setDevModeHero] = useState(false);
  const [editingHeroId, setEditingHeroId] = useState<string | null>(null);
  const [heroOverrides, setHeroOverrides] = useState<Record<string, HeroOverride>>({});
  useEffect(() => {
    setDevModeHero(new URLSearchParams(window.location.search).get("dev") === "1");
    try {
      const raw = localStorage.getItem(HERO_OVERRIDES_STORAGE_KEY);
      if (raw) setHeroOverrides(JSON.parse(raw));
    } catch { /* noop */ }
  }, []);
  useEffect(() => {
    try {
      localStorage.setItem(HERO_OVERRIDES_STORAGE_KEY, JSON.stringify(heroOverrides));
    } catch { /* noop */ }
  }, [heroOverrides]);
  const popupRef = useRef<maplibregl.Popup | null>(null);
  // Digital-twin Buildings layer state — completely additive, isolated
  // from the ZAAHI Signature rendering for LISTED plots.
  const [mapStyleReady, setMapStyleReady] = useState(false);
  const [completedVisible, setCompletedVisible] = useState(true);
  const [underConstructionVisible, setUnderConstructionVisible] = useState(true);
  const [selectedBuildingId, setSelectedBuildingId] = useState<string | null>(null);
  const buildingsStatusFilter = useMemo<BuildingDTO["status"][]>(() => {
    const f: BuildingDTO["status"][] = [];
    if (completedVisible) f.push("COMPLETED");
    if (underConstructionVisible) f.push("UNDER_CONSTRUCTION");
    return f;
  }, [completedVisible, underConstructionVisible]);
  const buildingsEnabled = buildingsStatusFilter.length > 0;
  // Ref mirror of the fetched list so the MapLibre click handler always
  // sees the latest items without needing hook re-registration.
  const loadedBuildingsRef = useRef<BuildingDTO[]>([]);
  const { buildings: loadedBuildings } = useBuildingsLayer({
    mapRef,
    mapReady: mapStyleReady,
    enabled: buildingsEnabled,
    statusFilter: buildingsStatusFilter,
    onSelectBuilding: (id) => {
      setSelectedBuildingId(id);
      const map = mapRef.current;
      const b = loadedBuildingsRef.current.find((x) => x.id === id);
      if (map && b) flyToBuilding(map, b);
    },
  });
  loadedBuildingsRef.current = loadedBuildings;
  const [theme, setTheme] = useState<Theme>("light");
  const [baseMap, setBaseMap] = useState<BaseMap>("light");
  const [is3D, setIs3D] = useState(true);
  const [cursor, setCursor] = useState({ lng: 55.27, lat: 25.20 });
  const [zoom, setZoom] = useState(12);
  const [bearing, setBearing] = useState(0);
  // "+" on the map opens a chooser (Listing vs Vault), then routes to the
  // selected flow. Per founder direction: Cancel/×/Esc/backdrop inside
  // either inner flow returns to the chooser; the chooser's own ×/Esc/
  // backdrop returns to the map. Two-step exit is intentional — keeps
  // AddPlotModal / AddPlotWizard internal logic untouched.
  type AddFlow = "none" | "chooser" | "listing" | "vault";
  const [addFlow, setAddFlow] = useState<AddFlow>("none");
  // Pre-filled plot number passed into AddPlotWizardModal when the
  // "+ Add to Vault" button on a hover popup opens the wizard.
  // Cleared whenever the add flow closes so the next manual open
  // (HeaderBar + button → chooser → vault) starts with an empty form.
  const [addPlotPrefill, setAddPlotPrefill] = useState<string | null>(null);

  // Shared entry point for both hover-card "+ Add to Vault" buttons
  // (ZAAHI listings + PMTiles parcels). Validates the plot number,
  // closes any open hover popup, then opens the wizard with the plot
  // pre-filled so Step 1 fires its mount-only lookup automatically.
  //
  // No inline auth gate — the page is wrapped in <AuthGuard>, and the
  // HeaderBar "+" button (onOpenAddModal) doesn't probe either. The
  // earlier inline check was inherited from a legacy code path that
  // looked for the Supabase v1 storage keys ("sb-…" cookie +
  // "supabase.auth.token" localStorage). Supabase v2 stores the
  // session under "sb-<projectref>-auth-token" instead, so both probes
  // failed for every authenticated user and the redirect to "/"
  // misfired on every click of the new "+" hover button.
  function openVaultWizardWith(plotNumber: string) {
    if (!plotNumber.match(/^\d{5,10}$/)) return;
    setZaahiHover(null);
    setDdaLandHover(null);
    setVaultHover(null);
    setAddPlotPrefill(plotNumber);
    setAddFlow("vault");
  }

  // Lightweight toast for success / error feedback after wizard or listing
  // submit. Single slot — newer toast replaces older. Auto-dismiss after 4s,
  // user can dismiss manually via ×.
  type Toast = { message: string; sub?: string; kind: "success" | "error" };
  const [toast, setToast] = useState<Toast | null>(null);
  useEffect(() => {
    if (!toast) return;
    const t = window.setTimeout(() => setToast(null), 4000);
    return () => window.clearTimeout(t);
  }, [toast]);
  // Drone mode — toggleable via on-map button. Persists across reloads
  // via localStorage "zaahi-drone-mode". Default OFF on first visit.
  const [droneEnabled, setDroneEnabled] = useState(false);
  const [showDroneHint, setShowDroneHint] = useState(false);
  const droneCtrlRef = useRef<DroneController | null>(null);
  // Crosshair "fire" feedback — Space tap or map click in drone mode
  // flies the camera to the unprojected screen-center and pulses the
  // reticle for 900 ms. Set true → false sequence drives the CSS
  // animation in DroneHUD's Crosshair.
  const [droneFiring, setDroneFiring] = useState(false);

  // Sun-time override — null means "use real wall-clock time" so the
  // shadow direction tracks live; a Date overrides it to the slider's
  // chosen hour-of-today. Passed straight into useSunLight which calls
  // map.setLight() whenever this changes (or once per minute on the
  // live path). Gate on mapStyleReady so the first setLight call lands
  // *after* the style has loaded — otherwise it's a silent no-op.
  //
  // Founder spec 2026-05-23: default override at 08:15 (warm dawn-
  // shadow look that reads best against Dubai glass). The ☀ button
  // starts active so the slider is visible on first load.
  const [sunTimeOverride, setSunTimeOverride] = useState<Date | null>(() => {
    const d = new Date();
    d.setHours(8, 15, 0, 0);
    return d;
  });
  // Sun-time slider visibility — gated by the ☀ button in the right
  // stack. The toggle controls UI visibility only; the directional
  // light is always on via useSunLight below (gated solely on
  // mapStyleReady). Default closed so users land on a clean map;
  // the 08:15 sun is already lighting the scene, just without slider
  // chrome on screen. Click ☀ to reveal the slider, click again
  // to hide. Double-clicking the slider is the way to clear back to
  // live wall-clock time.
  const [sunSliderActive, setSunSliderActive] = useState(false);
  useSunLight(mapRef, { overrideDate: sunTimeOverride, enabled: mapStyleReady });

  // Vault-only map mode — when ON, only caller's VAULT_PRIVATE plots
  // render on the ZAAHI layer; when OFF, only public listings render
  // (PPV hidden by default). Founder spec 2026-05-31 v2 — see
  // buildZaahiFilter below for the direction logic. Persists via
  // localStorage "zaahi-vault-only-mode". Default OFF.
  //
  // Lazy-init from localStorage so state AND ref both start with the
  // user's last-session value before any useEffect runs. This is what
  // prevents the first-paint race that bit the v1 attempt
  // (commit 485711e, reverted 02e837f) — the ref needs to be correct
  // when loadZaahiPlots fires inside map.on("load"), which can happen
  // before a state-restoring useEffect.
  const [vaultOnlyMode, setVaultOnlyMode] = useState(loadVaultOnlyMode);

  // ── Archie map filters (Phase 2 archie client, 2026-05-30) ──
  // Refs (not state) so mapControls handlers can read/write them
  // without forcing a React render cycle on every tool invocation.
  // Filter state is composed with vaultOnlyMode in reapplyMapFilters
  // below; the same helper drives both the vault-only useEffect and
  // the Archie tool calls.
  const vaultOnlyModeRef = useRef(loadVaultOnlyMode());
  const archieLandUseRef = useRef<string | null>(null);
  const archieStatusRef = useRef<string | null>(null);
  useEffect(() => {
    vaultOnlyModeRef.current = vaultOnlyMode;
  }, [vaultOnlyMode]);

  // Auto-rotate camera — slow showcase rotation when the user is idle.
  // HYBRID first-visit default: ON for first-ever visit (no localStorage
  // key yet), respects saved choice on subsequent visits. Mutually
  // exclusive with drone mode (each toggle disables the other).
  const [autoRotateEnabled, setAutoRotateEnabled] = useState(false);
  const [showAutoRotateHint, setShowAutoRotateHint] = useState(false);
  const autoRotateCtrlRef = useRef<AutoRotateController | null>(null);
  const [layersOpen, setLayersOpen] = useState(false);
  // Parcels portal — left rail list view of /api/parcels/map. Mutex
  // with the Layers panel because both anchor at left:60, top:64.
  const [portalOpen, setPortalOpen] = useState(false);
  const [legendOpen, setLegendOpen] = useState(false);
  const [miniOpen, setMiniOpen] = useState(false);
  const legendRef = useRef<HTMLDivElement>(null);
  // Wrapped around the mini-dock Legend button so the click-outside
  // handler at L4182 skips clicks on that button (was the standalone
  // top-right button until the 2026-05-24 founder map UI cleanup).
  const legendBtnRef = useRef<HTMLElement>(null);
  // Country-first hierarchy — one section per country, collapsible.
  // Phase 1: default Dubai expanded (where 114 ZAAHI listings live); on
  // first open of the layers panel we re-initialise from map center so
  // a user already panned to AD/Oman sees the right country expanded.
  const [countryOpen, setCountryOpen] = useState<Record<LayerCountry, boolean>>({
    dubai: true, abudhabi: false, otheruae: false, amenities: false,
  });
  // Per-category fold state — keys are `${country}:${category}`. Initial
  // default = DDA Layers (dda-admin) under Dubai open, every other
  // category closed (founder spec 2026-05-29).
  const [categoryOpen, setCategoryOpen] = useState<Record<string, boolean>>({
    "dubai:dda-admin": true,
  });
  const countryInitialisedRef = useRef(false);
  const [layerSearch, setLayerSearch] = useState("");
  // Phase 1 migration: Layers panel renders through <Panel> (polymorphic
  // element); HTMLElement is the conservative ref type — .contains() works
  // on any Element, and Panel's forwardRef is typed as React.Ref<HTMLElement>.
  const panelRef = useRef<HTMLElement>(null);
  const panelBtnRef = useRef<HTMLButtonElement>(null);
  // Layers state is lazy-init'd from localStorage so the user's previous
  // selection is restored when they come back to /parcels/map. Unknown
  // keys (layers added since their last visit) default to false via
  // loadSavedLayers merge. Save effect lives below.
  const [layers, setLayers] = useState<LayersState>(() => loadSavedLayers({
    // Founder spec 2026-04-15: all user-toggleable layers default OFF.
    // Only ZAAHI parcel polygons + ZAAHI Signature 3D buildings stay on
    // by default — those are the core listings (loaded unconditionally
    // via loadZaahiPlots, not gated by LayersState).
    communities: false,
    roads: false,
    metro: false,
    adMunicipalities: false,
    adDistricts: false,
    adCommunities: false,
    uaeDistricts: false,
    ddaProjects: false,
    ddaFreeZones: false,
    ddaLandPlots: false,
    adLandPlots: false,
    plotLabels: false,
    // District Names — default ON per founder spec 2026-05-24. Symbol
    // layer is gated by zoom ≥ 11 so it stays invisible at country
    // scale and only emerges at city scale.
    districtNames: true,
    // Amenities — data.dubai point overlays.
    evChargers: false,
    metroStations: false,
    tramStations: false,
    // Private Plot Vault — shared-with-me opt-in tab. Owner-side
    // entries render through the unified ZAAHI layers (Phase 3).
    vaultShared: false,
    marineStations: false,
    // Master plans default OFF — same lazy semantics as DDA. The user
    // clicks the checkbox (or the section checkbox) to load them.
    // No idle pre-fetch, no auto-load on map init.
    islands: false,
    meydan: false,
    alFurjan: false,
    intlCity23: false,
    residential12: false,
    d11: false,
    nadAlHammer: false,
    dubaiHills: false,
    damacHills2: false,
    damacLagoons: false,
    damacIslands: false,
    theValley: false,
    damacHills: false,
    mudon: false,
    jabelAliHills: false,
    arabianRanches1: false,
    nasGardens: false,
    dsp: false,
    businessBay: false,
    samaAlJadaf: false,
    arjan: false,
    dhcc2: false,
    barshaHeights: false,
    difcZabeel: false,
    jaddafWaterfront: false,
    dhcc1: false,
    difc: false,
    tilalAlGhaf: false,
    arabianRanches2: false,
    theVilla: false,
    arabianRanches3: false,
    dubaiSportsCity: false,
    villanova: false,
    theAcres: false,
    falconCity: false,
    alAryam: false,
    dubaiIndustrialCity: false,
    damacIslands2: false,
    wilds: false,
    townSquare: false,
    athlon: false,
    cherrywoods: false,
    portofino: false,
    haven: false,
    alBarari: false,
    jabalAliIndustrial: false,
    livingLegends: false,
    shorooq: false,
    cityOfArabia: false,
    serena: false,
    dubaiCreekHarbour: false,
    dubaiProductionCity: false,
    sobhaReserve: false,
    jumeirahGardenCity: false,
    sobhaElwood: false,
    dlrc: false,
    pearlJumeira: false,
    alKhawaneej: false,
    majan: false,
    laMer: false,
    dubaiLand: false,
    dubaiGolfCity: false,
    meraasUmmAlSheif: false,
    alMamzarFront: false,
    asmaran: false,
    jumeirahBay: false,
    reportageVillage: false,
    liwan: false,
    dubaiStudioCity: false,
    liwan2: false,
    naiaIsland: false,
    ardhCommunity: false,
    tijaraTown: false,
    warsanFirst: false,
    meraasMirdif: false,
    alHabtoorPolo: false,
    meraasUmmAmaraa: false,
    d3: false,
    alKhailGate: false,
    siteA: false,
    rukan: false,
    californiaResidence: false,
    meraasNaddAlHamar: false,
    palmarosa: false,
    diac: false,
    alWaha: false,
    dubaiHarbour: false,
    khawaneejLabour: false,
    warsanIndustrial: false,
    dubaiLifestyleCity: false,
    sufouhGardens: false,
    motorCity: false,
    taormina1: false,
    dubaiParks: false,
    cityWalk: false,
    arPolo: false,
    barshaThird: false,
    meraasBarsha2: false,
    dubaiOutsourceCity: false,
    burjKhalifa: false,
    ghafWoods: false,
    taormina2: false,
    bianca: false,
    mjl: false,
    dhKhawaneej1: false,
    remraam: false,
    echoPlex: false,
    sustainableCity: false,
    jbr: false,
    ghoroob: false,
    dpBarshaSouth3: false,
    marsaAlArab: false,
    bluewaters: false,
    siteD: false,
    khailHeights: false,
    meraasUmmAlDaman: false,
    dubaiLand673: false,
    shamalYalayis1: false,
    tecomQouz2: false,
    globalVillage: false,
    layan: false,
    dpgMbr: false,
    dwc: false,
    labourQuoz: false,
    schoolsFz: false,
    dwcNfz: false,
    shamalJai1: false,
    jaiStaff: false,
    shamalTc2: false,
    nuzul: false,
    koa: false,
    sobhaSanctuary: false,
    boxpark: false,
    shamalNas1: false,
    lastExit: false,
    scaramanga: false,
    meraasWarqa3: false,
    jumeirahCentral: false,
    oasisVillage: false,
    emiratesTowers: false,
    meraasQuoz3: false,
    marsaAlseef: false,
    meraasWadiAlshabak: false,
    shamalBarsha2: false,
    shamalNahda2: false,
    meraasSaih1: false,
    dubaiPoliceUad: false,
    meraasRakhor3: false,
    meraasMarsaDubai: false,
    shamalHadaeq: false,
    jbh: false,
    madinatJumeirah: false,
    tecomSaih: false,
    cultureVillage2: false,
    meraasBs2: false,
    shamalMuh2: false,
    shamalQuoz2: false,
    cultureVillage3: false,
    meraasSatwa: false,
    shamalMamzar: false,
    shamalRaffa: false,
    meraasMamzar: false,
    dhSafouh1: false,
    dubaiLandB104: false,
    dhamRowaiyah1: false,
    dubaiLandB208: false,
    theBeach: false,
    shamalUs3: false,
    meraasHemaira: false,
    dpQuoz2: false,
    dubaiLandB103: false,
    jgJumeira2: false,
    dubaiLandT15: false,
    shamalWasl: false,
    dubaiLandA304: false,
    eahm: false,
    meraasZabeel2: false,
    meraasJafiliya: false,
    kiteBeach: false,
    meraasAlamardi: false,
    meraasPortSaeed: false,
    dl6461281: false,
    shamalOudMetha: false,
    shamalQuoz3: false,
    dubaiLandA307: false,
    was36456408: false,
    shamalQuoz1: false,
    meraasNas4: false,
    shamalMuhaisnah1: false,
    shamalJumeira1: false,
    meraasQusais2: false,
    shamalMaha: false,
    lunaya: false,
    meraasUs1: false,
    shamalNahda1: false,
    shamalSafouh1: false,
    shamalMargham: false,
    wildWadi: false,
    meraasBs1: false,
    dubaiLandA409: false,
    zabeelFirst: false,
    was36454931: false,
    meraas3460266: false,
    museumFuture: false,
    alJalila: false,
    dubaiLandA102: false,
    meraasWarqa2: false,
    meraasJumeira1: false,
    dpJafiliya: false,
    burjAlArab: false,
    shamalBs1: false,
    dubaiPoliceAcademy: false,
    shamalMankhool: false,
  }) as LayersState);
  const layersRef = useRef(layers);
  layersRef.current = layers;
  // Persist any layer toggle change. Debounced by React's batched state
  // updates; localStorage write is cheap. Pair with loadSavedLayers above.
  useEffect(() => {
    saveLayers(layers as unknown as Record<string, boolean>);
  }, [layers]);
  const themeRef = useRef<Theme>("light");
  themeRef.current = theme;

  // ─────────────────────────────────────────────────────────────────────
  //  LAYER REGISTRY + LAZY LOADER
  //
  //  One source of truth for every overlay (Communities, Roads, the 6
  //  master plans, all 206 DDA districts). Replaces ~6,000 lines of
  //  inlined per-layer fetch / addSource / addLayer / mouse-event code.
  //
  //  Lifecycle:
  //    - kind === "base"       → eager-load on map init
  //    - kind === "masterplan" → idle-load 2 seconds after map init
  //    - kind === "dda"        → lazy-load on first toggle ON
  //
  //  loadedLayersRef tracks which layers have been fetched + added to
  //  the map already, so we never re-fetch on re-toggle. After a basemap
  //  swap (theme change) the source registry is wiped by maplibre, so
  //  attachOverlays clears the loaded set and re-loads everything that
  //  was previously on.
  // ─────────────────────────────────────────────────────────────────────
  type LayerKind = "base" | "masterplan" | "dda" | "point";
  // Point overlays (kind === "point") render as MapLibre `symbol` layers
  // backed by SDF icons (see loadAmenityIcons + public/icons/amenities/).
  // The icon image is tinted via paint.icon-color so a single SVG can
  // serve multiple per-feature colours (e.g. Metro per-line).
  type LayerDef = {
    key: keyof LayersState;
    kind: LayerKind;
    label: string;
    url: string;
    srcId: string;
    fillId?: string;
    lineId?: string;
    symbolId?: string;
    fillPaint?: maplibregl.FillLayerSpecification["paint"];
    linePaint?: maplibregl.LineLayerSpecification["paint"];
    symbolLayout?: maplibregl.SymbolLayerSpecification["layout"];
    symbolPaint?: maplibregl.SymbolLayerSpecification["paint"];
    promoteId?: string;
    hoverLabel?: string; // for master plan name popup
    pointPopupFields?: string[]; // for point hover/click popups
  };

  const masterPlanPaint: maplibregl.LineLayerSpecification["paint"] = {
    "line-color": "#C8A96E",
    "line-width": 1.5,
    "line-opacity": 0.85,
    "line-dasharray": [3, 2],
  };
  const ddaFillPaint: maplibregl.FillLayerSpecification["paint"] = {
    "fill-color": "#C8A96E",
    "fill-opacity": 0.05,
  };

  const LAYER_REGISTRY = useMemo<LayerDef[]>(() => {
    const isDark = themeRef.current === "dark";
    const out: LayerDef[] = [
      // ── Base layers (eager) ──
      {
        key: "communities",
        kind: "base",
        label: "Communities",
        url: "/api/layers/communities",
        srcId: COMMUNITIES_SRC,
        fillId: COMMUNITIES_FILL,
        lineId: COMMUNITIES_LINE,
        promoteId: "COMM_NUM",
        fillPaint: {
          "fill-color": GOLD,
          "fill-opacity": [
            "case",
            ["boolean", ["feature-state", "hover"], false], 0.12,
            0,
          ],
        },
        linePaint: {
          "line-color": GOLD,
          "line-width": [
            "case",
            ["boolean", ["feature-state", "hover"], false], 2,
            1,
          ],
          "line-opacity": 0.85,
        },
      },
      {
        key: "roads",
        kind: "base",
        label: "Major Roads",
        url: "/api/layers/roads",
        srcId: ROADS_SRC,
        lineId: ROADS_LINE,
        linePaint: {
          "line-color": isDark ? "#888888" : "#666666",
          "line-width": 2,
          "line-opacity": 0.7,
        },
      },
      {
        key: "metro",
        kind: "base",
        label: "Metro Lines",
        url: "/api/layers/metro",
        srcId: METRO_SRC,
        lineId: METRO_LINE,
        linePaint: {
          "line-color": [
            "match", ["get", "RAIL_ROUTE_ID"],
            "2029508", "#E74C3C",  // Red Line
            "2029509", "#27AE60",  // Green Line
            "#9B59B6",             // Route 2020 / other
          ],
          "line-width": 3,
          "line-opacity": 0.85,
        },
      },
      // saudiGovernorates + riyadhZones LayerDef entries removed
      // 2026-05-24 along with the rest of the Saudi coverage.
      // ── Abu Dhabi boundaries ──
      {
        key: "adMunicipalities",
        kind: "base",
        label: "AD Municipalities",
        url: "/api/layers/abu-dhabi-municipalities",
        srcId: AD_MUN_SRC,
        fillId: AD_MUN_FILL,
        lineId: AD_MUN_LINE,
        fillPaint: {
          "fill-color": "#C8A96E",
          "fill-opacity": 0.04,
        },
        linePaint: {
          "line-color": "#B8975E",
          "line-width": 3,
          "line-opacity": 0.8,
        },
      },
      {
        key: "adDistricts",
        kind: "base",
        label: "AD Districts",
        url: "/api/layers/abu-dhabi-districts",
        srcId: AD_DIST_SRC,
        fillId: AD_DIST_FILL,
        lineId: AD_DIST_LINE,
        fillPaint: {
          "fill-color": "#C8A96E",
          "fill-opacity": 0.06,
        },
        linePaint: {
          "line-color": "#C8A96E",
          "line-width": 2,
          "line-opacity": 0.75,
        },
      },
      {
        key: "adCommunities",
        kind: "base",
        label: "AD Communities",
        url: "/api/layers/abu-dhabi-communities",
        srcId: AD_COMM_SRC,
        fillId: AD_COMM_FILL,
        lineId: AD_COMM_LINE,
        fillPaint: {
          "fill-color": "#C8A96E",
          "fill-opacity": 0.04,
        },
        linePaint: {
          "line-color": "#C8A96E",
          "line-width": 1,
          "line-opacity": 0.6,
        },
      },
      {
        key: "uaeDistricts",
        kind: "base",
        label: "UAE Districts",
        url: "/api/layers/uae-districts",
        srcId: UAE_DIST_SRC,
        fillId: UAE_DIST_FILL,
        lineId: UAE_DIST_LINE,
        fillPaint: {
          "fill-color": "#E63946",
          "fill-opacity": 0.05,
        },
        linePaint: {
          "line-color": "#E63946",
          "line-width": 1.5,
          "line-opacity": 0.8,
        },
      },
      // ── DDA Project Boundaries & Free Zones ──
      {
        key: "ddaProjects",
        kind: "base",
        label: "DDA Project Boundaries",
        url: "/api/layers/dda-projects",
        srcId: DDA_PROJ_SRC,
        fillId: DDA_PROJ_FILL,
        lineId: DDA_PROJ_LINE,
        fillPaint: {
          "fill-color": "#C8A96E",
          "fill-opacity": 0.04,
        },
        linePaint: {
          "line-color": "#C8A96E",
          "line-width": 2,
          "line-opacity": 0.75,
        },
      },
      {
        key: "ddaFreeZones",
        kind: "base",
        label: "DDA Free Zones",
        url: "/api/layers/dda-freezones",
        srcId: DDA_FZ_SRC,
        fillId: DDA_FZ_FILL,
        lineId: DDA_FZ_LINE,
        fillPaint: {
          "fill-color": "#C8A96E",
          "fill-opacity": 0.04,
        },
        linePaint: {
          "line-color": "#B8975E",
          "line-width": 2,
          "line-opacity": 0.7,
        },
      },
      // ── Master plans (idle-load) ──
      { key: "islands",      kind: "masterplan", label: "Dubai Islands",            url: "/api/layers/dubai-islands",              srcId: ISLANDS_SRC, lineId: ISLANDS_LINE, linePaint: masterPlanPaint, hoverLabel: "Dubai Islands master plan" },
      { key: "meydan",       kind: "masterplan", label: "Meydan Horizon",           url: "/api/layers/masterplans/meydan-horizon", srcId: MEYDAN_SRC,  lineId: MEYDAN_LINE,  linePaint: masterPlanPaint, hoverLabel: "Meydan Horizon master plan" },
      { key: "alFurjan",     kind: "masterplan", label: "Al Furjan",                url: "/api/layers/masterplans/al-furjan",      srcId: FURJAN_SRC,  lineId: FURJAN_LINE,  linePaint: masterPlanPaint, hoverLabel: "Al Furjan master plan" },
      { key: "intlCity23",   kind: "masterplan", label: "Intl City 2 & 3",          url: "/api/layers/masterplans/intl-city-23",   srcId: IC23_SRC,    lineId: IC23_LINE,    linePaint: masterPlanPaint, hoverLabel: "International City Phase 2 & 3" },
      { key: "residential12", kind: "masterplan", label: "Residential District",    url: "/api/layers/masterplans/residential-12", srcId: RES12_SRC,   lineId: RES12_LINE,   linePaint: masterPlanPaint, hoverLabel: "Residential District Phase I & II" },
      { key: "d11",          kind: "masterplan", label: "D11 — Parcel L/D",         url: "/api/layers/masterplans/d11-parcel-ld",  srcId: D11_SRC,     lineId: D11_LINE,     linePaint: masterPlanPaint, hoverLabel: "D11 — Parcel L/D master plan" },
      { key: "nadAlHammer",  kind: "masterplan", label: "Nad Al Hammer",            url: "/api/layers/masterplans/nad-al-hammer",  srcId: NAD_AL_HAMMER_SRC, lineId: NAD_AL_HAMMER_LINE, linePaint: masterPlanPaint, hoverLabel: "Nad Al Hammer master plan" },
      // ── Amenities (data.dubai point overlays — kind: "point") ──
      // EV Chargers (DEWA): teal palette colour, lightning bolt glyph.
      {
        key: "evChargers",
        kind: "point",
        label: "EV Chargers",
        url: "/api/layers/amenities/ev-chargers",
        srcId: EV_CHARGERS_SRC,
        symbolId: EV_CHARGERS_SYMBOL,
        symbolLayout: {
          "icon-image": "amenity-ev-charger",
          "icon-size": ["interpolate", ["linear"], ["zoom"], 10, 0.35, 14, 0.55, 18, 0.9],
          "icon-allow-overlap": ["step", ["zoom"], false, 12, true],
          "icon-anchor": "center",
          // 2026-05-24 follow-up to ddee824: MapLibre pre-initialises a
          // default `text-font` (["Open Sans Regular","Arial Unicode MS
          // Regular"]) for every symbol layer it ingests at style-load,
          // even icon-only layers without `text-field`. The Arial
          // Unicode MS fontstack 404s as HTML on openmaptiles → "Unimplemented
          // type: 4". Pin the fontstack to a known-good one to block
          // the broken fallback chain at style-load time.
          "text-font": ["Open Sans Regular"],
        },
        symbolPaint: {
          "icon-color": "#1B4965",           // palette TEAL (unchanged)
          "icon-opacity": 0.95,
          "icon-halo-color": "#FFFFFF",
          "icon-halo-width": 1.2,
        },
        pointPopupFields: [
          "location_name", "location_address",
          "totalnbofconnectors", "connectortype",
        ],
      },
      // Metro Stations: colour driven by line_name (matches existing
      // Metro Lines layer painting at /api/layers/metro).
      {
        key: "metroStations",
        kind: "point",
        label: "Metro Stations",
        url: "/api/layers/amenities/metro-stations",
        srcId: METRO_STATIONS_SRC,
        symbolId: METRO_STATIONS_SYMBOL,
        symbolLayout: {
          "icon-image": "amenity-metro-station",
          "icon-size": ["interpolate", ["linear"], ["zoom"], 10, 0.4, 14, 0.6, 18, 0.95],
          "icon-allow-overlap": ["step", ["zoom"], false, 11, true],
          "icon-anchor": "center",
          // See EV-charger comment above — same MapLibre default-fontstack
          // pre-fetch behaviour, same broken Arial Unicode MS endpoint.
          "text-font": ["Open Sans Regular"],
        },
        symbolPaint: {
          "icon-color": [
            "match", ["get", "line_name"],
            "Red Metro line",   "#E74C3C",
            "Green Metro line", "#27AE60",
            /* default — Route 2020 + future expansions */ "#9B59B6",
          ],
          "icon-opacity": 0.95,
          "icon-halo-color": "#FFFFFF",
          "icon-halo-width": 1.5,
        },
        pointPopupFields: [
          "location_name_english", "line_name",
          "station_opening_date", "zone_id",
        ],
      },
      // Tram Stations: amber palette colour (closest to Dubai Tram livery).
      {
        key: "tramStations",
        kind: "point",
        label: "Tram Stations",
        url: "/api/layers/amenities/tram-stations",
        srcId: TRAM_STATIONS_SRC,
        symbolId: TRAM_STATIONS_SYMBOL,
        symbolLayout: {
          "icon-image": "amenity-tram-station",
          "icon-size": ["interpolate", ["linear"], ["zoom"], 10, 0.4, 14, 0.6, 18, 0.95],
          "icon-allow-overlap": ["step", ["zoom"], false, 11, true],
          "icon-anchor": "center",
          // See EV-charger comment above.
          "text-font": ["Open Sans Regular"],
        },
        symbolPaint: {
          "icon-color": "#E67E22",           // palette AMBER (unchanged)
          "icon-opacity": 0.95,
          "icon-halo-color": "#FFFFFF",
          "icon-halo-width": 1.2,
        },
        pointPopupFields: [
          "location_name_english", "line_name",
          "station_opening_date", "zone_id",
        ],
      },
      // Marine Stations: deeper teal-navy, visually distinct from EV.
      {
        key: "marineStations",
        kind: "point",
        label: "Marine Stations",
        url: "/api/layers/amenities/marine-stations",
        srcId: MARINE_STATIONS_SRC,
        symbolId: MARINE_STATIONS_SYMBOL,
        symbolLayout: {
          "icon-image": "amenity-marine-station",
          "icon-size": ["interpolate", ["linear"], ["zoom"], 10, 0.35, 14, 0.55, 18, 0.9],
          "icon-allow-overlap": ["step", ["zoom"], false, 12, true],
          "icon-anchor": "center",
          // See EV-charger comment above.
          "text-font": ["Open Sans Regular"],
        },
        symbolPaint: {
          "icon-color": "#1A4D7A",           // deep navy-teal (unchanged)
          "icon-opacity": 0.95,
          "icon-halo-color": "#FFFFFF",
          "icon-halo-width": 1.2,
        },
        pointPopupFields: [
          "station_name", "route_name",
          "valid_from", "valid_until",
        ],
      },
    ];
    // ── DDA districts (lazy) ──
    for (const d of DDA_LAYERS) {
      const slug = d.srcId.replace(/^dda-/, "");
      out.push({
        key: d.key,
        kind: "dda",
        label: d.label,
        url: `/api/layers/dda/${slug}`,
        srcId: d.srcId,
        fillId: `${d.srcId}-fill`,
        lineId: d.lineId,
        fillPaint: ddaFillPaint,
        linePaint: masterPlanPaint,
      });
    }
    return out;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Loaded / loading sets — refs because we don't want to re-render on
  // every layer fetch.
  const loadedLayersRef = useRef<Set<string>>(new Set());
  const loadingLayersRef = useRef<Set<string>>(new Set());
  // District-name centroid features cached across basemap swaps —
  // computed once from /api/layers/communities (see
  // ensureDistrictNamesLayer below) and reused on every setStyle.
  const districtNameFeaturesRef = useRef<GeoJSON.Feature<GeoJSON.Point>[] | null>(null);

  // Per-load hover registration. The handlers themselves are defined
  // inside map.on("load") because they close over the popup; we stash
  // them on a ref so loadLayer can attach them to freshly-added layers.
  const hoverHandlersRef = useRef<{
    ddaPlotHover: (() => void) | null;
    masterPlanLeave: (() => void) | null;
    masterPlanHover: ((label: string) => (e: maplibregl.MapMouseEvent) => void) | null;
    // Amenity-point hover/click factory: builds a mousemove handler
    // bound to a layer's label + popup field list.
    pointHover: (
      (label: string, fields: string[]) => (e: maplibregl.MapMouseEvent & { features?: GeoJSON.Feature[] }) => void
    ) | null;
    pointLeave: (() => void) | null;
    pointClick: (
      (label: string, fields: string[]) => (e: maplibregl.MapMouseEvent & { features?: GeoJSON.Feature[] }) => void
    ) | null;
  }>({
    ddaPlotHover: null, masterPlanLeave: null, masterPlanHover: null,
    pointHover: null, pointLeave: null, pointClick: null,
  });

  async function loadLayer(map: MLMap, def: LayerDef): Promise<boolean> {
    if (loadedLayersRef.current.has(def.key)) return true;
    if (loadingLayersRef.current.has(def.key)) return false;
    loadingLayersRef.current.add(def.key);
    try {
      const r = await fetch(def.url);
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      const data: GeoJSON.FeatureCollection = await r.json();
      // Style can be torn down during the await (basemap swap, unmount,
      // React strict-mode remount). Bail before touching the style.
      if (!map.getStyle()) return false;
      if (!map.getSource(def.srcId)) {
        map.addSource(def.srcId, {
          type: "geojson",
          data,
          ...(def.promoteId ? { promoteId: def.promoteId } : {}),
        });
      }
      if (def.fillPaint && def.fillId && !map.getLayer(def.fillId)) {
        map.addLayer({ id: def.fillId, type: "fill", source: def.srcId, paint: def.fillPaint });
      }
      if (def.lineId && def.linePaint && !map.getLayer(def.lineId)) {
        map.addLayer({
          id: def.lineId,
          type: "line",
          source: def.srcId,
          paint: def.linePaint,
          ...(def.key === "roads"
            ? { layout: { "line-cap": "round" as const, "line-join": "round" as const } }
            : {}),
        });
      }
      if (def.kind === "point" && def.symbolId && def.symbolLayout && !map.getLayer(def.symbolId)) {
        map.addLayer({
          id: def.symbolId,
          type: "symbol",
          source: def.srcId,
          layout: { ...def.symbolLayout, visibility: "none" }, // toggled on by setLayerVisibility
          paint: def.symbolPaint,
        });
        const h = hoverHandlersRef.current;
        const fields = def.pointPopupFields ?? [];
        if (h.pointHover && h.pointLeave && h.pointClick) {
          map.on("mousemove", def.symbolId, h.pointHover(def.label, fields));
          map.on("mouseleave", def.symbolId, h.pointLeave);
          map.on("click", def.symbolId, h.pointClick(def.label, fields));
        }
      }
      if (def.kind === "dda" && def.lineId) {
        const labelId = ddaLabelId(def.srcId);
        if (!map.getLayer(labelId)) {
          const isDark = themeRef.current === "dark";
          map.addLayer({
            id: labelId,
            type: "symbol",
            source: def.srcId,
            minzoom: 15,
            layout: {
              "text-field": ["coalesce", ["get", "PLOT_NUMBER"], ""],
              "text-size": 10,
              // 2026-05-24 fix: openmaptiles glyph CDN returns
              // text/html (not protobuf) for the "Noto Sans Regular"
              // fontstack, breaking the layer with "Unimplemented
              // type: 4". The Open Sans Regular endpoint returns
              // valid PBF, so use that instead. Pair-fix for the
              // DISTRICT_NAMES_LAYER text-font below.
              "text-font": ["Open Sans Regular"],
              "text-allow-overlap": false,
              "symbol-placement": "point",
              visibility: "none",
            },
            paint: {
              // Warm off-white on a soft-blurred navy halo for a
              // "frosted glass" feel without full CSS backdrop-filter
              // (WebGL text can't have real CSS blur — text-halo-blur
              // is the closest approximation we have).
              "text-color": isDark ? "#f5f1e8" : "#1A1A2E",
              "text-halo-color": isDark ? "rgba(10, 22, 40, 0.75)" : "rgba(255, 255, 255, 0.85)",
              "text-halo-width": 1.8,
              "text-halo-blur": 0.5,
            },
          });
        }
        const h = hoverHandlersRef.current;
        if (h.ddaPlotHover && h.masterPlanLeave) {
          map.on("mousemove", def.lineId, h.ddaPlotHover);
          map.on("mouseleave", def.lineId, h.masterPlanLeave);
        }
      }
      if (def.kind === "masterplan" && def.hoverLabel && def.lineId) {
        const h = hoverHandlersRef.current;
        if (h.masterPlanHover && h.masterPlanLeave) {
          map.on("mousemove", def.lineId, h.masterPlanHover(def.hoverLabel));
          map.on("mouseleave", def.lineId, h.masterPlanLeave);
        }
      }
      loadedLayersRef.current.add(def.key);
      return true;
    } catch (e) {
      console.error(`[layer ${def.key}] load failed`, e);
      return false;
    } finally {
      loadingLayersRef.current.delete(def.key);
    }
  }

  async function setLayerVisibility(map: MLMap, def: LayerDef, on: boolean, plotLabelsOn?: boolean) {
    if (on && !loadedLayersRef.current.has(def.key)) {
      const ok = await loadLayer(map, def);
      if (!ok) return;
    }
    const v = on ? "visible" : "none";
    if (def.fillId && map.getLayer(def.fillId)) {
      map.setLayoutProperty(def.fillId, "visibility", v);
    }
    if (def.lineId && map.getLayer(def.lineId)) {
      map.setLayoutProperty(def.lineId, "visibility", v);
    }
    if (def.symbolId && map.getLayer(def.symbolId)) {
      map.setLayoutProperty(def.symbolId, "visibility", v);
    }
    if (def.kind === "dda") {
      const labelId = ddaLabelId(def.srcId);
      if (map.getLayer(labelId)) {
        const labelsOn = plotLabelsOn ?? layersRef.current.plotLabels;
        map.setLayoutProperty(labelId, "visibility", on && labelsOn ? "visible" : "none");
      }
    }
  }

  // ─────────────────────────────────────────────────────────────────────
  //  ZAAHI Plots — the real listings layer.
  //
  //  Always loads at map start. Reads /api/parcels/map (auth-required —
  //  served only to approved users via apiFetch). For each parcel:
  //   - the polygon goes into ZAAHI_PLOTS_SRC and feeds 4 layers
  //     (fill / line / glow halo / crisp pulsing outline)
  //   - one or more 3D extrusion polygons (podium / body / crown) go
  //     into ZAAHI_BUILDINGS_SRC and feed 4 fill-extrusion layers
  //
  //  Building footprint generation:
  //   - if the affection plan has buildingLimitGeometry → use it
  //   - otherwise inset the plot polygon by the average DDA setback
  //   - for MIXED_USE: stepped tower with 3 visible tiers
  //   - for FUTURE_DEVELOPMENT: polygon only, no extrusion
  //
  //  All 3D heights come from maxHeightMeters in the affection plan,
  //  with a fallback derived from GFA / plot area / coverage when DDA
  //  doesn't have it. Idempotent on map.getSource — safe to call after
  //  a basemap swap.
  // ─────────────────────────────────────────────────────────────────────
  // ── ZAAHI Signature 3D — setback helpers ───────────────────────────
  // Spec lives in CLAUDE.md "Правила 3D моделей (ZAAHI Signature)".
  // The DB still stores the raw DDA setbacks per plan; these helpers
  // pick a single representative metres-value to inset the polygon by.

  /** Land-use defaults when DDA has no per-plot setback data. */
  function defaultSetbackM(landUse: string | null, sub: string | null): number {
    if (!landUse) return 5;
    switch (landUse) {
      case "RESIDENTIAL":
        // Villas / townhouses: 3m all around. Apartments: 5m road
        // + 3m sides → ~4m representative for a uniform inset.
        if (sub && /villa|townhouse|town\s*house/i.test(sub)) return 3;
        return 4;
      case "COMMERCIAL":
      case "OFFICE":
      case "RETAIL":
        return 0; // commercial fills the plot edge to edge
      case "HOTEL":
      case "HOSPITALITY":
        return 3;
      case "INDUSTRIAL":
      case "WAREHOUSE":
        return 4;
      case "FUTURE_DEVELOPMENT":
      case "FUTURE DEVELOPMENT":
        // Follow the INDUSTRIAL pattern: 4 m inset. Visually produces
        // one near-plot-sized block, same treatment founder ratified
        // 2026-04-23 for FUTURE_DEVELOPMENT plots.
        return 4;
      case "EDUCATIONAL":
      case "EDUCATION":
      case "HEALTHCARE":
        return 5;
      case "AGRICULTURAL":
      case "AGRICULTURE":
        return 10;
      case "MIXED_USE":
        return 4;
      default:
        return 5;
    }
  }

  /**
   * Pick the metres value to use for inset. Prefer DDA's affection-plan
   * setbacks (most specific), fall back to land-use defaults, and bypass
   * inset entirely for very small plots.
   */
  function computeSetbackM(
    plotSqft: number,
    landUse: string | null,
    setbacks: Array<{ side: number; building: number | null; podium: number | null }> | null,
    sub: string | null,
  ): number {
    // Tiny plots — building fills the boundary, no setback.
    if (plotSqft > 0 && plotSqft < 5000) return 0;

    if (setbacks && setbacks.length > 0) {
      const vals = setbacks
        .map((s) => s.building ?? s.podium ?? 0)
        .filter((v) => v > 0);
      if (vals.length > 0) {
        return vals.reduce((a, b) => a + b, 0) / vals.length;
      }
    }
    return defaultSetbackM(landUse, sub);
  }

  /**
   * Inset a polygon ring uniformly toward its centroid by `setbackM`
   * metres. Caps the resulting scale at 0.5 so very deep setbacks on
   * small plots still produce a visible building. setbackM <= 0 returns
   * the ring unchanged (used for the small-plot bypass + commercial).
   */
  function insetRingByMeters(ring: number[][], setbackM: number): number[][] {
    if (setbackM <= 0) return ring;
    const lngs = ring.map((p) => p[0]);
    const lats = ring.map((p) => p[1]);
    const midLat = (Math.max(...lats) + Math.min(...lats)) / 2;
    const dLng =
      (Math.max(...lngs) - Math.min(...lngs)) *
      111000 *
      Math.cos((midLat * Math.PI) / 180);
    const dLat = (Math.max(...lats) - Math.min(...lats)) * 111000;
    const halfWidth = Math.min(dLng, dLat) / 2;
    if (halfWidth <= 0) return ring;
    const scale = Math.max(0.5, 1 - setbackM / halfWidth);
    const cLng = ring.reduce((s, p) => s + p[0], 0) / ring.length;
    const cLat = ring.reduce((s, p) => s + p[1], 0) / ring.length;
    return ring.map(([lng, lat]) => [
      cLng + (lng - cLng) * scale,
      cLat + (lat - cLat) * scale,
    ]);
  }

  // Phase 3 vault unification (2026-05-30): function is now idempotent —
  // safe to call after a vault add to refresh the source. On first call
  // it creates sources + layers; on subsequent calls it calls setData
  // on the existing geojson sources.
  async function loadZaahiPlots(map: MLMap) {
    if (!map.getStyle()) return;
    try {
      const r = await apiFetch("/api/parcels/map");
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      const payload = (await r.json()) as {
        items: Array<{
          id: string;
          plotNumber: string;
          district: string;
          emirate: string;
          status: string;
          area: number;
          geometry: GeoJSON.Polygon | null;
          currentValuation: string | null;
          // Phase 3 vault unification (2026-05-30): caller's own
          // VAULT_PRIVATE parcels arrive in the same payload tagged
          // with isVault + vaultEntryId so the click handler can route
          // to VaultSidePanelAdapter. conflictsWithOthers drives the
          // shared conflict-marker layer.
          isVault: boolean;
          vaultEntryId: string | null;
          conflictsWithOthers: boolean;
          plan: {
            projectName?: string | null;
            community?: string | null;
            maxFloors?: number | null;
            maxHeightMeters?: number | null;
            maxHeightCode?: string | null;
            plotAreaSqm?: number | null;
            plotAreaSqft?: number | null;
            maxGfaSqm?: number | null;
            maxGfaSqft?: number | null;
            sitePlanIssue?: string | null;
            fetchedAt?: string | null;
            far?: number | null;
            buildingLimitGeometry?: GeoJSON.Polygon | null;
            setbacks?: Array<{ side: number; building: number | null; podium: number | null }> | null;
            landUseMix?: Array<{ category: string; sub?: string | null }> | null;
            buildingStyle?: string | null;
          } | null;
        }>;
      };

      // Style may have been torn down during the fetch (basemap swap,
      // unmount). Bail before touching map.addSource / map.addLayer.
      if (!map.getStyle()) return;

      // Split plot numbers by isVault so PMTiles exclusion can switch
      // direction with vault-only mode (founder spec 2026-05-31, symmetric
      // revision). Each side is excluded from PMTiles only while ZAAHI is
      // currently rendering it — the other side falls through as PMTiles
      // background, filling the gap left by the direction-hidden ZAAHI
      // feature. See applyZaahiExclusionToTileLayers below.
      const listingsPnSet = new Set<string>();
      const vaultPnSet = new Set<string>();
      for (const it of payload.items) {
        (it.isVault ? vaultPnSet : listingsPnSet).add(it.plotNumber);
      }
      zaahiListingPnRef.current = listingsPnSet;
      zaahiVaultPnRef.current = vaultPnSet;

      // Hide PMTiles features that would visually collide with whichever
      // ZAAHI side is currently rendering (no double-stacking of curated
      // SIGNATURE building over the PMTiles background building). The
      // exclude set depends on vault-only direction — see
      // applyZaahiExclusionToTileLayers for the full rules and the
      // privacy rationale. 12 setFilter calls (4 sources × 3 layers each).
      applyZaahiExclusionToTileLayers(map);

      const plotFeatures: GeoJSON.Feature[] = [];
      const buildingFeatures: GeoJSON.Feature[] = [];
      for (const it of payload.items) {
        if (!it.geometry || it.geometry.type !== "Polygon") continue;
        const aed = it.currentValuation ? Math.floor(Number(it.currentValuation) / 100) : null;
        // landUse is null when DDA has no land-use info — those parcels
        // render as outline-only (no fill, no 3D extrusion).
        const landUse = deriveLandUse(it.plan?.landUseMix);
        const hasLandUse = landUse != null;
        plotFeatures.push({
          type: "Feature",
          id: it.id,
          geometry: it.geometry,
          properties: {
            id: it.id,
            plotNumber: it.plotNumber,
            district: it.district,
            emirate: it.emirate,
            area: it.area,
            priceAed: aed,
            landUse: landUse ?? "",
            hasLandUse,
            color: hasLandUse
              ? (ZAAHI_LANDUSE_COLOR[landUse] ?? ZAAHI_DEFAULT_COLOR)
              : ZAAHI_DEFAULT_COLOR,
            // Hover-card fields (flattened from latest affection plan).
            projectName: it.plan?.projectName ?? "",
            plotAreaSqm: it.plan?.plotAreaSqm ?? 0,
            plotAreaSqft: it.plan?.plotAreaSqft ?? 0,
            maxGfaSqm: it.plan?.maxGfaSqm ?? 0,
            maxGfaSqft: it.plan?.maxGfaSqft ?? 0,
            maxFloors: it.plan?.maxFloors ?? 0,
            maxHeightMeters: it.plan?.maxHeightMeters ?? 0,
            maxHeightCode: it.plan?.maxHeightCode ?? "",
            far: it.plan?.far ?? 0,
            planDateIso: it.plan?.sitePlanIssue ?? it.plan?.fetchedAt ?? "",
            // Vault branch (Phase 3) — drives click routing + conflict
            // marker filter + vault-only mode filter.
            isVault: it.isVault,
            vaultEntryId: it.vaultEntryId,
            conflictsWithOthers: it.conflictsWithOthers,
            // Archie filter_by_status tool (Phase 2 archie client)
            // reads this. ParcelStatus enum from /api/parcels/map.
            status: it.status,
          },
        });
        // Skip 3D building generation for parcels without a land use —
        // founder spec: outline only when land use is missing.
        if (!hasLandUse) continue;
        // NB: FUTURE_DEVELOPMENT plots flow through the standard ZAAHI
        // 3D path below — they are NOT short-circuited. The path's
        // `defaultSetbackM` / height-fallback / FLAT-tier branches all
        // carry an explicit `case "FUTURE_DEVELOPMENT"` so the render
        // matches the INDUSTRIAL pattern (one block per plot, filling
        // most of the plot, no podium/body/crown taper).
        // Founder decision 2026-04-23, supersedes the prior "flat
        // polygon only" rule.


        // ── ZAAHI 3D — minimal version per founder spec (4th attempt) ──
        // ONE feature per parcel. ONE fill-extrusion layer below. The
        // feature carries its own `color` (hex string) and `height`
        // (number > 0) so the layer paint can use plain ["get", "color"]
        // and ["get", "height"] — no match expressions, no kind filters.
        const blg = it.plan?.buildingLimitGeometry;
        const plotRing = (it.geometry as GeoJSON.Polygon).coordinates[0];

        // Footprint: building-limit polygon if DDA has it, else the
        // plot polygon insetted by the founder-spec setback in metres.
        let footprintRing: number[][];
        if (blg && blg.type === "Polygon") {
          footprintRing = blg.coordinates[0];
        } else {
          const setbackM = computeSetbackM(
            it.area,
            landUse,
            it.plan?.setbacks ?? null,
            it.plan?.landUseMix?.[0]?.sub ?? null,
          );
          footprintRing = insetRingByMeters(plotRing, setbackM);
        }

        // Height: prefer maxHeightMeters from DDA, else floors × 3.5,
        // else a per-land-use default. ALWAYS > 0 so the extrusion
        // is visible.
        let totalH = it.plan?.maxHeightMeters ?? 0;
        if (totalH <= 0 && it.plan?.maxFloors) {
          totalH = it.plan.maxFloors * 3.5;
        }
        if (totalH <= 0 && it.plan?.maxGfaSqm && it.plan?.plotAreaSqm) {
          const footprintArea = it.plan.plotAreaSqm * 0.6;
          const floors = Math.ceil(it.plan.maxGfaSqm / footprintArea);
          totalH = floors * 3.5;
        }
        if (totalH <= 0) {
          // Per-land-use fallback heights (metres) so every 3D-eligible
          // parcel renders SOMETHING even when DDA has no height data.
          totalH =
            landUse === "RESIDENTIAL"  ? 15 :
            landUse === "COMMERCIAL"   ? 30 :
            landUse === "MIXED_USE"    ? 40 :
            landUse === "HOTEL"        ? 50 :
            landUse === "HOSPITALITY"  ? 50 :
            landUse === "INDUSTRIAL"   ? 12 :
            landUse === "FUTURE_DEVELOPMENT" ? 16 :
            landUse === "FUTURE DEVELOPMENT" ? 16 :
            landUse === "WAREHOUSE"    ? 12 :
            landUse === "EDUCATIONAL"  ? 12 :
            landUse === "EDUCATION"    ? 12 :
            landUse === "HEALTHCARE"   ? 18 :
            landUse === "AGRICULTURAL" ?  6 :
            landUse === "AGRICULTURE"  ?  6 :
            20;
        }

        const buildingHex = ZAAHI_LANDUSE_COLOR[landUse] ?? ZAAHI_DEFAULT_COLOR;

        // ── ZAAHI Signature stepped 3D ──
        // Each building is 1, 2, or 3 features depending on height:
        //   floors ≤ 4   → podium only (full footprint, full height)
        //   floors 5-10  → podium (0–14 m) + body (14–top, 70% footprint)
        //   floors > 10  → podium + body (14–top-7) + crown (top-7→top, 50%)
        // All features go into the SAME source and SAME fill-extrusion
        // layer below — no kind filters, no separate layers. Stepped
        // look comes from the ring being scaled toward its centroid.
        const FLOOR_H = 3.5;
        const PODIUM_TOP = 14; // 4 floors
        const CROWN_H = 7;     // top 2 floors
        const floors = Math.max(1, Math.round(totalH / FLOOR_H));

        // Centroid scale of a ring (uniform inset toward its centroid).
        const scaleRingFromCentroid = (ring: number[][], scale: number): number[][] => {
          const cx = ring.reduce((s, p) => s + p[0], 0) / ring.length;
          const cy = ring.reduce((s, p) => s + p[1], 0) / ring.length;
          return ring.map(([lng, lat]) => [
            cx + (lng - cx) * scale,
            cy + (lat - cy) * scale,
          ]);
        };

        const pushTier = (ring: number[][], baseM: number, topM: number) => {
          buildingFeatures.push({
            type: "Feature",
            geometry: { type: "Polygon", coordinates: [ring] },
            properties: {
              parcelId: it.id,
              landUse,
              color: buildingHex,
              height: topM,
              base: baseM,
              // Phase 3 vault-only mode filter scopes ZAAHI_BUILDINGS_3D
              // by isVault === true. Tier features must carry the prop
              // or the filter excludes every building when the mode
              // toggles on. Plot features get this via the API; tier
              // features are derived locally so we pass it through.
              isVault: it.isVault,
              // Archie filter_by_status tool (Phase 2 archie client)
              // — same prop on building tiers so the filter scopes
              // both plot polygons and 3D extrusions consistently.
              status: it.status,
            },
          });
        };

        // ── Data-driven style selection ──
        // AffectionPlan.buildingStyle === "FLAT" → single block of full
        // footprint at full height (correct for most commercial office
        // buildings where there is no visual podium/tower distinction).
        // FUTURE_DEVELOPMENT → same flat-block render (founder 2026-04-23:
        // match the INDUSTRIAL pattern regardless of floor count · no
        // podium/body/crown taper for pre-master-plan land).
        // Default/null/"SIGNATURE" → ZAAHI tiered model below.
        // Per-plot opt-in keeps the renderer free of hardcoded plot-number
        // overrides (per CLAUDE.md rule).
        const forceFlat =
          it.plan?.buildingStyle === "FLAT" ||
          landUse === "FUTURE_DEVELOPMENT" ||
          landUse === "FUTURE DEVELOPMENT";
        if (forceFlat) {
          pushTier(footprintRing, 0, totalH);
        } else if (floors <= 4) {
          // Podium only — short building, no taper.
          pushTier(footprintRing, 0, totalH);
        } else if (floors <= 10) {
          // Podium + body. No crown — body extends to the very top.
          pushTier(footprintRing, 0, PODIUM_TOP);
          pushTier(scaleRingFromCentroid(footprintRing, 0.7), PODIUM_TOP, totalH);
        } else {
          // Full ZAAHI Signature — podium + body + crown.
          pushTier(footprintRing, 0, PODIUM_TOP);
          pushTier(scaleRingFromCentroid(footprintRing, 0.7), PODIUM_TOP, totalH - CROWN_H);
          pushTier(scaleRingFromCentroid(footprintRing, 0.5), totalH - CROWN_H, totalH);
        }
      }

      console.log(
        "[ZAAHI]",
        "plotFeatures:", plotFeatures.length,
        "buildingFeatures:", buildingFeatures.length,
        "(of", payload.items.length, "parcels)",
      );
      // Plot source: setData when it already exists (refresh path used
      // after a vault add), else addSource + register all four plot
      // layers (FILL / LINE / GLOW / GLOW_CRISP). The race-guard
      // semantics from the pre-Phase-3 early-return move here — a
      // re-entrant call now just updates data instead of being
      // discarded.
      const plotSrc = map.getSource(ZAAHI_PLOTS_SRC);
      if (plotSrc) {
        (plotSrc as maplibregl.GeoJSONSource).setData({
          type: "FeatureCollection",
          features: plotFeatures,
        });
      } else {
        // Initial filter for the three vault-direction layers
        // (FILL / LINE / BUILDINGS_3D). Baking the composed filter into
        // addLayer prevents the first-paint race where a freshly created
        // layer would render unfiltered for one frame and leak the
        // wrong side of the vault direction (PPV in OFF mode, listings
        // in ON mode). Subsequent toggles travel via reapplyMapFilters.
        const initialFilter = buildZaahiFilter();

        map.addSource(ZAAHI_PLOTS_SRC, {
          type: "geojson",
          data: { type: "FeatureCollection", features: plotFeatures },
        });
        if (!map.getLayer(ZAAHI_PLOTS_FILL)) {
          map.addLayer({
            id: ZAAHI_PLOTS_FILL,
            type: "fill",
            source: ZAAHI_PLOTS_SRC,
            filter: initialFilter,
            paint: {
              "fill-color": ["get", "color"],
              // 0.4 when DDA has assigned a land use, 0 (outline-only) when not.
              "fill-opacity": [
                "case",
                ["==", ["get", "hasLandUse"], true],
                0.4,
                0,
              ],
              "fill-opacity-transition": { duration: 300 },
              "fill-color-transition": { duration: 300 },
            },
          });
        }
        if (!map.getLayer(ZAAHI_PLOTS_LINE)) {
          map.addLayer({
            id: ZAAHI_PLOTS_LINE,
            type: "line",
            source: ZAAHI_PLOTS_SRC,
            filter: initialFilter,
            paint: {
              "line-color": ["get", "color"],
              "line-width": 2,
              "line-opacity-transition": { duration: 300 },
            },
          });
        }
        if (!map.getLayer(ZAAHI_PLOTS_GLOW)) {
          map.addLayer({
            id: ZAAHI_PLOTS_GLOW,
            type: "line",
            source: ZAAHI_PLOTS_SRC,
            filter: ["==", ["id"], "__none__"],
            paint: { "line-color": "#FFD700", "line-width": 6, "line-blur": 8, "line-opacity": 0.9 },
          });
        }
        if (!map.getLayer(ZAAHI_PLOTS_GLOW_CRISP)) {
          map.addLayer({
            id: ZAAHI_PLOTS_GLOW_CRISP,
            type: "line",
            source: ZAAHI_PLOTS_SRC,
            filter: ["==", ["id"], "__none__"],
            paint: { "line-color": "#FFD700", "line-width": 2, "line-opacity": 1 },
          });
        }
      }

      // ── 3D BUILDING EXTRUSION — single layer, single source ──
      // Founder spec (4th attempt fix): one fill-extrusion layer, no
      // per-kind filters, no match expressions, no podium/body/crown
      // tiers. Each feature carries its own `color` (hex string from
      // ZAAHI_LANDUSE_COLOR) and `height` (metres) so the paint can
      // use plain `["get", "color"]` and `["get", "height"]`.
      console.log("[ZAAHI]", "buildingFeatures count:", buildingFeatures.length);
      const buildingSrc = map.getSource(ZAAHI_BUILDINGS_SRC);
      if (buildingSrc) {
        (buildingSrc as maplibregl.GeoJSONSource).setData({
          type: "FeatureCollection",
          features: buildingFeatures,
        });
      } else {
        console.log("[ZAAHI]", "addSource:", ZAAHI_BUILDINGS_SRC);
        map.addSource(ZAAHI_BUILDINGS_SRC, {
          type: "geojson",
          data: { type: "FeatureCollection", features: buildingFeatures },
        });
        if (!map.getLayer(ZAAHI_BUILDINGS_3D)) {
          console.log("[ZAAHI]", "addLayer:", ZAAHI_BUILDINGS_3D, "fill-extrusion", "features:", buildingFeatures.length);
          map.addLayer({
            id: ZAAHI_BUILDINGS_3D,
            type: "fill-extrusion",
            source: ZAAHI_BUILDINGS_SRC,
            // Same direction filter as the plot fill/line — see comment
            // in the plot-source branch above for the first-paint race
            // it prevents.
            filter: buildZaahiFilter(),
            paint: {
              "fill-extrusion-color": ["get", "color"],
              "fill-extrusion-height": ["get", "height"],
              "fill-extrusion-base": ["get", "base"],
              // ZAAHI listings (our 101 parcels) render SOLID so they
              // stand out against the PMTiles background layers which
              // stay at 0.35. Single literal — data expressions are
              // not supported on fill-extrusion-opacity.
              "fill-extrusion-opacity": 1,
            },
          });
        }
      }

      // ── Vault conflict markers (Phase 3 migration) ──
      // Red dot rendered above polygons where the caller's vault
      // entry conflicts with another user's entry for the same plot.
      // Migrated off the old VAULT_MINE_SRC onto ZAAHI_PLOTS_SRC —
      // one feature per parcel, no tier-multiplication, so the marker
      // never doubles up. Filter gates on isVault + conflictsWithOthers
      // so public listings never carry the dot.
      if (!map.getLayer(VAULT_CONFLICT_MARKERS_LAYER)) {
        map.addLayer({
          id: VAULT_CONFLICT_MARKERS_LAYER,
          type: "circle",
          source: ZAAHI_PLOTS_SRC,
          filter: [
            "all",
            ["==", ["get", "isVault"], true],
            ["==", ["get", "conflictsWithOthers"], true],
          ],
          // v2 fix (founder spec 2026-05-31): markers must hide when
          // vault polygons are hidden, otherwise red dots float on the
          // map where the underlying VAULT_PRIVATE plot was filtered
          // out. The v1 attempt missed this — root cause of the revert.
          // Toggled in the [vaultOnlyMode] useEffect below.
          layout: {
            visibility: vaultOnlyModeRef.current ? "visible" : "none",
          },
          paint: {
            "circle-radius": 6,
            "circle-color": "#E63946",
            "circle-stroke-color": "#1A1A2E",
            "circle-stroke-width": 2,
            "circle-opacity": 0.9,
          },
        });
      }
    } catch (e) {
      console.error("[zaahi-plots] load failed", e);
    }
  }

  // ── Map filter composition (Phase 2 archie client, 2026-05-30) ──
  //
  // ONE filter per layer is a maplibre invariant. Four sources of
  // truth feed the composite filter on the ZAAHI plot/building layers:
  //   • vault-mode DIRECTION (always active)   — see below
  //   • Archie filter_by_land_use tool         — landUse === <enum>
  //   • Archie filter_by_status tool           — status === <enum>
  //
  // Vault-mode direction (founder spec 2026-05-31 v2):
  //   OFF (default): isVault !== true → public listings only,
  //                  caller's VAULT_PRIVATE plots hidden.
  //   ON  (lock):    isVault === true → caller's PPV only,
  //                  public listings hidden.
  // Because the direction filter is always active, buildZaahiFilter
  // never returns null. The v1 attempt (commit 485711e) put the
  // direction flip inline in the useEffect; v2 folds it into the
  // composer so Archie's filter_by_land_use / filter_by_status tools
  // continue to compose cleanly via ["all", …].
  //
  // reapplyMapFilters reads the three refs + maps over the three
  // affected layers. Safe to call multiple times — setFilter replaces
  // the prior filter atomically.
  function buildZaahiFilter(): FilterSpecification {
    const direction: FilterSpecification = vaultOnlyModeRef.current
      ? ["==", ["get", "isVault"], true]
      : ["!=", ["get", "isVault"], true];
    const parts: FilterSpecification[] = [direction];
    if (archieLandUseRef.current) {
      parts.push(["==", ["get", "landUse"], archieLandUseRef.current]);
    }
    if (archieStatusRef.current) {
      parts.push(["==", ["get", "status"], archieStatusRef.current]);
    }
    if (parts.length === 1) return parts[0];
    return ["all", ...parts] as FilterSpecification;
  }
  function reapplyMapFilters() {
    const map = mapRef.current;
    if (!map) return;
    const expr = buildZaahiFilter();
    for (const lid of [ZAAHI_PLOTS_FILL, ZAAHI_PLOTS_LINE, ZAAHI_BUILDINGS_3D]) {
      if (map.getLayer(lid)) {
        map.setFilter(lid, expr);
      }
    }
  }

  // ── Private Plot Vault — Phase 3 (2026-05-30) ────────────────────
  //
  // Owner-side vault entries (the caller's own VAULT_PRIVATE plots)
  // now flow through the unified loadZaahiPlots above. Only the
  // shared-to-me layer keeps its own source/loader here — see
  // loadVaultShared below. Visual treatment for shares: fill colour
  // by stage, fill-extrusion-opacity 0.55 (literal). Conflict markers
  // moved to ZAAHI_PLOTS_SRC (see loadZaahiPlots).
  //
  // loadVaultShared is a no-op when the API returns 401 (user signed
  // out mid-session) — the route is auth-gated.

  /** Load entries shared TO the caller onto the VAULT_SHARED_3D layer. */
  async function loadVaultShared(map: MLMap) {
    try {
      const r = await apiFetch("/api/vault/shared-with-me/map");
      if (!r.ok) {
        if (r.status !== 401) console.warn("[vault-shared] fetch:", r.status);
        return;
      }
      const data = (await r.json()) as GeoJSON.FeatureCollection;

      // Tier expansion (1–3 features per entry): DDA-resolved →
      // ZAAHI Signature podium/body/crown via emitSignatureTiers;
      // non-DDA polygon → flat 30 m block; placeholder lat/lng → 3 m
      // mini-block at the synthesised 5 m square. tierIndex===0 filter
      // on conflict-marker layer (when wired) so multi-tier entries
      // get exactly one marker.
      const features: GeoJSON.Feature[] = [];
      for (const f of data.features) {
        if (!f.geometry || f.geometry.type !== "Polygon") continue;
        const props = (f.properties ?? {}) as Record<string, unknown>;
        const stage = String(props.stage ?? "LEAD");
        const placeholder = props.placeholder === true;
        const plan = (props.affectionPlan ?? null) as {
          maxFloors?: number | null;
          maxHeightMeters?: number | null;
          maxHeightCode?: string | null;
          far?: number | null;
          plotAreaSqft?: number | null;
          maxGfaSqft?: number | null;
          projectName?: string | null;
          sitePlanIssue?: string | null;
          buildingLimitGeometry?: GeoJSON.Polygon | null;
          setbacks?: SetbackEntry[] | null;
          landUseMix?: Array<{ category: string; sub?: string | null }> | null;
          buildingStyle?: string | null;
        } | null;

        // Land-use colour parity with public listings (founder spec
        // 2026-05-30). Stage tone moves to the SidePanel pipeline block.
        const landUseKey =
          deriveLandUse(plan?.landUseMix) ??
          (typeof props.landUse === "string" && props.landUse
            ? props.landUse.toUpperCase().replace(/[ -]+/g, "_")
            : null);
        const color = (landUseKey && ZAAHI_LANDUSE_COLOR[landUseKey]) ?? ZAAHI_DEFAULT_COLOR;
        const baseProps = {
          ...props,
          color,
          stage,
          landUse: landUseKey ?? "",
          projectName: plan?.projectName ?? "",
          maxFloors: plan?.maxFloors ?? 0,
          maxHeightCode: plan?.maxHeightCode ?? "",
          maxHeightMeters: plan?.maxHeightMeters ?? 0,
          far: plan?.far ?? 0,
          plotAreaSqft: plan?.plotAreaSqft ?? 0,
          maxGfaSqft: plan?.maxGfaSqft ?? 0,
          planDateIso: plan?.sitePlanIssue ?? "",
        };

        if (placeholder) {
          features.push({
            type: "Feature",
            geometry: f.geometry,
            properties: { ...baseProps, height: 3, base: 0, tierIndex: 0 },
          });
          continue;
        }

        if (plan) {
          const tiers = emitSignatureTiers({
            plotPolygon: f.geometry as GeoJSON.Polygon,
            landUse: (typeof props.landUse === "string" && props.landUse) ? props.landUse : null,
            areaSqft: typeof props.area === "number" ? props.area : null,
            buildingLimitGeometry: (plan.buildingLimitGeometry ?? null) as GeoJSON.Polygon | null,
            setbacks: plan.setbacks ?? null,
            maxHeightMeters: plan.maxHeightMeters ?? null,
            maxFloors: plan.maxFloors ?? null,
            landUseSub: plan.landUseMix?.[0]?.sub ?? null,
            buildingStyle: plan.buildingStyle ?? null,
          });
          tiers.forEach((t, idx) => {
            features.push({
              type: "Feature",
              geometry: { type: "Polygon", coordinates: [t.ring] },
              properties: { ...baseProps, height: t.topMeters, base: t.baseMeters, tierIndex: idx },
            });
          });
          continue;
        }

        features.push({
          type: "Feature",
          geometry: f.geometry,
          properties: { ...baseProps, height: 30, base: 0, tierIndex: 0 },
        });
      }

      if (map.getSource(VAULT_SHARED_SRC)) {
        (map.getSource(VAULT_SHARED_SRC) as maplibregl.GeoJSONSource).setData({
          type: "FeatureCollection",
          features,
        });
      } else {
        map.addSource(VAULT_SHARED_SRC, {
          type: "geojson",
          data: { type: "FeatureCollection", features },
        });
      }

      if (!map.getLayer(VAULT_SHARED_3D)) {
        map.addLayer({
          id: VAULT_SHARED_3D,
          type: "fill-extrusion",
          source: VAULT_SHARED_SRC,
          layout: { visibility: "none" },
          paint: {
            "fill-extrusion-color": ["get", "color"],
            "fill-extrusion-height": ["get", "height"],
            "fill-extrusion-base": ["get", "base"],
            "fill-extrusion-opacity": 1, // listing parity — solid (founder 2026-05-30)
          },
        });
      }
    } catch (e) {
      console.error("[vault-shared] load failed:", e);
    }
  }

  // ── PMTiles: DDA + AD Land Plots ─────────────────────────────────
  // Pre-built vector tiles served from /tiles/*.pmtiles (static files).
  // 99K DDA + 362K AD plots with color/height/landUse pre-computed.
  // Added to the map once in the "load" handler; toggled via layout visibility.

  const DDA_LAND_TILES_SRC = "dda-land-tiles";
  const DDA_LAND_TILES_FILL = "dda-land-tiles-fill";
  const DDA_LAND_TILES_LINE = "dda-land-tiles-line";
  const DDA_LAND_TILES_3D = "dda-land-tiles-3d";
  // AD split into two <100MB files (Vercel / GitHub 100MB limit, no LFS)
  const AD_ADM_TILES_SRC = "ad-adm-tiles";
  const AD_ADM_TILES_FILL = "ad-adm-tiles-fill";
  const AD_ADM_TILES_LINE = "ad-adm-tiles-line";
  const AD_ADM_TILES_3D = "ad-adm-tiles-3d";
  const AD_OTHER_TILES_SRC = "ad-other-tiles";
  const AD_OTHER_TILES_FILL = "ad-other-tiles-fill";
  const AD_OTHER_TILES_LINE = "ad-other-tiles-line";
  const AD_OTHER_TILES_3D = "ad-other-tiles-3d";
  // Oman PMTiles consts removed 2026-05-24 — Saudi + Oman coverage
  // dropped from the platform. data/tiles/oman-plots.geojson.nl and
  // the R2 oman-land.pmtiles object stay around as orphans; remove
  // them in a separate dataset-cleanup pass if/when desired.

  /**
   * Re-apply each PMTiles layer's base filter (tier=flat / tier!=flat)
   * combined with a NOT-IN-zaahiPlotNumbers exclusion. Called from
   * loadZaahiPlots after the ZAAHI plot-number set is populated.
   *
   * Idempotent — safe to call repeatedly. Layers that aren't on the map
   * yet (basemap swap mid-flight) are silently skipped; the next time
   * loadZaahiPlots runs after a swap they'll be re-filtered.
   *
   * Without this, ZAAHI's curated SIGNATURE 3D buildings (opacity 1)
   * and the matching PMTiles background features (opacity 0.35) render
   * on top of each other on all 114 curated plots — visible as a
   * darker / double-shadowed silhouette around our listings.
   */
  // Exclude ZAAHI plot numbers from the PMTiles fill/line/3D layers so
  // the curated SIGNATURE buildings and the PMTiles background don't
  // double-stack. The exclusion set is now SYMMETRIC — it excludes
  // exactly the side ZAAHI is currently rendering:
  //
  //   OFF (ZAAHI renders listings): exclude listingsPnSet
  //                                  → vault polygons fall through to
  //                                    PMTiles as background, filling
  //                                    the visual gap left by the
  //                                    direction-hidden vault row.
  //   ON  (ZAAHI renders PPV):      exclude vaultPnSet
  //                                  → listing polygons fall through to
  //                                    PMTiles as background, filling
  //                                    the gap left by the hidden
  //                                    listing row.
  //
  // Founder spec 2026-05-31 (symmetric revision): the prior "vault
  // numbers ALWAYS excluded for privacy" was over-cautious. The vault
  // data (price, owner contacts, broker notes, stage) lives in the
  // vault tables and is gated by auth + ownership; the *plot itself*
  // on the map is already public DDA registry data — observable to
  // anyone with the parcel layer enabled, vault or not. So letting
  // PMTiles paint the plot as an ordinary DDA background polygon when
  // ZAAHI doesn't render it leaks nothing the public registry doesn't
  // already publish.
  //
  // Reads vaultOnlyModeRef + the two split refs — both kept in sync by
  // loadZaahiPlots and the vault-only useEffect. Safe to call from
  // either; setFilter atomically replaces the previous filter.
  function applyZaahiExclusionToTileLayers(map: MLMap) {
    const excludeSet = vaultOnlyModeRef.current
      ? new Set<string>(zaahiVaultPnRef.current)
      : new Set<string>(zaahiListingPnRef.current);
    const exclude: maplibregl.FilterSpecification = [
      "!",
      ["in", ["get", "plotNumber"], ["literal", [...excludeSet]]],
    ];
    const flatBase: maplibregl.FilterSpecification = ["==", ["get", "tier"], "flat"];
    const tierBase: maplibregl.FilterSpecification = ["!=", ["get", "tier"], "flat"];

    const FILL_LAYERS = [DDA_LAND_TILES_FILL, AD_ADM_TILES_FILL, AD_OTHER_TILES_FILL];
    const LINE_LAYERS = [DDA_LAND_TILES_LINE, AD_ADM_TILES_LINE, AD_OTHER_TILES_LINE];
    const EXT_LAYERS  = [DDA_LAND_TILES_3D,   AD_ADM_TILES_3D,   AD_OTHER_TILES_3D];

    for (const id of FILL_LAYERS) {
      if (!map.getLayer(id)) continue;
      map.setFilter(id, ["all", flatBase, exclude]);
    }
    for (const id of LINE_LAYERS) {
      if (!map.getLayer(id)) continue;
      map.setFilter(id, ["all", flatBase, exclude]);
    }
    for (const id of EXT_LAYERS) {
      if (!map.getLayer(id)) continue;
      map.setFilter(id, ["all", tierBase, exclude]);
    }
  }

  function addLandTileSource(map: MLMap, srcId: string, fillId: string, lineId: string, extId: string, tilesUrl: string) {
    if (map.getSource(srcId)) return;
    // maxzoom: 18 — tippecanoe builds these tilesets with
    // --maximum-zoom=18 (see scripts/update-tiles.sh) as of 2026-05-24,
    // and the source value matches so MapLibre uses the deepest
    // physical tile directly without any overzoom stretch. Earlier
    // attempts pushed the source/camera to 22 then 24 against a z16
    // tile cap, which forced 6–8 levels of overzoom = 64–256× stretch:
    // (a) tippecanoe's default 5px clip buffer collapsed to ~0px so
    // polygons near tile edges dropped out, (b) the camera near-plane
    // crowded against building tops and fill-extrusion geometry got
    // culled entirely. Bump in lockstep with the Map constructor
    // maxZoom (currently 18 too) and the tippecanoe --maximum-zoom in
    // scripts/update-tiles.sh on any deeper rebuild.
    //
    // tilesUrl is a path like "/tiles/dda-land.pmtiles". The PMTiles
    // assets live on Cloudflare R2 in production; NEXT_PUBLIC_TILES_BASE_URL
    // (set on Vercel to https://pub-eb193cdc5fe84cc6aac0373ef3dfa069.r2.dev)
    // prefixes the URL there. Unset → empty prefix → relative path,
    // which is what docker-compose self-host or any developer who
    // still has the files locally needs. The .pmtiles themselves are
    // gitignored as of 2026-05-24 (see docs/r2-migration-plan.md +
    // memory project_pmtiles_overzoom_band for the rebuild history).
    const tilesBase = process.env.NEXT_PUBLIC_TILES_BASE_URL ?? "";
    const fullTilesUrl = tilesUrl.startsWith("http") ? tilesUrl : `${tilesBase}${tilesUrl}`;
    map.addSource(srcId, { type: "vector", url: `pmtiles://${fullTilesUrl}`, maxzoom: 18 });
    // 2D fill — only "flat" features (tier=flat, height=0)
    map.addLayer({ id: fillId, type: "fill", source: srcId, "source-layer": "plots", minzoom: 10, layout: { visibility: "none" },
      filter: ["==", ["get", "tier"], "flat"],
      paint: {
        "fill-color": ["get", "color"],
        "fill-opacity": ["interpolate", ["linear"], ["zoom"], 10, 0.1, 13, 0.35],
    }});
    // 2D line — only "flat" features
    map.addLayer({ id: lineId, type: "line", source: srcId, "source-layer": "plots", minzoom: 12, layout: { visibility: "none" },
      filter: ["==", ["get", "tier"], "flat"],
      paint: {
        "line-color": ["get", "color"], "line-width": 1, "line-opacity": 0.6,
    }});
    // 3D extrusion — only tier features (podium/body/crown).
    // maxzoom: 24 is MapLibre's default cap but is set explicitly here
    // to document that we want the layer rendered all the way down,
    // so a future edit can't silently shrink the visible zoom band.
    map.addLayer({ id: extId, type: "fill-extrusion", source: srcId, "source-layer": "plots", minzoom: 14, maxzoom: 24, layout: { visibility: "none" },
      filter: ["!=", ["get", "tier"], "flat"],
      paint: {
        "fill-extrusion-color": ["get", "color"],
        "fill-extrusion-height": ["get", "height"],
        "fill-extrusion-base": ["get", "base"],
        "fill-extrusion-opacity": 0.45,
    }});
    // Hover
    map.on("mousemove", fillId, (e: MapMouseEvent & { features?: GeoJSON.Feature[] }) => {
      const f = e.features?.[0];
      if (!f) return;
      // Priority: ZAAHI listings + shared-vault outrank PMTiles. If the
      // cursor is over either of those layers at this frame, defer —
      // those handlers fire on the same event and have their own popup.
      // Avoids the dual-popup overlap (e.g. "Business Bay" ZAAHI listing
      // stacked with "3460730 Open Space" PMTiles polygon).
      const blockingLayers = [ZAAHI_PLOTS_FILL, VAULT_SHARED_3D].filter(
        (lid) => map.getLayer(lid),
      );
      if (blockingLayers.length > 0) {
        const upper = map.queryRenderedFeatures(e.point, { layers: blockingLayers });
        if (upper.length > 0) {
          setDdaLandHover(null);
          return;
        }
      }
      // Re-hovering after a brief mouseleave cancels the pending close
      // so the popup stays alive through the keep-alive window.
      if (hoverCloseTimerRef.current != null) {
        window.clearTimeout(hoverCloseTimerRef.current);
        hoverCloseTimerRef.current = null;
      }
      map.getCanvas().style.cursor = "pointer";
      const pr = f.properties as Record<string, unknown>;
      const areaSqm = (pr.areaSqm as number) ?? 0;
      // DDA tiles carry AREA_SQFT directly; AD tiles only have
      // CALCULATEDAREA (in sqm) — derive sqft via 10.7639.
      const areaSqft = (pr.areaSqft as number) || Math.round(areaSqm * 10.7639);
      const gfaSqm = (pr.gfaSqm as number) ?? 0;
      const gfaSqft = gfaSqm > 0 ? Math.round(gfaSqm * 10.7639) : 0;
      setDdaLandHover({
        x: e.point.x, y: e.point.y,
        plotNumber: (pr.plotNumber as string) ?? "",
        mainLandUse: ((pr.mainLandUse as string) || (pr.primaryUse as string)) ?? "",
        areaSqm, areaSqft, gfaSqm, gfaSqft,
        status: (pr.status as string) ?? "",
        source: ((pr.source as string) ?? "") as "dda" | "ad" | "",
        municipality: (pr.municipality as string) ?? "",
        district: (pr.district as string) ?? "",
      });
      // Kill the shared boundary native popup too (see ZAAHI handler).
      popupRef.current?.remove();
    });
    // Delayed close — the hover card now has interactive content ("+"
    // button), so leaving the PMTiles polygon shouldn't instantly kill
    // the popup. 220ms window matches the zaahiHover pattern and is
    // cancellable by the popup's onMouseEnter.
    map.on("mouseleave", fillId, () => {
      map.getCanvas().style.cursor = "";
      if (hoverCloseTimerRef.current != null) {
        window.clearTimeout(hoverCloseTimerRef.current);
      }
      hoverCloseTimerRef.current = window.setTimeout(() => {
        setDdaLandHover(null);
        hoverCloseTimerRef.current = null;
      }, 220);
    });
  }

  function setLandTileVisibility(map: MLMap, fillId: string, lineId: string, extId: string, on: boolean) {
    const v = on ? "visible" : "none";
    if (map.getLayer(fillId)) map.setLayoutProperty(fillId, "visibility", v);
    if (map.getLayer(lineId)) map.setLayoutProperty(lineId, "visibility", v);
    if (map.getLayer(extId)) map.setLayoutProperty(extId, "visibility", v);
  }


  // Amenity icons — SDF-rendered symbol images for the 4 point overlays.
  // setStyle() wipes the image registry along with sources/layers, so this
  // is called both on initial map load AND inside the theme-swap styledata
  // handler, before attachOverlays runs the symbol-layer addLayer calls.
  // Idempotent: skips images already registered.
  const AMENITY_ICONS = [
    { id: "amenity-ev-charger",     url: "/icons/amenities/ev-charger.svg" },
    { id: "amenity-metro-station",  url: "/icons/amenities/metro.svg" },
    { id: "amenity-tram-station",   url: "/icons/amenities/tram.svg" },
    { id: "amenity-marine-station", url: "/icons/amenities/marine-station.svg" },
  ] as const;

  async function loadAmenityIcons(map: MLMap): Promise<void> {
    await Promise.all(
      AMENITY_ICONS.map(({ id, url }) => {
        if (map.hasImage(id)) return Promise.resolve();
        return new Promise<void>((resolve) => {
          const img = new Image(64, 64);
          img.onload = () => {
            if (!map.hasImage(id)) {
              map.addImage(id, img, { sdf: true, pixelRatio: 2 });
            }
            resolve();
          };
          img.onerror = () => {
            console.warn(`[amenity-icon] failed to load ${url}`);
            resolve();
          };
          img.src = url;
        });
      }),
    );
  }

  // Load all overlay layers onto a fresh style. Idempotent: won't re-add
  // sources that already exist (each call after setStyle attaches fresh).
  async function attachOverlays(map: MLMap) {
    // Eagerly load base layers (Communities + Roads) and any layer that
    // is currently toggled on. DDA districts are NOT loaded here — they
    // are lazy and only fetched on first toggle. Master plans are
    // queued by the map-init useEffect (after a 2-second idle) and by
    // the layers toggle effect when the user explicitly enables them.
    // This function is also called after a basemap swap to re-attach
    // every layer that was previously loaded.
    const layers = layersRef.current;
    for (const def of LAYER_REGISTRY) {
      const wantOn = !!layers[def.key];
      const wasLoaded = loadedLayersRef.current.has(def.key);
      // Only re-load layers the user has enabled (or that were already
      // loaded in this session). Base layers used to be eagerly loaded
      // but the founder spec (2026-04-15) moved defaults to OFF so every
      // layer except ZAAHI listings is lazy now.
      if (wantOn || wasLoaded) {
        // The basemap swap blew away the source registry, so we have to
        // pretend nothing is loaded. The loader is idempotent on
        // map.getSource so this is safe even if the source somehow
        // survived.
        loadedLayersRef.current.delete(def.key);
        await loadLayer(map, def);
        await setLayerVisibility(map, def, wantOn);
      }
    }
    // District-name centroid symbol layer. Always re-attached after
    // attachOverlays so a basemap swap doesn't drop the labels.
    await ensureDistrictNamesLayer(map);
  }

  // ── District-name labels ───────────────────────────────────────────
  // Computes one Point feature per community polygon (centroid of the
  // outer ring) and adds a symbol layer rendering the English community
  // name (`CNAME_E`). Run on map init + after every basemap swap. The
  // centroid features are cached in a ref so re-attaching after a
  // setStyle doesn't trigger a refetch.
  async function ensureDistrictNamesLayer(map: MLMap) {
    if (!districtNameFeaturesRef.current) {
      try {
        const r = await apiFetch("/api/layers/communities");
        if (!r.ok) return;
        const fc = (await r.json()) as GeoJSON.FeatureCollection<GeoJSON.Polygon>;
        const feats: GeoJSON.Feature<GeoJSON.Point>[] = [];
        for (const f of fc.features) {
          if (f.geometry?.type !== "Polygon") continue;
          const ring = f.geometry.coordinates[0];
          if (!ring?.length) continue;
          let sx = 0;
          let sy = 0;
          for (const p of ring) { sx += p[0]; sy += p[1]; }
          const name = (f.properties?.CNAME_E as string | undefined) ?? "";
          if (!name) continue;
          feats.push({
            type: "Feature",
            geometry: { type: "Point", coordinates: [sx / ring.length, sy / ring.length] },
            properties: { name },
          });
        }
        districtNameFeaturesRef.current = feats;
      } catch {
        return; // Best-effort — silent failure leaves the layer dormant.
      }
    }
    if (!map.getSource(DISTRICT_NAMES_SRC)) {
      map.addSource(DISTRICT_NAMES_SRC, {
        type: "geojson",
        data: { type: "FeatureCollection", features: districtNameFeaturesRef.current },
      });
    }
    if (!map.getLayer(DISTRICT_NAMES_LAYER)) {
      map.addLayer({
        id: DISTRICT_NAMES_LAYER,
        type: "symbol",
        source: DISTRICT_NAMES_SRC,
        minzoom: 11,
        layout: {
          "text-field": ["get", "name"],
          // 2026-05-24 fix: when text-font is unspecified, MapLibre
          // falls back to ["Open Sans Regular", "Arial Unicode MS
          // Regular"]. The openmaptiles glyph CDN returns text/html
          // (not protobuf) for "Arial Unicode MS Regular", which
          // makes MapLibre throw "Unimplemented type: 4" on every
          // glyph range and force-fall-back to local Canvas2D
          // rendering. Pinning to ["Open Sans Semibold"] (which
          // returns valid PBF) skips the broken fallback chain.
          "text-font": ["Open Sans Semibold"],
          "text-size": ["interpolate", ["linear"], ["zoom"], 11, 10, 16, 16],
          "text-letter-spacing": 0.06,
          "text-allow-overlap": false,
          "text-ignore-placement": false,
          visibility: layersRef.current.districtNames ? "visible" : "none",
        },
        paint: {
          "text-color": "#1A1A2E",
          "text-halo-color": "rgba(255,255,255,0.85)",
          "text-halo-width": 1.5,
        },
      });
    }
  }

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;
    // Register PMTiles protocol for vector tile sources
    const pmtilesProtocol = new Protocol();
    maplibregl.addProtocol("pmtiles", pmtilesProtocol.tile);

    // Restore saved camera (zoom / center / bearing / pitch) from prior
    // session. localStorage key "zaahi-map-view". Falls back to Dubai
    // defaults if absent / malformed. Layers state is restored in a
    // separate effect below — has to wait for layers' initial useState.
    const saved = loadSavedMapView();
    const map = new maplibregl.Map({
      container: containerRef.current,
      style: STYLES.light,
      center: saved?.center ?? [55.27, 25.20],
      zoom: saved?.zoom ?? 12,
      pitch: saved?.pitch ?? 45,
      bearing: saved?.bearing ?? -17,
      maxPitch: 70,
      // maxZoom: 18 — matches PMTiles overzoom band (source maxzoom 18
      // in addLandTileSource). MapLibre default is 22; lifting it
      // higher (we tried 24) caused PMTiles 3D buildings to vanish
      // because tippecanoe caps tiles at z16 and at >18 the overzoom
      // factor collapses the clip buffer + crowds the camera near-
      // plane against building tops. Founder fix 2026-05-23
      // (overzoom-band correction). Bump in lockstep with the source
      // maxzoom in addLandTileSource if PMTiles are rebuilt deeper.
      maxZoom: 18,
      dragRotate: true,
      pitchWithRotate: true,
      touchPitch: true,
      // Required so `map.getCanvas().toDataURL()` returns a non-blank image
      // — used by the Site Plan PDF generator. WebGL otherwise clears the
      // drawing buffer after each frame. MapLibre v5 moved this flag into
      // `canvasContextAttributes`. Negligible perf impact.
      canvasContextAttributes: { preserveDrawingBuffer: true },
    });
    map.dragRotate.enable();
    map.touchZoomRotate.enableRotation();
    map.keyboard.enable();
    map.on("mousemove", (e) => setCursor({ lng: e.lngLat.lng, lat: e.lngLat.lat }));
    map.on("zoom", () => setZoom(map.getZoom()));
    map.on("rotate", () => setBearing(map.getBearing()));

    // Debounced save on every camera change. moveend fires for pan/zoom/
    // rotate/pitch combined so a single listener catches all of them.
    let saveTimer: number | null = null;
    function scheduleSave() {
      if (saveTimer) window.clearTimeout(saveTimer);
      saveTimer = window.setTimeout(() => {
        const c = map.getCenter();
        saveMapView({
          center: [c.lng, c.lat],
          zoom: map.getZoom(),
          bearing: map.getBearing(),
          pitch: map.getPitch(),
        });
      }, 500);
    }
    map.on("moveend", scheduleSave);
    map.on("zoomend", scheduleSave);
    map.on("rotateend", scheduleSave);
    map.on("pitchend", scheduleSave);

    // Single shared popup
    const popup = new maplibregl.Popup({
      closeButton: false,
      closeOnClick: false,
      offset: 8,
      className: "zaahi-popup",
    });
    popupRef.current = popup;

    // Hover state for the communities layer
    let hoveredId: string | number | undefined;
    function setHover(id: string | number | undefined) {
      if (hoveredId === id) return;
      if (hoveredId !== undefined) {
        map.setFeatureState({ source: COMMUNITIES_SRC, id: hoveredId }, { hover: false });
      }
      hoveredId = id;
      if (id !== undefined) {
        map.setFeatureState({ source: COMMUNITIES_SRC, id }, { hover: true });
      }
    }

    map.on("load", async () => {
      // Signal to the Buildings hook that the style is ready so it can
      // safely addLayer/addSource. Purely additive — doesn't affect any
      // existing load-time code path below.
      setMapStyleReady(true);

      // ── Boundary-popup priority gate (founder spec 2026-05-31, Phase 1
      // hover dedup completion). The native maplibre `popup` instance
      // (used by master-plan / community / DDA-project / DDA-free-zone
      // / AD muni-dist-comm / amenity-point hovers) was being re-added
      // after the JSX zaahi/vault/dda popups had cleared it, because
      // when the user toggles a boundary layer ON via the Layers panel
      // its mousemove handler registers AFTER the ZAAHI handlers and
      // fires later in the dispatch order. Result on the live map:
      // ZAAHI listing card + "Sama Al Jadaf · COMMERCIAL-HOSPITALITY"
      // master-plan native popup stacked. This helper lets every
      // boundary handler defer to ZAAHI listings + shared-vault when
      // the cursor is already over either of them.
      const cursorOverZaahiOrVault = (
        e: MapMouseEvent & { features?: GeoJSON.Feature[] },
      ): boolean => {
        const blockingLayers = [ZAAHI_PLOTS_FILL, VAULT_SHARED_3D].filter(
          (lid) => map.getLayer(lid),
        );
        if (blockingLayers.length === 0) return false;
        return (
          map.queryRenderedFeatures(e.point, { layers: blockingLayers }).length > 0
        );
      };

      // ── Hover handlers stashed on a ref so loadLayer can attach them
      // to freshly-loaded layers (since loadLayer fires on demand and
      // doesn't have direct closure access to the popup).
      const ddaPlotHover = () => {
        map.getCanvas().style.cursor = "pointer";
      };
      const masterPlanLeave = () => {
        map.getCanvas().style.cursor = "";
        popup.remove();
      };
      const masterPlanHover = (planLabel: string) =>
        (e: MapMouseEvent & { features?: GeoJSON.Feature[] }) => {
          const f = e.features?.[0];
          if (!f) return;
          // Defer to ZAAHI listings / vault if either is at the cursor —
          // the boundary name popup would stack over the listing card.
          if (cursorOverZaahiOrVault(e)) {
            popup.remove();
            return;
          }
          map.getCanvas().style.cursor = "pointer";
          const layerRaw = (f.properties?.Layer as string) ?? planLabel;
          const clean = layerRaw.replace(/^PDF\s+_MP_LU_/, "").replace(/_/g, " ");
          popup
            .setLngLat(e.lngLat)
            .setHTML(
              `<div><div style="font-family:Georgia,serif;font-weight:700;font-size:10px;color:#C8A96E">${clean}</div>
               <div style="font-size:8px;opacity:0.7;margin-top:1px">${planLabel}</div></div>`,
            )
            .addTo(map);
        };

      // Generic amenity-point hover/click. Builds a small card with
      // header (layer label) + bold first field as title + remaining
      // fields as label/value rows. Click drops a pinned popup with a
      // close button; hover uses the shared closeButton=false popup.
      const renderPointCard = (label: string, fields: string[], props: Record<string, unknown>) => {
        const titleField = fields[0];
        const titleValue = String(props[titleField] ?? "—");
        const rows = fields
          .slice(1)
          .filter((k) => props[k] != null && String(props[k]).trim() !== "")
          .map(
            (k) =>
              `<div style="display:flex;justify-content:space-between;gap:8px;font-size:10px;line-height:1.3;margin-top:2px">
                 <span style="opacity:0.6;text-transform:capitalize">${k.replace(/_/g, " ")}</span>
                 <span style="color:#1A1A2E;font-weight:500;text-align:right;max-width:180px">${String(props[k])}</span>
               </div>`,
          )
          .join("");
        return `
          <div style="min-width:200px;max-width:280px">
            <div style="font-size:8px;letter-spacing:0.08em;text-transform:uppercase;color:#C8A96E;opacity:0.85">${label}</div>
            <div style="font-family:Georgia,serif;font-weight:700;font-size:13px;color:#1A1A2E;margin-top:2px;line-height:1.2">${titleValue}</div>
            ${rows}
          </div>`;
      };
      const pointHover = (label: string, fields: string[]) =>
        (e: MapMouseEvent & { features?: GeoJSON.Feature[] }) => {
          const f = e.features?.[0];
          if (!f) return;
          // Defer to ZAAHI / vault — amenity point cards must not stack
          // over a listing card at the same screen position.
          if (cursorOverZaahiOrVault(e)) {
            popup.remove();
            return;
          }
          map.getCanvas().style.cursor = "pointer";
          popup
            .setLngLat(e.lngLat)
            .setHTML(renderPointCard(label, fields, (f.properties ?? {}) as Record<string, unknown>))
            .addTo(map);
        };
      const pointLeave = () => {
        map.getCanvas().style.cursor = "";
        popup.remove();
      };
      // Click uses a separate pinned popup so the user can read the
      // address / connector list without holding cursor steady. Tracked
      // on a closure-scoped ref so re-clicking another point swaps it.
      let pinnedPopup: maplibregl.Popup | null = null;
      const pointClick = (label: string, fields: string[]) =>
        (e: MapMouseEvent & { features?: GeoJSON.Feature[] }) => {
          const f = e.features?.[0];
          if (!f || !f.geometry || f.geometry.type !== "Point") return;
          if (pinnedPopup) pinnedPopup.remove();
          pinnedPopup = new maplibregl.Popup({
            closeButton: true,
            closeOnClick: true,
            offset: 10,
            className: "zaahi-popup",
          })
            .setLngLat(f.geometry.coordinates as [number, number])
            .setHTML(renderPointCard(label, fields, (f.properties ?? {}) as Record<string, unknown>))
            .addTo(map);
        };

      hoverHandlersRef.current = {
        ddaPlotHover, masterPlanLeave, masterPlanHover,
        pointHover, pointLeave, pointClick,
      };

      await loadAmenityIcons(map);
      await attachOverlays(map);

      // ── ZAAHI Plots — real listings from /api/parcels/map.
      // Always loaded; this is the platform's primary content. Builds
      // both the polygon source (fill / line / glow) and the building
      // source (3D extrusions colored by land use).
      await loadZaahiPlots(map);

      // ── Private Plot Vault shared overlay ──
      // Owner-side vault entries flow through loadZaahiPlots (Phase 3
      // 2026-05-30). Only the shared-to-me path keeps its own loader.
      // 401-tolerant for signed-out users.
      void loadVaultShared(map);

      // ── Vault side-panel click handler — shared layer only. ──
      // Owner-side click routes from the ZAAHI_PLOTS_FILL handler below
      // via the `isVault` branch (Phase 3 unification).
      map.on("click", VAULT_SHARED_3D, (e: MapMouseEvent & { features?: GeoJSON.Feature[] }) => {
        const f = e.features?.[0];
        const id = f?.properties?.id as string | undefined;
        if (id) setSelectedVaultEntry({ id, mode: "share" });
      });
      // Hover popup parity with ZAAHI listings (founder spec 2026-05-30).
      // Mirrors the ZAAHI mousemove handler at ZAAHI_PLOTS_FILL: card
      // shows projectName / plotNumber, plot area, max GFA, FAR, max
      // height, plan date + asking price (vault) instead of total price.
      const vaultMove = (mode: "owner" | "share") =>
        (e: MapMouseEvent & { features?: GeoJSON.Feature[] }) => {
          const f = e.features?.[0];
          if (!f) return;
          // Priority: ZAAHI listings outrank the shared-vault popup.
          // If the cursor is also on a ZAAHI plot, defer to that handler.
          if (map.getLayer(ZAAHI_PLOTS_FILL)) {
            const upper = map.queryRenderedFeatures(e.point, {
              layers: [ZAAHI_PLOTS_FILL],
            });
            if (upper.length > 0) {
              setVaultHover(null);
              return;
            }
          }
          if (hoverCloseTimerRef.current != null) {
            window.clearTimeout(hoverCloseTimerRef.current);
            hoverCloseTimerRef.current = null;
          }
          map.getCanvas().style.cursor = "pointer";
          const p = f.properties as Record<string, unknown>;
          const id = typeof p.id === "string" ? p.id : "";
          const fils = typeof p.askingPriceFils === "string" ? p.askingPriceFils : null;
          const askingAed = fils ? Math.floor(Number(fils) / 100) : null;
          setVaultHover({
            x: e.point.x,
            y: e.point.y,
            id,
            plotNumber: typeof p.plotNumber === "string" ? p.plotNumber : "",
            district: typeof p.district === "string" ? p.district : "",
            landUse: typeof p.landUse === "string" ? p.landUse : "",
            projectName: typeof p.projectName === "string" ? p.projectName : "",
            askingAed,
            area: typeof p.area === "number" ? p.area : 0,
            plotAreaSqft: typeof p.plotAreaSqft === "number" ? p.plotAreaSqft : 0,
            maxGfaSqft: typeof p.maxGfaSqft === "number" ? p.maxGfaSqft : 0,
            maxFloors: typeof p.maxFloors === "number" ? p.maxFloors : 0,
            maxHeightMeters: typeof p.maxHeightMeters === "number" ? p.maxHeightMeters : 0,
            maxHeightCode: typeof p.maxHeightCode === "string" ? p.maxHeightCode : "",
            far: typeof p.far === "number" ? p.far : 0,
            planDateIso: typeof p.planDateIso === "string" ? p.planDateIso : "",
            mode,
          });
          // Shared-vault popup wins over PMTiles for the same cursor frame.
          setDdaLandHover(null);
          // Kill the shared boundary native popup too (see ZAAHI handler).
          popupRef.current?.remove();
        };
      const vaultLeave = () => {
        map.getCanvas().style.cursor = "";
        if (hoverCloseTimerRef.current != null) {
          window.clearTimeout(hoverCloseTimerRef.current);
        }
        hoverCloseTimerRef.current = window.setTimeout(() => {
          setVaultHover(null);
          hoverCloseTimerRef.current = null;
        }, 220);
      };
      // Owner-side hover flows through the ZAAHI_PLOTS_FILL mousemove
      // handler (Phase 3 unification). Shared layer keeps its own.
      map.on("mousemove", VAULT_SHARED_3D, vaultMove("share"));
      map.on("mouseleave", VAULT_SHARED_3D, vaultLeave);

      // ── PMTiles land layers (DDA 99K + AD 362K + Oman 95K plots) ──
      addLandTileSource(map, DDA_LAND_TILES_SRC, DDA_LAND_TILES_FILL, DDA_LAND_TILES_LINE, DDA_LAND_TILES_3D, "/tiles/dda-land.pmtiles");
      addLandTileSource(map, AD_ADM_TILES_SRC, AD_ADM_TILES_FILL, AD_ADM_TILES_LINE, AD_ADM_TILES_3D, "/tiles/ad-land-adm.pmtiles");
      addLandTileSource(map, AD_OTHER_TILES_SRC, AD_OTHER_TILES_FILL, AD_OTHER_TILES_LINE, AD_OTHER_TILES_3D, "/tiles/ad-land-other.pmtiles");
      // Oman PMTiles dropped 2026-05-24.

      // ── City ambient on zoom > 16 ──
      const updateCityAmbient = () => sound.setCityAmbient(map.getZoom() > 16);
      map.on("zoomend", updateCityAmbient);
      updateCityAmbient();

      // ── ZAAHI Plots hover + click ──
      if (map.getLayer(ZAAHI_PLOTS_FILL)) {
        map.on("mousemove", ZAAHI_PLOTS_FILL, (e: MapMouseEvent & { features?: GeoJSON.Feature[] }) => {
          const f = e.features?.[0];
          if (!f) return;
          // Cancel any scheduled close — we're back on a polygon.
          if (hoverCloseTimerRef.current != null) {
            window.clearTimeout(hoverCloseTimerRef.current);
            hoverCloseTimerRef.current = null;
          }
          map.getCanvas().style.cursor = "pointer";
          const p = f.properties as {
            id?: string;
            plotNumber: string;
            district: string;
            emirate: string;
            area: number;
            priceAed: number | null;
            landUse: string;
            projectName?: string;
            plotAreaSqm?: number;
            plotAreaSqft?: number;
            maxGfaSqm?: number;
            maxGfaSqft?: number;
            maxFloors?: number;
            maxHeightMeters?: number;
            maxHeightCode?: string;
            far?: number;
            planDateIso?: string;
          };
          // Polygon centroid (mean of outer-ring vertices). Used for the
          // click-flyTo destination — falls back to the cursor lngLat
          // when the geometry isn't a Polygon (vector-tile fragmentation
          // can yield MultiPolygon at parcel boundaries).
          let cLng = e.lngLat.lng, cLat = e.lngLat.lat;
          const g = f.geometry;
          if (g && g.type === "Polygon" && g.coordinates[0]?.length > 0) {
            const ring = g.coordinates[0];
            cLng = ring.reduce((s, q) => s + q[0], 0) / ring.length;
            cLat = ring.reduce((s, q) => s + q[1], 0) / ring.length;
          }
          setZaahiHover({
            x: e.point.x,
            y: e.point.y,
            id: p.id ?? "",
            lng: cLng,
            lat: cLat,
            plotNumber: p.plotNumber,
            district: p.district,
            emirate: p.emirate ?? "",
            area: p.area,
            priceAed: p.priceAed,
            landUse: p.landUse,
            projectName: p.projectName ?? "",
            plotAreaSqm: p.plotAreaSqm ?? 0,
            plotAreaSqft: p.plotAreaSqft ?? 0,
            maxGfaSqm: p.maxGfaSqm ?? 0,
            maxGfaSqft: p.maxGfaSqft ?? 0,
            maxFloors: p.maxFloors ?? 0,
            maxHeightMeters: p.maxHeightMeters ?? 0,
            maxHeightCode: p.maxHeightCode ?? "",
            far: p.far ?? 0,
            planDateIso: p.planDateIso ?? "",
          });
          // ZAAHI listings take priority — drop any PMTiles / shared-vault
          // popup that fired for the same cursor frame so only one card
          // shows. Avoids stacked "Business Bay" + "3460730 Open Space".
          setDdaLandHover(null);
          setVaultHover(null);
          // Also kill the shared maplibre Popup if a boundary FILL layer
          // (DDA Projects / Communities / AD muni-dist-comm / FZ) had
          // attached its name-label popup at the same cursor point. The
          // detailed JSX card always wins over the one-line boundary tag.
          popupRef.current?.remove();
        });
        map.on("mouseleave", ZAAHI_PLOTS_FILL, () => {
          map.getCanvas().style.cursor = "";
          // Defer close ~220 ms so the cursor can transit onto the now
          // clickable card without it vanishing. Card's onMouseEnter
          // cancels the timer; onMouseLeave closes immediately.
          if (hoverCloseTimerRef.current != null) {
            window.clearTimeout(hoverCloseTimerRef.current);
          }
          hoverCloseTimerRef.current = window.setTimeout(() => {
            setZaahiHover(null);
            hoverCloseTimerRef.current = null;
          }, 220);
        });
        map.on("click", ZAAHI_PLOTS_FILL, (e: MapMouseEvent & { features?: GeoJSON.Feature[] }) => {
          const f = e.features?.[0];
          if (!f) return;
          const props = f.properties as {
            id?: string;
            isVault?: boolean;
            vaultEntryId?: string | null;
          };
          if (!props.id) return;
          // Founder spec 2026-04-12: a single combined cyberpunk
          // click effect (sweep + noise burst) — sound.click() now
          // emits both layers itself, so we no longer chain swooshOpen.
          sound.click();
          // Phase 3 unification (2026-05-30): vault rows ride the same
          // layer as public listings; the click handler routes to
          // VaultSidePanelAdapter via the isVault flag so the broker
          // pipeline / asking price / owner contact panel renders
          // instead of the public SidePanel.
          if (props.isVault === true && props.vaultEntryId) {
            setSelectedVaultEntry({ id: props.vaultEntryId, mode: "owner" });
            return;
          }
          setSelectedParcelId(props.id);
        });
      }

      // ── Communities hover ──
      map.on("mousemove", COMMUNITIES_FILL, (e: MapMouseEvent & { features?: GeoJSON.Feature[] }) => {
        const f = e.features?.[0];
        if (!f) return;
        if (cursorOverZaahiOrVault(e)) {
          popup.remove();
          return;
        }
        map.getCanvas().style.cursor = "pointer";
        setHover((f.id as string | number | undefined) ?? f.properties?.COMM_NUM);
        const name = (f.properties?.CNAME_E as string) ?? "—";
        popup
          .setLngLat(e.lngLat)
          .setHTML(
            `<div style="font-family:Georgia,serif;font-weight:700;font-size:10px;letter-spacing:0.04em">${name}</div>`,
          )
          .addTo(map);
      });
      map.on("mouseleave", COMMUNITIES_FILL, () => {
        map.getCanvas().style.cursor = "";
        setHover(undefined);
        popup.remove();
      });

      // ── AD Municipalities hover ──
      map.on("mousemove", AD_MUN_FILL, (e: MapMouseEvent & { features?: GeoJSON.Feature[] }) => {
        const f = e.features?.[0];
        if (!f) return;
        if (cursorOverZaahiOrVault(e)) {
          popup.remove();
          return;
        }
        map.getCanvas().style.cursor = "pointer";
        const name = (f.properties?.NAMEENGLISH as string) ?? "—";
        popup
          .setLngLat(e.lngLat)
          .setHTML(
            `<div style="font-family:Georgia,serif;font-weight:700;font-size:10px;letter-spacing:0.04em">${name}</div>`,
          )
          .addTo(map);
      });
      map.on("mouseleave", AD_MUN_FILL, () => {
        map.getCanvas().style.cursor = "";
        popup.remove();
      });

      // ── AD Districts hover ──
      map.on("mousemove", AD_DIST_FILL, (e: MapMouseEvent & { features?: GeoJSON.Feature[] }) => {
        const f = e.features?.[0];
        if (!f) return;
        if (cursorOverZaahiOrVault(e)) {
          popup.remove();
          return;
        }
        map.getCanvas().style.cursor = "pointer";
        const name = (f.properties?.NAMEENGLISH as string) ?? "—";
        popup
          .setLngLat(e.lngLat)
          .setHTML(
            `<div style="font-family:Georgia,serif;font-weight:700;font-size:10px;letter-spacing:0.04em">${name}</div>`,
          )
          .addTo(map);
      });
      map.on("mouseleave", AD_DIST_FILL, () => {
        map.getCanvas().style.cursor = "";
        popup.remove();
      });

      // ── AD Communities hover ──
      map.on("mousemove", AD_COMM_FILL, (e: MapMouseEvent & { features?: GeoJSON.Feature[] }) => {
        const f = e.features?.[0];
        if (!f) return;
        if (cursorOverZaahiOrVault(e)) {
          popup.remove();
          return;
        }
        map.getCanvas().style.cursor = "pointer";
        const name = (f.properties?.COMMUNITYNAMEENG as string) ?? "—";
        popup
          .setLngLat(e.lngLat)
          .setHTML(
            `<div style="font-family:Georgia,serif;font-weight:700;font-size:10px;letter-spacing:0.04em">${name}</div>`,
          )
          .addTo(map);
      });
      map.on("mouseleave", AD_COMM_FILL, () => {
        map.getCanvas().style.cursor = "";
        popup.remove();
      });

      // Saudi Governorates + Riyadh Zones hover handlers removed
      // 2026-05-24 along with the rest of the Saudi coverage.

      // ── DDA Project Boundaries hover ──
      map.on("mousemove", DDA_PROJ_FILL, (e: MapMouseEvent & { features?: GeoJSON.Feature[] }) => {
        const f = e.features?.[0];
        if (!f) return;
        if (cursorOverZaahiOrVault(e)) {
          popup.remove();
          return;
        }
        map.getCanvas().style.cursor = "pointer";
        const name = (f.properties?.ProjectName as string) ?? "—";
        popup
          .setLngLat(e.lngLat)
          .setHTML(
            `<div style="font-family:Georgia,serif;font-weight:700;font-size:10px;letter-spacing:0.04em">${name}</div>`,
          )
          .addTo(map);
      });
      map.on("mouseleave", DDA_PROJ_FILL, () => {
        map.getCanvas().style.cursor = "";
        popup.remove();
      });

      // ── DDA Free Zones hover ──
      map.on("mousemove", DDA_FZ_FILL, (e: MapMouseEvent & { features?: GeoJSON.Feature[] }) => {
        const f = e.features?.[0];
        if (!f) return;
        if (cursorOverZaahiOrVault(e)) {
          popup.remove();
          return;
        }
        map.getCanvas().style.cursor = "pointer";
        const name = (f.properties?.ProjectName as string) ?? "—";
        const fz = f.properties?.IsFreeZone ? " (Free Zone)" : "";
        popup
          .setLngLat(e.lngLat)
          .setHTML(
            `<div style="font-family:Georgia,serif;font-weight:700;font-size:10px;letter-spacing:0.04em">${name}${fz}</div>`,
          )
          .addTo(map);
      });
      map.on("mouseleave", DDA_FZ_FILL, () => {
        map.getCanvas().style.cursor = "";
        popup.remove();
      });

      // ── Master plan hover (shared handler for islands + meydan) ──
// Hover handlers — the LAYER_REGISTRY loader registers per-layer
      // mouse listeners on demand when each layer is first loaded.
      // (See loadLayer in the helpers above.)
    });

    mapRef.current = map;

    // ── deck.gl hero GLBs ──────────────────────────────────────────
    // MapboxOverlay in `interleaved: true` mode shares MapLibre's
    // WebGL context. Each ScenegraphLayer loads a hero GLB from
    // /glb/buildings/ and renders one instance at the founder-locked
    // HERO_COORDS_*. Overlay attached in a separate [mapStyleReady]
    // useEffect below; cleanup removes it so HMR doesn't accumulate
    // WebGL contexts.

    // Toggleable WASD drone navigation (desktop only). Controller stays
    // installed for the map's lifetime; a separate effect drives
    // enable/disable based on `droneEnabled` state. Default is OFF so
    // WASD / right-click do NOT hijack the page until the user opts in.
    const droneCtrl = installDroneControls(map);
    droneCtrlRef.current = droneCtrl;

    // Restore saved preference (default OFF on first visit).
    try {
      if (typeof window !== "undefined" &&
          localStorage.getItem("zaahi-drone-mode") === "1") {
        setDroneEnabled(true);
      }
    } catch {
      /* localStorage may be blocked — stay OFF */
    }

    // Auto-rotate controller — install once, drive enable/disable from
    // `autoRotateEnabled` state. HYBRID first-visit default: if no
    // localStorage key exists yet, treat as first-ever visit → start ON.
    // Subsequent visits use the saved value.
    const autoRotateCtrl = installAutoRotate(map);
    autoRotateCtrlRef.current = autoRotateCtrl;
    try {
      if (typeof window !== "undefined") {
        const saved = localStorage.getItem("zaahi-autorotate");
        if (saved === null || saved === "1") {
          setAutoRotateEnabled(true);
        }
      }
    } catch {
      /* localStorage may be blocked — stay OFF */
    }

    return () => {
      droneCtrl.destroy();
      droneCtrlRef.current = null;
      autoRotateCtrl.destroy();
      autoRotateCtrlRef.current = null;
      // Detach deck.gl overlay before MapLibre.remove() so its WebGL
      // resources release cleanly. Best-effort — ignore if MapLibre
      // already torn down the map.
      try {
        if (deckOverlayRef.current) {
          map.removeControl(deckOverlayRef.current as unknown as maplibregl.IControl);
          deckOverlayRef.current = null;
        }
      } catch { /* map already gone, nothing to detach */ }
      popup.remove();
      map.remove();
      mapRef.current = null;
    };
  }, []);

  // ── deck.gl overlay init — deferred. Fires once mapStyleReady
  // flips true. Map-init useEffect has [] deps so it can't see
  // mapStyleReady update; this deferred effect is the only path
  // that actually attaches the overlay.
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !mapStyleReady) return;
    if (deckOverlayRef.current) return;     // already attached
    try {
      const lightingEffect = new LightingEffect({
        ambient: new AmbientLight({ color: [255, 255, 255], intensity: 3.0 }),
        dir: new DirectionalLight({
          color: [255, 245, 230],
          intensity: 4.0,
          direction: [-1, -3, -1],
        }),
        dir2: new DirectionalLight({
          color: [220, 230, 255],
          intensity: 2.5,
          direction: [1, 3, 1],
        }),
      });
      const overlay = new MapboxOverlay({
        interleaved: true,
        effects: [lightingEffect],
        layers: [],
      });
      map.addControl(overlay as unknown as maplibregl.IControl);
      deckOverlayRef.current = overlay;
      setOverlayReady(true);
      console.log("[GLB] MapboxOverlay attached (deferred init)");
    } catch (e) {
      console.warn("[deckgl-spike] overlay init failed:", e);
    }
  }, [mapStyleReady]);

  // ── Lazy gate — hero GLBs render only at zoom ≥ 14, matching the
  // PMTiles 3D + ZAAHI Signature 3D threshold so the visibility band is
  // consistent across all 3D layers. At zoom < 14 the ScenegraphLayers
  // are cleared (no GLB fetch / GPU upload), so the city-wide view is
  // unaffected by the multi-MB asset.
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    const ZOOM_GATE = 14;
    const update = () => {
      const active = map.getZoom() >= ZOOM_GATE;
      setGlbActive((prev) => (prev === active ? prev : active));
    };
    update();
    map.on("zoomend", update);
    return () => {
      map.off("zoomend", update);
    };
  }, [mapStyleReady]);

  // Sync deck.gl ScenegraphLayer entries from heroBuildingsRegistry.
  // Lazy-gated by glbActive (zoom ≥ 14) — when false, layers cleared
  // (no GLB fetch / GPU upload). In dev mode (?dev=1) each layer is
  // pickable, and clicking a hero opens HeroBuildingsDevPanel for it.
  useEffect(() => {
    const overlay = deckOverlayRef.current;
    if (!overlay) return;
    if (!glbActive) {
      overlay.setProps({ layers: [] });
      return;
    }
    overlay.setProps({
      layers: HERO_BUILDINGS.map((b) => {
        const eff = effectiveValues(b, heroOverrides[b.id]);
        return new ScenegraphLayer({
          id: `hero-${b.id}`,
          data: [{ position: eff.coords }],
          scenegraph: b.glb,
          getPosition: (d: { position: [number, number, number] }) => d.position,
          getOrientation: eff.orientation as unknown as [number, number, number],
          sizeScale: eff.size,
          _lighting: "pbr",
          pickable: devModeHero,
          onClick: devModeHero ? () => setEditingHeroId(b.id) : undefined,
          onError: (err: unknown) => console.error(`[GLB ${b.id}] error:`, err),
        });
      }),
    });
  }, [glbActive, overlayReady, heroOverrides, devModeHero]);



  // Drive the drone controller from React state. Persists choice and
  // flashes the on-enable toast. Keeps WASD behaviour strictly opt-in.
  useEffect(() => {
    const ctrl = droneCtrlRef.current;
    if (!ctrl) return;
    if (droneEnabled) {
      ctrl.enable();
      setShowDroneHint(true);
      const t = window.setTimeout(() => setShowDroneHint(false), 3500);
      try { localStorage.setItem("zaahi-drone-mode", "1"); } catch { /* ignore */ }
      return () => window.clearTimeout(t);
    }
    ctrl.disable();
    setShowDroneHint(false);
    try { localStorage.setItem("zaahi-drone-mode", "0"); } catch { /* ignore */ }
  }, [droneEnabled]);

  // Crosshair fire — Space tap or click on the map flies the camera to
  // whatever is under the screen center. Only active while drone mode
  // is on. e.repeat is guarded so holding Space (which drone-controls
  // already binds to ascend / zoom-out) fires exactly once per discrete
  // press, leaving the held-key ascend behaviour intact. The HUD stays
  // pointer-events: none so this click handler — attached to the map
  // container directly — runs first while existing parcel-click
  // selection continues to work.
  useEffect(() => {
    if (!droneEnabled) return;
    const container = containerRef.current;

    const fire = () => {
      const map = mapRef.current;
      if (!map) return;
      const cx = window.innerWidth / 2;
      const cy = window.innerHeight / 2;
      const target = map.unproject([cx, cy]);
      map.flyTo({
        center: [target.lng, target.lat],
        duration: 1200,
        essential: true,
      });
      setDroneFiring(true);
      window.setTimeout(() => setDroneFiring(false), 900);
    };

    const onKey = (e: KeyboardEvent) => {
      if (e.code !== "Space") return;
      // Auto-repeat events keep firing while Space is held; drone
      // ascend (drone-controls.ts) wants the held-state, but firing
      // should be a discrete action per press.
      if (e.repeat) return;
      // Don't fire when the user is typing.
      const t = e.target as HTMLElement | null;
      if (t && (t.tagName === "INPUT" || t.tagName === "TEXTAREA" || t.isContentEditable)) return;
      e.preventDefault();
      fire();
    };

    const onClick = () => {
      fire();
    };

    window.addEventListener("keydown", onKey);
    container?.addEventListener("click", onClick);
    return () => {
      window.removeEventListener("keydown", onKey);
      container?.removeEventListener("click", onClick);
    };
  }, [droneEnabled]);

  // Drive the auto-rotate controller from React state. Persists choice,
  // gently tilts to 3D if the user is in flat view (rotation would
  // otherwise showcase nothing), and shows the first-ever hint toast
  // once per browser via a separate localStorage flag.
  useEffect(() => {
    const ctrl = autoRotateCtrlRef.current;
    if (!ctrl) return;
    if (autoRotateEnabled) {
      // Auto-tilt to 3D if currently flat — easeTo runs concurrently with
      // ctrl.enable() because the controller skips ticks while
      // map.isEasing() is true (see auto-rotate.ts shouldRotate gate).
      const m = mapRef.current;
      if (m && m.getPitch() < 30) {
        m.easeTo({ pitch: 45, duration: 600 });
      }
      ctrl.enable();
      try { localStorage.setItem("zaahi-autorotate", "1"); } catch { /* ignore */ }
      // First-ever hint toast — tracked in a separate flag so it doesn't
      // fire on every subsequent enable.
      let hintShown = false;
      try { hintShown = localStorage.getItem("zaahi-autorotate-hint-shown") === "1"; } catch { /* ignore */ }
      if (!hintShown) {
        setShowAutoRotateHint(true);
        try { localStorage.setItem("zaahi-autorotate-hint-shown", "1"); } catch { /* ignore */ }
        const t = window.setTimeout(() => setShowAutoRotateHint(false), 3500);
        return () => window.clearTimeout(t);
      }
      return;
    }
    ctrl.disable();
    setShowAutoRotateHint(false);
    try { localStorage.setItem("zaahi-autorotate", "0"); } catch { /* ignore */ }
  }, [autoRotateEnabled]);

  // Theme swap → reload basemap, reattach overlays after styledata fires,
  // and re-tint the road colour to match.
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    map.setStyle(STYLES[baseMap]);
    map.once("styledata", async () => {
      map.dragRotate.enable();
      map.touchZoomRotate.enableRotation();
      map.keyboard.enable();

      // ── PMTiles re-attach FIRST ──
      // Critical: if any await further down throws (amenity icons,
      // attachOverlays, or the /api/parcels/map fetch), the PMTiles
      // re-add must already have happened. Used to live after the
      // awaits and disappeared in dark/satellite mode whenever any
      // upstream loader hiccupped — founder fix 2026-05-23.
      addLandTileSource(map, DDA_LAND_TILES_SRC, DDA_LAND_TILES_FILL, DDA_LAND_TILES_LINE, DDA_LAND_TILES_3D, "/tiles/dda-land.pmtiles");
      addLandTileSource(map, AD_ADM_TILES_SRC, AD_ADM_TILES_FILL, AD_ADM_TILES_LINE, AD_ADM_TILES_3D, "/tiles/ad-land-adm.pmtiles");
      addLandTileSource(map, AD_OTHER_TILES_SRC, AD_OTHER_TILES_FILL, AD_OTHER_TILES_LINE, AD_OTHER_TILES_3D, "/tiles/ad-land-other.pmtiles");
      // Oman PMTiles dropped 2026-05-24.
      setLandTileVisibility(map, DDA_LAND_TILES_FILL, DDA_LAND_TILES_LINE, DDA_LAND_TILES_3D, layers.ddaLandPlots);
      setLandTileVisibility(map, AD_ADM_TILES_FILL, AD_ADM_TILES_LINE, AD_ADM_TILES_3D, layers.adLandPlots);
      setLandTileVisibility(map, AD_OTHER_TILES_FILL, AD_OTHER_TILES_LINE, AD_OTHER_TILES_3D, layers.adLandPlots);

      // ── Then everything else (any of these can throw safely now) ──
      await loadAmenityIcons(map);
      await attachOverlays(map);
      // ZAAHI plots also need to be re-attached after a basemap swap
      // (maplibre's source registry was wiped). The loader is idempotent
      // on map.getSource so it's safe to call.
      await loadZaahiPlots(map);
      // Shared-with-me vault overlay also needs re-attachment after a
      // basemap swap. Owner-side vault rides loadZaahiPlots (Phase 3).
      void loadVaultShared(map);
      if (map.getLayer(ROADS_LINE)) {
        map.setPaintProperty(ROADS_LINE, "line-color", baseMap === "dark" ? "#888888" : "#666666");
      }
    });
  }, [baseMap]);

  // Layer toggles
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    const plotLabelsOn = layers.plotLabels;
    for (const def of LAYER_REGISTRY) {
      void setLayerVisibility(map, def, !!layers[def.key], plotLabelsOn);
    }
  }, [layers]);

  // PMTiles land toggles — single toggle per source (DDA / AD)
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    setLandTileVisibility(map, DDA_LAND_TILES_FILL, DDA_LAND_TILES_LINE, DDA_LAND_TILES_3D, layers.ddaLandPlots);
    setLandTileVisibility(map, AD_ADM_TILES_FILL, AD_ADM_TILES_LINE, AD_ADM_TILES_3D, layers.adLandPlots);
    setLandTileVisibility(map, AD_OTHER_TILES_FILL, AD_OTHER_TILES_LINE, AD_OTHER_TILES_3D, layers.adLandPlots);
  }, [layers.ddaLandPlots, layers.adLandPlots]);

  // District-name symbol layer visibility — direct toggle since this
  // layer lives outside LAYER_REGISTRY (custom centroid source, no
  // hover/click handlers, no per-feature fetch). The layer is added
  // via ensureDistrictNamesLayer inside attachOverlays.
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    if (map.getLayer(DISTRICT_NAMES_LAYER)) {
      map.setLayoutProperty(
        DISTRICT_NAMES_LAYER,
        "visibility",
        layers.districtNames ? "visible" : "none",
      );
    }
  }, [layers.districtNames]);

  // ── Private Plot Vault — Shared-with-me toggle wiring. ──
  // Layer visibility flips O(1) — source is loaded on map-init and
  // stays alive for the page lifetime. Owner-side vault rendering is
  // unified with public listings (Phase 3 2026-05-30) and visibility
  // is no longer gated on a "My Vault" toggle — the conflict-marker
  // layer is always visible (filter does the gating).
  //
  // Vault-only mode override: when ON, the shared layer is
  // force-visible regardless of the user's per-layer toggle state.
  // ZAAHI/owner-side filtering for vault-only mode lives in the next
  // useEffect.
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    const sharedV = (vaultOnlyMode || layers.vaultShared) ? "visible" : "none";
    if (map.getLayer(VAULT_SHARED_3D)) {
      map.setLayoutProperty(VAULT_SHARED_3D, "visibility", sharedV);
    }
  }, [layers.vaultShared, vaultOnlyMode]);

  // Vault-only mode side effect — direction flip + PMTiles exclusion
  // direction + conflict marker visibility + localStorage persistence.
  // Phase 2 archie client (2026-05-30) factored the filter logic into
  // reapplyMapFilters so Archie's filter_by_land_use /
  // filter_by_status tools compose with vault-mode direction.
  //
  // ⚠️ INVARIANT (founder spec 2026-05-31 v2):
  //   OFF (default): direction = isVault !== true  → public listings.
  //   ON  (lock):    direction = isVault === true  → caller's PPV.
  // buildZaahiFilter merges this with Archie filters (if any) into
  // a single ["all", …] expression.
  //
  // Conflict markers visibility flips with vaultOnlyMode so red dots
  // never render over a filtered-out vault polygon (root cause of the
  // v1 revert, commit 02e837f).
  //
  // PMTiles exclusion direction flips so the visual gap left by
  // filter-hidden ZAAHI listings is filled by the PMTiles background
  // (root cause of the v2 "white holes"). Vault plot numbers stay in
  // the exclusion set unconditionally — privacy invariant.
  //
  // PMTiles 3D opacity is intentionally NOT touched any more — the
  // pre-2026-05-31 0.45 → 0.1 dim made fond buildings unreadable; the
  // founder spec now keeps them at the addLandTileSource default 0.45
  // regardless of vault-only state.
  //
  // DDA districts / amenities / other contextual layers are
  // deliberately NOT touched — they stay user-controlled via the
  // Layers panel.
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    // Sync ref immediately so reapplyMapFilters + the exclusion helper
    // read the current value (the mirror useEffect runs after this one).
    vaultOnlyModeRef.current = vaultOnlyMode;
    reapplyMapFilters();
    // Re-apply PMTiles exclusion so the listing plot numbers drop in
    // / out of the exclude set in lockstep with the direction flip.
    applyZaahiExclusionToTileLayers(map);
    // Conflict markers ride the same direction as the vault polygons.
    // OFF → vault filtered out → markers must hide. ON → markers visible.
    if (map.getLayer(VAULT_CONFLICT_MARKERS_LAYER)) {
      map.setLayoutProperty(
        VAULT_CONFLICT_MARKERS_LAYER,
        "visibility",
        vaultOnlyMode ? "visible" : "none",
      );
    }
    try {
      localStorage.setItem("zaahi-vault-only-mode", vaultOnlyMode ? "1" : "0");
    } catch { /* ignore quota / SSR */ }
  }, [vaultOnlyMode]);

  // Fly to the bounds of the caller's vault entries whenever vault-only
  // mode flips on. Empty vault → toast + no-op. We DO NOT touch the
  // viewport when vault-only mode is turned off — the founder spec
  // explicitly asked for that to stay where the user left it.
  useEffect(() => {
    if (!vaultOnlyMode) return;
    const map = mapRef.current;
    if (!map) return;
    let cancelled = false;
    (async () => {
      try {
        const r = await apiFetch("/api/me/vault/map");
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        const fc = (await r.json()) as GeoJSON.FeatureCollection<GeoJSON.Polygon>;
        if (cancelled) return;
        if (!fc.features || fc.features.length === 0) {
          setToast({ kind: "success", message: "No vault plots yet" });
          return;
        }
        let minLng = Infinity, minLat = Infinity, maxLng = -Infinity, maxLat = -Infinity;
        for (const f of fc.features) {
          if (!f.geometry || f.geometry.type !== "Polygon") continue;
          for (const ring of f.geometry.coordinates) {
            for (const [lng, lat] of ring) {
              if (lng < minLng) minLng = lng;
              if (lat < minLat) minLat = lat;
              if (lng > maxLng) maxLng = lng;
              if (lat > maxLat) maxLat = lat;
            }
          }
        }
        if (!Number.isFinite(minLng)) {
          setToast({ kind: "success", message: "No vault plots with geometry yet" });
          return;
        }
        map.fitBounds(
          [[minLng, minLat], [maxLng, maxLat]],
          { padding: 80, duration: 1500, maxZoom: 17 },
        );
      } catch (err) {
        console.error("[vault map] flyTo bounds failed:", err);
      }
    })();
    return () => { cancelled = true; };
  }, [vaultOnlyMode]);

  useEffect(() => {
    if (!layersOpen) return;
    const onDown = (e: MouseEvent) => {
      const t = e.target as Node;
      if (panelRef.current?.contains(t)) return;
      if (panelBtnRef.current?.contains(t)) return;
      setLayersOpen(false);
    };
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, [layersOpen]);

  // First time the user opens the layers panel, pick the country that
  // matches the current map center and expand only that one. After the
  // first open, user toggles stick — we never re-auto-expand.
  useEffect(() => {
    if (!layersOpen || countryInitialisedRef.current) return;
    const map = mapRef.current;
    if (!map) return;
    const ctr = map.getCenter();
    const detected = detectCountryFromLngLat(ctr.lng, ctr.lat);
    setCountryOpen({
      dubai: false, abudhabi: false, otheruae: false, amenities: false,
      [detected]: true,
    });
    countryInitialisedRef.current = true;
  }, [layersOpen]);

  useEffect(() => {
    if (!legendOpen) return;
    const onDown = (e: MouseEvent) => {
      const t = e.target as Element | null;
      if (!t) return;
      if (legendRef.current?.contains(t)) return;
      // The Legend can be opened from multiple triggers (big-map right
      // stack + mini-dock right rail since the 5×5 redesign 2026-05-24).
      // Any trigger marked `data-legend-trigger` is treated as part of
      // the Legend surface so a click on it doesn't immediately
      // re-close the panel that the same click just opened.
      if (t.closest?.("[data-legend-trigger]")) return;
      setLegendOpen(false);
    };
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, [legendOpen]);

  // APPROVED by founder 2026-04-11. 9 canonical categories. NEVER add,
  // remove, or recolor without explicit founder approval. The same set
  // is mirrored in ZAAHI_LANDUSE_COLOR, the loadZaahiPlots match
  // expression, SidePanel LANDUSE_COLORS, and CLAUDE.md.
  const LAND_USE_LEGEND: { color: string; name: string; desc: string }[] = [
    { color: "#2D6A4F", name: "Residential",          desc: "Жилое" },
    { color: "#1B4965", name: "Commercial",           desc: "Коммерческое" },
    { color: "#6B4C9A", name: "Mixed Use",            desc: "Смешанное" },
    { color: "#9B2226", name: "Hotel / Hospitality",  desc: "Отельное" },
    { color: "#495057", name: "Industrial / Warehouse", desc: "Промышленное" },
    { color: "#0077B6", name: "Educational",          desc: "Образовательное" },
    { color: "#E63946", name: "Healthcare",           desc: "Медицина" },
    { color: "#606C38", name: "Agricultural / Farm",  desc: "Сельскохозяйственное" },
    { color: "#C8A96E", name: "Future Development",   desc: "Под застройку" },
  ];

  const c = PALETTE[theme];
  const isDark = theme === "dark";

  // ── Archie mapControls bridge (Phase 2 archie client, 2026-05-30) ──
  // Imperative handles passed into ArchibaldChat so OpenAI tool_calls
  // can drive the map. All closures capture stable refs / setState
  // handles, so useMemo with empty deps gives a stable identity for
  // the lifetime of this component.
  const mapControls = useMemo<MapControls>(() => ({
    flyTo: (lng, lat, zoom = 14) => {
      const m = mapRef.current;
      if (!m) return;
      m.flyTo({ center: [lng, lat], zoom, duration: 1200, essential: true });
    },
    fitBounds: (bounds) => {
      const m = mapRef.current;
      if (!m) return;
      m.fitBounds(bounds, { padding: 80, duration: 1200, maxZoom: 17 });
    },
    openParcel: (parcelId) => setSelectedParcelId(parcelId),
    openVaultEntry: (entryId) => setSelectedVaultEntry({ id: entryId, mode: "owner" }),
    highlightParcel: (parcelId) => {
      // Reuse the gold-glow filter pattern from the click-selection
      // path (page.tsx:307-312). Setting "__none__" hides the glow;
      // a real parcel id pulses the halo. NOTE we deliberately do
      // NOT touch ZAAHI_BUILDINGS_3D paint here — that grey-out
      // behaviour belongs to the click-selection flow alone.
      const m = mapRef.current;
      if (!m) return;
      const sel = parcelId ?? "__none__";
      if (m.getLayer(ZAAHI_PLOTS_GLOW)) {
        m.setFilter(ZAAHI_PLOTS_GLOW, ["==", ["id"], sel]);
      }
      if (m.getLayer(ZAAHI_PLOTS_GLOW_CRISP)) {
        m.setFilter(ZAAHI_PLOTS_GLOW_CRISP, ["==", ["id"], sel]);
      }
    },
    setVaultOnly: (enabled) => setVaultOnlyMode(enabled),
    filterByLandUse: (cat) => {
      archieLandUseRef.current = cat;
      reapplyMapFilters();
    },
    filterByStatus: (st) => {
      archieStatusRef.current = st;
      reapplyMapFilters();
    },
    searchPlot: async (plotNumber) => {
      try {
        const r = await apiFetch(`/api/parcels/by-plot-number/${plotNumber}`);
        if (!r.ok) return null;
        const data = (await r.json()) as {
          exists: boolean;
          parcel?: {
            id: string;
            plotNumber: string;
            district: string;
            projectName: string | null;
            latitude: number | null;
            longitude: number | null;
            isVault: boolean;
            vaultEntryId: string | null;
          };
        };
        if (!data.exists || !data.parcel) return null;
        const p = data.parcel;
        return {
          id: p.id,
          plotNumber: p.plotNumber,
          district: p.district,
          latitude: p.latitude,
          longitude: p.longitude,
          projectName: p.projectName,
          isVault: p.isVault,
          vaultEntryId: p.vaultEntryId,
        };
      } catch {
        return null;
      }
    },
    resolveDistrict: async (name) => {
      try {
        const r = await apiFetch(
          `/api/archie/resolve-district?name=${encodeURIComponent(name)}`,
        );
        if (!r.ok) return null;
        return (await r.json()) as {
          name: string;
          matchedCount: number;
          matchMode: "exact" | "contains";
          center: [number, number];
          bounds: [[number, number], [number, number]] | null;
        };
      } catch {
        return null;
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }), []);

  return (
    <div
      style={{
        position: "absolute",
        inset: 0,
        background: c.bg,
        color: c.text,
        fontFamily: '-apple-system, "Segoe UI", Roboto, sans-serif',
      }}
    >
      <div ref={containerRef} style={{ position: "absolute", inset: 0 }} />


      {/* Sun-time override slider — visible only when the ☀ button in
          the right stack is toggled on. Drives the directional-light
          date that useSunLight feeds to map.setLight(). Double-click
          on the slider also resets to real time (in addition to the
          dedicated button). */}
      {sunSliderActive && <SunTimeSlider onChange={setSunTimeOverride} />}

      {/* Military-UAV HUD — visible only while drone mode is active.
          z-index 50, pointer-events none (no click interception). All
          chrome (crosshair, horizon, compass tape, coords, ALT/VS/SPD/
          HDG/PCH rails, corner brackets, status, time, zoom) reads
          live from mapRef. Founder spec 2026-05-23. */}
      {droneEnabled && <DroneHUD mainMapRef={mapRef} firing={droneFiring} />}

      {/* Drone-mode on-enable toast — shown each time the user turns drone mode ON */}
      {showDroneHint && (
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
          Drone mode activated — WASD to fly, right-click to rotate
        </div>
      )}

      {showAutoRotateHint && (
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
      )}

      {/* Header */}
      <HeaderBar
        c={c}
        isDark={isDark}
        onFly={(lng, lat) =>
          mapRef.current?.flyTo({
            center: [lng, lat],
            zoom: 16,
            pitch: 45,
            duration: 2000,
          })
        }
        onSelectParcel={(id) => setSelectedParcelId(id)}
        onOpenAddModal={() => setAddFlow("chooser")}
        vaultOnlyMode={vaultOnlyMode}
        onToggleVaultOnly={() => setVaultOnlyMode((v) => !v)}
      />
      {addFlow === "chooser" && (
        <AddPlotChooser
          onPickListing={() => setAddFlow("listing")}
          onPickVault={() => setAddFlow("vault")}
          onClose={() => setAddFlow("none")}
        />
      )}
      {addFlow === "listing" && (
        <AddPlotModal
          // Per Option B: cancel/×/Esc/backdrop inside the listing flow
          // returns to the chooser, not to the bare map.
          onClose={() => setAddFlow("chooser")}
          onSubmitted={(id) => {
            // Submitted parcels start in PENDING_REVIEW and don't show on the
            // public map until verified — so we can't fly to them yet, just close.
            console.log("[zaahi] submitted parcel", id);
            setAddFlow("none");
            setToast({
              kind: "success",
              message: "Listing submitted",
              sub: "It will appear on the map once verified by an admin.",
            });
          }}
        />
      )}
      {addFlow === "vault" && (
        <AddPlotWizardModal
          initialPlotNumber={addPlotPrefill ?? undefined}
          // Per Option B: cancel/×/Esc/backdrop inside the vault flow
          // returns to the chooser, not to the bare map.
          onCancel={() => {
            setAddFlow("chooser");
            setAddPlotPrefill(null);
          }}
          onCreated={(id, coords) => {
            console.log("[zaahi] vault entry created", id, coords);
            setAddFlow("none");
            setAddPlotPrefill(null);
            // Phase 3 (2026-05-30): vault rows ride the unified ZAAHI
            // layer, so refreshing /api/parcels/map is enough — the
            // new VAULT_PRIVATE parcel will appear immediately. No
            // separate toggle to flip; the layer is always visible.
            const map = mapRef.current;
            if (map) {
              void loadZaahiPlots(map);
              if (coords.latitude != null && coords.longitude != null) {
                map.flyTo({
                  center: [coords.longitude, coords.latitude],
                  zoom: 17,
                  pitch: 45,
                  duration: 1500,
                  essential: true,
                });
              }
            }
            setToast({
              kind: "success",
              message: "Added to vault",
              sub: coords.latitude != null
                ? "Flying to your plot — it's a 3D building now."
                : "Your plot is now visible on the map.",
            });
          }}
          onExistingFound={(id) => {
            console.log("[zaahi] vault entry already exists", id);
            setAddFlow("none");
            setAddPlotPrefill(null);
            setToast({
              kind: "success",
              message: "Already in vault",
              sub: "Opened your existing entry — go to /vault to edit.",
            });
          }}
          onError={(message) => {
            // Wizard keeps its inline error visible; the toast adds a
            // top-right notification so the user notices even if their
            // attention is elsewhere. Modal stays open — user can retry.
            setToast({
              kind: "error",
              message: "Add to vault failed",
              sub: message,
            });
          }}
        />
      )}
      {toast && (
        <div
          role="status"
          aria-live="polite"
          style={{
            position: "fixed",
            top: 80,
            right: 20,
            zIndex: 60,
            maxWidth: 320,
            padding: "14px 16px",
            borderRadius: 12,
            background: "rgba(10, 22, 40, 0.92)",
            backdropFilter: "blur(16px)",
            WebkitBackdropFilter: "blur(16px)",
            border: `1px solid ${toast.kind === "error" ? "rgba(230, 57, 70, 0.55)" : "rgba(200, 169, 110, 0.45)"}`,
            color: "rgba(255, 255, 255, 0.92)",
            fontFamily: '-apple-system, "Segoe UI", Roboto, sans-serif',
            boxShadow: "0 16px 48px rgba(0, 0, 0, 0.55)",
            display: "flex",
            alignItems: "flex-start",
            gap: 12,
          }}
        >
          <div style={{ flex: 1 }}>
            <div style={{
              fontFamily: "Georgia, serif",
              fontSize: 14,
              fontWeight: 700,
              color: toast.kind === "error" ? "#E63946" : "#C8A96E",
              letterSpacing: "-0.01em",
              marginBottom: toast.sub ? 4 : 0,
            }}>
              {toast.kind === "error" ? "✕" : "✓"} {toast.message}
            </div>
            {toast.sub && (
              <div style={{ fontSize: 12, color: "rgba(255, 255, 255, 0.65)", lineHeight: 1.4 }}>
                {toast.sub}
              </div>
            )}
          </div>
          <button
            onClick={() => setToast(null)}
            aria-label="Dismiss"
            style={{
              background: "transparent",
              border: "none",
              color: "rgba(255, 255, 255, 0.55)",
              cursor: "pointer",
              fontSize: 16,
              padding: 0,
              lineHeight: 1,
            }}
          >
            ×
          </button>
        </div>
      )}

      {/* Layers / Legend / basemap / auto-rotate triggers now live in
          the symmetric 5×5 big-map button stacks below (founder
          spec 2026-05-24). Layers retains `panelBtnRef` via the left
          stack so click-outside on the layers panel still works. */}

      {legendOpen && (
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
      )}

      {/* Basemap selector moved to mini dock right rail
          on 2026-05-24 (founder map UI cleanup). baseMap / setBaseMap
          state lives at the page level and is consumed in MiniRailBtn
          clicks inside the dock. */}

      {/* Cursor coordinates — left bottom corner, mini */}
      <div
        style={{
          position: "absolute",
          left: 16,
          bottom: 8,
          fontSize: 11,
          color: c.textDim,
          fontFamily: '"SF Mono", "Menlo", monospace',
          letterSpacing: "0.04em",
          zIndex: 11,
          pointerEvents: "none",
        }}
      >
        {cursor.lat.toFixed(5)}, {cursor.lng.toFixed(5)} · z{zoom.toFixed(2)}
      </div>

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
          title="Light basemap"
          active={baseMap === "light"}
          onClick={() => setBaseMap("light")}
        >
          {/* Sun — solid disc with rays. */}
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="4" />
            <path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41" />
          </svg>
        </ChromeBtn>
        {/* 3. Basemap Dark */}
        <ChromeBtn
          title="Dark basemap"
          active={baseMap === "dark"}
          onClick={() => setBaseMap("dark")}
        >
          {/* Crescent moon. */}
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
            <path d="M21 12.79A9 9 0 1 1 11.21 3a7 7 0 0 0 9.79 9.79z" />
          </svg>
        </ChromeBtn>
        {/* 4. Basemap Satellite */}
        <ChromeBtn
          title="Satellite basemap"
          active={baseMap === "satellite"}
          onClick={() => setBaseMap("satellite")}
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
        {/* 5. Auto-rotate — mutex with drone mode. */}
        <ChromeBtn
          title={autoRotateEnabled ? "Disable auto-rotate" : "Enable auto-rotate camera"}
          active={autoRotateEnabled}
          onClick={() => {
            sound.whoosh();
            setAutoRotateEnabled((v) => {
              const next = !v;
              if (next) setDroneEnabled(false);
              return next;
            });
          }}
        >
          {/* Circular arrow — auto-rotate indicator. */}
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
            <path d="M21 12a9 9 0 1 1-3.5-7.1" />
            <polyline points="21 4 21 9 16 9" />
          </svg>
        </ChromeBtn>
        {/* Parcels portal toggle moved to the bottom-centre ParcelsNav
            pill (founder spec 2026-05-29). Left rail is back to its
            5×5 symmetric stack — no Parcels button here. portalOpen
            state and ParcelsPortalPanel rendering stay untouched and
            are now driven by the nav's middle button. */}
      </div>

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
        {/* 1. Legend — Mirrors Layers on the left. data-legend-trigger
              keeps the click-outside handler from re-closing the panel
              when the user clicks this trigger; the mini-dock Legend
              MiniRailBtn carries the same marker. */}
        <span ref={legendBtnRef} data-legend-trigger style={{ display: "block" }}>
          <ChromeBtn
            title="Legend"
            active={legendOpen}
            onClick={() => setLegendOpen((o) => !o)}
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
        <ChromeBtn title="Zoom in" onClick={() => mapRef.current?.zoomIn()}>+</ChromeBtn>
        {/* 3. Zoom out */}
        <ChromeBtn title="Zoom out" onClick={() => mapRef.current?.zoomOut()}>−</ChromeBtn>
        {/* 4. Reset bearing — compass icon rotates with current bearing. */}
        <ChromeBtn
          title="Reset bearing"
          onClick={() => mapRef.current?.easeTo({ bearing: 0, pitch: 45, duration: 500 })}
        >
          <span style={{ display: "inline-block", transform: `rotate(${-bearing}deg)`, transition: "transform 250ms ease", fontSize: 14 }}>
            ⊕
          </span>
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
            sound.whoosh();
            map.easeTo({ pitch: next ? 45 : 0, duration: 400 });
          }}
        >
          <span style={{ fontFamily: "Georgia, serif", fontWeight: 700, fontSize: 12 }}>
            {is3D ? "3D" : "2D"}
          </span>
        </ChromeBtn>
      </div>

      {layersOpen && (
      <Panel
        ref={panelRef}
        radius={RADIUS_PANEL}
        style={{
          position: "absolute",
          top: 64,
          left: 60,
          width: 320,
          maxHeight: "calc(100vh - 80px)",
          overflowY: "auto",
          zIndex: 11,
        }}
      >
        <div
          style={{
            position: "sticky",
            top: 0,
            zIndex: 2,
            padding: "10px 14px",
            background: PANEL_BG,
            backdropFilter: PANEL_BLUR,
            WebkitBackdropFilter: PANEL_BLUR,
            // Sub-border on the sticky header is intentionally lighter
            // (0.08) than PANEL_BORDER — it's a divider inside the
            // panel, not the panel's own edge.
            borderBottom: "1px solid rgba(255, 255, 255, 0.08)",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            fontFamily: 'Georgia, "Times New Roman", serif',
            fontSize: 11,
            letterSpacing: "0.12em",
            textTransform: "uppercase",
            color: GOLD,
            fontWeight: 700,
          }}
        >
          <span>Layers</span>
          <button
            onClick={() => setLayersOpen(false)}
            aria-label="Close"
            style={{
              background: "transparent",
              border: "none",
              color: "rgba(255, 255, 255, 0.55)",
              cursor: "pointer",
              fontSize: 18,
              lineHeight: 1,
              padding: 0,
              transition: "color 150ms ease",
            }}
            onMouseEnter={(e) => { e.currentTarget.style.color = GOLD; }}
            onMouseLeave={(e) => { e.currentTarget.style.color = "rgba(255, 255, 255, 0.55)"; }}
          >
            ×
          </button>
        </div>

        {/* Search */}
        <div style={{ padding: "10px 12px", borderBottom: "1px solid rgba(255, 255, 255, 0.08)" }}>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 6,
              padding: "6px 10px",
              border: "1px solid rgba(255, 255, 255, 0.15)",
              borderRadius: 8,
              background: "rgba(255, 255, 255, 0.04)",
              transition: "border-color 150ms ease, background 150ms ease",
            }}
            onFocus={(e) => { e.currentTarget.style.borderColor = GOLD; }}
            onBlur={(e) => { e.currentTarget.style.borderColor = "rgba(200, 169, 110, 0.15)"; }}
          >
            <span style={{ fontSize: 12, color: "rgba(255, 255, 255, 0.55)" }}>⌕</span>
            <input
              value={layerSearch}
              onChange={(e) => setLayerSearch(e.target.value)}
              placeholder="Search layers..."
              style={{
                flex: 1,
                border: 0,
                background: "transparent",
                color: "rgba(255, 255, 255, 0.9)",
                fontSize: 11,
                outline: "none",
                minWidth: 0,
                fontFamily: "inherit",
              }}
            />
            {layerSearch && (
              <button
                onClick={() => setLayerSearch("")}
                aria-label="Clear search"
                style={{ background: "transparent", border: 0, color: "rgba(255, 255, 255, 0.55)", cursor: "pointer", fontSize: 14, lineHeight: 1, padding: 0 }}
              >
                ×
              </button>
            )}
          </div>
        </div>

        {/* GLOBAL — ZAAHI Listings are always on (loaded unconditionally
            via loadZaahiPlots). Rendered as a static row at the top so
            users see what's already visible on the map. */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 8,
            padding: "10px 14px",
            borderBottom: "1px solid rgba(255, 255, 255, 0.05)",
            fontSize: 11,
            color: "rgba(255, 255, 255, 0.9)",
          }}
        >
          <span style={{ display: "inline-flex", alignItems: "center", gap: 8, minWidth: 0 }}>
            <span aria-hidden style={{ width: 10, height: 10, borderRadius: 2, background: GOLD, flexShrink: 0, boxShadow: "0 0 8px rgba(200, 169, 110, 0.5)" }} />
            <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>ZAAHI Listings (114)</span>
          </span>
          <span
            title="Always visible — core ZAAHI inventory"
            style={{
              fontSize: 11,
              letterSpacing: "0.08em",
              color: GOLD,
              fontFamily: 'Georgia, "Times New Roman", serif',
              fontWeight: 700,
              textTransform: "uppercase",
              flexShrink: 0,
              padding: "2px 6px",
              border: "1px solid rgba(200, 169, 110, 0.3)",
              borderRadius: 3,
              background: "rgba(200, 169, 110, 0.08)",
            }}
          >
            Always on
          </span>
        </div>

        {/* Buildings — digital-twin layer (completed + under-construction
            real towers). Two toggles match the LayerToggle styling used by
            the country/category sections below. Counts live so users see
            "· 1" / "· 0" without opening devtools. */}
        <div
          style={{
            padding: "8px 14px 2px",
            fontSize: 11,
            letterSpacing: "0.12em",
            textTransform: "uppercase",
            color: GOLD,
            fontFamily: 'Georgia, "Times New Roman", serif',
            fontWeight: 700,
            borderTop: "1px solid rgba(255, 255, 255, 0.05)",
          }}
        >
          Buildings
        </div>
        <LayerToggle
          label={`Completed · ${loadedBuildings.filter((b) => b.status === "COMPLETED").length}`}
          checked={completedVisible}
          onChange={setCompletedVisible}
          color="rgba(255, 255, 255, 0.9)"
        />
        <LayerToggle
          label={`Under construction · ${loadedBuildings.filter((b) => b.status === "UNDER_CONSTRUCTION").length}`}
          checked={underConstructionVisible}
          onChange={setUnderConstructionVisible}
          color="rgba(255, 255, 255, 0.9)"
        />

        {/* Country → category → layer hierarchy (Phase 1 RBAC scaffold).
            Labels + lock tiers come from LAYER_META; counts/on summed
            per country. Inside each country, categories render as
            compact LayerGroup sub-sections (no per-category collapse —
            the country collapse is the primary control). */}
        {(() => {
          type PanelItem = { key: string; label: string; description?: string; requiredTier?: LayerLockTier; comingSoon?: boolean };
          const q = layerSearch.trim().toLowerCase();
          const searchActive = q.length > 0;
          // Human-readable label + description per layer. Description renders
          // as native tooltip on row hover. DDA district labels come from the
          // DDA_LAYERS table; explicit overrides below carry friendly names
          // for everything else (amenities, vault, master plans, etc.).
          const labels: Record<string, string> = {};
          for (const d of DDA_LAYERS) labels[d.key] = d.label;
          Object.assign(labels, {
            communities: "Communities of Dubai",
            roads: "Major roads of Dubai",
            metro: "Dubai Metro — lines and stations",
            plotLabels: "Plot numbers (visible when you zoom in)",
            ddaProjects: "DDA project boundaries (master plans)",
            ddaFreeZones: "Free economic zones in Dubai",
            ddaLandPlots: "Dubai Land Plots · 99K parcels from DDA registry",
            evChargers: "Electric Vehicle charging stations",
            metroStations: "Dubai Metro — station points",
            tramStations: "Dubai Tram — station points",
            marineStations: "Marine transport — abra / ferry stations",
            vaultShared: "Shared with me — vault entries others granted you access to",
            islands: "Dubai Islands master plan",
            meydan: "Meydan Horizon master plan",
            alFurjan: "Al Furjan master plan",
            intlCity23: "International City Phase 2 & 3 master plan",
            residential12: "Residential District I & II master plan",
            d11: "D11 — Parcel L/D master plan",
            nadAlHammer: "Nad Al Hammer master plan",
            adMunicipalities: "Abu Dhabi municipalities",
            adDistricts: "Abu Dhabi districts",
            adCommunities: "Abu Dhabi communities",
            adLandPlots: "Abu Dhabi Land Plots · 362K parcels from DMT registry",
            uaeDistricts: "UAE districts (Sharjah, Ajman, RAK, UAQ, Fujairah)",
            // Coming-soon emirate placeholders — English + Arabic
            emirateSharjah: "Sharjah · شارقة",
            emirateRAK: "Ras Al Khaimah · رأس الخيمة",
            emirateAjman: "Ajman · عجمان",
            emirateFujairah: "Fujairah · الفجيرة",
            emirateUAQ: "Umm Al Quwain · أم القيوين",
            // Coming-soon environmental data layers
            dubaiNoiseLevels: "Noise Levels · Dubai",
          });
          const descriptions: Record<string, string> = {
            communities: "Community / neighbourhood boundary polygons across Dubai.",
            roads: "Major roads of Dubai — highways, primary, and secondary arteries.",
            metro: "Full Dubai Metro line geometries with station markers.",
            plotLabels: "Per-plot numeric labels. Visible at zoom 16+ to avoid clutter.",
            ddaProjects: "Boundaries of named projects/developments registered with DDA (Dubai Development Authority).",
            ddaFreeZones: "Designated Free Economic Zones in Dubai (DIFC, JAFZA, DMC, etc.).",
            ddaLandPlots: "All 99,000 land plots in DDA's public registry. Shows ownership, area, and land-use status.",
            evChargers: "Public electric vehicle charging stations in Dubai (DEWA + private operators).",
            metroStations: "Individual Dubai Metro station locations as point markers.",
            tramStations: "Dubai Tram station locations along the Marina line.",
            marineStations: "Marine transport stations — water buses, abras, ferry terminals.",
            vaultShared: "Vault entries that other ZAAHI users have shared specifically with you.",
            islands: "DDA master plan for Dubai Islands (Deira waterfront development). PMTiles overlay.",
            meydan: "DDA master plan for Meydan Horizon (south of Downtown). PMTiles overlay.",
            alFurjan: "DDA master plan for Al Furjan (south of JLT). PMTiles overlay.",
            intlCity23: "DDA master plan for International City Phases 2 and 3. PMTiles overlay.",
            residential12: "DDA master plan for Residential District I & II. PMTiles overlay.",
            d11: "DDA master plan for D11 — Parcel L/D (Mohammed Bin Rashid City). PMTiles overlay.",
            nadAlHammer: "DDA master plan for Nad Al Hammer (Ras Al Khor area). PMTiles overlay.",
            adMunicipalities: "Three top-level municipalities of Abu Dhabi emirate (City, Al Ain, Al Dhafra).",
            adDistricts: "Administrative districts within Abu Dhabi municipalities.",
            adCommunities: "Community-level neighbourhood polygons in Abu Dhabi.",
            adLandPlots: "All 362,000 land plots in Abu Dhabi from the DMT (Department of Municipalities and Transport) registry.",
            uaeDistricts: "District boundaries for the five northern emirates (Sharjah, Ajman, UAQ, RAK, Fujairah).",
            emirateSharjah: "Coming soon — Sharjah plots in development.",
            emirateRAK: "Coming soon — Ras Al Khaimah plots in development.",
            emirateAjman: "Coming soon — Ajman plots in development.",
            emirateFujairah: "Coming soon — Fujairah plots in development.",
            emirateUAQ: "Coming soon — Umm Al Quwain plots in development.",
            dubaiNoiseLevels: "Real-time noise monitoring via Dubai Municipality — coming soon.",
          };
          // DDA district layers — generic "Community-level boundary" tooltip
          // since each polygon is one of the 206 community sub-areas.
          for (const d of DDA_LAYERS) {
            if (!descriptions[d.key]) {
              descriptions[d.key] = `DDA community / sub-area: ${d.label}.`;
            }
          }
          const grouped: Record<LayerCountry, Partial<Record<LayerCategory, PanelItem[]>>> = {
            dubai: {}, abudhabi: {}, otheruae: {}, amenities: {},
          };
          for (const [key, meta] of Object.entries(LAYER_META)) {
            (grouped[meta.country][meta.category] ??= []).push({
              key,
              label: labels[key] ?? key,
              description: descriptions[key],
              requiredTier: meta.tier,
              comingSoon: meta.comingSoon,
            });
          }
          return LAYER_COUNTRY_ORDER.map((country) => {
            const cats = grouped[country];
            const allInCountry: PanelItem[] = Object.values(cats).flat().filter((x): x is PanelItem => !!x);
            const matches = searchActive
              ? allInCountry.filter((i) => i.label.toLowerCase().includes(q))
              : allInCountry;
            if (searchActive && matches.length === 0) return null;
            // Coming-soon rows aren't real toggles — exclude them from
            // the "on / total" count shown next to the country header.
            const countable = allInCountry.filter((i) => !i.comingSoon);
            const onCount = countable.filter((i) => layers[i.key as keyof LayersState] as boolean).length;
            const total = countable.length;
            const open = searchActive || !!countryOpen[country];
            return (
              <CountryGroup
                key={country}
                c={c}
                title={COUNTRY_LABELS[country]}
                open={open}
                searchActive={searchActive}
                onToggle={() => setCountryOpen((s) => ({ ...s, [country]: !s[country] }))}
                onCount={onCount}
                total={total}
              >
                {LAYER_CATEGORY_ORDER.map((cat) => {
                  const items = cats[cat];
                  if (!items || items.length === 0) return null;
                  const ckey = `${country}:${cat}`;
                  // Founder spec 2026-05-29: each category folds
                  // independently. Search collapses the fold state and
                  // forces every group open so matches surface.
                  const catOpen = searchActive || !!categoryOpen[ckey];
                  return (
                    <LayerGroup
                      key={`${country}-${cat}`}
                      c={c}
                      title={CATEGORY_LABELS[cat]}
                      open={catOpen}
                      onToggle={() => setCategoryOpen((s) => ({ ...s, [ckey]: !s[ckey] }))}
                      search={layerSearch}
                      items={items}
                      isOn={(k) => layers[k as keyof LayersState] as boolean}
                      onChange={(k, v) => setLayers((l) => ({ ...l, [k]: v }))}
                    />
                  );
                })}
              </CountryGroup>
            );
          });
        })()}

        {/* DDA + AD Land toggles are in Base Layers above */}
      </Panel>
      )}

      <style jsx global>{`
        .maplibregl-canvas-container {
          filter: ${isDark ? "brightness(1.3) hue-rotate(210deg) saturate(0.7)" : "none"};
          transition: filter 0.3s ease;
        }
        .maplibregl-ctrl-top-right {
          margin-top: 60px !important;
          margin-right: 16px !important;
        }
        .maplibregl-ctrl-group {
          background: rgba(10, 22, 40, 0.4) !important;
          border: 1px solid rgba(200, 169, 110, 0.3) !important;
          box-shadow: none !important;
          border-radius: 6px !important;
          overflow: hidden;
        }
        .maplibregl-ctrl-group button {
          background: transparent !important;
          border-bottom: 1px solid rgba(200, 169, 110, 0.15) !important;
        }
        .maplibregl-ctrl-group button:last-child {
          border-bottom: none !important;
        }
        .maplibregl-ctrl-group button .maplibregl-ctrl-icon {
          filter: invert(1) sepia(1) hue-rotate(15deg) saturate(2.5) brightness(1.05);
        }
        .maplibregl-ctrl-group button:hover {
          background: rgba(200, 169, 110, 0.15) !important;
        }
        .maplibregl-ctrl-attrib {
          background: ${isDark ? "rgba(10,22,40,0.85)" : "rgba(255,255,255,0.85)"} !important;
          color: ${c.textDim} !important;
          font-size: 10px !important;
        }
        .maplibregl-ctrl-attrib a {
          color: ${GOLD} !important;
        }
        /* ZAAHI Premium glass popup — applies to all hover popups
           over DDA projects, free-zones, communities, roads, metro,
           master plans, etc. Single className drives all of them. */
        .zaahi-popup .maplibregl-popup-content {
          background: ${isDark ? "rgba(10, 22, 40, 0.75)" : "rgba(255, 255, 255, 0.72)"} !important;
          backdrop-filter: blur(24px) saturate(150%);
          -webkit-backdrop-filter: blur(24px) saturate(150%);
          color: ${isDark ? "#f5f1e8" : c.text} !important;
          border: 1px solid rgba(200, 169, 110, 0.25) !important;
          border-radius: 10px;
          padding: 6px 10px;
          font-size: 10px;
          letter-spacing: 0.02em;
          box-shadow: 0 12px 32px rgba(0, 0, 0, 0.4), inset 0 1px 0 rgba(255, 255, 255, 0.1);
        }
        .zaahi-popup .maplibregl-popup-tip {
          border-top-color: rgba(200, 169, 110, 0.4) !important;
          border-bottom-color: rgba(200, 169, 110, 0.4) !important;
        }
        .zaahi-popup .maplibregl-popup-close-button {
          color: ${GOLD} !important;
          font-size: 18px !important;
          padding: 2px 6px !important;
          opacity: 0.7;
          transition: opacity 150ms ease, color 150ms ease;
        }
        .zaahi-popup .maplibregl-popup-close-button:hover {
          opacity: 1;
        }
      `}</style>
      {!selectedParcelId && !selectedVaultEntry && zaahiHover && (() => {
        const title = zaahiHover.projectName || zaahiHover.plotNumber;
        const authority =
          zaahiHover.emirate === "Dubai" ? "DDA"
          : zaahiHover.emirate === "Abu Dhabi" ? "ADDED"
          : "";
        const hasPlotArea = zaahiHover.plotAreaSqft > 0 || zaahiHover.plotAreaSqm > 0;
        const hasGfa = zaahiHover.maxGfaSqft > 0 || zaahiHover.maxGfaSqm > 0;
        const hasFar = zaahiHover.far > 0;
        const hasHeight = !!zaahiHover.maxHeightCode || zaahiHover.maxFloors > 0 || zaahiHover.maxHeightMeters > 0;
        const heightParts: string[] = [];
        if (zaahiHover.maxHeightCode) heightParts.push(zaahiHover.maxHeightCode);
        if (zaahiHover.maxFloors > 0) heightParts.push(`${zaahiHover.maxFloors} floors`);
        if (zaahiHover.maxHeightMeters > 0) heightParts.push(`~${Math.round(zaahiHover.maxHeightMeters)} m`);
        const planDate = formatPlanDate(zaahiHover.planDateIso);
        // Physical status (Under Construction / Completed / etc.) is not
        // stored on Parcel or AffectionPlan today — only Parcel.status
        // (ParcelStatus enum) which is the marketplace listing state, and
        // Building.status (separate table, not joined here). Row omitted
        // until schema gains a physical-status field or Parcel↔Building FK.
        const handleOpenParcel = () => {
          const map = mapRef.current;
          if (!map || !zaahiHover.id) return;
          map.flyTo({
            center: [zaahiHover.lng, zaahiHover.lat],
            zoom: 16, pitch: 45, duration: 2000, essential: true,
          });
          // Mirror HeaderBar Find handshake (page.tsx ~6155) — open the
          // right SidePanel after the camera lands, not during flight.
          window.setTimeout(() => {
            setSelectedParcelId(zaahiHover.id);
          }, 2000);
          setZaahiHover(null);
        };
        return (
          <Panel
            radius={RADIUS_CARD}
            noShadow
            style={{
              position: "absolute",
              left: zaahiHover.x + 14,
              top: zaahiHover.y + 14,
              width: 260,
              // Gold left-border accent kept — distinguishes ZAAHI
              // listings from PMTiles (blue) and vault (gold variant).
              borderLeft: `3px solid ${GOLD}`,
              boxShadow: "0 6px 20px rgba(0,0,0,0.3)",
              padding: "10px 12px",
              fontSize: 11,
              fontFamily: 'Georgia, "Times New Roman", serif',
              lineHeight: 1.45,
              pointerEvents: "auto",
              cursor: "pointer",
              zIndex: 30,
            }}
            onMouseEnter={() => {
              if (hoverCloseTimerRef.current != null) {
                window.clearTimeout(hoverCloseTimerRef.current);
                hoverCloseTimerRef.current = null;
              }
            }}
            onMouseLeave={() => setZaahiHover(null)}
            onClick={handleOpenParcel}
          >
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8 }}>
              <span style={{ fontWeight: 700, color: GOLD, fontSize: 13, minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                {title}
              </span>
              <span style={{ display: "inline-flex", alignItems: "center", gap: 6, flexShrink: 0 }}>
                {authority && (
                  <span style={{
                    fontSize: 11, fontWeight: 600, color: "rgba(255,255,255,0.55)",
                    letterSpacing: "0.06em", textTransform: "uppercase",
                  }}>{authority}</span>
                )}
                {!!zaahiHover.plotNumber && /^\d{5,10}$/.test(zaahiHover.plotNumber) && (
                  <VaultAddButton
                    plotNumber={zaahiHover.plotNumber}
                    onClick={() => openVaultWizardWith(zaahiHover.plotNumber)}
                  />
                )}
              </span>
            </div>
            {hasPlotArea && (
              <PmtilesHoverRow label="Plot Area"
                value={`${zaahiHover.plotAreaSqft.toLocaleString()} ft² · ${zaahiHover.plotAreaSqm.toLocaleString()} m²`} />
            )}
            {hasGfa && (
              <PmtilesHoverRow label="Max GFA"
                value={`${zaahiHover.maxGfaSqft.toLocaleString()} ft² · ${zaahiHover.maxGfaSqm.toLocaleString()} m²`} />
            )}
            {hasFar && (
              <PmtilesHoverRow label="FAR" value={zaahiHover.far.toFixed(1)} />
            )}
            {hasHeight && (
              <PmtilesHoverRow label="Max Height" value={heightParts.join(" · ")} />
            )}
            {planDate && (
              <PmtilesHoverRow label="Affection Plan" value={planDate} />
            )}
            {/* Add-to-Vault button moved to the header row (top-right
                "+" icon) as part of the founder spec 2026-05-31. The
                openVaultWizardWith helper handles auth-redirect, popup
                close, and plot pre-fill. */}
          </Panel>
        );
      })()}
      {!selectedParcelId && !selectedVaultEntry && vaultHover && (() => {
        const title = vaultHover.projectName || vaultHover.plotNumber;
        const hasPlotArea = vaultHover.plotAreaSqft > 0 || vaultHover.area > 0;
        const hasGfa = vaultHover.maxGfaSqft > 0;
        const hasFar = vaultHover.far > 0;
        const hasHeight = !!vaultHover.maxHeightCode || vaultHover.maxFloors > 0 || vaultHover.maxHeightMeters > 0;
        const heightParts: string[] = [];
        if (vaultHover.maxHeightCode) heightParts.push(vaultHover.maxHeightCode);
        if (vaultHover.maxFloors > 0) heightParts.push(`${vaultHover.maxFloors} floors`);
        if (vaultHover.maxHeightMeters > 0) heightParts.push(`~${Math.round(vaultHover.maxHeightMeters)} m`);
        const planDate = formatPlanDate(vaultHover.planDateIso);
        const handleOpen = () => {
          if (vaultHover.id) setSelectedVaultEntry({ id: vaultHover.id, mode: vaultHover.mode });
          setVaultHover(null);
        };
        return (
          <Panel
            radius={RADIUS_CARD}
            noShadow
            style={{
              position: "absolute",
              left: vaultHover.x + 14,
              top: vaultHover.y + 14,
              width: 260,
              borderLeft: `3px solid ${GOLD}`,
              boxShadow: "0 6px 20px rgba(0,0,0,0.3)",
              padding: "10px 12px",
              fontSize: 11,
              fontFamily: 'Georgia, "Times New Roman", serif',
              lineHeight: 1.45,
              pointerEvents: "auto",
              cursor: "pointer",
              zIndex: 30,
            }}
            onMouseEnter={() => {
              if (hoverCloseTimerRef.current != null) {
                window.clearTimeout(hoverCloseTimerRef.current);
                hoverCloseTimerRef.current = null;
              }
            }}
            onMouseLeave={() => setVaultHover(null)}
            onClick={handleOpen}
          >
            <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", gap: 8 }}>
              <span style={{ fontWeight: 700, color: GOLD, fontSize: 13 }}>
                {title}
              </span>
              <span style={{
                fontSize: 11, fontWeight: 600, color: "rgba(255,255,255,0.55)",
                letterSpacing: "0.06em", textTransform: "uppercase",
              }}>
                {vaultHover.mode === "share" ? "SHARED" : "VAULT"}
              </span>
            </div>
            {hasPlotArea && (
              <PmtilesHoverRow label="Plot Area"
                value={(vaultHover.plotAreaSqft > 0 ? vaultHover.plotAreaSqft : vaultHover.area).toLocaleString() + " ft²"} />
            )}
            {hasGfa && (
              <PmtilesHoverRow label="Max GFA" value={`${vaultHover.maxGfaSqft.toLocaleString()} ft²`} />
            )}
            {hasFar && (
              <PmtilesHoverRow label="FAR" value={vaultHover.far.toFixed(1)} />
            )}
            {hasHeight && (
              <PmtilesHoverRow label="Max Height" value={heightParts.join(" · ")} />
            )}
            {planDate && (
              <PmtilesHoverRow label="Affection Plan" value={planDate} />
            )}
            <PmtilesHoverRow
              label="Asking Price"
              value={vaultHover.askingAed != null ? `AED ${vaultHover.askingAed.toLocaleString()}` : "—"}
            />
          </Panel>
        );
      })()}
      {!selectedParcelId && !selectedVaultEntry && ddaLandHover && (() => {
        const m = ddaLandHover.municipality;
        const authority =
          ddaLandHover.source === "dda" ? "DDA"
          : ddaLandHover.source === "ad" && m === "ADM" ? "ADM"
          : ddaLandHover.source === "ad" && m === "AAM" ? "AAM"
          : ddaLandHover.source === "ad" ? "AD"
          : "";
        const status = formatPmtilesStatus(ddaLandHover.status);
        const canAdd = /^\d{5,10}$/.test(ddaLandHover.plotNumber);
        return (
          <Panel
            radius={RADIUS_CARD}
            noShadow
            style={{
              position: "absolute",
              left: ddaLandHover.x + 14,
              top: ddaLandHover.y + 14,
              width: 250,
              // PMTiles plots use a blue left-border accent — visually
              // distinct from the gold-borderLeft ZAAHI listing card.
              borderLeft: "3px solid #4A90D9",
              boxShadow: "0 6px 20px rgba(0,0,0,0.3)",
              padding: "10px 12px",
              fontSize: 11,
              fontFamily: 'Georgia, "Times New Roman", serif',
              lineHeight: 1.45,
              // Interactive: the "+" button needs to receive clicks
              // and the popup needs to survive a brief mouseleave.
              pointerEvents: "auto",
              zIndex: 30,
            }}
            onMouseEnter={() => {
              if (hoverCloseTimerRef.current != null) {
                window.clearTimeout(hoverCloseTimerRef.current);
                hoverCloseTimerRef.current = null;
              }
            }}
            onMouseLeave={() => {
              if (hoverCloseTimerRef.current != null) {
                window.clearTimeout(hoverCloseTimerRef.current);
              }
              hoverCloseTimerRef.current = window.setTimeout(() => {
                setDdaLandHover(null);
                hoverCloseTimerRef.current = null;
              }, 220);
            }}
          >
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8 }}>
              <span style={{ fontWeight: 700, color: "#4A90D9", fontSize: 13, minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                {ddaLandHover.plotNumber || "—"}
              </span>
              <span style={{ display: "inline-flex", alignItems: "center", gap: 6, flexShrink: 0 }}>
              {authority && (
                <span style={{
                  fontSize: 11, fontWeight: 600, color: "rgba(255,255,255,0.55)",
                  letterSpacing: "0.06em", textTransform: "uppercase",
                }}>{authority}</span>
              )}
              {canAdd && (
                <VaultAddButton
                  plotNumber={ddaLandHover.plotNumber}
                  onClick={() => openVaultWizardWith(ddaLandHover.plotNumber)}
                />
              )}
              </span>
            </div>
            {ddaLandHover.mainLandUse && (
              <div style={{ opacity: 0.78, marginTop: 4, fontSize: 12 }}>
                {ddaLandHover.mainLandUse}
              </div>
            )}
            <PmtilesHoverRow label="Plot Area"
              value={`${ddaLandHover.areaSqft.toLocaleString()} ft² · ${ddaLandHover.areaSqm.toLocaleString()} m²`} />
            {ddaLandHover.gfaSqm > 0 && (
              <PmtilesHoverRow label="Max GFA"
                value={`${ddaLandHover.gfaSqft.toLocaleString()} ft² · ${ddaLandHover.gfaSqm.toLocaleString()} m²`} />
            )}
            {/* Max Height + Affection Plan rows intentionally omitted —
                neither field is emitted by scripts/prepare-tiles.ts into
                the PMTiles feature properties. To enable: add
                MAX_HEIGHT_FLOORS + MAX_HEIGHT_METERS (read internally
                already) and AFFECTION_PLAN_DATE to baseProps, then
                rebuild via scripts/update-tiles.sh. */}
            {status && <PmtilesHoverRow label="Status" value={status} />}
          </Panel>
        );
      })()}
      {/* The music / sound toggle moved into the HeaderBar (next to
          Profile) per founder spec 2026-04-12. The old floating
          button at top:56 right:16 is gone. */}

      {/* ── MiniMap dock — bottom center ──
          Civ6-style regional overview. Collapsed by default: only the
          tiny map-icon toggle is visible at the bottom-center. When
          the user opens it, the full dock (layer rail · minimap ·
          action rail) slides up with a 300 ms ease-in-out fade. The
          MiniMap instance stays mounted while hidden so it keeps
          syncing with the main map — re-opening is instant.
          Position: bottom: 16, left: 50% with translateX(-50%) per
          founder spec 2026-05-23. */}
      <div
        style={{
          position: "absolute",
          left: "50%",
          bottom: 16,
          transform: "translateX(-50%)",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          gap: 8,
          zIndex: 14,
          pointerEvents: "none",
        }}
      >
        {/* Dock — unified glass panel around the minimap. Buttons split
            across three rails (top / left / right) so the layer pile
            isn't all on one side. Grid areas keep everything snapped
            flush against the minimap edges. */}
        <Panel
          aria-hidden={!miniOpen}
          radius={RADIUS_PANEL}
          noShadow
          style={{
            display: "grid",
            gridTemplateColumns: "auto auto auto",
            gridTemplateRows: "auto auto",
            gridTemplateAreas: `
              ".    top   ."
              "left mid   right"
            `,
            columnGap: 6,
            rowGap: 6,
            padding: 8,
            // Local lighter shadow — the dock has the minimap canvas
            // inside which we don't want to lift visually as much as a
            // full-height SidePanel would.
            boxShadow: "0 6px 20px rgba(0,0,0,0.3)",
            opacity: miniOpen ? 1 : 0,
            transform: miniOpen ? "translateY(0)" : "translateY(12px)",
            pointerEvents: miniOpen ? "auto" : "none",
            transition: "opacity 300ms ease-in-out, transform 300ms ease-in-out",
          }}
        >
          <div
            style={{
              gridArea: "top",
              display: "flex",
              flexDirection: "row",
              gap: 6,
              justifyContent: "space-between",
            }}
          >
            {MINI_TOP_LAYERS.map((l) => (
              <MiniRailBtn
                key={l.key}
                title={l.label}
                active={!!layers[l.key]}
                onClick={() =>
                  setLayers((s) => ({ ...s, [l.key]: !s[l.key] }))
                }
              >
                {l.icon}
              </MiniRailBtn>
            ))}
          </div>

          <div
            style={{
              gridArea: "left",
              display: "flex",
              flexDirection: "column",
              gap: 6,
              alignSelf: "start",
            }}
          >
            {MINI_LEFT_LAYERS.map((l) => (
              <MiniRailBtn
                key={l.key}
                title={l.label}
                active={!!layers[l.key]}
                onClick={() =>
                  setLayers((s) => ({ ...s, [l.key]: !s[l.key] }))
                }
              >
                {l.icon}
              </MiniRailBtn>
            ))}
          </div>

          <div style={{ gridArea: "mid", display: "flex", flexDirection: "column", gap: 4 }}>
            <MiniMap mainMapRef={mapRef} />
            {/* Cursor coords + zoom footer under the minimap. Duplicates
                the bottom-left readout on purpose: power users glance
                here when the dock is open; the bottom-left version is
                kept for users who never open the dock. */}
            <div
              style={{
                fontSize: 11,
                color: "rgba(255, 255, 255, 0.55)",
                fontFamily: '"SF Mono", "Menlo", monospace',
                letterSpacing: "0.04em",
                textAlign: "center",
                paddingTop: 2,
                pointerEvents: "none",
              }}
            >
              {cursor.lat.toFixed(5)}, {cursor.lng.toFixed(5)} · z{zoom.toFixed(2)}
            </div>
          </div>

          <div
            style={{
              gridArea: "right",
              display: "flex",
              flexDirection: "column",
              gap: 6,
              alignSelf: "start",
            }}
          >
            {/* Mini-dock right rail cleanup 2026-05-24 (Option A):
                Legend, the 3 basemap buttons, and Auto-rotate were
                removed because they duplicate the big-map 5×5 stacks
                (RIGHT slot 1 = Legend; LEFT slots 2-4 = basemap;
                LEFT slot 5 = Auto-rotate). The right rail keeps only
                Sun-slider + Drone — controls that have no big-map
                counterpart. Yes, the rail is now asymmetric (4 top,
                5 left, 2 right) — accepted as a trade-off for "no
                duplicate clicks" per founder spec. */}
            <MiniRailBtn
              title={sunSliderActive ? "Hide sun-time slider" : "Show sun-time slider"}
              active={sunSliderActive}
              onClick={() => {
                sound.whoosh();
                setSunSliderActive((v) => !v);
              }}
            >
              {/* Sun — radiating rays around a centered disc. */}
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="4" />
                <path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41" />
              </svg>
            </MiniRailBtn>
            {/* Auto-rotate moved exclusively to big-map LEFT slot 5
                (commit 9f34cc8) — removed from the mini dock to drop
                the duplicate per Option A. State / mutex against
                Drone still lives at the page level. */}
            <MiniRailBtn
              title={droneEnabled ? "Disable drone mode" : "Enable drone mode (WASD + right-click rotate)"}
              active={droneEnabled}
              onClick={() => {
                sound.whoosh();
                setDroneEnabled((v) => {
                  const next = !v;
                  // Mutual exclusion: enabling drone disables auto-rotate.
                  if (next) setAutoRotateEnabled(false);
                  return next;
                });
              }}
            >
              {/* Minimal quadcopter silhouette. */}
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="2" />
                <line x1="12" y1="10" x2="12" y2="5" />
                <line x1="12" y1="14" x2="12" y2="19" />
                <line x1="10" y1="12" x2="5" y2="12" />
                <line x1="14" y1="12" x2="19" y2="12" />
                <circle cx="5" cy="12" r="2" />
                <circle cx="19" cy="12" r="2" />
                <circle cx="12" cy="5" r="2" />
                <circle cx="12" cy="19" r="2" />
              </svg>
            </MiniRailBtn>
            {/* Vault-only viewmode toggle removed from the dock on
                2026-05-24 (rail balance 5/5). vaultOnlyMode / setVaultOnlyMode
                state stays in page.tsx so the existing visibility
                effect at L4115 keeps working as a no-op; the toggle
                will return in a future revamp if needed. The Vault
                link in the header (next to Profile) is the discovery
                path for now. */}
          </div>
        </Panel>

        {/* Toggle — always visible, bottom-center. Flips the dock open. */}
        <button
          onClick={() => setMiniOpen((o) => !o)}
          title={miniOpen ? "Hide mini map" : "Show mini map"}
          aria-label={miniOpen ? "Hide mini map" : "Show mini map"}
          aria-expanded={miniOpen}
          style={{
            pointerEvents: "auto",
            width: 32,
            height: 32,
            borderRadius: 8,
            border: `1px solid ${miniOpen ? GOLD : "rgba(200, 169, 110, 0.3)"}`,
            background: miniOpen ? "rgba(200,169,110,0.25)" : "rgba(0, 0, 0, 0.3)",
            backdropFilter: "blur(16px)",
            WebkitBackdropFilter: "blur(16px)",
            color: GOLD,
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: 0,
            boxShadow: "0 6px 20px rgba(0,0,0,0.3)",
            transition: "border-color 150ms ease, background 150ms ease",
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.borderColor = GOLD;
            e.currentTarget.style.background = "rgba(200, 169, 110, 0.25)";
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.borderColor = miniOpen ? GOLD : "rgba(200, 169, 110, 0.3)";
            e.currentTarget.style.background = miniOpen
              ? "rgba(200,169,110,0.25)"
              : "rgba(0, 0, 0, 0.3)";
          }}
        >
          {miniOpen ? (
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
              <line x1="6" y1="6" x2="18" y2="18" />
              <line x1="18" y1="6" x2="6" y2="18" />
            </svg>
          ) : (
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polygon points="1 6 7 3 15 6 23 3 23 18 15 21 7 18 1 21 1 6" />
              <line x1="7" y1="3" x2="7" y2="18" />
              <line x1="15" y1="6" x2="15" y2="21" />
            </svg>
          )}
        </button>
      </div>

      <BuildingCard
        buildingId={selectedBuildingId}
        onClose={() => setSelectedBuildingId(null)}
      />

      {selectedVaultEntry && (
        <VaultSidePanelAdapter
          entryId={selectedVaultEntry.id}
          mode={selectedVaultEntry.mode}
          onClose={() => setSelectedVaultEntry(null)}
          mapRef={mapRef}
        />
      )}

      <ArchibaldChat hidden={!!selectedParcelId} mapControls={mapControls} />
      <SidePanel
        parcelId={selectedParcelId}
        mapRef={mapRef}
        onClose={() => {
          sound.swooshClose();
          setSelectedParcelId(null);
        }}
      />
      <WelcomeTour />
      <ParcelsPortalPanel
        open={portalOpen}
        onClose={() => setPortalOpen(false)}
        mapRef={mapRef}
        onSelectParcel={(id) => setSelectedParcelId(id)}
      />
      <ParcelsNav
        mapRef={mapRef}
        portalOpen={portalOpen}
        onTogglePortal={() => {
          setPortalOpen((o) => !o);
          setLayersOpen(false);
        }}
        selectedParcelId={selectedParcelId}
        selectedVaultEntryId={selectedVaultEntry?.id ?? null}
        vaultOnlyMode={vaultOnlyMode}
        onSelectListing={(id) => setSelectedParcelId(id)}
        onSelectVaultEntry={(entryId) =>
          setSelectedVaultEntry({ id: entryId, mode: "owner" })
        }
      />
      {devModeHero && editingHeroId && (() => {
        const b = HERO_BUILDINGS.find((x) => x.id === editingHeroId);
        if (!b) return null;
        return (
          <HeroBuildingsDevPanel
            building={b}
            override={heroOverrides[editingHeroId]}
            onChange={(next) =>
              setHeroOverrides((prev) => ({ ...prev, [editingHeroId]: next }))
            }
            onReset={() =>
              setHeroOverrides((prev) => {
                const cp = { ...prev };
                delete cp[editingHeroId];
                return cp;
              })
            }
            onClose={() => setEditingHeroId(null)}
          />
        );
      })()}
    </div>
  );
}

// ── Hover-card helpers (PMTiles DDA/AD plot popup) ──
// Compact "+" icon button placed in the top-right of every hover card
// (ZAAHI listings + PMTiles parcels). Clicking it opens the vault
// wizard with the plot pre-filled — Step 1 then auto-fires its DDA
// lookup so the user lands on Step 2 / 3 (founder spec 2026-05-31).
// stopPropagation so the click never bubbles to the card's flyTo /
// SidePanel handler.
function VaultAddButton({
  plotNumber,
  onClick,
}: {
  plotNumber: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      title="Add to Vault"
      aria-label={`Add plot ${plotNumber} to your vault`}
      onClick={(e) => {
        e.stopPropagation();
        onClick();
      }}
      style={{
        width: 24,
        height: 24,
        borderRadius: 6,
        border: "1px solid rgba(200, 169, 110, 0.4)",
        background: "rgba(200, 169, 110, 0.10)",
        color: GOLD,
        cursor: "pointer",
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        fontSize: 16,
        fontWeight: 700,
        lineHeight: 1,
        padding: 0,
        fontFamily: "inherit",
        flexShrink: 0,
        transition: "border-color 150ms ease, background 150ms ease",
      }}
      onMouseEnter={(ev) => {
        ev.currentTarget.style.background = "rgba(200, 169, 110, 0.25)";
        ev.currentTarget.style.borderColor = GOLD;
      }}
      onMouseLeave={(ev) => {
        ev.currentTarget.style.background = "rgba(200, 169, 110, 0.10)";
        ev.currentTarget.style.borderColor = "rgba(200, 169, 110, 0.4)";
      }}
    >
      +
    </button>
  );
}

// One small row of label + value, used inside the ddaLandHover popup
// JSX. Style mirrors the rest of the hover card (Georgia / SF Mono).
function PmtilesHoverRow({ label, value }: { label: string; value: string }) {
  return (
    <div style={{
      display: "flex", justifyContent: "space-between", gap: 8,
      marginTop: 3, fontSize: 12, lineHeight: 1.35,
    }}>
      <span style={{
        opacity: 0.55, letterSpacing: "0.04em",
        textTransform: "uppercase", fontSize: 11,
      }}>{label}</span>
      <span style={{
        color: "rgba(255,255,255,0.95)", textAlign: "right",
        fontFamily: '"SF Mono", Menlo, monospace', fontSize: 12,
      }}>{value}</span>
    </div>
  );
}

// Light-touch status normalizer: ALL-CAPS → Title Case (with
// underscores spaced). Already-Title values pass through unchanged.
function formatPmtilesStatus(raw: string): string {
  if (!raw || raw.trim() === "") return "";
  if (raw === raw.toUpperCase()) {
    return raw.toLowerCase().replace(/\b\w/g, (c) => c.toUpperCase()).replace(/_/g, " ");
  }
  return raw;
}

// "2026-03-14T..." → "14 Mar 2026". Empty / invalid → "".
const MONTHS_SHORT = ["Jan", "Feb", "Mar", "Apr", "May", "Jun",
                       "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
function formatPlanDate(iso: string): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return `${d.getUTCDate().toString().padStart(2, "0")} ${MONTHS_SHORT[d.getUTCMonth()]} ${d.getUTCFullYear()}`;
}

function LayerToggle({
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
function SoonBadge() {
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
function LockBadge({ tier }: { tier: "GOLD" | "PLATINUM" }) {
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
function LayerGroup({
  c, title, open, onToggle, search, items, isOn, onChange, hideCollapseCaret,
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
            ({onCount}/{total})
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
function CountryGroup({
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
function SectionCheckbox({
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

function GroupHeader({
  title,
  open,
  onToggle,
  c,
}: {
  title: string;
  open: boolean;
  onToggle: () => void;
  c: { textDim: string; borderSubtle: string };
}) {
  return (
    <button
      onClick={onToggle}
      style={{
        width: "100%",
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        padding: "8px 14px 6px",
        borderTop: `1px solid ${c.borderSubtle}`,
        background: "transparent",
        border: "none",
        borderTopStyle: "solid",
        borderTopWidth: 1,
        borderTopColor: c.borderSubtle,
        cursor: "pointer",
        fontFamily: 'Georgia, "Times New Roman", serif',
        fontSize: 12,
        letterSpacing: "0.12em",
        textTransform: "uppercase",
        color: c.textDim,
      }}
    >
      <span>{title}</span>
      <span style={{ fontSize: 11 }}>{open ? "▾" : "▸"}</span>
    </button>
  );
}

function Stat({ label, value, dim, text }: { label: string; value: string; dim: string; text: string }) {
  return (
    <span>
      <span style={{ color: dim, marginRight: 5 }}>{label}</span>
      <span style={{ color: text }}>{value}</span>
    </span>
  );
}

// ── New unified header bar with Add / Find / Check / Profile ──
type ChromeTheme = {
  bg: string;
  text: string;
  textDim: string;
  border: string;
  borderSubtle: string;
  headerShadow: string;
};

// Inline ChromeBtn function moved out (Phase 1 style unification,
// 2026-05-31) — now imported from "@/components/ChromeBtn" at the
// top of this file. Single source of truth for the glass button
// chrome across page.tsx, modals, and any future surface.
function HeaderBar({
  c,
  isDark,
  onFly,
  onSelectParcel,
  onOpenAddModal,
  vaultOnlyMode,
  onToggleVaultOnly,
}: {
  c: ChromeTheme;
  isDark: boolean;
  onFly: (lng: number, lat: number) => void;
  onSelectParcel: (id: string) => void;
  onOpenAddModal: () => void;
  vaultOnlyMode: boolean;
  onToggleVaultOnly: () => void;
}) {
  const [find, setFind] = useState("");
  const [findOpen, setFindOpen] = useState(false);
  const [findError, setFindError] = useState<string | null>(null);
  const [findBusy, setFindBusy] = useState(false);
  const [check, setCheck] = useState("");
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

  const flash = (m: string) => {
    setMsg(m);
    setTimeout(() => setMsg(null), 3000);
  };

  async function doFind() {
    const plotNumber = find.trim();
    if (!plotNumber) return;
    setFindError(null);
    setFindBusy(true);
    try {
      const r = await apiFetch("/api/parcels/map");
      const data = (await r.json()) as {
        items: Array<{ id: string; plotNumber: string; geometry: GeoJSON.Polygon | null }>;
      };
      const hit = data.items.find((it) => it.plotNumber === plotNumber);
      if (!hit?.geometry) {
        setFindError("Plot not found");
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

  function doCheck(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key !== "Enter") return;
    const plotNumber = check.replace(/\s+/g, "").trim();
    if (!/^\d{7}$/.test(plotNumber)) {
      flash("Plot # must be exactly 7 digits");
      return;
    }
    // Copy to clipboard so user can paste into the DLD form
    navigator.clipboard?.writeText(plotNumber).catch(() => {});
    window.open(
      "https://dubailand.gov.ae/en/eservices/inquiry-about-a-property-status/",
      "_blank",
      "noopener",
    );
    flash(`→ DLD check ${plotNumber} (copied)`);
    setCheck("");
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
function FindLauncher({
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

function HdrField({
  c, icon, label, placeholder, value, onChange, onKey, busy, tooltip,
}: {
  c: ChromeTheme;
  icon: string;
  label: string;
  placeholder: string;
  value: string;
  onChange: (v: string) => void;
  onKey: (e: React.KeyboardEvent<HTMLInputElement>) => void;
  busy: boolean;
  tooltip: string;
}) {
  const [expanded, setExpanded] = useState(false);

  if (!expanded && !value) {
    return (
      <ChromeBtn
        title={tooltip}
        onClick={() => setExpanded(true)}
        size={CHROME_BTN_SIZE_COMPACT}
      >
        <span style={{ fontSize: 13, color: GOLD, fontWeight: 700, lineHeight: 1 }}>{icon}</span>
      </ChromeBtn>
    );
  }

  return (
    <label
      title={tooltip}
      style={{
        display: "flex",
        alignItems: "center",
        height: 28,
        padding: "0 4px 0 8px",
        borderRadius: 6,
        border: `1px solid rgba(200, 169, 110, 0.3)`,
        background: "rgba(10, 22, 40, 0.5)",
        color: c.text,
        boxShadow: "0 8px 20px rgba(0, 0, 0, 0.3), inset 0 1px 0 rgba(255, 255, 255, 0.08)",
        gap: 4,
        transition: "border-color 150ms ease, background 150ms ease",
      }}
      onMouseEnter={(e) => { e.currentTarget.style.borderColor = GOLD; e.currentTarget.style.background = "rgba(200, 169, 110, 0.25)"; }}
      onMouseLeave={(e) => { e.currentTarget.style.borderColor = "rgba(200, 169, 110, 0.3)"; e.currentTarget.style.background = "rgba(10, 22, 40, 0.5)"; }}
    >
      <span style={{ fontSize: 12, color: GOLD, fontWeight: 700, lineHeight: 1 }}>{icon}</span>
      {label && <span style={{ fontSize: 12, fontWeight: 600, color: c.text }}>{label}</span>}
      <input
        autoFocus
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Escape") {
            e.preventDefault();
            setExpanded(false);
            onChange("");
          }
          onKey(e);
        }}
        onBlur={() => { if (!value) setExpanded(false); }}
        placeholder={busy ? "…" : placeholder}
        disabled={busy}
        style={{
          width: 70,
          height: 22,
          padding: "0 4px",
          border: "none",
          background: "transparent",
          color: c.text,
          fontSize: 12,
          outline: "none",
        }}
      />
    </label>
  );
}

// ─── MiniMap dock layer configuration ─────────────────────────────
// Buttons wrap the minimap on three sides. Top rail = region toggles
// (the four biggest land datasets). Left rail = contextual toggles
// (communities, governorates, zones, projects). Right rail lives in
// page.tsx as Link-wrapped actions (Legend / Ambassador / Profile).
// Every key must exist on LayersState or setLayers will no-op.
// Icons are minimal inline SVG — no emoji per CLAUDE.md UI STYLE GUIDE.
type MiniLayer = { key: keyof LayersState; label: string; icon: React.ReactNode };

const MINI_TOP_LAYERS: MiniLayer[] = [
  {
    key: "ddaLandPlots",
    label: "DDA Land Plots",
    icon: (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <rect x="3" y="3" width="18" height="18" rx="2" />
        <path d="M3 9h18M3 15h18M9 3v18M15 3v18" />
      </svg>
    ),
  },
  {
    key: "adLandPlots",
    label: "Abu Dhabi Land Plots",
    icon: (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <rect x="3" y="3" width="18" height="18" rx="2" />
        <path d="M7 12h10M12 7v10" />
      </svg>
    ),
  },
  // Oman entry dropped 2026-05-24 — coverage removed from platform.
  {
    key: "metro",
    label: "Metro",
    icon: (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <rect x="5" y="3" width="14" height="16" rx="3" />
        <path d="M5 13h14" />
        <circle cx="9" cy="17" r="1.2" fill="currentColor" />
        <circle cx="15" cy="17" r="1.2" fill="currentColor" />
        <path d="M7 21l-2 2M17 21l2 2" />
      </svg>
    ),
  },
];

const MINI_LEFT_LAYERS: MiniLayer[] = [
  {
    key: "communities",
    label: "Communities",
    icon: (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M3 21V9l9-6 9 6v12" />
        <path d="M9 21v-7h6v7" />
      </svg>
    ),
  },
  {
    // District names render at zoom ≥ 11 (city scale). Default ON per
    // LayersState init; persists via zaahi-map-layers in localStorage.
    key: "districtNames",
    label: "District Names",
    icon: (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        {/* "Aa" glyph — uppercase A + lowercase a, stylized strokes. */}
        <path d="M4 19l4-12 4 12M5.5 15h5" />
        <path d="M18 19v-5a3 3 0 0 0-6 0M18 14v5M12 18a2 2 0 0 0 4 0" />
      </svg>
    ),
  },
  // Saudi Governorates entry dropped 2026-05-24 along with the rest
  // of the Saudi coverage (Riyadh Zones, governorate KML route).
  {
    key: "ddaFreeZones",
    label: "Free Zones",
    icon: (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M12 3l8 4v5c0 4-4 7-8 9-4-2-8-5-8-9V7l8-4z" />
      </svg>
    ),
  },
  {
    key: "ddaProjects",
    label: "DDA Projects",
    icon: (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M4 21h16M6 21V10l6-5 6 5v11" />
        <rect x="10" y="13" width="4" height="4" />
      </svg>
    ),
  },
];

/**
 * Icon button for the MiniMap rails. Renders as a `<button>` by default;
 * pass `asSpan` when wrapping in a Link so we don't nest interactive
 * elements. Active = gold fill + gold text. Inactive = dim gold border,
 * hover lifts into the gold tint — same language as ChromeBtn.
 */
function MiniRailBtn({
  title,
  active,
  onClick,
  children,
  asSpan,
}: {
  title: string;
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
  asSpan?: boolean;
}) {
  const base: React.CSSProperties = {
    width: 30,
    height: 30,
    borderRadius: 6,
    border: `1px solid ${active ? GOLD : "rgba(200, 169, 110, 0.3)"}`,
    background: active ? "rgba(200,169,110,0.25)" : "rgba(10, 22, 40, 0.5)",
    color: GOLD,
    cursor: "pointer",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    padding: 0,
    transition: "border-color 150ms ease, background 150ms ease",
  };
  const onEnter = (e: React.MouseEvent<HTMLElement>) => {
    e.currentTarget.style.borderColor = GOLD;
    e.currentTarget.style.background = "rgba(200, 169, 110, 0.25)";
  };
  const onLeave = (e: React.MouseEvent<HTMLElement>) => {
    e.currentTarget.style.borderColor = active ? GOLD : "rgba(200, 169, 110, 0.3)";
    e.currentTarget.style.background = active
      ? "rgba(200,169,110,0.25)"
      : "rgba(10, 22, 40, 0.5)";
  };
  if (asSpan) {
    return (
      <span
        title={title}
        aria-label={title}
        style={base}
        onMouseEnter={onEnter}
        onMouseLeave={onLeave}
      >
        {children}
      </span>
    );
  }
  return (
    <button
      title={title}
      aria-label={title}
      onClick={onClick}
      style={base}
      onMouseEnter={onEnter}
      onMouseLeave={onLeave}
    >
      {children}
    </button>
  );
}

export default function ParcelsMapPage() {
  return (
    <AuthGuard>
      <ParcelsMapPageInner />
      {/* Terms-accept gate (first-visit only — persisted in localStorage). */}
      <TermsAcceptModal />
    </AuthGuard>
  );
}
