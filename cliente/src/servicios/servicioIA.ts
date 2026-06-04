export interface ResultadoIA {
  marca: string;
  color: string;
}

// En desarrollo usamos el proxy de Vite (/ia -> localhost:6000) para evitar CORS.
// En producción se puede sobreescribir con VITE_IA_URL en el .env
const IA_URL = (import.meta as any).env.VITE_IA_URL || '/ia';

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

export async function analizarImagenConIA(imagen: File, maxIntentos = 3): Promise<ResultadoIA> {
  const formData = new FormData();
  formData.append('imagen', imagen);

  let ultimoError: any = null;

  for (let intento = 1; intento <= maxIntentos; intento++) {
    // AbortController for 10-second timeout
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000);

    try {
      const response = await fetch(`${IA_URL}/analizar`, {
        method: 'POST',
        body: formData,
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        throw new Error(`Servicio de IA respondió con estado: ${response.status}`);
      }

      const datos = await response.json();

      if (!datos || typeof datos.marca !== 'string' || typeof datos.color !== 'string') {
        throw new Error('Formato de respuesta de IA inválido.');
      }

      return {
        marca: datos.marca,
        color: datos.color,
      };
    } catch (error: any) {
      clearTimeout(timeoutId);
      ultimoError = error;
      console.warn(`[IA Servicio] Intento ${intento} fallido:`, error.message || error);

      if (intento < maxIntentos) {
        // Backoff: 1s, 2s, 3s
        await sleep(intento * 1000);
      }
    }
  }

  throw ultimoError || new Error('No se pudo establecer comunicación con el servicio de IA.');
}
