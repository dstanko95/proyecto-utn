import json
import time
from typing import Tuple, Optional, Any
from langchain_google_genai import ChatGoogleGenerativeAI
from langchain_core.messages import SystemMessage, HumanMessage
from app.config import settings
from app.token_logger import token_logger, estimate_tokens

def optimize_prompt(text: str) -> str:
    """Optimiza los tokens eliminando espacios y saltos redundantes"""
    if not text:
        return ""
    lines = [line.strip() for line in text.splitlines() if line.strip()]
    return "\n".join(lines)

def extract_clean_text(content_obj: Any) -> str:
    """
    Extrae texto limpio y plano desde el contenido retornado por los modelos de LangChain.
    Soporta cadenas simples, listas de bloques de texto (LangChain content blocks) y objetos.
    """
    if not content_obj:
        return ""
    if isinstance(content_obj, str):
        return content_obj.strip()
    if isinstance(content_obj, list):
        text_parts = []
        for item in content_obj:
            if isinstance(item, str):
                text_parts.append(item)
            elif isinstance(item, dict):
                if item.get("type") == "text" and "text" in item:
                    text_parts.append(str(item["text"]))
                elif "text" in item:
                    text_parts.append(str(item["text"]))
            elif hasattr(item, "text"):
                text_parts.append(str(getattr(item, "text")))
            elif hasattr(item, "get") and callable(item.get):
                if item.get("text"):
                    text_parts.append(str(item.get("text")))
        return "\n".join(text_parts).strip()
    return str(content_obj).strip()

def extract_token_counts(response: Any, prompt_text: str, completion_text: str) -> Tuple[int, int]:
    """Extrae la cantidad de tokens de entrada y salida desde la respuesta del modelo o los estima."""
    prompt_tokens = 0
    completion_tokens = 0

    # 1. Metadatos estándar de LangChain (AIMessage.usage_metadata)
    if hasattr(response, 'usage_metadata') and response.usage_metadata:
        um = response.usage_metadata
        if isinstance(um, dict):
            prompt_tokens = um.get('input_tokens', 0)
            completion_tokens = um.get('output_tokens', 0)

    # 2. Metadatos nativos del proveedor (response.response_metadata)
    if (not prompt_tokens or not completion_tokens) and hasattr(response, 'response_metadata') and response.response_metadata:
        rm = response.response_metadata
        if isinstance(rm, dict):
            # Estructura Gemini
            um = rm.get('usage_metadata') or rm.get('token_usage') or {}
            if isinstance(um, dict):
                prompt_tokens = prompt_tokens or um.get('prompt_token_count') or um.get('input_tokens') or 0
                completion_tokens = completion_tokens or um.get('candidates_token_count') or um.get('output_tokens') or 0

            # Estructura Ollama
            prompt_tokens = prompt_tokens or rm.get('prompt_eval_count', 0)
            completion_tokens = completion_tokens or rm.get('eval_count', 0)

    # 3. Fallback a estimación si no están presentes los contadores exactos
    if not prompt_tokens:
        prompt_tokens = estimate_tokens(prompt_text)
    if not completion_tokens:
        completion_tokens = estimate_tokens(completion_text)

    return prompt_tokens, completion_tokens

def invoke_llm_with_fallback(system_prompt: str, human_prompt: str, caller_context: str = "llm_invocation") -> Tuple[Optional[str], str]:
    """
    Jerarquía de Ejecución de LLM con Fallback Automático y Registro Estructurado de Tokens:
    1. Gemini Cloud API (Google AI) -> Key 1
    2. Gemini Cloud API (Google AI) -> Key 2
    3. Ollama Local LLM
    4. Fallback Dinámico Local
    """
    sys_clean = optimize_prompt(system_prompt)
    hum_clean = optimize_prompt(human_prompt)
    full_prompt_text = f"{sys_clean}\n{hum_clean}"

    # 1. Intentar Gemini Cloud API (Key 1)
    if not settings.DISABLE_GEMINI:
        if settings.GOOGLE_API_KEY and settings.GOOGLE_API_KEY != "YOUR_GEMINI_API_KEY_HERE":
            provider_name = f"GEMINI_CLOUD ({settings.MODEL_NAME} - Key 1)"
            start_time = time.perf_counter()
            try:
                gemini_llm = ChatGoogleGenerativeAI(
                    model=settings.MODEL_NAME,
                    google_api_key=settings.GOOGLE_API_KEY,
                    temperature=0.2
                )
                response = gemini_llm.invoke([
                    SystemMessage(content=sys_clean),
                    HumanMessage(content=hum_clean)
                ])
                latency_ms = (time.perf_counter() - start_time) * 1000.0

                if response and hasattr(response, 'content'):
                    content = extract_clean_text(response.content)
                    if content:
                        p_tokens, c_tokens = extract_token_counts(response, full_prompt_text, content)
                        token_logger.log_usage(
                            provider=provider_name,
                            prompt_tokens=p_tokens,
                            completion_tokens=c_tokens,
                            latency_ms=latency_ms,
                            caller_context=caller_context,
                            status="SUCCESS"
                        )
                        print(f"[LLM Provider Success]: Respuesta generada vía Gemini Cloud ({settings.MODEL_NAME} - Key 1)")
                        return content, provider_name
            except Exception as e:
                latency_ms = (time.perf_counter() - start_time) * 1000.0
                token_logger.log_usage(
                    provider=provider_name,
                    prompt_tokens=estimate_tokens(full_prompt_text),
                    completion_tokens=0,
                    latency_ms=latency_ms,
                    caller_context=caller_context,
                    status="ERROR"
                )
                print(f"[Gemini Primary Key Error, intentando Secondary Key]: {e}")

        # 1.1. Intentar Gemini Cloud API (Secondary Key)
        if settings.GOOGLE_API_KEY2 and settings.GOOGLE_API_KEY2 != "YOUR_GEMINI_API_KEY_HERE":
            provider_name = f"GEMINI_CLOUD ({settings.MODEL_NAME} - Key 2)"
            start_time = time.perf_counter()
            try:
                gemini_llm2 = ChatGoogleGenerativeAI(
                    model=settings.MODEL_NAME,
                    google_api_key=settings.GOOGLE_API_KEY2,
                    temperature=0.2
                )
                response = gemini_llm2.invoke([
                    SystemMessage(content=sys_clean),
                    HumanMessage(content=hum_clean)
                ])
                latency_ms = (time.perf_counter() - start_time) * 1000.0

                if response and hasattr(response, 'content'):
                    content = extract_clean_text(response.content)
                    if content:
                        p_tokens, c_tokens = extract_token_counts(response, full_prompt_text, content)
                        token_logger.log_usage(
                            provider=provider_name,
                            prompt_tokens=p_tokens,
                            completion_tokens=c_tokens,
                            latency_ms=latency_ms,
                            caller_context=caller_context,
                            status="SUCCESS"
                        )
                        print(f"[LLM Provider Success]: Respuesta generada vía Gemini Cloud ({settings.MODEL_NAME} - Key 2)")
                        return content, provider_name
            except Exception as e:
                latency_ms = (time.perf_counter() - start_time) * 1000.0
                token_logger.log_usage(
                    provider=provider_name,
                    prompt_tokens=estimate_tokens(full_prompt_text),
                    completion_tokens=0,
                    latency_ms=latency_ms,
                    caller_context=caller_context,
                    status="ERROR"
                )
                print(f"[Gemini Secondary Key Error, intentando Ollama Local]: {e}")
    else:
        print("[LLM Provider]: Gemini desactivado vía DISABLE_GEMINI=true. Saltando directamente a Ollama Local GPU...")

    # 2. Intentar Ollama LLM Local
    ollama_urls = ["http://host.docker.internal:11434", settings.OLLAMA_BASE_URL, "http://ollama:11434", "http://localhost:11434"]
    tried_urls = set()

    for url in ollama_urls:
        if not url or url in tried_urls:
            continue
        tried_urls.add(url)
        provider_name = f"OLLAMA_LOCAL ({settings.OLLAMA_MODEL})"
        start_time = time.perf_counter()
        try:
            from langchain_ollama import ChatOllama
            ollama_llm = ChatOllama(
                base_url=url,
                model=settings.OLLAMA_MODEL,
                temperature=0.2,
                num_predict=2500,
                format="json"
            )
            response = ollama_llm.invoke([
                SystemMessage(content=system_prompt),
                HumanMessage(content=human_prompt)
            ])
            latency_ms = (time.perf_counter() - start_time) * 1000.0

            if response and hasattr(response, 'content'):
                content = extract_clean_text(response.content)
                if content:
                    p_tokens, c_tokens = extract_token_counts(response, full_prompt_text, content)
                    token_logger.log_usage(
                        provider=provider_name,
                        prompt_tokens=p_tokens,
                        completion_tokens=c_tokens,
                        latency_ms=latency_ms,
                        caller_context=caller_context,
                        status="SUCCESS"
                    )
                    print(f"[LLM Provider Success]: Respuesta generada vía Ollama Local ({settings.OLLAMA_MODEL}) en {url}")
                    return content, provider_name
        except Exception as e:
            latency_ms = (time.perf_counter() - start_time) * 1000.0
            token_logger.log_usage(
                provider=provider_name,
                prompt_tokens=estimate_tokens(full_prompt_text),
                completion_tokens=0,
                latency_ms=latency_ms,
                caller_context=caller_context,
                status="ERROR"
            )
            print(f"[Ollama Local LLM Error en {url}]: {e}")

    # 3. Sin respuesta de LLM -> Caer a motor dinámico
    return None, "DYNAMIC_FALLBACK"
