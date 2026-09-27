import os
from pathlib import Path

BASE_DIR = Path(__file__).resolve().parent

class Settings:
    PROJECT_NAME: str = "LIFEGRID"
    TAGLINE: str = "Connect. Coordinate. Respond."
    VERSION: str = "1.0.0-SIH-PROTOTYPE"
    API_V1_STR: str = "/api"
    
    SECRET_KEY: str = os.getenv("SECRET_KEY", "lifegrid_sih_secret_key_super_secure_2026")
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60 * 24 # 24 hours for prototype convenience
    
    # Defaults to SQLite in backend directory for zero-setup execution, supports PostgreSQL
    DATABASE_URL: str = os.getenv(
        "DATABASE_URL", 
        f"sqlite:///{BASE_DIR / 'lifegrid.db'}"
    )
    
    GEMINI_API_KEY: str = os.getenv("GEMINI_API_KEY", "")
    
    # City coordinates reference (defaulting to New Delhi emergency response grid for SIH)
    CITY_CENTER_LAT: float = 28.6139
    CITY_CENTER_LNG: float = 77.2090
    
    # CORS
    BACKEND_CORS_ORIGINS: list = [
        "http://localhost:5173",
        "http://127.0.0.1:5173",
        "http://localhost:3000",
        "http://127.0.0.1:3000",
        "*"
    ]

settings = Settings()
