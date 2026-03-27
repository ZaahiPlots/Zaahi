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
