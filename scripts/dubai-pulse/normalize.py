#!/usr/bin/env python3
"""
ZAAHI · Dubai Pulse normalizer.

Reads raw DLD CSVs from data/raw/dubai-pulse/, applies:
  1. Field mapping → ZAAHI naming conventions (snake_case, prefixed by domain)
  2. PDPL Federal Law 45/2021 filtering (skip personal contact fields per
     allowed/excluded matrix; keep work contacts only)
  3. Light type coercion (dates → ISO 8601, numbers → numeric, BigInt-safe
     where applicable per CLAUDE.md `Финансовые расчёты — ТОЛЬКО fils`)
  4. Dedup on natural key per dataset
  5. Sort

Writes normalized CSVs to data/processed/dubai-pulse/.

USAGE
-----
  python3 scripts/dubai-pulse/normalize.py
  python3 scripts/dubai-pulse/normalize.py --datasets brokers,transactions
  python3 scripts/dubai-pulse/normalize.py --dry-run
  python3 scripts/dubai-pulse/normalize.py --help
  python3 scripts/dubai-pulse/normalize.py --list

PDPL POLICY (per dataset)
-------------------------
- Brokers (DLD Real Estate Licenses):
  KEEP: rera_office_number, company_name_en, company_name_ar, trade_licence,
        license_status, registration_date, expiry_date, address_business,
        phone_office (if landline-prefix), email_office (if work-domain)
  DROP: personal_mobile, personal_email, photo_url, id_number,
        residential_address, owner_personal_data
- Transactions:
  KEEP: transaction_id, transaction_date, transaction_type, property_type,
        area_id, area_name_en, building_id, project_id, area_sqft,
        transaction_value_aed, mortgage_amount_aed (aggregated only)
  DROP: party_personal_names (buyer/seller/witness), party_id_numbers,
        party_phone_numbers, party_addresses
- Rents:
  KEEP: contract_id, contract_date, area_id, building_id, annual_rent_aed,
        contract_term_months, property_type, lease_type
  DROP: tenant_personal_data, landlord_personal_data, contact_phones,
        emirates_id
- Projects, Valuations, Land, Buildings, Units:
  KEEP: structural fields (IDs, addresses, types, valuations, dates,
        registration status). These datasets are largely property-record
        not personal-data.
  DROP: any owner names + contact info (in datasets that include them).
- Developers:
  KEEP: developer_company_name, dld_id, license, registration_date, status,
        head_office_address (business), website
  DROP: managing_director_personal_data, contact_personal_phone

Each row gets pdpl_compliance_note column with redaction summary.
PDPL audit log appended to data/raw/dubai-pulse/pdpl_audit.log.

ZAAHI NAMING CONVENTIONS
-----------------------
- All field names: snake_case
- Dates: ISO 8601 (YYYY-MM-DD)
- Money in AED: integer fils (per CLAUDE.md `Суммы хранить в fils (integer)`)
- Phone: E.164 (+971XXXXXXXXX)
- Booleans: TRUE / FALSE strings
- Empty: "" (never NULL / N/A / null)
"""

from __future__ import annotations

import argparse
import csv
import json
import logging
import os
import re
import sys
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

# pandas is imported lazily inside _import_pandas() so --help and --list
# work without it. Жан only needs pandas installed for actual normalization.
def _import_pandas():
    try:
        import pandas as pd
        return pd
    except ImportError:
        sys.exit("FATAL: pip install pandas")

REPO_ROOT = Path(__file__).resolve().parent.parent.parent
RAW_DIR = REPO_ROOT / "data" / "raw" / "dubai-pulse"
OUT_DIR = REPO_ROOT / "data" / "processed" / "dubai-pulse"
OUT_DIR.mkdir(parents=True, exist_ok=True)

RETRIEVED_DATE = datetime.now(timezone.utc).date().isoformat()

PERSONAL_EMAIL_DOMAINS = {
    "gmail.com", "hotmail.com", "yahoo.com", "outlook.com", "live.com",
    "icloud.com", "me.com", "aol.com", "proton.me", "protonmail.com",
    "rediffmail.com", "yandex.com", "yandex.ru", "mail.ru", "qq.com",
    "163.com", "126.com", "msn.com",
}

logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s")
log = logging.getLogger("dubai-pulse-normalize")


# ───────────────────────────────────────────────────────────────────
# PDPL field policy per dataset
# ───────────────────────────────────────────────────────────────────

# Map of dataset slug → field-rename dict + drop-fields set + natural-key fields.
# DLD CSV column names vary by dataset version. Жан updates the SOURCE_FIELD
# names on first run by inspecting the actual CSV header (download_datasets.py
# logs the file path; pandas read_csv head() reveals the headers).
DATASET_POLICY: dict[str, dict[str, Any]] = {
    "brokers": {
        # SOURCE_FIELD: zaahi_field. Source names are best-guess from DLD
        # Open Data hub field-listings as of 2026-04-27. Verify on first run.
        "rename": {
            "License Number": "rera_office_number",
            "Office Number": "rera_office_number",
            "Office Name": "company_name_en",
            "Office Name Arabic": "company_name_ar",
            "License Status": "license_status",
            "Issue Date": "registration_date",
            "Expiry Date": "expiry_date",
            "Address": "address_business",
            "Phone": "phone_office",
            "Email": "email_office",
            "Fax": "fax_office",
        },
        "drop_personal": {
            "Owner Name", "Owner Mobile", "Owner Email",
            "Manager Mobile", "Manager Email", "Personal Phone",
            "Photo", "Photo URL", "ID Number", "Emirates ID",
            "Residential Address",
        },
        "natural_key": ["rera_office_number"],
        "filter_email_personal": ["email_office"],  # blank if personal-domain
        "normalize_phone": ["phone_office", "fax_office"],
    },
    "transactions": {
        "rename": {
            "Transaction ID": "transaction_id",
            "Transaction Date": "transaction_date",
            "Transaction Type": "transaction_type",
            "Property Type": "property_type",
            "Property Sub Type": "property_sub_type",
            "Area ID": "area_id",
            "Area Name English": "area_name_en",
            "Area Name Arabic": "area_name_ar",
            "Building ID": "building_id",
            "Building Name": "building_name",
            "Project ID": "project_id",
            "Project Name": "project_name",
            "Procedure Area": "area_sqft",
            "Actual Worth": "transaction_value_aed",
            "Meter Sale Price": "price_per_sqm_aed",
            "Mortgage Amount": "mortgage_amount_aed",
            "Number of Rooms": "rooms",
        },
        "drop_personal": {
            "Buyer Name", "Seller Name", "Witness Name",
            "Buyer ID Number", "Seller ID Number", "Buyer Phone",
            "Seller Phone", "Buyer Address", "Seller Address",
            "Buyer Nationality", "Seller Nationality",
        },
        "natural_key": ["transaction_id"],
        "monetary_aed_to_fils": ["transaction_value_aed", "price_per_sqm_aed", "mortgage_amount_aed"],
    },
    "rents": {
        "rename": {
            "Contract ID": "contract_id",
            "Contract Number": "contract_id",
            "Contract Date": "contract_date",
            "Start Date": "contract_start_date",
            "End Date": "contract_end_date",
            "Annual Amount": "annual_rent_aed",
            "Total Amount": "total_rent_aed",
            "Property Type": "property_type",
            "Property Usage": "property_usage",
            "Area ID": "area_id",
            "Area Name English": "area_name_en",
            "Building ID": "building_id",
            "Number of Rooms": "rooms",
        },
        "drop_personal": {
            "Tenant Name", "Tenant Phone", "Tenant Email", "Tenant ID Number",
            "Tenant Nationality", "Tenant Address",
            "Landlord Name", "Landlord Phone", "Landlord Email",
            "Landlord ID Number", "Landlord Nationality", "Landlord Address",
        },
        "natural_key": ["contract_id"],
        "monetary_aed_to_fils": ["annual_rent_aed", "total_rent_aed"],
    },
    "projects": {
        "rename": {
            "Project ID": "project_id",
            "Project Number": "project_id",
            "Project Name": "project_name_en",
            "Project Name Arabic": "project_name_ar",
            "Project Status": "project_status",
            "Completion Date": "completion_date",
            "Percent Completed": "percent_completed",
            "Developer Number": "developer_id",
            "Developer Name": "developer_name",
            "Master Project": "master_project_name",
            "Area ID": "area_id",
            "Number of Buildings": "building_count",
            "Number of Units": "unit_count",
        },
        "drop_personal": set(),  # Projects dataset is structural, no personal data
        "natural_key": ["project_id"],
    },
    "valuations": {
        "rename": {
            "Procedure ID": "procedure_id",
            "Procedure Date": "procedure_date",
            "Property Type": "property_type",
            "Procedure Area": "area_sqft",
            "Actual Worth": "valuation_aed",
            "Area ID": "area_id",
            "Area Name English": "area_name_en",
        },
        "drop_personal": set(),
        "natural_key": ["procedure_id"],
        "monetary_aed_to_fils": ["valuation_aed"],
    },
    "land": {
        "rename": {
            "Land Number": "land_id",
            "Land Type": "land_type",
            "Property Type Arabic": "land_type_ar",
            "Area ID": "area_id",
            "Area Name English": "area_name_en",
            "Land Sub Type": "land_sub_type",
            "Land Area": "land_area_sqft",
        },
        "drop_personal": {"Owner Name", "Owner Mobile", "Owner Email", "Owner ID Number"},
        "natural_key": ["land_id"],
    },
    "land_registry": {
        "rename": {
            "Land Number": "land_id",
            "Land Type": "land_type",
            "Area ID": "area_id",
        },
        "drop_personal": {"Owner Name", "Owner ID Number"},
        "natural_key": ["land_id"],
    },
    "buildings": {
        "rename": {
            "Building Number": "building_id",
            "Building Name English": "building_name_en",
            "Building Name Arabic": "building_name_ar",
            "Number of Floors": "floor_count",
            "Number of Units": "unit_count",
            "Building Status": "building_status",
            "Property Type": "building_type",
            "Area ID": "area_id",
            "Project ID": "project_id",
        },
        "drop_personal": set(),
        "natural_key": ["building_id"],
    },
    "units": {
        "rename": {
            "Unit Number": "unit_id",
            "Property Type": "unit_type",
            "Unit Area": "unit_area_sqft",
            "Number of Rooms": "rooms",
            "Building ID": "building_id",
            "Floor": "floor",
            "Parking": "parking",
        },
        "drop_personal": {"Owner Name", "Owner ID Number"},
        "natural_key": ["unit_id"],
    },
    "developers": {
        "rename": {
            "Developer Number": "developer_id",
            "Developer Name English": "developer_name_en",
            "Developer Name Arabic": "developer_name_ar",
            "License Number": "trade_licence",
            "License Status": "license_status",
            "License Source": "license_source",
            "License Issue Date": "registration_date",
            "License Expiry Date": "expiry_date",
            "Office Address": "address_business",
            "Phone": "phone_office",
            "Email": "email_office",
            "Website": "website",
        },
        "drop_personal": {
            "Manager Name", "Manager Mobile", "Manager Email",
            "Owner Name", "Owner Mobile", "Owner Email", "Owner ID Number",
        },
        "natural_key": ["developer_id"],
        "filter_email_personal": ["email_office"],
        "normalize_phone": ["phone_office"],
    },
}


def parse_args() -> argparse.Namespace:
    p = argparse.ArgumentParser(
        description="Normalize raw Dubai Pulse CSVs to ZAAHI canonical schema.",
        formatter_class=argparse.RawDescriptionHelpFormatter,
    )
    p.add_argument("--datasets", default="all",
                   help="Comma-separated dataset slugs (default 'all').")
    p.add_argument("--dry-run", action="store_true",
                   help="Print what would be normalized; don't write outputs.")
    p.add_argument("--list", action="store_true",
                   help="List configured datasets and exit.")
    p.add_argument("--input-date", default=RETRIEVED_DATE,
                   help="Date suffix on raw files (YYYY-MM-DD; default today).")
    return p.parse_args()


def normalize_phone(raw: Any, pd) -> str:
    if pd.isna(raw):
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


def is_personal_email(email: Any, pd) -> bool:
    if pd.isna(email) or not email or "@" not in str(email):
        return False
    return str(email).rsplit("@", 1)[-1].strip().lower() in PERSONAL_EMAIL_DOMAINS


def aed_to_fils(raw: Any, pd) -> str:
    """Convert AED decimal to fils integer string per CLAUDE.md money rules."""
    if pd.isna(raw):
        return ""
    try:
        aed = float(re.sub(r"[^\d.\-]", "", str(raw)))
        return str(int(round(aed * 100)))
    except (ValueError, TypeError):
        return ""


def to_iso_date(raw: Any, pd) -> str:
    if pd.isna(raw) or not raw:
        return ""
    s = str(raw).strip()
    for fmt in ("%Y-%m-%d", "%d/%m/%Y", "%d-%m-%Y", "%Y/%m/%d", "%m/%d/%Y", "%d-%b-%Y", "%d-%b-%y"):
        try:
            return datetime.strptime(s.split(" ")[0], fmt).date().isoformat()
        except ValueError:
            continue
    return s  # leave unparsed values as-is for manual review


def normalize_dataset(slug: str, raw_path: Path, audit_log, pd) -> Path | None:
    """Returns output path or None on failure."""
    policy = DATASET_POLICY.get(slug)
    if not policy:
        log.error("[%s] no policy registered — skipping", slug)
        return None
    if not raw_path.exists():
        log.error("[%s] raw file not found: %s", slug, raw_path)
        return None

    # Tolerate weird DLD encodings — try utf-8 then cp1252 fallback
    df = None
    for enc in ("utf-8", "utf-8-sig", "cp1252", "latin-1"):
        try:
            df = pd.read_csv(raw_path, encoding=enc, dtype=str, low_memory=False)
            log.info("[%s] loaded %d rows × %d cols (encoding=%s)", slug, len(df), len(df.columns), enc)
            break
        except (UnicodeDecodeError, pd.errors.ParserError):
            continue
    if df is None:
        log.error("[%s] could not parse CSV with any encoding", slug)
        return None

    rename_map = policy.get("rename", {})
    drop_personal = policy.get("drop_personal", set())
    natural_key = policy.get("natural_key", [])
    filter_email_personal = policy.get("filter_email_personal", [])
    normalize_phone_fields = policy.get("normalize_phone", [])
    monetary = policy.get("monetary_aed_to_fils", [])

    # Audit dropped personal columns
    for col in drop_personal:
        if col in df.columns:
            audit_log.write(f"DROPPED dataset={slug} column={col!r} reason=personal_data_per_pdpl_policy n={len(df)}\n")
            df = df.drop(columns=[col])

    # Rename mapped fields; preserve unknowns with prefix to avoid collisions
    df = df.rename(columns=rename_map)

    # Initialise compliance note column
    df["pdpl_compliance_note"] = ""

    # Email — blank-if-personal
    for col in filter_email_personal:
        if col in df.columns:
            mask = df[col].apply(lambda x: is_personal_email(x, pd))
            n = int(mask.sum())
            if n:
                audit_log.write(f"REDACTED dataset={slug} column={col!r} reason=personal_email_domain n={n}\n")
                df.loc[mask, "pdpl_compliance_note"] = (df.loc[mask, "pdpl_compliance_note"]
                                                         + "; email_office redacted: personal domain").str.lstrip("; ")
                df.loc[mask, col] = ""

    # Phone normalisation — also detect mobile prefix and redact
    for col in normalize_phone_fields:
        if col in df.columns:
            df[col] = df[col].apply(lambda x: normalize_phone(x, pd))
            mobile_mask = df[col].str.match(r"^\+9715[02-8]", na=False)
            n_mobile = int(mobile_mask.sum())
            if n_mobile:
                audit_log.write(f"REDACTED dataset={slug} column={col!r} reason=personal_mobile_prefix n={n_mobile}\n")
                df.loc[mobile_mask, "pdpl_compliance_note"] = (df.loc[mobile_mask, "pdpl_compliance_note"]
                                                                 + f"; {col} redacted: mobile prefix").str.lstrip("; ")
                df.loc[mobile_mask, col] = ""

    # Money → fils integer
    for col in monetary:
        if col in df.columns:
            new_col = col.replace("_aed", "_fils")
            df[new_col] = df[col].apply(lambda x: aed_to_fils(x, pd))
            df = df.drop(columns=[col])

    # Date normalisation — anything ending in _date
    date_cols = [c for c in df.columns if c.endswith("_date")]
    for col in date_cols:
        df[col] = df[col].apply(lambda x: to_iso_date(x, pd))

    # Dedup on natural key
    if natural_key:
        present_keys = [k for k in natural_key if k in df.columns]
        if present_keys:
            before = len(df)
            df = df.drop_duplicates(subset=present_keys, keep="last")
            after = len(df)
            if before != after:
                log.info("[%s] dedup on %s: %d → %d rows", slug, present_keys, before, after)

    # Add provenance columns
    df["source_url"] = "https://www.dubaipulse.gov.ae"
    df["retrieved_date"] = RETRIEVED_DATE

    # Replace remaining NaN with empty string (CLAUDE.md naming convention)
    df = df.fillna("")

    # Sort
    if natural_key and natural_key[0] in df.columns:
        df = df.sort_values(by=natural_key[0])

    out_path = OUT_DIR / f"{slug}.csv"
    df.to_csv(out_path, index=False, encoding="utf-8")
    log.info("[%s] wrote %d rows → %s", slug, len(df), out_path)
    return out_path


def main() -> None:
    args = parse_args()

    if args.list:
        print("Configured datasets + policies:")
        for slug, pol in DATASET_POLICY.items():
            print(f"  {slug:<14}  rename={len(pol.get('rename', {}))} fields  "
                  f"drop_personal={len(pol.get('drop_personal', set()))} fields  "
                  f"natural_key={pol.get('natural_key', [])}")
        return

    pd = _import_pandas()
    audit_path = RAW_DIR / "pdpl_audit.log"
    with open(audit_path, "a", encoding="utf-8") as audit:
        audit.write(f"\n=== Normalize run {datetime.now(timezone.utc).isoformat()} ===\n")

        target_slugs = (set(DATASET_POLICY.keys())
                        if args.datasets == "all"
                        else {s.strip() for s in args.datasets.split(",")})
        unknown = target_slugs - set(DATASET_POLICY.keys())
        if unknown:
            log.warning("Unknown dataset slug(s) ignored: %s", ", ".join(unknown))

        if args.dry_run:
            for slug in sorted(target_slugs & set(DATASET_POLICY.keys())):
                raw = RAW_DIR / f"{slug}_{args.input_date}.csv"
                exists = "exists" if raw.exists() else "MISSING"
                log.info("DRY-RUN [%s] would read %s (%s)", slug, raw.name, exists)
            return

        success = 0
        for slug in sorted(target_slugs & set(DATASET_POLICY.keys())):
            raw = RAW_DIR / f"{slug}_{args.input_date}.csv"
            try:
                if normalize_dataset(slug, raw, audit, pd):
                    success += 1
            except Exception as e:
                log.error("[%s] normalize failed: %s", slug, e)
                audit.write(f"FAIL dataset={slug} reason={e}\n")

    log.info("Done. %d/%d datasets normalized.", success, len(target_slugs & set(DATASET_POLICY.keys())))
    log.info("Audit log: %s", audit_path)


if __name__ == "__main__":
    main()
