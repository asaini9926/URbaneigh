#!/bin/bash

# Configuration
# TODO: Update this path to your actual project directory on EC2
PROJECT_DIR="/home/ubuntu/comfort-clothing-ecommerce"
SERVER_DIR="$PROJECT_DIR/server"
CLIENT_DIR="$PROJECT_DIR/client"

# Colors for output
GREEN='\033[0;32m'
NC='\033[0m' # No Color

echo -e "${GREEN}🚀 Starting Deployment...${NC}"

# 1. Pull Latest Code
echo -e "${GREEN}📥 Pulling latest code from Git...${NC}"
cd $PROJECT_DIR
git pull origin main

# 2. Server Setup & Database
echo -e "${GREEN}🔧 Setting up Server dependencies...${NC}"
cd $SERVER_DIR
npm install

echo -e "${GREEN}🗄️ Applying Database Migrations...${NC}"
# Use migrate deploy for production (applies pending migrations)
npx prisma migrate deploy

echo -e "${GREEN}🌱 Seeding Database...${NC}"
npx prisma db seed

# 3. Client Build
echo -e "${GREEN}🎨 Building Client...${NC}"
cd $CLIENT_DIR
npm install
npm run build

# 4. Process Management (PM2)
echo -e "${GREEN}🔄 Restarting Backend Server...${NC}"
cd $SERVER_DIR
# Check if PM2 is running 'server', if so restart, else start
if pm2 list | grep -q "server"; then
    pm2 restart server
else
    pm2 start index.js --name "server"
fi

echo -e "${GREEN}✅ Deployment Complete!${NC}"
echo "Make sure your dist folder is being served correctly (e.g., via Nginx)."
