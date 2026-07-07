import { useState } from 'react';
import { 
  BarChart2, 
  Mail, 
  Lock, 
  Eye, 
  EyeOff, 
  User, 
  TrendingUp 
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import './Login.css';

const GoogleIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M22.56 12.25C22.56 11.47 22.49 10.72 22.37 10H12V14.26H17.92C17.66 15.63 16.88 16.78 15.69 17.57V20.34H19.26C21.35 18.42 22.56 15.6 22.56 12.25Z" fill="#4285F4"/>
    <path d="M12 23C14.97 23 17.46 22.02 19.26 20.34L15.69 17.57C14.71 18.23 13.47 18.63 12 18.63C9.15 18.63 6.74 16.71 5.88 14.12H2.19V16.98C4.01 20.6 7.72 23 12 23Z" fill="#34A853"/>
    <path d="M5.88 14.12C5.66 13.47 5.53 12.75 5.53 12C5.53 11.25 5.66 10.53 5.88 9.88V7.02H2.19C1.43 8.53 1 10.21 1 12C1 13.79 1.43 15.47 2.19 16.98L5.88 14.12Z" fill="#FBBC05"/>
    <path d="M12 5.38C13.62 5.38 15.06 5.94 16.2 7.02L19.34 3.88C17.45 2.13 14.97 1 12 1C7.72 1 4.01 3.4 2.19 7.02L5.88 9.88C6.74 7.29 9.15 5.38 12 5.38Z" fill="#EA4335"/>
  </svg>
);

export default function Login({ onLogin }) {
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [mode, setMode] = useState('login'); // 'login' or 'register'
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  // Form states
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMsg('');
    setLoading(true);
    
    try {
      if (mode === 'register') {
        if (password !== confirmPassword) {
          setErrorMsg("Las contraseñas no coinciden");
          setLoading(false);
          return;
        }
        // Strong password validation
        if (password.length < 12) {
          setErrorMsg("La contraseña debe tener al menos 12 caracteres");
          setLoading(false);
          return;
        }
        if (!/[A-Z]/.test(password) || !/[a-z]/.test(password)) {
          setErrorMsg("La contraseña debe incluir mayúsculas y minúsculas");
          setLoading(false);
          return;
        }
        if (!/[0-9]/.test(password)) {
          setErrorMsg("La contraseña debe incluir al menos un número");
          setLoading(false);
          return;
        }
        if (!/[^A-Za-z0-9]/.test(password)) {
          setErrorMsg("La contraseña debe incluir al menos un carácter especial (%, _, @, #...)");
          setLoading(false);
          return;
        }
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: { full_name: name }
          }
        });
        if (error) throw error;
        alert("Registro exitoso. Revisa tu correo para confirmar (si está configurado) o inicia sesión.");
        setMode('login');
      } else {
        const { error } = await supabase.auth.signInWithPassword({
          email,
          password
        });
        if (error) throw error;
        onLogin();
      }
    } catch (error) {
      setErrorMsg(error.message || "Ocurrió un error");
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    setLoading(true);
    setErrorMsg('');
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
      });
      if (error) throw error;
    } catch (error) {
      setErrorMsg(error.message || "Error con Google Login");
      setLoading(false);
    }
  };

  return (
    <div className="auth-wrapper">
      {/* Background Shapes */}
      <div className="bg-shape bg-shape-top-right"></div>
      <div className="bg-shape bg-shape-bottom-left"></div>

      <div className="auth-content">
        
        {/* Header / Logo */}
        <div className="auth-header">
          <div className="auth-logo-group">
            <div className="logo-icon-container">
              <BarChart2 size={36} className="logo-icon-bars" />
              <TrendingUp size={36} className="logo-icon-arrow" />
            </div>
            <h1>FinanSystem</h1>
          </div>
          <p className="auth-subtitle">Tu gestión financiera, simple y segura</p>
        </div>

        {/* Card */}
        <div className="auth-card">
          <div className="card-header">
            <h2>{mode === 'login' ? 'Iniciar sesión' : 'Crear cuenta'}</h2>
            <p>{mode === 'login' ? 'Accede a tu cuenta para continuar' : 'Completa tus datos para comenzar'}</p>
          </div>

          <form onSubmit={handleSubmit} className="auth-form">
            
            {errorMsg && <div className="auth-error">{errorMsg}</div>}
            
            {mode === 'register' && (
              <div className="form-group">
                <label>Nombre completo</label>
                <div className="input-container">
                  <User size={18} className="input-icon" />
                  <input 
                    type="text"
                    autoComplete="name"
                    placeholder="Ingresa tu nombre completo" 
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    required
                  />
                </div>
              </div>
            )}

            <div className="form-group">
              <label>Correo electrónico</label>
              <div className="input-container">
                <Mail size={18} className="input-icon" />
                <input 
                  type="email"
                  autoComplete="email"
                  placeholder="ejemplo@correo.com" 
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </div>
            </div>

            <div className="form-group">
              <div className="label-row">
                <label>Contraseña</label>
                {mode === 'login' && (
                  <a href="#" className="forgot-link">¿Olvidaste tu contraseña?</a>
                )}
              </div>
              <div className="input-container">
                <Lock size={18} className="input-icon" />
                <input 
                  type={showPassword ? "text" : "password"}
                  autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
                  placeholder={mode === 'login' ? 'Ingresa tu contraseña' : 'Mín. 12 car., mayús., núm. y símbolo'} 
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
                {mode === 'register' && (
                  <button 
                    type="button" 
                    className="toggle-password" 
                    onClick={() => setShowPassword(!showPassword)}
                  >
                    {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                )}
              </div>
              {mode === 'register' && (
                <p className="helper-text">Mín. 12 caracteres, mayúsc. y minúsc., número y carácter especial</p>
              )}
            </div>

            {mode === 'register' && (
              <div className="form-group">
                <label>Confirmar contraseña</label>
                <div className="input-container">
                  <Lock size={18} className="input-icon" />
                  <input 
                    type={showConfirmPassword ? "text" : "password"}
                    autoComplete="new-password"
                    placeholder="Confirma tu contraseña" 
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    required
                  />
                  <button 
                    type="button" 
                    className="toggle-password" 
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  >
                    {showConfirmPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
              </div>
            )}

            {mode === 'login' ? (
              <div className="checkbox-group">
                <input type="checkbox" id="remember" />
                <label htmlFor="remember">Recordarme</label>
              </div>
            ) : (
              <div className="checkbox-group terms">
                <input type="checkbox" id="terms" required />
                <label htmlFor="terms">
                  Acepto los <a href="#">Términos y Condiciones</a> y la <a href="#">Política de Privacidad</a>
                </label>
              </div>
            )}

            <button type="submit" className="submit-btn" disabled={loading}>
              {loading && <span className="fs-spinner" aria-hidden="true"></span>}
              {loading ? 'Cargando...' : (mode === 'login' ? 'Iniciar sesión' : 'Crear cuenta')}
            </button>

            {mode === 'login' && (
              <>
                <div className="divider">
                  <span>o continúa con</span>
                </div>
                <button type="button" className="google-btn" onClick={handleGoogleLogin} disabled={loading}>
                  <GoogleIcon />
                  Continuar con Google
                </button>
              </>
            )}

          </form>

          <div className="card-footer">
            {mode === 'login' ? (
              <p>¿No tienes una cuenta? <span className="switch-link" onClick={() => setMode('register')}>Regístrate</span></p>
            ) : (
              <p>¿Ya tienes una cuenta? <span className="switch-link" onClick={() => setMode('login')}>Inicia sesión</span></p>
            )}
          </div>
        </div>

        {/* Footer Text */}
        <div className="auth-footer">
          <p>© 2024 FinanSystem. Todos los derechos reservados.</p>
        </div>
      </div>
    </div>
  );
}
