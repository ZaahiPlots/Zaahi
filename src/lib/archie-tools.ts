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

/** Pair of mutually-exclusive camera-motion flags. Used as the return
 *  shape of setDroneMode + setAutoRotate so the tool can echo the live
 *  state after the mutex resolves. */
export interface CameraMotionState {
  drone: boolean;
  autoRotate: boolean;
}

/** All map actions Archie can request via OpenAI function-calling. */
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
   *  Returns null when the name doesn't match any indexed district. */
  resolveDistrict(name: string): Promise<{
    name: string;
    matchedCount: number;
    matchMode: "exact" | "contains";
    center: [number, number];
    bounds: [[number, number], [number, number]] | null;
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
  /** Toggle drone-fly mode (WASD + right-click pointer-lock). Mutex
   *  with auto-rotate: enabling drone disables auto-rotate (and vice
   *  versa). Returns the resolved state so the tool can echo it. */
  setDroneMode(enabled: boolean): CameraMotionState;
  /** Toggle the sun-time slider overlay. */
  setSunSlider(enabled: boolean): void;
  /** Toggle auto-rotate camera. Mutex partner of setDroneMode. */
  setAutoRotate(enabled: boolean): CameraMotionState;
  /** Open / close the Legend panel (mirrors the rail Legend button). */
  setLegendOpen(open: boolean): void;
  /** Toggle one of the whitelisted layer keys. The key MUST be a
   *  member of ArchieLayerKey; the implementation in page.tsx does a
   *  partial setLayers update + persists via the existing
   *  zaahi-map-layers localStorage path. */
  setLayer(key: ArchieLayerKey, enabled: boolean): void;
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

/** Human-friendly label for the "Archie is …" pending hint. */
export function toolHumanLabel(name: string, argsJson: string): string {
  try {
    const a = JSON.parse(argsJson) as Record<string, unknown>;
    switch (name) {
      case "fly_to_district":
        return `flying to ${String(a.district ?? "the district")}…`;
      case "open_plot":
        return `opening plot ${String(a.plotNumber ?? "")}…`;
      case "highlight_plot":
        return `highlighting plot…`;
      case "filter_by_land_use":
        return `filtering to ${String(a.landUse ?? "land use")}…`;
      case "filter_by_status":
        return `filtering to ${String(a.status ?? "status")}…`;
      case "toggle_vault_only":
        return a.enabled === true ? `entering vault view…` : `exiting vault view…`;
      // ── Wave 1 analytics tools ──
      case "search_plots":
        return "searching plots…";
      case "get_plot_details":
        return `reading plot ${String(a.plotNumber ?? "")}…`;
      case "compare_plots":
        return "comparing plots…";
      // ── Wave 2 chrome / camera / overlay tools ──
      case "change_basemap":
        return `switching basemap to ${String(a.theme ?? "")}…`;
      case "toggle_layer":
        return `${a.enabled === true ? "showing" : "hiding"} ${String(a.layer ?? "layer")}…`;
      case "set_view_mode":
        return `switching to ${String(a.mode ?? "")}…`;
      case "zoom_map":
        return `zooming ${String(a.direction ?? "")}…`;
      case "toggle_drone":
        return a.enabled === true ? `enabling drone mode…` : `exiting drone mode…`;
      case "toggle_sun_slider":
        return a.enabled === true ? `showing sun-time slider…` : `hiding sun slider…`;
      case "toggle_auto_rotate":
        return a.enabled === true ? `starting auto-rotate…` : `stopping auto-rotate…`;
      case "toggle_legend":
        return a.visible === true ? `opening legend…` : `closing legend…`;
      default:
        return `working on ${name}…`;
    }
  } catch {
    return `working on ${name}…`;
  }
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
    case "fly_to_district": {
      const district = String(args.district ?? "").trim();
      if (!district) return { error: "missing_district" };
      const resolved = await controls.resolveDistrict(district);
      if (!resolved) {
        return {
          error: "not_found",
          message: `Couldn't find district "${district}". Try a more specific name.`,
        };
      }
      if (resolved.bounds) {
        controls.fitBounds(resolved.bounds);
      } else {
        const zoom = typeof args.zoom === "number" ? args.zoom : 14;
        controls.flyTo(resolved.center[0], resolved.center[1], zoom);
      }
      return {
        ok: true,
        name: resolved.name,
        matchedCount: resolved.matchedCount,
        matchMode: resolved.matchMode,
      };
    }
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
      // Mirrors the ZAAHI_PLOTS_FILL click handler in
      // src/app/parcels/map/page.tsx: caller's own VAULT_PRIVATE rows
      // open the broker-side VaultSidePanelAdapter; everything else
      // opens the public SidePanel.
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
    case "highlight_plot": {
      const plotId = String(args.plotId ?? "").trim();
      if (!plotId) return { error: "missing_plot_id" };
      controls.highlightParcel(plotId);
      return { ok: true };
    }
    case "filter_by_land_use": {
      const landUse = args.landUse == null ? null : String(args.landUse).trim();
      controls.filterByLandUse(landUse && landUse.length > 0 ? landUse : null);
      return { ok: true, landUse };
    }
    case "filter_by_status": {
      const status = args.status == null ? null : String(args.status).trim();
      controls.filterByStatus(status && status.length > 0 ? status : null);
      return { ok: true, status };
    }
    case "toggle_vault_only": {
      const enabled = args.enabled === true;
      controls.setVaultOnly(enabled);
      return { ok: true, enabled };
    }
    // ── Wave 1 analytics tools (founder spec 2026-06-01) ─────────
    // Read-only — these never touch the camera or filters. They
    // fetch the relevant /api/archie/* endpoint, parse JSON, and
    // return the payload (or error envelope) verbatim back to the
    // LLM as the role:"tool" content.
    case "search_plots": {
      // Forward the args object — the API silently drops anything it
      // doesn't recognise + clamps limit. The LLM might pass extra
      // junk; we don't pre-validate to keep this layer thin.
      const r = await apiFetch("/api/archie/search-plots", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(args),
      });
      if (!r.ok) {
        return {
          error: "search_failed",
          status: r.status,
          message: `Search returned ${r.status}.`,
        };
      }
      return await r.json();
    }
    case "get_plot_details": {
      const plotNumber = String(args.plotNumber ?? "").trim();
      if (!/^\d{5,10}$/.test(plotNumber)) {
        return { error: "bad_plot_number" };
      }
      const r = await apiFetch(`/api/archie/plot-details/${plotNumber}`);
      if (r.status === 404) {
        return {
          error: "not_found",
          message: `Plot ${plotNumber} isn't in our catalogue (or is privately held by another user).`,
        };
      }
      if (!r.ok) {
        return {
          error: "details_failed",
          status: r.status,
          message: `Details lookup returned ${r.status}.`,
        };
      }
      return await r.json();
    }
    case "compare_plots": {
      // Pass through plotNumbers — the API validates length + format
      // server-side and returns missing[] for anything it skipped.
      const r = await apiFetch("/api/archie/compare-plots", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(args),
      });
      if (!r.ok) {
        const errBody = await r.json().catch(() => ({}));
        return {
          error: "compare_failed",
          status: r.status,
          message:
            typeof errBody?.message === "string"
              ? errBody.message
              : `Compare returned ${r.status}.`,
        };
      }
      return await r.json();
    }
    // ── Wave 2 chrome / camera / overlay tools (founder spec 2026-06-01) ──
    // Fire-and-forget — invoke the corresponding MapControls method and
    // echo {ok, …} so the LLM can confirm the action in its reply.
    // Mutex semantics for drone ⇄ auto-rotate live inside MapControls
    // itself (page.tsx); the tools just relay the post-mutex state.
    case "change_basemap": {
      const theme = String(args.theme ?? "").toLowerCase();
      if (theme !== "light" && theme !== "dark" && theme !== "satellite") {
        return { error: "bad_theme", message: "theme must be light|dark|satellite" };
      }
      controls.setBaseMap(theme);
      return { ok: true, theme };
    }
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
        return {
          error: "bad_layer",
          message: `Unknown layer "${layer}". Pick one of: ${ALLOWED.join(", ")}.`,
        };
      }
      controls.setLayer(layer as ArchieLayerKey, enabled);
      return { ok: true, layer, enabled };
    }
    case "set_view_mode": {
      const mode = String(args.mode ?? "").toUpperCase();
      if (mode !== "2D" && mode !== "3D") {
        return { error: "bad_mode", message: "mode must be 2D|3D" };
      }
      controls.setViewMode(mode);
      return { ok: true, mode };
    }
    case "zoom_map": {
      const direction = String(args.direction ?? "").toLowerCase();
      if (direction !== "in" && direction !== "out") {
        return { error: "bad_direction", message: "direction must be in|out" };
      }
      controls.zoomMap(direction);
      return { ok: true, direction };
    }
    case "toggle_drone": {
      // MapControls handles mutex with auto-rotate internally and
      // returns the resolved camera-motion state (drone, autoRotate).
      // The tool echoes both so the LLM phrases the result honestly
      // even when enabling drone also flipped auto-rotate off.
      const enabled = args.enabled === true;
      const state = controls.setDroneMode(enabled);
      return { ok: true, ...state };
    }
    case "toggle_sun_slider": {
      const enabled = args.enabled === true;
      controls.setSunSlider(enabled);
      return { ok: true, enabled };
    }
    case "toggle_auto_rotate": {
      // Same mutex pattern as toggle_drone — see comment above.
      const enabled = args.enabled === true;
      const state = controls.setAutoRotate(enabled);
      return { ok: true, ...state };
    }
    case "toggle_legend": {
      const visible = args.visible === true;
      controls.setLegendOpen(visible);
      return { ok: true, visible };
    }
    default:
      return { error: "unknown_tool", name: call.name };
  }
}
