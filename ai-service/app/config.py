import os
from dotenv import load_dotenv

load_dotenv()

class Settings:
    PORT: int = int(os.getenv("PORT", 8000))
    DATABASE_URL: str = os.getenv("DATABASE_URL", "postgresql://postgres:postgres@localhost:5432/reqrefiner_db")
    GOOGLE_API_KEY: str = os.getenv("GOOGLE_API_KEY", "")
    GOOGLE_API_KEY2: str = os.getenv("GOOGLE_API_KEY2", "")
    MODEL_NAME: str = os.getenv("MODEL_NAME", "gemini-2.5-flash")
    OLLAMA_BASE_URL: str = os.getenv("OLLAMA_BASE_URL", "http://ollama:11434")
    OLLAMA_MODEL: str = os.getenv("OLLAMA_MODEL", "qwen2.5:7b")
    DISABLE_GEMINI: bool = os.getenv("DISABLE_GEMINI", "false").lower() in ("true", "1", "yes")

settings = Settings()
