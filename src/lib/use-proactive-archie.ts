"use client";

/**
 * useProactiveArchie — proactive nudge engine for Archibald.
 *
 * Design source: docs/research/archie-proactive-2026-06-10.md
 * (Wave 3c, founder-ratified 2026-06-10).
 *
 * Purpose: badge "1" + caption pill on the Archie launcher when one
 * of three lightweight triggers fires. Click on the launcher opens
 * the chat and surfaces a template-text suggestion with [Yes] /
 * [Not now] buttons.
 *
 * Anti-spam guarantees (the Clippy-prevention layer):
 *   - Hard cap 2 active nudges per session
 *   - Only 1 nudge active at a time (new triggers DROP, not queue)
 *   - 60 s cooldown between nudges
 *   - 24 h per-type dismiss memory in localStorage (incognito-safe)
 *   - One T1 nudge per district per session
 *   - Auto-dismiss after 8 s with no click
 *
 * Triggers (founder spec, first iteration):
 *   T1 (HIGH) lingering_district  — zoom ≥ 13 AND camera idle 12 s in same district
 *   T2 (HIGH) multiple_parcels    — 2+ unique parcels opened in last 90 s
 *   T3 (MED)  filtered_empty      — filterState active AND visibleCount=0 for 3 s
 *
 * Returned API:
 *   nudge        — current active nudge, or null
 *   acceptNudge  — user clicked [Yes]: bookkeeping + caller handles action
 *   dismissNudge — user clicked [Not now] or auto-dismiss
 *
 * Hook is consumed in src/app/parcels/map/page.tsx (top-level) and
 * the resolved {nudge, acceptNudge, dismissNudge} triplet is forwarded
 * to <ArchibaldChat>.
 */

import { useCallback, useEffect, useRef, useState } from "react";
import type { Map as MaplibreMap } from "maplibre-gl";
import type { FilterState } from "@/lib/filter-state";
import { sound } from "@/lib/sound";
import { apiFetch } from "@/lib/api-fetch";

// ── Public types ──────────────────────────────────────────────────

export type NudgeType = "lingering_district" | "multiple_parcels" | "filtered_empty";

export interface ProactiveNudge {
  id: string; // unique per-nudge id (for React key + accept/dismiss correlation)
  type: NudgeType;
  caption: string; // pill text shown next to launcher
  text: string; // expanded text shown in chat after click
  /** Tool-call sequence the caller should run on [Yes]. Caller is
   *  responsible for invoking these via executeArchieTool. */
  acceptAction: AcceptAction;
}

export type AcceptAction =
  | { kind: "open_district"; district: string }
  | { kind: "compare_parcels"; plotNumbers: string[] }
  | { kind: "ask_relax_filters" };

interface UseProactiveArchieArgs {
  mapRef: React.RefObject<MaplibreMap | null>;
  selectedParcelId: string | null;
  visibleCount: { listings: number; pmtiles: number } | undefined;
  filterState: FilterState;
  /** Toggle the engine entirely (e.g. chat already open — don't pester). */
  enabled?: boolean;
}

// ── Tuning constants (all founder-spec defaults) ──────────────────

const HARD_CAP_PER_SESSION = 2;
const COOLDOWN_MS = 60_000; // 60 s between nudges
const AUTO_DISMISS_MS = 8_000; // 8 s without click → soft dismiss
const DISMISS_MEMORY_MS = 24 * 60 * 60 * 1000; // 24 h per-type
const T1_DWELL_MS = 12_000; // 12 s on same district
const T1_MIN_ZOOM = 13; // any "looking at a district" needs zoom ≥ 13
const T2_WINDOW_MS = 90_000; // 90 s window for "multiple parcels"
const T2_THRESHOLD = 2; // 2 distinct parcels = compare?
const T3_EMPTY_DWELL_MS = 3_000; // 3 s of empty result
const CAMERA_DEBOUNCE_MS = 600; // debounce reverse-district lookups
const REVERSE_LOOKUP_MIN_ZOOM = 12; // skip the round-trip below 12

const STORAGE_KEY = "zaahi-archie-nudges-dismissed";

// ── localStorage dismiss memory ───────────────────────────────────

function readDismissed(): Record<string, number> {
  if (typeof window === "undefined") return {};
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return {};
    return JSON.parse(raw) as Record<string, number>;
  } catch {
    return {};
  }
}

function writeDismissed(map: Record<string, number>): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(map));
  } catch {
    /* incognito / quota — session-only fallback */
  }
}

function isTypeDismissedRecent(type: NudgeType): boolean {
  const at = readDismissed()[type];
  if (!at) return false;
  return Date.now() - at < DISMISS_MEMORY_MS;
}

function rememberDismiss(type: NudgeType): void {
  const map = readDismissed();
  map[type] = Date.now();
  writeDismissed(map);
}

// ── Templates (RU/EN/AR — locale taken from browser) ──────────────

function pickLocale(): "en" | "ru" | "ar" {
  if (typeof navigator === "undefined") return "en";
  const tag = (navigator.language || "en").toLowerCase();
  if (tag.startsWith("ru")) return "ru";
  if (tag.startsWith("ar")) return "ar";
  return "en";
}

const CAPTIONS: Record<"en" | "ru" | "ar", string> = {
  en: "Archie has a suggestion",
  ru: "Archie хочет вам что-то подсказать",
  ar: "لدى أرشي اقتراح",
};

const ACCEPT_LABEL: Record<"en" | "ru" | "ar", string> = {
  en: "Yes, show me",
  ru: "Да, покажи",
  ar: "نعم، اعرض",
};

const DISMISS_LABEL: Record<"en" | "ru" | "ar", string> = {
  en: "Not now",
  ru: "Не сейчас",
  ar: "ليس الآن",
};

function nudgeText(type: NudgeType, data: { district?: string; n?: number }): string {
  const loc = pickLocale();
  const T = (en: string, ru: string, ar: string) =>
    loc === "ru" ? ru : loc === "ar" ? ar : en;
  switch (type) {
    case "lingering_district":
      return T(
        `You've been looking at ${data.district}. Want me to pull up listings for it?`,
        `Похоже, вы изучаете ${data.district}. Показать листинги по району?`,
        `يبدو أنك تستكشف ${data.district}. أعرض لك القوائم في هذا الحي؟`,
      );
    case "multiple_parcels":
      return T(
        `You've opened ${data.n} plots. Want me to compare them side by side?`,
        `Вы открыли ${data.n} участка. Сравнить их в таблице?`,
        `فتحت ${data.n} قطعة. أقارنها لك جنبًا إلى جنب؟`,
      );
    case "filtered_empty":
      return T(
        `No plots match your filter right now. Want help relaxing it?`,
        `Под текущий фильтр пусто. Помочь ослабить условия?`,
        `لا توجد قطع تطابق الفلتر الحالي. هل تريد مساعدة في تخفيفه؟`,
      );
  }
}

export function nudgeCaption(): string {
  return CAPTIONS[pickLocale()];
}

export function nudgeAcceptLabel(): string {
  return ACCEPT_LABEL[pickLocale()];
}

export function nudgeDismissLabel(): string {
  return DISMISS_LABEL[pickLocale()];
}

// ── Filter helpers ────────────────────────────────────────────────

function filterHasActiveDimension(s: FilterState): boolean {
  return (
    (s.landUse?.length ?? 0) > 0 ||
    (s.unifiedStatus?.length ?? 0) > 0 ||
    (s.districts?.length ?? 0) > 0 ||
    s.priceRange != null ||
    s.areaRange != null ||
    s.gfaRange != null ||
    s.farRange != null
  );
}

// ── The hook ──────────────────────────────────────────────────────

export function useProactiveArchie({
  mapRef,
  selectedParcelId,
  visibleCount,
  filterState,
  enabled = true,
}: UseProactiveArchieArgs): {
  nudge: ProactiveNudge | null;
  acceptNudge: () => AcceptAction | null;
  dismissNudge: () => void;
} {
  const [nudge, setNudge] = useState<ProactiveNudge | null>(null);

  // Counters / locks
  const shownCountRef = useRef(0);
  const lastShownAtRef = useRef(0);
  const shownInSessionRef = useRef<Set<NudgeType>>(new Set());
  const shownDistrictsT1Ref = useRef<Set<string>>(new Set());
  const autoDismissTimerRef = useRef<number | null>(null);

  // T1 helpers
  const currentDistrictRef = useRef<string | null>(null);
  const districtSinceRef = useRef<number>(0);
  const dwellTimerRef = useRef<number | null>(null);
  const lastReverseLookupKeyRef = useRef<string>("");
  const reverseLookupCacheRef = useRef<Map<string, string | null>>(new Map());

  // T2 helpers
  const recentParcelsRef = useRef<{ id: string; at: number }[]>([]);

  // T3 helpers
  const emptySinceRef = useRef<number | null>(null);

  // ── Common predicate: can we show a new nudge of this type? ─────
  const canShow = useCallback(
    (type: NudgeType): boolean => {
      if (!enabled) return false;
      if (nudge != null) return false; // single-active-nudge
      if (shownCountRef.current >= HARD_CAP_PER_SESSION) return false;
      if (Date.now() - lastShownAtRef.current < COOLDOWN_MS) return false;
      if (shownInSessionRef.current.has(type)) return false; // accepted this session
      if (isTypeDismissedRecent(type)) return false; // 24h decline memory
      return true;
    },
    [enabled, nudge],
  );

  // ── Common emit ─────────────────────────────────────────────────
  const emit = useCallback(
    (n: ProactiveNudge) => {
      shownCountRef.current += 1;
      lastShownAtRef.current = Date.now();
      setNudge(n);
      // Sound cue at the moment of appearance — short cat purr.
      try { sound.archiePurr?.(); } catch { /* tolerant if method missing */ }
      // Auto-dismiss after 8 s if user does nothing.
      if (autoDismissTimerRef.current != null) {
        window.clearTimeout(autoDismissTimerRef.current);
      }
      autoDismissTimerRef.current = window.setTimeout(() => {
        setNudge((cur) => (cur && cur.id === n.id ? null : cur));
        autoDismissTimerRef.current = null;
      }, AUTO_DISMISS_MS);
    },
    [],
  );

  // ── T1: lingering on a district ─────────────────────────────────
  useEffect(() => {
    if (!enabled) return;
    const map = mapRef.current;
    if (!map) return;

    const lookupNow = async () => {
      const zoom = map.getZoom();
      if (zoom < REVERSE_LOOKUP_MIN_ZOOM) {
        currentDistrictRef.current = null;
        return;
      }
      const c = map.getCenter();
      const key = `${c.lng.toFixed(3)},${c.lat.toFixed(3)}`;
      if (key === lastReverseLookupKeyRef.current) return;
      lastReverseLookupKeyRef.current = key;
      const cached = reverseLookupCacheRef.current.get(key);
      let district: string | null;
      if (cached !== undefined) {
        district = cached;
      } else {
        try {
          const r = await apiFetch(
            `/api/archie/reverse-district?lng=${c.lng}&lat=${c.lat}`,
          );
          if (r.ok) {
            const data = (await r.json()) as { name?: string };
            district = data.name ?? null;
          } else {
            district = null;
          }
        } catch {
          district = null;
        }
        reverseLookupCacheRef.current.set(key, district);
      }

      // Did the district change?
      if (district !== currentDistrictRef.current) {
        currentDistrictRef.current = district;
        districtSinceRef.current = Date.now();
        if (dwellTimerRef.current != null) {
          window.clearTimeout(dwellTimerRef.current);
          dwellTimerRef.current = null;
        }
        if (district == null) return;
        if (zoom < T1_MIN_ZOOM) return;
        if (shownDistrictsT1Ref.current.has(district)) return;
        // Arm the dwell timer for this district.
        const targetDistrict = district;
        dwellTimerRef.current = window.setTimeout(() => {
          // Still here, still same district, still zoomed in, still allowed.
          if (currentDistrictRef.current !== targetDistrict) return;
          const z = mapRef.current?.getZoom() ?? 0;
          if (z < T1_MIN_ZOOM) return;
          if (!canShow("lingering_district")) return;
          shownDistrictsT1Ref.current.add(targetDistrict);
          emit({
            id: `T1-${targetDistrict}-${Date.now()}`,
            type: "lingering_district",
            caption: nudgeCaption(),
            text: nudgeText("lingering_district", { district: targetDistrict }),
            acceptAction: { kind: "open_district", district: targetDistrict },
          });
        }, T1_DWELL_MS);
      }
    };

    let debounceTimer: number | null = null;
    const onMove = () => {
      if (debounceTimer != null) window.clearTimeout(debounceTimer);
      debounceTimer = window.setTimeout(() => {
        void lookupNow();
      }, CAMERA_DEBOUNCE_MS);
    };
    map.on("moveend", onMove);
    // Prime once on mount so a stationary camera still triggers.
    void lookupNow();
    return () => {
      map.off("moveend", onMove);
      if (debounceTimer != null) window.clearTimeout(debounceTimer);
      if (dwellTimerRef.current != null) {
        window.clearTimeout(dwellTimerRef.current);
        dwellTimerRef.current = null;
      }
    };
  }, [enabled, mapRef, canShow, emit]);

  // ── T2: multiple parcels opened ─────────────────────────────────
  useEffect(() => {
    if (!enabled || !selectedParcelId) return;
    const now = Date.now();
    // Append + prune to a 90 s rolling window.
    const list = recentParcelsRef.current;
    if (!list.some((p) => p.id === selectedParcelId)) {
      list.push({ id: selectedParcelId, at: now });
    } else {
      // Refresh timestamp on re-open so it stays in window.
      const idx = list.findIndex((p) => p.id === selectedParcelId);
      if (idx !== -1) list[idx].at = now;
    }
    while (list.length > 0 && now - list[0].at > T2_WINDOW_MS) list.shift();

    // Distinct parcel count in window
    const distinct = new Set(list.map((p) => p.id));
    if (distinct.size < T2_THRESHOLD) return;
    if (!canShow("multiple_parcels")) return;

    // We don't have plot numbers here directly — we'd need to map ids
    // back. For Wave 3c MVP we surface the count; the accept handler
    // in the caller can resolve ids → plotNumbers via existing search
    // helpers. Pass the parcel ids through `acceptAction` and let the
    // page glue convert.
    const plotIds = Array.from(distinct).slice(-Math.max(5, distinct.size));
    emit({
      id: `T2-${now}`,
      type: "multiple_parcels",
      caption: nudgeCaption(),
      text: nudgeText("multiple_parcels", { n: distinct.size }),
      acceptAction: { kind: "compare_parcels", plotNumbers: plotIds },
    });
  }, [enabled, selectedParcelId, canShow, emit]);

  // ── T3: filter active, visible count = 0 ────────────────────────
  useEffect(() => {
    if (!enabled) return;
    const active = filterHasActiveDimension(filterState);
    const empty = !!visibleCount && visibleCount.listings === 0;
    if (!active || !empty) {
      emptySinceRef.current = null;
      return;
    }
    if (emptySinceRef.current == null) emptySinceRef.current = Date.now();
    const sinceEmpty = Date.now() - emptySinceRef.current;
    if (sinceEmpty < T3_EMPTY_DWELL_MS) return;
    if (!canShow("filtered_empty")) return;
    emit({
      id: `T3-${Date.now()}`,
      type: "filtered_empty",
      caption: nudgeCaption(),
      text: nudgeText("filtered_empty", {}),
      acceptAction: { kind: "ask_relax_filters" },
    });
  }, [enabled, filterState, visibleCount, canShow, emit]);

  // ── User actions ────────────────────────────────────────────────
  const acceptNudge = useCallback((): AcceptAction | null => {
    if (!nudge) return null;
    shownInSessionRef.current.add(nudge.type);
    if (autoDismissTimerRef.current != null) {
      window.clearTimeout(autoDismissTimerRef.current);
      autoDismissTimerRef.current = null;
    }
    const action = nudge.acceptAction;
    setNudge(null);
    return action;
  }, [nudge]);

  const dismissNudge = useCallback((): void => {
    if (!nudge) return;
    rememberDismiss(nudge.type);
    if (autoDismissTimerRef.current != null) {
      window.clearTimeout(autoDismissTimerRef.current);
      autoDismissTimerRef.current = null;
    }
    setNudge(null);
  }, [nudge]);

  return { nudge, acceptNudge, dismissNudge };
}
