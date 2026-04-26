#!/usr/bin/env python3
"""
ZAAHI · ADREC Abu Dhabi broker registry scraper (Playwright-based).

Acquires the licensed brokerage + individual agent registry from
Abu Dhabi Real Estate Centre (ADREC) and writes PDPL-filtered CSVs to:
  data/processed/brokers/abudhabi_brokerages.csv
  data/processed/brokers/abudhabi_agents.csv

WHY PLAYWRIGHT
--------------
The ADREC public agents page at https://adrec.gov.ae/en/re_agents is a
JavaScript-rendered SPA. The agent table is loaded dynamically after page
load. A simple `requests.get()` returns the empty SPA shell.

This script uses Playwright to render the page in a headless browser, wait
for the agent table to populate, then extract rows and paginate.

THIS SCRIPT MUST RUN ON Жан's LOCAL MACHINE — not the ZAAHI agent sandbox.

USAGE (Жан, on Getac X600 Server after delivery)
-----------------------------------------------
  1. Install Playwright + browsers:
       pip install playwright
       playwright install chromium
  2. Run from repo root:
       python3 scripts/brokers/adrec_brokers_scraper.py
  3. If ADREC has a separate brokerage-companies page, set its URL:
       export ADREC_OFFICES_URL="https://adrec.gov.ae/en/re_offices"
       (URL discovery via DevTools network tab on the public site)

PDPL COMPLIANCE NOTES
---------------------
Same PDPL filtering rules as dld_brokers_scraper.py:
  - INCLUDES company-level + public regulatory facts
  - EXCLUDES personal mobile, personal email, photo, ID, residential address
  - LOGS every redaction in data/raw/brokers/pdpl_audit.log

RATE LIMITING
-------------
1.5 s delay between page navigations. ADREC is a smaller site than DLD and
likely more sensitive to scraping; be polite.

OUTPUT
------
  data/processed/brokers/abudhabi_brokerages.csv
  data/processed/brokers/abudhabi_agents.csv
  data/raw/brokers/adrec_agents_raw_<date>.json    (gitignored — backup)
  data/raw/brokers/pdpl_audit.log                  (gitignored — appended)

LIMITATION OF THIS SCRIPT
-------------------------
The ADREC SPA HTML structure (CSS selectors, table classes, pagination
controls) was NOT confirmed against a logged-in / fully-rendered session
during the 2026-04-26 sandbox-side acquisition (sandbox cannot run JS).
The selectors below are EDUCATED GUESSES based on the static HTML shell
(e.g. table.agents-table, button.next-page). Жан should:
  1. Run `playwright codegen https://adrec.gov.ae/en/re_agents` to
     interactively click through the page, which auto-generates the
     correct selectors.
  2. Update the SELECTORS dict below to match.
  3. Re-run.
"""

from __future__ import annotations

import csv
import json
import logging
import os
import re
import sys
import time
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

try:
    from playwright.sync_api import sync_playwright, TimeoutError as PWTimeout
except ImportError:
    sys.exit(
        "FATAL: `playwright` not installed. Run:\n"
        "  pip install playwright\n"
        "  playwright install chromium\n"
        "(Жан: prefer a venv per dld_brokers_scraper.py docstring.)"
    )

REPO_ROOT = Path(__file__).resolve().parent.parent.parent
PROCESSED_DIR = REPO_ROOT / "data" / "processed" / "brokers"
RAW_DIR = REPO_ROOT / "data" / "raw" / "brokers"
PROCESSED_DIR.mkdir(parents=True, exist_ok=True)
RAW_DIR.mkdir(parents=True, exist_ok=True)

ADREC_AGENTS_URL = os.environ.get("ADREC_AGENTS_URL", "https://adrec.gov.ae/en/re_agents")
ADREC_OFFICES_URL = os.environ.get("ADREC_OFFICES_URL", "")  # placeholder — Жан discovers
DELAY_S = float(os.environ.get("ADREC_REQUEST_DELAY_S", "1.5"))
RETRIEVED_DATE = datetime.now(timezone.utc).date().isoformat()

# Educated-guess selectors — Жан updates after `playwright codegen` discovery.
SELECTORS = {
    "agent_table": "table.agents-table, table.datatable, table",  # try multiple
    "agent_row": "tbody tr",
    "next_button": "button.next-page, a.next, [aria-label*='next' i]",
    "page_indicator": ".pagination-current, .page-info",
}

# Personal-email domains to strip per PDPL (mirror DLD scraper)
PERSONAL_EMAIL_DOMAINS = {
    "gmail.com", "hotmail.com", "yahoo.com", "outlook.com", "live.com",
    "icloud.com", "me.com", "aol.com", "proton.me", "protonmail.com",
}

LAND_KEYWORDS = re.compile(
    r"\b(land|plot|plots|commercial|investment|industrial|warehouse|"
    r"off[\s\-]?plan|mixed[\s\-]?use|hospitality|hotel|retail|office)\b",
    re.IGNORECASE,
)

logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s")
log = logging.getLogger("adrec-brokers")

pdpl_audit = open(RAW_DIR / "pdpl_audit.log", "a", encoding="utf-8")
pdpl_audit.write(f"\n=== ADREC run {datetime.now(timezone.utc).isoformat()} ===\n")


def _normalise_phone(raw: str | None) -> str:
    if not raw:
        return ""
    digits = re.sub(r"\D", "", str(raw))
    if not digits:
        return ""
    if digits.startswith("971"):
        return f"+{digits}"
    if digits.startswith("0") and len(digits) >= 9:
        return f"+971{digits[1:]}"
    if len(digits) == 9 and digits[0] in "234567":
        return f"+971{digits}"
    return digits


def _is_personal_email(email: str | None) -> bool:
    if not email or "@" not in email:
        return False
    return email.rsplit("@", 1)[-1].strip().lower() in PERSONAL_EMAIL_DOMAINS


def _audit(reason: str, field: str, value: Any, context: dict) -> None:
    pdpl_audit.write(
        f"REDACTED field={field!r} reason={reason!r} value={value!r} "
        f"context_id={context.get('bln') or context.get('brn') or '?'}\n"
    )


def _scrape_agents(page) -> list[dict]:
    """
    Extract agent rows from the ADREC re_agents page across all pagination.
    Жан: confirm SELECTORS against `playwright codegen` output before relying.
    """
    log.info("Navigating to %s", ADREC_AGENTS_URL)
    page.goto(ADREC_AGENTS_URL, timeout=60_000)
    try:
        page.wait_for_selector(SELECTORS["agent_table"], timeout=30_000)
    except PWTimeout:
        log.error("Agent table never loaded. Update SELECTORS via `playwright codegen`.")
        return []

    rows: list[dict] = []
    page_num = 1
    while True:
        log.info("Scraping page %d", page_num)
        # Read table headers + rows once per page
        table_data = page.evaluate(
            """(sel) => {
              const t = document.querySelector(sel);
              if (!t) return null;
              const headers = Array.from(t.querySelectorAll('thead th')).map(h => h.textContent.trim());
              const rs = Array.from(t.querySelectorAll('tbody tr')).map(tr =>
                Array.from(tr.querySelectorAll('td')).map(td => td.textContent.trim())
              );
              return { headers, rows: rs };
            }""",
            SELECTORS["agent_table"],
        )
        if not table_data or not table_data.get("rows"):
            break
        headers = [h.lower().replace(" ", "_") for h in table_data["headers"]]
        for r in table_data["rows"]:
            rows.append(dict(zip(headers, r)))

        # Try to click next-page
        nxt = page.query_selector(SELECTORS["next_button"])
        if nxt and nxt.is_enabled():
            try:
                nxt.click()
                page.wait_for_load_state("networkidle", timeout=20_000)
                time.sleep(DELAY_S)
                page_num += 1
            except PWTimeout:
                break
        else:
            break

    log.info("Collected %d agent rows from %d pages", len(rows), page_num)
    return rows


def _filter_agent_adrec(raw: dict) -> dict:
    """ADREC agent rows → PDPL-filtered CSV row."""
    # ADREC field naming likely differs from DLD; map by best-guess header keys.
    out: dict[str, Any] = {
        "brn": str(raw.get("bln") or raw.get("license_number") or raw.get("license") or "").strip(),
        "full_name_en": (raw.get("name") or raw.get("agent_name") or raw.get("full_name") or "").strip(),
        "full_name_ar": (raw.get("name_ar") or raw.get("arabic_name") or "").strip(),
        "brokerage_company": (raw.get("company") or raw.get("brokerage") or raw.get("office") or "").strip(),
        "brokerage_rera_number": str(raw.get("company_license") or raw.get("office_number") or "").strip(),
        "status": (raw.get("status") or raw.get("license_status") or "").strip().upper(),
        "nationality_if_public": (raw.get("nationality") or "").strip() if raw.get("publish_nationality") else "",
        "registration_date": (raw.get("issue_date") or raw.get("registration_date") or "").strip(),
        "expiry_date": (raw.get("expiry_date") or raw.get("validity") or "").strip(),
        "specialisation_if_listed": (raw.get("specialisation") or raw.get("activity") or "").strip(),
        "source_url": ADREC_AGENTS_URL,
        "retrieved_date": RETRIEVED_DATE,
        "pdpl_compliance_note": "",
    }
    for sensitive in ("mobile", "personal_email", "photo_url", "id_number", "residence_address"):
        if raw.get(sensitive):
            _audit("sensitive_personal_field", sensitive, raw[sensitive], out)
            out["pdpl_compliance_note"] = (
                f"{out['pdpl_compliance_note']}; {sensitive} redacted"
                if out["pdpl_compliance_note"]
                else f"{sensitive} redacted"
            )
    return out


def _write_csv(path: Path, rows: list[dict], fieldnames: list[str]) -> None:
    rows = sorted(rows, key=lambda r: (r.get(fieldnames[0]) or "", r.get(fieldnames[1]) or ""))
    with open(path, "w", encoding="utf-8", newline="") as f:
        w = csv.DictWriter(f, fieldnames=fieldnames)
        w.writeheader()
        for row in rows:
            w.writerow({k: row.get(k, "") for k in fieldnames})
    log.info("Wrote %d rows → %s", len(rows), path)


def main() -> None:
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        ctx = browser.new_context(
            user_agent="ZAAHI-broker-registry-acquisition/1.0 (contact: zhanrysbayev@gmail.com)",
        )
        page = ctx.new_page()

        log.info("=== Scraping ADREC agents ===")
        agents_raw = _scrape_agents(page)

        if agents_raw:
            with open(RAW_DIR / f"adrec_agents_raw_{RETRIEVED_DATE}.json", "w", encoding="utf-8") as f:
                json.dump(agents_raw, f, indent=2, ensure_ascii=False)

        by_brn: dict[str, dict] = {}
        for row in agents_raw:
            filtered = _filter_agent_adrec(row)
            key = filtered["brn"]
            if key:
                by_brn[key] = filtered

        _write_csv(
            PROCESSED_DIR / "abudhabi_agents.csv",
            list(by_brn.values()),
            [
                "brn", "full_name_en", "full_name_ar", "brokerage_company",
                "brokerage_rera_number", "status", "nationality_if_public",
                "registration_date", "expiry_date", "specialisation_if_listed",
                "source_url", "retrieved_date", "pdpl_compliance_note",
            ],
        )

        # Brokerage-offices URL: Жан discovers via DevTools, sets ADREC_OFFICES_URL
        if ADREC_OFFICES_URL:
            log.info("=== Scraping ADREC offices (URL: %s) ===", ADREC_OFFICES_URL)
            page.goto(ADREC_OFFICES_URL, timeout=60_000)
            # TODO: same evaluate() pattern as agents — confirm selectors first
            log.warning("Office scrape not yet implemented — Жан adds after selector discovery.")
        else:
            log.warning(
                "ADREC_OFFICES_URL not set — abudhabi_brokerages.csv will be empty. "
                "Discover the URL via DevTools on adrec.gov.ae and re-run with: "
                "export ADREC_OFFICES_URL=..."
            )

        # Always write the brokerages CSV (empty schema-only if no data)
        _write_csv(
            PROCESSED_DIR / "abudhabi_brokerages.csv",
            [],
            [
                "rera_office_number", "company_name_en", "company_name_ar",
                "trade_licence", "status", "registration_date", "expiry_date",
                "address", "phone_office", "email_office", "website",
                "specialisation_tags", "land_specialist_flag",
                "source_url", "retrieved_date", "pdpl_compliance_note",
            ],
        )

        browser.close()

    pdpl_audit.close()
    log.info("Done. PDPL audit log: %s", RAW_DIR / "pdpl_audit.log")


if __name__ == "__main__":
    main()
