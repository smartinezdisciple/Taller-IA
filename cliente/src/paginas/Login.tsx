import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAutenticacionStore } from '../store/autenticacionStore';
import api from '../servicios/api';

export default function Login() {
  const navigate = useNavigate();
  const loginStore = useAutenticacionStore();
  
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [cargando, setCargando] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username || !password) {
      setErrorMsg('Por favor ingrese todos los campos.');
      return;
    }
    setErrorMsg('');
    setCargando(true);

    try {
      const res = await api.post('/api/auth/login', {
        nombre_usuario: username,
        contrasena: password
      });

      const data = await res.json();

      if (res.ok) {
        // Store session in Zustand
        loginStore.login(data.accessToken, data.usuario);
        navigate('/dashboard');
      } else {
        setErrorMsg(data.mensaje || 'Error de credenciales.');
      }
    } catch (error: any) {
      setErrorMsg('Error de conexión con el servidor.');
      console.error('[Login Error]', error);
    } finally {
      setCargando(false);
    }
  };

  return (
    <div className="bg-[#0F1117] text-[#F1F5F9] font-ibm-plex min-h-screen relative overflow-hidden flex items-center justify-center w-full">
      {/* Background Layer with Industrial Image and Overlay */}
      <div className="absolute inset-0 z-0">
        <img
          alt="Industrial auto workshop"
          className="w-full h-full object-cover filter blur-sm scale-105 brightness-50"
          src="/imagenes/imagen_1.png"
        />
        <div className="absolute inset-0 bg-gradient-to-br from-[#0F1117]/90 via-[#0F1117]/70 to-transparent"></div>
        <div
          className="absolute inset-0 opacity-30"
          style={{
            backgroundImage: 'radial-gradient(rgba(45, 55, 72, 0.4) 1px, transparent 1px)',
            backgroundSize: '24px 24px'
          }}
        ></div>
      </div>

      {/* Login Container */}
      <main className="relative z-10 w-full max-w-md px-6">
        {/* Logo & Brand */}
        <div className="mb-8 text-center">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-[#F97316] rounded-lg mb-4 shadow-[0_0_20px_rgba(249,115,22,0.3)]">
            <span className="material-symbols-outlined text-white text-4xl">engineering</span>
          </div>
          <h1 className="font-rajdhani text-3xl font-bold text-[#F97316] tracking-tight">Workshop Pro</h1>
          <p className="font-ibm-plex text-xs font-semibold uppercase tracking-[0.2em] text-[#94A3B8] mt-1">
            Gestión Industrial de Repuestos
          </p>
        </div>

        {/* Glassmorphism Login Card */}
        <div className="bg-[#1E2433]/40 backdrop-blur-xl border border-[#2D3748]/50 p-8 rounded-xl shadow-2xl relative overflow-hidden">
          {/* Decorative Accent */}
          <div className="absolute top-0 left-0 w-1 h-full bg-[#F97316]"></div>

          <form className="space-y-6" onSubmit={handleSubmit}>
            {errorMsg && (
              <div className="bg-[#EF4444]/10 border border-[#EF4444]/20 text-[#EF4444] text-xs p-3 rounded-lg">
                {errorMsg}
              </div>
            )}

            {/* Username Field */}
            <div className="space-y-2">
              <label className="font-ibm-plex text-xs font-semibold tracking-wider text-[#94A3B8] uppercase block px-1">
                Identificación de Operario
              </label>
              <div className="relative group">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <span className="material-symbols-outlined text-[#94A3B8] group-focus-within:text-[#F97316] transition-colors">
                    person
                  </span>
                </div>
                <input
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="Usuario o Código ID"
                  required
                  className="w-full bg-[#161B27]/60 border border-[#2D3748] text-[#F1F5F9] py-3 pl-10 pr-4 rounded-lg focus:outline-none focus:border-[#F97316] transition-all placeholder:text-[#94A3B8]/30"
                />
              </div>
            </div>

            {/* Password Field */}
            <div className="space-y-2">
              <label className="font-ibm-plex text-xs font-semibold tracking-wider text-[#94A3B8] uppercase block px-1">
                Clave de Acceso
              </label>
              <div className="relative group">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <span className="material-symbols-outlined text-[#94A3B8] group-focus-within:text-[#F97316] transition-colors">
                    lock
                  </span>
                </div>
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                  className="w-full bg-[#161B27]/60 border border-[#2D3748] text-[#F1F5F9] py-3 pl-10 pr-12 rounded-lg focus:outline-none focus:border-[#F97316] transition-all placeholder:text-[#94A3B8]/30"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 pr-3 flex items-center text-[#94A3B8] hover:text-[#F1F5F9] transition-colors"
                >
                  <span className="material-symbols-outlined">
                    {showPassword ? 'visibility_off' : 'visibility'}
                  </span>
                </button>
              </div>
            </div>

            {/* Remember & Forgot */}
            <div className="flex items-center justify-between">
              <label className="flex items-center gap-2 cursor-pointer group">
                <input
                  type="checkbox"
                  className="w-4 h-4 rounded border-[#2D3748] bg-[#161B27] text-[#F97316] focus:ring-[#F97316] focus:ring-offset-[#0F1117]"
                />
                <span className="text-xs text-[#94A3B8] group-hover:text-[#F1F5F9] transition-colors">
                  Recordar sesión
                </span>
              </label>
              <a href="#" className="text-xs text-[#F97316] hover:text-[#FED7AA] transition-colors font-medium">
                ¿Olvidó su clave?
              </a>
            </div>

            {/* Action Button */}
            <button
              type="submit"
              disabled={cargando}
              className="w-full bg-[#F97316] hover:bg-[#EA6C0A] text-white font-rajdhani font-semibold text-lg py-3 rounded-lg transition-all transform active:scale-[0.98] flex items-center justify-center gap-2 shadow-lg shadow-[#F97316]/20 group disabled:opacity-50"
            >
              {cargando ? (
                <>
                  <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  <span>AUTENTICANDO...</span>
                </>
              ) : (
                <>
                  <span>ACCEDER AL PANEL</span>
                  <span className="material-symbols-outlined group-hover:translate-x-1 transition-transform">
                    arrow_forward
                  </span>
                </>
              )}
            </button>
          </form>

          {/* Footer of Card */}
          <div className="mt-8 pt-6 border-t border-[#2D3748]/30 text-center">
            <p className="text-xs text-[#94A3B8]">
              ¿Nuevo en el sistema?{' '}
              <a href="#" className="text-[#F97316] font-medium hover:underline decoration-[#F97316]/30 underline-offset-4">
                Solicitar credenciales
              </a>
            </p>
          </div>
        </div>

        {/* System Status Bar */}
        <div className="mt-8 flex justify-center gap-6">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-[#22C55E] animate-pulse"></div>
            <span className="font-ibm-plex text-[10px] text-[#94A3B8] font-semibold tracking-wider">
              SERVIDOR: ONLINE
            </span>
          </div>
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-[14px] text-[#94A3B8]">verified_user</span>
            <span className="font-ibm-plex text-[10px] text-[#94A3B8] font-semibold tracking-wider">
              ENCRIPTACIÓN AES-256
            </span>
          </div>
          <div className="flex items-center gap-2">
            <span className="font-ibm-plex text-[10px] text-[#94A3B8] font-semibold tracking-wider">
              v2.4.0-PRO
            </span>
          </div>
        </div>
      </main>
    </div>
  );
}
