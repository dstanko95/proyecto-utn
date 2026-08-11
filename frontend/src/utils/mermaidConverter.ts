/**
 * Utilidad de conversión de código fuente Mermaid a Especificación Funcional Markdown.
 * Soporta diagramas de flujo (flowchart/graph), secuencia (sequenceDiagram) y estados (stateDiagram).
 */

export function convertMermaidToMarkdown(mermaidCode: string, codePrefix = 'RF01'): string {
  if (!mermaidCode || !mermaidCode.trim()) {
    return '';
  }

  const clean = mermaidCode.trim();
  const lines = clean.split('\n').map((l) => l.trim()).filter((l) => l && !l.startsWith('%%'));

  const firstLine = lines[0] || '';
  let diagramType = 'Flujo de Trabajo / Proceso';
  if (firstLine.includes('graph') || firstLine.includes('flowchart')) {
    diagramType = 'Diagrama de Flujo (Flowchart)';
  } else if (firstLine.includes('sequenceDiagram')) {
    diagramType = 'Diagrama de Secuencia (Interacción entre Componentes)';
  } else if (firstLine.includes('stateDiagram')) {
    diagramType = 'Diagrama de Estados (Ciclo de Vida)';
  } else if (firstLine.includes('classDiagram') || firstLine.includes('erDiagram')) {
    diagramType = 'Diagrama de Entidades / Clases';
  }

  const actorsSet = new Set<string>();
  const steps: string[] = [];
  const rules: string[] = [];
  const decisions: string[] = [];

  for (const line of lines) {
    if (
      line.startsWith('graph') ||
      line.startsWith('flowchart') ||
      line.startsWith('sequenceDiagram') ||
      line.startsWith('stateDiagram') ||
      line.startsWith('classDiagram') ||
      line.startsWith('autonumber')
    ) {
      continue;
    }

    // Sequence actor declaration: actor U as Usuario
    const actorDeclMatch = line.match(/(?:actor|participant)\s+([A-Za-z0-9_-]+)\s+as\s+(.+)$/i);
    if (actorDeclMatch) {
      actorsSet.add(actorDeclMatch[2].trim());
      continue;
    }

    // Sequence interaction: U->>FE: Hacer pedido
    const seqMatch = line.match(/^([A-Za-z0-9_-]+)\s*(?:->>|-->>|->|-->)\s*([A-Za-z0-9_-]+)\s*:\s*(.+)$/);
    if (seqMatch) {
      const from = seqMatch[1].trim();
      const to = seqMatch[2].trim();
      const action = seqMatch[3].trim();
      actorsSet.add(from);
      actorsSet.add(to);
      steps.push(`El componente/actor **${from}** envía la petición *" ${action} "* hacia **${to}**.`);
      continue;
    }

    // State transition: StateA --> StateB: Event
    const stateMatch = line.match(/^([A-Za-z0-9_\-\[\*\]]+)\s*-->\s*([A-Za-z0-9_\-\[\*\]]+)(?:\s*:\s*(.+))?$/);
    if (stateMatch && firstLine.includes('stateDiagram')) {
      const fromState = stateMatch[1].replace(/\[\*\]/g, 'Estado Inicial/Final');
      const toState = stateMatch[2].replace(/\[\*\]/g, 'Estado Final');
      const eventLabel = stateMatch[3] ? stateMatch[3].trim() : 'Transición directa';
      steps.push(`Transición de estado: desde **${fromState}** hasta **${toState}** (Evento detonante: *${eventLabel}*).`);
      rules.push(`Se debe validar el cambio del estado **${fromState}** a **${toState}** ante el evento *${eventLabel}*.`);
      continue;
    }

    // Flowchart edge parsing: A[Usuario] -->|Ingresa clave| B{¿Es válido?}
    const flowMatch = line.match(/([A-Za-z0-9_-]+)(?:\[(.*?)\]|\((.*?)\)|\{(.*?)\})?\s*-->\s*(?:\|(.*?)\|)?\s*([A-Za-z0-9_-]+)(?:\[(.*?)\]|\((.*?)\)|\{(.*?)\})?/);
    if (flowMatch) {
      const sourceId = flowMatch[1];
      const sourceLabel = flowMatch[2] || flowMatch[3] || flowMatch[4] || sourceId;
      const relationLabel = flowMatch[5] ? flowMatch[5].trim() : 'Transiciona a';
      const targetId = flowMatch[6];
      const targetLabel = flowMatch[7] || flowMatch[8] || flowMatch[9] || targetId;

      if (sourceLabel.length < 25 && !sourceLabel.includes('.')) {
        actorsSet.add(sourceLabel);
      }
      if (targetLabel.length < 25 && !targetLabel.includes('.')) {
        actorsSet.add(targetLabel);
      }

      if (flowMatch[4] || flowMatch[9]) {
        const decisionText = flowMatch[4] || flowMatch[9];
        decisions.push(`Punto de Decisión: **${decisionText}** (Condición: *${relationLabel}* ➔ Destino: *${targetLabel}*).`);
        rules.push(`El sistema debe evaluar *" ${decisionText} "* y en la rama *" ${relationLabel} "* proceder con *${targetLabel}*.`);
      } else {
        steps.push(`**${sourceLabel}** ejecuta la acción *" ${relationLabel} "* sobre **${targetLabel}**.`);
      }
    }
  }

  let markdown = `# ${codePrefix} - Requerimiento Funcional desde Diagrama Mermaid\n\n`;
  markdown += `## Objetivo\n\nDefinir y validar el comportamiento del sistema según el **${diagramType}** estructurado en código Mermaid.\n\n`;

  markdown += `## Actores y Componentes Involucrados\n\n`;
  if (actorsSet.size > 0) {
    actorsSet.forEach((actor) => {
      markdown += `* **${actor}**\n`;
    });
  } else {
    markdown += `* **Usuario**\n* **Sistema**\n`;
  }

  markdown += `\n## Flujo Funcional Detallado\n\n`;
  if (steps.length > 0) {
    steps.forEach((step, idx) => {
      markdown += `${idx + 1}. ${step}\n`;
    });
  } else {
    markdown += `1. El usuario ejecuta la secuencia de pasos descrita en el diagrama visual Mermaid.\n2. El sistema valida los datos y transiciona entre los nodos definidos.\n`;
  }

  if (decisions.length > 0) {
    markdown += `\n## Bifurcaciones y Decisión de Flujos\n\n`;
    decisions.forEach((dec) => {
      markdown += `* ${dec}\n`;
    });
  }

  markdown += `\n## Restricciones y Reglas de Negocio\n\n`;
  if (rules.length > 0) {
    rules.forEach((rule) => {
      markdown += `* ${rule}\n`;
    });
  } else {
    markdown += `* Las transiciones de flujo indicadas en el diagrama Mermaid son obligatorias y secuenciales.\n* No se permite saltar pasos ni omitir las validaciones de las bifurcaciones.\n`;
  }

  markdown += `\n## Estructura Mermaid Original\n\n\`\`\`mermaid\n${clean}\n\`\`\`\n`;

  return markdown;
}
