import { useState } from 'react';
import { AlertCircle, Bot, User, Sparkles, ArrowRight, HelpCircle, AlertTriangle } from 'lucide-react';
import { api } from '../api';

interface ProcesamientoViewProps {
  requirementText: string;
  activeProject: any;
  initialAiResult: any;
  onCompleteAnalysis: (finalResult: any) => void;
}

export default function ProcesamientoView({
  requirementText,
  activeProject,
  initialAiResult,
  onCompleteAnalysis,
}: ProcesamientoViewProps) {
  const [aiState] = useState<any>(initialAiResult || {});
  const [answers, setAnswers] = useState<Record<number, string>>({});
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const diagnosis = aiState?.diagnosis || {
    detected_domain: activeProject?.name || 'General',
    detected_actors: [],
    detected_entities: [],
    extracted_rules: [],
    missing_items: [],
  };

  const isFallbackMode = aiState?.is_ai_generated === false || diagnosis?.is_ai_generated === false;

  const questions: string[] = aiState?.clarification_questions || [];

  const handleAnswerChange = (idx: number, val: string) => {
    setAnswers((prev) => ({ ...prev, [idx]: val }));
  };

  const handleSubmitAnswers = async () => {
    setIsLoading(true);
    setErrorMsg(null);
    const answersList = Object.values(answers).filter((a) => a.trim().length > 0);

    try {
      const updatedAiResult = await api.analyzeRequirement(
        requirementText,
        activeProject ? activeProject.id : '',
        answersList
      );

      onCompleteAnalysis(updatedAiResult);
    } catch (err: any) {
      console.error('Error al responder preguntas:', err);
      setErrorMsg('No se pudo procesar la respuesta con el servicio de agentes. Verifica tu conexión.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      {/* Step Indicator Header */}
      <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex items-center justify-between">
          <div>
            <div className="flex items-center gap-2">
              <span className="rounded-full bg-amber-100 px-3 py-1 text-xs font-semibold text-amber-700">
                Fase 2: Orquestación Agéntica en Vivo
              </span>
              <span className="text-xs text-slate-400">• Proyecto:</span>
              <span className="text-xs font-semibold text-slate-700">{activeProject?.name || 'Sin Proyecto'}</span>
            </div>
            <h2 className="mt-2 text-2xl font-bold text-slate-800">Refinamiento y Aclaración de Requerimiento</h2>
            <p className="mt-1 text-sm text-slate-500">
              El Agente Planificador identificó vacíos funcionales. Responde a las preguntas de aclaración para generar la especificación definitiva.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-3 py-1 text-xs font-medium text-emerald-700 border border-emerald-200">
              <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
              Estado: {aiState?.status || 'PROCESANDO'}
            </span>
          </div>
        </div>
      </div>

      {/* Response Engine Source Badge */}
      {aiState?.response_source?.startsWith('OLLAMA_LOCAL') || diagnosis?.response_source?.startsWith('OLLAMA_LOCAL') ? (
        <div className="rounded-xl bg-indigo-50 border border-indigo-200 p-4 flex items-start gap-3 text-indigo-900 shadow-xs">
          <Bot className="w-5 h-5 text-indigo-600 shrink-0 mt-0.5" />
          <div>
            <div className="flex items-center gap-2">
              <span className="h-2 w-2 rounded-full bg-indigo-500 animate-pulse" />
              <h4 className="text-xs font-bold text-indigo-950 uppercase tracking-wider">
                Análisis Generado por LLM Local ({aiState?.response_source?.replace('OLLAMA_LOCAL', '').replace(/[()]/g, '').trim() || diagnosis?.response_source?.replace('OLLAMA_LOCAL', '').replace(/[()]/g, '').trim() || 'Ollama'})
              </h4>
            </div>
            <p className="text-xs text-indigo-800 mt-1 leading-relaxed">
              El análisis y las preguntas de aclaración fueron procesadas en tu PC mediante el modelo local de Ollama (Respaldo activo).
            </p>
          </div>
        </div>
      ) : isFallbackMode ? (
        <div className="rounded-xl bg-amber-50 border border-amber-300 p-4 flex items-start gap-3 text-amber-900 shadow-xs">
          <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
          <div>
            <h4 className="text-xs font-bold text-amber-950 uppercase tracking-wider">
              Análisis Generado por Motor Dinámico de Respaldo Local (Sin LLM)
            </h4>
            <p className="text-xs text-amber-800 mt-1 leading-relaxed">
              Atención: La respuesta no fue generada mediante API de Inteligencia Artificial (Gemini / Ollama no disponibles). El análisis fue procesado utilizando el motor dinámico de respaldo.
            </p>
          </div>
        </div>
      ) : (
        <div className="rounded-xl bg-emerald-50/90 border border-emerald-200 p-4 flex items-start gap-3 text-emerald-950 shadow-xs">
          <Sparkles className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
          <div>
            <div className="flex items-center gap-2">
              <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
              <h4 className="text-xs font-bold text-emerald-950 uppercase tracking-wider">
                Análisis Generado por Gemini 2.0 Flash (Google AI Cloud)
              </h4>
            </div>
            <p className="text-xs text-emerald-800 mt-1 leading-relaxed">
              El análisis y las preguntas de aclaración fueron procesados en vivo mediante la API de Inteligencia Artificial de Google.
            </p>
          </div>
        </div>
      )}

      {errorMsg && (
        <div className="rounded-lg bg-red-50 p-4 border border-red-200 text-sm text-red-700 font-medium">
          {errorMsg}
        </div>
      )}

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Left 2 Cols: Interaction Chat & Questions */}
        <div className="lg:col-span-2 space-y-6">
          <div className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">
            <div className="border-b border-slate-200 bg-slate-50 px-6 py-3.5 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Bot className="h-5 w-5 text-blue-600" />
                <h3 className="text-sm font-semibold text-slate-800">Diálogo de Refinamiento Cíclico</h3>
              </div>
              <span className="text-xs text-slate-400">Agente Planificador & Analizador</span>
            </div>

            <div className="p-6 space-y-6">
              {/* Initial User Input Message */}
              <div className="flex gap-4">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-slate-100 text-slate-600 font-bold text-xs">
                  <User className="h-5 w-5" />
                </div>
                <div className="flex-1 rounded-xl bg-slate-100/70 p-4 text-sm text-slate-800">
                  <p className="font-semibold text-xs text-slate-500 mb-1">Entrada Inicial del Analista:</p>
                  <p className="italic">{requirementText || 'Sin requerimiento ingresado'}</p>
                </div>
              </div>

              {/* AI Agent Response */}
              <div className="flex gap-4">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-blue-600 text-white font-bold text-xs shadow-sm shadow-blue-200">
                  <Bot className="h-5 w-5" />
                </div>
                <div className="flex-1 space-y-4 rounded-xl bg-blue-50/50 border border-blue-100 p-5 text-sm text-slate-800">
                  <div>
                    <span className="font-semibold text-blue-900">Diagnóstico del Agente Analizador:</span>
                    <p className="mt-1 text-xs text-slate-600">
                      He procesado la solicitud contra la memoria <code className="bg-blue-100 text-blue-800 px-1 rounded font-mono">pgvector</code> del dominio <span className="font-semibold">{diagnosis.detected_domain}</span>.
                    </p>
                  </div>

                  {/* Clarification Questions List */}
                  {questions.length > 0 ? (
                    <div className="space-y-3 pt-2">
                      <span className="text-xs font-semibold text-amber-800 uppercase tracking-wider flex items-center gap-1.5">
                        <HelpCircle className="h-4 w-4 text-amber-600" />
                        Preguntas de Aclaración Formuladas por el Planificador:
                      </span>

                      {questions.map((q, idx) => (
                        <div key={idx} className="rounded-lg bg-white p-3.5 border border-amber-200/70 shadow-xs space-y-2">
                          <p className="text-xs font-semibold text-slate-800">
                            {idx + 1}. {q}
                          </p>
                          <input
                            type="text"
                            value={answers[idx] || ''}
                            onChange={(e) => handleAnswerChange(idx, e.target.value)}
                            placeholder="Escribe tu aclaración o confirmación..."
                            className="w-full rounded-md border border-slate-300 px-3 py-1.5 text-xs text-slate-800 focus:border-blue-500 focus:ring-1 focus:ring-blue-200 outline-none"
                          />
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-xs font-medium text-emerald-700 bg-emerald-50 p-3 rounded-lg border border-emerald-200">
                      ✔ Información suficiente detectada. Listo para generar entregables finales.
                    </p>
                  )}

                  <div className="pt-2 flex justify-end">
                    <button
                      type="button"
                      onClick={handleSubmitAnswers}
                      disabled={isLoading}
                      className="flex items-center gap-2 rounded-lg bg-blue-600 px-5 py-2 text-xs font-semibold text-white hover:bg-blue-700 transition-all shadow-xs shadow-blue-200 disabled:opacity-50 cursor-pointer"
                    >
                      {isLoading ? (
                        <>
                          <div className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-white border-t-transparent" />
                          <span>Generando Entregables...</span>
                        </>
                      ) : (
                        <>
                          <span>{questions.length > 0 ? 'Enviar Respuestas y Generar' : 'Avanzar a Salida'}</span>
                          <ArrowRight className="h-4 w-4" />
                        </>
                      )}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Right Col: Live Agent Diagnosis Panel */}
        <div className="space-y-6">
          <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm space-y-5">
            <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-blue-600" />
              Análisis del Agente
            </h3>

            {/* Entities Identified */}
            <div>
              <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">Entidades Detectadas</span>
              <div className="mt-2 flex flex-wrap gap-1.5">
                {diagnosis.detected_entities && diagnosis.detected_entities.length > 0 ? (
                  diagnosis.detected_entities.map((e: string, i: number) => (
                    <span key={i} className="rounded-md bg-blue-50 px-2.5 py-1 text-xs font-medium text-blue-700 border border-blue-100">
                      {e}
                    </span>
                  ))
                ) : (
                  <span className="text-xs text-slate-400 italic">Ninguna por ahora</span>
                )}
              </div>
            </div>

            {/* Actores Identified */}
            <div>
              <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">Actores Involucrados</span>
              <div className="mt-2 flex flex-wrap gap-1.5">
                {diagnosis.detected_actors && diagnosis.detected_actors.length > 0 ? (
                  diagnosis.detected_actors.map((a: string, i: number) => (
                    <span key={i} className="rounded-md bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-700">
                      {a}
                    </span>
                  ))
                ) : (
                  <span className="text-xs text-slate-400 italic">Ninguno por ahora</span>
                )}
              </div>
            </div>

            {/* Missing Items Panel */}
            <div>
              <span className="text-xs font-semibold uppercase tracking-wider text-amber-700">Vacíos Detectados</span>
              <div className="mt-2 space-y-1.5">
                {diagnosis.missing_items && diagnosis.missing_items.length > 0 ? (
                  diagnosis.missing_items.map((m: string, i: number) => (
                    <div key={i} className="rounded-lg bg-amber-50/70 p-2.5 text-xs text-amber-900 border border-amber-200/60 flex items-start gap-2">
                      <AlertCircle className="h-4 w-4 text-amber-600 shrink-0 mt-0.5" />
                      <span>{m}</span>
                    </div>
                  ))
                ) : (
                  <span className="text-xs text-slate-400 italic">Sin vacíos críticos detectados</span>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
