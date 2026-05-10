import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { Clock, Search, Eye, Trash2, ChevronLeft, ChevronRight, X, AlertTriangle } from 'lucide-react';
import './Historial.css';

export default function Historial() {
  const [simulaciones, setSimulaciones] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedSim, setSelectedSim] = useState(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState(null);
  const [deleteError, setDeleteError] = useState('');
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    fetchHistorial();
  }, []);

  const fetchHistorial = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('simulaciones')
      .select(`
        *,
        clientes ( nombre_completo, dni ),
        vehiculos ( marca, modelo ),
        entidades_financieras ( nombre )
      `)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching historial:', error);
    } else {
      setSimulaciones(data || []);
    }
    setLoading(false);
  };

  // Step 1: Show in-app confirm dialog
  const requestDelete = (id) => {
    setDeleteError('');
    setConfirmDeleteId(id);
  };

  // Step 2: Actually execute the delete
  const executeDelete = async () => {
    const id = confirmDeleteId;
    setConfirmDeleteId(null);
    setDeleting(true);
    setDeleteError('');

    try {
      const { error, status, statusText } = await supabase
        .from('simulaciones')
        .delete()
        .eq('id', id);

      if (error) {
        setDeleteError(`Error ${status} – ${error.message}`);
        console.error('Delete failed:', error);
      } else {
        // Success: remove from local state immediately
        setSimulaciones(prev => prev.filter(s => s.id !== id));
        if (selectedSim?.id === id) setSelectedSim(null);
      }
    } catch (err) {
      setDeleteError('Error inesperado: ' + err.message);
    } finally {
      setDeleting(false);
    }
  };

  const cancelDelete = () => {
    setConfirmDeleteId(null);
    setDeleteError('');
  };

  const filtered = simulaciones.filter(s => {
    const nombre = s.clientes?.nombre_completo?.toLowerCase() || '';
    const banco = s.entidades_financieras?.nombre?.toLowerCase() || '';
    const vehiculo = `${s.vehiculos?.marca || ''} ${s.vehiculos?.modelo || ''}`.toLowerCase();
    const term = searchTerm.toLowerCase();
    return nombre.includes(term) || banco.includes(term) || vehiculo.includes(term);
  });

  const fmt = (n, decimals = 2) =>
    parseFloat(n || 0).toLocaleString('es-PE', { minimumFractionDigits: decimals, maximumFractionDigits: decimals });

  const fmtDate = (d) =>
    new Date(d).toLocaleDateString('es-PE', { day: '2-digit', month: 'short', year: 'numeric' });

  const simToDelete = simulaciones.find(s => s.id === confirmDeleteId);

  return (
    <div className="historial-container">
      <div className="historial-header">
        <div className="header-titles">
          <h1>Historial de Simulaciones</h1>
          <p>Revisa y gestiona todas las simulaciones de crédito guardadas.</p>
        </div>
      </div>

      {/* Error banner */}
      {deleteError && (
        <div className="error-banner">
          <AlertTriangle size={16} /> {deleteError}
          <button onClick={() => setDeleteError('')} style={{ marginLeft: 'auto', background: 'none', border: 'none', cursor: 'pointer', color: '#991b1b' }}>×</button>
        </div>
      )}

      <div className="toolbar">
        <div className="search-box">
          <Search size={18} className="search-icon" />
          <input
            type="text"
            placeholder="Buscar por cliente, vehículo o banco..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      </div>

      <div className="table-container">
        <table className="historial-table">
          <thead>
            <tr>
              <th>Fecha</th>
              <th>Cliente</th>
              <th>Vehículo</th>
              <th>Banco</th>
              <th>Cuota Mensual</th>
              <th>TCEA</th>
              <th>Plazo</th>
              <th>Acciones</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan="8" style={{ textAlign: 'center', padding: '2rem' }}>Cargando...</td></tr>
            ) : filtered.length === 0 ? (
              <tr>
                <td colSpan="8" style={{ textAlign: 'center', padding: '3rem', color: '#94a3b8' }}>
                  <Clock size={36} style={{ display: 'block', margin: '0 auto 0.75rem' }} />
                  No hay simulaciones guardadas aún.
                </td>
              </tr>
            ) : (
              filtered.map((s) => (
                <tr key={s.id}>
                  <td style={{ color: '#64748b', fontSize: '0.82rem' }}>{fmtDate(s.created_at)}</td>
                  <td className="font-medium">{s.clientes?.nombre_completo || '—'}</td>
                  <td>{s.vehiculos ? `${s.vehiculos.marca} ${s.vehiculos.modelo}` : '—'}</td>
                  <td>{s.entidades_financieras?.nombre || '—'}</td>
                  <td><span className="cuota-badge">S/ {fmt(s.cuota_mensual)}</span></td>
                  <td>{fmt(s.tcea, 2)} %</td>
                  <td>{s.plazo} meses</td>
                  <td>
                    <div className="action-buttons">
                      <button
                        className="btn-icon text-primary"
                        title="Ver detalles"
                        onClick={() => setSelectedSim(s)}
                      >
                        <Eye size={16} />
                      </button>
                      <button
                        className="btn-icon text-danger"
                        title="Eliminar"
                        onClick={() => requestDelete(s.id)}
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <div className="pagination">
        <span className="pagination-info">
          Mostrando {filtered.length} de {simulaciones.length} simulaciones
        </span>
        <div className="pagination-controls">
          <button className="page-btn"><ChevronLeft size={16} /></button>
          <button className="page-btn active">1</button>
          <button className="page-btn"><ChevronRight size={16} /></button>
        </div>
      </div>

      {/* ===== IN-APP CONFIRM DELETE DIALOG ===== */}
      {confirmDeleteId && (
        <div className="modal-overlay" onClick={cancelDelete}>
          <div className="confirm-dialog" onClick={(e) => e.stopPropagation()}>
            <div className="confirm-icon"><Trash2 size={28} color="#ef4444" /></div>
            <h3>¿Eliminar simulación?</h3>
            <p>
              Esta acción eliminará permanentemente la simulación de
              <strong> {simToDelete?.clientes?.nombre_completo || 'este cliente'}</strong>.
              No se puede deshacer.
            </p>
            <div className="confirm-actions">
              <button className="btn-secondary" onClick={cancelDelete} disabled={deleting}>
                Cancelar
              </button>
              <button className="btn-danger" onClick={executeDelete} disabled={deleting}>
                {deleting ? 'Eliminando...' : 'Sí, eliminar'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ===== FLOATING DETAIL MODAL ===== */}
      {selectedSim && !confirmDeleteId && (
        <div className="modal-overlay" onClick={() => setSelectedSim(null)}>
          <div className="modal-detail" onClick={(e) => e.stopPropagation()}>
            <div className="modal-detail-header">
              <div>
                <h2>Detalle de Simulación</h2>
                <span className="detail-date">{fmtDate(selectedSim.created_at)}</span>
              </div>
              <button className="modal-close-btn" onClick={() => setSelectedSim(null)}>
                <X size={20} />
              </button>
            </div>

            <div className="modal-detail-body">
              <div className="detail-section">
                <h4>👤 Datos Principales</h4>
                <div className="detail-grid">
                  <div className="detail-item">
                    <span>Cliente</span>
                    <strong>{selectedSim.clientes?.nombre_completo || '—'}</strong>
                  </div>
                  <div className="detail-item">
                    <span>DNI</span>
                    <strong>{selectedSim.clientes?.dni || '—'}</strong>
                  </div>
                  <div className="detail-item">
                    <span>Vehículo</span>
                    <strong>{selectedSim.vehiculos ? `${selectedSim.vehiculos.marca} ${selectedSim.vehiculos.modelo}` : '—'}</strong>
                  </div>
                  <div className="detail-item">
                    <span>Entidad Financiera</span>
                    <strong>{selectedSim.entidades_financieras?.nombre || '—'}</strong>
                  </div>
                </div>
              </div>

              <div className="detail-section">
                <h4>⚙️ Configuración del Crédito</h4>
                <div className="detail-grid">
                  <div className="detail-item">
                    <span>Precio Vehículo</span>
                    <strong>S/ {fmt(selectedSim.precio_vehiculo)}</strong>
                  </div>
                  <div className="detail-item">
                    <span>Cuota Inicial</span>
                    <strong>S/ {fmt(selectedSim.cuota_inicial)}</strong>
                  </div>
                  <div className="detail-item">
                    <span>Tipo de Tasa</span>
                    <strong>{selectedSim.tipo_tasa}</strong>
                  </div>
                  <div className="detail-item">
                    <span>Tasa de Interés</span>
                    <strong>{selectedSim.tasa_interes} %</strong>
                  </div>
                  <div className="detail-item">
                    <span>Plazo</span>
                    <strong>{selectedSim.plazo} meses</strong>
                  </div>
                  <div className="detail-item">
                    <span>Periodo de Gracia</span>
                    <strong>{selectedSim.periodo_gracia} mes(es) — {selectedSim.tipo_gracia}</strong>
                  </div>
                  <div className="detail-item">
                    <span>Moneda</span>
                    <strong>{selectedSim.moneda}</strong>
                  </div>
                  <div className="detail-item">
                    <span>Gastos Iniciales</span>
                    <strong>S/ {fmt(selectedSim.gastos_iniciales)}</strong>
                  </div>
                </div>
              </div>

              <div className="detail-section">
                <h4>📊 Resultados</h4>
                <div className="results-highlight-grid">
                  <div className="results-highlight-box">
                    <span>Cuota Mensual</span>
                    <strong>S/ {fmt(selectedSim.cuota_mensual)}</strong>
                  </div>
                  <div className="results-highlight-box">
                    <span>TCEA</span>
                    <strong>{fmt(selectedSim.tcea, 2)} %</strong>
                  </div>
                  <div className="results-highlight-box">
                    <span>VAN</span>
                    <strong>S/ {fmt(selectedSim.van)}</strong>
                  </div>
                  <div className="results-highlight-box">
                    <span>TIR</span>
                    <strong>{fmt(selectedSim.tir, 2)} %</strong>
                  </div>
                </div>
              </div>
            </div>

            <div className="modal-detail-footer">
              <button className="btn-secondary" onClick={() => setSelectedSim(null)}>Cerrar</button>
              <button
                className="btn-danger-outline"
                onClick={() => {
                  setSelectedSim(null);
                  requestDelete(selectedSim.id);
                }}
              >
                <Trash2 size={15} /> Eliminar simulación
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
