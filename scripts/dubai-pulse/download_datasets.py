#!/usr/bin/env python3
"""
ZAAHI · Dubai Pulse open-data downloader (9 DLD datasets).

Downloads the 9 free Dubai Land Department CSV datasets from the data.dubai
Liferay portal (which Dubai Pulse migrated to in 2025-2026):

  Transactions · Rents · Projects · Valuations · Land · Buildings · Units ·
  Brokers · Developers

Output:
  data/raw/dubai-pulse/<dataset_slug>_<YYYY-MM-DD>.csv

WHY PLAYWRIGHT (and not plain `requests`)
-----------------------------------------
The data.dubai portal is a Liferay React SPA. Direct CSV download URLs are
session-signed and only generated after the user navigates to the dataset
page in a JavaScript-enabled browser and clicks the "Download" button.
Probed 2026-04-27 in agent sandbox:
  - /documents/<groupId>/<docId>     → 404 (no anonymous file paths)
  - /api, /api/v1, /o/api*            → 404 / 200 OAuth shell only
  - /o/data-engine/v2.0/...           → 404 (Liferay headless API not exposed)
  - dubaipulse.gov.ae legacy paths    → 200 SPA shell (path stripped on redirect)
  - All dataset URLs                  → 200 home-page shell

Plain `requests` returns the SPA shell only; no CSV body. Therefore this
script uses Playwright to render the dataset page in headless Chromium,
click the Download button, and save the resulting CSV via a Playwright
download event. This is the SAME pattern documented in
scripts/brokers/adrec_brokers_scraper.py for ADREC's similar SPA.

If Playwright is unacceptable in your environment, see `--manual` flag for
the manual-download fallback (Жан downloads via browser, places CSV in
data/raw/dubai-pulse/, the script registers it for normalize.py).

USAGE
-----
  # First-time setup (once per Getac):
  pip install playwright requests
  playwright install chromium

  # Standard run — download all 9 datasets (~5-15 min depending on file sizes):
  python3 scripts/dubai-pulse/download_datasets.py

  # Subset — only datasets matching pattern:
  python3 scripts/dubai-pulse/download_datasets.py --datasets brokers,transactions

  # Dry-run — print what would be downloaded, don't actually fetch:
  python3 scripts/dubai-pulse/download_datasets.py --dry-run

  # Manual fallback — Жан downloads via browser, places CSV in raw/, this
  # script just stamps the metadata sidecar file for normalize.py:
  python3 scripts/dubai-pulse/download_datasets.py --manual

  # Force re-download even if today's file already exists:
  python3 scripts/dubai-pulse/download_datasets.py --force

  # Show this help:
  python3 scripts/dubai-pulse/download_datasets.py --help

ENV VARS
--------
  DUBAI_PULSE_DELAY_S          delay between downloads (default 2.0)
  DUBAI_PULSE_HEADLESS         "1" headless (default) or "0" headed (debug)
  DUBAI_PULSE_TIMEOUT_S        per-page timeout (default 90)

NOTES
-----
- Refreshes are MONTHLY at the source (DLD updates these CSVs roughly once
  per month). Running daily wastes bandwidth + portal politeness budget.
  Recommend cron weekly OR manual-trigger via refresh.sh.
- Dataset URL slugs below were verified accessible (HTTP 200 to the page)
  on 2026-04-27 from sandbox. The actual CSV download is the click-target
  Playwright executes per the SELECTORS dict — Жан confirms via
  `playwright codegen https://www.dubaipulse.gov.ae/data/dld-licenses/dld_real_estate_licenses-open`
  on first run if the SPA's button selector has shifted.

PDPL
----
This script downloads RAW DLD data, which includes personal data (broker
names, owner names in Transactions). The raw CSVs go to data/raw/dubai-pulse/
which is .gitignored (see data/raw/dubai-pulse/README.md). Personal-data
filtering happens in scripts/dubai-pulse/normalize.py.
"""

from __future__ import annotations

import argparse
import json
import logging
import os
import sys
import time
from dataclasses import dataclass
from datetime import datetime, timezone
from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parent.parent.parent
RAW_DIR = REPO_ROOT / "data" / "raw" / "dubai-pulse"
RAW_DIR.mkdir(parents=True, exist_ok=True)

DELAY_S = float(os.environ.get("DUBAI_PULSE_DELAY_S", "2.0"))
HEADLESS = os.environ.get("DUBAI_PULSE_HEADLESS", "1") == "1"
TIMEOUT_S = float(os.environ.get("DUBAI_PULSE_TIMEOUT_S", "90"))
RETRIEVED_DATE = datetime.now(timezone.utc).date().isoformat()

logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s")
log = logging.getLogger("dubai-pulse-download")


@dataclass(frozen=True)
class Dataset:
    """One DLD dataset on Dubai Pulse / data.dubai."""
    slug: str            # ZAAHI internal name (filename + log key)
    label: str           # human label for logs
    portal_url: str      # the dataset landing page Жан/the script navigates to
    csv_filename: str    # output CSV name in raw/

DATASETS: list[Dataset] = [
    Dataset("brokers", "DLD Real Estate Licenses (Brokers)",
            "https://www.dubaipulse.gov.ae/data/dld-licenses/dld_real_estate_licenses-open",
            f"brokers_{RETRIEVED_DATE}.csv"),
    Dataset("transactions", "DLD Real Estate Transactions",
            "https://www.dubaipulse.gov.ae/data/dld-transactions/dld_transactions-open",
            f"transactions_{RETRIEVED_DATE}.csv"),
    Dataset("rents", "DLD Rent Contracts (Ejari)",
            "https://www.dubaipulse.gov.ae/data/dld-registration/dld_rent_contracts-open",
            f"rents_{RETRIEVED_DATE}.csv"),
    Dataset("projects", "DLD Projects",
            "https://www.dubaipulse.gov.ae/data/dld-registration/dld_projects-open",
            f"projects_{RETRIEVED_DATE}.csv"),
    Dataset("units", "DLD Units",
            "https://www.dubaipulse.gov.ae/data/dld-registration/dld_units-open",
            f"units_{RETRIEVED_DATE}.csv"),
    Dataset("land_registry", "DLD Land Registry",
            "https://www.dubaipulse.gov.ae/data/dld-registration/dld_land_registry-open-api",
            f"land_registry_{RETRIEVED_DATE}.csv"),
    # The next 3 are listed on the DLD Real Estate Open Data hub
    # (https://dubailand.gov.ae/en/open-data/real-estate-data/) but their
    # specific Dubai Pulse slugs were not surfaced in 2026-04-27 search.
    # Жан confirms exact slug on first run via the hub's tab navigation
    # (Valuations / Buildings / Developers tabs) and updates portal_url
    # if these placeholders 404.
    Dataset("valuations", "DLD Real Estate Valuations",
            "https://dubailand.gov.ae/en/open-data/real-estate-data/",
            f"valuations_{RETRIEVED_DATE}.csv"),
    Dataset("buildings", "DLD Buildings",
            "https://dubailand.gov.ae/en/open-data/real-estate-data/",
            f"buildings_{RETRIEVED_DATE}.csv"),
    Dataset("developers", "DLD Developers",
            "https://dubailand.gov.ae/en/open-data/real-estate-data/",
            f"developers_{RETRIEVED_DATE}.csv"),
]


def parse_args() -> argparse.Namespace:
    p = argparse.ArgumentParser(
        description="Download DLD open datasets from Dubai Pulse / data.dubai.",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog=__doc__.split("USAGE")[1] if "USAGE" in __doc__ else "",
    )
    p.add_argument("--datasets", default="all",
                   help="Comma-separated dataset slugs (default 'all'). Available: "
                        + ", ".join(d.slug for d in DATASETS))
    p.add_argument("--dry-run", action="store_true",
                   help="Print what would be downloaded; do not fetch.")
    p.add_argument("--manual", action="store_true",
                   help="Skip Playwright; assume Жан manually downloaded CSVs into "
                        "data/raw/dubai-pulse/. Just write metadata sidecars.")
    p.add_argument("--force", action="store_true",
                   help="Re-download even if today's file already exists.")
    p.add_argument("--list", action="store_true",
                   help="List configured datasets and exit.")
    return p.parse_args()


def selected(args: argparse.Namespace) -> list[Dataset]:
    if args.datasets == "all":
        return DATASETS
    requested = {s.strip().lower() for s in args.datasets.split(",")}
    chosen = [d for d in DATASETS if d.slug in requested]
    unknown = requested - {d.slug for d in chosen}
    if unknown:
        log.warning("Unknown dataset slug(s) ignored: %s", ", ".join(unknown))
    return chosen


def write_sidecar(dataset: Dataset, status: str, note: str = "") -> None:
    """Write a JSON sidecar file documenting acquisition state — used by normalize.py."""
    sidecar = RAW_DIR / f"{dataset.slug}_{RETRIEVED_DATE}.meta.json"
    sidecar.write_text(json.dumps({
        "slug": dataset.slug,
        "label": dataset.label,
        "portal_url": dataset.portal_url,
        "csv_filename": dataset.csv_filename,
        "status": status,
        "retrieved_date": RETRIEVED_DATE,
        "note": note,
    }, indent=2, ensure_ascii=False))


def already_have_today(dataset: Dataset) -> bool:
    target = RAW_DIR / dataset.csv_filename
    return target.exists() and target.stat().st_size > 0


def download_with_playwright(datasets: list[Dataset], force: bool) -> int:
    """Returns number of datasets successfully downloaded."""
    try:
        from playwright.sync_api import sync_playwright, TimeoutError as PWTimeout
    except ImportError:
        log.error(
            "Playwright not installed. Run:\n"
            "  pip install playwright\n"
            "  playwright install chromium\n"
            "OR run with --manual flag (Жан downloads each CSV via browser first)."
        )
        sys.exit(2)

    succeeded = 0
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=HEADLESS)
        ctx = browser.new_context(
            user_agent="Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 "
                       "(KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
            accept_downloads=True,
        )
        page = ctx.new_page()

        for ds in datasets:
            if not force and already_have_today(ds):
                log.info("[%s] already have today's file — skipping (use --force to re-fetch)", ds.slug)
                succeeded += 1
                continue

            target = RAW_DIR / ds.csv_filename
            log.info("[%s] navigating to %s", ds.slug, ds.portal_url)
            try:
                page.goto(ds.portal_url, timeout=TIMEOUT_S * 1000)
                page.wait_for_load_state("networkidle", timeout=TIMEOUT_S * 1000)
            except PWTimeout:
                log.error("[%s] page load timeout — recording FAIL sidecar", ds.slug)
                write_sidecar(ds, "FAIL", "page-load-timeout")
                continue

            # Try common Liferay download-button selectors. The actual selector
            # may shift; if all fail, Жан runs `playwright codegen <portal_url>`
            # to discover the correct one and updates this list.
            download_clicked = False
            selectors_to_try = [
                "a[href*='.csv']",
                "a:has-text('Download')",
                "a:has-text('CSV')",
                "button:has-text('Download')",
                "[aria-label*='download' i]",
                ".download-button",
                ".btn-download",
            ]
            for sel in selectors_to_try:
                try:
                    el = page.query_selector(sel)
                    if el and el.is_visible():
                        log.info("[%s] clicking selector: %s", ds.slug, sel)
                        with page.expect_download(timeout=TIMEOUT_S * 1000) as dl_info:
                            el.click()
                        download = dl_info.value
                        download.save_as(str(target))
                        size = target.stat().st_size
                        log.info("[%s] saved %d bytes → %s", ds.slug, size, target.name)
                        write_sidecar(ds, "OK", f"size={size}")
                        succeeded += 1
                        download_clicked = True
                        break
                except PWTimeout:
                    log.warning("[%s] selector %s timed out — trying next", ds.slug, sel)
                    continue
                except Exception as e:
                    log.warning("[%s] selector %s error: %s — trying next", ds.slug, sel, e)
                    continue

            if not download_clicked:
                log.error("[%s] no download trigger fired. Жан: open the URL in a real browser, "
                          "use DevTools network tab to capture the actual CSV URL, then update "
                          "selectors_to_try in this script. Recording FAIL.", ds.slug)
                write_sidecar(ds, "FAIL", "no-download-selector-matched")

            time.sleep(DELAY_S)

        browser.close()
    return succeeded


def manual_mode(datasets: list[Dataset]) -> int:
    """Жан downloaded CSVs manually; we just write sidecars for present files."""
    log.info("Manual mode: scanning %s for pre-placed CSVs", RAW_DIR)
    found = 0
    for ds in datasets:
        target = RAW_DIR / ds.csv_filename
        if target.exists() and target.stat().st_size > 0:
            size = target.stat().st_size
            write_sidecar(ds, "OK_MANUAL", f"size={size}")
            log.info("[%s] manual file confirmed: %d bytes", ds.slug, size)
            found += 1
        else:
            write_sidecar(ds, "MISSING_MANUAL",
                          f"expected file not found: {ds.csv_filename}")
            log.warning("[%s] expected file missing: %s", ds.slug, target.name)
    return found


def main() -> None:
    args = parse_args()
    if args.list:
        print("Configured datasets:")
        for d in DATASETS:
            print(f"  {d.slug:<14}  {d.label}")
            print(f"                 {d.portal_url}")
        return

    chosen = selected(args)
    if not chosen:
        log.error("No datasets selected. Use --list to see available slugs.")
        sys.exit(1)

    if args.dry_run:
        log.info("DRY-RUN — would process %d datasets:", len(chosen))
        for d in chosen:
            log.info("  %s ← %s", d.csv_filename, d.portal_url)
        return

    if args.manual:
        n = manual_mode(chosen)
    else:
        n = download_with_playwright(chosen, args.force)

    log.info("Done. %d/%d datasets handled this run.", n, len(chosen))
    if n < len(chosen):
        log.warning("Some datasets failed — see sidecar .meta.json files in %s", RAW_DIR)
        sys.exit(3)


if __name__ == "__main__":
    main()
