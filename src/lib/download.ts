'use client';
import { apiFetch } from './api-fetch';

/**
 * Download a file from a protected API route as a browser file download.
 *
 * Plain `<a href="/api/...">` doesn't work for any endpoint that goes
 * through `getApprovedUserId(req)` — the browser sends the request
 * without an Authorization header and the middleware returns 401.
 *
 * downloadFile uses `apiFetch` so the Bearer token is attached, reads
 * the response into a Blob, and triggers the browser's native "save
 * as" dialog via a temporary <a download> element. Cleans up the
 * object URL on the next tick.
 *
 * Throws on non-2xx so the caller can show an error toast.
 */
export async function downloadFile(url: string, filename: string): Promise<void> {
  const r = await apiFetch(url);
  if (!r.ok) {
    throw new Error(`download failed: HTTP ${r.status}`);
  }
  const blob = await r.blob();
  const blobUrl = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = blobUrl;
  a.download = filename;
  // Some browsers require the link to be in the DOM for the click to fire.
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  // Free the blob on the next event-loop tick.
  setTimeout(() => URL.revokeObjectURL(blobUrl), 0);
}
