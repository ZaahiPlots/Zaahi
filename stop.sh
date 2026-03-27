#!/bin/bash
sudo systemctl stop zaahi-agent 2>/dev/null
pkill -f "agent.py" 2>/dev/null
echo "Agent stopped."
