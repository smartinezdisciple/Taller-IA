import React, { useState } from 'react';
import TablaUniversal from '../componentes/TablaUniversal';

interface RepuestoAlerta {
  sku: string;
  nombre: string;
  categoria: string;
  stock: number;
  estado: 'crítico' | 'reponer';
  imgUrl: string;
}

interface PedidoReciente {
  id: string;
  proveedor: string;
  factura: string;
  itemsCount: number;
  total: number;
  fechaDia: number;
  fechaMes: string;
  estado: 'tránsito' | 'recibido';
}

export default function Compras() {
  const [modalAbierto, setModalAbierto] = useState(false);
  const [alertas, setAlertas] = useState<RepuestoAlerta[]>([
    {
      sku: 'PK-MZ3-002',
      nombre: 'Pistón Kit - Mazda 3',
      categoria: 'Motor',
      stock: 2,
      estado: 'crítico',
      imgUrl: '/imagenes/imagen_10.png'
    },
    {
      sku: 'DF-BRM-88',
      nombre: 'Discos de Freno - Brembo',
      categoria: 'Frenos',
      stock: 8,
      estado: 'reponer',
      imgUrl: '/imagenes/imagen_13.png'
    },
    {
      sku: 'RAD-HVT-X',
      nombre: 'Radiador Reforzado',
      categoria: 'Enfriamiento',
      stock: 1,
      estado: 'crítico',
      imgUrl: '/imagenes/imagen_11.png'
    },
    {
      sku: 'BJ-NGK-IR',
      nombre: 'Bujías Iridium NGK',
      categoria: 'Ignición',
      stock: 15,
      estado: 'reponer',
      imgUrl: '/imagenes/imagen_12.png'
    }
  ]);

  const [pedidos, setPedidos] = useState<PedidoReciente[]>([
    {
      id: '1',
      proveedor: 'Distribuidora Diesel S.A.',
      factura: '#ORD-2024-882',
      itemsCount: 24,
      total: 3420.00,
      fechaDia: 24,
      fechaMes: 'MAY',
      estado: 'tránsito'
    },
    {
      id: '2',
      proveedor: 'Importadora Repuestos J&R',
      factura: '#ORD-2024-875',
      itemsCount: 112,
      total: 12150.50,
      fechaDia: 21,
      fechaMes: 'MAY',
      estado: 'recibido'
    }
  ]);

  const [nuevoPedido, setNuevoPedido] = useState({
    proveedor: '',
    sku: '',
    cantidad: 10,
    precioCosto: 0
  });

  const handleCrearPedido = (e: React.FormEvent) => {
    e.preventDefault();
    const pedido: PedidoReciente = {
      id: Date.now().toString(),
      proveedor: nuevoPedido.proveedor || 'Proveedor Genérico',
      factura: `#ORD-2024-${Math.floor(Math.random() * 900) + 100}`,
      itemsCount: nuevoPedido.cantidad,
      total: nuevoPedido.cantidad * nuevoPedido.precioCosto,
      fechaDia: new Date().getDate(),
      fechaMes: new Date().toLocaleString('es-ES', { month: 'short' }).toUpperCase(),
      estado: 'tránsito'
    };
    setPedidos([pedido, ...pedidos]);
    setModalAbierto(false);
    setNuevoPedido({ proveedor: '', sku: '', cantidad: 10, precioCosto: 0 });
  };

  const headers = ['Repuesto', 'Categoría', 'Stock Act.', 'Estado', 'Acción'];

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      {/* Header Section */}
      <div className="flex justify-between items-end">
        <div>
          <h2 className="font-rajdhani text-3xl font-bold text-acento uppercase tracking-tight">Compras e Inventario</h2>
          <p className="text-texto-secundario text-sm">Supervisión de stock y gestión de pedidos a proveedores.</p>
        </div>
        <div className="flex gap-3">
          <button className="px-4 py-2 border border-[#2D3748] bg-[#1E2433] text-[#F1F5F9] text-xs font-semibold uppercase tracking-wider flex items-center gap-2 hover:bg-[#161B27] transition-all rounded-lg">
            <span className="material-symbols-outlined text-sm">filter_list</span>
            Filtrar
          </button>
          <button
            onClick={() => setModalAbierto(true)}
            className="px-4 py-2 bg-acento text-white text-xs font-semibold uppercase tracking-wider flex items-center gap-2 hover:bg-[#EA6C0A] transition-all rounded-lg shadow-md shadow-acento/20"
          >
            <span className="material-symbols-outlined text-sm">add_shopping_cart</span>
            Nuevo Pedido
          </button>
        </div>
      </div>

      {/* KPI Bento Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-[#1E2433] border border-[#2D3748] p-6 rounded-xl flex flex-col justify-between hover:border-acento/50 transition-colors">
          <div className="flex justify-between items-start">
            <span className="material-symbols-outlined text-acento p-2 bg-acento/10 rounded-lg">inventory_2</span>
            <span className="text-exito font-ibm-plex text-[10px] bg-exito/10 px-2 py-0.5 rounded font-bold">+12%</span>
          </div>
          <div className="mt-4">
            <p className="text-texto-secundario text-[10px] uppercase font-bold tracking-wider font-ibm-plex">Stock Total</p>
            <h3 className="font-rajdhani text-2xl font-bold text-[#F1F5F9] mt-1">
              14,280 <span className="text-xs font-normal text-texto-secundario">unid.</span>
            </h3>
          </div>
        </div>

        <div className="bg-[#1E2433] border border-red-500/30 p-6 rounded-xl flex flex-col justify-between hover:border-error transition-colors">
          <div className="flex justify-between items-start">
            <span className="material-symbols-outlined text-error p-2 bg-error/10 rounded-lg">warning</span>
            <span className="text-error font-ibm-plex text-[10px] bg-error/10 px-2 py-0.5 rounded font-bold">Crítico</span>
          </div>
          <div className="mt-4">
            <p className="text-texto-secundario text-[10px] uppercase font-bold tracking-wider font-ibm-plex">Stock Crítico</p>
            <h3 className="font-rajdhani text-2xl font-bold text-error mt-1">
              12 <span className="text-xs font-normal text-texto-secundario">items</span>
            </h3>
          </div>
        </div>

        <div className="bg-[#1E2433] border border-yellow-500/30 p-6 rounded-xl flex flex-col justify-between hover:border-advertencia transition-colors">
          <div className="flex justify-between items-start">
            <span className="material-symbols-outlined text-advertencia p-2 bg-advertencia/10 rounded-lg">priority_high</span>
            <span className="text-advertencia font-ibm-plex text-[10px] bg-advertencia/10 px-2 py-0.5 rounded font-bold">Aviso</span>
          </div>
          <div className="mt-4">
            <p className="text-texto-secundario text-[10px] uppercase font-bold tracking-wider font-ibm-plex">Reponer Pronto</p>
            <h3 className="font-rajdhani text-2xl font-bold text-advertencia mt-1">
              34 <span className="text-xs font-normal text-texto-secundario">items</span>
            </h3>
          </div>
        </div>

        <div className="bg-[#1E2433] border border-[#2D3748] p-6 rounded-xl flex flex-col justify-between hover:border-acento/50 transition-colors">
          <div className="flex justify-between items-start">
            <span className="material-symbols-outlined text-info p-2 bg-info/10 rounded-lg">local_shipping</span>
            <span className="text-info font-ibm-plex text-[10px] bg-info/10 px-2 py-0.5 rounded font-bold">En curso</span>
          </div>
          <div className="mt-4">
            <p className="text-texto-secundario text-[10px] uppercase font-bold tracking-wider font-ibm-plex">Pedidos Activos</p>
            <h3 className="font-rajdhani text-2xl font-bold text-[#F1F5F9] mt-1">
              8 <span className="text-xs font-normal text-texto-secundario">facturas</span>
            </h3>
          </div>
        </div>
      </div>

      {/* Main Inventory Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Table Section: Inventory Alerts & Orders (col-span-2) */}
        <div className="lg:col-span-2 space-y-6">
          <TablaUniversal<RepuestoAlerta>
            titulo="Repuestos en Alerta"
            subtitulo="Inventario con existencias bajo el límite mínimo de seguridad."
            headers={headers}
            datos={alertas}
            buscarPor={(a) => `${a.nombre} ${a.sku} ${a.categoria}`}
            buscarPlaceholder="Buscar repuesto por nombre o SKU..."
            itemsPorPagina={4}
            renderRow={(item, index, bgClass) => (
              <tr key={item.sku} className={`${bgClass} hover:bg-[#F1F5F9] transition-colors group`}>
                {/* Repuesto */}
                <td className="px-6 py-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded bg-[#161B27] border border-[#2D3748] flex items-center justify-center overflow-hidden">
                      <img
                        alt={item.nombre}
                        className="w-full h-full object-cover opacity-80"
                        src={item.imgUrl}
                      />
                    </div>
                    <div>
                      <p className="font-bold text-texto-datos text-sm">{item.nombre}</p>
                      <p className="text-[10px] text-[#64748B] font-mono uppercase">SKU: {item.sku}</p>
                    </div>
                  </div>
                </td>

                {/* Categoría */}
                <td className="px-6 py-4 text-xs font-semibold text-[#64748B]">
                  {item.categoria}
                </td>

                {/* Stock Act. */}
                <td className="px-6 py-4 font-mono text-sm font-bold text-texto-datos">
                  {item.stock.toString().padStart(2, '0')}
                </td>

                {/* Estado */}
                <td className="px-6 py-4">
                  <span className={`px-2.5 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider ${
                    item.estado === 'crítico'
                      ? 'bg-red-100 text-red-700'
                      : 'bg-yellow-100 text-yellow-700'
                  }`}>
                    {item.estado === 'crítico' ? 'Bajo Crítico' : 'Reponer'}
                  </span>
                </td>

                {/* Acción */}
                <td className="px-6 py-4">
                  <button 
                    onClick={() => {
                      setNuevoPedido({
                        proveedor: '',
                        sku: item.sku,
                        cantidad: 20,
                        precioCosto: 15
                      });
                      setModalAbierto(true);
                    }}
                    className="p-1.5 rounded text-acento hover:bg-acento/10 transition-colors"
                  >
                    <span className="material-symbols-outlined">shopping_cart_checkout</span>
                  </button>
                </td>
              </tr>
            )}
          />

          {/* Recent Orders to Suppliers */}
          <div className="bg-[#1E2433] border border-[#2D3748] rounded-xl overflow-hidden shadow-lg">
            <div className="p-6 border-b border-[#2D3748] flex justify-between items-center bg-[#161B27]/40">
              <h4 className="font-rajdhani text-lg font-bold text-texto-principal">Pedidos Recientes</h4>
              <div className="flex gap-2">
                <span className="text-[9px] px-2 py-0.5 bg-acento/10 text-acento border border-acento/20 rounded font-bold uppercase tracking-wider">
                  En tránsito
                </span>
                <span className="text-[9px] px-2 py-0.5 bg-[#2D3748] text-texto-secundario border border-transparent rounded font-bold uppercase tracking-wider">
                  Recibidos
                </span>
              </div>
            </div>
            <div className="divide-y divide-[#2D3748]">
              {pedidos.map((pedido) => (
                <div key={pedido.id} className="p-6 flex items-center justify-between hover:bg-[#161B27]/40 transition-colors group">
                  <div className="flex items-center gap-6">
                    <div className="text-center bg-[#161B27] border border-[#2D3748] p-2 rounded w-16">
                      <p className="text-[9px] font-ibm-plex font-bold text-texto-secundario">{pedido.fechaMes}</p>
                      <p className="font-rajdhani text-2xl font-bold text-acento leading-none mt-1">{pedido.fechaDia}</p>
                    </div>
                    <div>
                      <h5 className="font-bold text-texto-principal text-sm">{pedido.proveedor}</h5>
                      <p className="text-xs text-texto-secundario">Factura {pedido.factura} | {pedido.itemsCount} Items</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-8">
                    <div className="text-right">
                      <p className="text-sm font-bold text-texto-principal">${pedido.total.toFixed(2)}</p>
                      <p className={`text-[10px] font-bold flex items-center justify-end gap-1 mt-1 ${
                        pedido.estado === 'tránsito' ? 'text-exito' : 'text-texto-secundario'
                      }`}>
                        <span className="material-symbols-outlined text-xs">
                          {pedido.estado === 'tránsito' ? 'local_shipping' : 'check_circle'}
                        </span>
                        {pedido.estado === 'tránsito' ? 'EN TRÁNSITO' : 'RECIBIDO'}
                      </p>
                    </div>
                    <button className="material-symbols-outlined text-texto-secundario group-hover:text-acento transition-colors">
                      chevron_right
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Sidebar Content: Notifications & Health Charts (Right Column) */}
        <div className="space-y-6">
          {/* Health Chart Widget */}
          <div className="bg-[#1E2433] border border-[#2D3748] rounded-xl p-6 relative overflow-hidden group shadow-lg">
            <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
              <span className="material-symbols-outlined text-[100px]">query_stats</span>
            </div>
            <h4 className="font-ibm-plex text-[10px] uppercase font-bold tracking-wider text-texto-secundario mb-4">
              Salud del Inventario
            </h4>
            <div className="relative h-48 w-full flex items-end justify-between gap-3 px-2 mt-4">
              <div className="bg-acento/40 w-full rounded-t-sm relative group/bar" style={{ height: '60%' }}>
                <div className="absolute -top-6 left-1/2 -translate-x-1/2 text-[9px] font-bold opacity-0 group-hover/bar:opacity-100 transition-opacity">60%</div>
              </div>
              <div className="bg-acento/60 w-full rounded-t-sm relative group/bar" style={{ height: '45%' }}>
                <div className="absolute -top-6 left-1/2 -translate-x-1/2 text-[9px] font-bold opacity-0 group-hover/bar:opacity-100 transition-opacity">45%</div>
              </div>
              <div className="bg-acento w-full rounded-t-sm relative group/bar" style={{ height: '85%' }}>
                <div className="absolute -top-6 left-1/2 -translate-x-1/2 text-[9px] font-bold opacity-0 group-hover/bar:opacity-100 transition-opacity">85%</div>
              </div>
              <div className="bg-acento/20 w-full rounded-t-sm relative group/bar" style={{ height: '30%' }}>
                <div className="absolute -top-6 left-1/2 -translate-x-1/2 text-[9px] font-bold opacity-0 group-hover/bar:opacity-100 transition-opacity">30%</div>
              </div>
              <div className="bg-acento/80 w-full rounded-t-sm relative group/bar" style={{ height: '70%' }}>
                <div className="absolute -top-6 left-1/2 -translate-x-1/2 text-[9px] font-bold opacity-0 group-hover/bar:opacity-100 transition-opacity">70%</div>
              </div>
            </div>
            <div className="mt-6 space-y-3">
              <div className="flex justify-between text-xs font-semibold">
                <span className="text-texto-secundario">Disponibilidad</span>
                <span className="text-texto-principal">94.2%</span>
              </div>
              <div className="w-full bg-[#161B27] h-1.5 rounded-full overflow-hidden border border-[#2D3748]">
                <div className="bg-acento h-full w-[94%]"></div>
              </div>
              <p className="text-[10px] text-texto-secundario italic">Actualizado hace 15 minutos</p>
            </div>
          </div>

          {/* Quick Alerts */}
          <div className="space-y-4">
            <h4 className="font-ibm-plex text-[10px] uppercase font-bold tracking-wider text-texto-secundario px-2">
              Notificaciones de Stock
            </h4>
            <div className="flex gap-4 p-4 rounded-xl bg-error/5 border border-error/20">
              <span className="material-symbols-outlined text-error">inventory_2</span>
              <div>
                <p className="text-xs font-bold text-texto-principal leading-tight">Agotamiento Crítico</p>
                <p className="text-[11px] text-texto-secundario mt-1">Aceite 10W40 Sintético se ha agotado en la sucursal Norte.</p>
                <button
                  onClick={() => {
                    setNuevoPedido({ ...nuevoPedido, proveedor: 'Norte Lubricantes', sku: 'AC-10W40-S', cantidad: 50, precioCosto: 8.5 });
                    setModalAbierto(true);
                  }}
                  className="text-error text-[10px] font-bold uppercase mt-2 hover:underline tracking-wider"
                >
                  Solicitar Compra
                </button>
              </div>
            </div>

            <div className="flex gap-4 p-4 rounded-xl bg-advertencia/5 border border-advertencia/20">
              <span className="material-symbols-outlined text-advertencia">schedule</span>
              <div>
                <p className="text-xs font-bold text-texto-principal leading-tight">Retraso en Pedido</p>
                <p className="text-[11px] text-texto-secundario mt-1">El pedido #ORD-2024-882 presenta un retraso de 48h por logística.</p>
                <button className="text-advertencia text-[10px] font-bold uppercase mt-2 hover:underline tracking-wider">
                  Contactar Proveedor
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Modal - Nuevo Pedido */}
      {modalAbierto && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-[#1E2433] border border-[#2D3748] rounded-xl max-w-md w-full shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            <div className="p-6 border-b border-[#2D3748] flex justify-between items-center bg-[#161B27]/40">
              <h3 className="font-rajdhani text-xl font-bold text-acento">Crear Pedido de Reposición</h3>
              <button
                onClick={() => setModalAbierto(false)}
                className="text-texto-secundario hover:text-texto-principal transition-colors"
              >
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>
            <form onSubmit={handleCrearPedido} className="p-6 space-y-4">
              <div className="space-y-1">
                <label className="text-[10px] uppercase font-bold tracking-wider text-texto-secundario">Proveedor</label>
                <input
                  type="text"
                  required
                  value={nuevoPedido.proveedor}
                  onChange={(e) => setNuevoPedido({ ...nuevoPedido, proveedor: e.target.value })}
                  placeholder="Distribuidora Diesel S.A. u otros"
                  className="w-full bg-[#161B27] border border-[#2D3748] rounded-lg text-xs text-texto-principal py-2.5 px-3 focus:border-acento outline-none"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[10px] uppercase font-bold tracking-wider text-texto-secundario">SKU / Repuesto</label>
                <input
                  type="text"
                  required
                  value={nuevoPedido.sku}
                  onChange={(e) => setNuevoPedido({ ...nuevoPedido, sku: e.target.value })}
                  placeholder="Ej. PK-MZ3-002"
                  className="w-full bg-[#161B27] border border-[#2D3748] rounded-lg text-xs text-texto-principal py-2.5 px-3 focus:border-acento outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-[10px] uppercase font-bold tracking-wider text-texto-secundario">Cantidad</label>
                  <input
                    type="number"
                    min="1"
                    required
                    value={nuevoPedido.cantidad}
                    onChange={(e) => setNuevoPedido({ ...nuevoPedido, cantidad: parseInt(e.target.value) || 1 })}
                    className="w-full bg-[#161B27] border border-[#2D3748] rounded-lg text-xs text-texto-principal py-2.5 px-3 focus:border-acento outline-none"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] uppercase font-bold tracking-wider text-texto-secundario">Precio Unit. (Costo)</label>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    required
                    value={nuevoPedido.precioCosto}
                    onChange={(e) => setNuevoPedido({ ...nuevoPedido, precioCosto: parseFloat(e.target.value) || 0 })}
                    className="w-full bg-[#161B27] border border-[#2D3748] rounded-lg text-xs text-texto-principal py-2.5 px-3 focus:border-acento outline-none"
                  />
                </div>
              </div>

              <div className="pt-4 border-t border-[#2D3748] flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setModalAbierto(false)}
                  className="px-4 py-2 rounded-lg border border-[#2D3748] text-[#F1F5F9] text-xs font-semibold uppercase tracking-wider hover:bg-[#161B27] transition-all"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-lg bg-acento text-white text-xs font-semibold uppercase tracking-wider hover:bg-[#EA6C0A] transition-all"
                >
                  Crear Pedido
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
