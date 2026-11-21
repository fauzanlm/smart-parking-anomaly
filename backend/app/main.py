from fastapi import FastAPI, WebSocket, WebSocketDisconnect, HTTPException
from fastapi.responses import FileResponse
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

# Resilient storage file server with cross-subfolder auto-recovery
@app.get("/storage/{folder}/{filename}")
async def serve_storage_file(folder: str, filename: str):
    """
    Serves images from storage with automatic cross-directory recovery.
    Prevents 404/broken image issues if a file was moved or stored in a different subfolder
    (e.g., anomalies vs faces). Works 100% reliably on Windows and Unix systems.
    """
    clean_name = Path(filename).name
    target = STORAGE_DIR / folder / clean_name
    if target.exists() and target.is_file():
        return FileResponse(str(target))
    
    # Auto-recovery: search in all other storage folders
    for sub in ["anomalies", "faces", "plates", "temp"]:
        alt = STORAGE_DIR / sub / clean_name
        if alt.exists() and alt.is_file():
            return FileResponse(str(alt))
            
    raise HTTPException(status_code=404, detail="File gambar tidak ditemukan di server.")

# Fallback mount for storage directory
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
