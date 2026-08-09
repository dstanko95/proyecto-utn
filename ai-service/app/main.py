from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List, Dict, Any, Optional
import json

from app.state import AgentState
from app.graph import agent_workflow
from app.vectorstore.memory import memory_store
from app.config import settings
from langchain_google_genai import ChatGoogleGenerativeAI
from langchain_core.messages import SystemMessage, HumanMessage

app = FastAPI(
    title="ReqRefiner AI Agent Service",
    description="Microservicio de Inteligencia Artificial basado en LangGraph y pgvector",
    version="1.0.0"
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

class ContextAnalyzeRequest(BaseModel):
    contextMarkdown: str

class AnalyzeRequest(BaseModel):
    requirementText: str
    projectContext: Optional[Dict[str, Any]] = None
    userAnswers: Optional[List[str]] = None

class LearnRequest(BaseModel):
    domain: str
    patternType: str = "RULE"
    ruleStatement: str

def parse_markdown_context_dynamically(text: str) -> Dict[str, Any]:
    lines = [line.strip() for line in text.splitlines() if line.strip()]
    if not lines:
        return {
            "detected_domain": "Sistema General de Software",
            "problem_summary": "Sin información suficiente.",
            "key_actors": ["Usuario"],
            "functional_scope": [],
            "business_constraints": []
        }

    domain = "Sistema General"
    summary_lines = []
    actors = []
    scope_items = []
    constraints_items = []

    # Detect title/domain from top line or non-section headers
    for line in lines[:5]:
        if line.startswith("# ") or line.startswith("## "):
            header_text = line.lstrip("#").strip()
            if not any(k in header_text.lower() for k in ["problema", "actor", "usuario", "alcance", "restriccion", "objetivo", "regla"]):
                domain = header_text
                break
        elif not line.startswith("#") and domain == "Sistema General" and len(line) < 80:
            domain = line.strip()
            break

    current_section = "summary"

    for line in lines:
        lower = line.lower()
        if line.startswith("#"):
            header_clean = line.lstrip("#").strip().lower()
            if any(k in header_clean for k in ["problema", "objetivo", "descripción", "descripcion"]):
                current_section = "summary"
            elif any(k in header_clean for k in ["actor", "usuario", "rol", "roles"]):
                current_section = "actors"
            elif any(k in header_clean for k in ["alcance", "funcional", "característica", "caracteristica"]):
                current_section = "scope"
            elif any(k in header_clean for k in ["restricción", "restriccion", "regla", "seguridad"]):
                current_section = "constraints"
            continue

        clean_item = line.lstrip("-*• ").strip()
        if not clean_item or clean_item == domain:
            continue

        if current_section == "summary":
            summary_lines.append(clean_item)
        elif current_section == "actors":
            role_name = clean_item.split(":")[0].split("-")[0].strip()
            if role_name and len(role_name) < 40 and role_name not in actors:
                actors.append(role_name)
        elif current_section == "scope":
            scope_items.append(clean_item)
        elif current_section == "constraints":
            constraints_items.append(clean_item)

    if not actors:
        for keyword in ["usuario", "bibliotecario", "administrador", "cliente", "médico", "paciente", "proveedor", "alumno", "profesor", "auditor"]:
            if keyword in text.lower() and keyword.capitalize() not in actors:
                actors.append(keyword.capitalize())

    if not actors:
        actors = ["Usuario"]

    summary = " ".join(summary_lines[:4]) if summary_lines else f"Sistema de software para gestión de {domain}."

    return {
        "detected_domain": domain,
        "problem_summary": summary,
        "key_actors": actors,
        "functional_scope": scope_items if scope_items else summary_lines[:2] if summary_lines else ["Gestión del Sistema"],
        "business_constraints": constraints_items if constraints_items else ["Acceso según roles definidos"],
        "is_ai_generated": False
    }

@app.get("/health")
def health_check():
    return {
        "status": "online",
        "service": "ReqRefiner AI Agents",
        "pgvector_ready": True
    }

from app.llm_provider import invoke_llm_with_fallback

@app.post("/analyze-context")
def analyze_context(request: ContextAnalyzeRequest):
    """
    Agente Analizador de Contexto Inicial: Procesa el documento Markdown inicial del proyecto (Sección 3.1 & 5.1).
    Extrae el dominio, el problema que resuelve, actores principales, alcance y restricciones.
    """
    text = request.contextMarkdown.strip()
    if not text:
        raise HTTPException(status_code=400, detail="El documento de contexto inicial no puede estar vacío.")

    system_prompt = """Eres el Agente Analizador del sistema ReqRefiner.
Tu tarea es analizar el documento Markdown de Contexto Inicial de un nuevo proyecto e identificar en formato JSON estricto:
1. "detected_domain": Dominio principal del proyecto (ej: "Sistema de Librería", "Finanzas Personales", etc.). Extrae el nombre o tema específico del texto. NUNCA devuelvas un dominio genérico si el texto especifica un tema particular.
2. "problem_summary": Resumen conciso del problema principal que el sistema busca resolver.
3. "key_actors": Lista de actores o roles principales identificados explícitamente (ej: ["Usuario", "Bibliotecario"]). Respeta los roles específicos del texto.
4. "functional_scope": Lista de capacidades o alcance del sistema.
5. "business_constraints": Lista de restricciones de negocio o reglas de acceso descritas.

Responde ÚNICAMENTE con el JSON válido sin código adicional ni formato markdown."""

    content, source = invoke_llm_with_fallback(system_prompt, text)
    if content:
        try:
            if content.startswith("```json"):
                content = content[7:]
            if content.endswith("```"):
                content = content[:-3]
            content = content.strip()

            parsed = json.loads(content)
            parsed["is_ai_generated"] = True
            parsed["response_source"] = source
            return parsed
        except Exception as e:
            print(f"[JSON Parse Error on {source}]: {e}")

    # Dynamic Markdown Context Parser Fallback (Agnostic to predefined domains)
    res = parse_markdown_context_dynamically(text)
    res["is_ai_generated"] = False
    res["response_source"] = "DYNAMIC_FALLBACK"
    return res

@app.post("/analyze")
def analyze_requirement(request: AnalyzeRequest):
    try:
        initial_state = AgentState(
            requirement_text=request.requirementText,
            project_context=request.projectContext or {},
            user_answers=request.userAnswers or []
        )

        final_state_dict = agent_workflow.invoke(initial_state)
        return final_state_dict
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error en la orquestación agéntica: {str(e)}")

@app.post("/learn")
def learn_rule(request: LearnRequest):
    success = memory_store.save_learned_pattern(
        domain=request.domain,
        patternType=request.patternType,
        ruleStatement=request.ruleStatement
    )
    if not success:
        raise HTTPException(status_code=500, detail="Error al guardar la regla en la memoria persistente")
    return {"message": "Patrón persistido exitosamente en pgvector"}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("app.main:app", host="0.0.0.0", port=settings.PORT, reload=True)
