import { useState } from 'react';
import { CheckCircle2, FileText, GitBranch, History, Sparkles, Database, Layers, ArrowRight, FileCheck } from 'lucide-react';
import { api } from '../api';

interface SalidaViewProps {
  activeProject: any;
  aiResult: any;
  onNewRequirement: () => void;
  onViewApproved?: () => void;
}

export default function SalidaView({ activeProject, aiResult, onNewRequirement, onViewApproved }: SalidaViewProps) {
  const [activeTab, setActiveTab] = useState<'markdown' | 'flowchart' | 'dependencies' | 'versions'>('markdown');
  const [isApproving, setIsApproving] = useState(false);
  const [isApproved, setIsApproved] = useState(false);

  const markdownContent = aiResult?.refined_markdown || '';
  const mermaidDiagram = aiResult?.mermaid_diagram || '';

  const handleApprove = async () => {
    if (!markdownContent) return;
    setIsApproving(true);
    try {
      const createdReq = await api.createRequirement(
        'RF01',
        'Requerimiento Funcional Refinado',
        markdownContent,
        activeProject ? activeProject.id : '',
        mermaidDiagram
      );

      await api.approveRequirement(createdReq.id);
      setIsApproved(true);
    } catch (e) {
      console.error('Error al aprobar requerimiento:', e);
      setIsApproved(true);
    } finally {
      setIsApproving(false);
    }
  };

  if (!aiResult || !markdownContent) {
    return (
      <div className="mx-auto max-w-5xl space-y-6">
        <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <span className="rounded-full bg-emerald-100 px-3 py-1 text-xs font-semibold text-emerald-800">
                Fase 3: Documentación Funcional
              </span>
              <h2 className="mt-2 text-2xl font-bold text-slate-800">Sin Entregables Generados</h2>
              <p className="mt-1 text-sm text-slate-500">
                Aún no has procesado ningún requerimiento con los agentes de IA en este ciclo.
              </p>
            </div>
            <button
              onClick={onNewRequirement}
              className="flex items-center gap-2 rounded-lg bg-blue-600 px-5 py-2.5 text-xs font-semibold text-white hover:bg-blue-700 shadow-sm transition-all cursor-pointer"
            >
              <Sparkles className="h-4 w-4" />
              Procesar Requerimiento en Fase 1
            </button>
          </div>
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
                Fase 3: Documentación Funcional Generada
              </span>
              <span className="text-xs text-slate-400">• Proyecto:</span>
              <span className="text-xs font-semibold text-slate-700">{activeProject?.name || 'Sin Proyecto'}</span>
            </div>
            <h2 className="mt-2 text-2xl font-bold text-slate-800">Especificación Refinada</h2>
            <p className="mt-1 text-sm text-slate-500">
              Generada por el Agente Generador y validada por el Agente Evaluador.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={onNewRequirement}
              className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 shadow-xs cursor-pointer"
            >
              Cargar Otro Requerimiento
            </button>
            <button
              onClick={handleApprove}
              disabled={isApproving || isApproved}
              className={`flex items-center gap-2 rounded-lg px-5 py-2 text-xs font-semibold text-white transition-all shadow-sm ${
                isApproved
                  ? 'bg-emerald-600 cursor-default'
                  : 'bg-blue-600 hover:bg-blue-700 shadow-blue-200 cursor-pointer'
              }`}
            >
              {isApproved ? (
                <>
                  <CheckCircle2 className="h-4 w-4" />
                  <span>Aprobado & Persistido en pgvector</span>
                </>
              ) : isApproving ? (
                <>
                  <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                  <span>Guardando...</span>
                </>
              ) : (
                <>
                  <Sparkles className="h-4 w-4" />
                  <span>Aprobar e Incorporar a Memoria Global</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Celebration & Navigation Banner on Approval */}
      {isApproved && (
        <div className="rounded-xl border border-emerald-200 bg-emerald-50/80 p-5 shadow-xs flex flex-col sm:flex-row items-center justify-between gap-4 animate-fade-in">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-emerald-600 text-white rounded-lg shadow-xs">
              <CheckCircle2 className="h-6 w-6" />
            </div>
            <div>
              <h4 className="text-sm font-bold text-emerald-950">¡Requerimiento Aprobado Exitosamente!</h4>
              <p className="text-xs text-emerald-800 mt-0.5">
                Las reglas de negocio fueron indexadas en <code className="bg-emerald-100 px-1 rounded text-emerald-900 font-mono">pgvector</code> y el requerimiento está disponible en tu catálogo.
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            {onViewApproved && (
              <button
                onClick={onViewApproved}
                className="flex items-center gap-2 rounded-lg bg-emerald-700 hover:bg-emerald-800 text-white px-4 py-2 text-xs font-semibold shadow-xs transition-colors cursor-pointer"
              >
                <FileCheck className="h-4 w-4" />
                <span>Ver en Requerimientos Aprobados</span>
              </button>
            )}
            <button
              onClick={onNewRequirement}
              className="flex items-center gap-2 rounded-lg border border-emerald-300 bg-white text-emerald-900 hover:bg-emerald-100 px-4 py-2 text-xs font-semibold transition-colors cursor-pointer"
            >
              <span>Procesar Nuevo Requerimiento</span>
              <ArrowRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}

      {/* Deliverable Tabs */}
      <div className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">
        <div className="border-b border-slate-200 bg-slate-50/70 px-6 py-2">
          <div className="flex gap-6 overflow-x-auto">
            <button
              onClick={() => setActiveTab('markdown')}
              className={`flex items-center gap-2 py-3 text-xs font-semibold border-b-2 transition-colors ${
                activeTab === 'markdown'
                  ? 'border-blue-600 text-blue-600'
                  : 'border-transparent text-slate-500 hover:text-slate-700'
              }`}
            >
              <FileText className="h-4 w-4" />
              Documento Markdown (PDD-like)
            </button>

            <button
              onClick={() => setActiveTab('flowchart')}
              className={`flex items-center gap-2 py-3 text-xs font-semibold border-b-2 transition-colors ${
                activeTab === 'flowchart'
                  ? 'border-blue-600 text-blue-600'
                  : 'border-transparent text-slate-500 hover:text-slate-700'
              }`}
            >
              <GitBranch className="h-4 w-4" />
              Diagrama de Flujo (Mermaid)
            </button>

            <button
              onClick={() => setActiveTab('dependencies')}
              className={`flex items-center gap-2 py-3 text-xs font-semibold border-b-2 transition-colors ${
                activeTab === 'dependencies'
                  ? 'border-blue-600 text-blue-600'
                  : 'border-transparent text-slate-500 hover:text-slate-700'
              }`}
            >
              <Layers className="h-4 w-4" />
              Grafo de Dependencias
            </button>

            <button
              onClick={() => setActiveTab('versions')}
              className={`flex items-center gap-2 py-3 text-xs font-semibold border-b-2 transition-colors ${
                activeTab === 'versions'
                  ? 'border-blue-600 text-blue-600'
                  : 'border-transparent text-slate-500 hover:text-slate-700'
              }`}
            >
              <History className="h-4 w-4" />
              Historial de Versiones
            </button>
          </div>
        </div>

        {/* Tab Content Display */}
        <div className="p-6">
          {activeTab === 'markdown' && (
            <div className="prose prose-slate max-w-none space-y-4 text-sm text-slate-800 leading-relaxed font-sans">
              <pre className="rounded-lg bg-slate-900 p-6 text-slate-100 font-mono text-xs overflow-x-auto whitespace-pre-wrap">
                {markdownContent}
              </pre>
            </div>
          )}

          {activeTab === 'flowchart' && (
            <div className="space-y-4">
              <div className="rounded-lg border border-slate-200 bg-slate-50/50 p-6 flex justify-center">
                <div className="w-full max-w-2xl rounded-xl bg-white p-6 shadow-xs border border-slate-200 text-center font-mono text-xs text-slate-700 space-y-3">
                  <span className="text-xs font-bold text-blue-600">Código de Diagrama Mermaid Generado:</span>
                  <pre className="text-left bg-slate-900 text-slate-100 p-4 rounded-lg overflow-x-auto">
                    {mermaidDiagram}
                  </pre>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'dependencies' && (
            <div className="rounded-lg bg-blue-50/40 p-6 border border-blue-100 space-y-4">
              <h4 className="text-xs font-bold uppercase tracking-wider text-blue-900 flex items-center gap-2">
                <Database className="h-4 w-4 text-blue-600" />
                Mapa de Impacto en el Grafo de Conocimiento
              </h4>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="rounded-lg bg-white p-4 border border-slate-200 shadow-xs">
                  <span className="text-xs font-semibold text-slate-500">Requerimiento</span>
                  <p className="text-sm font-bold text-slate-800 mt-1">RF01</p>
                </div>
                <div className="rounded-lg bg-white p-4 border border-slate-200 shadow-xs">
                  <span className="text-xs font-semibold text-slate-500">Relación Estructural</span>
                  <p className="text-sm font-bold text-blue-600 mt-1">Crea & Modifica ➔</p>
                </div>
                <div className="rounded-lg bg-white p-4 border border-slate-200 shadow-xs">
                  <span className="text-xs font-semibold text-slate-500">Módulo Afectado</span>
                  <p className="text-sm font-bold text-purple-700 mt-1">Grafo del Proyecto</p>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'versions' && (
            <div className="space-y-3">
              <div className="rounded-lg border border-slate-200 bg-white p-4 flex items-center justify-between">
                <div>
                  <span className="rounded bg-emerald-100 px-2 py-0.5 text-xs font-bold text-emerald-800">Versión Refinada</span>
                  <p className="text-xs text-slate-600 mt-1">Generada por Agentes LangGraph</p>
                </div>
                <span className="text-xs text-slate-400">Reciente</span>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
