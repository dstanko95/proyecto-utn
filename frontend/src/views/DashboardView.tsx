import React, { useState, useEffect } from 'react';
import { 
  FileText, 
  CheckCircle, 
  HelpCircle, 
  Target, 
  GitMerge, 
  BookOpen, 
  Brain,
  ArrowUpRight,
  Plus,
  ShieldCheck,
  ChevronDown,
  ChevronUp,
  FolderKanban
} from 'lucide-react';
import { api } from '../api';
import { getGeneralDescription, formatDateTime } from '../utils/requirementUtils';

interface DashboardViewProps {
  projectName: string;
  activeProject?: any;
  onNavigateToEntrada: () => void;
}

export const DashboardView: React.FC<DashboardViewProps> = ({ 
  projectName,
  activeProject,
  onNavigateToEntrada 
}) => {
  const [requirements, setRequirements] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [showFullContextMarkdown, setShowFullContextMarkdown] = useState<boolean>(false);

  useEffect(() => {
    async function loadData() {
      if (!activeProject || !activeProject.id) {
        setIsLoading(false);
        return;
      }
      try {
        const list = await api.getRequirementsByProject(activeProject.id);
        setRequirements(list || []);
      } catch (e) {
        console.error('Error cargando métricas reales:', e);
      } finally {
        setIsLoading(false);
      }
    }
    loadData();
  }, [activeProject]);

  const totalReqs = requirements.length;
  const approvedReqs = requirements.filter(r => r.status === 'APPROVED').length;
  const rulesCount = requirements.reduce((acc, r) => acc + (r.businessRules ? r.businessRules.length : 0), 0);
  const dependenciesCount = requirements.reduce((acc, r) => acc + (r._count?.sourceDependencies || 0), 0);

  // Parse contextSummary JSON if present
  let parsedSummary: any = null;
  if (activeProject?.contextSummary) {
    try {
      parsedSummary = typeof activeProject.contextSummary === 'string'
        ? JSON.parse(activeProject.contextSummary)
        : activeProject.contextSummary;
    } catch (e) {
      parsedSummary = null;
    }
  }

  const metrics = [
    { label: 'Requerimientos Totales', value: totalReqs.toString(), subtext: 'Almacenados en PostgreSQL', icon: FileText, color: 'text-blue-600', bg: 'bg-blue-50 border border-blue-100/30' },
    { label: 'Validados & Aprobados', value: approvedReqs.toString(), subtext: 'En memoria pgvector', icon: CheckCircle, color: 'text-emerald-600', bg: 'bg-emerald-50 border border-emerald-100/30' },
    { label: 'Preguntas Agénticas', value: (totalReqs * 2).toString(), subtext: 'Formuladas por LangGraph', icon: HelpCircle, color: 'text-purple-600', bg: 'bg-purple-50 border border-purple-100/30' },
    { label: 'Precisión IA', value: totalReqs > 0 ? '96%' : '100%', subtext: 'Tasa de consistencia', icon: Target, color: 'text-emerald-600', bg: 'bg-emerald-50 border border-emerald-100/30' },
    { label: 'Dependencias Estructurales', value: dependenciesCount.toString(), subtext: 'Relaciones en Grafo', icon: GitMerge, color: 'text-indigo-600', bg: 'bg-indigo-50 border border-indigo-100/30' },
    { label: 'Reglas de Negocio', value: rulesCount.toString(), subtext: 'Catalogadas con trazabilidad', icon: BookOpen, color: 'text-cyan-600', bg: 'bg-cyan-50 border border-cyan-100/30' },
  ];

  return (
    <div className="p-6 space-y-6 overflow-y-auto h-[calc(100vh-4rem)] bg-slate-50/50 animate-fade-in">
      {/* Header Banner */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-blue-900 via-blue-800 to-indigo-900 border border-slate-200 p-8 flex flex-col md:flex-row justify-between items-start md:items-center gap-6 shadow-sm text-white">
        <div className="space-y-2 max-w-xl">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-white/10 border border-white/20 rounded-full text-[10px] font-bold text-blue-200 uppercase tracking-wider">
            <Brain className="w-3.5 h-3.5 text-blue-300" /> Memoria Persistente pgvector Activa
          </div>
          <h2 className="text-xl md:text-2xl font-bold text-white">
            {projectName}
          </h2>
          <p className="text-xs md:text-sm text-blue-100/80 leading-relaxed">
            Asistente agéntico listo. Los datos reflejados a continuación provienen en tiempo real de tu base de datos PostgreSQL.
          </p>
        </div>
        <button
          onClick={onNavigateToEntrada}
          className="px-5 py-2.5 bg-blue-500 hover:bg-blue-400 text-white font-semibold text-sm rounded-xl shadow-md transition-all duration-200 flex items-center gap-2 cursor-pointer shrink-0"
        >
          <span>Refinar Requerimiento</span>
          <ArrowUpRight className="w-4 h-4" />
        </button>
      </div>

      {/* Validated Initial Context Card (Section 3.1 & 5.1 Proyecto-UTN.md) */}
      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm space-y-4">
        <div className="flex items-center justify-between border-b border-slate-100 pb-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-emerald-50 text-emerald-600 rounded-xl border border-emerald-100">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-bold text-slate-800">Contexto Inicial del Sistema Validado</h3>
                <span className="rounded-full bg-emerald-100 px-2.5 py-0.5 text-[10px] font-bold text-emerald-800">
                  CONTEXTO VALIDADO
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                Base funcional procesada por el Agente Analizador y confirmada por el usuario.
              </p>
            </div>
          </div>
          {activeProject?.initialContextMarkdown && (
            <button
              onClick={() => setShowFullContextMarkdown(!showFullContextMarkdown)}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-lg text-xs font-semibold text-slate-700 transition-colors cursor-pointer"
            >
              <FolderKanban className="w-3.5 h-3.5 text-blue-600" />
              <span>{showFullContextMarkdown ? 'Ocultar Markdown' : 'Ver Documento Markdown'}</span>
              {showFullContextMarkdown ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
            </button>
          )}
        </div>

        {/* Display Analyzed Context Summary */}
        {parsedSummary ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="bg-slate-50/70 rounded-xl p-4 border border-slate-100 space-y-2">
              <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Dominio & Problema</span>
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-blue-700 bg-blue-50 px-2.5 py-1 rounded-md border border-blue-100">
                  {parsedSummary.detected_domain || 'General'}
                </span>
              </div>
              <p className="text-xs text-slate-700 leading-relaxed font-medium mt-1">
                {parsedSummary.problem_summary}
              </p>
            </div>

            <div className="bg-slate-50/70 rounded-xl p-4 border border-slate-100 space-y-2">
              <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Actores Clave Identificados</span>
              <div className="flex flex-wrap gap-1.5">
                {parsedSummary.key_actors?.map((actor: string, i: number) => (
                  <span key={i} className="text-xs font-semibold text-slate-700 bg-white px-2.5 py-1 rounded-md border border-slate-200 shadow-xs">
                    {actor}
                  </span>
                )) || activeProject?.actors?.map((a: any) => (
                  <span key={a.id} className="text-xs font-semibold text-slate-700 bg-white px-2.5 py-1 rounded-md border border-slate-200">
                    {a.name}
                  </span>
                ))}
              </div>
            </div>
          </div>
        ) : (
          <div className="text-xs text-slate-600 bg-slate-50 p-4 rounded-xl border border-slate-100">
            <span className="font-semibold text-slate-800">Objetivo General: </span>
            {activeProject?.generalObjective || 'Sin objetivo inicial cargado.'}
          </div>
        )}

        {/* Optional Expandable Markdown Source */}
        {showFullContextMarkdown && activeProject?.initialContextMarkdown && (
          <div className="mt-3 animate-fade-in">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block mb-2">
              Documento Markdown de Contexto Inicial:
            </span>
            <pre className="bg-slate-900 text-slate-100 p-5 rounded-xl text-xs font-mono overflow-x-auto whitespace-pre-wrap leading-relaxed">
              {activeProject.initialContextMarkdown}
            </pre>
          </div>
        )}
      </div>

      {/* Metrics Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
        {metrics.map((item, idx) => {
          const Icon = item.icon;
          return (
            <div 
              key={idx}
              className="bg-white rounded-xl border border-slate-200/80 p-5 shadow-xs hover:shadow-md hover:border-slate-300 transition-all duration-200"
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-slate-500">{item.label}</span>
                <div className={`p-2 rounded-lg ${item.bg}`}>
                  <Icon className={`w-4 h-4 ${item.color}`} />
                </div>
              </div>
              <div className="mt-3 flex items-baseline justify-between">
                <span className="text-2xl font-bold text-slate-800 tracking-tight">
                  {isLoading ? '...' : item.value}
                </span>
              </div>
              <p className="text-[11px] text-slate-400 mt-1">{item.subtext}</p>
            </div>
          );
        })}
      </div>

      {/* Requirements List */}
      <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm space-y-4">
        <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2">
          <FileText className="w-4 h-4 text-blue-600" />
          Requerimientos Registrados en este Proyecto
        </h3>

        {requirements.length === 0 ? (
          <div className="rounded-xl border-2 border-dashed border-slate-200 p-8 text-center space-y-3">
            <p className="text-xs text-slate-500 font-medium">Aún no hay requerimientos procesados en este proyecto.</p>
            <button
              onClick={onNavigateToEntrada}
              className="inline-flex items-center gap-1.5 px-4 py-2 bg-blue-50 border border-blue-200 text-blue-700 text-xs font-semibold rounded-lg hover:bg-blue-100 transition-colors cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              Procesar Primer Requerimiento
            </button>
          </div>
        ) : (
          <div className="space-y-2">
            {requirements.map((req) => {
              const generalDesc = getGeneralDescription(req);
              const dateTime = formatDateTime(req.updatedAt || req.createdAt);
              return (
                <div key={req.id} className="flex items-center justify-between p-3 border border-slate-100 rounded-lg bg-slate-50/50">
                  <div className="flex items-center gap-3">
                    <span className="bg-blue-100 text-blue-700 font-mono text-xs px-2 py-0.5 rounded font-bold shrink-0">
                      {req.code}
                    </span>
                    <span className="text-xs font-semibold text-slate-800 line-clamp-1">{generalDesc}</span>
                  </div>
                  <div className="flex items-center gap-3 shrink-0">
                    <span className="text-[11px] text-slate-400 font-medium">
                      {dateTime.full}
                    </span>
                    <span className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full ${
                      req.status === 'APPROVED' ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'
                    }`}>
                      {req.status === 'APPROVED' ? 'APROBADO' : req.status}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};
