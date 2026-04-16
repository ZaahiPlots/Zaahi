"use client";
import { useEffect, useMemo, useRef, useState } from "react";
import maplibregl, { Map as MLMap, StyleSpecification, MapMouseEvent } from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import { Protocol } from "pmtiles";
import Link from "next/link";
import SidePanel from "./SidePanel";
import ArchibaldChat from "./ArchibaldChat";
import AddPlotModal from "./AddPlotModal";
import MiniMap from "./MiniMap";
import TermsAcceptModal from "./TermsAcceptModal";
import { sound } from "@/lib/sound";
import AuthGuard from "@/components/AuthGuard";
import { apiFetch } from "@/lib/api-fetch";
import { installDroneControls, type DroneController } from "@/lib/drone-controls";

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
const ROADS_SRC = "roads";
const ROADS_LINE = "roads-line";
const METRO_SRC = "metro";
const METRO_LINE = "metro-line";
const SAUDI_GOV_SRC = "saudi-governorates";
const SAUDI_GOV_LINE = "saudi-governorates-line";
const SAUDI_GOV_FILL = "saudi-governorates-fill";
const RIYADH_ZONES_SRC = "riyadh-zones";
const RIYADH_ZONES_LINE = "riyadh-zones-line";
const RIYADH_ZONES_FILL = "riyadh-zones-fill";
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
  FUTURE_DEVELOPMENT: "#C8A96E",  // gold
  "FUTURE DEVELOPMENT": "#C8A96E",
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
  saudiGovernorates: boolean; riyadhZones: boolean;
  adMunicipalities: boolean; adDistricts: boolean; adCommunities: boolean;
  uaeDistricts: boolean;
  ddaLandPlots: boolean; adLandPlots: boolean; omanLandPlots: boolean;
  ddaProjects: boolean; ddaFreeZones: boolean;
  // Plot-number labels for DDA districts (zoom > 15). Off by default;
  // user toggles via "Plot Numbers" button in the layers panel.
  plotLabels: boolean;
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

type LayerCountry = "dubai" | "abudhabi" | "otheruae" | "saudi" | "oman";
type LayerCategory =
  | "base"            // roads / metro / admin boundaries
  | "dda-admin"       // DDA projects, free zones, 99K plots layer
  | "dda-districts"   // individual DDA community layers (206 items)
  | "masterplans"     // 8 master plan KMLs
  | "landplots";      // country-scale PMTiles parcel grids (AD, Oman)
type LayerLockTier = "GOLD" | "PLATINUM";

type LayerMeta = {
  country: LayerCountry;
  category: LayerCategory;
  tier?: LayerLockTier;
};

const LAYER_COUNTRY_ORDER: LayerCountry[] = [
  "dubai", "abudhabi", "otheruae", "saudi", "oman",
];

const LAYER_CATEGORY_ORDER: LayerCategory[] = [
  "base", "dda-admin", "masterplans", "dda-districts", "landplots",
];

const COUNTRY_LABELS: Record<LayerCountry, string> = {
  dubai: "UAE — Dubai",
  abudhabi: "UAE — Abu Dhabi",
  otheruae: "UAE — Other Emirates",
  saudi: "Saudi Arabia",
  oman: "Oman",
};

const CATEGORY_LABELS: Record<LayerCategory, string> = {
  "base": "Base",
  "dda-admin": "DDA Layers",
  "masterplans": "Master Plans",
  "dda-districts": "DDA Districts",
  "landplots": "Land Plots",
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
    // ── Saudi ──
    saudiGovernorates: { country: "saudi", category: "base" },
    riyadhZones: { country: "saudi", category: "base", tier: "PLATINUM" },
    // ── Oman ──
    omanLandPlots: { country: "oman", category: "landplots", tier: "GOLD" },
  };
  // DDA districts (206 community polygons) — all Dubai, not tier-locked.
  for (const d of DDA_LAYERS) {
    m[d.key] = { country: "dubai", category: "dda-districts" };
  }
  return m;
})();

// Best-effort country detection from a map center. Used once on first
// panel open so the user's current country is auto-expanded.
function detectCountryFromLngLat(lng: number, lat: number): LayerCountry {
  if (lng < 50) return "saudi";          // Riyadh ~46.7
  if (lng > 56.5) return "oman";         // Muscat ~58.5
  // Inside UAE rectangle — distinguish Dubai / AD / other emirates.
  if (lat < 24.85) return "abudhabi";    // AD metro ~24.45, Al Ain ~24.2
  if (lat > 25.35) return "otheruae";    // Sharjah+, RAK, Fujairah
  return "dubai";
}

function ParcelsMapPageInner() {
  const containerRef = useRef<HTMLDivElement>(null);
  const [selectedParcelId, setSelectedParcelId] = useState<string | null>(null);
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
  const [zaahiHover, setZaahiHover] = useState<{
    x: number;
    y: number;
    plotNumber: string;
    district: string;
    area: number;
    priceAed: number | null;
    landUse: string;
  } | null>(null);
  const [ddaLandHover, setDdaLandHover] = useState<{
    x: number; y: number;
    plotNumber: string; mainLandUse: string;
    areaSqm: number; gfaSqm: number; status: string;
  } | null>(null);
  const zaahiPlotNumbersRef = useRef<Set<string>>(new Set());
  const mapRef = useRef<MLMap | null>(null);
  const popupRef = useRef<maplibregl.Popup | null>(null);
  const [theme, setTheme] = useState<Theme>("light");
  const [baseMap, setBaseMap] = useState<BaseMap>("light");
  const [is3D, setIs3D] = useState(true);
  const [cursor, setCursor] = useState({ lng: 55.27, lat: 25.20 });
  const [zoom, setZoom] = useState(12);
  const [bearing, setBearing] = useState(0);
  const [showAddModal, setShowAddModal] = useState(false);
  // Drone mode — toggleable via on-map button. Persists across reloads
  // via localStorage "zaahi-drone-mode". Default OFF on first visit.
  const [droneEnabled, setDroneEnabled] = useState(false);
  const [showDroneHint, setShowDroneHint] = useState(false);
  const droneCtrlRef = useRef<DroneController | null>(null);
  const [layersOpen, setLayersOpen] = useState(false);
  const [legendOpen, setLegendOpen] = useState(false);
  const [miniOpen, setMiniOpen] = useState(false);
  const legendRef = useRef<HTMLDivElement>(null);
  const legendBtnRef = useRef<HTMLButtonElement>(null);
  // Country-first hierarchy — one section per country, collapsible.
  // Phase 1: default Dubai expanded (where 114 ZAAHI listings live); on
  // first open of the layers panel we re-initialise from map center so
  // a user already panned to AD/Oman sees the right country expanded.
  const [countryOpen, setCountryOpen] = useState<Record<LayerCountry, boolean>>({
    dubai: true, abudhabi: false, otheruae: false, saudi: false, oman: false,
  });
  const countryInitialisedRef = useRef(false);
  const [layerSearch, setLayerSearch] = useState("");
  const panelRef = useRef<HTMLDivElement>(null);
  const panelBtnRef = useRef<HTMLButtonElement>(null);
  const [layers, setLayers] = useState<LayersState>({
    // Founder spec 2026-04-15: all user-toggleable layers default OFF.
    // Only ZAAHI parcel polygons + ZAAHI Signature 3D buildings stay on
    // by default — those are the core listings (loaded unconditionally
    // via loadZaahiPlots, not gated by LayersState).
    communities: false,
    roads: false,
    metro: false,
    saudiGovernorates: false,
    riyadhZones: false,
    adMunicipalities: false,
    adDistricts: false,
    adCommunities: false,
    uaeDistricts: false,
    ddaProjects: false,
    ddaFreeZones: false,
    ddaLandPlots: false,
    adLandPlots: false,
    omanLandPlots: false,
    plotLabels: false,
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
  });
  const layersRef = useRef(layers);
  layersRef.current = layers;
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
  type LayerKind = "base" | "masterplan" | "dda";
  type LayerDef = {
    key: keyof LayersState;
    kind: LayerKind;
    label: string;
    url: string;
    srcId: string;
    fillId?: string;
    lineId: string;
    fillPaint?: maplibregl.FillLayerSpecification["paint"];
    linePaint: maplibregl.LineLayerSpecification["paint"];
    promoteId?: string;
    hoverLabel?: string; // for master plan name popup
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
      {
        key: "saudiGovernorates",
        kind: "base",
        label: "Saudi Arabia Governorates",
        url: "/api/layers/saudi-governorates",
        srcId: SAUDI_GOV_SRC,
        fillId: SAUDI_GOV_FILL,
        lineId: SAUDI_GOV_LINE,
        fillPaint: {
          "fill-color": "#C8A96E",
          "fill-opacity": 0.06,
        },
        linePaint: {
          "line-color": "#B8975E",
          "line-width": 2,
          "line-opacity": 0.7,
        },
      },
      {
        key: "riyadhZones",
        kind: "base",
        label: "Riyadh Zones",
        url: "/api/layers/riyadh-zones",
        srcId: RIYADH_ZONES_SRC,
        fillId: RIYADH_ZONES_FILL,
        lineId: RIYADH_ZONES_LINE,
        fillPaint: {
          "fill-color": "#C8A96E",
          "fill-opacity": 0.1,
        },
        linePaint: {
          "line-color": "#C8A96E",
          "line-width": 1.5,
          "line-opacity": 0.7,
        },
      },
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

  // Per-load hover registration. The handlers themselves are defined
  // inside map.on("load") because they close over the popup; we stash
  // them on a ref so loadLayer can attach them to freshly-added layers.
  const hoverHandlersRef = useRef<{
    ddaPlotHover: (() => void) | null;
    masterPlanLeave: (() => void) | null;
    masterPlanHover: ((label: string) => (e: maplibregl.MapMouseEvent) => void) | null;
  }>({ ddaPlotHover: null, masterPlanLeave: null, masterPlanHover: null });

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
      if (!map.getLayer(def.lineId)) {
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
      if (def.kind === "dda") {
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
              "text-font": ["Noto Sans Regular"],
              "text-allow-overlap": false,
              "symbol-placement": "point",
              visibility: "none",
            },
            paint: {
              "text-color": isDark ? "#E8E0D0" : "#1A1A2E",
              "text-halo-color": isDark ? "rgba(10,22,40,0.85)" : "rgba(255,255,255,0.9)",
              "text-halo-width": 1.2,
            },
          });
        }
        const h = hoverHandlersRef.current;
        if (h.ddaPlotHover && h.masterPlanLeave) {
          map.on("mousemove", def.lineId, h.ddaPlotHover);
          map.on("mouseleave", def.lineId, h.masterPlanLeave);
        }
      }
      if (def.kind === "masterplan" && def.hoverLabel) {
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
    if (map.getLayer(def.lineId)) {
      map.setLayoutProperty(def.lineId, "visibility", v);
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

  async function loadZaahiPlots(map: MLMap) {
    if (!map.getStyle()) return;
    if (map.getSource(ZAAHI_PLOTS_SRC)) return;
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
          plan: {
            projectName?: string | null;
            community?: string | null;
            maxFloors?: number | null;
            maxHeightMeters?: number | null;
            maxHeightCode?: string | null;
            plotAreaSqm?: number | null;
            maxGfaSqm?: number | null;
            maxGfaSqft?: number | null;
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

      // Collect all ZAAHI plot numbers so DDA Land layers can skip duplicates
      const pnSet = new Set<string>();
      for (const it of payload.items) pnSet.add(it.plotNumber);
      zaahiPlotNumbersRef.current = pnSet;

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
            area: it.area,
            priceAed: aed,
            landUse: landUse ?? "",
            hasLandUse,
            color: hasLandUse
              ? (ZAAHI_LANDUSE_COLOR[landUse] ?? ZAAHI_DEFAULT_COLOR)
              : ZAAHI_DEFAULT_COLOR,
          },
        });
        // Skip 3D building generation for parcels without a land use —
        // founder spec: outline only when land use is missing.
        if (!hasLandUse) continue;
        // Skip 3D for future-development land — flat polygon only.
        if (landUse === "FUTURE_DEVELOPMENT" || landUse === "FUTURE DEVELOPMENT") continue;


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
            },
          });
        };

        // ── Data-driven style selection ──
        // AffectionPlan.buildingStyle === "FLAT" → single block of full
        // footprint at full height (correct for most commercial office
        // buildings where there is no visual podium/tower distinction).
        // Default/null/"SIGNATURE" → ZAAHI tiered model below.
        // Per-plot opt-in keeps the renderer free of hardcoded plot-number
        // overrides (per CLAUDE.md rule).
        if (it.plan?.buildingStyle === "FLAT") {
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
      // Guard against races: the early-return at the top of
      // loadZaahiPlots can be bypassed by a concurrent call during the
      // `await apiFetch` gap (React strict-mode double effect, or a
      // basemap swap mid-fetch). Re-check right before mutating the
      // style, and skip the whole block if another caller already
      // wired the plot source + layers.
      if (!map.getSource(ZAAHI_PLOTS_SRC)) {
        map.addSource(ZAAHI_PLOTS_SRC, {
          type: "geojson",
          data: { type: "FeatureCollection", features: plotFeatures },
        });
        if (!map.getLayer(ZAAHI_PLOTS_FILL)) {
          map.addLayer({
            id: ZAAHI_PLOTS_FILL,
            type: "fill",
            source: ZAAHI_PLOTS_SRC,
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
      if (!map.getSource(ZAAHI_BUILDINGS_SRC)) {
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
    } catch (e) {
      console.error("[zaahi-plots] load failed", e);
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
  // Oman — Muscat Municipality (Seeb contract): 94,640 plots, single PMTiles
  const OMAN_LAND_TILES_SRC = "oman-land-tiles";
  const OMAN_LAND_TILES_FILL = "oman-land-tiles-fill";
  const OMAN_LAND_TILES_LINE = "oman-land-tiles-line";
  const OMAN_LAND_TILES_3D = "oman-land-tiles-3d";

  function addLandTileSource(map: MLMap, srcId: string, fillId: string, lineId: string, extId: string, tilesUrl: string) {
    if (map.getSource(srcId)) return;
    map.addSource(srcId, { type: "vector", url: `pmtiles://${tilesUrl}` });
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
    // 3D extrusion — only tier features (podium/body/crown)
    map.addLayer({ id: extId, type: "fill-extrusion", source: srcId, "source-layer": "plots", minzoom: 14, layout: { visibility: "none" },
      filter: ["!=", ["get", "tier"], "flat"],
      paint: {
        "fill-extrusion-color": ["get", "color"],
        "fill-extrusion-height": ["get", "height"],
        "fill-extrusion-base": ["get", "base"],
        "fill-extrusion-opacity": 0.35,
    }});
    // Hover
    map.on("mousemove", fillId, (e: MapMouseEvent & { features?: GeoJSON.Feature[] }) => {
      const f = e.features?.[0];
      if (!f) return;
      map.getCanvas().style.cursor = "pointer";
      const pr = f.properties as Record<string, unknown>;
      setDdaLandHover({
        x: e.point.x, y: e.point.y,
        plotNumber: (pr.plotNumber as string) ?? "",
        mainLandUse: ((pr.mainLandUse as string) || (pr.primaryUse as string)) ?? "",
        areaSqm: (pr.areaSqm as number) ?? 0,
        gfaSqm: (pr.gfaSqm as number) ?? 0,
        status: (pr.status as string) ?? "",
      });
    });
    map.on("mouseleave", fillId, () => { map.getCanvas().style.cursor = ""; setDdaLandHover(null); });
  }

  function setLandTileVisibility(map: MLMap, fillId: string, lineId: string, extId: string, on: boolean) {
    const v = on ? "visible" : "none";
    if (map.getLayer(fillId)) map.setLayoutProperty(fillId, "visibility", v);
    if (map.getLayer(lineId)) map.setLayoutProperty(lineId, "visibility", v);
    if (map.getLayer(extId)) map.setLayoutProperty(extId, "visibility", v);
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
  }

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;
    // Register PMTiles protocol for vector tile sources
    const pmtilesProtocol = new Protocol();
    maplibregl.addProtocol("pmtiles", pmtilesProtocol.tile);
    const map = new maplibregl.Map({
      container: containerRef.current,
      style: STYLES.light,
      center: [55.27, 25.20],
      zoom: 12,
      pitch: 45,
      bearing: -17,
      maxPitch: 70,
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
      hoverHandlersRef.current = { ddaPlotHover, masterPlanLeave, masterPlanHover };

      await attachOverlays(map);

      // ── ZAAHI Plots — real listings from /api/parcels/map.
      // Always loaded; this is the platform's primary content. Builds
      // both the polygon source (fill / line / glow) and the building
      // source (3D extrusions colored by land use).
      await loadZaahiPlots(map);

      // ── PMTiles land layers (DDA 99K + AD 362K + Oman 95K plots) ──
      addLandTileSource(map, DDA_LAND_TILES_SRC, DDA_LAND_TILES_FILL, DDA_LAND_TILES_LINE, DDA_LAND_TILES_3D, "/tiles/dda-land.pmtiles");
      addLandTileSource(map, AD_ADM_TILES_SRC, AD_ADM_TILES_FILL, AD_ADM_TILES_LINE, AD_ADM_TILES_3D, "/tiles/ad-land-adm.pmtiles");
      addLandTileSource(map, AD_OTHER_TILES_SRC, AD_OTHER_TILES_FILL, AD_OTHER_TILES_LINE, AD_OTHER_TILES_3D, "/tiles/ad-land-other.pmtiles");
      addLandTileSource(map, OMAN_LAND_TILES_SRC, OMAN_LAND_TILES_FILL, OMAN_LAND_TILES_LINE, OMAN_LAND_TILES_3D, "/tiles/oman-land.pmtiles");

      // ── City ambient on zoom > 16 ──
      const updateCityAmbient = () => sound.setCityAmbient(map.getZoom() > 16);
      map.on("zoomend", updateCityAmbient);
      updateCityAmbient();

      // ── ZAAHI Plots hover + click ──
      if (map.getLayer(ZAAHI_PLOTS_FILL)) {
        map.on("mousemove", ZAAHI_PLOTS_FILL, (e: MapMouseEvent & { features?: GeoJSON.Feature[] }) => {
          const f = e.features?.[0];
          if (!f) return;
          map.getCanvas().style.cursor = "pointer";
          const p = f.properties as {
            plotNumber: string;
            district: string;
            area: number;
            priceAed: number | null;
            landUse: string;
          };
          setZaahiHover({
            x: e.point.x,
            y: e.point.y,
            plotNumber: p.plotNumber,
            district: p.district,
            area: p.area,
            priceAed: p.priceAed,
            landUse: p.landUse,
          });
        });
        map.on("mouseleave", ZAAHI_PLOTS_FILL, () => {
          map.getCanvas().style.cursor = "";
          setZaahiHover(null);
        });
        map.on("click", ZAAHI_PLOTS_FILL, (e: MapMouseEvent & { features?: GeoJSON.Feature[] }) => {
          const f = e.features?.[0];
          if (!f) return;
          const id = (f.properties as { id?: string })?.id;
          if (id) {
            // Founder spec 2026-04-12: a single combined cyberpunk
            // click effect (sweep + noise burst) — sound.click() now
            // emits both layers itself, so we no longer chain swooshOpen.
            sound.click();
            setSelectedParcelId(id);
          }
        });
      }

      // ── Communities hover ──
      map.on("mousemove", COMMUNITIES_FILL, (e: MapMouseEvent & { features?: GeoJSON.Feature[] }) => {
        const f = e.features?.[0];
        if (!f) return;
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

      // ── Saudi Governorates hover ──
      map.on("mousemove", SAUDI_GOV_FILL, (e: MapMouseEvent & { features?: GeoJSON.Feature[] }) => {
        const f = e.features?.[0];
        if (!f) return;
        map.getCanvas().style.cursor = "pointer";
        const name = `Governorate ${(f.properties?.OBJECTID as string) ?? "—"}`;
        popup
          .setLngLat(e.lngLat)
          .setHTML(
            `<div style="font-family:Georgia,serif;font-weight:700;font-size:10px;letter-spacing:0.04em">${name}</div>`,
          )
          .addTo(map);
      });
      map.on("mouseleave", SAUDI_GOV_FILL, () => {
        map.getCanvas().style.cursor = "";
        popup.remove();
      });

      // ── Riyadh Zones hover ──
      map.on("mousemove", RIYADH_ZONES_FILL, (e: MapMouseEvent & { features?: GeoJSON.Feature[] }) => {
        const f = e.features?.[0];
        if (!f) return;
        map.getCanvas().style.cursor = "pointer";
        const zone = (f.properties?.zone as string) ?? "—";
        popup
          .setLngLat(e.lngLat)
          .setHTML(
            `<div style="font-family:Georgia,serif;font-weight:700;font-size:10px;letter-spacing:0.04em">Zone ${zone}</div>`,
          )
          .addTo(map);
      });
      map.on("mouseleave", RIYADH_ZONES_FILL, () => {
        map.getCanvas().style.cursor = "";
        popup.remove();
      });

      // ── DDA Project Boundaries hover ──
      map.on("mousemove", DDA_PROJ_FILL, (e: MapMouseEvent & { features?: GeoJSON.Feature[] }) => {
        const f = e.features?.[0];
        if (!f) return;
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

    return () => {
      droneCtrl.destroy();
      droneCtrlRef.current = null;
      popup.remove();
      map.remove();
      mapRef.current = null;
    };
  }, []);

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
      await attachOverlays(map);
      // ZAAHI plots also need to be re-attached after a basemap swap
      // (maplibre's source registry was wiped). The loader is idempotent
      // on map.getSource so it's safe to call.
      await loadZaahiPlots(map);
      // Re-attach PMTiles land layers (sources wiped by setStyle)
      addLandTileSource(map, DDA_LAND_TILES_SRC, DDA_LAND_TILES_FILL, DDA_LAND_TILES_LINE, DDA_LAND_TILES_3D, "/tiles/dda-land.pmtiles");
      addLandTileSource(map, AD_ADM_TILES_SRC, AD_ADM_TILES_FILL, AD_ADM_TILES_LINE, AD_ADM_TILES_3D, "/tiles/ad-land-adm.pmtiles");
      addLandTileSource(map, AD_OTHER_TILES_SRC, AD_OTHER_TILES_FILL, AD_OTHER_TILES_LINE, AD_OTHER_TILES_3D, "/tiles/ad-land-other.pmtiles");
      addLandTileSource(map, OMAN_LAND_TILES_SRC, OMAN_LAND_TILES_FILL, OMAN_LAND_TILES_LINE, OMAN_LAND_TILES_3D, "/tiles/oman-land.pmtiles");
      setLandTileVisibility(map, DDA_LAND_TILES_FILL, DDA_LAND_TILES_LINE, DDA_LAND_TILES_3D, layers.ddaLandPlots);
      setLandTileVisibility(map, AD_ADM_TILES_FILL, AD_ADM_TILES_LINE, AD_ADM_TILES_3D, layers.adLandPlots);
      setLandTileVisibility(map, AD_OTHER_TILES_FILL, AD_OTHER_TILES_LINE, AD_OTHER_TILES_3D, layers.adLandPlots);
      setLandTileVisibility(map, OMAN_LAND_TILES_FILL, OMAN_LAND_TILES_LINE, OMAN_LAND_TILES_3D, layers.omanLandPlots);
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
    setLandTileVisibility(map, OMAN_LAND_TILES_FILL, OMAN_LAND_TILES_LINE, OMAN_LAND_TILES_3D, layers.omanLandPlots);
  }, [layers.ddaLandPlots, layers.adLandPlots, layers.omanLandPlots]);

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
      dubai: false, abudhabi: false, otheruae: false, saudi: false, oman: false,
      [detected]: true,
    });
    countryInitialisedRef.current = true;
  }, [layersOpen]);

  useEffect(() => {
    if (!legendOpen) return;
    const onDown = (e: MouseEvent) => {
      const t = e.target as Node;
      if (legendRef.current?.contains(t)) return;
      if (legendBtnRef.current?.contains(t)) return;
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
        onOpenAddModal={() => setShowAddModal(true)}
      />
      {showAddModal && (
        <AddPlotModal
          onClose={() => setShowAddModal(false)}
          onSubmitted={(id) => {
            // Submitted parcels start in PENDING_REVIEW and don't show on the
            // public map until verified — so we can't fly to them yet, just close.
            console.log("[zaahi] submitted parcel", id);
          }}
        />
      )}

      {/* Layer switcher — compact icon button */}
      <button
        ref={panelBtnRef}
        onClick={() => setLayersOpen((o) => !o)}
        aria-label="Toggle layers"
        title="Layers"
        style={{
          position: "absolute",
          top: 56,
          left: 12,
          width: 30,
          height: 30,
          borderRadius: 6,
          border: `1px solid rgba(200, 169, 110, 0.3)`,
          background: "rgba(10, 22, 40, 0.4)",
          color: GOLD,
          cursor: "pointer",
          zIndex: 11,
          boxShadow: "none",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          padding: 0,
          transition: "border-color 150ms ease, background 150ms ease",
        }}
        onMouseEnter={(e) => { e.currentTarget.style.borderColor = GOLD; e.currentTarget.style.background = "rgba(200, 169, 110, 0.25)"; }}
        onMouseLeave={(e) => { e.currentTarget.style.borderColor = "rgba(200, 169, 110, 0.3)"; e.currentTarget.style.background = "rgba(10, 22, 40, 0.4)"; }}
      >
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <polygon points="12 2 2 7 12 12 22 7 12 2" />
          <polyline points="2 17 12 22 22 17" />
          <polyline points="2 12 12 17 22 12" />
        </svg>
      </button>

      {/* Legend button — top-right, icon only */}
      <button
        ref={legendBtnRef}
        onClick={() => setLegendOpen((o) => !o)}
        aria-label="Toggle legend"
        title="Legend"
        style={{
          position: "absolute",
          top: 86,
          right: 12,
          width: 30,
          height: 30,
          borderRadius: 6,
          border: `1px solid rgba(200, 169, 110, 0.3)`,
          background: "rgba(10, 22, 40, 0.4)",
          color: GOLD,
          cursor: "pointer",
          zIndex: 11,
          boxShadow: "none",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          transition: "border-color 150ms ease, background 150ms ease",
        }}
        onMouseEnter={(e) => { e.currentTarget.style.borderColor = GOLD; e.currentTarget.style.background = "rgba(200, 169, 110, 0.25)"; }}
        onMouseLeave={(e) => { e.currentTarget.style.borderColor = "rgba(200, 169, 110, 0.3)"; e.currentTarget.style.background = "rgba(10, 22, 40, 0.4)"; }}
      >
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="12" r="10" />
          <line x1="12" y1="16" x2="12" y2="12" />
          <line x1="12" y1="8" x2="12.01" y2="8" />
        </svg>
      </button>

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
            background: "rgba(10, 22, 40, 0.85)",
            backdropFilter: "blur(16px)",
            WebkitBackdropFilter: "blur(16px)",
            border: "1px solid rgba(255, 255, 255, 0.1)",
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
              borderBottom: "1px solid rgba(255, 255, 255, 0.1)",
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
                  <div style={{ fontSize: 10, color: "rgba(255, 255, 255, 0.55)", marginTop: 1 }}>{item.desc}</div>
                </div>
              </div>
            ))}
          </div>

          <div
            style={{
              borderTop: "1px solid rgba(255, 255, 255, 0.1)",
              padding: "10px 14px",
              fontSize: 10,
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

      {/* Basemap selector — left vertical center */}
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
        {(["light", "dark", "satellite"] as BaseMap[]).map((b) => (
          <button
            key={b}
            onClick={() => setBaseMap(b)}
            title={b === "light" ? "Light" : b === "dark" ? "Dark" : "Satellite"}
            aria-label={b}
            style={{
              width: 30,
              height: 30,
              borderRadius: 6,
              border: `1px solid ${baseMap === b ? GOLD : "rgba(200, 169, 110, 0.3)"}`,
              background: baseMap === b ? GOLD : "rgba(10, 22, 40, 0.4)",
              color: baseMap === b ? "#0A1628" : c.text,
              cursor: "pointer",
              fontSize: 12,
              boxShadow: "none",
              transition: "border-color 150ms ease, background 150ms ease",
            }}
            onMouseEnter={(e) => {
              if (baseMap !== b) { e.currentTarget.style.borderColor = GOLD; e.currentTarget.style.background = "rgba(200, 169, 110, 0.25)"; }
            }}
            onMouseLeave={(e) => {
              if (baseMap !== b) { e.currentTarget.style.borderColor = "rgba(200, 169, 110, 0.3)"; e.currentTarget.style.background = "rgba(10, 22, 40, 0.4)"; }
            }}
          >
            {b === "light" ? "☀" : b === "dark" ? "☾" : "🛰"}
          </button>
        ))}
      </div>

      {/* Cursor coordinates — left bottom corner, mini */}
      <div
        style={{
          position: "absolute",
          left: 16,
          bottom: 8,
          fontSize: 9,
          color: c.textDim,
          fontFamily: '"SF Mono", "Menlo", monospace',
          letterSpacing: "0.04em",
          zIndex: 11,
          pointerEvents: "none",
        }}
      >
        {cursor.lat.toFixed(5)}, {cursor.lng.toFixed(5)} · z{zoom.toFixed(2)}
      </div>

      {/* Right vertical center: zoom+, zoom-, compass, 3D/2D */}
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
        <ChromeBtn c={c} title="Zoom in" onClick={() => mapRef.current?.zoomIn()}>+</ChromeBtn>
        <ChromeBtn c={c} title="Zoom out" onClick={() => mapRef.current?.zoomOut()}>−</ChromeBtn>
        <ChromeBtn
          c={c}
          title="Reset bearing"
          onClick={() => mapRef.current?.easeTo({ bearing: 0, pitch: 45, duration: 500 })}
        >
          <span style={{ display: "inline-block", transform: `rotate(${-bearing}deg)`, transition: "transform 250ms ease", fontSize: 14 }}>
            ⊕
          </span>
        </ChromeBtn>
        <ChromeBtn
          c={c}
          title={is3D ? "Switch to 2D" : "Switch to 3D"}
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
        <button
          title={droneEnabled ? "Disable drone mode" : "Enable drone mode (WASD + right-click rotate)"}
          aria-label={droneEnabled ? "Disable drone mode" : "Enable drone mode"}
          aria-pressed={droneEnabled}
          onClick={() => {
            sound.whoosh();
            setDroneEnabled((v) => !v);
          }}
          style={{
            width: 30,
            height: 30,
            borderRadius: 6,
            border: `1px solid ${droneEnabled ? GOLD : "rgba(200, 169, 110, 0.3)"}`,
            background: droneEnabled ? "rgba(200, 169, 110, 0.25)" : "rgba(10, 22, 40, 0.4)",
            color: droneEnabled ? GOLD : "rgba(255, 255, 255, 0.55)",
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: 0,
            boxShadow: "none",
            transition: "border-color 150ms ease, background 150ms ease, color 150ms ease",
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.borderColor = GOLD;
            e.currentTarget.style.background = "rgba(200, 169, 110, 0.25)";
            if (!droneEnabled) e.currentTarget.style.color = GOLD;
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.borderColor = droneEnabled ? GOLD : "rgba(200, 169, 110, 0.3)";
            e.currentTarget.style.background = droneEnabled ? "rgba(200, 169, 110, 0.25)" : "rgba(10, 22, 40, 0.4)";
            e.currentTarget.style.color = droneEnabled ? GOLD : "rgba(255, 255, 255, 0.55)";
          }}
        >
          {/* Minimal quadcopter silhouette — four arms, center body, props. */}
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
        </button>
      </div>

      {layersOpen && (
      <div
        ref={panelRef}
        style={{
          position: "absolute",
          top: 64,
          left: 60,
          width: 260,
          maxHeight: "calc(100vh - 80px)",
          overflowY: "auto",
          background: "rgba(10, 22, 40, 0.75)",
          backdropFilter: "blur(24px)",
          WebkitBackdropFilter: "blur(24px)",
          border: "1px solid rgba(255, 255, 255, 0.1)",
          borderRadius: 12,
          zIndex: 11,
          boxShadow: "0 8px 32px rgba(0, 0, 0, 0.35)",
          color: "rgba(255, 255, 255, 0.9)",
        }}
      >
        <div
          style={{
            position: "sticky",
            top: 0,
            zIndex: 2,
            padding: "10px 14px",
            background: "rgba(10, 22, 40, 0.85)",
            backdropFilter: "blur(16px)",
            WebkitBackdropFilter: "blur(16px)",
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
              border: "1px solid rgba(255, 255, 255, 0.1)",
              borderRadius: 8,
              background: "rgba(255, 255, 255, 0.04)",
              transition: "border-color 150ms ease, background 150ms ease",
            }}
            onFocus={(e) => { e.currentTarget.style.borderColor = GOLD; }}
            onBlur={(e) => { e.currentTarget.style.borderColor = "rgba(255, 255, 255, 0.1)"; }}
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
              fontSize: 9,
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

        {/* Country → category → layer hierarchy (Phase 1 RBAC scaffold).
            Labels + lock tiers come from LAYER_META; counts/on summed
            per country. Inside each country, categories render as
            compact LayerGroup sub-sections (no per-category collapse —
            the country collapse is the primary control). */}
        {(() => {
          type PanelItem = { key: string; label: string; requiredTier?: LayerLockTier };
          const q = layerSearch.trim().toLowerCase();
          const searchActive = q.length > 0;
          // One label lookup fed from DDA_LAYERS + explicit overrides.
          const labels: Record<string, string> = {};
          for (const d of DDA_LAYERS) labels[d.key] = d.label;
          Object.assign(labels, {
            communities: "Communities",
            roads: "Major Roads",
            metro: "Metro Lines",
            plotLabels: "Plot Numbers (zoom in)",
            ddaProjects: "DDA Project Boundaries",
            ddaFreeZones: "DDA Free Zones",
            ddaLandPlots: "DDA Land Plots (99K)",
            islands: "Dubai Islands",
            meydan: "Meydan Horizon",
            alFurjan: "Al Furjan",
            intlCity23: "International City 2 & 3",
            residential12: "Residential District I & II",
            d11: "D11 — Parcel L/D",
            nadAlHammer: "Nad Al Hammer",
            adMunicipalities: "AD Municipalities",
            adDistricts: "AD Districts",
            adCommunities: "AD Communities",
            adLandPlots: "AD Land Plots (362K)",
            uaeDistricts: "UAE Districts",
            saudiGovernorates: "Saudi Arabia Governorates",
            riyadhZones: "Riyadh Zones",
            omanLandPlots: "Oman Land Plots (95K)",
          });
          const grouped: Record<LayerCountry, Partial<Record<LayerCategory, PanelItem[]>>> = {
            dubai: {}, abudhabi: {}, otheruae: {}, saudi: {}, oman: {},
          };
          for (const [key, meta] of Object.entries(LAYER_META)) {
            (grouped[meta.country][meta.category] ??= []).push({
              key, label: labels[key] ?? key, requiredTier: meta.tier,
            });
          }
          return LAYER_COUNTRY_ORDER.map((country) => {
            const cats = grouped[country];
            const allInCountry: PanelItem[] = Object.values(cats).flat().filter((x): x is PanelItem => !!x);
            const matches = searchActive
              ? allInCountry.filter((i) => i.label.toLowerCase().includes(q))
              : allInCountry;
            if (searchActive && matches.length === 0) return null;
            const onCount = allInCountry.filter((i) => layers[i.key as keyof LayersState] as boolean).length;
            const total = allInCountry.length;
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
                  return (
                    <LayerGroup
                      key={`${country}-${cat}`}
                      c={c}
                      title={CATEGORY_LABELS[cat]}
                      open={true}
                      onToggle={() => { /* categories are always open inside an open country */ }}
                      hideCollapseCaret
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
      </div>
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
        .zaahi-popup .maplibregl-popup-content {
          background: ${isDark ? "rgba(10,22,40,0.95)" : "rgba(255,255,255,0.97)"} !important;
          color: ${c.text} !important;
          border: 1px solid ${GOLD};
          border-radius: 6px;
          padding: 5px 8px;
          font-size: 9px;
        }
        .zaahi-popup .maplibregl-popup-tip {
          border-top-color: ${GOLD} !important;
        }
      `}</style>
      {zaahiHover && (
        <div
          style={{
            position: "absolute",
            left: zaahiHover.x + 14,
            top: zaahiHover.y + 14, // map container now starts at top:0
            width: 200,
            background: "rgba(10, 22, 40, 0.75)",
            backdropFilter: "blur(16px)",
            WebkitBackdropFilter: "blur(16px)",
            color: "#FFFFFF",
            border: "1px solid rgba(255,255,255,0.1)",
            borderLeft: `3px solid ${GOLD}`,
            borderRadius: 6,
            boxShadow: "0 6px 20px rgba(0,0,0,0.3)",
            padding: "8px 10px",
            fontSize: 11,
            fontFamily: "Georgia, serif",
            lineHeight: 1.45,
            pointerEvents: "none",
            zIndex: 30,
          }}
        >
          <div style={{ fontWeight: 700, color: GOLD, fontSize: 12 }}>
            {zaahiHover.plotNumber}
          </div>
          <div style={{ opacity: 0.85, marginTop: 2 }}>
            {zaahiHover.district} | {Math.round(zaahiHover.area).toLocaleString("en-US")} sqft |{" "}
            {zaahiHover.priceAed == null
              ? "—"
              : zaahiHover.priceAed >= 1_000_000
                ? `${(zaahiHover.priceAed / 1_000_000).toFixed(1)}M AED`
                : `${(zaahiHover.priceAed / 1_000).toFixed(0)}K AED`}{" "}
            | {zaahiHover.landUse.charAt(0) + zaahiHover.landUse.slice(1).toLowerCase()}
          </div>
        </div>
      )}
      {ddaLandHover && (
        <div
          style={{
            position: "absolute",
            left: ddaLandHover.x + 14,
            top: ddaLandHover.y + 14,
            width: 210,
            background: "rgba(10, 22, 40, 0.75)",
            backdropFilter: "blur(16px)",
            WebkitBackdropFilter: "blur(16px)",
            color: "#FFFFFF",
            border: "1px solid rgba(255,255,255,0.1)",
            borderLeft: "3px solid #4A90D9",
            borderRadius: 6,
            boxShadow: "0 6px 20px rgba(0,0,0,0.3)",
            padding: "8px 10px",
            fontSize: 11,
            fontFamily: "Georgia, serif",
            lineHeight: 1.45,
            pointerEvents: "none",
            zIndex: 30,
          }}
        >
          <div style={{ fontWeight: 700, color: "#4A90D9", fontSize: 12 }}>
            {ddaLandHover.plotNumber}
            <span style={{ fontSize: 8, fontWeight: 400, color: "rgba(255,255,255,0.5)", marginLeft: 6 }}>DDA</span>
          </div>
          <div style={{ opacity: 0.85, marginTop: 2 }}>
            {ddaLandHover.mainLandUse || "—"}
          </div>
          <div style={{ opacity: 0.7, marginTop: 1, fontSize: 10 }}>
            {Math.round(ddaLandHover.areaSqm).toLocaleString()} sqm
            {ddaLandHover.gfaSqm > 0 && ` · GFA ${Math.round(ddaLandHover.gfaSqm).toLocaleString()} sqm`}
          </div>
          <div style={{ opacity: 0.6, marginTop: 1, fontSize: 9, fontStyle: "italic" }}>
            {ddaLandHover.status || "—"}
          </div>
        </div>
      )}
      {/* The music / sound toggle moved into the HeaderBar (next to
          Profile) per founder spec 2026-04-12. The old floating
          button at top:56 right:16 is gone. */}

      {/* ── MiniMap dock — bottom center ──
          Civ6-style regional overview. Collapsed by default: only the
          tiny map-icon toggle is visible at the bottom-center. When
          the user opens it, the full dock (layer rail · minimap ·
          action rail) slides up with a 300 ms ease-in-out fade. The
          MiniMap instance stays mounted while hidden so it keeps
          syncing with the main map — re-opening is instant. */}
      <div
        style={{
          position: "absolute",
          left: 12,
          bottom: 12,
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
        <div
          aria-hidden={!miniOpen}
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
            background: "rgba(10, 22, 40, 0.85)",
            backdropFilter: "blur(16px)",
            WebkitBackdropFilter: "blur(16px)",
            border: "1px solid rgba(255,255,255,0.1)",
            borderRadius: 12,
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

          <div style={{ gridArea: "mid" }}>
            <MiniMap mainMapRef={mapRef} />
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
            <MiniRailBtn
              title="Legend"
              active={legendOpen}
              onClick={() => setLegendOpen((o) => !o)}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <line x1="8" y1="6" x2="21" y2="6" />
                <line x1="8" y1="12" x2="21" y2="12" />
                <line x1="8" y1="18" x2="21" y2="18" />
                <circle cx="4" cy="6" r="1.2" fill="currentColor" />
                <circle cx="4" cy="12" r="1.2" fill="currentColor" />
                <circle cx="4" cy="18" r="1.2" fill="currentColor" />
              </svg>
            </MiniRailBtn>
            <Link
              href="/join"
              title="Become Ambassador"
              aria-label="Become Ambassador"
              style={{ display: "block", textDecoration: "none" }}
              tabIndex={miniOpen ? 0 : -1}
            >
              <MiniRailBtn title="Become Ambassador" active={false} onClick={() => {}} asSpan>
                {/* Sparkle / star — paid-tier ambassador entry point */}
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M12 2l2.39 6.95L22 10l-5.5 4.55L18 22l-6-3.6L6 22l1.5-7.45L2 10l7.61-1.05L12 2z" />
                </svg>
              </MiniRailBtn>
            </Link>
            <Link
              href="/ambassador"
              title="Ambassador Program"
              aria-label="Ambassador Program"
              style={{ display: "block", textDecoration: "none" }}
              tabIndex={miniOpen ? 0 : -1}
            >
              <MiniRailBtn title="Ambassador" active={false} onClick={() => {}} asSpan>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <polygon points="12 2 15 8.5 22 9.3 17 14.1 18.2 21 12 17.8 5.8 21 7 14.1 2 9.3 9 8.5 12 2" />
                </svg>
              </MiniRailBtn>
            </Link>
            <Link
              href="/dashboard"
              title="Profile / Dashboard"
              aria-label="Profile"
              style={{ display: "block", textDecoration: "none" }}
              tabIndex={miniOpen ? 0 : -1}
            >
              <MiniRailBtn title="Profile" active={false} onClick={() => {}} asSpan>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="8" r="4" />
                  <path d="M4 21c0-4 4-7 8-7s8 3 8 7" />
                </svg>
              </MiniRailBtn>
            </Link>
          </div>
        </div>

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
            background: miniOpen ? "rgba(200,169,110,0.25)" : "rgba(10, 22, 40, 0.85)",
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
              : "rgba(10, 22, 40, 0.85)";
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

      <ArchibaldChat hidden={!!selectedParcelId} />
      <SidePanel
        parcelId={selectedParcelId}
        mapRef={mapRef}
        onClose={() => {
          sound.swooshClose();
          setSelectedParcelId(null);
        }}
      />
    </div>
  );
}

function LayerToggle({
  label,
  checked,
  onChange,
  color,
  requiredTier,
}: {
  label: string;
  checked: boolean;
  onChange: (v: boolean) => void;
  color: string;
  requiredTier?: "GOLD" | "PLATINUM";
}) {
  return (
    <label
      style={{
        display: "flex",
        alignItems: "center",
        gap: 8,
        padding: "5px 14px 5px 24px",
        fontSize: 11,
        cursor: "pointer",
        color: checked ? GOLD : color,
        lineHeight: 1.3,
        borderBottom: "1px solid rgba(255, 255, 255, 0.04)",
        transition: "background 150ms ease, color 150ms ease",
      }}
      onMouseEnter={(e) => { e.currentTarget.style.background = "rgba(255, 255, 255, 0.05)"; }}
      onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; }}
    >
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => {
          sound.toggleSfx();
          onChange(e.target.checked);
        }}
        style={{ accentColor: GOLD, width: 13, height: 13, margin: 0, cursor: "pointer" }}
      />
      <span style={{ flex: 1, minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{label}</span>
      {requiredTier && <LockBadge tier={requiredTier} />}
    </label>
  );
}

// Visual-only lock badge for Phase 1 — hover shows upgrade copy, click
// deep-links to /join#gold or /join#platinum. Toggle still works; Phase
// 3 will disable the checkbox once `useAccess()` lands.
function LockBadge({ tier }: { tier: "GOLD" | "PLATINUM" }) {
  const href = tier === "PLATINUM" ? "/join#platinum" : "/join#gold";
  const accent = tier === "PLATINUM" ? "#B4E5FF" : GOLD;
  const bgTint = tier === "PLATINUM" ? "rgba(180, 229, 255, 0.1)" : "rgba(200, 169, 110, 0.12)";
  const bgHover = tier === "PLATINUM" ? "rgba(180, 229, 255, 0.2)" : "rgba(200, 169, 110, 0.25)";
  return (
    <a
      href={href}
      title={`Upgrade to ${tier} to unlock`}
      onClick={(e) => e.stopPropagation()}
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 3,
        padding: "2px 6px",
        border: `1px solid ${accent}`,
        borderRadius: 3,
        fontSize: 9,
        letterSpacing: "0.08em",
        color: accent,
        background: bgTint,
        textDecoration: "none",
        fontFamily: 'Georgia, "Times New Roman", serif',
        fontWeight: 700,
        flexShrink: 0,
        transition: "background 150ms ease",
      }}
      onMouseEnter={(e) => { e.currentTarget.style.background = bgHover; }}
      onMouseLeave={(e) => { e.currentTarget.style.background = bgTint; }}
    >
      <svg width="8" height="8" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
        <rect x="4" y="11" width="16" height="10" rx="2" />
        <path d="M8 11V7a4 4 0 0 1 8 0v4" />
      </svg>
      {tier}
    </a>
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
  items: Array<{ key: string; label: string; requiredTier?: "GOLD" | "PLATINUM" }>;
  isOn: (key: string) => boolean;
  onChange: (key: string, v: boolean) => void;
  hideCollapseCaret?: boolean;
}) {
  const q = search.trim().toLowerCase();
  const sorted = [...items].sort((a, b) => a.label.localeCompare(b.label));
  const filtered = q ? sorted.filter((i) => i.label.toLowerCase().includes(q)) : sorted;
  const onCount = items.filter((i) => isOn(i.key)).length;
  const total = items.length;
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
          borderBottom: "1px solid rgba(255, 255, 255, 0.04)",
          fontFamily: 'Georgia, "Times New Roman", serif',
          fontSize: 10,
          letterSpacing: "0.14em",
          textTransform: "uppercase",
          color: "rgba(255, 255, 255, 0.55)",
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
            color: "rgba(255, 255, 255, 0.55)",
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
              if (isOn(i.key) !== target) onChange(i.key, target);
            }
          }}
        />
      </div>
      {effectivelyOpen && filtered.map((i) => (
        <LayerToggle
          key={i.key}
          label={i.label}
          checked={isOn(i.key)}
          onChange={(v) => onChange(i.key, v)}
          color="rgba(255, 255, 255, 0.9)"
          requiredTier={i.requiredTier}
        />
      ))}
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
          color: anyOn || open ? GOLD : "rgba(255, 255, 255, 0.75)",
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
          e.currentTarget.style.color = anyOn || open ? GOLD : "rgba(255, 255, 255, 0.75)";
        }}
      >
        <span style={{ display: "inline-flex", alignItems: "center", gap: 8 }}>
          <span style={{ fontSize: 9, color: "rgba(255, 255, 255, 0.55)", width: 8, transition: "transform 200ms ease", transform: open ? "rotate(0deg)" : "rotate(-90deg)", display: "inline-block" }}>▾</span>
          <span>{title}</span>
        </span>
        <span
          style={{
            color: anyOn ? GOLD : "rgba(255, 255, 255, 0.45)",
            fontFamily: '"SF Mono", Menlo, monospace',
            letterSpacing: 0,
            fontSize: 10,
            textTransform: "none",
            padding: "1px 6px",
            borderRadius: 3,
            border: `1px solid ${anyOn ? "rgba(200, 169, 110, 0.3)" : "rgba(255, 255, 255, 0.1)"}`,
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
        fontSize: 10,
        letterSpacing: "0.12em",
        textTransform: "uppercase",
        color: c.textDim,
      }}
    >
      <span>{title}</span>
      <span style={{ fontSize: 9 }}>{open ? "▾" : "▸"}</span>
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

// Square chrome button used in the right vertical control column.
function ChromeBtn({
  c, title, onClick, children,
}: {
  c: ChromeTheme;
  title: string;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      title={title}
      aria-label={title}
      onClick={onClick}
      style={{
        width: 30,
        height: 30,
        borderRadius: 6,
        border: `1px solid rgba(200, 169, 110, 0.3)`,
        background: "rgba(10, 22, 40, 0.4)",
        color: GOLD,
        cursor: "pointer",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        fontSize: 15,
        fontWeight: 700,
        boxShadow: "none",
        padding: 0,
        transition: "border-color 150ms ease, background 150ms ease",
      }}
      onMouseEnter={(e) => { e.currentTarget.style.borderColor = GOLD; e.currentTarget.style.background = "rgba(200, 169, 110, 0.25)"; }}
      onMouseLeave={(e) => { e.currentTarget.style.borderColor = "rgba(200, 169, 110, 0.3)"; e.currentTarget.style.background = "rgba(10, 22, 40, 0.4)"; }}
    >
      {children}
    </button>
  );
}
function HeaderBar({
  c,
  isDark,
  onFly,
  onSelectParcel,
  onOpenAddModal,
}: {
  c: ChromeTheme;
  isDark: boolean;
  onFly: (lng: number, lat: number) => void;
  onSelectParcel: (id: string) => void;
  onOpenAddModal: () => void;
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
        boxShadow: "none",
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
        <button
          onClick={onOpenAddModal}
          title="Add Plot"
          style={hdrBtnStyle(c)}
          onMouseEnter={(e) => { e.currentTarget.style.borderColor = GOLD; e.currentTarget.style.background = "rgba(200, 169, 110, 0.25)"; }}
          onMouseLeave={(e) => { e.currentTarget.style.borderColor = "rgba(200, 169, 110, 0.3)"; e.currentTarget.style.background = "rgba(10, 22, 40, 0.4)"; }}
        >
          <span style={{ fontSize: 15, color: GOLD, fontWeight: 700 }}>+</span>
        </button>
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
        <HdrField
          c={c}
          icon="✓"
          label=""
          placeholder="Plot #"
          value={check}
          onChange={setCheck}
          onKey={doCheck}
          busy={false}
          tooltip="Check Plot"
        />
        <button
          type="button"
          onClick={() => sound.toggle()}
          title={soundOn ? "Mute" : "Unmute"}
          aria-label={soundOn ? "Mute" : "Unmute"}
          style={hdrBtnStyle(c)}
          onMouseEnter={(e) => { e.currentTarget.style.borderColor = GOLD; e.currentTarget.style.background = "rgba(200, 169, 110, 0.25)"; }}
          onMouseLeave={(e) => { e.currentTarget.style.borderColor = "rgba(200, 169, 110, 0.3)"; e.currentTarget.style.background = "rgba(10, 22, 40, 0.4)"; }}
        >
          <span style={{ fontSize: 13 }}>{soundOn ? "🎵" : "🔇"}</span>
        </button>
        <a
          href="/dashboard"
          title="Profile"
          style={{ ...hdrBtnStyle(c), textDecoration: "none" }}
          onMouseEnter={(e) => { e.currentTarget.style.borderColor = GOLD; e.currentTarget.style.background = "rgba(200, 169, 110, 0.25)"; }}
          onMouseLeave={(e) => { e.currentTarget.style.borderColor = "rgba(200, 169, 110, 0.3)"; e.currentTarget.style.background = "rgba(10, 22, 40, 0.4)"; }}
        >
          <span style={{ fontSize: 13 }}>👤</span>
        </a>
      </div>
    </header>
  );
}

function hdrBtnStyle(c: ChromeTheme): React.CSSProperties {
  return {
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    gap: 4,
    width: 28,
    height: 28,
    padding: 0,
    borderRadius: 6,
    border: `1px solid rgba(200, 169, 110, 0.3)`,
    background: "rgba(10, 22, 40, 0.4)",
    color: c.text,
    fontSize: 11,
    fontWeight: 600,
    boxShadow: "none",
    cursor: "pointer",
    transition: "border-color 150ms ease, background 150ms ease",
  };
}

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
      <button
        title="Find Plot"
        aria-label="Find plot"
        onClick={() => setOpen(true)}
        style={hdrBtnStyle(c)}
        onMouseEnter={(e) => { e.currentTarget.style.borderColor = GOLD; e.currentTarget.style.background = "rgba(200, 169, 110, 0.25)"; }}
        onMouseLeave={(e) => { e.currentTarget.style.borderColor = "rgba(200, 169, 110, 0.3)"; e.currentTarget.style.background = "rgba(10, 22, 40, 0.4)"; }}
      >
        <span style={{ fontSize: 12 }}>🔍</span>
      </button>
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
          background: "rgba(10, 22, 40, 0.4)",
          color: c.text,
          boxShadow: "none",
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
            fontSize: 10,
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
            fontSize: 10,
            fontWeight: 600,
            textAlign: "center",
            boxShadow: "none",
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
      <button
        title={tooltip}
        onClick={() => setExpanded(true)}
        style={hdrBtnStyle(c)}
        onMouseEnter={(e) => { e.currentTarget.style.borderColor = GOLD; e.currentTarget.style.background = "rgba(200, 169, 110, 0.25)"; }}
        onMouseLeave={(e) => { e.currentTarget.style.borderColor = "rgba(200, 169, 110, 0.3)"; e.currentTarget.style.background = "rgba(10, 22, 40, 0.4)"; }}
      >
        <span style={{ fontSize: 13, color: GOLD, fontWeight: 700, lineHeight: 1 }}>{icon}</span>
      </button>
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
        background: "rgba(10, 22, 40, 0.4)",
        color: c.text,
        boxShadow: "none",
        gap: 4,
        transition: "border-color 150ms ease, background 150ms ease",
      }}
      onMouseEnter={(e) => { e.currentTarget.style.borderColor = GOLD; e.currentTarget.style.background = "rgba(200, 169, 110, 0.25)"; }}
      onMouseLeave={(e) => { e.currentTarget.style.borderColor = "rgba(200, 169, 110, 0.3)"; e.currentTarget.style.background = "rgba(10, 22, 40, 0.4)"; }}
    >
      <span style={{ fontSize: 12, color: GOLD, fontWeight: 700, lineHeight: 1 }}>{icon}</span>
      {label && <span style={{ fontSize: 10, fontWeight: 600, color: c.text }}>{label}</span>}
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
          fontSize: 10,
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
  {
    key: "omanLandPlots",
    label: "Oman Land Plots (Muscat)",
    icon: (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="9" />
        <path d="M3 12h18M12 3v18" />
      </svg>
    ),
  },
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
    key: "saudiGovernorates",
    label: "Saudi Governorates",
    icon: (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M3 12a9 9 0 1 0 18 0 9 9 0 1 0-18 0z" />
        <path d="M3 12h18M12 3c3 3 3 15 0 18M12 3c-3 3-3 15 0 18" />
      </svg>
    ),
  },
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
    background: active ? "rgba(200,169,110,0.25)" : "rgba(10, 22, 40, 0.4)",
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
      : "rgba(10, 22, 40, 0.4)";
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
