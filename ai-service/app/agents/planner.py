import json
from app.state import AgentState
from app.llm_provider import invoke_llm_with_fallback
from app.json_parser import parse_llm_json

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

        content, source = invoke_llm_with_fallback(system_prompt, human_prompt, caller_context="planner_agent")
        if content:
            try:
                questions = parse_llm_json(content)
                if isinstance(questions, list):
                    clean_q = []
                    for q in questions:
                        if isinstance(q, str):
                            clean_q.append(q)
                        elif isinstance(q, dict):
                            val = q.get("question") or q.get("statement") or q.get("text") or str(q)
                            clean_q.append(str(val))
                    if clean_q:
                        state.clarification_questions = clean_q
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
