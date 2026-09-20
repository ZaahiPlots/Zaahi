// ── Map view persistence ─────────────────────────────────────────────
// Saves the user's last camera state (center / zoom / bearing / pitch)
// and active layer toggles so /parcels/map opens where they left it.
// Camera is restored at map-init; layers are restored via lazy useState.
// Save is debounced 500ms inside the map init useEffect.

export interface SavedMapView {
  center: [number, number];
  zoom: number;
  bearing: number;
  pitch: number;
}
export const MAP_VIEW_STORAGE_KEY = "zaahi-map-view";
export const MAP_LAYERS_STORAGE_KEY = "zaahi-map-layers";

export function loadSavedMapView(): SavedMapView | null {
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

export function saveMapView(v: SavedMapView): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(MAP_VIEW_STORAGE_KEY, JSON.stringify(v));
  } catch {
    /* ignore quota / private mode */
  }
}

export function loadSavedLayers(defaults: Record<string, boolean>): Record<string, boolean> {
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

export function saveLayers(state: Record<string, boolean>): void {
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
export function loadVaultOnlyMode(): boolean {
  if (typeof window === "undefined") return false;
  try {
    return window.localStorage.getItem("zaahi-vault-only-mode") === "1";
  } catch {
    return false;
  }
}

