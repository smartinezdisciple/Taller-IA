export function calcularSubtotal(items: { cantidad: number; precio: number }[]): number {
  let subtotal = 0;
  for (const item of items) {
    if (item.cantidad <= 0) {
      throw new Error('cantidad inválida');
    }
    if (item.precio <= 0) {
      throw new Error('precio inválido');
    }
    subtotal += item.cantidad * item.precio;
  }
  return parseFloat(subtotal.toFixed(2));
}

export function calcularIva(subtotal: number, porcentaje = 15.00): number {
  if (subtotal < 0) {
    throw new Error('Subtotal no puede ser negativo');
  }
  return parseFloat((subtotal * (porcentaje / 100)).toFixed(2));
}

export function calcularTotal(subtotal: number, iva: number): number {
  if (subtotal < 0 || iva < 0) {
    throw new Error('Subtotal e IVA no pueden ser negativos');
  }
  return parseFloat((subtotal + iva).toFixed(2));
}

export function validarContrasena(contrasena: string): boolean {
  // Min 12 chars, 1 uppercase, 1 number, 1 special character
  const regex = /^(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*()_+\-=\[\]{};':",\\|.<>\/?]).{12,}$/;
  return regex.test(contrasena);
}

export function generarNumeroVenta(anio: number, seq: number): string {
  if (anio <= 0 || seq <= 0) {
    throw new Error('Año y secuencia deben ser positivos');
  }
  const seqStr = String(seq).padStart(5, '0');
  return `VTA-${anio}-${seqStr}`;
}

export function generarNumeroOrden(anio: number, seq: number): string {
  if (anio <= 0 || seq <= 0) {
    throw new Error('Año y secuencia deben ser positivos');
  }
  const seqStr = String(seq).padStart(5, '0');
  return `OC-${anio}-${seqStr}`;
}
