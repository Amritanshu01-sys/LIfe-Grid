#!/usr/bin/env python3
"""
==============================================================================
 LIFEGRID — AI-POWERED EMERGENCY RESPONSE & COORDINATION NETWORK
 "Connect. Coordinate. Respond."
 Unified Single-File Scalable Entrypoint
==============================================================================
Runs both the high-performance FastAPI backend, real-time WebSocket stream,
and the compiled React 19 frontend application from a single Python command.

Usage:
    python run.py
    python run.py --port 8000 --host 127.0.0.1
"""

import os
import sys
import argparse
import subprocess
import webbrowser
from pathlib import Path

# Safe encoding handling on Windows terminals
if hasattr(sys.stdout, 'reconfigure'):
    try:
        sys.stdout.reconfigure(encoding='utf-8', errors='replace')
    except Exception:
        pass

# Paths setup
ROOT_DIR = Path(__file__).resolve().parent
BACKEND_DIR = ROOT_DIR / "backend"
FRONTEND_DIR = ROOT_DIR / "frontend"
DIST_DIR = FRONTEND_DIR / "dist"

# Add backend directory to sys.path
sys.path.insert(0, str(BACKEND_DIR))

def print_banner(host: str, port: int):
    print("=" * 76)
    print("   _     ___ _____ _____ ____ ____  ___ ____  ")
    print("  | |   |_ _|  ___| ____/ ___|  _ \\|_ _|  _ \\ ")
    print("  | |    | || |_  |  _|| |  _| |_) || || | | |")
    print("  | |___ | ||  _| | |__| |_| |  _ < | || |_| |")
    print("  |_____|___|_|   |_____\\____|_| \\_\\___|____/ ")
    print("   AI-POWERED EMERGENCY RESPONSE & COORDINATION NETWORK")
    print("   TAGLINE: \"Connect. Coordinate. Respond.\"")
    print("   Smart India Hackathon (SIH) High-Performance Integrated System")
    print("=" * 76)
    print(f"   [+] Web Application:        http://{host}:{port}")
    print(f"   [+] Central Control Room:   http://{host}:{port}/ (switch to Control Room)")
    print(f"   [+] Interactive API Docs:   http://{host}:{port}/docs")
    print(f"   [+] Telemetry WebSocket:    ws://{host}:{port}/ws")
    print("=" * 76)
    print("   [i] Stakeholder Portals Available in Unified Interface:")
    print("       1. Patient Portal       5. Attending Doctor Console")
    print("       2. Family Portal        6. Traffic Signal Priority Control")
    print("       3. Ambulance Telematics 7. Blood Bank Logistics Registry")
    print("       4. Hospital ER Desk     8. Emergency Control Room (Admin)")
    print("   [i] AI Assistant:           Floating Voice/Chat with Hindi & English")
    print("   [i] SIH 16-Step Demo:       Click 'START SIMULATION' on Top Banner")
    print("=" * 76)

def ensure_frontend_build():
    """Ensure production frontend bundle exists; build if missing."""
    index_html = DIST_DIR / "index.html"
    if not index_html.exists():
        print(">> [BUILD] Frontend dist not found. Compiling production React bundle...")
        npm_cmd = "npm.cmd" if sys.platform.startswith("win") else "npm"
        try:
            subprocess.run([npm_cmd, "run", "build"], cwd=str(FRONTEND_DIR), check=True)
            print(">> [BUILD] Frontend successfully compiled into frontend/dist!")
        except Exception as e:
            print(f">> [WARN] Failed to compile frontend automatically: {e}")
            print(">> Ensure 'npm run build' has been executed in the frontend directory.")

def ensure_database_seeded():
    """Ensure database has the comprehensive SIH test dataset."""
    from database import SessionLocal
    from models.all_models import User
    from seed_data import seed_database

    db = SessionLocal()
    try:
        user_count = db.query(User).count()
        if user_count == 0:
            print(">> [DATABASE] Database is empty. Seeding realistic SIH scenario data...")
            seed_database()
        else:
            print(f">> [DATABASE] Database ready ({user_count} stakeholder personas active).")
    except Exception as e:
        print(f">> [DATABASE] Auto-seeding database: {e}")
        seed_database()
    finally:
        db.close()

def main():
    parser = argparse.ArgumentParser(description="LIFEGRID Unified Scalable Server")
    parser.add_argument("--host", default="127.0.0.1", help="Host address (default: 127.0.0.1)")
    parser.add_argument("--port", type=int, default=8000, help="Port to listen on (default: 8000)")
    parser.add_argument("--reload", action="store_true", default=False, help="Enable auto-reload for dev")
    parser.add_argument("--no-browser", action="store_true", help="Do not automatically open browser")
    args = parser.parse_args()

    # Pre-flight tasks
    ensure_frontend_build()
    ensure_database_seeded()

    print_banner(args.host, args.port)

    # Optional automatic browser launch
    if not args.no_browser and args.host in ["127.0.0.1", "localhost"]:
        import threading
        def open_browser():
            import time
            time.sleep(1.2)
            webbrowser.open(f"http://{args.host}:{args.port}")
        threading.Thread(target=open_browser, daemon=True).start()

    # Run Uvicorn ASGI Server
    import uvicorn
    from main import app

    uvicorn.run(
        app,
        host=args.host,
        port=args.port,
        reload=args.reload,
        log_level="info"
    )

if __name__ == "__main__":
    main()
