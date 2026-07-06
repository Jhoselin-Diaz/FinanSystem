import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { User, Mail, Lock, Eye, EyeOff, Save, CheckCircle, AlertCircle } from 'lucide-react';
import './Perfil.css';

function PasswordStrength({ password }) {
  const checks = [
    { label: 'Mínimo 12 caracteres', ok: password.length >= 12 },
    { label: 'Letras mayúsculas y minúsculas', ok: /[A-Z]/.test(password) && /[a-z]/.test(password) },
    { label: 'Al menos un número', ok: /[0-9]/.test(password) },
    { label: 'Carácter especial (%, _, @, #…)', ok: /[^A-Za-z0-9]/.test(password) },
  ];
  const score = checks.filter(c => c.ok).length;
  const colors = ['#ef4444', '#f97316', '#eab308', '#22c55e'];
  const labels = ['Muy débil', 'Débil', 'Regular', 'Fuerte'];

  return (
    <div style={{ marginTop: '0.5rem' }}>
      <div style={{ display: 'flex', gap: '4px', marginBottom: '0.4rem' }}>
        {[0,1,2,3].map(i => (
          <div key={i} style={{
            flex: 1, height: '4px', borderRadius: '2px',
            backgroundColor: i < score ? colors[score - 1] : '#e2e8f0',
            transition: 'background-color 0.3s'
          }} />
        ))}
      </div>
      {password && (
        <p style={{ fontSize: '0.75rem', color: colors[score - 1] || '#94a3b8', fontWeight: '600', margin: '0 0 0.5rem' }}>
          {labels[score - 1] || 'Sin contraseña'}
        </p>
      )}
      <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: '3px' }}>
        {checks.map((c, i) => (
          <li key={i} style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.75rem', color: c.ok ? '#22c55e' : '#94a3b8' }}>
            {c.ok ? <CheckCircle size={12} /> : <AlertCircle size={12} />} {c.label}
          </li>
        ))}
      </ul>
    </div>
  );
}

export default function Perfil() {
  const [user, setUser] = useState(null);
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showNewPass, setShowNewPass] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (user) {
        setUser(user);
        setEmail(user.email || '');
        setFullName(user.user_metadata?.full_name || '');
      }
    });
  }, []);

  const validatePassword = (p) => {
    return p.length >= 12 &&
      /[A-Z]/.test(p) && /[a-z]/.test(p) &&
      /[0-9]/.test(p) && /[^A-Za-z0-9]/.test(p);
  };

  const handleSaveProfile = async (e) => {
    e.preventDefault();
    setSaving(true);
    setErrorMsg('');
    setSuccessMsg('');

    try {
      const updates = { data: { full_name: fullName } };
      if (email !== user.email) {
        updates.email = email;
      }
      const { error } = await supabase.auth.updateUser(updates);
      if (error) throw error;
      setSuccessMsg('Perfil actualizado correctamente.');
    } catch (err) {
      setErrorMsg(err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleChangePassword = async (e) => {
    e.preventDefault();
    setErrorMsg('');
    setSuccessMsg('');

    if (newPassword !== confirmPassword) {
      setErrorMsg('Las contraseñas no coinciden.');
      return;
    }
    if (!validatePassword(newPassword)) {
      setErrorMsg('La contraseña no cumple los requisitos de seguridad.');
      return;
    }

    setSaving(true);
    try {
      const { error } = await supabase.auth.updateUser({ password: newPassword });
      if (error) throw error;
      setSuccessMsg('Contraseña actualizada correctamente.');
      setNewPassword('');
      setConfirmPassword('');
    } catch (err) {
      setErrorMsg(err.message);
    } finally {
      setSaving(false);
    }
  };

  const initials = fullName
    ? fullName.split(' ').map(w => w[0]).slice(0, 2).join('').toUpperCase()
    : email.slice(0, 2).toUpperCase();

  return (
    <div className="perfil-container">
      <div className="perfil-header">
        <h1>Mi Perfil</h1>
        <p>Actualiza tu información personal y configura tu seguridad.</p>
      </div>

      <div className="perfil-layout">
        {/* Avatar card */}
        <div className="perfil-avatar-card">
          <div className="avatar-circle">{initials}</div>
          <h3>{fullName || 'Sin nombre'}</h3>
          <p>{email}</p>
        </div>

        {/* Forms */}
        <div className="perfil-forms">
          {successMsg && (
            <div className="alert-success">
              <CheckCircle size={18} /> {successMsg}
            </div>
          )}
          {errorMsg && (
            <div className="alert-error">
              <AlertCircle size={18} /> {errorMsg}
            </div>
          )}

          {/* Profile info form */}
          <div className="perfil-card">
            <h3 className="card-title">Información Personal</h3>
            <form onSubmit={handleSaveProfile} className="perfil-form">
              <div className="perfil-form-group">
                <label><User size={14} /> Nombre completo</label>
                <input
                  type="text"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="Tu nombre completo"
                />
              </div>
              <div className="perfil-form-group">
                <label><Mail size={14} /> Correo electrónico</label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="correo@ejemplo.com"
                />
              </div>
              <div className="perfil-actions">
                <button type="submit" className="btn-save" disabled={saving}>
                  <Save size={16} /> {saving ? 'Guardando...' : 'Guardar cambios'}
                </button>
              </div>
            </form>
          </div>

          {/* Password form */}
          <div className="perfil-card">
            <h3 className="card-title">Cambiar Contraseña</h3>
            <form onSubmit={handleChangePassword} className="perfil-form">
              <div className="perfil-form-group">
                <label><Lock size={14} /> Nueva contraseña</label>
                <div className="input-pw">
                  <input
                    type={showNewPass ? 'text' : 'password'}
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="Mínimo 12 caracteres"
                  />
                  <button type="button" onClick={() => setShowNewPass(v => !v)}>
                    {showNewPass ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
                {newPassword && <PasswordStrength password={newPassword} />}
              </div>
              <div className="perfil-form-group">
                <label><Lock size={14} /> Confirmar contraseña</label>
                <div className="input-pw">
                  <input
                    type={showConfirm ? 'text' : 'password'}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Repite tu contraseña"
                  />
                  <button type="button" onClick={() => setShowConfirm(v => !v)}>
                    {showConfirm ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>
              <div className="perfil-actions">
                <button type="submit" className="btn-save" disabled={saving}>
                  <Save size={16} /> {saving ? 'Guardando...' : 'Actualizar contraseña'}
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}
