"use client";

// Client-only area-unit-aware row for the server-rendered
// /parcels/[id] detail page. Subscribes to the dashboard
// Settings → Area Unit toggle (sqft / m²) and renders the
// caller's selected unit only. Inline-string fallback to "—"
// when both inputs are null.

import { useFormatArea } from "@/lib/area-unit";

export default function AreaRow({
  label,
  sqftValue,
  sqmValue,
}: {
  label: string;
  sqftValue: number | null | undefined;
  sqmValue: number | null | undefined;
}) {
  const fmtA = useFormatArea();
  const v = fmtA(sqftValue, sqmValue);
  return (
    <div className="flex justify-between gap-3 border-b border-gray-800 pb-1">
      <span className="text-gray-500">{label}</span>
      <span className="text-right">{v ?? "—"}</span>
    </div>
  );
}

/** Inline area span — used for the parenthetical area on land-use
 *  list rows where the figure renders mid-sentence. Returns null
 *  when both inputs are null, so callers can do
 *  `{u.areaSqm != null && <AreaInline sqmValue={u.areaSqm} />}`. */
export function AreaInline({
  sqftValue,
  sqmValue,
  withParens = true,
}: {
  sqftValue?: number | null;
  sqmValue?: number | null;
  withParens?: boolean;
}) {
  const fmtA = useFormatArea();
  const v = fmtA(sqftValue, sqmValue);
  if (v == null) return null;
  return <>{withParens ? ` (${v})` : v}</>;
}
