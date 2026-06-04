import React from 'react';
import { Outlet, Navigate } from 'react-router-dom';
import { useAutenticacionStore } from '../store/autenticacionStore';
import Sidebar from './Sidebar';
import Header from './Header';

export default function Layout() {
  const { accessToken } = useAutenticacionStore();

  // Redirect to login if user is not authenticated
  if (!accessToken) {
    return <Navigate to="/login" replace />;
  }

  return (
    <div className="min-h-screen bg-fondo-base text-texto-principal">
      <Sidebar />
      <div className="pl-[260px] transition-all duration-300">
        <Header />
        <main className="pt-16 p-8 min-h-[calc(100vh-64px)]">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
