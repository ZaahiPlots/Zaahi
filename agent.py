#!/usr/bin/env python3
"""ZAAHI Autonomous AI System v4 — Knowledge + Code + Self-Validation"""

import subprocess
import time
import sys
import json
from pathlib import Path
from datetime import datetime

PROJECT = Path.home() / "zaahi"
KNOWLEDGE = PROJECT / "knowledge"
MEMORY = PROJECT / "memory"
LOGS = PROJECT / "logs"
MODEL_CODE = "qwen2.5-coder:7b"
MODEL_CHAT = "qwen3:8b"
LOGS.mkdir(exist_ok=True)
MEMORY.mkdir(exist_ok=True)


def log(msg):
    ts = datetime.now().strftime("%H:%M:%S")
    line = "[{}] {}".format(ts, msg)
    print(line, flush=True)
    try:
        with open(str(LOGS / "agent.log"), "a") as f:
            f.write(line + "\n")
    except Exception:
        pass


def run_cmd(cmd, timeout_sec=120):
    try:
        r = subprocess.run(cmd, shell=True, capture_output=True, text=True,
                          timeout=timeout_sec, cwd=str(PROJECT))
        return r.stdout.strip(), r.returncode == 0
    except Exception:
        return "", False


def write_file(rel_path, content):
    p = PROJECT / rel_path
    p.parent.mkdir(parents=True, exist_ok=True)
    p.write_text(content, encoding="utf-8")
    log("  + " + rel_path)


def file_exists(rel_path):
    return (PROJECT / rel_path).exists()


def ask_ollama(prompt, model=None):
    m = model or MODEL_CODE
    try:
        r = subprocess.run(["ollama", "run", m], input=prompt,
                          capture_output=True, text=True, timeout=300)
        return r.stdout.strip() if r.returncode == 0 else None
    except Exception:
        return None


def check_health():
    try:
        r = subprocess.run(["nvidia-smi", "--query-gpu=temperature.gpu",
                          "--format=csv,noheader"], capture_output=True, text=True, timeout=5)
        if r.returncode == 0 and int(r.stdout.strip()) > 82:
            log("GPU hot, pause 5m")
            time.sleep(300)
            return False
    except Exception:
        pass
    try:
        r = subprocess.run(["free", "-m"], capture_output=True, text=True)
        for line in r.stdout.split("\n"):
            parts = line.split()
            if len(parts) >= 7 and parts[0] in ("Mem:", "\u041f\u0430\u043c\u044f\u0442\u044c:"):
                if int(parts[6]) < 1500:
                    log("RAM low, pause 3m")
                    time.sleep(180)
                    return False
    except Exception:
        pass
    return True


def git_save(msg):
    run_cmd('git add -A && git commit -m "{}" 2>/dev/null'.format(msg))


def load_progress():
    path = MEMORY / "progress.json"
    try:
        return json.loads(path.read_text()) if path.exists() else {}
    except Exception:
        return {}


def save_progress(data):
    (MEMORY / "progress.json").write_text(json.dumps(data, indent=2, ensure_ascii=False))


# ── KNOWLEDGE ENGINE ──

def get_unpopulated_nodes():
    nodes = []
    if not KNOWLEDGE.exists():
        return nodes
    for block_dir in sorted(KNOWLEDGE.iterdir()):
        if not block_dir.is_dir():
            continue
        for cat_dir in sorted(block_dir.iterdir()):
            if not cat_dir.is_dir():
                continue
            summary = cat_dir / "summary.md"
            if summary.exists():
                content = summary.read_text()
                if "PENDING" in content or len(content) < 200:
                    nodes.append(cat_dir)
    return nodes


def populate_node(node_path):
    name = node_path.name.replace("_", " ")
    log("  Knowledge: " + name)
    prompt = (
        "You are a real estate and technology expert.\n"
        "Write a professional knowledge summary about: {}\n"
        "Context: Zaahi platform, Dubai UAE real estate.\n"
        "Include: definition, 5-10 key concepts, UAE regulations, "
        "technology applications, business model relevance, "
        "required data points for a platform.\n"
        "Start directly. No intro phrases."
    ).format(name)
    resp = ask_ollama(prompt, MODEL_CHAT)
    if resp and len(resp) > 100:
        (node_path / "summary.md").write_text(
            "# {}\n\n{}\n\n## Status: POPULATED\n## Updated: {}\n".format(
                name, resp, datetime.now().strftime("%Y-%m-%d %H:%M")))
        try:
            data = json.loads((node_path / "data.json").read_text())
        except Exception:
            data = {}
        data["status"] = "populated"
        data["last_updated"] = datetime.now().isoformat()
        (node_path / "data.json").write_text(json.dumps(data, indent=2))
        return True
    return False


# ── CODE GENERATOR ──

BACKEND = [
    ("backend/models/participant.ts",
     "TypeScript model. Fields: id, roles[], legalName, email, phone, nationality, verificationStatus, referralCode, walletAddress, createdAt. Interfaces and types. Export."),
    ("backend/models/land_parcel.ts",
     "TypeScript model. Fields: id, plotNumber, ownerId, status, assetClass, area, emirate, district, countryCode, isTokenized, currentValuation, createdAt. Export."),
    ("backend/models/deal.ts",
     "TypeScript model. Fields: id, listingId, parcelId, sellerId, buyerId, status (state machine enum), agreedPrice, currency, platformFee, roboticsFundAmount, createdAt. Export."),
    ("backend/models/listing.ts",
     "TypeScript model. Fields: id, parcelId, ownerId, type (sale/jv/rent), askingPrice, currency, status, views, createdAt. Export."),
    ("backend/services/deal_engine.ts",
     "TypeScript DealEngine class. Methods: initiateDeal, submitDeposit, signAgreement, collectDocuments, verifyGov, requestNOC, payTransferFee, submitDLD, completeDeal, disputeDeal, cancelDeal. State machine validation. Export."),
    ("backend/services/valuation.ts",
     "TypeScript ValuationService class. Methods: getAIEstimate, getComparableSales, calculatePricePerSqft, getGrowthRate, getInvestmentGrade. Return structured data. Export."),
    ("backend/services/kyc.ts",
     "TypeScript KYCService class. Methods: scanDocument, verifyFace, verifyVoice, checkAML, getVerificationStatus. Export."),
    ("backend/services/escrow.ts",
     "TypeScript EscrowService class. Methods: createEscrow, lockFunds, checkConditions, releaseFunds, refund, getBalance. Multi-currency. Export."),
    ("backend/services/notification.ts",
     "TypeScript NotificationService class. Methods: send, sendSMS, sendEmail, sendPush, sendWhatsApp. Template support EN/AR/RU. Export."),
    ("backend/api/auth.ts",
     "TypeScript auth API. Functions: register, login, verifyToken, refreshToken. Structured responses. Export."),
    ("backend/api/parcels.ts",
     "TypeScript parcels API. Functions: listParcels, getParcel, createParcel, updateParcel, deleteParcel. CRUD. Export."),
    ("backend/api/deals.ts",
     "TypeScript deals API. Functions: listDeals, getDeal, createDeal, updateDealStatus, getDealTimeline. Export."),
    ("backend/api/listings.ts",
     "TypeScript listings API. Functions: searchListings, getListing, createListing, updateListing. Export."),
    ("backend/middleware/auth.ts",
     "TypeScript auth middleware. Verify JWT, extract userId and roles, attach to context. Export withAuth."),
    ("backend/utils/constants.ts",
     "TypeScript constants. ZAAHI_FEE_RATE=0.002, ROBOTICS_FUND_RATE=0.10, DEPOSIT_RATE=0.10, TOKEN_SYMBOL='ZAH', SUPPORTED_COUNTRIES, DEAL_STATUSES. as const. Export."),
]

FRONTEND = [
    ("src/app/register/page.tsx",
     "Next.js registration. 4 steps: role select, info+document, biometric, welcome with Cat. Dark theme. useState. 'use client'. TypeScript."),
    ("src/app/dashboard/page.tsx",
     "Next.js dashboard. Verification status, parcels count, deals count. Cat message. Quick actions grid. Dark theme. TypeScript."),
    ("src/components/Navbar.tsx",
     "React nav bar. ZAAHI logo left. Links: Dashboard, Parcels, Listings, Deals. Dark bg-gray-900. Tailwind. TypeScript."),
    ("src/components/ParcelCard.tsx",
     "React card. Props: plotNumber, area, emirate, district, status. Dark rounded-xl. Tailwind. TypeScript."),
    ("src/components/CatChat.tsx",
     "React chat widget. Fixed bottom-right. Toggle. Messages. Input. Dark amber. 'use client' useState. TypeScript."),
    ("src/components/DealTimeline.tsx",
     "React progress steps. Props: currentStep. Steps: Initiated Deposit Agreement Documents DLD Completed. Amber. TypeScript."),
    ("src/app/parcels/page.tsx",
     "Next.js parcels list. Grid of ParcelCards. Add button. Empty state. Dark. TypeScript."),
    ("src/app/parcels/new/page.tsx",
     "Next.js add parcel form. plotNumber, area, emirate select, district, price. Dark. 'use client' useState. TypeScript."),
    ("src/app/listings/page.tsx",
     "Next.js marketplace. Grid listing cards. Price area location. Filter. Dark. TypeScript."),
    ("src/app/deals/page.tsx",
     "Next.js deals. List with DealTimeline. Status badges. Dark. TypeScript."),
    ("src/app/settings/page.tsx",
     "Next.js settings. Profile. Verification. Language EN/AR/RU. Dark. 'use client' useState. TypeScript."),
    ("src/app/api/cat/chat/route.ts",
     "Next.js API route. POST {message}. Return {response} real estate advice. NextResponse. TypeScript."),
    ("src/hooks/useAuth.ts",
     "React hook. useState user isLoading. login logout register. Return object. 'use client'. TypeScript."),
    ("src/lib/constants.ts",
     "Constants. ZAAHI_FEE_RATE, ROBOTICS_FUND_RATE, DEPOSIT_RATE, TOKEN_SYMBOL, SUPPORTED_COUNTRIES, DEAL_STATUSES. as const. TypeScript."),
]


def generate_code(filepath, desc):
    if file_exists(filepath):
        return False
    log("  Code: " + filepath)
    prompt = "Write complete TypeScript.\nRULES: ONLY code. No ``` fences. No explanations.\nFILE: {}\nDESC: {}".format(filepath, desc)
    resp = ask_ollama(prompt)
    if resp and len(resp) > 30:
        code = resp
        lines = code.split("\n")
        if lines and lines[0].strip().startswith("```"):
            lines = lines[1:]
        if lines and lines[-1].strip() == "```":
            lines = lines[:-1]
        code = "\n".join(lines)
        if len(code) > 30:
            write_file(filepath, code)
            return True
    log("  Failed: " + filepath)
    return False


# ── MAIN LOOP ──

def main():
    log("=" * 50)
    log("  ZAAHI AUTONOMOUS AI SYSTEM v4")
    log("  Code: " + MODEL_CODE)
    log("  Chat: " + MODEL_CHAT)
    log("  Knowledge: 85 nodes")
    log("=" * 50)

    progress = load_progress()
    session = progress.get("session", 0)

    while True:
        session += 1
        progress["session"] = session
        log("")
        log("=== SESSION {} ===".format(session))

        if not check_health():
            continue

        generated = 0

        # Phase 1: Knowledge
        unpopulated = get_unpopulated_nodes()
        if unpopulated:
            log("Knowledge: {} nodes remaining".format(len(unpopulated)))
            for node in unpopulated[:2]:
                if not check_health():
                    break
                if populate_node(node):
                    generated += 1
                    progress["knowledge_populated"] = progress.get("knowledge_populated", 0) + 1
                time.sleep(10)

        # Phase 2: Backend
        for fp, desc in BACKEND:
            if file_exists(fp):
                continue
            if not check_health():
                break
            if generate_code(fp, desc):
                generated += 1
                progress["code_generated"] = progress.get("code_generated", 0) + 1
            time.sleep(15)
            if generated >= 4:
                break

        # Phase 3: Frontend
        if generated < 4:
            for fp, desc in FRONTEND:
                if file_exists(fp):
                    continue
                if not check_health():
                    break
                if generate_code(fp, desc):
                    generated += 1
                    progress["code_generated"] = progress.get("code_generated", 0) + 1
                time.sleep(15)
                if generated >= 5:
                    break

        # Save + report
        save_progress(progress)
        git_save("Session {}".format(session))

        total_k = len(list(KNOWLEDGE.rglob("summary.md"))) if KNOWLEDGE.exists() else 0
        pop_k = total_k - len(get_unpopulated_nodes())
        be = sum(1 for fp, _ in BACKEND if file_exists(fp))
        fe = sum(1 for fp, _ in FRONTEND if file_exists(fp))

        log("PROGRESS: Knowledge {}/{} | Backend {}/{} | Frontend {}/{}".format(
            pop_k, total_k, be, len(BACKEND), fe, len(FRONTEND)))

        if pop_k >= total_k and be >= len(BACKEND) and fe >= len(FRONTEND):
            log("ALL COMPLETE! Sleeping 30 min...")
            time.sleep(1800)
        elif generated == 0:
            log("No progress. Retry in 5 min...")
            time.sleep(300)
        else:
            log("Rest 2 min...")
            time.sleep(120)


if __name__ == "__main__":
    main()
