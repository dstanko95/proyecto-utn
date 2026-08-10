import os
import json
import time
import logging
from datetime import datetime, timezone
from typing import Dict, Any, List, Optional
from threading import Lock

# Directorio y archivo de logs
LOGS_DIR = os.path.join(os.path.dirname(os.path.dirname(__file__)), "logs")
LOG_FILE = os.path.join(LOGS_DIR, "token_consumption.log")

# Logger de Python estructurado
logger = logging.getLogger("TokenLogger")
if not logger.handlers:
    handler = logging.StreamHandler()
    formatter = logging.Formatter("[%(asctime)s] %(message)s", datefmt="%Y-%m-%d %H:%M:%S")
    handler.setFormatter(formatter)
    logger.addHandler(handler)
    logger.setLevel(logging.INFO)

class TokenConsumptionLogger:
    def __init__(self, max_history: int = 500):
        self.max_history = max_history
        self._lock = Lock()
        self.total_requests = 0
        self.total_prompt_tokens = 0
        self.total_completion_tokens = 0
        self.total_tokens = 0
        self.provider_stats: Dict[str, Dict[str, Any]] = {}
        self.recent_logs: List[Dict[str, Any]] = []

    def _ensure_log_dir(self):
        try:
            if not os.path.exists(LOGS_DIR):
                os.makedirs(LOGS_DIR, exist_ok=True)
        except Exception as e:
            logger.error(f"Error creando directorio de logs: {e}")

    def log_usage(
        self,
        provider: str,
        prompt_tokens: int,
        completion_tokens: int,
        latency_ms: float,
        caller_context: str = "llm_invocation",
        status: str = "SUCCESS"
    ) -> Dict[str, Any]:
        prompt_tokens = max(0, int(prompt_tokens))
        completion_tokens = max(0, int(completion_tokens))
        total = prompt_tokens + completion_tokens
        latency_ms = round(float(latency_ms), 2)
        timestamp = datetime.now(timezone.utc).isoformat()

        entry = {
            "timestamp": timestamp,
            "provider": provider,
            "caller_context": caller_context,
            "prompt_tokens": prompt_tokens,
            "completion_tokens": completion_tokens,
            "total_tokens": total,
            "latency_ms": latency_ms,
            "status": status
        }

        # 1. Registro en consola
        console_msg = (
            f"[TOKEN CONSUMPTION LOG] Provider='{provider}' | "
            f"Context='{caller_context}' | Prompt Tokens={prompt_tokens} | "
            f"Completion Tokens={completion_tokens} | Total={total} | "
            f"Latency={latency_ms}ms | Status={status}"
        )
        logger.info(console_msg)

        # 2. Persistencia en archivo log (JSON Lines)
        self._ensure_log_dir()
        try:
            with open(LOG_FILE, "a", encoding="utf-8") as f:
                f.write(json.dumps(entry, ensure_ascii=False) + "\n")
        except Exception as e:
            logger.error(f"Error escribiendo en {LOG_FILE}: {e}")

        # 3. Actualización de acumulados en memoria
        with self._lock:
            self.total_requests += 1
            self.total_prompt_tokens += prompt_tokens
            self.total_completion_tokens += completion_tokens
            self.total_tokens += total

            if provider not in self.provider_stats:
                self.provider_stats[provider] = {
                    "requests": 0,
                    "prompt_tokens": 0,
                    "completion_tokens": 0,
                    "total_tokens": 0,
                    "total_latency_ms": 0.0,
                    "avg_latency_ms": 0.0
                }
            p_stat = self.provider_stats[provider]
            p_stat["requests"] += 1
            p_stat["prompt_tokens"] += prompt_tokens
            p_stat["completion_tokens"] += completion_tokens
            p_stat["total_tokens"] += total
            p_stat["total_latency_ms"] += latency_ms
            p_stat["avg_latency_ms"] = round(p_stat["total_latency_ms"] / p_stat["requests"], 2)

            self.recent_logs.append(entry)
            if len(self.recent_logs) > self.max_history:
                self.recent_logs.pop(0)

        return entry

    def get_summary(self) -> Dict[str, Any]:
        with self._lock:
            avg_latency = 0.0
            if self.total_requests > 0:
                tot_latency = sum(p["total_latency_ms"] for p in self.provider_stats.values())
                avg_latency = round(tot_latency / self.total_requests, 2)

            return {
                "total_requests": self.total_requests,
                "total_prompt_tokens": self.total_prompt_tokens,
                "total_completion_tokens": self.total_completion_tokens,
                "total_tokens": self.total_tokens,
                "average_latency_ms": avg_latency,
                "providers_breakdown": self.provider_stats,
                "recent_logs_count": len(self.recent_logs),
                "log_file_path": LOG_FILE,
                "recent_logs": list(reversed(self.recent_logs))
            }

    def reset_summary(self):
        with self._lock:
            self.total_requests = 0
            self.total_prompt_tokens = 0
            self.total_completion_tokens = 0
            self.total_tokens = 0
            self.provider_stats.clear()
            self.recent_logs.clear()
        logger.info("[TOKEN CONSUMPTION LOG] Métricas de uso de tokens reiniciadas.")

# Instancia global singleton
token_logger = TokenConsumptionLogger()

def estimate_tokens(text: str) -> int:
    """Estimación prudente de tokens basada en longitud de caracteres y palabras."""
    if not text:
        return 0
    # Promedio aproximado: 1 token ~ 4 caracteres o 0.75 palabras en español/inglés
    words = len(text.split())
    chars = len(text)
    return max(1, int((chars / 4.0 + words / 0.75) / 2.0))
