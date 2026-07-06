import { useState, useEffect, useRef } from 'react';
import { Bell, ChevronDown, User, LogOut, Settings } from 'lucide-react';
import { supabase } from '../lib/supabase';
import './Navbar.css';

export default function Navbar({ notifications, onClearNotification, onLogout, setCurrentView }) {
  const [userDisplayName, setUserDisplayName] = useState('Usuario');
  const [userInitials, setUserInitials] = useState('U');
  const [showNotif, setShowNotif] = useState(false);
  const [showProfile, setShowProfile] = useState(false);

  const notifRef = useRef(null);
  const profileRef = useRef(null);

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (user) {
        const name = user.user_metadata?.full_name || user.email || 'Usuario';
        setUserDisplayName(name);
        const parts = name.split(' ');
        const initials = parts.length >= 2
          ? (parts[0][0] + parts[1][0]).toUpperCase()
          : name.slice(0, 2).toUpperCase();
        setUserInitials(initials);
      }
    });
  }, []);

  // Close dropdowns when clicking outside
  useEffect(() => {
    function handleClickOutside(e) {
      if (notifRef.current && !notifRef.current.contains(e.target)) setShowNotif(false);
      if (profileRef.current && !profileRef.current.contains(e.target)) setShowProfile(false);
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const unreadCount = notifications ? notifications.length : 0;

  return (
    <header className="navbar">
      <div className="navbar-left" />

      <div className="navbar-right">
        {/* Notifications Bell */}
        <div className="nav-dropdown" ref={notifRef}>
          <button
            className="icon-btn notification-btn"
            onClick={() => { setShowNotif(v => !v); setShowProfile(false); }}
          >
            <Bell size={20} />
            {unreadCount > 0 && (
              <span className="badge">{unreadCount > 9 ? '9+' : unreadCount}</span>
            )}
          </button>

          {showNotif && (
            <div className="dropdown-panel notif-panel">
              <div className="dropdown-header">
                <span>Notificaciones</span>
                {unreadCount > 0 && (
                  <button className="clear-all" onClick={() => onClearNotification && onClearNotification('all')}>
                    Marcar como leídas
                  </button>
                )}
              </div>
              <div className="notif-list">
                {unreadCount === 0 ? (
                  <div className="notif-empty">No hay notificaciones nuevas</div>
                ) : (
                  notifications.map((n, i) => (
                    <div key={i} className="notif-item">
                      <div className="notif-icon">✅</div>
                      <div className="notif-body">
                        <p className="notif-title">{n.title}</p>
                        <p className="notif-desc">{n.description}</p>
                        <span className="notif-time">{n.time}</span>
                      </div>
                      <button className="notif-close" onClick={() => onClearNotification && onClearNotification(i)}>×</button>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}
        </div>

        {/* Profile Dropdown */}
        <div className="nav-dropdown" ref={profileRef}>
          <button
            className="profile-btn"
            onClick={() => { setShowProfile(v => !v); setShowNotif(false); }}
          >
            <div className="avatar-sm">{userInitials}</div>
            <span className="user-name">{userDisplayName.split(' ')[0]}</span>
            <ChevronDown size={14} className={`chevron ${showProfile ? 'open' : ''}`} />
          </button>

          {showProfile && (
            <div className="dropdown-panel profile-panel">
              <div className="profile-info">
                <div className="avatar-sm lg">{userInitials}</div>
                <div>
                  <p className="profile-name">{userDisplayName}</p>
                </div>
              </div>
              <div className="dropdown-divider" />
              <button className="dropdown-item" onClick={() => { setCurrentView('perfil'); setShowProfile(false); }}>
                <User size={16} /> Mi Perfil
              </button>
              <button className="dropdown-item" onClick={() => { setCurrentView('configuracion'); setShowProfile(false); }}>
                <Settings size={16} /> Configuración
              </button>
              <div className="dropdown-divider" />
              <button className="dropdown-item danger" onClick={onLogout}>
                <LogOut size={16} /> Cerrar sesión
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
