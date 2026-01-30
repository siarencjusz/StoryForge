#!/bin/bash
# Post-installation script for StoryForge deb package
# Fixes chrome-sandbox permissions for Electron

SANDBOX_PATH="/opt/StoryForge/chrome-sandbox"

if [ -f "$SANDBOX_PATH" ]; then
    # Always set SUID bit for chrome-sandbox
    chown root:root "$SANDBOX_PATH"
    chmod 4755 "$SANDBOX_PATH"
    echo "Set SUID permissions on chrome-sandbox"
fi
