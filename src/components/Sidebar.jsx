import { 
  Home, 
  Users, 
  Car, 
  Landmark, 
  History, 
  Settings, 
  LogOut,
  BarChart2,
  TrendingUp,
  Calculator
} from 'lucide-react';
import './Sidebar.css';

export default function Sidebar({ onLogout, currentView, setCurrentView }) {
  const menuItems = [
    { id: 'inicio', icon: <Home size={20} />, label: 'Inicio' },
    { id: 'simulador', icon: <Calculator size={20} />, label: 'Simulador' },
    { id: 'clientes', icon: <Users size={20} />, label: 'Clientes' },
    { id: 'vehiculos', icon: <Car size={20} />, label: 'Vehículos' },
    { id: 'entidades', icon: <Landmark size={20} />, label: 'Entidades Financieras' },
    { id: 'historial', icon: <History size={20} />, label: 'Historial' },
    { id: 'configuracion', icon: <Settings size={20} />, label: 'Configuración' },
  ];

  return (
    <aside className="sidebar">
      <div className="sidebar-header">
        <div className="sidebar-brand">
          <div className="sidebar-logo">
            <BarChart2 size={28} style={{position: 'absolute'}} />
            <TrendingUp size={28} style={{position: 'absolute', top: '2px', right: '2px'}} />
          </div>
          <h2>FinanSystem</h2>
        </div>
        <p className="sidebar-tagline">Simulador de Créditos<br/>Vehiculares</p>
      </div>

      <div className="sidebar-content">
        <ul className="nav-list">
          {menuItems.map((item, index) => (
            <li key={index}>
              <button 
                className={`nav-item ${currentView === item.id ? 'active' : ''}`}
                onClick={() => setCurrentView(item.id)}
              >
                {item.icon}
                <span>{item.label}</span>
              </button>
            </li>
          ))}
        </ul>
      </div>

      <div className="sidebar-footer">
        <button className="logout-btn nav-item" onClick={onLogout} style={{width: '100%'}}>
          <LogOut size={20} />
          <span>Cerrar sesión</span>
        </button>
      </div>
    </aside>
  );
}
