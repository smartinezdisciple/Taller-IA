import React, { useState } from 'react';
import TablaUniversal from '../componentes/TablaUniversal';

interface Cliente {
  id: number;
  nombre: string;
  identificacion: string;
  email: string;
  telefono: string;
  vehiculoMarca: string;
  vehiculoModelo: string;
  placa: string;
  serviciosCount: number;
  ultimoServicio: string;
  tipo: 'empresa' | 'persona';
  imgUrl?: string;
}

export default function Clientes() {
  const [modalAbierto, setModalAbierto] = useState(false);
  const [clientes, setClientes] = useState<Cliente[]>([
    {
      id: 1,
      nombre: 'Logística Express S.A.',
      identificacion: 'NIT: 900.234.122-1',
      email: 'j.ortiz@logistica.com',
      telefono: '+57 310 445 9901',
      vehiculoMarca: 'HINO-2023',
      vehiculoModelo: 'GH-500-D',
      placa: 'ABC-123',
      serviciosCount: 18,
      ultimoServicio: '12/10/23',
      tipo: 'empresa'
    },
    {
      id: 2,
      nombre: 'Ricardo Mendoza',
      identificacion: 'C.C. 79.443.210',
      email: 'rmendoza@email.com',
      telefono: '+57 321 000 1234',
      vehiculoMarca: 'TOYOTA-2022',
      vehiculoModelo: 'HILUX GR',
      placa: 'XYZ-789',
      serviciosCount: 4,
      ultimoServicio: '05/11/23',
      tipo: 'persona',
      imgUrl: '/imagenes/imagen_8.png'
    },
    {
      id: 3,
      nombre: 'Elena Restrepo',
      identificacion: 'C.C. 1.020.344.112',
      email: 'elena.res@corp.co',
      telefono: '+57 304 991 8822',
      vehiculoMarca: 'MAZDA-2021',
      vehiculoModelo: 'CX-50',
      placa: 'MKL-456',
      serviciosCount: 2,
      ultimoServicio: '01/09/23',
      tipo: 'persona'
    }
  ]);

  const [nuevoCliente, setNuevoCliente] = useState({
    nombre: '',
    identificacion: '',
    email: '',
    telefono: '',
    vehiculoMarca: '',
    vehiculoModelo: '',
    placa: '',
    tipo: 'persona' as 'empresa' | 'persona'
  });

  const handleCrearCliente = (e: React.FormEvent) => {
    e.preventDefault();
    const cliente: Cliente = {
      id: Date.now(),
      nombre: nuevoCliente.nombre,
      identificacion: nuevoCliente.tipo === 'empresa' ? `NIT: ${nuevoCliente.identificacion}` : `C.C. ${nuevoCliente.identificacion}`,
      email: nuevoCliente.email,
      telefono: nuevoCliente.telefono,
      vehiculoMarca: nuevoCliente.vehiculoMarca,
      vehiculoModelo: nuevoCliente.vehiculoModelo,
      placa: nuevoCliente.placa,
      serviciosCount: 0,
      ultimoServicio: 'N/A',
      tipo: nuevoCliente.tipo
    };
    setClientes([cliente, ...clientes]);
    setModalAbierto(false);
    setNuevoCliente({
      nombre: '',
      identificacion: '',
      email: '',
      telefono: '',
      vehiculoMarca: '',
      vehiculoModelo: '',
      placa: '',
      tipo: 'persona'
    });
  };

  const headers = [
    'Nombre / Empresa',
    'Contacto',
    'Vehículo Principal',
    'Historial',
    'Acciones'
  ];

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      {/* KPI Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-[#1E2433] border border-[#2D3748] p-6 rounded-xl shadow-lg">
          <p className="font-ibm-plex text-[10px] uppercase font-bold tracking-wider text-texto-secundario mb-2">Total Clientes</p>
          <div className="flex items-baseline gap-2">
            <span className="font-rajdhani text-4xl font-bold text-acento">1,284</span>
            <span className="text-exito text-xs font-bold font-ibm-plex">+12%</span>
          </div>
        </div>
        <div className="bg-[#1E2433] border border-[#2D3748] p-6 rounded-xl shadow-lg">
          <p className="font-ibm-plex text-[10px] uppercase font-bold tracking-wider text-texto-secundario mb-2">Clientes Activos</p>
          <div className="flex items-baseline gap-2">
            <span className="font-rajdhani text-4xl font-bold text-[#F1F5F9]">856</span>
            <span className="text-texto-secundario text-[11px] font-ibm-plex">Mes actual</span>
          </div>
        </div>
        <div className="bg-[#1E2433] border border-[#2D3748] p-6 rounded-xl shadow-lg">
          <p className="font-ibm-plex text-[10px] uppercase font-bold tracking-wider text-texto-secundario mb-2">Vehículos Registrados</p>
          <div className="flex items-baseline gap-2">
            <span className="font-rajdhani text-4xl font-bold text-[#F1F5F9]">2,042</span>
            <span className="text-texto-secundario text-[11px] font-ibm-plex">Flota total</span>
          </div>
        </div>
        <div className="bg-[#1E2433] border border-[#2D3748] p-6 rounded-xl shadow-lg">
          <p className="font-ibm-plex text-[10px] uppercase font-bold tracking-wider text-texto-secundario mb-2">Prom. Servicios / Año</p>
          <div className="flex items-baseline gap-2">
            <span className="font-rajdhani text-4xl font-bold text-advertencia">3.4</span>
            <span className="text-texto-secundario text-[11px] font-ibm-plex">Lealtad</span>
          </div>
        </div>
      </div>

      {/* Table Section */}
      <TablaUniversal<Cliente>
        titulo="Directorio de Clientes"
        subtitulo="Administra la base de datos de propietarios y el historial técnico de sus flotas y vehículos particulares."
        headers={headers}
        datos={clientes}
        buscarPor={(c) => `${c.nombre} ${c.identificacion} ${c.placa} ${c.vehiculoModelo}`}
        buscarPlaceholder="Buscar por nombre, NIT/CC, placa..."
        itemsPorPagina={5}
        botonesAccionHeader={
          <>
            <button className="px-4 py-2 rounded-lg border border-[#2D3748] bg-[#1E2433] text-[#F1F5F9] text-xs font-semibold uppercase tracking-wider flex items-center gap-2 hover:bg-[#161B27] transition-all">
              <span className="material-symbols-outlined text-sm">filter_list</span>
              Filtrar
            </button>
            <button
              onClick={() => setModalAbierto(true)}
              className="px-4 py-2 rounded-lg bg-acento text-white text-xs font-semibold uppercase tracking-wider flex items-center gap-2 hover:bg-[#EA6C0A] transition-all shadow-md shadow-acento/20"
            >
              <span className="material-symbols-outlined text-sm">person_add</span>
              Registrar Cliente
            </button>
          </>
        }
        renderRow={(item, index, bgClass) => (
          <tr key={item.id} className={`${bgClass} hover:bg-[#F1F5F9] transition-colors group`}>
            {/* Nombre */}
            <td className="px-6 py-4">
              <div className="flex items-center gap-3">
                {item.imgUrl ? (
                  <img
                    alt={item.nombre}
                    className="w-10 h-10 rounded object-cover border border-[#CBD5E1]"
                    src={item.imgUrl}
                  />
                ) : (
                  <div className="w-10 h-10 bg-[#161B27] flex items-center justify-center rounded border border-[#2D3748]">
                    <span className="material-symbols-outlined text-acento text-xl">
                      {item.tipo === 'empresa' ? 'business' : 'person'}
                    </span>
                  </div>
                )}
                <div>
                  <p className="font-bold text-texto-datos text-sm">{item.nombre}</p>
                  <p className="text-xs text-[#64748B]">{item.identificacion}</p>
                </div>
              </div>
            </td>

            {/* Contacto */}
            <td className="px-6 py-4">
              <p className="text-xs text-texto-datos font-semibold">{item.email}</p>
              <p className="text-[11px] text-[#64748B] font-mono mt-0.5">{item.telefono}</p>
            </td>

            {/* Vehiculo */}
            <td className="px-6 py-4">
              <div className="flex items-center gap-2">
                <span className="px-2 py-0.5 bg-[#1E2433] text-white text-[9px] font-bold rounded">
                  {item.vehiculoMarca}
                </span>
                <span className="text-xs font-mono font-bold text-acento">
                  {item.vehiculoModelo}
                </span>
              </div>
              <p className="text-[10px] text-[#64748B] mt-1 font-semibold">Placa: {item.placa}</p>
            </td>

            {/* Historial */}
            <td className="px-6 py-4">
              <div className="flex items-center gap-2">
                <span className="px-2 py-0.5 bg-green-100 text-green-800 text-[9px] font-bold rounded">
                  {item.serviciosCount} SERVICIOS
                </span>
                <span className="text-[11px] text-[#64748B]">Últ: {item.ultimoServicio}</span>
              </div>
            </td>

            {/* Acciones */}
            <td className="px-6 py-4">
              <div className="flex justify-center gap-1.5 opacity-60 group-hover:opacity-100 transition-opacity">
                <button className="p-1.5 rounded text-blue-500 hover:bg-blue-50 transition-colors">
                  <span className="material-symbols-outlined text-lg">visibility</span>
                </button>
                <button className="p-1.5 rounded text-amber-500 hover:bg-amber-50 transition-colors">
                  <span className="material-symbols-outlined text-lg">edit</span>
                </button>
                <button className="p-1.5 rounded text-red-500 hover:bg-red-50 transition-colors">
                  <span className="material-symbols-outlined text-lg">delete</span>
                </button>
              </div>
            </td>
          </tr>
        )}
      />

      {/* Modal - Registrar Cliente */}
      {modalAbierto && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-[#1E2433] border border-[#2D3748] rounded-xl max-w-md w-full shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            <div className="p-6 border-b border-[#2D3748] flex justify-between items-center bg-[#161B27]/40">
              <h3 className="font-rajdhani text-xl font-bold text-acento">Registrar Nuevo Cliente</h3>
              <button
                onClick={() => setModalAbierto(false)}
                className="text-texto-secundario hover:text-texto-principal transition-colors"
              >
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>
            <form onSubmit={handleCrearCliente} className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2 space-y-1">
                  <label className="text-[10px] uppercase font-bold tracking-wider text-texto-secundario">Tipo de Cliente</label>
                  <select
                    value={nuevoCliente.tipo}
                    onChange={(e) => setNuevoCliente({ ...nuevoCliente, tipo: e.target.value as 'persona' | 'empresa' })}
                    className="w-full bg-[#161B27] border border-[#2D3748] rounded-lg text-xs text-texto-principal py-2.5 focus:border-acento outline-none"
                  >
                    <option value="persona">Persona Natural</option>
                    <option value="empresa">Empresa / Jurídico</option>
                  </select>
                </div>

                <div className="col-span-2 space-y-1">
                  <label className="text-[10px] uppercase font-bold tracking-wider text-texto-secundario">Nombre / Razón Social</label>
                  <input
                    type="text"
                    required
                    value={nuevoCliente.nombre}
                    onChange={(e) => setNuevoCliente({ ...nuevoCliente, nombre: e.target.value })}
                    placeholder="Ej. Juan Pérez o Distribuidora SAS"
                    className="w-full bg-[#161B27] border border-[#2D3748] rounded-lg text-xs text-texto-principal py-2.5 px-3 focus:border-acento outline-none"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] uppercase font-bold tracking-wider text-texto-secundario">Cédula / NIT</label>
                  <input
                    type="text"
                    required
                    value={nuevoCliente.identificacion}
                    onChange={(e) => setNuevoCliente({ ...nuevoCliente, identificacion: e.target.value })}
                    placeholder="12345678-9"
                    className="w-full bg-[#161B27] border border-[#2D3748] rounded-lg text-xs text-texto-principal py-2.5 px-3 focus:border-acento outline-none"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] uppercase font-bold tracking-wider text-texto-secundario">Teléfono</label>
                  <input
                    type="text"
                    required
                    value={nuevoCliente.telefono}
                    onChange={(e) => setNuevoCliente({ ...nuevoCliente, telefono: e.target.value })}
                    placeholder="+57 300 000 0000"
                    className="w-full bg-[#161B27] border border-[#2D3748] rounded-lg text-xs text-texto-principal py-2.5 px-3 focus:border-acento outline-none"
                  />
                </div>

                <div className="col-span-2 space-y-1">
                  <label className="text-[10px] uppercase font-bold tracking-wider text-texto-secundario">Correo Electrónico</label>
                  <input
                    type="email"
                    required
                    value={nuevoCliente.email}
                    onChange={(e) => setNuevoCliente({ ...nuevoCliente, email: e.target.value })}
                    placeholder="nombre@ejemplo.com"
                    className="w-full bg-[#161B27] border border-[#2D3748] rounded-lg text-xs text-texto-principal py-2.5 px-3 focus:border-acento outline-none"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] uppercase font-bold tracking-wider text-texto-secundario">Marca Vehículo</label>
                  <input
                    type="text"
                    required
                    value={nuevoCliente.vehiculoMarca}
                    onChange={(e) => setNuevoCliente({ ...nuevoCliente, vehiculoMarca: e.target.value })}
                    placeholder="TOYOTA"
                    className="w-full bg-[#161B27] border border-[#2D3748] rounded-lg text-xs text-texto-principal py-2.5 px-3 focus:border-acento outline-none"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] uppercase font-bold tracking-wider text-texto-secundario">Modelo / Línea</label>
                  <input
                    type="text"
                    required
                    value={nuevoCliente.vehiculoModelo}
                    onChange={(e) => setNuevoCliente({ ...nuevoCliente, vehiculoModelo: e.target.value })}
                    placeholder="HILUX"
                    className="w-full bg-[#161B27] border border-[#2D3748] rounded-lg text-xs text-texto-principal py-2.5 px-3 focus:border-acento outline-none"
                  />
                </div>

                <div className="col-span-2 space-y-1">
                  <label className="text-[10px] uppercase font-bold tracking-wider text-texto-secundario">Placa</label>
                  <input
                    type="text"
                    required
                    value={nuevoCliente.placa}
                    onChange={(e) => setNuevoCliente({ ...nuevoCliente, placa: e.target.value })}
                    placeholder="XXX-000"
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
                  Guardar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
