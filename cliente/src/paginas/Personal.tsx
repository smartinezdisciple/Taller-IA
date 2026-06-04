import React, { useState } from 'react';
import TablaUniversal from '../componentes/TablaUniversal';

interface Empleado {
  id: string;
  nombre: string;
  opId: string;
  cargo: string;
  especialidad: string;
  disponibilidad: 'disponible' | 'tarea' | 'ausente';
  cargaTrabajo: number; // percentage 0-100
  ultimaActividadHora: string;
  ultimaActividadDetalle: string;
  imgUrl: string;
}

export default function Personal() {
  const [modalAbierto, setModalAbierto] = useState(false);
  const [personal, setPersonal] = useState<Empleado[]>([
    {
      id: '1',
      nombre: 'Ricardo Mendoza',
      opId: '#OP-8842',
      cargo: 'Mecánico Senior',
      especialidad: 'Espec. Transmisiones',
      disponibilidad: 'disponible',
      cargaTrabajo: 15,
      ultimaActividadHora: 'Hace 4 min',
      ultimaActividadDetalle: 'Registro Entrada',
      imgUrl: '/imagenes/imagen_4.png'
    },
    {
      id: '2',
      nombre: 'Elena Vargas',
      opId: '#AD-1102',
      cargo: 'Admin. Inventario',
      especialidad: 'Logística de Repuestos',
      disponibilidad: 'tarea',
      cargaTrabajo: 88,
      ultimaActividadHora: 'Activa',
      ultimaActividadDetalle: 'Auditando Stock B-4',
      imgUrl: '/imagenes/imagen_2.png'
    },
    {
      id: '3',
      nombre: 'Marcos Ruiz',
      opId: '#OP-9055',
      cargo: 'Mecánico Junior',
      especialidad: 'Mantenimiento Rápido',
      disponibilidad: 'ausente',
      cargaTrabajo: 0,
      ultimaActividadHora: 'Ayer, 18:00',
      ultimaActividadDetalle: 'Fin de Jornada',
      imgUrl: '/imagenes/imagen_5.png'
    }
  ]);

  const [nuevoEmpleado, setNuevoEmpleado] = useState({
    nombre: '',
    cargo: 'Mecánico Junior',
    especialidad: '',
    disponibilidad: 'disponible' as 'disponible' | 'tarea' | 'ausente',
    cargaTrabajo: 0
  });

  const handleCrearEmpleado = (e: React.FormEvent) => {
    e.preventDefault();
    if (!nuevoEmpleado.nombre) return;
    const item: Empleado = {
      id: Date.now().toString(),
      nombre: nuevoEmpleado.nombre,
      opId: `#OP-${Math.floor(Math.random() * 9000) + 1000}`,
      cargo: nuevoEmpleado.cargo,
      especialidad: nuevoEmpleado.especialidad || 'General',
      disponibilidad: nuevoEmpleado.disponibilidad,
      cargaTrabajo: nuevoEmpleado.cargaTrabajo,
      ultimaActividadHora: 'Hace un momento',
      ultimaActividadDetalle: 'Registrado en sistema',
      imgUrl: '/imagenes/imagen_6.png' // Default avatar
    };
    setPersonal([item, ...personal]);
    setModalAbierto(false);
    setNuevoEmpleado({ nombre: '', cargo: 'Mecánico Junior', especialidad: '', disponibilidad: 'disponible', cargaTrabajo: 0 });
  };

  const headers = [
    'Empleado',
    'Cargo / Especialidad',
    'Disponibilidad',
    'Carga de Trabajo',
    'Última Actividad',
    'Acciones'
  ];

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      {/* Bento Grid - Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-[#1E2433] border border-[#2D3748] p-6 rounded-xl flex flex-col justify-between shadow-lg">
          <div className="flex justify-between items-start">
            <span className="text-texto-secundario font-ibm-plex text-[10px] uppercase font-bold tracking-wider">Personal Total</span>
            <span className="material-symbols-outlined text-acento">groups</span>
          </div>
          <div>
            <p className="text-3xl font-rajdhani font-bold text-texto-principal mt-4">42</p>
            <p className="text-xs text-exito flex items-center gap-1 mt-1 font-semibold">
              <span className="material-symbols-outlined text-xs">trending_up</span>
              +3 este mes
            </p>
          </div>
        </div>

        <div className="bg-[#1E2433] border border-[#2D3748] p-6 rounded-xl flex flex-col justify-between shadow-lg">
          <div className="flex justify-between items-start">
            <span className="text-texto-secundario font-ibm-plex text-[10px] uppercase font-bold tracking-wider">En Turno (Ahora)</span>
            <span className="material-symbols-outlined text-exito">check_circle</span>
          </div>
          <div>
            <p className="text-3xl font-rajdhani font-bold text-texto-principal mt-4">28</p>
            <p className="text-xs text-texto-secundario mt-1">66% de la capacidad total</p>
          </div>
        </div>

        <div className="bg-[#1E2433] border border-[#2D3748] p-6 rounded-xl flex flex-col justify-between shadow-lg">
          <div className="flex justify-between items-start">
            <span className="text-texto-secundario font-ibm-plex text-[10px] uppercase font-bold tracking-wider">Mecánicos Líderes</span>
            <span className="material-symbols-outlined text-advertencia">star</span>
          </div>
          <div>
            <p className="text-3xl font-rajdhani font-bold text-texto-principal mt-4">12</p>
            <p className="text-xs text-texto-secundario mt-1">Especialistas certificados</p>
          </div>
        </div>

        <div className="bg-[#1E2433] border border-[#2D3748] p-6 rounded-xl flex flex-col justify-between shadow-lg">
          <div className="flex justify-between items-start">
            <span className="text-texto-secundario font-ibm-plex text-[10px] uppercase font-bold tracking-wider">Bajas/Vacaciones</span>
            <span className="material-symbols-outlined text-error">event_busy</span>
          </div>
          <div>
            <p className="text-3xl font-rajdhani font-bold text-texto-principal mt-4">05</p>
            <p className="text-xs text-texto-secundario mt-1">Retorno previsto: 48h</p>
          </div>
        </div>
      </div>

      {/* Table Section */}
      <TablaUniversal<Empleado>
        titulo="Listado de Empleados"
        subtitulo="Control de disponibilidad y roles operativos en tiempo real."
        headers={headers}
        datos={personal}
        buscarPor={(p) => `${p.nombre} ${p.opId} ${p.cargo} ${p.especialidad}`}
        buscarPlaceholder="Buscar por nombre, cargo, especialidad..."
        itemsPorPagina={5}
        botonesAccionHeader={
          <>
            <div className="hidden sm:flex gap-3">
              <div className="flex items-center gap-2 px-3 py-1 bg-[#1E2433] border border-[#2D3748] rounded-lg">
                <div className="w-2 h-2 rounded-full bg-exito"></div>
                <span className="text-[10px] font-bold text-[#94A3B8] uppercase">Disponible</span>
              </div>
              <div className="flex items-center gap-2 px-3 py-1 bg-[#1E2433] border border-[#2D3748] rounded-lg">
                <div className="w-2 h-2 rounded-full bg-advertencia"></div>
                <span className="text-[10px] font-bold text-[#94A3B8] uppercase">En Tarea</span>
              </div>
              <div className="flex items-center gap-2 px-3 py-1 bg-[#1E2433] border border-[#2D3748] rounded-lg">
                <div className="w-2 h-2 rounded-full bg-error"></div>
                <span className="text-[10px] font-bold text-[#94A3B8] uppercase">Ausente</span>
              </div>
            </div>
            <button
              onClick={() => setModalAbierto(true)}
              className="px-4 py-2 bg-acento text-white text-xs font-semibold uppercase tracking-wider rounded-lg flex items-center gap-2 hover:bg-[#EA6C0A] transition-all shadow-md shadow-acento/20"
            >
              <span className="material-symbols-outlined text-sm">person_add</span>
              Añadir Operativo
            </button>
          </>
        }
        renderRow={(item, index, bgClass) => (
          <tr key={item.id} className={`${bgClass} hover:bg-[#F1F5F9] transition-colors group`}>
            {/* Empleado */}
            <td className="px-6 py-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-[#161B27] border border-[#2D3748] flex items-center justify-center overflow-hidden">
                  <img
                    alt={item.nombre}
                    className="w-full h-full object-cover"
                    src={item.imgUrl}
                  />
                </div>
                <div>
                  <p className="font-bold text-texto-datos text-sm">{item.nombre}</p>
                  <p className="text-[10px] text-[#64748B] font-mono">{item.opId}</p>
                </div>
              </div>
            </td>

            {/* Cargo */}
            <td className="px-6 py-4">
              <span className="px-2 py-0.5 rounded bg-slate-100 text-slate-700 text-[10px] font-bold tracking-wider uppercase border border-slate-200">
                {item.cargo}
              </span>
              <p className="text-[10px] text-[#64748B] mt-1 font-semibold">{item.especialidad}</p>
            </td>

            {/* Disponibilidad */}
            <td className="px-6 py-4">
              <div className="flex items-center gap-2">
                <span className={`w-2 h-2 rounded-full ${
                  item.disponibilidad === 'disponible' ? 'bg-exito animate-pulse' :
                  item.disponibilidad === 'tarea' ? 'bg-advertencia' : 'bg-error'
                }`}></span>
                <span className={`text-xs font-semibold capitalize ${
                  item.disponibilidad === 'disponible' ? 'text-exito' :
                  item.disponibilidad === 'tarea' ? 'text-advertencia' : 'text-error'
                }`}>
                  {item.disponibilidad === 'disponible' ? 'Disponible' :
                   item.disponibilidad === 'tarea' ? 'En Tarea' : 'Ausente'}
                </span>
              </div>
            </td>

            {/* Carga de Trabajo */}
            <td className="px-6 py-4">
              {item.cargaTrabajo > 0 ? (
                <>
                  <div className="w-28 bg-[#CBD5E1] h-1.5 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full ${
                        item.cargaTrabajo > 80 ? 'bg-error' :
                        item.cargaTrabajo > 40 ? 'bg-advertencia' : 'bg-exito'
                      }`}
                      style={{ width: `${item.cargaTrabajo}%` }}
                    ></div>
                  </div>
                  <p className="text-[9px] text-[#64748B] mt-1 font-bold">{item.cargaTrabajo}% Capacidad</p>
                </>
              ) : (
                <p className="text-xs text-[#94A3B8] italic font-semibold">Inactivo</p>
              )}
            </td>

            {/* Ultima Actividad */}
            <td className="px-6 py-4">
              <p className="text-xs text-texto-datos font-mono font-semibold">{item.ultimaActividadHora}</p>
              <p className="text-[10px] text-[#64748B] mt-0.5">{item.ultimaActividadDetalle}</p>
            </td>

            {/* Acciones */}
            <td className="px-6 py-4 text-right">
              <div className="flex justify-end gap-1.5 opacity-60 group-hover:opacity-100 transition-opacity">
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

      {/* Modal - Añadir Operativo */}
      {modalAbierto && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-[#1E2433] border border-[#2D3748] rounded-xl max-w-md w-full shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            <div className="p-6 border-b border-[#2D3748] flex justify-between items-center bg-[#161B27]/40">
              <h3 className="font-rajdhani text-xl font-bold text-acento">Añadir Personal Operativo</h3>
              <button
                onClick={() => setModalAbierto(false)}
                className="text-texto-secundario hover:text-texto-principal transition-colors"
              >
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>
            <form onSubmit={handleCrearEmpleado} className="p-6 space-y-4">
              <div className="space-y-1">
                <label className="text-[10px] uppercase font-bold tracking-wider text-texto-secundario">Nombre Completo</label>
                <input
                  type="text"
                  required
                  value={nuevoEmpleado.nombre}
                  onChange={(e) => setNuevoEmpleado({ ...nuevoEmpleado, nombre: e.target.value })}
                  placeholder="Ej. Ricardo Mendoza"
                  className="w-full bg-[#161B27] border border-[#2D3748] rounded-lg text-xs text-texto-principal py-2.5 px-3 focus:border-acento outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-[10px] uppercase font-bold tracking-wider text-texto-secundario">Cargo / Rol</label>
                  <select
                    value={nuevoEmpleado.cargo}
                    onChange={(e) => setNuevoEmpleado({ ...nuevoEmpleado, cargo: e.target.value })}
                    className="w-full bg-[#161B27] border border-[#2D3748] rounded-lg text-xs text-texto-principal py-2.5 focus:border-acento outline-none"
                  >
                    <option value="Mecánico Senior">Mecánico Senior</option>
                    <option value="Mecánico Junior">Mecánico Junior</option>
                    <option value="Admin. Inventario">Admin. Inventario</option>
                    <option value="Supervisor Taller">Supervisor Taller</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] uppercase font-bold tracking-wider text-texto-secundario">Especialidad</label>
                  <input
                    type="text"
                    required
                    value={nuevoEmpleado.especialidad}
                    onChange={(e) => setNuevoEmpleado({ ...nuevoEmpleado, especialidad: e.target.value })}
                    placeholder="Ej. Transmisiones"
                    className="w-full bg-[#161B27] border border-[#2D3748] rounded-lg text-xs text-texto-principal py-2.5 px-3 focus:border-acento outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-[10px] uppercase font-bold tracking-wider text-texto-secundario">Disponibilidad Inicial</label>
                  <select
                    value={nuevoEmpleado.disponibilidad}
                    onChange={(e) => setNuevoEmpleado({ ...nuevoEmpleado, disponibilidad: e.target.value as any })}
                    className="w-full bg-[#161B27] border border-[#2D3748] rounded-lg text-xs text-texto-principal py-2.5 focus:border-acento outline-none"
                  >
                    <option value="disponible">Disponible</option>
                    <option value="tarea">En Tarea</option>
                    <option value="ausente">Ausente</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] uppercase font-bold tracking-wider text-texto-secundario">Carga de Trabajo (%)</label>
                  <input
                    type="number"
                    min="0"
                    max="100"
                    required
                    value={nuevoEmpleado.cargaTrabajo}
                    onChange={(e) => setNuevoEmpleado({ ...nuevoEmpleado, cargaTrabajo: parseInt(e.target.value) || 0 })}
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
                  Añadir
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
