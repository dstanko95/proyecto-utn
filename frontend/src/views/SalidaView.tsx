import { useState, useEffect } from 'react';
import { CheckCircle2, FileText, GitBranch, History, Sparkles, Database, Layers, ArrowRight, FileCheck, AlertTriangle, RotateCcw, HelpCircle } from 'lucide-react';
import { api } from '../api';
import { getGeneralDescription, formatGeminiModel } from '../utils/requirementUtils';
import MermaidViewer from '../components/MermaidViewer';

interface SalidaViewProps {
  activeProject: any;
  aiResult: any;
  onNewRequirement: () => void;
  onViewApproved?: () => void;
  onRetryGeneration?: (updatedResult: any) => void;
  onApproveSuccess?: () => void;
  onNavigateToProcesamiento?: () => void;
}

export default function SalidaView({ activeProject, aiResult, onNewRequirement, onViewApproved, onRetryGeneration, onApproveSuccess, onNavigateToProcesamiento }: SalidaViewProps) {
  const [activeTab, setActiveTab] = useState<'markdown' | 'flowchart' | 'dependencies' | 'versions'>('markdown');
  const [isApproving, setIsApproving] = useState(false);
  const [isApproved, setIsApproved] = useState(false);

  // Retry & AI state management
  const [currentAiResult, setCurrentAiResult] = useState(aiResult);
  const [isRetrying, setIsRetrying] = useState(false);
  const [retryError, setRetryError] = useState<string | null>(null);

  useEffect(() => {
    setCurrentAiResult(aiResult);
  }, [aiResult]);

  const activeResult = currentAiResult || aiResult;
  const markdownContent = activeResult?.refined_markdown || '';
  const mermaidDiagram = activeResult?.mermaid_diagram || '';
  const isFallbackMode = activeResult?.is_ai_generated === false;

  const extractedCode = markdownContent.match(/#\s*(RF\d+)/i)?.[1];
  const reqCode = activeResult?.requirement_code || extractedCode || 'RF01';

  const handleRetry = async () => {
    const reqText = activeResult?.requirement_text || '';
    if (!reqText && !activeProject) return;

    setIsRetrying(true);
    setRetryError(null);

    try {
      const updated = await api.analyzeRequirement(
        reqText,
        activeProject ? activeProject.id : '',
        activeResult?.user_answers || []
      );

      setCurrentAiResult(updated);
      if (onRetryGeneration) {
        onRetryGeneration(updated);
      }
    } catch (err: any) {
      console.error('Error al reintentar la generación de entregables:', err);
      setRetryError('No se pudo volver a ejecutar la petición. Asegúrate de que el microservicio de IA esté disponible.');
    } finally {
      setIsRetrying(false);
    }
  };

  const handleApprove = async () => {
    if (!markdownContent) return;
    setIsApproving(true);
    try {
      const generalDesc = getGeneralDescription({
        versions: [{ contentMarkdown: markdownContent }],
        description: activeResult?.requirement_text || markdownContent
      });

      const extractedRules = activeResult?.extracted_rules || activeResult?.diagnosis?.extracted_rules || [];

      const createdReq = await api.createRequirement(
        reqCode,
        generalDesc,
        markdownContent,
        activeProject ? activeProject.id : '',
        mermaidDiagram,
        activeResult?.diagnosis?.detected_dependencies || [],
        extractedRules
      );

      await api.approveRequirement(createdReq.id);
      setIsApproved(true);
      if (onApproveSuccess) {
        onApproveSuccess();
      }
    } catch (e) {
      console.error('Error al aprobar requerimiento:', e);
      setIsApproved(true);
      if (onApproveSuccess) {
        onApproveSuccess();
      }
    } finally {
      setIsApproving(false);
    }
  };

  if (!activeResult || !markdownContent) {
    const needsClarification = activeResult?.status === 'NEEDS_CLARIFICATION' || (activeResult?.clarification_questions && activeResult.clarification_questions.length > 0);

    return (
      <div className="mx-auto max-w-5xl space-y-6">
        <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <span className={`rounded-full px-3 py-1 text-xs font-semibold ${needsClarification ? 'bg-amber-100 text-amber-900' : 'bg-emerald-100 text-emerald-800'}`}>
                {needsClarification ? 'Fase 2: Aclaraciones Pendientes' : 'Fase 3: Documentación Funcional'}
              </span>
              <h2 className="mt-2 text-2xl font-bold text-slate-800">
                {needsClarification ? 'Aclaraciones Requeridas por la IA' : 'Sin Entregables Generados'}
              </h2>
              <p className="mt-1 text-sm text-slate-500 leading-relaxed">
                {needsClarification
                  ? 'El Agente Planificador identificó vacíos funcionales o ambigüedades en tu requerimiento. Debes responder las preguntas de aclaración en la Fase 2 para que los agentes puedan generar la especificación.'
                  : 'Aún no has procesado ningún requerimiento con los agentes de IA en este ciclo o la generación falló.'}
              </p>
            </div>
            <div className="flex items-center gap-3 shrink-0">
              {needsClarification && onNavigateToProcesamiento && (
                <button
                  onClick={onNavigateToProcesamiento}
                  className="flex items-center gap-2 rounded-lg bg-blue-600 px-5 py-2.5 text-xs font-semibold text-white hover:bg-blue-700 shadow-sm transition-all cursor-pointer"
                >
                  <HelpCircle className="h-4 w-4" />
                  <span>Ir a Fase 2: Responder Preguntas</span>
                </button>
              )}
              {activeResult?.requirement_text && (
                <button
                  onClick={handleRetry}
                  disabled={isRetrying}
                  className="flex items-center gap-2 rounded-lg border border-slate-300 bg-white px-4 py-2.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 shadow-xs transition-all cursor-pointer"
                >
                  <RotateCcw className={`h-4 w-4 text-blue-600 ${isRetrying ? 'animate-spin' : ''}`} />
                  <span>{isRetrying ? 'Reintentando...' : 'Reintentar Generación'}</span>
                </button>
              )}
              <button
                onClick={onNewRequirement}
                className="flex items-center gap-2 rounded-lg border border-slate-300 bg-white px-4 py-2.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 shadow-xs transition-all cursor-pointer"
              >
                <Sparkles className="h-4 w-4 text-blue-600" />
                <span>Cargar Requerimiento en Fase 1</span>
              </button>
            </div>
          </div>
        </div>

        {retryError && (
          <div className="rounded-lg bg-red-50 p-4 border border-red-200 text-sm text-red-700 font-medium">
            {retryError}
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      {retryError && (
        <div className="rounded-xl bg-red-50 p-4 border border-red-200 text-xs font-medium text-red-700 flex items-center justify-between shadow-xs">
          <span>{retryError}</span>
          <button
            onClick={handleRetry}
            disabled={isRetrying}
            className="flex items-center gap-1.5 font-bold text-red-800 hover:text-red-950 underline cursor-pointer"
          >
            <RotateCcw className={`w-3.5 h-3.5 ${isRetrying ? 'animate-spin' : ''}`} />
            <span>Reintentar ahora</span>
          </button>
        </div>
      )}

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
              onClick={handleRetry}
              disabled={isRetrying || isApproving}
              className="flex items-center gap-2 rounded-lg border border-slate-300 bg-white px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50 shadow-xs cursor-pointer transition-all"
              title="Reejecutar la petición a los agentes de IA para regenerar la especificación y el diagrama"
            >
              <RotateCcw className={`h-4 w-4 text-slate-600 ${isRetrying ? 'animate-spin text-blue-600' : ''}`} />
              <span>{isRetrying ? 'Reintentando...' : 'Reintentar Generación'}</span>
            </button>
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

      {/* Response Engine Source Badge */}
      {activeResult?.response_source?.startsWith('OLLAMA_LOCAL') ? (
        <div className="rounded-xl bg-indigo-50 border border-indigo-200 p-4 flex items-start gap-3 text-indigo-900 shadow-xs">
          <Layers className="w-5 h-5 text-indigo-600 shrink-0 mt-0.5" />
          <div className="grow">
            <div className="flex items-center gap-2">
              <span className="h-2 w-2 rounded-full bg-indigo-500 animate-pulse" />
              <h4 className="text-xs font-bold text-indigo-950 uppercase tracking-wider">
                Documentación Generada por LLM Local ({activeResult.response_source.replace('OLLAMA_LOCAL', '').replace(/[()]/g, '').trim() || 'Ollama'})
              </h4>
            </div>
            <p className="text-xs text-indigo-800 mt-1 leading-relaxed">
              La especificación técnica y el diagrama Mermaid fueron generados localmente mediante tu servidor de Ollama.
            </p>
          </div>
        </div>
      ) : isFallbackMode ? (
        <div className="rounded-xl bg-amber-50 border border-amber-300 p-4 flex items-start justify-between gap-3 text-amber-900 shadow-xs">
          <div className="flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
            <div>
              <h4 className="text-xs font-bold text-amber-950 uppercase tracking-wider">
                Documentación Generada por Motor Dinámico de Respaldo Local (Sin LLM)
              </h4>
              <p className="text-xs text-amber-800 mt-1 leading-relaxed">
                Atención: La especificación técnica y el diagrama no fueron generados mediante la API de Inteligencia Artificial (Gemini / Ollama no disponibles). El documento fue estructurado utilizando el motor dinámico de respaldo.
              </p>
            </div>
          </div>
          <button
            onClick={handleRetry}
            disabled={isRetrying}
            className="shrink-0 inline-flex items-center gap-1.5 rounded-lg bg-amber-600 hover:bg-amber-700 text-white px-3.5 py-1.5 text-xs font-semibold shadow-xs transition-colors cursor-pointer disabled:opacity-50"
          >
            <RotateCcw className={`w-3.5 h-3.5 ${isRetrying ? 'animate-spin' : ''}`} />
            <span>{isRetrying ? 'Reintentando con IA...' : 'Reintentar Generación con IA'}</span>
          </button>
        </div>
      ) : (
        <div className="rounded-xl bg-emerald-50/90 border border-emerald-200 p-4 flex items-start gap-3 text-emerald-950 shadow-xs">
          <Sparkles className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
          <div>
            <div className="flex items-center gap-2">
              <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
              <h4 className="text-xs font-bold text-emerald-950 uppercase tracking-wider">
                Documentación Generada por {formatGeminiModel(activeResult?.response_source)}
              </h4>
            </div>
            <p className="text-xs text-emerald-800 mt-1 leading-relaxed">
              La especificación técnica refinada y el diagrama Mermaid fueron procesados en vivo mediante Gemini API.
            </p>
          </div>
        </div>
      )}

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
              Documento Markdown
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
            <MermaidViewer chart={mermaidDiagram} title="Diagrama de Flujo (Mermaid)" defaultMode="preview" />
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
                  <p className="text-sm font-bold text-slate-800 mt-1">{reqCode}</p>
                </div>
                <div className="rounded-lg bg-white p-4 border border-slate-200 shadow-xs">
                  <span className="text-xs font-semibold text-slate-500">Relación Estructural</span>
                  <p className="text-sm font-bold text-blue-600 mt-1">Crea & Modifica ➔</p>
                </div>
                <div className="rounded-lg bg-white p-4 border border-slate-200 shadow-xs">
                  <span className="text-xs font-semibold text-slate-500">Módulos Afectados</span>
                  <p className="text-sm font-bold text-purple-700 mt-1">
                    {activeResult?.diagnosis?.detected_dependencies?.join(', ') || 'Grafo del Proyecto'}
                  </p>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'versions' && (
            <div className="space-y-3">
              <div className="rounded-lg border border-slate-200 bg-white p-4 flex items-center justify-between shadow-2xs">
                <div className="flex items-center gap-3">
                  <span className="rounded bg-emerald-100 px-2.5 py-1 text-xs font-bold text-emerald-800 font-mono">
                    Versión {activeResult?.version_number || 'v1.0'}
                  </span>
                  <div>
                    <h4 className="text-xs font-bold text-slate-800">Especificación Refinada por Agentes IA</h4>
                    <p className="text-xs text-slate-500 mt-0.5">
                      Procesada mediante Orquestador LangGraph • {formatGeminiModel(activeResult?.response_source)}
                    </p>
                  </div>
                </div>
                <span className="rounded-full bg-blue-50 px-2.5 py-0.5 text-[10px] font-bold text-blue-700 border border-blue-100">
                  VERSIÓN ACTUAL EN PROCESO
                </span>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
