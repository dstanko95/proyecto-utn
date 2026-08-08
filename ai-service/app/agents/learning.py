from app.state import AgentState
from app.vectorstore.memory import memory_store

def learning_agent(state: AgentState) -> AgentState:
    """
    Agente de Aprendizaje: Almacena las reglas y decisiones aprobadas por el usuario en pgvector
    para enriquecer la memoria persistente del sistema para futuros proyectos.
    """
    if state.is_approved_by_evaluator and state.diagnosis:
        domain = state.diagnosis.detected_domain
        for rule in state.diagnosis.extracted_rules:
            if rule.rule_type in ["EXPLICIT", "SUGGESTED"]:
                memory_store.save_learned_pattern(
                    domain=domain,
                    pattern_type="RULE",
                    rule_statement=rule.statement
                )
    return state
