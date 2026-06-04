import React, { useState } from 'react';
import TablaUniversal from '../componentes/TablaUniversal';

interface RolItem {
  id: number;
  nombre: string;
  descripcion: string;
  usuariosCount: number;
  colorClase: string;
  avatarList?: string[];
}

export default function Roles() {
  const [modalAbierto, setModalAbierto] = useState(false);
  const [roles, setRoles] = useState<RolItem[]>([
    {
      id: 1,
      nombre: 'Super Administrador',
      descripcion: 'Acceso total al sistema, gestión de finanzas y configuración global.',
      usuariosCount: 3,
      colorClase: 'bg-acento shadow-acento',
      avatarList: ['/imagenes/imagen_16.png', '/imagenes/imagen_19.png']
    },
    {
      id: 2,
      nombre: 'Jefe de Taller',
      descripcion: 'Gestión de personal técnico, inventario y órdenes de trabajo.',
      usuariosCount: 2,
      colorClase: 'bg-exito shadow-exito',
      avatarList: ['/imagenes/imagen_17.png', '/imagenes/imagen_18.png']
    },
    {
      id: 3,
      nombre: 'Vendedor',
      descripcion: 'Consulta de stock, creación de presupuestos y facturación.',
      usuariosCount: 8,
      colorClase: 'bg-advertencia shadow-advertencia',
      avatarList: ['/imagenes/imagen_14.png']
    },
    {
      id: 4,
      nombre: 'Técnico Mecánico',
      descripcion: 'Registro de tareas realizadas y solicitud de repuestos al almacén.',
      usuariosCount: 12,
      colorClase: 'bg-info shadow-info'
    }
  ]);

  const [nuevoRol, setNuevoRol] = useState({
    nombre: '',
    descripcion: '',
    permisos: [] as string[]
  });

  const handleCrearRol = (e: React.FormEvent) => {
    e.preventDefault();
    if (!nuevoRol.nombre) return;
    const item: RolItem = {
      id: Date.now(),
      nombre: nuevoRol.nombre,
      descripcion: nuevoRol.descripcion || 'Sin descripción técnica.',
      usuariosCount: 0,
      colorClase: 'bg-texto-secundario shadow-sm'
    };
    setRoles([...roles, item]);
    setModalAbierto(false);
    setNuevoRol({ nombre: '', descripcion: '', permisos: [] });
  };

  const togglePermiso = (permiso: string) => {
    if (nuevoRol.permisos.includes(permiso)) {
      setNuevoRol({
        ...nuevoRol,
        permisos: nuevoRol.permisos.filter(p => p !== permiso)
      });
    } else {
      setNuevoRol({
        ...nuevoRol,
        permisos: [...nuevoRol.permisos, permiso]
      });
    }
  };

  const headers = ['Rol', 'Descripción', 'Usuarios Asignados', 'Acciones'];

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      {/* Metrics Row */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-[#1E2433] border border-[#2D3748] p-5 rounded-xl shadow-lg">
          <div className="flex justify-between items-start mb-4">
            <div className="bg-acento/10 p-2 rounded-lg text-acento">
              <span className="material-symbols-outlined text-xl">verified_user</span>
            </div>
            <span className="text-exito font-ibm-plex text-xs font-semibold uppercase tracking-wider">+2 este mes</span>
          </div>
          <h3 className="text-texto-secundario font-ibm-plex text-[10px] uppercase font-bold tracking-wider">Roles Activos</h3>
          <p className="font-rajdhani text-3xl font-bold text-texto-principal mt-1">8</p>
        </div>

        <div className="bg-[#1E2433] border border-[#2D3748] p-5 rounded-xl shadow-lg">
          <div className="flex justify-between items-start mb-4">
            <div className="bg-info/10 p-2 rounded-lg text-info">
              <span className="material-symbols-outlined text-xl">groups</span>
            </div>
          </div>
          <h3 className="text-texto-secundario font-ibm-plex text-[10px] uppercase font-bold tracking-wider">Usuarios Asignados</h3>
          <p className="font-rajdhani text-3xl font-bold text-texto-principal mt-1">24</p>
        </div>

        <div className="bg-[#1E2433] border border-[#2D3748] p-5 rounded-xl shadow-lg">
          <div className="flex justify-between items-start mb-4">
            <div className="bg-advertencia/10 p-2 rounded-lg text-advertencia">
              <span className="material-symbols-outlined text-xl">lock_open</span>
            </div>
          </div>
          <h3 className="text-texto-secundario font-ibm-plex text-[10px] uppercase font-bold tracking-wider">Permisos Totales</h3>
          <p className="font-rajdhani text-3xl font-bold text-texto-principal mt-1">112</p>
        </div>
      </div>

      {/* Table Section */}
      <TablaUniversal<RolItem>
        titulo="Roles y Permisos"
        subtitulo="Define niveles de acceso y responsabilidades para el equipo del taller."
        headers={headers}
        datos={roles}
        buscarPor={(r) => `${r.nombre} ${r.descripcion}`}
        buscarPlaceholder="Buscar por rol o descripción..."
        itemsPorPagina={5}
        botonesAccionHeader={
          <button
            onClick={() => setModalAbierto(true)}
            className="px-4 py-2.5 rounded-lg bg-acento text-white text-xs font-semibold uppercase tracking-wider flex items-center gap-2 hover:bg-[#EA6C0A] transition-all shadow-md shadow-acento/20"
          >
            <span className="material-symbols-outlined text-sm">shield_person</span>
            Nuevo Rol
          </button>
        }
        renderRow={(item, index, bgClass) => (
          <tr key={item.id} className={`${bgClass} hover:bg-[#F1F5F9] transition-colors group`}>
            {/* Rol */}
            <td className="px-6 py-4">
              <div className="flex items-center gap-3">
                <div className={`w-2 h-2 rounded-full ${item.colorClase}`}></div>
                <span className="font-rajdhani text-lg font-bold text-texto-datos">{item.nombre}</span>
              </div>
            </td>

            {/* Descripción */}
            <td className="px-6 py-4">
              <p className="text-xs text-[#64748B] max-w-md">{item.descripcion}</p>
            </td>

            {/* Usuarios */}
            <td className="px-6 py-4">
              <div className="flex -space-x-2 overflow-hidden items-center">
                {item.avatarList && item.avatarList.map((avatar, idx) => (
                  <img
                    key={idx}
                    alt="User"
                    className="inline-block h-8 w-8 rounded-full ring-2 ring-white object-cover"
                    src={avatar}
                  />
                ))}
                {item.usuariosCount > (item.avatarList?.length || 0) && (
                  <div className="flex items-center justify-center h-8 w-8 rounded-full bg-[#1E2433] text-white text-[10px] ring-2 ring-white font-bold font-mono">
                    +{item.usuariosCount - (item.avatarList?.length || 0)}
                  </div>
                )}
                {item.usuariosCount === 0 && (
                  <span className="text-[10px] font-semibold text-[#94A3B8] uppercase tracking-wider px-2">Sin asignar</span>
                )}
              </div>
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

      {/* Modal - Nuevo Rol */}
      {modalAbierto && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-[#1E2433] border border-[#2D3748] rounded-xl max-w-md w-full shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            <div className="p-6 border-b border-[#2D3748] flex justify-between items-center bg-[#161B27]/40">
              <h3 className="font-rajdhani text-xl font-bold text-acento">Nuevo Rol del Sistema</h3>
              <button
                onClick={() => setModalAbierto(false)}
                className="text-texto-secundario hover:text-texto-principal transition-colors"
              >
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>
            <form onSubmit={handleCrearRol} className="p-6 space-y-4">
              <div className="space-y-1">
                <label className="text-[10px] uppercase font-bold tracking-wider text-texto-secundario">Nombre del Rol</label>
                <input
                  type="text"
                  required
                  value={nuevoRol.nombre}
                  onChange={(e) => setNuevoRol({ ...nuevoRol, nombre: e.target.value })}
                  placeholder="Ej. Auditor de Inventario"
                  className="w-full bg-[#161B27] border border-[#2D3748] rounded-lg text-xs text-texto-principal py-2.5 px-3 focus:border-acento outline-none"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[10px] uppercase font-bold tracking-wider text-texto-secundario">Descripción Técnica</label>
                <textarea
                  value={nuevoRol.descripcion}
                  onChange={(e) => setNuevoRol({ ...nuevoRol, descripcion: e.target.value })}
                  placeholder="Define las responsabilidades principales..."
                  rows={3}
                  className="w-full bg-[#161B27] border border-[#2D3748] rounded-lg text-xs text-texto-principal py-2.5 px-3 focus:border-acento outline-none"
                />
              </div>

              <div className="space-y-3">
                <label className="block text-[10px] uppercase font-bold tracking-wider text-texto-secundario">Permisos Base</label>
                <div className="space-y-2">
                  {['Visualizar Inventario', 'Generar Órdenes de Compra', 'Administrar Usuarios', 'Ver Reportes Financieros'].map((permiso) => (
                    <label key={permiso} className="flex items-center gap-3 cursor-pointer group">
                      <input
                        type="checkbox"
                        checked={nuevoRol.permisos.includes(permiso)}
                        onChange={() => togglePermiso(permiso)}
                        className="w-4 h-4 rounded border-[#2D3748] bg-[#161B27] text-acento focus:ring-acento"
                      />
                      <span className="text-xs text-texto-principal group-hover:text-acento transition-colors">
                        {permiso}
                      </span>
                    </label>
                  ))}
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
