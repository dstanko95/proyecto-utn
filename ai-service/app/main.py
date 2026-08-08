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

def get_llm():
    if settings.GOOGLE_API_KEY and settings.GOOGLE_API_KEY != "YOUR_GEMINI_API_KEY_HERE":
        try:
            return ChatGoogleGenerativeAI(
                model=settings.MODEL_NAME,
                google_api_key=settings.GOOGLE_API_KEY,
                temperature=0.2
            )
        except Exception as e:
            print(f"[LLM Init Error]: {e}")
    return None

@app.get("/health")
def health_check():
    return {
        "status": "online",
        "service": "ReqRefiner AI Agents",
        "pgvector_ready": True
    }

@app.post("/analyze-context")
def analyze_context(request: ContextAnalyzeRequest):
    """
    Agente Analizador de Contexto Inicial: Procesa el documento Markdown inicial del proyecto (Sección 3.1 & 5.1).
    Extrae el dominio, el problema que resuelve, actores principales, alcance y restricciones.
    """
    text = request.contextMarkdown.strip()
    if not text:
        raise HTTPException(status_code=400, detail="El documento de contexto inicial no puede estar vacío.")

    llm = get_llm()
    if llm:
        system_prompt = """Eres el Agente Analizador del sistema ReqRefiner.
Tu tarea es analizar el documento Markdown de Contexto Inicial de un nuevo proyecto e identificar en formato JSON estricto:
1. "detected_domain": Dominio principal del proyecto (ej: Finanzas Personales, Gestión Hospitalaria, E-Commerce, etc.).
2. "problem_summary": Resumen conciso del problema principal que el sistema busca resolver.
3. "key_actors": Lista de actores o roles principales identificados.
4. "functional_scope": Lista de módulos o capacidades del alcance general.
5. "business_constraints": Lista de restricciones o reglas de negocio iniciales.

Responde ÚNICAMENTE con el JSON válido sin código adicional ni formato markdown."""

        try:
            response = llm.invoke([
                SystemMessage(content=system_prompt),
                HumanMessage(content=text)
            ])
            content = response.content.strip()
            if content.startswith("```json"):
                content = content[7:]
            if content.endswith("```"):
                content = content[:-3]
            content = content.strip()

            parsed = json.loads(content)
            return parsed
        except Exception as e:
            print(f"[LLM Context Analysis Error, falling back to heuristic]: {e}")

    # Heuristic fallback for context analysis
    text_lower = text.lower()
    if any(k in text_lower for k in ["ingreso", "egreso", "finanza", "pago", "moneda", "dinero", "banco"]):
        domain = "Finanzas Personales"
        actors = ["Usuario Registrado", "Administrador"]
        scope = ["Registro de Ingresos y Egresos", "Dashboard de Flujo de Fondos", "Gestión de Categorías"]
        constraints = ["Autenticación obligatoria", "Registro de fecha y monto positivo"]
        summary = "Aplicación móvil para control de finanzas personales, seguimiento de ingresos, egresos y balance general."
    elif any(k in text_lower for k in ["paciente", "médico", "salud", "turno", "clínica", "hospital"]):
        domain = "Gestión Salud / Hospitalaria"
        actors = ["Administrativo", "Médico", "Paciente", "Auditor"]
        scope = ["Admisión de Pacientes", "Historia Clínica Digital", "Asignación de Turnos"]
        constraints = ["Unicidad de DNI", "Registro de Domicilio Principal"]
        summary = "Sistema hospitalario para administración de historias clínicas, admisión de pacientes y turnos médicos."
    else:
        domain = "Sistema General de Software"
        actors = ["Usuario", "Administrador"]
        scope = ["Gestión de Usuarios", "Procesamiento de Requerimientos"]
        constraints = ["Acceso restringido"]
        summary = "Sistema de software para gestión y procesamiento de información general del proyecto."

    return {
        "detected_domain": domain,
        "problem_summary": summary,
        "key_actors": actors,
        "functional_scope": scope,
        "business_constraints": constraints
    }

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
