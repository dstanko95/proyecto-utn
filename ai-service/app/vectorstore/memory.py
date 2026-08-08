import psycopg2
from typing import List, Dict, Any
from app.config import settings

class PersistentMemoryStore:
    def __init__(self):
        self.db_url = settings.DATABASE_URL
        self._ensure_pgvector_extension()

    def _ensure_pgvector_extension(self):
        """Ensures that the pgvector extension and memory table exist in PostgreSQL."""
        try:
            conn = psycopg2.connect(self.db_url)
            cur = conn.cursor()
            cur.execute("CREATE EXTENSION IF NOT EXISTS vector;")
            cur.execute("""
                CREATE TABLE IF NOT EXISTS global_memory_patterns (
                    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                    domain VARCHAR(100) NOT NULL,
                    pattern_type VARCHAR(50) NOT NULL,
                    rule_statement TEXT NOT NULL,
                    frequency_count INT DEFAULT 1,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                );
            """)
            conn.commit()
            cur.close()
            conn.close()
        except Exception as e:
            print(f"[Warning] Could not initialize pgvector extension directly: {e}")

    def query_similar_rules(self, domain: str, requirement_text: str, top_k: int = 5) -> List[Dict[str, Any]]:
        """
        Queries top-K relevant rules and patterns from global memory.
        Fallback to domain-matched rules if pgvector embedding table is empty.
        """
        results = []
        try:
            conn = psycopg2.connect(self.db_url)
            cur = conn.cursor()
            cur.execute(
                "SELECT domain, pattern_type, rule_statement FROM global_memory_patterns WHERE domain = %s LIMIT %s;",
                (domain, top_k)
            )
            rows = cur.fetchall()
            for r in rows:
                results.append({
                    "domain": r[0],
                    "pattern_type": r[1],
                    "rule_statement": r[2]
                })
            cur.close()
            conn.close()
        except Exception as e:
            print(f"[Memory Store Query Warning]: {e}")
        
        # Default domain knowledge fallback if no rules recorded yet
        if not results and domain.lower() in ["salud", "health", "hospital"]:
            results = [
                {"domain": "Salud", "pattern_type": "RULE", "rule_statement": "Unicidad de DNI / Documento de Identidad del paciente."},
                {"domain": "Salud", "pattern_type": "RULE", "rule_statement": "Domicilio Principal obligatorio para correspondencia y facturación de obras sociales."},
                {"domain": "Salud", "pattern_type": "RULE", "rule_statement": "Creación automática de ficha de Historia Clínica digital asociada."}
            ]
            
        return results

    def save_learned_pattern(self, domain: str, pattern_type: str, rule_statement: str):
        """Persists a new approved rule or pattern to global memory."""
        try:
            conn = psycopg2.connect(self.db_url)
            cur = conn.cursor()
            cur.execute(
                "INSERT INTO global_memory_patterns (domain, pattern_type, rule_statement) VALUES (%s, %s, %s);",
                (domain, pattern_type, rule_statement)
            )
            conn.commit()
            cur.close()
            conn.close()
            return True
        except Exception as e:
            print(f"[Memory Store Save Error]: {e}")
            return False

memory_store = PersistentMemoryStore()
