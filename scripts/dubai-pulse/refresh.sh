#!/usr/bin/env bash
# ZAAHI · Dubai Pulse refresh orchestrator.
#
# Daily/weekly cron-ready wrapper around download_datasets.py + normalize.py.
# Designed to run on Жан's Getac X600 Server (Ubuntu 24.04 LTS) via systemd
# timer or cron — see RUNBOOK at docs/research/dubai-pulse-pipeline-runbook.md.
#
# USAGE
# -----
#   ./scripts/dubai-pulse/refresh.sh                  # full refresh: download + normalize all 9
#   ./scripts/dubai-pulse/refresh.sh --datasets brokers,transactions
#   ./scripts/dubai-pulse/refresh.sh --download-only  # skip normalize step
#   ./scripts/dubai-pulse/refresh.sh --normalize-only # skip download step (re-normalize from existing raw)
#   ./scripts/dubai-pulse/refresh.sh --manual         # Жан pre-downloaded; just normalize
#   ./scripts/dubai-pulse/refresh.sh --dry-run
#   ./scripts/dubai-pulse/refresh.sh --help
#
# CRON EXAMPLE (weekly, Sunday 03:00 UTC — DLD typically refreshes mid-week)
# --------------------------------------------------------------------------
# Add to crontab on the Getac:
#   0 3 * * 0 cd /home/zaahi/zaahi && ./scripts/dubai-pulse/refresh.sh \
#                                       >> /var/log/zaahi/dubai-pulse-refresh.log 2>&1
#
# OR systemd timer (preferred for restart-on-failure semantics) — see runbook §3.
#
# EXIT CODES
# ----------
#   0  all selected datasets refreshed + normalized successfully
#   1  invalid arguments / setup error
#   2  download phase failed for ≥1 dataset
#   3  normalize phase failed for ≥1 dataset
#   4  pre-flight check failed (missing python / playwright / disk space)

set -euo pipefail

# ─── Resolve repo root robustly (script can be invoked from any cwd) ───
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "${SCRIPT_DIR}/../.." && pwd)"
cd "${REPO_ROOT}"

# ─── Defaults + arg parsing ───
DATASETS="all"
DOWNLOAD=1
NORMALIZE=1
MANUAL=0
DRY_RUN=""
FORCE=""

usage() {
    sed -n '/^# USAGE/,/^# CRON EXAMPLE/p' "${BASH_SOURCE[0]}" | sed 's/^# \?//'
    exit 0
}

while [[ $# -gt 0 ]]; do
    case "$1" in
        --datasets)         DATASETS="$2"; shift 2 ;;
        --datasets=*)       DATASETS="${1#*=}"; shift ;;
        --download-only)    NORMALIZE=0; shift ;;
        --normalize-only)   DOWNLOAD=0; shift ;;
        --manual)           MANUAL=1; shift ;;
        --dry-run)          DRY_RUN="--dry-run"; shift ;;
        --force)            FORCE="--force"; shift ;;
        --help|-h)          usage ;;
        *)                  echo "Unknown arg: $1" >&2; exit 1 ;;
    esac
done

# ─── Pre-flight checks ───
echo "[refresh] $(date -u +%Y-%m-%dT%H:%M:%SZ) starting · datasets=${DATASETS} · download=${DOWNLOAD} · normalize=${NORMALIZE} · manual=${MANUAL}"

if ! command -v python3 >/dev/null; then
    echo "FATAL: python3 not found in PATH" >&2
    exit 4
fi

PY_VER=$(python3 -c 'import sys; print(f"{sys.version_info.major}.{sys.version_info.minor}")')
PY_MAJ=${PY_VER%.*}
PY_MIN=${PY_VER#*.}
if [[ "${PY_MAJ}" -lt 3 || ( "${PY_MAJ}" -eq 3 && "${PY_MIN}" -lt 10 ) ]]; then
    echo "FATAL: Python 3.10+ required, found ${PY_VER}" >&2
    exit 4
fi

# Disk space — DLD Transactions CSV alone can be 100-500 MB
AVAIL_MB=$(df -m "${REPO_ROOT}/data" | awk 'NR==2 {print $4}')
if [[ "${AVAIL_MB:-0}" -lt 2048 ]]; then
    echo "WARN: less than 2 GB free in data/ partition (${AVAIL_MB} MB). Recommend ≥2 GB headroom." >&2
fi

# Verify required Python packages
MISSING=()
if [[ "${DOWNLOAD}" -eq 1 && "${MANUAL}" -eq 0 ]]; then
    python3 -c "import playwright" 2>/dev/null || MISSING+=("playwright")
fi
if [[ "${NORMALIZE}" -eq 1 ]]; then
    python3 -c "import pandas" 2>/dev/null || MISSING+=("pandas")
fi

if [[ ${#MISSING[@]} -gt 0 ]]; then
    echo "FATAL: missing Python packages: ${MISSING[*]}" >&2
    echo "Install with:  pip install ${MISSING[*]}" >&2
    if [[ " ${MISSING[*]} " == *" playwright "* ]]; then
        echo "Then run:    playwright install chromium" >&2
    fi
    exit 4
fi

# ─── Download phase ───
DOWNLOAD_RC=0
if [[ "${DOWNLOAD}" -eq 1 ]]; then
    DL_ARGS=()
    [[ -n "${DRY_RUN}" ]] && DL_ARGS+=("${DRY_RUN}")
    [[ -n "${FORCE}" ]] && DL_ARGS+=("${FORCE}")
    [[ "${MANUAL}" -eq 1 ]] && DL_ARGS+=("--manual")
    [[ "${DATASETS}" != "all" ]] && DL_ARGS+=("--datasets" "${DATASETS}")

    echo "[refresh] download phase: python3 scripts/dubai-pulse/download_datasets.py ${DL_ARGS[*]}"
    set +e
    python3 scripts/dubai-pulse/download_datasets.py "${DL_ARGS[@]}"
    DOWNLOAD_RC=$?
    set -e

    if [[ "${DOWNLOAD_RC}" -ne 0 ]]; then
        echo "[refresh] download phase exited ${DOWNLOAD_RC} — see meta sidecars in data/raw/dubai-pulse/" >&2
        # Do NOT bail — partial download is still useful. Normalize phase will skip missing files.
    fi
else
    echo "[refresh] skipping download phase per --normalize-only"
fi

# ─── Normalize phase ───
NORMALIZE_RC=0
if [[ "${NORMALIZE}" -eq 1 ]]; then
    NM_ARGS=()
    [[ -n "${DRY_RUN}" ]] && NM_ARGS+=("${DRY_RUN}")
    [[ "${DATASETS}" != "all" ]] && NM_ARGS+=("--datasets" "${DATASETS}")

    echo "[refresh] normalize phase: python3 scripts/dubai-pulse/normalize.py ${NM_ARGS[*]}"
    set +e
    python3 scripts/dubai-pulse/normalize.py "${NM_ARGS[@]}"
    NORMALIZE_RC=$?
    set -e

    if [[ "${NORMALIZE_RC}" -ne 0 ]]; then
        echo "[refresh] normalize phase exited ${NORMALIZE_RC}" >&2
    fi
else
    echo "[refresh] skipping normalize phase per --download-only"
fi

# ─── Summary ───
echo "[refresh] $(date -u +%Y-%m-%dT%H:%M:%SZ) done · download_rc=${DOWNLOAD_RC} · normalize_rc=${NORMALIZE_RC}"

if [[ -d "${REPO_ROOT}/data/processed/dubai-pulse" ]]; then
    echo "[refresh] processed CSVs in data/processed/dubai-pulse/:"
    ls -la "${REPO_ROOT}/data/processed/dubai-pulse/"*.csv 2>/dev/null \
        | awk '{printf "  %s  %s bytes\n", $9, $5}' \
        || echo "  (none yet — first run pending)"
fi

# Exit code reflects worst phase
if [[ "${DOWNLOAD_RC}" -ne 0 ]]; then exit 2; fi
if [[ "${NORMALIZE_RC}" -ne 0 ]]; then exit 3; fi
exit 0
