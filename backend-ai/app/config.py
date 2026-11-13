import os
from pathlib import Path
from dotenv import load_dotenv

BASE_DIR = Path(__file__).resolve().parent.parent
load_dotenv(BASE_DIR / ".env")


class Config:
    BASE_DIR = BASE_DIR

    # Upload
    MAX_CONTENT_LENGTH = int(os.getenv("MAX_UPLOAD_MB", "10")) * 1024 * 1024
    ALLOWED_EXTENSIONS = {"jpg", "jpeg", "png", "webp"}
    CORS_ORIGINS = [
        o.strip() for o in os.getenv("CORS_ORIGINS", "http://localhost:5173").split(",") if o.strip()
    ]

    # Kelas genre (urutan alfabet, sama dengan urutan folder dataset)
    GENRES = ["lanskap", "makro", "potret"]

    # Model
    MODELS_DIR = BASE_DIR / "saved_models"
    CNN_MODEL_PATH = MODELS_DIR / "cnn_genre.pt"
    SVM_MODEL_PATH = MODELS_DIR / "svm_baseline.joblib"
    CONFIDENCE_THRESHOLD = float(os.getenv("CONFIDENCE_THRESHOLD", "0.60"))

    # LLM
    LLM_PROVIDER = os.getenv("LLM_PROVIDER", "gemini").lower()
    LLM_API_KEY = os.getenv("LLM_API_KEY", "")
    LLM_MODEL = os.getenv("LLM_MODEL", "")
    OLLAMA_URL = os.getenv("OLLAMA_URL", "http://localhost:11434")

    # IPFS
    PINATA_JWT = os.getenv("PINATA_JWT", "")
    IPFS_GATEWAY = os.getenv("IPFS_GATEWAY", "https://gateway.pinata.cloud/ipfs").rstrip("/")

    # Database pengajuan (SQLite)
    DATABASE_PATH = BASE_DIR / "instance" / "submissions.db"
