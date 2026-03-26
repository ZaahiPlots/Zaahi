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
