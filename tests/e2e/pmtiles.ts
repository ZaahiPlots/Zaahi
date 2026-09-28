// Serves the local DDA PMTiles archive to the map (the shared harness aborts
// /tiles/** to avoid pulling ~350 MB). Specs that need real plot features call
// this AFTER installHarness() so it takes precedence over the abort route.

import { openSync, readSync, fstatSync, closeSync } from "node:fs";
import type { Page } from "@playwright/test";

export const DDA_PMTILES = "public/tiles/dda-land.pmtiles";

/** Serves the local PMTiles archive with HTTP Range support. */
export async function serveLocalPmtiles(page: Page) {
  await page.route("**/tiles/dda-land.pmtiles", (route) => {
    const fd = openSync(DDA_PMTILES, "r");
    try {
      const size = fstatSync(fd).size;
      const m = /bytes=(\d+)-(\d*)/.exec(route.request().headers()["range"] ?? "");
      const start = m ? Number(m[1]) : 0;
      const end = m && m[2] ? Math.min(Number(m[2]), size - 1) : size - 1;
      const buf = Buffer.alloc(end - start + 1);
      readSync(fd, buf, 0, buf.length, start);
      return route.fulfill({
        status: m ? 206 : 200,
        body: buf,
        headers: {
          "content-type": "application/octet-stream",
          "accept-ranges": "bytes",
          "content-range": `bytes ${start}-${end}/${size}`,
          "access-control-allow-origin": "*",
        },
      });
    } finally {
      closeSync(fd);
    }
  });
}
