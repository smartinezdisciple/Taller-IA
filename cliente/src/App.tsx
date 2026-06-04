import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import Layout from './componentes/Layout';
import Login from './paginas/Login';
import PanelControl from './paginas/PanelControl';
import Roles from './paginas/Roles';
import Ventas from './paginas/Ventas';
import Compras from './paginas/Compras';
import Clientes from './paginas/Clientes';
import Personal from './paginas/Personal';
import Perfil from './paginas/Perfil';
import Inventario from './paginas/Inventario';
import Reportes from './paginas/Reportes';

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Auth Route */}
        <Route path="/login" element={<Login />} />

        {/* Dashboard Routes wrapped in unified Sidebar/Header Layout */}
        <Route path="/" element={<Layout />}>
          <Route index element={<Navigate to="/dashboard" replace />} />
          <Route path="dashboard" element={<PanelControl />} />
          <Route path="inventario" element={<Inventario />} />
          <Route path="roles" element={<Roles />} />
          <Route path="ventas" element={<Ventas />} />
          <Route path="compras" element={<Compras />} />
          <Route path="clientes" element={<Clientes />} />
          <Route path="personal" element={<Personal />} />
          <Route path="perfil" element={<Perfil />} />
          <Route path="reportes" element={<Reportes />} />
          <Route path="*" element={<Navigate to="/dashboard" replace />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}
