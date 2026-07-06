import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { FileText, Users, Car, Plus, UserPlus, Landmark, ArrowRight } from 'lucide-react';
import './Inicio.css';

export default function Inicio({ setCurrentView }) {
  const [userName, setUserName] = useState('Usuario');
  const [stats, setStats] = useState({
    simulaciones: 0,
    clientes: 0,
    vehiculos: 0,
    entidades: 0
  });
  useEffect(() => {
    const fetchData = async () => {
      // 1. Get User Name
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        setUserName(user.user_metadata?.full_name || user.email.split('@')[0]);
      }

      // 2. Get Stats
      const [resSims, resClients, resVehs, resEntsCount] = await Promise.all([
        supabase.from('simulaciones').select('id', { count: 'exact', head: true }),
        supabase.from('clientes').select('id', { count: 'exact', head: true }),
        supabase.from('vehiculos').select('id', { count: 'exact', head: true }),
        supabase.from('entidades_financieras').select('id', { count: 'exact', head: true }),
      ]);

      setStats({
        simulaciones: resSims.count || 0,
        clientes: resClients.count || 0,
        vehiculos: resVehs.count || 0,
        entidades: resEntsCount.count || 0
      });
    };

    fetchData();
  }, []);

  return (
    <div className="inicio-container">
      <header className="inicio-header">
        <p className="subtitle">Simulador de Crédito Vehicular — Compra Inteligente</p>
        <h1>¡Bienvenido, {userName}!</h1>
        <p className="description">Simula créditos vehiculares con cuota final (cuotón) por el método francés vencido ordinario, en soles o dólares, con periodos de gracia total o parcial e indicadores VAN, TIR y TCEA.</p>
      </header>

      {/* === STATS === */}
      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-icon"><FileText size={24} /></div>
          <div className="stat-info">
            <span className="label">Simulaciones guardadas</span>
            <span className="value">{stats.simulaciones}</span>
            <span className="meta">Total registradas</span>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon"><Users size={24} /></div>
          <div className="stat-info">
            <span className="label">Clientes registrados</span>
            <span className="value">{stats.clientes}</span>
            <span className="meta">Total clientes</span>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon"><Car size={24} /></div>
          <div className="stat-info">
            <span className="label">Vehículos registrados</span>
            <span className="value">{stats.vehiculos}</span>
            <span className="meta">Total vehículos</span>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon"><Landmark size={24} /></div>
          <div className="stat-info">
            <span className="label">Entidades financieras</span>
            <span className="value">{stats.entidades}</span>
            <span className="meta">Total entidades</span>
          </div>
        </div>
      </div>

      {/* === QUICK ACTIONS === */}
      <section style={{ marginBottom: '2.5rem' }}>
        <h2 className="section-title">Acciones rápidas</h2>
        <p className="section-desc">Accede rápidamente a las funciones más utilizadas</p>
        <div className="actions-grid">
          <div className="action-card" onClick={() => setCurrentView('simulador')}>
            <div className="action-icon"><Plus size={20} /></div>
            <div className="action-info">
              <h3>Nueva simulación</h3>
              <p>Simular un crédito Compra Inteligente</p>
            </div>
            <div className="action-footer"><ArrowRight size={16} /></div>
          </div>
          <div className="action-card" onClick={() => setCurrentView('clientes')}>
            <div className="action-icon"><UserPlus size={20} /></div>
            <div className="action-info">
              <h3>Registrar cliente</h3>
              <p>Agregar nuevo cliente al sistema</p>
            </div>
            <div className="action-footer"><ArrowRight size={16} /></div>
          </div>
          <div className="action-card" onClick={() => setCurrentView('vehiculos')}>
            <div className="action-icon"><Car size={20} /></div>
            <div className="action-info">
              <h3>Registrar vehículo</h3>
              <p>Agregar vehículo al catálogo (S/ o US$)</p>
            </div>
            <div className="action-footer"><ArrowRight size={16} /></div>
          </div>
          <div className="action-card" onClick={() => setCurrentView('entidades')}>
            <div className="action-icon"><Landmark size={20} /></div>
            <div className="action-info">
              <h3>Nueva entidad financiera</h3>
              <p>Registrar banco o financiera</p>
            </div>
            <div className="action-footer"><ArrowRight size={16} /></div>
          </div>
        </div>
      </section>

    </div>
  );
}
