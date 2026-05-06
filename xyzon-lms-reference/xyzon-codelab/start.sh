#!/bin/bash
set -e
RESET='\033[0m'; BOLD='\033[1m'; GREEN='\033[32m'; ORANGE='\033[33m'; RED='\033[31m'; BLUE='\033[34m'

echo ""
echo -e "${BOLD}╔══════════════════════════════════════════╗${RESET}"
echo -e "${BOLD}║   XyzonLMS CodeLab — MERN Stack          ║${RESET}"
echo -e "${BOLD}╚══════════════════════════════════════════╝${RESET}"
echo ""

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

# Runtime checks
echo -e "${BOLD}Checking runtimes...${RESET}"
check() {
  if command -v "$1" &>/dev/null; then
    echo -e "  ${GREEN}✅ $1${RESET} — $("$1" --version 2>&1 | head -1)"
  else
    echo -e "  ${RED}⚠️  $1 not found${RESET} — $2"
  fi
}
check node    "Install: https://nodejs.org"
check python3 "Install: sudo apt install python3"
check javac   "Install: sudo apt install default-jdk  (REQUIRED for Java challenges)"
check java    "Install: sudo apt install default-jdk"
check g++     "Install: sudo apt install g++  (optional, for C++)"
echo ""

# Install backend deps
if [ ! -d "$SCRIPT_DIR/backend/node_modules" ]; then
  echo -e "${BLUE}📦 Installing backend dependencies...${RESET}"
  (cd "$SCRIPT_DIR/backend" && npm install)
fi

# Install frontend deps
if [ ! -d "$SCRIPT_DIR/frontend/node_modules" ]; then
  echo -e "${BLUE}📦 Installing frontend dependencies...${RESET}"
  (cd "$SCRIPT_DIR/frontend" && npm install)
fi

echo ""
echo -e "${GREEN}✅ All dependencies ready!${RESET}"
echo ""
echo -e "${BOLD}Starting services...${RESET}"
echo -e "  Backend  → ${BLUE}http://localhost:5000${RESET}"
echo -e "  Frontend → ${BLUE}http://localhost:5173${RESET}"
echo ""
echo -e "Press ${BOLD}Ctrl+C${RESET} to stop all services."
echo ""

# Start backend in background
cd "$SCRIPT_DIR/backend"
node server.js &
BACKEND_PID=$!

sleep 2

# Start frontend
cd "$SCRIPT_DIR/frontend"
npm run dev &
FRONTEND_PID=$!

# Cleanup on exit
trap "echo ''; echo 'Stopping services...'; kill $BACKEND_PID $FRONTEND_PID 2>/dev/null; exit" INT TERM

# Open browser after 3 seconds
sleep 3
if command -v xdg-open &>/dev/null; then
  xdg-open http://localhost:5173 &>/dev/null &
elif command -v open &>/dev/null; then
  open http://localhost:5173 &>/dev/null &
fi

wait
