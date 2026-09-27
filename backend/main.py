from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
from pathlib import Path
import os
import uvicorn

from config import settings
from database import engine, Base, SessionLocal
from models.all_models import User
from seed_data import seed_database
from websocket_manager import ws_manager

# Import all routers
from routes.auth_routes import router as auth_router
from routes.emergency_routes import router as emergency_router
from routes.ambulance_routes import router as ambulance_router
from routes.hospital_routes import router as hospital_router
from routes.doctor_routes import router as doctor_router
from routes.traffic_routes import router as traffic_router
from routes.blood_bank_routes import router as blood_bank_router
from routes.patient_routes import router as patient_router
from routes.admin_routes import router as admin_router
from routes.simulation_routes import router as simulation_router
from routes.ai_routes import router as ai_router

# Create tables
Base.metadata.create_all(bind=engine)

app = FastAPI(
    title=settings.PROJECT_NAME,
    description="LIFEGRID — AI-Powered Emergency Response & Coordination Network (Prototype for SIH)",
    version=settings.VERSION,
    docs_url="/docs",
    redoc_url="/redoc"
)

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.BACKEND_CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Register API Routers first
app.include_router(auth_router, prefix=settings.API_V1_STR)
app.include_router(emergency_router, prefix=settings.API_V1_STR)
app.include_router(ambulance_router, prefix=settings.API_V1_STR)
app.include_router(hospital_router, prefix=settings.API_V1_STR)
app.include_router(doctor_router, prefix=settings.API_V1_STR)
app.include_router(traffic_router, prefix=settings.API_V1_STR)
app.include_router(blood_bank_router, prefix=settings.API_V1_STR)
app.include_router(patient_router, prefix=settings.API_V1_STR)
app.include_router(admin_router, prefix=settings.API_V1_STR)
app.include_router(simulation_router, prefix=settings.API_V1_STR)
app.include_router(ai_router, prefix=settings.API_V1_STR)

@app.on_event("startup")
def startup_event():
    # Check if database has users, otherwise seed automatically
    db = SessionLocal()
    try:
        user_count = db.query(User).count()
        if user_count == 0:
            print("No existing records found. Auto-seeding LIFEGRID database...")
            seed_database()
        else:
            print(f"Database ready: {user_count} users present in emergency grid.")
    except Exception as e:
        print(f"Error checking/seeding database: {e}")
        seed_database()
    finally:
        db.close()

@app.get("/api/health")
def health_check():
    return {
        "system": settings.PROJECT_NAME,
        "tagline": settings.TAGLINE,
        "version": settings.VERSION,
        "status": "OPERATIONAL",
        "documentation": "/docs"
    }

@app.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket):
    await ws_manager.connect(websocket)
    try:
        while True:
            data = await websocket.receive_text()
            # Echo or process client ping if needed
    except WebSocketDisconnect:
        ws_manager.disconnect(websocket)
    except Exception:
        ws_manager.disconnect(websocket)

# Frontend Static Assets & SPA Routing
DIST_DIR = Path(__file__).resolve().parent.parent / "frontend" / "dist"

if (DIST_DIR / "assets").exists():
    app.mount("/assets", StaticFiles(directory=str(DIST_DIR / "assets")), name="assets")

@app.get("/")
async def serve_index():
    index_file = DIST_DIR / "index.html"
    if index_file.is_file():
        return FileResponse(index_file)
    return {
        "system": settings.PROJECT_NAME,
        "tagline": settings.TAGLINE,
        "version": settings.VERSION,
        "status": "OPERATIONAL",
        "documentation": "/docs",
        "note": "Frontend dist not found. Run 'npm run build' in frontend directory or run via 'python run.py'."
    }

@app.get("/{full_path:path}")
async def serve_spa_fallback(full_path: str):
    # Exclude API routes and docs
    if full_path.startswith("api") or full_path.startswith("docs") or full_path.startswith("redoc") or full_path.startswith("openapi.json"):
        return {"error": "Not Found"}

    target_file = DIST_DIR / full_path
    if target_file.is_file():
        return FileResponse(target_file)

    index_file = DIST_DIR / "index.html"
    if index_file.is_file():
        return FileResponse(index_file)

    return {"error": "Frontend asset not found"}

if __name__ == "__main__":
    uvicorn.run("main:app", host="127.0.0.1", port=8000, reload=True)
