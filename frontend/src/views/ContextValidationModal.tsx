import React, { useState } from 'react';
import { Sparkles, Brain, CheckCircle2, ShieldCheck, ArrowLeft } from 'lucide-react';
import { api } from '../api';

interface ContextValidationModalProps {
  onClose: () => void;
  onProjectValidated: (project: any) => void;
}

export default function ContextValidationModal({ onClose, onProjectValidated }: ContextValidationModalProps) {
  const [step, setStep] = useState<1 | 2>(1);
  const [projectName, setProjectName] = useState('');
  const [contextMarkdown, setContextMarkdown] = useState('');
  
  // Analysis results from AI
  const [createdProject, setCreatedProject] = useState<any | null>(null);
  const [aiContextAnalysis, setAiContextAnalysis] = useState<any | null>(null);
  
  // UI states
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isValidating, setIsValidating] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleStartAnalysis = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!projectName.trim()) {
      setErrorMessage('Por favor ingresa un nombre para el proyecto.');
      return;
    }
    if (!contextMarkdown.trim()) {
      setErrorMessage('El documento de contexto inicial en Markdown es obligatorio.');
      return;
    }

    setIsAnalyzing(true);
    setErrorMessage(null);

    try {
      // 1. Create draft project in PostgreSQL
      const project = await api.createProject(projectName.trim(), contextMarkdown.trim());
      setCreatedProject(project);

      // 2. Request AI Analysis of the Initial Context Document
      const aiAnalysis = await api.analyzeContext(contextMarkdown.trim());
      setAiContextAnalysis(aiAnalysis);

      // 3. Move to Step 2: User Validation of Domain Summary
      setStep(2);
    } catch (err: any) {
      console.error('Error al analizar contexto inicial:', err);
      setErrorMessage(err.message || 'Ocurrió un error al procesar el contexto inicial con la IA.');
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleConfirmValidation = async () => {
    if (!createdProject || !createdProject.id || !aiContextAnalysis) return;

    setIsValidating(true);
    setErrorMessage(null);

    try {
      const contextSummaryJson = JSON.stringify(aiContextAnalysis);
      const actors = aiContextAnalysis.key_actors || [];

      const validatedProject = await api.validateContext(createdProject.id, contextSummaryJson, actors);
      onProjectValidated(validatedProject);
    } catch (err: any) {
      console.error('Error al validar contexto del proyecto:', err);
      setErrorMessage('Ocurrió un error al confirmar la validación del dominio.');
    } finally {
      setIsValidating(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-xs p-4 font-sans text-slate-800">
      <div className="w-full max-w-2xl bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden animate-scale-in flex flex-col max-h-[90vh]">
        
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-900 to-indigo-900 p-6 text-white flex items-center justify-between shrink-0">
          <div>
            <div className="flex items-center gap-2">
              <span className="rounded-full bg-blue-500/30 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-blue-200 border border-blue-400/30">
                Paso {step} de 2
              </span>
              <span className="text-xs text-blue-200">
                {step === 1 ? 'Carga Inicial del Contexto' : 'Validación de Comprensión del Dominio'}
              </span>
            </div>
            <h3 className="text-lg font-bold text-white mt-1">
              {step === 1 ? 'Nuevo Proyecto: Contexto Inicial' : 'Resumen del Proyecto Interpretado por la IA'}
            </h3>
          </div>
          <button
            onClick={onClose}
            className="text-blue-200 hover:text-white text-sm font-bold p-1 cursor-pointer"
          >
            ✕
          </button>
        </div>

        {/* Content Body */}
        <div className="p-6 overflow-y-auto space-y-5">
          {errorMessage && (
            <div className="rounded-xl bg-red-50 p-3.5 border border-red-200 text-xs text-red-700 font-medium leading-relaxed">
              {errorMessage}
            </div>
          )}

          {step === 1 ? (
            <form id="context-form" onSubmit={handleStartAnalysis} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 mb-1">
                  Nombre del Proyecto <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={projectName}
                  onChange={(e) => setProjectName(e.target.value)}
                  placeholder="Ej: Sistema de Gestión de Turnos Médicos"
                  className="w-full rounded-xl border border-slate-300 px-4 py-2.5 text-sm text-slate-800 focus:border-blue-500 focus:ring-2 focus:ring-blue-100 outline-none"
                  autoFocus
                />
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500">
                    Documento de Contexto Inicial en Markdown <span className="text-red-500">*</span>
                  </label>
                  <span className="text-[11px] text-slate-400">Sección 3.1 Proyecto-UTN.md</span>
                </div>
                <p className="text-xs text-slate-500 mb-2">
                  Describe el objetivo general del sistema, el problema a resolver, los usuarios esperados, el alcance inicial y cualquier regla relevante.
                </p>
                <textarea
                  rows={8}
                  required
                  value={contextMarkdown}
                  onChange={(e) => setContextMarkdown(e.target.value)}
                  placeholder={`# Contexto General del Sistema

## 1. Problema a Resolver
El sistema busca automatizar la gestión de citas y fichas de clientes...

## 2. Usuarios y Actores
- Cliente: Solicita turno y consulta estado.
- Administrador: Gestiona disponibilidad y reportes.

## 3. Alcance Esperado
Acceso web responsive con notificaciones automáticas.`}
                  className="w-full rounded-xl border border-slate-300 p-4 text-xs font-mono text-slate-800 placeholder-slate-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-100 outline-none leading-relaxed"
                />
              </div>

              <div className="rounded-xl bg-blue-50/60 p-3.5 border border-blue-100 flex items-start gap-3">
                <ShieldCheck className="w-5 h-5 text-blue-600 shrink-0 mt-0.5" />
                <p className="text-xs text-slate-600 leading-relaxed">
                  <span className="font-semibold text-slate-700">Flujo Agéntico Obligatorio:</span> El Agente Analizador interpretará este documento inicial y te presentará un resumen del dominio para tu confirmación antes de permitir la carga de requerimientos incrementales.
                </p>
              </div>
            </form>
          ) : (
            <div className="space-y-5 animate-fade-in">
              <div className="rounded-xl bg-emerald-50/70 border border-emerald-200/80 p-4 flex items-start gap-3">
                <Brain className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
                <div>
                  <h4 className="text-xs font-bold text-emerald-950 uppercase tracking-wider">
                    Interpretación de Dominio por el Agente Analizador
                  </h4>
                  <p className="text-xs text-emerald-800 mt-0.5">
                    Por favor revisa el resumen generado. Al confirmar, este contexto quedará fijado para el análisis de requerimientos futuros.
                  </p>
                </div>
              </div>

              {/* Dominio & Resumen */}
              <div className="rounded-xl border border-slate-200 p-4 bg-slate-50/50 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-slate-500 font-semibold uppercase tracking-wider">Dominio Detectado:</span>
                  <span className="rounded-full bg-blue-100 px-3 py-1 text-xs font-bold text-blue-800">
                    {aiContextAnalysis?.detected_domain || 'General'}
                  </span>
                </div>
                <div>
                  <span className="text-xs text-slate-500 font-semibold uppercase tracking-wider block mb-1">Resumen del Problema:</span>
                  <p className="text-xs text-slate-700 leading-relaxed font-medium bg-white p-3 rounded-lg border border-slate-200/60">
                    {aiContextAnalysis?.problem_summary}
                  </p>
                </div>
              </div>

              {/* Actores Clave */}
              <div>
                <span className="text-xs text-slate-500 font-semibold uppercase tracking-wider block mb-2">Actores Clave Identificados:</span>
                <div className="flex flex-wrap gap-2">
                  {aiContextAnalysis?.key_actors?.map((actor: string, idx: number) => (
                    <span key={idx} className="rounded-lg bg-slate-100 px-3 py-1.5 text-xs font-semibold text-slate-700 border border-slate-200">
                      {actor}
                    </span>
                  ))}
                </div>
              </div>

              {/* Alcance Funcional */}
              <div>
                <span className="text-xs text-slate-500 font-semibold uppercase tracking-wider block mb-2">Alcance Funcional Esperado:</span>
                <div className="space-y-1.5">
                  {aiContextAnalysis?.functional_scope?.map((scopeItem: string, idx: number) => (
                    <div key={idx} className="flex items-center gap-2 text-xs text-slate-700 bg-blue-50/50 px-3 py-1.5 rounded-lg border border-blue-100">
                      <CheckCircle2 className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                      <span>{scopeItem}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Restricciones */}
              {aiContextAnalysis?.business_constraints?.length > 0 && (
                <div>
                  <span className="text-xs text-slate-500 font-semibold uppercase tracking-wider block mb-2">Restricciones de Negocio Iniciales:</span>
                  <div className="space-y-1.5">
                    {aiContextAnalysis.business_constraints.map((c: string, idx: number) => (
                      <div key={idx} className="text-xs text-amber-800 bg-amber-50 px-3 py-1.5 rounded-lg border border-amber-200/60">
                        • {c}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer Action Buttons */}
        <div className="bg-slate-50 border-t border-slate-100 p-4 flex items-center justify-between shrink-0">
          {step === 2 ? (
            <button
              type="button"
              onClick={() => setStep(1)}
              className="flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-200/60 rounded-xl transition-colors cursor-pointer"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Editar Contexto Inicial</span>
            </button>
          ) : (
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-200/60 rounded-xl transition-colors cursor-pointer"
            >
              Cancelar
            </button>
          )}

          {step === 1 ? (
            <button
              type="submit"
              form="context-form"
              disabled={isAnalyzing}
              className="flex items-center gap-2 px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs rounded-xl shadow-md shadow-blue-200 transition-all cursor-pointer disabled:opacity-50"
            >
              {isAnalyzing ? (
                <>
                  <div className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-white border-t-transparent" />
                  <span>Analizando Contexto Inicial...</span>
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4" />
                  <span>Analizar Contexto con IA</span>
                </>
              )}
            </button>
          ) : (
            <button
              type="button"
              onClick={handleConfirmValidation}
              disabled={isValidating}
              className="flex items-center gap-2 px-6 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs rounded-xl shadow-md shadow-emerald-200 transition-all cursor-pointer disabled:opacity-50"
            >
              {isValidating ? (
                <>
                  <div className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-white border-t-transparent" />
                  <span>Guardando Contexto Validado...</span>
                </>
              ) : (
                <>
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Confirmar y Validar Contexto del Proyecto</span>
                </>
              )}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
