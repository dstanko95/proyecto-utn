import React, { useState } from 'react';
import { Sparkles, FileText, Upload, CheckCircle2, ShieldCheck, Cpu } from 'lucide-react';
import { api } from '../api';

interface EntradaViewProps {
  activeProject: any;
  onStartAnalysis: (text: string, result: any) => void;
}

export default function EntradaView({ activeProject, onStartAnalysis }: EntradaViewProps) {
  const [inputText, setInputText] = useState('');
  const [activeTab, setActiveTab] = useState<'text' | 'file'>('text');
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputText.trim()) return;

    setIsLoading(true);
    setErrorMsg(null);

    try {
      const aiResult = await api.analyzeRequirement(
        inputText,
        activeProject ? activeProject.id : ''
      );

      onStartAnalysis(inputText, aiResult);
    } catch (err: any) {
      console.error('Error durante el análisis agéntico:', err);
      setErrorMsg('No se pudo establecer comunicación con el microservicio de IA. Asegúrate de tener los servidores encendidos.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex items-center justify-between">
          <div>
            <div className="flex items-center gap-2">
              <span className="rounded-full bg-blue-100 px-3 py-1 text-xs font-semibold text-blue-700">
                Fase 1: Entrada de Requerimientos
              </span>
              <span className="text-xs text-slate-400">• Proyecto Activo:</span>
              <span className="text-xs font-semibold text-slate-700">{activeProject?.name || 'Sin Proyecto'}</span>
            </div>
            <h2 className="mt-2 text-2xl font-bold text-slate-800">Cargar Requerimiento Incremental</h2>
            <p className="mt-1 text-sm text-slate-500">
              Ingresa el texto, historia de usuario o documento preliminar. Los 7 agentes lo analizarán contra la memoria del proyecto.
            </p>
          </div>
          <div className="hidden sm:flex items-center gap-3">
            <div className="flex items-center gap-2 rounded-lg bg-slate-50 px-3 py-2 text-xs font-medium text-slate-600 border border-slate-200">
              <Cpu className="h-4 w-4 text-blue-600" />
              <span>Orquestador LangGraph Listo</span>
            </div>
          </div>
        </div>
      </div>

      {errorMsg && (
        <div className="rounded-lg bg-red-50 p-4 border border-red-200 text-sm text-red-700 font-medium">
          {errorMsg}
        </div>
      )}

      <div className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">
        <div className="border-b border-slate-200 bg-slate-50/50 px-6 py-3">
          <div className="flex items-center justify-between">
            <div className="flex gap-4">
              <button
                type="button"
                onClick={() => setActiveTab('text')}
                className={`flex items-center gap-2 text-sm font-medium border-b-2 pb-1 transition-colors ${
                  activeTab === 'text'
                    ? 'border-blue-600 text-blue-600 font-semibold'
                    : 'border-transparent text-slate-500 hover:text-slate-700'
                }`}
              >
                <FileText className="h-4 w-4" />
                Texto / Markdown Directo
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('file')}
                className={`flex items-center gap-2 text-sm font-medium border-b-2 pb-1 transition-colors ${
                  activeTab === 'file'
                    ? 'border-blue-600 text-blue-600 font-semibold'
                    : 'border-transparent text-slate-500 hover:text-slate-700'
                }`}
              >
                <Upload className="h-4 w-4" />
                Adjuntar Documento (.md)
              </button>
            </div>
            <span className="text-xs text-slate-400">Soporta Markdown, Mermaid e Imágenes</span>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {activeTab === 'text' ? (
            <div>
              <label htmlFor="req-input" className="block text-xs font-semibold uppercase tracking-wider text-slate-500 mb-2">
                Descripción del Requerimiento Funcional
              </label>
              <textarea
                id="req-input"
                rows={7}
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                placeholder="Escribe aquí el requerimiento funcional a analizar..."
                className="w-full rounded-lg border border-slate-300 p-4 text-sm text-slate-800 placeholder-slate-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-100 outline-none transition-all font-mono"
              />
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center rounded-xl border-2 border-dashed border-slate-300 p-10 text-center hover:bg-slate-50/50 transition-colors cursor-pointer">
              <Upload className="h-10 w-10 text-slate-400 mb-2" />
              <p className="text-sm font-medium text-slate-700">Arrastra tu archivo Markdown (.md) aquí</p>
              <p className="text-xs text-slate-400 mt-1">O haz clic para seleccionar desde tu equipo</p>
            </div>
          )}

          <div className="rounded-lg bg-blue-50/50 p-4 border border-blue-100 flex items-start gap-3">
            <ShieldCheck className="h-5 w-5 text-blue-600 shrink-0 mt-0.5" />
            <div className="text-xs text-slate-600">
              <span className="font-semibold text-slate-700">Validación de Alcance Activa:</span> Al enviar, el Agente Analizador contrastará este texto contra las reglas existentes en la base <code className="bg-blue-100 px-1 py-0.5 rounded text-blue-800 font-mono">pgvector</code> y el Grafo de Conocimiento del proyecto.
            </div>
          </div>

          <div className="flex items-center justify-between pt-2">
            <div className="flex items-center gap-2 text-xs text-slate-500">
              <CheckCircle2 className="h-4 w-4 text-emerald-500" />
              <span>Verificación de Consistencia Automática</span>
            </div>
            <button
              type="submit"
              disabled={isLoading || !inputText.trim()}
              className="flex items-center gap-2 rounded-lg bg-blue-600 px-6 py-2.5 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50 transition-all shadow-sm shadow-blue-200 cursor-pointer"
            >
              {isLoading ? (
                <>
                  <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                  <span>Procesando en LangGraph...</span>
                </>
              ) : (
                <>
                  <Sparkles className="h-4 w-4" />
                  <span>Iniciar Análisis Agéntico</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
