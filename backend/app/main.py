from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from pathlib import Path

from app.config import settings, STORAGE_DIR
from app.database import init_db
from app.api.routes import router as api_router
from app.api.websocket import ws_manager

app = FastAPI(
    title=settings.PROJECT_NAME,
    version=settings.VERSION,
    description="Sistem Keamanan Parkir Multi-Modal & Deteksi Anomali Biometrik"
)

# CORS configuration
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Mount storage directory to serve snapshots and evidence photos
app.mount("/storage", StaticFiles(directory=str(STORAGE_DIR)), name="storage")

# Include API routes
app.include_router(api_router)

@app.on_event("startup")
def on_startup():
    init_db()
    print("Database initialized successfully.")

@app.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket):
    await ws_manager.connect(websocket)
    try:
        while True:
            # Keep connection alive
            await websocket.receive_text()
    except WebSocketDisconnect:
        ws_manager.disconnect(websocket)
    except Exception:
        ws_manager.disconnect(websocket)

@app.get("/")
def health_check():
    return {
        "status": "online",
        "service": settings.PROJECT_NAME,
        "author": settings.AUTHOR,
        "thresholds": {
            "min_visits": settings.MIN_VISIT_THRESHOLD,
            "cosine_similarity": settings.COSINE_SIMILARITY_THRESHOLD
        }
    }
