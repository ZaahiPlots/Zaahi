#!/bin/bash
# ═══════════════════════════════════════════════════════════════
# ZAAHI PLATFORM — COMPLETE INSTALLER v3
# One file. One command. Fully working system.
#
# Usage:
#   chmod +x install.sh
#   ./install.sh
# ═══════════════════════════════════════════════════════════════

set -euo pipefail

PROJECT="$HOME/zaahi"

green() { echo -e "\033[0;32m[ZAAHI]\033[0m $1"; }
red()   { echo -e "\033[0;31m[ERROR]\033[0m $1"; }

green "═══════════════════════════════════════"
green "  ZAAHI INSTALLER v3"
green "═══════════════════════════════════════"

green "Step 1/10: System packages..."
sudo apt-get update -qq
sudo apt-get install -y -qq git curl wget build-essential nano htop lm-sensors ca-certificates gnupg 2>/dev/null
green "  Done"

green "Step 2/10: Node.js..."
if command -v node &>/dev/null; then
    green "  Already installed: $(node --version)"
else
    curl -fsSL https://deb.nodesource.com/setup_22.x | sudo -E bash -
    sudo apt-get install -y -qq nodejs
    green "  Installed: $(node --version)"
fi

green "Step 3/10: pnpm..."
if command -v pnpm &>/dev/null; then
    green "  Already installed: $(pnpm --version)"
else
    sudo npm install -g pnpm
    green "  Installed: $(pnpm --version)"
fi

green "Step 4/10: Ollama and AI models..."
if command -v ollama &>/dev/null; then
    green "  Ollama ready"
else
    curl -fsSL https://ollama.ai/install.sh | sh
fi
sudo systemctl enable ollama 2>/dev/null || true
sudo systemctl start ollama 2>/dev/null || true
sleep 3
if ollama list 2>/dev/null | grep -q "qwen2.5-coder:7b"; then
    green "  qwen2.5-coder:7b ready"
else
    green "  Downloading qwen2.5-coder:7b (4.7 GB)..."
    ollama pull qwen2.5-coder:7b
fi
if ollama list 2>/dev/null | grep -q "qwen3:8b"; then
    green "  qwen3:8b ready"
else
    green "  Downloading qwen3:8b (5.2 GB)..."
    ollama pull qwen3:8b
fi
ollama rm llama3.1 2>/dev/null || true

green "Step 5/10: Git..."
git config --global user.name "Zhan Rysbayev"
git config --global user.email "zhanrysbayev@gmail.com"

green "Step 6/10: Cleaning junk..."
pkill -f "agent_boss" 2>/dev/null || true
pkill -f "evolution_" 2>/dev/null || true
rm -f "$HOME/agent_boss.py" 2>/dev/null || true
rm -rf "$HOME/ZAAHI_PROJECT" 2>/dev/null || true
if [ -d "$PROJECT" ]; then
    find "$PROJECT" -maxdepth 1 -name "evolution_*.py" -delete 2>/dev/null || true
    rm -rf "$PROJECT/venv" 2>/dev/null || true
    find "$PROJECT" -name "__pycache__" -type d -exec rm -rf {} + 2>/dev/null || true
fi
sudo apt-get autoremove -y -qq 2>/dev/null || true
green "  Done"

green "Step 7/10: Project files..."
mkdir -p "$PROJECT"/logs
mkdir -p "$PROJECT"/reports
mkdir -p "$PROJECT"/core/interfaces
mkdir -p "$PROJECT"/core/types
mkdir -p "$PROJECT"/core/config
mkdir -p "$PROJECT"/core/events
mkdir -p "$PROJECT"/plugins/gov/uae
mkdir -p "$PROJECT"/plugins/kyc
mkdir -p "$PROJECT"/plugins/ai
mkdir -p "$PROJECT"/prisma
mkdir -p "$PROJECT"/src/app/register
mkdir -p "$PROJECT"/src/app/dashboard
mkdir -p "$PROJECT"/src/app/login
mkdir -p "$PROJECT"/src/app/parcels/new
mkdir -p "$PROJECT"/src/app/listings
mkdir -p "$PROJECT"/src/app/deals
mkdir -p "$PROJECT"/src/app/settings
mkdir -p "$PROJECT"/src/app/api/auth/register
mkdir -p "$PROJECT"/src/app/api/parcels
mkdir -p "$PROJECT"/src/app/api/listings
mkdir -p "$PROJECT"/src/app/api/deals
mkdir -p "$PROJECT"/src/app/api/cat/chat
mkdir -p "$PROJECT"/src/components
mkdir -p "$PROJECT"/src/hooks
mkdir -p "$PROJECT"/src/lib

cat > "$PROJECT/.gitignore" << 'XGITIGNORE'
node_modules/
.next/
.env
*.log
dist/
XGITIGNORE

if [ ! -f "$PROJECT/.env" ]; then
cat > "$PROJECT/.env" << 'XENV'
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
fi

if [ ! -s "$PROJECT/package.json" ]; then
cat > "$PROJECT/package.json" << 'XPACKAGE'
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
XPACKAGE
fi

cat > "$PROJECT/tsconfig.json" << 'XTSCONFIG'
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
XTSCONFIG

cat > "$PROJECT/next.config.ts" << 'XNEXTCONFIG'
import type { NextConfig } from "next";
const nextConfig: NextConfig = {};
export default nextConfig;
XNEXTCONFIG

cat > "$PROJECT/postcss.config.mjs" << 'XPOSTCSS'
const config = { plugins: { "@tailwindcss/postcss": {} } };
export default config;
XPOSTCSS

echo '@import "tailwindcss";' > "$PROJECT/src/app/globals.css"

cat > "$PROJECT/src/app/layout.tsx" << 'XLAYOUT'
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
XLAYOUT

if [ ! -f "$PROJECT/src/app/page.tsx" ]; then
cat > "$PROJECT/src/app/page.tsx" << 'XHOME'
import Link from "next/link";

export default function Home() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-b from-gray-900 to-black p-4">
      <h1 className="text-7xl font-bold mb-4 tracking-tight">ZAAHI</h1>
      <p className="text-xl text-gray-400 mb-2">Civilizational Infrastructure for Real Estate</p>
      <p className="text-gray-600 mb-12 text-center max-w-lg">From one land plot in Dubai to every parcel on Earth.</p>
      <Link href="/register" className="px-10 py-4 bg-amber-500 text-black font-bold rounded-xl text-lg hover:bg-amber-400 transition-all hover:scale-105">Enter ZAAHI</Link>
      <p className="mt-16 text-gray-600 text-sm">10% of every dollar builds robots that build the future</p>
    </div>
  );
}
XHOME
fi

if [ ! -f "$PROJECT/src/app/register/page.tsx" ]; then
cat > "$PROJECT/src/app/register/page.tsx" << 'XREGISTER'
"use client";
import { useState } from "react";
import Link from "next/link";

type Role = "owner" | "buyer" | "broker" | "referral";

const ROLES: { id: Role; label: string; desc: string }[] = [
  { id: "owner", label: "Land Owner", desc: "I own land" },
  { id: "buyer", label: "Buyer", desc: "I want to buy" },
  { id: "broker", label: "Broker", desc: "I help clients" },
  { id: "referral", label: "Referral", desc: "I was invited" },
];

export default function RegisterPage() {
  const [step, setStep] = useState(1);
  const [roles, setRoles] = useState<Role[]>([]);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");

  const toggle = (r: Role) =>
    setRoles((p) => (p.includes(r) ? p.filter((x) => x !== r) : [...p, r]));

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-900 to-black text-white flex items-center justify-center p-4">
      <div className="max-w-md w-full">
        <Link href="/" className="text-gray-500 text-sm mb-6 block">Back</Link>
        <h1 className="text-3xl font-bold text-center mb-2">Join ZAAHI</h1>
        <div className="flex gap-2 mb-8">
          {[1,2,3,4].map((s) => (
            <div key={s} className={"h-1.5 flex-1 rounded-full " + (step >= s ? "bg-amber-500" : "bg-gray-800")} />
          ))}
        </div>
        {step === 1 && (<div>
          <h2 className="text-xl mb-4">Who are you?</h2>
          <div className="space-y-3">
            {ROLES.map((role) => (
              <button key={role.id} onClick={() => toggle(role.id)} className={"w-full p-4 rounded-xl border text-left " + (roles.includes(role.id) ? "border-amber-500 bg-amber-500/10" : "border-gray-800")}>
                <p className="font-medium">{role.label}</p>
                <p className="text-sm text-gray-500">{role.desc}</p>
              </button>
            ))}
          </div>
          <button onClick={() => roles.length > 0 && setStep(2)} disabled={roles.length === 0} className="w-full mt-6 py-3 bg-amber-500 text-black font-bold rounded-xl disabled:opacity-30">Continue</button>
        </div>)}
        {step === 2 && (<div>
          <h2 className="text-xl mb-4">Your info</h2>
          <input type="text" value={name} onChange={(e) => setName(e.target.value)} placeholder="Full name" className="w-full p-3 bg-gray-900 border border-gray-800 rounded-xl mb-3 focus:border-amber-500 focus:outline-none" />
          <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="Email" className="w-full p-3 bg-gray-900 border border-gray-800 rounded-xl mb-3 focus:border-amber-500 focus:outline-none" />
          <div className="border-2 border-dashed border-gray-700 rounded-xl p-6 text-center text-gray-400">Upload passport or Emirates ID</div>
          <div className="flex gap-3 mt-6">
            <button onClick={() => setStep(1)} className="px-6 py-3 border border-gray-800 rounded-xl">Back</button>
            <button onClick={() => name && email && setStep(3)} disabled={!name || !email} className="flex-1 py-3 bg-amber-500 text-black font-bold rounded-xl disabled:opacity-30">Continue</button>
          </div>
        </div>)}
        {step === 3 && (<div>
          <h2 className="text-xl mb-4">Verify identity</h2>
          <button className="w-full p-4 mb-3 bg-gray-900 border border-gray-800 rounded-xl text-left">Face scan</button>
          <button className="w-full p-4 bg-gray-900 border border-gray-800 rounded-xl text-left">Voice recording</button>
          <div className="flex gap-3 mt-6">
            <button onClick={() => setStep(2)} className="px-6 py-3 border border-gray-800 rounded-xl">Back</button>
            <button onClick={() => setStep(4)} className="flex-1 py-3 bg-amber-500 text-black font-bold rounded-xl">Continue</button>
          </div>
        </div>)}
        {step === 4 && (<div className="text-center py-8">
          <div className="text-7xl mb-6">🐱</div>
          <h2 className="text-3xl font-bold mb-2">Welcome to ZAAHI!</h2>
          <p className="text-gray-400 mb-8">Cat is preparing your office...</p>
          <Link href="/dashboard" className="px-10 py-3 bg-amber-500 text-black font-bold rounded-xl">Enter Office</Link>
        </div>)}
      </div>
    </div>
  );
}
XREGISTER
fi

if [ ! -f "$PROJECT/src/app/dashboard/page.tsx" ]; then
cat > "$PROJECT/src/app/dashboard/page.tsx" << 'XDASHBOARD'
import Link from "next/link";

export default function Dashboard() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-900 to-black p-6">
      <div className="max-w-6xl mx-auto">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-2xl font-bold">My Office</h1>
          <span className="text-amber-500">Cat</span>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
          <div className="bg-gray-900 border border-gray-800 rounded-xl p-6">
            <p className="text-gray-500 text-sm">Verification</p>
            <p className="text-2xl font-bold text-amber-500 mt-1">Basic</p>
          </div>
          <div className="bg-gray-900 border border-gray-800 rounded-xl p-6">
            <p className="text-gray-500 text-sm">My Parcels</p>
            <p className="text-2xl font-bold mt-1">0</p>
          </div>
          <div className="bg-gray-900 border border-gray-800 rounded-xl p-6">
            <p className="text-gray-500 text-sm">Active Deals</p>
            <p className="text-2xl font-bold mt-1">0</p>
          </div>
        </div>
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-6 mb-8">
          <p className="text-amber-500 font-medium mb-2">Cat says:</p>
          <p className="text-gray-400">Welcome! Start by adding your first land parcel.</p>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {[{href:"/parcels",icon:"🏗",label:"Parcels"},{href:"/listings",icon:"📋",label:"Listings"},{href:"/deals",icon:"💼",label:"Deals"},{href:"/settings",icon:"⚙",label:"Settings"}].map((item) => (
            <Link key={item.href} href={item.href} className="bg-gray-900 border border-gray-800 rounded-xl p-4 text-center hover:border-gray-700">
              <p className="text-2xl mb-2">{item.icon}</p>
              <p className="text-sm">{item.label}</p>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
XDASHBOARD
fi

if [ ! -f "$PROJECT/CLAUDE.md" ]; then
cat > "$PROJECT/CLAUDE.md" << 'XMEMORY'
# ZAAHI Agent Memory
## State
- Phase: 1
- Session: 0
- Status: READY
## Next
Generate platform components
XMEMORY
fi

green "  Files created"

green "Step 8/10: npm packages..."
cd "$PROJECT"
pnpm install
green "  Done"

green "Step 9/10: AI agent..."
cat > "$PROJECT/agent.py" << 'XAGENT'
#!/usr/bin/env python3
"""ZAAHI Autonomous Agent v3"""

import subprocess
import time
import sys
from pathlib import Path
from datetime import datetime

PROJECT = Path.home() / "zaahi"
MODEL = "qwen2.5-coder:7b"
LOG_DIR = PROJECT / "logs"
LOG_DIR.mkdir(exist_ok=True)


def log(msg):
    ts = datetime.now().strftime("%H:%M:%S")
    line = "[{}] {}".format(ts, msg)
    print(line, flush=True)
    try:
        with open(str(LOG_DIR / "agent.log"), "a", encoding="utf-8") as f:
            f.write(line + "\n")
    except Exception:
        pass


def run_cmd(cmd, timeout_sec=120):
    try:
        result = subprocess.run(
            cmd, shell=True, capture_output=True, text=True,
            timeout=timeout_sec, cwd=str(PROJECT),
        )
        return result.stdout.strip(), result.returncode == 0
    except Exception:
        return "", False


def write_file(rel_path, content):
    full = PROJECT / rel_path
    full.parent.mkdir(parents=True, exist_ok=True)
    full.write_text(content, encoding="utf-8")
    log("  + " + rel_path)


def file_exists(rel_path):
    return (PROJECT / rel_path).exists()


def ask_ollama(prompt):
    try:
        result = subprocess.run(
            ["ollama", "run", MODEL], input=prompt,
            capture_output=True, text=True, timeout=300,
        )
        if result.returncode == 0:
            return result.stdout.strip()
        return None
    except Exception:
        return None


def check_health():
    try:
        r = subprocess.run(
            ["nvidia-smi", "--query-gpu=temperature.gpu", "--format=csv,noheader"],
            capture_output=True, text=True, timeout=5,
        )
        if r.returncode == 0 and int(r.stdout.strip()) > 82:
            log("GPU hot, pause 5 min")
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
                    log("RAM low, pause 3 min")
                    time.sleep(180)
                    return False
    except Exception:
        pass
    return True


def git_save(msg):
    run_cmd('git add -A && git commit -m "{}" 2>/dev/null'.format(msg))


def update_memory(session, action):
    try:
        ts = len(list(PROJECT.rglob("*.ts"))) + len(list(PROJECT.rglob("*.tsx")))
    except Exception:
        ts = 0
    now = datetime.now().strftime("%Y-%m-%d %H:%M")
    content = "# ZAAHI Agent Memory\n## State\n- Session: {}\n- Files: {}\n- Updated: {}\n## Last\n{}\n".format(
        session, ts, now, action
    )
    (PROJECT / "CLAUDE.md").write_text(content, encoding="utf-8")


COMPONENTS = [
    ("src/app/api/auth/register/route.ts",
     "Next.js API route POST for registration. Parse JSON {name,email,roles}. Return {id,referralCode}. Import NextResponse from next/server. TypeScript."),
    ("src/app/api/parcels/route.ts",
     "Next.js API. GET returns sample parcels array. POST accepts {plotNumber,area,emirate,district}. NextResponse. TypeScript."),
    ("src/app/api/listings/route.ts",
     "Next.js API. GET returns sample listings. POST accepts {parcelId,askingPrice,type}. NextResponse. TypeScript."),
    ("src/hooks/useAuth.ts",
     "React hook useAuth. useState for user and isLoading. login logout register functions. Return {user,isLoading,login,logout,register}. use client. TypeScript."),
    ("src/components/Navbar.tsx",
     "React nav bar. ZAAHI logo left. Links Dashboard Parcels Listings Deals. Dark bg-gray-900. Tailwind. TypeScript."),
    ("src/components/ParcelCard.tsx",
     "React card. Props: plotNumber area emirate district status. Dark bg-gray-900 rounded-xl. Tailwind. TypeScript."),
    ("src/components/CatChat.tsx",
     "React chat widget. Fixed bottom-right. Toggle open/close. Messages list. Input. Dark theme amber accents. use client useState. TypeScript."),
    ("src/app/parcels/page.tsx",
     "Page listing parcels. My Parcels heading. Add button. Grid of cards. Dark theme. TypeScript."),
    ("src/app/parcels/new/page.tsx",
     "Form to add parcel. plotNumber area emirate select district inputs. Submit. Dark. use client useState. TypeScript."),
    ("src/app/listings/page.tsx",
     "Marketplace page. Grid of listing cards with price area location. Dark theme. TypeScript."),
    ("src/app/deals/page.tsx",
     "Deals page. List of deals with status badges. Dark theme. TypeScript."),
    ("src/app/settings/page.tsx",
     "Settings. Profile name email. Verification badge. Language select EN AR RU. Dark. use client useState. TypeScript."),
    ("src/app/api/cat/chat/route.ts",
     "API for Cat chat. POST {message}. Return {response} with helpful real estate advice. NextResponse. TypeScript."),
    ("src/components/DealTimeline.tsx",
     "Deal progress. Steps Initiated Deposit Agreement Documents DLD Completed. Props currentStep number. Amber highlight. TypeScript."),
    ("src/lib/constants.ts",
     "Constants. ZAAHI_FEE_RATE 0.002. ROBOTICS_FUND_RATE 0.10. DEPOSIT_RATE 0.10. TOKEN_SYMBOL ZAH. SUPPORTED_COUNTRIES array. as const. TypeScript."),
]


def generate(filepath, desc):
    if file_exists(filepath):
        return False
    log("  Generating: " + filepath)
    prompt = "Write complete TypeScript file.\nRULES: output ONLY code. No markdown fences. No explanations.\nFILE: {}\nDESCRIPTION: {}".format(filepath, desc)
    resp = ask_ollama(prompt)
    if resp is None or len(resp) < 30:
        log("  Failed: no response")
        return False
    code = resp
    lines = code.split("\n")
    if lines and lines[0].strip().startswith("```"):
        lines = lines[1:]
    if lines and lines[-1].strip() == "```":
        lines = lines[:-1]
    code = "\n".join(lines)
    if len(code) < 30:
        log("  Failed: too short")
        return False
    write_file(filepath, code)
    git_save("AI: " + filepath)
    return True


def main():
    log("=" * 50)
    log("  ZAAHI AUTONOMOUS AGENT v3")
    log("  Model: " + MODEL)
    log("=" * 50)

    session = 0
    while True:
        session += 1
        log("")
        log("=== SESSION {} ===".format(session))

        if not check_health():
            continue

        done = 0
        for fp, desc in COMPONENTS:
            if file_exists(fp):
                continue
            if not check_health():
                break
            if generate(fp, desc):
                done += 1
                update_memory(session, "Generated " + fp)
            time.sleep(15)
            if done >= 3:
                break

        if done == 0:
            all_done = all(file_exists(fp) for fp, _ in COMPONENTS)
            if all_done:
                log("All {} components built!".format(len(COMPONENTS)))
                log("Run: cd ~/zaahi && pnpm dev")
                time.sleep(600)
            else:
                log("Some failed, retry next session")

        git_save("Session {}".format(session))
        update_memory(session, "Session {}: {} files".format(session, done))
        log("Session {} done. {} files. Rest 2 min...".format(session, done))
        time.sleep(120)


if __name__ == "__main__":
    main()
XAGENT

chmod +x "$PROJECT/agent.py"
green "  Agent created"

green "Step 10/10: Git + systemd..."
cd "$PROJECT"
if [ ! -d ".git" ]; then
    git init
fi
git add -A 2>/dev/null || true
git commit -m "ZAAHI v3 $(date '+%Y-%m-%d %H:%M')" 2>/dev/null || true

sudo tee /etc/systemd/system/zaahi-agent.service > /dev/null << XSERVICE
[Unit]
Description=ZAAHI AI Agent
After=network.target ollama.service
[Service]
Type=simple
User=$(whoami)
WorkingDirectory=$PROJECT
ExecStart=/usr/bin/python3 $PROJECT/agent.py
Restart=always
RestartSec=60
StandardOutput=append:$PROJECT/logs/agent.log
StandardError=append:$PROJECT/logs/agent-error.log
Environment=HOME=$HOME
Environment=PATH=/usr/local/bin:/usr/bin:/bin
[Install]
WantedBy=multi-user.target
XSERVICE

sudo systemctl daemon-reload
sudo systemctl enable zaahi-agent 2>/dev/null
green "  Done"

green ""
green "═══════════════════════════════════════"
green "  HEALTH CHECK"
green "═══════════════════════════════════════"
PASS=0; FAIL=0
do_check() {
    if eval "$1" > /dev/null 2>&1; then
        green "  OK: $2"; PASS=$((PASS+1))
    else
        red "  FAIL: $2"; FAIL=$((FAIL+1))
    fi
}
do_check "command -v node" "Node.js"
do_check "command -v pnpm" "pnpm"
do_check "command -v ollama" "Ollama"
do_check "command -v git" "Git"
do_check "command -v python3" "Python3"
do_check "systemctl is-active --quiet ollama" "Ollama service"
do_check "ollama list 2>/dev/null | grep -q qwen2.5" "Model qwen2.5-coder"
do_check "ollama list 2>/dev/null | grep -q qwen3" "Model qwen3"
do_check "test -f $PROJECT/ZAAHI_PROMPT_FINAL.md" "Prompt file"
do_check "test -f $PROJECT/CLAUDE.md" "Agent memory"
do_check "test -f $PROJECT/agent.py" "Agent script"
do_check "test -f $PROJECT/package.json" "package.json"
do_check "test -d $PROJECT/node_modules" "node_modules"
do_check "test -f $PROJECT/src/app/layout.tsx" "layout.tsx"
do_check "test -f $PROJECT/src/app/page.tsx" "Home page"
do_check "test -f $PROJECT/src/app/register/page.tsx" "Register page"
do_check "test -d $PROJECT/.git" "Git repo"
do_check "swapon --show 2>/dev/null | grep -q /" "Swap"
green ""
green "  Result: $PASS passed, $FAIL failed"
if [ "$FAIL" -eq 0 ]; then
    green "  SYSTEM READY"
else
    red "  $FAIL items need fixing"
fi
green ""
green "  Start agent:   sudo systemctl start zaahi-agent"
green "  Check status:  sudo systemctl status zaahi-agent"
green "  View logs:     tail -f ~/zaahi/logs/agent.log"
green "  Start web:     cd ~/zaahi && pnpm dev"
green "  Browser:       http://localhost:3000"
green "═══════════════════════════════════════"
