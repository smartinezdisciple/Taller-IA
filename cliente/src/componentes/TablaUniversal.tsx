import React, { useState, useMemo } from 'react';

interface TablaUniversalProps<T> {
  headers: string[];
  datos: T[];
  buscarPor: (item: T) => string;
  buscarPlaceholder?: string;
  renderRow: (item: T, index: number, bgClass: string) => React.ReactNode;
  itemsPorPagina?: number;
  botonesAccionHeader?: React.ReactNode;
  titulo?: string;
  subtitulo?: string;
}

export default function TablaUniversal<T>({
  headers,
  datos,
  buscarPor,
  buscarPlaceholder = "Buscar...",
  renderRow,
  itemsPorPagina = 5,
  botonesAccionHeader,
  titulo,
  subtitulo
}: TablaUniversalProps<T>) {
  const [buscar, setBuscar] = useState("");
  const [pagina, setPagina] = useState(1);

  // Filter based on search term
  const datosFiltrados = useMemo(() => {
    if (!buscar.trim()) return datos;
    const term = buscar.toLowerCase();
    return datos.filter(item => {
      const valor = buscarPor(item);
      return valor.toLowerCase().includes(term);
    });
  }, [datos, buscar, buscarPor]);

  // Reset pagination when search changes
  React.useEffect(() => {
    setPagina(1);
  }, [buscar]);

  // Pagination calculation
  const totalPaginas = Math.ceil(datosFiltrados.length / itemsPorPagina) || 1;
  const indexInicio = (pagina - 1) * itemsPorPagina;
  const datosPaginados = useMemo(() => {
    return datosFiltrados.slice(indexInicio, indexInicio + itemsPorPagina);
  }, [datosFiltrados, indexInicio, itemsPorPagina]);

  return (
    <div className="space-y-6">
      {/* Title & Actions Row (If provided) */}
      {(titulo || botonesAccionHeader) && (
        <div className="flex justify-between items-end mb-6">
          <div>
            {titulo && <h2 className="font-rajdhani text-3xl font-bold text-acento">{titulo}</h2>}
            {subtitulo && <p className="text-texto-secundario max-w-lg mt-2 text-sm">{subtitulo}</p>}
          </div>
          {botonesAccionHeader && <div className="flex gap-3">{botonesAccionHeader}</div>}
        </div>
      )}

      {/* Main Container */}
      <div className="rounded-xl overflow-hidden border border-[#2D3748] bg-[#1E2433]">
        {/* Search Bar Container */}
        <div className="p-4 border-b border-[#2D3748] bg-[#161B27]/40 flex items-center justify-between gap-4">
          <div className="relative w-full max-w-xs">
            <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-texto-secundario text-sm">
              search
            </span>
            <input
              type="text"
              value={buscar}
              onChange={(e) => setBuscar(e.target.value)}
              placeholder={buscarPlaceholder}
              className="w-full bg-[#161B27] border border-[#2D3748] rounded-lg pl-10 pr-4 py-2 focus:border-acento outline-none text-xs text-texto-principal placeholder:text-texto-secundario/50 transition-all focus:ring-1 focus:ring-acento"
            />
          </div>
        </div>

        {/* Table Content */}
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead className="bg-[#161B27] border-b border-[#2D3748]">
              <tr>
                {headers.map((header, idx) => (
                  <th
                    key={idx}
                    className="px-6 py-4 font-ibm-plex text-[11px] font-semibold uppercase tracking-wider text-texto-secundario"
                  >
                    {header}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E2E8F0]">
              {datosPaginados.length > 0 ? (
                datosPaginados.map((item, index) => {
                  // Alternating light-mode row backgrounds
                  const bgClass = index % 2 === 0 ? 'bg-white' : 'bg-[#F8FAFC]';
                  return renderRow(item, index, bgClass);
                })
              ) : (
                <tr>
                  <td
                    colSpan={headers.length}
                    className="px-6 py-12 text-center text-texto-secundario bg-white"
                  >
                    No se encontraron resultados.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Footer */}
        <div className="p-4 bg-[#161B27]/40 border-t border-[#2D3748] flex items-center justify-between gap-4">
          <p className="text-xs text-texto-secundario">
            Mostrando {Math.min(indexInicio + 1, datosFiltrados.length)}-{Math.min(indexInicio + itemsPorPagina, datosFiltrados.length)} de {datosFiltrados.length}
          </p>

          {totalPaginas > 1 && (
            <div className="flex gap-1 items-center">
              <button
                disabled={pagina === 1}
                onClick={() => setPagina(p => Math.max(1, p - 1))}
                className="p-1 px-2.5 rounded text-texto-secundario hover:bg-white/5 disabled:opacity-30 disabled:hover:bg-transparent text-xs"
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
                      activo
                        ? 'bg-acento text-white'
                        : 'text-texto-secundario hover:bg-white/5'
                    }`}
                  >
                    {num}
                  </button>
                );
              })}
              <button
                disabled={pagina === totalPaginas}
                onClick={() => setPagina(p => Math.min(totalPaginas, p + 1))}
                className="p-1 px-2.5 rounded text-texto-secundario hover:bg-white/5 disabled:opacity-30 disabled:hover:bg-transparent text-xs"
              >
                →
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
