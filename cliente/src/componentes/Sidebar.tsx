import React from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { useAutenticacionStore } from '../store/autenticacionStore';
import api from '../servicios/api';

export default function Sidebar() {
  const navigate = useNavigate();
  const logoutStore = useAutenticacionStore();

  const handleLogout = (e: React.MouseEvent) => {
    e.preventDefault();
    // Post to logout route on backend, then clear store credentials
    api.post('/api/auth/logout').finally(() => {
      logoutStore.logout();
      navigate('/login');
    });
  };

  const navItems = [
    { name: 'Panel de Control', path: '/dashboard', icon: 'dashboard' },
    { name: 'Inventario', path: '/inventario', icon: 'inventory_2' },
    { name: 'Roles', path: '/roles', icon: 'admin_panel_settings' },
    { name: 'Ventas', path: '/ventas', icon: 'payments' },
    { name: 'Compras', path: '/compras', icon: 'shopping_cart' },
    { name: 'Clientes', path: '/clientes', icon: 'group' },
    { name: 'Personal', path: '/personal', icon: 'engineering' },
    { name: 'Configuración', path: '/perfil', icon: 'settings' },
  ];

  return (
    <aside className="fixed h-full w-[260px] left-0 top-0 bg-[#161B27] border-r border-[#2D3748] flex flex-col py-6 z-50 transition-all duration-300">
      <div className="px-6 mb-8">
        <h1 className="font-rajdhani text-2xl font-bold text-[#F97316]">Workshop Pro</h1>
        <p className="font-ibm-plex text-xs uppercase tracking-widest text-[#94A3B8] mt-1">Gestión Industrial</p>
      </div>
      <nav className="flex-1 space-y-1">
        {navItems.map((item) => (
          <NavLink
            key={item.path}
            to={item.path}
            className={({ isActive }) =>
              `flex items-center gap-3 px-4 py-3 rounded-lg mx-2 font-ibm-plex text-xs font-semibold uppercase tracking-wider transition-all duration-200 ${
                isActive
                  ? 'bg-[#F97316]/20 text-[#F97316] border-l-2 border-[#F97316]'
                  : 'text-[#94A3B8] hover:bg-white/5 hover:text-[#F1F5F9]'
              }`
            }
          >
            <span className="material-symbols-outlined">{item.icon}</span>
            <span>{item.name}</span>
          </NavLink>
        ))}
      </nav>
      <div className="px-4 mt-auto">
        <button 
          onClick={() => navigate('/ventas')}
          className="w-full bg-[#F97316] hover:bg-[#EA6C0A] text-white font-ibm-plex text-xs font-semibold uppercase tracking-wider py-3 rounded-lg flex items-center justify-center gap-2 transition-all"
        >
          <span className="material-symbols-outlined">add_circle</span>
          Nueva Venta
        </button>
        <div className="mt-6 pt-6 border-t border-[#2D3748]">
          <a
            href="/login"
            onClick={handleLogout}
            className="flex items-center gap-3 px-4 py-3 text-[#94A3B8] hover:text-[#EF4444] rounded-lg transition-colors font-ibm-plex text-xs font-semibold uppercase tracking-wider"
          >
            <span className="material-symbols-outlined">logout</span>
            <span>Cerrar Sesión</span>
          </a>
        </div>
      </div>
    </aside>
  );
}
