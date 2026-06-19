#!/usr/bin/env bash
# ─────────────────────────────────────────────────────────────────────────────
# start_prod.sh  —  Production startup script for AcadPortal (IIT Baadal / Ubuntu)
#
# Usage:
#   chmod +x start_prod.sh        (run once to make it executable)
#   ./start_prod.sh               (start the server)
#
# Requirements:
#   - Python 3.10+ virtual environment activated, or dependencies installed globally
#   - .env file present in the same directory as app.py
#   - pip install -r requirements.txt already run
# ─────────────────────────────────────────────────────────────────────────────

set -e  # Exit immediately on any error

# ── Configuration ────────────────────────────────────────────────────────────
APP_MODULE="app:app"          # Flask app entrypoint  (file: app.py, object: app)
HOST="0.0.0.0"               # Listen on all interfaces so Nginx/proxy can reach it
PORT="${PORT:-5000}"          # Default port 5000; override with: PORT=8080 ./start_prod.sh
WORKERS=4                     # Rule of thumb: (2 × CPU cores) + 1
WORKER_CLASS="sync"         # Async worker — needed for Supabase long-poll connections
TIMEOUT=120                   # Seconds before a worker is killed (covers slow CSV exports)
LOG_LEVEL="info"

# ── Environment ───────────────────────────────────────────────────────────────
export FLASK_ENV=production
export PYTHONUNBUFFERED=1     # Ensure logs are flushed immediately to stdout

echo ""
echo "╔════════════════════════════════════════════════════╗"
echo "║        AcadPortal — Production Server Boot         ║"
echo "╠════════════════════════════════════════════════════╣"
echo "║  Module  : ${APP_MODULE}"
echo "║  Bind    : ${HOST}:${PORT}"
echo "║  Workers : ${WORKERS} × ${WORKER_CLASS}"
echo "║  Timeout : ${TIMEOUT}s"
echo "╚════════════════════════════════════════════════════╝"
echo ""

# ── Launch Gunicorn ───────────────────────────────────────────────────────────
exec gunicorn \
    --bind "${HOST}:${PORT}" \
    --workers "${WORKERS}" \
    --worker-class "${WORKER_CLASS}" \
    --timeout "${TIMEOUT}" \
    --log-level "${LOG_LEVEL}" \
    --access-logfile "-" \
    --error-logfile "-" \
    "${APP_MODULE}"
