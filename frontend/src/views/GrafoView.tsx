import { useState, useEffect } from 'react';
import { GitFork, Database, Layers, ArrowRight, FileText, CheckCircle2, Sparkles } from 'lucide-react';
import { api } from '../api';
import MermaidViewer from '../components/MermaidViewer';
import { getGeneralDescription } from '../utils/requirementUtils';

interface GrafoViewProps {
  activeProject: any;
  onNavigateToEntrada: () => void;
}

export default function GrafoView({ activeProject, onNavigateToEntrada }: GrafoViewProps) {
  const [requirements, setRequirements] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [selectedReqCode, setSelectedReqCode] = useState<string | null>(null);

  useEffect(() => {
    async function loadData() {
      if (!activeProject || !activeProject.id) {
        setIsLoading(false);
        return;
      }
      try {
        setIsLoading(true);
        const list = await api.getRequirementsByProject(activeProject.id);
        setRequirements(list || []);
      } catch (e) {
        console.error('Error cargando grafo de dependencias:', e);
      } finally {
        setIsLoading(false);
      }
    }
    loadData();
  }, [activeProject]);

  // Generate complete Mermaid diagram string representing the full project requirement dependency graph
  const generateMermaidGraph = () => {
    if (!requirements || requirements.length === 0) {
      return `graph TD\n    A[Sin Requerimientos] --> B[Carga Requerimientos en Fase 1]`;
    }

    const lines: string[] = [
      'graph TD',
      '    classDef reqNode fill:#f0f9ff,stroke:#2563eb,stroke-width:2px,color:#1e3a8a,font-weight:bold;',
      '    classDef selectedNode fill:#fef3c7,stroke:#d97706,stroke-width:3px,color:#78350f,font-weight:bold;',
    ];

    const reqMap = new Map<string, any>();
    requirements.forEach((r) => reqMap.set(r.id, r));

    // Add Nodes
    requirements.forEach((r) => {
      const generalDesc = getGeneralDescription(r);
      const shortTitle = (generalDesc || r.title || 'Requerimiento').slice(0, 25).replace(/["'\[\]\(\)]/g, '');
      const label = `${r.code}: ${shortTitle}`;
      lines.push(`    ${r.code}["${label}"]`);
    });

    const addedEdges = new Set<string>();

    // Add Edges from sourceDependencies
    requirements.forEach((r) => {
      if (r.sourceDependencies && r.sourceDependencies.length > 0) {
        r.sourceDependencies.forEach((dep: any) => {
          const targetReq = dep.targetReq || reqMap.get(dep.targetReqId);
          if (targetReq) {
            const edgeKey = `${r.code}->${targetReq.code}`;
            if (!addedEdges.has(edgeKey)) {
              addedEdges.add(edgeKey);
              lines.push(`    ${r.code} -->|${dep.dependencyType || 'REQUIRES'}| ${targetReq.code}`);
            }
          }
        });
      }
    });

    // If no dependencies were recorded yet, add logical sequential links as preview
    if (addedEdges.size === 0 && requirements.length > 1) {
      for (let i = 1; i < requirements.length; i++) {
        const prev = requirements[i - 1];
        const curr = requirements[i];
        lines.push(`    ${curr.code} -.->|SECUENCIAL| ${prev.code}`);
      }
    }

    // Apply highlighting class if selected
    if (selectedReqCode) {
      lines.push(`    class ${selectedReqCode} selectedNode;`);
    } else {
      const allCodes = requirements.map((r) => r.code).join(',');
      if (allCodes) {
        lines.push(`    class ${allCodes} reqNode;`);
      }
    }

    return lines.join('\n');
  };

  // Collect flat list of all dependencies for the summary table
  const dependencyLinks: { sourceCode: string; sourceTitle: string; targetCode: string; targetTitle: string; type: string }[] = [];
  
  const reqIdMap = new Map<string, any>();
  requirements.forEach((r) => reqIdMap.set(r.id, r));

  requirements.forEach((r) => {
    if (r.sourceDependencies && r.sourceDependencies.length > 0) {
      r.sourceDependencies.forEach((dep: any) => {
        const targetReq = dep.targetReq || reqIdMap.get(dep.targetReqId);
        if (targetReq) {
          dependencyLinks.push({
            sourceCode: r.code,
            sourceTitle: getGeneralDescription(r),
            targetCode: targetReq.code,
            targetTitle: getGeneralDescription(targetReq),
            type: dep.dependencyType || 'REQUIRES',
          });
        }
      });
    }
  });

  if (isLoading) {
    return (
      <div className="flex h-96 w-full items-center justify-center bg-slate-50">
        <div className="flex flex-col items-center gap-3">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-blue-600 border-t-transparent" />
          <p className="text-xs font-medium text-slate-500">Cargando Grafo de Dependencias desde PostgreSQL...</p>
        </div>
      </div>
    );
  }

  const mermaidGraphCode = generateMermaidGraph();

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      {/* Header Banner */}
      <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="rounded-full bg-purple-100 px-3 py-1 text-xs font-semibold text-purple-800 flex items-center gap-1.5">
                <GitFork className="h-3.5 w-3.5" />
                Matriz de Trazabilidad & Impacto
              </span>
              <span className="text-xs text-slate-400">• Proyecto:</span>
              <span className="text-xs font-semibold text-slate-700">{activeProject?.name || 'Sin Proyecto'}</span>
            </div>
            <h2 className="mt-2 text-2xl font-bold text-slate-800">Grafo de Dependencias del Proyecto</h2>
            <p className="mt-1 text-sm text-slate-500">
              Visualización interactiva de relaciones estructurales e impactos cruzados entre funcionalidades.
            </p>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={onNavigateToEntrada}
              className="flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-xs font-semibold text-white hover:bg-blue-700 shadow-sm transition-all cursor-pointer"
            >
              <Sparkles className="h-4 w-4" />
              <span>Nuevo Requerimiento</span>
            </button>
          </div>
        </div>
      </div>

      {/* Overview Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-2xs flex items-center justify-between">
          <div>
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Total Requerimientos</span>
            <p className="text-2xl font-bold text-slate-800 mt-1">{requirements.length}</p>
          </div>
          <div className="p-3 bg-blue-50 text-blue-600 rounded-lg">
            <FileText className="h-6 w-6" />
          </div>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-2xs flex items-center justify-between">
          <div>
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Relaciones de Dependencia</span>
            <p className="text-2xl font-bold text-purple-700 mt-1">{dependencyLinks.length}</p>
          </div>
          <div className="p-3 bg-purple-50 text-purple-600 rounded-lg">
            <GitFork className="h-6 w-6" />
          </div>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-2xs flex items-center justify-between">
          <div>
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Estado del Grafo</span>
            <p className="text-sm font-bold text-emerald-600 mt-1 flex items-center gap-1.5">
              <CheckCircle2 className="h-4 w-4" />
              Persistido en PostgreSQL
            </p>
          </div>
          <div className="p-3 bg-emerald-50 text-emerald-600 rounded-lg">
            <Database className="h-6 w-6" />
          </div>
        </div>
      </div>

      {/* Main Content Grid: Interactive Diagram + Dependency Table */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Visual Mermaid Graph (2 cols) */}
        <div className="lg:col-span-2 space-y-4">
          <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2">
                <Layers className="h-4 w-4 text-purple-600" />
                Diagrama Interactivo del Grafo
              </h3>
              {selectedReqCode && (
                <button
                  onClick={() => setSelectedReqCode(null)}
                  className="text-xs font-semibold text-blue-600 hover:underline cursor-pointer"
                >
                  Limpiar Selección ({selectedReqCode})
                </button>
              )}
            </div>
            
            <MermaidViewer
              chart={mermaidGraphCode}
              title={`Mapa de Trazabilidad: ${activeProject?.name || 'Proyecto'}`}
              defaultMode="preview"
            />
          </div>
        </div>

        {/* Right Column: List of Structural Dependencies (1 col) */}
        <div className="space-y-4">
          <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm space-y-4">
            <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2 border-b border-slate-100 pb-3">
              <GitFork className="h-4 w-4 text-blue-600" />
              Matriz de Relaciones Específicas
            </h3>

            {dependencyLinks.length === 0 ? (
              <div className="p-6 text-center text-slate-400 space-y-2">
                <p className="text-xs font-semibold">No se han registrado relaciones explícitas aún.</p>
                <p className="text-[11px] text-slate-400">
                  Al refinar y aprobar requerimientos en Fase 3, el agente identificará e insertará automáticamente las dependencias estructurales en PostgreSQL.
                </p>
              </div>
            ) : (
              <div className="space-y-3 max-h-[500px] overflow-y-auto pr-1">
                {dependencyLinks.map((link, idx) => (
                  <div
                    key={idx}
                    onClick={() => setSelectedReqCode(link.sourceCode)}
                    className={`p-3.5 rounded-lg border transition-all cursor-pointer ${
                      selectedReqCode === link.sourceCode
                        ? 'border-blue-500 bg-blue-50/60 shadow-xs'
                        : 'border-slate-200 bg-slate-50/60 hover:bg-slate-100/80'
                    }`}
                  >
                    <div className="flex items-center justify-between text-xs font-mono font-bold mb-1">
                      <span className="text-blue-700 bg-blue-100 px-2 py-0.5 rounded">{link.sourceCode}</span>
                      <span className="text-slate-400 flex items-center gap-1 text-[10px]">
                        <ArrowRight className="h-3 w-3 text-slate-500" />
                        {link.type}
                      </span>
                      <span className="text-purple-700 bg-purple-100 px-2 py-0.5 rounded">{link.targetCode}</span>
                    </div>

                    <div className="text-[11px] text-slate-600 space-y-1 mt-2">
                      <p className="font-semibold text-slate-800 truncate">{link.sourceTitle}</p>
                      <p className="text-slate-400 truncate">Depende de: {link.targetTitle}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
