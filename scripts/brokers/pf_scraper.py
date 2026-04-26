#!/usr/bin/env python3
"""
ZAAHI · Property Finder broker + agent registry scraper.

Acquires the public broker (companies) + agent (individuals) registry from
Property Finder UAE via the SSR-rendered __NEXT_DATA__ JSON embedded in
each search-results page. Splits by `location` field into Dubai vs Abu
Dhabi CSVs with strict PDPL filtering.

WHY THIS WORKS WHERE BAYUT / DLD DO NOT
---------------------------------------
- Property Finder serves Server-Side-Rendered HTML containing a complete
  __NEXT_DATA__ JSON block with structured broker / agent data — including
  schema.org RealEstateAgent markup explicitly designed for crawlers.
- robots.txt at https://www.propertyfinder.ae/robots.txt does NOT disallow
  /en/find-broker, /en/find-agent, or their /search pagination paths.
- Bayut serves CAPTCHA to anonymous IPs; Dubizzle serves Imperva block;
  DLD gateway requires authenticated business account. PF is the only
  Tier-1 source reachable from this sandbox (probed 2026-04-26).

PAGINATION
----------
- Brokers (companies):    /en/find-broker/search?page=N   — meta reports 4,063 total / 204 pages
- Agents (individuals):   /en/find-agent/search?page=N    — meta reports 5,793 total / 290 pages

PDPL COMPLIANCE
---------------
Per UAE Federal Law 45/2021:
  INCLUDES:
    - Brokerage/agent NAME (public regulatory + commercial directory fact)
    - RERA license number (regulatorily public)
    - Business address (the office address PF lists)
    - Business phone (the office phone PF lists in the `phone` field)
    - Business email — but ONLY if the email domain is NOT a personal
      provider (gmail/hotmail/yahoo/outlook/etc — see PERSONAL_EMAIL_DOMAINS)
    - URL slug (links back to the public PF profile)
    - Total properties / specialisation counts (drives LAND_SPECIALIST flag)
  EXCLUDES:
    - `whatsappPhone` field (a personal mobile per PDPL — explicitly a
      personal-communications channel, even if shared on a business profile)
    - Photos, agent photos, image tokens
    - userId, clientId (internal IDs the user did not consent to syndicate)
    - `experienceSince` (could be cross-referenced with other data to
      identify; out of an abundance of caution exclude — debatable, log decision)

LAND_SPECIALIST FLAG
--------------------
TRUE if the broker/agent has at least 1 commercial listing
  (propertiesCommercialForRentCount + propertiesCommercialForSaleCount > 0)
OR the company name matches the LAND_KEYWORDS regex (land/plot/commercial/
investment/off-plan/mixed-use/hospitality/industrial/warehouse/G+N/tower/mall).
Otherwise FALSE.

USAGE
-----
  python3 scripts/brokers/pf_scraper.py
  # Optional knobs:
  PF_REQUEST_DELAY_S=2.0 python3 scripts/brokers/pf_scraper.py
  PF_MAX_PAGES_BROKERS=10 python3 scripts/brokers/pf_scraper.py     # smoke test
  PF_MAX_PAGES_AGENTS=10 python3 scripts/brokers/pf_scraper.py
  PF_SKIP_AGENTS=1 python3 scripts/brokers/pf_scraper.py             # brokers only

OUTPUT
------
  data/processed/brokers/dubai_brokerages.csv         (Dubai brokerages, ~3500-4000 rows)
  data/processed/brokers/abudhabi_brokerages.csv      (AD brokerages, ~100-500 rows)
  data/processed/brokers/dubai_agents.csv             (Dubai agents, ~5000+ rows)
  data/processed/brokers/abudhabi_agents.csv          (AD agents, ~500-1000 rows)
  data/raw/brokers/pf_brokers_raw_<date>.json         (gitignored — full backup)
  data/raw/brokers/pf_agents_raw_<date>.json          (gitignored)
  data/raw/brokers/pdpl_audit.log                     (gitignored — append-only redaction trail)
"""

from __future__ import annotations

import csv
import json
import logging
import os
import random
import re
import sys
import time
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Iterator

try:
    import requests
except ImportError:
    sys.exit("FATAL: pip install requests")

REPO_ROOT = Path(__file__).resolve().parent.parent.parent
PROCESSED_DIR = REPO_ROOT / "data" / "processed" / "brokers"
RAW_DIR = REPO_ROOT / "data" / "raw" / "brokers"
PROCESSED_DIR.mkdir(parents=True, exist_ok=True)
RAW_DIR.mkdir(parents=True, exist_ok=True)

PF_BASE = "https://www.propertyfinder.ae"
BROKERS_URL = f"{PF_BASE}/en/find-broker/search"
AGENTS_URL = f"{PF_BASE}/en/find-agent/search"

USER_AGENT = (
    "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 "
    "(KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
)
DELAY_BASE_S = float(os.environ.get("PF_REQUEST_DELAY_S", "1.5"))
DELAY_JITTER_S = float(os.environ.get("PF_REQUEST_JITTER_S", "0.7"))
MAX_PAGES_BROKERS = int(os.environ.get("PF_MAX_PAGES_BROKERS", "0"))  # 0 = no cap
MAX_PAGES_AGENTS = int(os.environ.get("PF_MAX_PAGES_AGENTS", "0"))
PAGE_START_BROKERS = int(os.environ.get("PF_PAGE_START_BROKERS", "1"))
PAGE_START_AGENTS = int(os.environ.get("PF_PAGE_START_AGENTS", "1"))
SKIP_AGENTS = bool(int(os.environ.get("PF_SKIP_AGENTS", "0")))
SKIP_BROKERS = bool(int(os.environ.get("PF_SKIP_BROKERS", "0")))
APPEND_RAW = bool(int(os.environ.get("PF_APPEND_RAW", "0")))  # if 1, merge with existing raw JSON

PERSONAL_EMAIL_DOMAINS = {
    "gmail.com", "hotmail.com", "yahoo.com", "outlook.com", "live.com",
    "icloud.com", "me.com", "aol.com", "proton.me", "protonmail.com",
    "rediffmail.com", "yandex.com", "yandex.ru", "mail.ru", "qq.com",
    "163.com", "126.com", "msn.com",
}
LAND_KEYWORDS = re.compile(
    r"\b(land|plot|plots|commercial|investment|industrial|warehouse|"
    r"off[\s\-]?plan|mixed[\s\-]?use|hospitality|hotel|retail|office|"
    r"developer|G\+\d+|tower|mall)\b",
    re.IGNORECASE,
)

RETRIEVED_DATE = datetime.now(timezone.utc).date().isoformat()

logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s")
log = logging.getLogger("pf-brokers")

audit_log = open(RAW_DIR / "pdpl_audit.log", "a", encoding="utf-8")
audit_log.write(f"\n=== PF run {datetime.now(timezone.utc).isoformat()} ===\n")


def _polite_sleep() -> None:
    time.sleep(DELAY_BASE_S + random.random() * DELAY_JITTER_S)


def _build_session() -> requests.Session:
    s = requests.Session()
    s.headers.update({
        "User-Agent": USER_AGENT,
        "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
        "Accept-Language": "en-US,en;q=0.9",
        "Accept-Encoding": "gzip, deflate, br",
        "Cache-Control": "no-cache",
    })
    return s


def _extract_next_data(html: str) -> dict | None:
    m = re.search(r'<script id="__NEXT_DATA__"[^>]*>(.*?)</script>', html, re.DOTALL)
    if not m:
        return None
    try:
        return json.loads(m.group(1))
    except json.JSONDecodeError:
        return None


def _is_personal_email(email: str | None) -> bool:
    if not email or "@" not in email:
        return False
    return email.rsplit("@", 1)[-1].strip().lower() in PERSONAL_EMAIL_DOMAINS


def _audit(reason: str, field: str, value: Any, ctx: dict) -> None:
    audit_log.write(
        f"REDACTED kind={ctx.get('_kind','?')} field={field!r} reason={reason!r} "
        f"value={(str(value)[:50])!r} id={ctx.get('id') or ctx.get('slug') or '?'}\n"
    )


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


def _classify_land_specialist(rec: dict) -> tuple[str, str]:
    """Returns (TRUE/FALSE, comma-separated tags)."""
    commercial_count = (
        int(rec.get("propertiesCommercialForRentCount") or 0)
        + int(rec.get("propertiesCommercialForSaleCount") or 0)
    )
    name_signal = LAND_KEYWORDS.findall(rec.get("name") or "")
    tags = sorted(set(m.lower() for m in name_signal))
    if commercial_count > 0:
        tags.append(f"commercial_listings:{commercial_count}")
    if commercial_count > 0 or name_signal:
        return "TRUE", ",".join(tags)
    return "FALSE", ""


def _filter_brokerage(rec: dict, source_url: str) -> dict:
    """Property Finder broker (company) record → PDPL-filtered CSV row."""
    rec["_kind"] = "broker"
    out: dict[str, Any] = {
        "rera_office_number": str(rec.get("licenseNumber") or "").strip(),
        "company_name_en": (rec.get("name") or "").strip(),
        "company_name_ar": "",  # PF EN site doesn't expose AR names in this JSON
        "trade_licence": "",  # PF doesn't surface trade licence separately
        "status": "ACTIVE" if rec.get("isVerified") or rec.get("verified") else "",
        "registration_date": "",
        "expiry_date": "",
        "address": (rec.get("address") or "").strip(),
        "phone_office": _normalise_phone(rec.get("phone")),
        "email_office": "",
        "website": f"{PF_BASE}/en/broker/{rec.get('urlSlug') or rec.get('slug') or ''}".rstrip("/") if (rec.get("urlSlug") or rec.get("slug")) else "",
        "specialisation_tags": "",
        "land_specialist_flag": "",
        "source_url": source_url,
        "retrieved_date": RETRIEVED_DATE,
        "pdpl_compliance_note": "",
    }

    # Email — exclude if personal domain
    raw_email = (rec.get("email") or "").strip()
    if raw_email:
        if _is_personal_email(raw_email):
            _audit("personal_email_domain", "email_office", raw_email, rec)
            out["pdpl_compliance_note"] = "email_office redacted: personal domain"
        else:
            out["email_office"] = raw_email

    # Audit excluded fields explicitly (so we have a record of what we chose not to include)
    for excluded in ("whatsappPhone", "userId", "clientId", "logo", "image"):
        if rec.get(excluded):
            _audit("policy_excluded_field", excluded, rec[excluded], rec)

    flag, tags = _classify_land_specialist(rec)
    out["land_specialist_flag"] = flag
    out["specialisation_tags"] = tags

    # Append totalProperties to specialisation_tags for downstream filtering richness
    tot = rec.get("totalProperties")
    if tot:
        out["specialisation_tags"] = (
            f"{out['specialisation_tags']},total_properties:{tot}".strip(",")
        )

    return out


def _filter_agent(rec: dict, source_url: str) -> dict:
    """Property Finder agent (individual) record → PDPL-filtered CSV row."""
    rec["_kind"] = "agent"
    broker = rec.get("broker") or {}
    out: dict[str, Any] = {
        "brn": str(rec.get("licenseNumber") or "").strip(),
        "full_name_en": (rec.get("name") or "").strip(),
        "full_name_ar": "",
        "brokerage_company": (broker.get("name") or "").strip(),
        "brokerage_rera_number": str(broker.get("licenseNumber") or "").strip(),
        "status": "ACTIVE" if rec.get("verified") or rec.get("superagent") else "",
        "nationality_if_public": (rec.get("nationality") or {}).get("name", "").strip() if isinstance(rec.get("nationality"), dict) else "",  # PF publishes nationality{code,name} on agent profile
        "registration_date": "",
        "expiry_date": "",
        "specialisation_if_listed": "",
        "source_url": source_url,
        "retrieved_date": RETRIEVED_DATE,
        "pdpl_compliance_note": "",
    }

    # Email — exclude if personal domain
    raw_email = (rec.get("email") or "").strip()
    if raw_email:
        if _is_personal_email(raw_email):
            _audit("personal_email_domain", "email", raw_email, rec)
            out["pdpl_compliance_note"] = "email redacted: personal domain"
        # NOTE: even non-personal domain emails are NOT included for agents.
        # Per PDPL Art. 1, an individual's email — even at a corporate domain — is
        # personal data. We carry the brokerage-level office email instead (in
        # the brokerage CSV); agent rows stay anonymised by email.

    # whatsappPhone is always a personal mobile — NEVER include
    if rec.get("whatsappPhone"):
        _audit("personal_mobile_field", "whatsappPhone", rec["whatsappPhone"], rec)

    # Phone — INCLUDED only if it looks like a landline (042/02/etc, not 050/052/054/055/056/058)
    # Mobile prefixes in UAE: 050, 052, 054, 055, 056, 058 — these are personal under PDPL.
    raw_phone = rec.get("phone") or ""
    norm = _normalise_phone(raw_phone)
    if norm:
        # +9714xxx... = Dubai landline; +9712xxx... = AD landline; +9716/7/9 = other emirate landlines
        # +97150/52/54/55/56/58 = mobile
        is_mobile = bool(re.match(r"^\+9715[02-8]", norm))
        if is_mobile:
            _audit("personal_mobile_excluded", "phone", raw_phone, rec)
            out["pdpl_compliance_note"] = (
                f"{out['pdpl_compliance_note']}; phone redacted: mobile prefix"
                if out["pdpl_compliance_note"]
                else "phone redacted: mobile prefix"
            )
        # Even landline isn't carried on individual-agent rows by default —
        # keep the agent CSV minimally identifying. Aggregated business
        # contact lives on the brokerage CSV.

    # Specialisation derivation — include topLocations (areas served)
    spec_signals = []
    if rec.get("propertiesCommercialForRentCount") or rec.get("propertiesCommercialForSaleCount"):
        spec_signals.append("commercial")
    if rec.get("propertiesResidentialForRentCount"):
        spec_signals.append("residential_rent")
    if rec.get("propertiesResidentialForSaleCount"):
        spec_signals.append("residential_sale")
    top_locs = rec.get("topLocations") or []
    if top_locs:
        loc_names = [t.get("name", "") for t in top_locs if t.get("name")]
        if loc_names:
            spec_signals.append("areas:" + "|".join(loc_names[:5]))
    if rec.get("languages"):
        langs = rec.get("languages") or []
        if isinstance(langs, list):
            lang_names = [l.get("name", "") if isinstance(l, dict) else str(l) for l in langs[:5]]
            lang_names = [n for n in lang_names if n]
            if lang_names:
                spec_signals.append("langs:" + "|".join(lang_names))
    if spec_signals:
        out["specialisation_if_listed"] = ",".join(spec_signals)

    return out


def _scrape_paginated(session: requests.Session, base_url: str, kind: str,
                      max_pages: int = 0, page_start: int = 1) -> tuple[list[dict], int]:
    """Returns (raw_records, total_reported_in_meta)."""
    all_records: list[dict] = []
    page = page_start
    total = 0
    pages_fetched = 0
    while True:
        r = session.get(base_url, params={"page": page}, timeout=45)
        if r.status_code == 429:
            log.warning("page %d: 429 — backoff 30s", page)
            time.sleep(30)
            continue
        if r.status_code != 200:
            log.error("page %d: HTTP %d — stopping", page, r.status_code)
            break
        data = _extract_next_data(r.text)
        if not data:
            log.error("page %d: no NEXT_DATA — stopping", page)
            break
        page_props = data.get("props", {}).get("pageProps", {})
        block = page_props.get(kind, {})  # 'brokers' or 'agents'
        meta = block.get("meta", {})
        records = block.get("data", [])
        total = meta.get("total", total)
        total_pages = meta.get("totalPages", 0)
        if not records:
            log.info("page %d: 0 records — done", page)
            break
        all_records.extend(records)
        pages_fetched += 1
        log.info("page %d/%d: +%d records (cumulative %d / total %d)",
                 page, total_pages, len(records), len(all_records), total)
        if max_pages and pages_fetched >= max_pages:
            log.info("hit MAX_PAGES cap (%d pages fetched) — stopping", max_pages)
            break
        if page >= total_pages:
            log.info("reached final page %d — done", page)
            break
        page += 1
        _polite_sleep()
    return all_records, total


def _split_by_city(rows: list[dict], location_field: str = "location") -> tuple[list[dict], list[dict]]:
    """Returns (dubai_rows, abudhabi_rows). Other emirates dropped."""
    dubai, ad = [], []
    for r in rows:
        loc = (r.get(location_field) or "").strip().lower()
        if "dubai" in loc:
            dubai.append(r)
        elif "abu dhabi" in loc or "abudhabi" in loc:
            ad.append(r)
    return dubai, ad


def _write_csv(path: Path, rows: list[dict], fieldnames: list[str]) -> None:
    rows = sorted(rows, key=lambda r: ((r.get(fieldnames[0]) or ""), (r.get(fieldnames[1]) or "")))
    with open(path, "w", encoding="utf-8", newline="") as f:
        w = csv.DictWriter(f, fieldnames=fieldnames)
        w.writeheader()
        for row in rows:
            w.writerow({k: row.get(k, "") for k in fieldnames})
    log.info("Wrote %d rows → %s", len(rows), path)


def main() -> None:
    session = _build_session()

    brokerage_fields = [
        "rera_office_number", "company_name_en", "company_name_ar",
        "trade_licence", "status", "registration_date", "expiry_date",
        "address", "phone_office", "email_office", "website",
        "specialisation_tags", "land_specialist_flag",
        "source_url", "retrieved_date", "pdpl_compliance_note",
    ]
    agent_fields = [
        "brn", "full_name_en", "full_name_ar", "brokerage_company",
        "brokerage_rera_number", "status", "nationality_if_public",
        "registration_date", "expiry_date", "specialisation_if_listed",
        "source_url", "retrieved_date", "pdpl_compliance_note",
    ]

    if not SKIP_BROKERS:
        log.info("=== Scraping brokerages from %s (start page %d) ===", BROKERS_URL, PAGE_START_BROKERS)
        broker_raw, broker_total = _scrape_paginated(session, BROKERS_URL, "brokers", MAX_PAGES_BROKERS, PAGE_START_BROKERS)
        broker_raw_path = RAW_DIR / f"pf_brokers_raw_{RETRIEVED_DATE}.json"
        if APPEND_RAW and broker_raw_path.exists():
            existing = json.load(open(broker_raw_path, encoding="utf-8"))
            existing_ids = {b.get("id") for b in existing if b.get("id")}
            new_only = [b for b in broker_raw if b.get("id") not in existing_ids]
            log.info("APPEND_RAW: existing=%d, new_unique=%d", len(existing), len(new_only))
            broker_raw = existing + new_only
        with open(broker_raw_path, "w", encoding="utf-8") as f:
            json.dump(broker_raw, f, indent=2, ensure_ascii=False)
        dubai_b, ad_b = _split_by_city(broker_raw)
        log.info("Brokerages: %d total / %d Dubai / %d Abu Dhabi", len(broker_raw), len(dubai_b), len(ad_b))

        # Dedup by (name + location), filter, write
        def _process(items: list[dict], src_url: str) -> list[dict]:
            seen: dict[tuple, dict] = {}
            for rec in items:
                row = _filter_brokerage(rec, src_url)
                key = (row["company_name_en"].lower(), row.get("rera_office_number", ""))
                seen[key] = row
            return list(seen.values())

        _write_csv(PROCESSED_DIR / "dubai_brokerages.csv",
                   _process(dubai_b, BROKERS_URL), brokerage_fields)
        _write_csv(PROCESSED_DIR / "abudhabi_brokerages.csv",
                   _process(ad_b, BROKERS_URL), brokerage_fields)

    if not SKIP_AGENTS:
        log.info("=== Scraping agents from %s (start page %d) ===", AGENTS_URL, PAGE_START_AGENTS)
        agent_raw, agent_total = _scrape_paginated(session, AGENTS_URL, "agents", MAX_PAGES_AGENTS, PAGE_START_AGENTS)
        agent_raw_path = RAW_DIR / f"pf_agents_raw_{RETRIEVED_DATE}.json"
        if APPEND_RAW and agent_raw_path.exists():
            existing = json.load(open(agent_raw_path, encoding="utf-8"))
            existing_ids = {a.get("id") for a in existing if a.get("id")}
            new_only = [a for a in agent_raw if a.get("id") not in existing_ids]
            log.info("APPEND_RAW: existing=%d, new_unique=%d", len(existing), len(new_only))
            agent_raw = existing + new_only
        with open(agent_raw_path, "w", encoding="utf-8") as f:
            json.dump(agent_raw, f, indent=2, ensure_ascii=False)
        # Agent location is nested at broker.location; flatten before split
        for r in agent_raw:
            r["_flat_location"] = ((r.get("broker") or {}).get("location") or "").strip()
        dubai_a, ad_a = _split_by_city(agent_raw, location_field="_flat_location")
        log.info("Agents: %d total / %d Dubai / %d Abu Dhabi", len(agent_raw), len(dubai_a), len(ad_a))

        def _process_a(items: list[dict], src_url: str) -> list[dict]:
            seen: dict[tuple, dict] = {}
            for rec in items:
                row = _filter_agent(rec, src_url)
                key = (row["full_name_en"].lower(), row["brokerage_company"].lower())
                seen[key] = row
            return list(seen.values())

        _write_csv(PROCESSED_DIR / "dubai_agents.csv",
                   _process_a(dubai_a, AGENTS_URL), agent_fields)
        _write_csv(PROCESSED_DIR / "abudhabi_agents.csv",
                   _process_a(ad_a, AGENTS_URL), agent_fields)

    audit_log.close()
    log.info("Done.")


if __name__ == "__main__":
    main()
