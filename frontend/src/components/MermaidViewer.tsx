import { useState, useEffect, useRef } from 'react';
import mermaid from 'mermaid';
import { Eye, Code, AlertTriangle, Copy, Check, Layers } from 'lucide-react';

interface MermaidViewerProps {
  chart: string;
  title?: string;
  defaultMode?: 'preview' | 'code';
}

mermaid.initialize({
  startOnLoad: false,
  theme: 'neutral',
  securityLevel: 'loose',
  fontFamily: 'Inter, system-ui, sans-serif',
  flowchart: {
    useMaxWidth: true,
    htmlLabels: true,
    curve: 'basis'
  }
});

export default function MermaidViewer({ chart, title, defaultMode = 'preview' }: MermaidViewerProps) {
  const [mode, setMode] = useState<'preview' | 'code'>(defaultMode);
  const [svgHtml, setSvgHtml] = useState<string>('');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Clean and sanitize mermaid chart string
  const getCleanChart = (raw: string): string => {
    if (!raw) return '';
    let cleaned = raw.trim();
    if (cleaned.startsWith('```mermaid')) {
      cleaned = cleaned.substring(10);
    } else if (cleaned.startsWith('```')) {
      cleaned = cleaned.substring(3);
    }
    if (cleaned.endsWith('```')) {
      cleaned = cleaned.substring(0, cleaned.length - 3);
    }
    cleaned = cleaned.trim();

    // Auto-fix unescaped double quotes inside bracketed or braced node labels [ ... " ... ]
    return cleaned.replace(/(\[|\{)([^"\n\]\}]*?"[^"\n\]\}]*?)(\]|\})/g, (_match, open, content, close) => {
      const cleanContent = content.replace(/"/g, "'");
      return `${open}"${cleanContent}"${close}`;
    });
  };

  const cleanChart = getCleanChart(chart);

  useEffect(() => {
    let isMounted = true;

    async function renderMermaid() {
      if (!cleanChart) {
        setSvgHtml('');
        setErrorMsg('No hay código de diagrama Mermaid disponible.');
        return;
      }

      setErrorMsg(null);
      try {
        const uniqueId = `mermaid-render-${Math.random().toString(36).substring(2, 9)}`;
        const { svg } = await mermaid.render(uniqueId, cleanChart);
        
        if (isMounted) {
          setSvgHtml(svg);
        }
      } catch (err: any) {
        console.error('Error renderizando diagrama Mermaid:', err);
        if (isMounted) {
          setErrorMsg(err?.message || 'Error al procesar la sintaxis del diagrama Mermaid.');
        }
      }
    }

    renderMermaid();

    return () => {
      isMounted = false;
    };
  }, [cleanChart]);

  const handleCopyCode = () => {
    navigator.clipboard.writeText(cleanChart);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden transition-all">
      {/* Header Bar */}
      <div className="flex items-center justify-between gap-2 bg-slate-50 px-4 py-2.5 border-b border-slate-200">
        <div className="flex items-center gap-2 min-w-0">
          <Layers className="h-4 w-4 text-purple-600 shrink-0" />
          <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700 truncate whitespace-nowrap">
            {title || 'Diagrama (Mermaid)'}
          </h4>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          {/* Mode Switcher Buttons */}
          <div className="inline-flex rounded-lg bg-slate-200/80 p-0.5 text-xs font-semibold text-slate-700">
            <button
              type="button"
              onClick={() => setMode('preview')}
              className={`flex items-center gap-1 px-2.5 py-1 rounded-md transition-all cursor-pointer whitespace-nowrap ${
                mode === 'preview'
                  ? 'bg-white text-blue-700 shadow-xs font-bold'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Eye className="h-3.5 w-3.5" />
              <span>Previsualización</span>
            </button>

            <button
              type="button"
              onClick={() => setMode('code')}
              className={`flex items-center gap-1 px-2.5 py-1 rounded-md transition-all cursor-pointer whitespace-nowrap ${
                mode === 'code'
                  ? 'bg-white text-blue-700 shadow-xs font-bold'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Code className="h-3.5 w-3.5" />
              <span>Código Fuente</span>
            </button>
          </div>

          {/* Copy Code Button */}
          <button
            type="button"
            onClick={handleCopyCode}
            className="p-1.5 rounded-md border border-slate-300 bg-white text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer shrink-0"
            title="Copiar código Mermaid"
          >
            {copied ? <Check className="h-3.5 w-3.5 text-emerald-600" /> : <Copy className="h-3.5 w-3.5" />}
          </button>
        </div>
      </div>

      {/* Content Body */}
      <div className="p-5">
        {mode === 'preview' ? (
          <div>
            {errorMsg ? (
              <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-amber-800 text-xs space-y-2">
                <div className="flex items-center gap-2 font-bold text-amber-900">
                  <AlertTriangle className="h-4 w-4 text-amber-600 shrink-0" />
                  <span>No se pudo generar la previsualización gráfica</span>
                </div>
                <p className="text-slate-600 font-mono text-[11px] bg-white p-2 rounded border border-amber-200 overflow-x-auto">
                  {errorMsg}
                </p>
                <div className="pt-1">
                  <button
                    type="button"
                    onClick={() => setMode('code')}
                    className="inline-flex items-center gap-1 font-semibold text-blue-600 hover:underline cursor-pointer"
                  >
                    <Code className="h-3.5 w-3.5" /> Ver código Mermaid original
                  </button>
                </div>
              </div>
            ) : svgHtml ? (
              <div
                ref={containerRef}
                className="overflow-x-auto flex justify-center p-4 bg-slate-50/50 rounded-lg border border-slate-100 min-h-[160px] items-center [&_svg]:max-w-full [&_svg]:h-auto"
                dangerouslySetInnerHTML={{ __html: svgHtml }}
              />
            ) : (
              <div className="flex items-center justify-center h-32 text-slate-400 text-xs">
                Renderizando diagrama de flujo...
              </div>
            )}
          </div>
        ) : (
          <pre className="rounded-xl bg-slate-900 p-5 text-purple-200 font-mono text-xs overflow-x-auto whitespace-pre-wrap leading-relaxed">
            {cleanChart}
          </pre>
        )}
      </div>
    </div>
  );
}
