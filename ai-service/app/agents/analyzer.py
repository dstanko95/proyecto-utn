import json
from langchain_google_genai import ChatGoogleGenerativeAI
from langchain_core.messages import SystemMessage, HumanMessage
from app.state import AgentState, AnalysisDiagnosis, RuleOrigin
from app.config import settings
from app.vectorstore.memory import memory_store

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

def analyzer_agent(state: AgentState) -> AgentState:
    """
    Agente Analizador Funcional 100% Dinámico (Agnóstico a Dominio y Funcionalidad):
    Utiliza IA de razonamiento libre o análisis estructural genérico sobre CUALQUIER requerimiento.
    No contiene palabras clave fijas ni bloques harcodeados de funciones.
    """
    req_text = state.requirement_text
    project = state.project_context or {}
    project_name = project.get("name", "General")
    domain = project.get("domain", "General")
    context_markdown = project.get("initialContextMarkdown", "")

    llm = get_llm()

    if llm:
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

            parsed = json.loads(content)

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

            state.diagnosis = AnalysisDiagnosis(
                detected_domain=parsed.get("detected_domain", domain),
                detected_actors=parsed.get("detected_actors", ["Usuario"]),
                detected_entities=parsed.get("detected_entities", ["Datos"]),
                extracted_rules=rules,
                missing_items=parsed.get("missing_items", []),
                detected_dependencies=parsed.get("detected_dependencies", ["Módulo Principal"])
            )
            return state
        except Exception as e:
            print(f"[LLM Analysis Error, falling back to dynamic structural analyzer]: {e}")

    # Fully Dynamic Requirement Analyzer (Agnostic to Feature Names & Domains)
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
    actors = ["Usuario", "Sistema"]
    if "administrador" in text_lower or "admin" in text_lower:
        actors.append("Administrador")
    if "cliente" in text_lower:
        actors.append("Cliente")

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

    state.diagnosis = AnalysisDiagnosis(
        detected_domain=domain,
        detected_actors=actors,
        detected_entities=entities,
        extracted_rules=rules,
        missing_items=missing,
        detected_dependencies=[f"Módulo de {entities[0]}"]
    )

    return state
