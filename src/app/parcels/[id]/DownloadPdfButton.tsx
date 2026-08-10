"use client";

// Client-only download trigger for the server-rendered plot page.
//
// /api/parcels/[id]/pdf goes through getApprovedUserId(req), so a plain
// <a href="/api/..."> navigates without an Authorization header and the
// middleware returns 401. downloadFile() sends the request through
// apiFetch (Bearer attached) and hands the blob to the browser's save
// dialog. See src/lib/download.ts.

import { useState } from "react";
import { downloadFile } from "@/lib/download";

export default function DownloadPdfButton({
  parcelId,
  plotNumber,
}: {
  parcelId: string;
  plotNumber: string;
}) {
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  return (
    <div className="flex flex-col items-end gap-1">
      <button
        type="button"
        disabled={busy}
        onClick={async () => {
          setErr(null);
          setBusy(true);
          try {
            await downloadFile(
              `/api/parcels/${parcelId}/pdf`,
              `plot-${plotNumber}-affection-plan.pdf`,
            );
          } catch {
            setErr("Download failed");
          } finally {
            setBusy(false);
          }
        }}
        className="text-xs px-3 py-1 rounded-lg bg-gray-800 hover:bg-gray-700 border border-gray-700 disabled:opacity-60 disabled:cursor-not-allowed"
      >
        {busy ? "Downloading…" : "Download Official PDF"}
      </button>
      {err && <span className="text-[10px] text-red-400">{err}</span>}
    </div>
  );
}
