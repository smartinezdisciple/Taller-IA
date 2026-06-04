import { create } from 'zustand';

interface Usuario {
  id: string;
  nombre_completo: string;
  rol: 'administrador' | 'vendedor' | 'comprador';
}

interface AutenticacionState {
  accessToken: string | null;
  usuario: Usuario | null;
  login: (accessToken: string, usuario: Usuario) => void;
  logout: () => void;
  setToken: (accessToken: string) => void;
  isAuthenticated: () => boolean;
}

export const useAutenticacionStore = create<AutenticacionState>((set, get) => ({
  accessToken: null,
  usuario: null,
  login: (accessToken, usuario) => set({ accessToken, usuario }),
  logout: () => set({ accessToken: null, usuario: null }),
  setToken: (accessToken) => set({ accessToken }),
  isAuthenticated: () => !!get().accessToken,
}));
