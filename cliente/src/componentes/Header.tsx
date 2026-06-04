import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useAutenticacionStore } from '../store/autenticacionStore';

export default function Header() {
  const navigate = useNavigate();
  const { usuario } = useAutenticacionStore();

  const nombre = usuario?.nombre_completo || 'Carlos Méndez';
  const rolDisplay = usuario?.rol === 'administrador' ? 'Administrador' : usuario?.rol === 'vendedor' ? 'Vendedor' : 'Comprador';

  return (
    <header className="fixed top-0 right-0 w-[calc(100%-260px)] h-16 bg-[#0F1117] border-b border-[#2D3748] flex justify-between items-center px-8 z-40 transition-all duration-300">
      <div className="flex items-center gap-4 w-1/2">
        {/* No search bar here - moved to tables */}
      </div>
      <div className="flex items-center gap-6">
        <button className="text-[#94A3B8] hover:text-[#F97316] transition-colors relative p-1">
          <span className="material-symbols-outlined">notifications</span>
          <span className="absolute top-0 right-0 w-2 h-2 bg-[#F97316] rounded-full"></span>
        </button>
        <button className="text-[#94A3B8] hover:text-[#F97316] transition-colors p-1">
          <span className="material-symbols-outlined">help_outline</span>
        </button>
        <div 
          onClick={() => navigate('/perfil')}
          className="flex items-center gap-3 pl-6 border-l border-[#2D3748] cursor-pointer group"
        >
          <div className="text-right">
            <p className="font-ibm-plex text-xs font-semibold text-[#F1F5F9] group-hover:text-[#F97316] transition-colors leading-tight">
              {nombre}
            </p>
            <p className="text-[10px] text-[#94A3B8] uppercase tracking-wider mt-0.5">
              {rolDisplay}
            </p>
          </div>
          <div className="w-10 h-10 rounded-full border border-[#F97316]/20 overflow-hidden group-hover:border-[#F97316] transition-colors">
            <img 
              alt="Avatar Administrador" 
              className="w-full h-full object-cover" 
              src="/imagenes/imagen_22.png"
            />
          </div>
        </div>
      </div>
    </header>
  );
}
