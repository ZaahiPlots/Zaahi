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
