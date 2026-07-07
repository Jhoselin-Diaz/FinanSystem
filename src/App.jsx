import { useState, useEffect } from 'react';
import { supabase } from './lib/supabase';
import Login from './components/Login';
import Sidebar from './components/Sidebar';
import Navbar from './components/Navbar';
import EntidadesFinancieras from './components/EntidadesFinancieras';
import Clientes from './components/Clientes';
import Vehiculos from './components/Vehiculos';
import Simulador from './components/Simulador';
import Historial from './components/Historial';
import Perfil from './components/Perfil';
import Configuracion from './components/Configuracion';
import Inicio from './components/Inicio';

function App() {
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(true);
  const [currentView, setCurrentView] = useState('simulador');

  // Global notification state
  const [notifications, setNotifications] = useState([]);

  const addNotification = (notif) => {
    const time = new Date().toLocaleTimeString('es-PE', { hour: '2-digit', minute: '2-digit' });
    setNotifications(prev => [{ ...notif, time }, ...prev]);
  };

  const clearNotification = (indexOrAll) => {
    if (indexOrAll === 'all') {
      setNotifications([]);
    } else {
      setNotifications(prev => prev.filter((_, i) => i !== indexOrAll));
    }
  };

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setLoading(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
    });

    return () => subscription.unsubscribe();
  }, []);

  const handleLogin = () => {};

  const handleLogout = async () => {
    await supabase.auth.signOut();
  };

  if (loading) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', justifyContent: 'center', alignItems: 'center', height: '100vh', backgroundColor: 'var(--app-bg)', color: 'var(--ink-500)' }}>
        <span className="fs-spinner" style={{ width: 28, height: 28, borderColor: 'var(--brand-100)', borderTopColor: 'var(--brand-600)' }} aria-hidden="true"></span>
        Cargando...
      </div>
    );
  }

  if (!session) {
    return <Login onLogin={handleLogin} />;
  }

  return (
    <div style={{ display: 'flex', minHeight: '100vh', backgroundColor: 'var(--app-bg)' }}>
      <Sidebar onLogout={handleLogout} currentView={currentView} setCurrentView={setCurrentView} />

      <main style={{
        flex: 1,
        marginLeft: 'var(--sidebar-width)',
        display: 'flex',
        flexDirection: 'column'
      }}>
        <Navbar
          notifications={notifications}
          onClearNotification={clearNotification}
          onLogout={handleLogout}
          setCurrentView={setCurrentView}
        />
        <div style={{ flex: 1, overflowY: 'auto' }}>
          {currentView === 'inicio' && <Inicio setCurrentView={setCurrentView} />}
          {currentView === 'simulador' && <Simulador addNotification={addNotification} />}
          {currentView === 'entidades' && <EntidadesFinancieras />}
          {currentView === 'clientes' && <Clientes />}
          {currentView === 'vehiculos' && <Vehiculos />}
          {currentView === 'historial' && <Historial />}
          {currentView === 'perfil' && <Perfil />}
          {currentView === 'configuracion' && <Configuracion />}
          
          {!['inicio', 'simulador', 'entidades', 'clientes', 'vehiculos', 'historial', 'perfil', 'configuracion'].includes(currentView) && (
            <div style={{ padding: '4rem 2rem', textAlign: 'center', color: '#64748b' }}>
              <h2 style={{ color: '#ef4444' }}>Vista en construcción...</h2>
              <p>La vista "{currentView}" aún no ha sido implementada.</p>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}

export default App;
