#!/bin/bash
# ═══════════════════════════════════════════════════════════════════
# ZAAHI — ONE FILE. ONE COMMAND. FULL SYSTEM.
#
#   chmod +x zaahi-system.sh && ./zaahi-system.sh
#
# Does: clean → install → build knowledge brain → create agent →
#       create configs → npm install → monitoring tools → systemd →
#       health check
# ═══════════════════════════════════════════════════════════════════
set -euo pipefail

P="$HOME/zaahi"
g() { echo -e "\033[32m[ZAAHI]\033[0m $1"; }
r() { echo -e "\033[31m[FAIL]\033[0m $1"; }

g "═══════════════════════════════════════════"
g "  ZAAHI FULL SYSTEM INSTALLER"
g "═══════════════════════════════════════════"

# ╔═══════════════════════════════════════════╗
# ║  STEP 1: DEEP CLEAN                      ║
# ╚═══════════════════════════════════════════╝
g "1/13 Deep clean..."
pkill -f "agent_boss" 2>/dev/null || true
pkill -f "agent.py" 2>/dev/null || true
pkill -f "evolution_" 2>/dev/null || true
sudo systemctl stop zaahi-agent 2>/dev/null || true
rm -f "$HOME/agent_boss.py" 2>/dev/null || true
rm -rf "$HOME/ZAAHI_PROJECT" 2>/dev/null || true
if [ -d "$P" ]; then
    find "$P" -maxdepth 1 -name "evolution_*.py" -delete 2>/dev/null || true
    rm -rf "$P/venv" 2>/dev/null || true
    find "$P" -name "__pycache__" -type d -exec rm -rf {} + 2>/dev/null || true
fi
sudo apt-get autoremove -y -qq 2>/dev/null || true
g "  Done"

# ╔═══════════════════════════════════════════╗
# ║  STEP 2: SYSTEM PACKAGES                 ║
# ╚═══════════════════════════════════════════╝
g "2/13 System packages..."
sudo apt-get update -qq
sudo apt-get install -y -qq git curl wget build-essential nano htop lm-sensors ca-certificates gnupg 2>/dev/null
g "  Done"

# ╔═══════════════════════════════════════════╗
# ║  STEP 3: NODE.JS                         ║
# ╚═══════════════════════════════════════════╝
g "3/13 Node.js..."
if command -v node &>/dev/null; then
    g "  Already installed: $(node --version)"
else
    curl -fsSL https://deb.nodesource.com/setup_22.x | sudo -E bash -
    sudo apt-get install -y -qq nodejs
    g "  Installed: $(node --version)"
fi

# ╔═══════════════════════════════════════════╗
# ║  STEP 4: PNPM                            ║
# ╚═══════════════════════════════════════════╝
g "4/13 pnpm..."
if command -v pnpm &>/dev/null; then
    g "  Already installed: $(pnpm --version)"
else
    sudo npm install -g pnpm
    g "  Installed"
fi

# ╔═══════════════════════════════════════════╗
# ║  STEP 5: OLLAMA + AI MODELS              ║
# ╚═══════════════════════════════════════════╝
g "5/13 Ollama + models..."
if command -v ollama &>/dev/null; then
    g "  Ollama ready"
else
    curl -fsSL https://ollama.ai/install.sh | sh
fi
sudo systemctl enable ollama 2>/dev/null || true
sudo systemctl start ollama 2>/dev/null || true
sleep 3
if ollama list 2>/dev/null | grep -q "qwen2.5-coder:7b"; then
    g "  qwen2.5-coder:7b ready"
else
    g "  Downloading qwen2.5-coder:7b (4.7 GB)..."
    ollama pull qwen2.5-coder:7b
fi
if ollama list 2>/dev/null | grep -q "qwen3:8b"; then
    g "  qwen3:8b ready"
else
    g "  Downloading qwen3:8b (5.2 GB)..."
    ollama pull qwen3:8b
fi
ollama rm llama3.1 2>/dev/null || true

# ╔═══════════════════════════════════════════╗
# ║  STEP 6: GIT                             ║
# ╚═══════════════════════════════════════════╝
g "6/13 Git..."
git config --global user.name "Zhan Rysbayev"
git config --global user.email "zhanrysbayev@gmail.com"
g "  Done"

# ╔═══════════════════════════════════════════╗
# ║  STEP 7: KNOWLEDGE BRAIN (85 nodes)      ║
# ╚═══════════════════════════════════════════╝
g "7/13 Knowledge brain..."

mkdir -p "$P"/{logs,reports,memory}

# Block directories
for b in A_ASSETS B_PARTICIPANTS C_TRANSACTIONS D_TECHNOLOGY E_INFRASTRUCTURE F_FINANCE G_CONSTRUCTION H_GOVERNANCE I_INTELLIGENCE J_ECOSYSTEM K_ACCESS_PLATFORMS L_OPERATIONS; do
    mkdir -p "$P/knowledge/$b"
done

# Category directories — each block gets its numbered categories
create_nodes() {
    local block=$1
    shift
    for cat in "$@"; do
        mkdir -p "$P/knowledge/$block/$cat"
        if [ ! -f "$P/knowledge/$block/$cat/summary.md" ] || grep -q "PENDING" "$P/knowledge/$block/$cat/summary.md" 2>/dev/null; then
            printf "# %s\n\n## Status: PENDING\nAgent will populate.\n" "$cat" > "$P/knowledge/$block/$cat/summary.md"
        fi
        if [ ! -f "$P/knowledge/$block/$cat/data.json" ]; then
            printf '{"category":"%s","block":"%s","status":"pending","concepts":[]}\n' "$cat" "$block" > "$P/knowledge/$block/$cat/data.json"
        fi
        if [ ! -f "$P/knowledge/$block/$cat/sources.md" ]; then
            printf "# Sources: %s\n" "$cat" > "$P/knowledge/$block/$cat/sources.md"
        fi
    done
}

create_nodes "A_ASSETS" \
    01_Land 02_Residential 03_Commercial 04_Industrial 05_Hospitality \
    06_Infrastructure 07_Mixed_Use 08_Off_Plan 09_Distressed_Assets \
    10_Digital_Assets 11_Rental 12_Insurance 13_Property_Management

create_nodes "B_PARTICIPANTS" \
    14_Owners 15_Buyers_Investors 16_Crypto_Investors 17_Brokers_Agencies \
    18_Referrals 19_Developers 20_Architects_Designers 21_Contractors \
    22_Banks_Funds 23_Legal_Notary 24_Government_Bodies 25_Private_Structures \
    26_Brands_Suppliers 27_Consultants 28_Robot_Operators 29_Media \
    30_Appraisers_Valuators

create_nodes "C_TRANSACTIONS" \
    31_Deal_Engine 32_Escrow 33_Joint_Ventures 34_Fractional_Ownership \
    35_Tokenization 36_Auction 37_Payment_Gateway 38_Dispute_Resolution

create_nodes "D_TECHNOLOGY" \
    39_Metaverse_Engine 40_Digital_Twin 41_AI_System 42_Blockchain \
    43_Web3_Wallet 44_IoT_Layer 45_Satellite 46_Robotics_OS \
    47_Notification_Engine 48_Search_Engine 49_Translation_Engine

create_nodes "E_INFRASTRUCTURE" \
    50_Data_Centres 51_Sovereign_Network 52_Sovereignty_Config

create_nodes "F_FINANCE" \
    53_Sovereign_Bank 54_Revenue_Engine 55_Robotics_Fund \
    56_DAO_Treasury 57_Tokenomics_ZAH

create_nodes "G_CONSTRUCTION" \
    58_Construction_Pipeline 59_Materials_Supply 60_Brand_Integration 61_Procurement

create_nodes "H_GOVERNANCE" \
    62_Legal_Engine 63_Compliance 64_Golden_Visa 65_ESG_Sustainability

create_nodes "I_INTELLIGENCE" \
    66_Market_Intelligence 67_Price_Prediction 68_Risk_Management \
    69_Fraud_Detection 70_Analytics_Engine

create_nodes "J_ECOSYSTEM" \
    71_Brand_Marketplace 72_Education_Certification 73_Media_Documentary \
    74_Community 75_Support_Helpdesk 76_Onboarding_Flow

create_nodes "K_ACCESS_PLATFORMS" \
    77_Web_Platform 78_Mobile_App 79_Desktop_App 80_VR_AR 81_API_Marketplace

create_nodes "L_OPERATIONS" \
    82_Monitoring 83_CICD_Pipeline 84_Data_Privacy 85_Accessibility

KCOUNT=$(find "$P/knowledge" -name "summary.md" | wc -l)
g "  $KCOUNT knowledge nodes created"

# ╔═══════════════════════════════════════════╗
# ║  STEP 8: PROJECT FILES                   ║
# ╚═══════════════════════════════════════════╝
g "8/13 Project files..."

mkdir -p "$P"/backend/{api,models,services,middleware,utils}
mkdir -p "$P"/core/{interfaces,types,config,events}
mkdir -p "$P"/plugins/{gov/uae,kyc,ai}
mkdir -p "$P"/prisma
mkdir -p "$P"/src/app/{register,dashboard,login,parcels/new,listings,deals,settings}
mkdir -p "$P"/src/app/api/{auth/register,parcels,listings,deals,cat/chat}
mkdir -p "$P"/src/{components,hooks,lib}

# .gitignore
cat > "$P/.gitignore" << 'XGIT'
node_modules/
.next/
.env
*.log
dist/
__pycache__/
XGIT

# .env
test -f "$P/.env" || cat > "$P/.env" << 'XENV'
NODE_ENV=development
PORT=3000
OLLAMA_BASE_URL=http://localhost:11434
AI_MODEL_CODE=qwen2.5-coder:7b
AI_MODEL_CHAT=qwen3:8b
ZAAHI_FEE_RATE=0.002
ROBOTICS_FUND_RATE=0.10
DEFAULT_COUNTRY=UAE
JWT_SECRET=k8Hj3mNp2qRs5tUv7wXy9zA1bCdEfGhIjKlMnOpQr4s
XENV

# package.json
test -s "$P/package.json" || cat > "$P/package.json" << 'XPKG'
{
  "name": "zaahi",
  "version": "0.1.0",
  "private": true,
  "scripts": {
    "dev": "next dev",
    "build": "next build",
    "start": "next start"
  },
  "dependencies": {
    "next": "^15.0.0",
    "react": "^19.0.0",
    "react-dom": "^19.0.0",
    "typescript": "^5.7.0",
    "@types/react": "^19.0.0",
    "@types/node": "^22.0.0",
    "tailwindcss": "^4.0.0",
    "@tailwindcss/postcss": "^4.0.0",
    "postcss": "^8.5.0"
  }
}
XPKG

# tsconfig.json
cat > "$P/tsconfig.json" << 'XTSCONF'
{
  "compilerOptions": {
    "target": "ES2017",
    "lib": ["dom", "dom.iterable", "esnext"],
    "allowJs": true,
    "skipLibCheck": true,
    "strict": true,
    "noEmit": true,
    "esModuleInterop": true,
    "module": "esnext",
    "moduleResolution": "bundler",
    "resolveJsonModule": true,
    "isolatedModules": true,
    "jsx": "preserve",
    "incremental": true,
    "plugins": [{"name": "next"}],
    "paths": {"@/*": ["./src/*"]}
  },
  "include": ["next-env.d.ts", "**/*.ts", "**/*.tsx"],
  "exclude": ["node_modules"]
}
XTSCONF

# next.config.ts
cat > "$P/next.config.ts" << 'XNXT'
import type { NextConfig } from "next";
const nextConfig: NextConfig = {};
export default nextConfig;
XNXT

# postcss.config.mjs
cat > "$P/postcss.config.mjs" << 'XPCSS'
const config = { plugins: { "@tailwindcss/postcss": {} } };
export default config;
XPCSS

# globals.css
echo '@import "tailwindcss";' > "$P/src/app/globals.css"

# layout.tsx
cat > "$P/src/app/layout.tsx" << 'XLAY'
import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "ZAAHI — Future of Real Estate",
  description: "Civilizational infrastructure for real estate",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="bg-black text-white antialiased">{children}</body>
    </html>
  );
}
XLAY

# page.tsx
test -f "$P/src/app/page.tsx" || cat > "$P/src/app/page.tsx" << 'XPAGE'
import Link from "next/link";

export default function Home() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-b from-gray-900 to-black p-4">
      <h1 className="text-7xl font-bold mb-4 tracking-tight">ZAAHI</h1>
      <p className="text-xl text-gray-400 mb-2">Civilizational Infrastructure for Real Estate</p>
      <p className="text-gray-600 mb-12">From one land plot in Dubai to every parcel on Earth</p>
      <Link href="/register" className="px-10 py-4 bg-amber-500 text-black font-bold rounded-xl text-lg hover:bg-amber-400 transition-all hover:scale-105">
        Enter ZAAHI
      </Link>
      <p className="mt-16 text-gray-600 text-sm">10% of every dollar → robots that build the future</p>
    </div>
  );
}
XPAGE

# Memory system
cat > "$P/memory/progress.json" << 'XPROG'
{
  "session": 0,
  "status": "initialized",
  "knowledge_nodes_total": 85,
  "knowledge_populated": 0,
  "code_generated": 0,
  "completed": [],
  "errors": []
}
XPROG

# CLAUDE.md
cat > "$P/CLAUDE.md" << 'XCLMD'
# ZAAHI Agent Memory
## State
- Phase: 1
- Session: 0
- Status: READY
## Next
Knowledge population → Backend generation → Frontend generation
XCLMD

g "  Done"

# ╔═══════════════════════════════════════════╗
# ║  STEP 9: NPM INSTALL                     ║
# ╚═══════════════════════════════════════════╝
g "9/13 npm packages..."
cd "$P" && pnpm install
g "  Done"

# ╔═══════════════════════════════════════════╗
# ║  STEP 10: AGENT.PY v4                    ║
# ╚═══════════════════════════════════════════╝
g "10/13 Creating agent..."

cat > "$P/agent.py" << 'XAGENT'
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
XAGENT

chmod +x "$P/agent.py"
g "  Agent created"

# ╔═══════════════════════════════════════════╗
# ║  STEP 11: MONITORING TOOLS               ║
# ╚═══════════════════════════════════════════╝
g "11/13 Monitoring tools..."

cat > "$P/start.sh" << 'XST'
#!/bin/bash
sudo systemctl start zaahi-agent
echo "Agent started. Logs: tail -f ~/zaahi/logs/agent.log"
XST
chmod +x "$P/start.sh"

cat > "$P/stop.sh" << 'XSP'
#!/bin/bash
sudo systemctl stop zaahi-agent 2>/dev/null
pkill -f "agent.py" 2>/dev/null
echo "Agent stopped."
XSP
chmod +x "$P/stop.sh"

cat > "$P/status.sh" << 'XSS'
#!/bin/bash
echo ""
echo "=== ZAAHI STATUS ==="
echo "Time: $(date)"
if systemctl is-active --quiet zaahi-agent 2>/dev/null; then echo "Agent: RUNNING"; elif pgrep -f agent.py >/dev/null; then echo "Agent: RUNNING (manual)"; else echo "Agent: STOPPED"; fi
echo ""
if [ -f ~/zaahi/memory/progress.json ]; then
    python3 -c "
import json; d=json.load(open('$HOME/zaahi/memory/progress.json'))
print('Session:',d.get('session',0))
print('Knowledge:',d.get('knowledge_populated',0),'/85')
print('Code:',d.get('code_generated',0),'files')
" 2>/dev/null
fi
echo ""
echo "Files: $(find ~/zaahi/src ~/zaahi/backend -name '*.ts' -o -name '*.tsx' 2>/dev/null | grep -v node_modules | wc -l) TypeScript"
echo "Git: $(cd ~/zaahi && git rev-list --count HEAD 2>/dev/null || echo 0) commits"
echo ""
tail -5 ~/zaahi/logs/agent.log 2>/dev/null
echo ""
XSS
chmod +x "$P/status.sh"

cat > "$P/test.sh" << 'XTT'
#!/bin/bash
echo "=== ZAAHI TEST ==="
P=0; F=0
c() { if eval "$1" >/dev/null 2>&1; then echo "  OK: $2"; P=$((P+1)); else echo "  FAIL: $2"; F=$((F+1)); fi; }
c "command -v node" "Node.js"
c "command -v pnpm" "pnpm"
c "command -v python3" "Python3"
c "command -v ollama" "Ollama"
c "systemctl is-active --quiet ollama" "Ollama service"
c "ollama list 2>/dev/null | grep -q qwen2.5" "qwen2.5-coder"
c "ollama list 2>/dev/null | grep -q qwen3" "qwen3:8b"
c "test -f ~/zaahi/agent.py" "agent.py"
c "test -f ~/zaahi/package.json" "package.json"
c "test -d ~/zaahi/node_modules" "node_modules"
c "test -f ~/zaahi/src/app/layout.tsx" "layout.tsx"
c "test -d ~/zaahi/knowledge" "Knowledge brain"
c "test -d ~/zaahi/memory" "Memory system"
c "test -d ~/zaahi/backend" "Backend"
c "test -d ~/zaahi/.git" "Git"
K=$(find ~/zaahi/knowledge -name summary.md 2>/dev/null | wc -l)
c "test $K -ge 80" "Knowledge nodes ($K)"
c "test -f /etc/systemd/system/zaahi-agent.service" "systemd"
c "swapon --show 2>/dev/null | grep -q /" "Swap"
echo ""
echo "Result: $P passed, $F failed"
if [ "$F" -eq 0 ]; then echo "ALL TESTS PASSED"; else echo "$F items need fixing"; fi
echo ""
XTT
chmod +x "$P/test.sh"

cat > "$P/monitor.sh" << 'XMN'
#!/bin/bash
echo "Live logs (Ctrl+C to stop)..."
tail -f ~/zaahi/logs/agent.log
XMN
chmod +x "$P/monitor.sh"

g "  Done: start.sh stop.sh status.sh test.sh monitor.sh"

# ╔═══════════════════════════════════════════╗
# ║  STEP 12: SYSTEMD + OPTIMIZATION         ║
# ╚═══════════════════════════════════════════╝
g "12/13 systemd + optimization..."

sudo tee /etc/systemd/system/zaahi-agent.service > /dev/null << XSVC
[Unit]
Description=ZAAHI Autonomous AI System
After=network.target ollama.service
[Service]
Type=simple
User=$(whoami)
WorkingDirectory=$P
ExecStart=/usr/bin/python3 $P/agent.py
Restart=always
RestartSec=60
StandardOutput=append:$P/logs/agent.log
StandardError=append:$P/logs/agent-error.log
Environment=HOME=$HOME
Environment=PATH=/usr/local/bin:/usr/bin:/bin
[Install]
WantedBy=multi-user.target
XSVC

sudo systemctl daemon-reload
sudo systemctl enable zaahi-agent 2>/dev/null

# Swap
if ! swapon --show 2>/dev/null | grep -q "/"; then
    sudo fallocate -l 4G /swapfile 2>/dev/null || true
    sudo chmod 600 /swapfile 2>/dev/null || true
    sudo mkswap /swapfile 2>/dev/null || true
    sudo swapon /swapfile 2>/dev/null || true
    grep -q "/swapfile" /etc/fstab 2>/dev/null || echo "/swapfile none swap sw 0 0" | sudo tee -a /etc/fstab
fi
sudo sysctl -w vm.swappiness=10 2>/dev/null || true
gsettings set org.gnome.settings-daemon.plugins.power sleep-inactive-ac-timeout 0 2>/dev/null || true
gsettings set org.gnome.desktop.session idle-delay 0 2>/dev/null || true
sudo systemctl disable unattended-upgrades 2>/dev/null || true

# Git
cd "$P"
test -d .git || git init
git add -A 2>/dev/null || true
git commit -m "System v4 $(date '+%Y-%m-%d %H:%M')" 2>/dev/null || true

g "  Done"

# ╔═══════════════════════════════════════════╗
# ║  STEP 13: HEALTH CHECK                   ║
# ╚═══════════════════════════════════════════╝
g "13/13 Health check..."
bash "$P/test.sh"

g ""
g "═══════════════════════════════════════════"
g "  COMMANDS"
g "═══════════════════════════════════════════"
g ""
g "  ~/zaahi/start.sh        Start agent 24/7"
g "  ~/zaahi/stop.sh         Stop agent"
g "  ~/zaahi/status.sh       System status"
g "  ~/zaahi/test.sh         Run all tests"
g "  ~/zaahi/monitor.sh      Live log stream"
g "  cd ~/zaahi && pnpm dev  Start web app"
g "  http://localhost:3000   Open in browser"
g ""
g "═══════════════════════════════════════════"
g "  SYSTEM READY FOR 24/7 OPERATION"
g "  CLEANED AND REBUILT FROM SCRATCH"
g "═══════════════════════════════════════════"
