import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { Search, Filter, Plus, Edit2, Trash2, ChevronLeft, ChevronRight, ChevronDown, RefreshCw } from 'lucide-react';
import './Vehiculos.css';

export default function Vehiculos() {
  const [vehiculos, setVehiculos] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // Filters
  const [searchTerm, setSearchTerm] = useState('');
  const [filterMarca, setFilterMarca] = useState('Todas las marcas');
  const [filterTipo, setFilterTipo] = useState('Todos');
  const [filterEstado, setFilterEstado] = useState('Todos');
  
  // Modal states
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [formData, setFormData] = useState({
    marca: '',
    modelo: '',
    anio: new Date().getFullYear().toString(),
    tipo_vehiculo: '',
    precio: '',
    estado: 'Activo'
  });

  useEffect(() => {
    fetchVehiculos();
  }, []);

  const fetchVehiculos = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('vehiculos')
      .select('*')
      .order('id', { ascending: false });
      
    if (error) {
      console.error("Error fetching data: ", error);
    } else {
      setVehiculos(data || []);
    }
    setLoading(false);
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const openModal = (vehiculo = null) => {
    if (vehiculo) {
      setFormData(vehiculo);
      setEditingId(vehiculo.id);
    } else {
      setFormData({
        marca: '',
        modelo: '',
        anio: new Date().getFullYear().toString(),
        tipo_vehiculo: '',
        precio: '',
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
        marca: formData.marca,
        modelo: formData.modelo,
        anio: parseInt(formData.anio),
        tipo_vehiculo: formData.tipo_vehiculo,
        precio: parseFloat(formData.precio),
        estado: formData.estado
      };

      if (editingId) {
        const { error } = await supabase
          .from('vehiculos')
          .update(payload)
          .eq('id', editingId);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('vehiculos')
          .insert([payload]);
        if (error) throw error;
      }
      
      closeModal();
      fetchVehiculos();
    } catch (error) {
      alert("Error guardando datos: " + error.message);
    }
  };

  const handleDelete = async (id) => {
    if (window.confirm("¿Estás seguro de eliminar este vehículo?")) {
      const { error } = await supabase
        .from('vehiculos')
        .delete()
        .eq('id', id);
        
      if (error) {
        alert("Error al eliminar: " + error.message);
      } else {
        fetchVehiculos();
      }
    }
  };

  const resetFilters = () => {
    setSearchTerm('');
    setFilterMarca('Todas las marcas');
    setFilterTipo('Todos');
    setFilterEstado('Todos');
  };

  // Get unique options for dropdowns dynamically from the data
  const uniqueMarcas = ['Todas las marcas', ...new Set(vehiculos.map(v => v.marca))];
  const uniqueTipos = ['Todos', ...new Set(vehiculos.map(v => v.tipo_vehiculo))];

  // Apply filters
  const filteredVehiculos = vehiculos.filter(v => {
    const matchSearch = 
      v.marca.toLowerCase().includes(searchTerm.toLowerCase()) || 
      v.modelo.toLowerCase().includes(searchTerm.toLowerCase()) ||
      v.anio.toString().includes(searchTerm);
    
    const matchMarca = filterMarca === 'Todas las marcas' || v.marca === filterMarca;
    const matchTipo = filterTipo === 'Todos' || v.tipo_vehiculo === filterTipo;
    const matchEstado = filterEstado === 'Todos' || v.estado === filterEstado;

    return matchSearch && matchMarca && matchTipo && matchEstado;
  });

  return (
    <div className="vehiculos-container">
      <div className="vehiculos-header">
        <div className="header-titles">
          <h1>Vehículos</h1>
          <p>Gestiona el catálogo de vehículos disponibles para simulación de créditos.</p>
        </div>
        <button className="btn-primary" onClick={() => openModal()}>
          <Plus size={18} /> Registrar vehículo
        </button>
      </div>

      <div className="advanced-toolbar">
        <div className="search-box-container">
          <div className="search-box">
            <Search size={18} className="search-icon" />
            <input 
              type="text" 
              placeholder="Buscar por marca, modelo o año..." 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </div>

        <div className="filter-group">
          <label>Marca</label>
          <select value={filterMarca} onChange={(e) => setFilterMarca(e.target.value)}>
            {uniqueMarcas.map((marca, idx) => (
              <option key={idx} value={marca}>{marca}</option>
            ))}
          </select>
        </div>

        <div className="filter-group">
          <label>Tipo de vehículo</label>
          <select value={filterTipo} onChange={(e) => setFilterTipo(e.target.value)}>
            {uniqueTipos.map((tipo, idx) => (
              <option key={idx} value={tipo}>{tipo}</option>
            ))}
          </select>
        </div>

        <div className="filter-group">
          <label>Estado</label>
          <select value={filterEstado} onChange={(e) => setFilterEstado(e.target.value)}>
            <option value="Todos">Todos</option>
            <option value="Activo">Activo</option>
            <option value="Inactivo">Inactivo</option>
          </select>
        </div>

        <button className="btn-outline" onClick={resetFilters}>
          <RefreshCw size={16} /> Limpiar filtros
        </button>
      </div>

      <div className="table-container">
        <table className="vehiculos-table">
          <thead>
            <tr>
              <th>ID</th>
              <th>Marca</th>
              <th>Modelo</th>
              <th>Año</th>
              <th>Tipo de vehículo</th>
              <th>Precio (S/)</th>
              <th>Estado</th>
              <th>Acciones</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan="8" style={{textAlign: 'center', padding: '2rem'}}>Cargando...</td></tr>
            ) : filteredVehiculos.length === 0 ? (
              <tr><td colSpan="8" style={{textAlign: 'center', padding: '2rem'}}>No hay vehículos registrados que coincidan con los filtros.</td></tr>
            ) : (
              filteredVehiculos.map((vehiculo) => (
                <tr key={vehiculo.id}>
                  <td style={{color: '#64748b'}}>{String(vehiculo.id).padStart(5, '0')}</td>
                  <td className="font-medium">{vehiculo.marca}</td>
                  <td>{vehiculo.modelo}</td>
                  <td>{vehiculo.anio}</td>
                  <td>{vehiculo.tipo_vehiculo}</td>
                  <td>{parseFloat(vehiculo.precio).toLocaleString('es-PE', {minimumFractionDigits: 2, maximumFractionDigits: 2})}</td>
                  <td>
                    <span className={`status-badge ${vehiculo.estado === 'Activo' ? 'status-active' : 'status-inactive'}`}>
                      {vehiculo.estado}
                    </span>
                  </td>
                  <td>
                    <div className="action-buttons">
                      <button className="btn-icon text-primary" onClick={() => openModal(vehiculo)}>
                        <Edit2 size={16} />
                      </button>
                      <button className="btn-icon text-danger" onClick={() => handleDelete(vehiculo.id)}>
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
          Mostrando 1 a {filteredVehiculos.length} de {vehiculos.length} vehículos
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
              <h2>{editingId ? 'Editar Vehículo' : 'Registrar Vehículo'}</h2>
              <button className="close-btn" onClick={closeModal}>&times;</button>
            </div>
            <form onSubmit={handleSubmit} className="modal-body">
              <div className="form-row">
                <div className="form-group half-width">
                  <label>Marca*</label>
                  <input required type="text" name="marca" value={formData.marca} onChange={handleInputChange} placeholder="Ej. Toyota" />
                </div>
                <div className="form-group half-width">
                  <label>Modelo*</label>
                  <input required type="text" name="modelo" value={formData.modelo} onChange={handleInputChange} placeholder="Ej. Corolla" />
                </div>
              </div>

              <div className="form-row">
                <div className="form-group half-width">
                  <label>Año*</label>
                  <input required type="number" min="1900" max={new Date().getFullYear() + 1} name="anio" value={formData.anio} onChange={handleInputChange} />
                </div>
                <div className="form-group half-width">
                  <label>Tipo de Vehículo*</label>
                  <input required type="text" name="tipo_vehiculo" value={formData.tipo_vehiculo} onChange={handleInputChange} placeholder="Ej. Sedán, SUV" />
                </div>
              </div>

              <div className="form-row">
                <div className="form-group half-width">
                  <label>Precio (S/)*</label>
                  <input required type="number" step="0.01" name="precio" value={formData.precio} onChange={handleInputChange} placeholder="Ej. 89900.00" />
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
