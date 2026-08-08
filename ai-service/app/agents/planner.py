import json
from langchain_google_genai import ChatGoogleGenerativeAI
from langchain_core.messages import SystemMessage, HumanMessage
from app.state import AgentState
from app.config import settings

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

def planner_agent(state: AgentState) -> AgentState:
    """
    Agente Planificador Dinámico: Determina la suficiencia de datos.
    Si el usuario ya respondió las preguntas (user_answers) o es el segundo ciclo,
    habilita la generación inmediata del documento final.
    """
    state.iteration_count += 1
    diag = state.diagnosis

    # If the user has provided answers OR iterations >= 2, consider info SUFFICIENT to generate deliverables
    if (state.user_answers and len(state.user_answers) > 0) or state.iteration_count >= 2:
        state.is_sufficient = True
        state.clarification_questions = []
        state.status = "PROCESSING"
        return state

    if diag and diag.missing_items:
        state.is_sufficient = False
        state.status = "NEEDS_CLARIFICATION"

        llm = get_llm()
        if llm:
            system_prompt = """Eres el Agente Planificador del sistema ReqRefiner.
Dada una lista de vacíos funcionales o ambigüedades en un requerimiento, genera preguntas de aclaración profesionales, concisas y directas para el usuario.
Responde ÚNICAMENTE con un arreglo JSON de cadenas con las preguntas. Ejemplo: ["¿Pregunta 1?", "¿Pregunta 2?"]"""

            human_prompt = f"Dominio: {diag.detected_domain}\nVacíos funcionales: {json.dumps(diag.missing_items)}"

            try:
                response = llm.invoke([
                    SystemMessage(content=system_prompt),
                    HumanMessage(content=human_prompt)
                ])

                content = response.content.strip()
                if content.startswith("```json"):
                    content = content[7:]
                if content.endswith("```"):
                    content = content[:-3]
                content = content.strip()

                questions = json.loads(content)
                state.clarification_questions = questions
                return state
            except Exception as e:
                print(f"[LLM Planner Error, using dynamic transformation]: {e}")

        # Fallback dynamic questions generator
        questions = []
        for item in diag.missing_items:
            questions.append(f"Respecto a '{item}': ¿Cómo debe comportarse el sistema?")
        state.clarification_questions = questions
    else:
        state.is_sufficient = True
        state.clarification_questions = []
        state.status = "PROCESSING"

    return state
