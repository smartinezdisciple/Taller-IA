import React, { useState, useEffect } from 'react';
import { useCarritoStore } from '../store/carritoStore';
import { analizarImagenConIA, ResultadoIA } from '../servicios/servicioIA';
import api from '../servicios/api';

interface Repuesto {
  id: number;
  sku: string;
  nombre_repuesto: string;
  id_marca_vehiculo: number;
  nombre_marca: string;
  cantidad_stock: number;
  stock_minimo: number;
  precio_venta: string | number;
  color?: string;
  imagen_url?: string;
}

interface Cliente {
  id: number;
  nombres: string;
  apellidos: string;
  cedula?: string;
  email?: string;
  telefono?: string;
}

interface Venta {
  id: number;
  numero_venta: string;
  subtotal: string | number;
  porcentaje_iva: string | number;
  monto_iva: string | number;
  total: string | number;
  creado_en: string;
  nombres: string;
  apellidos: string;
  vendedor_nombre: string;
}

interface Marca {
  id: number;
  nombre_marca: string;
}

export default function Ventas() {
  const cartStore = useCarritoStore();

  // Active Tab: 'historial' | 'nueva'
  const [activeTab, setActiveTab] = useState<'nueva' | 'historial'>('nueva');

  // Repuestos lists and catalog filters
  const [repuestos, setRepuestos] = useState<Repuesto[]>([]);
  const [marcas, setMarcas] = useState<Marca[]>([]);
  const [catalogoFiltroBuscar, setCatalogoFiltroBuscar] = useState('');
  const [catalogoFiltroMarca, setCatalogoFiltroMarca] = useState('');
  const [catalogoLoading, setCatalogoLoading] = useState(false);

  // IA Filtering State
  const [iaDetecting, setIaDetecting] = useState(false);
  const [iaResult, setIaResult] = useState<ResultadoIA | null>(null);
  const [iaError, setIaError] = useState('');

  // Customers
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [clienteSeleccionado, setClienteSeleccionado] = useState<string>('');
  const [clienteModalOpen, setClienteModalOpen] = useState(false);
  const [nuevoCliente, setNuevoCliente] = useState({
    nombres: '',
    apellidos: '',
    cedula: '',
    email: '',
    telefono: ''
  });
  const [clienteError, setClienteError] = useState('');

  // Transactions Historial State
  const [ventas, setVentas] = useState<Venta[]>([]);
  const [historialPagina, setHistorialPagina] = useState(1);
  const [historialTotal, setHistorialTotal] = useState(0);
  const [historialLimite] = useState(10);
  const [historialLoading, setHistorialLoading] = useState(false);

  // Overall process states
  const [submitLoading, setSubmitLoading] = useState(false);
  const [processMessage, setProcessMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Fetch initial configs
  const fetchBrands = async () => {
    try {
      const res = await api.get('/api/marcas');
      if (res.ok) {
        const data = await res.json();
        setMarcas(data);
      }
    } catch (err) {
      console.error('Error fetching brands:', err);
    }
  };

  const fetchClientes = async () => {
    try {
      const res = await api.get('/api/clientes');
      if (res.ok) {
        const data = await res.json();
        setClientes(data);
      }
    } catch (err) {
      console.error('Error fetching clientes:', err);
    }
  };

  // Fetch catalog of repuestos for selection
  const fetchCatalogoRepuestos = async () => {
    setCatalogoLoading(true);
    try {
      // Fetch all items from catalog to filter in-memory with IA results
      const res = await api.get('/api/repuestos?pagina=1&limite=100');
      if (res.ok) {
        const data = await res.json();
        setRepuestos(data.repuestos);
      }
    } catch (err) {
      console.error('Error fetching repuestos catalog:', err);
    } finally {
      setCatalogoLoading(false);
    }
  };

  // Fetch sales history
  const fetchVentasHistorial = async () => {
    setHistorialLoading(true);
    try {
      const res = await api.get(`/api/ventas?pagina=${historialPagina}&limite=${historialLimite}`);
      if (res.ok) {
        const data = await res.json();
        setVentas(data.ventas);
        setHistorialTotal(data.total);
      }
    } catch (err) {
      console.error('Error fetching sales history:', err);
    } finally {
      setHistorialLoading(false);
    }
  };

  useEffect(() => {
    fetchBrands();
    fetchClientes();
    fetchCatalogoRepuestos();
  }, []);

  useEffect(() => {
    if (activeTab === 'historial') {
      fetchVentasHistorial();
    }
  }, [activeTab, historialPagina]);

  // IA Photo Upload trigger
  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate size and extension
    const validExtensions = ['image/jpeg', 'image/png', 'image/webp'];
    if (!validExtensions.includes(file.type)) {
      setIaError('Formato inválido. Solo se admiten imágenes JPEG, PNG o WEBP.');
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      setIaError('El archivo excede el tamaño máximo permitido de 5MB.');
      return;
    }

    setIaError('');
    setIaDetecting(true);
    setIaResult(null);

    try {
      const result = await analizarImagenConIA(file);
      setIaResult(result);
      // Auto apply marca filter if found in list
      const matchedBrand = marcas.find(m => m.nombre_marca.toLowerCase() === result.marca.toLowerCase());
      if (matchedBrand) {
        setCatalogoFiltroMarca(matchedBrand.id.toString());
      }
    } catch (err: any) {
      console.error('[IA Upload Error]:', err);
      setIaError('Fallo al analizar foto. Puede continuar seleccionando repuestos manualmente.');
    } finally {
      setIaDetecting(false);
    }
  };

  const handleClearIAResult = () => {
    setIaResult(null);
    setIaError('');
    setCatalogoFiltroMarca('');
  };

  // Submit client modal creation
  const handleSubmitNuevoCliente = async (e: React.FormEvent) => {
    e.preventDefault();
    setClienteError('');

    if (!nuevoCliente.nombres || !nuevoCliente.apellidos) {
      setClienteError('Nombres y apellidos son requeridos.');
      return;
    }

    try {
      const res = await api.post('/api/clientes', nuevoCliente);
      if (res.ok) {
        const data = await res.json();
        setClientes([data, ...clientes]);
        setClienteSeleccionado(data.id.toString());
        setClienteModalOpen(false);
        setNuevoCliente({ nombres: '', apellidos: '', cedula: '', email: '', telefono: '' });
      } else {
        const err = await res.json();
        setClienteError(err.mensaje || 'Error al guardar cliente.');
      }
    } catch (err) {
      setClienteError('Error al conectar con el servidor.');
    }
  };

  // Confirm Sale submit
  const handleConfirmarVenta = async () => {
    if (!clienteSeleccionado) {
      setProcessMessage({ type: 'error', text: 'Debe seleccionar un cliente para realizar la venta.' });
      return;
    }
    if (cartStore.items.length === 0) {
      setProcessMessage({ type: 'error', text: 'El carrito de compras está vacío.' });
      return;
    }

    setSubmitLoading(true);
    setProcessMessage(null);

    const payload = {
      id_cliente: parseInt(clienteSeleccionado),
      items: cartStore.items.map(item => ({
        id_repuesto: item.id,
        cantidad: item.cantidad
      }))
    };

    try {
      const res = await api.post('/api/ventas', payload);
      if (res.ok) {
        const data = await res.json();
        setProcessMessage({
          type: 'success',
          text: `Venta registrada con éxito. Comprobante: ${data.numero_venta}`
        });
        cartStore.vaciarCarrito();
        setClienteSeleccionado('');
        fetchCatalogoRepuestos(); // Refresh stock in catalog view
      } else {
        const err = await res.json();
        setProcessMessage({ type: 'error', text: err.mensaje || 'Error al completar la venta.' });
      }
    } catch (err) {
      setProcessMessage({ type: 'error', text: 'Error de conexión con el servidor.' });
    } finally {
      setSubmitLoading(false);
    }
  };

  // Filter local catalog in memory (including IA matching filters)
  const repuestosFiltrados = repuestos.filter(item => {
    // Search text SKU or Name
    const matchesSearch =
      item.nombre_repuesto.toLowerCase().includes(catalogoFiltroBuscar.toLowerCase()) ||
      item.sku.toLowerCase().includes(catalogoFiltroBuscar.toLowerCase());

    // Matches selected brand ID
    const matchesBrand = catalogoFiltroMarca ? item.id_marca_vehiculo === parseInt(catalogoFiltroMarca) : true;

    // Optional color matching if IA returns a result
    const matchesColor = iaResult?.color ? item.color?.toLowerCase() === iaResult.color.toLowerCase() : true;

    return matchesSearch && matchesBrand && matchesColor;
  });

  const totalHistorialPaginas = Math.ceil(historialTotal / historialLimite) || 1;
  const indexInicioHistorial = (historialPagina - 1) * historialLimite;

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      {/* Tab Navigation header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4 border-b border-[#2D3748] pb-4">
        <div>
          <h2 className="font-rajdhani text-3xl font-bold text-[#F97316]">Módulo de Ventas</h2>
          <p className="text-[#94A3B8] text-sm mt-1">Facturación de repuestos y filtros de coincidencia asistidos por IA.</p>
        </div>

        <div className="flex bg-[#161B27] p-1 rounded-lg border border-[#2D3748] font-ibm-plex">
          <button
            onClick={() => setActiveTab('nueva')}
            className={`px-4 py-2 rounded-md text-xs font-semibold uppercase tracking-wider transition-all ${
              activeTab === 'nueva' ? 'bg-[#F97316] text-white shadow' : 'text-[#94A3B8] hover:text-white'
            }`}
          >
            Nueva Venta
          </button>
          <button
            onClick={() => setActiveTab('historial')}
            className={`px-4 py-2 rounded-md text-xs font-semibold uppercase tracking-wider transition-all ${
              activeTab === 'historial' ? 'bg-[#F97316] text-white shadow' : 'text-[#94A3B8] hover:text-white'
            }`}
          >
            Historial Transacciones
          </button>
        </div>
      </div>

      {activeTab === 'nueva' ? (
        /* TAB 1: NUEVA VENTA (POS VIEW) */
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 font-ibm-plex text-white">
          {/* LEFT COLUMN: Catalog list (col-span-7) */}
          <div className="lg:col-span-7 space-y-6">
            {/* Filter controls */}
            <div className="bg-[#1E2433] border border-[#2D3748] rounded-xl p-5 space-y-4">
              <div className="flex items-center justify-between">
                <h4 className="font-rajdhani text-lg font-bold text-[#F1F5F9] uppercase tracking-wider">Catálogo de Selección</h4>
                <div className="flex items-center gap-2">
                  <label className="cursor-pointer bg-[#2D3748] hover:bg-[#F97316] text-white text-[10px] uppercase font-bold tracking-wider px-3 py-1.5 rounded-lg flex items-center gap-1.5 transition-all">
                    <span className="material-symbols-outlined text-sm">photo_camera</span>
                    Filtro Foto IA
                    <input type="file" accept="image/*" onChange={handlePhotoUpload} className="hidden" />
                  </label>
                </div>
              </div>

              {/* IA result display */}
              {iaDetecting && (
                <div className="p-3 bg-[#F97316]/10 border border-[#F97316]/30 rounded-lg text-xs text-[#F1F5F9] flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full border-t-2 border-[#F97316] animate-spin"></span>
                  Analizando foto con IA Dockerizada...
                </div>
              )}

              {iaError && (
                <div className="p-3 bg-red-500/10 border border-red-500/30 rounded-lg text-xs text-red-400 font-semibold">
                  {iaError}
                </div>
              )}

              {iaResult && (
                <div className="p-3 bg-green-500/10 border border-green-500/30 rounded-lg text-xs text-green-400 flex items-center justify-between">
                  <div>
                    <span className="font-bold">IA detectó: </span>
                    <span className="capitalize">{iaResult.marca}</span>
                    {iaResult.modelo && (
                      <>
                        <span> • Modelo: </span>
                        <span className="capitalize">{iaResult.modelo}</span>
                      </>
                    )}
                    {iaResult.color && (
                      <>
                        <span> • Color: </span>
                        <span className="capitalize">{iaResult.color}</span>
                      </>
                    )}
                  </div>
                  <button onClick={handleClearIAResult} className="text-[#94A3B8] hover:text-white text-xs underline font-bold">
                    Limpiar Filtro
                  </button>
                </div>
              )}

              {/* Standard inputs */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="relative">
                  <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-[#94A3B8] text-sm">
                    search
                  </span>
                  <input
                    type="text"
                    value={catalogoFiltroBuscar}
                    onChange={(e) => setCatalogoFiltroBuscar(e.target.value)}
                    placeholder="Buscar por SKU o nombre..."
                    className="w-full bg-[#161B27] border border-[#2D3748] rounded-lg pl-10 pr-4 py-2.5 focus:border-[#F97316] outline-none text-xs text-white placeholder:text-[#94A3B8]/40"
                  />
                </div>

                <select
                  value={catalogoFiltroMarca}
                  onChange={(e) => setCatalogoFiltroMarca(e.target.value)}
                  className="w-full bg-[#161B27] border border-[#2D3748] rounded-lg text-xs py-2.5 px-3 focus:border-[#F97316] outline-none text-white"
                >
                  <option value="">Todas las marcas</option>
                  {marcas.map(brand => (
                    <option key={brand.id} value={brand.id}>{brand.nombre_marca}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* Repuestos selection grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 max-h-[500px] overflow-y-auto pr-2">
              {catalogoLoading ? (
                <div className="col-span-2 text-center py-12 text-[#94A3B8] font-bold">
                  Cargando catálogo...
                </div>
              ) : repuestosFiltrados.length > 0 ? (
                repuestosFiltrados.map((item) => {
                  const outOfStock = item.cantidad_stock <= 0;
                  const itemInCart = cartStore.items.find(i => i.id === item.id);
                  const currentAvailable = item.cantidad_stock - (itemInCart?.cantidad || 0);

                  return (
                    <div
                      key={item.id}
                      className={`bg-[#1E2433] border border-[#2D3748] rounded-xl p-4 flex flex-col justify-between hover:border-[#F97316] transition-all relative overflow-hidden group ${
                        outOfStock ? 'opacity-55' : ''
                      }`}
                    >
                      {/* Brand Label Badge */}
                      <span className="absolute top-3 right-3 px-2 py-0.5 bg-[#161B27] border border-[#2D3748] rounded text-[9px] text-[#94A3B8] font-semibold">
                        {item.nombre_marca}
                      </span>

                      <div className="space-y-2">
                        <p className="text-[10px] text-[#94A3B8] font-mono leading-none">{item.sku}</p>
                        <h5 className="font-bold text-sm text-[#F1F5F9] leading-tight pr-12">{item.nombre_repuesto}</h5>
                        {item.color && (
                          <div className="flex items-center gap-1">
                            <span className="w-2 h-2 rounded-full border border-[#2D3748]" style={{ backgroundColor: item.color.toLowerCase() }}></span>
                            <span className="text-[10px] text-[#94A3B8] capitalize">{item.color}</span>
                          </div>
                        )}
                      </div>

                      <div className="mt-4 pt-3 border-t border-[#2D3748]/50 flex items-center justify-between">
                        <div>
                          <p className="text-xs text-[#94A3B8]">Precio</p>
                          <p className="text-base font-bold text-[#F97316]">${parseFloat(item.precio_venta as string).toFixed(2)}</p>
                        </div>

                        <div>
                          <p className="text-[10px] text-[#94A3B8] text-right font-semibold">Disponible</p>
                          <p className={`text-xs font-bold text-right ${currentAvailable <= 2 ? 'text-red-400' : 'text-green-400'}`}>
                            {currentAvailable} unds.
                          </p>
                        </div>
                      </div>

                      <button
                        disabled={currentAvailable <= 0}
                        onClick={() => cartStore.agregarItem({
                          id: item.id,
                          sku: item.sku,
                          nombre_repuesto: item.nombre_repuesto,
                          nombre_marca: item.nombre_marca,
                          precio_venta: parseFloat(item.precio_venta as string),
                          cantidad_stock: item.cantidad_stock,
                          color: item.color,
                          imagen_url: item.imagen_url
                        })}
                        className="mt-4 w-full bg-[#F97316] hover:bg-[#EA6C0A] disabled:bg-slate-700 disabled:opacity-50 text-white text-xs font-semibold py-2 rounded-lg transition-all"
                      >
                        {currentAvailable <= 0 ? 'Sin stock disponible' : 'Agregar al carrito'}
                      </button>
                    </div>
                  );
                })
              ) : (
                <div className="col-span-2 text-center py-12 text-[#94A3B8] border border-dashed border-[#2D3748] rounded-xl bg-[#1E2433]/30">
                  No hay repuestos que coincidan con la búsqueda.
                </div>
              )}
            </div>
          </div>

          {/* RIGHT COLUMN: Shopping Cart and Checkout (col-span-5) */}
          <div className="lg:col-span-5 space-y-6">
            {/* Customer select box */}
            <div className="bg-[#1E2433] border border-[#2D3748] rounded-xl p-5 space-y-4">
              <div className="flex justify-between items-center">
                <h4 className="font-rajdhani text-lg font-bold text-[#F1F5F9] uppercase tracking-wider">Cliente de Factura</h4>
                <button
                  onClick={() => {
                    setClienteError('');
                    setClienteModalOpen(true);
                  }}
                  className="px-2.5 py-1 bg-[#2D3748] hover:bg-[#F97316] rounded text-[10px] font-bold uppercase tracking-wider flex items-center gap-1 transition-all"
                >
                  <span className="material-symbols-outlined text-xs">person_add</span>
                  Registrar
                </button>
              </div>

              <select
                value={clienteSeleccionado}
                onChange={(e) => setClienteSeleccionado(e.target.value)}
                className="w-full bg-[#161B27] border border-[#2D3748] rounded-lg text-xs py-3 px-3 focus:border-[#F97316] outline-none text-white"
              >
                <option value="">Seleccione un cliente registrado...</option>
                {clientes.map(c => (
                  <option key={c.id} value={c.id}>
                    {c.nombres} {c.apellidos} {c.cedula ? `(${c.cedula})` : ''}
                  </option>
                ))}
              </select>
            </div>

            {/* Shopping Cart details */}
            <div className="bg-[#1E2433] border border-[#2D3748] rounded-xl p-5 space-y-6">
              <div className="flex justify-between items-center">
                <h4 className="font-rajdhani text-lg font-bold text-[#F1F5F9] uppercase tracking-wider">Carrito de Compras</h4>
                {cartStore.items.length > 0 && (
                  <button onClick={() => cartStore.vaciarCarrito()} className="text-red-400 hover:text-red-300 text-xs font-semibold">
                    Vaciar todo
                  </button>
                )}
              </div>

              {/* Cart List */}
              <div className="space-y-3 max-h-[300px] overflow-y-auto pr-2">
                {cartStore.items.length > 0 ? (
                  cartStore.items.map((item) => (
                    <div key={item.id} className="bg-[#161B27] border border-[#2D3748] p-3 rounded-lg flex items-center justify-between gap-4">
                      <div className="flex-1 min-w-0">
                        <p className="text-[10px] text-[#94A3B8] font-mono leading-none">{item.sku}</p>
                        <h6 className="font-bold text-xs text-[#F1F5F9] truncate mt-1">{item.nombre_repuesto}</h6>
                        <p className="text-[10px] text-[#F97316] font-bold mt-0.5">${item.precio_venta.toFixed(2)} c/u</p>
                      </div>

                      {/* Quantity select */}
                      <div className="flex items-center bg-[#1E2433] border border-[#2D3748] rounded">
                        <button
                          onClick={() => cartStore.modificarCantidad(item.id, item.cantidad - 1)}
                          className="px-2 py-1 text-slate-400 hover:text-white transition-colors"
                        >
                          -
                        </button>
                        <span className="px-2 text-xs font-bold text-[#F1F5F9]">{item.cantidad}</span>
                        <button
                          disabled={item.cantidad >= item.cantidad_stock}
                          onClick={() => cartStore.modificarCantidad(item.id, item.cantidad + 1)}
                          className="px-2 py-1 text-slate-400 hover:text-white transition-colors disabled:opacity-30"
                        >
                          +
                        </button>
                      </div>

                      {/* Remove item button */}
                      <button onClick={() => cartStore.eliminarItem(item.id)} className="text-red-400 hover:text-red-300">
                        <span className="material-symbols-outlined text-base">delete</span>
                      </button>
                    </div>
                  ))
                ) : (
                  <div className="text-center py-8 text-[#94A3B8] italic text-xs">
                    El carrito está vacío. Agregue repuestos del catálogo.
                  </div>
                )}
              </div>

              {/* Totals computation */}
              <div className="border-t border-[#2D3748]/60 pt-4 space-y-2">
                <div className="flex justify-between text-xs text-[#94A3B8]">
                  <span>Subtotal</span>
                  <span>${cartStore.subtotal.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-xs text-[#94A3B8]">
                  <span>IVA (15%)</span>
                  <span>${cartStore.montoIva.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-sm font-bold text-[#F1F5F9] pt-1">
                  <span>Monto Total</span>
                  <span className="text-[#F97316] font-mono">${cartStore.total.toFixed(2)}</span>
                </div>
              </div>

              {/* Status response banners */}
              {processMessage && (
                <div className={`p-3 border rounded-lg text-xs font-semibold ${
                  processMessage.type === 'success'
                    ? 'bg-green-500/10 border-green-500/30 text-green-400'
                    : 'bg-red-500/10 border-red-500/30 text-red-400'
                }`}>
                  {processMessage.text}
                </div>
              )}

              {/* Checkout trigger */}
              <button
                disabled={cartStore.items.length === 0 || !clienteSeleccionado || submitLoading}
                onClick={handleConfirmarVenta}
                className="w-full bg-[#F97316] hover:bg-[#EA6C0A] disabled:bg-slate-700 disabled:opacity-40 text-white font-bold text-xs uppercase tracking-wider py-3.5 rounded-lg flex items-center justify-center gap-2 transition-all shadow-md shadow-[#F97316]/10"
              >
                {submitLoading ? (
                  <>
                    <span className="w-3.5 h-3.5 rounded-full border-t-2 border-white animate-spin"></span>
                    Procesando Venta...
                  </>
                ) : (
                  <>
                    <span className="material-symbols-outlined text-sm">shopping_bag</span>
                    Confirmar Venta
                  </>
                )}
              </button>
            </div>
          </div>

          {/* CUSTOMER REGISTRATION MODAL */}
          {clienteModalOpen && (
            <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
              <div className="bg-[#1E2433] border border-[#2D3748] rounded-xl max-w-sm w-full shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
                <div className="p-6 border-b border-[#2D3748] flex justify-between items-center bg-[#161B27]/40">
                  <h3 className="font-rajdhani text-xl font-bold text-[#F97316]">Nuevo Cliente</h3>
                  <button
                    onClick={() => setClienteModalOpen(false)}
                    className="text-[#94A3B8] hover:text-[#F1F5F9] transition-colors"
                  >
                    <span className="material-symbols-outlined">close</span>
                  </button>
                </div>

                <form onSubmit={handleSubmitNuevoCliente} className="p-6 space-y-4">
                  {clienteError && (
                    <div className="p-2.5 bg-red-500/10 border border-red-500/30 rounded text-xs text-red-400 font-semibold">
                      {clienteError}
                    </div>
                  )}

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <label className="text-[10px] uppercase font-bold tracking-wider text-[#94A3B8]">Nombres</label>
                      <input
                        type="text"
                        required
                        value={nuevoCliente.nombres}
                        onChange={(e) => setNuevoCliente({ ...nuevoCliente, nombres: e.target.value })}
                        placeholder="Ej. Ana"
                        className="w-full bg-[#161B27] border border-[#2D3748] rounded-lg text-xs py-2.5 px-3 focus:border-[#F97316] outline-none text-white"
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="text-[10px] uppercase font-bold tracking-wider text-[#94A3B8]">Apellidos</label>
                      <input
                        type="text"
                        required
                        value={nuevoCliente.apellidos}
                        onChange={(e) => setNuevoCliente({ ...nuevoCliente, apellidos: e.target.value })}
                        placeholder="Ej. Pérez"
                        className="w-full bg-[#161B27] border border-[#2D3748] rounded-lg text-xs py-2.5 px-3 focus:border-[#F97316] outline-none text-white"
                      />
                    </div>
                  </div>

                  <div className="space-y-1">
                    <label className="text-[10px] uppercase font-bold tracking-wider text-[#94A3B8]">Identificación / Cédula</label>
                    <input
                      type="text"
                      value={nuevoCliente.cedula}
                      onChange={(e) => setNuevoCliente({ ...nuevoCliente, cedula: e.target.value })}
                      placeholder="Ej. 001-200593-0004F"
                      className="w-full bg-[#161B27] border border-[#2D3748] rounded-lg text-xs py-2.5 px-3 focus:border-[#F97316] outline-none text-white"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <label className="text-[10px] uppercase font-bold tracking-wider text-[#94A3B8]">Teléfono</label>
                      <input
                        type="text"
                        value={nuevoCliente.telefono}
                        onChange={(e) => setNuevoCliente({ ...nuevoCliente, telefono: e.target.value })}
                        placeholder="8888-8888"
                        className="w-full bg-[#161B27] border border-[#2D3748] rounded-lg text-xs py-2.5 px-3 focus:border-[#F97316] outline-none text-white"
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="text-[10px] uppercase font-bold tracking-wider text-[#94A3B8]">Email</label>
                      <input
                        type="email"
                        value={nuevoCliente.email}
                        onChange={(e) => setNuevoCliente({ ...nuevoCliente, email: e.target.value })}
                        placeholder="ejemplo@correo.com"
                        className="w-full bg-[#161B27] border border-[#2D3748] rounded-lg text-xs py-2.5 px-3 focus:border-[#F97316] outline-none text-white"
                      />
                    </div>
                  </div>

                  <div className="pt-4 border-t border-[#2D3748] flex justify-end gap-3">
                    <button
                      type="button"
                      onClick={() => setClienteModalOpen(false)}
                      className="px-4 py-2 rounded-lg border border-[#2D3748] text-slate-300 text-xs font-semibold uppercase tracking-wider hover:bg-white/5"
                    >
                      Cancelar
                    </button>
                    <button
                      type="submit"
                      className="px-4 py-2 rounded-lg bg-[#F97316] text-white text-xs font-semibold uppercase tracking-wider hover:bg-[#EA6C0A]"
                    >
                      Registrar
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}
        </div>
      ) : (
        /* TAB 2: HISTORIAL DE TRANSACCIONES */
        <div className="rounded-xl overflow-hidden border border-[#2D3748] bg-[#1E2433]">
          <div className="p-4 border-b border-[#2D3748] bg-[#161B27]/40 flex flex-wrap items-center justify-between gap-4">
            <h4 className="font-rajdhani text-lg font-bold text-[#F1F5F9] uppercase tracking-wider">Historial de Ventas Registradas</h4>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse font-ibm-plex text-white">
              <thead className="bg-[#161B27] border-b border-[#2D3748]">
                <tr>
                  <th className="px-6 py-4 text-[11px] font-semibold uppercase tracking-wider text-[#94A3B8]">ID Venta</th>
                  <th className="px-6 py-4 text-[11px] font-semibold uppercase tracking-wider text-[#94A3B8]">Fecha / Hora</th>
                  <th className="px-6 py-4 text-[11px] font-semibold uppercase tracking-wider text-[#94A3B8]">Cliente</th>
                  <th className="px-6 py-4 text-[11px] font-semibold uppercase tracking-wider text-[#94A3B8]">Vendedor</th>
                  <th className="px-6 py-4 text-[11px] font-semibold uppercase tracking-wider text-[#94A3B8] text-right">Subtotal</th>
                  <th className="px-6 py-4 text-[11px] font-semibold uppercase tracking-wider text-[#94A3B8] text-right">Total</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E2E8F0] text-[#1E293B]">
                {historialLoading ? (
                  <tr>
                    <td colSpan={6} className="px-6 py-12 text-center text-[#94A3B8] bg-white">
                      <span className="animate-pulse">Cargando transacciones...</span>
                    </td>
                  </tr>
                ) : ventas.length > 0 ? (
                  ventas.map((item, index) => {
                    const bgClass = index % 2 === 0 ? 'bg-white' : 'bg-[#F8FAFC]';
                    return (
                      <tr key={item.id} className={`${bgClass} hover:bg-slate-100 transition-colors font-ibm-plex`}>
                        <td className="px-6 py-4 font-bold text-xs text-[#F97316] font-mono">
                          {item.numero_venta}
                        </td>
                        <td className="px-6 py-4 text-xs text-[#1E293B] font-semibold">
                          {new Date(item.creado_en).toLocaleString()}
                        </td>
                        <td className="px-6 py-4 text-xs font-bold text-[#1E293B]">
                          {item.nombres} {item.apellidos}
                        </td>
                        <td className="px-6 py-4 text-xs font-semibold text-[#64748B]">
                          {item.vendedor_nombre}
                        </td>
                        <td className="px-6 py-4 text-xs font-bold text-right text-[#64748B] font-mono">
                          ${parseFloat(item.subtotal as string).toFixed(2)}
                        </td>
                        <td className="px-6 py-4 text-xs font-bold text-right text-[#1E293B] font-mono">
                          ${parseFloat(item.total as string).toFixed(2)}
                        </td>
                      </tr>
                    );
                  })
                ) : (
                  <tr>
                    <td colSpan={6} className="px-6 py-12 text-center text-[#94A3B8] bg-white">
                      No hay transacciones registradas en este período.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* Paginated Footer */}
          <div className="p-4 bg-[#161B27]/40 border-t border-[#2D3748] flex items-center justify-between gap-4 font-ibm-plex text-white">
            <p className="text-xs text-[#94A3B8]">
              Mostrando {historialTotal > 0 ? indexInicioHistorial + 1 : 0}-{Math.min(indexInicioHistorial + historialLimite, historialTotal)} de {historialTotal} transacciones
            </p>

            {totalHistorialPaginas > 1 && (
              <div className="flex gap-1 items-center">
                <button
                  disabled={historialPagina === 1}
                  onClick={() => setHistorialPagina(p => Math.max(1, p - 1))}
                  className="p-1 px-2.5 rounded text-[#94A3B8] hover:bg-white/5 disabled:opacity-30 disabled:hover:bg-transparent text-xs"
                >
                  ←
                </button>
                {Array.from({ length: totalHistorialPaginas }, (_, idx) => {
                  const num = idx + 1;
                  const activo = num === historialPagina;
                  return (
                    <button
                      key={num}
                      onClick={() => setHistorialPagina(num)}
                      className={`px-3 py-1 text-xs font-semibold rounded transition-all ${
                        activo ? 'bg-[#F97316] text-white' : 'text-[#94A3B8] hover:bg-white/5'
                      }`}
                    >
                      {num}
                    </button>
                  );
                })}
                <button
                  disabled={historialPagina === totalHistorialPaginas}
                  onClick={() => setHistorialPagina(p => Math.min(totalHistorialPaginas, p + 1))}
                  className="p-1 px-2.5 rounded text-[#94A3B8] hover:bg-white/5 disabled:opacity-30 disabled:hover:bg-transparent text-xs"
                >
                  →
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
