import React, { useState } from 'react';

export default function Perfil() {
  const [toastVisible, setToastVisible] = useState(false);
  const [formData, setFormData] = useState({
    nombre: 'Carlos Mendoza',
    email: 'c.mendoza@workshoppro.com',
    telefono: '+56 9 8765 4321',
    biografia: 'Responsable del área técnica y de stock. 15 años de experiencia en logística de repuestos automotrices pesados.'
  });

  const [seguridad, setSeguridad] = useState({
    actual: '',
    nueva: '',
    confirmar: ''
  });

  const [notif, setNotif] = useState({
    email: true,
    push: true,
    sms: false
  });

  const triggerToast = () => {
    setToastVisible(true);
    setTimeout(() => {
      setToastVisible(false);
    }, 4000);
  };

  const handleGuardarDatos = (e: React.FormEvent) => {
    e.preventDefault();
    triggerToast();
  };

  const handleGuardarSeguridad = (e: React.FormEvent) => {
    e.preventDefault();
    triggerToast();
    setSeguridad({ actual: '', nueva: '', confirmar: '' });
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      {/* Profile Header Bento Style */}
      <div className="grid grid-cols-12 gap-6">
        <div className="col-span-12 lg:col-span-8 bg-[#1E2433] border border-[#2D3748] p-8 rounded-xl relative overflow-hidden flex flex-col md:flex-row gap-8 items-center shadow-lg">
          <div className="absolute top-0 right-0 w-32 h-32 bg-[#F97316]/5 rounded-full -mr-16 -mt-16 blur-3xl"></div>
          <div className="relative flex-shrink-0">
            <img
              alt="Avatar de usuario"
              className="w-32 h-32 rounded-full border-4 border-acento object-cover shadow-[0_0_20px_rgba(249,115,22,0.2)]"
              src="/imagenes/imagen_21.png"
            />
            <button className="absolute bottom-1 right-1 bg-acento text-white p-2 rounded-full shadow-lg hover:bg-[#EA6C0A] transition-all flex items-center justify-center">
              <span className="material-symbols-outlined text-sm">photo_camera</span>
            </button>
          </div>
          <div className="flex-1 text-center md:text-left">
            <h2 className="font-rajdhani text-3xl font-bold text-[#F1F5F9]">{formData.nombre}</h2>
            <p className="font-ibm-plex text-sm text-texto-secundario mt-1">Jefe de Operaciones Logísticas</p>
            <div className="flex flex-wrap justify-center md:justify-start gap-3 mt-4">
              <span className="px-3 py-1 bg-[#161B27] border border-[#2D3748] rounded-full font-ibm-plex text-[10px] uppercase font-bold text-texto-secundario flex items-center gap-1">
                <span className="material-symbols-outlined text-[14px] text-exito">verified</span>
                Usuario Verificado
              </span>
              <span className="px-3 py-1 bg-acento/10 border border-acento/30 rounded-full font-ibm-plex text-[10px] uppercase font-bold text-acento flex items-center gap-1">
                <span className="material-symbols-outlined text-[14px]">shield</span>
                Acceso Full
              </span>
            </div>
          </div>
          <div className="flex gap-3">
            <button 
              onClick={handleGuardarDatos}
              className="px-5 py-2 bg-acento hover:bg-[#EA6C0A] text-white font-ibm-plex text-xs font-semibold uppercase tracking-wider rounded-lg transition-colors shadow-lg shadow-acento/20"
            >
              Editar Perfil
            </button>
            <button className="px-3 py-2 border border-[#2D3748] text-texto-principal hover:bg-[#161B27] transition-colors rounded-lg">
              <span className="material-symbols-outlined">more_vert</span>
            </button>
          </div>
        </div>

        <div className="col-span-12 lg:col-span-4 bg-[#1E2433] border border-[#2D3748] p-8 rounded-xl flex flex-col justify-between shadow-lg">
          <h3 className="font-ibm-plex text-[10px] uppercase font-bold tracking-wider text-texto-secundario mb-4">
            Métricas de Actividad
          </h3>
          <div className="space-y-6">
            <div className="flex justify-between items-end">
              <div>
                <p className="font-rajdhani text-2xl font-bold text-texto-principal">1,248</p>
                <p className="font-ibm-plex text-[10px] uppercase font-bold tracking-wider text-texto-secundario mt-1">
                  Ventas Gestionadas
                </p>
              </div>
              <div className="h-10 w-24 bg-[#F97316]/10 flex items-end gap-1 px-1 rounded pb-1">
                <div className="w-2 bg-acento h-2 rounded-t-sm"></div>
                <div className="w-2 bg-acento h-4 rounded-t-sm"></div>
                <div className="w-2 bg-acento h-3 rounded-t-sm"></div>
                <div className="w-2 bg-acento h-6 rounded-t-sm"></div>
                <div className="w-2 bg-acento h-8 rounded-t-sm"></div>
              </div>
            </div>
            <div className="flex justify-between items-end">
              <div>
                <p className="font-rajdhani text-2xl font-bold text-texto-principal">98%</p>
                <p className="font-ibm-plex text-[10px] uppercase font-bold tracking-wider text-texto-secundario mt-1">
                  Eficiencia de Despacho
                </p>
              </div>
              <span className="text-exito material-symbols-outlined text-4xl">trending_up</span>
            </div>
          </div>
        </div>
      </div>

      {/* Settings Sections */}
      <div className="grid grid-cols-12 gap-8">
        {/* Forms Left Column (col-span-8) */}
        <div className="col-span-12 lg:col-span-8 space-y-8">
          {/* Datos Personales */}
          <section className="bg-[#1E2433] border border-[#2D3748] rounded-xl overflow-hidden shadow-lg">
            <div className="px-8 py-6 border-b border-[#2D3748] bg-[#161B27]/40">
              <h3 className="font-rajdhani text-lg font-bold text-[#F1F5F9]">Datos Personales</h3>
              <p className="text-texto-secundario text-xs mt-1">Información básica del perfil de usuario.</p>
            </div>
            <form onSubmit={handleGuardarDatos} className="p-8 space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className="text-[10px] uppercase font-bold tracking-wider text-texto-secundario block px-1">
                    Nombre Completo
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.nombre}
                    onChange={(e) => setFormData({ ...formData, nombre: e.target.value })}
                    className="w-full bg-[#161B27] border border-[#2D3748] rounded-lg px-4 py-2.5 text-texto-principal focus:border-acento focus:ring-1 focus:ring-acento outline-none text-xs transition-all"
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] uppercase font-bold tracking-wider text-texto-secundario block px-1">
                    Correo Electrónico
                  </label>
                  <input
                    type="email"
                    required
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    className="w-full bg-[#161B27] border border-[#2D3748] rounded-lg px-4 py-2.5 text-texto-principal focus:border-acento focus:ring-1 focus:ring-acento outline-none text-xs transition-all"
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] uppercase font-bold tracking-wider text-texto-secundario block px-1">
                    Teléfono de Contacto
                  </label>
                  <input
                    type="tel"
                    required
                    value={formData.telefono}
                    onChange={(e) => setFormData({ ...formData, telefono: e.target.value })}
                    className="w-full bg-[#161B27] border border-[#2D3748] rounded-lg px-4 py-2.5 text-texto-principal focus:border-acento focus:ring-1 focus:ring-acento outline-none text-xs transition-all"
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] uppercase font-bold tracking-wider text-texto-secundario block px-1">
                    ID de Empleado
                  </label>
                  <input
                    type="text"
                    readOnly
                    value="WP-90210"
                    className="w-full bg-[#161B27]/40 border border-[#2D3748] rounded-lg px-4 py-2.5 text-texto-secundario cursor-not-allowed outline-none text-xs"
                  />
                </div>

                <div className="md:col-span-2 space-y-2">
                  <label className="text-[10px] uppercase font-bold tracking-wider text-texto-secundario block px-1">
                    Biografía Profesional
                  </label>
                  <textarea
                    rows={4}
                    value={formData.biografia}
                    onChange={(e) => setFormData({ ...formData, biografia: e.target.value })}
                    className="w-full bg-[#161B27] border border-[#2D3748] rounded-lg px-4 py-2.5 text-texto-principal focus:border-acento focus:ring-1 focus:ring-acento outline-none text-xs transition-all resize-none"
                  />
                </div>
              </div>
              <div className="pt-6 border-t border-[#2D3748]/30 flex justify-end gap-4">
                <button
                  type="button"
                  className="px-5 py-2 text-texto-secundario hover:text-texto-principal text-xs font-semibold uppercase tracking-wider transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-6 py-2 bg-acento hover:bg-[#EA6C0A] text-white text-xs font-semibold uppercase tracking-wider rounded-lg shadow-md transition-all"
                >
                  Guardar Cambios
                </button>
              </div>
            </form>
          </section>

          {/* Seguridad y Acceso */}
          <section className="bg-[#1E2433] border border-[#2D3748] rounded-xl overflow-hidden shadow-lg">
            <div className="px-8 py-6 border-b border-[#2D3748] bg-[#161B27]/40">
              <h3 className="font-rajdhani text-lg font-bold text-[#F1F5F9]">Seguridad y Acceso</h3>
              <p className="text-texto-secundario text-xs mt-1">Administra tu contraseña y autenticación.</p>
            </div>
            <form onSubmit={handleGuardarSeguridad} className="p-8 space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="space-y-2">
                  <label className="text-[10px] uppercase font-bold tracking-wider text-texto-secundario block px-1">
                    Contraseña Actual
                  </label>
                  <input
                    type="password"
                    required
                    value={seguridad.actual}
                    onChange={(e) => setSeguridad({ ...seguridad, actual: e.target.value })}
                    placeholder="••••••••"
                    className="w-full bg-[#161B27] border border-[#2D3748] rounded-lg px-4 py-2.5 text-texto-principal focus:border-acento focus:ring-1 focus:ring-acento outline-none text-xs transition-all"
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] uppercase font-bold tracking-wider text-texto-secundario block px-1">
                    Nueva Contraseña
                  </label>
                  <input
                    type="password"
                    required
                    value={seguridad.nueva}
                    onChange={(e) => setSeguridad({ ...seguridad, nueva: e.target.value })}
                    placeholder="••••••••"
                    className="w-full bg-[#161B27] border border-[#2D3748] rounded-lg px-4 py-2.5 text-texto-principal focus:border-acento focus:ring-1 focus:ring-acento outline-none text-xs transition-all"
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] uppercase font-bold tracking-wider text-texto-secundario block px-1">
                    Confirmar Nueva
                  </label>
                  <input
                    type="password"
                    required
                    value={seguridad.confirmar}
                    onChange={(e) => setSeguridad({ ...seguridad, confirmar: e.target.value })}
                    placeholder="••••••••"
                    className="w-full bg-[#161B27] border border-[#2D3748] rounded-lg px-4 py-2.5 text-texto-principal focus:border-acento focus:ring-1 focus:ring-acento outline-none text-xs transition-all"
                  />
                </div>
              </div>

              <div className="p-4 bg-[#161B27] border-l-4 border-advertencia rounded-lg flex items-start gap-4">
                <span className="material-symbols-outlined text-advertencia mt-0.5">info</span>
                <p className="text-xs text-texto-secundario leading-relaxed">
                  La contraseña debe contener al menos 12 caracteres, incluyendo una letra mayúscula, un número y un símbolo especial para cumplir con los estándares industriales de Workshop Pro.
                </p>
              </div>

              <div className="pt-6 border-t border-[#2D3748]/30 flex justify-end">
                <button
                  type="submit"
                  className="px-6 py-2 border border-acento text-acento font-ibm-plex text-xs font-semibold uppercase tracking-wider rounded-lg hover:bg-acento hover:text-white transition-all"
                >
                  Actualizar Contraseña
                </button>
              </div>
            </form>
          </section>
        </div>

        {/* Preferences Right Column (col-span-4) */}
        <div className="col-span-12 lg:col-span-4">
          <section className="bg-[#1E2433] border border-[#2D3748] rounded-xl overflow-hidden shadow-lg sticky top-24">
            <div className="px-8 py-6 border-b border-[#2D3748] bg-[#161B27]/40">
              <h3 className="font-rajdhani text-lg font-bold text-[#F1F5F9]">Notificaciones</h3>
              <p className="text-texto-secundario text-xs mt-1">Canales de comunicación.</p>
            </div>
            <div className="p-8 space-y-8">
              {/* Notif 1 */}
              <div className="flex items-center justify-between group">
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 rounded bg-[#F97316]/10 flex items-center justify-center text-acento">
                    <span className="material-symbols-outlined">mail</span>
                  </div>
                  <div>
                    <p className="font-ibm-plex text-xs font-semibold text-texto-principal uppercase tracking-wider">Email</p>
                    <p className="text-[10px] text-texto-secundario mt-0.5">Reportes y facturas</p>
                  </div>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={notif.email}
                    onChange={() => setNotif({ ...notif, email: !notif.email })}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-[#161B27] border border-[#2D3748] peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-[#1E2433] after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-[#94A3B8] after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-acento peer-checked:after:bg-white"></div>
                </label>
              </div>

              {/* Notif 2 */}
              <div className="flex items-center justify-between group">
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 rounded bg-exito/10 flex items-center justify-center text-exito">
                    <span className="material-symbols-outlined">chat_bubble</span>
                  </div>
                  <div>
                    <p className="font-ibm-plex text-xs font-semibold text-texto-principal uppercase tracking-wider">Push</p>
                    <p className="text-[10px] text-texto-secundario mt-0.5">Alertas de stock bajo</p>
                  </div>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={notif.push}
                    onChange={() => setNotif({ ...notif, push: !notif.push })}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-[#161B27] border border-[#2D3748] peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-[#1E2433] after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-[#94A3B8] after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-acento peer-checked:after:bg-white"></div>
                </label>
              </div>

              {/* Notif 3 */}
              <div className="flex items-center justify-between group">
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 rounded bg-advertencia/10 flex items-center justify-center text-advertencia">
                    <span className="material-symbols-outlined">sms</span>
                  </div>
                  <div>
                    <p className="font-ibm-plex text-xs font-semibold text-texto-principal uppercase tracking-wider">SMS</p>
                    <p className="text-[10px] text-texto-secundario mt-0.5">Urgencias críticas</p>
                  </div>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={notif.sms}
                    onChange={() => setNotif({ ...notif, sms: !notif.sms })}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-[#161B27] border border-[#2D3748] peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-[#1E2433] after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-[#94A3B8] after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-acento peer-checked:after:bg-white"></div>
                </label>
              </div>

              {/* Active Sessions */}
              <div className="pt-6 border-t border-[#2D3748]">
                <h4 className="font-ibm-plex text-[10px] uppercase font-bold tracking-wider text-texto-secundario mb-4">
                  Sesiones Activas
                </h4>
                <div className="space-y-4">
                  <div className="flex items-center gap-3">
                    <span className="material-symbols-outlined text-acento text-xl">laptop_mac</span>
                    <div>
                      <p className="text-xs font-bold text-texto-principal">Chrome on Windows</p>
                      <p className="text-[10px] text-exito font-semibold">Actual • Bogotá, CO</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 opacity-60">
                    <span className="material-symbols-outlined text-texto-secundario text-xl">smartphone</span>
                    <div>
                      <p className="text-xs font-bold text-texto-principal">iPhone 15 Pro</p>
                      <p className="text-[10px] text-texto-secundario">Hace 2 horas • Bogotá, CO</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </section>
        </div>
      </div>

      {/* Floating Toast Notification */}
      <div
        className={`fixed bottom-8 right-8 bg-[#1E2433] border border-acento/40 text-texto-principal px-6 py-4 rounded-lg shadow-2xl flex items-center gap-4 transition-all duration-500 ease-out z-[100] ${
          toastVisible ? 'translate-y-0 opacity-100' : 'translate-y-24 opacity-0 pointer-events-none'
        }`}
      >
        <div className="w-8 h-8 bg-acento/20 rounded-full flex items-center justify-center text-acento flex-shrink-0">
          <span className="material-symbols-outlined text-lg">check_circle</span>
        </div>
        <div>
          <p className="font-ibm-plex text-xs font-bold uppercase tracking-wider leading-none">Perfil Actualizado</p>
          <p className="text-[10px] text-texto-secundario mt-1">Tus cambios se han guardado correctamente.</p>
        </div>
        <button
          onClick={() => setToastVisible(false)}
          className="ml-4 text-texto-secundario hover:text-texto-principal transition-colors"
        >
          <span className="material-symbols-outlined text-sm">close</span>
        </button>
      </div>
    </div>
  );
}
