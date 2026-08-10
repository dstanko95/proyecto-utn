import json
import re
from typing import Any, Optional

try:
    from json_repair import repair_json
except ImportError:
    repair_json = None

def _unwrap_parsed_blocks(parsed: Any) -> Any:
    """
    Desempaqueta respuestas estructuradas tipo content-blocks (ej: [{'type': 'text', 'text': '...'}]).
    Si se detectan objetos bloque, concatena el contenido 'text' y re-parsea el JSON interno.
    """
    if isinstance(parsed, list) and len(parsed) > 0:
        if all(isinstance(item, dict) and ("text" in item or item.get("type") == "text") for item in parsed):
            text_chunks = [str(item.get("text", "")) for item in parsed]
            combined = "\n".join(text_chunks).strip()
            if combined:
                # Evita recursión infinita verificando si no es idéntico
                inner_parsed = _raw_parse(combined)
                if inner_parsed is not None and inner_parsed != parsed:
                    return inner_parsed
    return parsed

def _raw_parse(cleaned: str) -> Optional[Any]:
    # 1. Remove Markdown code block wrappers
    match = re.search(r'```(?:json)?\s*([\s\S]*?)\s*```', cleaned, re.IGNORECASE | re.DOTALL)
    if match:
        cleaned = match.group(1).strip()
    else:
        if cleaned.startswith("```json"):
            cleaned = cleaned[7:]
        elif cleaned.startswith("```"):
            cleaned = cleaned[3:]
        if cleaned.endswith("```"):
            cleaned = cleaned[:-3]
        cleaned = cleaned.strip()

    # 2. First attempt: Standard json.loads
    try:
        return json.loads(cleaned)
    except Exception:
        pass

    # 3. Second attempt: json.loads with strict=False
    try:
        return json.loads(cleaned, strict=False)
    except Exception:
        pass

    # 4. Third attempt: json_repair
    if repair_json is not None:
        try:
            repaired = repair_json(cleaned, return_objects=True)
            if repaired:
                return repaired
        except Exception:
            pass

    # 5. Fourth attempt: Extract json object/array pattern from text
    json_match = re.search(r'(\{[\s\S]*\}|\[[\s\S]*\])', cleaned)
    if json_match:
        extracted = json_match.group(1).strip()
        try:
            return json.loads(extracted)
        except Exception:
            pass
        try:
            return json.loads(extracted, strict=False)
        except Exception:
            pass
        if repair_json is not None:
            try:
                repaired = repair_json(extracted, return_objects=True)
                if repaired:
                    return repaired
            except Exception:
                pass
    else:
        extracted = cleaned

    # 6. Fifth attempt: Clean trailing commas
    fixed_commas = re.sub(r',\s*([\}\]])', r'\1', extracted)
    try:
        return json.loads(fixed_commas, strict=False)
    except Exception:
        pass

    return None

def parse_llm_json(content: str) -> Optional[Any]:
    """
    Parses JSON content returned by LLMs (Gemini, Ollama, OpenAI, etc.).
    Handles markdown code blocks, unescaped newlines/control characters,
    unescaped quotes inside strings, trailing commas, content blocks and malformed syntax.
    """
    if not content or not isinstance(content, str):
        return None

    cleaned = content.strip()
    parsed = _raw_parse(cleaned)

    if parsed is not None:
        parsed = _unwrap_parsed_blocks(parsed)
        return parsed

    print(f"[parse_llm_json Error]: Failed all parsing attempts for content (length {len(content)}): {cleaned[:150]}...")
    return None
