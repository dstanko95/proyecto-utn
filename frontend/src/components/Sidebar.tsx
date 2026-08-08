import React from 'react';
import { 
  LayoutDashboard, 
  FileInput, 
  Cpu, 
  FileOutput, 
  FolderGit2, 
  Plus, 
  BrainCircuit,
  Trash2,
  Lock,
  FileCheck
} from 'lucide-react';

interface SidebarProps {
  currentView: 'dashboard' | 'entrada' | 'procesamiento' | 'salida' | 'aprobados';
  onViewChange: (view: 'dashboard' | 'entrada' | 'procesamiento' | 'salida' | 'aprobados') => void;
  activeProject: string;
  projects: string[];
  onProjectChange: (project: string) => void;
  onNewProject: () => void;
  onDeleteProject?: (project: string) => void;
  isPhase2Locked?: boolean;
  isPhase3Locked?: boolean;
}

export const Sidebar: React.FC<SidebarProps> = ({
  currentView,
  onViewChange,
  activeProject,
  projects,
  onProjectChange,
  onNewProject,
  onDeleteProject,
  isPhase2Locked = false,
  isPhase3Locked = false
}) => {
  const menuItems = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard, isLocked: false },
    { id: 'entrada', label: 'Fase 1: Entrada', icon: FileInput, isLocked: false },
    { id: 'procesamiento', label: 'Fase 2: Procesamiento', icon: Cpu, isLocked: isPhase2Locked },
    { id: 'salida', label: 'Fase 3: Salida', icon: FileOutput, isLocked: isPhase3Locked },
    { id: 'aprobados', label: 'Requerimientos Aprobados', icon: FileCheck, isLocked: false },
  ] as const;

  return (
    <aside className="w-68 h-screen bg-white flex flex-col justify-between border-r border-slate-200 shrink-0 shadow-xs">
      <div className="flex flex-col overflow-y-auto grow">
        {/* Brand Logo */}
        <div className="p-6 border-b border-slate-100 flex items-center gap-3">
          <div className="p-2 bg-gradient-to-tr from-blue-600 to-blue-700 rounded-lg shadow-sm">
            <BrainCircuit className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="text-md font-bold text-slate-800 leading-none">
              ReqRefiner
            </h1>
            <span className="text-[9px] text-blue-600 uppercase tracking-widest font-semibold">
              Orquestador IA
            </span>
          </div>
        </div>

        {/* Project Selector Section */}
        <div className="p-4 border-b border-slate-100">
          <div className="flex items-center justify-between mb-2 px-1">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
              Proyectos
            </span>
            <button 
              onClick={onNewProject}
              className="p-1 hover:bg-slate-100 text-slate-400 hover:text-slate-800 rounded transition-all duration-200 cursor-pointer"
              title="Nuevo Proyecto"
            >
              <Plus className="w-3.5 h-3.5" />
            </button>
          </div>
          
          <div className="space-y-1 max-h-40 overflow-y-auto pr-1">
            {projects.length === 0 ? (
              <p className="text-[11px] text-slate-400 italic px-2 py-1">Sin proyectos</p>
            ) : (
              projects.map((proj) => (
                <div
                  key={proj}
                  className={`group flex items-center justify-between px-3 py-1.5 text-xs rounded-md transition-all duration-150 border ${
                    activeProject === proj
                      ? 'bg-blue-50 text-blue-700 border-blue-200/50 font-medium'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50 border-transparent'
                  }`}
                >
                  <button
                    onClick={() => onProjectChange(proj)}
                    className="flex items-center gap-2 truncate flex-1 text-left cursor-pointer"
                  >
                    <FolderGit2 className="w-3.5 h-3.5 shrink-0 text-slate-400" />
                    <span className="truncate">{proj}</span>
                  </button>
                  {onDeleteProject && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        if (confirm(`¿Estás seguro de eliminar el proyecto "${proj}"?`)) {
                          onDeleteProject(proj);
                        }
                      }}
                      className="p-1 text-slate-400 hover:text-red-600 opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"
                      title="Eliminar proyecto"
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  )}
                </div>
              ))
            )}
          </div>
        </div>

        {/* Navigation Menu with Phase Guards */}
        <nav className="p-4 space-y-1">
          <span className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2 px-1">
            Navegación y Fases
          </span>
          {menuItems.map((item) => {
            const Icon = item.icon;
            const isActive = currentView === item.id;
            const isLocked = item.isLocked;

            return (
              <button
                key={item.id}
                disabled={isLocked}
                onClick={() => !isLocked && onViewChange(item.id as any)}
                title={isLocked ? 'Completa la fase anterior para desbloquear' : item.label}
                className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-sm transition-all duration-150 border-l-4 ${
                  isLocked
                    ? 'opacity-40 bg-slate-50/50 text-slate-400 cursor-not-allowed border-transparent'
                    : isActive
                    ? 'bg-blue-50/70 text-blue-700 font-semibold border-blue-600 pl-2 cursor-pointer'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50 border-transparent hover:border-slate-300 cursor-pointer'
                }`}
              >
                <div className="flex items-center gap-3">
                  <Icon className={`w-4 h-4 ${isLocked ? 'text-slate-300' : isActive ? 'text-blue-600' : 'text-slate-400'}`} />
                  <span>{item.label}</span>
                </div>
                {isLocked && <Lock className="w-3.5 h-3.5 text-slate-400 shrink-0" />}
              </button>
            );
          })}
        </nav>
      </div>

      {/* Footer System Status */}
      <div className="p-4 border-t border-slate-100">
        <div className="rounded-lg bg-slate-50 p-3 border border-slate-200/60">
          <div className="flex items-center justify-between mb-1">
            <span className="text-[11px] font-semibold text-slate-700">Motor de Agentes</span>
            <span className="flex h-2 w-2 relative">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
            </span>
          </div>
          <p className="text-[10px] text-slate-500">7 Agentes Coordinados (LangGraph)</p>
        </div>
      </div>
    </aside>
  );
};
