from typing import List, Optional, Dict, Any
from pydantic import BaseModel, Field

class RuleOrigin(BaseModel):
    rule_code: str
    statement: str
    rule_type: str = "EXPLICIT" # EXPLICIT, SUGGESTED, INFERRED
    source_origin: Optional[str] = None

class AnalysisDiagnosis(BaseModel):
    detected_domain: str = "General"
    detected_actors: List[str] = Field(default_factory=list)
    detected_entities: List[str] = Field(default_factory=list)
    extracted_rules: List[RuleOrigin] = Field(default_factory=list)
    missing_items: List[str] = Field(default_factory=list)
    detected_dependencies: List[str] = Field(default_factory=list)
    is_ai_generated: bool = True
    response_source: str = "GEMINI_CLOUD"

class AgentState(BaseModel):
    requirement_text: str
    project_context: Dict[str, Any] = Field(default_factory=dict)
    user_answers: List[str] = Field(default_factory=list)
    is_ai_generated: bool = True
    response_source: str = "GEMINI_CLOUD"
    
    # Diagnosis from Analyzer
    diagnosis: Optional[AnalysisDiagnosis] = None
    
    # Planning
    is_sufficient: bool = False
    clarification_questions: List[str] = Field(default_factory=list)
    
    # Generation
    refined_markdown: Optional[str] = None
    mermaid_diagram: Optional[str] = None
    gherkin_criteria: List[str] = Field(default_factory=list)
    
    # Evaluation
    evaluation_conflicts: List[str] = Field(default_factory=list)
    is_approved_by_evaluator: bool = False
    
    # Control
    iteration_count: int = 0
    status: str = "PROCESSING" # PROCESSING, NEEDS_CLARIFICATION, COMPLETED, CONFLICT
