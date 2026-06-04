import React, { useState, useEffect } from 'react';
import { useAutenticacionStore } from '../store/autenticacionStore';
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
  precio_costo?: string | number; // Only visible to admin
  color?: string;
  descripcion?: string;
  imagen_url?: string;
  creado_en: string;
}

interface Marca {
  id: number;
  nombre_marca: string;
}

interface HistorialPrecio {
  id_orden: number;
  numero_orden: string;
  precio_costo: string | number;
  cantidad: number;
  registrado_en: string;
}

export default function Inventario() {
  const { usuario } = useAutenticacionStore();
  const isAdmin = usuario?.rol === 'administrador';

  // State lists
  const [repuestos, setRepuestos] = useState<Repuesto[]>([]);
  const [marcas, setMarcas] = useState<Marca[]>([]);
  const [historialCostos, setHistorialCostos] = useState<HistorialPrecio[]>([]);

  // Search, pagination & filtering
  const [buscar, setBuscar] = useState('');
  const [marcaSeleccionada, setMarcaSeleccionada] = useState('');
  const [pagina, setPagina] = useState(1);
  const [total, setTotal] = useState(0);
  const [limite] = useState(10);
  const [loading, setLoading] = useState(false);

  // Modals state
  const [modalOpen, setModalOpen] = useState(false);
  const [detailModalOpen, setDetailModalOpen] = useState(false);
  const [modalType, setModalType] = useState<'crear' | 'editar'>('crear');
  const [selectedRepuesto, setSelectedRepuesto] = useState<Repuesto | null>(null);

  // Form fields
  const [formFields, setFormFields] = useState({
    sku: '',
    nombre_repuesto: '',
    id_marca_vehiculo: '',
    cantidad_stock: '0',
    stock_minimo: '5',
    precio_venta: '',
    precio_costo: '0.00',
    color: '',
    descripcion: '',
    imagen_url: ''
  });
  const [formError, setFormError] = useState('');

  // Fetch brands catalog
  const fetchMarcas = async () => {
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

  // Fetch repuestos list
  const fetchRepuestos = async () => {
    setLoading(true);
    try {
      const searchParam = buscar ? `&buscar=${encodeURIComponent(buscar)}` : '';
      const brandParam = marcaSeleccionada ? `&marca=${marcaSeleccionada}` : '';
      const res = await api.get(`/api/repuestos?pagina=${pagina}&limite=${limite}${searchParam}${brandParam}`);

      if (res.ok) {
        const data = await res.json();
        setRepuestos(data.repuestos);
        setTotal(data.total);
      }
    } catch (err) {
      console.error('Error fetching repuestos:', err);
    } finally {
      setLoading(false);
    }
  };

  // Fetch price history
  const fetchHistorialCostos = async (repuestoId: number) => {
    if (!isAdmin) return;
    try {
      const res = await api.get(`/api/repuestos/${repuestoId}/historial-precios`);
      if (res.ok) {
        const data = await res.json();
        setHistorialCostos(data);
      }
    } catch (err) {
      console.error('Error fetching price history:', err);
    }
  };

  useEffect(() => {
    fetchMarcas();
  }, []);

  useEffect(() => {
    fetchRepuestos();
  }, [pagina, marcaSeleccionada]);

  // Handle Search submit
  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setPagina(1);
    fetchRepuestos();
  };

  // Open Create Modal
  const handleOpenCreate = () => {
    setFormError('');
    setFormFields({
      sku: '',
      nombre_repuesto: '',
      id_marca_vehiculo: marcas[0]?.id.toString() || '',
      cantidad_stock: '0',
      stock_minimo: '5',
      precio_venta: '',
      precio_costo: '0.00',
      color: '',
      descripcion: '',
      imagen_url: ''
    });
    setModalType('crear');
    setModalOpen(true);
  };

  // Open Edit Modal
  const handleOpenEdit = (repuesto: Repuesto) => {
    setFormError('');
    setFormFields({
      sku: repuesto.sku,
      nombre_repuesto: repuesto.nombre_repuesto,
      id_marca_vehiculo: repuesto.id_marca_vehiculo.toString(),
      cantidad_stock: repuesto.cantidad_stock.toString(),
      stock_minimo: repuesto.stock_minimo.toString(),
      precio_venta: repuesto.precio_venta.toString(),
      precio_costo: repuesto.precio_costo?.toString() || '0.00',
      color: repuesto.color || '',
      descripcion: repuesto.descripcion || '',
      imagen_url: repuesto.imagen_url || ''
    });
    setSelectedRepuesto(repuesto);
    setModalType('editar');
    setModalOpen(true);
  };

  // Open Details Modal
  const handleOpenDetails = (repuesto: Repuesto) => {
    setSelectedRepuesto(repuesto);
    setHistorialCostos([]);
    if (isAdmin) {
      fetchHistorialCostos(repuesto.id);
    }
    setDetailModalOpen(true);
  };

  // Submit Modal Form
  const handleSubmitForm = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');

    if (!formFields.sku || !formFields.nombre_repuesto || !formFields.id_marca_vehiculo || !formFields.precio_venta) {
      setFormError('Los campos SKU, nombre, marca y precio de venta son requeridos.');
      return;
    }

    const payload = {
      sku: formFields.sku,
      nombre_repuesto: formFields.nombre_repuesto,
      id_marca_vehiculo: parseInt(formFields.id_marca_vehiculo),
      precio_venta: parseFloat(formFields.precio_venta),
      cantidad_stock: parseInt(formFields.cantidad_stock) || 0,
      stock_minimo: parseInt(formFields.stock_minimo) || 0,
      precio_costo: parseFloat(formFields.precio_costo) || 0.00,
      color: formFields.color || null,
      descripcion: formFields.descripcion || null,
      imagen_url: formFields.imagen_url || null
    };

    try {
      let res;
      if (modalType === 'crear') {
        res = await api.post('/api/repuestos', payload);
      } else {
        res = await api.put(`/api/repuestos/${selectedRepuesto?.id}`, payload);
      }

      if (res.ok) {
        setModalOpen(false);
        fetchRepuestos();
      } else {
        const errorData = await res.json();
        setFormError(errorData.mensaje || 'Error al guardar los datos del repuesto.');
      }
    } catch (err) {
      setFormError('Error de red al conectar con el servidor.');
    }
  };

  // Delete Repuesto
  const handleDeleteRepuesto = async (id: number) => {
    if (!window.confirm('¿Está seguro de que desea eliminar este repuesto de forma permanente?')) return;
    try {
      const res = await api.delete(`/api/repuestos/${id}`);
      if (res.ok) {
        fetchRepuestos();
      } else {
        const err = await res.json();
        alert(err.mensaje || 'Error al eliminar repuesto.');
      }
    } catch (error) {
      alert('Error de conexión al eliminar repuesto.');
    }
  };

  const totalPaginas = Math.ceil(total / limite) || 1;
  const indexInicio = (pagina - 1) * limite;

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      {/* Page Header */}
      <div className="flex justify-between items-end mb-6">
        <div>
          <h2 className="font-rajdhani text-3xl font-bold text-[#F97316]">Gestión de Inventario</h2>
          <p className="text-[#94A3B8] max-w-lg mt-2 text-sm">
            Control de stock, alertas y trazabilidad de compatibilidad de repuestos.
          </p>
        </div>
        {isAdmin && (
          <button
            onClick={handleOpenCreate}
            className="px-4 py-2 bg-[#F97316] text-white text-xs font-semibold uppercase tracking-wider rounded-lg flex items-center gap-2 hover:bg-[#EA6C0A] transition-all shadow-md shadow-[#F97316]/20 font-ibm-plex"
          >
            <span className="material-symbols-outlined text-sm">add_circle</span>
            Añadir Repuesto
          </button>
        )}
      </div>

      {/* Main Container */}
      <div className="rounded-xl overflow-hidden border border-[#2D3748] bg-[#1E2433]">
        {/* Filters and Search Bar Container */}
        <div className="p-4 border-b border-[#2D3748] bg-[#161B27]/40 flex flex-wrap items-center justify-between gap-4">
          <form onSubmit={handleSearch} className="flex items-center gap-2 w-full sm:w-auto">
            <div className="relative flex-1 sm:w-64">
              <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-[#94A3B8] text-sm">
                search
              </span>
              <input
                type="text"
                value={buscar}
                onChange={(e) => setBuscar(e.target.value)}
                placeholder="Buscar por SKU o nombre..."
                className="w-full bg-[#161B27] border border-[#2D3748] rounded-lg pl-10 pr-4 py-2 focus:border-[#F97316] outline-none text-xs text-[#F1F5F9] placeholder:text-[#94A3B8]/50 transition-all font-ibm-plex"
              />
            </div>
            <button
              type="submit"
              className="px-3 py-2 bg-[#2D3748] text-[#F1F5F9] hover:bg-[#F97316] rounded-lg text-xs font-semibold uppercase tracking-wider transition-all font-ibm-plex"
            >
              Buscar
            </button>
          </form>

          <div className="flex items-center gap-3 w-full sm:w-auto">
            <span className="text-[10px] text-[#94A3B8] uppercase font-bold tracking-wider font-ibm-plex">Marca:</span>
            <select
              value={marcaSeleccionada}
              onChange={(e) => {
                setMarcaSeleccionada(e.target.value);
                setPagina(1);
              }}
              className="bg-[#161B27] border border-[#2D3748] text-xs text-[#F1F5F9] rounded-lg py-2 px-3 outline-none focus:border-[#F97316] font-ibm-plex min-w-[140px]"
            >
              <option value="">Todas las marcas</option>
              {marcas.map((brand) => (
                <option key={brand.id} value={brand.id}>
                  {brand.nombre_marca}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Table Content */}
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead className="bg-[#161B27] border-b border-[#2D3748]">
              <tr>
                <th className="px-6 py-4 font-ibm-plex text-[11px] font-semibold uppercase tracking-wider text-[#94A3B8]">
                  SKU / Repuesto
                </th>
                <th className="px-6 py-4 font-ibm-plex text-[11px] font-semibold uppercase tracking-wider text-[#94A3B8]">
                  Marca Vehículo
                </th>
                <th className="px-6 py-4 font-ibm-plex text-[11px] font-semibold uppercase tracking-wider text-[#94A3B8] text-center">
                  Stock / Mínimo
                </th>
                <th className="px-6 py-4 font-ibm-plex text-[11px] font-semibold uppercase tracking-wider text-[#94A3B8]">
                  Precio Venta
                </th>
                {isAdmin && (
                  <th className="px-6 py-4 font-ibm-plex text-[11px] font-semibold uppercase tracking-wider text-[#94A3B8]">
                    Precio Costo
                  </th>
                )}
                <th className="px-6 py-4 font-ibm-plex text-[11px] font-semibold uppercase tracking-wider text-[#94A3B8]">
                  Color
                </th>
                <th className="px-6 py-4 font-ibm-plex text-[11px] font-semibold uppercase tracking-wider text-[#94A3B8] text-right">
                  Acciones
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E2E8F0] text-[#1E293B]">
              {loading ? (
                <tr>
                  <td colSpan={isAdmin ? 7 : 6} className="px-6 py-12 text-center text-[#94A3B8] bg-white font-ibm-plex">
                    <span className="animate-pulse">Cargando catálogo de repuestos...</span>
                  </td>
                </tr>
              ) : repuestos.length > 0 ? (
                repuestos.map((item, index) => {
                  const isCritico = item.cantidad_stock <= item.stock_minimo;
                  const bgClass = index % 2 === 0 ? 'bg-white' : 'bg-[#F8FAFC]';

                  return (
                    <tr key={item.id} className={`${bgClass} hover:bg-slate-100 transition-colors group font-ibm-plex`}>
                      {/* SKU / Repuesto */}
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-lg bg-[#161B27] border border-[#2D3748] flex items-center justify-center overflow-hidden">
                            {item.imagen_url ? (
                              <img src={item.imagen_url} alt={item.nombre_repuesto} className="w-full h-full object-cover" />
                            ) : (
                              <span className="material-symbols-outlined text-[#94A3B8] text-lg">build</span>
                            )}
                          </div>
                          <div>
                            <p className="font-bold text-sm text-[#1E293B]">{item.nombre_repuesto}</p>
                            <p className="text-[10px] text-[#64748B] font-mono">{item.sku}</p>
                          </div>
                        </div>
                      </td>

                      {/* Brand */}
                      <td className="px-6 py-4 text-xs font-semibold text-[#1E293B]">
                        {item.nombre_marca}
                      </td>

                      {/* Stock */}
                      <td className="px-6 py-4 text-center">
                        <div className="flex flex-col items-center justify-center">
                          <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold ${
                            isCritico
                              ? 'bg-red-100 text-red-700 border border-red-200'
                              : 'bg-green-100 text-green-700 border border-green-200'
                          }`}>
                            {item.cantidad_stock} und.
                          </span>
                          <span className="text-[9px] text-[#64748B] mt-0.5 font-bold">Mínimo: {item.stock_minimo}</span>
                        </div>
                      </td>

                      {/* Sale Price */}
                      <td className="px-6 py-4 text-xs font-bold text-[#1E293B]">
                        ${parseFloat(item.precio_venta as string).toFixed(2)}
                      </td>

                      {/* Cost Price (Admin Only) */}
                      {isAdmin && (
                        <td className="px-6 py-4 text-xs font-bold text-[#64748B]">
                          ${parseFloat(item.precio_costo as string || '0').toFixed(2)}
                        </td>
                      )}

                      {/* Color */}
                      <td className="px-6 py-4 text-xs">
                        {item.color ? (
                          <div className="flex items-center gap-1.5">
                            <span className="w-2.5 h-2.5 rounded-full border border-slate-300 shadow-sm" style={{ backgroundColor: item.color.toLowerCase() }}></span>
                            <span className="capitalize text-[#1E293B] font-semibold">{item.color}</span>
                          </div>
                        ) : (
                          <span className="text-[#94A3B8] italic text-xs">Ninguno</span>
                        )}
                      </td>

                      {/* Actions */}
                      <td className="px-6 py-4 text-right">
                        <div className="flex justify-end gap-1 opacity-60 group-hover:opacity-100 transition-opacity">
                          <button
                            onClick={() => handleOpenDetails(item)}
                            title="Ver detalles"
                            className="p-1.5 rounded text-blue-500 hover:bg-blue-100 transition-colors"
                          >
                            <span className="material-symbols-outlined text-lg">visibility</span>
                          </button>
                          {isAdmin && (
                            <>
                              <button
                                onClick={() => handleOpenEdit(item)}
                                title="Editar"
                                className="p-1.5 rounded text-amber-500 hover:bg-amber-100 transition-colors"
                              >
                                <span className="material-symbols-outlined text-lg">edit</span>
                              </button>
                              <button
                                onClick={() => handleDeleteRepuesto(item.id)}
                                title="Eliminar"
                                className="p-1.5 rounded text-red-500 hover:bg-red-100 transition-colors"
                              >
                                <span className="material-symbols-outlined text-lg">delete</span>
                              </button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={isAdmin ? 7 : 6} className="px-6 py-12 text-center text-[#94A3B8] bg-white font-ibm-plex">
                    No se encontraron repuestos en el inventario.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Footer */}
        <div className="p-4 bg-[#161B27]/40 border-t border-[#2D3748] flex items-center justify-between gap-4 font-ibm-plex">
          <p className="text-xs text-[#94A3B8]">
            Mostrando {total > 0 ? indexInicio + 1 : 0}-{Math.min(indexInicio + limite, total)} de {total} repuestos
          </p>

          {totalPaginas > 1 && (
            <div className="flex gap-1 items-center">
              <button
                disabled={pagina === 1}
                onClick={() => setPagina((p) => Math.max(1, p - 1))}
                className="p-1 px-2.5 rounded text-[#94A3B8] hover:bg-white/5 disabled:opacity-30 disabled:hover:bg-transparent text-xs"
              >
                ←
              </button>
              {Array.from({ length: totalPaginas }, (_, idx) => {
                const num = idx + 1;
                const activo = num === pagina;
                return (
                  <button
                    key={num}
                    onClick={() => setPagina(num)}
                    className={`px-3 py-1 text-xs font-semibold rounded transition-all ${
                      activo ? 'bg-[#F97316] text-white' : 'text-[#94A3B8] hover:bg-white/5'
                    }`}
                  >
                    {num}
                  </button>
                );
              })}
              <button
                disabled={pagina === totalPaginas}
                onClick={() => setPagina((p) => Math.min(totalPaginas, p + 1))}
                className="p-1 px-2.5 rounded text-[#94A3B8] hover:bg-white/5 disabled:opacity-30 disabled:hover:bg-transparent text-xs"
              >
                →
              </button>
            </div>
          )}
        </div>
      </div>

      {/* MODAL - CREAR / EDITAR REPUESTO */}
      {modalOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-[#1E2433] border border-[#2D3748] rounded-xl max-w-lg w-full shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200 font-ibm-plex text-white">
            <div className="p-6 border-b border-[#2D3748] flex justify-between items-center bg-[#161B27]/40">
              <h3 className="font-rajdhani text-xl font-bold text-[#F97316]">
                {modalType === 'crear' ? 'Añadir Nuevo Repuesto' : 'Editar Repuesto'}
              </h3>
              <button
                onClick={() => setModalOpen(false)}
                className="text-[#94A3B8] hover:text-[#F1F5F9] transition-colors"
              >
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>

            <form onSubmit={handleSubmitForm} className="p-6 space-y-4">
              {formError && (
                <div className="p-3 bg-red-500/10 border border-red-500/30 rounded-lg text-xs text-red-400 font-semibold">
                  {formError}
                </div>
              )}

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-[10px] uppercase font-bold tracking-wider text-[#94A3B8]">Código SKU</label>
                  <input
                    type="text"
                    required
                    disabled={modalType === 'editar'}
                    value={formFields.sku}
                    onChange={(e) => setFormFields({ ...formFields, sku: e.target.value })}
                    placeholder="Ej. TOY-FIL-001"
                    className="w-full bg-[#161B27] border border-[#2D3748] rounded-lg text-xs py-2.5 px-3 focus:border-[#F97316] outline-none text-white disabled:opacity-40"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] uppercase font-bold tracking-wider text-[#94A3B8]">Marca Vehículo</label>
                  <select
                    value={formFields.id_marca_vehiculo}
                    onChange={(e) => setFormFields({ ...formFields, id_marca_vehiculo: e.target.value })}
                    className="w-full bg-[#161B27] border border-[#2D3748] rounded-lg text-xs py-2.5 px-3 focus:border-[#F97316] outline-none text-white"
                  >
                    {marcas.map((brand) => (
                      <option key={brand.id} value={brand.id}>
                        {brand.nombre_marca}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-[10px] uppercase font-bold tracking-wider text-[#94A3B8]">Nombre del Repuesto</label>
                <input
                  type="text"
                  required
                  value={formFields.nombre_repuesto}
                  onChange={(e) => setFormFields({ ...formFields, nombre_repuesto: e.target.value })}
                  placeholder="Ej. Filtro de Aceite Hilux 2.5"
                  className="w-full bg-[#161B27] border border-[#2D3748] rounded-lg text-xs py-2.5 px-3 focus:border-[#F97316] outline-none text-white"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-[10px] uppercase font-bold tracking-wider text-[#94A3B8]">Precio Venta ($)</label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    value={formFields.precio_venta}
                    onChange={(e) => setFormFields({ ...formFields, precio_venta: e.target.value })}
                    placeholder="0.00"
                    className="w-full bg-[#161B27] border border-[#2D3748] rounded-lg text-xs py-2.5 px-3 focus:border-[#F97316] outline-none text-white"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] uppercase font-bold tracking-wider text-[#94A3B8]">Precio Costo ($)</label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    value={formFields.precio_costo}
                    onChange={(e) => setFormFields({ ...formFields, precio_costo: e.target.value })}
                    placeholder="0.00"
                    className="w-full bg-[#161B27] border border-[#2D3748] rounded-lg text-xs py-2.5 px-3 focus:border-[#F97316] outline-none text-white"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-1">
                  <label className="text-[10px] uppercase font-bold tracking-wider text-[#94A3B8]">Stock Inicial</label>
                  <input
                    type="number"
                    required
                    value={formFields.cantidad_stock}
                    onChange={(e) => setFormFields({ ...formFields, cantidad_stock: e.target.value })}
                    className="w-full bg-[#161B27] border border-[#2D3748] rounded-lg text-xs py-2.5 px-3 focus:border-[#F97316] outline-none text-white"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] uppercase font-bold tracking-wider text-[#94A3B8]">Stock Mínimo</label>
                  <input
                    type="number"
                    required
                    value={formFields.stock_minimo}
                    onChange={(e) => setFormFields({ ...formFields, stock_minimo: e.target.value })}
                    className="w-full bg-[#161B27] border border-[#2D3748] rounded-lg text-xs py-2.5 px-3 focus:border-[#F97316] outline-none text-white"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] uppercase font-bold tracking-wider text-[#94A3B8]">Color (Filtro)</label>
                  <input
                    type="text"
                    value={formFields.color}
                    onChange={(e) => setFormFields({ ...formFields, color: e.target.value })}
                    placeholder="Negro, Gris, etc."
                    className="w-full bg-[#161B27] border border-[#2D3748] rounded-lg text-xs py-2.5 px-3 focus:border-[#F97316] outline-none text-white"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1 col-span-2">
                  <label className="text-[10px] uppercase font-bold tracking-wider text-[#94A3B8]">URL Imagen (Opcional)</label>
                  <input
                    type="text"
                    value={formFields.imagen_url}
                    onChange={(e) => setFormFields({ ...formFields, imagen_url: e.target.value })}
                    placeholder="https://ejemplo.com/imagen.jpg"
                    className="w-full bg-[#161B27] border border-[#2D3748] rounded-lg text-xs py-2.5 px-3 focus:border-[#F97316] outline-none text-white"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-[10px] uppercase font-bold tracking-wider text-[#94A3B8]">Descripción</label>
                <textarea
                  value={formFields.descripcion}
                  onChange={(e) => setFormFields({ ...formFields, descripcion: e.target.value })}
                  placeholder="Detalles sobre compatibilidad, marcas alternativas, etc."
                  rows={3}
                  className="w-full bg-[#161B27] border border-[#2D3748] rounded-lg text-xs py-2.5 px-3 focus:border-[#F97316] outline-none text-white resize-none"
                />
              </div>

              <div className="pt-4 border-t border-[#2D3748] flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className="px-4 py-2 rounded-lg border border-[#2D3748] text-slate-300 text-xs font-semibold uppercase tracking-wider hover:bg-white/5 transition-all"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-lg bg-[#F97316] text-white text-xs font-semibold uppercase tracking-wider hover:bg-[#EA6C0A] transition-all"
                >
                  {modalType === 'crear' ? 'Añadir' : 'Guardar'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL - DETALLES DEL REPUESTO */}
      {detailModalOpen && selectedRepuesto && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-[#1E2433] border border-[#2D3748] rounded-xl max-w-2xl w-full shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200 font-ibm-plex text-white">
            <div className="p-6 border-b border-[#2D3748] flex justify-between items-center bg-[#161B27]/40">
              <h3 className="font-rajdhani text-xl font-bold text-[#F97316]">
                Detalles del Repuesto
              </h3>
              <button
                onClick={() => setDetailModalOpen(false)}
                className="text-[#94A3B8] hover:text-[#F1F5F9] transition-colors"
              >
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>

            <div className="p-6 space-y-6 max-h-[80vh] overflow-y-auto">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {/* Repuesto Image */}
                <div className="w-full h-40 bg-[#161B27] border border-[#2D3748] rounded-lg flex items-center justify-center overflow-hidden">
                  {selectedRepuesto.imagen_url ? (
                    <img src={selectedRepuesto.imagen_url} alt={selectedRepuesto.nombre_repuesto} className="w-full h-full object-cover" />
                  ) : (
                    <span className="material-symbols-outlined text-[#94A3B8] text-4xl">build</span>
                  )}
                </div>

                {/* Core metadata */}
                <div className="md:col-span-2 space-y-3">
                  <div>
                    <span className="px-2 py-0.5 bg-[#F97316]/20 text-[#F97316] border border-[#F97316]/30 rounded text-[10px] uppercase font-bold tracking-wider">
                      {selectedRepuesto.nombre_marca}
                    </span>
                    <h4 className="font-rajdhani text-2xl font-bold text-[#F1F5F9] mt-1">{selectedRepuesto.nombre_repuesto}</h4>
                    <p className="text-xs text-[#94A3B8] font-mono mt-0.5">SKU: {selectedRepuesto.sku}</p>
                  </div>

                  <div className="grid grid-cols-2 gap-4 pt-2">
                    <div>
                      <p className="text-[10px] uppercase font-bold text-[#94A3B8] tracking-wider">Precio Venta</p>
                      <p className="text-xl font-bold text-[#F1F5F9]">${parseFloat(selectedRepuesto.precio_venta as string).toFixed(2)}</p>
                    </div>
                    {isAdmin && (
                      <div>
                        <p className="text-[10px] uppercase font-bold text-[#94A3B8] tracking-wider">Precio Costo Actual</p>
                        <p className="text-xl font-bold text-[#94A3B8]">${parseFloat(selectedRepuesto.precio_costo as string || '0').toFixed(2)}</p>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Stock and details */}
              <div className="grid grid-cols-3 gap-4 border-t border-b border-[#2D3748] py-4">
                <div className="text-center">
                  <p className="text-[10px] uppercase font-bold text-[#94A3B8] tracking-wider">Stock Disponible</p>
                  <p className="text-lg font-bold text-[#F1F5F9] mt-1">{selectedRepuesto.cantidad_stock} und.</p>
                </div>
                <div className="text-center">
                  <p className="text-[10px] uppercase font-bold text-[#94A3B8] tracking-wider">Stock Mínimo</p>
                  <p className="text-lg font-bold text-[#F1F5F9] mt-1">{selectedRepuesto.stock_minimo} und.</p>
                </div>
                <div className="text-center">
                  <p className="text-[10px] uppercase font-bold text-[#94A3B8] tracking-wider">Color Registro</p>
                  <p className="text-lg font-bold text-[#F1F5F9] capitalize mt-1">{selectedRepuesto.color || 'Ninguno'}</p>
                </div>
              </div>

              {/* Description */}
              {selectedRepuesto.descripcion && (
                <div className="space-y-1">
                  <h5 className="text-[10px] uppercase font-bold text-[#94A3B8] tracking-wider">Descripción del repuesto</h5>
                  <p className="text-xs text-slate-300 leading-relaxed bg-[#161B27]/40 p-3 rounded-lg border border-[#2D3748]">
                    {selectedRepuesto.descripcion}
                  </p>
                </div>
              )}

              {/* Cost history (Only for admin) */}
              {isAdmin && (
                <div className="space-y-2 border-t border-[#2D3748] pt-4">
                  <h5 className="text-[10px] uppercase font-bold text-[#94A3B8] tracking-wider">Historial de Costos de Recepción</h5>
                  <div className="overflow-x-auto rounded-lg border border-[#2D3748] bg-[#161B27]/20">
                    <table className="w-full text-left border-collapse">
                      <thead>
                        <tr className="bg-[#161B27] border-b border-[#2D3748]">
                          <th className="px-4 py-2.5 font-ibm-plex text-[10px] font-bold uppercase tracking-wider text-[#94A3B8]">Orden Compra</th>
                          <th className="px-4 py-2.5 font-ibm-plex text-[10px] font-bold uppercase tracking-wider text-[#94A3B8]">Precio Costo</th>
                          <th className="px-4 py-2.5 font-ibm-plex text-[10px] font-bold uppercase tracking-wider text-[#94A3B8] text-center">Cantidad</th>
                          <th className="px-4 py-2.5 font-ibm-plex text-[10px] font-bold uppercase tracking-wider text-[#94A3B8] text-right">Registrado En</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-[#2D3748] text-xs text-slate-300">
                        {historialCostos.length > 0 ? (
                          historialCostos.map((hist) => (
                            <tr key={hist.id_orden} className="hover:bg-white/5 transition-colors">
                              <td className="px-4 py-2 font-semibold text-[#F97316] font-mono">{hist.numero_orden}</td>
                              <td className="px-4 py-2 font-bold">${parseFloat(hist.precio_costo as string).toFixed(2)}</td>
                              <td className="px-4 py-2 text-center">{hist.cantidad} und.</td>
                              <td className="px-4 py-2 text-right text-slate-400">{new Date(hist.registrado_en).toLocaleDateString()}</td>
                            </tr>
                          ))
                        ) : (
                          <tr>
                            <td colSpan={4} className="px-4 py-6 text-center text-[#94A3B8] italic">
                              No hay recepciones registradas para este repuesto.
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>

            <div className="p-6 border-t border-[#2D3748] flex justify-end bg-[#161B27]/20">
              <button
                type="button"
                onClick={() => setDetailModalOpen(false)}
                className="px-4 py-2 rounded-lg bg-[#2D3748] text-[#F1F5F9] text-xs font-semibold uppercase tracking-wider hover:bg-[#F97316] transition-all font-ibm-plex"
              >
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
