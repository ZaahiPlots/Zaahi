// Archie tool bridge types — shared between map page and the chat
// widget. Phase 2 archie client (2026-05-30).
//
// The map page (`src/app/parcels/map/page.tsx`) builds a `MapControls`
// instance with imperative handles over mapRef + React state setters.
// ArchibaldChat receives it as a prop and invokes the matching
// handler when OpenAI returns a tool_call. The shapes here are the
// contract between the two.
//
// Keep this file UI-framework-free — it's imported by both sides and
// must not pull in maplibre or React.

/** Layer keys exposed to Archie's toggle_layer tool. Whitelist of
 *  commonly-asked overlays — the full LayersState carries ~230 keys
 *  (mostly individual master plans) which would balloon the tool
 *  schema; master plans get their own fuzzy-match tool in Wave 3. */
export type ArchieLayerKey =
  | "communities"
  | "roads"
  | "metro"
  | "metroStations"
  | "tramStations"
  | "marineStations"
  | "evChargers"
  | "plotLabels"
  | "districtNames"
  | "ddaLandPlots"
  | "adLandPlots"
  | "ddaProjects"
  | "ddaFreeZones"
  | "adCommunities"
  | "adDistricts"
  | "vaultShared";

/** Camera-motion flag. Used as the return shape of setAutoRotate so
 *  the tool can echo the live state after the call. */
export interface CameraMotionState {
  autoRotate: boolean;
}

/** All map actions Archie can request via OpenAI function-calling.
 *  Wave 3a additions: setPriceRange / setAreaRange / resetAllFilters /
 *  flyToEmirate — needed by the new control_camera + control_filter
 *  mega-tools. Implementation lives in src/app/parcels/map/page.tsx. */
export interface MapControls {
  /** Camera fly to a single point. */
  flyTo(lng: number, lat: number, zoom?: number): void;
  /** Camera fit to a bounding box. Used by fly_to_district when the
   *  resolved district has a polygon extent. */
  fitBounds(bounds: [[number, number], [number, number]]): void;
  /** Open the public SidePanel for a parcel id. */
  openParcel(parcelId: string): void;
  /** Open the VaultSidePanelAdapter in owner mode. */
  openVaultEntry(entryId: string): void;
  /** Apply / clear the gold halo around a parcel. Pass null to clear. */
  highlightParcel(parcelId: string | null): void;
  /** Flip the lock — vault-only mode. */
  setVaultOnly(enabled: boolean): void;
  /** Constrain the ZAAHI plot/building layers to one land-use enum.
   *  Pass null to clear that constraint. Composes with status + vault
   *  filters via reapplyMapFilters inside the page. */
  filterByLandUse(category: string | null): void;
  /** Same composition semantics as filterByLandUse but on ParcelStatus. */
  filterByStatus(status: string | null): void;
  /** Search a plot by number. Returns plot metadata or null on miss.
   *  isVault + vaultEntryId let open_plot route the same way the click
   *  handler in /parcels/map does — caller's own VAULT_PRIVATE parcels
   *  open through openVaultEntry instead of openParcel. */
  searchPlot(plotNumber: string): Promise<{
    id: string;
    plotNumber: string;
    district: string;
    latitude: number | null;
    longitude: number | null;
    projectName: string | null;
    isVault: boolean;
    vaultEntryId: string | null;
  } | null>;
  /** Resolve a district name to map bounds via /api/archie/resolve-district.
   *  Wave 3a — when the name matches the boundary index, matchMode is
   *  "boundary" and the polygon is included so the caller can outline
   *  it briefly. Returns null when the name doesn't match anything. */
  resolveDistrict(name: string, emirate?: "DUBAI" | "ABU_DHABI"): Promise<{
    name: string;
    matchedCount: number;
    matchMode: "exact" | "contains" | "boundary";
    center: [number, number];
    bounds: [[number, number], [number, number]] | null;
    polygon?: GeoJSON.Polygon | GeoJSON.MultiPolygon;
    source?: string;
  } | null>;

  // ── Wave 2: chrome / camera / overlay controls ──
  /** Cycle the basemap raster between Cartocdn light, Cartocdn dark,
   *  and ArcGIS satellite. */
  setBaseMap(theme: "light" | "dark" | "satellite"): void;
  /** Flip the camera between flat 2D and 45° pitch 3D. Re-uses the
   *  existing easeTo pitch transition from the rail button. */
  setViewMode(mode: "2D" | "3D"): void;
  /** One zoom step in either direction — same as the +/− rail
   *  buttons. */
  zoomMap(direction: "in" | "out"): void;
  /** Toggle the sun-time slider overlay. */
  setSunSlider(enabled: boolean): void;
  /** Toggle auto-rotate camera. */
  setAutoRotate(enabled: boolean): CameraMotionState;
  /** Open / close the Legend panel (mirrors the rail Legend button). */
  setLegendOpen(open: boolean): void;
  /** Toggle one of the whitelisted layer keys. The key MUST be a
   *  member of ArchieLayerKey; the implementation in page.tsx does a
   *  partial setLayers update + persists via the existing
   *  zaahi-map-layers localStorage path. */
  setLayer(key: ArchieLayerKey, enabled: boolean): void;

  // ── Wave 3a: new control_filter + control_camera handlers ──
  /** Apply a price-range filter (AED). Pass min=null AND max=null to
   *  clear the constraint. Wave 3a — implemented in page.tsx via the
   *  existing FilterPanel state. */
  setPriceRange(min: number | null, max: number | null): void;
  /** Apply an area-range filter (sqft). Same semantics as setPriceRange. */
  setAreaRange(min: number | null, max: number | null): void;
  /** Clear every filter dimension (land use, status, price, area,
   *  districts). Equivalent to the FilterPanel "Reset all" button. */
  resetAllFilters(): void;
  /** Fly to an emirate-level overview (Dubai or Abu Dhabi). Used by
   *  control_camera({action:"set_emirate"}). */
  flyToEmirate(emirate: "DUBAI" | "ABU_DHABI"): void;
}

/** A single OpenAI tool_call entry from /api/archie. */
export interface ToolCall {
  id: string;
  name: string;
  arguments: string; // JSON string — caller parses to the typed args
}

/** The assistant turn that emitted tool_calls. OpenAI requires this to
 *  be echoed back alongside the role:"tool" responses on the next
 *  turn so the model can correlate. */
export interface AssistantWithTools {
  role: "assistant";
  content: string | null;
  tool_calls: Array<{
    id: string;
    type: "function";
    function: { name: string; arguments: string };
  }>;
}

/** /api/archie response shape. Either text reply or tool dispatch. */
export type ArchieReply =
  | { reply: string; error?: undefined }
  | {
      tool_calls: ToolCall[];
      assistant_message: AssistantWithTools;
      reply?: undefined;
      error?: undefined;
    }
  | { error: string; reply?: undefined; tool_calls?: undefined };

/** Human-friendly label for the "Archie is …" pending hint. Wave 3a — 12
 *  hybrid tool names. */
export function toolHumanLabel(name: string, argsJson: string): string {
  try {
    const a = JSON.parse(argsJson) as Record<string, unknown>;
    switch (name) {
      // ── Standalone 8 ──
      case "fly_to_district":
        return `flying to ${String(a.district ?? "the district")}…`;
      case "open_plot":
        return `opening plot ${String(a.plotNumber ?? "")}…`;
      case "search_plots":
        return "searching plots…";
      case "get_plot_details":
        return `reading plot ${String(a.plotNumber ?? "")}…`;
      case "compare_plots":
        return "comparing plots…";
      case "change_basemap":
        return `switching basemap to ${String(a.theme ?? "")}…`;
      case "toggle_layer":
        return `${a.enabled === true ? "showing" : "hiding"} ${String(a.layer ?? "layer")}…`;
      case "submit_feedback":
        return "sending feedback…";
      // ── Mega 4 ──
      case "control_camera":
        return cameraLabel(String(a.action ?? ""), a);
      case "control_filter":
        return filterLabel(String(a.action ?? ""), a);
      case "control_chrome":
        return chromeLabel(String(a.action ?? ""), a.enabled === true);
      case "parcel_action":
        return `acting on parcel (${String(a.action ?? "")})…`;
      default:
        return `working on ${name}…`;
    }
  } catch {
    return `working on ${name}…`;
  }
}

function cameraLabel(action: string, a: Record<string, unknown>): string {
  switch (action) {
    case "zoom_in": return "zooming in…";
    case "zoom_out": return "zooming out…";
    case "set_view_mode": return `switching to ${String(a.mode ?? "")}…`;
    case "set_emirate": return `flying to ${String(a.emirate ?? "emirate")}…`;
    case "reset_view": return "resetting view…";
    case "highlight_plot": return "highlighting plot…";
    case "toggle_vault_only": return a.enabled === true ? "entering vault view…" : "exiting vault view…";
    default: return `camera (${action})…`;
  }
}

function filterLabel(action: string, a: Record<string, unknown>): string {
  switch (action) {
    case "by_land_use": return a.category ? `filtering to ${String(a.category)}…` : "clearing land-use filter…";
    case "by_status": return a.status ? `filtering to ${String(a.status)}…` : "clearing status filter…";
    case "price_range": return "applying price filter…";
    case "area_range": return "applying area filter…";
    case "reset_all": return "clearing all filters…";
    default: return `filter (${action})…`;
  }
}

function chromeLabel(action: string, enabled: boolean): string {
  const verb = enabled ? "enabling" : "disabling";
  const niceAction = action === "auto_rotate" ? "auto-rotate"
    : action === "sun_slider" ? "sun-time slider"
    : action;
  return `${verb} ${niceAction}…`;
}

// Shared apiFetch import path — the analytics tools call the
// new /api/archie/{search-plots, plot-details, compare-plots}
// endpoints to read DB data. apiFetch attaches the Bearer token.
import { apiFetch } from "@/lib/api-fetch";

/** Execute one tool call against the live MapControls. Returns the
 *  structured result that goes back to OpenAI as the role:"tool"
 *  content. Throws are caught by the caller and turned into a
 *  {error} payload so the loop never deadlocks. */
export async function executeArchieTool(
  call: ToolCall,
  controls: MapControls,
): Promise<unknown> {
  let args: Record<string, unknown> = {};
  try {
    args = JSON.parse(call.arguments) as Record<string, unknown>;
  } catch {
    return { error: "invalid_arguments_json" };
  }

  switch (call.name) {
    // ── 1. fly_to_district ─────────────────────────────────────
    case "fly_to_district": {
      const district = String(args.district ?? "").trim();
      if (!district) return { error: "missing_district" };
      const emirate =
        args.emirate === "DUBAI" || args.emirate === "ABU_DHABI"
          ? (args.emirate as "DUBAI" | "ABU_DHABI")
          : undefined;
      const resolved = await controls.resolveDistrict(district, emirate);
      if (!resolved) {
        return {
          error: "not_found",
          message: `Couldn't find district "${district}". Try a more specific name (e.g. "Business Bay", "Yas Island").`,
        };
      }
      if (resolved.bounds) {
        controls.fitBounds(resolved.bounds);
      } else {
        controls.flyTo(resolved.center[0], resolved.center[1], 14);
      }
      return {
        ok: true,
        name: resolved.name,
        matchedCount: resolved.matchedCount,
        matchMode: resolved.matchMode,
        source: resolved.source,
      };
    }
    // ── 2. open_plot ───────────────────────────────────────────
    case "open_plot": {
      const plotNumber = String(args.plotNumber ?? "").trim();
      if (!/^\d{5,10}$/.test(plotNumber)) {
        return { error: "bad_plot_number" };
      }
      const found = await controls.searchPlot(plotNumber);
      if (!found) {
        return {
          error: "not_found",
          message: `Plot ${plotNumber} isn't in our index.`,
        };
      }
      if (found.isVault && found.vaultEntryId) {
        controls.openVaultEntry(found.vaultEntryId);
      } else {
        controls.openParcel(found.id);
      }
      if (found.latitude != null && found.longitude != null) {
        controls.flyTo(found.longitude, found.latitude, 17);
      }
      return {
        ok: true,
        id: found.id,
        plotNumber: found.plotNumber,
        district: found.district,
        projectName: found.projectName,
        isVault: found.isVault,
      };
    }
    // ── 3-5. analytics standalone (search / details / compare) ─
    case "search_plots": {
      const r = await apiFetch("/api/archie/search-plots", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(args),
      });
      if (!r.ok) {
        return { error: "search_failed", status: r.status, message: `Search returned ${r.status}.` };
      }
      return await r.json();
    }
    case "get_plot_details": {
      const plotNumber = String(args.plotNumber ?? "").trim();
      if (!/^\d{5,10}$/.test(plotNumber)) return { error: "bad_plot_number" };
      const r = await apiFetch(`/api/archie/plot-details/${plotNumber}`);
      if (r.status === 404) {
        return { error: "not_found", message: `Plot ${plotNumber} isn't in our catalogue (or is privately held by another user).` };
      }
      if (!r.ok) return { error: "details_failed", status: r.status, message: `Details lookup returned ${r.status}.` };
      return await r.json();
    }
    case "compare_plots": {
      const r = await apiFetch("/api/archie/compare-plots", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(args),
      });
      if (!r.ok) {
        const errBody = (await r.json().catch(() => ({}))) as { message?: string };
        return { error: "compare_failed", status: r.status, message: typeof errBody?.message === "string" ? errBody.message : `Compare returned ${r.status}.` };
      }
      return await r.json();
    }
    // ── 6. change_basemap ──────────────────────────────────────
    case "change_basemap": {
      const theme = String(args.theme ?? "").toLowerCase();
      if (theme !== "light" && theme !== "dark" && theme !== "satellite") {
        return { error: "bad_theme", message: "theme must be light|dark|satellite" };
      }
      controls.setBaseMap(theme);
      return { ok: true, theme };
    }
    // ── 7. toggle_layer ────────────────────────────────────────
    case "toggle_layer": {
      const layer = String(args.layer ?? "");
      const enabled = args.enabled === true;
      const ALLOWED: ArchieLayerKey[] = [
        "communities", "roads", "metro", "metroStations", "tramStations",
        "marineStations", "evChargers", "plotLabels", "districtNames",
        "ddaLandPlots", "adLandPlots", "ddaProjects", "ddaFreeZones",
        "adCommunities", "adDistricts", "vaultShared",
      ];
      if (!ALLOWED.includes(layer as ArchieLayerKey)) {
        return { error: "bad_layer", message: `Unknown layer "${layer}". Pick one of: ${ALLOWED.join(", ")}.` };
      }
      controls.setLayer(layer as ArchieLayerKey, enabled);
      return { ok: true, layer, enabled };
    }
    // ── 8. submit_feedback ─────────────────────────────────────
    case "submit_feedback": {
      // Wave 3b — live. Fans out to founder Telegram via
      // /api/archie/feedback (which delegates to sendTelegramToAdmins).
      // Server enforces rate-limit (3/hour) + 24h dedup.
      //
      // Defensive guards against LLM-driven abuse: empty / very-short
      // text is rejected client-side too so we don't burn a server
      // round-trip on a hallucinated empty submit.
      const category = String(args.category ?? "");
      const text = String(args.text ?? "").trim();
      const context = typeof args.context === "string" ? args.context.trim() : undefined;
      if (!["BUG", "IDEA", "COMPLAINT"].includes(category)) {
        return { error: "bad_category", message: "category must be one of BUG|IDEA|COMPLAINT" };
      }
      if (text.length < 3) {
        return { error: "empty_text", message: "Feedback text is empty — quote the user's exact words." };
      }
      const r = await apiFetch("/api/archie/feedback", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ category, text, context }),
      });
      if (r.status === 429) {
        const body = (await r.json().catch(() => ({}))) as { message?: string };
        return {
          ok: false,
          rateLimited: true,
          message: typeof body.message === "string" ? body.message : "Rate-limited — try again later.",
        };
      }
      if (!r.ok) {
        const body = (await r.json().catch(() => ({}))) as { error?: string };
        return { error: "feedback_failed", status: r.status, code: body.error };
      }
      return await r.json();
    }
    // ── 9. control_camera (mega) ───────────────────────────────
    case "control_camera": {
      const action = String(args.action ?? "");
      switch (action) {
        case "zoom_in":
          controls.zoomMap("in");
          return { ok: true, action };
        case "zoom_out":
          controls.zoomMap("out");
          return { ok: true, action };
        case "set_view_mode": {
          const mode = String(args.mode ?? "").toUpperCase();
          if (mode !== "2D" && mode !== "3D") return { error: "bad_mode", message: "mode must be 2D|3D" };
          controls.setViewMode(mode);
          return { ok: true, action, mode };
        }
        case "set_emirate": {
          const emirate = args.emirate === "ABU_DHABI" ? "ABU_DHABI" : args.emirate === "DUBAI" ? "DUBAI" : null;
          if (!emirate) return { error: "bad_emirate", message: "emirate must be DUBAI|ABU_DHABI" };
          controls.flyToEmirate(emirate);
          return { ok: true, action, emirate };
        }
        case "reset_view": {
          controls.resetAllFilters();
          controls.flyToEmirate("DUBAI");
          return {
            ok: true,
            action,
            cleared: ["filters", "camera"],
            message: "Cleared every filter and flew to Dubai overview.",
          };
        }
        case "highlight_plot": {
          const plotId = String(args.plotId ?? "").trim();
          if (!plotId) return { error: "missing_plot_id" };
          controls.highlightParcel(plotId);
          return { ok: true, action };
        }
        case "toggle_vault_only": {
          const enabled = args.enabled === true;
          controls.setVaultOnly(enabled);
          return { ok: true, action, enabled };
        }
        default:
          return { error: "bad_camera_action", message: `Unknown camera action "${action}".` };
      }
    }
    // ── 10. control_filter (mega) ──────────────────────────────
    case "control_filter": {
      const action = String(args.action ?? "");
      switch (action) {
        case "by_land_use": {
          const category = args.category == null ? null : String(args.category).trim() || null;
          controls.filterByLandUse(category);
          return { ok: true, action, category };
        }
        case "by_status": {
          const status = args.status == null ? null : String(args.status).trim() || null;
          controls.filterByStatus(status);
          return { ok: true, action, status };
        }
        case "price_range": {
          const min = typeof args.min === "number" ? args.min : null;
          const max = typeof args.max === "number" ? args.max : null;
          controls.setPriceRange(min, max);
          return { ok: true, action, min, max };
        }
        case "area_range": {
          const min = typeof args.min === "number" ? args.min : null;
          const max = typeof args.max === "number" ? args.max : null;
          controls.setAreaRange(min, max);
          return { ok: true, action, min, max };
        }
        case "reset_all": {
          controls.resetAllFilters();
          return { ok: true, action };
        }
        default:
          return { error: "bad_filter_action", message: `Unknown filter action "${action}".` };
      }
    }
    // ── 11. control_chrome (mega) ──────────────────────────────
    case "control_chrome": {
      const action = String(args.action ?? "");
      const enabled = args.enabled === true;
      switch (action) {
        case "auto_rotate": {
          const state = controls.setAutoRotate(enabled);
          return { ok: true, action, ...state };
        }
        case "sun_slider":
          controls.setSunSlider(enabled);
          return { ok: true, action, enabled };
        case "legend":
          controls.setLegendOpen(enabled);
          return { ok: true, action, enabled };
        default:
          return { error: "bad_chrome_action", message: `Unknown chrome action "${action}".` };
      }
    }
    // ── 12. parcel_action (STUB — Wave 3c) ─────────────────────
    case "parcel_action": {
      const action = String(args.action ?? "");
      return {
        ok: false,
        stub: true,
        action,
        message: `parcel_action "${action}" lands in Wave 3c — for now you can describe the action to the user but don't claim it happened.`,
      };
    }
    default:
      return { error: "unknown_tool", name: call.name };
  }
}
