import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { Search, Filter, Plus, Edit2, Trash2, ChevronLeft, ChevronRight, ChevronDown } from 'lucide-react';
import FieldTip from './FieldTip';
import './Clientes.css';

export default function Clientes() {
  const [clientes, setClientes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  
  // Modal states
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [formData, setFormData] = useState({
    nombre_completo: '',
    dni: '',
    edad: '',
    ocupacion: '',
    ingreso_mensual: '',
    dependencias: '',
    estado: 'Activo'
  });

  const fetchClientes = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('clientes')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      console.error("Error fetching data: ", error);
    } else {
      setClientes(data || []);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchClientes();
  }, []);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const openModal = (cliente = null) => {
    if (cliente) {
      setFormData(cliente);
      setEditingId(cliente.id);
    } else {
      setFormData({
        nombre_completo: '',
        dni: '',
        edad: '',
        ocupacion: '',
        ingreso_mensual: '',
        dependencias: '',
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
        nombre_completo: formData.nombre_completo,
        dni: formData.dni,
        edad: parseInt(formData.edad),
        ocupacion: formData.ocupacion,
        ingreso_mensual: parseFloat(formData.ingreso_mensual),
        dependencias: parseInt(formData.dependencias),
        estado: formData.estado
      };

      if (editingId) {
        const { error } = await supabase
          .from('clientes')
          .update(payload)
          .eq('id', editingId);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('clientes')
          .insert([payload]);
        if (error) throw error;
      }
      
      closeModal();
      fetchClientes();
    } catch (error) {
      alert("Error guardando datos: " + error.message);
    }
  };

  const handleDelete = async (id) => {
    if (window.confirm("¿Estás seguro de eliminar este cliente?")) {
      const { error } = await supabase
        .from('clientes')
        .delete()
        .eq('id', id);
        
      if (error) {
        alert("Error al eliminar: " + error.message);
      } else {
        fetchClientes();
      }
    }
  };

  const filteredClientes = clientes.filter(c => 
    c.nombre_completo.toLowerCase().includes(searchTerm.toLowerCase()) || 
    c.dni.includes(searchTerm)
  );

  return (
    <div className="entidades-container">
      <div className="entidades-header">
        <div className="header-titles">
          <h1>Clientes</h1>
          <p>Gestiona la información de tus clientes y prospectos para la simulación.</p>
        </div>
        <button className="btn-primary" onClick={() => openModal()}>
          <Plus size={18} /> Registrar Cliente
        </button>
      </div>

      <div className="toolbar">
        <div className="search-box">
          <Search size={18} className="search-icon" />
          <input 
            type="text" 
            placeholder="Buscar por nombre o DNI..." 
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
              <th>Nombre Completo</th>
              <th>DNI</th>
              <th>Edad</th>
              <th>Ocupación</th>
              <th>Ingreso Familiar (S/)</th>
              <th>Dependencias</th>
              <th>Estado</th>
              <th>Acciones</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan="8" style={{textAlign: 'center', padding: '2rem'}}>Cargando...</td></tr>
            ) : filteredClientes.length === 0 ? (
              <tr><td colSpan="8" style={{textAlign: 'center', padding: '2rem'}}>No hay clientes registrados.</td></tr>
            ) : (
              filteredClientes.map((cliente) => (
                <tr key={cliente.id}>
                  <td className="font-medium">{cliente.nombre_completo}</td>
                  <td>{cliente.dni}</td>
                  <td>{cliente.edad}</td>
                  <td>{cliente.ocupacion}</td>
                  <td>{parseFloat(cliente.ingreso_mensual).toLocaleString('es-PE', {style: 'currency', currency: 'PEN'})}</td>
                  <td>{cliente.dependencias}</td>
                  <td>
                    <span className={`status-badge ${cliente.estado === 'Activo' ? 'status-active' : 'status-inactive'}`}>
                      {cliente.estado}
                    </span>
                  </td>
                  <td>
                    <div className="action-buttons">
                      <button className="btn-icon text-primary" onClick={() => openModal(cliente)}>
                        <Edit2 size={16} />
                      </button>
                      <button className="btn-icon text-danger" onClick={() => handleDelete(cliente.id)}>
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
          Mostrando 1 a {filteredClientes.length} de {filteredClientes.length} clientes
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
              <h2>{editingId ? 'Editar Cliente' : 'Registrar Cliente'}</h2>
              <button className="close-btn" onClick={closeModal}>&times;</button>
            </div>
            <form onSubmit={handleSubmit} className="modal-body">
              <div className="form-group full-width">
                <label>Nombre Completo*</label>
                <input required type="text" name="nombre_completo" value={formData.nombre_completo} onChange={handleInputChange} />
              </div>
              
              <div className="form-row">
                <div className="form-group half-width">
                  <label>DNI* <FieldTip tip="Documento de identidad (8 dígitos). Identifica al cliente en el Simulador y en el Historial." /></label>
                  <input required type="text" maxLength="8" name="dni" value={formData.dni} onChange={handleInputChange} />
                </div>
                <div className="form-group half-width">
                  <label>Edad*</label>
                  <input required type="number" min="18" name="edad" value={formData.edad} onChange={handleInputChange} />
                </div>
              </div>

              <div className="form-row">
                <div className="form-group full-width">
                  <label>Ocupación*</label>
                  <input required type="text" name="ocupacion" value={formData.ocupacion} onChange={handleInputChange} />
                </div>
              </div>

              <div className="form-row">
                <div className="form-group half-width">
                  <label>Ingreso Familiar mensual (S/)* <FieldTip tip="Ingreso del hogar. Sirve de referencia para evaluar si la cuota mensual es pagable." /></label>
                  <input required type="number" step="0.01" name="ingreso_mensual" value={formData.ingreso_mensual} onChange={handleInputChange} />
                </div>
                <div className="form-group half-width">
                  <label>Número de dependencias* <FieldTip tip="Personas que dependen económicamente del cliente (hijos, padres a cargo, etc.)." /></label>
                  <input required type="number" min="0" name="dependencias" value={formData.dependencias} onChange={handleInputChange} />
                </div>
              </div>

              <div className="form-group full-width">
                <label>Estado <FieldTip tip="Indica si el cliente está vigente en el sistema." /></label>
                <select name="estado" value={formData.estado} onChange={handleInputChange}>
                  <option value="Activo">Activo</option>
                  <option value="Inactivo">Inactivo</option>
                </select>
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
