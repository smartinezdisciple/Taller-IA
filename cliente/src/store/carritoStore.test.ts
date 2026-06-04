import { describe, it, expect, beforeEach } from 'vitest';
import { useCarritoStore } from './carritoStore.js';

describe('useCarritoStore Unit Tests', () => {

  beforeEach(() => {
    // Clear cart state before each test run
    useCarritoStore.getState().vaciarCarrito();
  });

  // FT-001
  it('FT-001: agregarItem añade un nuevo ítem al carrito', () => {
    const store = useCarritoStore.getState();
    const item = {
      id: 1,
      sku: 'TOY-FIL-001',
      nombre_repuesto: 'Filtro Aceite',
      nombre_marca: 'Toyota',
      precio_venta: 10.00,
      cantidad_stock: 5
    };

    store.agregarItem(item, 1);

    const updatedStore = useCarritoStore.getState();
    expect(updatedStore.items.length).toBe(1);
    expect(updatedStore.items[0].id).toBe(1);
    expect(updatedStore.items[0].cantidad).toBe(1);
  });

  // FT-002
  it('FT-002: agregarItem incrementa cantidad si el ítem ya existe en el carrito', () => {
    const store = useCarritoStore.getState();
    const item = {
      id: 1,
      sku: 'TOY-FIL-001',
      nombre_repuesto: 'Filtro Aceite',
      nombre_marca: 'Toyota',
      precio_venta: 10.00,
      cantidad_stock: 5
    };

    // Add once
    store.agregarItem(item, 1);
    // Add again
    store.agregarItem(item, 2);

    const updatedStore = useCarritoStore.getState();
    expect(updatedStore.items.length).toBe(1); // Still 1 item entry
    expect(updatedStore.items[0].cantidad).toBe(3); // Quantity accumulates to 3
  });

  // FT-003
  it('FT-003: calcularTotal calcula correctamente el subtotal, IVA al 15% y total', () => {
    const store = useCarritoStore.getState();
    
    // Add first item: 2 x $10.00 = $20.00
    store.agregarItem({
      id: 1,
      sku: 'TOY-FIL-001',
      nombre_repuesto: 'Filtro Aceite',
      nombre_marca: 'Toyota',
      precio_venta: 10.00,
      cantidad_stock: 5
    }, 2);

    // Add second item: 1 x $50.00 = $50.00
    store.agregarItem({
      id: 2,
      sku: 'NIS-PAS-002',
      nombre_repuesto: 'Pastillas Freno',
      nombre_marca: 'Nissan',
      precio_venta: 50.00,
      cantidad_stock: 10
    }, 1);

    const updatedStore = useCarritoStore.getState();
    expect(updatedStore.subtotal).toBe(70.00); // 20 + 50
    expect(updatedStore.montoIva).toBe(10.50); // 70 * 15%
    expect(updatedStore.total).toBe(80.50); // 70 + 10.50
  });

  // FT-004
  it('FT-004: vaciarCarrito limpia todos los elementos y restablece totales a 0', () => {
    const store = useCarritoStore.getState();
    store.agregarItem({
      id: 1,
      sku: 'TOY-FIL-001',
      nombre_repuesto: 'Filtro Aceite',
      nombre_marca: 'Toyota',
      precio_venta: 10.00,
      cantidad_stock: 5
    }, 1);

    store.vaciarCarrito();

    const updatedStore = useCarritoStore.getState();
    expect(updatedStore.items.length).toBe(0);
    expect(updatedStore.subtotal).toBe(0);
    expect(updatedStore.montoIva).toBe(0);
    expect(updatedStore.total).toBe(0);
  });

  // FT-005
  it('FT-005: disminuirCantidad no permite cantidades menores a 1', () => {
    const store = useCarritoStore.getState();
    store.agregarItem({
      id: 1,
      sku: 'TOY-FIL-001',
      nombre_repuesto: 'Filtro Aceite',
      nombre_marca: 'Toyota',
      precio_venta: 10.00,
      cantidad_stock: 5
    }, 1);

    // Try to modify quantity to 0
    store.modificarCantidad(1, 0);

    const updatedStore = useCarritoStore.getState();
    expect(updatedStore.items[0].cantidad).toBe(1); // Stays locked at minimum 1
  });

  it('no permite agregar más cantidad que el stock disponible', () => {
    const store = useCarritoStore.getState();
    store.agregarItem({
      id: 1,
      sku: 'TOY-FIL-001',
      nombre_repuesto: 'Filtro Aceite',
      nombre_marca: 'Toyota',
      precio_venta: 10.00,
      cantidad_stock: 2 // Max stock 2
    }, 5); // Requesting 5

    const updatedStore = useCarritoStore.getState();
    expect(updatedStore.items[0].cantidad).toBe(2); // Caps at stock limit
  });
});
