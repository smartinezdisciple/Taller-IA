import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAutenticacionStore } from '../store/autenticacionStore';
import api from '../servicios/api';

interface KPIState {
  ventasMes: number;
  comprasMes: number;
  stockCriticoCount: number;
  ordenesActivas: number;
}

interface StockCriticoItem {
  id: number;
  sku: string;
  nombre_repuesto: string;
  cantidad_stock: number;
  stock_minimo: number;
  precio_venta: number;
  color?: string;
}

interface Actividad {
  titulo: string;
  detalle: string;
  tiempo: string;
  tipo: string;
}

export default function PanelControl() {
  const navigate = useNavigate();
  const { usuario } = useAutenticacionStore();

  const [loading, setLoading] = useState(true);
  const [kpis, setKpis] = useState<KPIState>({
    ventasMes: 0,
    comprasMes: 0,
    stockCriticoCount: 0,
    ordenesActivas: 0
  });
  const [stockCritico, setStockCritico] = useState<StockCriticoItem[]>([]);
  const [actividades, setActividades] = useState<Actividad[]>([]);

  // Check role restriction: report access only for administrator
  const esAdmin = usuario?.rol === 'administrador';

  useEffect(() => {
    if (!esAdmin) {
      setLoading(false);
      return;
    }

    async function cargarDashboard() {
      try {
        const res = await api.get('/api/reportes/dashboard');
        if (res.ok) {
          const data = await res.json();
          setKpis(data.kpis);
          setStockCritico(data.stockCritico);
          setActividades(data.actividades);
        }
      } catch (err) {
        console.error('Error al cargar datos del dashboard:', err);
      } finally {
        setLoading(false);
      }
    }

    cargarDashboard();
  }, [esAdmin]);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
        <svg className="animate-spin h-8 w-8 text-acento" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
        </svg>
        <p className="text-texto-secundario text-xs uppercase tracking-wider font-semibold">Cargando métricas en tiempo real...</p>
      </div>
    );
  }

  // RENDER 403 ACCESS DENIED FOR NON-ADMIN
  if (!esAdmin) {
    return (
      <div className="space-y-6 max-w-lg mx-auto py-12 animate-in fade-in duration-300">
        <div className="bg-[#1E2433] border border-error/20 p-8 rounded-xl text-center shadow-xl relative overflow-hidden">
          <div className="absolute top-0 left-0 w-full h-1.5 bg-error"></div>
          <div className="inline-flex items-center justify-center w-16 h-16 bg-error/10 text-error rounded-full mb-6">
            <span className="material-symbols-outlined text-4xl">gpp_maybe</span>
          </div>
          <h2 className="font-rajdhani text-2xl font-bold text-texto-principal uppercase tracking-wide">Acceso Restringido</h2>
          <p className="text-texto-secundario text-sm mt-3 leading-relaxed">
            El Panel de Control de reportes, ingresos y analíticas financieras es exclusivo para usuarios con rol de <strong>Administrador</strong>.
          </p>
          <div className="mt-8 pt-6 border-t border-[#2D3748] flex justify-center gap-4">
            <button
              onClick={() => navigate('/ventas')}
              className="px-5 py-2.5 bg-acento hover:bg-acento-hover text-white text-xs font-semibold uppercase tracking-wider rounded-lg transition-colors shadow-md"
            >
              Ir a Ventas
            </button>
            <button
              onClick={() => navigate('/perfil')}
              className="px-5 py-2.5 border border-[#2D3748] text-texto-principal hover:bg-[#161B27] text-xs font-semibold uppercase tracking-wider rounded-lg transition-colors"
            >
              Ver Mi Perfil
            </button>
          </div>
        </div>
      </div>
    );
  }

  // RENDER FULL ADMIN DASHBOARD
  const fallbackActividades = [
    { titulo: 'Sistema Inicializado', detalle: 'Base de datos sembrada e instalada correctamente.', tiempo: new Date().toISOString(), tipo: 'info' }
  ];
  const listaActividades = actividades.length > 0 ? actividades : fallbackActividades;

  const formatearTiempo = (fechaIso: string) => {
    try {
      const d = new Date(fechaIso);
      return d.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' }) + ' ' + d.toLocaleDateString('es-ES', { day: '2-digit', month: 'short' });
    } catch {
      return 'Hace un momento';
    }
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      {/* Dashboard Header */}
      <div className="flex justify-between items-end">
        <div>
          <h2 className="font-rajdhani text-3xl font-bold text-acento uppercase tracking-tight">Panel de Control</h2>
          <p className="text-texto-secundario text-sm">Resumen operativo del sistema industrial de repuestos.</p>
        </div>
        <div className="bg-[#1E2433] border border-[#2D3748] px-4 py-2 flex items-center gap-3 rounded-lg">
          <span className="material-symbols-outlined text-exito animate-pulse">sensors</span>
          <div>
            <p className="text-[10px] text-texto-secundario uppercase leading-none">Estado Sistema</p>
            <p className="font-ibm-plex text-xs font-semibold text-texto-principal mt-1">OPERATIVO</p>
          </div>
        </div>
      </div>

      {/* Metric Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {/* Metric 1 */}
        <div className="bg-[#1E2433] border border-[#2D3748] p-6 rounded-xl hover:border-acento/50 hover:shadow-[0_0_15px_rgba(249,115,22,0.05)] transition-all">
          <div className="flex justify-between items-start mb-4">
            <div className="w-10 h-10 rounded bg-[#F97316]/10 flex items-center justify-center text-acento">
              <span className="material-symbols-outlined">trending_up</span>
            </div>
            <span className="text-exito text-xs font-bold font-ibm-plex">+12.5%</span>
          </div>
          <p className="text-texto-secundario font-ibm-plex text-[10px] uppercase font-bold tracking-wider mb-1">Ventas del Mes</p>
          <h3 className="font-rajdhani text-2xl font-bold text-[#F1F5F9]">${kpis.ventasMes.toFixed(2)}</h3>
          <div className="mt-4 h-1 bg-[#2D3748] rounded-full overflow-hidden">
            <div className="h-full bg-acento w-3/4"></div>
          </div>
        </div>

        {/* Metric 2 */}
        <div className="bg-[#1E2433] border border-[#2D3748] p-6 rounded-xl hover:border-acento/50 hover:shadow-[0_0_15px_rgba(249,115,22,0.05)] transition-all">
          <div className="flex justify-between items-start mb-4">
            <div className="w-10 h-10 rounded bg-[#2D3748] flex items-center justify-center text-texto-secundario">
              <span className="material-symbols-outlined">shopping_bag</span>
            </div>
            <span className="text-texto-secundario text-xs font-bold font-ibm-plex">Base: $85k</span>
          </div>
          <p className="text-texto-secundario font-ibm-plex text-[10px] uppercase font-bold tracking-wider mb-1">Compras Realizadas</p>
          <h3 className="font-rajdhani text-2xl font-bold text-[#F1F5F9]">${kpis.comprasMes.toFixed(2)}</h3>
          <div className="mt-4 h-1 bg-[#2D3748] rounded-full overflow-hidden">
            <div className="h-full bg-info w-1/2"></div>
          </div>
        </div>

        {/* Metric 3 */}
        <div className="bg-[#1E2433] border border-[#2D3748] border-l-4 border-l-error p-6 rounded-xl hover:border-acento/50 hover:shadow-[0_0_15px_rgba(249,115,22,0.05)] transition-all">
          <div className="flex justify-between items-start mb-4">
            <div className="w-10 h-10 rounded bg-error/10 flex items-center justify-center text-error">
              <span className="material-symbols-outlined">warning</span>
            </div>
            <span className="text-error text-xs font-bold font-ibm-plex">CRÍTICO</span>
          </div>
          <p className="text-texto-secundario font-ibm-plex text-[10px] uppercase font-bold tracking-wider mb-1">Stock Crítico</p>
          <h3 className="font-rajdhani text-2xl font-bold text-[#F1F5F9]">{kpis.stockCriticoCount} SKUs</h3>
          <p className="text-[10px] text-texto-secundario mt-2">Requiere reposición inmediata</p>
        </div>

        {/* Metric 4 */}
        <div className="bg-[#1E2433] border border-[#2D3748] p-6 rounded-xl hover:border-acento/50 hover:shadow-[0_0_15px_rgba(249,115,22,0.05)] transition-all">
          <div className="flex justify-between items-start mb-4">
            <div className="w-10 h-10 rounded bg-info/10 flex items-center justify-center text-info">
              <span className="material-symbols-outlined">precision_manufacturing</span>
            </div>
          </div>
          <p className="text-texto-secundario font-ibm-plex text-[10px] uppercase font-bold tracking-wider mb-1">Órdenes Activas</p>
          <h3 className="font-rajdhani text-2xl font-bold text-[#F1F5F9]">{kpis.ordenesActivas}</h3>
          <p className="text-[10px] text-advertencia mt-2 font-semibold">Resumen operativo</p>
        </div>
      </div>

      {/* Main Dashboard Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left Column: Tables and Charts */}
        <div className="lg:col-span-2 space-y-8">
          {/* Stock Crítico Table Widget - Styled strictly under guidelines (Dark frame, light-mode body) */}
          <section className="bg-[#1E2433] border border-[#2D3748] rounded-xl overflow-hidden shadow-lg">
            <div className="p-6 border-b border-[#2D3748] flex justify-between items-center bg-[#161B27]/40">
              <h4 className="font-rajdhani text-lg font-bold text-texto-principal flex items-center gap-2">
                <span className="material-symbols-outlined text-acento">inventory_2</span>
                STOCK CRÍTICO
              </h4>
              <button 
                onClick={() => navigate('/compras')}
                className="text-acento font-ibm-plex text-[10px] uppercase font-bold tracking-wider hover:underline"
              >
                Ver Todo
              </button>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead className="bg-[#161B27] border-b border-[#2D3748]">
                  <tr>
                    <th className="px-6 py-3 font-ibm-plex text-[11px] font-semibold uppercase tracking-wider text-[#94A3B8]">Código / Repuesto</th>
                    <th className="px-6 py-3 font-ibm-plex text-[11px] font-semibold uppercase tracking-wider text-[#94A3B8]">Color</th>
                    <th className="px-6 py-3 font-ibm-plex text-[11px] font-semibold uppercase tracking-wider text-[#94A3B8]">Stock</th>
                    <th className="px-6 py-3 font-ibm-plex text-[11px] font-semibold uppercase tracking-wider text-[#94A3B8]">Acción</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#E2E8F0]">
                  {stockCritico.length > 0 ? (
                    stockCritico.map((item, index) => {
                      const bgClass = index % 2 === 0 ? 'bg-white' : 'bg-[#F8FAFC]';
                      return (
                        <tr key={item.id} className={`${bgClass} hover:bg-[#F1F5F9] transition-colors group`}>
                          <td className="px-6 py-4">
                            <div className="flex items-center gap-3">
                              <div className="w-10 h-10 bg-[#161B27] rounded border border-[#2D3748] flex items-center justify-center">
                                <span className="material-symbols-outlined text-texto-secundario">settings_input_component</span>
                              </div>
                              <div>
                                <p className="font-bold text-texto-datos text-sm">{item.sku}</p>
                                <p className="text-xs text-[#64748B]">{item.nombre_repuesto}</p>
                              </div>
                            </div>
                          </td>
                          <td className="px-6 py-4 font-ibm-plex text-xs font-semibold uppercase text-[#64748B]">
                            {item.color || 'No asignado'}
                          </td>
                          <td className="px-6 py-4">
                            <span className="px-2.5 py-0.5 rounded text-[10px] font-bold bg-red-100 text-red-700">
                              {item.cantidad_stock} UNID (Mín: {item.stock_minimo})
                            </span>
                          </td>
                          <td className="px-6 py-4">
                            <button 
                              onClick={() => navigate('/compras')}
                              className="w-8 h-8 rounded border border-[#CBD5E1] bg-white flex items-center justify-center hover:bg-acento/10 hover:text-acento text-[#64748B] transition-all"
                            >
                              <span className="material-symbols-outlined text-sm">shopping_cart</span>
                            </button>
                          </td>
                        </tr>
                      );
                    })
                  ) : (
                    <tr>
                      <td colSpan={4} className="px-6 py-8 text-center text-[#64748B] bg-white text-xs italic font-semibold">
                        No hay repuestos en stock crítico actualmente.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </section>

          {/* Performance Chart Placeholder */}
          <section className="bg-[#1E2433] border border-[#2D3748] rounded-xl p-6 h-[320px] relative overflow-hidden shadow-lg">
            <div className="flex justify-between items-center mb-8">
              <h4 className="font-rajdhani text-lg font-bold text-texto-principal">RENDIMIENTO DE VENTAS</h4>
              <div className="flex gap-4">
                <span className="flex items-center gap-2 text-xs text-texto-secundario">
                  <span className="w-3 h-3 bg-acento rounded-full"></span> Ventas
                </span>
                <span className="flex items-center gap-2 text-xs text-texto-secundario">
                  <span className="w-3 h-3 bg-info rounded-full"></span> Compras
                </span>
              </div>
            </div>
            {/* Technical Abstract Background for Chart */}
            <div className="absolute inset-x-0 bottom-16 h-36 opacity-20 flex items-end px-12">
              <div className="flex-1 bg-gradient-to-t from-acento to-transparent h-[40%] mx-3 rounded-t"></div>
              <div className="flex-1 bg-gradient-to-t from-info to-transparent h-[60%] mx-3 rounded-t"></div>
              <div className="flex-1 bg-gradient-to-t from-acento to-transparent h-[55%] mx-3 rounded-t"></div>
              <div className="flex-1 bg-gradient-to-t from-info to-transparent h-[80%] mx-3 rounded-t"></div>
              <div className="flex-1 bg-gradient-to-t from-acento to-transparent h-[45%] mx-3 rounded-t"></div>
              <div className="flex-1 bg-gradient-to-t from-info to-transparent h-[90%] mx-3 rounded-t"></div>
              <div className="flex-1 bg-gradient-to-t from-acento to-transparent h-[70%] mx-3 rounded-t"></div>
            </div>
            <div className="absolute bottom-6 left-6 right-6 flex justify-between border-t border-[#2D3748] pt-4 text-[10px] text-texto-secundario font-ibm-plex font-bold tracking-wider">
              <span>LUN</span><span>MAR</span><span>MIE</span><span>JUE</span><span>VIE</span><span>SAB</span><span>DOM</span>
            </div>
            <div className="relative z-10 flex flex-col items-center justify-center h-full pt-12">
              <p className="text-texto-secundario text-xs italic">Visualización técnica de flujo de caja semanal</p>
            </div>
          </section>
        </div>

        {/* Right Column: Recent Activity & Status */}
        <div className="space-y-8">
          {/* Recent Activity */}
          <section className="bg-[#1E2433] border border-[#2D3748] rounded-xl flex flex-col overflow-hidden shadow-lg">
            <div className="p-6 border-b border-[#2D3748] bg-[#161B27]/40">
              <h4 className="font-rajdhani text-lg font-bold text-texto-principal uppercase tracking-tight">Actividad Reciente</h4>
            </div>
            <div className="p-6 space-y-6 flex-1">
              {listaActividades.map((act, index) => (
                <div key={index} className="flex gap-4 relative animate-in slide-in-from-bottom-2 duration-300">
                  {index < listaActividades.length - 1 && (
                    <div className="absolute left-2 top-8 bottom-[-24px] w-px bg-[#2D3748]"></div>
                  )}
                  <div className={`w-4 h-4 rounded-full mt-1.5 z-10 border-4 border-[#1E2433] ${
                    act.tipo === 'success' ? 'bg-exito' :
                    act.tipo === 'warning' ? 'bg-[#F97316]' :
                    act.tipo === 'info' ? 'bg-info' : 'bg-texto-secundario'
                  }`}></div>
                  <div>
                    <p className="text-xs font-bold text-texto-principal">{act.titulo}</p>
                    <p className="text-[11px] text-texto-secundario mt-0.5">{act.detalle}</p>
                    <p className="text-[9px] text-acento mt-1 font-ibm-plex font-bold tracking-wider">
                      {formatearTiempo(act.tiempo)}
                    </p>
                  </div>
                </div>
              ))}
            </div>
            <button className="p-4 text-center text-texto-secundario font-ibm-plex text-[10px] uppercase font-bold tracking-wider hover:bg-[#161B27]/60 transition-colors border-t border-[#2D3748]">
              Ver Log Completo
            </button>
          </section>

          {/* Workshop Status */}
          <section className="bg-[#1E2433] border border-[#2D3748] rounded-xl p-6 bg-gradient-to-br from-[#1E2433] to-[#161B27] shadow-lg border-acento/20">
            <h4 className="font-rajdhani text-lg font-bold text-texto-principal mb-6">ESTADO DE TALLER</h4>
            <div className="space-y-4">
              <div>
                <div className="flex justify-between items-center mb-1.5">
                  <span className="text-xs text-texto-secundario">Bahías Ocupadas</span>
                  <span className="font-ibm-plex text-xs font-bold text-acento">8 / 10</span>
                </div>
                <div className="w-full bg-[#161B27] rounded-full h-1.5 border border-[#2D3748]">
                  <div className="bg-acento h-full rounded-full w-[80%]"></div>
                </div>
              </div>

              <div>
                <div className="flex justify-between items-center mb-1.5">
                  <span className="text-xs text-texto-secundario">Técnicos Activos</span>
                  <span className="font-ibm-plex text-xs font-bold text-info">12 / 15</span>
                </div>
                <div className="w-full bg-[#161B27] rounded-full h-1.5 border border-[#2D3748]">
                  <div className="bg-info h-full rounded-full w-[75%]"></div>
                </div>
              </div>
            </div>

            <div className="mt-8 p-4 bg-[#F97316]/5 border border-[#F97316]/20 rounded-lg">
              <div className="flex items-center gap-3">
                <div className="animate-pulse w-2 h-2 rounded-full bg-acento"></div>
                <p className="text-[10px] text-texto-principal font-bold uppercase tracking-wider">Actualización en tiempo real</p>
              </div>
              <p className="text-[9px] text-texto-secundario mt-1">Sincronizado con RepuestosApp Mobile</p>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
