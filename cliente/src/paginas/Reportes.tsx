import React, { useState, useEffect } from 'react';
import { useAutenticacionStore } from '../store/autenticacionStore';
import api from '../servicios/api';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  Cell,
  PieChart,
  Pie
} from 'recharts';

interface VentasMes {
  mes: string;
  total_ventas: number;
  ingresos_totales: string | number;
  ticket_promedio: string | number;
}

interface TopRepuesto {
  id: number;
  sku: string;
  nombre_repuesto: string;
  unidades_vendidas: number;
  ingresos_totales: number;
}

interface MejorCliente {
  id: number;
  nombres: string;
  apellidos: string;
  monto_total: number;
  total_compras: number;
}

interface StockBajo {
  id: number;
  sku: string;
  nombre_repuesto: string;
  nombre_marca: string;
  cantidad_stock: number;
  stock_minimo: number;
  precio_venta: string | number;
}

export default function Reportes() {
  const { usuario } = useAutenticacionStore();
  const isAdmin = usuario?.rol === 'administrador';

  // State Date Filters (Default to 12 months ago to today)
  const getOneYearAgo = () => {
    const d = new Date();
    d.setFullYear(d.getFullYear() - 1);
    return d.toISOString().split('T')[0];
  };
  const getToday = () => {
    return new Date().toISOString().split('T')[0];
  };

  const [desde, setDesde] = useState(getOneYearAgo());
  const [hasta, setHasta] = useState(getToday());

  // Report Data States
  const [ventasMensuales, setVentasMensuales] = useState<VentasMes[]>([]);
  const [topRepuestos, setTopRepuestos] = useState<TopRepuesto[]>([]);
  const [mejoresClientes, setMejoresClientes] = useState<MejorCliente[]>([]);
  const [stockBajo, setStockBajo] = useState<StockBajo[]>([]);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Fetch report data
  const fetchReportes = async () => {
    if (!isAdmin) return;
    setLoading(true);
    setError('');
    try {
      // 1. Ventas por mes (no date range needed as it returns last 12 months)
      const resVentasMes = await api.get('/api/reportes/ventas-por-mes');
      // 2. Top repuestos (with date range)
      const resTopRepuestos = await api.get(`/api/reportes/top-repuestos?desde=${desde}&hasta=${hasta}`);
      // 3. Mejores clientes (with date range)
      const resMejoresClientes = await api.get(`/api/reportes/mejores-clientes?desde=${desde}&hasta=${hasta}`);
      // 4. Stock bajo
      const resStockBajo = await api.get('/api/reportes/stock-bajo');

      if (resVentasMes.ok && resTopRepuestos.ok && resMejoresClientes.ok && resStockBajo.ok) {
        const dVentasMes = await resVentasMes.json();
        const dTopRepuestos = await resTopRepuestos.json();
        const dMejoresClientes = await resMejoresClientes.json();
        const dStockBajo = await resStockBajo.json();

        // Map and sort monthly sales data chronologically for Recharts
        const ventasMapeadas = dVentasMes
          .map((v: any) => ({
            ...v,
            ingresos: parseFloat(v.ingresos_totales as string || '0')
          }))
          .reverse();

        setVentasMensuales(ventasMapeadas);
        setTopRepuestos(dTopRepuestos);
        setMejoresClientes(dMejoresClientes);
        setStockBajo(dStockBajo);
      } else {
        setError('Error al obtener la información de reportería del servidor.');
      }
    } catch (err) {
      console.error('[Fetch Reportes Error]:', err);
      setError('Error de conexión al cargar reportes.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReportes();
  }, [desde, hasta]);

  if (!isAdmin) {
    return (
      <div className="flex flex-col items-center justify-center h-[60vh] text-center p-6 space-y-4">
        <span className="material-symbols-outlined text-6xl text-red-500">gpp_bad</span>
        <h2 className="text-2xl font-rajdhani font-bold text-white uppercase">Acceso Denegado</h2>
        <p className="text-[#94A3B8] max-w-md text-sm">
          Este módulo está restringido exclusivamente a usuarios con rol de administrador.
        </p>
      </div>
    );
  }

  // Aggregate stats
  const totalIngresosPeriodo = ventasMensuales.reduce((acc, v) => acc + (v.ingresos_totales as number), 0);
  const totalVentasPeriodo = ventasMensuales.reduce((acc, v) => acc + parseInt(v.total_ventas as any), 0);

  // Custom tooltips styling for dark mode
  const customTooltipStyle = {
    backgroundColor: '#1E2433',
    border: '1px solid #2D3748',
    borderRadius: '8px',
    color: '#F1F5F9',
    fontFamily: 'IBM Plex Sans, sans-serif',
    fontSize: '12px'
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-500 font-ibm-plex">
      {/* Header Section */}
      <div className="flex flex-col md:flex-row md:justify-between md:items-end gap-4">
        <div>
          <h2 className="font-rajdhani text-3xl font-bold text-[#F97316] uppercase tracking-tight">Estadísticas y Reportes</h2>
          <p className="text-[#94A3B8] text-sm">Dashboard corporativo de rendimiento de ventas, catálogo y clientes.</p>
        </div>

        {/* Date Filters Container */}
        <div className="flex items-center gap-3 bg-[#1E2433] border border-[#2D3748] p-3 rounded-xl">
          <div className="flex items-center gap-2">
            <span className="text-[10px] uppercase font-bold text-[#94A3B8]">Desde:</span>
            <input
              type="date"
              value={desde}
              onChange={(e) => setDesde(e.target.value)}
              className="bg-[#161B27] border border-[#2D3748] text-xs text-white rounded-lg p-1.5 focus:border-[#F97316] outline-none"
            />
          </div>
          <div className="flex items-center gap-2">
            <span className="text-[10px] uppercase font-bold text-[#94A3B8]">Hasta:</span>
            <input
              type="date"
              value={hasta}
              onChange={(e) => setHasta(e.target.value)}
              className="bg-[#161B27] border border-[#2D3748] text-xs text-white rounded-lg p-1.5 focus:border-[#F97316] outline-none"
            />
          </div>
        </div>
      </div>

      {error && (
        <div className="p-4 bg-red-500/10 border border-red-500/30 rounded-xl text-sm text-red-400 font-semibold flex items-center gap-2">
          <span className="material-symbols-outlined text-lg">error</span>
          {error}
        </div>
      )}

      {/* KPI Bento Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-[#1E2433] border border-[#2D3748] p-6 rounded-xl flex flex-col justify-between hover:border-[#F97316]/50 transition-colors">
          <div className="flex justify-between items-start">
            <span className="material-symbols-outlined text-[#F97316] p-2 bg-[#F97316]/10 rounded-lg">monetization_on</span>
          </div>
          <div className="mt-4">
            <p className="text-[#94A3B8] text-[10px] uppercase font-bold tracking-wider">Ingresos del Año</p>
            <h3 className="font-rajdhani text-2xl font-bold text-[#F1F5F9] mt-1">
              ${totalIngresosPeriodo.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </h3>
          </div>
        </div>

        <div className="bg-[#1E2433] border border-[#2D3748] p-6 rounded-xl flex flex-col justify-between hover:border-[#F97316]/50 transition-colors">
          <div className="flex justify-between items-start">
            <span className="material-symbols-outlined text-blue-400 p-2 bg-blue-400/10 rounded-lg">receipt_long</span>
          </div>
          <div className="mt-4">
            <p className="text-[#94A3B8] text-[10px] uppercase font-bold tracking-wider">Transacciones de Venta</p>
            <h3 className="font-rajdhani text-2xl font-bold text-[#F1F5F9] mt-1">
              {totalVentasPeriodo} <span className="text-xs font-normal text-[#94A3B8]">facturas</span>
            </h3>
          </div>
        </div>

        <div className="bg-[#1E2433] border border-[#2D3748] p-6 rounded-xl flex flex-col justify-between hover:border-[#F97316]/50 transition-colors">
          <div className="flex justify-between items-start">
            <span className="material-symbols-outlined text-purple-400 p-2 bg-purple-400/10 rounded-lg">group</span>
          </div>
          <div className="mt-4">
            <p className="text-[#94A3B8] text-[10px] uppercase font-bold tracking-wider">Clientes Activos</p>
            <h3 className="font-rajdhani text-2xl font-bold text-[#F1F5F9] mt-1">
              {mejoresClientes.length} <span className="text-xs font-normal text-[#94A3B8]">registros</span>
            </h3>
          </div>
        </div>

        <div className="bg-[#1E2433] border border-red-500/30 p-6 rounded-xl flex flex-col justify-between hover:border-red-500 transition-colors">
          <div className="flex justify-between items-start">
            <span className="material-symbols-outlined text-red-500 p-2 bg-red-500/10 rounded-lg">report_problem</span>
          </div>
          <div className="mt-4">
            <p className="text-[#94A3B8] text-[10px] uppercase font-bold tracking-wider">Repuestos Stock Bajo</p>
            <h3 className="font-rajdhani text-2xl font-bold text-red-500 mt-1">
              {stockBajo.length} <span className="text-xs font-normal text-[#94A3B8]">ítems</span>
            </h3>
          </div>
        </div>
      </div>

      {loading ? (
        <div className="bg-[#1E2433] border border-[#2D3748] rounded-xl p-12 text-center text-[#94A3B8] italic animate-pulse">
          Cargando métricas y gráficos del taller...
        </div>
      ) : (
        <div className="space-y-8 animate-in fade-in duration-300">
          {/* Section: Monthly Sales Trend Chart */}
          <div className="bg-[#1E2433] border border-[#2D3748] rounded-xl p-6 shadow-lg">
            <div className="mb-6">
              <h3 className="font-rajdhani text-lg font-bold text-white uppercase tracking-wider">Historial de Ventas Mensuales</h3>
              <p className="text-xs text-[#94A3B8]">Resumen comercial de ingresos y promedio transaccional.</p>
            </div>
            <div className="h-80 w-full">
              {ventasMensuales.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={ventasMensuales} margin={{ top: 10, right: 10, left: 10, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#2D3748" />
                    <XAxis dataKey="mes" stroke="#94A3B8" fontSize={11} />
                    <YAxis stroke="#94A3B8" fontSize={11} />
                    <Tooltip contentStyle={customTooltipStyle} cursor={{ fill: 'rgba(255,255,255,0.05)' }} />
                    <Legend wrapperStyle={{ fontSize: '12px' }} />
                    <Bar name="Ingresos Totales ($)" dataKey="ingresos" fill="#F97316" radius={[4, 4, 0, 0]} />
                    <Bar name="Ventas Realizadas" dataKey="total_ventas" fill="#3B82F6" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-full flex items-center justify-center text-[#94A3B8] italic">No hay ventas registradas.</div>
              )}
            </div>
          </div>

          {/* Grid Layout: Top Repuestos and Mejores Clientes */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Top Repuestos Chart and Table */}
            <div className="bg-[#1E2433] border border-[#2D3748] rounded-xl p-6 shadow-lg space-y-6">
              <div>
                <h3 className="font-rajdhani text-lg font-bold text-white uppercase tracking-wider">Repuestos Más Vendidos</h3>
                <p className="text-xs text-[#94A3B8]">Artículos de mayor demanda y rotación en el periodo.</p>
              </div>

              {/* Chart */}
              <div className="h-64 w-full">
                {topRepuestos.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={topRepuestos.slice(0, 5)} layout="vertical" margin={{ top: 5, right: 10, left: 20, bottom: 5 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#2D3748" />
                      <XAxis type="number" stroke="#94A3B8" fontSize={10} />
                      <YAxis dataKey="nombre_repuesto" type="category" stroke="#94A3B8" fontSize={9} width={120} />
                      <Tooltip contentStyle={customTooltipStyle} />
                      <Bar name="Unidades" dataKey="unidades_vendidas" fill="#10B981" radius={[0, 4, 4, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="h-full flex items-center justify-center text-[#94A3B8] italic">Sin registros de ventas.</div>
                )}
              </div>

              {/* Table */}
              <div className="overflow-x-auto rounded-lg border border-[#2D3748] bg-[#161B27]/40">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="bg-[#161B27] border-b border-[#2D3748]">
                      <th className="px-4 py-2.5 text-[#94A3B8] font-bold">Repuesto</th>
                      <th className="px-4 py-2.5 text-[#94A3B8] font-bold">SKU</th>
                      <th className="px-4 py-2.5 text-[#94A3B8] font-bold text-center">Unidades</th>
                      <th className="px-4 py-2.5 text-[#94A3B8] font-bold text-right">Ingresos</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#2D3748] text-slate-300">
                    {topRepuestos.slice(0, 5).map((rep) => (
                      <tr key={rep.id} className="hover:bg-white/5 transition-colors">
                        <td className="px-4 py-2 font-medium">{rep.nombre_repuesto}</td>
                        <td className="px-4 py-2 font-mono text-[10px] text-[#94A3B8]">{rep.sku}</td>
                        <td className="px-4 py-2 text-center font-bold text-white">{rep.unidades_vendidas}</td>
                        <td className="px-4 py-2 text-right font-bold text-[#F97316]">${parseFloat(rep.ingresos_totales as any).toFixed(2)}</td>
                      </tr>
                    ))}
                    {topRepuestos.length === 0 && (
                      <tr>
                        <td colSpan={4} className="px-4 py-6 text-center text-[#94A3B8] italic">No hay información disponible.</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Mejores Clientes Chart and Table */}
            <div className="bg-[#1E2433] border border-[#2D3748] rounded-xl p-6 shadow-lg space-y-6">
              <div>
                <h3 className="font-rajdhani text-lg font-bold text-white uppercase tracking-wider">Mejores Clientes</h3>
                <p className="text-xs text-[#94A3B8]">Clientes con mayor volumen e ingresos agregados.</p>
              </div>

              {/* Chart */}
              <div className="h-64 w-full">
                {mejoresClientes.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={mejoresClientes.slice(0, 5)} margin={{ top: 10, right: 15, left: 10, bottom: 5 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#2D3748" />
                      <XAxis dataKey="nombres" stroke="#94A3B8" fontSize={11} />
                      <YAxis stroke="#94A3B8" fontSize={11} />
                      <Tooltip contentStyle={customTooltipStyle} />
                      <Bar name="Monto Comprado ($)" dataKey="monto_total" fill="#8B5CF6" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="h-full flex items-center justify-center text-[#94A3B8] italic">Sin registros.</div>
                )}
              </div>

              {/* Table */}
              <div className="overflow-x-auto rounded-lg border border-[#2D3748] bg-[#161B27]/40">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="bg-[#161B27] border-b border-[#2D3748]">
                      <th className="px-4 py-2.5 text-[#94A3B8] font-bold">Cliente</th>
                      <th className="px-4 py-2.5 text-[#94A3B8] font-bold text-center">Compras</th>
                      <th className="px-4 py-2.5 text-[#94A3B8] font-bold text-right">Monto Total</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#2D3748] text-slate-300">
                    {mejoresClientes.slice(0, 5).map((cli) => (
                      <tr key={cli.id} className="hover:bg-white/5 transition-colors">
                        <td className="px-4 py-2 font-medium">{cli.nombres} {cli.apellidos}</td>
                        <td className="px-4 py-2 text-center font-semibold text-white">{cli.total_compras}</td>
                        <td className="px-4 py-2 text-right font-bold text-[#F97316]">${parseFloat(cli.monto_total as any).toFixed(2)}</td>
                      </tr>
                    ))}
                    {mejoresClientes.length === 0 && (
                      <tr>
                        <td colSpan={3} className="px-4 py-6 text-center text-[#94A3B8] italic">No hay información disponible.</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          {/* Section: Stock Crítico General Table */}
          <div className="bg-[#1E2433] border border-red-500/30 rounded-xl p-6 shadow-lg space-y-4">
            <div>
              <h3 className="font-rajdhani text-lg font-bold text-red-500 uppercase tracking-wider flex items-center gap-2">
                <span className="material-symbols-outlined text-lg">warning</span>
                Inventario Crítico Detectado
              </h3>
              <p className="text-xs text-[#94A3B8]">Artículos que requieren reposición debido a existencias iguales o menores al mínimo parametrizado.</p>
            </div>
            <div className="overflow-x-auto rounded-lg border border-[#2D3748] bg-[#161B27]/40">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-[#161B27] border-b border-[#2D3748]">
                    <th className="px-4 py-3 text-[#94A3B8] font-bold">Repuesto</th>
                    <th className="px-4 py-3 text-[#94A3B8] font-bold">SKU</th>
                    <th className="px-4 py-3 text-[#94A3B8] font-bold">Marca Vehículo</th>
                    <th className="px-4 py-3 text-[#94A3B8] font-bold text-center">Stock Actual</th>
                    <th className="px-4 py-3 text-[#94A3B8] font-bold text-center">Stock Mínimo</th>
                    <th className="px-4 py-3 text-[#94A3B8] font-bold text-right">Precio Venta</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#2D3748] text-slate-300">
                  {stockBajo.map((item) => (
                    <tr key={item.id} className="hover:bg-red-500/5 transition-colors">
                      <td className="px-4 py-3 font-semibold text-white">{item.nombre_repuesto}</td>
                      <td className="px-4 py-3 font-mono text-[10px] text-[#94A3B8]">{item.sku}</td>
                      <td className="px-4 py-3">{item.nombre_marca}</td>
                      <td className="px-4 py-3 text-center">
                        <span className="px-2 py-0.5 bg-red-500/10 text-red-400 border border-red-500/20 rounded font-bold">
                          {item.cantidad_stock} und.
                        </span>
                      </td>
                      <td className="px-4 py-3 text-center font-bold">{item.stock_minimo} und.</td>
                      <td className="px-4 py-3 text-right font-bold text-white">${parseFloat(item.precio_venta as any).toFixed(2)}</td>
                    </tr>
                  ))}
                  {stockBajo.length === 0 && (
                    <tr>
                      <td colSpan={6} className="px-4 py-8 text-center text-green-400 font-semibold">
                        ✓ Todos los repuestos disponen de stock saludable superior al mínimo.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
