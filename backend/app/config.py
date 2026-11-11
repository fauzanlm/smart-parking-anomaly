import os
from pathlib import Path

BASE_DIR = Path(__file__).resolve().parent.parent
STORAGE_DIR = BASE_DIR / "storage"
FACES_DIR = STORAGE_DIR / "faces"
PLATES_DIR = STORAGE_DIR / "plates"
ANOMALIES_DIR = STORAGE_DIR / "anomalies"
TEMP_DIR = STORAGE_DIR / "temp"

# Ensure directories exist
for path in [STORAGE_DIR, FACES_DIR, PLATES_DIR, ANOMALIES_DIR, TEMP_DIR]:
    path.mkdir(parents=True, exist_ok=True)

class Settings:
    PROJECT_NAME: str = "Smart Parking Anomaly Detection"
    VERSION: str = "1.0.0"
    AUTHOR: str = "Research Team (Computer Vision)"
    
    # Thresholds based on thesis specification
    MIN_VISIT_THRESHOLD: int = 3          # Syarat minimal kunjungan untuk verifikasi biometrik
    COSINE_SIMILARITY_THRESHOLD: float = 0.65  # Ambang batas kecocokan ArcFace (0.60 - 0.70)
    
    # Database
    DATABASE_PATH: str = str(BASE_DIR / "parking_system.db")
    
    # Server host & port
    HOST: str = "0.0.0.0"
    PORT: int = 8000

settings = Settings()
