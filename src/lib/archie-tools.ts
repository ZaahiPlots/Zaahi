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

/** Human-friendly label for the "Archibald is …" pending hint. */
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
      default:
        return `working on ${name}…`;
    }
  } catch {
    return `working on ${name}…`;
  }
}

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
    default:
      return { error: "unknown_tool", name: call.name };
  }
}
