import { useAutenticacionStore } from '../store/autenticacionStore';

const BASE_URL = (import.meta as any).env?.VITE_API_URL || 'http://localhost:3001';

async function request(path: string, options: RequestInit = {}, isRetry = false): Promise<Response> {
  const store = useAutenticacionStore.getState();
  const headers = new Headers(options.headers || {});

  // Attach access token if present in memory
  if (store.accessToken) {
    headers.set('Authorization', `Bearer ${store.accessToken}`);
  }

  // Set default content type
  if (options.body && !(options.body instanceof FormData)) {
    headers.set('Content-Type', 'application/json');
  }

  const finalOptions: RequestInit = {
    ...options,
    headers,
    credentials: 'include' // Send refresh cookie on requests
  };

  const response = await fetch(`${BASE_URL}${path}`, finalOptions);

  // Handle Token Expiration Interceptor (401)
  if (response.status === 401 && !isRetry && path !== '/api/auth/login' && path !== '/api/auth/refresh') {
    try {
      const refreshRes = await fetch(`${BASE_URL}/api/auth/refresh`, {
        method: 'POST',
        credentials: 'include'
      });

      if (refreshRes.status === 200) {
        const data = await refreshRes.json();
        // Update access token in Zustand
        store.login(data.accessToken, data.usuario);

        // Retry the original request
        return request(path, options, true);
      } else {
        // Refresh token failed, perform logout
        store.logout();
        throw new Error('Sesión expirada.');
      }
    } catch (error) {
      store.logout();
      throw error;
    }
  }

  return response;
}

export const api = {
  get: (path: string, options?: RequestInit) => request(path, { ...options, method: 'GET' }),
  post: (path: string, body?: any, options?: RequestInit) => request(path, {
    ...options,
    method: 'POST',
    body: body instanceof FormData ? body : JSON.stringify(body)
  }),
  put: (path: string, body?: any, options?: RequestInit) => request(path, {
    ...options,
    method: 'PUT',
    body: body instanceof FormData ? body : JSON.stringify(body)
  }),
  delete: (path: string, options?: RequestInit) => request(path, { ...options, method: 'DELETE' }),
};
export default api;
