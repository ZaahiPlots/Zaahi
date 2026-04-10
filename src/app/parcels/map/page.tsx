"use client";
import { useEffect, useRef, useState } from "react";
import maplibregl, { Map as MLMap, StyleSpecification, MapMouseEvent } from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import SidePanel from "./SidePanel";
import ArchibaldChat from "./ArchibaldChat";
import AddPlotModal from "./AddPlotModal";
import { sound } from "@/lib/sound";

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
const ZAAHI_LANDUSE_COLOR: Record<string, string> = {
  RESIDENTIAL: "#FFD700",
  MIXED_USE: "#9333EA",
  COMMERCIAL: "#3B82F6",
  HOTEL: "#F97316",
  HOSPITALITY: "#F97316",
  RETAIL: "#EC4899",
  INDUSTRIAL: "#6B7280",
  FUTURE_DEVELOPMENT: "#84CC16",
  "FUTURE DEVELOPMENT": "#84CC16",
};
const ZAAHI_DEFAULT_COLOR = "#FFD700";

// Apply / clear selection highlight on the ZAAHI plot + building layers.
function applySelectionPaint(map: MLMap, selectedId: string | null) {
  if (!map.getLayer(ZAAHI_PLOTS_FILL)) return;
  const sel = selectedId ?? "__none__";
  // Plot fill: bright on selected, dim on others when selection is active
  if (selectedId) {
    map.setPaintProperty(ZAAHI_PLOTS_FILL, "fill-opacity", [
      "case",
      ["==", ["get", "id"], sel],
      0.7,
      0.2,
    ]);
  } else {
    map.setPaintProperty(ZAAHI_PLOTS_FILL, "fill-opacity", 0.4);
  }
  // Glow filters
  if (map.getLayer(ZAAHI_PLOTS_GLOW)) {
    map.setFilter(ZAAHI_PLOTS_GLOW, ["==", ["id"], sel]);
  }
  if (map.getLayer(ZAAHI_PLOTS_GLOW_CRISP)) {
    map.setFilter(ZAAHI_PLOTS_GLOW_CRISP, ["==", ["id"], sel]);
  }
  // 3D buildings — boost selected parcel's segments
  const podiumId = `${ZAAHI_BUILDINGS_3D}-podium`;
  const crownId = `${ZAAHI_BUILDINGS_3D}-crown`;
  if (map.getLayer(podiumId)) {
    map.setPaintProperty(
      podiumId,
      "fill-extrusion-opacity",
      selectedId ? ["case", ["==", ["get", "parcelId"], sel], 0.55, 0.4] : 0.4,
    );
  }
  if (map.getLayer(ZAAHI_BUILDINGS_3D)) {
    map.setPaintProperty(
      ZAAHI_BUILDINGS_3D,
      "fill-extrusion-opacity",
      selectedId ? ["case", ["==", ["get", "parcelId"], sel], 0.45, 0.3] : 0.3,
    );
  }
  if (map.getLayer(crownId)) {
    map.setPaintProperty(
      crownId,
      "fill-extrusion-opacity",
      selectedId ? ["case", ["==", ["get", "parcelId"], sel], 0.5, 0.35] : 0.35,
    );
  }
}

function deriveLandUse(
  mix: Array<{ category: string }> | null | undefined,
  mainLandUse?: string | null,
): string {
  if (!mix || mix.length === 0) {
    // Fallback to mainLandUse from DDA if landUseMix is empty
    if (mainLandUse) {
      const lu = mainLandUse.toUpperCase().trim();
      if (lu.includes("FUTURE")) return "FUTURE DEVELOPMENT";
      if (lu.includes(" - ") || lu.includes(",")) return "MIXED_USE";
      if (lu.includes("HOTEL") || lu.includes("HOSPITALITY")) return "HOSPITALITY";
      if (lu.includes("RETAIL")) return "RETAIL";
      if (lu.includes("COMMERCIAL") || lu.includes("OFFICE")) return "COMMERCIAL";
      if (lu.includes("INDUSTRIAL")) return "INDUSTRIAL";
      return "RESIDENTIAL";
    }
    return "RESIDENTIAL";
  }
  const cats = new Set(mix.map((u) => u.category.toUpperCase().trim()));
  if (cats.size > 1) return "MIXED_USE";
  return [...cats][0];
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
  communities: boolean; roads: boolean;
  islands: boolean; meydan: boolean; d11: boolean;
  alFurjan: boolean; intlCity23: boolean; residential12: boolean;
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

export default function ParcelsMapPage() {
  const containerRef = useRef<HTMLDivElement>(null);
  const [selectedParcelId, setSelectedParcelId] = useState<string | null>(null);
  const [soundOn, setSoundOn] = useState(false);
  useEffect(() => {
    sound.init();
    return sound.subscribe(setSoundOn);
  }, []);

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
  const mapRef = useRef<MLMap | null>(null);
  const popupRef = useRef<maplibregl.Popup | null>(null);
  const [theme, setTheme] = useState<Theme>("light");
  const [baseMap, setBaseMap] = useState<BaseMap>("light");
  const [is3D, setIs3D] = useState(true);
  const [cursor, setCursor] = useState({ lng: 55.27, lat: 25.20 });
  const [zoom, setZoom] = useState(12);
  const [bearing, setBearing] = useState(0);
  const [showAddModal, setShowAddModal] = useState(false);
  const [layersOpen, setLayersOpen] = useState(false);
  const [legendOpen, setLegendOpen] = useState(false);
  const legendRef = useRef<HTMLDivElement>(null);
  const legendBtnRef = useRef<HTMLButtonElement>(null);
  const [groupOpen, setGroupOpen] = useState({ base: true, master: true, dda: false });
  const [layerSearch, setLayerSearch] = useState("");
  const panelRef = useRef<HTMLDivElement>(null);
  const panelBtnRef = useRef<HTMLButtonElement>(null);
  const [layers, setLayers] = useState<LayersState>({
    communities: true,
    roads: true,
    islands: false,
    meydan: false,
    alFurjan: false,
    intlCity23: false,
    residential12: false,
    d11: false,
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

  // Load all overlay layers onto a fresh style. Idempotent: won't re-add
  // sources that already exist (each call after setStyle attaches fresh).
  async function attachOverlays(map: MLMap) {
    const isDark = themeRef.current === "dark";
    const roadsColor = isDark ? "#888888" : "#666666";

    // ── Communities ────────────────────────────────────────────────
    if (!map.getSource(COMMUNITIES_SRC)) {
      try {
        const r = await fetch("/api/layers/communities");
        const data: GeoJSON.FeatureCollection = await r.json();
        map.addSource(COMMUNITIES_SRC, { type: "geojson", data, promoteId: "COMM_NUM" });
        map.addLayer({
          id: COMMUNITIES_FILL,
          type: "fill",
          source: COMMUNITIES_SRC,
          paint: {
            "fill-color": GOLD,
            "fill-opacity": [
              "case",
              ["boolean", ["feature-state", "hover"], false], 0.12,
              0,
            ],
          },
        });
        map.addLayer({
          id: COMMUNITIES_LINE,
          type: "line",
          source: COMMUNITIES_SRC,
          paint: {
            "line-color": GOLD,
            "line-width": [
              "case",
              ["boolean", ["feature-state", "hover"], false], 2,
              1,
            ],
            "line-opacity": 0.85,
          },
        });
      } catch (e) {
        console.error("[communities] load failed", e);
      }
    }

    // ── Roads ──────────────────────────────────────────────────────
    if (!map.getSource(ROADS_SRC)) {
      try {
        const r = await fetch("/api/layers/roads");
        const data: GeoJSON.FeatureCollection = await r.json();
        map.addSource(ROADS_SRC, { type: "geojson", data });
        map.addLayer({
          id: ROADS_LINE,
          type: "line",
          source: ROADS_SRC,
          paint: {
            "line-color": roadsColor,
            "line-width": 2,
            "line-opacity": 0.7,
          },
          layout: { "line-cap": "round", "line-join": "round" },
        });
      } catch (e) {
        console.error("[roads] load failed", e);
      }
    }

    // ── Master plans (purple dashed) ───────────────────────────────
    const masterPlanPaint: maplibregl.LineLayerSpecification["paint"] = {
      "line-color": "#9333EA",
      "line-width": 1.5,
      "line-opacity": 0.7,
      "line-dasharray": [3, 2],
    };

    if (!map.getSource(ISLANDS_SRC)) {
      try {
        const r = await fetch("/api/layers/dubai-islands");
        const data: GeoJSON.FeatureCollection = await r.json();
        map.addSource(ISLANDS_SRC, { type: "geojson", data });
        map.addLayer({
          id: ISLANDS_LINE,
          type: "line",
          source: ISLANDS_SRC,
          paint: { ...masterPlanPaint },
        });
      } catch (e) {
        console.error("[dubai-islands] load failed", e);
      }
    }

    if (!map.getSource(MEYDAN_SRC)) {
      try {
        const r = await fetch("/api/layers/masterplans/meydan-horizon");
        const data: GeoJSON.FeatureCollection = await r.json();
        map.addSource(MEYDAN_SRC, { type: "geojson", data });
        map.addLayer({
          id: MEYDAN_LINE,
          type: "line",
          source: MEYDAN_SRC,
          paint: { ...masterPlanPaint },
        });
      } catch (e) {
        console.error("[meydan-horizon] load failed", e);
      }
    }

    if (!map.getSource(FURJAN_SRC)) {
      try {
        const r = await fetch("/api/layers/masterplans/al-furjan");
        const data: GeoJSON.FeatureCollection = await r.json();
        map.addSource(FURJAN_SRC, { type: "geojson", data });
        map.addLayer({ id: FURJAN_LINE, type: "line", source: FURJAN_SRC, paint: { ...masterPlanPaint } });
      } catch (e) {
        console.error("[al-furjan] load failed", e);
      }
    }

    if (!map.getSource(IC23_SRC)) {
      try {
        const r = await fetch("/api/layers/masterplans/intl-city-23");
        const data: GeoJSON.FeatureCollection = await r.json();
        map.addSource(IC23_SRC, { type: "geojson", data });
        map.addLayer({ id: IC23_LINE, type: "line", source: IC23_SRC, paint: { ...masterPlanPaint } });
      } catch (e) {
        console.error("[intl-city-23] load failed", e);
      }
    }

    if (!map.getSource(RES12_SRC)) {
      try {
        const r = await fetch("/api/layers/masterplans/residential-12");
        const data: GeoJSON.FeatureCollection = await r.json();
        map.addSource(RES12_SRC, { type: "geojson", data });
        map.addLayer({ id: RES12_LINE, type: "line", source: RES12_SRC, paint: { ...masterPlanPaint } });
      } catch (e) {
        console.error("[residential-12] load failed", e);
      }
    }

    if (!map.getSource(D11_SRC)) {
      try {
        const r = await fetch("/api/layers/masterplans/d11-parcel-ld");
        const data: GeoJSON.FeatureCollection = await r.json();
        map.addSource(D11_SRC, { type: "geojson", data });
        map.addLayer({
          id: D11_LINE,
          type: "line",
          source: D11_SRC,
          paint: { ...masterPlanPaint },
        });
      } catch (e) {
        console.error("[d11-parcel-ld] load failed", e);
      }
    }

    // ── Dubai Hills (DDA) ──────────────────────────────────────────
    if (!map.getSource(DUBAI_HILLS_SRC)) {
      try {
        const r = await fetch("/api/layers/dda/dubai-hills");
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        const data: GeoJSON.FeatureCollection = await r.json();
        map.addSource(DUBAI_HILLS_SRC, { type: "geojson", data });
        map.addLayer({
          id: DUBAI_HILLS_LINE,
          type: "line",
          source: DUBAI_HILLS_SRC,
          paint: { ...masterPlanPaint },
        });
      } catch (e) {
        console.error("[dubai-hills] load failed", e);
      }
    }

    // ── Damac Hills 2 (DDA) ────────────────────────────────────────
    if (!map.getSource(DAMAC_HILLS_2_SRC)) {
      try {
        const r = await fetch("/api/layers/dda/damac-hills-2");
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        const data: GeoJSON.FeatureCollection = await r.json();
        map.addSource(DAMAC_HILLS_2_SRC, { type: "geojson", data });
        map.addLayer({
          id: DAMAC_HILLS_2_LINE,
          type: "line",
          source: DAMAC_HILLS_2_SRC,
          paint: { ...masterPlanPaint },
        });
      } catch (e) {
        console.error("[damac-hills-2] load failed", e);
      }
    }

    // ── Damac Lagoons (DDA) ────────────────────────────────────────
    if (!map.getSource(DAMAC_LAGOONS_SRC)) {
      try {
        const r = await fetch("/api/layers/dda/damac-lagoons");
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        const data: GeoJSON.FeatureCollection = await r.json();
        map.addSource(DAMAC_LAGOONS_SRC, { type: "geojson", data });
        map.addLayer({
          id: DAMAC_LAGOONS_LINE,
          type: "line",
          source: DAMAC_LAGOONS_SRC,
          paint: { ...masterPlanPaint },
        });
      } catch (e) {
        console.error("[damac-lagoons] load failed", e);
      }
    }

    // ── Damac Islands (DDA) ────────────────────────────────────────
    if (!map.getSource(DAMAC_ISLANDS_SRC)) {
      try {
        const r = await fetch("/api/layers/dda/damac-islands");
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        const data: GeoJSON.FeatureCollection = await r.json();
        map.addSource(DAMAC_ISLANDS_SRC, { type: "geojson", data });
        map.addLayer({
          id: DAMAC_ISLANDS_LINE,
          type: "line",
          source: DAMAC_ISLANDS_SRC,
          paint: { ...masterPlanPaint },
        });
      } catch (e) {
        console.error("[damac-islands] load failed", e);
      }
    }

    // ── The Valley (DDA) ───────────────────────────────────────────
    if (!map.getSource(THE_VALLEY_SRC)) {
      try {
        const r = await fetch("/api/layers/dda/the-valley");
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        const data: GeoJSON.FeatureCollection = await r.json();
        map.addSource(THE_VALLEY_SRC, { type: "geojson", data });
        map.addLayer({
          id: THE_VALLEY_LINE,
          type: "line",
          source: THE_VALLEY_SRC,
          paint: { ...masterPlanPaint },
        });
      } catch (e) {
        console.error("[the-valley] load failed", e);
      }
    }

    // ── Damac Hills (DDA) ──────────────────────────────────────────
    if (!map.getSource(DAMAC_HILLS_SRC)) {
      try {
        const r = await fetch("/api/layers/dda/damac-hills");
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        const data: GeoJSON.FeatureCollection = await r.json();
        map.addSource(DAMAC_HILLS_SRC, { type: "geojson", data });
        map.addLayer({
          id: DAMAC_HILLS_LINE,
          type: "line",
          source: DAMAC_HILLS_SRC,
          paint: { ...masterPlanPaint },
        });
      } catch (e) {
        console.error("[damac-hills] load failed", e);
      }
    }

    // ── Mudon (DDA) ────────────────────────────────────────────────
    if (!map.getSource(MUDON_SRC)) {
      try {
        const r = await fetch("/api/layers/dda/mudon");
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        const data: GeoJSON.FeatureCollection = await r.json();
        map.addSource(MUDON_SRC, { type: "geojson", data });
        map.addLayer({
          id: MUDON_LINE,
          type: "line",
          source: MUDON_SRC,
          paint: { ...masterPlanPaint },
        });
      } catch (e) {
        console.error("[mudon] load failed", e);
      }
    }

    // ── Jabel Ali Hills (DDA) ──────────────────────────────────────
    if (!map.getSource(JABEL_ALI_HILLS_SRC)) {
      try {
        const r = await fetch("/api/layers/dda/jabel-ali-hills");
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        const data: GeoJSON.FeatureCollection = await r.json();
        map.addSource(JABEL_ALI_HILLS_SRC, { type: "geojson", data });
        map.addLayer({
          id: JABEL_ALI_HILLS_LINE,
          type: "line",
          source: JABEL_ALI_HILLS_SRC,
          paint: { ...masterPlanPaint },
        });
      } catch (e) {
        console.error("[jabel-ali-hills] load failed", e);
      }
    }

    // ── Arabian Ranches I (DDA) ────────────────────────────────────
    if (!map.getSource(ARABIAN_RANCHES_1_SRC)) {
      try {
        const r = await fetch("/api/layers/dda/arabian-ranches-1");
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        const data: GeoJSON.FeatureCollection = await r.json();
        map.addSource(ARABIAN_RANCHES_1_SRC, { type: "geojson", data });
        map.addLayer({
          id: ARABIAN_RANCHES_1_LINE,
          type: "line",
          source: ARABIAN_RANCHES_1_SRC,
          paint: { ...masterPlanPaint },
        });
      } catch (e) {
        console.error("[arabian-ranches-1] load failed", e);
      }
    }

    // ── Nad Al Sheba Gardens (DDA) ─────────────────────────────────
    if (!map.getSource(NAS_GARDENS_SRC)) {
      try {
        const r = await fetch("/api/layers/dda/nad-al-sheba-gardens");
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        const data: GeoJSON.FeatureCollection = await r.json();
        map.addSource(NAS_GARDENS_SRC, { type: "geojson", data });
        map.addLayer({
          id: NAS_GARDENS_LINE,
          type: "line",
          source: NAS_GARDENS_SRC,
          paint: { ...masterPlanPaint },
        });
      } catch (e) {
        console.error("[nad-al-sheba-gardens] load failed", e);
      }
    }

    // ── Dubai Science Park (DDA) ───────────────────────────────────
    if (!map.getSource(DSP_SRC)) {
      try {
        const r = await fetch("/api/layers/dda/dubai-science-park");
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        const data: GeoJSON.FeatureCollection = await r.json();
        map.addSource(DSP_SRC, { type: "geojson", data });
        map.addLayer({
          id: DSP_LINE,
          type: "line",
          source: DSP_SRC,
          paint: { ...masterPlanPaint },
        });
      } catch (e) {
        console.error("[dubai-science-park] load failed", e);
      }
    }

    // ── Business Bay (DDA) ─────────────────────────────────────────
    if (!map.getSource(BUSINESS_BAY_SRC)) {
      try {
        const r = await fetch("/api/layers/dda/business-bay");
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        const data: GeoJSON.FeatureCollection = await r.json();
        map.addSource(BUSINESS_BAY_SRC, { type: "geojson", data });
        map.addLayer({
          id: BUSINESS_BAY_LINE,
          type: "line",
          source: BUSINESS_BAY_SRC,
          paint: { ...masterPlanPaint },
        });
      } catch (e) {
        console.error("[business-bay] load failed", e);
      }
    }

    // ── Sama Al Jadaf (DDA) ────────────────────────────────────────
    if (!map.getSource(SAMA_AL_JADAF_SRC)) {
      try {
        const r = await fetch("/api/layers/dda/sama-al-jadaf");
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        const data: GeoJSON.FeatureCollection = await r.json();
        map.addSource(SAMA_AL_JADAF_SRC, { type: "geojson", data });
        map.addLayer({
          id: SAMA_AL_JADAF_LINE,
          type: "line",
          source: SAMA_AL_JADAF_SRC,
          paint: { ...masterPlanPaint },
        });
      } catch (e) {
        console.error("[sama-al-jadaf] load failed", e);
      }
    }

    // ── Arjan (DDA) ────────────────────────────────────────────────
    if (!map.getSource(ARJAN_SRC)) {
      try {
        const r = await fetch("/api/layers/dda/arjan");
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        const data: GeoJSON.FeatureCollection = await r.json();
        map.addSource(ARJAN_SRC, { type: "geojson", data });
        map.addLayer({
          id: ARJAN_LINE,
          type: "line",
          source: ARJAN_SRC,
          paint: { ...masterPlanPaint },
        });
      } catch (e) {
        console.error("[arjan] load failed", e);
      }
    }

    // ── ZAAHI Plots (real listings from our DB) ────────────────────
    if (!map.getSource(ZAAHI_PLOTS_SRC)) {
      try {
        const r = await fetch("/api/parcels/map");
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
              buildingLimitGeometry?: GeoJSON.Polygon | null;
            } | null;
          }>;
        };

        const plotFeatures: GeoJSON.Feature[] = [];
        const buildingFeatures: GeoJSON.Feature[] = [];
        for (const it of payload.items) {
          if (!it.geometry || it.geometry.type !== "Polygon") continue;
          const aed = it.currentValuation ? Math.floor(Number(it.currentValuation) / 100) : null;
          const landUse = deriveLandUse(
            (it.plan as { landUseMix?: Array<{ category: string }> } | null)?.landUseMix,
          );
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
              landUse,
              color: ZAAHI_LANDUSE_COLOR[landUse] ?? ZAAHI_DEFAULT_COLOR,
            },
          });
          // ── ZAAHI Signature 3D ──────────────────────────────
          // RESIDENTIAL: one tower from buildingLimitGeometry
          // MIXED_USE:   3 procedural buildings (retail / residential / resort)
          //              centred on plot polygon — used when no building limit
          //              is available for huge master plots.
          const pushSignature = (
            ring: number[][],
            totalH: number,
            useGold: boolean,
            tag: string,
          ) => {
            const cLng = ring.reduce((s, p) => s + p[0], 0) / ring.length;
            const cLat = ring.reduce((s, p) => s + p[1], 0) / ring.length;
            const scaleRing = (s: number): number[][] =>
              ring.map(([lng, lat]) => [
                cLng + (lng - cLng) * s,
                cLat + (lat - cLat) * s,
              ]);
            const podiumTop = Math.min(8, totalH * 0.3);
            const crownH = Math.min(6, totalH * 0.2);
            const crownBase = Math.max(podiumTop, totalH - crownH);
            buildingFeatures.push({
              type: "Feature",
              geometry: { type: "Polygon", coordinates: [scaleRing(1.05)] },
              properties: { parcelId: it.id, landUse, kind: "podium", base: 0, height: podiumTop, tag },
            });
            buildingFeatures.push({
              type: "Feature",
              geometry: { type: "Polygon", coordinates: [scaleRing(0.9)] },
              properties: { parcelId: it.id, landUse, kind: "body", base: podiumTop, height: crownBase, tag },
            });
            if (useGold) {
              buildingFeatures.push({
                type: "Feature",
                geometry: { type: "Polygon", coordinates: [scaleRing(0.85)] },
                properties: { parcelId: it.id, landUse, kind: "crown", base: crownBase, height: totalH, tag },
              });
            }
          };

          const blg = it.plan?.buildingLimitGeometry;

          if (landUse === "MIXED_USE") {
            // Procedural cluster — three small footprints inside the plot.
            const plotRing = (it.geometry as GeoJSON.Polygon).coordinates[0];
            const cLng = plotRing.reduce((s, p) => s + p[0], 0) / plotRing.length;
            const cLat = plotRing.reduce((s, p) => s + p[1], 0) / plotRing.length;
            // 80m × 80m square, ~150m offsets between buildings
            const halfLat = 40 / 111000;
            const halfLng = 40 / (111000 * Math.cos((cLat * Math.PI) / 180));
            const offLat = 200 / 111000;
            const offLng = 200 / (111000 * Math.cos((cLat * Math.PI) / 180));
            const square = (lng: number, lat: number): number[][] => [
              [lng - halfLng, lat - halfLat],
              [lng + halfLng, lat - halfLat],
              [lng + halfLng, lat + halfLat],
              [lng - halfLng, lat + halfLat],
              [lng - halfLng, lat - halfLat],
            ];
            // retail G+2 (12m), residential G+4 (20m), resort G+6 (28m — tallest, gets gold crown)
            pushSignature(square(cLng - offLng, cLat - offLat), 12, false, "retail");
            pushSignature(square(cLng + offLng, cLat - offLat * 0.5), 20, false, "residential");
            pushSignature(square(cLng, cLat + offLat), 28, true, "resort");
          } else if (blg && blg.type === "Polygon") {
            const totalH = it.plan?.maxHeightMeters ?? 44;
            pushSignature(blg.coordinates[0], totalH, true, "tower");
          }
        }

        map.addSource(ZAAHI_PLOTS_SRC, {
          type: "geojson",
          data: { type: "FeatureCollection", features: plotFeatures },
        });
        map.addLayer({
          id: ZAAHI_PLOTS_FILL,
          type: "fill",
          source: ZAAHI_PLOTS_SRC,
          paint: {
            "fill-color": ["get", "color"],
            "fill-opacity": 0.4,
            "fill-opacity-transition": { duration: 300 },
            "fill-color-transition": { duration: 300 },
          },
        });
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
        // Wide blurred gold halo — only the selected feature.
        map.addLayer({
          id: ZAAHI_PLOTS_GLOW,
          type: "line",
          source: ZAAHI_PLOTS_SRC,
          filter: ["==", ["id"], "__none__"],
          paint: {
            "line-color": "#FFD700",
            "line-width": 6,
            "line-blur": 8,
            "line-opacity": 0.9,
          },
        });
        // Crisp pulsing gold outline — width animated by JS RAF (2..4).
        map.addLayer({
          id: ZAAHI_PLOTS_GLOW_CRISP,
          type: "line",
          source: ZAAHI_PLOTS_SRC,
          filter: ["==", ["id"], "__none__"],
          paint: {
            "line-color": "#FFD700",
            "line-width": 2,
            "line-opacity": 1,
          },
        });

        map.addSource(ZAAHI_BUILDINGS_SRC, {
          type: "geojson",
          data: { type: "FeatureCollection", features: buildingFeatures },
        });
        // ── ZAAHI Signature: podium ──
        map.addLayer({
          id: `${ZAAHI_BUILDINGS_3D}-podium`,
          type: "fill-extrusion",
          source: ZAAHI_BUILDINGS_SRC,
          filter: ["==", ["get", "kind"], "podium"],
          paint: {
            "fill-extrusion-color": [
              "case",
              ["==", ["get", "landUse"], "MIXED_USE"],
              "rgba(140,100,180,1)",
              "rgba(170,160,150,1)",
            ],
            "fill-extrusion-height": ["get", "height"],
            "fill-extrusion-base": ["get", "base"],
            "fill-extrusion-opacity": 0.4,
            "fill-extrusion-opacity-transition": { duration: 300 },
          },
        });
        // Body — glass
        map.addLayer({
          id: ZAAHI_BUILDINGS_3D,
          type: "fill-extrusion",
          source: ZAAHI_BUILDINGS_SRC,
          filter: ["==", ["get", "kind"], "body"],
          paint: {
            "fill-extrusion-color": [
              "case",
              ["==", ["get", "landUse"], "MIXED_USE"],
              "rgba(170,140,210,1)",
              "rgba(190,200,210,1)",
            ],
            "fill-extrusion-height": ["get", "height"],
            "fill-extrusion-base": ["get", "base"],
            "fill-extrusion-opacity": 0.3,
            "fill-extrusion-opacity-transition": { duration: 300 },
          },
        });
        // Crown — gold tint
        map.addLayer({
          id: `${ZAAHI_BUILDINGS_3D}-crown`,
          type: "fill-extrusion",
          source: ZAAHI_BUILDINGS_SRC,
          filter: ["==", ["get", "kind"], "crown"],
          paint: {
            "fill-extrusion-color": "rgba(200,180,140,1)",
            "fill-extrusion-height": ["get", "height"],
            "fill-extrusion-base": ["get", "base"],
            "fill-extrusion-opacity": 0.35,
            "fill-extrusion-opacity-transition": { duration: 300 },
          },
        });
        // White outline on every segment
        map.addLayer({
          id: `${ZAAHI_BUILDINGS_3D}-outline`,
          type: "line",
          source: ZAAHI_BUILDINGS_SRC,
          paint: {
            "line-color": "rgba(255,255,255,0.85)",
            "line-width": 1,
          },
        });
      } catch (e) {
        console.error("[zaahi-plots] load failed", e);
      }
    }

    // ── DHCC Phase 2 (DDA) ─────────────────────────────────────────
    if (!map.getSource(DHCC2_SRC)) {
      try {
        const r = await fetch("/api/layers/dda/dhcc-phase2");
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        const data: GeoJSON.FeatureCollection = await r.json();
        map.addSource(DHCC2_SRC, { type: "geojson", data });
        map.addLayer({
          id: DHCC2_LINE,
          type: "line",
          source: DHCC2_SRC,
          paint: { ...masterPlanPaint },
        });
      } catch (e) {
        console.error("[dhcc-phase2] load failed", e);
      }
    }

    // ── Barsha Heights (DDA) ───────────────────────────────────────
    if (!map.getSource(BARSHA_HEIGHTS_SRC)) {
      try {
        const r = await fetch("/api/layers/dda/barsha-heights");
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        const data: GeoJSON.FeatureCollection = await r.json();
        map.addSource(BARSHA_HEIGHTS_SRC, { type: "geojson", data });
        map.addLayer({
          id: BARSHA_HEIGHTS_FILL,
          type: "fill",
          source: BARSHA_HEIGHTS_SRC,
          paint: { "fill-color": "#9333EA", "fill-opacity": 0.05 },
        });
        map.addLayer({
          id: BARSHA_HEIGHTS_LINE,
          type: "line",
          source: BARSHA_HEIGHTS_SRC,
          paint: {
            "line-color": "#9333EA",
            "line-width": 1.5,
            "line-dasharray": [2, 2],
          },
        });
      } catch (e) {
        console.error("[barsha-heights] load failed", e);
      }
    }

    // ── DIFC Zabeel (DDA) ──────────────────────────────────────────
    if (!map.getSource(DIFC_ZABEEL_SRC)) {
      try {
        const r = await fetch("/api/layers/dda/difc-zabeel");
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        const data: GeoJSON.FeatureCollection = await r.json();
        map.addSource(DIFC_ZABEEL_SRC, { type: "geojson", data });
        map.addLayer({
          id: DIFC_ZABEEL_FILL,
          type: "fill",
          source: DIFC_ZABEEL_SRC,
          paint: { "fill-color": "#9333EA", "fill-opacity": 0.05 },
        });
        map.addLayer({
          id: DIFC_ZABEEL_LINE,
          type: "line",
          source: DIFC_ZABEEL_SRC,
          paint: {
            "line-color": "#9333EA",
            "line-width": 1.5,
            "line-dasharray": [2, 2],
          },
        });
      } catch (e) {
        console.error("[difc-zabeel] load failed", e);
      }
    }

    // ── Jaddaf Waterfront (DDA) ────────────────────────────────────
    if (!map.getSource(JADDAF_WF_SRC)) {
      try {
        const r = await fetch("/api/layers/dda/jaddaf-waterfront");
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        const data: GeoJSON.FeatureCollection = await r.json();
        map.addSource(JADDAF_WF_SRC, { type: "geojson", data });
        map.addLayer({
          id: JADDAF_WF_FILL,
          type: "fill",
          source: JADDAF_WF_SRC,
          paint: { "fill-color": "#9333EA", "fill-opacity": 0.05 },
        });
        map.addLayer({
          id: JADDAF_WF_LINE,
          type: "line",
          source: JADDAF_WF_SRC,
          paint: {
            "line-color": "#9333EA",
            "line-width": 1.5,
            "line-dasharray": [2, 2],
          },
        });
      } catch (e) {
        console.error("[jaddaf-waterfront] load failed", e);
      }
    }

    // ── DHCC Phase 1 (DDA) ─────────────────────────────────────────
    if (!map.getSource(DHCC1_SRC)) {
      try {
        const r = await fetch("/api/layers/dda/dhcc-phase1");
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        const data: GeoJSON.FeatureCollection = await r.json();
        map.addSource(DHCC1_SRC, { type: "geojson", data });
        map.addLayer({
          id: DHCC1_FILL,
          type: "fill",
          source: DHCC1_SRC,
          paint: { "fill-color": "#9333EA", "fill-opacity": 0.05 },
        });
        map.addLayer({
          id: DHCC1_LINE,
          type: "line",
          source: DHCC1_SRC,
          paint: {
            "line-color": "#9333EA",
            "line-width": 1.5,
            "line-dasharray": [2, 2],
          },
        });
      } catch (e) {
        console.error("[dhcc-phase1] load failed", e);
      }
    }

    // ── DIFC (DDA) ─────────────────────────────────────────────────
    if (!map.getSource(DIFC_SRC)) {
      try {
        const r = await fetch("/api/layers/dda/difc");
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        const data: GeoJSON.FeatureCollection = await r.json();
        map.addSource(DIFC_SRC, { type: "geojson", data });
        map.addLayer({
          id: DIFC_FILL,
          type: "fill",
          source: DIFC_SRC,
          paint: { "fill-color": "#9333EA", "fill-opacity": 0.05 },
        });
        map.addLayer({
          id: DIFC_LINE,
          type: "line",
          source: DIFC_SRC,
          paint: {
            "line-color": "#9333EA",
            "line-width": 1.5,
            "line-dasharray": [2, 2],
          },
        });
      } catch (e) {
        console.error("[difc] load failed", e);
      }
    }

    // ── Tilal Al Ghaf (DDA) ────────────────────────────────────────
    if (!map.getSource(TILAL_AL_GHAF_SRC)) {
      try {
        const r = await fetch("/api/layers/dda/tilal-al-ghaf");
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        const data: GeoJSON.FeatureCollection = await r.json();
        map.addSource(TILAL_AL_GHAF_SRC, { type: "geojson", data });
        map.addLayer({
          id: TILAL_AL_GHAF_FILL,
          type: "fill",
          source: TILAL_AL_GHAF_SRC,
          paint: { "fill-color": "#9333EA", "fill-opacity": 0.05 },
        });
        map.addLayer({
          id: TILAL_AL_GHAF_LINE,
          type: "line",
          source: TILAL_AL_GHAF_SRC,
          paint: {
            "line-color": "#9333EA",
            "line-width": 1.5,
            "line-dasharray": [2, 2],
          },
        });
      } catch (e) {
        console.error("[tilal-al-ghaf] load failed", e);
      }
    }

    // ── Arabian Ranches II (DDA) ───────────────────────────────────
    if (!map.getSource(AR2_SRC)) {
      try {
        const r = await fetch("/api/layers/dda/arabian-ranches-2");
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        const data: GeoJSON.FeatureCollection = await r.json();
        map.addSource(AR2_SRC, { type: "geojson", data });
        map.addLayer({
          id: AR2_FILL,
          type: "fill",
          source: AR2_SRC,
          paint: { "fill-color": "#9333EA", "fill-opacity": 0.05 },
        });
        map.addLayer({
          id: AR2_LINE,
          type: "line",
          source: AR2_SRC,
          paint: {
            "line-color": "#9333EA",
            "line-width": 1.5,
            "line-dasharray": [2, 2],
          },
        });
      } catch (e) {
        console.error("[arabian-ranches-2] load failed", e);
      }
    }

    // ── The Villa (DDA) ────────────────────────────────────────────
    if (!map.getSource(THE_VILLA_SRC)) {
      try {
        const r = await fetch("/api/layers/dda/the-villa");
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        const data: GeoJSON.FeatureCollection = await r.json();
        map.addSource(THE_VILLA_SRC, { type: "geojson", data });
        map.addLayer({
          id: THE_VILLA_FILL,
          type: "fill",
          source: THE_VILLA_SRC,
          paint: { "fill-color": "#9333EA", "fill-opacity": 0.05 },
        });
        map.addLayer({
          id: THE_VILLA_LINE,
          type: "line",
          source: THE_VILLA_SRC,
          paint: {
            "line-color": "#9333EA",
            "line-width": 1.5,
            "line-dasharray": [2, 2],
          },
        });
      } catch (e) {
        console.error("[the-villa] load failed", e);
      }
    }

    // ── Arabian Ranches III (DDA) ──────────────────────────────────
    if (!map.getSource(AR3_SRC)) {
      try {
        const r = await fetch("/api/layers/dda/arabian-ranches-3");
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        const data: GeoJSON.FeatureCollection = await r.json();
        map.addSource(AR3_SRC, { type: "geojson", data });
        map.addLayer({
          id: AR3_FILL,
          type: "fill",
          source: AR3_SRC,
          paint: { "fill-color": "#9333EA", "fill-opacity": 0.05 },
        });
        map.addLayer({
          id: AR3_LINE,
          type: "line",
          source: AR3_SRC,
          paint: {
            "line-color": "#9333EA",
            "line-width": 1.5,
            "line-dasharray": [2, 2],
          },
        });
      } catch (e) {
        console.error("[arabian-ranches-3] load failed", e);
      }
    }

    // ── Dubai Sports City (DDA) ────────────────────────────────────
    if (!map.getSource(DSC_SRC)) {
      try {
        const r = await fetch("/api/layers/dda/dubai-sports-city");
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        const data: GeoJSON.FeatureCollection = await r.json();
        map.addSource(DSC_SRC, { type: "geojson", data });
        map.addLayer({
          id: DSC_FILL,
          type: "fill",
          source: DSC_SRC,
          paint: { "fill-color": "#9333EA", "fill-opacity": 0.05 },
        });
        map.addLayer({
          id: DSC_LINE,
          type: "line",
          source: DSC_SRC,
          paint: {
            "line-color": "#9333EA",
            "line-width": 1.5,
            "line-dasharray": [2, 2],
          },
        });
      } catch (e) {
        console.error("[dubai-sports-city] load failed", e);
      }
    }

    // ── Villanova (DDA) ────────────────────────────────────────────
    if (!map.getSource(VILLANOVA_SRC)) {
      try {
        const r = await fetch("/api/layers/dda/villanova");
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        const data: GeoJSON.FeatureCollection = await r.json();
        map.addSource(VILLANOVA_SRC, { type: "geojson", data });
        map.addLayer({
          id: VILLANOVA_FILL,
          type: "fill",
          source: VILLANOVA_SRC,
          paint: { "fill-color": "#9333EA", "fill-opacity": 0.05 },
        });
        map.addLayer({
          id: VILLANOVA_LINE,
          type: "line",
          source: VILLANOVA_SRC,
          paint: {
            "line-color": "#9333EA",
            "line-width": 1.5,
            "line-dasharray": [2, 2],
          },
        });
      } catch (e) {
        console.error("[villanova] load failed", e);
      }
    }

    // ── The Acres (DDA) ────────────────────────────────────────────
    if (!map.getSource(ACRES_SRC)) {
      try {
        const r = await fetch("/api/layers/dda/the-acres");
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        const data: GeoJSON.FeatureCollection = await r.json();
        map.addSource(ACRES_SRC, { type: "geojson", data });
        map.addLayer({
          id: ACRES_FILL,
          type: "fill",
          source: ACRES_SRC,
          paint: { "fill-color": "#9333EA", "fill-opacity": 0.05 },
        });
        map.addLayer({
          id: ACRES_LINE,
          type: "line",
          source: ACRES_SRC,
          paint: {
            "line-color": "#9333EA",
            "line-width": 1.5,
            "line-dasharray": [2, 2],
          },
        });
      } catch (e) {
        console.error("[the-acres] load failed", e);
      }
    }

    // ── Falcon City of Wonders (DDA) ───────────────────────────────
    if (!map.getSource(FALCON_SRC)) {
      try {
        const r = await fetch("/api/layers/dda/falcon-city");
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        const data: GeoJSON.FeatureCollection = await r.json();
        map.addSource(FALCON_SRC, { type: "geojson", data });
        map.addLayer({
          id: FALCON_FILL,
          type: "fill",
          source: FALCON_SRC,
          paint: { "fill-color": "#9333EA", "fill-opacity": 0.05 },
        });
        map.addLayer({
          id: FALCON_LINE,
          type: "line",
          source: FALCON_SRC,
          paint: {
            "line-color": "#9333EA",
            "line-width": 1.5,
            "line-dasharray": [2, 2],
          },
        });
      } catch (e) {
        console.error("[falcon-city] load failed", e);
      }
    }

    // ── Al Aryam (DDA) ─────────────────────────────────────────────
    if (!map.getSource(AL_ARYAM_SRC)) {
      try {
        const r = await fetch("/api/layers/dda/al-aryam");
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        const data: GeoJSON.FeatureCollection = await r.json();
        map.addSource(AL_ARYAM_SRC, { type: "geojson", data });
        map.addLayer({
          id: AL_ARYAM_FILL,
          type: "fill",
          source: AL_ARYAM_SRC,
          paint: { "fill-color": "#9333EA", "fill-opacity": 0.05 },
        });
        map.addLayer({
          id: AL_ARYAM_LINE,
          type: "line",
          source: AL_ARYAM_SRC,
          paint: {
            "line-color": "#9333EA",
            "line-width": 1.5,
            "line-dasharray": [2, 2],
          },
        });
      } catch (e) {
        console.error("[al-aryam] load failed", e);
      }
    }

    // ── Dubai Industrial City (DDA) ────────────────────────────────
    if (!map.getSource(DIC_SRC)) {
      try {
        const r = await fetch("/api/layers/dda/dubai-industrial-city");
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        const data: GeoJSON.FeatureCollection = await r.json();
        map.addSource(DIC_SRC, { type: "geojson", data });
        map.addLayer({
          id: DIC_FILL,
          type: "fill",
          source: DIC_SRC,
          paint: { "fill-color": "#9333EA", "fill-opacity": 0.05 },
        });
        map.addLayer({
          id: DIC_LINE,
          type: "line",
          source: DIC_SRC,
          paint: {
            "line-color": "#9333EA",
            "line-width": 1.5,
            "line-dasharray": [2, 2],
          },
        });
      } catch (e) {
        console.error("[dubai-industrial-city] load failed", e);
      }
    }

    // ── Damac Islands 2 (DDA) ──────────────────────────────────────
    if (!map.getSource(DI2_SRC)) {
      try {
        const r = await fetch("/api/layers/dda/damac-islands-2");
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        const data: GeoJSON.FeatureCollection = await r.json();
        map.addSource(DI2_SRC, { type: "geojson", data });
        map.addLayer({
          id: DI2_FILL,
          type: "fill",
          source: DI2_SRC,
          paint: { "fill-color": "#9333EA", "fill-opacity": 0.05 },
        });
        map.addLayer({
          id: DI2_LINE,
          type: "line",
          source: DI2_SRC,
          paint: {
            "line-color": "#9333EA",
            "line-width": 1.5,
            "line-dasharray": [2, 2],
          },
        });
      } catch (e) {
        console.error("[damac-islands-2] load failed", e);
      }
    }

    // ── Wilds 1&2 (DDA) ────────────────────────────────────────────
    if (!map.getSource(WILDS_SRC)) {
      try {
        const r = await fetch("/api/layers/dda/wilds");
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        const data: GeoJSON.FeatureCollection = await r.json();
        map.addSource(WILDS_SRC, { type: "geojson", data });
        map.addLayer({
          id: WILDS_FILL,
          type: "fill",
          source: WILDS_SRC,
          paint: { "fill-color": "#9333EA", "fill-opacity": 0.05 },
        });
        map.addLayer({
          id: WILDS_LINE,
          type: "line",
          source: WILDS_SRC,
          paint: {
            "line-color": "#9333EA",
            "line-width": 1.5,
            "line-dasharray": [2, 2],
          },
        });
      } catch (e) {
        console.error("[wilds] load failed", e);
      }
    }

    // ── Town Square (DDA) ──────────────────────────────────────────
    if (!map.getSource(TOWN_SQ_SRC)) {
      try {
        const r = await fetch("/api/layers/dda/town-square");
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        const data: GeoJSON.FeatureCollection = await r.json();
        map.addSource(TOWN_SQ_SRC, { type: "geojson", data });
        map.addLayer({
          id: TOWN_SQ_FILL,
          type: "fill",
          source: TOWN_SQ_SRC,
          paint: { "fill-color": "#9333EA", "fill-opacity": 0.05 },
        });
        map.addLayer({
          id: TOWN_SQ_LINE,
          type: "line",
          source: TOWN_SQ_SRC,
          paint: {
            "line-color": "#9333EA",
            "line-width": 1.5,
            "line-dasharray": [2, 2],
          },
        });
      } catch (e) {
        console.error("[town-square] load failed", e);
      }
    }

    // ── Athlon by Aldar (DDA) ──────────────────────────────────────
    if (!map.getSource(ATHLON_SRC)) {
      try {
        const r = await fetch("/api/layers/dda/athlon");
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        const data: GeoJSON.FeatureCollection = await r.json();
        map.addSource(ATHLON_SRC, { type: "geojson", data });
        map.addLayer({
          id: ATHLON_FILL,
          type: "fill",
          source: ATHLON_SRC,
          paint: { "fill-color": "#9333EA", "fill-opacity": 0.05 },
        });
        map.addLayer({
          id: ATHLON_LINE,
          type: "line",
          source: ATHLON_SRC,
          paint: {
            "line-color": "#9333EA",
            "line-width": 1.5,
            "line-dasharray": [2, 2],
          },
        });
      } catch (e) {
        console.error("[athlon] load failed", e);
      }
    }

    // ── Cherrywoods (DDA) ──────────────────────────────────────────
    if (!map.getSource(CHERRY_SRC)) {
      try {
        const r = await fetch("/api/layers/dda/cherrywoods");
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        const data: GeoJSON.FeatureCollection = await r.json();
        map.addSource(CHERRY_SRC, { type: "geojson", data });
        map.addLayer({
          id: CHERRY_FILL,
          type: "fill",
          source: CHERRY_SRC,
          paint: { "fill-color": "#9333EA", "fill-opacity": 0.05 },
        });
        map.addLayer({
          id: CHERRY_LINE,
          type: "line",
          source: CHERRY_SRC,
          paint: {
            "line-color": "#9333EA",
            "line-width": 1.5,
            "line-dasharray": [2, 2],
          },
        });
      } catch (e) {
        console.error("[cherrywoods] load failed", e);
      }
    }

    // ── Portofino (DDA) ────────────────────────────────────────────
    if (!map.getSource(PORTOFINO_SRC)) {
      try {
        const r = await fetch("/api/layers/dda/portofino");
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        const data: GeoJSON.FeatureCollection = await r.json();
        map.addSource(PORTOFINO_SRC, { type: "geojson", data });
        map.addLayer({
          id: PORTOFINO_FILL,
          type: "fill",
          source: PORTOFINO_SRC,
          paint: { "fill-color": "#9333EA", "fill-opacity": 0.05 },
        });
        map.addLayer({
          id: PORTOFINO_LINE,
          type: "line",
          source: PORTOFINO_SRC,
          paint: {
            "line-color": "#9333EA",
            "line-width": 1.5,
            "line-dasharray": [2, 2],
          },
        });
      } catch (e) {
        console.error("[portofino] load failed", e);
      }
    }

    // ── Haven (DDA) ────────────────────────────────────────────────
    if (!map.getSource(HAVEN_SRC)) {
      try {
        const r = await fetch("/api/layers/dda/haven");
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        const data: GeoJSON.FeatureCollection = await r.json();
        map.addSource(HAVEN_SRC, { type: "geojson", data });
        map.addLayer({
          id: HAVEN_FILL,
          type: "fill",
          source: HAVEN_SRC,
          paint: { "fill-color": "#9333EA", "fill-opacity": 0.05 },
        });
        map.addLayer({
          id: HAVEN_LINE,
          type: "line",
          source: HAVEN_SRC,
          paint: {
            "line-color": "#9333EA",
            "line-width": 1.5,
            "line-dasharray": [2, 2],
          },
        });
      } catch (e) {
        console.error("[haven] load failed", e);
      }
    }

    // ── Al Barari (DDA) ────────────────────────────────────────────
    if (!map.getSource(AL_BARARI_SRC)) {
      try {
        const r = await fetch("/api/layers/dda/al-barari");
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        const data: GeoJSON.FeatureCollection = await r.json();
        map.addSource(AL_BARARI_SRC, { type: "geojson", data });
        map.addLayer({
          id: AL_BARARI_FILL,
          type: "fill",
          source: AL_BARARI_SRC,
          paint: { "fill-color": "#9333EA", "fill-opacity": 0.05 },
        });
        map.addLayer({
          id: AL_BARARI_LINE,
          type: "line",
          source: AL_BARARI_SRC,
          paint: {
            "line-color": "#9333EA",
            "line-width": 1.5,
            "line-dasharray": [2, 2],
          },
        });
      } catch (e) {
        console.error("[al-barari] load failed", e);
      }
    }

    // ── Jabal Ali Industrial Dev. (DDA) ────────────────────────────
    if (!map.getSource(JAI_SRC)) {
      try {
        const r = await fetch("/api/layers/dda/jabal-ali-industrial");
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        const data: GeoJSON.FeatureCollection = await r.json();
        map.addSource(JAI_SRC, { type: "geojson", data });
        map.addLayer({
          id: JAI_FILL,
          type: "fill",
          source: JAI_SRC,
          paint: { "fill-color": "#9333EA", "fill-opacity": 0.05 },
        });
        map.addLayer({
          id: JAI_LINE,
          type: "line",
          source: JAI_SRC,
          paint: {
            "line-color": "#9333EA",
            "line-width": 1.5,
            "line-dasharray": [2, 2],
          },
        });
      } catch (e) {
        console.error("[jabal-ali-industrial] load failed", e);
      }
    }

    // ── Living Legends (DDA) ───────────────────────────────────────
    if (!map.getSource(LL_SRC)) {
      try {
        const r = await fetch("/api/layers/dda/living-legends");
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        const data: GeoJSON.FeatureCollection = await r.json();
        map.addSource(LL_SRC, { type: "geojson", data });
        map.addLayer({
          id: LL_FILL,
          type: "fill",
          source: LL_SRC,
          paint: { "fill-color": "#9333EA", "fill-opacity": 0.05 },
        });
        map.addLayer({
          id: LL_LINE,
          type: "line",
          source: LL_SRC,
          paint: {
            "line-color": "#9333EA",
            "line-width": 1.5,
            "line-dasharray": [2, 2],
          },
        });
      } catch (e) {
        console.error("[living-legends] load failed", e);
      }
    }

    // ── Shorooq (DDA) ──────────────────────────────────────────────
    if (!map.getSource(SHOROOQ_SRC)) {
      try {
        const r = await fetch("/api/layers/dda/shorooq");
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        const data: GeoJSON.FeatureCollection = await r.json();
        map.addSource(SHOROOQ_SRC, { type: "geojson", data });
        map.addLayer({
          id: SHOROOQ_FILL,
          type: "fill",
          source: SHOROOQ_SRC,
          paint: { "fill-color": "#9333EA", "fill-opacity": 0.05 },
        });
        map.addLayer({
          id: SHOROOQ_LINE,
          type: "line",
          source: SHOROOQ_SRC,
          paint: {
            "line-color": "#9333EA",
            "line-width": 1.5,
            "line-dasharray": [2, 2],
          },
        });
      } catch (e) {
        console.error("[shorooq] load failed", e);
      }
    }

    // ── City of Arabia (DDA) ───────────────────────────────────────
    if (!map.getSource(COA_SRC)) {
      try {
        const r = await fetch("/api/layers/dda/city-of-arabia");
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        const data: GeoJSON.FeatureCollection = await r.json();
        map.addSource(COA_SRC, { type: "geojson", data });
        map.addLayer({
          id: COA_FILL,
          type: "fill",
          source: COA_SRC,
          paint: { "fill-color": "#9333EA", "fill-opacity": 0.05 },
        });
        map.addLayer({
          id: COA_LINE,
          type: "line",
          source: COA_SRC,
          paint: {
            "line-color": "#9333EA",
            "line-width": 1.5,
            "line-dasharray": [2, 2],
          },
        });
      } catch (e) {
        console.error("[city-of-arabia] load failed", e);
      }
    }

    // ── Serena (DDA) ───────────────────────────────────────────────
    if (!map.getSource(SERENA_SRC)) {
      try {
        const r = await fetch("/api/layers/dda/serena");
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        const data: GeoJSON.FeatureCollection = await r.json();
        map.addSource(SERENA_SRC, { type: "geojson", data });
        map.addLayer({
          id: SERENA_FILL,
          type: "fill",
          source: SERENA_SRC,
          paint: { "fill-color": "#9333EA", "fill-opacity": 0.05 },
        });
        map.addLayer({
          id: SERENA_LINE,
          type: "line",
          source: SERENA_SRC,
          paint: {
            "line-color": "#9333EA",
            "line-width": 1.5,
            "line-dasharray": [2, 2],
          },
        });
      } catch (e) {
        console.error("[serena] load failed", e);
      }
    }

    // ── Dubai Creek Harbour (DDA) ──────────────────────────────────
    if (!map.getSource(DCH_SRC)) {
      try {
        const r = await fetch("/api/layers/dda/dubai-creek-harbour");
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        const data: GeoJSON.FeatureCollection = await r.json();
        map.addSource(DCH_SRC, { type: "geojson", data });
        map.addLayer({
          id: DCH_FILL,
          type: "fill",
          source: DCH_SRC,
          paint: { "fill-color": "#9333EA", "fill-opacity": 0.05 },
        });
        map.addLayer({
          id: DCH_LINE,
          type: "line",
          source: DCH_SRC,
          paint: {
            "line-color": "#9333EA",
            "line-width": 1.5,
            "line-dasharray": [2, 2],
          },
        });
      } catch (e) {
        console.error("[dubai-creek-harbour] load failed", e);
      }
    }

    // ── Dubai Production City (DDA) ────────────────────────────────
    if (!map.getSource(DPC_SRC)) {
      try {
        const r = await fetch("/api/layers/dda/dubai-production-city");
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        const data: GeoJSON.FeatureCollection = await r.json();
        map.addSource(DPC_SRC, { type: "geojson", data });
        map.addLayer({
          id: DPC_FILL,
          type: "fill",
          source: DPC_SRC,
          paint: { "fill-color": "#9333EA", "fill-opacity": 0.05 },
        });
        map.addLayer({
          id: DPC_LINE,
          type: "line",
          source: DPC_SRC,
          paint: {
            "line-color": "#9333EA",
            "line-width": 1.5,
            "line-dasharray": [2, 2],
          },
        });
      } catch (e) {
        console.error("[dubai-production-city] load failed", e);
      }
    }

    // ── Sobha Reserve (DDA) ────────────────────────────────────────
    if (!map.getSource(SOBHA_R_SRC)) {
      try {
        const r = await fetch("/api/layers/dda/sobha-reserve");
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        const data: GeoJSON.FeatureCollection = await r.json();
        map.addSource(SOBHA_R_SRC, { type: "geojson", data });
        map.addLayer({
          id: SOBHA_R_FILL,
          type: "fill",
          source: SOBHA_R_SRC,
          paint: { "fill-color": "#9333EA", "fill-opacity": 0.05 },
        });
        map.addLayer({
          id: SOBHA_R_LINE,
          type: "line",
          source: SOBHA_R_SRC,
          paint: {
            "line-color": "#9333EA",
            "line-width": 1.5,
            "line-dasharray": [2, 2],
          },
        });
      } catch (e) {
        console.error("[sobha-reserve] load failed", e);
      }
    }

    // ── Jumeirah Garden City (DDA) ─────────────────────────────────
    if (!map.getSource(JGC_SRC)) {
      try {
        const r = await fetch("/api/layers/dda/jumeirah-garden-city");
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        const data: GeoJSON.FeatureCollection = await r.json();
        map.addSource(JGC_SRC, { type: "geojson", data });
        map.addLayer({
          id: JGC_FILL,
          type: "fill",
          source: JGC_SRC,
          paint: { "fill-color": "#9333EA", "fill-opacity": 0.05 },
        });
        map.addLayer({
          id: JGC_LINE,
          type: "line",
          source: JGC_SRC,
          paint: {
            "line-color": "#9333EA",
            "line-width": 1.5,
            "line-dasharray": [2, 2],
          },
        });
      } catch (e) {
        console.error("[jumeirah-garden-city] load failed", e);
      }
    }

    // ── Sobha Elwood (DDA) ─────────────────────────────────────────
    if (!map.getSource(SOBHA_E_SRC)) {
      try {
        const r = await fetch("/api/layers/dda/sobha-elwood");
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        const data: GeoJSON.FeatureCollection = await r.json();
        map.addSource(SOBHA_E_SRC, { type: "geojson", data });
        map.addLayer({
          id: SOBHA_E_FILL,
          type: "fill",
          source: SOBHA_E_SRC,
          paint: { "fill-color": "#9333EA", "fill-opacity": 0.05 },
        });
        map.addLayer({
          id: SOBHA_E_LINE,
          type: "line",
          source: SOBHA_E_SRC,
          paint: {
            "line-color": "#9333EA",
            "line-width": 1.5,
            "line-dasharray": [2, 2],
          },
        });
      } catch (e) {
        console.error("[sobha-elwood] load failed", e);
      }
    }

    // ── Dubai Land Residence Complex (DDA) ─────────────────────────
    if (!map.getSource(DLRC_SRC)) {
      try {
        const r = await fetch("/api/layers/dda/dlrc");
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        const data: GeoJSON.FeatureCollection = await r.json();
        map.addSource(DLRC_SRC, { type: "geojson", data });
        map.addLayer({
          id: DLRC_FILL,
          type: "fill",
          source: DLRC_SRC,
          paint: { "fill-color": "#9333EA", "fill-opacity": 0.05 },
        });
        map.addLayer({
          id: DLRC_LINE,
          type: "line",
          source: DLRC_SRC,
          paint: {
            "line-color": "#9333EA",
            "line-width": 1.5,
            "line-dasharray": [2, 2],
          },
        });
      } catch (e) {
        console.error("[dlrc] load failed", e);
      }
    }

    // ── Pearl Jumeira (DDA) ────────────────────────────────────────
    if (!map.getSource(PEARL_J_SRC)) {
      try {
        const r = await fetch("/api/layers/dda/pearl-jumeira");
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        const data: GeoJSON.FeatureCollection = await r.json();
        map.addSource(PEARL_J_SRC, { type: "geojson", data });
        map.addLayer({
          id: PEARL_J_FILL,
          type: "fill",
          source: PEARL_J_SRC,
          paint: { "fill-color": "#9333EA", "fill-opacity": 0.05 },
        });
        map.addLayer({
          id: PEARL_J_LINE,
          type: "line",
          source: PEARL_J_SRC,
          paint: {
            "line-color": "#9333EA",
            "line-width": 1.5,
            "line-dasharray": [2, 2],
          },
        });
      } catch (e) {
        console.error("[pearl-jumeira] load failed", e);
      }
    }

    // ── Al Khawaneej District (DDA) ────────────────────────────────
    if (!map.getSource(KHAWANEEJ_SRC)) {
      try {
        const r = await fetch("/api/layers/dda/al-khawaneej");
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        const data: GeoJSON.FeatureCollection = await r.json();
        map.addSource(KHAWANEEJ_SRC, { type: "geojson", data });
        map.addLayer({
          id: KHAWANEEJ_FILL,
          type: "fill",
          source: KHAWANEEJ_SRC,
          paint: { "fill-color": "#9333EA", "fill-opacity": 0.05 },
        });
        map.addLayer({
          id: KHAWANEEJ_LINE,
          type: "line",
          source: KHAWANEEJ_SRC,
          paint: {
            "line-color": "#9333EA",
            "line-width": 1.5,
            "line-dasharray": [2, 2],
          },
        });
      } catch (e) {
        console.error("[al-khawaneej] load failed", e);
      }
    }

    // ── Majan (DDA) ────────────────────────────────────────────────
    if (!map.getSource(MAJAN_SRC)) {
      try {
        const r = await fetch("/api/layers/dda/majan");
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        const data: GeoJSON.FeatureCollection = await r.json();
        map.addSource(MAJAN_SRC, { type: "geojson", data });
        map.addLayer({
          id: MAJAN_FILL,
          type: "fill",
          source: MAJAN_SRC,
          paint: { "fill-color": "#9333EA", "fill-opacity": 0.05 },
        });
        map.addLayer({
          id: MAJAN_LINE,
          type: "line",
          source: MAJAN_SRC,
          paint: {
            "line-color": "#9333EA",
            "line-width": 1.5,
            "line-dasharray": [2, 2],
          },
        });
      } catch (e) {
        console.error("[majan] load failed", e);
      }
    }

    // ── La Mer (DDA) ───────────────────────────────────────────────
    if (!map.getSource(LA_MER_SRC)) {
      try {
        const r = await fetch("/api/layers/dda/la-mer");
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        const data: GeoJSON.FeatureCollection = await r.json();
        map.addSource(LA_MER_SRC, { type: "geojson", data });
        map.addLayer({
          id: LA_MER_FILL,
          type: "fill",
          source: LA_MER_SRC,
          paint: { "fill-color": "#9333EA", "fill-opacity": 0.05 },
        });
        map.addLayer({
          id: LA_MER_LINE,
          type: "line",
          source: LA_MER_SRC,
          paint: {
            "line-color": "#9333EA",
            "line-width": 1.5,
            "line-dasharray": [2, 2],
          },
        });
      } catch (e) {
        console.error("[la-mer] load failed", e);
      }
    }

    // ── Dubai Land (DDA) ───────────────────────────────────────────
    if (!map.getSource(DUBAI_LAND_SRC)) {
      try {
        const r = await fetch("/api/layers/dda/dubai-land");
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        const data: GeoJSON.FeatureCollection = await r.json();
        map.addSource(DUBAI_LAND_SRC, { type: "geojson", data });
        map.addLayer({
          id: DUBAI_LAND_FILL,
          type: "fill",
          source: DUBAI_LAND_SRC,
          paint: { "fill-color": "#9333EA", "fill-opacity": 0.05 },
        });
        map.addLayer({
          id: DUBAI_LAND_LINE,
          type: "line",
          source: DUBAI_LAND_SRC,
          paint: {
            "line-color": "#9333EA",
            "line-width": 1.5,
            "line-dasharray": [2, 2],
          },
        });
      } catch (e) {
        console.error("[dubai-land] load failed", e);
      }
    }

    // ── Dubai Golf City (DDA) ──────────────────────────────────────
    if (!map.getSource(DGC_SRC)) {
      try {
        const r = await fetch("/api/layers/dda/dubai-golf-city");
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        const data: GeoJSON.FeatureCollection = await r.json();
        map.addSource(DGC_SRC, { type: "geojson", data });
        map.addLayer({
          id: DGC_FILL,
          type: "fill",
          source: DGC_SRC,
          paint: { "fill-color": "#9333EA", "fill-opacity": 0.05 },
        });
        map.addLayer({
          id: DGC_LINE,
          type: "line",
          source: DGC_SRC,
          paint: {
            "line-color": "#9333EA",
            "line-width": 1.5,
            "line-dasharray": [2, 2],
          },
        });
      } catch (e) {
        console.error("[dubai-golf-city] load failed", e);
      }
    }

    // ── Meraas — Umm Al Sheif (DDA) ────────────────────────────────
    if (!map.getSource(MERAAS_UAS_SRC)) {
      try {
        const r = await fetch("/api/layers/dda/meraas-umm-al-sheif");
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        const data: GeoJSON.FeatureCollection = await r.json();
        map.addSource(MERAAS_UAS_SRC, { type: "geojson", data });
        map.addLayer({
          id: MERAAS_UAS_FILL,
          type: "fill",
          source: MERAAS_UAS_SRC,
          paint: { "fill-color": "#9333EA", "fill-opacity": 0.05 },
        });
        map.addLayer({
          id: MERAAS_UAS_LINE,
          type: "line",
          source: MERAAS_UAS_SRC,
          paint: {
            "line-color": "#9333EA",
            "line-width": 1.5,
            "line-dasharray": [2, 2],
          },
        });
      } catch (e) {
        console.error("[meraas-umm-al-sheif] load failed", e);
      }
    }

    // ── Al Mamzar Front (DDA) ──────────────────────────────────────
    if (!map.getSource(MAMZAR_SRC)) {
      try {
        const r = await fetch("/api/layers/dda/al-mamzar-front");
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        const data: GeoJSON.FeatureCollection = await r.json();
        map.addSource(MAMZAR_SRC, { type: "geojson", data });
        map.addLayer({
          id: MAMZAR_FILL,
          type: "fill",
          source: MAMZAR_SRC,
          paint: { "fill-color": "#9333EA", "fill-opacity": 0.05 },
        });
        map.addLayer({
          id: MAMZAR_LINE,
          type: "line",
          source: MAMZAR_SRC,
          paint: {
            "line-color": "#9333EA",
            "line-width": 1.5,
            "line-dasharray": [2, 2],
          },
        });
      } catch (e) {
        console.error("[al-mamzar-front] load failed", e);
      }
    }

    // ── Asmaran (DDA) ──────────────────────────────────────────────
    if (!map.getSource(ASMARAN_SRC)) {
      try {
        const r = await fetch("/api/layers/dda/asmaran");
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        const data: GeoJSON.FeatureCollection = await r.json();
        map.addSource(ASMARAN_SRC, { type: "geojson", data });
        map.addLayer({
          id: ASMARAN_FILL,
          type: "fill",
          source: ASMARAN_SRC,
          paint: { "fill-color": "#9333EA", "fill-opacity": 0.05 },
        });
        map.addLayer({
          id: ASMARAN_LINE,
          type: "line",
          source: ASMARAN_SRC,
          paint: {
            "line-color": "#9333EA",
            "line-width": 1.5,
            "line-dasharray": [2, 2],
          },
        });
      } catch (e) {
        console.error("[asmaran] load failed", e);
      }
    }

    // ── Jumeirah Bay (DDA) ─────────────────────────────────────────
    if (!map.getSource(JBAY_SRC)) {
      try {
        const r = await fetch("/api/layers/dda/jumeirah-bay");
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        const data: GeoJSON.FeatureCollection = await r.json();
        map.addSource(JBAY_SRC, { type: "geojson", data });
        map.addLayer({
          id: JBAY_FILL,
          type: "fill",
          source: JBAY_SRC,
          paint: { "fill-color": "#9333EA", "fill-opacity": 0.05 },
        });
        map.addLayer({
          id: JBAY_LINE,
          type: "line",
          source: JBAY_SRC,
          paint: {
            "line-color": "#9333EA",
            "line-width": 1.5,
            "line-dasharray": [2, 2],
          },
        });
      } catch (e) {
        console.error("[jumeirah-bay] load failed", e);
      }
    }

    // ── Reportage Village 1&2 (DDA) ────────────────────────────────
    if (!map.getSource(REPORTAGE_SRC)) {
      try {
        const r = await fetch("/api/layers/dda/reportage-village");
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        const data: GeoJSON.FeatureCollection = await r.json();
        map.addSource(REPORTAGE_SRC, { type: "geojson", data });
        map.addLayer({
          id: REPORTAGE_FILL,
          type: "fill",
          source: REPORTAGE_SRC,
          paint: { "fill-color": "#9333EA", "fill-opacity": 0.05 },
        });
        map.addLayer({
          id: REPORTAGE_LINE,
          type: "line",
          source: REPORTAGE_SRC,
          paint: {
            "line-color": "#9333EA",
            "line-width": 1.5,
            "line-dasharray": [2, 2],
          },
        });
      } catch (e) {
        console.error("[reportage-village] load failed", e);
      }
    }

    // ── Liwan (DDA) ────────────────────────────────────────────────
    if (!map.getSource(LIWAN_SRC)) {
      try {
        const r = await fetch("/api/layers/dda/liwan");
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        const data: GeoJSON.FeatureCollection = await r.json();
        map.addSource(LIWAN_SRC, { type: "geojson", data });
        map.addLayer({
          id: LIWAN_FILL,
          type: "fill",
          source: LIWAN_SRC,
          paint: { "fill-color": "#9333EA", "fill-opacity": 0.05 },
        });
        map.addLayer({
          id: LIWAN_LINE,
          type: "line",
          source: LIWAN_SRC,
          paint: {
            "line-color": "#9333EA",
            "line-width": 1.5,
            "line-dasharray": [2, 2],
          },
        });
      } catch (e) {
        console.error("[liwan] load failed", e);
      }
    }

    // ── Dubai Studio City (DDA) ────────────────────────────────────
    if (!map.getSource(DSTUDIO_SRC)) {
      try {
        const r = await fetch("/api/layers/dda/dubai-studio-city");
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        const data: GeoJSON.FeatureCollection = await r.json();
        map.addSource(DSTUDIO_SRC, { type: "geojson", data });
        map.addLayer({
          id: DSTUDIO_FILL,
          type: "fill",
          source: DSTUDIO_SRC,
          paint: { "fill-color": "#9333EA", "fill-opacity": 0.05 },
        });
        map.addLayer({
          id: DSTUDIO_LINE,
          type: "line",
          source: DSTUDIO_SRC,
          paint: {
            "line-color": "#9333EA",
            "line-width": 1.5,
            "line-dasharray": [2, 2],
          },
        });
      } catch (e) {
        console.error("[dubai-studio-city] load failed", e);
      }
    }

    // ── Liwan 2 (DDA) ──────────────────────────────────────────────
    if (!map.getSource(LIWAN2_SRC)) {
      try {
        const r = await fetch("/api/layers/dda/liwan-2");
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        const data: GeoJSON.FeatureCollection = await r.json();
        map.addSource(LIWAN2_SRC, { type: "geojson", data });
        map.addLayer({
          id: LIWAN2_FILL,
          type: "fill",
          source: LIWAN2_SRC,
          paint: { "fill-color": "#9333EA", "fill-opacity": 0.05 },
        });
        map.addLayer({
          id: LIWAN2_LINE,
          type: "line",
          source: LIWAN2_SRC,
          paint: {
            "line-color": "#9333EA",
            "line-width": 1.5,
            "line-dasharray": [2, 2],
          },
        });
      } catch (e) {
        console.error("[liwan-2] load failed", e);
      }
    }

    // ── Naia Island (DDA) ──────────────────────────────────────────
    if (!map.getSource(NAIA_SRC)) {
      try {
        const r = await fetch("/api/layers/dda/naia-island");
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        const data: GeoJSON.FeatureCollection = await r.json();
        map.addSource(NAIA_SRC, { type: "geojson", data });
        map.addLayer({
          id: NAIA_FILL,
          type: "fill",
          source: NAIA_SRC,
          paint: { "fill-color": "#9333EA", "fill-opacity": 0.05 },
        });
        map.addLayer({
          id: NAIA_LINE,
          type: "line",
          source: NAIA_SRC,
          paint: {
            "line-color": "#9333EA",
            "line-width": 1.5,
            "line-dasharray": [2, 2],
          },
        });
      } catch (e) {
        console.error("[naia-island] load failed", e);
      }
    }

    // ── Ardh Community (DDA) ───────────────────────────────────────
    if (!map.getSource(ARDH_SRC)) {
      try {
        const r = await fetch("/api/layers/dda/ardh-community");
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        const data: GeoJSON.FeatureCollection = await r.json();
        map.addSource(ARDH_SRC, { type: "geojson", data });
        map.addLayer({
          id: ARDH_FILL,
          type: "fill",
          source: ARDH_SRC,
          paint: { "fill-color": "#9333EA", "fill-opacity": 0.05 },
        });
        map.addLayer({
          id: ARDH_LINE,
          type: "line",
          source: ARDH_SRC,
          paint: {
            "line-color": "#9333EA",
            "line-width": 1.5,
            "line-dasharray": [2, 2],
          },
        });
      } catch (e) {
        console.error("[ardh-community] load failed", e);
      }
    }

    // ── Tijara Town (DDA) ──────────────────────────────────────────
    if (!map.getSource(TIJARA_SRC)) {
      try {
        const r = await fetch("/api/layers/dda/tijara-town");
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        const data: GeoJSON.FeatureCollection = await r.json();
        map.addSource(TIJARA_SRC, { type: "geojson", data });
        map.addLayer({
          id: TIJARA_FILL,
          type: "fill",
          source: TIJARA_SRC,
          paint: { "fill-color": "#9333EA", "fill-opacity": 0.05 },
        });
        map.addLayer({
          id: TIJARA_LINE,
          type: "line",
          source: TIJARA_SRC,
          paint: {
            "line-color": "#9333EA",
            "line-width": 1.5,
            "line-dasharray": [2, 2],
          },
        });
      } catch (e) {
        console.error("[tijara-town] load failed", e);
      }
    }

    // ── Warsan First Development (DDA) ─────────────────────────────
    if (!map.getSource(WARSAN_SRC)) {
      try {
        const r = await fetch("/api/layers/dda/warsan-first");
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        const data: GeoJSON.FeatureCollection = await r.json();
        map.addSource(WARSAN_SRC, { type: "geojson", data });
        map.addLayer({
          id: WARSAN_FILL,
          type: "fill",
          source: WARSAN_SRC,
          paint: { "fill-color": "#9333EA", "fill-opacity": 0.05 },
        });
        map.addLayer({
          id: WARSAN_LINE,
          type: "line",
          source: WARSAN_SRC,
          paint: {
            "line-color": "#9333EA",
            "line-width": 1.5,
            "line-dasharray": [2, 2],
          },
        });
      } catch (e) {
        console.error("[warsan-first] load failed", e);
      }
    }

    // ── Meraas — Mirdif (DDA) ──────────────────────────────────────
    if (!map.getSource(MERAAS_MIRDIF_SRC)) {
      try {
        const r = await fetch("/api/layers/dda/meraas-mirdif");
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        const data: GeoJSON.FeatureCollection = await r.json();
        map.addSource(MERAAS_MIRDIF_SRC, { type: "geojson", data });
        map.addLayer({
          id: MERAAS_MIRDIF_FILL,
          type: "fill",
          source: MERAAS_MIRDIF_SRC,
          paint: { "fill-color": "#9333EA", "fill-opacity": 0.05 },
        });
        map.addLayer({
          id: MERAAS_MIRDIF_LINE,
          type: "line",
          source: MERAAS_MIRDIF_SRC,
          paint: {
            "line-color": "#9333EA",
            "line-width": 1.5,
            "line-dasharray": [2, 2],
          },
        });
      } catch (e) {
        console.error("[meraas-mirdif] load failed", e);
      }
    }

    // ── Al Habtoor Polo (DDA) ──────────────────────────────────────
    if (!map.getSource(HABTOOR_SRC)) {
      try {
        const r = await fetch("/api/layers/dda/al-habtoor-polo");
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        const data: GeoJSON.FeatureCollection = await r.json();
        map.addSource(HABTOOR_SRC, { type: "geojson", data });
        map.addLayer({
          id: HABTOOR_FILL,
          type: "fill",
          source: HABTOOR_SRC,
          paint: { "fill-color": "#9333EA", "fill-opacity": 0.05 },
        });
        map.addLayer({
          id: HABTOOR_LINE,
          type: "line",
          source: HABTOOR_SRC,
          paint: {
            "line-color": "#9333EA",
            "line-width": 1.5,
            "line-dasharray": [2, 2],
          },
        });
      } catch (e) {
        console.error("[al-habtoor-polo] load failed", e);
      }
    }

    // ── Meraas — Umm Amaraa (DDA) ──────────────────────────────────
    if (!map.getSource(MERAAS_UMA_SRC)) {
      try {
        const r = await fetch("/api/layers/dda/meraas-umm-amaraa");
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        const data: GeoJSON.FeatureCollection = await r.json();
        map.addSource(MERAAS_UMA_SRC, { type: "geojson", data });
        map.addLayer({
          id: MERAAS_UMA_FILL,
          type: "fill",
          source: MERAAS_UMA_SRC,
          paint: { "fill-color": "#9333EA", "fill-opacity": 0.05 },
        });
        map.addLayer({
          id: MERAAS_UMA_LINE,
          type: "line",
          source: MERAAS_UMA_SRC,
          paint: {
            "line-color": "#9333EA",
            "line-width": 1.5,
            "line-dasharray": [2, 2],
          },
        });
      } catch (e) {
        console.error("[meraas-umm-amaraa] load failed", e);
      }
    }

    // ── Dubai Design District (DDA) ────────────────────────────────
    if (!map.getSource(D3_DDA_SRC)) {
      try {
        const r = await fetch("/api/layers/dda/d3");
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        const data: GeoJSON.FeatureCollection = await r.json();
        map.addSource(D3_DDA_SRC, { type: "geojson", data });
        map.addLayer({
          id: D3_DDA_FILL,
          type: "fill",
          source: D3_DDA_SRC,
          paint: { "fill-color": "#9333EA", "fill-opacity": 0.05 },
        });
        map.addLayer({
          id: D3_DDA_LINE,
          type: "line",
          source: D3_DDA_SRC,
          paint: {
            "line-color": "#9333EA",
            "line-width": 1.5,
            "line-dasharray": [2, 2],
          },
        });
      } catch (e) {
        console.error("[d3] load failed", e);
      }
    }

    // ── Al Khail Gate (DDA) ────────────────────────────────────────
    if (!map.getSource(KHAIL_SRC)) {
      try {
        const r = await fetch("/api/layers/dda/al-khail-gate");
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        const data: GeoJSON.FeatureCollection = await r.json();
        map.addSource(KHAIL_SRC, { type: "geojson", data });
        map.addLayer({
          id: KHAIL_FILL,
          type: "fill",
          source: KHAIL_SRC,
          paint: { "fill-color": "#9333EA", "fill-opacity": 0.05 },
        });
        map.addLayer({
          id: KHAIL_LINE,
          type: "line",
          source: KHAIL_SRC,
          paint: {
            "line-color": "#9333EA",
            "line-width": 1.5,
            "line-dasharray": [2, 2],
          },
        });
      } catch (e) {
        console.error("[al-khail-gate] load failed", e);
      }
    }

    // ── Site A (DDA) ───────────────────────────────────────────────
    if (!map.getSource(SITE_A_SRC)) {
      try {
        const r = await fetch("/api/layers/dda/site-a");
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        const data: GeoJSON.FeatureCollection = await r.json();
        map.addSource(SITE_A_SRC, { type: "geojson", data });
        map.addLayer({
          id: SITE_A_FILL,
          type: "fill",
          source: SITE_A_SRC,
          paint: { "fill-color": "#9333EA", "fill-opacity": 0.05 },
        });
        map.addLayer({
          id: SITE_A_LINE,
          type: "line",
          source: SITE_A_SRC,
          paint: {
            "line-color": "#9333EA",
            "line-width": 1.5,
            "line-dasharray": [2, 2],
          },
        });
      } catch (e) {
        console.error("[site-a] load failed", e);
      }
    }

    // ── Rukan (DDA) ────────────────────────────────────────────────
    if (!map.getSource(RUKAN_SRC)) {
      try {
        const r = await fetch("/api/layers/dda/rukan");
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        const data: GeoJSON.FeatureCollection = await r.json();
        map.addSource(RUKAN_SRC, { type: "geojson", data });
        map.addLayer({
          id: RUKAN_FILL,
          type: "fill",
          source: RUKAN_SRC,
          paint: { "fill-color": "#9333EA", "fill-opacity": 0.05 },
        });
        map.addLayer({
          id: RUKAN_LINE,
          type: "line",
          source: RUKAN_SRC,
          paint: {
            "line-color": "#9333EA",
            "line-width": 1.5,
            "line-dasharray": [2, 2],
          },
        });
      } catch (e) {
        console.error("[rukan] load failed", e);
      }
    }

    // ── California Residence (DDA) ─────────────────────────────────
    if (!map.getSource(CALI_SRC)) {
      try {
        const r = await fetch("/api/layers/dda/california-residence");
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        const data: GeoJSON.FeatureCollection = await r.json();
        map.addSource(CALI_SRC, { type: "geojson", data });
        map.addLayer({
          id: CALI_FILL,
          type: "fill",
          source: CALI_SRC,
          paint: { "fill-color": "#9333EA", "fill-opacity": 0.05 },
        });
        map.addLayer({
          id: CALI_LINE,
          type: "line",
          source: CALI_SRC,
          paint: {
            "line-color": "#9333EA",
            "line-width": 1.5,
            "line-dasharray": [2, 2],
          },
        });
      } catch (e) {
        console.error("[california-residence] load failed", e);
      }
    }

    // ── Meraas — Nadd Al Hamar (DDA) ───────────────────────────────
    if (!map.getSource(MERAAS_NAH_SRC)) {
      try {
        const r = await fetch("/api/layers/dda/meraas-nadd-al-hamar");
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        const data: GeoJSON.FeatureCollection = await r.json();
        map.addSource(MERAAS_NAH_SRC, { type: "geojson", data });
        map.addLayer({
          id: MERAAS_NAH_FILL,
          type: "fill",
          source: MERAAS_NAH_SRC,
          paint: { "fill-color": "#9333EA", "fill-opacity": 0.05 },
        });
        map.addLayer({
          id: MERAAS_NAH_LINE,
          type: "line",
          source: MERAAS_NAH_SRC,
          paint: {
            "line-color": "#9333EA",
            "line-width": 1.5,
            "line-dasharray": [2, 2],
          },
        });
      } catch (e) {
        console.error("[meraas-nadd-al-hamar] load failed", e);
      }
    }

    // ── Palmarosa (DDA) ────────────────────────────────────────────
    if (!map.getSource(PALMAROSA_SRC)) {
      try {
        const r = await fetch("/api/layers/dda/palmarosa");
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        const data: GeoJSON.FeatureCollection = await r.json();
        map.addSource(PALMAROSA_SRC, { type: "geojson", data });
        map.addLayer({
          id: PALMAROSA_FILL,
          type: "fill",
          source: PALMAROSA_SRC,
          paint: { "fill-color": "#9333EA", "fill-opacity": 0.05 },
        });
        map.addLayer({
          id: PALMAROSA_LINE,
          type: "line",
          source: PALMAROSA_SRC,
          paint: {
            "line-color": "#9333EA",
            "line-width": 1.5,
            "line-dasharray": [2, 2],
          },
        });
      } catch (e) {
        console.error("[palmarosa] load failed", e);
      }
    }

    // ── Dubai Int'l Academic City (DDA) ────────────────────────────
    if (!map.getSource(DIAC_SRC)) {
      try {
        const r = await fetch("/api/layers/dda/diac");
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        const data: GeoJSON.FeatureCollection = await r.json();
        map.addSource(DIAC_SRC, { type: "geojson", data });
        map.addLayer({
          id: DIAC_FILL,
          type: "fill",
          source: DIAC_SRC,
          paint: { "fill-color": "#9333EA", "fill-opacity": 0.05 },
        });
        map.addLayer({
          id: DIAC_LINE,
          type: "line",
          source: DIAC_SRC,
          paint: {
            "line-color": "#9333EA",
            "line-width": 1.5,
            "line-dasharray": [2, 2],
          },
        });
      } catch (e) {
        console.error("[diac] load failed", e);
      }
    }

    // ── Al Waha (DDA) ──────────────────────────────────────────────
    if (!map.getSource(WAHA_SRC)) {
      try {
        const r = await fetch("/api/layers/dda/al-waha");
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        const data: GeoJSON.FeatureCollection = await r.json();
        map.addSource(WAHA_SRC, { type: "geojson", data });
        map.addLayer({
          id: WAHA_FILL,
          type: "fill",
          source: WAHA_SRC,
          paint: { "fill-color": "#9333EA", "fill-opacity": 0.05 },
        });
        map.addLayer({
          id: WAHA_LINE,
          type: "line",
          source: WAHA_SRC,
          paint: {
            "line-color": "#9333EA",
            "line-width": 1.5,
            "line-dasharray": [2, 2],
          },
        });
      } catch (e) {
        console.error("[al-waha] load failed", e);
      }
    }

    // ── Dubai Harbour (DDA) ────────────────────────────────────────
    if (!map.getSource(HARBOUR_SRC)) {
      try {
        const r = await fetch("/api/layers/dda/dubai-harbour");
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        const data: GeoJSON.FeatureCollection = await r.json();
        map.addSource(HARBOUR_SRC, { type: "geojson", data });
        map.addLayer({
          id: HARBOUR_FILL,
          type: "fill",
          source: HARBOUR_SRC,
          paint: { "fill-color": "#9333EA", "fill-opacity": 0.05 },
        });
        map.addLayer({
          id: HARBOUR_LINE,
          type: "line",
          source: HARBOUR_SRC,
          paint: {
            "line-color": "#9333EA",
            "line-width": 1.5,
            "line-dasharray": [2, 2],
          },
        });
      } catch (e) {
        console.error("[dubai-harbour] load failed", e);
      }
    }

    // ── Al Khawaneej Labour City (DDA) ─────────────────────────────
    if (!map.getSource(KLABOUR_SRC)) {
      try {
        const r = await fetch("/api/layers/dda/khawaneej-labour");
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        const data: GeoJSON.FeatureCollection = await r.json();
        map.addSource(KLABOUR_SRC, { type: "geojson", data });
        map.addLayer({
          id: KLABOUR_FILL,
          type: "fill",
          source: KLABOUR_SRC,
          paint: { "fill-color": "#9333EA", "fill-opacity": 0.05 },
        });
        map.addLayer({
          id: KLABOUR_LINE,
          type: "line",
          source: KLABOUR_SRC,
          paint: {
            "line-color": "#9333EA",
            "line-width": 1.5,
            "line-dasharray": [2, 2],
          },
        });
      } catch (e) {
        console.error("[khawaneej-labour] load failed", e);
      }
    }

    // ── Al Warsan Industrial (DDA) ─────────────────────────────────
    if (!map.getSource(WIND_SRC)) {
      try {
        const r = await fetch("/api/layers/dda/warsan-industrial");
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        const data: GeoJSON.FeatureCollection = await r.json();
        map.addSource(WIND_SRC, { type: "geojson", data });
        map.addLayer({
          id: WIND_FILL,
          type: "fill",
          source: WIND_SRC,
          paint: { "fill-color": "#9333EA", "fill-opacity": 0.05 },
        });
        map.addLayer({
          id: WIND_LINE,
          type: "line",
          source: WIND_SRC,
          paint: {
            "line-color": "#9333EA",
            "line-width": 1.5,
            "line-dasharray": [2, 2],
          },
        });
      } catch (e) {
        console.error("[warsan-industrial] load failed", e);
      }
    }

    // ── Dubai Lifestyle City (DDA) ─────────────────────────────────
    if (!map.getSource(DLC_SRC)) {
      try {
        const r = await fetch("/api/layers/dda/dubai-lifestyle-city");
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        const data: GeoJSON.FeatureCollection = await r.json();
        map.addSource(DLC_SRC, { type: "geojson", data });
        map.addLayer({
          id: DLC_FILL,
          type: "fill",
          source: DLC_SRC,
          paint: { "fill-color": "#9333EA", "fill-opacity": 0.05 },
        });
        map.addLayer({
          id: DLC_LINE,
          type: "line",
          source: DLC_SRC,
          paint: {
            "line-color": "#9333EA",
            "line-width": 1.5,
            "line-dasharray": [2, 2],
          },
        });
      } catch (e) {
        console.error("[dubai-lifestyle-city] load failed", e);
      }
    }

    // ── Sufouh Gardens (DDA) ───────────────────────────────────────
    if (!map.getSource(SUFOUH_SRC)) {
      try {
        const r = await fetch("/api/layers/dda/sufouh-gardens");
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        const data: GeoJSON.FeatureCollection = await r.json();
        map.addSource(SUFOUH_SRC, { type: "geojson", data });
        map.addLayer({
          id: SUFOUH_FILL,
          type: "fill",
          source: SUFOUH_SRC,
          paint: { "fill-color": "#9333EA", "fill-opacity": 0.05 },
        });
        map.addLayer({
          id: SUFOUH_LINE,
          type: "line",
          source: SUFOUH_SRC,
          paint: {
            "line-color": "#9333EA",
            "line-width": 1.5,
            "line-dasharray": [2, 2],
          },
        });
      } catch (e) {
        console.error("[sufouh-gardens] load failed", e);
      }
    }

    // ── Motor City (DDA) ───────────────────────────────────────────
    if (!map.getSource(MOTOR_SRC)) {
      try {
        const r = await fetch("/api/layers/dda/motor-city");
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        const data: GeoJSON.FeatureCollection = await r.json();
        map.addSource(MOTOR_SRC, { type: "geojson", data });
        map.addLayer({
          id: MOTOR_FILL,
          type: "fill",
          source: MOTOR_SRC,
          paint: { "fill-color": "#9333EA", "fill-opacity": 0.05 },
        });
        map.addLayer({
          id: MOTOR_LINE,
          type: "line",
          source: MOTOR_SRC,
          paint: {
            "line-color": "#9333EA",
            "line-width": 1.5,
            "line-dasharray": [2, 2],
          },
        });
      } catch (e) {
        console.error("[motor-city] load failed", e);
      }
    }

    // ── Taormina Village 1 (DDA) ───────────────────────────────────
    if (!map.getSource(TAOR1_SRC)) {
      try {
        const r = await fetch("/api/layers/dda/taormina-1");
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        const data: GeoJSON.FeatureCollection = await r.json();
        map.addSource(TAOR1_SRC, { type: "geojson", data });
        map.addLayer({
          id: TAOR1_FILL,
          type: "fill",
          source: TAOR1_SRC,
          paint: { "fill-color": "#9333EA", "fill-opacity": 0.05 },
        });
        map.addLayer({
          id: TAOR1_LINE,
          type: "line",
          source: TAOR1_SRC,
          paint: {
            "line-color": "#9333EA",
            "line-width": 1.5,
            "line-dasharray": [2, 2],
          },
        });
      } catch (e) {
        console.error("[taormina-1] load failed", e);
      }
    }

    // ── Dubai Parks (DDA) ──────────────────────────────────────────
    if (!map.getSource(DPARKS_SRC)) {
      try {
        const r = await fetch("/api/layers/dda/dubai-parks");
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        const data: GeoJSON.FeatureCollection = await r.json();
        map.addSource(DPARKS_SRC, { type: "geojson", data });
        map.addLayer({
          id: DPARKS_FILL,
          type: "fill",
          source: DPARKS_SRC,
          paint: { "fill-color": "#9333EA", "fill-opacity": 0.05 },
        });
        map.addLayer({
          id: DPARKS_LINE,
          type: "line",
          source: DPARKS_SRC,
          paint: {
            "line-color": "#9333EA",
            "line-width": 1.5,
            "line-dasharray": [2, 2],
          },
        });
      } catch (e) {
        console.error("[dubai-parks] load failed", e);
      }
    }

    // ── City Walk (DDA) ────────────────────────────────────────────
    if (!map.getSource(CWALK_SRC)) {
      try {
        const r = await fetch("/api/layers/dda/city-walk");
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        const data: GeoJSON.FeatureCollection = await r.json();
        map.addSource(CWALK_SRC, { type: "geojson", data });
        map.addLayer({
          id: CWALK_FILL,
          type: "fill",
          source: CWALK_SRC,
          paint: { "fill-color": "#9333EA", "fill-opacity": 0.05 },
        });
        map.addLayer({
          id: CWALK_LINE,
          type: "line",
          source: CWALK_SRC,
          paint: {
            "line-color": "#9333EA",
            "line-width": 1.5,
            "line-dasharray": [2, 2],
          },
        });
      } catch (e) {
        console.error("[city-walk] load failed", e);
      }
    }

    // ── Arabian Ranches Polo Club (DDA) ────────────────────────────
    if (!map.getSource(ARPOLO_SRC)) {
      try {
        const r = await fetch("/api/layers/dda/ar-polo");
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        const data: GeoJSON.FeatureCollection = await r.json();
        map.addSource(ARPOLO_SRC, { type: "geojson", data });
        map.addLayer({
          id: ARPOLO_FILL,
          type: "fill",
          source: ARPOLO_SRC,
          paint: { "fill-color": "#9333EA", "fill-opacity": 0.05 },
        });
        map.addLayer({
          id: ARPOLO_LINE,
          type: "line",
          source: ARPOLO_SRC,
          paint: {
            "line-color": "#9333EA",
            "line-width": 1.5,
            "line-dasharray": [2, 2],
          },
        });
      } catch (e) {
        console.error("[ar-polo] load failed", e);
      }
    }

    // ── Al Barsha Third Development (DDA) ──────────────────────────
    if (!map.getSource(BARSHA3_SRC)) {
      try {
        const r = await fetch("/api/layers/dda/barsha-third");
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        const data: GeoJSON.FeatureCollection = await r.json();
        map.addSource(BARSHA3_SRC, { type: "geojson", data });
        map.addLayer({
          id: BARSHA3_FILL,
          type: "fill",
          source: BARSHA3_SRC,
          paint: { "fill-color": "#9333EA", "fill-opacity": 0.05 },
        });
        map.addLayer({
          id: BARSHA3_LINE,
          type: "line",
          source: BARSHA3_SRC,
          paint: {
            "line-color": "#9333EA",
            "line-width": 1.5,
            "line-dasharray": [2, 2],
          },
        });
      } catch (e) {
        console.error("[barsha-third] load failed", e);
      }
    }

    // ── Meraas — Al Barsha Second (DDA) ────────────────────────────
    if (!map.getSource(MERAAS_B2_SRC)) {
      try {
        const r = await fetch("/api/layers/dda/meraas-barsha-2");
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        const data: GeoJSON.FeatureCollection = await r.json();
        map.addSource(MERAAS_B2_SRC, { type: "geojson", data });
        map.addLayer({
          id: MERAAS_B2_FILL,
          type: "fill",
          source: MERAAS_B2_SRC,
          paint: { "fill-color": "#9333EA", "fill-opacity": 0.05 },
        });
        map.addLayer({
          id: MERAAS_B2_LINE,
          type: "line",
          source: MERAAS_B2_SRC,
          paint: {
            "line-color": "#9333EA",
            "line-width": 1.5,
            "line-dasharray": [2, 2],
          },
        });
      } catch (e) {
        console.error("[meraas-barsha-2] load failed", e);
      }
    }

    // ── Dubai Outsource City (DDA) ─────────────────────────────────
    if (!map.getSource(DOC_SRC)) {
      try {
        const r = await fetch("/api/layers/dda/dubai-outsource-city");
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        const data: GeoJSON.FeatureCollection = await r.json();
        map.addSource(DOC_SRC, { type: "geojson", data });
        map.addLayer({
          id: DOC_FILL,
          type: "fill",
          source: DOC_SRC,
          paint: { "fill-color": "#9333EA", "fill-opacity": 0.05 },
        });
        map.addLayer({
          id: DOC_LINE,
          type: "line",
          source: DOC_SRC,
          paint: {
            "line-color": "#9333EA",
            "line-width": 1.5,
            "line-dasharray": [2, 2],
          },
        });
      } catch (e) {
        console.error("[dubai-outsource-city] load failed", e);
      }
    }

    // ── Burj Khalifa District (DDA) ────────────────────────────────
    if (!map.getSource(BURJ_SRC)) {
      try {
        const r = await fetch("/api/layers/dda/burj-khalifa");
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        const data: GeoJSON.FeatureCollection = await r.json();
        map.addSource(BURJ_SRC, { type: "geojson", data });
        map.addLayer({
          id: BURJ_FILL,
          type: "fill",
          source: BURJ_SRC,
          paint: { "fill-color": "#9333EA", "fill-opacity": 0.05 },
        });
        map.addLayer({
          id: BURJ_LINE,
          type: "line",
          source: BURJ_SRC,
          paint: {
            "line-color": "#9333EA",
            "line-width": 1.5,
            "line-dasharray": [2, 2],
          },
        });
      } catch (e) {
        console.error("[burj-khalifa] load failed", e);
      }
    }

    // ── Ghaf Woods (DDA) ───────────────────────────────────────────
    if (!map.getSource(GHAF_SRC)) {
      try {
        const r = await fetch("/api/layers/dda/ghaf-woods");
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        const data: GeoJSON.FeatureCollection = await r.json();
        map.addSource(GHAF_SRC, { type: "geojson", data });
        map.addLayer({
          id: GHAF_FILL,
          type: "fill",
          source: GHAF_SRC,
          paint: { "fill-color": "#9333EA", "fill-opacity": 0.05 },
        });
        map.addLayer({
          id: GHAF_LINE,
          type: "line",
          source: GHAF_SRC,
          paint: {
            "line-color": "#9333EA",
            "line-width": 1.5,
            "line-dasharray": [2, 2],
          },
        });
      } catch (e) {
        console.error("[ghaf-woods] load failed", e);
      }
    }

    // ── Taormina Village 2 (DDA) ───────────────────────────────────
    if (!map.getSource(TAOR2_SRC)) {
      try {
        const r = await fetch("/api/layers/dda/taormina-2");
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        const data: GeoJSON.FeatureCollection = await r.json();
        map.addSource(TAOR2_SRC, { type: "geojson", data });
        map.addLayer({
          id: TAOR2_FILL,
          type: "fill",
          source: TAOR2_SRC,
          paint: { "fill-color": "#9333EA", "fill-opacity": 0.05 },
        });
        map.addLayer({
          id: TAOR2_LINE,
          type: "line",
          source: TAOR2_SRC,
          paint: {
            "line-color": "#9333EA",
            "line-width": 1.5,
            "line-dasharray": [2, 2],
          },
        });
      } catch (e) {
        console.error("[taormina-2] load failed", e);
      }
    }

    // ── Bianca (DDA) ───────────────────────────────────────────────
    if (!map.getSource(BIANCA_SRC)) {
      try {
        const r = await fetch("/api/layers/dda/bianca");
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        const data: GeoJSON.FeatureCollection = await r.json();
        map.addSource(BIANCA_SRC, { type: "geojson", data });
        map.addLayer({
          id: BIANCA_FILL,
          type: "fill",
          source: BIANCA_SRC,
          paint: { "fill-color": "#9333EA", "fill-opacity": 0.05 },
        });
        map.addLayer({
          id: BIANCA_LINE,
          type: "line",
          source: BIANCA_SRC,
          paint: {
            "line-color": "#9333EA",
            "line-width": 1.5,
            "line-dasharray": [2, 2],
          },
        });
      } catch (e) {
        console.error("[bianca] load failed", e);
      }
    }

    // ── Madinat Jumeirah Living (DDA) ──────────────────────────────
    if (!map.getSource(MJL_SRC)) {
      try {
        const r = await fetch("/api/layers/dda/mjl");
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        const data: GeoJSON.FeatureCollection = await r.json();
        map.addSource(MJL_SRC, { type: "geojson", data });
        map.addLayer({
          id: MJL_FILL,
          type: "fill",
          source: MJL_SRC,
          paint: { "fill-color": "#9333EA", "fill-opacity": 0.05 },
        });
        map.addLayer({
          id: MJL_LINE,
          type: "line",
          source: MJL_SRC,
          paint: {
            "line-color": "#9333EA",
            "line-width": 1.5,
            "line-dasharray": [2, 2],
          },
        });
      } catch (e) {
        console.error("[mjl] load failed", e);
      }
    }

    // ── DH — Al Khawaneej First (DDA) ──────────────────────────────
    if (!map.getSource(DHK1_SRC)) {
      try {
        const r = await fetch("/api/layers/dda/dh-khawaneej-1");
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        const data: GeoJSON.FeatureCollection = await r.json();
        map.addSource(DHK1_SRC, { type: "geojson", data });
        map.addLayer({
          id: DHK1_FILL,
          type: "fill",
          source: DHK1_SRC,
          paint: { "fill-color": "#9333EA", "fill-opacity": 0.05 },
        });
        map.addLayer({
          id: DHK1_LINE,
          type: "line",
          source: DHK1_SRC,
          paint: {
            "line-color": "#9333EA",
            "line-width": 1.5,
            "line-dasharray": [2, 2],
          },
        });
      } catch (e) {
        console.error("[dh-khawaneej-1] load failed", e);
      }
    }

    // ── Remraam (DDA) ──────────────────────────────────────────────
    if (!map.getSource(REMRAAM_SRC)) {
      try {
        const r = await fetch("/api/layers/dda/remraam");
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        const data: GeoJSON.FeatureCollection = await r.json();
        map.addSource(REMRAAM_SRC, { type: "geojson", data });
        map.addLayer({
          id: REMRAAM_FILL,
          type: "fill",
          source: REMRAAM_SRC,
          paint: { "fill-color": "#9333EA", "fill-opacity": 0.05 },
        });
        map.addLayer({
          id: REMRAAM_LINE,
          type: "line",
          source: REMRAAM_SRC,
          paint: {
            "line-color": "#9333EA",
            "line-width": 1.5,
            "line-dasharray": [2, 2],
          },
        });
      } catch (e) {
        console.error("[remraam] load failed", e);
      }
    }

    // ── The Echo Plex City (DDA) ───────────────────────────────────
    if (!map.getSource(ECHO_SRC)) {
      try {
        const r = await fetch("/api/layers/dda/echo-plex");
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        const data: GeoJSON.FeatureCollection = await r.json();
        map.addSource(ECHO_SRC, { type: "geojson", data });
        map.addLayer({
          id: ECHO_FILL,
          type: "fill",
          source: ECHO_SRC,
          paint: { "fill-color": "#9333EA", "fill-opacity": 0.05 },
        });
        map.addLayer({
          id: ECHO_LINE,
          type: "line",
          source: ECHO_SRC,
          paint: {
            "line-color": "#9333EA",
            "line-width": 1.5,
            "line-dasharray": [2, 2],
          },
        });
      } catch (e) {
        console.error("[echo-plex] load failed", e);
      }
    }

    // ── Sustainable City (DDA) ─────────────────────────────────────
    if (!map.getSource(SUSCITY_SRC)) {
      try {
        const r = await fetch("/api/layers/dda/sustainable-city");
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        const data: GeoJSON.FeatureCollection = await r.json();
        map.addSource(SUSCITY_SRC, { type: "geojson", data });
        map.addLayer({
          id: SUSCITY_FILL,
          type: "fill",
          source: SUSCITY_SRC,
          paint: { "fill-color": "#9333EA", "fill-opacity": 0.05 },
        });
        map.addLayer({
          id: SUSCITY_LINE,
          type: "line",
          source: SUSCITY_SRC,
          paint: {
            "line-color": "#9333EA",
            "line-width": 1.5,
            "line-dasharray": [2, 2],
          },
        });
      } catch (e) {
        console.error("[sustainable-city] load failed", e);
      }
    }

    // ── Jumeirah Beach Residence (DDA) ─────────────────────────────
    if (!map.getSource(JBR_SRC)) {
      try {
        const r = await fetch("/api/layers/dda/jbr");
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        const data: GeoJSON.FeatureCollection = await r.json();
        map.addSource(JBR_SRC, { type: "geojson", data });
        map.addLayer({
          id: JBR_FILL,
          type: "fill",
          source: JBR_SRC,
          paint: { "fill-color": "#9333EA", "fill-opacity": 0.05 },
        });
        map.addLayer({
          id: JBR_LINE,
          type: "line",
          source: JBR_SRC,
          paint: {
            "line-color": "#9333EA",
            "line-width": 1.5,
            "line-dasharray": [2, 2],
          },
        });
      } catch (e) {
        console.error("[jbr] load failed", e);
      }
    }

    // ── Ghoroob (DDA) ──────────────────────────────────────────────
    if (!map.getSource(GHOROOB_SRC)) {
      try {
        const r = await fetch("/api/layers/dda/ghoroob");
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        const data: GeoJSON.FeatureCollection = await r.json();
        map.addSource(GHOROOB_SRC, { type: "geojson", data });
        map.addLayer({
          id: GHOROOB_FILL,
          type: "fill",
          source: GHOROOB_SRC,
          paint: { "fill-color": "#9333EA", "fill-opacity": 0.05 },
        });
        map.addLayer({
          id: GHOROOB_LINE,
          type: "line",
          source: GHOROOB_SRC,
          paint: {
            "line-color": "#9333EA",
            "line-width": 1.5,
            "line-dasharray": [2, 2],
          },
        });
      } catch (e) {
        console.error("[ghoroob] load failed", e);
      }
    }

    // ── DP — Al Barsha South 3rd (DDA) ─────────────────────────────
    if (!map.getSource(DPB3_SRC)) {
      try {
        const r = await fetch("/api/layers/dda/dp-barsha-south-3");
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        const data: GeoJSON.FeatureCollection = await r.json();
        map.addSource(DPB3_SRC, { type: "geojson", data });
        map.addLayer({
          id: DPB3_FILL,
          type: "fill",
          source: DPB3_SRC,
          paint: { "fill-color": "#9333EA", "fill-opacity": 0.05 },
        });
        map.addLayer({
          id: DPB3_LINE,
          type: "line",
          source: DPB3_SRC,
          paint: {
            "line-color": "#9333EA",
            "line-width": 1.5,
            "line-dasharray": [2, 2],
          },
        });
      } catch (e) {
        console.error("[dp-barsha-south-3] load failed", e);
      }
    }

    // ── Marsa Al Arab (DDA) ────────────────────────────────────────
    if (!map.getSource(MARSA_SRC)) {
      try {
        const r = await fetch("/api/layers/dda/marsa-al-arab");
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        const data: GeoJSON.FeatureCollection = await r.json();
        map.addSource(MARSA_SRC, { type: "geojson", data });
        map.addLayer({
          id: MARSA_FILL,
          type: "fill",
          source: MARSA_SRC,
          paint: { "fill-color": "#9333EA", "fill-opacity": 0.05 },
        });
        map.addLayer({
          id: MARSA_LINE,
          type: "line",
          source: MARSA_SRC,
          paint: {
            "line-color": "#9333EA",
            "line-width": 1.5,
            "line-dasharray": [2, 2],
          },
        });
      } catch (e) {
        console.error("[marsa-al-arab] load failed", e);
      }
    }

    // ── Bluewaters (DDA) ───────────────────────────────────────────
    if (!map.getSource(BLUE_SRC)) {
      try {
        const r = await fetch("/api/layers/dda/bluewaters");
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        const data: GeoJSON.FeatureCollection = await r.json();
        map.addSource(BLUE_SRC, { type: "geojson", data });
        map.addLayer({
          id: BLUE_FILL,
          type: "fill",
          source: BLUE_SRC,
          paint: { "fill-color": "#9333EA", "fill-opacity": 0.05 },
        });
        map.addLayer({
          id: BLUE_LINE,
          type: "line",
          source: BLUE_SRC,
          paint: {
            "line-color": "#9333EA",
            "line-width": 1.5,
            "line-dasharray": [2, 2],
          },
        });
      } catch (e) {
        console.error("[bluewaters] load failed", e);
      }
    }

    // ── Site D (DDA) ───────────────────────────────────────────────
    if (!map.getSource(SITE_D_SRC)) {
      try {
        const r = await fetch("/api/layers/dda/site-d");
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        const data: GeoJSON.FeatureCollection = await r.json();
        map.addSource(SITE_D_SRC, { type: "geojson", data });
        map.addLayer({
          id: SITE_D_FILL,
          type: "fill",
          source: SITE_D_SRC,
          paint: { "fill-color": "#9333EA", "fill-opacity": 0.05 },
        });
        map.addLayer({
          id: SITE_D_LINE,
          type: "line",
          source: SITE_D_SRC,
          paint: {
            "line-color": "#9333EA",
            "line-width": 1.5,
            "line-dasharray": [2, 2],
          },
        });
      } catch (e) {
        console.error("[site-d] load failed", e);
      }
    }

    // ── Al Khail Heights (DDA) ─────────────────────────────────────
    if (!map.getSource(KHEIGHTS_SRC)) {
      try {
        const r = await fetch("/api/layers/dda/khail-heights");
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        const data: GeoJSON.FeatureCollection = await r.json();
        map.addSource(KHEIGHTS_SRC, { type: "geojson", data });
        map.addLayer({
          id: KHEIGHTS_FILL,
          type: "fill",
          source: KHEIGHTS_SRC,
          paint: { "fill-color": "#9333EA", "fill-opacity": 0.05 },
        });
        map.addLayer({
          id: KHEIGHTS_LINE,
          type: "line",
          source: KHEIGHTS_SRC,
          paint: {
            "line-color": "#9333EA",
            "line-width": 1.5,
            "line-dasharray": [2, 2],
          },
        });
      } catch (e) {
        console.error("[khail-heights] load failed", e);
      }
    }

    // ── Meraas — Umm Al Daman (DDA) ────────────────────────────────
    if (!map.getSource(MERAAS_UAD_SRC)) {
      try {
        const r = await fetch("/api/layers/dda/meraas-umm-al-daman");
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        const data: GeoJSON.FeatureCollection = await r.json();
        map.addSource(MERAAS_UAD_SRC, { type: "geojson", data });
        map.addLayer({
          id: MERAAS_UAD_FILL,
          type: "fill",
          source: MERAAS_UAD_SRC,
          paint: { "fill-color": "#9333EA", "fill-opacity": 0.05 },
        });
        map.addLayer({
          id: MERAAS_UAD_LINE,
          type: "line",
          source: MERAAS_UAD_SRC,
          paint: {
            "line-color": "#9333EA",
            "line-width": 1.5,
            "line-dasharray": [2, 2],
          },
        });
      } catch (e) {
        console.error("[meraas-umm-al-daman] load failed", e);
      }
    }

    // ── Dubai Land (673) (DDA) ─────────────────────────────────────
    if (!map.getSource(DLAND673_SRC)) {
      try {
        const r = await fetch("/api/layers/dda/dubai-land-673");
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        const data: GeoJSON.FeatureCollection = await r.json();
        map.addSource(DLAND673_SRC, { type: "geojson", data });
        map.addLayer({
          id: DLAND673_FILL,
          type: "fill",
          source: DLAND673_SRC,
          paint: { "fill-color": "#9333EA", "fill-opacity": 0.05 },
        });
        map.addLayer({
          id: DLAND673_LINE,
          type: "line",
          source: DLAND673_SRC,
          paint: {
            "line-color": "#9333EA",
            "line-width": 1.5,
            "line-dasharray": [2, 2],
          },
        });
      } catch (e) {
        console.error("[dubai-land-673] load failed", e);
      }
    }

    // ── Shamal — Al Yalayis 1 (DDA) ────────────────────────────────
    if (!map.getSource(SHAMAL_Y1_SRC)) {
      try {
        const r = await fetch("/api/layers/dda/shamal-yalayis-1");
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        const data: GeoJSON.FeatureCollection = await r.json();
        map.addSource(SHAMAL_Y1_SRC, { type: "geojson", data });
        map.addLayer({
          id: SHAMAL_Y1_FILL,
          type: "fill",
          source: SHAMAL_Y1_SRC,
          paint: { "fill-color": "#9333EA", "fill-opacity": 0.05 },
        });
        map.addLayer({
          id: SHAMAL_Y1_LINE,
          type: "line",
          source: SHAMAL_Y1_SRC,
          paint: {
            "line-color": "#9333EA",
            "line-width": 1.5,
            "line-dasharray": [2, 2],
          },
        });
      } catch (e) {
        console.error("[shamal-yalayis-1] load failed", e);
      }
    }

    // ── TECOM — Al Qouz Ind. 2nd (DDA) ─────────────────────────────
    if (!map.getSource(TECOM_Q2_SRC)) {
      try {
        const r = await fetch("/api/layers/dda/tecom-qouz-2");
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        const data: GeoJSON.FeatureCollection = await r.json();
        map.addSource(TECOM_Q2_SRC, { type: "geojson", data });
        map.addLayer({
          id: TECOM_Q2_FILL,
          type: "fill",
          source: TECOM_Q2_SRC,
          paint: { "fill-color": "#9333EA", "fill-opacity": 0.05 },
        });
        map.addLayer({
          id: TECOM_Q2_LINE,
          type: "line",
          source: TECOM_Q2_SRC,
          paint: {
            "line-color": "#9333EA",
            "line-width": 1.5,
            "line-dasharray": [2, 2],
          },
        });
      } catch (e) {
        console.error("[tecom-qouz-2] load failed", e);
      }
    }

    // ── Global Village (DDA) ───────────────────────────────────────
    if (!map.getSource(GV_SRC)) {
      try {
        const r = await fetch("/api/layers/dda/global-village");
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        const data: GeoJSON.FeatureCollection = await r.json();
        map.addSource(GV_SRC, { type: "geojson", data });
        map.addLayer({
          id: GV_FILL,
          type: "fill",
          source: GV_SRC,
          paint: { "fill-color": "#9333EA", "fill-opacity": 0.05 },
        });
        map.addLayer({
          id: GV_LINE,
          type: "line",
          source: GV_SRC,
          paint: {
            "line-color": "#9333EA",
            "line-width": 1.5,
            "line-dasharray": [2, 2],
          },
        });
      } catch (e) {
        console.error("[global-village] load failed", e);
      }
    }

    // ── Layan (DDA) ────────────────────────────────────────────────
    if (!map.getSource(LAYAN_SRC)) {
      try {
        const r = await fetch("/api/layers/dda/layan");
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        const data: GeoJSON.FeatureCollection = await r.json();
        map.addSource(LAYAN_SRC, { type: "geojson", data });
        map.addLayer({
          id: LAYAN_FILL,
          type: "fill",
          source: LAYAN_SRC,
          paint: { "fill-color": "#9333EA", "fill-opacity": 0.05 },
        });
        map.addLayer({
          id: LAYAN_LINE,
          type: "line",
          source: LAYAN_SRC,
          paint: {
            "line-color": "#9333EA",
            "line-width": 1.5,
            "line-dasharray": [2, 2],
          },
        });
      } catch (e) {
        console.error("[layan] load failed", e);
      }
    }

    // ── DPG — MBR City (DDA) ───────────────────────────────────────
    if (!map.getSource(DPGMBR_SRC)) {
      try {
        const r = await fetch("/api/layers/dda/dpg-mbr");
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        const data: GeoJSON.FeatureCollection = await r.json();
        map.addSource(DPGMBR_SRC, { type: "geojson", data });
        map.addLayer({
          id: DPGMBR_FILL,
          type: "fill",
          source: DPGMBR_SRC,
          paint: { "fill-color": "#9333EA", "fill-opacity": 0.05 },
        });
        map.addLayer({
          id: DPGMBR_LINE,
          type: "line",
          source: DPGMBR_SRC,
          paint: {
            "line-color": "#9333EA",
            "line-width": 1.5,
            "line-dasharray": [2, 2],
          },
        });
      } catch (e) {
        console.error("[dpg-mbr] load failed", e);
      }
    }

    // ── Dubai Wholesale City (DDA) ─────────────────────────────────
    if (!map.getSource(DWC_SRC)) {
      try {
        const r = await fetch("/api/layers/dda/dwc");
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        const data: GeoJSON.FeatureCollection = await r.json();
        map.addSource(DWC_SRC, { type: "geojson", data });
        map.addLayer({
          id: DWC_FILL,
          type: "fill",
          source: DWC_SRC,
          paint: { "fill-color": "#9333EA", "fill-opacity": 0.05 },
        });
        map.addLayer({
          id: DWC_LINE,
          type: "line",
          source: DWC_SRC,
          paint: {
            "line-color": "#9333EA",
            "line-width": 1.5,
            "line-dasharray": [2, 2],
          },
        });
      } catch (e) {
        console.error("[dwc] load failed", e);
      }
    }

    // ── Labour Accommodation — Al Quoz (DDA) ───────────────────────
    if (!map.getSource(LQUOZ_SRC)) {
      try {
        const r = await fetch("/api/layers/dda/labour-quoz");
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        const data: GeoJSON.FeatureCollection = await r.json();
        map.addSource(LQUOZ_SRC, { type: "geojson", data });
        map.addLayer({
          id: LQUOZ_FILL,
          type: "fill",
          source: LQUOZ_SRC,
          paint: { "fill-color": "#9333EA", "fill-opacity": 0.05 },
        });
        map.addLayer({
          id: LQUOZ_LINE,
          type: "line",
          source: LQUOZ_SRC,
          paint: {
            "line-color": "#9333EA",
            "line-width": 1.5,
            "line-dasharray": [2, 2],
          },
        });
      } catch (e) {
        console.error("[labour-quoz] load failed", e);
      }
    }

    // ── Schools — Free Zone (DDA) ──────────────────────────────────
    if (!map.getSource(SCHFZ_SRC)) {
      try {
        const r = await fetch("/api/layers/dda/schools-fz");
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        const data: GeoJSON.FeatureCollection = await r.json();
        map.addSource(SCHFZ_SRC, { type: "geojson", data });
        map.addLayer({
          id: SCHFZ_FILL,
          type: "fill",
          source: SCHFZ_SRC,
          paint: { "fill-color": "#9333EA", "fill-opacity": 0.05 },
        });
        map.addLayer({
          id: SCHFZ_LINE,
          type: "line",
          source: SCHFZ_SRC,
          paint: {
            "line-color": "#9333EA",
            "line-width": 1.5,
            "line-dasharray": [2, 2],
          },
        });
      } catch (e) {
        console.error("[schools-fz] load failed", e);
      }
    }

    // ── DWC (Non Free Zone) (DDA) ──────────────────────────────────
    if (!map.getSource(DWCNFZ_SRC)) {
      try {
        const r = await fetch("/api/layers/dda/dwc-nfz");
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        const data: GeoJSON.FeatureCollection = await r.json();
        map.addSource(DWCNFZ_SRC, { type: "geojson", data });
        map.addLayer({
          id: DWCNFZ_FILL,
          type: "fill",
          source: DWCNFZ_SRC,
          paint: { "fill-color": "#9333EA", "fill-opacity": 0.05 },
        });
        map.addLayer({
          id: DWCNFZ_LINE,
          type: "line",
          source: DWCNFZ_SRC,
          paint: {
            "line-color": "#9333EA",
            "line-width": 1.5,
            "line-dasharray": [2, 2],
          },
        });
      } catch (e) {
        console.error("[dwc-nfz] load failed", e);
      }
    }

    // ── Shamal — Jabal Ali Ind. 1st (DDA) ──────────────────────────
    if (!map.getSource(SHAMAL_JAI1_SRC)) {
      try {
        const r = await fetch("/api/layers/dda/shamal-jai-1");
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        const data: GeoJSON.FeatureCollection = await r.json();
        map.addSource(SHAMAL_JAI1_SRC, { type: "geojson", data });
        map.addLayer({
          id: SHAMAL_JAI1_FILL,
          type: "fill",
          source: SHAMAL_JAI1_SRC,
          paint: { "fill-color": "#9333EA", "fill-opacity": 0.05 },
        });
        map.addLayer({
          id: SHAMAL_JAI1_LINE,
          type: "line",
          source: SHAMAL_JAI1_SRC,
          paint: {
            "line-color": "#9333EA",
            "line-width": 1.5,
            "line-dasharray": [2, 2],
          },
        });
      } catch (e) {
        console.error("[shamal-jai-1] load failed", e);
      }
    }

    // ── Jabal Ali Staff Accommodation (DDA) ────────────────────────
    if (!map.getSource(JAI_STAFF_SRC)) {
      try {
        const r = await fetch("/api/layers/dda/jai-staff");
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        const data: GeoJSON.FeatureCollection = await r.json();
        map.addSource(JAI_STAFF_SRC, { type: "geojson", data });
        map.addLayer({
          id: JAI_STAFF_FILL,
          type: "fill",
          source: JAI_STAFF_SRC,
          paint: { "fill-color": "#9333EA", "fill-opacity": 0.05 },
        });
        map.addLayer({
          id: JAI_STAFF_LINE,
          type: "line",
          source: JAI_STAFF_SRC,
          paint: {
            "line-color": "#9333EA",
            "line-width": 1.5,
            "line-dasharray": [2, 2],
          },
        });
      } catch (e) {
        console.error("[jai-staff] load failed", e);
      }
    }

    // ── Shamal — Trade Center 2nd (DDA) ────────────────────────────
    if (!map.getSource(SHAMAL_TC2_SRC)) {
      try {
        const r = await fetch("/api/layers/dda/shamal-tc-2");
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        const data: GeoJSON.FeatureCollection = await r.json();
        map.addSource(SHAMAL_TC2_SRC, { type: "geojson", data });
        map.addLayer({
          id: SHAMAL_TC2_FILL,
          type: "fill",
          source: SHAMAL_TC2_SRC,
          paint: { "fill-color": "#9333EA", "fill-opacity": 0.05 },
        });
        map.addLayer({
          id: SHAMAL_TC2_LINE,
          type: "line",
          source: SHAMAL_TC2_SRC,
          paint: {
            "line-color": "#9333EA",
            "line-width": 1.5,
            "line-dasharray": [2, 2],
          },
        });
      } catch (e) {
        console.error("[shamal-tc-2] load failed", e);
      }
    }

    // ── Nuzul (DDA) ────────────────────────────────────────────────
    if (!map.getSource(NUZUL_SRC)) {
      try {
        const r = await fetch("/api/layers/dda/nuzul");
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        const data: GeoJSON.FeatureCollection = await r.json();
        map.addSource(NUZUL_SRC, { type: "geojson", data });
        map.addLayer({
          id: NUZUL_FILL,
          type: "fill",
          source: NUZUL_SRC,
          paint: { "fill-color": "#9333EA", "fill-opacity": 0.05 },
        });
        map.addLayer({
          id: NUZUL_LINE,
          type: "line",
          source: NUZUL_SRC,
          paint: {
            "line-color": "#9333EA",
            "line-width": 1.5,
            "line-dasharray": [2, 2],
          },
        });
      } catch (e) {
        console.error("[nuzul] load failed", e);
      }
    }

    // ── KOA Real Estate Dev. (DDA) ─────────────────────────────────
    if (!map.getSource(KOA_SRC)) {
      try {
        const r = await fetch("/api/layers/dda/koa");
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        const data: GeoJSON.FeatureCollection = await r.json();
        map.addSource(KOA_SRC, { type: "geojson", data });
        map.addLayer({
          id: KOA_FILL,
          type: "fill",
          source: KOA_SRC,
          paint: { "fill-color": "#9333EA", "fill-opacity": 0.05 },
        });
        map.addLayer({
          id: KOA_LINE,
          type: "line",
          source: KOA_SRC,
          paint: {
            "line-color": "#9333EA",
            "line-width": 1.5,
            "line-dasharray": [2, 2],
          },
        });
      } catch (e) {
        console.error("[koa] load failed", e);
      }
    }

    // ── Sobha Sanctuary (DDA) ──────────────────────────────────────
    if (!map.getSource(SOBHA_S_SRC)) {
      try {
        const r = await fetch("/api/layers/dda/sobha-sanctuary");
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        const data: GeoJSON.FeatureCollection = await r.json();
        map.addSource(SOBHA_S_SRC, { type: "geojson", data });
        map.addLayer({
          id: SOBHA_S_FILL,
          type: "fill",
          source: SOBHA_S_SRC,
          paint: { "fill-color": "#9333EA", "fill-opacity": 0.05 },
        });
        map.addLayer({
          id: SOBHA_S_LINE,
          type: "line",
          source: SOBHA_S_SRC,
          paint: {
            "line-color": "#9333EA",
            "line-width": 1.5,
            "line-dasharray": [2, 2],
          },
        });
      } catch (e) {
        console.error("[sobha-sanctuary] load failed", e);
      }
    }

    // ── Boxpark (DDA) ──────────────────────────────────────────────
    if (!map.getSource(BOX_SRC)) {
      try {
        const r = await fetch("/api/layers/dda/boxpark");
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        const data: GeoJSON.FeatureCollection = await r.json();
        map.addSource(BOX_SRC, { type: "geojson", data });
        map.addLayer({
          id: BOX_FILL,
          type: "fill",
          source: BOX_SRC,
          paint: { "fill-color": "#9333EA", "fill-opacity": 0.05 },
        });
        map.addLayer({
          id: BOX_LINE,
          type: "line",
          source: BOX_SRC,
          paint: {
            "line-color": "#9333EA",
            "line-width": 1.5,
            "line-dasharray": [2, 2],
          },
        });
      } catch (e) {
        console.error("[boxpark] load failed", e);
      }
    }

    // ── Shamal — Nadd Al Shiba 1st (DDA) ───────────────────────────
    if (!map.getSource(SHAMAL_NAS1_SRC)) {
      try {
        const r = await fetch("/api/layers/dda/shamal-nas-1");
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        const data: GeoJSON.FeatureCollection = await r.json();
        map.addSource(SHAMAL_NAS1_SRC, { type: "geojson", data });
        map.addLayer({
          id: SHAMAL_NAS1_FILL,
          type: "fill",
          source: SHAMAL_NAS1_SRC,
          paint: { "fill-color": "#9333EA", "fill-opacity": 0.05 },
        });
        map.addLayer({
          id: SHAMAL_NAS1_LINE,
          type: "line",
          source: SHAMAL_NAS1_SRC,
          paint: {
            "line-color": "#9333EA",
            "line-width": 1.5,
            "line-dasharray": [2, 2],
          },
        });
      } catch (e) {
        console.error("[shamal-nas-1] load failed", e);
      }
    }

    // ── Last Exit (DDA) ────────────────────────────────────────────
    if (!map.getSource(LASTEXIT_SRC)) {
      try {
        const r = await fetch("/api/layers/dda/last-exit");
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        const data: GeoJSON.FeatureCollection = await r.json();
        map.addSource(LASTEXIT_SRC, { type: "geojson", data });
        map.addLayer({
          id: LASTEXIT_FILL,
          type: "fill",
          source: LASTEXIT_SRC,
          paint: { "fill-color": "#9333EA", "fill-opacity": 0.05 },
        });
        map.addLayer({
          id: LASTEXIT_LINE,
          type: "line",
          source: LASTEXIT_SRC,
          paint: {
            "line-color": "#9333EA",
            "line-width": 1.5,
            "line-dasharray": [2, 2],
          },
        });
      } catch (e) {
        console.error("[last-exit] load failed", e);
      }
    }

    // ── Scaramanga (DDA) ───────────────────────────────────────────
    if (!map.getSource(SCARA_SRC)) {
      try {
        const r = await fetch("/api/layers/dda/scaramanga");
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        const data: GeoJSON.FeatureCollection = await r.json();
        map.addSource(SCARA_SRC, { type: "geojson", data });
        map.addLayer({
          id: SCARA_FILL,
          type: "fill",
          source: SCARA_SRC,
          paint: { "fill-color": "#9333EA", "fill-opacity": 0.05 },
        });
        map.addLayer({
          id: SCARA_LINE,
          type: "line",
          source: SCARA_SRC,
          paint: {
            "line-color": "#9333EA",
            "line-width": 1.5,
            "line-dasharray": [2, 2],
          },
        });
      } catch (e) {
        console.error("[scaramanga] load failed", e);
      }
    }

    // ── Meraas — Al Warqa'a 3rd (DDA) ──────────────────────────────
    if (!map.getSource(MERAAS_W3_SRC)) {
      try {
        const r = await fetch("/api/layers/dda/meraas-warqa-3");
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        const data: GeoJSON.FeatureCollection = await r.json();
        map.addSource(MERAAS_W3_SRC, { type: "geojson", data });
        map.addLayer({
          id: MERAAS_W3_FILL,
          type: "fill",
          source: MERAAS_W3_SRC,
          paint: { "fill-color": "#9333EA", "fill-opacity": 0.05 },
        });
        map.addLayer({
          id: MERAAS_W3_LINE,
          type: "line",
          source: MERAAS_W3_SRC,
          paint: {
            "line-color": "#9333EA",
            "line-width": 1.5,
            "line-dasharray": [2, 2],
          },
        });
      } catch (e) {
        console.error("[meraas-warqa-3] load failed", e);
      }
    }

    // ── Jumeirah Central (DDA) ─────────────────────────────────────
    if (!map.getSource(JCENTRAL_SRC)) {
      try {
        const r = await fetch("/api/layers/dda/jumeirah-central");
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        const data: GeoJSON.FeatureCollection = await r.json();
        map.addSource(JCENTRAL_SRC, { type: "geojson", data });
        map.addLayer({
          id: JCENTRAL_FILL,
          type: "fill",
          source: JCENTRAL_SRC,
          paint: { "fill-color": "#9333EA", "fill-opacity": 0.05 },
        });
        map.addLayer({
          id: JCENTRAL_LINE,
          type: "line",
          source: JCENTRAL_SRC,
          paint: {
            "line-color": "#9333EA",
            "line-width": 1.5,
            "line-dasharray": [2, 2],
          },
        });
      } catch (e) {
        console.error("[jumeirah-central] load failed", e);
      }
    }

    // ── Oasis Village (DDA) ────────────────────────────────────────
    if (!map.getSource(OASIS_SRC)) {
      try {
        const r = await fetch("/api/layers/dda/oasis-village");
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        const data: GeoJSON.FeatureCollection = await r.json();
        map.addSource(OASIS_SRC, { type: "geojson", data });
        map.addLayer({
          id: OASIS_FILL,
          type: "fill",
          source: OASIS_SRC,
          paint: { "fill-color": "#9333EA", "fill-opacity": 0.05 },
        });
        map.addLayer({
          id: OASIS_LINE,
          type: "line",
          source: OASIS_SRC,
          paint: {
            "line-color": "#9333EA",
            "line-width": 1.5,
            "line-dasharray": [2, 2],
          },
        });
      } catch (e) {
        console.error("[oasis-village] load failed", e);
      }
    }

    // ── Emirates Towers District (DDA) ─────────────────────────────
    if (!map.getSource(ETD_SRC)) {
      try {
        const r = await fetch("/api/layers/dda/emirates-towers");
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        const data: GeoJSON.FeatureCollection = await r.json();
        map.addSource(ETD_SRC, { type: "geojson", data });
        map.addLayer({
          id: ETD_FILL,
          type: "fill",
          source: ETD_SRC,
          paint: { "fill-color": "#9333EA", "fill-opacity": 0.05 },
        });
        map.addLayer({
          id: ETD_LINE,
          type: "line",
          source: ETD_SRC,
          paint: {
            "line-color": "#9333EA",
            "line-width": 1.5,
            "line-dasharray": [2, 2],
          },
        });
      } catch (e) {
        console.error("[emirates-towers] load failed", e);
      }
    }

    // ── Meraas — Al Qouz 3rd (DDA) ─────────────────────────────────
    if (!map.getSource(MERAAS_Q3_SRC)) {
      try {
        const r = await fetch("/api/layers/dda/meraas-quoz-3");
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        const data: GeoJSON.FeatureCollection = await r.json();
        map.addSource(MERAAS_Q3_SRC, { type: "geojson", data });
        map.addLayer({
          id: MERAAS_Q3_FILL,
          type: "fill",
          source: MERAAS_Q3_SRC,
          paint: { "fill-color": "#9333EA", "fill-opacity": 0.05 },
        });
        map.addLayer({
          id: MERAAS_Q3_LINE,
          type: "line",
          source: MERAAS_Q3_SRC,
          paint: {
            "line-color": "#9333EA",
            "line-width": 1.5,
            "line-dasharray": [2, 2],
          },
        });
      } catch (e) {
        console.error("[meraas-quoz-3] load failed", e);
      }
    }

    // ── Marsa Alseef (DDA) ─────────────────────────────────────────
    if (!map.getSource(MARSA_S_SRC)) {
      try {
        const r = await fetch("/api/layers/dda/marsa-alseef");
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        const data: GeoJSON.FeatureCollection = await r.json();
        map.addSource(MARSA_S_SRC, { type: "geojson", data });
        map.addLayer({
          id: MARSA_S_FILL,
          type: "fill",
          source: MARSA_S_SRC,
          paint: { "fill-color": "#9333EA", "fill-opacity": 0.05 },
        });
        map.addLayer({
          id: MARSA_S_LINE,
          type: "line",
          source: MARSA_S_SRC,
          paint: {
            "line-color": "#9333EA",
            "line-width": 1.5,
            "line-dasharray": [2, 2],
          },
        });
      } catch (e) {
        console.error("[marsa-alseef] load failed", e);
      }
    }

    // ── Meraas — Wadi Alshabak (DDA) ───────────────────────────────
    if (!map.getSource(MERAAS_WAS_SRC)) {
      try {
        const r = await fetch("/api/layers/dda/meraas-wadi-alshabak");
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        const data: GeoJSON.FeatureCollection = await r.json();
        map.addSource(MERAAS_WAS_SRC, { type: "geojson", data });
        map.addLayer({
          id: MERAAS_WAS_FILL,
          type: "fill",
          source: MERAAS_WAS_SRC,
          paint: { "fill-color": "#9333EA", "fill-opacity": 0.05 },
        });
        map.addLayer({
          id: MERAAS_WAS_LINE,
          type: "line",
          source: MERAAS_WAS_SRC,
          paint: {
            "line-color": "#9333EA",
            "line-width": 1.5,
            "line-dasharray": [2, 2],
          },
        });
      } catch (e) {
        console.error("[meraas-wadi-alshabak] load failed", e);
      }
    }

    // ── Shamal — Al Barsha 2nd (DDA) ───────────────────────────────
    if (!map.getSource(SHAMAL_B2_SRC)) {
      try {
        const r = await fetch("/api/layers/dda/shamal-barsha-2");
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        const data: GeoJSON.FeatureCollection = await r.json();
        map.addSource(SHAMAL_B2_SRC, { type: "geojson", data });
        map.addLayer({
          id: SHAMAL_B2_FILL,
          type: "fill",
          source: SHAMAL_B2_SRC,
          paint: { "fill-color": "#9333EA", "fill-opacity": 0.05 },
        });
        map.addLayer({
          id: SHAMAL_B2_LINE,
          type: "line",
          source: SHAMAL_B2_SRC,
          paint: {
            "line-color": "#9333EA",
            "line-width": 1.5,
            "line-dasharray": [2, 2],
          },
        });
      } catch (e) {
        console.error("[shamal-barsha-2] load failed", e);
      }
    }

    // ── Shamal — Al Nahda 2nd (DDA) ────────────────────────────────
    if (!map.getSource(SHAMAL_N2_SRC)) {
      try {
        const r = await fetch("/api/layers/dda/shamal-nahda-2");
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        const data: GeoJSON.FeatureCollection = await r.json();
        map.addSource(SHAMAL_N2_SRC, { type: "geojson", data });
        map.addLayer({
          id: SHAMAL_N2_FILL,
          type: "fill",
          source: SHAMAL_N2_SRC,
          paint: { "fill-color": "#9333EA", "fill-opacity": 0.05 },
        });
        map.addLayer({
          id: SHAMAL_N2_LINE,
          type: "line",
          source: SHAMAL_N2_SRC,
          paint: {
            "line-color": "#9333EA",
            "line-width": 1.5,
            "line-dasharray": [2, 2],
          },
        });
      } catch (e) {
        console.error("[shamal-nahda-2] load failed", e);
      }
    }

    // ── Meraas — Saih Shuaib 1 (DDA) ───────────────────────────────
    if (!map.getSource(MERAAS_SAIH1_SRC)) {
      try {
        const r = await fetch("/api/layers/dda/meraas-saih-1");
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        const data: GeoJSON.FeatureCollection = await r.json();
        map.addSource(MERAAS_SAIH1_SRC, { type: "geojson", data });
        map.addLayer({
          id: MERAAS_SAIH1_FILL,
          type: "fill",
          source: MERAAS_SAIH1_SRC,
          paint: { "fill-color": "#9333EA", "fill-opacity": 0.05 },
        });
        map.addLayer({
          id: MERAAS_SAIH1_LINE,
          type: "line",
          source: MERAAS_SAIH1_SRC,
          paint: {
            "line-color": "#9333EA",
            "line-width": 1.5,
            "line-dasharray": [2, 2],
          },
        });
      } catch (e) {
        console.error("[meraas-saih-1] load failed", e);
      }
    }

    // ── Dubai Police — Umm Al Daman (DDA) ──────────────────────────
    if (!map.getSource(DPOL_UAD_SRC)) {
      try {
        const r = await fetch("/api/layers/dda/dubai-police-uad");
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        const data: GeoJSON.FeatureCollection = await r.json();
        map.addSource(DPOL_UAD_SRC, { type: "geojson", data });
        map.addLayer({
          id: DPOL_UAD_FILL,
          type: "fill",
          source: DPOL_UAD_SRC,
          paint: { "fill-color": "#9333EA", "fill-opacity": 0.05 },
        });
        map.addLayer({
          id: DPOL_UAD_LINE,
          type: "line",
          source: DPOL_UAD_SRC,
          paint: {
            "line-color": "#9333EA",
            "line-width": 1.5,
            "line-dasharray": [2, 2],
          },
        });
      } catch (e) {
        console.error("[dubai-police-uad] load failed", e);
      }
    }

    // ── Meraas — Ras Al Khor Ind. 3rd (DDA) ────────────────────────
    if (!map.getSource(MERAAS_RAK3_SRC)) {
      try {
        const r = await fetch("/api/layers/dda/meraas-rakhor-3");
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        const data: GeoJSON.FeatureCollection = await r.json();
        map.addSource(MERAAS_RAK3_SRC, { type: "geojson", data });
        map.addLayer({
          id: MERAAS_RAK3_FILL,
          type: "fill",
          source: MERAAS_RAK3_SRC,
          paint: { "fill-color": "#9333EA", "fill-opacity": 0.05 },
        });
        map.addLayer({
          id: MERAAS_RAK3_LINE,
          type: "line",
          source: MERAAS_RAK3_SRC,
          paint: {
            "line-color": "#9333EA",
            "line-width": 1.5,
            "line-dasharray": [2, 2],
          },
        });
      } catch (e) {
        console.error("[meraas-rakhor-3] load failed", e);
      }
    }

    // ── Meraas — Marsa Dubai (DDA) ─────────────────────────────────
    if (!map.getSource(MERAAS_MD_SRC)) {
      try {
        const r = await fetch("/api/layers/dda/meraas-marsa-dubai");
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        const data: GeoJSON.FeatureCollection = await r.json();
        map.addSource(MERAAS_MD_SRC, { type: "geojson", data });
        map.addLayer({
          id: MERAAS_MD_FILL,
          type: "fill",
          source: MERAAS_MD_SRC,
          paint: { "fill-color": "#9333EA", "fill-opacity": 0.05 },
        });
        map.addLayer({
          id: MERAAS_MD_LINE,
          type: "line",
          source: MERAAS_MD_SRC,
          paint: {
            "line-color": "#9333EA",
            "line-width": 1.5,
            "line-dasharray": [2, 2],
          },
        });
      } catch (e) {
        console.error("[meraas-marsa-dubai] load failed", e);
      }
    }

    // ── Shamal — Hadaeq Sheikh MBR (DDA) ───────────────────────────
    if (!map.getSource(SHAMAL_HAD_SRC)) {
      try {
        const r = await fetch("/api/layers/dda/shamal-hadaeq");
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        const data: GeoJSON.FeatureCollection = await r.json();
        map.addSource(SHAMAL_HAD_SRC, { type: "geojson", data });
        map.addLayer({
          id: SHAMAL_HAD_FILL,
          type: "fill",
          source: SHAMAL_HAD_SRC,
          paint: { "fill-color": "#9333EA", "fill-opacity": 0.05 },
        });
        map.addLayer({
          id: SHAMAL_HAD_LINE,
          type: "line",
          source: SHAMAL_HAD_SRC,
          paint: {
            "line-color": "#9333EA",
            "line-width": 1.5,
            "line-dasharray": [2, 2],
          },
        });
      } catch (e) {
        console.error("[shamal-hadaeq] load failed", e);
      }
    }

    // ── Jumeira Beach Hotel (DDA) ──────────────────────────────────
    if (!map.getSource(JBH_SRC)) {
      try {
        const r = await fetch("/api/layers/dda/jbh");
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        const data: GeoJSON.FeatureCollection = await r.json();
        map.addSource(JBH_SRC, { type: "geojson", data });
        map.addLayer({
          id: JBH_FILL,
          type: "fill",
          source: JBH_SRC,
          paint: { "fill-color": "#9333EA", "fill-opacity": 0.05 },
        });
        map.addLayer({
          id: JBH_LINE,
          type: "line",
          source: JBH_SRC,
          paint: {
            "line-color": "#9333EA",
            "line-width": 1.5,
            "line-dasharray": [2, 2],
          },
        });
      } catch (e) {
        console.error("[jbh] load failed", e);
      }
    }

    // ── Madinat Jumeirah (DDA) ─────────────────────────────────────
    if (!map.getSource(MJUM_SRC)) {
      try {
        const r = await fetch("/api/layers/dda/madinat-jumeirah");
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        const data: GeoJSON.FeatureCollection = await r.json();
        map.addSource(MJUM_SRC, { type: "geojson", data });
        map.addLayer({
          id: MJUM_FILL,
          type: "fill",
          source: MJUM_SRC,
          paint: { "fill-color": "#9333EA", "fill-opacity": 0.05 },
        });
        map.addLayer({
          id: MJUM_LINE,
          type: "line",
          source: MJUM_SRC,
          paint: {
            "line-color": "#9333EA",
            "line-width": 1.5,
            "line-dasharray": [2, 2],
          },
        });
      } catch (e) {
        console.error("[madinat-jumeirah] load failed", e);
      }
    }

    // ── TECOM — Saih Al Salam (DDA) ────────────────────────────────
    if (!map.getSource(TECOM_SAIH_SRC)) {
      try {
        const r = await fetch("/api/layers/dda/tecom-saih");
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        const data: GeoJSON.FeatureCollection = await r.json();
        map.addSource(TECOM_SAIH_SRC, { type: "geojson", data });
        map.addLayer({
          id: TECOM_SAIH_FILL,
          type: "fill",
          source: TECOM_SAIH_SRC,
          paint: { "fill-color": "#9333EA", "fill-opacity": 0.05 },
        });
        map.addLayer({
          id: TECOM_SAIH_LINE,
          type: "line",
          source: TECOM_SAIH_SRC,
          paint: {
            "line-color": "#9333EA",
            "line-width": 1.5,
            "line-dasharray": [2, 2],
          },
        });
      } catch (e) {
        console.error("[tecom-saih] load failed", e);
      }
    }

    // ── Culture Village Phase 2 (DDA) ──────────────────────────────
    if (!map.getSource(CV2_SRC)) {
      try {
        const r = await fetch("/api/layers/dda/culture-village-2");
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        const data: GeoJSON.FeatureCollection = await r.json();
        map.addSource(CV2_SRC, { type: "geojson", data });
        map.addLayer({
          id: CV2_FILL,
          type: "fill",
          source: CV2_SRC,
          paint: { "fill-color": "#9333EA", "fill-opacity": 0.05 },
        });
        map.addLayer({
          id: CV2_LINE,
          type: "line",
          source: CV2_SRC,
          paint: {
            "line-color": "#9333EA",
            "line-width": 1.5,
            "line-dasharray": [2, 2],
          },
        });
      } catch (e) {
        console.error("[culture-village-2] load failed", e);
      }
    }

    // ── Meraas — Al Barsha South 2nd (DDA) ─────────────────────────
    if (!map.getSource(MERAAS_BS2_SRC)) {
      try {
        const r = await fetch("/api/layers/dda/meraas-bs-2");
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        const data: GeoJSON.FeatureCollection = await r.json();
        map.addSource(MERAAS_BS2_SRC, { type: "geojson", data });
        map.addLayer({
          id: MERAAS_BS2_FILL,
          type: "fill",
          source: MERAAS_BS2_SRC,
          paint: { "fill-color": "#9333EA", "fill-opacity": 0.05 },
        });
        map.addLayer({
          id: MERAAS_BS2_LINE,
          type: "line",
          source: MERAAS_BS2_SRC,
          paint: {
            "line-color": "#9333EA",
            "line-width": 1.5,
            "line-dasharray": [2, 2],
          },
        });
      } catch (e) {
        console.error("[meraas-bs-2] load failed", e);
      }
    }

    // ── Shamal — Muhaisanah 2nd (DDA) ──────────────────────────────
    if (!map.getSource(SHAMAL_MUH2_SRC)) {
      try {
        const r = await fetch("/api/layers/dda/shamal-muhaisanah-2");
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        const data: GeoJSON.FeatureCollection = await r.json();
        map.addSource(SHAMAL_MUH2_SRC, { type: "geojson", data });
        map.addLayer({
          id: SHAMAL_MUH2_FILL,
          type: "fill",
          source: SHAMAL_MUH2_SRC,
          paint: { "fill-color": "#9333EA", "fill-opacity": 0.05 },
        });
        map.addLayer({
          id: SHAMAL_MUH2_LINE,
          type: "line",
          source: SHAMAL_MUH2_SRC,
          paint: {
            "line-color": "#9333EA",
            "line-width": 1.5,
            "line-dasharray": [2, 2],
          },
        });
      } catch (e) {
        console.error("[shamal-muhaisanah-2] load failed", e);
      }
    }

    // ── Shamal — Al Qouz Ind. 2nd (DDA) ────────────────────────────
    if (!map.getSource(SHAMAL_Q2_SRC)) {
      try {
        const r = await fetch("/api/layers/dda/shamal-quoz-2");
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        const data: GeoJSON.FeatureCollection = await r.json();
        map.addSource(SHAMAL_Q2_SRC, { type: "geojson", data });
        map.addLayer({
          id: SHAMAL_Q2_FILL,
          type: "fill",
          source: SHAMAL_Q2_SRC,
          paint: { "fill-color": "#9333EA", "fill-opacity": 0.05 },
        });
        map.addLayer({
          id: SHAMAL_Q2_LINE,
          type: "line",
          source: SHAMAL_Q2_SRC,
          paint: {
            "line-color": "#9333EA",
            "line-width": 1.5,
            "line-dasharray": [2, 2],
          },
        });
      } catch (e) {
        console.error("[shamal-quoz-2] load failed", e);
      }
    }

    // ── Culture Village Phase 3 (DDA) ──────────────────────────────
    if (!map.getSource(CV3_SRC)) {
      try {
        const r = await fetch("/api/layers/dda/culture-village-3");
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        const data: GeoJSON.FeatureCollection = await r.json();
        map.addSource(CV3_SRC, { type: "geojson", data });
        map.addLayer({
          id: CV3_FILL,
          type: "fill",
          source: CV3_SRC,
          paint: { "fill-color": "#9333EA", "fill-opacity": 0.05 },
        });
        map.addLayer({
          id: CV3_LINE,
          type: "line",
          source: CV3_SRC,
          paint: {
            "line-color": "#9333EA",
            "line-width": 1.5,
            "line-dasharray": [2, 2],
          },
        });
      } catch (e) {
        console.error("[culture-village-3] load failed", e);
      }
    }

    // ── Meraas — Al Satwa (DDA) ────────────────────────────────────
    if (!map.getSource(MERAAS_SATWA_SRC)) {
      try {
        const r = await fetch("/api/layers/dda/meraas-satwa");
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        const data: GeoJSON.FeatureCollection = await r.json();
        map.addSource(MERAAS_SATWA_SRC, { type: "geojson", data });
        map.addLayer({
          id: MERAAS_SATWA_FILL,
          type: "fill",
          source: MERAAS_SATWA_SRC,
          paint: { "fill-color": "#9333EA", "fill-opacity": 0.05 },
        });
        map.addLayer({
          id: MERAAS_SATWA_LINE,
          type: "line",
          source: MERAAS_SATWA_SRC,
          paint: {
            "line-color": "#9333EA",
            "line-width": 1.5,
            "line-dasharray": [2, 2],
          },
        });
      } catch (e) {
        console.error("[meraas-satwa] load failed", e);
      }
    }

    // ── Shamal — Al Mamzar (DDA) ───────────────────────────────────
    if (!map.getSource(SHAMAL_MAMZAR_SRC)) {
      try {
        const r = await fetch("/api/layers/dda/shamal-mamzar");
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        const data: GeoJSON.FeatureCollection = await r.json();
        map.addSource(SHAMAL_MAMZAR_SRC, { type: "geojson", data });
        map.addLayer({
          id: SHAMAL_MAMZAR_FILL,
          type: "fill",
          source: SHAMAL_MAMZAR_SRC,
          paint: { "fill-color": "#9333EA", "fill-opacity": 0.05 },
        });
        map.addLayer({
          id: SHAMAL_MAMZAR_LINE,
          type: "line",
          source: SHAMAL_MAMZAR_SRC,
          paint: {
            "line-color": "#9333EA",
            "line-width": 1.5,
            "line-dasharray": [2, 2],
          },
        });
      } catch (e) {
        console.error("[shamal-mamzar] load failed", e);
      }
    }

    // ── Shamal — Al Raffa (DDA) ────────────────────────────────────
    if (!map.getSource(SHAMAL_RAFFA_SRC)) {
      try {
        const r = await fetch("/api/layers/dda/shamal-raffa");
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        const data: GeoJSON.FeatureCollection = await r.json();
        map.addSource(SHAMAL_RAFFA_SRC, { type: "geojson", data });
        map.addLayer({
          id: SHAMAL_RAFFA_FILL,
          type: "fill",
          source: SHAMAL_RAFFA_SRC,
          paint: { "fill-color": "#9333EA", "fill-opacity": 0.05 },
        });
        map.addLayer({
          id: SHAMAL_RAFFA_LINE,
          type: "line",
          source: SHAMAL_RAFFA_SRC,
          paint: {
            "line-color": "#9333EA",
            "line-width": 1.5,
            "line-dasharray": [2, 2],
          },
        });
      } catch (e) {
        console.error("[shamal-raffa] load failed", e);
      }
    }

    // ── Meraas — Al Mamzar (DDA) ───────────────────────────────────
    if (!map.getSource(MERAAS_MAMZAR_SRC)) {
      try {
        const r = await fetch("/api/layers/dda/meraas-mamzar");
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        const data: GeoJSON.FeatureCollection = await r.json();
        map.addSource(MERAAS_MAMZAR_SRC, { type: "geojson", data });
        map.addLayer({
          id: MERAAS_MAMZAR_FILL,
          type: "fill",
          source: MERAAS_MAMZAR_SRC,
          paint: { "fill-color": "#9333EA", "fill-opacity": 0.05 },
        });
        map.addLayer({
          id: MERAAS_MAMZAR_LINE,
          type: "line",
          source: MERAAS_MAMZAR_SRC,
          paint: {
            "line-color": "#9333EA",
            "line-width": 1.5,
            "line-dasharray": [2, 2],
          },
        });
      } catch (e) {
        console.error("[meraas-mamzar] load failed", e);
      }
    }

    // ── Dubai Holding — Al Safouh 1st (DDA) ────────────────────────
    if (!map.getSource(DH_SAFOUH1_SRC)) {
      try {
        const r = await fetch("/api/layers/dda/dh-safouh-1");
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        const data: GeoJSON.FeatureCollection = await r.json();
        map.addSource(DH_SAFOUH1_SRC, { type: "geojson", data });
        map.addLayer({
          id: DH_SAFOUH1_FILL,
          type: "fill",
          source: DH_SAFOUH1_SRC,
          paint: { "fill-color": "#9333EA", "fill-opacity": 0.05 },
        });
        map.addLayer({
          id: DH_SAFOUH1_LINE,
          type: "line",
          source: DH_SAFOUH1_SRC,
          paint: {
            "line-color": "#9333EA",
            "line-width": 1.5,
            "line-dasharray": [2, 2],
          },
        });
      } catch (e) {
        console.error("[dh-safouh-1] load failed", e);
      }
    }

    // ── Dubai Land (B1-04) (DDA) ───────────────────────────────────
    if (!map.getSource(DL_B104_SRC)) {
      try {
        const r = await fetch("/api/layers/dda/dubai-land-b1-04");
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        const data: GeoJSON.FeatureCollection = await r.json();
        map.addSource(DL_B104_SRC, { type: "geojson", data });
        map.addLayer({
          id: DL_B104_FILL,
          type: "fill",
          source: DL_B104_SRC,
          paint: { "fill-color": "#9333EA", "fill-opacity": 0.05 },
        });
        map.addLayer({
          id: DL_B104_LINE,
          type: "line",
          source: DL_B104_SRC,
          paint: {
            "line-color": "#9333EA",
            "line-width": 1.5,
            "line-dasharray": [2, 2],
          },
        });
      } catch (e) {
        console.error("[dubai-land-b1-04] load failed", e);
      }
    }

    // ── Dham — Al Rowaiyah 1st (DDA) ───────────────────────────────
    if (!map.getSource(DHAM_ROW1_SRC)) {
      try {
        const r = await fetch("/api/layers/dda/dham-rowaiyah-1");
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        const data: GeoJSON.FeatureCollection = await r.json();
        map.addSource(DHAM_ROW1_SRC, { type: "geojson", data });
        map.addLayer({
          id: DHAM_ROW1_FILL,
          type: "fill",
          source: DHAM_ROW1_SRC,
          paint: { "fill-color": "#9333EA", "fill-opacity": 0.05 },
        });
        map.addLayer({
          id: DHAM_ROW1_LINE,
          type: "line",
          source: DHAM_ROW1_SRC,
          paint: {
            "line-color": "#9333EA",
            "line-width": 1.5,
            "line-dasharray": [2, 2],
          },
        });
      } catch (e) {
        console.error("[dham-rowaiyah-1] load failed", e);
      }
    }

    // ── Dubai Land (B2-08) (DDA) ───────────────────────────────────
    if (!map.getSource(DL_B208_SRC)) {
      try {
        const r = await fetch("/api/layers/dda/dubai-land-b2-08");
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        const data: GeoJSON.FeatureCollection = await r.json();
        map.addSource(DL_B208_SRC, { type: "geojson", data });
        map.addLayer({
          id: DL_B208_FILL,
          type: "fill",
          source: DL_B208_SRC,
          paint: { "fill-color": "#9333EA", "fill-opacity": 0.05 },
        });
        map.addLayer({
          id: DL_B208_LINE,
          type: "line",
          source: DL_B208_SRC,
          paint: {
            "line-color": "#9333EA",
            "line-width": 1.5,
            "line-dasharray": [2, 2],
          },
        });
      } catch (e) {
        console.error("[dubai-land-b2-08] load failed", e);
      }
    }

    // ── The Beach (DDA) ────────────────────────────────────────────
    if (!map.getSource(BEACH_SRC)) {
      try {
        const r = await fetch("/api/layers/dda/the-beach");
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        const data: GeoJSON.FeatureCollection = await r.json();
        map.addSource(BEACH_SRC, { type: "geojson", data });
        map.addLayer({
          id: BEACH_FILL,
          type: "fill",
          source: BEACH_SRC,
          paint: { "fill-color": "#9333EA", "fill-opacity": 0.05 },
        });
        map.addLayer({
          id: BEACH_LINE,
          type: "line",
          source: BEACH_SRC,
          paint: {
            "line-color": "#9333EA",
            "line-width": 1.5,
            "line-dasharray": [2, 2],
          },
        });
      } catch (e) {
        console.error("[the-beach] load failed", e);
      }
    }

    // ── Shamal — Umm Suqeim 3rd (DDA) ──────────────────────────────
    if (!map.getSource(SHAMAL_US3_SRC)) {
      try {
        const r = await fetch("/api/layers/dda/shamal-us-3");
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        const data: GeoJSON.FeatureCollection = await r.json();
        map.addSource(SHAMAL_US3_SRC, { type: "geojson", data });
        map.addLayer({
          id: SHAMAL_US3_FILL,
          type: "fill",
          source: SHAMAL_US3_SRC,
          paint: { "fill-color": "#9333EA", "fill-opacity": 0.05 },
        });
        map.addLayer({
          id: SHAMAL_US3_LINE,
          type: "line",
          source: SHAMAL_US3_SRC,
          paint: {
            "line-color": "#9333EA",
            "line-width": 1.5,
            "line-dasharray": [2, 2],
          },
        });
      } catch (e) {
        console.error("[shamal-us-3] load failed", e);
      }
    }

    // ── Meraas — Le Hemaira (DDA) ──────────────────────────────────
    if (!map.getSource(MERAAS_HEMAIRA_SRC)) {
      try {
        const r = await fetch("/api/layers/dda/meraas-hemaira");
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        const data: GeoJSON.FeatureCollection = await r.json();
        map.addSource(MERAAS_HEMAIRA_SRC, { type: "geojson", data });
        map.addLayer({
          id: MERAAS_HEMAIRA_FILL,
          type: "fill",
          source: MERAAS_HEMAIRA_SRC,
          paint: { "fill-color": "#9333EA", "fill-opacity": 0.05 },
        });
        map.addLayer({
          id: MERAAS_HEMAIRA_LINE,
          type: "line",
          source: MERAAS_HEMAIRA_SRC,
          paint: {
            "line-color": "#9333EA",
            "line-width": 1.5,
            "line-dasharray": [2, 2],
          },
        });
      } catch (e) {
        console.error("[meraas-hemaira] load failed", e);
      }
    }

    // ── DP — Al Qouz Ind. 2nd (DDA) ────────────────────────────────
    if (!map.getSource(DP_QUOZ2_SRC)) {
      try {
        const r = await fetch("/api/layers/dda/dp-quoz-2");
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        const data: GeoJSON.FeatureCollection = await r.json();
        map.addSource(DP_QUOZ2_SRC, { type: "geojson", data });
        map.addLayer({
          id: DP_QUOZ2_FILL,
          type: "fill",
          source: DP_QUOZ2_SRC,
          paint: { "fill-color": "#9333EA", "fill-opacity": 0.05 },
        });
        map.addLayer({
          id: DP_QUOZ2_LINE,
          type: "line",
          source: DP_QUOZ2_SRC,
          paint: {
            "line-color": "#9333EA",
            "line-width": 1.5,
            "line-dasharray": [2, 2],
          },
        });
      } catch (e) {
        console.error("[dp-quoz-2] load failed", e);
      }
    }

    // ── Dubai Land (B1-03) (DDA) ───────────────────────────────────
    if (!map.getSource(DL_B103_SRC)) {
      try {
        const r = await fetch("/api/layers/dda/dubai-land-b1-03");
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        const data: GeoJSON.FeatureCollection = await r.json();
        map.addSource(DL_B103_SRC, { type: "geojson", data });
        map.addLayer({
          id: DL_B103_FILL,
          type: "fill",
          source: DL_B103_SRC,
          paint: { "fill-color": "#9333EA", "fill-opacity": 0.05 },
        });
        map.addLayer({
          id: DL_B103_LINE,
          type: "line",
          source: DL_B103_SRC,
          paint: {
            "line-color": "#9333EA",
            "line-width": 1.5,
            "line-dasharray": [2, 2],
          },
        });
      } catch (e) {
        console.error("[dubai-land-b1-03] load failed", e);
      }
    }

    // ── Jumeirah Group — Jumeira 2nd (DDA) ─────────────────────────
    if (!map.getSource(JG_J2_SRC)) {
      try {
        const r = await fetch("/api/layers/dda/jg-jumeira-2");
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        const data: GeoJSON.FeatureCollection = await r.json();
        map.addSource(JG_J2_SRC, { type: "geojson", data });
        map.addLayer({
          id: JG_J2_FILL,
          type: "fill",
          source: JG_J2_SRC,
          paint: { "fill-color": "#9333EA", "fill-opacity": 0.05 },
        });
        map.addLayer({
          id: JG_J2_LINE,
          type: "line",
          source: JG_J2_SRC,
          paint: {
            "line-color": "#9333EA",
            "line-width": 1.5,
            "line-dasharray": [2, 2],
          },
        });
      } catch (e) {
        console.error("[jg-jumeira-2] load failed", e);
      }
    }

    // ── Dubai Land (T.15) (DDA) ────────────────────────────────────
    if (!map.getSource(DL_T15_SRC)) {
      try {
        const r = await fetch("/api/layers/dda/dubai-land-t15");
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        const data: GeoJSON.FeatureCollection = await r.json();
        map.addSource(DL_T15_SRC, { type: "geojson", data });
        map.addLayer({
          id: DL_T15_FILL,
          type: "fill",
          source: DL_T15_SRC,
          paint: { "fill-color": "#9333EA", "fill-opacity": 0.05 },
        });
        map.addLayer({
          id: DL_T15_LINE,
          type: "line",
          source: DL_T15_SRC,
          paint: {
            "line-color": "#9333EA",
            "line-width": 1.5,
            "line-dasharray": [2, 2],
          },
        });
      } catch (e) {
        console.error("[dubai-land-t15] load failed", e);
      }
    }

    // ── Shamal — Al Wasl (DDA) ─────────────────────────────────────
    if (!map.getSource(SHAMAL_WASL_SRC)) {
      try {
        const r = await fetch("/api/layers/dda/shamal-wasl");
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        const data: GeoJSON.FeatureCollection = await r.json();
        map.addSource(SHAMAL_WASL_SRC, { type: "geojson", data });
        map.addLayer({
          id: SHAMAL_WASL_FILL,
          type: "fill",
          source: SHAMAL_WASL_SRC,
          paint: { "fill-color": "#9333EA", "fill-opacity": 0.05 },
        });
        map.addLayer({
          id: SHAMAL_WASL_LINE,
          type: "line",
          source: SHAMAL_WASL_SRC,
          paint: {
            "line-color": "#9333EA",
            "line-width": 1.5,
            "line-dasharray": [2, 2],
          },
        });
      } catch (e) {
        console.error("[shamal-wasl] load failed", e);
      }
    }

    // ── Dubai Land (A3-04) (DDA) ───────────────────────────────────
    if (!map.getSource(DL_A304_SRC)) {
      try {
        const r = await fetch("/api/layers/dda/dubai-land-a3-04");
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        const data: GeoJSON.FeatureCollection = await r.json();
        map.addSource(DL_A304_SRC, { type: "geojson", data });
        map.addLayer({
          id: DL_A304_FILL,
          type: "fill",
          source: DL_A304_SRC,
          paint: { "fill-color": "#9333EA", "fill-opacity": 0.05 },
        });
        map.addLayer({
          id: DL_A304_LINE,
          type: "line",
          source: DL_A304_SRC,
          paint: {
            "line-color": "#9333EA",
            "line-width": 1.5,
            "line-dasharray": [2, 2],
          },
        });
      } catch (e) {
        console.error("[dubai-land-a3-04] load failed", e);
      }
    }

    // ── Emirates Academy (EAHM) (DDA) ──────────────────────────────
    if (!map.getSource(EAHM_SRC)) {
      try {
        const r = await fetch("/api/layers/dda/eahm");
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        const data: GeoJSON.FeatureCollection = await r.json();
        map.addSource(EAHM_SRC, { type: "geojson", data });
        map.addLayer({
          id: EAHM_FILL,
          type: "fill",
          source: EAHM_SRC,
          paint: { "fill-color": "#9333EA", "fill-opacity": 0.05 },
        });
        map.addLayer({
          id: EAHM_LINE,
          type: "line",
          source: EAHM_SRC,
          paint: {
            "line-color": "#9333EA",
            "line-width": 1.5,
            "line-dasharray": [2, 2],
          },
        });
      } catch (e) {
        console.error("[eahm] load failed", e);
      }
    }

    // ── Meraas — Za'abeel 2nd (DDA) ────────────────────────────────
    if (!map.getSource(MERAAS_ZABEEL2_SRC)) {
      try {
        const r = await fetch("/api/layers/dda/meraas-zabeel-2");
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        const data: GeoJSON.FeatureCollection = await r.json();
        map.addSource(MERAAS_ZABEEL2_SRC, { type: "geojson", data });
        map.addLayer({
          id: MERAAS_ZABEEL2_FILL,
          type: "fill",
          source: MERAAS_ZABEEL2_SRC,
          paint: { "fill-color": "#9333EA", "fill-opacity": 0.05 },
        });
        map.addLayer({
          id: MERAAS_ZABEEL2_LINE,
          type: "line",
          source: MERAAS_ZABEEL2_SRC,
          paint: {
            "line-color": "#9333EA",
            "line-width": 1.5,
            "line-dasharray": [2, 2],
          },
        });
      } catch (e) {
        console.error("[meraas-zabeel-2] load failed", e);
      }
    }

    // ── Meraas — Al Jafiliya (DDA) ─────────────────────────────────
    if (!map.getSource(MERAAS_JAFILIYA_SRC)) {
      try {
        const r = await fetch("/api/layers/dda/meraas-jafiliya");
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        const data: GeoJSON.FeatureCollection = await r.json();
        map.addSource(MERAAS_JAFILIYA_SRC, { type: "geojson", data });
        map.addLayer({
          id: MERAAS_JAFILIYA_FILL,
          type: "fill",
          source: MERAAS_JAFILIYA_SRC,
          paint: { "fill-color": "#9333EA", "fill-opacity": 0.05 },
        });
        map.addLayer({
          id: MERAAS_JAFILIYA_LINE,
          type: "line",
          source: MERAAS_JAFILIYA_SRC,
          paint: {
            "line-color": "#9333EA",
            "line-width": 1.5,
            "line-dasharray": [2, 2],
          },
        });
      } catch (e) {
        console.error("[meraas-jafiliya] load failed", e);
      }
    }

    // ── Kite Beach (DDA) ───────────────────────────────────────────
    if (!map.getSource(KITE_SRC)) {
      try {
        const r = await fetch("/api/layers/dda/kite-beach");
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        const data: GeoJSON.FeatureCollection = await r.json();
        map.addSource(KITE_SRC, { type: "geojson", data });
        map.addLayer({
          id: KITE_FILL,
          type: "fill",
          source: KITE_SRC,
          paint: { "fill-color": "#9333EA", "fill-opacity": 0.05 },
        });
        map.addLayer({
          id: KITE_LINE,
          type: "line",
          source: KITE_SRC,
          paint: {
            "line-color": "#9333EA",
            "line-width": 1.5,
            "line-dasharray": [2, 2],
          },
        });
      } catch (e) {
        console.error("[kite-beach] load failed", e);
      }
    }

    // ── Meraas — Wadi Alamardi (DDA) ───────────────────────────────
    if (!map.getSource(MERAAS_ALAMARDI_SRC)) {
      try {
        const r = await fetch("/api/layers/dda/meraas-alamardi");
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        const data: GeoJSON.FeatureCollection = await r.json();
        map.addSource(MERAAS_ALAMARDI_SRC, { type: "geojson", data });
        map.addLayer({
          id: MERAAS_ALAMARDI_FILL,
          type: "fill",
          source: MERAAS_ALAMARDI_SRC,
          paint: { "fill-color": "#9333EA", "fill-opacity": 0.05 },
        });
        map.addLayer({
          id: MERAAS_ALAMARDI_LINE,
          type: "line",
          source: MERAAS_ALAMARDI_SRC,
          paint: {
            "line-color": "#9333EA",
            "line-width": 1.5,
            "line-dasharray": [2, 2],
          },
        });
      } catch (e) {
        console.error("[meraas-alamardi] load failed", e);
      }
    }

    // ── Meraas — Port Saeed (DDA) ──────────────────────────────────
    if (!map.getSource(MERAAS_PORTSAEED_SRC)) {
      try {
        const r = await fetch("/api/layers/dda/meraas-port-saeed");
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        const data: GeoJSON.FeatureCollection = await r.json();
        map.addSource(MERAAS_PORTSAEED_SRC, { type: "geojson", data });
        map.addLayer({
          id: MERAAS_PORTSAEED_FILL,
          type: "fill",
          source: MERAAS_PORTSAEED_SRC,
          paint: { "fill-color": "#9333EA", "fill-opacity": 0.05 },
        });
        map.addLayer({
          id: MERAAS_PORTSAEED_LINE,
          type: "line",
          source: MERAAS_PORTSAEED_SRC,
          paint: {
            "line-color": "#9333EA",
            "line-width": 1.5,
            "line-dasharray": [2, 2],
          },
        });
      } catch (e) {
        console.error("[meraas-port-saeed] load failed", e);
      }
    }

    // ── Dubai Land (6461281) (DDA) ─────────────────────────────────
    if (!map.getSource(DL_6461281_SRC)) {
      try {
        const r = await fetch("/api/layers/dda/dl-6461281");
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        const data: GeoJSON.FeatureCollection = await r.json();
        map.addSource(DL_6461281_SRC, { type: "geojson", data });
        map.addLayer({
          id: DL_6461281_FILL,
          type: "fill",
          source: DL_6461281_SRC,
          paint: { "fill-color": "#9333EA", "fill-opacity": 0.05 },
        });
        map.addLayer({
          id: DL_6461281_LINE,
          type: "line",
          source: DL_6461281_SRC,
          paint: {
            "line-color": "#9333EA",
            "line-width": 1.5,
            "line-dasharray": [2, 2],
          },
        });
      } catch (e) {
        console.error("[dl-6461281] load failed", e);
      }
    }

    // ── Shamal — Oud Metha (DDA) ───────────────────────────────────
    if (!map.getSource(SHAMAL_OUDM_SRC)) {
      try {
        const r = await fetch("/api/layers/dda/shamal-oud-metha");
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        const data: GeoJSON.FeatureCollection = await r.json();
        map.addSource(SHAMAL_OUDM_SRC, { type: "geojson", data });
        map.addLayer({
          id: SHAMAL_OUDM_FILL,
          type: "fill",
          source: SHAMAL_OUDM_SRC,
          paint: { "fill-color": "#9333EA", "fill-opacity": 0.05 },
        });
        map.addLayer({
          id: SHAMAL_OUDM_LINE,
          type: "line",
          source: SHAMAL_OUDM_SRC,
          paint: {
            "line-color": "#9333EA",
            "line-width": 1.5,
            "line-dasharray": [2, 2],
          },
        });
      } catch (e) {
        console.error("[shamal-oud-metha] load failed", e);
      }
    }

    // ── Shamal — Al Qouz 3rd (DDA) ─────────────────────────────────
    if (!map.getSource(SHAMAL_Q3_SRC)) {
      try {
        const r = await fetch("/api/layers/dda/shamal-quoz-3");
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        const data: GeoJSON.FeatureCollection = await r.json();
        map.addSource(SHAMAL_Q3_SRC, { type: "geojson", data });
        map.addLayer({
          id: SHAMAL_Q3_FILL,
          type: "fill",
          source: SHAMAL_Q3_SRC,
          paint: { "fill-color": "#9333EA", "fill-opacity": 0.05 },
        });
        map.addLayer({
          id: SHAMAL_Q3_LINE,
          type: "line",
          source: SHAMAL_Q3_SRC,
          paint: {
            "line-color": "#9333EA",
            "line-width": 1.5,
            "line-dasharray": [2, 2],
          },
        });
      } catch (e) {
        console.error("[shamal-quoz-3] load failed", e);
      }
    }

    // ── Dubai Land (A3-07) (DDA) ───────────────────────────────────
    if (!map.getSource(DL_A307_SRC)) {
      try {
        const r = await fetch("/api/layers/dda/dubai-land-a3-07");
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        const data: GeoJSON.FeatureCollection = await r.json();
        map.addSource(DL_A307_SRC, { type: "geojson", data });
        map.addLayer({
          id: DL_A307_FILL,
          type: "fill",
          source: DL_A307_SRC,
          paint: { "fill-color": "#9333EA", "fill-opacity": 0.05 },
        });
        map.addLayer({
          id: DL_A307_LINE,
          type: "line",
          source: DL_A307_SRC,
          paint: {
            "line-color": "#9333EA",
            "line-width": 1.5,
            "line-dasharray": [2, 2],
          },
        });
      } catch (e) {
        console.error("[dubai-land-a3-07] load failed", e);
      }
    }

    // ── Wadi Al Safa 3 (6456408) (DDA) ─────────────────────────────
    if (!map.getSource(WAS3_6456408_SRC)) {
      try {
        const r = await fetch("/api/layers/dda/was3-6456408");
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        const data: GeoJSON.FeatureCollection = await r.json();
        map.addSource(WAS3_6456408_SRC, { type: "geojson", data });
        map.addLayer({
          id: WAS3_6456408_FILL,
          type: "fill",
          source: WAS3_6456408_SRC,
          paint: { "fill-color": "#9333EA", "fill-opacity": 0.05 },
        });
        map.addLayer({
          id: WAS3_6456408_LINE,
          type: "line",
          source: WAS3_6456408_SRC,
          paint: {
            "line-color": "#9333EA",
            "line-width": 1.5,
            "line-dasharray": [2, 2],
          },
        });
      } catch (e) {
        console.error("[was3-6456408] load failed", e);
      }
    }

    // ── Shamal — Al Qouz Ind. 1st (DDA) ────────────────────────────
    if (!map.getSource(SHAMAL_Q1_SRC)) {
      try {
        const r = await fetch("/api/layers/dda/shamal-quoz-1");
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        const data: GeoJSON.FeatureCollection = await r.json();
        map.addSource(SHAMAL_Q1_SRC, { type: "geojson", data });
        map.addLayer({
          id: SHAMAL_Q1_FILL,
          type: "fill",
          source: SHAMAL_Q1_SRC,
          paint: { "fill-color": "#9333EA", "fill-opacity": 0.05 },
        });
        map.addLayer({
          id: SHAMAL_Q1_LINE,
          type: "line",
          source: SHAMAL_Q1_SRC,
          paint: {
            "line-color": "#9333EA",
            "line-width": 1.5,
            "line-dasharray": [2, 2],
          },
        });
      } catch (e) {
        console.error("[shamal-quoz-1] load failed", e);
      }
    }

    // ── Meraas — Nadd Al Shiba 4th (DDA) ───────────────────────────
    if (!map.getSource(MERAAS_NAS4_SRC)) {
      try {
        const r = await fetch("/api/layers/dda/meraas-nas-4");
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        const data: GeoJSON.FeatureCollection = await r.json();
        map.addSource(MERAAS_NAS4_SRC, { type: "geojson", data });
        map.addLayer({
          id: MERAAS_NAS4_FILL,
          type: "fill",
          source: MERAAS_NAS4_SRC,
          paint: { "fill-color": "#9333EA", "fill-opacity": 0.05 },
        });
        map.addLayer({
          id: MERAAS_NAS4_LINE,
          type: "line",
          source: MERAAS_NAS4_SRC,
          paint: {
            "line-color": "#9333EA",
            "line-width": 1.5,
            "line-dasharray": [2, 2],
          },
        });
      } catch (e) {
        console.error("[meraas-nas-4] load failed", e);
      }
    }

    // ── Shamal — Muhaisnah 1st (DDA) ───────────────────────────────
    if (!map.getSource(SHAMAL_MUH1_SRC)) {
      try {
        const r = await fetch("/api/layers/dda/shamal-muhaisnah-1");
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        const data: GeoJSON.FeatureCollection = await r.json();
        map.addSource(SHAMAL_MUH1_SRC, { type: "geojson", data });
        map.addLayer({
          id: SHAMAL_MUH1_FILL,
          type: "fill",
          source: SHAMAL_MUH1_SRC,
          paint: { "fill-color": "#9333EA", "fill-opacity": 0.05 },
        });
        map.addLayer({
          id: SHAMAL_MUH1_LINE,
          type: "line",
          source: SHAMAL_MUH1_SRC,
          paint: {
            "line-color": "#9333EA",
            "line-width": 1.5,
            "line-dasharray": [2, 2],
          },
        });
      } catch (e) {
        console.error("[shamal-muhaisnah-1] load failed", e);
      }
    }

    // ── Shamal — Jumeira 1st (DDA) ─────────────────────────────────
    if (!map.getSource(SHAMAL_J1_SRC)) {
      try {
        const r = await fetch("/api/layers/dda/shamal-jumeira-1");
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        const data: GeoJSON.FeatureCollection = await r.json();
        map.addSource(SHAMAL_J1_SRC, { type: "geojson", data });
        map.addLayer({
          id: SHAMAL_J1_FILL,
          type: "fill",
          source: SHAMAL_J1_SRC,
          paint: { "fill-color": "#9333EA", "fill-opacity": 0.05 },
        });
        map.addLayer({
          id: SHAMAL_J1_LINE,
          type: "line",
          source: SHAMAL_J1_SRC,
          paint: {
            "line-color": "#9333EA",
            "line-width": 1.5,
            "line-dasharray": [2, 2],
          },
        });
      } catch (e) {
        console.error("[shamal-jumeira-1] load failed", e);
      }
    }

    // ── Meraas — Al Qusais Ind. 2nd (DDA) ──────────────────────────
    if (!map.getSource(MERAAS_QUSAIS2_SRC)) {
      try {
        const r = await fetch("/api/layers/dda/meraas-qusais-2");
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        const data: GeoJSON.FeatureCollection = await r.json();
        map.addSource(MERAAS_QUSAIS2_SRC, { type: "geojson", data });
        map.addLayer({
          id: MERAAS_QUSAIS2_FILL,
          type: "fill",
          source: MERAAS_QUSAIS2_SRC,
          paint: { "fill-color": "#9333EA", "fill-opacity": 0.05 },
        });
        map.addLayer({
          id: MERAAS_QUSAIS2_LINE,
          type: "line",
          source: MERAAS_QUSAIS2_SRC,
          paint: {
            "line-color": "#9333EA",
            "line-width": 1.5,
            "line-dasharray": [2, 2],
          },
        });
      } catch (e) {
        console.error("[meraas-qusais-2] load failed", e);
      }
    }

    // ── Shamal — Al Maha (DDA) ─────────────────────────────────────
    if (!map.getSource(SHAMAL_MAHA_SRC)) {
      try {
        const r = await fetch("/api/layers/dda/shamal-maha");
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        const data: GeoJSON.FeatureCollection = await r.json();
        map.addSource(SHAMAL_MAHA_SRC, { type: "geojson", data });
        map.addLayer({
          id: SHAMAL_MAHA_FILL,
          type: "fill",
          source: SHAMAL_MAHA_SRC,
          paint: { "fill-color": "#9333EA", "fill-opacity": 0.05 },
        });
        map.addLayer({
          id: SHAMAL_MAHA_LINE,
          type: "line",
          source: SHAMAL_MAHA_SRC,
          paint: {
            "line-color": "#9333EA",
            "line-width": 1.5,
            "line-dasharray": [2, 2],
          },
        });
      } catch (e) {
        console.error("[shamal-maha] load failed", e);
      }
    }

    // ── Lunaya (DDA) ───────────────────────────────────────────────
    if (!map.getSource(LUNAYA_SRC)) {
      try {
        const r = await fetch("/api/layers/dda/lunaya");
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        const data: GeoJSON.FeatureCollection = await r.json();
        map.addSource(LUNAYA_SRC, { type: "geojson", data });
        map.addLayer({
          id: LUNAYA_FILL,
          type: "fill",
          source: LUNAYA_SRC,
          paint: { "fill-color": "#9333EA", "fill-opacity": 0.05 },
        });
        map.addLayer({
          id: LUNAYA_LINE,
          type: "line",
          source: LUNAYA_SRC,
          paint: {
            "line-color": "#9333EA",
            "line-width": 1.5,
            "line-dasharray": [2, 2],
          },
        });
      } catch (e) {
        console.error("[lunaya] load failed", e);
      }
    }

    // ── Meraas — Umm Suqeim 1st (DDA) ──────────────────────────────
    if (!map.getSource(MERAAS_US1_SRC)) {
      try {
        const r = await fetch("/api/layers/dda/meraas-us-1");
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        const data: GeoJSON.FeatureCollection = await r.json();
        map.addSource(MERAAS_US1_SRC, { type: "geojson", data });
        map.addLayer({
          id: MERAAS_US1_FILL,
          type: "fill",
          source: MERAAS_US1_SRC,
          paint: { "fill-color": "#9333EA", "fill-opacity": 0.05 },
        });
        map.addLayer({
          id: MERAAS_US1_LINE,
          type: "line",
          source: MERAAS_US1_SRC,
          paint: {
            "line-color": "#9333EA",
            "line-width": 1.5,
            "line-dasharray": [2, 2],
          },
        });
      } catch (e) {
        console.error("[meraas-us-1] load failed", e);
      }
    }

    // ── Shamal — Al Nahda 1st (DDA) ────────────────────────────────
    if (!map.getSource(SHAMAL_NAHDA1_SRC)) {
      try {
        const r = await fetch("/api/layers/dda/shamal-nahda-1");
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        const data: GeoJSON.FeatureCollection = await r.json();
        map.addSource(SHAMAL_NAHDA1_SRC, { type: "geojson", data });
        map.addLayer({
          id: SHAMAL_NAHDA1_FILL,
          type: "fill",
          source: SHAMAL_NAHDA1_SRC,
          paint: { "fill-color": "#9333EA", "fill-opacity": 0.05 },
        });
        map.addLayer({
          id: SHAMAL_NAHDA1_LINE,
          type: "line",
          source: SHAMAL_NAHDA1_SRC,
          paint: {
            "line-color": "#9333EA",
            "line-width": 1.5,
            "line-dasharray": [2, 2],
          },
        });
      } catch (e) {
        console.error("[shamal-nahda-1] load failed", e);
      }
    }

    // ── Shamal — Al Safouh 1st (DDA) ───────────────────────────────
    if (!map.getSource(SHAMAL_SAFOUH1_SRC)) {
      try {
        const r = await fetch("/api/layers/dda/shamal-safouh-1");
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        const data: GeoJSON.FeatureCollection = await r.json();
        map.addSource(SHAMAL_SAFOUH1_SRC, { type: "geojson", data });
        map.addLayer({
          id: SHAMAL_SAFOUH1_FILL,
          type: "fill",
          source: SHAMAL_SAFOUH1_SRC,
          paint: { "fill-color": "#9333EA", "fill-opacity": 0.05 },
        });
        map.addLayer({
          id: SHAMAL_SAFOUH1_LINE,
          type: "line",
          source: SHAMAL_SAFOUH1_SRC,
          paint: {
            "line-color": "#9333EA",
            "line-width": 1.5,
            "line-dasharray": [2, 2],
          },
        });
      } catch (e) {
        console.error("[shamal-safouh-1] load failed", e);
      }
    }

    // ── Shamal — Margham (DDA) ─────────────────────────────────────
    if (!map.getSource(SHAMAL_MARGHAM_SRC)) {
      try {
        const r = await fetch("/api/layers/dda/shamal-margham");
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        const data: GeoJSON.FeatureCollection = await r.json();
        map.addSource(SHAMAL_MARGHAM_SRC, { type: "geojson", data });
        map.addLayer({
          id: SHAMAL_MARGHAM_FILL,
          type: "fill",
          source: SHAMAL_MARGHAM_SRC,
          paint: { "fill-color": "#9333EA", "fill-opacity": 0.05 },
        });
        map.addLayer({
          id: SHAMAL_MARGHAM_LINE,
          type: "line",
          source: SHAMAL_MARGHAM_SRC,
          paint: {
            "line-color": "#9333EA",
            "line-width": 1.5,
            "line-dasharray": [2, 2],
          },
        });
      } catch (e) {
        console.error("[shamal-margham] load failed", e);
      }
    }

    // ── Wild Wadi Water Park (DDA) ─────────────────────────────────
    if (!map.getSource(WILD_WADI_SRC)) {
      try {
        const r = await fetch("/api/layers/dda/wild-wadi");
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        const data: GeoJSON.FeatureCollection = await r.json();
        map.addSource(WILD_WADI_SRC, { type: "geojson", data });
        map.addLayer({
          id: WILD_WADI_FILL,
          type: "fill",
          source: WILD_WADI_SRC,
          paint: { "fill-color": "#9333EA", "fill-opacity": 0.05 },
        });
        map.addLayer({
          id: WILD_WADI_LINE,
          type: "line",
          source: WILD_WADI_SRC,
          paint: {
            "line-color": "#9333EA",
            "line-width": 1.5,
            "line-dasharray": [2, 2],
          },
        });
      } catch (e) {
        console.error("[wild-wadi] load failed", e);
      }
    }

    // ── Meraas — Al Barsha South 1st (DDA) ─────────────────────────
    if (!map.getSource(MERAAS_BS1_SRC)) {
      try {
        const r = await fetch("/api/layers/dda/meraas-bs-1");
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        const data: GeoJSON.FeatureCollection = await r.json();
        map.addSource(MERAAS_BS1_SRC, { type: "geojson", data });
        map.addLayer({
          id: MERAAS_BS1_FILL,
          type: "fill",
          source: MERAAS_BS1_SRC,
          paint: { "fill-color": "#9333EA", "fill-opacity": 0.05 },
        });
        map.addLayer({
          id: MERAAS_BS1_LINE,
          type: "line",
          source: MERAAS_BS1_SRC,
          paint: {
            "line-color": "#9333EA",
            "line-width": 1.5,
            "line-dasharray": [2, 2],
          },
        });
      } catch (e) {
        console.error("[meraas-bs-1] load failed", e);
      }
    }

    // ── Dubai Land (A4-09) (DDA) ───────────────────────────────────
    if (!map.getSource(DL_A409_SRC)) {
      try {
        const r = await fetch("/api/layers/dda/dubai-land-a4-09");
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        const data: GeoJSON.FeatureCollection = await r.json();
        map.addSource(DL_A409_SRC, { type: "geojson", data });
        map.addLayer({
          id: DL_A409_FILL,
          type: "fill",
          source: DL_A409_SRC,
          paint: { "fill-color": "#9333EA", "fill-opacity": 0.05 },
        });
        map.addLayer({
          id: DL_A409_LINE,
          type: "line",
          source: DL_A409_SRC,
          paint: {
            "line-color": "#9333EA",
            "line-width": 1.5,
            "line-dasharray": [2, 2],
          },
        });
      } catch (e) {
        console.error("[dubai-land-a4-09] load failed", e);
      }
    }

    // ── Za'abeel First Plot (DDA) ──────────────────────────────────
    if (!map.getSource(ZABEEL1_SRC)) {
      try {
        const r = await fetch("/api/layers/dda/zabeel-first");
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        const data: GeoJSON.FeatureCollection = await r.json();
        map.addSource(ZABEEL1_SRC, { type: "geojson", data });
        map.addLayer({
          id: ZABEEL1_FILL,
          type: "fill",
          source: ZABEEL1_SRC,
          paint: { "fill-color": "#9333EA", "fill-opacity": 0.05 },
        });
        map.addLayer({
          id: ZABEEL1_LINE,
          type: "line",
          source: ZABEEL1_SRC,
          paint: {
            "line-color": "#9333EA",
            "line-width": 1.5,
            "line-dasharray": [2, 2],
          },
        });
      } catch (e) {
        console.error("[zabeel-first] load failed", e);
      }
    }

    // ── Wadi Al Safa 3 (6454931) (DDA) ─────────────────────────────
    if (!map.getSource(WAS3_6454931_SRC)) {
      try {
        const r = await fetch("/api/layers/dda/was3-6454931");
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        const data: GeoJSON.FeatureCollection = await r.json();
        map.addSource(WAS3_6454931_SRC, { type: "geojson", data });
        map.addLayer({
          id: WAS3_6454931_FILL,
          type: "fill",
          source: WAS3_6454931_SRC,
          paint: { "fill-color": "#9333EA", "fill-opacity": 0.05 },
        });
        map.addLayer({
          id: WAS3_6454931_LINE,
          type: "line",
          source: WAS3_6454931_SRC,
          paint: {
            "line-color": "#9333EA",
            "line-width": 1.5,
            "line-dasharray": [2, 2],
          },
        });
      } catch (e) {
        console.error("[was3-6454931] load failed", e);
      }
    }

    // ── Meraas Plot 3460266 (DDA) ──────────────────────────────────
    if (!map.getSource(MERAAS_3460266_SRC)) {
      try {
        const r = await fetch("/api/layers/dda/meraas-3460266");
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        const data: GeoJSON.FeatureCollection = await r.json();
        map.addSource(MERAAS_3460266_SRC, { type: "geojson", data });
        map.addLayer({
          id: MERAAS_3460266_FILL,
          type: "fill",
          source: MERAAS_3460266_SRC,
          paint: { "fill-color": "#9333EA", "fill-opacity": 0.05 },
        });
        map.addLayer({
          id: MERAAS_3460266_LINE,
          type: "line",
          source: MERAAS_3460266_SRC,
          paint: {
            "line-color": "#9333EA",
            "line-width": 1.5,
            "line-dasharray": [2, 2],
          },
        });
      } catch (e) {
        console.error("[meraas-3460266] load failed", e);
      }
    }

    // ── Museum of the Future (DDA) ─────────────────────────────────
    if (!map.getSource(MUSEUM_FUTURE_SRC)) {
      try {
        const r = await fetch("/api/layers/dda/museum-future");
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        const data: GeoJSON.FeatureCollection = await r.json();
        map.addSource(MUSEUM_FUTURE_SRC, { type: "geojson", data });
        map.addLayer({
          id: MUSEUM_FUTURE_FILL,
          type: "fill",
          source: MUSEUM_FUTURE_SRC,
          paint: { "fill-color": "#9333EA", "fill-opacity": 0.05 },
        });
        map.addLayer({
          id: MUSEUM_FUTURE_LINE,
          type: "line",
          source: MUSEUM_FUTURE_SRC,
          paint: {
            "line-color": "#9333EA",
            "line-width": 1.5,
            "line-dasharray": [2, 2],
          },
        });
      } catch (e) {
        console.error("[museum-future] load failed", e);
      }
    }

    // ── Al Jalila Children's Hospital (DDA) ────────────────────────
    if (!map.getSource(AL_JALILA_SRC)) {
      try {
        const r = await fetch("/api/layers/dda/al-jalila");
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        const data: GeoJSON.FeatureCollection = await r.json();
        map.addSource(AL_JALILA_SRC, { type: "geojson", data });
        map.addLayer({
          id: AL_JALILA_FILL,
          type: "fill",
          source: AL_JALILA_SRC,
          paint: { "fill-color": "#9333EA", "fill-opacity": 0.05 },
        });
        map.addLayer({
          id: AL_JALILA_LINE,
          type: "line",
          source: AL_JALILA_SRC,
          paint: {
            "line-color": "#9333EA",
            "line-width": 1.5,
            "line-dasharray": [2, 2],
          },
        });
      } catch (e) {
        console.error("[al-jalila] load failed", e);
      }
    }

    // ── Dubai Land (A1-02) (DDA) ───────────────────────────────────
    if (!map.getSource(DL_A102_SRC)) {
      try {
        const r = await fetch("/api/layers/dda/dubai-land-a1-02");
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        const data: GeoJSON.FeatureCollection = await r.json();
        map.addSource(DL_A102_SRC, { type: "geojson", data });
        map.addLayer({
          id: DL_A102_FILL,
          type: "fill",
          source: DL_A102_SRC,
          paint: { "fill-color": "#9333EA", "fill-opacity": 0.05 },
        });
        map.addLayer({
          id: DL_A102_LINE,
          type: "line",
          source: DL_A102_SRC,
          paint: {
            "line-color": "#9333EA",
            "line-width": 1.5,
            "line-dasharray": [2, 2],
          },
        });
      } catch (e) {
        console.error("[dubai-land-a1-02] load failed", e);
      }
    }

    // ── Meraas — Al Warqa'a 2nd (DDA) ──────────────────────────────
    if (!map.getSource(MERAAS_WARQA2_SRC)) {
      try {
        const r = await fetch("/api/layers/dda/meraas-warqa-2");
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        const data: GeoJSON.FeatureCollection = await r.json();
        map.addSource(MERAAS_WARQA2_SRC, { type: "geojson", data });
        map.addLayer({
          id: MERAAS_WARQA2_FILL,
          type: "fill",
          source: MERAAS_WARQA2_SRC,
          paint: { "fill-color": "#9333EA", "fill-opacity": 0.05 },
        });
        map.addLayer({
          id: MERAAS_WARQA2_LINE,
          type: "line",
          source: MERAAS_WARQA2_SRC,
          paint: {
            "line-color": "#9333EA",
            "line-width": 1.5,
            "line-dasharray": [2, 2],
          },
        });
      } catch (e) {
        console.error("[meraas-warqa-2] load failed", e);
      }
    }

    // ── Meraas — Jumeira 1st (DDA) ─────────────────────────────────
    if (!map.getSource(MERAAS_J1_SRC)) {
      try {
        const r = await fetch("/api/layers/dda/meraas-jumeira-1");
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        const data: GeoJSON.FeatureCollection = await r.json();
        map.addSource(MERAAS_J1_SRC, { type: "geojson", data });
        map.addLayer({
          id: MERAAS_J1_FILL,
          type: "fill",
          source: MERAAS_J1_SRC,
          paint: { "fill-color": "#9333EA", "fill-opacity": 0.05 },
        });
        map.addLayer({
          id: MERAAS_J1_LINE,
          type: "line",
          source: MERAAS_J1_SRC,
          paint: {
            "line-color": "#9333EA",
            "line-width": 1.5,
            "line-dasharray": [2, 2],
          },
        });
      } catch (e) {
        console.error("[meraas-jumeira-1] load failed", e);
      }
    }

    // ── DP — Al Jafiliya (DDA) ─────────────────────────────────────
    if (!map.getSource(DP_JAFILIYA_SRC)) {
      try {
        const r = await fetch("/api/layers/dda/dp-jafiliya");
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        const data: GeoJSON.FeatureCollection = await r.json();
        map.addSource(DP_JAFILIYA_SRC, { type: "geojson", data });
        map.addLayer({
          id: DP_JAFILIYA_FILL,
          type: "fill",
          source: DP_JAFILIYA_SRC,
          paint: { "fill-color": "#9333EA", "fill-opacity": 0.05 },
        });
        map.addLayer({
          id: DP_JAFILIYA_LINE,
          type: "line",
          source: DP_JAFILIYA_SRC,
          paint: {
            "line-color": "#9333EA",
            "line-width": 1.5,
            "line-dasharray": [2, 2],
          },
        });
      } catch (e) {
        console.error("[dp-jafiliya] load failed", e);
      }
    }

    // ── Burj Al Arab (DDA) ─────────────────────────────────────────
    if (!map.getSource(BURJ_AA_SRC)) {
      try {
        const r = await fetch("/api/layers/dda/burj-al-arab");
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        const data: GeoJSON.FeatureCollection = await r.json();
        map.addSource(BURJ_AA_SRC, { type: "geojson", data });
        map.addLayer({
          id: BURJ_AA_FILL,
          type: "fill",
          source: BURJ_AA_SRC,
          paint: { "fill-color": "#9333EA", "fill-opacity": 0.05 },
        });
        map.addLayer({
          id: BURJ_AA_LINE,
          type: "line",
          source: BURJ_AA_SRC,
          paint: {
            "line-color": "#9333EA",
            "line-width": 1.5,
            "line-dasharray": [2, 2],
          },
        });
      } catch (e) {
        console.error("[burj-al-arab] load failed", e);
      }
    }

    // ── Shamal — Al Barsha South 1st (DDA) ─────────────────────────
    if (!map.getSource(SHAMAL_BS1_SRC)) {
      try {
        const r = await fetch("/api/layers/dda/shamal-bs-1");
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        const data: GeoJSON.FeatureCollection = await r.json();
        map.addSource(SHAMAL_BS1_SRC, { type: "geojson", data });
        map.addLayer({
          id: SHAMAL_BS1_FILL,
          type: "fill",
          source: SHAMAL_BS1_SRC,
          paint: { "fill-color": "#9333EA", "fill-opacity": 0.05 },
        });
        map.addLayer({
          id: SHAMAL_BS1_LINE,
          type: "line",
          source: SHAMAL_BS1_SRC,
          paint: {
            "line-color": "#9333EA",
            "line-width": 1.5,
            "line-dasharray": [2, 2],
          },
        });
      } catch (e) {
        console.error("[shamal-bs-1] load failed", e);
      }
    }

    // ── Dubai Police Academy (DDA) ─────────────────────────────────
    if (!map.getSource(DPA_SRC)) {
      try {
        const r = await fetch("/api/layers/dda/dubai-police-academy");
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        const data: GeoJSON.FeatureCollection = await r.json();
        map.addSource(DPA_SRC, { type: "geojson", data });
        map.addLayer({
          id: DPA_FILL,
          type: "fill",
          source: DPA_SRC,
          paint: { "fill-color": "#9333EA", "fill-opacity": 0.05 },
        });
        map.addLayer({
          id: DPA_LINE,
          type: "line",
          source: DPA_SRC,
          paint: {
            "line-color": "#9333EA",
            "line-width": 1.5,
            "line-dasharray": [2, 2],
          },
        });
      } catch (e) {
        console.error("[dubai-police-academy] load failed", e);
      }
    }

    // ── Shamal — Mankhool (DDA) ────────────────────────────────────
    if (!map.getSource(SHAMAL_MANKHOOL_SRC)) {
      try {
        const r = await fetch("/api/layers/dda/shamal-mankhool");
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        const data: GeoJSON.FeatureCollection = await r.json();
        map.addSource(SHAMAL_MANKHOOL_SRC, { type: "geojson", data });
        map.addLayer({
          id: SHAMAL_MANKHOOL_FILL,
          type: "fill",
          source: SHAMAL_MANKHOOL_SRC,
          paint: { "fill-color": "#9333EA", "fill-opacity": 0.05 },
        });
        map.addLayer({
          id: SHAMAL_MANKHOOL_LINE,
          type: "line",
          source: SHAMAL_MANKHOOL_SRC,
          paint: {
            "line-color": "#9333EA",
            "line-width": 1.5,
            "line-dasharray": [2, 2],
          },
        });
      } catch (e) {
        console.error("[shamal-mankhool] load failed", e);
      }
    }

    // ── PLOT_NUMBER labels for all DDA districts (zoom > 15) ───────
    const labelTextColor = isDark ? "#E8E0D0" : "#1A1A2E";
    const labelHaloColor = isDark ? "rgba(10,22,40,0.85)" : "rgba(255,255,255,0.9)";
    for (const d of DDA_LAYERS) {
      const labelId = ddaLabelId(d.srcId);
      if (map.getSource(d.srcId) && !map.getLayer(labelId)) {
        try {
          map.addLayer({
            id: labelId,
            type: "symbol",
            source: d.srcId,
            minzoom: 15,
            layout: {
              "text-field": ["coalesce", ["get", "PLOT_NUMBER"], ""],
              "text-size": 10,
              "text-font": ["Noto Sans Regular"],
              "text-allow-overlap": false,
              "symbol-placement": "point",
            },
            paint: {
              "text-color": labelTextColor,
              "text-halo-color": labelHaloColor,
              "text-halo-width": 1.2,
            },
          });
        } catch (e) {
          console.error(`[label ${d.key}] failed`, e);
        }
      }
    }


    // Apply current visibility state
    const v = (on: boolean) => (on ? "visible" : "none");
    if (map.getLayer(COMMUNITIES_FILL)) {
      map.setLayoutProperty(COMMUNITIES_FILL, "visibility", v(layersRef.current.communities));
      map.setLayoutProperty(COMMUNITIES_LINE, "visibility", v(layersRef.current.communities));
    }
    if (map.getLayer(ROADS_LINE)) {
      map.setLayoutProperty(ROADS_LINE, "visibility", v(layersRef.current.roads));
    }
    if (map.getLayer(ISLANDS_LINE)) {
      map.setLayoutProperty(ISLANDS_LINE, "visibility", v(layersRef.current.islands));
    }
    if (map.getLayer(MEYDAN_LINE)) {
      map.setLayoutProperty(MEYDAN_LINE, "visibility", v(layersRef.current.meydan));
    }
    if (map.getLayer(FURJAN_LINE)) {
      map.setLayoutProperty(FURJAN_LINE, "visibility", v(layersRef.current.alFurjan));
    }
    if (map.getLayer(IC23_LINE)) {
      map.setLayoutProperty(IC23_LINE, "visibility", v(layersRef.current.intlCity23));
    }
    if (map.getLayer(RES12_LINE)) {
      map.setLayoutProperty(RES12_LINE, "visibility", v(layersRef.current.residential12));
    }
    if (map.getLayer(D11_LINE)) {
      map.setLayoutProperty(D11_LINE, "visibility", v(layersRef.current.d11));
    }
    if (map.getLayer(DUBAI_HILLS_LINE)) {
      map.setLayoutProperty(DUBAI_HILLS_LINE, "visibility", v(layersRef.current.dubaiHills));
    }
    if (map.getLayer(DAMAC_HILLS_2_LINE)) {
      map.setLayoutProperty(DAMAC_HILLS_2_LINE, "visibility", v(layersRef.current.damacHills2));
    }
    if (map.getLayer(DAMAC_LAGOONS_LINE)) {
      map.setLayoutProperty(DAMAC_LAGOONS_LINE, "visibility", v(layersRef.current.damacLagoons));
    }
    if (map.getLayer(DAMAC_ISLANDS_LINE)) {
      map.setLayoutProperty(DAMAC_ISLANDS_LINE, "visibility", v(layersRef.current.damacIslands));
    }
    if (map.getLayer(THE_VALLEY_LINE)) {
      map.setLayoutProperty(THE_VALLEY_LINE, "visibility", v(layersRef.current.theValley));
    }
    if (map.getLayer(DAMAC_HILLS_LINE)) {
      map.setLayoutProperty(DAMAC_HILLS_LINE, "visibility", v(layersRef.current.damacHills));
    }
    if (map.getLayer(MUDON_LINE)) {
      map.setLayoutProperty(MUDON_LINE, "visibility", v(layersRef.current.mudon));
    }
    if (map.getLayer(JABEL_ALI_HILLS_LINE)) {
      map.setLayoutProperty(JABEL_ALI_HILLS_LINE, "visibility", v(layersRef.current.jabelAliHills));
    }
    if (map.getLayer(ARABIAN_RANCHES_1_LINE)) {
      map.setLayoutProperty(ARABIAN_RANCHES_1_LINE, "visibility", v(layersRef.current.arabianRanches1));
    }
    if (map.getLayer(NAS_GARDENS_LINE)) {
      map.setLayoutProperty(NAS_GARDENS_LINE, "visibility", v(layersRef.current.nasGardens));
    }
    if (map.getLayer(DSP_LINE)) {
      map.setLayoutProperty(DSP_LINE, "visibility", v(layersRef.current.dsp));
    }
    if (map.getLayer(BUSINESS_BAY_LINE)) {
      map.setLayoutProperty(BUSINESS_BAY_LINE, "visibility", v(layersRef.current.businessBay));
    }
    if (map.getLayer(SAMA_AL_JADAF_LINE)) {
      map.setLayoutProperty(SAMA_AL_JADAF_LINE, "visibility", v(layersRef.current.samaAlJadaf));
    }
    if (map.getLayer(ARJAN_LINE)) {
      map.setLayoutProperty(ARJAN_LINE, "visibility", v(layersRef.current.arjan));
    }
    if (map.getLayer(DHCC2_LINE)) {
      map.setLayoutProperty(DHCC2_LINE, "visibility", v(layersRef.current.dhcc2));
    }
    if (map.getLayer(BARSHA_HEIGHTS_LINE)) {
      map.setLayoutProperty(BARSHA_HEIGHTS_LINE, "visibility", v(layersRef.current.barshaHeights));
      map.setLayoutProperty(BARSHA_HEIGHTS_FILL, "visibility", v(layersRef.current.barshaHeights));
    }
    if (map.getLayer(DIFC_ZABEEL_LINE)) {
      map.setLayoutProperty(DIFC_ZABEEL_LINE, "visibility", v(layersRef.current.difcZabeel));
      map.setLayoutProperty(DIFC_ZABEEL_FILL, "visibility", v(layersRef.current.difcZabeel));
    }
    if (map.getLayer(JADDAF_WF_LINE)) {
      map.setLayoutProperty(JADDAF_WF_LINE, "visibility", v(layersRef.current.jaddafWaterfront));
      map.setLayoutProperty(JADDAF_WF_FILL, "visibility", v(layersRef.current.jaddafWaterfront));
    }
    if (map.getLayer(DHCC1_LINE)) {
      map.setLayoutProperty(DHCC1_LINE, "visibility", v(layersRef.current.dhcc1));
      map.setLayoutProperty(DHCC1_FILL, "visibility", v(layersRef.current.dhcc1));
    }
    if (map.getLayer(DIFC_LINE)) {
      map.setLayoutProperty(DIFC_LINE, "visibility", v(layersRef.current.difc));
      map.setLayoutProperty(DIFC_FILL, "visibility", v(layersRef.current.difc));
    }
    if (map.getLayer(TILAL_AL_GHAF_LINE)) {
      map.setLayoutProperty(TILAL_AL_GHAF_LINE, "visibility", v(layersRef.current.tilalAlGhaf));
      map.setLayoutProperty(TILAL_AL_GHAF_FILL, "visibility", v(layersRef.current.tilalAlGhaf));
    }
    if (map.getLayer(AR2_LINE)) {
      map.setLayoutProperty(AR2_LINE, "visibility", v(layersRef.current.arabianRanches2));
      map.setLayoutProperty(AR2_FILL, "visibility", v(layersRef.current.arabianRanches2));
    }
    if (map.getLayer(THE_VILLA_LINE)) {
      map.setLayoutProperty(THE_VILLA_LINE, "visibility", v(layersRef.current.theVilla));
      map.setLayoutProperty(THE_VILLA_FILL, "visibility", v(layersRef.current.theVilla));
    }
    if (map.getLayer(AR3_LINE)) {
      map.setLayoutProperty(AR3_LINE, "visibility", v(layersRef.current.arabianRanches3));
      map.setLayoutProperty(AR3_FILL, "visibility", v(layersRef.current.arabianRanches3));
    }
    if (map.getLayer(DSC_LINE)) {
      map.setLayoutProperty(DSC_LINE, "visibility", v(layersRef.current.dubaiSportsCity));
      map.setLayoutProperty(DSC_FILL, "visibility", v(layersRef.current.dubaiSportsCity));
    }
    if (map.getLayer(VILLANOVA_LINE)) {
      map.setLayoutProperty(VILLANOVA_LINE, "visibility", v(layersRef.current.villanova));
      map.setLayoutProperty(VILLANOVA_FILL, "visibility", v(layersRef.current.villanova));
    }
    if (map.getLayer(ACRES_LINE)) {
      map.setLayoutProperty(ACRES_LINE, "visibility", v(layersRef.current.theAcres));
      map.setLayoutProperty(ACRES_FILL, "visibility", v(layersRef.current.theAcres));
    }
    if (map.getLayer(FALCON_LINE)) {
      map.setLayoutProperty(FALCON_LINE, "visibility", v(layersRef.current.falconCity));
      map.setLayoutProperty(FALCON_FILL, "visibility", v(layersRef.current.falconCity));
    }
    if (map.getLayer(AL_ARYAM_LINE)) {
      map.setLayoutProperty(AL_ARYAM_LINE, "visibility", v(layersRef.current.alAryam));
      map.setLayoutProperty(AL_ARYAM_FILL, "visibility", v(layersRef.current.alAryam));
    }
    if (map.getLayer(DIC_LINE)) {
      map.setLayoutProperty(DIC_LINE, "visibility", v(layersRef.current.dubaiIndustrialCity));
      map.setLayoutProperty(DIC_FILL, "visibility", v(layersRef.current.dubaiIndustrialCity));
    }
    if (map.getLayer(DI2_LINE)) {
      map.setLayoutProperty(DI2_LINE, "visibility", v(layersRef.current.damacIslands2));
      map.setLayoutProperty(DI2_FILL, "visibility", v(layersRef.current.damacIslands2));
    }
    if (map.getLayer(WILDS_LINE)) {
      map.setLayoutProperty(WILDS_LINE, "visibility", v(layersRef.current.wilds));
      map.setLayoutProperty(WILDS_FILL, "visibility", v(layersRef.current.wilds));
    }
    if (map.getLayer(TOWN_SQ_LINE)) {
      map.setLayoutProperty(TOWN_SQ_LINE, "visibility", v(layersRef.current.townSquare));
      map.setLayoutProperty(TOWN_SQ_FILL, "visibility", v(layersRef.current.townSquare));
    }
    if (map.getLayer(ATHLON_LINE)) {
      map.setLayoutProperty(ATHLON_LINE, "visibility", v(layersRef.current.athlon));
      map.setLayoutProperty(ATHLON_FILL, "visibility", v(layersRef.current.athlon));
    }
    if (map.getLayer(CHERRY_LINE)) {
      map.setLayoutProperty(CHERRY_LINE, "visibility", v(layersRef.current.cherrywoods));
      map.setLayoutProperty(CHERRY_FILL, "visibility", v(layersRef.current.cherrywoods));
    }
    if (map.getLayer(PORTOFINO_LINE)) {
      map.setLayoutProperty(PORTOFINO_LINE, "visibility", v(layersRef.current.portofino));
      map.setLayoutProperty(PORTOFINO_FILL, "visibility", v(layersRef.current.portofino));
    }
    if (map.getLayer(HAVEN_LINE)) {
      map.setLayoutProperty(HAVEN_LINE, "visibility", v(layersRef.current.haven));
      map.setLayoutProperty(HAVEN_FILL, "visibility", v(layersRef.current.haven));
    }
    if (map.getLayer(AL_BARARI_LINE)) {
      map.setLayoutProperty(AL_BARARI_LINE, "visibility", v(layersRef.current.alBarari));
      map.setLayoutProperty(AL_BARARI_FILL, "visibility", v(layersRef.current.alBarari));
    }
    if (map.getLayer(JAI_LINE)) {
      map.setLayoutProperty(JAI_LINE, "visibility", v(layersRef.current.jabalAliIndustrial));
      map.setLayoutProperty(JAI_FILL, "visibility", v(layersRef.current.jabalAliIndustrial));
    }
    if (map.getLayer(LL_LINE)) {
      map.setLayoutProperty(LL_LINE, "visibility", v(layersRef.current.livingLegends));
      map.setLayoutProperty(LL_FILL, "visibility", v(layersRef.current.livingLegends));
    }
    if (map.getLayer(SHOROOQ_LINE)) {
      map.setLayoutProperty(SHOROOQ_LINE, "visibility", v(layersRef.current.shorooq));
      map.setLayoutProperty(SHOROOQ_FILL, "visibility", v(layersRef.current.shorooq));
    }
    if (map.getLayer(COA_LINE)) {
      map.setLayoutProperty(COA_LINE, "visibility", v(layersRef.current.cityOfArabia));
      map.setLayoutProperty(COA_FILL, "visibility", v(layersRef.current.cityOfArabia));
    }
    if (map.getLayer(SERENA_LINE)) {
      map.setLayoutProperty(SERENA_LINE, "visibility", v(layersRef.current.serena));
      map.setLayoutProperty(SERENA_FILL, "visibility", v(layersRef.current.serena));
    }
    if (map.getLayer(DCH_LINE)) {
      map.setLayoutProperty(DCH_LINE, "visibility", v(layersRef.current.dubaiCreekHarbour));
      map.setLayoutProperty(DCH_FILL, "visibility", v(layersRef.current.dubaiCreekHarbour));
    }
    if (map.getLayer(DPC_LINE)) {
      map.setLayoutProperty(DPC_LINE, "visibility", v(layersRef.current.dubaiProductionCity));
      map.setLayoutProperty(DPC_FILL, "visibility", v(layersRef.current.dubaiProductionCity));
    }
    if (map.getLayer(SOBHA_R_LINE)) {
      map.setLayoutProperty(SOBHA_R_LINE, "visibility", v(layersRef.current.sobhaReserve));
      map.setLayoutProperty(SOBHA_R_FILL, "visibility", v(layersRef.current.sobhaReserve));
    }
    if (map.getLayer(JGC_LINE)) {
      map.setLayoutProperty(JGC_LINE, "visibility", v(layersRef.current.jumeirahGardenCity));
      map.setLayoutProperty(JGC_FILL, "visibility", v(layersRef.current.jumeirahGardenCity));
    }
    if (map.getLayer(SOBHA_E_LINE)) {
      map.setLayoutProperty(SOBHA_E_LINE, "visibility", v(layersRef.current.sobhaElwood));
      map.setLayoutProperty(SOBHA_E_FILL, "visibility", v(layersRef.current.sobhaElwood));
    }
    if (map.getLayer(DLRC_LINE)) {
      map.setLayoutProperty(DLRC_LINE, "visibility", v(layersRef.current.dlrc));
      map.setLayoutProperty(DLRC_FILL, "visibility", v(layersRef.current.dlrc));
    }
    if (map.getLayer(PEARL_J_LINE)) {
      map.setLayoutProperty(PEARL_J_LINE, "visibility", v(layersRef.current.pearlJumeira));
      map.setLayoutProperty(PEARL_J_FILL, "visibility", v(layersRef.current.pearlJumeira));
    }
    if (map.getLayer(KHAWANEEJ_LINE)) {
      map.setLayoutProperty(KHAWANEEJ_LINE, "visibility", v(layersRef.current.alKhawaneej));
      map.setLayoutProperty(KHAWANEEJ_FILL, "visibility", v(layersRef.current.alKhawaneej));
    }
    if (map.getLayer(MAJAN_LINE)) {
      map.setLayoutProperty(MAJAN_LINE, "visibility", v(layersRef.current.majan));
      map.setLayoutProperty(MAJAN_FILL, "visibility", v(layersRef.current.majan));
    }
    if (map.getLayer(LA_MER_LINE)) {
      map.setLayoutProperty(LA_MER_LINE, "visibility", v(layersRef.current.laMer));
      map.setLayoutProperty(LA_MER_FILL, "visibility", v(layersRef.current.laMer));
    }
    if (map.getLayer(DUBAI_LAND_LINE)) {
      map.setLayoutProperty(DUBAI_LAND_LINE, "visibility", v(layersRef.current.dubaiLand));
      map.setLayoutProperty(DUBAI_LAND_FILL, "visibility", v(layersRef.current.dubaiLand));
    }
    if (map.getLayer(DGC_LINE)) {
      map.setLayoutProperty(DGC_LINE, "visibility", v(layersRef.current.dubaiGolfCity));
      map.setLayoutProperty(DGC_FILL, "visibility", v(layersRef.current.dubaiGolfCity));
    }
    if (map.getLayer(MERAAS_UAS_LINE)) {
      map.setLayoutProperty(MERAAS_UAS_LINE, "visibility", v(layersRef.current.meraasUmmAlSheif));
      map.setLayoutProperty(MERAAS_UAS_FILL, "visibility", v(layersRef.current.meraasUmmAlSheif));
    }
    if (map.getLayer(MAMZAR_LINE)) {
      map.setLayoutProperty(MAMZAR_LINE, "visibility", v(layersRef.current.alMamzarFront));
      map.setLayoutProperty(MAMZAR_FILL, "visibility", v(layersRef.current.alMamzarFront));
    }
    if (map.getLayer(ASMARAN_LINE)) {
      map.setLayoutProperty(ASMARAN_LINE, "visibility", v(layersRef.current.asmaran));
      map.setLayoutProperty(ASMARAN_FILL, "visibility", v(layersRef.current.asmaran));
    }
    if (map.getLayer(JBAY_LINE)) {
      map.setLayoutProperty(JBAY_LINE, "visibility", v(layersRef.current.jumeirahBay));
      map.setLayoutProperty(JBAY_FILL, "visibility", v(layersRef.current.jumeirahBay));
    }
    if (map.getLayer(REPORTAGE_LINE)) {
      map.setLayoutProperty(REPORTAGE_LINE, "visibility", v(layersRef.current.reportageVillage));
      map.setLayoutProperty(REPORTAGE_FILL, "visibility", v(layersRef.current.reportageVillage));
    }
    if (map.getLayer(LIWAN_LINE)) {
      map.setLayoutProperty(LIWAN_LINE, "visibility", v(layersRef.current.liwan));
      map.setLayoutProperty(LIWAN_FILL, "visibility", v(layersRef.current.liwan));
    }
    if (map.getLayer(DSTUDIO_LINE)) {
      map.setLayoutProperty(DSTUDIO_LINE, "visibility", v(layersRef.current.dubaiStudioCity));
      map.setLayoutProperty(DSTUDIO_FILL, "visibility", v(layersRef.current.dubaiStudioCity));
    }
    if (map.getLayer(LIWAN2_LINE)) {
      map.setLayoutProperty(LIWAN2_LINE, "visibility", v(layersRef.current.liwan2));
      map.setLayoutProperty(LIWAN2_FILL, "visibility", v(layersRef.current.liwan2));
    }
    if (map.getLayer(NAIA_LINE)) {
      map.setLayoutProperty(NAIA_LINE, "visibility", v(layersRef.current.naiaIsland));
      map.setLayoutProperty(NAIA_FILL, "visibility", v(layersRef.current.naiaIsland));
    }
    if (map.getLayer(ARDH_LINE)) {
      map.setLayoutProperty(ARDH_LINE, "visibility", v(layersRef.current.ardhCommunity));
      map.setLayoutProperty(ARDH_FILL, "visibility", v(layersRef.current.ardhCommunity));
    }
    if (map.getLayer(TIJARA_LINE)) {
      map.setLayoutProperty(TIJARA_LINE, "visibility", v(layersRef.current.tijaraTown));
      map.setLayoutProperty(TIJARA_FILL, "visibility", v(layersRef.current.tijaraTown));
    }
    if (map.getLayer(WARSAN_LINE)) {
      map.setLayoutProperty(WARSAN_LINE, "visibility", v(layersRef.current.warsanFirst));
      map.setLayoutProperty(WARSAN_FILL, "visibility", v(layersRef.current.warsanFirst));
    }
    if (map.getLayer(MERAAS_MIRDIF_LINE)) {
      map.setLayoutProperty(MERAAS_MIRDIF_LINE, "visibility", v(layersRef.current.meraasMirdif));
      map.setLayoutProperty(MERAAS_MIRDIF_FILL, "visibility", v(layersRef.current.meraasMirdif));
    }
    if (map.getLayer(HABTOOR_LINE)) {
      map.setLayoutProperty(HABTOOR_LINE, "visibility", v(layersRef.current.alHabtoorPolo));
      map.setLayoutProperty(HABTOOR_FILL, "visibility", v(layersRef.current.alHabtoorPolo));
    }
    if (map.getLayer(MERAAS_UMA_LINE)) {
      map.setLayoutProperty(MERAAS_UMA_LINE, "visibility", v(layersRef.current.meraasUmmAmaraa));
      map.setLayoutProperty(MERAAS_UMA_FILL, "visibility", v(layersRef.current.meraasUmmAmaraa));
    }
    if (map.getLayer(D3_DDA_LINE)) {
      map.setLayoutProperty(D3_DDA_LINE, "visibility", v(layersRef.current.d3));
      map.setLayoutProperty(D3_DDA_FILL, "visibility", v(layersRef.current.d3));
    }
    if (map.getLayer(KHAIL_LINE)) {
      map.setLayoutProperty(KHAIL_LINE, "visibility", v(layersRef.current.alKhailGate));
      map.setLayoutProperty(KHAIL_FILL, "visibility", v(layersRef.current.alKhailGate));
    }
    if (map.getLayer(SITE_A_LINE)) {
      map.setLayoutProperty(SITE_A_LINE, "visibility", v(layersRef.current.siteA));
      map.setLayoutProperty(SITE_A_FILL, "visibility", v(layersRef.current.siteA));
    }
    if (map.getLayer(RUKAN_LINE)) {
      map.setLayoutProperty(RUKAN_LINE, "visibility", v(layersRef.current.rukan));
      map.setLayoutProperty(RUKAN_FILL, "visibility", v(layersRef.current.rukan));
    }
    if (map.getLayer(CALI_LINE)) {
      map.setLayoutProperty(CALI_LINE, "visibility", v(layersRef.current.californiaResidence));
      map.setLayoutProperty(CALI_FILL, "visibility", v(layersRef.current.californiaResidence));
    }
    if (map.getLayer(MERAAS_NAH_LINE)) {
      map.setLayoutProperty(MERAAS_NAH_LINE, "visibility", v(layersRef.current.meraasNaddAlHamar));
      map.setLayoutProperty(MERAAS_NAH_FILL, "visibility", v(layersRef.current.meraasNaddAlHamar));
    }
    if (map.getLayer(PALMAROSA_LINE)) {
      map.setLayoutProperty(PALMAROSA_LINE, "visibility", v(layersRef.current.palmarosa));
      map.setLayoutProperty(PALMAROSA_FILL, "visibility", v(layersRef.current.palmarosa));
    }
    if (map.getLayer(DIAC_LINE)) {
      map.setLayoutProperty(DIAC_LINE, "visibility", v(layersRef.current.diac));
      map.setLayoutProperty(DIAC_FILL, "visibility", v(layersRef.current.diac));
    }
    if (map.getLayer(WAHA_LINE)) {
      map.setLayoutProperty(WAHA_LINE, "visibility", v(layersRef.current.alWaha));
      map.setLayoutProperty(WAHA_FILL, "visibility", v(layersRef.current.alWaha));
    }
    if (map.getLayer(HARBOUR_LINE)) {
      map.setLayoutProperty(HARBOUR_LINE, "visibility", v(layersRef.current.dubaiHarbour));
      map.setLayoutProperty(HARBOUR_FILL, "visibility", v(layersRef.current.dubaiHarbour));
    }
    if (map.getLayer(KLABOUR_LINE)) {
      map.setLayoutProperty(KLABOUR_LINE, "visibility", v(layersRef.current.khawaneejLabour));
      map.setLayoutProperty(KLABOUR_FILL, "visibility", v(layersRef.current.khawaneejLabour));
    }
    if (map.getLayer(WIND_LINE)) {
      map.setLayoutProperty(WIND_LINE, "visibility", v(layersRef.current.warsanIndustrial));
      map.setLayoutProperty(WIND_FILL, "visibility", v(layersRef.current.warsanIndustrial));
    }
    if (map.getLayer(DLC_LINE)) {
      map.setLayoutProperty(DLC_LINE, "visibility", v(layersRef.current.dubaiLifestyleCity));
      map.setLayoutProperty(DLC_FILL, "visibility", v(layersRef.current.dubaiLifestyleCity));
    }
    if (map.getLayer(SUFOUH_LINE)) {
      map.setLayoutProperty(SUFOUH_LINE, "visibility", v(layersRef.current.sufouhGardens));
      map.setLayoutProperty(SUFOUH_FILL, "visibility", v(layersRef.current.sufouhGardens));
    }
    if (map.getLayer(MOTOR_LINE)) {
      map.setLayoutProperty(MOTOR_LINE, "visibility", v(layersRef.current.motorCity));
      map.setLayoutProperty(MOTOR_FILL, "visibility", v(layersRef.current.motorCity));
    }
    if (map.getLayer(TAOR1_LINE)) {
      map.setLayoutProperty(TAOR1_LINE, "visibility", v(layersRef.current.taormina1));
      map.setLayoutProperty(TAOR1_FILL, "visibility", v(layersRef.current.taormina1));
    }
    if (map.getLayer(DPARKS_LINE)) {
      map.setLayoutProperty(DPARKS_LINE, "visibility", v(layersRef.current.dubaiParks));
      map.setLayoutProperty(DPARKS_FILL, "visibility", v(layersRef.current.dubaiParks));
    }
    if (map.getLayer(CWALK_LINE)) {
      map.setLayoutProperty(CWALK_LINE, "visibility", v(layersRef.current.cityWalk));
      map.setLayoutProperty(CWALK_FILL, "visibility", v(layersRef.current.cityWalk));
    }
    if (map.getLayer(ARPOLO_LINE)) {
      map.setLayoutProperty(ARPOLO_LINE, "visibility", v(layersRef.current.arPolo));
      map.setLayoutProperty(ARPOLO_FILL, "visibility", v(layersRef.current.arPolo));
    }
    if (map.getLayer(BARSHA3_LINE)) {
      map.setLayoutProperty(BARSHA3_LINE, "visibility", v(layersRef.current.barshaThird));
      map.setLayoutProperty(BARSHA3_FILL, "visibility", v(layersRef.current.barshaThird));
    }
    if (map.getLayer(MERAAS_B2_LINE)) {
      map.setLayoutProperty(MERAAS_B2_LINE, "visibility", v(layersRef.current.meraasBarsha2));
      map.setLayoutProperty(MERAAS_B2_FILL, "visibility", v(layersRef.current.meraasBarsha2));
    }
    if (map.getLayer(DOC_LINE)) {
      map.setLayoutProperty(DOC_LINE, "visibility", v(layersRef.current.dubaiOutsourceCity));
      map.setLayoutProperty(DOC_FILL, "visibility", v(layersRef.current.dubaiOutsourceCity));
    }
    if (map.getLayer(BURJ_LINE)) {
      map.setLayoutProperty(BURJ_LINE, "visibility", v(layersRef.current.burjKhalifa));
      map.setLayoutProperty(BURJ_FILL, "visibility", v(layersRef.current.burjKhalifa));
    }
    if (map.getLayer(GHAF_LINE)) {
      map.setLayoutProperty(GHAF_LINE, "visibility", v(layersRef.current.ghafWoods));
      map.setLayoutProperty(GHAF_FILL, "visibility", v(layersRef.current.ghafWoods));
    }
    if (map.getLayer(TAOR2_LINE)) {
      map.setLayoutProperty(TAOR2_LINE, "visibility", v(layersRef.current.taormina2));
      map.setLayoutProperty(TAOR2_FILL, "visibility", v(layersRef.current.taormina2));
    }
    if (map.getLayer(BIANCA_LINE)) {
      map.setLayoutProperty(BIANCA_LINE, "visibility", v(layersRef.current.bianca));
      map.setLayoutProperty(BIANCA_FILL, "visibility", v(layersRef.current.bianca));
    }
    if (map.getLayer(MJL_LINE)) {
      map.setLayoutProperty(MJL_LINE, "visibility", v(layersRef.current.mjl));
      map.setLayoutProperty(MJL_FILL, "visibility", v(layersRef.current.mjl));
    }
    if (map.getLayer(DHK1_LINE)) {
      map.setLayoutProperty(DHK1_LINE, "visibility", v(layersRef.current.dhKhawaneej1));
      map.setLayoutProperty(DHK1_FILL, "visibility", v(layersRef.current.dhKhawaneej1));
    }
    if (map.getLayer(REMRAAM_LINE)) {
      map.setLayoutProperty(REMRAAM_LINE, "visibility", v(layersRef.current.remraam));
      map.setLayoutProperty(REMRAAM_FILL, "visibility", v(layersRef.current.remraam));
    }
    if (map.getLayer(ECHO_LINE)) {
      map.setLayoutProperty(ECHO_LINE, "visibility", v(layersRef.current.echoPlex));
      map.setLayoutProperty(ECHO_FILL, "visibility", v(layersRef.current.echoPlex));
    }
    if (map.getLayer(SUSCITY_LINE)) {
      map.setLayoutProperty(SUSCITY_LINE, "visibility", v(layersRef.current.sustainableCity));
      map.setLayoutProperty(SUSCITY_FILL, "visibility", v(layersRef.current.sustainableCity));
    }
    if (map.getLayer(JBR_LINE)) {
      map.setLayoutProperty(JBR_LINE, "visibility", v(layersRef.current.jbr));
      map.setLayoutProperty(JBR_FILL, "visibility", v(layersRef.current.jbr));
    }
    if (map.getLayer(GHOROOB_LINE)) {
      map.setLayoutProperty(GHOROOB_LINE, "visibility", v(layersRef.current.ghoroob));
      map.setLayoutProperty(GHOROOB_FILL, "visibility", v(layersRef.current.ghoroob));
    }
    if (map.getLayer(DPB3_LINE)) {
      map.setLayoutProperty(DPB3_LINE, "visibility", v(layersRef.current.dpBarshaSouth3));
      map.setLayoutProperty(DPB3_FILL, "visibility", v(layersRef.current.dpBarshaSouth3));
    }
    if (map.getLayer(MARSA_LINE)) {
      map.setLayoutProperty(MARSA_LINE, "visibility", v(layersRef.current.marsaAlArab));
      map.setLayoutProperty(MARSA_FILL, "visibility", v(layersRef.current.marsaAlArab));
    }
    if (map.getLayer(BLUE_LINE)) {
      map.setLayoutProperty(BLUE_LINE, "visibility", v(layersRef.current.bluewaters));
      map.setLayoutProperty(BLUE_FILL, "visibility", v(layersRef.current.bluewaters));
    }
    if (map.getLayer(SITE_D_LINE)) {
      map.setLayoutProperty(SITE_D_LINE, "visibility", v(layersRef.current.siteD));
      map.setLayoutProperty(SITE_D_FILL, "visibility", v(layersRef.current.siteD));
    }
    if (map.getLayer(KHEIGHTS_LINE)) {
      map.setLayoutProperty(KHEIGHTS_LINE, "visibility", v(layersRef.current.khailHeights));
      map.setLayoutProperty(KHEIGHTS_FILL, "visibility", v(layersRef.current.khailHeights));
    }
    if (map.getLayer(MERAAS_UAD_LINE)) {
      map.setLayoutProperty(MERAAS_UAD_LINE, "visibility", v(layersRef.current.meraasUmmAlDaman));
      map.setLayoutProperty(MERAAS_UAD_FILL, "visibility", v(layersRef.current.meraasUmmAlDaman));
    }
    if (map.getLayer(DLAND673_LINE)) {
      map.setLayoutProperty(DLAND673_LINE, "visibility", v(layersRef.current.dubaiLand673));
      map.setLayoutProperty(DLAND673_FILL, "visibility", v(layersRef.current.dubaiLand673));
    }
    if (map.getLayer(SHAMAL_Y1_LINE)) {
      map.setLayoutProperty(SHAMAL_Y1_LINE, "visibility", v(layersRef.current.shamalYalayis1));
      map.setLayoutProperty(SHAMAL_Y1_FILL, "visibility", v(layersRef.current.shamalYalayis1));
    }
    if (map.getLayer(TECOM_Q2_LINE)) {
      map.setLayoutProperty(TECOM_Q2_LINE, "visibility", v(layersRef.current.tecomQouz2));
      map.setLayoutProperty(TECOM_Q2_FILL, "visibility", v(layersRef.current.tecomQouz2));
    }
    if (map.getLayer(GV_LINE)) {
      map.setLayoutProperty(GV_LINE, "visibility", v(layersRef.current.globalVillage));
      map.setLayoutProperty(GV_FILL, "visibility", v(layersRef.current.globalVillage));
    }
    if (map.getLayer(LAYAN_LINE)) {
      map.setLayoutProperty(LAYAN_LINE, "visibility", v(layersRef.current.layan));
      map.setLayoutProperty(LAYAN_FILL, "visibility", v(layersRef.current.layan));
    }
    if (map.getLayer(DPGMBR_LINE)) {
      map.setLayoutProperty(DPGMBR_LINE, "visibility", v(layersRef.current.dpgMbr));
      map.setLayoutProperty(DPGMBR_FILL, "visibility", v(layersRef.current.dpgMbr));
    }
    if (map.getLayer(DWC_LINE)) {
      map.setLayoutProperty(DWC_LINE, "visibility", v(layersRef.current.dwc));
      map.setLayoutProperty(DWC_FILL, "visibility", v(layersRef.current.dwc));
    }
    if (map.getLayer(LQUOZ_LINE)) {
      map.setLayoutProperty(LQUOZ_LINE, "visibility", v(layersRef.current.labourQuoz));
      map.setLayoutProperty(LQUOZ_FILL, "visibility", v(layersRef.current.labourQuoz));
    }
    if (map.getLayer(SCHFZ_LINE)) {
      map.setLayoutProperty(SCHFZ_LINE, "visibility", v(layersRef.current.schoolsFz));
      map.setLayoutProperty(SCHFZ_FILL, "visibility", v(layersRef.current.schoolsFz));
    }
    if (map.getLayer(DWCNFZ_LINE)) {
      map.setLayoutProperty(DWCNFZ_LINE, "visibility", v(layersRef.current.dwcNfz));
      map.setLayoutProperty(DWCNFZ_FILL, "visibility", v(layersRef.current.dwcNfz));
    }
    if (map.getLayer(SHAMAL_JAI1_LINE)) {
      map.setLayoutProperty(SHAMAL_JAI1_LINE, "visibility", v(layersRef.current.shamalJai1));
      map.setLayoutProperty(SHAMAL_JAI1_FILL, "visibility", v(layersRef.current.shamalJai1));
    }
    if (map.getLayer(JAI_STAFF_LINE)) {
      map.setLayoutProperty(JAI_STAFF_LINE, "visibility", v(layersRef.current.jaiStaff));
      map.setLayoutProperty(JAI_STAFF_FILL, "visibility", v(layersRef.current.jaiStaff));
    }
    if (map.getLayer(SHAMAL_TC2_LINE)) {
      map.setLayoutProperty(SHAMAL_TC2_LINE, "visibility", v(layersRef.current.shamalTc2));
      map.setLayoutProperty(SHAMAL_TC2_FILL, "visibility", v(layersRef.current.shamalTc2));
    }
    if (map.getLayer(NUZUL_LINE)) {
      map.setLayoutProperty(NUZUL_LINE, "visibility", v(layersRef.current.nuzul));
      map.setLayoutProperty(NUZUL_FILL, "visibility", v(layersRef.current.nuzul));
    }
    if (map.getLayer(KOA_LINE)) {
      map.setLayoutProperty(KOA_LINE, "visibility", v(layersRef.current.koa));
      map.setLayoutProperty(KOA_FILL, "visibility", v(layersRef.current.koa));
    }
    if (map.getLayer(SOBHA_S_LINE)) {
      map.setLayoutProperty(SOBHA_S_LINE, "visibility", v(layersRef.current.sobhaSanctuary));
      map.setLayoutProperty(SOBHA_S_FILL, "visibility", v(layersRef.current.sobhaSanctuary));
    }
    if (map.getLayer(BOX_LINE)) {
      map.setLayoutProperty(BOX_LINE, "visibility", v(layersRef.current.boxpark));
      map.setLayoutProperty(BOX_FILL, "visibility", v(layersRef.current.boxpark));
    }
    if (map.getLayer(SHAMAL_NAS1_LINE)) {
      map.setLayoutProperty(SHAMAL_NAS1_LINE, "visibility", v(layersRef.current.shamalNas1));
      map.setLayoutProperty(SHAMAL_NAS1_FILL, "visibility", v(layersRef.current.shamalNas1));
    }
    if (map.getLayer(LASTEXIT_LINE)) {
      map.setLayoutProperty(LASTEXIT_LINE, "visibility", v(layersRef.current.lastExit));
      map.setLayoutProperty(LASTEXIT_FILL, "visibility", v(layersRef.current.lastExit));
    }
    if (map.getLayer(SCARA_LINE)) {
      map.setLayoutProperty(SCARA_LINE, "visibility", v(layersRef.current.scaramanga));
      map.setLayoutProperty(SCARA_FILL, "visibility", v(layersRef.current.scaramanga));
    }
    if (map.getLayer(MERAAS_W3_LINE)) {
      map.setLayoutProperty(MERAAS_W3_LINE, "visibility", v(layersRef.current.meraasWarqa3));
      map.setLayoutProperty(MERAAS_W3_FILL, "visibility", v(layersRef.current.meraasWarqa3));
    }
    if (map.getLayer(JCENTRAL_LINE)) {
      map.setLayoutProperty(JCENTRAL_LINE, "visibility", v(layersRef.current.jumeirahCentral));
      map.setLayoutProperty(JCENTRAL_FILL, "visibility", v(layersRef.current.jumeirahCentral));
    }
    if (map.getLayer(OASIS_LINE)) {
      map.setLayoutProperty(OASIS_LINE, "visibility", v(layersRef.current.oasisVillage));
      map.setLayoutProperty(OASIS_FILL, "visibility", v(layersRef.current.oasisVillage));
    }
    if (map.getLayer(ETD_LINE)) {
      map.setLayoutProperty(ETD_LINE, "visibility", v(layersRef.current.emiratesTowers));
      map.setLayoutProperty(ETD_FILL, "visibility", v(layersRef.current.emiratesTowers));
    }
    if (map.getLayer(MERAAS_Q3_LINE)) {
      map.setLayoutProperty(MERAAS_Q3_LINE, "visibility", v(layersRef.current.meraasQuoz3));
      map.setLayoutProperty(MERAAS_Q3_FILL, "visibility", v(layersRef.current.meraasQuoz3));
    }
    if (map.getLayer(MARSA_S_LINE)) {
      map.setLayoutProperty(MARSA_S_LINE, "visibility", v(layersRef.current.marsaAlseef));
      map.setLayoutProperty(MARSA_S_FILL, "visibility", v(layersRef.current.marsaAlseef));
    }
    if (map.getLayer(MERAAS_WAS_LINE)) {
      map.setLayoutProperty(MERAAS_WAS_LINE, "visibility", v(layersRef.current.meraasWadiAlshabak));
      map.setLayoutProperty(MERAAS_WAS_FILL, "visibility", v(layersRef.current.meraasWadiAlshabak));
    }
    if (map.getLayer(SHAMAL_B2_LINE)) {
      map.setLayoutProperty(SHAMAL_B2_LINE, "visibility", v(layersRef.current.shamalBarsha2));
      map.setLayoutProperty(SHAMAL_B2_FILL, "visibility", v(layersRef.current.shamalBarsha2));
    }
    if (map.getLayer(SHAMAL_N2_LINE)) {
      map.setLayoutProperty(SHAMAL_N2_LINE, "visibility", v(layersRef.current.shamalNahda2));
      map.setLayoutProperty(SHAMAL_N2_FILL, "visibility", v(layersRef.current.shamalNahda2));
    }
    if (map.getLayer(MERAAS_SAIH1_LINE)) {
      map.setLayoutProperty(MERAAS_SAIH1_LINE, "visibility", v(layersRef.current.meraasSaih1));
      map.setLayoutProperty(MERAAS_SAIH1_FILL, "visibility", v(layersRef.current.meraasSaih1));
    }
    if (map.getLayer(DPOL_UAD_LINE)) {
      map.setLayoutProperty(DPOL_UAD_LINE, "visibility", v(layersRef.current.dubaiPoliceUad));
      map.setLayoutProperty(DPOL_UAD_FILL, "visibility", v(layersRef.current.dubaiPoliceUad));
    }
    if (map.getLayer(MERAAS_RAK3_LINE)) {
      map.setLayoutProperty(MERAAS_RAK3_LINE, "visibility", v(layersRef.current.meraasRakhor3));
      map.setLayoutProperty(MERAAS_RAK3_FILL, "visibility", v(layersRef.current.meraasRakhor3));
    }
    if (map.getLayer(MERAAS_MD_LINE)) {
      map.setLayoutProperty(MERAAS_MD_LINE, "visibility", v(layersRef.current.meraasMarsaDubai));
      map.setLayoutProperty(MERAAS_MD_FILL, "visibility", v(layersRef.current.meraasMarsaDubai));
    }
    if (map.getLayer(SHAMAL_HAD_LINE)) {
      map.setLayoutProperty(SHAMAL_HAD_LINE, "visibility", v(layersRef.current.shamalHadaeq));
      map.setLayoutProperty(SHAMAL_HAD_FILL, "visibility", v(layersRef.current.shamalHadaeq));
    }
    if (map.getLayer(JBH_LINE)) {
      map.setLayoutProperty(JBH_LINE, "visibility", v(layersRef.current.jbh));
      map.setLayoutProperty(JBH_FILL, "visibility", v(layersRef.current.jbh));
    }
    if (map.getLayer(MJUM_LINE)) {
      map.setLayoutProperty(MJUM_LINE, "visibility", v(layersRef.current.madinatJumeirah));
      map.setLayoutProperty(MJUM_FILL, "visibility", v(layersRef.current.madinatJumeirah));
    }
    if (map.getLayer(TECOM_SAIH_LINE)) {
      map.setLayoutProperty(TECOM_SAIH_LINE, "visibility", v(layersRef.current.tecomSaih));
      map.setLayoutProperty(TECOM_SAIH_FILL, "visibility", v(layersRef.current.tecomSaih));
    }
    if (map.getLayer(CV2_LINE)) {
      map.setLayoutProperty(CV2_LINE, "visibility", v(layersRef.current.cultureVillage2));
      map.setLayoutProperty(CV2_FILL, "visibility", v(layersRef.current.cultureVillage2));
    }
    if (map.getLayer(MERAAS_BS2_LINE)) {
      map.setLayoutProperty(MERAAS_BS2_LINE, "visibility", v(layersRef.current.meraasBs2));
      map.setLayoutProperty(MERAAS_BS2_FILL, "visibility", v(layersRef.current.meraasBs2));
    }
    if (map.getLayer(SHAMAL_MUH2_LINE)) {
      map.setLayoutProperty(SHAMAL_MUH2_LINE, "visibility", v(layersRef.current.shamalMuh2));
      map.setLayoutProperty(SHAMAL_MUH2_FILL, "visibility", v(layersRef.current.shamalMuh2));
    }
    if (map.getLayer(SHAMAL_Q2_LINE)) {
      map.setLayoutProperty(SHAMAL_Q2_LINE, "visibility", v(layersRef.current.shamalQuoz2));
      map.setLayoutProperty(SHAMAL_Q2_FILL, "visibility", v(layersRef.current.shamalQuoz2));
    }
    if (map.getLayer(CV3_LINE)) {
      map.setLayoutProperty(CV3_LINE, "visibility", v(layersRef.current.cultureVillage3));
      map.setLayoutProperty(CV3_FILL, "visibility", v(layersRef.current.cultureVillage3));
    }
    if (map.getLayer(MERAAS_SATWA_LINE)) {
      map.setLayoutProperty(MERAAS_SATWA_LINE, "visibility", v(layersRef.current.meraasSatwa));
      map.setLayoutProperty(MERAAS_SATWA_FILL, "visibility", v(layersRef.current.meraasSatwa));
    }
    if (map.getLayer(SHAMAL_MAMZAR_LINE)) {
      map.setLayoutProperty(SHAMAL_MAMZAR_LINE, "visibility", v(layersRef.current.shamalMamzar));
      map.setLayoutProperty(SHAMAL_MAMZAR_FILL, "visibility", v(layersRef.current.shamalMamzar));
    }
    if (map.getLayer(SHAMAL_RAFFA_LINE)) {
      map.setLayoutProperty(SHAMAL_RAFFA_LINE, "visibility", v(layersRef.current.shamalRaffa));
      map.setLayoutProperty(SHAMAL_RAFFA_FILL, "visibility", v(layersRef.current.shamalRaffa));
    }
    if (map.getLayer(MERAAS_MAMZAR_LINE)) {
      map.setLayoutProperty(MERAAS_MAMZAR_LINE, "visibility", v(layersRef.current.meraasMamzar));
      map.setLayoutProperty(MERAAS_MAMZAR_FILL, "visibility", v(layersRef.current.meraasMamzar));
    }
    if (map.getLayer(DH_SAFOUH1_LINE)) {
      map.setLayoutProperty(DH_SAFOUH1_LINE, "visibility", v(layersRef.current.dhSafouh1));
      map.setLayoutProperty(DH_SAFOUH1_FILL, "visibility", v(layersRef.current.dhSafouh1));
    }
    if (map.getLayer(DL_B104_LINE)) {
      map.setLayoutProperty(DL_B104_LINE, "visibility", v(layersRef.current.dubaiLandB104));
      map.setLayoutProperty(DL_B104_FILL, "visibility", v(layersRef.current.dubaiLandB104));
    }
    if (map.getLayer(DHAM_ROW1_LINE)) {
      map.setLayoutProperty(DHAM_ROW1_LINE, "visibility", v(layersRef.current.dhamRowaiyah1));
      map.setLayoutProperty(DHAM_ROW1_FILL, "visibility", v(layersRef.current.dhamRowaiyah1));
    }
    if (map.getLayer(DL_B208_LINE)) {
      map.setLayoutProperty(DL_B208_LINE, "visibility", v(layersRef.current.dubaiLandB208));
      map.setLayoutProperty(DL_B208_FILL, "visibility", v(layersRef.current.dubaiLandB208));
    }
    if (map.getLayer(BEACH_LINE)) {
      map.setLayoutProperty(BEACH_LINE, "visibility", v(layersRef.current.theBeach));
      map.setLayoutProperty(BEACH_FILL, "visibility", v(layersRef.current.theBeach));
    }
    if (map.getLayer(SHAMAL_US3_LINE)) {
      map.setLayoutProperty(SHAMAL_US3_LINE, "visibility", v(layersRef.current.shamalUs3));
      map.setLayoutProperty(SHAMAL_US3_FILL, "visibility", v(layersRef.current.shamalUs3));
    }
    if (map.getLayer(MERAAS_HEMAIRA_LINE)) {
      map.setLayoutProperty(MERAAS_HEMAIRA_LINE, "visibility", v(layersRef.current.meraasHemaira));
      map.setLayoutProperty(MERAAS_HEMAIRA_FILL, "visibility", v(layersRef.current.meraasHemaira));
    }
    if (map.getLayer(DP_QUOZ2_LINE)) {
      map.setLayoutProperty(DP_QUOZ2_LINE, "visibility", v(layersRef.current.dpQuoz2));
      map.setLayoutProperty(DP_QUOZ2_FILL, "visibility", v(layersRef.current.dpQuoz2));
    }
    if (map.getLayer(DL_B103_LINE)) {
      map.setLayoutProperty(DL_B103_LINE, "visibility", v(layersRef.current.dubaiLandB103));
      map.setLayoutProperty(DL_B103_FILL, "visibility", v(layersRef.current.dubaiLandB103));
    }
    if (map.getLayer(JG_J2_LINE)) {
      map.setLayoutProperty(JG_J2_LINE, "visibility", v(layersRef.current.jgJumeira2));
      map.setLayoutProperty(JG_J2_FILL, "visibility", v(layersRef.current.jgJumeira2));
    }
    if (map.getLayer(DL_T15_LINE)) {
      map.setLayoutProperty(DL_T15_LINE, "visibility", v(layersRef.current.dubaiLandT15));
      map.setLayoutProperty(DL_T15_FILL, "visibility", v(layersRef.current.dubaiLandT15));
    }
    if (map.getLayer(SHAMAL_WASL_LINE)) {
      map.setLayoutProperty(SHAMAL_WASL_LINE, "visibility", v(layersRef.current.shamalWasl));
      map.setLayoutProperty(SHAMAL_WASL_FILL, "visibility", v(layersRef.current.shamalWasl));
    }
    if (map.getLayer(DL_A304_LINE)) {
      map.setLayoutProperty(DL_A304_LINE, "visibility", v(layersRef.current.dubaiLandA304));
      map.setLayoutProperty(DL_A304_FILL, "visibility", v(layersRef.current.dubaiLandA304));
    }
    if (map.getLayer(EAHM_LINE)) {
      map.setLayoutProperty(EAHM_LINE, "visibility", v(layersRef.current.eahm));
      map.setLayoutProperty(EAHM_FILL, "visibility", v(layersRef.current.eahm));
    }
    if (map.getLayer(MERAAS_ZABEEL2_LINE)) {
      map.setLayoutProperty(MERAAS_ZABEEL2_LINE, "visibility", v(layersRef.current.meraasZabeel2));
      map.setLayoutProperty(MERAAS_ZABEEL2_FILL, "visibility", v(layersRef.current.meraasZabeel2));
    }
    if (map.getLayer(MERAAS_JAFILIYA_LINE)) {
      map.setLayoutProperty(MERAAS_JAFILIYA_LINE, "visibility", v(layersRef.current.meraasJafiliya));
      map.setLayoutProperty(MERAAS_JAFILIYA_FILL, "visibility", v(layersRef.current.meraasJafiliya));
    }
    if (map.getLayer(KITE_LINE)) {
      map.setLayoutProperty(KITE_LINE, "visibility", v(layersRef.current.kiteBeach));
      map.setLayoutProperty(KITE_FILL, "visibility", v(layersRef.current.kiteBeach));
    }
    if (map.getLayer(MERAAS_ALAMARDI_LINE)) {
      map.setLayoutProperty(MERAAS_ALAMARDI_LINE, "visibility", v(layersRef.current.meraasAlamardi));
      map.setLayoutProperty(MERAAS_ALAMARDI_FILL, "visibility", v(layersRef.current.meraasAlamardi));
    }
    if (map.getLayer(MERAAS_PORTSAEED_LINE)) {
      map.setLayoutProperty(MERAAS_PORTSAEED_LINE, "visibility", v(layersRef.current.meraasPortSaeed));
      map.setLayoutProperty(MERAAS_PORTSAEED_FILL, "visibility", v(layersRef.current.meraasPortSaeed));
    }
    if (map.getLayer(DL_6461281_LINE)) {
      map.setLayoutProperty(DL_6461281_LINE, "visibility", v(layersRef.current.dl6461281));
      map.setLayoutProperty(DL_6461281_FILL, "visibility", v(layersRef.current.dl6461281));
    }
    if (map.getLayer(SHAMAL_OUDM_LINE)) {
      map.setLayoutProperty(SHAMAL_OUDM_LINE, "visibility", v(layersRef.current.shamalOudMetha));
      map.setLayoutProperty(SHAMAL_OUDM_FILL, "visibility", v(layersRef.current.shamalOudMetha));
    }
    if (map.getLayer(SHAMAL_Q3_LINE)) {
      map.setLayoutProperty(SHAMAL_Q3_LINE, "visibility", v(layersRef.current.shamalQuoz3));
      map.setLayoutProperty(SHAMAL_Q3_FILL, "visibility", v(layersRef.current.shamalQuoz3));
    }
    if (map.getLayer(DL_A307_LINE)) {
      map.setLayoutProperty(DL_A307_LINE, "visibility", v(layersRef.current.dubaiLandA307));
      map.setLayoutProperty(DL_A307_FILL, "visibility", v(layersRef.current.dubaiLandA307));
    }
    if (map.getLayer(WAS3_6456408_LINE)) {
      map.setLayoutProperty(WAS3_6456408_LINE, "visibility", v(layersRef.current.was36456408));
      map.setLayoutProperty(WAS3_6456408_FILL, "visibility", v(layersRef.current.was36456408));
    }
    if (map.getLayer(SHAMAL_Q1_LINE)) {
      map.setLayoutProperty(SHAMAL_Q1_LINE, "visibility", v(layersRef.current.shamalQuoz1));
      map.setLayoutProperty(SHAMAL_Q1_FILL, "visibility", v(layersRef.current.shamalQuoz1));
    }
    if (map.getLayer(MERAAS_NAS4_LINE)) {
      map.setLayoutProperty(MERAAS_NAS4_LINE, "visibility", v(layersRef.current.meraasNas4));
      map.setLayoutProperty(MERAAS_NAS4_FILL, "visibility", v(layersRef.current.meraasNas4));
    }
    if (map.getLayer(SHAMAL_MUH1_LINE)) {
      map.setLayoutProperty(SHAMAL_MUH1_LINE, "visibility", v(layersRef.current.shamalMuhaisnah1));
      map.setLayoutProperty(SHAMAL_MUH1_FILL, "visibility", v(layersRef.current.shamalMuhaisnah1));
    }
    if (map.getLayer(SHAMAL_J1_LINE)) {
      map.setLayoutProperty(SHAMAL_J1_LINE, "visibility", v(layersRef.current.shamalJumeira1));
      map.setLayoutProperty(SHAMAL_J1_FILL, "visibility", v(layersRef.current.shamalJumeira1));
    }
    if (map.getLayer(MERAAS_QUSAIS2_LINE)) {
      map.setLayoutProperty(MERAAS_QUSAIS2_LINE, "visibility", v(layersRef.current.meraasQusais2));
      map.setLayoutProperty(MERAAS_QUSAIS2_FILL, "visibility", v(layersRef.current.meraasQusais2));
    }
    if (map.getLayer(SHAMAL_MAHA_LINE)) {
      map.setLayoutProperty(SHAMAL_MAHA_LINE, "visibility", v(layersRef.current.shamalMaha));
      map.setLayoutProperty(SHAMAL_MAHA_FILL, "visibility", v(layersRef.current.shamalMaha));
    }
    if (map.getLayer(LUNAYA_LINE)) {
      map.setLayoutProperty(LUNAYA_LINE, "visibility", v(layersRef.current.lunaya));
      map.setLayoutProperty(LUNAYA_FILL, "visibility", v(layersRef.current.lunaya));
    }
    if (map.getLayer(MERAAS_US1_LINE)) {
      map.setLayoutProperty(MERAAS_US1_LINE, "visibility", v(layersRef.current.meraasUs1));
      map.setLayoutProperty(MERAAS_US1_FILL, "visibility", v(layersRef.current.meraasUs1));
    }
    if (map.getLayer(SHAMAL_NAHDA1_LINE)) {
      map.setLayoutProperty(SHAMAL_NAHDA1_LINE, "visibility", v(layersRef.current.shamalNahda1));
      map.setLayoutProperty(SHAMAL_NAHDA1_FILL, "visibility", v(layersRef.current.shamalNahda1));
    }
    if (map.getLayer(SHAMAL_SAFOUH1_LINE)) {
      map.setLayoutProperty(SHAMAL_SAFOUH1_LINE, "visibility", v(layersRef.current.shamalSafouh1));
      map.setLayoutProperty(SHAMAL_SAFOUH1_FILL, "visibility", v(layersRef.current.shamalSafouh1));
    }
    if (map.getLayer(SHAMAL_MARGHAM_LINE)) {
      map.setLayoutProperty(SHAMAL_MARGHAM_LINE, "visibility", v(layersRef.current.shamalMargham));
      map.setLayoutProperty(SHAMAL_MARGHAM_FILL, "visibility", v(layersRef.current.shamalMargham));
    }
    if (map.getLayer(WILD_WADI_LINE)) {
      map.setLayoutProperty(WILD_WADI_LINE, "visibility", v(layersRef.current.wildWadi));
      map.setLayoutProperty(WILD_WADI_FILL, "visibility", v(layersRef.current.wildWadi));
    }
    if (map.getLayer(MERAAS_BS1_LINE)) {
      map.setLayoutProperty(MERAAS_BS1_LINE, "visibility", v(layersRef.current.meraasBs1));
      map.setLayoutProperty(MERAAS_BS1_FILL, "visibility", v(layersRef.current.meraasBs1));
    }
    if (map.getLayer(DL_A409_LINE)) {
      map.setLayoutProperty(DL_A409_LINE, "visibility", v(layersRef.current.dubaiLandA409));
      map.setLayoutProperty(DL_A409_FILL, "visibility", v(layersRef.current.dubaiLandA409));
    }
    if (map.getLayer(ZABEEL1_LINE)) {
      map.setLayoutProperty(ZABEEL1_LINE, "visibility", v(layersRef.current.zabeelFirst));
      map.setLayoutProperty(ZABEEL1_FILL, "visibility", v(layersRef.current.zabeelFirst));
    }
    if (map.getLayer(WAS3_6454931_LINE)) {
      map.setLayoutProperty(WAS3_6454931_LINE, "visibility", v(layersRef.current.was36454931));
      map.setLayoutProperty(WAS3_6454931_FILL, "visibility", v(layersRef.current.was36454931));
    }
    if (map.getLayer(MERAAS_3460266_LINE)) {
      map.setLayoutProperty(MERAAS_3460266_LINE, "visibility", v(layersRef.current.meraas3460266));
      map.setLayoutProperty(MERAAS_3460266_FILL, "visibility", v(layersRef.current.meraas3460266));
    }
    if (map.getLayer(MUSEUM_FUTURE_LINE)) {
      map.setLayoutProperty(MUSEUM_FUTURE_LINE, "visibility", v(layersRef.current.museumFuture));
      map.setLayoutProperty(MUSEUM_FUTURE_FILL, "visibility", v(layersRef.current.museumFuture));
    }
    if (map.getLayer(AL_JALILA_LINE)) {
      map.setLayoutProperty(AL_JALILA_LINE, "visibility", v(layersRef.current.alJalila));
      map.setLayoutProperty(AL_JALILA_FILL, "visibility", v(layersRef.current.alJalila));
    }
    if (map.getLayer(DL_A102_LINE)) {
      map.setLayoutProperty(DL_A102_LINE, "visibility", v(layersRef.current.dubaiLandA102));
      map.setLayoutProperty(DL_A102_FILL, "visibility", v(layersRef.current.dubaiLandA102));
    }
    if (map.getLayer(MERAAS_WARQA2_LINE)) {
      map.setLayoutProperty(MERAAS_WARQA2_LINE, "visibility", v(layersRef.current.meraasWarqa2));
      map.setLayoutProperty(MERAAS_WARQA2_FILL, "visibility", v(layersRef.current.meraasWarqa2));
    }
    if (map.getLayer(MERAAS_J1_LINE)) {
      map.setLayoutProperty(MERAAS_J1_LINE, "visibility", v(layersRef.current.meraasJumeira1));
      map.setLayoutProperty(MERAAS_J1_FILL, "visibility", v(layersRef.current.meraasJumeira1));
    }
    if (map.getLayer(DP_JAFILIYA_LINE)) {
      map.setLayoutProperty(DP_JAFILIYA_LINE, "visibility", v(layersRef.current.dpJafiliya));
      map.setLayoutProperty(DP_JAFILIYA_FILL, "visibility", v(layersRef.current.dpJafiliya));
    }
    if (map.getLayer(BURJ_AA_LINE)) {
      map.setLayoutProperty(BURJ_AA_LINE, "visibility", v(layersRef.current.burjAlArab));
      map.setLayoutProperty(BURJ_AA_FILL, "visibility", v(layersRef.current.burjAlArab));
    }
    if (map.getLayer(SHAMAL_BS1_LINE)) {
      map.setLayoutProperty(SHAMAL_BS1_LINE, "visibility", v(layersRef.current.shamalBs1));
      map.setLayoutProperty(SHAMAL_BS1_FILL, "visibility", v(layersRef.current.shamalBs1));
    }
    if (map.getLayer(DPA_LINE)) {
      map.setLayoutProperty(DPA_LINE, "visibility", v(layersRef.current.dubaiPoliceAcademy));
      map.setLayoutProperty(DPA_FILL, "visibility", v(layersRef.current.dubaiPoliceAcademy));
    }
    if (map.getLayer(SHAMAL_MANKHOOL_LINE)) {
      map.setLayoutProperty(SHAMAL_MANKHOOL_LINE, "visibility", v(layersRef.current.shamalMankhool));
      map.setLayoutProperty(SHAMAL_MANKHOOL_FILL, "visibility", v(layersRef.current.shamalMankhool));
    }
    for (const d of DDA_LAYERS) {
      const labelId = ddaLabelId(d.srcId);
      if (map.getLayer(labelId)) {
        map.setLayoutProperty(labelId, "visibility", v(layersRef.current[d.key]));
      }
    }
  }

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;
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
      await attachOverlays(map);

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
          sound.hover();
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
            sound.click();
            sound.swooshOpen();
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
            `<div style="font-family:Georgia,serif;font-weight:700;letter-spacing:0.05em">${name}</div>`,
          )
          .addTo(map);
      });
      map.on("mouseleave", COMMUNITIES_FILL, () => {
        map.getCanvas().style.cursor = "";
        setHover(undefined);
        popup.remove();
      });

      // ── Master plan hover (shared handler for islands + meydan) ──
      function masterPlanHover(planLabel: string) {
        return (e: MapMouseEvent & { features?: GeoJSON.Feature[] }) => {
          const f = e.features?.[0];
          if (!f) return;
          map.getCanvas().style.cursor = "pointer";
          const layerRaw = (f.properties?.Layer as string) ?? planLabel;
          const clean = layerRaw.replace(/^PDF\s+_MP_LU_/, "").replace(/_/g, " ");
          popup
            .setLngLat(e.lngLat)
            .setHTML(
              `<div><div style="font-family:Georgia,serif;font-weight:700;color:#9333EA">${clean}</div>
               <div style="font-size:10px;opacity:0.7;margin-top:2px">${planLabel}</div></div>`,
            )
            .addTo(map);
        };
      }
      const masterPlanLeave = () => {
        map.getCanvas().style.cursor = "";
        popup.remove();
      };
      map.on("mousemove", ISLANDS_LINE, masterPlanHover("Dubai Islands master plan"));
      map.on("mouseleave", ISLANDS_LINE, masterPlanLeave);
      map.on("mousemove", MEYDAN_LINE, masterPlanHover("Meydan Horizon master plan"));
      map.on("mouseleave", MEYDAN_LINE, masterPlanLeave);
      map.on("mousemove", FURJAN_LINE, masterPlanHover("Al Furjan master plan"));
      map.on("mouseleave", FURJAN_LINE, masterPlanLeave);
      map.on("mousemove", IC23_LINE, masterPlanHover("International City Phase 2 & 3"));
      map.on("mouseleave", IC23_LINE, masterPlanLeave);
      map.on("mousemove", RES12_LINE, masterPlanHover("Residential District Phase I & II"));
      map.on("mouseleave", RES12_LINE, masterPlanLeave);
      map.on("mousemove", D11_LINE, masterPlanHover("D11 — Parcel L/D master plan"));
      map.on("mouseleave", D11_LINE, masterPlanLeave);

      // DDA per-plot hover — show plot number + project + sqft
      function ddaPlotHover() {
        map.getCanvas().style.cursor = "pointer";
      }
      map.on("mousemove", DUBAI_HILLS_LINE, ddaPlotHover);
      map.on("mouseleave", DUBAI_HILLS_LINE, masterPlanLeave);
      map.on("mousemove", DAMAC_HILLS_2_LINE, ddaPlotHover);
      map.on("mouseleave", DAMAC_HILLS_2_LINE, masterPlanLeave);
      map.on("mousemove", DAMAC_LAGOONS_LINE, ddaPlotHover);
      map.on("mouseleave", DAMAC_LAGOONS_LINE, masterPlanLeave);
      map.on("mousemove", DAMAC_ISLANDS_LINE, ddaPlotHover);
      map.on("mouseleave", DAMAC_ISLANDS_LINE, masterPlanLeave);
      map.on("mousemove", THE_VALLEY_LINE, ddaPlotHover);
      map.on("mouseleave", THE_VALLEY_LINE, masterPlanLeave);
      map.on("mousemove", DAMAC_HILLS_LINE, ddaPlotHover);
      map.on("mouseleave", DAMAC_HILLS_LINE, masterPlanLeave);
      map.on("mousemove", MUDON_LINE, ddaPlotHover);
      map.on("mouseleave", MUDON_LINE, masterPlanLeave);
      map.on("mousemove", JABEL_ALI_HILLS_LINE, ddaPlotHover);
      map.on("mouseleave", JABEL_ALI_HILLS_LINE, masterPlanLeave);
      map.on("mousemove", ARABIAN_RANCHES_1_LINE, ddaPlotHover);
      map.on("mouseleave", ARABIAN_RANCHES_1_LINE, masterPlanLeave);
      map.on("mousemove", NAS_GARDENS_LINE, ddaPlotHover);
      map.on("mouseleave", NAS_GARDENS_LINE, masterPlanLeave);
      map.on("mousemove", DSP_LINE, ddaPlotHover);
      map.on("mouseleave", DSP_LINE, masterPlanLeave);
      map.on("mousemove", BUSINESS_BAY_LINE, ddaPlotHover);
      map.on("mouseleave", BUSINESS_BAY_LINE, masterPlanLeave);
      map.on("mousemove", SAMA_AL_JADAF_LINE, ddaPlotHover);
      map.on("mouseleave", SAMA_AL_JADAF_LINE, masterPlanLeave);
      map.on("mousemove", ARJAN_LINE, ddaPlotHover);
      map.on("mouseleave", ARJAN_LINE, masterPlanLeave);
      map.on("mousemove", DHCC2_LINE, ddaPlotHover);
      map.on("mouseleave", DHCC2_LINE, masterPlanLeave);
      map.on("mousemove", BARSHA_HEIGHTS_LINE, ddaPlotHover);
      map.on("mouseleave", BARSHA_HEIGHTS_LINE, masterPlanLeave);
      map.on("mousemove", DIFC_ZABEEL_LINE, ddaPlotHover);
      map.on("mouseleave", DIFC_ZABEEL_LINE, masterPlanLeave);
      map.on("mousemove", JADDAF_WF_LINE, ddaPlotHover);
      map.on("mouseleave", JADDAF_WF_LINE, masterPlanLeave);
      map.on("mousemove", DHCC1_LINE, ddaPlotHover);
      map.on("mouseleave", DHCC1_LINE, masterPlanLeave);
      map.on("mousemove", DIFC_LINE, ddaPlotHover);
      map.on("mouseleave", DIFC_LINE, masterPlanLeave);
      map.on("mousemove", TILAL_AL_GHAF_LINE, ddaPlotHover);
      map.on("mouseleave", TILAL_AL_GHAF_LINE, masterPlanLeave);
      map.on("mousemove", AR2_LINE, ddaPlotHover);
      map.on("mouseleave", AR2_LINE, masterPlanLeave);
      map.on("mousemove", THE_VILLA_LINE, ddaPlotHover);
      map.on("mouseleave", THE_VILLA_LINE, masterPlanLeave);
      map.on("mousemove", AR3_LINE, ddaPlotHover);
      map.on("mouseleave", AR3_LINE, masterPlanLeave);
      map.on("mousemove", DSC_LINE, ddaPlotHover);
      map.on("mouseleave", DSC_LINE, masterPlanLeave);
      map.on("mousemove", VILLANOVA_LINE, ddaPlotHover);
      map.on("mouseleave", VILLANOVA_LINE, masterPlanLeave);
      map.on("mousemove", ACRES_LINE, ddaPlotHover);
      map.on("mouseleave", ACRES_LINE, masterPlanLeave);
      map.on("mousemove", FALCON_LINE, ddaPlotHover);
      map.on("mouseleave", FALCON_LINE, masterPlanLeave);
      map.on("mousemove", AL_ARYAM_LINE, ddaPlotHover);
      map.on("mouseleave", AL_ARYAM_LINE, masterPlanLeave);
      map.on("mousemove", DIC_LINE, ddaPlotHover);
      map.on("mouseleave", DIC_LINE, masterPlanLeave);
      map.on("mousemove", DI2_LINE, ddaPlotHover);
      map.on("mouseleave", DI2_LINE, masterPlanLeave);
      map.on("mousemove", WILDS_LINE, ddaPlotHover);
      map.on("mouseleave", WILDS_LINE, masterPlanLeave);
      map.on("mousemove", TOWN_SQ_LINE, ddaPlotHover);
      map.on("mouseleave", TOWN_SQ_LINE, masterPlanLeave);
      map.on("mousemove", ATHLON_LINE, ddaPlotHover);
      map.on("mouseleave", ATHLON_LINE, masterPlanLeave);
      map.on("mousemove", CHERRY_LINE, ddaPlotHover);
      map.on("mouseleave", CHERRY_LINE, masterPlanLeave);
      map.on("mousemove", PORTOFINO_LINE, ddaPlotHover);
      map.on("mouseleave", PORTOFINO_LINE, masterPlanLeave);
      map.on("mousemove", HAVEN_LINE, ddaPlotHover);
      map.on("mouseleave", HAVEN_LINE, masterPlanLeave);
      map.on("mousemove", AL_BARARI_LINE, ddaPlotHover);
      map.on("mouseleave", AL_BARARI_LINE, masterPlanLeave);
      map.on("mousemove", JAI_LINE, ddaPlotHover);
      map.on("mouseleave", JAI_LINE, masterPlanLeave);
      map.on("mousemove", LL_LINE, ddaPlotHover);
      map.on("mouseleave", LL_LINE, masterPlanLeave);
      map.on("mousemove", SHOROOQ_LINE, ddaPlotHover);
      map.on("mouseleave", SHOROOQ_LINE, masterPlanLeave);
      map.on("mousemove", COA_LINE, ddaPlotHover);
      map.on("mouseleave", COA_LINE, masterPlanLeave);
      map.on("mousemove", SERENA_LINE, ddaPlotHover);
      map.on("mouseleave", SERENA_LINE, masterPlanLeave);
      map.on("mousemove", DCH_LINE, ddaPlotHover);
      map.on("mouseleave", DCH_LINE, masterPlanLeave);
      map.on("mousemove", DPC_LINE, ddaPlotHover);
      map.on("mouseleave", DPC_LINE, masterPlanLeave);
      map.on("mousemove", SOBHA_R_LINE, ddaPlotHover);
      map.on("mouseleave", SOBHA_R_LINE, masterPlanLeave);
      map.on("mousemove", JGC_LINE, ddaPlotHover);
      map.on("mouseleave", JGC_LINE, masterPlanLeave);
      map.on("mousemove", SOBHA_E_LINE, ddaPlotHover);
      map.on("mouseleave", SOBHA_E_LINE, masterPlanLeave);
      map.on("mousemove", DLRC_LINE, ddaPlotHover);
      map.on("mouseleave", DLRC_LINE, masterPlanLeave);
      map.on("mousemove", PEARL_J_LINE, ddaPlotHover);
      map.on("mouseleave", PEARL_J_LINE, masterPlanLeave);
      map.on("mousemove", KHAWANEEJ_LINE, ddaPlotHover);
      map.on("mouseleave", KHAWANEEJ_LINE, masterPlanLeave);
      map.on("mousemove", MAJAN_LINE, ddaPlotHover);
      map.on("mouseleave", MAJAN_LINE, masterPlanLeave);
      map.on("mousemove", LA_MER_LINE, ddaPlotHover);
      map.on("mouseleave", LA_MER_LINE, masterPlanLeave);
      map.on("mousemove", DUBAI_LAND_LINE, ddaPlotHover);
      map.on("mouseleave", DUBAI_LAND_LINE, masterPlanLeave);
      map.on("mousemove", DGC_LINE, ddaPlotHover);
      map.on("mouseleave", DGC_LINE, masterPlanLeave);
      map.on("mousemove", MERAAS_UAS_LINE, ddaPlotHover);
      map.on("mouseleave", MERAAS_UAS_LINE, masterPlanLeave);
      map.on("mousemove", MAMZAR_LINE, ddaPlotHover);
      map.on("mouseleave", MAMZAR_LINE, masterPlanLeave);
      map.on("mousemove", ASMARAN_LINE, ddaPlotHover);
      map.on("mouseleave", ASMARAN_LINE, masterPlanLeave);
      map.on("mousemove", JBAY_LINE, ddaPlotHover);
      map.on("mouseleave", JBAY_LINE, masterPlanLeave);
      map.on("mousemove", REPORTAGE_LINE, ddaPlotHover);
      map.on("mouseleave", REPORTAGE_LINE, masterPlanLeave);
      map.on("mousemove", LIWAN_LINE, ddaPlotHover);
      map.on("mouseleave", LIWAN_LINE, masterPlanLeave);
      map.on("mousemove", DSTUDIO_LINE, ddaPlotHover);
      map.on("mouseleave", DSTUDIO_LINE, masterPlanLeave);
      map.on("mousemove", LIWAN2_LINE, ddaPlotHover);
      map.on("mouseleave", LIWAN2_LINE, masterPlanLeave);
      map.on("mousemove", NAIA_LINE, ddaPlotHover);
      map.on("mouseleave", NAIA_LINE, masterPlanLeave);
      map.on("mousemove", ARDH_LINE, ddaPlotHover);
      map.on("mouseleave", ARDH_LINE, masterPlanLeave);
      map.on("mousemove", TIJARA_LINE, ddaPlotHover);
      map.on("mouseleave", TIJARA_LINE, masterPlanLeave);
      map.on("mousemove", WARSAN_LINE, ddaPlotHover);
      map.on("mouseleave", WARSAN_LINE, masterPlanLeave);
      map.on("mousemove", MERAAS_MIRDIF_LINE, ddaPlotHover);
      map.on("mouseleave", MERAAS_MIRDIF_LINE, masterPlanLeave);
      map.on("mousemove", HABTOOR_LINE, ddaPlotHover);
      map.on("mouseleave", HABTOOR_LINE, masterPlanLeave);
      map.on("mousemove", MERAAS_UMA_LINE, ddaPlotHover);
      map.on("mouseleave", MERAAS_UMA_LINE, masterPlanLeave);
      map.on("mousemove", D3_DDA_LINE, ddaPlotHover);
      map.on("mouseleave", D3_DDA_LINE, masterPlanLeave);
      map.on("mousemove", KHAIL_LINE, ddaPlotHover);
      map.on("mouseleave", KHAIL_LINE, masterPlanLeave);
      map.on("mousemove", SITE_A_LINE, ddaPlotHover);
      map.on("mouseleave", SITE_A_LINE, masterPlanLeave);
      map.on("mousemove", RUKAN_LINE, ddaPlotHover);
      map.on("mouseleave", RUKAN_LINE, masterPlanLeave);
      map.on("mousemove", CALI_LINE, ddaPlotHover);
      map.on("mouseleave", CALI_LINE, masterPlanLeave);
      map.on("mousemove", MERAAS_NAH_LINE, ddaPlotHover);
      map.on("mouseleave", MERAAS_NAH_LINE, masterPlanLeave);
      map.on("mousemove", PALMAROSA_LINE, ddaPlotHover);
      map.on("mouseleave", PALMAROSA_LINE, masterPlanLeave);
      map.on("mousemove", DIAC_LINE, ddaPlotHover);
      map.on("mouseleave", DIAC_LINE, masterPlanLeave);
      map.on("mousemove", WAHA_LINE, ddaPlotHover);
      map.on("mouseleave", WAHA_LINE, masterPlanLeave);
      map.on("mousemove", HARBOUR_LINE, ddaPlotHover);
      map.on("mouseleave", HARBOUR_LINE, masterPlanLeave);
      map.on("mousemove", KLABOUR_LINE, ddaPlotHover);
      map.on("mouseleave", KLABOUR_LINE, masterPlanLeave);
      map.on("mousemove", WIND_LINE, ddaPlotHover);
      map.on("mouseleave", WIND_LINE, masterPlanLeave);
      map.on("mousemove", DLC_LINE, ddaPlotHover);
      map.on("mouseleave", DLC_LINE, masterPlanLeave);
      map.on("mousemove", SUFOUH_LINE, ddaPlotHover);
      map.on("mouseleave", SUFOUH_LINE, masterPlanLeave);
      map.on("mousemove", MOTOR_LINE, ddaPlotHover);
      map.on("mouseleave", MOTOR_LINE, masterPlanLeave);
      map.on("mousemove", TAOR1_LINE, ddaPlotHover);
      map.on("mouseleave", TAOR1_LINE, masterPlanLeave);
      map.on("mousemove", DPARKS_LINE, ddaPlotHover);
      map.on("mouseleave", DPARKS_LINE, masterPlanLeave);
      map.on("mousemove", CWALK_LINE, ddaPlotHover);
      map.on("mouseleave", CWALK_LINE, masterPlanLeave);
      map.on("mousemove", ARPOLO_LINE, ddaPlotHover);
      map.on("mouseleave", ARPOLO_LINE, masterPlanLeave);
      map.on("mousemove", BARSHA3_LINE, ddaPlotHover);
      map.on("mouseleave", BARSHA3_LINE, masterPlanLeave);
      map.on("mousemove", MERAAS_B2_LINE, ddaPlotHover);
      map.on("mouseleave", MERAAS_B2_LINE, masterPlanLeave);
      map.on("mousemove", DOC_LINE, ddaPlotHover);
      map.on("mouseleave", DOC_LINE, masterPlanLeave);
      map.on("mousemove", BURJ_LINE, ddaPlotHover);
      map.on("mouseleave", BURJ_LINE, masterPlanLeave);
      map.on("mousemove", GHAF_LINE, ddaPlotHover);
      map.on("mouseleave", GHAF_LINE, masterPlanLeave);
      map.on("mousemove", TAOR2_LINE, ddaPlotHover);
      map.on("mouseleave", TAOR2_LINE, masterPlanLeave);
      map.on("mousemove", BIANCA_LINE, ddaPlotHover);
      map.on("mouseleave", BIANCA_LINE, masterPlanLeave);
      map.on("mousemove", MJL_LINE, ddaPlotHover);
      map.on("mouseleave", MJL_LINE, masterPlanLeave);
      map.on("mousemove", DHK1_LINE, ddaPlotHover);
      map.on("mouseleave", DHK1_LINE, masterPlanLeave);
      map.on("mousemove", REMRAAM_LINE, ddaPlotHover);
      map.on("mouseleave", REMRAAM_LINE, masterPlanLeave);
      map.on("mousemove", ECHO_LINE, ddaPlotHover);
      map.on("mouseleave", ECHO_LINE, masterPlanLeave);
      map.on("mousemove", SUSCITY_LINE, ddaPlotHover);
      map.on("mouseleave", SUSCITY_LINE, masterPlanLeave);
      map.on("mousemove", JBR_LINE, ddaPlotHover);
      map.on("mouseleave", JBR_LINE, masterPlanLeave);
      map.on("mousemove", GHOROOB_LINE, ddaPlotHover);
      map.on("mouseleave", GHOROOB_LINE, masterPlanLeave);
      map.on("mousemove", DPB3_LINE, ddaPlotHover);
      map.on("mouseleave", DPB3_LINE, masterPlanLeave);
      map.on("mousemove", MARSA_LINE, ddaPlotHover);
      map.on("mouseleave", MARSA_LINE, masterPlanLeave);
      map.on("mousemove", BLUE_LINE, ddaPlotHover);
      map.on("mouseleave", BLUE_LINE, masterPlanLeave);
      map.on("mousemove", SITE_D_LINE, ddaPlotHover);
      map.on("mouseleave", SITE_D_LINE, masterPlanLeave);
      map.on("mousemove", KHEIGHTS_LINE, ddaPlotHover);
      map.on("mouseleave", KHEIGHTS_LINE, masterPlanLeave);
      map.on("mousemove", MERAAS_UAD_LINE, ddaPlotHover);
      map.on("mouseleave", MERAAS_UAD_LINE, masterPlanLeave);
      map.on("mousemove", DLAND673_LINE, ddaPlotHover);
      map.on("mouseleave", DLAND673_LINE, masterPlanLeave);
      map.on("mousemove", SHAMAL_Y1_LINE, ddaPlotHover);
      map.on("mouseleave", SHAMAL_Y1_LINE, masterPlanLeave);
      map.on("mousemove", TECOM_Q2_LINE, ddaPlotHover);
      map.on("mouseleave", TECOM_Q2_LINE, masterPlanLeave);
      map.on("mousemove", GV_LINE, ddaPlotHover);
      map.on("mouseleave", GV_LINE, masterPlanLeave);
      map.on("mousemove", LAYAN_LINE, ddaPlotHover);
      map.on("mouseleave", LAYAN_LINE, masterPlanLeave);
      map.on("mousemove", DPGMBR_LINE, ddaPlotHover);
      map.on("mouseleave", DPGMBR_LINE, masterPlanLeave);
      map.on("mousemove", DWC_LINE, ddaPlotHover);
      map.on("mouseleave", DWC_LINE, masterPlanLeave);
      map.on("mousemove", LQUOZ_LINE, ddaPlotHover);
      map.on("mouseleave", LQUOZ_LINE, masterPlanLeave);
      map.on("mousemove", SCHFZ_LINE, ddaPlotHover);
      map.on("mouseleave", SCHFZ_LINE, masterPlanLeave);
      map.on("mousemove", DWCNFZ_LINE, ddaPlotHover);
      map.on("mouseleave", DWCNFZ_LINE, masterPlanLeave);
      map.on("mousemove", SHAMAL_JAI1_LINE, ddaPlotHover);
      map.on("mouseleave", SHAMAL_JAI1_LINE, masterPlanLeave);
      map.on("mousemove", JAI_STAFF_LINE, ddaPlotHover);
      map.on("mouseleave", JAI_STAFF_LINE, masterPlanLeave);
      map.on("mousemove", SHAMAL_TC2_LINE, ddaPlotHover);
      map.on("mouseleave", SHAMAL_TC2_LINE, masterPlanLeave);
      map.on("mousemove", NUZUL_LINE, ddaPlotHover);
      map.on("mouseleave", NUZUL_LINE, masterPlanLeave);
      map.on("mousemove", KOA_LINE, ddaPlotHover);
      map.on("mouseleave", KOA_LINE, masterPlanLeave);
      map.on("mousemove", SOBHA_S_LINE, ddaPlotHover);
      map.on("mouseleave", SOBHA_S_LINE, masterPlanLeave);
      map.on("mousemove", BOX_LINE, ddaPlotHover);
      map.on("mouseleave", BOX_LINE, masterPlanLeave);
      map.on("mousemove", SHAMAL_NAS1_LINE, ddaPlotHover);
      map.on("mouseleave", SHAMAL_NAS1_LINE, masterPlanLeave);
      map.on("mousemove", LASTEXIT_LINE, ddaPlotHover);
      map.on("mouseleave", LASTEXIT_LINE, masterPlanLeave);
      map.on("mousemove", SCARA_LINE, ddaPlotHover);
      map.on("mouseleave", SCARA_LINE, masterPlanLeave);
      map.on("mousemove", MERAAS_W3_LINE, ddaPlotHover);
      map.on("mouseleave", MERAAS_W3_LINE, masterPlanLeave);
      map.on("mousemove", JCENTRAL_LINE, ddaPlotHover);
      map.on("mouseleave", JCENTRAL_LINE, masterPlanLeave);
      map.on("mousemove", OASIS_LINE, ddaPlotHover);
      map.on("mouseleave", OASIS_LINE, masterPlanLeave);
      map.on("mousemove", ETD_LINE, ddaPlotHover);
      map.on("mouseleave", ETD_LINE, masterPlanLeave);
      map.on("mousemove", MERAAS_Q3_LINE, ddaPlotHover);
      map.on("mouseleave", MERAAS_Q3_LINE, masterPlanLeave);
      map.on("mousemove", MARSA_S_LINE, ddaPlotHover);
      map.on("mouseleave", MARSA_S_LINE, masterPlanLeave);
      map.on("mousemove", MERAAS_WAS_LINE, ddaPlotHover);
      map.on("mouseleave", MERAAS_WAS_LINE, masterPlanLeave);
      map.on("mousemove", SHAMAL_B2_LINE, ddaPlotHover);
      map.on("mouseleave", SHAMAL_B2_LINE, masterPlanLeave);
      map.on("mousemove", SHAMAL_N2_LINE, ddaPlotHover);
      map.on("mouseleave", SHAMAL_N2_LINE, masterPlanLeave);
      map.on("mousemove", MERAAS_SAIH1_LINE, ddaPlotHover);
      map.on("mouseleave", MERAAS_SAIH1_LINE, masterPlanLeave);
      map.on("mousemove", DPOL_UAD_LINE, ddaPlotHover);
      map.on("mouseleave", DPOL_UAD_LINE, masterPlanLeave);
      map.on("mousemove", MERAAS_RAK3_LINE, ddaPlotHover);
      map.on("mouseleave", MERAAS_RAK3_LINE, masterPlanLeave);
      map.on("mousemove", MERAAS_MD_LINE, ddaPlotHover);
      map.on("mouseleave", MERAAS_MD_LINE, masterPlanLeave);
      map.on("mousemove", SHAMAL_HAD_LINE, ddaPlotHover);
      map.on("mouseleave", SHAMAL_HAD_LINE, masterPlanLeave);
      map.on("mousemove", JBH_LINE, ddaPlotHover);
      map.on("mouseleave", JBH_LINE, masterPlanLeave);
      map.on("mousemove", MJUM_LINE, ddaPlotHover);
      map.on("mouseleave", MJUM_LINE, masterPlanLeave);
      map.on("mousemove", TECOM_SAIH_LINE, ddaPlotHover);
      map.on("mouseleave", TECOM_SAIH_LINE, masterPlanLeave);
      map.on("mousemove", CV2_LINE, ddaPlotHover);
      map.on("mouseleave", CV2_LINE, masterPlanLeave);
      map.on("mousemove", MERAAS_BS2_LINE, ddaPlotHover);
      map.on("mouseleave", MERAAS_BS2_LINE, masterPlanLeave);
      map.on("mousemove", SHAMAL_MUH2_LINE, ddaPlotHover);
      map.on("mouseleave", SHAMAL_MUH2_LINE, masterPlanLeave);
      map.on("mousemove", SHAMAL_Q2_LINE, ddaPlotHover);
      map.on("mouseleave", SHAMAL_Q2_LINE, masterPlanLeave);
      map.on("mousemove", CV3_LINE, ddaPlotHover);
      map.on("mouseleave", CV3_LINE, masterPlanLeave);
      map.on("mousemove", MERAAS_SATWA_LINE, ddaPlotHover);
      map.on("mouseleave", MERAAS_SATWA_LINE, masterPlanLeave);
      map.on("mousemove", SHAMAL_MAMZAR_LINE, ddaPlotHover);
      map.on("mouseleave", SHAMAL_MAMZAR_LINE, masterPlanLeave);
      map.on("mousemove", SHAMAL_RAFFA_LINE, ddaPlotHover);
      map.on("mouseleave", SHAMAL_RAFFA_LINE, masterPlanLeave);
      map.on("mousemove", MERAAS_MAMZAR_LINE, ddaPlotHover);
      map.on("mouseleave", MERAAS_MAMZAR_LINE, masterPlanLeave);
      map.on("mousemove", DH_SAFOUH1_LINE, ddaPlotHover);
      map.on("mouseleave", DH_SAFOUH1_LINE, masterPlanLeave);
      map.on("mousemove", DL_B104_LINE, ddaPlotHover);
      map.on("mouseleave", DL_B104_LINE, masterPlanLeave);
      map.on("mousemove", DHAM_ROW1_LINE, ddaPlotHover);
      map.on("mouseleave", DHAM_ROW1_LINE, masterPlanLeave);
      map.on("mousemove", DL_B208_LINE, ddaPlotHover);
      map.on("mouseleave", DL_B208_LINE, masterPlanLeave);
      map.on("mousemove", BEACH_LINE, ddaPlotHover);
      map.on("mouseleave", BEACH_LINE, masterPlanLeave);
      map.on("mousemove", SHAMAL_US3_LINE, ddaPlotHover);
      map.on("mouseleave", SHAMAL_US3_LINE, masterPlanLeave);
      map.on("mousemove", MERAAS_HEMAIRA_LINE, ddaPlotHover);
      map.on("mouseleave", MERAAS_HEMAIRA_LINE, masterPlanLeave);
      map.on("mousemove", DP_QUOZ2_LINE, ddaPlotHover);
      map.on("mouseleave", DP_QUOZ2_LINE, masterPlanLeave);
      map.on("mousemove", DL_B103_LINE, ddaPlotHover);
      map.on("mouseleave", DL_B103_LINE, masterPlanLeave);
      map.on("mousemove", JG_J2_LINE, ddaPlotHover);
      map.on("mouseleave", JG_J2_LINE, masterPlanLeave);
      map.on("mousemove", DL_T15_LINE, ddaPlotHover);
      map.on("mouseleave", DL_T15_LINE, masterPlanLeave);
      map.on("mousemove", SHAMAL_WASL_LINE, ddaPlotHover);
      map.on("mouseleave", SHAMAL_WASL_LINE, masterPlanLeave);
      map.on("mousemove", DL_A304_LINE, ddaPlotHover);
      map.on("mouseleave", DL_A304_LINE, masterPlanLeave);
      map.on("mousemove", EAHM_LINE, ddaPlotHover);
      map.on("mouseleave", EAHM_LINE, masterPlanLeave);
      map.on("mousemove", MERAAS_ZABEEL2_LINE, ddaPlotHover);
      map.on("mouseleave", MERAAS_ZABEEL2_LINE, masterPlanLeave);
      map.on("mousemove", MERAAS_JAFILIYA_LINE, ddaPlotHover);
      map.on("mouseleave", MERAAS_JAFILIYA_LINE, masterPlanLeave);
      map.on("mousemove", KITE_LINE, ddaPlotHover);
      map.on("mouseleave", KITE_LINE, masterPlanLeave);
      map.on("mousemove", MERAAS_ALAMARDI_LINE, ddaPlotHover);
      map.on("mouseleave", MERAAS_ALAMARDI_LINE, masterPlanLeave);
      map.on("mousemove", MERAAS_PORTSAEED_LINE, ddaPlotHover);
      map.on("mouseleave", MERAAS_PORTSAEED_LINE, masterPlanLeave);
      map.on("mousemove", DL_6461281_LINE, ddaPlotHover);
      map.on("mouseleave", DL_6461281_LINE, masterPlanLeave);
      map.on("mousemove", SHAMAL_OUDM_LINE, ddaPlotHover);
      map.on("mouseleave", SHAMAL_OUDM_LINE, masterPlanLeave);
      map.on("mousemove", SHAMAL_Q3_LINE, ddaPlotHover);
      map.on("mouseleave", SHAMAL_Q3_LINE, masterPlanLeave);
      map.on("mousemove", DL_A307_LINE, ddaPlotHover);
      map.on("mouseleave", DL_A307_LINE, masterPlanLeave);
      map.on("mousemove", WAS3_6456408_LINE, ddaPlotHover);
      map.on("mouseleave", WAS3_6456408_LINE, masterPlanLeave);
      map.on("mousemove", SHAMAL_Q1_LINE, ddaPlotHover);
      map.on("mouseleave", SHAMAL_Q1_LINE, masterPlanLeave);
      map.on("mousemove", MERAAS_NAS4_LINE, ddaPlotHover);
      map.on("mouseleave", MERAAS_NAS4_LINE, masterPlanLeave);
      map.on("mousemove", SHAMAL_MUH1_LINE, ddaPlotHover);
      map.on("mouseleave", SHAMAL_MUH1_LINE, masterPlanLeave);
      map.on("mousemove", SHAMAL_J1_LINE, ddaPlotHover);
      map.on("mouseleave", SHAMAL_J1_LINE, masterPlanLeave);
      map.on("mousemove", MERAAS_QUSAIS2_LINE, ddaPlotHover);
      map.on("mouseleave", MERAAS_QUSAIS2_LINE, masterPlanLeave);
      map.on("mousemove", SHAMAL_MAHA_LINE, ddaPlotHover);
      map.on("mouseleave", SHAMAL_MAHA_LINE, masterPlanLeave);
      map.on("mousemove", LUNAYA_LINE, ddaPlotHover);
      map.on("mouseleave", LUNAYA_LINE, masterPlanLeave);
      map.on("mousemove", MERAAS_US1_LINE, ddaPlotHover);
      map.on("mouseleave", MERAAS_US1_LINE, masterPlanLeave);
      map.on("mousemove", SHAMAL_NAHDA1_LINE, ddaPlotHover);
      map.on("mouseleave", SHAMAL_NAHDA1_LINE, masterPlanLeave);
      map.on("mousemove", SHAMAL_SAFOUH1_LINE, ddaPlotHover);
      map.on("mouseleave", SHAMAL_SAFOUH1_LINE, masterPlanLeave);
      map.on("mousemove", SHAMAL_MARGHAM_LINE, ddaPlotHover);
      map.on("mouseleave", SHAMAL_MARGHAM_LINE, masterPlanLeave);
      map.on("mousemove", WILD_WADI_LINE, ddaPlotHover);
      map.on("mouseleave", WILD_WADI_LINE, masterPlanLeave);
      map.on("mousemove", MERAAS_BS1_LINE, ddaPlotHover);
      map.on("mouseleave", MERAAS_BS1_LINE, masterPlanLeave);
      map.on("mousemove", DL_A409_LINE, ddaPlotHover);
      map.on("mouseleave", DL_A409_LINE, masterPlanLeave);
      map.on("mousemove", ZABEEL1_LINE, ddaPlotHover);
      map.on("mouseleave", ZABEEL1_LINE, masterPlanLeave);
      map.on("mousemove", WAS3_6454931_LINE, ddaPlotHover);
      map.on("mouseleave", WAS3_6454931_LINE, masterPlanLeave);
      map.on("mousemove", MERAAS_3460266_LINE, ddaPlotHover);
      map.on("mouseleave", MERAAS_3460266_LINE, masterPlanLeave);
      map.on("mousemove", MUSEUM_FUTURE_LINE, ddaPlotHover);
      map.on("mouseleave", MUSEUM_FUTURE_LINE, masterPlanLeave);
      map.on("mousemove", AL_JALILA_LINE, ddaPlotHover);
      map.on("mouseleave", AL_JALILA_LINE, masterPlanLeave);
      map.on("mousemove", DL_A102_LINE, ddaPlotHover);
      map.on("mouseleave", DL_A102_LINE, masterPlanLeave);
      map.on("mousemove", MERAAS_WARQA2_LINE, ddaPlotHover);
      map.on("mouseleave", MERAAS_WARQA2_LINE, masterPlanLeave);
      map.on("mousemove", MERAAS_J1_LINE, ddaPlotHover);
      map.on("mouseleave", MERAAS_J1_LINE, masterPlanLeave);
      map.on("mousemove", DP_JAFILIYA_LINE, ddaPlotHover);
      map.on("mouseleave", DP_JAFILIYA_LINE, masterPlanLeave);
      map.on("mousemove", BURJ_AA_LINE, ddaPlotHover);
      map.on("mouseleave", BURJ_AA_LINE, masterPlanLeave);
      map.on("mousemove", SHAMAL_BS1_LINE, ddaPlotHover);
      map.on("mouseleave", SHAMAL_BS1_LINE, masterPlanLeave);
      map.on("mousemove", DPA_LINE, ddaPlotHover);
      map.on("mouseleave", DPA_LINE, masterPlanLeave);
      map.on("mousemove", SHAMAL_MANKHOOL_LINE, ddaPlotHover);
      map.on("mouseleave", SHAMAL_MANKHOOL_LINE, masterPlanLeave);
    });

    mapRef.current = map;
    return () => {
      popup.remove();
      map.remove();
      mapRef.current = null;
    };
  }, []);

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
      if (map.getLayer(ROADS_LINE)) {
        map.setPaintProperty(ROADS_LINE, "line-color", baseMap === "dark" ? "#888888" : "#666666");
      }
    });
  }, [baseMap]);

  // Layer toggles
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    const v = (on: boolean) => (on ? "visible" : "none");
    if (map.getLayer(COMMUNITIES_FILL)) {
      map.setLayoutProperty(COMMUNITIES_FILL, "visibility", v(layers.communities));
      map.setLayoutProperty(COMMUNITIES_LINE, "visibility", v(layers.communities));
    }
    if (map.getLayer(ROADS_LINE)) {
      map.setLayoutProperty(ROADS_LINE, "visibility", v(layers.roads));
    }
    if (map.getLayer(ISLANDS_LINE)) {
      map.setLayoutProperty(ISLANDS_LINE, "visibility", v(layers.islands));
    }
    if (map.getLayer(MEYDAN_LINE)) {
      map.setLayoutProperty(MEYDAN_LINE, "visibility", v(layers.meydan));
    }
    if (map.getLayer(FURJAN_LINE)) {
      map.setLayoutProperty(FURJAN_LINE, "visibility", v(layers.alFurjan));
    }
    if (map.getLayer(IC23_LINE)) {
      map.setLayoutProperty(IC23_LINE, "visibility", v(layers.intlCity23));
    }
    if (map.getLayer(RES12_LINE)) {
      map.setLayoutProperty(RES12_LINE, "visibility", v(layers.residential12));
    }
    if (map.getLayer(D11_LINE)) {
      map.setLayoutProperty(D11_LINE, "visibility", v(layers.d11));
    }
    if (map.getLayer(DUBAI_HILLS_LINE)) {
      map.setLayoutProperty(DUBAI_HILLS_LINE, "visibility", v(layers.dubaiHills));
    }
    if (map.getLayer(DAMAC_HILLS_2_LINE)) {
      map.setLayoutProperty(DAMAC_HILLS_2_LINE, "visibility", v(layers.damacHills2));
    }
    if (map.getLayer(DAMAC_LAGOONS_LINE)) {
      map.setLayoutProperty(DAMAC_LAGOONS_LINE, "visibility", v(layers.damacLagoons));
    }
    if (map.getLayer(DAMAC_ISLANDS_LINE)) {
      map.setLayoutProperty(DAMAC_ISLANDS_LINE, "visibility", v(layers.damacIslands));
    }
    if (map.getLayer(THE_VALLEY_LINE)) {
      map.setLayoutProperty(THE_VALLEY_LINE, "visibility", v(layers.theValley));
    }
    if (map.getLayer(DAMAC_HILLS_LINE)) {
      map.setLayoutProperty(DAMAC_HILLS_LINE, "visibility", v(layers.damacHills));
    }
    if (map.getLayer(MUDON_LINE)) {
      map.setLayoutProperty(MUDON_LINE, "visibility", v(layers.mudon));
    }
    if (map.getLayer(JABEL_ALI_HILLS_LINE)) {
      map.setLayoutProperty(JABEL_ALI_HILLS_LINE, "visibility", v(layers.jabelAliHills));
    }
    if (map.getLayer(ARABIAN_RANCHES_1_LINE)) {
      map.setLayoutProperty(ARABIAN_RANCHES_1_LINE, "visibility", v(layers.arabianRanches1));
    }
    if (map.getLayer(NAS_GARDENS_LINE)) {
      map.setLayoutProperty(NAS_GARDENS_LINE, "visibility", v(layers.nasGardens));
    }
    if (map.getLayer(DSP_LINE)) {
      map.setLayoutProperty(DSP_LINE, "visibility", v(layers.dsp));
    }
    if (map.getLayer(BUSINESS_BAY_LINE)) {
      map.setLayoutProperty(BUSINESS_BAY_LINE, "visibility", v(layers.businessBay));
    }
    if (map.getLayer(SAMA_AL_JADAF_LINE)) {
      map.setLayoutProperty(SAMA_AL_JADAF_LINE, "visibility", v(layers.samaAlJadaf));
    }
    if (map.getLayer(ARJAN_LINE)) {
      map.setLayoutProperty(ARJAN_LINE, "visibility", v(layers.arjan));
    }
    if (map.getLayer(DHCC2_LINE)) {
      map.setLayoutProperty(DHCC2_LINE, "visibility", v(layers.dhcc2));
    }
    if (map.getLayer(BARSHA_HEIGHTS_LINE)) {
      map.setLayoutProperty(BARSHA_HEIGHTS_LINE, "visibility", v(layers.barshaHeights));
      map.setLayoutProperty(BARSHA_HEIGHTS_FILL, "visibility", v(layers.barshaHeights));
    }
    if (map.getLayer(DIFC_ZABEEL_LINE)) {
      map.setLayoutProperty(DIFC_ZABEEL_LINE, "visibility", v(layers.difcZabeel));
      map.setLayoutProperty(DIFC_ZABEEL_FILL, "visibility", v(layers.difcZabeel));
    }
    if (map.getLayer(JADDAF_WF_LINE)) {
      map.setLayoutProperty(JADDAF_WF_LINE, "visibility", v(layers.jaddafWaterfront));
      map.setLayoutProperty(JADDAF_WF_FILL, "visibility", v(layers.jaddafWaterfront));
    }
    if (map.getLayer(DHCC1_LINE)) {
      map.setLayoutProperty(DHCC1_LINE, "visibility", v(layers.dhcc1));
      map.setLayoutProperty(DHCC1_FILL, "visibility", v(layers.dhcc1));
    }
    if (map.getLayer(DIFC_LINE)) {
      map.setLayoutProperty(DIFC_LINE, "visibility", v(layers.difc));
      map.setLayoutProperty(DIFC_FILL, "visibility", v(layers.difc));
    }
    if (map.getLayer(TILAL_AL_GHAF_LINE)) {
      map.setLayoutProperty(TILAL_AL_GHAF_LINE, "visibility", v(layers.tilalAlGhaf));
      map.setLayoutProperty(TILAL_AL_GHAF_FILL, "visibility", v(layers.tilalAlGhaf));
    }
    if (map.getLayer(AR2_LINE)) {
      map.setLayoutProperty(AR2_LINE, "visibility", v(layers.arabianRanches2));
      map.setLayoutProperty(AR2_FILL, "visibility", v(layers.arabianRanches2));
    }
    if (map.getLayer(THE_VILLA_LINE)) {
      map.setLayoutProperty(THE_VILLA_LINE, "visibility", v(layers.theVilla));
      map.setLayoutProperty(THE_VILLA_FILL, "visibility", v(layers.theVilla));
    }
    if (map.getLayer(AR3_LINE)) {
      map.setLayoutProperty(AR3_LINE, "visibility", v(layers.arabianRanches3));
      map.setLayoutProperty(AR3_FILL, "visibility", v(layers.arabianRanches3));
    }
    if (map.getLayer(DSC_LINE)) {
      map.setLayoutProperty(DSC_LINE, "visibility", v(layers.dubaiSportsCity));
      map.setLayoutProperty(DSC_FILL, "visibility", v(layers.dubaiSportsCity));
    }
    if (map.getLayer(VILLANOVA_LINE)) {
      map.setLayoutProperty(VILLANOVA_LINE, "visibility", v(layers.villanova));
      map.setLayoutProperty(VILLANOVA_FILL, "visibility", v(layers.villanova));
    }
    if (map.getLayer(ACRES_LINE)) {
      map.setLayoutProperty(ACRES_LINE, "visibility", v(layers.theAcres));
      map.setLayoutProperty(ACRES_FILL, "visibility", v(layers.theAcres));
    }
    if (map.getLayer(FALCON_LINE)) {
      map.setLayoutProperty(FALCON_LINE, "visibility", v(layers.falconCity));
      map.setLayoutProperty(FALCON_FILL, "visibility", v(layers.falconCity));
    }
    if (map.getLayer(AL_ARYAM_LINE)) {
      map.setLayoutProperty(AL_ARYAM_LINE, "visibility", v(layers.alAryam));
      map.setLayoutProperty(AL_ARYAM_FILL, "visibility", v(layers.alAryam));
    }
    if (map.getLayer(DIC_LINE)) {
      map.setLayoutProperty(DIC_LINE, "visibility", v(layers.dubaiIndustrialCity));
      map.setLayoutProperty(DIC_FILL, "visibility", v(layers.dubaiIndustrialCity));
    }
    if (map.getLayer(DI2_LINE)) {
      map.setLayoutProperty(DI2_LINE, "visibility", v(layers.damacIslands2));
      map.setLayoutProperty(DI2_FILL, "visibility", v(layers.damacIslands2));
    }
    if (map.getLayer(WILDS_LINE)) {
      map.setLayoutProperty(WILDS_LINE, "visibility", v(layers.wilds));
      map.setLayoutProperty(WILDS_FILL, "visibility", v(layers.wilds));
    }
    if (map.getLayer(TOWN_SQ_LINE)) {
      map.setLayoutProperty(TOWN_SQ_LINE, "visibility", v(layers.townSquare));
      map.setLayoutProperty(TOWN_SQ_FILL, "visibility", v(layers.townSquare));
    }
    if (map.getLayer(ATHLON_LINE)) {
      map.setLayoutProperty(ATHLON_LINE, "visibility", v(layers.athlon));
      map.setLayoutProperty(ATHLON_FILL, "visibility", v(layers.athlon));
    }
    if (map.getLayer(CHERRY_LINE)) {
      map.setLayoutProperty(CHERRY_LINE, "visibility", v(layers.cherrywoods));
      map.setLayoutProperty(CHERRY_FILL, "visibility", v(layers.cherrywoods));
    }
    if (map.getLayer(PORTOFINO_LINE)) {
      map.setLayoutProperty(PORTOFINO_LINE, "visibility", v(layers.portofino));
      map.setLayoutProperty(PORTOFINO_FILL, "visibility", v(layers.portofino));
    }
    if (map.getLayer(HAVEN_LINE)) {
      map.setLayoutProperty(HAVEN_LINE, "visibility", v(layers.haven));
      map.setLayoutProperty(HAVEN_FILL, "visibility", v(layers.haven));
    }
    if (map.getLayer(AL_BARARI_LINE)) {
      map.setLayoutProperty(AL_BARARI_LINE, "visibility", v(layers.alBarari));
      map.setLayoutProperty(AL_BARARI_FILL, "visibility", v(layers.alBarari));
    }
    if (map.getLayer(JAI_LINE)) {
      map.setLayoutProperty(JAI_LINE, "visibility", v(layers.jabalAliIndustrial));
      map.setLayoutProperty(JAI_FILL, "visibility", v(layers.jabalAliIndustrial));
    }
    if (map.getLayer(LL_LINE)) {
      map.setLayoutProperty(LL_LINE, "visibility", v(layers.livingLegends));
      map.setLayoutProperty(LL_FILL, "visibility", v(layers.livingLegends));
    }
    if (map.getLayer(SHOROOQ_LINE)) {
      map.setLayoutProperty(SHOROOQ_LINE, "visibility", v(layers.shorooq));
      map.setLayoutProperty(SHOROOQ_FILL, "visibility", v(layers.shorooq));
    }
    if (map.getLayer(COA_LINE)) {
      map.setLayoutProperty(COA_LINE, "visibility", v(layers.cityOfArabia));
      map.setLayoutProperty(COA_FILL, "visibility", v(layers.cityOfArabia));
    }
    if (map.getLayer(SERENA_LINE)) {
      map.setLayoutProperty(SERENA_LINE, "visibility", v(layers.serena));
      map.setLayoutProperty(SERENA_FILL, "visibility", v(layers.serena));
    }
    if (map.getLayer(DCH_LINE)) {
      map.setLayoutProperty(DCH_LINE, "visibility", v(layers.dubaiCreekHarbour));
      map.setLayoutProperty(DCH_FILL, "visibility", v(layers.dubaiCreekHarbour));
    }
    if (map.getLayer(DPC_LINE)) {
      map.setLayoutProperty(DPC_LINE, "visibility", v(layers.dubaiProductionCity));
      map.setLayoutProperty(DPC_FILL, "visibility", v(layers.dubaiProductionCity));
    }
    if (map.getLayer(SOBHA_R_LINE)) {
      map.setLayoutProperty(SOBHA_R_LINE, "visibility", v(layers.sobhaReserve));
      map.setLayoutProperty(SOBHA_R_FILL, "visibility", v(layers.sobhaReserve));
    }
    if (map.getLayer(JGC_LINE)) {
      map.setLayoutProperty(JGC_LINE, "visibility", v(layers.jumeirahGardenCity));
      map.setLayoutProperty(JGC_FILL, "visibility", v(layers.jumeirahGardenCity));
    }
    if (map.getLayer(SOBHA_E_LINE)) {
      map.setLayoutProperty(SOBHA_E_LINE, "visibility", v(layers.sobhaElwood));
      map.setLayoutProperty(SOBHA_E_FILL, "visibility", v(layers.sobhaElwood));
    }
    if (map.getLayer(DLRC_LINE)) {
      map.setLayoutProperty(DLRC_LINE, "visibility", v(layers.dlrc));
      map.setLayoutProperty(DLRC_FILL, "visibility", v(layers.dlrc));
    }
    if (map.getLayer(PEARL_J_LINE)) {
      map.setLayoutProperty(PEARL_J_LINE, "visibility", v(layers.pearlJumeira));
      map.setLayoutProperty(PEARL_J_FILL, "visibility", v(layers.pearlJumeira));
    }
    if (map.getLayer(KHAWANEEJ_LINE)) {
      map.setLayoutProperty(KHAWANEEJ_LINE, "visibility", v(layers.alKhawaneej));
      map.setLayoutProperty(KHAWANEEJ_FILL, "visibility", v(layers.alKhawaneej));
    }
    if (map.getLayer(MAJAN_LINE)) {
      map.setLayoutProperty(MAJAN_LINE, "visibility", v(layers.majan));
      map.setLayoutProperty(MAJAN_FILL, "visibility", v(layers.majan));
    }
    if (map.getLayer(LA_MER_LINE)) {
      map.setLayoutProperty(LA_MER_LINE, "visibility", v(layers.laMer));
      map.setLayoutProperty(LA_MER_FILL, "visibility", v(layers.laMer));
    }
    if (map.getLayer(DUBAI_LAND_LINE)) {
      map.setLayoutProperty(DUBAI_LAND_LINE, "visibility", v(layers.dubaiLand));
      map.setLayoutProperty(DUBAI_LAND_FILL, "visibility", v(layers.dubaiLand));
    }
    if (map.getLayer(DGC_LINE)) {
      map.setLayoutProperty(DGC_LINE, "visibility", v(layers.dubaiGolfCity));
      map.setLayoutProperty(DGC_FILL, "visibility", v(layers.dubaiGolfCity));
    }
    if (map.getLayer(MERAAS_UAS_LINE)) {
      map.setLayoutProperty(MERAAS_UAS_LINE, "visibility", v(layers.meraasUmmAlSheif));
      map.setLayoutProperty(MERAAS_UAS_FILL, "visibility", v(layers.meraasUmmAlSheif));
    }
    if (map.getLayer(MAMZAR_LINE)) {
      map.setLayoutProperty(MAMZAR_LINE, "visibility", v(layers.alMamzarFront));
      map.setLayoutProperty(MAMZAR_FILL, "visibility", v(layers.alMamzarFront));
    }
    if (map.getLayer(ASMARAN_LINE)) {
      map.setLayoutProperty(ASMARAN_LINE, "visibility", v(layers.asmaran));
      map.setLayoutProperty(ASMARAN_FILL, "visibility", v(layers.asmaran));
    }
    if (map.getLayer(JBAY_LINE)) {
      map.setLayoutProperty(JBAY_LINE, "visibility", v(layers.jumeirahBay));
      map.setLayoutProperty(JBAY_FILL, "visibility", v(layers.jumeirahBay));
    }
    if (map.getLayer(REPORTAGE_LINE)) {
      map.setLayoutProperty(REPORTAGE_LINE, "visibility", v(layers.reportageVillage));
      map.setLayoutProperty(REPORTAGE_FILL, "visibility", v(layers.reportageVillage));
    }
    if (map.getLayer(LIWAN_LINE)) {
      map.setLayoutProperty(LIWAN_LINE, "visibility", v(layers.liwan));
      map.setLayoutProperty(LIWAN_FILL, "visibility", v(layers.liwan));
    }
    if (map.getLayer(DSTUDIO_LINE)) {
      map.setLayoutProperty(DSTUDIO_LINE, "visibility", v(layers.dubaiStudioCity));
      map.setLayoutProperty(DSTUDIO_FILL, "visibility", v(layers.dubaiStudioCity));
    }
    if (map.getLayer(LIWAN2_LINE)) {
      map.setLayoutProperty(LIWAN2_LINE, "visibility", v(layers.liwan2));
      map.setLayoutProperty(LIWAN2_FILL, "visibility", v(layers.liwan2));
    }
    if (map.getLayer(NAIA_LINE)) {
      map.setLayoutProperty(NAIA_LINE, "visibility", v(layers.naiaIsland));
      map.setLayoutProperty(NAIA_FILL, "visibility", v(layers.naiaIsland));
    }
    if (map.getLayer(ARDH_LINE)) {
      map.setLayoutProperty(ARDH_LINE, "visibility", v(layers.ardhCommunity));
      map.setLayoutProperty(ARDH_FILL, "visibility", v(layers.ardhCommunity));
    }
    if (map.getLayer(TIJARA_LINE)) {
      map.setLayoutProperty(TIJARA_LINE, "visibility", v(layers.tijaraTown));
      map.setLayoutProperty(TIJARA_FILL, "visibility", v(layers.tijaraTown));
    }
    if (map.getLayer(WARSAN_LINE)) {
      map.setLayoutProperty(WARSAN_LINE, "visibility", v(layers.warsanFirst));
      map.setLayoutProperty(WARSAN_FILL, "visibility", v(layers.warsanFirst));
    }
    if (map.getLayer(MERAAS_MIRDIF_LINE)) {
      map.setLayoutProperty(MERAAS_MIRDIF_LINE, "visibility", v(layers.meraasMirdif));
      map.setLayoutProperty(MERAAS_MIRDIF_FILL, "visibility", v(layers.meraasMirdif));
    }
    if (map.getLayer(HABTOOR_LINE)) {
      map.setLayoutProperty(HABTOOR_LINE, "visibility", v(layers.alHabtoorPolo));
      map.setLayoutProperty(HABTOOR_FILL, "visibility", v(layers.alHabtoorPolo));
    }
    if (map.getLayer(MERAAS_UMA_LINE)) {
      map.setLayoutProperty(MERAAS_UMA_LINE, "visibility", v(layers.meraasUmmAmaraa));
      map.setLayoutProperty(MERAAS_UMA_FILL, "visibility", v(layers.meraasUmmAmaraa));
    }
    if (map.getLayer(D3_DDA_LINE)) {
      map.setLayoutProperty(D3_DDA_LINE, "visibility", v(layers.d3));
      map.setLayoutProperty(D3_DDA_FILL, "visibility", v(layers.d3));
    }
    if (map.getLayer(KHAIL_LINE)) {
      map.setLayoutProperty(KHAIL_LINE, "visibility", v(layers.alKhailGate));
      map.setLayoutProperty(KHAIL_FILL, "visibility", v(layers.alKhailGate));
    }
    if (map.getLayer(SITE_A_LINE)) {
      map.setLayoutProperty(SITE_A_LINE, "visibility", v(layers.siteA));
      map.setLayoutProperty(SITE_A_FILL, "visibility", v(layers.siteA));
    }
    if (map.getLayer(RUKAN_LINE)) {
      map.setLayoutProperty(RUKAN_LINE, "visibility", v(layers.rukan));
      map.setLayoutProperty(RUKAN_FILL, "visibility", v(layers.rukan));
    }
    if (map.getLayer(CALI_LINE)) {
      map.setLayoutProperty(CALI_LINE, "visibility", v(layers.californiaResidence));
      map.setLayoutProperty(CALI_FILL, "visibility", v(layers.californiaResidence));
    }
    if (map.getLayer(MERAAS_NAH_LINE)) {
      map.setLayoutProperty(MERAAS_NAH_LINE, "visibility", v(layers.meraasNaddAlHamar));
      map.setLayoutProperty(MERAAS_NAH_FILL, "visibility", v(layers.meraasNaddAlHamar));
    }
    if (map.getLayer(PALMAROSA_LINE)) {
      map.setLayoutProperty(PALMAROSA_LINE, "visibility", v(layers.palmarosa));
      map.setLayoutProperty(PALMAROSA_FILL, "visibility", v(layers.palmarosa));
    }
    if (map.getLayer(DIAC_LINE)) {
      map.setLayoutProperty(DIAC_LINE, "visibility", v(layers.diac));
      map.setLayoutProperty(DIAC_FILL, "visibility", v(layers.diac));
    }
    if (map.getLayer(WAHA_LINE)) {
      map.setLayoutProperty(WAHA_LINE, "visibility", v(layers.alWaha));
      map.setLayoutProperty(WAHA_FILL, "visibility", v(layers.alWaha));
    }
    if (map.getLayer(HARBOUR_LINE)) {
      map.setLayoutProperty(HARBOUR_LINE, "visibility", v(layers.dubaiHarbour));
      map.setLayoutProperty(HARBOUR_FILL, "visibility", v(layers.dubaiHarbour));
    }
    if (map.getLayer(KLABOUR_LINE)) {
      map.setLayoutProperty(KLABOUR_LINE, "visibility", v(layers.khawaneejLabour));
      map.setLayoutProperty(KLABOUR_FILL, "visibility", v(layers.khawaneejLabour));
    }
    if (map.getLayer(WIND_LINE)) {
      map.setLayoutProperty(WIND_LINE, "visibility", v(layers.warsanIndustrial));
      map.setLayoutProperty(WIND_FILL, "visibility", v(layers.warsanIndustrial));
    }
    if (map.getLayer(DLC_LINE)) {
      map.setLayoutProperty(DLC_LINE, "visibility", v(layers.dubaiLifestyleCity));
      map.setLayoutProperty(DLC_FILL, "visibility", v(layers.dubaiLifestyleCity));
    }
    if (map.getLayer(SUFOUH_LINE)) {
      map.setLayoutProperty(SUFOUH_LINE, "visibility", v(layers.sufouhGardens));
      map.setLayoutProperty(SUFOUH_FILL, "visibility", v(layers.sufouhGardens));
    }
    if (map.getLayer(MOTOR_LINE)) {
      map.setLayoutProperty(MOTOR_LINE, "visibility", v(layers.motorCity));
      map.setLayoutProperty(MOTOR_FILL, "visibility", v(layers.motorCity));
    }
    if (map.getLayer(TAOR1_LINE)) {
      map.setLayoutProperty(TAOR1_LINE, "visibility", v(layers.taormina1));
      map.setLayoutProperty(TAOR1_FILL, "visibility", v(layers.taormina1));
    }
    if (map.getLayer(DPARKS_LINE)) {
      map.setLayoutProperty(DPARKS_LINE, "visibility", v(layers.dubaiParks));
      map.setLayoutProperty(DPARKS_FILL, "visibility", v(layers.dubaiParks));
    }
    if (map.getLayer(CWALK_LINE)) {
      map.setLayoutProperty(CWALK_LINE, "visibility", v(layers.cityWalk));
      map.setLayoutProperty(CWALK_FILL, "visibility", v(layers.cityWalk));
    }
    if (map.getLayer(ARPOLO_LINE)) {
      map.setLayoutProperty(ARPOLO_LINE, "visibility", v(layers.arPolo));
      map.setLayoutProperty(ARPOLO_FILL, "visibility", v(layers.arPolo));
    }
    if (map.getLayer(BARSHA3_LINE)) {
      map.setLayoutProperty(BARSHA3_LINE, "visibility", v(layers.barshaThird));
      map.setLayoutProperty(BARSHA3_FILL, "visibility", v(layers.barshaThird));
    }
    if (map.getLayer(MERAAS_B2_LINE)) {
      map.setLayoutProperty(MERAAS_B2_LINE, "visibility", v(layers.meraasBarsha2));
      map.setLayoutProperty(MERAAS_B2_FILL, "visibility", v(layers.meraasBarsha2));
    }
    if (map.getLayer(DOC_LINE)) {
      map.setLayoutProperty(DOC_LINE, "visibility", v(layers.dubaiOutsourceCity));
      map.setLayoutProperty(DOC_FILL, "visibility", v(layers.dubaiOutsourceCity));
    }
    if (map.getLayer(BURJ_LINE)) {
      map.setLayoutProperty(BURJ_LINE, "visibility", v(layers.burjKhalifa));
      map.setLayoutProperty(BURJ_FILL, "visibility", v(layers.burjKhalifa));
    }
    if (map.getLayer(GHAF_LINE)) {
      map.setLayoutProperty(GHAF_LINE, "visibility", v(layers.ghafWoods));
      map.setLayoutProperty(GHAF_FILL, "visibility", v(layers.ghafWoods));
    }
    if (map.getLayer(TAOR2_LINE)) {
      map.setLayoutProperty(TAOR2_LINE, "visibility", v(layers.taormina2));
      map.setLayoutProperty(TAOR2_FILL, "visibility", v(layers.taormina2));
    }
    if (map.getLayer(BIANCA_LINE)) {
      map.setLayoutProperty(BIANCA_LINE, "visibility", v(layers.bianca));
      map.setLayoutProperty(BIANCA_FILL, "visibility", v(layers.bianca));
    }
    if (map.getLayer(MJL_LINE)) {
      map.setLayoutProperty(MJL_LINE, "visibility", v(layers.mjl));
      map.setLayoutProperty(MJL_FILL, "visibility", v(layers.mjl));
    }
    if (map.getLayer(DHK1_LINE)) {
      map.setLayoutProperty(DHK1_LINE, "visibility", v(layers.dhKhawaneej1));
      map.setLayoutProperty(DHK1_FILL, "visibility", v(layers.dhKhawaneej1));
    }
    if (map.getLayer(REMRAAM_LINE)) {
      map.setLayoutProperty(REMRAAM_LINE, "visibility", v(layers.remraam));
      map.setLayoutProperty(REMRAAM_FILL, "visibility", v(layers.remraam));
    }
    if (map.getLayer(ECHO_LINE)) {
      map.setLayoutProperty(ECHO_LINE, "visibility", v(layers.echoPlex));
      map.setLayoutProperty(ECHO_FILL, "visibility", v(layers.echoPlex));
    }
    if (map.getLayer(SUSCITY_LINE)) {
      map.setLayoutProperty(SUSCITY_LINE, "visibility", v(layers.sustainableCity));
      map.setLayoutProperty(SUSCITY_FILL, "visibility", v(layers.sustainableCity));
    }
    if (map.getLayer(JBR_LINE)) {
      map.setLayoutProperty(JBR_LINE, "visibility", v(layers.jbr));
      map.setLayoutProperty(JBR_FILL, "visibility", v(layers.jbr));
    }
    if (map.getLayer(GHOROOB_LINE)) {
      map.setLayoutProperty(GHOROOB_LINE, "visibility", v(layers.ghoroob));
      map.setLayoutProperty(GHOROOB_FILL, "visibility", v(layers.ghoroob));
    }
    if (map.getLayer(DPB3_LINE)) {
      map.setLayoutProperty(DPB3_LINE, "visibility", v(layers.dpBarshaSouth3));
      map.setLayoutProperty(DPB3_FILL, "visibility", v(layers.dpBarshaSouth3));
    }
    if (map.getLayer(MARSA_LINE)) {
      map.setLayoutProperty(MARSA_LINE, "visibility", v(layers.marsaAlArab));
      map.setLayoutProperty(MARSA_FILL, "visibility", v(layers.marsaAlArab));
    }
    if (map.getLayer(BLUE_LINE)) {
      map.setLayoutProperty(BLUE_LINE, "visibility", v(layers.bluewaters));
      map.setLayoutProperty(BLUE_FILL, "visibility", v(layers.bluewaters));
    }
    if (map.getLayer(SITE_D_LINE)) {
      map.setLayoutProperty(SITE_D_LINE, "visibility", v(layers.siteD));
      map.setLayoutProperty(SITE_D_FILL, "visibility", v(layers.siteD));
    }
    if (map.getLayer(KHEIGHTS_LINE)) {
      map.setLayoutProperty(KHEIGHTS_LINE, "visibility", v(layers.khailHeights));
      map.setLayoutProperty(KHEIGHTS_FILL, "visibility", v(layers.khailHeights));
    }
    if (map.getLayer(MERAAS_UAD_LINE)) {
      map.setLayoutProperty(MERAAS_UAD_LINE, "visibility", v(layers.meraasUmmAlDaman));
      map.setLayoutProperty(MERAAS_UAD_FILL, "visibility", v(layers.meraasUmmAlDaman));
    }
    if (map.getLayer(DLAND673_LINE)) {
      map.setLayoutProperty(DLAND673_LINE, "visibility", v(layers.dubaiLand673));
      map.setLayoutProperty(DLAND673_FILL, "visibility", v(layers.dubaiLand673));
    }
    if (map.getLayer(SHAMAL_Y1_LINE)) {
      map.setLayoutProperty(SHAMAL_Y1_LINE, "visibility", v(layers.shamalYalayis1));
      map.setLayoutProperty(SHAMAL_Y1_FILL, "visibility", v(layers.shamalYalayis1));
    }
    if (map.getLayer(TECOM_Q2_LINE)) {
      map.setLayoutProperty(TECOM_Q2_LINE, "visibility", v(layers.tecomQouz2));
      map.setLayoutProperty(TECOM_Q2_FILL, "visibility", v(layers.tecomQouz2));
    }
    if (map.getLayer(GV_LINE)) {
      map.setLayoutProperty(GV_LINE, "visibility", v(layers.globalVillage));
      map.setLayoutProperty(GV_FILL, "visibility", v(layers.globalVillage));
    }
    if (map.getLayer(LAYAN_LINE)) {
      map.setLayoutProperty(LAYAN_LINE, "visibility", v(layers.layan));
      map.setLayoutProperty(LAYAN_FILL, "visibility", v(layers.layan));
    }
    if (map.getLayer(DPGMBR_LINE)) {
      map.setLayoutProperty(DPGMBR_LINE, "visibility", v(layers.dpgMbr));
      map.setLayoutProperty(DPGMBR_FILL, "visibility", v(layers.dpgMbr));
    }
    if (map.getLayer(DWC_LINE)) {
      map.setLayoutProperty(DWC_LINE, "visibility", v(layers.dwc));
      map.setLayoutProperty(DWC_FILL, "visibility", v(layers.dwc));
    }
    if (map.getLayer(LQUOZ_LINE)) {
      map.setLayoutProperty(LQUOZ_LINE, "visibility", v(layers.labourQuoz));
      map.setLayoutProperty(LQUOZ_FILL, "visibility", v(layers.labourQuoz));
    }
    if (map.getLayer(SCHFZ_LINE)) {
      map.setLayoutProperty(SCHFZ_LINE, "visibility", v(layers.schoolsFz));
      map.setLayoutProperty(SCHFZ_FILL, "visibility", v(layers.schoolsFz));
    }
    if (map.getLayer(DWCNFZ_LINE)) {
      map.setLayoutProperty(DWCNFZ_LINE, "visibility", v(layers.dwcNfz));
      map.setLayoutProperty(DWCNFZ_FILL, "visibility", v(layers.dwcNfz));
    }
    if (map.getLayer(SHAMAL_JAI1_LINE)) {
      map.setLayoutProperty(SHAMAL_JAI1_LINE, "visibility", v(layers.shamalJai1));
      map.setLayoutProperty(SHAMAL_JAI1_FILL, "visibility", v(layers.shamalJai1));
    }
    if (map.getLayer(JAI_STAFF_LINE)) {
      map.setLayoutProperty(JAI_STAFF_LINE, "visibility", v(layers.jaiStaff));
      map.setLayoutProperty(JAI_STAFF_FILL, "visibility", v(layers.jaiStaff));
    }
    if (map.getLayer(SHAMAL_TC2_LINE)) {
      map.setLayoutProperty(SHAMAL_TC2_LINE, "visibility", v(layers.shamalTc2));
      map.setLayoutProperty(SHAMAL_TC2_FILL, "visibility", v(layers.shamalTc2));
    }
    if (map.getLayer(NUZUL_LINE)) {
      map.setLayoutProperty(NUZUL_LINE, "visibility", v(layers.nuzul));
      map.setLayoutProperty(NUZUL_FILL, "visibility", v(layers.nuzul));
    }
    if (map.getLayer(KOA_LINE)) {
      map.setLayoutProperty(KOA_LINE, "visibility", v(layers.koa));
      map.setLayoutProperty(KOA_FILL, "visibility", v(layers.koa));
    }
    if (map.getLayer(SOBHA_S_LINE)) {
      map.setLayoutProperty(SOBHA_S_LINE, "visibility", v(layers.sobhaSanctuary));
      map.setLayoutProperty(SOBHA_S_FILL, "visibility", v(layers.sobhaSanctuary));
    }
    if (map.getLayer(BOX_LINE)) {
      map.setLayoutProperty(BOX_LINE, "visibility", v(layers.boxpark));
      map.setLayoutProperty(BOX_FILL, "visibility", v(layers.boxpark));
    }
    if (map.getLayer(SHAMAL_NAS1_LINE)) {
      map.setLayoutProperty(SHAMAL_NAS1_LINE, "visibility", v(layers.shamalNas1));
      map.setLayoutProperty(SHAMAL_NAS1_FILL, "visibility", v(layers.shamalNas1));
    }
    if (map.getLayer(LASTEXIT_LINE)) {
      map.setLayoutProperty(LASTEXIT_LINE, "visibility", v(layers.lastExit));
      map.setLayoutProperty(LASTEXIT_FILL, "visibility", v(layers.lastExit));
    }
    if (map.getLayer(SCARA_LINE)) {
      map.setLayoutProperty(SCARA_LINE, "visibility", v(layers.scaramanga));
      map.setLayoutProperty(SCARA_FILL, "visibility", v(layers.scaramanga));
    }
    if (map.getLayer(MERAAS_W3_LINE)) {
      map.setLayoutProperty(MERAAS_W3_LINE, "visibility", v(layers.meraasWarqa3));
      map.setLayoutProperty(MERAAS_W3_FILL, "visibility", v(layers.meraasWarqa3));
    }
    if (map.getLayer(JCENTRAL_LINE)) {
      map.setLayoutProperty(JCENTRAL_LINE, "visibility", v(layers.jumeirahCentral));
      map.setLayoutProperty(JCENTRAL_FILL, "visibility", v(layers.jumeirahCentral));
    }
    if (map.getLayer(OASIS_LINE)) {
      map.setLayoutProperty(OASIS_LINE, "visibility", v(layers.oasisVillage));
      map.setLayoutProperty(OASIS_FILL, "visibility", v(layers.oasisVillage));
    }
    if (map.getLayer(ETD_LINE)) {
      map.setLayoutProperty(ETD_LINE, "visibility", v(layers.emiratesTowers));
      map.setLayoutProperty(ETD_FILL, "visibility", v(layers.emiratesTowers));
    }
    if (map.getLayer(MERAAS_Q3_LINE)) {
      map.setLayoutProperty(MERAAS_Q3_LINE, "visibility", v(layers.meraasQuoz3));
      map.setLayoutProperty(MERAAS_Q3_FILL, "visibility", v(layers.meraasQuoz3));
    }
    if (map.getLayer(MARSA_S_LINE)) {
      map.setLayoutProperty(MARSA_S_LINE, "visibility", v(layers.marsaAlseef));
      map.setLayoutProperty(MARSA_S_FILL, "visibility", v(layers.marsaAlseef));
    }
    if (map.getLayer(MERAAS_WAS_LINE)) {
      map.setLayoutProperty(MERAAS_WAS_LINE, "visibility", v(layers.meraasWadiAlshabak));
      map.setLayoutProperty(MERAAS_WAS_FILL, "visibility", v(layers.meraasWadiAlshabak));
    }
    if (map.getLayer(SHAMAL_B2_LINE)) {
      map.setLayoutProperty(SHAMAL_B2_LINE, "visibility", v(layers.shamalBarsha2));
      map.setLayoutProperty(SHAMAL_B2_FILL, "visibility", v(layers.shamalBarsha2));
    }
    if (map.getLayer(SHAMAL_N2_LINE)) {
      map.setLayoutProperty(SHAMAL_N2_LINE, "visibility", v(layers.shamalNahda2));
      map.setLayoutProperty(SHAMAL_N2_FILL, "visibility", v(layers.shamalNahda2));
    }
    if (map.getLayer(MERAAS_SAIH1_LINE)) {
      map.setLayoutProperty(MERAAS_SAIH1_LINE, "visibility", v(layers.meraasSaih1));
      map.setLayoutProperty(MERAAS_SAIH1_FILL, "visibility", v(layers.meraasSaih1));
    }
    if (map.getLayer(DPOL_UAD_LINE)) {
      map.setLayoutProperty(DPOL_UAD_LINE, "visibility", v(layers.dubaiPoliceUad));
      map.setLayoutProperty(DPOL_UAD_FILL, "visibility", v(layers.dubaiPoliceUad));
    }
    if (map.getLayer(MERAAS_RAK3_LINE)) {
      map.setLayoutProperty(MERAAS_RAK3_LINE, "visibility", v(layers.meraasRakhor3));
      map.setLayoutProperty(MERAAS_RAK3_FILL, "visibility", v(layers.meraasRakhor3));
    }
    if (map.getLayer(MERAAS_MD_LINE)) {
      map.setLayoutProperty(MERAAS_MD_LINE, "visibility", v(layers.meraasMarsaDubai));
      map.setLayoutProperty(MERAAS_MD_FILL, "visibility", v(layers.meraasMarsaDubai));
    }
    if (map.getLayer(SHAMAL_HAD_LINE)) {
      map.setLayoutProperty(SHAMAL_HAD_LINE, "visibility", v(layers.shamalHadaeq));
      map.setLayoutProperty(SHAMAL_HAD_FILL, "visibility", v(layers.shamalHadaeq));
    }
    if (map.getLayer(JBH_LINE)) {
      map.setLayoutProperty(JBH_LINE, "visibility", v(layers.jbh));
      map.setLayoutProperty(JBH_FILL, "visibility", v(layers.jbh));
    }
    if (map.getLayer(MJUM_LINE)) {
      map.setLayoutProperty(MJUM_LINE, "visibility", v(layers.madinatJumeirah));
      map.setLayoutProperty(MJUM_FILL, "visibility", v(layers.madinatJumeirah));
    }
    if (map.getLayer(TECOM_SAIH_LINE)) {
      map.setLayoutProperty(TECOM_SAIH_LINE, "visibility", v(layers.tecomSaih));
      map.setLayoutProperty(TECOM_SAIH_FILL, "visibility", v(layers.tecomSaih));
    }
    if (map.getLayer(CV2_LINE)) {
      map.setLayoutProperty(CV2_LINE, "visibility", v(layers.cultureVillage2));
      map.setLayoutProperty(CV2_FILL, "visibility", v(layers.cultureVillage2));
    }
    if (map.getLayer(MERAAS_BS2_LINE)) {
      map.setLayoutProperty(MERAAS_BS2_LINE, "visibility", v(layers.meraasBs2));
      map.setLayoutProperty(MERAAS_BS2_FILL, "visibility", v(layers.meraasBs2));
    }
    if (map.getLayer(SHAMAL_MUH2_LINE)) {
      map.setLayoutProperty(SHAMAL_MUH2_LINE, "visibility", v(layers.shamalMuh2));
      map.setLayoutProperty(SHAMAL_MUH2_FILL, "visibility", v(layers.shamalMuh2));
    }
    if (map.getLayer(SHAMAL_Q2_LINE)) {
      map.setLayoutProperty(SHAMAL_Q2_LINE, "visibility", v(layers.shamalQuoz2));
      map.setLayoutProperty(SHAMAL_Q2_FILL, "visibility", v(layers.shamalQuoz2));
    }
    if (map.getLayer(CV3_LINE)) {
      map.setLayoutProperty(CV3_LINE, "visibility", v(layers.cultureVillage3));
      map.setLayoutProperty(CV3_FILL, "visibility", v(layers.cultureVillage3));
    }
    if (map.getLayer(MERAAS_SATWA_LINE)) {
      map.setLayoutProperty(MERAAS_SATWA_LINE, "visibility", v(layers.meraasSatwa));
      map.setLayoutProperty(MERAAS_SATWA_FILL, "visibility", v(layers.meraasSatwa));
    }
    if (map.getLayer(SHAMAL_MAMZAR_LINE)) {
      map.setLayoutProperty(SHAMAL_MAMZAR_LINE, "visibility", v(layers.shamalMamzar));
      map.setLayoutProperty(SHAMAL_MAMZAR_FILL, "visibility", v(layers.shamalMamzar));
    }
    if (map.getLayer(SHAMAL_RAFFA_LINE)) {
      map.setLayoutProperty(SHAMAL_RAFFA_LINE, "visibility", v(layers.shamalRaffa));
      map.setLayoutProperty(SHAMAL_RAFFA_FILL, "visibility", v(layers.shamalRaffa));
    }
    if (map.getLayer(MERAAS_MAMZAR_LINE)) {
      map.setLayoutProperty(MERAAS_MAMZAR_LINE, "visibility", v(layers.meraasMamzar));
      map.setLayoutProperty(MERAAS_MAMZAR_FILL, "visibility", v(layers.meraasMamzar));
    }
    if (map.getLayer(DH_SAFOUH1_LINE)) {
      map.setLayoutProperty(DH_SAFOUH1_LINE, "visibility", v(layers.dhSafouh1));
      map.setLayoutProperty(DH_SAFOUH1_FILL, "visibility", v(layers.dhSafouh1));
    }
    if (map.getLayer(DL_B104_LINE)) {
      map.setLayoutProperty(DL_B104_LINE, "visibility", v(layers.dubaiLandB104));
      map.setLayoutProperty(DL_B104_FILL, "visibility", v(layers.dubaiLandB104));
    }
    if (map.getLayer(DHAM_ROW1_LINE)) {
      map.setLayoutProperty(DHAM_ROW1_LINE, "visibility", v(layers.dhamRowaiyah1));
      map.setLayoutProperty(DHAM_ROW1_FILL, "visibility", v(layers.dhamRowaiyah1));
    }
    if (map.getLayer(DL_B208_LINE)) {
      map.setLayoutProperty(DL_B208_LINE, "visibility", v(layers.dubaiLandB208));
      map.setLayoutProperty(DL_B208_FILL, "visibility", v(layers.dubaiLandB208));
    }
    if (map.getLayer(BEACH_LINE)) {
      map.setLayoutProperty(BEACH_LINE, "visibility", v(layers.theBeach));
      map.setLayoutProperty(BEACH_FILL, "visibility", v(layers.theBeach));
    }
    if (map.getLayer(SHAMAL_US3_LINE)) {
      map.setLayoutProperty(SHAMAL_US3_LINE, "visibility", v(layers.shamalUs3));
      map.setLayoutProperty(SHAMAL_US3_FILL, "visibility", v(layers.shamalUs3));
    }
    if (map.getLayer(MERAAS_HEMAIRA_LINE)) {
      map.setLayoutProperty(MERAAS_HEMAIRA_LINE, "visibility", v(layers.meraasHemaira));
      map.setLayoutProperty(MERAAS_HEMAIRA_FILL, "visibility", v(layers.meraasHemaira));
    }
    if (map.getLayer(DP_QUOZ2_LINE)) {
      map.setLayoutProperty(DP_QUOZ2_LINE, "visibility", v(layers.dpQuoz2));
      map.setLayoutProperty(DP_QUOZ2_FILL, "visibility", v(layers.dpQuoz2));
    }
    if (map.getLayer(DL_B103_LINE)) {
      map.setLayoutProperty(DL_B103_LINE, "visibility", v(layers.dubaiLandB103));
      map.setLayoutProperty(DL_B103_FILL, "visibility", v(layers.dubaiLandB103));
    }
    if (map.getLayer(JG_J2_LINE)) {
      map.setLayoutProperty(JG_J2_LINE, "visibility", v(layers.jgJumeira2));
      map.setLayoutProperty(JG_J2_FILL, "visibility", v(layers.jgJumeira2));
    }
    if (map.getLayer(DL_T15_LINE)) {
      map.setLayoutProperty(DL_T15_LINE, "visibility", v(layers.dubaiLandT15));
      map.setLayoutProperty(DL_T15_FILL, "visibility", v(layers.dubaiLandT15));
    }
    if (map.getLayer(SHAMAL_WASL_LINE)) {
      map.setLayoutProperty(SHAMAL_WASL_LINE, "visibility", v(layers.shamalWasl));
      map.setLayoutProperty(SHAMAL_WASL_FILL, "visibility", v(layers.shamalWasl));
    }
    if (map.getLayer(DL_A304_LINE)) {
      map.setLayoutProperty(DL_A304_LINE, "visibility", v(layers.dubaiLandA304));
      map.setLayoutProperty(DL_A304_FILL, "visibility", v(layers.dubaiLandA304));
    }
    if (map.getLayer(EAHM_LINE)) {
      map.setLayoutProperty(EAHM_LINE, "visibility", v(layers.eahm));
      map.setLayoutProperty(EAHM_FILL, "visibility", v(layers.eahm));
    }
    if (map.getLayer(MERAAS_ZABEEL2_LINE)) {
      map.setLayoutProperty(MERAAS_ZABEEL2_LINE, "visibility", v(layers.meraasZabeel2));
      map.setLayoutProperty(MERAAS_ZABEEL2_FILL, "visibility", v(layers.meraasZabeel2));
    }
    if (map.getLayer(MERAAS_JAFILIYA_LINE)) {
      map.setLayoutProperty(MERAAS_JAFILIYA_LINE, "visibility", v(layers.meraasJafiliya));
      map.setLayoutProperty(MERAAS_JAFILIYA_FILL, "visibility", v(layers.meraasJafiliya));
    }
    if (map.getLayer(KITE_LINE)) {
      map.setLayoutProperty(KITE_LINE, "visibility", v(layers.kiteBeach));
      map.setLayoutProperty(KITE_FILL, "visibility", v(layers.kiteBeach));
    }
    if (map.getLayer(MERAAS_ALAMARDI_LINE)) {
      map.setLayoutProperty(MERAAS_ALAMARDI_LINE, "visibility", v(layers.meraasAlamardi));
      map.setLayoutProperty(MERAAS_ALAMARDI_FILL, "visibility", v(layers.meraasAlamardi));
    }
    if (map.getLayer(MERAAS_PORTSAEED_LINE)) {
      map.setLayoutProperty(MERAAS_PORTSAEED_LINE, "visibility", v(layers.meraasPortSaeed));
      map.setLayoutProperty(MERAAS_PORTSAEED_FILL, "visibility", v(layers.meraasPortSaeed));
    }
    if (map.getLayer(DL_6461281_LINE)) {
      map.setLayoutProperty(DL_6461281_LINE, "visibility", v(layers.dl6461281));
      map.setLayoutProperty(DL_6461281_FILL, "visibility", v(layers.dl6461281));
    }
    if (map.getLayer(SHAMAL_OUDM_LINE)) {
      map.setLayoutProperty(SHAMAL_OUDM_LINE, "visibility", v(layers.shamalOudMetha));
      map.setLayoutProperty(SHAMAL_OUDM_FILL, "visibility", v(layers.shamalOudMetha));
    }
    if (map.getLayer(SHAMAL_Q3_LINE)) {
      map.setLayoutProperty(SHAMAL_Q3_LINE, "visibility", v(layers.shamalQuoz3));
      map.setLayoutProperty(SHAMAL_Q3_FILL, "visibility", v(layers.shamalQuoz3));
    }
    if (map.getLayer(DL_A307_LINE)) {
      map.setLayoutProperty(DL_A307_LINE, "visibility", v(layers.dubaiLandA307));
      map.setLayoutProperty(DL_A307_FILL, "visibility", v(layers.dubaiLandA307));
    }
    if (map.getLayer(WAS3_6456408_LINE)) {
      map.setLayoutProperty(WAS3_6456408_LINE, "visibility", v(layers.was36456408));
      map.setLayoutProperty(WAS3_6456408_FILL, "visibility", v(layers.was36456408));
    }
    if (map.getLayer(SHAMAL_Q1_LINE)) {
      map.setLayoutProperty(SHAMAL_Q1_LINE, "visibility", v(layers.shamalQuoz1));
      map.setLayoutProperty(SHAMAL_Q1_FILL, "visibility", v(layers.shamalQuoz1));
    }
    if (map.getLayer(MERAAS_NAS4_LINE)) {
      map.setLayoutProperty(MERAAS_NAS4_LINE, "visibility", v(layers.meraasNas4));
      map.setLayoutProperty(MERAAS_NAS4_FILL, "visibility", v(layers.meraasNas4));
    }
    if (map.getLayer(SHAMAL_MUH1_LINE)) {
      map.setLayoutProperty(SHAMAL_MUH1_LINE, "visibility", v(layers.shamalMuhaisnah1));
      map.setLayoutProperty(SHAMAL_MUH1_FILL, "visibility", v(layers.shamalMuhaisnah1));
    }
    if (map.getLayer(SHAMAL_J1_LINE)) {
      map.setLayoutProperty(SHAMAL_J1_LINE, "visibility", v(layers.shamalJumeira1));
      map.setLayoutProperty(SHAMAL_J1_FILL, "visibility", v(layers.shamalJumeira1));
    }
    if (map.getLayer(MERAAS_QUSAIS2_LINE)) {
      map.setLayoutProperty(MERAAS_QUSAIS2_LINE, "visibility", v(layers.meraasQusais2));
      map.setLayoutProperty(MERAAS_QUSAIS2_FILL, "visibility", v(layers.meraasQusais2));
    }
    if (map.getLayer(SHAMAL_MAHA_LINE)) {
      map.setLayoutProperty(SHAMAL_MAHA_LINE, "visibility", v(layers.shamalMaha));
      map.setLayoutProperty(SHAMAL_MAHA_FILL, "visibility", v(layers.shamalMaha));
    }
    if (map.getLayer(LUNAYA_LINE)) {
      map.setLayoutProperty(LUNAYA_LINE, "visibility", v(layers.lunaya));
      map.setLayoutProperty(LUNAYA_FILL, "visibility", v(layers.lunaya));
    }
    if (map.getLayer(MERAAS_US1_LINE)) {
      map.setLayoutProperty(MERAAS_US1_LINE, "visibility", v(layers.meraasUs1));
      map.setLayoutProperty(MERAAS_US1_FILL, "visibility", v(layers.meraasUs1));
    }
    if (map.getLayer(SHAMAL_NAHDA1_LINE)) {
      map.setLayoutProperty(SHAMAL_NAHDA1_LINE, "visibility", v(layers.shamalNahda1));
      map.setLayoutProperty(SHAMAL_NAHDA1_FILL, "visibility", v(layers.shamalNahda1));
    }
    if (map.getLayer(SHAMAL_SAFOUH1_LINE)) {
      map.setLayoutProperty(SHAMAL_SAFOUH1_LINE, "visibility", v(layers.shamalSafouh1));
      map.setLayoutProperty(SHAMAL_SAFOUH1_FILL, "visibility", v(layers.shamalSafouh1));
    }
    if (map.getLayer(SHAMAL_MARGHAM_LINE)) {
      map.setLayoutProperty(SHAMAL_MARGHAM_LINE, "visibility", v(layers.shamalMargham));
      map.setLayoutProperty(SHAMAL_MARGHAM_FILL, "visibility", v(layers.shamalMargham));
    }
    if (map.getLayer(WILD_WADI_LINE)) {
      map.setLayoutProperty(WILD_WADI_LINE, "visibility", v(layers.wildWadi));
      map.setLayoutProperty(WILD_WADI_FILL, "visibility", v(layers.wildWadi));
    }
    if (map.getLayer(MERAAS_BS1_LINE)) {
      map.setLayoutProperty(MERAAS_BS1_LINE, "visibility", v(layers.meraasBs1));
      map.setLayoutProperty(MERAAS_BS1_FILL, "visibility", v(layers.meraasBs1));
    }
    if (map.getLayer(DL_A409_LINE)) {
      map.setLayoutProperty(DL_A409_LINE, "visibility", v(layers.dubaiLandA409));
      map.setLayoutProperty(DL_A409_FILL, "visibility", v(layers.dubaiLandA409));
    }
    if (map.getLayer(ZABEEL1_LINE)) {
      map.setLayoutProperty(ZABEEL1_LINE, "visibility", v(layers.zabeelFirst));
      map.setLayoutProperty(ZABEEL1_FILL, "visibility", v(layers.zabeelFirst));
    }
    if (map.getLayer(WAS3_6454931_LINE)) {
      map.setLayoutProperty(WAS3_6454931_LINE, "visibility", v(layers.was36454931));
      map.setLayoutProperty(WAS3_6454931_FILL, "visibility", v(layers.was36454931));
    }
    if (map.getLayer(MERAAS_3460266_LINE)) {
      map.setLayoutProperty(MERAAS_3460266_LINE, "visibility", v(layers.meraas3460266));
      map.setLayoutProperty(MERAAS_3460266_FILL, "visibility", v(layers.meraas3460266));
    }
    if (map.getLayer(MUSEUM_FUTURE_LINE)) {
      map.setLayoutProperty(MUSEUM_FUTURE_LINE, "visibility", v(layers.museumFuture));
      map.setLayoutProperty(MUSEUM_FUTURE_FILL, "visibility", v(layers.museumFuture));
    }
    if (map.getLayer(AL_JALILA_LINE)) {
      map.setLayoutProperty(AL_JALILA_LINE, "visibility", v(layers.alJalila));
      map.setLayoutProperty(AL_JALILA_FILL, "visibility", v(layers.alJalila));
    }
    if (map.getLayer(DL_A102_LINE)) {
      map.setLayoutProperty(DL_A102_LINE, "visibility", v(layers.dubaiLandA102));
      map.setLayoutProperty(DL_A102_FILL, "visibility", v(layers.dubaiLandA102));
    }
    if (map.getLayer(MERAAS_WARQA2_LINE)) {
      map.setLayoutProperty(MERAAS_WARQA2_LINE, "visibility", v(layers.meraasWarqa2));
      map.setLayoutProperty(MERAAS_WARQA2_FILL, "visibility", v(layers.meraasWarqa2));
    }
    if (map.getLayer(MERAAS_J1_LINE)) {
      map.setLayoutProperty(MERAAS_J1_LINE, "visibility", v(layers.meraasJumeira1));
      map.setLayoutProperty(MERAAS_J1_FILL, "visibility", v(layers.meraasJumeira1));
    }
    if (map.getLayer(DP_JAFILIYA_LINE)) {
      map.setLayoutProperty(DP_JAFILIYA_LINE, "visibility", v(layers.dpJafiliya));
      map.setLayoutProperty(DP_JAFILIYA_FILL, "visibility", v(layers.dpJafiliya));
    }
    if (map.getLayer(BURJ_AA_LINE)) {
      map.setLayoutProperty(BURJ_AA_LINE, "visibility", v(layers.burjAlArab));
      map.setLayoutProperty(BURJ_AA_FILL, "visibility", v(layers.burjAlArab));
    }
    if (map.getLayer(SHAMAL_BS1_LINE)) {
      map.setLayoutProperty(SHAMAL_BS1_LINE, "visibility", v(layers.shamalBs1));
      map.setLayoutProperty(SHAMAL_BS1_FILL, "visibility", v(layers.shamalBs1));
    }
    if (map.getLayer(DPA_LINE)) {
      map.setLayoutProperty(DPA_LINE, "visibility", v(layers.dubaiPoliceAcademy));
      map.setLayoutProperty(DPA_FILL, "visibility", v(layers.dubaiPoliceAcademy));
    }
    if (map.getLayer(SHAMAL_MANKHOOL_LINE)) {
      map.setLayoutProperty(SHAMAL_MANKHOOL_LINE, "visibility", v(layers.shamalMankhool));
      map.setLayoutProperty(SHAMAL_MANKHOOL_FILL, "visibility", v(layers.shamalMankhool));
    }
    for (const d of DDA_LAYERS) {
      const labelId = ddaLabelId(d.srcId);
      if (map.getLayer(labelId)) {
        map.setLayoutProperty(labelId, "visibility", v(layers[d.key]));
      }
    }
  }, [layers]);

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

  const LAND_USE_LEGEND: { color: string; name: string; desc: string }[] = [
    { color: "#FFD700", name: "Residential", desc: "Жилое" },
    { color: "#9333EA", name: "Mixed Use", desc: "Смешанное" },
    { color: "#3B82F6", name: "Commercial / Office", desc: "Коммерческое" },
    { color: "#F97316", name: "Hotel / Hospitality", desc: "Отельное" },
    { color: "#EC4899", name: "Retail", desc: "Торговое" },
    { color: "#6B7280", name: "Industrial", desc: "Промышленное" },
    { color: "#10B981", name: "Community Facilities", desc: "Школы, мечети, больницы" },
    { color: "#22C55E", name: "Open Space / Parks", desc: "Парки" },
    { color: "#94A3B8", name: "Utility", desc: "Инфраструктура" },
    { color: "#78716C", name: "Warehouse / Logistics", desc: "Склады" },
    { color: "#8B5CF6", name: "Education", desc: "Образование" },
    { color: "#EF4444", name: "Hospital", desc: "Медицина" },
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
      <div ref={containerRef} style={{ position: "absolute", inset: "48px 0 0 0" }} />

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
          top: 64,
          left: 16,
          width: 36,
          height: 36,
          borderRadius: 8,
          border: `1px solid ${isDark ? GOLD : c.border}`,
          background: c.bg,
          color: GOLD,
          cursor: "pointer",
          zIndex: 11,
          boxShadow: c.headerShadow,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          padding: 0,
        }}
      >
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
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
          top: 96,
          right: 16,
          width: 36,
          height: 36,
          borderRadius: 8,
          border: `1px solid ${c.border}`,
          background: "white",
          color: GOLD,
          cursor: "pointer",
          zIndex: 11,
          boxShadow: "0 1px 2px rgba(0,0,0,0.05)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
        onMouseEnter={(e) => (e.currentTarget.style.borderColor = GOLD)}
        onMouseLeave={(e) => (e.currentTarget.style.borderColor = c.border)}
      >
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
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
            top: 140,
            right: 16,
            width: 280,
            maxHeight: "calc(100vh - 130px)",
            overflowY: "auto",
            background: c.bg,
            border: `1px solid ${isDark ? GOLD : c.border}`,
            borderRadius: 10,
            boxShadow: c.headerShadow,
            zIndex: 12,
            color: c.text,
            fontFamily: "system-ui, sans-serif",
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              padding: "10px 14px",
              borderBottom: `1px solid ${c.borderSubtle}`,
            }}
          >
            <div
              style={{
                fontFamily: "Georgia, serif",
                fontSize: 13,
                letterSpacing: "0.1em",
                color: GOLD,
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
                color: c.textDim,
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
                    border: `1px solid ${c.borderSubtle}`,
                    borderRadius: 3,
                    flexShrink: 0,
                  }}
                />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 12, color: c.text, fontWeight: 600 }}>{item.name}</div>
                  <div style={{ fontSize: 10, color: c.textDim, marginTop: 1 }}>{item.desc}</div>
                </div>
              </div>
            ))}
          </div>

          <div
            style={{
              borderTop: `1px solid ${c.borderSubtle}`,
              padding: "10px 14px",
              fontSize: 10,
              color: c.textDim,
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
          left: 16,
          top: "50%",
          transform: "translateY(-50%)",
          display: "flex",
          flexDirection: "column",
          gap: 8,
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
              width: 36,
              height: 36,
              borderRadius: 8,
              border: `1px solid ${baseMap === b ? GOLD : c.border}`,
              background: baseMap === b ? GOLD : "white",
              color: baseMap === b ? "#0A1628" : c.text,
              cursor: "pointer",
              fontSize: 14,
              boxShadow: "0 1px 2px rgba(0,0,0,0.05)",
            }}
            onMouseEnter={(e) => {
              if (baseMap !== b) e.currentTarget.style.borderColor = GOLD;
            }}
            onMouseLeave={(e) => {
              if (baseMap !== b) e.currentTarget.style.borderColor = c.border;
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
          right: 16,
          top: "50%",
          transform: "translateY(-50%)",
          display: "flex",
          flexDirection: "column",
          gap: 8,
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
          <span style={{ display: "inline-block", transform: `rotate(${-bearing}deg)`, transition: "transform 250ms ease", fontSize: 16 }}>
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
      </div>

      {layersOpen && (
      <div
        ref={panelRef}
        style={{
          position: "absolute",
          top: 64,
          left: 60,
          width: 220,
          maxHeight: "calc(100vh - 80px)",
          overflowY: "auto",
          background: c.bg,
          border: `1px solid ${isDark ? GOLD : c.border}`,
          borderRadius: 8,
          zIndex: 11,
          boxShadow: c.headerShadow,
        }}
      >
        <div
          style={{
            padding: "8px 14px",
            borderBottom: `1px solid ${c.borderSubtle}`,
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
              color: c.textDim,
              cursor: "pointer",
              fontSize: 16,
              lineHeight: 1,
              padding: 0,
            }}
          >
            ×
          </button>
        </div>

        {/* Search */}
        <div style={{ padding: "8px 10px", borderBottom: `1px solid ${c.borderSubtle}` }}>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 6,
              padding: "5px 8px",
              border: `1px solid ${c.border}`,
              borderRadius: 6,
              background: c.bg,
            }}
          >
            <span style={{ fontSize: 11, color: c.textDim }}>⌕</span>
            <input
              value={layerSearch}
              onChange={(e) => setLayerSearch(e.target.value)}
              placeholder="Search layers..."
              style={{
                flex: 1,
                border: 0,
                background: "transparent",
                color: c.text,
                fontSize: 11,
                outline: "none",
                minWidth: 0,
              }}
            />
            {layerSearch && (
              <button
                onClick={() => setLayerSearch("")}
                aria-label="Clear search"
                style={{ background: "transparent", border: 0, color: c.textDim, cursor: "pointer", fontSize: 14, lineHeight: 1, padding: 0 }}
              >
                ×
              </button>
            )}
          </div>
        </div>

        <LayerGroup
          c={c}
          title="Base Layers"
          open={groupOpen.base}
          onToggle={() => setGroupOpen((g) => ({ ...g, base: !g.base }))}
          search={layerSearch}
          items={[
            { key: "communities", label: "Communities" },
            { key: "roads", label: "Major Roads" },
          ]}
          isOn={(k) => layers[k as keyof LayersState] as boolean}
          onChange={(k, v) => setLayers((l) => ({ ...l, [k]: v }))}
        />

        <LayerGroup
          c={c}
          title="Master Plans"
          open={groupOpen.master}
          onToggle={() => setGroupOpen((g) => ({ ...g, master: !g.master }))}
          search={layerSearch}
          items={[
            { key: "islands", label: "Dubai Islands" },
            { key: "meydan", label: "Meydan Horizon" },
            { key: "alFurjan", label: "Al Furjan" },
            { key: "intlCity23", label: "International City 2 & 3" },
            { key: "residential12", label: "Residential District I & II" },
            { key: "d11", label: "D11 — Parcel L/D" },
          ]}
          isOn={(k) => layers[k as keyof LayersState] as boolean}
          onChange={(k, v) => setLayers((l) => ({ ...l, [k]: v }))}
        />

        <LayerGroup
          c={c}
          title="DDA Districts"
          open={groupOpen.dda}
          onToggle={() => setGroupOpen((g) => ({ ...g, dda: !g.dda }))}
          search={layerSearch}
          items={DDA_LAYERS.map((d) => ({ key: d.key as string, label: d.label }))}
          isOn={(k) => layers[k as keyof LayersState] as boolean}
          onChange={(k, v) => setLayers((l) => ({ ...l, [k]: v }))}
        />
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
          background: ${c.bg} !important;
          border: 1px solid ${isDark ? GOLD : c.border} !important;
          box-shadow: ${c.headerShadow} !important;
          border-radius: 6px !important;
          overflow: hidden;
        }
        .maplibregl-ctrl-group button {
          background: transparent !important;
          border-bottom: 1px solid ${c.borderSubtle} !important;
        }
        .maplibregl-ctrl-group button:last-child {
          border-bottom: none !important;
        }
        .maplibregl-ctrl-group button .maplibregl-ctrl-icon {
          filter: ${isDark
            ? "invert(1) sepia(1) hue-rotate(15deg) saturate(2.5) brightness(1.05)"
            : "none"};
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
          padding: 8px 12px;
          font-size: 12px;
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
            top: zaahiHover.y + 14 + 48, // +48 = top toolbar offset (matches container)
            width: 200,
            background: "#ffffff",
            color: "#1a1a1a",
            borderLeft: `3px solid ${GOLD}`,
            borderRadius: 4,
            boxShadow: "0 4px 12px rgba(0,0,0,0.18)",
            padding: "8px 10px",
            fontSize: 11,
            fontFamily: "Georgia, serif",
            lineHeight: 1.45,
            pointerEvents: "none",
            zIndex: 30,
          }}
        >
          <div style={{ fontWeight: 700, color: "#B8860B", fontSize: 12 }}>
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
      <button
        onClick={() => sound.toggle()}
        title={soundOn ? "Mute" : "Unmute"}
        aria-label="Toggle sound"
        style={{
          position: "absolute",
          right: 16,
          top: 56, // just below the 48px header
          width: 28,
          height: 28,
          borderRadius: 6,
          border: `1px solid ${c.border}`,
          background: "white",
          color: GOLD,
          cursor: "pointer",
          fontSize: 13,
          zIndex: 25,
          boxShadow: "0 2px 8px rgba(0,0,0,0.18)",
        }}
      >
        {soundOn ? "🔊" : "🔇"}
      </button>
      <ArchibaldChat />
      <SidePanel
        parcelId={selectedParcelId}
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
}: {
  label: string;
  checked: boolean;
  onChange: (v: boolean) => void;
  color: string;
}) {
  return (
    <label
      style={{
        display: "flex",
        alignItems: "center",
        gap: 8,
        padding: "3px 14px",
        fontSize: 11,
        cursor: "pointer",
        color,
        lineHeight: 1.3,
      }}
    >
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => {
          sound.toggleSfx();
          onChange(e.target.checked);
        }}
        style={{ accentColor: GOLD, width: 12, height: 12, margin: 0 }}
      />
      {label}
    </label>
  );
}

// ── Searchable, sortable, collapsible layer group with All/None ──
function LayerGroup({
  c, title, open, onToggle, search, items, isOn, onChange,
}: {
  c: ChromeTheme;
  title: string;
  open: boolean;
  onToggle: () => void;
  search: string;
  items: Array<{ key: string; label: string }>;
  isOn: (key: string) => boolean;
  onChange: (key: string, v: boolean) => void;
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
          padding: "7px 12px 5px",
          borderTop: `1px solid ${c.borderSubtle}`,
          fontFamily: 'Georgia, "Times New Roman", serif',
          fontSize: 10,
          letterSpacing: "0.12em",
          textTransform: "uppercase",
          color: c.textDim,
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
            color: c.textDim,
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
          <span>{effectivelyOpen ? "▾" : "▸"}</span>
          <span>{title}</span>
          <span style={{ color: GOLD, fontFamily: '"SF Mono", Menlo, monospace', letterSpacing: 0 }}>
            ({onCount}/{total})
          </span>
        </button>
        <button
          onClick={() => filtered.forEach((i) => { if (!isOn(i.key)) onChange(i.key, true); })}
          title="Enable all visible"
          style={tinyBtn(c)}
        >
          All
        </button>
        <button
          onClick={() => filtered.forEach((i) => { if (isOn(i.key)) onChange(i.key, false); })}
          title="Disable all visible"
          style={tinyBtn(c)}
        >
          None
        </button>
      </div>
      {effectivelyOpen && filtered.map((i) => (
        <LayerToggle
          key={i.key}
          label={i.label}
          checked={isOn(i.key)}
          onChange={(v) => onChange(i.key, v)}
          color={c.text}
        />
      ))}
    </div>
  );
}
function tinyBtn(c: ChromeTheme): React.CSSProperties {
  return {
    padding: "2px 6px",
    fontSize: 9,
    fontFamily: '"SF Mono", Menlo, monospace',
    letterSpacing: 0.5,
    color: GOLD,
    background: "transparent",
    border: `1px solid ${c.borderSubtle}`,
    borderRadius: 3,
    cursor: "pointer",
    textTransform: "uppercase",
  };
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

// Square 36×36 chrome button used in the right vertical control column.
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
        width: 36,
        height: 36,
        borderRadius: 8,
        border: `1px solid ${c.border}`,
        background: "white",
        color: GOLD,
        cursor: "pointer",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        fontSize: 18,
        fontWeight: 700,
        boxShadow: "0 1px 2px rgba(0,0,0,0.05)",
        padding: 0,
      }}
      onMouseEnter={(e) => (e.currentTarget.style.borderColor = GOLD)}
      onMouseLeave={(e) => (e.currentTarget.style.borderColor = c.border)}
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
      const r = await fetch("/api/parcels/map");
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
    const plotNumber = check.trim();
    if (!plotNumber) return;
    window.open(
      "https://dubailand.gov.ae/en/eservices/inquiry-about-a-property-status/",
      "_blank",
      "noopener",
    );
    flash(`→ DLD check ${plotNumber}`);
    setCheck("");
  }

  return (
    <header
      style={{
        position: "absolute",
        top: 0,
        left: 0,
        right: 0,
        height: 48,
        background: c.bg,
        borderBottom: `1px solid ${isDark ? GOLD : c.border}`,
        display: "flex",
        alignItems: "center",
        padding: "0 16px",
        zIndex: 10,
        boxShadow: c.headerShadow,
        gap: 14,
      }}
    >
      <div style={{ display: "flex", alignItems: "baseline", gap: 12 }}>
        <div
          style={{
            fontFamily: 'Georgia, "Times New Roman", serif',
            fontSize: 22,
            fontWeight: 700,
            letterSpacing: "0.22em",
            color: GOLD,
          }}
        >
          ZAAHI
        </div>
        <div
          style={{
            fontSize: 9,
            color: c.textDim,
            letterSpacing: "0.18em",
            textTransform: "uppercase",
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
          title="Register a new plot in ZAAHI"
          style={hdrBtnStyle(c)}
          onMouseEnter={(e) => (e.currentTarget.style.borderColor = GOLD)}
          onMouseLeave={(e) => (e.currentTarget.style.borderColor = c.border)}
        >
          <span style={{ fontSize: 16, color: GOLD, fontWeight: 700 }}>+</span>Add Plot
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
          label="Check"
          placeholder="Plot #"
          value={check}
          onChange={setCheck}
          onKey={doCheck}
          busy={false}
          tooltip="Open DLD property status check"
        />
        <a
          href="/dashboard"
          title="Profile / Dashboard"
          style={{ ...hdrBtnStyle(c), textDecoration: "none" }}
          onMouseEnter={(e) => (e.currentTarget.style.borderColor = GOLD)}
          onMouseLeave={(e) => (e.currentTarget.style.borderColor = c.border)}
        >
          <span style={{ fontSize: 14 }}>👤</span>Profile
        </a>
      </div>
    </header>
  );
}

function hdrBtnStyle(c: ChromeTheme): React.CSSProperties {
  return {
    display: "flex",
    alignItems: "center",
    gap: 6,
    height: 32,
    padding: "0 12px",
    borderRadius: 8,
    border: `1px solid ${c.border}`,
    background: "white",
    color: c.text,
    fontSize: 12,
    fontWeight: 600,
    boxShadow: "0 1px 2px rgba(0,0,0,0.05)",
    cursor: "pointer",
    transition: "border-color 150ms ease",
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
        title="Find plot in ZAAHI database"
        aria-label="Find plot"
        onClick={() => setOpen(true)}
        style={{
          ...hdrBtnStyle(c),
          width: 32,
          padding: 0,
          justifyContent: "center",
        }}
        onMouseEnter={(e) => (e.currentTarget.style.borderColor = GOLD)}
        onMouseLeave={(e) => (e.currentTarget.style.borderColor = c.border)}
      >
        🔍
      </button>
    );
  }

  return (
    <div style={{ position: "relative" }}>
      <label
        style={{
          display: "flex",
          alignItems: "center",
          height: 32,
          padding: "0 4px 0 10px",
          borderRadius: 8,
          border: `2px solid ${error ? "#EF4444" : GOLD}`,
          background: "white",
          color: c.text,
          boxShadow: "0 1px 2px rgba(0,0,0,0.05)",
          gap: 6,
        }}
      >
        <span style={{ fontSize: 12 }}>🔍</span>
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
            width: 130,
            height: 24,
            padding: "0 6px",
            border: "none",
            background: "transparent",
            color: c.text,
            fontSize: 11,
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
            fontSize: 16,
            cursor: "pointer",
            lineHeight: 1,
            padding: "0 4px",
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
            background: "white",
            border: "1px solid #EF4444",
            borderRadius: 4,
            color: "#EF4444",
            fontSize: 10,
            fontWeight: 600,
            textAlign: "center",
            boxShadow: "0 2px 6px rgba(0,0,0,0.1)",
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
  return (
    <label
      title={tooltip}
      style={{
        display: "flex",
        alignItems: "center",
        height: 32,
        padding: "0 4px 0 10px",
        borderRadius: 8,
        border: `1px solid ${c.border}`,
        background: "white",
        color: c.text,
        boxShadow: "0 1px 2px rgba(0,0,0,0.05)",
        gap: 6,
        transition: "border-color 150ms ease",
      }}
      onMouseEnter={(e) => (e.currentTarget.style.borderColor = GOLD)}
      onMouseLeave={(e) => (e.currentTarget.style.borderColor = c.border)}
    >
      <span style={{ fontSize: 14, color: GOLD, fontWeight: 700, lineHeight: 1 }}>{icon}</span>
      <span style={{ fontSize: 11, fontWeight: 600, color: c.text }}>{label}</span>
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={onKey}
        placeholder={busy ? "…" : placeholder}
        disabled={busy}
        style={{
          width: 80,
          height: 24,
          padding: "0 6px",
          border: "none",
          background: "transparent",
          color: c.text,
          fontSize: 11,
          outline: "none",
        }}
      />
    </label>
  );
}
