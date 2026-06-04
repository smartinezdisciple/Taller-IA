import { create } from 'zustand';

export interface ItemCarrito {
  id: number;
  sku: string;
  nombre_repuesto: string;
  nombre_marca: string;
  precio_venta: number;
  cantidad: number;
  cantidad_stock: number;
  color?: string;
  imagen_url?: string;
}

interface CarritoEstado {
  items: ItemCarrito[];
  subtotal: number;
  montoIva: number;
  total: number;
  agregarItem: (item: Omit<ItemCarrito, 'cantidad'>, cantidad?: number) => void;
  modificarCantidad: (id: number, cantidad: number) => void;
  eliminarItem: (id: number) => void;
  vaciarCarrito: () => void;
}

const calcularTotales = (items: ItemCarrito[]) => {
  const subtotal = items.reduce((acc, item) => acc + item.precio_venta * item.cantidad, 0);
  const montoIva = subtotal * 0.15; // Nicaraguan VAT is 15%
  const total = subtotal + montoIva;
  return { subtotal, montoIva, total };
};

export const useCarritoStore = create<CarritoEstado>((set) => ({
  items: [],
  subtotal: 0,
  montoIva: 0,
  total: 0,

  agregarItem: (item, cantidad = 1) => set((estado) => {
    const existingIndex = estado.items.findIndex((i) => i.id === item.id);
    let nuevosItems = [...estado.items];

    if (existingIndex > -1) {
      const existingItem = nuevosItems[existingIndex];
      const nuevaCantidad = Math.min(existingItem.cantidad + cantidad, item.cantidad_stock);
      nuevosItems[existingIndex] = { ...existingItem, cantidad: nuevaCantidad };
    } else {
      const nuevaCantidad = Math.min(cantidad, item.cantidad_stock);
      nuevosItems.push({ ...item, cantidad: nuevaCantidad });
    }

    return {
      items: nuevosItems,
      ...calcularTotales(nuevosItems),
    };
  }),

  modificarCantidad: (id, cantidad) => set((estado) => {
    const nuevosItems = estado.items.map((item) => {
      if (item.id === id) {
        const nuevaCantidad = Math.max(1, Math.min(cantidad, item.cantidad_stock));
        return { ...item, cantidad: nuevaCantidad };
      }
      return item;
    });

    return {
      items: nuevosItems,
      ...calcularTotales(nuevosItems),
    };
  }),

  eliminarItem: (id) => set((estado) => {
    const nuevosItems = estado.items.filter((item) => item.id !== id);
    return {
      items: nuevosItems,
      ...calcularTotales(nuevosItems),
    };
  }),

  vaciarCarrito: () => set({
    items: [],
    subtotal: 0,
    montoIva: 0,
    total: 0,
  }),
}));
