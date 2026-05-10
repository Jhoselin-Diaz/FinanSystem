import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { 
  FileText, Users, Car, ShieldCheck, Plus, UserPlus, Landmark, ArrowRight,
  Calculator, Settings, Activity, TrendingUp, Percent, Link as LinkIcon, 
  Calendar, DollarSign, CheckCircle2, ChevronRight
} from 'lucide-react';
import './Inicio.css';

export default function Inicio({ setCurrentView }) {
  const [userName, setUserName] = useState('Usuario');
  const [stats, setStats] = useState({
    simulaciones: 0,
    clientes: 0,
    vehiculos: 0,
    aprobados: 0
  });
  const [config, setConfig] = useState(null);
  const [entidades, setEntidades] = useState([]);

  useEffect(() => {
    const fetchData = async () => {
      // 1. Get User Name
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        setUserName(user.user_metadata?.full_name || user.email.split('@')[0]);
      }

      // 2. Get Stats
      const [resSims, resClients, resVehs, resEnts, resCfg] = await Promise.all([
        supabase.from('simulaciones').select('id', { count: 'exact', head: true }),
        supabase.from('clientes').select('id', { count: 'exact', head: true }),
        supabase.from('vehiculos').select('id', { count: 'exact', head: true }),
        supabase.from('entidades_financieras').select('*').limit(5),
        supabase.from('configuracion').select('*').maybeSingle()
      ]);

      setStats({
        simulaciones: resSims.count || 0,
        clientes: resClients.count || 0,
        vehiculos: resVehs.count || 0,
        aprobados: Math.floor((resSims.count || 0) * 0.75) // Mock logic: 75% approval
      });

      if (resEnts.data) setEntidades(resEnts.data);
      if (resCfg.data) setConfig(resCfg.data);
    };

    fetchData();
  }, []);

  return (
    <div className="inicio-container">
      <header className="inicio-header">
        <p className="subtitle">Sistema de Gestión y Simulación de Créditos Vehiculares</p>
        <h1>¡Bienvenido, {userName}! 👋</h1>
        <p className="description">Plataforma profesional para simulación, evaluación y gestión de financiamiento automotriz.</p>
      </header>

      {/* === STATS === */}
      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-icon"><FileText size={24} /></div>
          <div className="stat-info">
            <span className="label">Simulaciones realizadas</span>
            <span className="value">{stats.simulaciones}</span>
            <span className="meta">Este mes</span>
            <div className="stat-trend"><TrendingUp size={14} /> 12.5% vs. mes ant.</div>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon"><Users size={24} /></div>
          <div className="stat-info">
            <span className="label">Clientes registrados</span>
            <span className="value">{stats.clientes}</span>
            <span className="meta">Total clientes</span>
            <div className="stat-trend"><TrendingUp size={14} /> 8.3% vs. mes ant.</div>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon"><Car size={24} /></div>
          <div className="stat-info">
            <span className="label">Vehículos registrados</span>
            <span className="value">{stats.vehiculos}</span>
            <span className="meta">Total vehículos</span>
            <div className="stat-trend"><TrendingUp size={14} /> 15.7% vs. mes ant.</div>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon"><ShieldCheck size={24} /></div>
          <div className="stat-info">
            <span className="label">Créditos aprobados</span>
            <span className="value">{stats.aprobados}</span>
            <span className="meta">Este mes</span>
            <div className="stat-trend"><TrendingUp size={14} /> 10.2% vs. mes ant.</div>
          </div>
        </div>
      </div>

      {/* === CONFIG SUMMARY === */}
      <section style={{ marginBottom: '2.5rem' }}>
        <h2 className="section-title">Configuración actual del sistema</h2>
        <p className="section-desc">Parámetros vigentes para simulación de créditos vehiculares</p>
        <div className="config-summary-grid">
          <div className="config-item">
            <div className="icon"><Percent size={18} /></div>
            <span className="label">TEA promedio</span>
            <span className="value">12.50%</span>
            <span className="subval">Anual</span>
          </div>
          <div className="config-item">
            <div className="icon"><Activity size={18} /></div>
            <span className="label">TCEA promedio</span>
            <span className="value">14.20%</span>
            <span className="subval">Anual</span>
          </div>
          <div className="config-item">
            <div className="icon"><Percent size={18} /></div>
            <span className="label">Cuota inicial mínima</span>
            <span className="value">{config?.cuota_inicial_min || 10}%</span>
            <span className="subval">Del valor del vehículo</span>
          </div>
          <div className="config-item">
            <div className="icon"><Calendar size={18} /></div>
            <span className="label">Plazo máximo</span>
            <span className="value">{config?.plazo_maximo || 60} meses</span>
            <span className="subval">5 años</span>
          </div>
          <div className="config-item">
            <div className="icon"><DollarSign size={18} /></div>
            <span className="label">Moneda principal</span>
            <span className="value">{config?.moneda_predeterminada?.split(' ')[0] || 'Soles'}</span>
            <span className="subval">{config?.moneda_predeterminada?.split(' ')[1] || '(S/)'}</span>
          </div>
          <div className="config-item">
            <div className="icon"><ShieldCheck size={18} /></div>
            <span className="label">Seguro vehicular</span>
            <span className="value">S/ 180</span>
            <span className="subval">Promedio mensual</span>
          </div>
        </div>
      </section>

      {/* === QUICK ACTIONS === */}
      <section style={{ marginBottom: '2.5rem' }}>
        <h2 className="section-title">Acciones rápidas</h2>
        <p className="section-desc">Accede rápidamente a las funciones más utilizadas</p>
        <div className="actions-grid">
          <div className="action-card" onClick={() => setCurrentView('simulador')}>
            <div className="action-icon"><Plus size={20} /></div>
            <div className="action-info">
              <h3>Nueva simulación</h3>
              <p>Crear una nueva evaluación financiera vehicular</p>
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
              <p>Agregar vehículo al catálogo</p>
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

      {/* === INFO SECTION === */}
      <section className="info-section">
        <h2 className="section-title">¿Qué es FinanSystem?</h2>
        <p className="section-desc">FinanSystem es una plataforma especializada en simulación y gestión de créditos vehiculares diseñada para automatizar procesos financieros, evaluar opciones de financiamiento y facilitar el análisis de préstamos automotrices mediante cálculos precisos y cronogramas detallados.</p>
        <div className="info-grid">
          <div className="info-item">
            <Calculator className="info-item-icon" size={24} />
            <div className="info-item-text">
              <h4>Simulador Financiero</h4>
              <p>Cálculo automático de cuotas, TEA, TCEA y cronogramas detallados.</p>
            </div>
          </div>
          <div className="info-item">
            <Car className="info-item-icon" size={24} />
            <div className="info-item-text">
              <h4>Gestión Vehicular</h4>
              <p>Administración completa de vehículos, marcas, modelos y catálogos.</p>
            </div>
          </div>
          <div className="info-item">
            <Landmark className="info-item-icon" size={24} />
            <div className="info-item-text">
              <h4>Evaluación Bancaria</h4>
              <p>Comparación entre entidades financieras para tomar mejores decisiones.</p>
            </div>
          </div>
          <div className="info-item">
            <TrendingUp className="info-item-icon" size={24} />
            <div className="info-item-text">
              <h4>Análisis Financiero</h4>
              <p>Indicadores, métricas y reportes para análisis profundo.</p>
            </div>
          </div>
        </div>
      </section>

      {/* === CONCEPTOS === */}
      <section style={{ marginBottom: '3rem' }}>
        <h2 className="section-title">Conceptos financieros clave</h2>
        <p className="section-desc">Principales conceptos utilizados en el financiamiento vehicular</p>
        <div className="config-summary-grid">
           <div className="config-item" style={{textAlign:'left', height:'auto', padding:'1.25rem'}}>
             <div className="icon" style={{margin:'0 0 0.75rem'}}><Percent size={18}/></div>
             <span className="value" style={{fontSize:'0.9rem'}}>TEA</span>
             <span className="subval" style={{color:'#64748b', fontSize:'0.75rem'}}>Tasa Efectiva Anual</span>
             <p style={{fontSize:'0.7rem', color:'#94a3b8', marginTop:'0.5rem'}}>Es la tasa real anual que considera la capitalización de intereses.</p>
           </div>
           <div className="config-item" style={{textAlign:'left', height:'auto', padding:'1.25rem'}}>
             <div className="icon" style={{margin:'0 0 0.75rem'}}><LinkIcon size={18}/></div>
             <span className="value" style={{fontSize:'0.9rem'}}>TCEA</span>
             <span className="subval" style={{color:'#64748b', fontSize:'0.75rem'}}>Tasa de Costo Efectivo Anual</span>
             <p style={{fontSize:'0.7rem', color:'#94a3b8', marginTop:'0.5rem'}}>Incluye intereses, seguros, comisiones y gastos administrativos.</p>
           </div>
           <div className="config-item" style={{textAlign:'left', height:'auto', padding:'1.25rem'}}>
             <div className="icon" style={{margin:'0 0 0.75rem'}}><Calendar size={18}/></div>
             <span className="value" style={{fontSize:'0.9rem'}}>Cuota Mensual</span>
             <span className="subval" style={{color:'#64748b', fontSize:'0.75rem'}}>Monto periódico</span>
             <p style={{fontSize:'0.7rem', color:'#94a3b8', marginTop:'0.5rem'}}>Monto que se paga durante el plazo del crédito según el sistema francés.</p>
           </div>
           <div className="config-item" style={{textAlign:'left', height:'auto', padding:'1.25rem'}}>
             <div className="icon" style={{margin:'0 0 0.75rem'}}><DollarSign size={18}/></div>
             <span className="value" style={{fontSize:'0.9rem'}}>Cuota Inicial</span>
             <span className="subval" style={{color:'#64748b', fontSize:'0.75rem'}}>Pago inicial</span>
             <p style={{fontSize:'0.7rem', color:'#94a3b8', marginTop:'0.5rem'}}>Pago inicial requerido antes de iniciar el financiamiento del vehículo.</p>
           </div>
        </div>
      </section>

      {/* === DUAL LISTS === */}
      <div className="dual-lists">
        <div className="list-card">
          <h2 className="section-title">Tipos de financiamiento vehicular</h2>
          <p className="section-desc">Opciones disponibles para tu próximo vehículo</p>
          <div className="list-items">
            <div className="finance-type-item">
              <div className="ft-icon"><Car size={18}/></div>
              <div className="ft-info">
                <h5>Crédito Vehicular Tradicional</h5>
                <p>Financiamiento estándar con cuotas fijas y plazos definidos.</p>
              </div>
              <ChevronRight size={16} style={{marginLeft:'auto', color:'#cbd5e1'}}/>
            </div>
            <div className="finance-type-item">
              <div className="ft-icon"><Activity size={18}/></div>
              <div className="ft-info">
                <h5>Leasing Vehicular</h5>
                <p>Arrendamiento financiero con opción de compra al final.</p>
              </div>
              <ChevronRight size={16} style={{marginLeft:'auto', color:'#cbd5e1'}}/>
            </div>
            <div className="finance-type-item">
              <div className="ft-icon"><TrendingUp size={18}/></div>
              <div className="ft-info">
                <h5>Crédito Inteligente</h5>
                <p>Cuotas reducidas con pago final mayor (balloon payment).</p>
              </div>
              <ChevronRight size={16} style={{marginLeft:'auto', color:'#cbd5e1'}}/>
            </div>
            <div className="finance-type-item">
              <div className="ft-icon"><ShieldCheck size={18}/></div>
              <div className="ft-info">
                <h5>Financiamiento Empresarial</h5>
                <p>Soluciones especiales para flotas y empresas.</p>
              </div>
              <ChevronRight size={16} style={{marginLeft:'auto', color:'#cbd5e1'}}/>
            </div>
          </div>
        </div>

        <div className="list-card">
          <h2 className="section-title">Entidades financieras asociadas</h2>
          <p className="section-desc">Bancos y financieras disponibles en el sistema</p>
          <table className="entities-mini-table">
            <thead>
              <tr>
                <th>Entidad</th>
                <th>TEA Promedio</th>
                <th>Plazo Máximo</th>
                <th>Estado</th>
              </tr>
            </thead>
            <tbody>
              {entidades.map(ent => (
                <tr key={ent.id}>
                  <td style={{fontWeight:600}}>{ent.nombre}</td>
                  <td>{ent.tea_soles_min}%</td>
                  <td>{ent.plazo_maximo} meses</td>
                  <td><span className="badge-active">Activo</span></td>
                </tr>
              ))}
              {entidades.length === 0 && (
                <tr><td colSpan="4" style={{textAlign:'center', color:'#94a3b8', padding:'1rem'}}>No hay entidades registradas</td></tr>
              )}
            </tbody>
          </table>
          <button className="clear-all" style={{marginTop:'1rem', color:'#1d68b6', fontWeight:600}} onClick={() => setCurrentView('entidades')}>Ver todas las entidades →</button>
        </div>
      </div>

      {/* === BOTTOM BLOCKS === */}
      <div className="bottom-blocks">
        <div className="block-card">
          <h3>Método de amortización utilizado</h3>
          <h4>Método Francés (Cuota Fija)</h4>
          <p className="desc">Sistema de amortización con cuotas constantes durante todo el plazo del préstamo. Al inicio se paga más intereses y posteriormente más capital.</p>
          <div className="checklist">
            <div className="checklist-item"><CheckCircle2 className="check" size={16}/> Cuota fija mensual</div>
            <div className="checklist-item"><CheckCircle2 className="check" size={16}/> Interés decreciente</div>
            <div className="checklist-item"><CheckCircle2 className="check" size={16}/> Amortización progresiva</div>
            <div className="checklist-item"><CheckCircle2 className="check" size={16}/> Método más usado en Perú</div>
          </div>
        </div>

        <div className="block-card">
          <h3>Recomendaciones financieras</h3>
          <p className="desc">Consejos para un financiamiento inteligente</p>
          <div className="recommendations-list">
            <div className="rec-item"><CheckCircle2 className="check-circle" size={16}/> Compara la TCEA entre diferentes entidades financieras.</div>
            <div className="rec-item"><CheckCircle2 className="check-circle" size={16}/> No excedas el 30% de tus ingresos en la cuota mensual.</div>
            <div className="rec-item"><CheckCircle2 className="check-circle" size={16}/> Mantén un buen historial crediticio para mejores tasas.</div>
            <div className="rec-item"><CheckCircle2 className="check-circle" size={16}/> Considera seguros y gastos adicionales en tu presupuesto.</div>
          </div>
        </div>
      </div>
    </div>
  );
}
