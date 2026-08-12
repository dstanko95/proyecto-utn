import { useState, useEffect } from 'react';
import { FileCheck, Download, BookOpen, ChevronDown, ChevronUp, Sparkles, FolderKanban, GitBranch, History } from 'lucide-react';
import { api } from '../api';
import { getGeneralDescription, formatDateTime } from '../utils/requirementUtils';
import MermaidViewer from '../components/MermaidViewer';

interface AprobadosViewProps {
  activeProject: any;
  onNavigateToEntrada: () => void;
  onRefineRequirement?: (reqCode: string, contentMarkdown: string) => void;
}

export default function AprobadosView({ activeProject, onNavigateToEntrada, onRefineRequirement }: AprobadosViewProps) {
  const [approvedRequirements, setApprovedRequirements] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [selectedVersionId, setSelectedVersionId] = useState<Record<string, string>>({});

  useEffect(() => {
    async function loadApproved() {
      if (!activeProject || !activeProject.id) {
        setIsLoading(false);
        return;
      }
      try {
        const list = await api.getRequirementsByProject(activeProject.id);
        const approvedOnly = (list || []).filter((r: any) => r.status === 'APPROVED');
        setApprovedRequirements(approvedOnly);
        if (approvedOnly.length > 0) {
          setExpandedId(approvedOnly[0].id);
        }
      } catch (e) {
        console.error('Error cargando requerimientos aprobados:', e);
      } finally {
        setIsLoading(false);
      }
    }
    loadApproved();
  }, [activeProject]);

  const toggleExpand = (id: string) => {
    setExpandedId(prev => (prev === id ? null : id));
  };

  const handleDownloadMarkdown = (req: any, versionObj?: any) => {
    const ver = versionObj || (req.versions && req.versions.length > 0 ? req.versions[0] : null);
    const content = ver ? ver.contentMarkdown : req.description;
    const verNum = ver ? ver.versionNumber : 'v1.0';
    const blob = new Blob([content], { type: 'text/markdown;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    const generalDesc = getGeneralDescription(req);
    const safeTitle = (generalDesc || 'Requerimiento').slice(0, 30).replace(/\s+/g, '_').replace(/[^a-zA-Z0-9_]/g, '');
    link.setAttribute('download', `${req.code}_${verNum}_${safeTitle}.md`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  if (isLoading) {
    return (
      <div className="flex h-96 w-full items-center justify-center bg-slate-50">
        <div className="flex flex-col items-center gap-3">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-emerald-600 border-t-transparent" />
          <p className="text-xs font-medium text-slate-500">Cargando Requerimientos Aprobados desde PostgreSQL...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      {/* Header Banner */}
      <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="rounded-full bg-emerald-100 px-3 py-1 text-xs font-semibold text-emerald-800">
                Catálogo de Entregables Validados
              </span>
              <span className="text-xs text-slate-400">• Proyecto:</span>
              <span className="text-xs font-semibold text-slate-700">{activeProject?.name || 'Sin Proyecto'}</span>
            </div>
            <h2 className="mt-2 text-2xl font-bold text-slate-800">Requerimientos Aprobados & Persistidos</h2>
            <p className="mt-1 text-sm text-slate-500">
              Historial completo de especificaciones funcionales integradas en la memoria persistente del sistema.
            </p>
          </div>

          <button
            onClick={onNavigateToEntrada}
            className="flex items-center gap-2 rounded-lg bg-blue-600 px-5 py-2.5 text-xs font-semibold text-white hover:bg-blue-700 shadow-sm transition-all cursor-pointer shrink-0"
          >
            <Sparkles className="h-4 w-4" />
            <span>Refinar Nuevo Requerimiento</span>
          </button>
        </div>
      </div>

      {/* List of Approved Requirements */}
      {approvedRequirements.length === 0 ? (
        <div className="rounded-xl border-2 border-dashed border-slate-200 bg-white p-12 text-center space-y-3">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-emerald-50 border border-emerald-100 text-emerald-600">
            <FileCheck className="h-6 w-6" />
          </div>
          <h3 className="text-base font-bold text-slate-800">Aún no hay requerimientos aprobados en este proyecto</h3>
          <p className="text-xs text-slate-500 max-w-md mx-auto">
            Procesa y aprueba tus requerimientos en la Fase 3 para que aparezcan catalogados aquí y puedas consultarlos o descargarlos en cualquier momento.
          </p>
          <button
            onClick={onNavigateToEntrada}
            className="inline-flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold rounded-lg shadow-xs transition-colors cursor-pointer"
          >
            Ir a Fase 1: Entrada
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          {approvedRequirements.map((req) => {
            const isExpanded = expandedId === req.id;
            const versionsList = req.versions && req.versions.length > 0 ? req.versions : [];
            const activeVersionId = selectedVersionId[req.id] || (versionsList[0]?.id || '');
            const activeVersion = versionsList.find((v: any) => v.id === activeVersionId) || versionsList[0] || null;

            const contentMarkdown = activeVersion ? activeVersion.contentMarkdown : req.description;
            const mermaidDiagram = activeVersion ? activeVersion.mermaidDiagram : null;
            const activeVersionNumber = activeVersion?.versionNumber || 'v1.0';
            const activeChangeLog = activeVersion?.changeLog || 'Carga inicial del requerimiento';

            const generalDesc = getGeneralDescription(req);
            const dateTime = formatDateTime(activeVersion?.createdAt || req.updatedAt || req.createdAt);

            return (
              <div key={req.id} className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden transition-all">
                {/* Header Row */}
                <div
                  onClick={() => toggleExpand(req.id)}
                  className="flex items-center justify-between p-5 bg-slate-50/70 hover:bg-slate-100/60 cursor-pointer transition-colors border-b border-slate-200"
                >
                  <div className="flex items-center gap-3">
                    <span className="rounded font-mono text-xs font-bold bg-blue-100 text-blue-800 px-2.5 py-1">
                      {req.code}
                    </span>
                    <div>
                      <h3 className="text-sm font-bold text-slate-800">{generalDesc}</h3>
                      <p className="text-[11px] text-slate-400 mt-0.5 flex items-center gap-2">
                        <span>Aprobado el {dateTime.full}</span>
                        <span>•</span>
                        <span className="font-semibold text-blue-700">Versión {activeVersionNumber}</span>
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    {/* Version Selector Dropdown */}
                    {versionsList.length > 0 && (
                      <div
                        className="flex items-center gap-1.5 bg-slate-100/80 px-2.5 py-1 rounded-lg border border-slate-200"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <History className="h-3.5 w-3.5 text-blue-600 shrink-0" />
                        <span className="text-[11px] font-semibold text-slate-600 whitespace-nowrap hidden sm:inline">Ver:</span>
                        <select
                          value={activeVersionId}
                          onChange={(e) => {
                            e.stopPropagation();
                            setSelectedVersionId(prev => ({ ...prev, [req.id]: e.target.value }));
                          }}
                          className="bg-white text-xs font-bold text-slate-800 border border-slate-300 rounded px-2 py-0.5 shadow-2xs focus:ring-2 focus:ring-blue-100 cursor-pointer"
                        >
                          {versionsList.map((ver: any, index: number) => (
                            <option key={ver.id} value={ver.id}>
                              {ver.versionNumber || `v1.${versionsList.length - 1 - index}`} {index === 0 ? '(Más Reciente)' : ''}
                            </option>
                          ))}
                        </select>
                      </div>
                    )}

                    <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2.5 py-0.5 text-[10px] font-bold text-emerald-800">
                      <FileCheck className="h-3 w-3" />
                      APROBADO
                    </span>
                    {onRefineRequirement && (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          onRefineRequirement(req.code, contentMarkdown);
                        }}
                        className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-blue-50 border border-blue-200 text-blue-700 hover:bg-blue-600 hover:text-white text-xs font-semibold transition-all shadow-2xs cursor-pointer whitespace-nowrap shrink-0"
                        title="Generar nueva versión de este requerimiento"
                      >
                        <GitBranch className="h-3.5 w-3.5 shrink-0" />
                        <span className="whitespace-nowrap">Crear Nueva Versión</span>
                      </button>
                    )}
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDownloadMarkdown(req, activeVersion);
                      }}
                      className="p-1.5 rounded-lg border border-slate-200 bg-white text-slate-600 hover:bg-slate-100 hover:text-blue-600 transition-colors"
                      title="Descargar .md"
                    >
                      <Download className="h-4 w-4" />
                    </button>
                    {isExpanded ? <ChevronUp className="h-4 w-4 text-slate-400" /> : <ChevronDown className="h-4 w-4 text-slate-400" />}
                  </div>
                </div>

                {/* Expanded Details */}
                {isExpanded && (
                  <div className="p-6 space-y-6 bg-white">
                    {/* Version ChangeLog Notice */}
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 p-3 rounded-lg bg-blue-50/60 border border-blue-100 text-xs">
                      <div className="flex items-center gap-2">
                        <span className="rounded bg-blue-600 px-2 py-0.5 text-[10px] font-bold text-white font-mono shrink-0">
                          {activeVersionNumber}
                        </span>
                        <span className="font-semibold text-slate-700">Bitácora de Cambios:</span>
                        <span className="text-slate-600">{activeChangeLog}</span>
                      </div>
                      <span className="text-slate-400 text-[11px] font-mono shrink-0">
                        Fecha: {dateTime.full}
                      </span>
                    </div>

                    {/* Markdown Document Content */}
                    <div>
                      <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-2 flex items-center gap-1.5">
                        <FolderKanban className="h-3.5 w-3.5 text-blue-600" />
                        Especificación Funcional Refinada ({activeVersionNumber})
                      </h4>
                      <pre className="rounded-xl bg-slate-900 p-5 text-slate-100 font-mono text-xs overflow-x-auto whitespace-pre-wrap leading-relaxed">
                        {contentMarkdown}
                      </pre>
                    </div>

                    {/* Mermaid Flowchart */}
                    {mermaidDiagram && (
                      <MermaidViewer chart={mermaidDiagram} title={`Diagrama de Flujo (${activeVersionNumber})`} defaultMode="preview" />
                    )}

                    {/* Business Rules Catalog */}
                    {req.businessRules && req.businessRules.length > 0 && (
                      <div>
                        <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-2 flex items-center gap-1.5">
                          <BookOpen className="h-3.5 w-3.5 text-emerald-600" />
                          Reglas de Negocio Persistidas en pgvector ({req.businessRules.length})
                        </h4>
                        <div className="space-y-2">
                          {req.businessRules.map((rule: any) => (
                            <div key={rule.id} className="flex items-center justify-between p-3 rounded-lg border border-slate-100 bg-slate-50 text-xs">
                              <div className="flex items-center gap-2">
                                <span className="font-bold text-slate-700 font-mono">{rule.ruleCode}</span>
                                <span className="text-slate-800">{rule.statement}</span>
                              </div>
                              <span className="rounded bg-blue-50 px-2 py-0.5 text-[10px] font-semibold text-blue-700 border border-blue-100">
                                {rule.ruleType}
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
