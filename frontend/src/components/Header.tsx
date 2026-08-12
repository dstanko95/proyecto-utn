import React from 'react';
import { Database, ShieldCheck, LogOut } from 'lucide-react';
import type { UserProfile } from '../api';

interface HeaderProps {
  activeProject: string;
  currentView: 'dashboard' | 'entrada' | 'procesamiento' | 'salida' | 'aprobados' | 'grafo';
  globalRulesCount: number;
  user?: UserProfile | null;
  onLogout?: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  activeProject,
  currentView,
  globalRulesCount,
  user,
  onLogout
}) => {
  const getHeaderTitle = () => {
    switch (currentView) {
      case 'dashboard':
        return 'Panel de Control y Métricas';
      case 'entrada':
        return 'Fase 1: Entrada de Requerimientos';
      case 'procesamiento':
        return 'Fase 2: Procesamiento Agéntico';
      case 'salida':
        return 'Fase 3: Documentación y Salida';
      case 'aprobados':
        return 'Requerimientos Aprobados & Persistidos';
      case 'grafo':
        return 'Grafo de Dependencias del Proyecto';
      default:
        return 'ReqRefiner';
    }
  };

  const getUserDisplayName = () => {
    if (!user) return 'Analista';
    if (user.firstName && user.lastName) return `${user.firstName} ${user.lastName}`;
    return user.email;
  };

  const getUserInitials = () => {
    if (!user) return 'AN';
    if (user.firstName && user.lastName) {
      return `${user.firstName[0]}${user.lastName[0]}`.toUpperCase();
    }
    return user.email.slice(0, 2).toUpperCase();
  };

  return (
    <header className="h-16 border-b border-slate-200 bg-white px-6 flex items-center justify-between shrink-0 shadow-xs">
      {/* View Title & Current Project */}
      <div className="flex items-center gap-4">
        <h2 className="text-sm font-semibold text-slate-800 tracking-wide">
          {getHeaderTitle()}
        </h2>
        <div className="h-4 w-px bg-slate-200"></div>
        <div className="flex items-center gap-1.5 bg-blue-50 border border-blue-100 rounded-full px-3 py-1">
          <span className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-pulse"></span>
          <span className="text-[10px] font-semibold text-blue-700">
            {activeProject || 'Sin Proyecto Activo'}
          </span>
        </div>
      </div>

      {/* Global Memory, User Profile & Logout */}
      <div className="flex items-center gap-4">
        {/* Global Memory Status */}
        <div 
          className="hidden sm:flex items-center gap-2 bg-purple-50 border border-purple-100 rounded-lg px-3 py-1.5 text-xs text-purple-700 hover:bg-purple-100/50 transition-all cursor-help"
          title="Proyectos creados en tu cuenta privada"
        >
          <Database className="w-3.5 h-3.5 text-purple-600" />
          <span className="text-slate-500">Proyectos:</span>
          <span className="font-bold text-purple-700">{globalRulesCount}</span>
        </div>

        {/* AI Orchestration Health */}
        <div className="hidden lg:flex items-center gap-1.5 bg-emerald-50 border border-emerald-100 rounded-lg px-2.5 py-1.5 text-xs text-emerald-700 font-medium">
          <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
          <span>Orquestador Activo</span>
        </div>

        <div className="h-4 w-px bg-slate-200 hidden sm:block"></div>

        {/* User Profile Badge & Logout Button */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 rounded-xl px-3 py-1.5">
            <div className="w-6 h-6 rounded-lg bg-blue-600 text-white font-bold text-[10px] flex items-center justify-center shadow-xs">
              {getUserInitials()}
            </div>
            <div className="flex flex-col text-left">
              <span className="text-xs font-semibold text-slate-800 leading-tight">
                {getUserDisplayName()}
              </span>
              <span className="text-[10px] text-slate-400 font-medium leading-none">
                {user?.email || 'analista@utn.edu.ar'}
              </span>
            </div>
          </div>

          {onLogout && (
            <button
              onClick={onLogout}
              className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-xl border border-transparent hover:border-red-200 transition-all cursor-pointer"
              title="Cerrar Sesión"
            >
              <LogOut className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>
    </header>
  );
};
