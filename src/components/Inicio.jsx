import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import {
  FileText, Users, Car, Plus, UserPlus, Landmark, ArrowRight,
  Calculator, Activity, TrendingUp, Percent,
  Calendar, DollarSign, CheckCircle2
} from 'lucide-react';
import './Inicio.css';

export default function Inicio({ setCurrentView }) {
  const [userName, setUserName] = useState('Usuario');
  const [stats, setStats] = useState({
    simulaciones: 0,
    clientes: 0,
    vehiculos: 0,
    entidades: 0
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
      const [resSims, resClients, resVehs, resEntsCount, resEnts, resCfg] = await Promise.all([
        supabase.from('simulaciones').select('id', { count: 'exact', head: true }),
        supabase.from('clientes').select('id', { count: 'exact', head: true }),
        supabase.from('vehiculos').select('id', { count: 'exact', head: true }),
        supabase.from('entidades_financieras').select('id', { count: 'exact', head: true }),
        supabase.from('entidades_financieras').select('*').limit(5),
        supabase.from('configuracion').select('*').maybeSingle()
      ]);

      setStats({
        simulaciones: resSims.count || 0,
        clientes: resClients.count || 0,
        vehiculos: resVehs.count || 0,
        entidades: resEntsCount.count || 0
      });

      if (resEnts.data) setEntidades(resEnts.data);
      if (resCfg.data) setConfig(resCfg.data);
    };

    fetchData();
  }, []);

  // TEA mínima real entre las entidades registradas (en soles)
  const teaMin = entidades.length > 0
    ? Math.min(...entidades.map(e => parseFloat(e.tea_soles_min) || Infinity))
    : null;

  return (
    <div className="inicio-container">
      <header className="inicio-header">
        <p className="subtitle">Simulador de Crédito Vehicular — Compra Inteligente</p>
        <h1>¡Bienvenido, {userName}! 👋</h1>
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

      {/* === CONFIG SUMMARY === */}
      <section style={{ marginBottom: '2.5rem' }}>
        <h2 className="section-title">Configuración actual del sistema</h2>
        <p className="section-desc">Parámetros vigentes para simulación de créditos vehiculares</p>
        <div className="config-summary-grid">
          <div className="config-item">
            <div className="icon"><Percent size={18} /></div>
            <span className="label">Mejor TEA disponible</span>
            <span className="value">{teaMin !== null && Number.isFinite(teaMin) ? `${teaMin.toFixed(2)}%` : '—'}</span>
            <span className="subval">Entre entidades registradas</span>
          </div>
          <div className="config-item">
            <div className="icon"><Activity size={18} /></div>
            <span className="label">Tipo de tasa</span>
            <span className="value">{config?.tipo_tasa_predeterminada?.includes('Nominal') ? 'TNA' : 'TEA'}</span>
            <span className="subval">Predeterminada</span>
          </div>
          <div className="config-item">
            <div className="icon"><DollarSign size={18} /></div>
            <span className="label">Moneda principal</span>
            <span className="value">{config?.moneda_predeterminada?.split(' ')[0] || 'Soles'}</span>
            <span className="subval">{config?.moneda_predeterminada?.split(' ')[1] || '(S/)'}</span>
          </div>
          <div className="config-item">
            <div className="icon"><Calendar size={18} /></div>
            <span className="label">Plazo máximo</span>
            <span className="value">{config?.plazo_maximo || 60} meses</span>
            <span className="subval">{((config?.plazo_maximo || 60) / 12).toFixed(0)} años</span>
          </div>
          <div className="config-item">
            <div className="icon"><Calendar size={18} /></div>
            <span className="label">Gracia máxima</span>
            <span className="value">{config?.periodo_gracia_max ?? 6} meses</span>
            <span className="subval">Total o parcial</span>
          </div>
          <div className="config-item">
            <div className="icon"><Calculator size={18} /></div>
            <span className="label">Calendario</span>
            <span className="value">360 días</span>
            <span className="subval">Meses de 30 días</span>
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

      {/* === CÓMO FUNCIONA === */}
      <section className="info-section">
        <h2 className="section-title">¿Qué es la Compra Inteligente?</h2>
        <p className="section-desc">Es un crédito vehicular con cuotas mensuales reducidas: pagas una cuota inicial, financias el saldo con cuotas fijas (método francés) y dejas una cuota final o "cuotón" (por ejemplo, 40% del precio) que se paga un mes después de la última cuota. El sistema calcula el cronograma completo y los indicadores exigidos por la norma de transparencia del sistema financiero peruano.</p>
        <div className="info-grid">
          <div className="info-item">
            <DollarSign className="info-item-icon" size={24} />
            <div className="info-item-text">
              <h4>1. Cuota inicial</h4>
              <p>Porcentaje del precio del vehículo que se paga al inicio (pCI).</p>
            </div>
          </div>
          <div className="info-item">
            <Calculator className="info-item-icon" size={24} />
            <div className="info-item-text">
              <h4>2. Cuotas mensuales</h4>
              <p>Cuota fija francesa que incluye interés, amortización y desgravamen, más seguros y costos periódicos.</p>
            </div>
          </div>
          <div className="info-item">
            <TrendingUp className="info-item-icon" size={24} />
            <div className="info-item-text">
              <h4>3. Cuotón final</h4>
              <p>Cuota final (pCF) que se paga en el mes N+1. Permite cuotas mensuales más bajas.</p>
            </div>
          </div>
          <div className="info-item">
            <Activity className="info-item-icon" size={24} />
            <div className="info-item-text">
              <h4>4. Indicadores</h4>
              <p>VAN, TIR, TEA, TEM y TCEA calculados desde el flujo de caja del deudor.</p>
            </div>
          </div>
        </div>
      </section>

      {/* === CONCEPTOS === */}
      <section style={{ marginBottom: '3rem' }}>
        <h2 className="section-title">Conceptos financieros clave</h2>
        <p className="section-desc">Principales conceptos utilizados en la simulación</p>
        <div className="config-summary-grid">
           <div className="config-item" style={{textAlign:'left', height:'auto', padding:'1.25rem'}}>
             <div className="icon" style={{margin:'0 0 0.75rem'}}><Percent size={18}/></div>
             <span className="value" style={{fontSize:'0.9rem'}}>TEA / TEM</span>
             <span className="subval" style={{color:'#64748b', fontSize:'0.75rem'}}>Tasa Efectiva Anual / Mensual</span>
             <p style={{fontSize:'0.7rem', color:'#94a3b8', marginTop:'0.5rem'}}>Tasa real que considera la capitalización. Si la tasa es nominal (TNA), se convierte usando el periodo de capitalización.</p>
           </div>
           <div className="config-item" style={{textAlign:'left', height:'auto', padding:'1.25rem'}}>
             <div className="icon" style={{margin:'0 0 0.75rem'}}><Activity size={18}/></div>
             <span className="value" style={{fontSize:'0.9rem'}}>TCEA</span>
             <span className="subval" style={{color:'#64748b', fontSize:'0.75rem'}}>Tasa de Costo Efectivo Anual</span>
             <p style={{fontSize:'0.7rem', color:'#94a3b8', marginTop:'0.5rem'}}>Costo total del crédito: intereses, seguros, comisiones y gastos. Se obtiene anualizando la TIR del flujo del deudor.</p>
           </div>
           <div className="config-item" style={{textAlign:'left', height:'auto', padding:'1.25rem'}}>
             <div className="icon" style={{margin:'0 0 0.75rem'}}><TrendingUp size={18}/></div>
             <span className="value" style={{fontSize:'0.9rem'}}>VAN</span>
             <span className="subval" style={{color:'#64748b', fontSize:'0.75rem'}}>Valor Actual Neto</span>
             <p style={{fontSize:'0.7rem', color:'#94a3b8', marginTop:'0.5rem'}}>Valor presente del flujo de caja del deudor descontado a la tasa COK.</p>
           </div>
           <div className="config-item" style={{textAlign:'left', height:'auto', padding:'1.25rem'}}>
             <div className="icon" style={{margin:'0 0 0.75rem'}}><Calculator size={18}/></div>
             <span className="value" style={{fontSize:'0.9rem'}}>TIR</span>
             <span className="subval" style={{color:'#64748b', fontSize:'0.75rem'}}>Tasa Interna de Retorno</span>
             <p style={{fontSize:'0.7rem', color:'#94a3b8', marginTop:'0.5rem'}}>Tasa que hace cero el VAN del flujo. Desde el punto de vista del deudor es el costo efectivo periódico del crédito.</p>
           </div>
           <div className="config-item" style={{textAlign:'left', height:'auto', padding:'1.25rem'}}>
             <div className="icon" style={{margin:'0 0 0.75rem'}}><DollarSign size={18}/></div>
             <span className="value" style={{fontSize:'0.9rem'}}>Cuotón (CF)</span>
             <span className="subval" style={{color:'#64748b', fontSize:'0.75rem'}}>Cuota final</span>
             <p style={{fontSize:'0.7rem', color:'#94a3b8', marginTop:'0.5rem'}}>Porcentaje del precio que se paga al final (mes N+1). Reduce la cuota mensual durante el plazo.</p>
           </div>
           <div className="config-item" style={{textAlign:'left', height:'auto', padding:'1.25rem'}}>
             <div className="icon" style={{margin:'0 0 0.75rem'}}><Calendar size={18}/></div>
             <span className="value" style={{fontSize:'0.9rem'}}>Gracia T / P</span>
             <span className="subval" style={{color:'#64748b', fontSize:'0.75rem'}}>Periodos de gracia</span>
             <p style={{fontSize:'0.7rem', color:'#94a3b8', marginTop:'0.5rem'}}>Total: no se paga cuota y el interés se capitaliza. Parcial: se paga solo el interés y el saldo no cambia.</p>
           </div>
        </div>
      </section>

      {/* === ENTIDADES + MÉTODO === */}
      <div className="dual-lists">
        <div className="list-card">
          <h2 className="section-title">Entidades financieras asociadas</h2>
          <p className="section-desc">Bancos y financieras disponibles en el sistema</p>
          <table className="entities-mini-table">
            <thead>
              <tr>
                <th>Entidad</th>
                <th>TEA Soles</th>
                <th>TEA Dólares</th>
                <th>Plazo Máximo</th>
                <th>Estado</th>
              </tr>
            </thead>
            <tbody>
              {entidades.map(ent => (
                <tr key={ent.id}>
                  <td style={{fontWeight:600}}>{ent.nombre}</td>
                  <td>{ent.tea_soles_min}% - {ent.tea_soles_max}%</td>
                  <td>{ent.tea_dolares_min}% - {ent.tea_dolares_max}%</td>
                  <td>{ent.plazo_maximo} meses</td>
                  <td><span className={ent.estado === 'Activo' ? 'badge-active' : 'badge-inactive'}>{ent.estado}</span></td>
                </tr>
              ))}
              {entidades.length === 0 && (
                <tr><td colSpan="5" style={{textAlign:'center', color:'#94a3b8', padding:'1rem'}}>No hay entidades registradas</td></tr>
              )}
            </tbody>
          </table>
          <button className="clear-all" style={{marginTop:'1rem', color:'#1d68b6', fontWeight:600}} onClick={() => setCurrentView('entidades')}>Ver todas las entidades →</button>
        </div>

        <div className="list-card">
          <h2 className="section-title">Método de amortización utilizado</h2>
          <p className="section-desc">Método Francés vencido ordinario (cuota fija)</p>
          <p style={{fontSize:'0.85rem', color:'#64748b', marginBottom:'1rem'}}>Sistema de amortización con cuotas constantes, meses de 30 días y año de 360 días. Al inicio se paga más interés y progresivamente más capital. El cuotón se descuenta a valor presente y crece mes a mes hasta pagarse en el mes N+1.</p>
          <div className="checklist">
            <div className="checklist-item"><CheckCircle2 className="check" size={16}/> Cuota fija mensual (incluye desgravamen)</div>
            <div className="checklist-item"><CheckCircle2 className="check" size={16}/> Interés decreciente, amortización progresiva</div>
            <div className="checklist-item"><CheckCircle2 className="check" size={16}/> Gracia total o parcial al inicio</div>
            <div className="checklist-item"><CheckCircle2 className="check" size={16}/> Soles o dólares, tasa efectiva o nominal</div>
            <div className="checklist-item"><CheckCircle2 className="check" size={16}/> VAN, TIR y TCEA desde el flujo del deudor</div>
          </div>
        </div>
      </div>
    </div>
  );
}
