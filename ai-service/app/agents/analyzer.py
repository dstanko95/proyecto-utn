import json
from langchain_google_genai import ChatGoogleGenerativeAI
from langchain_core.messages import SystemMessage, HumanMessage
from app.state import AgentState, AnalysisDiagnosis, RuleOrigin
from app.config import settings
from app.vectorstore.memory import memory_store
from app.llm_provider import invoke_llm_with_fallback
from app.json_parser import parse_llm_json

def analyzer_agent(state: AgentState) -> AgentState:
    """
    Agente Analizador Funcional 100% Dinámico (Agnóstico a Dominio y Funcionalidad):
    Utiliza IA de razonamiento libre sobre CUALQUIER requerimiento.
    """
    req_text = state.requirement_text
    project = state.project_context or {}
    project_name = project.get("name", "General")
    domain = project.get("domain", "General")
    context_markdown = project.get("initialContextMarkdown", "")

    system_prompt = f"""Eres el Agente Analizador Funcional del sistema ReqRefiner.
Tu tarea es analizar el texto de CUALQUIER REQUERIMIENTO FUNCIONAL ESPECÍFICO e identificar en formato JSON estricto:
1. "detected_domain": Dominio del proyecto ("{domain}").
2. "detected_actors": Lista de roles o actores que intervienen en este requerimiento específico.
3. "detected_entities": Lista de entidades de datos o conceptos relevantes manipulados.
4. "extracted_rules": Lista de objetos con "rule_code" (RN01, RN02...), "statement" (descripción de la regla) y "rule_type" ("EXPLICIT").
5. "missing_items": Lista de vacíos funcionales o ambigüedades reales ESPECÍFICAS DE ESTE REQUERIMIENTO (por ejemplo: validaciones omitidas, límites de cantidad no especificados, condiciones ante duplicados, manejo de errores).
   CRÍTICO: Formula únicamente vacíos pertinentes al requerimiento ingresado. Si el requerimiento es completamente detallado y sin ambigüedades, retorna [].
6. "detected_dependencies": Lista de módulos o componentes del sistema relacionados.

Responde ÚNICAMENTE con la estructura JSON válida sin formato ni texto adicional."""

    human_prompt = f"""CONTEXTO DEL PROYECTO:
Nombre: {project_name}
Dominio: {domain}
Alcance / Contexto Inicial: {context_markdown or project.get('scope', '')}

REQUERIMIENTO INGRESADO A ANALIZAR:
{req_text}"""

    content, source = invoke_llm_with_fallback(system_prompt, human_prompt, caller_context="analyzer_agent")

    if content:
        try:
            parsed = parse_llm_json(content)
            if parsed and isinstance(parsed, dict):
                rules = [
                    RuleOrigin(
                        rule_code=r.get("rule_code", f"RN0{i+1}"),
                        statement=r.get("statement", ""),
                        rule_type=r.get("rule_type", "EXPLICIT"),
                        source_origin="Texto ingresado por usuario"
                    )
                    for i, r in enumerate(parsed.get("extracted_rules", []))
                ]

                similar_rules = memory_store.query_similar_rules(domain, req_text)
                for i, s in enumerate(similar_rules):
                    rules.append(
                        RuleOrigin(
                            rule_code=f"RN_MEM_{i+1}",
                            statement=s["rule_statement"],
                            rule_type="SUGGESTED",
                            source_origin="Memoria Persistente Global (pgvector)"
                        )
                    )

                def clean_list(raw, default):
                    if not isinstance(raw, list):
                        return default
                    res = []
                    for item in raw:
                        if isinstance(item, dict):
                            v = item.get("description") or item.get("statement") or item.get("name") or item.get("item") or str(item)
                            res.append(str(v))
                        elif item:
                            res.append(str(item))
                    return res if res else default

                state.is_ai_generated = True
                state.response_source = source
                state.diagnosis = AnalysisDiagnosis(
                    detected_domain=parsed.get("detected_domain", domain),
                    detected_actors=clean_list(parsed.get("detected_actors"), ["Usuario"]),
                    detected_entities=clean_list(parsed.get("detected_entities"), ["Datos"]),
                    extracted_rules=rules,
                    missing_items=clean_list(parsed.get("missing_items"), []),
                    detected_dependencies=clean_list(parsed.get("detected_dependencies"), ["Módulo Principal"]),
                    is_ai_generated=True,
                    response_source=source
                )
                return state
        except Exception as e:
            print(f"[LLM Analysis Parse Error on {source}]: {e}")

    # Fully Dynamic Requirement Analyzer (Agnostic to Feature Names & Domains)
    state.is_ai_generated = False
    text_lower = req_text.lower()

    # 1. Dynamic Entity Extraction from text nouns
    words = req_text.split()
    extracted_entities = []
    stop_words = {"para", "como", "este", "esta", "cada", "con", "que", "del", "las", "los", "una", "uno", "debe", "sistema", "usuario", "pantalla", "paso", "pasos", "caso"}
    for w in words:
        clean_w = w.strip(".,;:()[]{}*#\"'").capitalize()
        if len(clean_w) > 3 and clean_w.lower() not in stop_words:
            if clean_w not in extracted_entities:
                extracted_entities.append(clean_w)
    
    entities = extracted_entities[:4] if extracted_entities else ["EntidadPrincipal"]

    # 2. Dynamic Actor Detection
    actors = []
    if project.get("actors"):
        for a in project.get("actors", []):
            actor_name = a.get("name") if isinstance(a, dict) else str(a)
            if actor_name and actor_name not in actors:
                actors.append(actor_name)
    
    if not actors:
        actors = ["Usuario", "Sistema"]

    known_roles = ["administrador", "admin", "cliente", "bibliotecario", "proveedor", "supervisor", "auditor", "medico", "médico", "paciente", "profesor", "alumno"]
    for role in known_roles:
        if role in text_lower:
            formatted_role = role.capitalize()
            if formatted_role == "Admin":
                formatted_role = "Administrador"
            elif formatted_role == "Medico":
                formatted_role = "Médico"
            if formatted_role not in actors:
                actors.append(formatted_role)

    # 3. Dynamic Requirement Rules Extraction
    rules = [
        RuleOrigin(
            rule_code="RN01",
            statement=f"El sistema debe procesar la secuencia solicitada: '{req_text[:80]}...'",
            rule_type="EXPLICIT",
            source_origin="Texto ingresado por usuario"
        )
    ]

    # 4. Fully Dynamic Missing Items Analysis based on Requirement Patterns
    missing = []

    # Pattern A: Validation & Constraint Ambiguity
    if not any(k in text_lower for k in ["validar", "formato", "longitud", "mínimo", "minimo", "máximo", "maximo", "límite", "limite", "rango", "expiración", "validez"]) and not any("valid" in a.lower() for a in state.user_answers):
        missing.append(f"No se especificaron las reglas de validación de formato, restricciones de longitud o límites de los datos ingresados en '{entities[0]}'.")

    # Pattern B: Duplicates / Uniqueness Handling
    if any(k in text_lower for k in ["crear", "ingresar", "registrar", "agregar", "nuevo", "nueva"]) and not any(k in text_lower for k in ["existe", "duplicad", "repetid", "unicid"]) and not any("duplicad" in a.lower() for a in state.user_answers):
        missing.append(f"No se especificó el comportamiento del sistema en caso de que el elemento o registro de '{entities[0]}' ya exista previamente.")

    # Pattern C: Error / Exception Handling
    if not any(k in text_lower for k in ["error", "fallo", "incorrecto", "inválid", "invalido", "excepción", "excepcion", "bloqueo"]) and not any("error" in a.lower() for a in state.user_answers):
        missing.append("No se especificó la respuesta del sistema ni la acción a tomar ante situaciones de error o datos inválidos.")

    # Pattern D: Action Confirmation
    if any(k in text_lower for k in ["modificar", "eliminar", "borrar", "cancelar", "actualizar"]) and not any(k in text_lower for k in ["confirm", "alerta", "advertencia"]) and not any("confirm" in a.lower() for a in state.user_answers):
        missing.append("No se especificó si se requiere una confirmación previa del usuario antes de ejecutar la acción sobre los datos.")

    # Pattern E: Notification / Alert Requirements
    if any(k in text_lower for k in ["notificar", "alerta", "aviso"]) and not any(k in text_lower for k in ["cuando", "si", "threshold", "umbral"]):
        missing.append("No se definieron criterios de notificación o alerta para eventos críticos.")

    state.diagnosis = AnalysisDiagnosis(
        detected_domain=domain,
        detected_actors=actors,
        detected_entities=entities,
        extracted_rules=rules,
        missing_items=missing,
        detected_dependencies=[f"Módulo de {entities[0]}"],
        is_ai_generated=False
    )

    return state
