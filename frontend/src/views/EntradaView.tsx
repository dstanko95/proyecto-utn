import React, { useState, useRef, useEffect } from 'react';
import { Sparkles, FileText, Upload, CheckCircle2, ShieldCheck, Cpu, X, FileCheck2, GitBranch, Wand2, Eye } from 'lucide-react';
import { api } from '../api';
import { convertMermaidToMarkdown } from '../utils/mermaidConverter';
import MermaidViewer from '../components/MermaidViewer';

interface EntradaViewProps {
  activeProject: any;
  onStartAnalysis: (text: string, result: any) => void;
  initialText?: string;
}

export default function EntradaView({ activeProject, onStartAnalysis, initialText }: EntradaViewProps) {
  const [inputText, setInputText] = useState(initialText || '');

  useEffect(() => {
    if (initialText !== undefined) {
      setInputText(initialText);
    }
  }, [initialText]);
  const [activeTab, setActiveTab] = useState<'text' | 'file' | 'mermaid'>('text');
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Mermaid entry state
  const [mermaidCode, setMermaidCode] = useState<string>(
`graph TD
    A[Usuario] -->|Ingresa credenciales| B(Formulario de Login)
    B -->|Valida formato y campos| C{¿Datos Válidos?}
    C -->|Sí| D[Generar Token JWT]
    C -->|No| E["Mostrar Error: Credenciales Inválidas"]`
  );
  const [mermaidSuccessMsg, setMermaidSuccessMsg] = useState<string | null>(null);

  // File upload state
  const [loadedFileName, setLoadedFileName] = useState<string | null>(null);
  const [loadedFileSize, setLoadedFileSize] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const processFile = (file: File) => {
    if (!file) return;

    if (!file.name.match(/\.md$/i)) {
      setErrorMsg('Por favor selecciona únicamente un archivo Markdown válido con extensión .md.');
      return;
    }

    setErrorMsg(null);
    const reader = new FileReader();
    reader.onload = (e) => {
      const content = e.target?.result as string;
      if (content !== undefined) {
        setInputText(content);
        setLoadedFileName(file.name);

        const kb = (file.size / 1024).toFixed(1);
        setLoadedFileSize(`${kb} KB`);

        setActiveTab('text');
      }
    };
    reader.onerror = () => {
      setErrorMsg('Ocurrió un error al leer el archivo. Inténtalo de nuevo.');
    };
    reader.readAsText(file);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      processFile(file);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) {
      processFile(file);
    }
  };

  const handleClearFile = () => {
    setLoadedFileName(null);
    setLoadedFileSize(null);
    setInputText('');
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleConvertMermaid = () => {
    if (!mermaidCode.trim()) return;
    const generatedMarkdown = convertMermaidToMarkdown(mermaidCode);
    setInputText(generatedMarkdown);
    setMermaidSuccessMsg('¡Código Mermaid transformado a requerimiento Markdown con éxito! Revisa la especificación y presiona "Iniciar Análisis Agéntico".');
    setActiveTab('text');
  };

  const loadMermaidTemplate = () => {
    setMermaidCode(
`graph TD
    A[Usuario] -->|Ingresa credenciales| B(Formulario de Autenticación)
    B -->|Valida correo y contraseña| C{¿Datos Válidos?}
    C -->|Sí| D[Generar Token JWT y Redirigir a Dashboard]
    C -->|No| E["Mostrar Error: Credenciales Inválidas"]`
    );
  };

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
    <div className={`mx-auto space-y-6 transition-all duration-300 ${activeTab === 'mermaid' ? 'max-w-7xl' : 'max-w-6xl'}`}>
      {/* Hidden File Input */}
      <input
        type="file"
        ref={fileInputRef}
        accept=".md"
        onChange={handleFileChange}
        className="hidden"
      />

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
              Ingresa el texto, adjunta un documento .md o ingresa un código visual Mermaid. Los 7 agentes lo analizarán contra la memoria del proyecto.
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
          <div className="flex items-center justify-between flex-wrap gap-3">
            <div className="flex gap-4">
              <button
                type="button"
                onClick={() => setActiveTab('text')}
                className={`flex items-center gap-2 text-sm font-medium border-b-2 pb-1 transition-colors cursor-pointer ${
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
                className={`flex items-center gap-2 text-sm font-medium border-b-2 pb-1 transition-colors cursor-pointer ${
                  activeTab === 'file'
                    ? 'border-blue-600 text-blue-600 font-semibold'
                    : 'border-transparent text-slate-500 hover:text-slate-700'
                }`}
              >
                <Upload className="h-4 w-4" />
                Adjuntar Documento (.md)
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('mermaid')}
                className={`flex items-center gap-2 text-sm font-medium border-b-2 pb-1 transition-colors cursor-pointer ${
                  activeTab === 'mermaid'
                    ? 'border-blue-600 text-blue-600 font-semibold'
                    : 'border-transparent text-slate-500 hover:text-slate-700'
                }`}
              >
                <GitBranch className="h-4 w-4" />
                Entrada Código Mermaid
              </button>
            </div>
            <span className="text-xs text-slate-400">Soporta Markdown, Mermaid</span>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {mermaidSuccessMsg && activeTab === 'text' && (
            <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-3.5 flex items-center justify-between animate-fade-in">
              <div className="flex items-center gap-2 text-xs font-semibold text-emerald-900">
                <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                <span>{mermaidSuccessMsg}</span>
              </div>
              <button
                type="button"
                onClick={() => setMermaidSuccessMsg(null)}
                className="text-emerald-700 hover:text-emerald-950 p-1"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          )}

          {loadedFileName && activeTab !== 'mermaid' && (
            <div className="rounded-lg border border-emerald-200 bg-emerald-50/80 p-3.5 flex items-center justify-between animate-fade-in">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-emerald-600 text-white rounded-lg shadow-xs">
                  <FileCheck2 className="h-5 w-5" />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-emerald-950 flex items-center gap-2">
                    <span>Archivo Cargado: {loadedFileName}</span>
                    <span className="text-[10px] font-normal px-1.5 py-0.5 bg-emerald-200 text-emerald-900 rounded font-mono">
                      {loadedFileSize}
                    </span>
                  </h4>
                  <p className="text-xs text-emerald-800 mt-0.5">
                    El contenido fue importado exitosamente. Puedes editar el texto directamente abajo si lo deseas.
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={handleClearFile}
                className="p-1 text-emerald-700 hover:text-emerald-900 hover:bg-emerald-100 rounded-md transition-colors cursor-pointer"
                title="Remover archivo cargado"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
          )}

          {activeTab === 'text' && (
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
          )}

          {activeTab === 'file' && (
            <div
              onClick={() => fileInputRef.current?.click()}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              className={`flex flex-col items-center justify-center rounded-xl border-2 border-dashed p-10 text-center transition-all cursor-pointer ${
                isDragging
                  ? 'border-blue-500 bg-blue-50/80 scale-[0.99]'
                  : 'border-slate-300 hover:border-blue-400 hover:bg-slate-50/50'
              }`}
            >
              <Upload className={`h-10 w-10 mb-2 transition-colors ${isDragging ? 'text-blue-600' : 'text-slate-400'}`} />
              <p className="text-sm font-medium text-slate-700">
                {isDragging ? 'Suelta tu archivo aquí' : 'Arrastra tu archivo Markdown (.md) aquí'}
              </p>
              <p className="text-xs text-slate-400 mt-1">O haz clic para seleccionar desde tu equipo</p>
            </div>
          )}

          {activeTab === 'mermaid' && (
            <div className="space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-50 p-3 rounded-lg border border-slate-200">
                <span className="text-xs font-semibold text-slate-600 flex items-center gap-1.5">
                  <GitBranch className="h-4 w-4 text-blue-600" />
                  <span>Cargar Plantilla de Ejemplo:</span>
                </span>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={loadMermaidTemplate}
                    className="px-2.5 py-1 text-xs font-medium bg-white hover:bg-slate-100 text-slate-700 border border-slate-300 rounded shadow-2xs transition-colors cursor-pointer flex items-center gap-1.5"
                  >
                    <Sparkles className="h-3.5 w-3.5 text-blue-600" />
                    <span>Cargar Diagrama de Ejemplo</span>
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 mb-1.5">
                    Editor de Código Mermaid
                  </label>
                  <textarea
                    rows={12}
                    value={mermaidCode}
                    onChange={(e) => setMermaidCode(e.target.value)}
                    placeholder="Pega o escribe tu diagrama Mermaid (graph TD, sequenceDiagram, etc)..."
                    className="w-full rounded-lg border border-slate-300 p-4 text-sm text-slate-800 bg-white placeholder-slate-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-100 outline-none transition-all font-mono leading-relaxed"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 mb-1.5 flex items-center gap-1">
                    <Eye className="h-3.5 w-3.5 text-blue-600" />
                    <span>Previsualización en Tiempo Real</span>
                  </label>
                  <div className="rounded-lg border border-slate-200 bg-white p-2 min-h-[260px] max-h-[340px] overflow-y-auto">
                    <MermaidViewer chart={mermaidCode} title="Diagrama Ingresado" defaultMode="preview" />
                  </div>
                </div>
              </div>

              <div className="pt-2 flex justify-end">
                <button
                  type="button"
                  onClick={handleConvertMermaid}
                  disabled={!mermaidCode.trim()}
                  className="flex items-center gap-2 rounded-lg bg-gradient-to-r from-blue-600 to-indigo-600 px-5 py-2.5 text-xs font-semibold text-white hover:from-blue-700 hover:to-indigo-700 disabled:opacity-50 transition-all shadow-sm cursor-pointer"
                >
                  <Wand2 className="h-4 w-4" />
                  <span>Transformar Mermaid a Especificación Markdown</span>
                </button>
              </div>
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
