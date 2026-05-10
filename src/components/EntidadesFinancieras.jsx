import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { Search, Filter, Plus, Edit2, Trash2, ChevronLeft, ChevronRight, ChevronDown } from 'lucide-react';
import './EntidadesFinancieras.css';

export default function EntidadesFinancieras() {
  const [entidades, setEntidades] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  
  // Modal states
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [formData, setFormData] = useState({
    nombre: '',
    tea_soles_min: '',
    tea_soles_max: '',
    tea_dolares_min: '',
    tea_dolares_max: '',
    periodo_gracia_min: '',
    periodo_gracia_max: '',
    plazo_maximo: '',
    estado: 'Activo'
  });

  useEffect(() => {
    fetchEntidades();
  }, []);

  const fetchEntidades = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('entidades_financieras')
      .select('*')
      .order('created_at', { ascending: false });
      
    if (error) {
      console.error("Error fetching data: ", error);
    } else {
      setEntidades(data || []);
    }
    setLoading(false);
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const openModal = (entidad = null) => {
    if (entidad) {
      setFormData(entidad);
      setEditingId(entidad.id);
    } else {
      setFormData({
        nombre: '',
        tea_soles_min: '',
        tea_soles_max: '',
        tea_dolares_min: '',
        tea_dolares_max: '',
        periodo_gracia_min: '',
        periodo_gracia_max: '',
        plazo_maximo: '',
        estado: 'Activo'
      });
      setEditingId(null);
    }
    setShowModal(true);
  };

  const closeModal = () => {
    setShowModal(false);
    setEditingId(null);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const payload = {
        nombre: formData.nombre,
        tea_soles_min: parseFloat(formData.tea_soles_min),
        tea_soles_max: parseFloat(formData.tea_soles_max),
        tea_dolares_min: parseFloat(formData.tea_dolares_min),
        tea_dolares_max: parseFloat(formData.tea_dolares_max),
        periodo_gracia_min: parseInt(formData.periodo_gracia_min),
        periodo_gracia_max: parseInt(formData.periodo_gracia_max),
        plazo_maximo: parseInt(formData.plazo_maximo),
        estado: formData.estado
      };

      if (editingId) {
        const { error } = await supabase
          .from('entidades_financieras')
          .update(payload)
          .eq('id', editingId);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('entidades_financieras')
          .insert([payload]);
        if (error) throw error;
      }
      
      closeModal();
      fetchEntidades();
    } catch (error) {
      alert("Error guardando datos: " + error.message);
    }
  };

  const handleDelete = async (id) => {
    if (window.confirm("¿Estás seguro de eliminar esta entidad?")) {
      const { error } = await supabase
        .from('entidades_financieras')
        .delete()
        .eq('id', id);
        
      if (error) {
        alert("Error al eliminar: " + error.message);
      } else {
        fetchEntidades();
      }
    }
  };

  const filteredEntidades = entidades.filter(e => 
    e.nombre.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="entidades-container">
      <div className="entidades-header">
        <div className="header-titles">
          <h1>Entidades Financieras</h1>
          <p>Gestiona la información de bancos y entidades financieras disponibles para simulación.</p>
        </div>
        <button className="btn-primary" onClick={() => openModal()}>
          <Plus size={18} /> Registrar entidad
        </button>
      </div>

      <div className="toolbar">
        <div className="search-box">
          <Search size={18} className="search-icon" />
          <input 
            type="text" 
            placeholder="Buscar por banco o entidad..." 
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <button className="btn-outline">
          <Filter size={18} /> Limpiar filtros
        </button>
      </div>

      <div className="table-container">
        <table className="entidades-table">
          <thead>
            <tr>
              <th>Banco / Entidad</th>
              <th>TEA Soles (%)</th>
              <th>TEA Dólares (%)</th>
              <th>Plazo máximo (meses)</th>
              <th>Periodo de gracia (meses)</th>
              <th>Estado</th>
              <th>Acciones</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan="7" style={{textAlign: 'center', padding: '2rem'}}>Cargando...</td></tr>
            ) : filteredEntidades.length === 0 ? (
              <tr><td colSpan="7" style={{textAlign: 'center', padding: '2rem'}}>No hay entidades registradas.</td></tr>
            ) : (
              filteredEntidades.map((entidad) => (
                <tr key={entidad.id}>
                  <td className="font-medium">{entidad.nombre}</td>
                  <td>{entidad.tea_soles_min} - {entidad.tea_soles_max}</td>
                  <td>{entidad.tea_dolares_min} - {entidad.tea_dolares_max}</td>
                  <td>{entidad.plazo_maximo}</td>
                  <td>{entidad.periodo_gracia_min} - {entidad.periodo_gracia_max}</td>
                  <td>
                    <span className={`status-badge ${entidad.estado === 'Activo' ? 'status-active' : 'status-inactive'}`}>
                      {entidad.estado}
                    </span>
                  </td>
                  <td>
                    <div className="action-buttons">
                      <button className="btn-icon text-primary" onClick={() => openModal(entidad)}>
                        <Edit2 size={16} />
                      </button>
                      <button className="btn-icon text-danger" onClick={() => handleDelete(entidad.id)}>
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
          Mostrando 1 a {filteredEntidades.length} de {filteredEntidades.length} entidades
        </span>
        <div className="pagination-controls">
          <button className="page-btn"><ChevronLeft size={16} /></button>
          <button className="page-btn active">1</button>
          <button className="page-btn"><ChevronRight size={16} /></button>
          <button className="page-select">10 por página <ChevronDown size={14} /></button>
        </div>
      </div>

      {showModal && (
        <div className="modal-overlay">
          <div className="modal-content">
            <div className="modal-header">
              <h2>{editingId ? 'Editar Entidad' : 'Registrar Entidad'}</h2>
              <button className="close-btn" onClick={closeModal}>&times;</button>
            </div>
            <form onSubmit={handleSubmit} className="modal-body">
              <div className="form-group full-width">
                <label>Nombre de la entidad*</label>
                <input required type="text" name="nombre" value={formData.nombre} onChange={handleInputChange} />
              </div>
              
              <div className="form-row">
                <div className="form-group half-width">
                  <label>TEA Soles mínima (%)*</label>
                  <input required type="number" step="0.01" name="tea_soles_min" value={formData.tea_soles_min} onChange={handleInputChange} />
                </div>
                <div className="form-group half-width">
                  <label>TEA Soles máxima (%)*</label>
                  <input required type="number" step="0.01" name="tea_soles_max" value={formData.tea_soles_max} onChange={handleInputChange} />
                </div>
              </div>

              <div className="form-row">
                <div className="form-group half-width">
                  <label>TEA Dólares mínima (%)*</label>
                  <input required type="number" step="0.01" name="tea_dolares_min" value={formData.tea_dolares_min} onChange={handleInputChange} />
                </div>
                <div className="form-group half-width">
                  <label>TEA Dólares máxima (%)*</label>
                  <input required type="number" step="0.01" name="tea_dolares_max" value={formData.tea_dolares_max} onChange={handleInputChange} />
                </div>
              </div>

              <div className="form-row">
                <div className="form-group half-width">
                  <label>Periodo de Gracia mínima (meses)*</label>
                  <input required type="number" name="periodo_gracia_min" value={formData.periodo_gracia_min} onChange={handleInputChange} />
                </div>
                <div className="form-group half-width">
                  <label>Periodo de Gracia máxima (meses)*</label>
                  <input required type="number" name="periodo_gracia_max" value={formData.periodo_gracia_max} onChange={handleInputChange} />
                </div>
              </div>

              <div className="form-row">
                <div className="form-group half-width">
                  <label>Plazo máximo (meses)*</label>
                  <input required type="number" name="plazo_maximo" value={formData.plazo_maximo} onChange={handleInputChange} />
                </div>
                <div className="form-group half-width">
                  <label>Estado</label>
                  <select name="estado" value={formData.estado} onChange={handleInputChange}>
                    <option value="Activo">Activo</option>
                    <option value="Inactivo">Inactivo</option>
                  </select>
                </div>
              </div>

              <div className="modal-footer">
                <button type="button" className="btn-secondary" onClick={closeModal}>Cancelar</button>
                <button type="submit" className="btn-primary">Guardar</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
