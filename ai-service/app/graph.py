from langgraph.graph import StateGraph, END
from app.state import AgentState
from app.agents.analyzer import analyzer_agent
from app.agents.planner import planner_agent
from app.agents.generator import generator_agent
from app.agents.evaluator import evaluator_agent
from app.agents.learning import learning_agent

def create_multi_agent_graph():
    """
    Compila el Grafo de Estados de LangGraph para la orquestación multi-agente.
    """
    workflow = StateGraph(AgentState)

    # Add Nodes for each agent
    workflow.add_node("analyzer", analyzer_agent)
    workflow.add_node("planner", planner_agent)
    workflow.add_node("generator", generator_agent)
    workflow.add_node("evaluator", evaluator_agent)
    workflow.add_node("learning", learning_agent)

    # Set Entry Point
    workflow.set_entry_point("analyzer")

    # Add Edge: Analyzer -> Planner
    workflow.add_edge("analyzer", "planner")

    # Conditional Edge: Planner -> (Generator OR End for Clarification Questions)
    def check_planner_sufficiency(state: AgentState):
        if state.is_sufficient:
            return "generator"
        return END

    workflow.add_conditional_edges(
        "planner",
        check_planner_sufficiency,
        {
            "generator": "generator",
            END: END
        }
    )

    # Edge: Generator -> Evaluator
    workflow.add_edge("generator", "evaluator")

    # Conditional Edge: Evaluator -> (Learning OR End for Conflict Resolution)
    def check_evaluator_approval(state: AgentState):
        if state.is_approved_by_evaluator:
            return "learning"
        return END

    workflow.add_conditional_edges(
        "evaluator",
        check_evaluator_approval,
        {
            "learning": "learning",
            END: END
        }
    )

    # Edge: Learning -> End
    workflow.add_edge("learning", END)

    return workflow.compile()

# Instancia del grafo compilado
agent_workflow = create_multi_agent_graph()
