import React, { useState, useEffect } from 'react';
import { useAutenticacionStore } from '../store/autenticacionStore';
import api from '../servicios/api';
import TablaUniversal from '../componentes/TablaUniversal';

interface Proveedor {
  id: number;
  nombre_empresa: string;
  ruc: string | null;
  email: string | null;
  telefono: string | null;
  creado_en: string;
}

interface OrdenCompra {
  id: number;
  numero_orden: string;
  id_proveedor: number;
  nombre_empresa: string;
  estado: 'pendiente' | 'aprobado' | 'recibido' | 'cancelado';
  creador_nombre: string;
  aprobador_nombre: string | null;
  fecha_recibida: string | null;
  creado_en: string;
  ruc?: string | null;
  email?: string | null;
}

interface DetalleOrden {
  id: number;
  id_orden: number;
  id_repuesto: number;
  nombre_repuesto: string;
  sku: string;
  cantidad: number;
  precio_costo: string | number;
  subtotal_linea: string | number;
}

interface Repuesto {
  id: number;
  sku: string;
  nombre_repuesto: string;
  cantidad_stock: number;
  stock_minimo: number;
  precio_costo: string | number;
}

export default function Compras() {
  const { usuario } = useAutenticacionStore();
  const isAdmin = usuario?.rol === 'administrador';

  // Tabs: 'pedidos' | 'proveedores'
  const [tabActiva, setTabActiva] = useState<'pedidos' | 'proveedores'>('pedidos');

  // Lists
  const [proveedores, setProveedores] = useState<Proveedor[]>([]);
  const [ordenes, setOrdenes] = useState<OrdenCompra[]>([]);
  const [repuestos, setRepuestos] = useState<Repuesto[]>([]);
  const [alertas, setAlertas] = useState<Repuesto[]>([]);

  // Search & Pagination
  const [filtroEstado, setFiltroEstado] = useState('');
  const [paginaOrdenes, setPaginaOrdenes] = useState(1);
  const [totalOrdenes, setTotalOrdenes] = useState(0);
  const limiteOrdenes = 10;

  const [loading, setLoading] = useState(false);

  // Modals state
  const [modalPedidoOpen, setModalPedidoOpen] = useState(false);
  const [modalProveedorOpen, setModalProveedorOpen] = useState(false);
  const [modalDetalleOpen, setModalDetalleOpen] = useState(false);

  // Form states - Nuevo Pedido
  const [selectedProveedorId, setSelectedProveedorId] = useState('');
  const [pedidoItems, setPedidoItems] = useState<{ id_repuesto: number; cantidad: number; precio_costo: number }[]>([]);
  // Temp item form
  const [tempRepuestoId, setTempRepuestoId] = useState('');
  const [tempCantidad, setTempCantidad] = useState('10');
  const [tempCosto, setTempCosto] = useState('0.00');

  // Form states - Proveedor CRUD
  const [formProveedor, setFormProveedor] = useState({
    id: null as number | null,
    nombre_empresa: '',
    ruc: '',
    email: '',
    telefono: ''
  });

  // Selected Order for Details
  const [selectedOrder, setSelectedOrder] = useState<OrdenCompra | null>(null);
  const [selectedOrderDetails, setSelectedOrderDetails] = useState<DetalleOrden[]>([]);

  // Error messages
  const [formError, setFormError] = useState('');

  // Fetch Providers
  const fetchProveedores = async () => {
    try {
      const res = await api.get('/api/proveedores');
      if (res.ok) {
        const data = await res.json();
        setProveedores(data);
      }
    } catch (err) {
      console.error('Error fetching proveedores:', err);
    }
  };

  // Fetch Parts Catalog
  const fetchRepuestos = async () => {
    try {
      const res = await api.get('/api/repuestos?limite=100');
      if (res.ok) {
        const data = await res.json();
        setRepuestos(data.repuestos);
        // Filter alerts (stock <= stock_minimo)
        const lowStock = data.repuestos.filter((r: Repuesto) => r.cantidad_stock <= r.stock_minimo);
        setAlertas(lowStock);
      }
    } catch (err) {
      console.error('Error fetching repuestos:', err);
    }
  };

  // Fetch Purchase Orders
  const fetchOrdenes = async () => {
    setLoading(true);
    try {
      const estadoParam = filtroEstado ? `&estado=${filtroEstado}` : '';
      const res = await api.get(`/api/ordenes?pagina=${paginaOrdenes}&limite=${limiteOrdenes}${estadoParam}`);
      if (res.ok) {
        const data = await res.json();
        setOrdenes(data.ordenes);
        setTotalOrdenes(data.total);
      }
    } catch (err) {
      console.error('Error fetching ordenes:', err);
    } finally {
      setLoading(false);
    }
  };

  // Fetch single order details
  const fetchOrderDetails = async (id: number) => {
    try {
      const res = await api.get(`/api/ordenes/${id}`);
      if (res.ok) {
        const data = await res.json();
        setSelectedOrder(data);
        setSelectedOrderDetails(data.items || []);
      }
    } catch (err) {
      console.error('Error fetching order details:', err);
    }
  };

  useEffect(() => {
    fetchProveedores();
    fetchRepuestos();
  }, []);

  useEffect(() => {
    fetchOrdenes();
  }, [paginaOrdenes, filtroEstado]);

  // Handle create order submit
  const handleCrearOrden = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');

    if (!selectedProveedorId) {
      setFormError('Debe seleccionar un proveedor.');
      return;
    }

    if (pedidoItems.length === 0) {
      setFormError('Debe agregar al menos un repuesto a la orden.');
      return;
    }

    const payload = {
      id_proveedor: parseInt(selectedProveedorId),
      items: pedidoItems
    };

    try {
      const res = await api.post('/api/ordenes', payload);
      if (res.ok) {
        setModalPedidoOpen(false);
        // Reset form
        setSelectedProveedorId('');
        setPedidoItems([]);
        fetchOrdenes();
        fetchRepuestos(); // refresh stocks if any change, though order is pending
      } else {
        const data = await res.json();
        setFormError(data.mensaje || 'Error al crear la orden de compra.');
      }
    } catch (err) {
      setFormError('Error de conexión al servidor.');
    }
  };

  // Handle add item to order cart
  const handleAddItemToCart = () => {
    if (!tempRepuestoId) return;
    const rId = parseInt(tempRepuestoId);
    const cant = parseInt(tempCantidad);
    const cost = parseFloat(tempCosto);

    if (isNaN(cant) || cant <= 0) {
      alert('La cantidad debe ser mayor a 0');
      return;
    }
    if (isNaN(cost) || cost < 0) {
      alert('El precio de costo debe ser mayor o igual a 0');
      return;
    }

    // Check if duplicate
    const existsIdx = pedidoItems.findIndex(item => item.id_repuesto === rId);
    if (existsIdx > -1) {
      const updated = [...pedidoItems];
      updated[existsIdx].cantidad += cant;
      setPedidoItems(updated);
    } else {
      setPedidoItems([...pedidoItems, { id_repuesto: rId, cantidad: cant, precio_costo: cost }]);
    }

    // Reset temp inputs
    setTempRepuestoId('');
    setTempCantidad('10');
    setTempCosto('0.00');
  };

  // Remove item from order cart
  const handleRemoveItemFromCart = (index: number) => {
    setPedidoItems(pedidoItems.filter((_, idx) => idx !== index));
  };

  // Transition Order State
  const handleTransitionState = async (newEstado: 'aprobado' | 'recibido' | 'cancelado') => {
    if (!selectedOrder) return;

    if (!window.confirm(`¿Está seguro de cambiar el estado de la orden a "${newEstado.toUpperCase()}"?`)) {
      return;
    }

    try {
      const res = await api.put(`/api/ordenes/${selectedOrder.id}/estado`, { estado: newEstado });
      if (res.ok) {
        const updated = await res.json();
        setSelectedOrder({ ...selectedOrder, estado: updated.estado });
        fetchOrdenes();
        fetchRepuestos(); // Reload catalog to reflect updated stocks/costs if received
        setModalDetalleOpen(false);
        alert(`La orden se actualizó exitosamente a: ${newEstado}`);
      } else {
        const err = await res.json();
        alert(err.mensaje || 'Error al cambiar el estado de la orden.');
      }
    } catch (err) {
      alert('Error de conexión con el servidor.');
    }
  };

  // Submit Supplier Form (Create or Edit)
  const handleSubmitProveedor = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');

    if (!formProveedor.nombre_empresa) {
      setFormError('El nombre de la empresa es requerido.');
      return;
    }

    const payload = {
      nombre_empresa: formProveedor.nombre_empresa,
      ruc: formProveedor.ruc || null,
      email: formProveedor.email || null,
      telefono: formProveedor.telefono || null
    };

    try {
      let res;
      if (formProveedor.id) {
        res = await api.put(`/api/proveedores/${formProveedor.id}`, payload);
      } else {
        res = await api.post('/api/proveedores', payload);
      }

      if (res.ok) {
        setModalProveedorOpen(false);
        fetchProveedores();
      } else {
        const data = await res.json();
        setFormError(data.mensaje || 'Error al guardar proveedor.');
      }
    } catch (err) {
      setFormError('Error de conexión con el servidor.');
    }
  };

  // Open Edit Supplier
  const handleOpenEditProveedor = (p: Proveedor) => {
    setFormError('');
    setFormProveedor({
      id: p.id,
      nombre_empresa: p.nombre_empresa,
      ruc: p.ruc || '',
      email: p.email || '',
      telefono: p.telefono || ''
    });
    setModalProveedorOpen(true);
  };

  // Open Create Supplier
  const handleOpenCreateProveedor = () => {
    setFormError('');
    setFormProveedor({
      id: null,
      nombre_empresa: '',
      ruc: '',
      email: '',
      telefono: ''
    });
    setModalProveedorOpen(true);
  };

  // Calculate order total cart
  const calculateCartTotal = () => {
    return pedidoItems.reduce((acc, item) => {
      return acc + (item.cantidad * item.precio_costo);
    }, 0);
  };

  // KPIs
  const totalStock = repuestos.reduce((acc, r) => acc + r.cantidad_stock, 0);
  const criticosCount = alertas.length;
  const reponerCount = repuestos.filter(r => r.cantidad_stock > r.stock_minimo && r.cantidad_stock <= r.stock_minimo + 5).length;
  const pedidosActivosCount = ordenes.filter(o => o.estado === 'pendiente' || o.estado === 'aprobado').length;

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      {/* Header Section */}
      <div className="flex justify-between items-end">
        <div>
          <h2 className="font-rajdhani text-3xl font-bold text-[#F97316] uppercase tracking-tight">Compras e Inventario</h2>
          <p className="text-[#94A3B8] text-sm">Supervisión de stock y gestión de pedidos a proveedores.</p>
        </div>
        <div className="flex gap-3">
          {tabActiva === 'proveedores' && isAdmin && (
            <button
              onClick={handleOpenCreateProveedor}
              className="px-4 py-2 bg-[#F97316] text-white text-xs font-semibold uppercase tracking-wider flex items-center gap-2 hover:bg-[#EA6C0A] transition-all rounded-lg shadow-md shadow-[#F97316]/20 font-ibm-plex"
            >
              <span className="material-symbols-outlined text-sm">person_add</span>
              Nuevo Proveedor
            </button>
          )}
          <button
            onClick={() => {
              setSelectedProveedorId('');
              setPedidoItems([]);
              setModalPedidoOpen(true);
            }}
            className="px-4 py-2 bg-[#F97316] text-white text-xs font-semibold uppercase tracking-wider flex items-center gap-2 hover:bg-[#EA6C0A] transition-all rounded-lg shadow-md shadow-[#F97316]/20 font-ibm-plex"
          >
            <span className="material-symbols-outlined text-sm">add_shopping_cart</span>
            Nuevo Pedido
          </button>
        </div>
      </div>

      {/* KPI Bento Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-[#1E2433] border border-[#2D3748] p-6 rounded-xl flex flex-col justify-between hover:border-[#F97316]/50 transition-colors">
          <div className="flex justify-between items-start">
            <span className="material-symbols-outlined text-[#F97316] p-2 bg-[#F97316]/10 rounded-lg">inventory_2</span>
          </div>
          <div className="mt-4 font-ibm-plex">
            <p className="text-[#94A3B8] text-[10px] uppercase font-bold tracking-wider">Stock Total</p>
            <h3 className="font-rajdhani text-2xl font-bold text-[#F1F5F9] mt-1">
              {totalStock.toLocaleString()} <span className="text-xs font-normal text-[#94A3B8]">unid.</span>
            </h3>
          </div>
        </div>

        <div className="bg-[#1E2433] border border-red-500/30 p-6 rounded-xl flex flex-col justify-between hover:border-red-500 transition-colors">
          <div className="flex justify-between items-start">
            <span className="material-symbols-outlined text-red-500 p-2 bg-red-500/10 rounded-lg">warning</span>
            <span className="text-red-500 font-ibm-plex text-[10px] bg-red-500/10 px-2 py-0.5 rounded font-bold">Crítico</span>
          </div>
          <div className="mt-4 font-ibm-plex">
            <p className="text-[#94A3B8] text-[10px] uppercase font-bold tracking-wider">Stock Crítico</p>
            <h3 className="font-rajdhani text-2xl font-bold text-red-500 mt-1">
              {criticosCount} <span className="text-xs font-normal text-[#94A3B8]">items</span>
            </h3>
          </div>
        </div>

        <div className="bg-[#1E2433] border border-yellow-500/30 p-6 rounded-xl flex flex-col justify-between hover:border-yellow-500 transition-colors">
          <div className="flex justify-between items-start">
            <span className="material-symbols-outlined text-yellow-500 p-2 bg-yellow-500/10 rounded-lg">priority_high</span>
            <span className="text-yellow-500 font-ibm-plex text-[10px] bg-yellow-500/10 px-2 py-0.5 rounded font-bold">Aviso</span>
          </div>
          <div className="mt-4 font-ibm-plex">
            <p className="text-[#94A3B8] text-[10px] uppercase font-bold tracking-wider">Reponer Pronto</p>
            <h3 className="font-rajdhani text-2xl font-bold text-yellow-500 mt-1">
              {reponerCount} <span className="text-xs font-normal text-[#94A3B8]">items</span>
            </h3>
          </div>
        </div>

        <div className="bg-[#1E2433] border border-[#2D3748] p-6 rounded-xl flex flex-col justify-between hover:border-[#F97316]/50 transition-colors">
          <div className="flex justify-between items-start">
            <span className="material-symbols-outlined text-blue-400 p-2 bg-blue-400/10 rounded-lg">local_shipping</span>
            <span className="text-blue-400 font-ibm-plex text-[10px] bg-blue-400/10 px-2 py-0.5 rounded font-bold">En curso</span>
          </div>
          <div className="mt-4 font-ibm-plex">
            <p className="text-[#94A3B8] text-[10px] uppercase font-bold tracking-wider">Pedidos Activos</p>
            <h3 className="font-rajdhani text-2xl font-bold text-[#F1F5F9] mt-1">
              {pedidosActivosCount} <span className="text-xs font-normal text-[#94A3B8]">facturas</span>
            </h3>
          </div>
        </div>
      </div>

      {/* Tabs Switcher */}
      <div className="flex border-b border-[#2D3748] font-ibm-plex">
        <button
          onClick={() => setTabActiva('pedidos')}
          className={`py-3 px-6 text-sm font-semibold tracking-wide border-b-2 uppercase transition-all ${
            tabActiva === 'pedidos'
              ? 'border-[#F97316] text-[#F97316]'
              : 'border-transparent text-[#94A3B8] hover:text-[#F1F5F9]'
          }`}
        >
          Alertas e Historial de Pedidos
        </button>
        {isAdmin && (
          <button
            onClick={() => setTabActiva('proveedores')}
            className={`py-3 px-6 text-sm font-semibold tracking-wide border-b-2 uppercase transition-all ${
              tabActiva === 'proveedores'
                ? 'border-[#F97316] text-[#F97316]'
                : 'border-transparent text-[#94A3B8] hover:text-[#F1F5F9]'
            }`}
          >
            Gestión de Proveedores
          </button>
        )}
      </div>

      {/* Main Content Layout */}
      {tabActiva === 'pedidos' ? (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Table Section: Inventory Alerts & Orders (col-span-2) */}
          <div className="lg:col-span-2 space-y-8">
            {/* Repuestos en alerta */}
            <TablaUniversal<Repuesto>
              titulo="Repuestos en Alerta"
              subtitulo="Inventario con existencias bajo el límite mínimo de seguridad."
              headers={['Repuesto', 'Código SKU', 'Stock Actual', 'Stock Mínimo', 'Acciones']}
              datos={alertas}
              buscarPor={(a) => `${a.nombre_repuesto} ${a.sku}`}
              buscarPlaceholder="Buscar repuesto por nombre o SKU..."
              itemsPorPagina={4}
              renderRow={(item, index, bgClass) => (
                <tr key={item.id} className={`${bgClass} hover:bg-slate-100 transition-colors group font-ibm-plex text-[#1E293B]`}>
                  <td className="px-6 py-4 font-bold text-sm">
                    {item.nombre_repuesto}
                  </td>
                  <td className="px-6 py-4 font-mono text-xs text-[#64748B]">
                    {item.sku}
                  </td>
                  <td className="px-6 py-4">
                    <span className="px-2 py-0.5 bg-red-100 text-red-700 border border-red-200 rounded text-xs font-bold">
                      {item.cantidad_stock} und.
                    </span>
                  </td>
                  <td className="px-6 py-4 text-xs font-semibold text-[#64748B]">
                    {item.stock_minimo} und.
                  </td>
                  <td className="px-6 py-4">
                    <button
                      onClick={() => {
                        setSelectedProveedorId('');
                        setPedidoItems([{ id_repuesto: item.id, cantidad: item.stock_minimo * 2, precio_costo: parseFloat(item.precio_costo as string || '0.00') }]);
                        setModalPedidoOpen(true);
                      }}
                      title="Solicitar Reposición"
                      className="p-1.5 rounded text-[#F97316] hover:bg-orange-100 transition-colors"
                    >
                      <span className="material-symbols-outlined text-lg">shopping_cart_checkout</span>
                    </button>
                  </td>
                </tr>
              )}
            />

            {/* Pedidos / Ordenes de Compra Recientes */}
            <div className="bg-[#1E2433] border border-[#2D3748] rounded-xl overflow-hidden shadow-lg font-ibm-plex">
              <div className="p-6 border-b border-[#2D3748] flex justify-between items-center bg-[#161B27]/40">
                <div>
                  <h4 className="text-lg font-bold text-white">Órdenes de Compra</h4>
                  <p className="text-xs text-[#94A3B8]">Listado histórico de adquisiciones a proveedores.</p>
                </div>
                <div className="flex gap-2">
                  <select
                    value={filtroEstado}
                    onChange={(e) => {
                      setFiltroEstado(e.target.value);
                      setPaginaOrdenes(1);
                    }}
                    className="bg-[#161B27] border border-[#2D3748] text-xs text-white rounded-lg py-1.5 px-3 outline-none focus:border-[#F97316]"
                  >
                    <option value="">Todos los estados</option>
                    <option value="pendiente">Pendientes</option>
                    <option value="aprobado">Aprobadas</option>
                    <option value="recibido">Recibidas</option>
                    <option value="cancelado">Canceladas</option>
                  </select>
                </div>
              </div>

              <div className="divide-y divide-[#2D3748]">
                {loading ? (
                  <div className="p-6 text-center text-[#94A3B8] italic animate-pulse">Cargando órdenes de compra...</div>
                ) : ordenes.length > 0 ? (
                  ordenes.map((pedido) => {
                    const badgeStyles = {
                      pendiente: 'bg-amber-100 text-amber-700 border-amber-200',
                      aprobado: 'bg-blue-100 text-blue-700 border-blue-200',
                      recibido: 'bg-green-100 text-green-700 border-green-200',
                      cancelado: 'bg-red-100 text-red-700 border-red-200'
                    };

                    return (
                      <div
                        key={pedido.id}
                        onClick={() => {
                          setSelectedOrder(pedido);
                          fetchOrderDetails(pedido.id);
                          setModalDetalleOpen(true);
                        }}
                        className="p-6 flex items-center justify-between hover:bg-[#161B27]/40 transition-colors group cursor-pointer"
                      >
                        <div className="flex items-center gap-6">
                          <div className="text-center bg-[#161B27] border border-[#2D3748] p-2 rounded w-16">
                            <p className="text-[9px] font-bold text-[#94A3B8] uppercase">
                              {new Date(pedido.creado_en).toLocaleString('es-ES', { month: 'short' })}
                            </p>
                            <p className="font-rajdhani text-2xl font-bold text-[#F97316] leading-none mt-1">
                              {new Date(pedido.creado_en).getDate()}
                            </p>
                          </div>
                          <div>
                            <h5 className="font-bold text-white text-sm">{pedido.nombre_empresa}</h5>
                            <p className="text-xs text-[#94A3B8] mt-1 font-mono">
                              Orden: {pedido.numero_orden} | Creado por: {pedido.creador_nombre}
                            </p>
                          </div>
                        </div>

                        <div className="flex items-center gap-6">
                          <div className="text-right">
                            <span className={`px-2.5 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider border ${badgeStyles[pedido.estado]}`}>
                              {pedido.estado}
                            </span>
                            {pedido.fecha_recibida && (
                              <p className="text-[10px] text-[#94A3B8] mt-1">
                                Recibido: {new Date(pedido.fecha_recibida).toLocaleDateString()}
                              </p>
                            )}
                          </div>
                          <span className="material-symbols-outlined text-[#94A3B8] group-hover:text-[#F97316] transition-all">
                            chevron_right
                          </span>
                        </div>
                      </div>
                    );
                  })
                ) : (
                  <div className="p-6 text-center text-[#94A3B8] italic">No se registraron órdenes de compra en el sistema.</div>
                )}
              </div>

              {/* Pagination */}
              {totalOrdenes > limiteOrdenes && (
                <div className="p-4 bg-[#161B27]/40 border-t border-[#2D3748] flex justify-end gap-2">
                  <button
                    disabled={paginaOrdenes === 1}
                    onClick={() => setPaginaOrdenes(p => Math.max(1, p - 1))}
                    className="p-1 px-2.5 rounded bg-[#2D3748] text-[#94A3B8] hover:bg-white/5 disabled:opacity-30 disabled:hover:bg-transparent text-xs"
                  >
                    Anterior
                  </button>
                  <button
                    disabled={paginaOrdenes * limiteOrdenes >= totalOrdenes}
                    onClick={() => setPaginaOrdenes(p => p + 1)}
                    className="p-1 px-2.5 rounded bg-[#2D3748] text-[#94A3B8] hover:bg-white/5 disabled:opacity-30 disabled:hover:bg-transparent text-xs"
                  >
                    Siguiente
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Sidebar Notifications & Static Alerts (Right Column) */}
          <div className="space-y-6 font-ibm-plex">
            <div className="bg-[#1E2433] border border-[#2D3748] rounded-xl p-6 relative overflow-hidden group shadow-lg">
              <h4 className="text-[10px] uppercase font-bold tracking-wider text-[#94A3B8] mb-4">
                Alertas de Compra
              </h4>
              <div className="space-y-4">
                <div className="flex gap-4 p-4 rounded-xl bg-red-500/5 border border-red-500/20">
                  <span className="material-symbols-outlined text-red-500">inventory_2</span>
                  <div>
                    <p className="text-xs font-bold text-white leading-tight">Stock Mínimo Excedido</p>
                    <p className="text-[11px] text-[#94A3B8] mt-1">Hay {criticosCount} repuestos que requieren aprovisionamiento inmediato.</p>
                  </div>
                </div>

                <div className="flex gap-4 p-4 rounded-xl bg-yellow-500/5 border border-yellow-500/20">
                  <span className="material-symbols-outlined text-yellow-500">notifications</span>
                  <div>
                    <p className="text-xs font-bold text-white leading-tight">Proceso Administrativo</p>
                    <p className="text-[11px] text-[#94A3B8] mt-1">Los operarios "comprador" pueden crear pedidos, pero solo el "administrador" los puede autorizar y recepcionar.</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      ) : (
        /* TAB PROVEEDORES CRUD */
        <div className="animate-in fade-in duration-300">
          <TablaUniversal<Proveedor>
            titulo="Catálogo de Proveedores"
            subtitulo="Gestión de contactos corporativos de abastecimiento."
            headers={['Empresa', 'RUC / Registro', 'E-mail', 'Teléfono', 'Acciones']}
            datos={proveedores}
            buscarPor={(p) => `${p.nombre_empresa} ${p.ruc}`}
            buscarPlaceholder="Buscar proveedor por empresa o RUC..."
            itemsPorPagina={10}
            renderRow={(p, index, bgClass) => (
              <tr key={p.id} className={`${bgClass} hover:bg-slate-100 transition-colors group font-ibm-plex text-[#1E293B]`}>
                <td className="px-6 py-4 font-bold text-sm">
                  {p.nombre_empresa}
                </td>
                <td className="px-6 py-4 font-mono text-xs text-[#64748B]">
                  {p.ruc || 'S/N'}
                </td>
                <td className="px-6 py-4 text-xs font-medium text-[#1E293B]">
                  {p.email || <span className="text-[#94A3B8] italic">Ninguno</span>}
                </td>
                <td className="px-6 py-4 text-xs text-[#64748B]">
                  {p.telefono || 'S/N'}
                </td>
                <td className="px-6 py-4">
                  <div className="flex gap-1">
                    <button
                      onClick={() => handleOpenEditProveedor(p)}
                      title="Editar Proveedor"
                      className="p-1.5 rounded text-[#F97316] hover:bg-orange-100 transition-colors"
                    >
                      <span className="material-symbols-outlined text-lg">edit</span>
                    </button>
                  </div>
                </td>
              </tr>
            )}
          />
        </div>
      )}

      {/* MODAL - NUEVO PEDIDO */}
      {modalPedidoOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-[#1E2433] border border-[#2D3748] rounded-xl max-w-2xl w-full shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200 font-ibm-plex text-white">
            <div className="p-6 border-b border-[#2D3748] flex justify-between items-center bg-[#161B27]/40">
              <h3 className="font-rajdhani text-xl font-bold text-[#F97316]">Crear Orden de Compra</h3>
              <button
                onClick={() => setModalPedidoOpen(false)}
                className="text-[#94A3B8] hover:text-[#F1F5F9] transition-colors"
              >
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>

            <form onSubmit={handleCrearOrden} className="p-6 space-y-6">
              {formError && (
                <div className="p-3 bg-red-500/10 border border-red-500/30 rounded-lg text-xs text-red-400 font-semibold">
                  {formError}
                </div>
              )}

              {/* Proveedor selector */}
              <div className="space-y-1">
                <label className="text-[10px] uppercase font-bold tracking-wider text-[#94A3B8]">Seleccionar Proveedor</label>
                <select
                  required
                  value={selectedProveedorId}
                  onChange={(e) => setSelectedProveedorId(e.target.value)}
                  className="w-full bg-[#161B27] border border-[#2D3748] rounded-lg text-xs py-2.5 px-3 focus:border-[#F97316] outline-none text-white"
                >
                  <option value="">Seleccione un proveedor...</option>
                  {proveedores.map((prov) => (
                    <option key={prov.id} value={prov.id}>
                      {prov.nombre_empresa} (RUC: {prov.ruc || 'S/N'})
                    </option>
                  ))}
                </select>
              </div>

              {/* Add item fields */}
              <div className="border border-[#2D3748] rounded-lg p-4 bg-[#161B27]/30 space-y-3">
                <h4 className="text-xs font-bold text-white uppercase tracking-wider">Añadir Repuesto al Pedido</h4>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  <div>
                    <label className="text-[9px] uppercase font-bold text-[#94A3B8]">Repuesto</label>
                    <select
                      value={tempRepuestoId}
                      onChange={(e) => {
                        const idVal = e.target.value;
                        setTempRepuestoId(idVal);
                        const matched = repuestos.find(r => r.id === parseInt(idVal));
                        if (matched) {
                          setTempCosto(parseFloat(matched.precio_costo as string || '0').toString());
                        }
                      }}
                      className="w-full bg-[#161B27] border border-[#2D3748] rounded-lg text-xs py-2 px-2.5 outline-none text-white"
                    >
                      <option value="">Seleccione repuesto...</option>
                      {repuestos.map((rep) => (
                        <option key={rep.id} value={rep.id}>
                          {rep.nombre_repuesto} (Stock: {rep.cantidad_stock})
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="text-[9px] uppercase font-bold text-[#94A3B8]">Cantidad</label>
                    <input
                      type="number"
                      min="1"
                      value={tempCantidad}
                      onChange={(e) => setTempCantidad(e.target.value)}
                      className="w-full bg-[#161B27] border border-[#2D3748] rounded-lg text-xs py-2 px-2.5 outline-none text-white"
                    />
                  </div>
                  <div>
                    <label className="text-[9px] uppercase font-bold text-[#94A3B8]">Costo Unitario ($)</label>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      value={tempCosto}
                      onChange={(e) => setTempCosto(e.target.value)}
                      className="w-full bg-[#161B27] border border-[#2D3748] rounded-lg text-xs py-2 px-2.5 outline-none text-white"
                    />
                  </div>
                </div>
                <button
                  type="button"
                  onClick={handleAddItemToCart}
                  disabled={!tempRepuestoId}
                  className="px-3 py-1.5 bg-[#2D3748] hover:bg-[#F97316] disabled:opacity-40 disabled:hover:bg-[#2D3748] text-white rounded text-xs font-bold transition-all w-full uppercase"
                >
                  Agregar a la Lista
                </button>
              </div>

              {/* Items List Table */}
              <div className="space-y-2">
                <h4 className="text-xs font-bold text-white uppercase tracking-wider">Lista de Repuestos Solicitados</h4>
                <div className="overflow-x-auto rounded-lg border border-[#2D3748] bg-[#161B27]/40 max-h-48 overflow-y-auto">
                  <table className="w-full text-left border-collapse text-xs">
                    <thead>
                      <tr className="bg-[#161B27] border-b border-[#2D3748]">
                        <th className="px-4 py-2 text-[#94A3B8] font-bold">Repuesto</th>
                        <th className="px-4 py-2 text-[#94A3B8] font-bold text-center">Cantidad</th>
                        <th className="px-4 py-2 text-[#94A3B8] font-bold">Costo Unit.</th>
                        <th className="px-4 py-2 text-[#94A3B8] font-bold text-right">Subtotal</th>
                        <th className="px-4 py-2 text-right"></th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#2D3748]">
                      {pedidoItems.length > 0 ? (
                        pedidoItems.map((item, idx) => {
                          const rep = repuestos.find(r => r.id === item.id_repuesto);
                          const subtotal = item.cantidad * item.precio_costo;
                          return (
                            <tr key={idx} className="hover:bg-white/5">
                              <td className="px-4 py-2 font-medium">{rep?.nombre_repuesto || `Repuesto ID: ${item.id_repuesto}`}</td>
                              <td className="px-4 py-2 text-center font-semibold">{item.cantidad}</td>
                              <td className="px-4 py-2">${item.precio_costo.toFixed(2)}</td>
                              <td className="px-4 py-2 text-right font-bold">${subtotal.toFixed(2)}</td>
                              <td className="px-4 py-2 text-right">
                                <button
                                  type="button"
                                  onClick={() => handleRemoveItemFromCart(idx)}
                                  className="text-red-400 hover:text-red-600 transition-colors"
                                >
                                  <span className="material-symbols-outlined text-lg">delete</span>
                                </button>
                              </td>
                            </tr>
                          );
                        })
                      ) : (
                        <tr>
                          <td colSpan={5} className="px-4 py-6 text-center text-[#94A3B8] italic">No hay repuestos en el pedido.</td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
                {pedidoItems.length > 0 && (
                  <div className="text-right text-sm font-bold text-white pt-2">
                    Total Estimado de Compra: <span className="text-[#F97316] text-base font-mono">${calculateCartTotal().toFixed(2)}</span>
                  </div>
                )}
              </div>

              <div className="pt-4 border-t border-[#2D3748] flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setModalPedidoOpen(false)}
                  className="px-4 py-2 rounded-lg border border-[#2D3748] text-slate-300 text-xs font-semibold uppercase tracking-wider hover:bg-white/5 transition-all"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-lg bg-[#F97316] text-white text-xs font-semibold uppercase tracking-wider hover:bg-[#EA6C0A] transition-all"
                >
                  Crear Pedido
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL - DETALLES Y ACCIONES DE ORDEN */}
      {modalDetalleOpen && selectedOrder && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-[#1E2433] border border-[#2D3748] rounded-xl max-w-2xl w-full shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200 font-ibm-plex text-white">
            <div className="p-6 border-b border-[#2D3748] flex justify-between items-center bg-[#161B27]/40">
              <div>
                <h3 className="font-rajdhani text-xl font-bold text-[#F97316] uppercase">Detalle de Pedido</h3>
                <p className="text-xs text-[#94A3B8] font-mono mt-0.5">Orden: {selectedOrder.numero_orden}</p>
              </div>
              <button
                onClick={() => setModalDetalleOpen(false)}
                className="text-[#94A3B8] hover:text-[#F1F5F9] transition-colors"
              >
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>

            <div className="p-6 space-y-6 max-h-[70vh] overflow-y-auto">
              <div className="grid grid-cols-2 gap-4 text-xs border-b border-[#2D3748] pb-4">
                <div>
                  <p className="text-[#94A3B8] font-bold uppercase text-[9px] tracking-wider">Proveedor</p>
                  <p className="text-sm font-bold mt-1 text-white">{selectedOrder.nombre_empresa}</p>
                  <p className="text-[#94A3B8] mt-0.5">RUC: {selectedOrder.ruc || 'S/N'}</p>
                  <p className="text-[#94A3B8]">{selectedOrder.email || ''}</p>
                </div>
                <div>
                  <p className="text-[#94A3B8] font-bold uppercase text-[9px] tracking-wider">Metadatos de Control</p>
                  <p className="mt-1 text-white">Estado: <span className="font-bold text-[#F97316] uppercase">{selectedOrder.estado}</span></p>
                  <p className="text-[#94A3B8] mt-0.5">Creado por: {selectedOrder.creador_nombre}</p>
                  {selectedOrder.aprobador_nombre && (
                    <p className="text-[#94A3B8]">Aprobado por: {selectedOrder.aprobador_nombre}</p>
                  )}
                </div>
              </div>

              {/* Items List Table */}
              <div className="space-y-2">
                <h4 className="text-xs font-bold text-[#94A3B8] uppercase tracking-wider">Repuestos Comprendidos</h4>
                <div className="overflow-x-auto rounded-lg border border-[#2D3748] bg-[#161B27]/40">
                  <table className="w-full text-left border-collapse text-xs">
                    <thead>
                      <tr className="bg-[#161B27] border-b border-[#2D3748]">
                        <th className="px-4 py-2 text-[#94A3B8] font-bold">Repuesto</th>
                        <th className="px-4 py-2 text-[#94A3B8] font-bold">SKU</th>
                        <th className="px-4 py-2 text-[#94A3B8] font-bold text-center">Cantidad</th>
                        <th className="px-4 py-2 text-[#94A3B8] font-bold">Costo Unit.</th>
                        <th className="px-4 py-2 text-[#94A3B8] font-bold text-right">Subtotal</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#2D3748] text-slate-300">
                      {selectedOrderDetails.map((item) => (
                        <tr key={item.id}>
                          <td className="px-4 py-2.5 font-medium">{item.nombre_repuesto}</td>
                          <td className="px-4 py-2.5 font-mono text-[10px]">{item.sku}</td>
                          <td className="px-4 py-2.5 text-center font-bold">{item.cantidad}</td>
                          <td className="px-4 py-2.5">${parseFloat(item.precio_costo as string).toFixed(2)}</td>
                          <td className="px-4 py-2.5 text-right font-bold">${parseFloat(item.subtotal_linea as string).toFixed(2)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <div className="text-right text-sm font-bold text-white pt-2">
                  Total Adquisición: <span className="text-[#F97316] text-base font-mono">
                    ${selectedOrderDetails.reduce((sum, item) => sum + parseFloat(item.subtotal_linea as string), 0).toFixed(2)}
                  </span>
                </div>
              </div>

              {/* State Machine Transition Actions (Admin only) */}
              {isAdmin && (
                <div className="border-t border-[#2D3748] pt-4 space-y-3">
                  <h4 className="text-xs font-bold text-[#94A3B8] uppercase tracking-wider">Acciones del Administrador (Transición de Estados)</h4>
                  <div className="flex flex-wrap gap-3">
                    {selectedOrder.estado === 'pendiente' && (
                      <>
                        <button
                          type="button"
                          onClick={() => handleTransitionState('aprobado')}
                          className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded text-xs font-bold transition-all flex items-center gap-1 shadow-md shadow-blue-600/15"
                        >
                          <span className="material-symbols-outlined text-sm">check_circle</span>
                          Aprobar Pedido
                        </button>
                        <button
                          type="button"
                          onClick={() => handleTransitionState('cancelado')}
                          className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded text-xs font-bold transition-all flex items-center gap-1 shadow-md shadow-red-600/15"
                        >
                          <span className="material-symbols-outlined text-sm">cancel</span>
                          Cancelar Pedido
                        </button>
                      </>
                    )}

                    {selectedOrder.estado === 'aprobado' && (
                      <>
                        <button
                          type="button"
                          onClick={() => handleTransitionState('recibido')}
                          className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded text-xs font-bold transition-all flex items-center gap-1 shadow-md shadow-green-600/15"
                        >
                          <span className="material-symbols-outlined text-sm">done_all</span>
                          Marcar como Recibido (Cargar Inventario)
                        </button>
                        <button
                          type="button"
                          onClick={() => handleTransitionState('cancelado')}
                          className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded text-xs font-bold transition-all flex items-center gap-1 shadow-md shadow-red-600/15"
                        >
                          <span className="material-symbols-outlined text-sm">cancel</span>
                          Cancelar Pedido
                        </button>
                      </>
                    )}

                    {(selectedOrder.estado === 'recibido' || selectedOrder.estado === 'cancelado') && (
                      <p className="text-xs text-[#94A3B8] italic">Esta orden ha finalizado su ciclo de vida y no admite más transiciones.</p>
                    )}
                  </div>
                </div>
              )}
            </div>

            <div className="p-6 border-t border-[#2D3748] flex justify-end bg-[#161B27]/20">
              <button
                type="button"
                onClick={() => setModalDetalleOpen(false)}
                className="px-4 py-2 rounded-lg bg-[#2D3748] text-white text-xs font-semibold uppercase tracking-wider hover:bg-[#F97316] transition-all"
              >
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL - PROVEEDOR FORM (CREATE/EDIT) */}
      {modalProveedorOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-[#1E2433] border border-[#2D3748] rounded-xl max-w-md w-full shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200 font-ibm-plex text-white">
            <div className="p-6 border-b border-[#2D3748] flex justify-between items-center bg-[#161B27]/40">
              <h3 className="font-rajdhani text-xl font-bold text-[#F97316]">
                {formProveedor.id ? 'Modificar Proveedor' : 'Agregar Nuevo Proveedor'}
              </h3>
              <button
                onClick={() => setModalProveedorOpen(false)}
                className="text-[#94A3B8] hover:text-[#F1F5F9] transition-colors"
              >
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>

            <form onSubmit={handleSubmitProveedor} className="p-6 space-y-4">
              {formError && (
                <div className="p-3 bg-red-500/10 border border-red-500/30 rounded-lg text-xs text-red-400 font-semibold">
                  {formError}
                </div>
              )}

              <div className="space-y-1">
                <label className="text-[10px] uppercase font-bold tracking-wider text-[#94A3B8]">Nombre de la Empresa</label>
                <input
                  type="text"
                  required
                  value={formProveedor.nombre_empresa}
                  onChange={(e) => setFormProveedor({ ...formProveedor, nombre_empresa: e.target.value })}
                  placeholder="Ej. Distribuidora Central C.A."
                  className="w-full bg-[#161B27] border border-[#2D3748] rounded-lg text-xs py-2.5 px-3 focus:border-[#F97316] outline-none text-white"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[10px] uppercase font-bold tracking-wider text-[#94A3B8]">RUC / Identificación Fiscal</label>
                <input
                  type="text"
                  value={formProveedor.ruc}
                  onChange={(e) => setFormProveedor({ ...formProveedor, ruc: e.target.value })}
                  placeholder="Ej. 1790000001001"
                  className="w-full bg-[#161B27] border border-[#2D3748] rounded-lg text-xs py-2.5 px-3 focus:border-[#F97316] outline-none text-white"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[10px] uppercase font-bold tracking-wider text-[#94A3B8]">Correo de Contacto</label>
                <input
                  type="email"
                  value={formProveedor.email}
                  onChange={(e) => setFormProveedor({ ...formProveedor, email: e.target.value })}
                  placeholder="ejemplo@proveedor.com"
                  className="w-full bg-[#161B27] border border-[#2D3748] rounded-lg text-xs py-2.5 px-3 focus:border-[#F97316] outline-none text-white"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[10px] uppercase font-bold tracking-wider text-[#94A3B8]">Teléfono</label>
                <input
                  type="text"
                  value={formProveedor.telefono}
                  onChange={(e) => setFormProveedor({ ...formProveedor, telefono: e.target.value })}
                  placeholder="Ej. +593 99 999 9999"
                  className="w-full bg-[#161B27] border border-[#2D3748] rounded-lg text-xs py-2.5 px-3 focus:border-[#F97316] outline-none text-white"
                />
              </div>

              <div className="pt-4 border-t border-[#2D3748] flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setModalProveedorOpen(false)}
                  className="px-4 py-2 rounded-lg border border-[#2D3748] text-slate-300 text-xs font-semibold uppercase tracking-wider hover:bg-white/5 transition-all"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-lg bg-[#F97316] text-white text-xs font-semibold uppercase tracking-wider hover:bg-[#EA6C0A] transition-all"
                >
                  {formProveedor.id ? 'Actualizar' : 'Registrar'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
