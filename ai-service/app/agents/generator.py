import json
import re
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

def clean_and_enrich_text(text: str) -> str:
    if not text:
        return ""
    
    replacements = {
        r'\bfinancias\b': 'finanzas',
        r'\brequirmiento\b': 'requerimiento',
        r'\bae\b': 'de',
        r'\bincio\b': 'inicio',
        r'\busaurio\b': 'usuario',
        r'\bmail\b': 'correo electrónico',
        r'\bmobile\b': 'móvil',
        r'\bOK\b': 'exitoso',
        r'\bNO OK\b': 'fallido',
        r'\baprieta\b': 'presiona el botón de',
        r'\bse encuentra en base de datos\b': 'persistan en la base de datos relacional',
    }

    enriched = text
    for pattern, replacement in replacements.items():
        enriched = re.sub(pattern, replacement, enriched, flags=re.IGNORECASE)

    enriched = re.sub(r'(\d+)\.\s*', r'\n\1. ', enriched)
    return enriched.strip()

def build_dynamic_mermaid_diagram(req_text: str, user_answers: list = None) -> str:
    lines = [l.strip() for l in req_text.split('\n') if l.strip()]
    steps = [re.sub(r'^[#\*\-]+\s*', '', line) for line in lines if line.strip()]

    if not steps:
        steps = [s.strip() for s in req_text.split('.') if len(s.strip()) > 5]

    if not steps:
        return "graph TD\n    A[Inicio de Flujo] --> B[Ejecución del Requerimiento]\n    B --> C[Fin del Flujo]"

    mermaid_lines = ["graph TD", "    classDef default fill:#f9f9f9,stroke:#333,stroke-width:1px;"]
    node_ids = []
    
    for idx, step in enumerate(steps[:12]):
        node_id = f"N{idx+1}"
        clean_label = re.sub(r'[\"\'\[\]\(\)\{\}]', '', step)
        mermaid_lines.append(f'    {node_id}["{clean_label}"]')
        node_ids.append(node_id)

    for i in range(len(node_ids) - 1):
        mermaid_lines.append(f'    {node_ids[i]} --> {node_ids[i+1]}')

    if node_ids:
        # Nodo inicial (proceso) – azul
        mermaid_lines.append(f"    style {node_ids[0]} fill:#3b82f6,stroke:#3b82f6,stroke-width:2px")
    return "\n".join(mermaid_lines)

def build_fully_dynamic_markdown_spec(req_text: str, user_answers: list, diag, req_code: str = "RF01", version_num: str = "1.0") -> tuple:
    """
    Generador de Especificación Profesional 100% Dinámico:
    Procesa cualquier requerimiento (sin importar el módulo o dominio) y construye:
    - Título del Requerimiento
    - Flujo Principal numerado integrado con respuestas
    - Actores y Entidades extraídas
    - Reglas de Negocio (RN01, RN02, RN03...) creadas dinámicamente
    - Criterios de Aceptación BDD (CA01, CA02, CA03...) creados dinámicamente
    - Sección de Recomendaciones y Decisiones de Negocio Pendientes
    """
    domain = diag.detected_domain if diag else "General"
    actors = diag.detected_actors if (diag and diag.detected_actors) else ["Usuario", "Sistema"]
    entities = diag.detected_entities if (diag and diag.detected_entities) else ["Datos"]
    
    # 1. Title Extraction
    first_line = req_text.split('\n')[0].strip()
    title = re.sub(r'^[#\*\-\d\.\s]+', '', first_line)
    if not title or len(title) > 60:
        title = "Especificación Funcional Refinada"

    # 2. Main Flow Building
    enriched_text = clean_and_enrich_text(req_text)
    flow_steps = [s.strip() for s in enriched_text.split('\n') if s.strip()]
    
    flow_formatted = ""
    for idx, step in enumerate(flow_steps[:15]):
        clean_step = re.sub(r'^\d+\.\s*', '', step)
        flow_formatted += f"{idx+1}. {clean_step}\n"
    
    if user_answers:
        flow_formatted += "\n**Aclaraciones e Integraciones de Negocio Incorporadas:**\n"
        for ans in user_answers:
            flow_formatted += f"- {ans}\n"

    # 3. Dynamic Business Rules (RN01, RN02...)
    rn_lines = []
    rule_idx = 1
    if diag and diag.extracted_rules:
        for r in diag.extracted_rules:
            rn_lines.append(f"### RN0{rule_idx} - {r.statement[:50]}\n{r.statement}\n")
            rule_idx += 1
    
    if user_answers:
        for ans in user_answers:
            rn_lines.append(f"### RN0{rule_idx} - Regla de Aclaración de Negocio\nEl sistema deberá garantizar que: {ans}\n")
            rule_idx += 1

    if not rn_lines:
        rn_lines.append("### RN01 - Validación de Integridad de Entrada\nEl sistema deberá validar los datos de entrada antes de procesar el flujo.\n")

    # 4. Dynamic Acceptance Criteria (CA01, CA02...)
    ca_lines = []
    ca_list = []
    ca_idx = 1
    
    # Happy path CA
    ca_title = f"CA0{ca_idx} - Ejecución exitosa del flujo"
    ca_body = f"**Dado** un {actors[0]} en el sistema,\n**cuando** realiza el proceso con información válida,\n**entonces** el sistema procesa la solicitud y confirma el resultado exitoso.\n"
    ca_lines.append(f"### {ca_title}\n{ca_body}")
    ca_list.append(f"{ca_title}: Dado {actors[0]} con datos válidos, cuando procesa la solicitud, entonces el sistema confirma el resultado exitoso.")
    ca_idx += 1

    # Exception CA
    ca_title = f"CA0{ca_idx} - Manejo de datos inválidos o errores"
    ca_body = f"**Dado** un {actors[0]},\n**cuando** ingresa datos con formato inválido o incompletos,\n**entonces** el sistema muestra un mensaje de error y no permite continuar la operación.\n"
    ca_lines.append(f"### {ca_title}\n{ca_body}")
    ca_list.append(f"{ca_title}: Dado {actors[0]} con datos inválidos, cuando envía la solicitud, entonces el sistema muestra el mensaje de error.")
    ca_idx += 1

    # User Answers CAs
    if user_answers:
        for ans in user_answers:
            ca_title = f"CA0{ca_idx} - Validación de aclaración de negocio"
            ca_body = f"**Dado** las condiciones del sistema,\n**cuando** se evalúa la regla: '{ans}',\n**entonces** el sistema cumple estrictamente con el parámetro definido.\n"
            ca_lines.append(f"### {ca_title}\n{ca_body}")
            ca_list.append(f"{ca_title}: Dado el sistema, cuando evalúa {ans}, entonces cumple el parámetro.")
            ca_idx += 1

    # Calculate next RF codes for modular suggestions
    try:
        num_part = int(re.sub(r'\D', '', req_code))
    except Exception:
        num_part = 1
    next_rf1 = f"RF{num_part + 1:02d}"
    next_rf2 = f"RF{num_part + 2:02d}"

    # 5. Recommendations & Architecture Suggestions (Section 7)
    recommendations_doc = f"""## 7. Recomendaciones y Decisiones de Negocio Pendientes (Agente Evaluador)

### 📌 Decisión de Negocio Pendiente: Condiciones de Borde y Excepciones
Se recomienda revisar y definir de forma explícita:
* Reglas de reintentos máximos y tiempos de bloqueo ante fallos recurrentes.
* Mensajes de error específicos a presentar en la interfaz de usuario.
* Requisitos de confirmación o deshacer (Undo) para acciones críticas.

### 📐 Desacoplamiento de Módulos y Arquitectura Sugerida
Para mantener cada requerimiento enfocado en una sola responsabilidad (ISO/IEC/IEEE 29148):
* Mantener este requerimiento ({req_code} - {title}) acotado a su flujo directo.
* Separar reglas ajenas de reportes, alertas globales o dashboards a sus propios RFs independientes (ej: {next_rf1}, {next_rf2}).
"""

    # Build actors table with description column
    actors_table = "| Nombre | Descripción |\n|---|---|\n"
    actors_table += f"| **{actors[0]}** | Rol principal que interactúa con el sistema. |\n"
    if len(actors) > 1:
        for actor in actors[1:]:
            actors_table += f"| **{actor}** | Breve descripción del rol. |\n"
    actors_doc = actors_table

    # Build entities table with description column
    entities_doc = "| Entidad | Descripción |\n|---|---|\n"
    for e in entities:
        entities_doc += f"| **{e}** | Descripción breve de la entidad. |\n"

    markdown_doc = f"""# {req_code} - {title}

**Estado:** Refinado
**Prioridad:** Alta
**Versión:** {version_num}
**Dominio:** {domain}

## 1. Descripción

{flow_steps[0] if flow_steps else req_text[:150]}

## 2. Flujo principal

{flow_formatted}

## 3. Actores

{actors_doc}

## 4. Entidades involucradas

{entities_doc}

## 5. Reglas de negocio

{"".join(rn_lines)}

## 6. Criterios de aceptación

{"".join(ca_lines)}

{recommendations_doc}
"""

    return markdown_doc, ca_list

from app.llm_provider import invoke_llm_with_fallback
from app.json_parser import parse_llm_json

def clean_mermaid_syntax(mermaid_code: str) -> str:
    if not mermaid_code:
        return ""
    code = mermaid_code.strip()
    if code.startswith("```mermaid"):
        code = code[10:]
    elif code.startswith("```"):
        code = code[3:]
    if code.endswith("```"):
        code = code[:-3]
    code = code.strip()

    def replace_parens_in_node(match):
        prefix = match.group(1)
        label = match.group(2)
        suffix = match.group(3)
        clean_label = label.replace("(", " - ").replace(")", "").replace('"', '').replace("'", "")
        return f"{prefix}{clean_label}{suffix}"

    code = re.sub(r'([A-Za-z0-9_\-]+\[)(.*?)(\])', replace_parens_in_node, code)
    code = re.sub(r'([A-Za-z0-9_\-]+\{)(.*?)(\})', replace_parens_in_node, code)
    return code

def generator_agent(state: AgentState) -> AgentState:
    """
    Agente Generador Dinámico:
    Construye la especificación Markdown profesional (IEEE 29148), el diagrama Mermaid y
    los Criterios de Aceptación Gherkin de forma 100% dinámica para CUALQUIER requerimiento.
    """
    diag = state.diagnosis
    domain = diag.detected_domain if diag else "General"

    project_context = state.project_context or {}
    req_code = project_context.get("requirementCode") or project_context.get("requirement_code") or "RF01"
    version_num = str(project_context.get("versionNumber") or project_context.get("version") or "1.0")
    if version_num.lower().startswith('v'):
        version_num = version_num[1:]

    state.requirement_code = req_code
    state.version_number = version_num

    system_prompt = f"""Eres el Agente Generador del sistema ReqRefiner.
Tu función es transformar cualquier requerimiento bruto ingresado por el usuario + sus respuestas de aclaración en una ESPECIFICACIÓN FUNCIONAL DE SOFTWARE DE NIVEL PROFESIONAL (Estándar IEEE 29148 / PDD).

DIRECTIVAS CRÍTICAS DE ENRIQUECIMIENTO Y ESTRUCTURA:
1. REESTRUCTURA Y REFINA EL TEXTO: Corrige ortografía, gramática, errores de tipeo y eleva el lenguaje informal a términos técnicos formales de ingeniería de software.
2. INTEGRA TODAS LAS RESPUESTAS DE ACLARACIÓN: Expande el flujo principal paso a paso detallado numerado e incorpora las respuestas en las Reglas de Negocio y Criterios de Aceptación.
3. DESACOPLA REGLAS AJENAS: Elimina del documento cualquier regla o referencia que pertenezca a otros módulos o requerimientos futuros.
4. INCLUYE SECCIÓN DE RECOMENDACIONES Y DESGLOSE DE REQs FUTUROS: Agrega un apartado con decisiones de negocio aún abiertas y propone la arquitectura modular de RFs futuros derivados.
5. REGLA CRÍTICA SINTAXIS MERMAID: En 'mermaid_diagram', NUNCA utilices paréntesis '(' o ')' ni comillas dentro de los textos o nombres de los nodos (ejemplo: NUNCA escribas F{{Determinar rol (bibliotecario o usuario)}}, debes escribir F{{Determinar rol - bibliotecario o usuario}} sin paréntesis).
6. CÓDIGO Y VERSIÓN MANDATORIOS: Usa OBLIGATORIAMENTE el código '{req_code}' en el título principal (# {req_code} - [Título del Requerimiento]) y la versión '{version_num}' en los metadatos (**Versión:** {version_num}).

Estructura JSON estricta esperada:
{{
  "refined_markdown": "# {req_code} - [Título del Requerimiento]\\n\\n**Estado:** Refinado\\n**Prioridad:** Alta\\n**Versión:** {version_num}\\n\\n## 1. Descripción\\n...\\n\\n## 2. Flujo principal\\n1. ...\\n2. ...\\n\\n## 3. Actores\\n### Actor principal\\n* **[Nombre Actor]:** ...\\n### Sistema\\n...\\n\\n## 4. Entidades involucradas\\n* **[Entidad 1]:** ...\\n* **[Entidad 2]:** ...\\n\\n## 5. Reglas de negocio\\n### RN01 - ...\\n...\\n### RN02 - ...\\n...\\n\\n## 6. Criterios de aceptación\\n### CA01 - ...\\n**Dado** ...\\n**cuando** ...\\n**entonces** ...\\n\\n## 7. Recomendaciones y Decisiones Pendientes (Agente Evaluador)\\n### Decisión de negocio pendiente:\\n...\\n### Arquitectura Modular Sugerida para Próximos RFs:\\n- RF... - ...",
  "mermaid_diagram": "Código de diagrama Mermaid (graph TD ...) sin paréntesis dentro de las etiquetas de nodos",
  "gherkin_criteria": ["CA01 - Dado ... cuando ... entonces ...", "CA02 - Dado ... cuando ... entonces ..."]
}}
Responde ÚNICAMENTE con el objeto JSON válido sin formato ni código adicional."""

    human_prompt = f"""Dominio del Proyecto: {domain}
Código Asignado: {req_code}
Versión Asignada: {version_num}
Texto Ingresado por el Usuario: {state.requirement_text}
Respuestas de Aclaración del Usuario: {json.dumps(state.user_answers)}
Entidades Identificadas: {json.dumps(diag.detected_entities if diag else [])}
Actores Identificados: {json.dumps(diag.detected_actors if diag else [])}"""

    content, source = invoke_llm_with_fallback(system_prompt, human_prompt, caller_context="generator_agent")

    if content:
        try:
            parsed = parse_llm_json(content)
            if parsed and isinstance(parsed, dict) and parsed.get("refined_markdown"):
                md = parsed.get("refined_markdown")
                # Force exact req_code in header if LLM hardcoded RF01
                md = re.sub(r'^#\s*RF\d+\b', f'# {req_code}', md, count=1, flags=re.MULTILINE)
                # Force exact version_num if LLM hardcoded 1.2
                md = re.sub(r'\*\*Versión:\*\*\s*\d+\.\d+', f'**Versión:** {version_num}', md, count=1)

                state.refined_markdown = md
                raw_mermaid = parsed.get("mermaid_diagram", build_dynamic_mermaid_diagram(state.requirement_text, state.user_answers))
                state.mermaid_diagram = clean_mermaid_syntax(raw_mermaid)
                state.gherkin_criteria = parsed.get("gherkin_criteria", [])
                state.is_ai_generated = True
                state.response_source = source
                return state
        except Exception as e:
            print(f"[LLM Generator Parse Error on {source}]: {e}")

    # Fully Dynamic Generator Fallback (Zero hardcoded text for any requirement!)
    markdown_doc, ca_list = build_fully_dynamic_markdown_spec(
        state.requirement_text,
        state.user_answers,
        diag,
        req_code=req_code,
        version_num=version_num
    )
    
    mermaid_code = build_dynamic_mermaid_diagram(state.requirement_text, state.user_answers)

    state.refined_markdown = markdown_doc
    state.mermaid_diagram = clean_mermaid_syntax(mermaid_code)
    state.gherkin_criteria = ca_list
    state.is_ai_generated = False
    state.response_source = "DYNAMIC_FALLBACK"

    return state
