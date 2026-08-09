import json
from app.state import AgentState
from app.llm_provider import invoke_llm_with_fallback

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

        system_prompt = """Eres el Agente Planificador del sistema ReqRefiner.
Dada una lista de vacíos funcionales o ambigüedades en un requerimiento, genera preguntas de aclaración profesionales, concisas y directas para el usuario.
Responde ÚNICAMENTE con un arreglo JSON de cadenas con las preguntas. Ejemplo: ["¿Pregunta 1?", "¿Pregunta 2?"]"""

        human_prompt = f"Dominio: {diag.detected_domain}\nVacíos funcionales: {json.dumps(diag.missing_items)}"

        content, source = invoke_llm_with_fallback(system_prompt, human_prompt)
        if content:
            try:
                if content.startswith("```json"):
                    content = content[7:]
                if content.endswith("```"):
                    content = content[:-3]
                content = content.strip()

                questions = json.loads(content)
                if isinstance(questions, list):
                    state.clarification_questions = [str(q) for q in questions]
                    return state
            except Exception as e:
                print(f"[LLM Planner Parse Error on {source}]: {e}")

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
