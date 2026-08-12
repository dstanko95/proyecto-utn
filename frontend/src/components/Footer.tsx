import React from 'react';
import { Info } from 'lucide-react';

export const Footer: React.FC = () => {
  return (
    <footer className="bg-white border-t border-slate-200 py-2.5 px-6 shrink-0 shadow-2xs">
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-3 text-xs">
        {/* Legend Header */}
        <div className="flex items-center gap-2 text-slate-500 font-medium shrink-0">
          <Info className="w-4 h-4 text-blue-600 shrink-0" />
          <span className="font-bold text-slate-700 uppercase tracking-wider text-[11px]">
            Glosario de Nomenclaturas:
          </span>
        </div>

        {/* Legend Badges */}
        <div className="flex flex-wrap items-center gap-2.5 text-[11px]">
          <div className="flex items-center gap-1.5 bg-blue-50 border border-blue-200/60 px-2.5 py-1 rounded-md">
            <span className="font-mono font-bold text-blue-700 bg-blue-100 px-1 py-0.2 rounded text-[10px]">RF</span>
            <span className="text-slate-600 font-medium">Requerimiento Funcional</span>
          </div>

          <div className="flex items-center gap-1.5 bg-emerald-50 border border-emerald-200/60 px-2.5 py-1 rounded-md">
            <span className="font-mono font-bold text-emerald-700 bg-emerald-100 px-1 py-0.2 rounded text-[10px]">RN</span>
            <span className="text-slate-600 font-medium">Regla de Negocio Explícita</span>
          </div>

          <div className="flex items-center gap-1.5 bg-purple-50 border border-purple-200/60 px-2.5 py-1 rounded-md">
            <span className="font-mono font-bold text-purple-700 bg-purple-100 px-1 py-0.2 rounded text-[10px]">RN_MEM</span>
            <span className="text-slate-600 font-medium">Regla de Memoria Persistente (pgvector)</span>
          </div>

          <div className="flex items-center gap-1.5 bg-amber-50 border border-amber-200/60 px-2.5 py-1 rounded-md">
            <span className="font-mono font-bold text-amber-700 bg-amber-100 px-1 py-0.2 rounded text-[10px]">CA</span>
            <span className="text-slate-600 font-medium">Criterio de Aceptación</span>
          </div>
        </div>

        {/* Brand System Tag */}
        <div className="hidden xl:flex items-center gap-1.5 text-[10px] text-slate-400 font-medium shrink-0">
          <span>ReqRefiner v1.0</span>
        </div>
      </div>
    </footer>
  );
};
