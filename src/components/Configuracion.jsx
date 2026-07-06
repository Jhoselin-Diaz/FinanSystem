import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { HelpCircle, RefreshCw, Save, Eye, EyeOff, Lock, CheckCircle } from 'lucide-react';
import './Configuracion.css';

const DEFAULT_CONFIG = {
  moneda_predeterminada: 'Soles (S/)',
  tipo_tasa_predeterminada: 'Efectiva Anual (TEA)',
  capitalizacion_predeterminada: 'Mensual',
  plazo_maximo: 60,
  periodo_gracia_max: 6,
  seguro_desgravamen: 0.055,
  seguro_vehiculo: 1.20,
};

export default function Configuracion() {
  const [cfg, setCfg] = useState({ ...DEFAULT_CONFIG });
  const [cfgId, setCfgId] = useState(null);
  const [pwActual, setPwActual] = useState('');
  const [pwNueva, setPwNueva] = useState('');
  const [pwConfirm, setPwConfirm] = useState('');
  const [showPw, setShowPw] = useState({ actual: false, nueva: false, confirm: false });
  const [pwMsg, setPwMsg] = useState('');
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState(null);

  useEffect(() => { loadConfig(); }, []);

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

  const set = (key) => ({
    value: cfg[key] ?? '',
    onChange: (e) => setCfg(prev => ({ ...prev, [key]: e.target.value }))
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
              <input className="cfg-input-solo" type="number" {...set('periodo_gracia_max')} />
              <span className="helper">Suma máxima de gracia total + parcial permitida en una simulación.</span>
            </div>
            <div className="cfg-form-group">
              <label>Seguro de desgravamen (%)</label>
              <div className="cfg-input-wrap"><input type="number" step="0.001" {...set('seguro_desgravamen')} /><span className="cfg-addon">%</span></div>
              <span className="helper">Valor por defecto al iniciar una simulación.</span>
            </div>
            <div className="cfg-form-group">
              <label>Seguro vehicular / riesgo (% anual)</label>
              <div className="cfg-input-wrap"><input type="number" step="0.01" {...set('seguro_vehiculo')} /><span className="cfg-addon">%</span></div>
              <span className="helper">Valor por defecto al iniciar una simulación.</span>
            </div>
          </div>
        </div>

        {/* 2. Configuración general */}
        <div className="config-panel">
          <div className="config-panel-title">2. Configuración general <HelpCircle size={15} className="help-icon" /></div>
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
              <span className="helper">Solo aplica cuando la tasa predeterminada es Nominal (TNA).</span>
            </div>
          </div>
        </div>

        {/* 3. Password */}
        <div className="config-panel">
          <div className="config-panel-title"><Lock size={16} /> 3. Cambiar contraseña</div>
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
