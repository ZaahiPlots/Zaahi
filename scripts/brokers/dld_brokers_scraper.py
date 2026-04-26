#!/usr/bin/env python3
"""
ZAAHI · DLD Dubai broker registry scraper.

Acquires the licensed brokerage office + individual broker registry from
Dubai Land Department (DLD) and writes PDPL-filtered CSVs to:
  data/processed/brokers/dubai_brokerages.csv
  data/processed/brokers/dubai_agents.csv

WHY THIS SCRIPT EXISTS
----------------------
The DLD broker portals at https://trakheesi.dubailand.gov.ae/dubaibrokers/
and https://dubailand.gov.ae/en/eservices/licensed-real-estate-brokers/...
are React SPAs that load data from an authenticated API gateway:
  https://gateway.dubailand.gov.ae/classification/api/brokerage/{office,card}/classification/detail/verified
  https://gateway.dubailand.gov.ae/TABURESTAPI/api/OnlineTransaction/Procedures/GetAllRtOffices

These endpoints return HTTP 401 Unauthorized to anonymous requests.
Per DLD documentation, programmatic access requires:
  → A DLD business account (free to register)
  → API Gateway subscription via https://dubailand.gov.ae/en/eservices/api-gateway/
  → Bearer token attached as Authorization header

THIS SCRIPT MUST RUN ON Жан's LOCAL MACHINE — not the ZAAHI agent sandbox,
which is firewalled away from authenticated DLD access.

USAGE (Жан, on Getac X600 Server after delivery)
-----------------------------------------------
  1. Register a DLD business account at https://dubailand.gov.ae/en/dubai-rest/
     (free; uses Emirates ID OR Pass UAE).
  2. Request Dubai Brokers API access via API Gateway portal:
     https://dubailand.gov.ae/en/eservices/api-gateway/
  3. Once approved, copy the Bearer token from the API Gateway dashboard.
  4. Export it:
       export DLD_API_TOKEN="eyJhbGc...your-jwt-here..."
  5. Run from repo root:
       python3 scripts/brokers/dld_brokers_scraper.py

ALTERNATIVE — browser-session cookie capture (no API account needed)
------------------------------------------------------------------
  1. Log in at https://trakheesi.dubailand.gov.ae/dubaibrokers/ in a normal
     browser (Chrome / Firefox).
  2. DevTools → Network tab → filter by "broker" → reload the page.
  3. Right-click the request to /api/brokerage/office/... → Copy → Copy as cURL.
  4. Extract the `Cookie:` and `Authorization:` headers.
  5. Export them:
       export DLD_API_COOKIE="ARRAffinity=...; .AspNetCore.Antiforgery..."
       export DLD_API_TOKEN="Bearer xyz..."
  6. Run as above.

PDPL COMPLIANCE NOTES
---------------------
Per UAE Federal Law 45/2021 (Personal Data Protection Law), this script:
  - INCLUDES: company-level data (RERA office number, company name EN/AR,
    trade licence, status, registration/expiry dates, business address,
    business phone, business email, website) — these are PUBLIC regulatory
    facts published on the DLD registry by design.
  - INCLUDES: individual broker BRN, full name, brokerage affiliation,
    status, registration/expiry — these are PUBLIC regulatory facts.
  - EXCLUDES: personal mobile numbers, personal email addresses (gmail/
    hotmail/yahoo), photos, ID numbers, residential addresses. The script
    explicitly redacts these in the `_pdpl_filter_*` helpers and adds a
    `pdpl_compliance_note` column for any redaction applied.
  - LOGS: every redaction with the reason, in data/raw/brokers/pdpl_audit.log

RATE LIMITING
-------------
Sleeps DLD_REQUEST_DELAY_S between requests (default 1.5 seconds). Adjust
via env var. DO NOT hammer the gateway — DLD WILL ban the IP, and this
is a long-term ZAAHI partnership channel.

OUTPUT
------
  data/processed/brokers/dubai_brokerages.csv   (per CSV schema in docs/research/broker-registry-acquisition-log.md §3)
  data/processed/brokers/dubai_agents.csv       (per CSV schema)
  data/raw/brokers/dld_brokerages_raw_<date>.json    (gitignored — backup of API response)
  data/raw/brokers/dld_agents_raw_<date>.json        (gitignored)
  data/raw/brokers/pdpl_audit.log                    (gitignored — redaction audit trail)
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
from typing import Any, Iterable

try:
    import requests
except ImportError:
    sys.exit(
        "FATAL: `requests` not installed. Run: pip install requests\n"
        "(On Жан's Getac, prefer a venv: python3 -m venv .venv && "
        "source .venv/bin/activate && pip install requests)"
    )

REPO_ROOT = Path(__file__).resolve().parent.parent.parent
PROCESSED_DIR = REPO_ROOT / "data" / "processed" / "brokers"
RAW_DIR = REPO_ROOT / "data" / "raw" / "brokers"
PROCESSED_DIR.mkdir(parents=True, exist_ok=True)
RAW_DIR.mkdir(parents=True, exist_ok=True)

# Endpoints discovered from the DLD licensed-brokers list page HTML
# (https://dubailand.gov.ae/en/eservices/licensed-real-estate-brokers/licensed-real-estate-brokers-list)
# inline JavaScript references on 2026-04-26.
GATEWAY_BASE = "https://gateway.dubailand.gov.ae"
ENDPOINTS = {
    "brokerage_offices": f"{GATEWAY_BASE}/classification/api/brokerage/office/classification/detail/verified",
    "broker_cards": f"{GATEWAY_BASE}/classification/api/brokerage/card/classification/detail/verified",
    "rt_offices": f"{GATEWAY_BASE}/TABURESTAPI/api/OnlineTransaction/Procedures/GetAllRtOffices",
}

# Personal email domains to strip per PDPL (these are not business addresses)
PERSONAL_EMAIL_DOMAINS = {
    "gmail.com", "hotmail.com", "yahoo.com", "outlook.com", "live.com",
    "icloud.com", "me.com", "aol.com", "proton.me", "protonmail.com",
    "rediffmail.com", "yandex.com", "yandex.ru", "mail.ru", "qq.com",
    "163.com", "126.com", "msn.com",
}

# Land + commercial keywords for LAND_SPECIALIST flag detection
LAND_KEYWORDS = re.compile(
    r"\b(land|plot|plots|commercial|investment|industrial|warehouse|"
    r"off[\s\-]?plan|mixed[\s\-]?use|hospitality|hotel|retail|office)\b",
    re.IGNORECASE,
)

DELAY_S = float(os.environ.get("DLD_REQUEST_DELAY_S", "1.5"))
TOKEN = os.environ.get("DLD_API_TOKEN", "")
COOKIE = os.environ.get("DLD_API_COOKIE", "")
RETRIEVED_DATE = datetime.now(timezone.utc).date().isoformat()

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(message)s",
)
log = logging.getLogger("dld-brokers")

pdpl_audit = open(RAW_DIR / "pdpl_audit.log", "a", encoding="utf-8")
pdpl_audit.write(f"\n=== Run {datetime.now(timezone.utc).isoformat()} ===\n")


def _build_session() -> requests.Session:
    if not TOKEN:
        log.error("DLD_API_TOKEN not set. See module docstring for auth flow.")
        sys.exit(2)
    s = requests.Session()
    s.headers.update({
        "User-Agent": "ZAAHI-broker-registry-acquisition/1.0 (contact: zhanrysbayev@gmail.com)",
        "Accept": "application/json",
        "Authorization": TOKEN if TOKEN.lower().startswith("bearer ") else f"Bearer {TOKEN}",
    })
    if COOKIE:
        s.headers["Cookie"] = COOKIE
    return s


def _normalise_phone(raw: str | None) -> str:
    """E.164 normalisation for UAE numbers: +971XXXXXXXXX"""
    if not raw:
        return ""
    digits = re.sub(r"\D", "", str(raw))
    if not digits:
        return ""
    # Already +971 format
    if digits.startswith("971"):
        return f"+{digits}"
    # Local format starting with 0
    if digits.startswith("0") and len(digits) >= 9:
        return f"+971{digits[1:]}"
    # Already 9-digit local format without leading 0
    if len(digits) == 9 and digits[0] in "234567":
        return f"+971{digits}"
    # Unknown — keep raw digits but flag
    return digits


def _is_personal_email(email: str | None) -> bool:
    if not email or "@" not in email:
        return False
    domain = email.rsplit("@", 1)[-1].strip().lower()
    return domain in PERSONAL_EMAIL_DOMAINS


def _audit_redaction(reason: str, field: str, value: Any, context: dict) -> None:
    pdpl_audit.write(
        f"REDACTED field={field!r} reason={reason!r} value={value!r} "
        f"context_id={context.get('rera_office_number') or context.get('brn') or '?'}\n"
    )


def _filter_brokerage(raw: dict) -> dict:
    """Apply PDPL filtering to a brokerage row + tag land specialist."""
    out: dict[str, Any] = {
        "rera_office_number": str(raw.get("rera_office_number") or raw.get("officeNumber") or "").strip(),
        "company_name_en": (raw.get("name_en") or raw.get("nameEn") or "").strip(),
        "company_name_ar": (raw.get("name_ar") or raw.get("nameAr") or "").strip(),
        "trade_licence": (raw.get("trade_license") or raw.get("tradeLicense") or "").strip(),
        "status": (raw.get("status") or "").strip().upper(),
        "registration_date": (raw.get("registration_date") or raw.get("regDate") or "").strip(),
        "expiry_date": (raw.get("expiry_date") or raw.get("expDate") or "").strip(),
        "address": (raw.get("address") or "").strip(),
        "phone_office": _normalise_phone(raw.get("phone") or raw.get("officePhone")),
        "email_office": "",
        "website": (raw.get("website") or "").strip(),
        "specialisation_tags": "",
        "land_specialist_flag": "",
        "source_url": ENDPOINTS["brokerage_offices"],
        "retrieved_date": RETRIEVED_DATE,
        "pdpl_compliance_note": "",
    }

    # Email — exclude if personal domain
    raw_email = (raw.get("email") or raw.get("officeEmail") or "").strip()
    if raw_email:
        if _is_personal_email(raw_email):
            _audit_redaction("personal_email_domain", "email_office", raw_email, out)
            out["pdpl_compliance_note"] = "email_office redacted: personal domain"
        else:
            out["email_office"] = raw_email

    # Specialisation tags / land flag from name + activity description
    activity = " ".join(filter(None, [
        out["company_name_en"],
        raw.get("activity_description") or raw.get("activityDescription") or "",
        " ".join(raw.get("specialisation_tags") or []) if isinstance(raw.get("specialisation_tags"), list) else (raw.get("specialisation_tags") or ""),
    ]))
    matches = LAND_KEYWORDS.findall(activity)
    if matches:
        out["specialisation_tags"] = ",".join(sorted(set(m.lower() for m in matches)))
        out["land_specialist_flag"] = "TRUE"
    else:
        out["land_specialist_flag"] = "FALSE"

    return out


def _filter_agent(raw: dict) -> dict:
    """Apply PDPL filtering to an individual broker row."""
    out: dict[str, Any] = {
        "brn": str(raw.get("brn") or raw.get("BRN") or "").strip(),
        "full_name_en": (raw.get("name_en") or raw.get("nameEn") or raw.get("fullName") or "").strip(),
        "full_name_ar": (raw.get("name_ar") or raw.get("nameAr") or "").strip(),
        "brokerage_company": (raw.get("brokerage") or raw.get("officeName") or "").strip(),
        "brokerage_rera_number": str(raw.get("brokerage_rera") or raw.get("officeNumber") or "").strip(),
        "status": (raw.get("status") or "").strip().upper(),
        "nationality_if_public": (raw.get("nationality") or "").strip() if raw.get("publish_nationality") else "",
        "registration_date": (raw.get("registration_date") or "").strip(),
        "expiry_date": (raw.get("expiry_date") or "").strip(),
        "specialisation_if_listed": (raw.get("specialisation") or "").strip(),
        "source_url": ENDPOINTS["broker_cards"],
        "retrieved_date": RETRIEVED_DATE,
        "pdpl_compliance_note": "",
    }

    # Per PDPL: never include personal mobile, personal email, photo URL,
    # ID document numbers, residential address. Audit any seen.
    for sensitive in ("mobile", "personal_email", "photo_url", "id_number", "residence_address"):
        if raw.get(sensitive):
            _audit_redaction("sensitive_personal_field", sensitive, raw[sensitive], out)
            out["pdpl_compliance_note"] = (
                f"{out['pdpl_compliance_note']}; {sensitive} redacted"
                if out["pdpl_compliance_note"]
                else f"{sensitive} redacted"
            )

    return out


def _fetch_paginated(session: requests.Session, url: str, page_size: int = 500) -> Iterable[dict]:
    """
    Fetch all pages from a DLD endpoint that supports ?page=N&pageSize=K.
    Adjust the parameter names if the actual endpoint uses different keys —
    e.g. {"PageNumber":1, "PageSize":500} or POST body. Inspect the
    DevTools network tab on a logged-in session to confirm.
    """
    page = 1
    while True:
        params = {"page": page, "pageSize": page_size}
        log.info("GET %s page=%d", url, page)
        r = session.get(url, params=params, timeout=60)
        if r.status_code == 401:
            log.error("401 Unauthorized — token expired or insufficient scope. "
                      "Re-export DLD_API_TOKEN.")
            sys.exit(3)
        if r.status_code == 429:
            log.warning("429 Too Many Requests — back off for 30s")
            time.sleep(30)
            continue
        r.raise_for_status()
        data = r.json()
        rows = data.get("items") or data.get("results") or data.get("data") or []
        if not rows:
            log.info("Page %d returned 0 rows — done.", page)
            break
        for row in rows:
            yield row
        if len(rows) < page_size:
            break
        page += 1
        time.sleep(DELAY_S)


def _write_csv(path: Path, rows: list[dict], fieldnames: list[str]) -> None:
    rows = sorted(rows, key=lambda r: (r.get(fieldnames[0]) or "", r.get(fieldnames[1]) or ""))
    with open(path, "w", encoding="utf-8", newline="") as f:
        w = csv.DictWriter(f, fieldnames=fieldnames)
        w.writeheader()
        for row in rows:
            w.writerow({k: row.get(k, "") for k in fieldnames})
    log.info("Wrote %d rows → %s", len(rows), path)


def main() -> None:
    session = _build_session()

    log.info("=== Fetching brokerage offices ===")
    offices_raw: list[dict] = []
    try:
        for row in _fetch_paginated(session, ENDPOINTS["brokerage_offices"]):
            offices_raw.append(row)
    except Exception as e:
        log.error("Brokerage office fetch failed: %s", e)

    if offices_raw:
        with open(RAW_DIR / f"dld_brokerages_raw_{RETRIEVED_DATE}.json", "w", encoding="utf-8") as f:
            json.dump(offices_raw, f, indent=2, ensure_ascii=False)

    # Deduplicate on RERA office number
    by_rera: dict[str, dict] = {}
    for row in offices_raw:
        filtered = _filter_brokerage(row)
        key = filtered["rera_office_number"]
        if key:
            by_rera[key] = filtered

    _write_csv(
        PROCESSED_DIR / "dubai_brokerages.csv",
        list(by_rera.values()),
        [
            "rera_office_number", "company_name_en", "company_name_ar",
            "trade_licence", "status", "registration_date", "expiry_date",
            "address", "phone_office", "email_office", "website",
            "specialisation_tags", "land_specialist_flag",
            "source_url", "retrieved_date", "pdpl_compliance_note",
        ],
    )

    log.info("=== Fetching broker cards (individuals) ===")
    cards_raw: list[dict] = []
    try:
        for row in _fetch_paginated(session, ENDPOINTS["broker_cards"]):
            cards_raw.append(row)
    except Exception as e:
        log.error("Broker card fetch failed: %s", e)

    if cards_raw:
        with open(RAW_DIR / f"dld_agents_raw_{RETRIEVED_DATE}.json", "w", encoding="utf-8") as f:
            json.dump(cards_raw, f, indent=2, ensure_ascii=False)

    by_brn: dict[str, dict] = {}
    for row in cards_raw:
        filtered = _filter_agent(row)
        key = filtered["brn"]
        if key:
            by_brn[key] = filtered

    _write_csv(
        PROCESSED_DIR / "dubai_agents.csv",
        list(by_brn.values()),
        [
            "brn", "full_name_en", "full_name_ar", "brokerage_company",
            "brokerage_rera_number", "status", "nationality_if_public",
            "registration_date", "expiry_date", "specialisation_if_listed",
            "source_url", "retrieved_date", "pdpl_compliance_note",
        ],
    )

    pdpl_audit.close()
    log.info("Done. PDPL audit log: %s", RAW_DIR / "pdpl_audit.log")


if __name__ == "__main__":
    main()
