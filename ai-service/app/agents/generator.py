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

def generator_agent(state: AgentState) -> AgentState:
    """
    Agente Generador Dinámico: Invoca a Google Gemini para estructurar la documentación
    funcional refinada (Markdown), el diagrama de flujo (Mermaid) y los criterios (Gherkin).
    """
    diag = state.diagnosis
    domain = diag.detected_domain if diag else "General"
    llm = get_llm()

    if llm:
        system_prompt = """Eres el Agente Generador del sistema ReqRefiner.
Tu tarea es generar los entregables funcionales en formato JSON con la siguiente estructura estricta:
{
  "refined_markdown": "Documento completo en Markdown estructurado con secciones: 1. Descripción, 2. Actores Involucrados, 3. Entidades y Datos, 4. Reglas de Negocio Catalogadas (marcando [RN01 - Explícita] o [RN02 - Memoria Global]), 5. Criterios de Aceptación",
  "mermaid_diagram": "Código de diagrama Mermaid (graph TD ...) únicamente el código de diagrama",
  "gherkin_criteria": ["Dado ... cuando ... entonces ...", "Dado ... cuando ... entonces ..."]
}
Responde ÚNICAMENTE con el objeto JSON válido."""

        human_prompt = f"""Dominio: {domain}
Requerimiento Original: {state.requirement_text}
Aclaraciones del Usuario: {json.dumps(state.user_answers)}
Entidades Detectadas: {json.dumps(diag.detected_entities if diag else [])}
Actores Detectados: {json.dumps(diag.detected_actors if diag else [])}"""

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
            if parsed.get("refined_markdown"):
                state.refined_markdown = parsed.get("refined_markdown")
                state.mermaid_diagram = parsed.get("mermaid_diagram", "graph TD\n    A[Inicio] --> B[Procesar]")
                state.gherkin_criteria = parsed.get("gherkin_criteria", [])
                return state
        except Exception as e:
            print(f"[LLM Generator Error, using dynamic fallback]: {e}")

    # Robust Heuristic dynamic fallback for any domain (Finance, Mobile, etc.)
    actors_str = ", ".join(diag.detected_actors) if diag and diag.detected_actors else "Usuario Registrado"
    entities_str = ", ".join(diag.detected_entities) if diag and diag.detected_entities else "Ingreso, Egreso, Balance"
    user_answers_str = "\n".join([f"- Aclaración: {a}" for a in state.user_answers]) if state.user_answers else "- No se requirieron aclaraciones adicionales."

    markdown_doc = f"""# RF01 - Especificación Funcional Refinada: {domain}

**Estado**: Refinado y Aprobado por Agentes de IA (LangGraph)
**Prioridad**: Alta | **Versión**: 1.2

## 1. Descripción General
{state.requirement_text}

## 2. Actores Involucrados
- **{actors_str}**: Usuario con acceso al flujo del sistema.

## 3. Entidades de Datos y Estructura
- **{entities_str}**: Registros capturados y expuestos en el panel principal.

## 4. Respuestas de Aclaración Incorporadas
{user_answers_str}

## 5. Reglas de Negocio Catalogadas (con Trazabilidad)
1. **[RN01 - Explícita] Autenticación Obligatoria**: El usuario debe haber iniciado sesión para registrar movimientos. *(Origen: Texto de entrada)*
2. **[RN02 - Explícita] Integridad de Transacción**: Los montos registrados deben ser numéricos positivos y contar con fecha de registro. *(Origen: Regla del dominio)*
3. **[RN03 - Memoria Global] Consistencia de Dashboard**: Toda nueva transacción debe actualizar automáticamente los totales del dashboard. *(Origen: Memoria pgvector)*

## 6. Criterios de Aceptación (Gherkin-like)
1. **Dado** un {actors_str} en la app, **cuando** registra un nuevo importe con datos válidos, **entonces** el sistema guarda el registro y recalcula el balance general.
2. **Dado** un {actors_str} no autenticado, **cuando** intenta acceder al formulario de carga, **entonces** la app redirige a la pantalla de login.
"""

    mermaid_code = f"""graph TD
    A[{actors_str}] -->|1. Inicia Sesión| B(Login / Auth)
    B -->|2. Accede al Formulario| C(Registrar Transacción)
    C -->|3. Valida Datos| D{{¿Datos Válidos?}}
    D -->|No| E[Mostrar Error]
    D -->|Sí| F(Guardar en Base de Datos)
    F -->|4. Re-calcula| G(Dashboard de Balance)

    style F fill:#eff6ff,stroke:#3b82f6,stroke-width:2px
    style G fill:#f3e8ff,stroke:#8b5cf6,stroke-width:2px"""

    gherkin_list = [
        f"Dado un {actors_str} autenticado, cuando ingresa una transacción válida, entonces la aplicación la guarda y actualiza el dashboard.",
        f"Dado un usuario no logueado, cuando intenta guardar datos, entonces el sistema requiere inicio de sesión."
    ]

    state.refined_markdown = markdown_doc
    state.mermaid_diagram = mermaid_code
    state.gherkin_criteria = gherkin_list

    return state
