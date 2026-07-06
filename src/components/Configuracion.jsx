import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { HelpCircle, RefreshCw, Save, Plus, Pencil, Trash2, Eye, EyeOff, Lock, CheckCircle } from 'lucide-react';
import './Configuracion.css';

const DEFAULT_CONFIG = {
  // Mantener sólo los parámetros obligatorios para la configuración inicial
  metodo_calculo: 'Método Francés (Sistema de Cuotas Constantes)',
  tipo_calendario: 'Calendario Comercial (360 días)',
  moneda_predeterminada: 'Soles (S/)',
  tipo_tasa_predeterminada: 'Efectiva Anual (TEA)',
  capitalizacion_predeterminada: 'Mensual',
  plazo_maximo: 60,
  periodo_gracia_max: 6,
  redondeo: 2,
  permitir_edicion: true,
  notas: 'Estos parámetros se aplicarán a todas las simulaciones. Los cambios serán efectivos inmediatamente.',
};

// SeguroRow defined OUTSIDE to avoid React hook issues
function SeguroRow({ seg, isEditing, onEdit, onDelete, onSave, onCancel, onChange }) {
  if (isEditing) return (
    <tr>
      <td><input className="td-input" style={{width:110}} value={seg.tipo||''} onChange={e=>onChange('tipo',e.target.value)}/></td>
      <td><input className="td-input" style={{width:'100%'}} value={seg.descripcion||''} onChange={e=>onChange('descripcion',e.target.value)}/></td>
      <td><select className="td-select" value={seg.aplicacion||'Obligatorio'} onChange={e=>onChange('aplicacion',e.target.value)}><option>Obligatorio</option><option>Opcional</option></select></td>
      <td><input className="td-input" type="number" step="0.001" value={seg.porcentaje_min??0} onChange={e=>onChange('porcentaje_min',e.target.value)}/></td>
      <td><input className="td-input" type="number" step="0.001" value={seg.porcentaje_max??0} onChange={e=>onChange('porcentaje_max',e.target.value)}/></td>
      <td><select className="td-select" value={seg.estado||'Activo'} onChange={e=>onChange('estado',e.target.value)}><option>Activo</option><option>Inactivo</option></select></td>
      <td>
        <div className="tbl-actions">
          <button className="btn-tbl-icon edit" onClick={()=>onSave(seg)}><CheckCircle size={15}/></button>
          <button className="btn-tbl-icon del" onClick={onCancel}><Trash2 size={15}/></button>
        </div>
      </td>
    </tr>
  );
  return (
    <tr>
      <td style={{fontWeight:600}}>{seg.tipo}</td>
      <td style={{color:'#64748b',fontSize:'0.82rem'}}>{seg.descripcion}</td>
      <td><span className={seg.aplicacion==='Obligatorio'?'badge-obligatorio':'badge-opcional'}>{seg.aplicacion}</span></td>
      <td>{parseFloat(seg.porcentaje_min||0).toFixed(3)}</td>
      <td>{parseFloat(seg.porcentaje_max||0).toFixed(3)}</td>
      <td><span className={seg.estado==='Activo'?'status-activo':'status-inactivo'}>{seg.estado}</span></td>
      <td>
        <div className="tbl-actions">
          <button className="btn-tbl-icon edit" onClick={()=>onEdit(seg)}><Pencil size={14}/></button>
          <button className="btn-tbl-icon del" onClick={()=>onDelete(seg.id)}><Trash2 size={14}/></button>
        </div>
      </td>
    </tr>
  );
}

export default function Configuracion() {
  const [cfg, setCfg] = useState({ ...DEFAULT_CONFIG });
  const [cfgId, setCfgId] = useState(null);
  const [seguros, setSeguros] = useState([]);
  const [editingSeguro, setEditingSeguro] = useState(null);
  const [newSeguro, setNewSeguro] = useState(null);
  const [pwActual, setPwActual] = useState('');
  const [pwNueva, setPwNueva] = useState('');
  const [pwConfirm, setPwConfirm] = useState('');
  const [showPw, setShowPw] = useState({ actual: false, nueva: false, confirm: false });
  const [pwMsg, setPwMsg] = useState('');
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState(null);

  useEffect(() => { loadConfig(); loadSeguros(); }, []);

  const showToast = (type, msg) => { setToast({ type, msg }); setTimeout(() => setToast(null), 3500); };

  const loadConfig = async () => {
    try {
      const { data, error } = await supabase.from('configuracion').select('*').limit(1).maybeSingle();
      if (!error && data) {
        setCfgId(data.id);
        setCfg({ ...DEFAULT_CONFIG, ...data });
      }
    } catch (e) { console.warn('Config table not ready yet:', e.message); }
  };

  const loadSeguros = async () => {
    try {
      const { data, error } = await supabase.from('tipos_seguros').select('*').order('created_at');
      if (!error && data) setSeguros(data);
    } catch (e) { console.warn('tipos_seguros not ready yet:', e.message); }
  };

  const set = (key) => ({
    value: cfg[key] ?? '',
    onChange: (e) => setCfg(prev => ({ ...prev, [key]: e.target.type === 'checkbox' ? e.target.checked : e.target.value }))
  });

  const handleSave = async () => {
    setSaving(true);
    const payload = { ...cfg, updated_at: new Date().toISOString() };
    let error;
    if (cfgId) {
      ({ error } = await supabase.from('configuracion').update(payload).eq('id', cfgId));
    } else {
      const res = await supabase.from('configuracion').insert([payload]).select().maybeSingle();
      error = res.error;
      if (!error && res.data) setCfgId(res.data.id);
    }
    setSaving(false);
    error ? showToast('error', 'Error: ' + error.message) : showToast('success', '¡Configuración guardada!');
  };

  const handleReset = () => { if (window.confirm('¿Restablecer valores predeterminados?')) setCfg({ ...DEFAULT_CONFIG }); };

  const handleSaveSeguro = async (seg) => {
    const payload = { tipo: seg.tipo, descripcion: seg.descripcion, aplicacion: seg.aplicacion, porcentaje_min: parseFloat(seg.porcentaje_min), porcentaje_max: parseFloat(seg.porcentaje_max), estado: seg.estado };
    const { error } = seg.id
      ? await supabase.from('tipos_seguros').update(payload).eq('id', seg.id)
      : await supabase.from('tipos_seguros').insert([payload]);
    if (error) { showToast('error', 'Error: ' + error.message); return; }
    setEditingSeguro(null); setNewSeguro(null); loadSeguros();
  };

  const handleDeleteSeguro = async (id) => {
    if (!window.confirm('¿Eliminar este seguro?')) return;
    const { error } = await supabase.from('tipos_seguros').delete().eq('id', id);
    if (error) showToast('error', 'Error: ' + error.message);
    else setSeguros(prev => prev.filter(s => s.id !== id));
  };

  const handleUpdatePassword = async () => {
    setPwMsg('');
    if (!pwNueva || !pwConfirm) { setPwMsg('Completa todos los campos.'); return; }
    if (pwNueva !== pwConfirm) { setPwMsg('Las contraseñas no coinciden.'); return; }
    if (pwNueva.length < 12 || !/[A-Z]/.test(pwNueva) || !/[0-9]/.test(pwNueva) || !/[^A-Za-z0-9]/.test(pwNueva)) {
      setPwMsg('Mín. 12 car., mayús., número y carácter especial.'); return;
    }
    const { error } = await supabase.auth.updateUser({ password: pwNueva });
    if (error) { setPwMsg('Error: ' + error.message); return; }
    setPwActual(''); setPwNueva(''); setPwConfirm('');
    showToast('success', '¡Contraseña actualizada!');
  };

  const updateEditing = (key, val) => setEditingSeguro(prev => ({ ...prev, [key]: val }));
  const updateNew = (key, val) => setNewSeguro(prev => ({ ...prev, [key]: val }));

  return (
    <div className="config-container">
      <div className="config-page-header">
        <h1>Configuración del sistema</h1>
        <p>Gestiona los parámetros generales y las reglas de simulación del sistema.</p>
      </div>

      <div className="config-main-stack">
        {/* 1. Parámetros financieros */}
        <div className="config-panel">
          <div className="config-panel-title">1. Parámetros financieros <HelpCircle size={15} className="help-icon" /></div>
          <div className="cfg-form-grid">
            <div className="cfg-form-group">
              <label>Plazo máximo (meses)</label>
              <input className="cfg-input-solo" type="number" {...set('plazo_maximo')} />
              <span className="helper">Plazo máximo permitido del crédito.</span>
            </div>
            <div className="cfg-form-group">
              <label>Período de gracia máximo (meses)</label>
              <input className="cfg-input-solo" style={{maxWidth:160}} type="number" {...set('periodo_gracia_max')} />
              <span className="helper">Meses máximos de gracia permitidos.</span>
            </div>
            <div className="cfg-form-group">
              <label>Redondeo de cálculos</label>
              <select className="cfg-select" {...set('redondeo')}><option value={2}>A 2 decimales</option><option value={3}>A 3 decimales</option></select>
            </div>
          </div>
        </div>

        {/* 2. Configuración de simulación */}
        <div className="config-panel">
          <div className="config-panel-title">2. Configuración de simulación <HelpCircle size={15} className="help-icon" /></div>
          <div className="cfg-form-grid">
            <div className="cfg-form-group">
              <label>Método de cálculo</label>
              <select className="cfg-select" {...set('metodo_calculo')}>
                <option>Método Francés (Sistema de Cuotas Constantes)</option>
              </select>
            </div>
            <div className="cfg-form-group">
              <label>Tipo de calendario</label>
              <select className="cfg-select" {...set('tipo_calendario')}>
                <option>Calendario Comercial (360 días)</option>
                <option>Calendario Exacto (365 días)</option>
              </select>
            </div>
            <div className="cfg-form-group">
              <label>Valor residual mínimo (%)</label>
              <div className="cfg-input-wrap"><input type="number" {...set('valor_residual_min')} /><span className="cfg-addon">%</span></div>
              <span className="helper">Porcentaje mínimo del valor del vehículo.</span>
            </div>
            <div className="cfg-form-group">
              <label>Valor residual máximo (%)</label>
              <div className="cfg-input-wrap"><input type="number" {...set('valor_residual_max')} /><span className="cfg-addon">%</span></div>
              <span className="helper">Porcentaje máximo del valor del vehículo.</span>
            </div>
            <div className="cfg-form-group">
              <label>Cuota inicial mínima (%)</label>
              <div className="cfg-input-wrap"><input type="number" {...set('cuota_inicial_min')} /><span className="cfg-addon">%</span></div>
              <span className="helper">Porcentaje mínimo del valor del vehículo.</span>
            </div>
          </div>
        </div>

        {/* 3. Configuración general */}
        <div className="config-panel">
          <div className="config-panel-title">3. Configuración general <HelpCircle size={15} className="help-icon" /></div>
          <div className="cfg-form-grid">
            <div className="cfg-form-group">
              <label>Moneda predeterminada</label>
              <select className="cfg-select" {...set('moneda_predeterminada')}><option>Soles (S/)</option><option>Dólares (US$)</option></select>
            </div>
            <div className="cfg-form-group">
              <label>Tipo de tasa predeterminada</label>
              <select className="cfg-select" {...set('tipo_tasa_predeterminada')}><option>Efectiva Anual (TEA)</option><option>Nominal Anual (TNA)</option></select>
            </div>
            <div className="cfg-form-group">
              <label>Capitalización predeterminada</label>
              <select className="cfg-select" {...set('capitalizacion_predeterminada')}><option>Mensual</option><option>Trimestral</option><option>Semestral</option><option>Anual</option></select>
            </div>
            <div className="cfg-form-group">
              <label>Redondeo de cálculos</label>
              <select className="cfg-select" {...set('redondeo')}><option value={2}>A 2 decimales</option><option value={3}>A 3 decimales</option><option value={4}>A 4 decimales</option></select>
            </div>
            <div className="cfg-form-group" style={{gridColumn:'span 2'}}>
              <label>Formato de fecha</label>
              <select className="cfg-select" style={{maxWidth:200}} {...set('formato_fecha')}><option>DD/MM/YYYY</option><option>MM/DD/YYYY</option><option>YYYY-MM-DD</option></select>
            </div>
          </div>
          <div className="toggle-row" style={{marginTop:'1.25rem'}}>
            <div className="toggle-label">
              <strong>Permitir edición de resultados</strong>
              <span>Habilita la edición manual de tasas y seguros en la simulación.</span>
            </div>
            <label className="toggle-switch">
              <input type="checkbox" checked={!!cfg.permitir_edicion} onChange={e => setCfg(prev => ({...prev, permitir_edicion: e.target.checked}))} />
              <span className="toggle-slider" />
            </label>
          </div>
        </div>

        {/* 4. Tabla de seguros */}
        <div className="config-panel">
          <div className="config-panel-title">4. Parámetros de seguros y coberturas <HelpCircle size={15} className="help-icon" /></div>
          <div style={{overflowX:'auto'}}>
            <table className="insurance-table">
              <thead>
                <tr><th>Tipo de seguro</th><th>Descripción</th><th>Aplicación</th><th>% Mínimo</th><th>% Máximo</th><th>Estado</th><th>Acciones</th></tr>
              </thead>
              <tbody>
                {seguros.map(seg => (
                  <SeguroRow key={seg.id}
                    seg={editingSeguro?.id === seg.id ? editingSeguro : seg}
                    isEditing={editingSeguro?.id === seg.id}
                    onEdit={s => setEditingSeguro({...s})}
                    onDelete={handleDeleteSeguro}
                    onSave={handleSaveSeguro}
                    onCancel={() => setEditingSeguro(null)}
                    onChange={updateEditing}
                  />
                ))}
                {newSeguro && (
                  <SeguroRow seg={newSeguro} isEditing={true}
                    onSave={handleSaveSeguro} onCancel={() => setNewSeguro(null)} onChange={updateNew} />
                )}
                {seguros.length === 0 && !newSeguro && (
                  <tr><td colSpan="7" style={{textAlign:'center',padding:'1.5rem',color:'#94a3b8'}}>
                    No hay seguros configurados. Haz clic en "Agregar seguro" o ejecuta el SQL en Supabase.
                  </td></tr>
                )}
              </tbody>
            </table>
          </div>
          {!newSeguro && (
            <button className="btn-add-seguro" onClick={() => setNewSeguro({tipo:'',descripcion:'',aplicacion:'Obligatorio',porcentaje_min:0,porcentaje_max:0,estado:'Activo'})}>
              <Plus size={16} /> Agregar seguro
            </button>
          )}
        </div>

        {/* 5. Notas */}
        <div className="config-panel">
          <div className="config-panel-title">5. Notas y observaciones</div>
          <div className="cfg-form-group">
            <label>Notas generales</label>
            <textarea className="cfg-textarea" {...set('notas')} />
          </div>
        </div>

        {/* 6. Password */}
        <div className="config-panel">
          <div className="config-panel-title"><Lock size={16} /> 6. Cambiar contraseña</div>
          <div className="pw-grid">
            {[['actual','Contraseña actual','current-password',pwActual,setPwActual],
              ['nueva','Nueva contraseña','new-password',pwNueva,setPwNueva],
              ['confirm','Confirmar nueva contraseña','new-password',pwConfirm,setPwConfirm]].map(([key,lbl,ac,val,setVal]) => (
              <div className="cfg-form-group" key={key}>
                <label>{lbl}</label>
                <div className="pw-input-wrap">
                  <input type={showPw[key]?'text':'password'} placeholder={lbl} value={val} onChange={e=>setVal(e.target.value)} autoComplete={ac} />
                  <button type="button" onClick={()=>setShowPw(p=>({...p,[key]:!p[key]}))}>
                    {showPw[key]?<EyeOff size={15}/>:<Eye size={15}/>}
                  </button>
                </div>
              </div>
            ))}
          </div>
          {pwMsg && <p style={{color:'#ef4444',fontSize:'0.8rem',marginBottom:'0.75rem'}}>{pwMsg}</p>}
          <button className="btn-update-pw" onClick={handleUpdatePassword}>
            <Lock size={15} /> Actualizar contraseña
          </button>
        </div>
      </div>

      {/* Sticky footer */}
      <div className="config-footer">
        <button className="btn-reset" onClick={handleReset}><RefreshCw size={16}/> Restablecer valores</button>
        <button className="btn-save-config" onClick={handleSave} disabled={saving}><Save size={16}/> {saving?'Guardando...':'Guardar cambios'}</button>
      </div>

      {toast && (
        <div className={`cfg-toast ${toast.type}`}><CheckCircle size={16}/> {toast.msg}</div>
      )}
    </div>
  );
}
