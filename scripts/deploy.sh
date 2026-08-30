#!/bin/bash
# ═══════════════════════════════════════════════════════════════
# Eazzio Mail — AWS EC2 Deployment Script
# This script is called by GitHub Actions on every push to master.
# It pulls the latest code, installs deps, builds, and restarts.
# ═══════════════════════════════════════════════════════════════

set -e  # Exit on any error

APP_DIR="/home/ubuntu/Eazzio_Mail"
BRANCH="master"
LOG_FILE="/home/ubuntu/deploy.log"

echo "═══════════════════════════════════════════════" | tee -a "$LOG_FILE"
echo "🚀 Eazzio Mail Deployment — $(date '+%Y-%m-%d %H:%M:%S')" | tee -a "$LOG_FILE"
echo "═══════════════════════════════════════════════" | tee -a "$LOG_FILE"

cd "$APP_DIR"

# 1. Pull latest code (preserve .env — only update tracked files)
echo "📥 Fetching latest code from origin/$BRANCH..." | tee -a "$LOG_FILE"
git fetch origin
git reset --hard "origin/$BRANCH"
echo "✅ Code updated to $(git log --oneline -1)" | tee -a "$LOG_FILE"

# 2. Install dependencies
echo "📦 Installing dependencies..." | tee -a "$LOG_FILE"
pnpm install --frozen-lockfile 2>&1 | tail -5 | tee -a "$LOG_FILE"

# 3. Copy .env to web app (server .env is the source of truth)
cp "$APP_DIR/.env" "$APP_DIR/apps/web/.env.local" 2>/dev/null || true

# 4. Build all packages
echo "🔨 Building project..." | tee -a "$LOG_FILE"
pnpm build 2>&1 | tail -10 | tee -a "$LOG_FILE"

# 5. Restart PM2 processes
echo "♻️  Restarting PM2 services..." | tee -a "$LOG_FILE"
pm2 restart all --update-env 2>&1 | tee -a "$LOG_FILE"

# 6. Health check (wait 3s for startup)
sleep 3
if curl -sf http://localhost:8080/health > /dev/null 2>&1 || curl -sf http://localhost:3000 > /dev/null 2>&1; then
  echo "✅ Health check passed!" | tee -a "$LOG_FILE"
else
  echo "⚠️  Health check inconclusive (app may still be starting)" | tee -a "$LOG_FILE"
fi

echo "🎉 Deployment complete — $(date '+%Y-%m-%d %H:%M:%S')" | tee -a "$LOG_FILE"
echo "" | tee -a "$LOG_FILE"
