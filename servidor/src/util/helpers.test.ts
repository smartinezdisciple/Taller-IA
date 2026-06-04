import { describe, it, expect } from 'vitest';
import {
  calcularSubtotal,
  calcularIva,
  calcularTotal,
  validarContrasena,
  generarNumeroVenta,
  generarNumeroOrden
} from './helpers.js';

describe('Cálculos y Validaciones de Taller (Unit Tests)', () => {
  
  // UT-001 / UT-004 / UT-005
  describe('calcularSubtotal', () => {
    it('UT-001: calcula subtotal correctamente para items válidos', () => {
      const items = [{ cantidad: 2, precio: 50.00 }];
      expect(calcularSubtotal(items)).toBe(100.00);
    });

    it('UT-004: retorna 0 si el listado de items está vacío', () => {
      expect(calcularSubtotal([])).toBe(0);
    });

    it('UT-005: lanza un error si la cantidad es menor o igual a 0', () => {
      const items = [{ cantidad: -1, precio: 50.00 }];
      expect(() => calcularSubtotal(items)).toThrow('cantidad inválida');
    });

    it('lanza un error si el precio es menor o igual a 0', () => {
      const items = [{ cantidad: 2, precio: -10 }];
      expect(() => calcularSubtotal(items)).toThrow('precio inválido');
    });
  });

  // UT-002
  describe('calcularIva', () => {
    it('UT-002: calcula el IVA al 15% correctamente', () => {
      expect(calcularIva(100.00, 15)).toBe(15.00);
      expect(calcularIva(45.50, 15)).toBe(6.83); // Rounded to 2 decimals
    });

    it('lanza error para subtotal negativo', () => {
      expect(() => calcularIva(-10)).toThrow('Subtotal no puede ser negativo');
    });
  });

  // UT-003
  describe('calcularTotal', () => {
    it('UT-003: calcula el total sumando subtotal e IVA', () => {
      expect(calcularTotal(100.00, 15.00)).toBe(115.00);
    });

    it('lanza error para valores negativos', () => {
      expect(() => calcularTotal(-10, 5)).toThrow('Subtotal e IVA no pueden ser negativos');
    });
  });

  // UT-006 / UT-007
  describe('validarContrasena', () => {
    it('UT-006: rechaza contraseñas débiles o cortas', () => {
      expect(validarContrasena('abc')).toBe(false);
      expect(validarContrasena('Taller123!')).toBe(false); // under 12 chars
      expect(validarContrasena('taller123!_pro')).toBe(false); // missing uppercase
      expect(validarContrasena('TallerPro!_')).toBe(false); // missing number
    });

    it('UT-007: acepta contraseñas seguras según las reglas', () => {
      expect(validarContrasena('Taller123!_Pro')).toBe(true);
      expect(validarContrasena('Admin2026!_Pro')).toBe(true);
    });
  });

  // UT-008 / UT-009
  describe('Secuencias Anuales de Negocio', () => {
    it('UT-008: genera número de venta formateado para año 2026', () => {
      expect(generarNumeroVenta(2026, 1)).toBe('VTA-2026-00001');
      expect(generarNumeroVenta(2026, 154)).toBe('VTA-2026-00154');
    });

    it('UT-009: genera número de venta formateado para año 2027', () => {
      expect(generarNumeroVenta(2027, 1)).toBe('VTA-2027-00001');
    });

    it('genera número de orden de compra correctamente', () => {
      expect(generarNumeroOrden(2026, 1)).toBe('OC-2026-00001');
    });
  });
});
