#!/bin/bash
set -e

# Configuration
SERVER_USER="sadiq"
SERVER_HOST="own3"
SERVER_PATH="/home/sadiq/dproc-framework-v3"
LOCAL_PATH="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}╔════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║   DProc Framework - Server Sync       ║${NC}"
echo -e "${BLUE}╚════════════════════════════════════════╝${NC}"
echo ""

# Confirm before sync
echo -e "${YELLOW}📂 Local Path:${NC}  $LOCAL_PATH"
echo -e "${YELLOW}🌐 Server:${NC}     $SERVER_USER@$SERVER_HOST"
echo -e "${YELLOW}📁 Server Path:${NC} $SERVER_PATH"
echo ""
read -p "Continue with sync? (y/N) " -n 1 -r
echo
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo -e "${RED}❌ Sync cancelled${NC}"
    exit 1
fi

# Step 1: Git status check
echo ""
echo -e "${BLUE}🔍 Checking git status...${NC}"
if [[ -n $(git status -s) ]]; then
    echo -e "${YELLOW}⚠️  Uncommitted changes found:${NC}"
    git status -s
    read -p "Commit changes first? (Y/n) " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Nn]$ ]]; then
        read -p "Enter commit message: " commit_msg
        git add .
        git commit -m "$commit_msg"
        git push origin main
        echo -e "${GREEN}✅ Changes committed and pushed${NC}"
    fi
fi

# Step 2: Rsync to server
echo ""
echo -e "${BLUE}📤 Syncing to server...${NC}"

rsync -avz --delete \
    --exclude-from="$LOCAL_PATH/.rsyncignore" \
    --exclude 'node_modules' \
    --exclude '.git' \
    --exclude 'dist' \
    --exclude '*.db' \
    --exclude '*.log' \
    --exclude '.env' \
    --exclude 'pnpm-lock.yaml' \
    "$LOCAL_PATH/" "$SERVER_USER@$SERVER_HOST:$SERVER_PATH/"

echo -e "${GREEN}✅ Rsync complete${NC}"

# # Step 3: Update server packages and rebuild
# echo ""
# echo -e "${BLUE}🔧 Installing dependencies on server...${NC}"

# ssh "$SERVER_HOST" << 'ENDSSH'
# cd /home/sadiq/dproc-framework-v3

# echo "📦 Installing dependencies..."
# pnpm install

# echo "🏗️  Building packages..."
# pnpm build

# echo "🐳 Rebuilding Docker containers..."
# docker-compose build

# echo "🚀 Restarting services..."
# docker-compose down
# docker-compose up -d

# echo "✅ Deployment complete!"
# echo ""
# echo "📊 Container status:"
# docker-compose ps

# echo ""
# echo "📋 View logs with: docker-compose logs -f"
# ENDSSH

# echo ""
echo -e "${GREEN}╔════════════════════════════════════════╗${NC}"
echo -e "${GREEN}║   🎉 Sync Complete!                   ║${NC}"
echo -e "${GREEN}╚════════════════════════════════════════╝${NC}"
# echo ""
# echo -e "${BLUE}📊 To view logs:${NC}"
# echo -e "   ssh $SERVER_USER@$SERVER_HOST 'cd $SERVER_PATH && docker-compose logs -f'"
