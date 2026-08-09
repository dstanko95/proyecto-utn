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
