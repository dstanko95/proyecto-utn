import json
from typing import Tuple, Optional
from langchain_google_genai import ChatGoogleGenerativeAI
from langchain_core.messages import SystemMessage, HumanMessage
from app.config import settings

def optimize_prompt(text: str) -> str:
    """Optimiza los tokens eliminando espacios y saltos redundantes"""
    if not text:
        return ""
    lines = [line.strip() for line in text.splitlines() if line.strip()]
    return "\n".join(lines)

def invoke_llm_with_fallback(system_prompt: str, human_prompt: str) -> Tuple[Optional[str], str]:
    """
    Jerarquía de Ejecución de LLM con Fallback Automático:
    1. Gemini Cloud API (Google AI) -> Devuelve (content, "GEMINI_CLOUD") [Se salta si DISABLE_GEMINI=true]
    2. Ollama Local LLM (ej: qwen2.5:7b) -> Devuelve (content, f"OLLAMA_LOCAL ({settings.OLLAMA_MODEL})")
    3. Motor Estático / Dinámico local -> Devuelve (None, "DYNAMIC_FALLBACK")
    """
    sys_clean = optimize_prompt(system_prompt)
    hum_clean = optimize_prompt(human_prompt)

    # 1. Intentar Gemini Cloud API (si DISABLE_GEMINI no está activo)
    if not settings.DISABLE_GEMINI:
        if settings.GOOGLE_API_KEY and settings.GOOGLE_API_KEY != "YOUR_GEMINI_API_KEY_HERE":
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
                if response and response.content and str(response.content).strip():
                    content = str(response.content).strip()
                    print(f"[LLM Provider Success]: Respuesta generada vía Gemini Cloud ({settings.MODEL_NAME} - Key 1)")
                    return content, f"GEMINI_CLOUD ({settings.MODEL_NAME})"
            except Exception as e:
                print(f"[Gemini Primary Key Error, intentando Secondary Key]: {e}")

        # 1.1. Intentar Gemini Cloud API (Secondary Key)
        if settings.GOOGLE_API_KEY2 and settings.GOOGLE_API_KEY2 != "YOUR_GEMINI_API_KEY_HERE":
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
                if response and response.content and str(response.content).strip():
                    content = str(response.content).strip()
                    print(f"[LLM Provider Success]: Respuesta generada vía Gemini Cloud ({settings.MODEL_NAME} - Key 2)")
                    return content, f"GEMINI_CLOUD ({settings.MODEL_NAME} - Key 2)"
            except Exception as e:
                print(f"[Gemini Secondary Key Error, intentando Ollama Local]: {e}")
    else:
        print("[LLM Provider]: Gemini desactivado vía DISABLE_GEMINI=true. Saltando directamente a Ollama Local GPU...")

    # 2. Intentar Ollama LLM Local (priorizando GPU host de Windows si Ollama está instalado localmente)
    ollama_urls = ["http://host.docker.internal:11434", settings.OLLAMA_BASE_URL, "http://ollama:11434", "http://localhost:11434"]
    tried_urls = set()

    for url in ollama_urls:
        if not url or url in tried_urls:
            continue
        tried_urls.add(url)
        try:
            from langchain_ollama import ChatOllama
            ollama_llm = ChatOllama(
                base_url=url,
                model=settings.OLLAMA_MODEL,
                temperature=0.2,
                num_predict=2500
            )
            response = ollama_llm.invoke([
                SystemMessage(content=system_prompt),
                HumanMessage(content=human_prompt)
            ])
            if response and response.content and str(response.content).strip():
                content = str(response.content).strip()
                print(f"[LLM Provider Success]: Respuesta generada vía Ollama Local ({settings.OLLAMA_MODEL}) en {url}")
                return content, f"OLLAMA_LOCAL ({settings.OLLAMA_MODEL})"
        except Exception as e:
            print(f"[Ollama Local LLM Error en {url}]: {e}")

    # 3. Sin respuesta de LLM -> Caer a motor dinámico
    return None, "DYNAMIC_FALLBACK"
