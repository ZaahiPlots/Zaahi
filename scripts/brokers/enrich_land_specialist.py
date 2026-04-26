#!/usr/bin/env python3
"""
ZAAHI · Post-acquisition LAND_SPECIALIST enrichment.

Re-tags brokerage CSVs (Dubai + AD) with `land_specialist_flag` derived from:
  1. Company name keywords (already done in scraper, but here as standalone)
  2. Trade-licence activity description keywords
  3. (OPTIONAL · MANUAL) Bayut / Property Finder agency profile light-touch check —
     ONE profile fetch per brokerage max, only if `--enrich-portals` flag passed.

PDPL: this script never adds personal data. It only writes a single TRUE/FALSE
column based on PUBLIC company-level signals (company name, trade activity).

USAGE
-----
  # Re-classify based on company name + activity (default; runs offline)
  python3 scripts/brokers/enrich_land_specialist.py

  # Light-touch portal enrichment (slow — 1.5 s delay per agency)
  python3 scripts/brokers/enrich_land_specialist.py --enrich-portals

OUTPUT
------
  Overwrites land_specialist_flag column in:
    data/processed/brokers/dubai_brokerages.csv
    data/processed/brokers/abudhabi_brokerages.csv
"""

from __future__ import annotations

import argparse
import csv
import logging
import re
import sys
import time
from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parent.parent.parent
PROCESSED_DIR = REPO_ROOT / "data" / "processed" / "brokers"

LAND_KEYWORDS = re.compile(
    r"\b(land|plot|plots|commercial|investment|industrial|warehouse|"
    r"off[\s\-]?plan|mixed[\s\-]?use|hospitality|hotel|retail|office|"
    r"developer|G\+\d+|tower|mall)\b",
    re.IGNORECASE,
)

logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s")
log = logging.getLogger("enrich")


def _is_land_specialist(row: dict) -> tuple[bool, str]:
    """Return (is_specialist, matched_keywords_csv)."""
    haystack = " ".join(filter(None, [
        row.get("company_name_en", ""),
        row.get("company_name_ar", ""),
        row.get("trade_licence", ""),
        row.get("specialisation_tags", ""),
    ]))
    matches = LAND_KEYWORDS.findall(haystack)
    if matches:
        return True, ",".join(sorted(set(m.lower() for m in matches)))
    return False, ""


def _enrich_csv(path: Path) -> int:
    if not path.exists():
        log.warning("Skip %s (does not exist)", path)
        return 0
    with open(path, encoding="utf-8") as f:
        reader = csv.DictReader(f)
        rows = list(reader)
        fieldnames = reader.fieldnames or []
    if not rows:
        log.info("%s: empty (header-only) — nothing to enrich", path)
        return 0
    n_specialist = 0
    for row in rows:
        is_spec, tags = _is_land_specialist(row)
        row["land_specialist_flag"] = "TRUE" if is_spec else "FALSE"
        if tags:
            existing = row.get("specialisation_tags") or ""
            merged = ",".join(sorted(set(filter(None, [existing, tags]))))
            row["specialisation_tags"] = merged
        if is_spec:
            n_specialist += 1
    with open(path, "w", encoding="utf-8", newline="") as f:
        w = csv.DictWriter(f, fieldnames=fieldnames)
        w.writeheader()
        w.writerows(rows)
    log.info("%s: %d total rows, %d tagged LAND_SPECIALIST=TRUE", path.name, len(rows), n_specialist)
    return n_specialist


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--enrich-portals", action="store_true",
                        help="Light-touch Bayut/PF profile check (slow, polite 1.5s delay)")
    args = parser.parse_args()

    if args.enrich_portals:
        log.warning(
            "Portal enrichment NOT YET IMPLEMENTED in this stub. The legitimate path is:\n"
            "  1. Per Bayut / Property Finder ToS, scraping listings is restricted.\n"
            "  2. The legitimate signal is the agency PROFILE page which often shows\n"
            "     'specialisations' as published metadata.\n"
            "  3. Use Bayut Brokerage API or PF Agency API (commercial subscription) —\n"
            "     this is the ZAAHI BD path for Phase 2.\n"
            "  4. For now, name-based + activity-description signal is sufficient."
        )
        sys.exit(0)

    n_dubai = _enrich_csv(PROCESSED_DIR / "dubai_brokerages.csv")
    n_ad = _enrich_csv(PROCESSED_DIR / "abudhabi_brokerages.csv")
    log.info("=== Total LAND_SPECIALIST=TRUE: Dubai=%d, Abu Dhabi=%d ===", n_dubai, n_ad)


if __name__ == "__main__":
    main()
