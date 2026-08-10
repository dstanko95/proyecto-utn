/**
 * Extrae la Descripción General de un requerimiento.
 * Prioriza la sección "## 1. Descripción General" del Markdown refinado,
 * luego la propiedad `title` si fue personalizada, o el texto bruto de la descripción.
 */
export function getGeneralDescription(req: any): string {
  if (!req) return 'Sin descripción';

  const latestVersion = req.versions && req.versions.length > 0 ? req.versions[0] : null;
  const content = latestVersion?.contentMarkdown || req.description || '';

  if (content && typeof content === 'string') {
    // Buscar la sección ## 1. Descripción General o ## Descripción General o ## 1. Descripción
    const sectionMatch = content.match(/##\s*(?:\d+\.\s*)?Descripción\s*(?:General)?\s*\n+([\s\S]*?)(?=\n+##|\n+$|$)/i);
    if (sectionMatch && sectionMatch[1]) {
      const textBlock = sectionMatch[1].trim();
      const cleanLines = textBlock
        .split('\n')
        .map((line: string) => line.trim())
        .filter((line: string) => 
          line.length > 0 && 
          !line.startsWith('#') && 
          !line.startsWith('**Estado') && 
          !line.startsWith('**Prioridad') &&
          !line.startsWith('**Versión')
        );

      if (cleanLines.length > 0) {
        const descText = cleanLines.join(' ');
        return descText.replace(/^[-*•]\s*/, '').trim();
      }
    }
  }

  // Si req.title existe y no es la etiqueta genérica estática
  if (req.title && req.title !== 'Requerimiento Funcional Refinado') {
    return req.title;
  }

  // Fallback a req.description si es texto plano corto
  if (req.description && typeof req.description === 'string' && !req.description.startsWith('#')) {
    return req.description;
  }

  return req.title || 'Requerimiento Funcional Refinado';
}

/**
 * Formatea una fecha y hora en formato legible en español argentino (ej: "08/08/2026 16:40 hs")
 */
export function formatDateTime(dateString: string | Date): { date: string; time: string; full: string } {
  if (!dateString) {
    return { date: '', time: '', full: '' };
  }
  const dateObj = new Date(dateString);
  if (isNaN(dateObj.getTime())) {
    return { date: '', time: '', full: '' };
  }

  const date = dateObj.toLocaleDateString();
  const time = dateObj.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  const full = `${date} a las ${time} hs`;

  return { date, time, full };
}

/**
 * Formatea dinámicamente el nombre del modelo Gemini utilizado desde el `response_source`
 * (ej: "GEMINI_CLOUD (gemini-2.5-flash - Key 1)" -> "Gemini 2.5 Flash (Google AI Cloud)")
 */
export function formatGeminiModel(source?: string): string {
  if (!source) return 'Gemini (Google AI Cloud)';

  const match = source.match(/\(([^)]+)\)/);
  let rawModel = '';
  if (match) {
    rawModel = match[1].split(' - ')[0].trim();
  } else if (!source.startsWith('OLLAMA') && !source.startsWith('DYNAMIC')) {
    rawModel = source.replace('GEMINI_CLOUD', '').replace(/[()]/g, '').trim();
  }

  if (!rawModel) {
    return 'Gemini (Google AI Cloud)';
  }

  const formatted = rawModel
    .replace(/^gemini-/i, 'Gemini ')
    .replace(/-/g, ' ')
    .replace(/\b\w/g, (c) => c.toUpperCase());

  return `${formatted} (Google AI Cloud)`;
}
