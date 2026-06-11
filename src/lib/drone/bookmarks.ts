"use client";

// ZAAHI drone — bookmarks storage (localStorage, per-device).
// Founder ratified 2026-06-10. MVP: no Supabase sync.

import { BOOKMARKS_MAX, BOOKMARKS_STORAGE_KEY } from "./constants";

export interface DroneBookmark {
  id: string;
  name: string;          // auto: "{community} · YYYY-MM-DD HH:mm" or fallback
  lng: number;
  lat: number;
  altM: number;
  bearing: number;       // 0-360
  pitch: number;         // 0-85
  createdAt: number;     // unix ms
}

function readRaw(): DroneBookmark[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(BOOKMARKS_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    // Light sanity filter — drop rows that don't have the required scalars.
    return parsed.filter(
      (b): b is DroneBookmark =>
        b &&
        typeof b.id === "string" &&
        typeof b.lng === "number" &&
        typeof b.lat === "number" &&
        typeof b.altM === "number" &&
        typeof b.bearing === "number" &&
        typeof b.pitch === "number" &&
        typeof b.createdAt === "number",
    );
  } catch {
    return [];
  }
}

function writeRaw(list: DroneBookmark[]): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(BOOKMARKS_STORAGE_KEY, JSON.stringify(list));
  } catch {
    /* incognito / quota — session-only fallback */
  }
}

export function loadBookmarks(): DroneBookmark[] {
  return readRaw().sort((a, b) => b.createdAt - a.createdAt);
}

export function saveBookmark(
  draft: Omit<DroneBookmark, "id" | "createdAt">,
): DroneBookmark {
  const list = readRaw();
  const next: DroneBookmark = {
    id:
      typeof crypto !== "undefined" && "randomUUID" in crypto
        ? crypto.randomUUID()
        : `${Date.now()}-${Math.random().toString(16).slice(2, 10)}`,
    createdAt: Date.now(),
    ...draft,
  };
  // FIFO eviction at cap.
  const trimmed =
    list.length >= BOOKMARKS_MAX
      ? list.sort((a, b) => b.createdAt - a.createdAt).slice(0, BOOKMARKS_MAX - 1)
      : list;
  trimmed.push(next);
  writeRaw(trimmed);
  return next;
}

export function deleteBookmark(id: string): void {
  const list = readRaw().filter((b) => b.id !== id);
  writeRaw(list);
}

/** Build the default name used when the user hits B mid-flight. */
export function autoName(community: string | null): string {
  const ts = new Date();
  const stamp = `${ts.getFullYear()}-${String(ts.getMonth() + 1).padStart(2, "0")}-${String(ts.getDate()).padStart(2, "0")} ${String(ts.getHours()).padStart(2, "0")}:${String(ts.getMinutes()).padStart(2, "0")}`;
  if (community && community.trim()) return `${community.trim()} · ${stamp}`;
  return `Bookmark · ${stamp}`;
}
