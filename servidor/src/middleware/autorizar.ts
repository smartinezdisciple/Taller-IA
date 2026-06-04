import { Response, NextFunction } from 'express';
import { RequestAutenticado } from './autenticar.js';

export function autorizar(rolesPermitidos: ('administrador' | 'vendedor' | 'comprador')[]) {
  return (req: RequestAutenticado, res: Response, next: NextFunction) => {
    if (!req.usuario) {
      return res.status(401).json({ mensaje: 'No autenticado.' });
    }

    if (!rolesPermitidos.includes(req.usuario.rol)) {
      return res.status(403).json({ mensaje: 'No tiene permisos para realizar esta operación.' });
    }

    next();
  };
}
