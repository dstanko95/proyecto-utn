from app.state import AgentState

def evaluator_agent(state: AgentState) -> AgentState:
    """
    Agente Evaluador Dinámico: Ejecuta verificaciones de consistencia lógica
    sin restricciones de dominio fijo.
    """
    conflicts = []
    project = state.project_context or {}
    declared_actors = project.get("actors", [])

    # Check 1: Actor consistency check (if actors were declared in project context)
    if state.diagnosis and declared_actors:
        for actor in state.diagnosis.detected_actors:
            if actor not in declared_actors and actor not in ["Usuario", "Sistema", "Administrador"]:
                conflicts.append(f"Inconsistencia de Actores: El rol '{actor}' no estaba en la lista inicial del proyecto.")

    # Check 2: Empty content check
    if not state.refined_markdown or len(state.refined_markdown.strip()) < 20:
        conflicts.append("Incompleto: La especificación generada está vacía o incompleta.")

    if conflicts:
        state.is_approved_by_evaluator = False
        state.evaluation_conflicts = conflicts
        state.status = "CONFLICT"
    else:
        state.is_approved_by_evaluator = True
        state.evaluation_conflicts = []
        state.status = "COMPLETED"

    return state
