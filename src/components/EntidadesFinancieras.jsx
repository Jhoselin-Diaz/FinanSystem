import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { Search, Filter, Plus, Edit2, Trash2, ChevronLeft, ChevronRight, ChevronDown } from 'lucide-react';
import FieldTip from './FieldTip';
import './EntidadesFinancieras.css';

export default function EntidadesFinancieras() {
  const [entidades, setEntidades] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  
  // Modal states
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [usaTramos, setUsaTramos] = useState(false);
  const [formData, setFormData] = useState({
    nombre: '',
    tea_soles_min: '',
    tea_soles_max: '',
    tea_dolares_min: '',
    tea_dolares_max: '',
    periodo_gracia_min: '',
    periodo_gracia_max: '',
    plazo_maximo: '',
    costos_notariales: '',
    costos_registrales: '',
    gps_mensual: '',
    portes_mensual: '',
    gastos_admin: '',
    seguro_desgravamen: '',
    tramos_tea: [],
    estado: 'Activo'
  });

  // Tramos de TEA por monto a financiar (opcional, ej. BCP). Si una entidad no los usa
  // (ej. Interbank), tramos_tea queda vacío y el formulario se comporta exactamente como antes.
  const tramoVacio = () => ({ monto_min: '', monto_max: '', tea_min: '', tea_max: '' });

  const handleUsaTramosChange = (checked) => {
    setUsaTramos(checked);
    if (checked && formData.tramos_tea.length === 0) {
      setFormData(prev => ({ ...prev, tramos_tea: [tramoVacio()] }));
    }
  };

  const addTramo = () => {
    setFormData(prev => ({ ...prev, tramos_tea: [...prev.tramos_tea, tramoVacio()] }));
  };

  const removeTramo = (index) => {
    setFormData(prev => ({ ...prev, tramos_tea: prev.tramos_tea.filter((_, i) => i !== index) }));
  };

  const updateTramo = (index, field, value) => {
    setFormData(prev => ({
      ...prev,
      tramos_tea: prev.tramos_tea.map((t, i) => i === index ? { ...t, [field]: value } : t)
    }));
  };

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

  useEffect(() => {
    fetchEntidades();
  }, []);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const openModal = (entidad = null) => {
    if (entidad) {
      const tramosExistentes = Array.isArray(entidad.tramos_tea) ? entidad.tramos_tea : [];
      setFormData({
        ...entidad,
        costos_notariales: entidad.costos_notariales ?? '',
        costos_registrales: entidad.costos_registrales ?? '',
        gps_mensual: entidad.gps_mensual ?? '',
        portes_mensual: entidad.portes_mensual ?? '',
        gastos_admin: entidad.gastos_admin ?? '',
        seguro_desgravamen: entidad.seguro_desgravamen ?? '',
        tramos_tea: tramosExistentes.length > 0 ? tramosExistentes : [tramoVacio()]
      });
      setUsaTramos(tramosExistentes.length > 0);
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
        costos_notariales: '',
        costos_registrales: '',
        gps_mensual: '',
        portes_mensual: '',
        gastos_admin: '',
        seguro_desgravamen: '',
        tramos_tea: [],
        estado: 'Activo'
      });
      setUsaTramos(false);
      setEditingId(null);
    }
    setShowModal(true);
  };

  const closeModal = () => {
    setShowModal(false);
    setEditingId(null);
    setUsaTramos(false);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const camposNoNegativos = [
        ['tea_dolares_min', 'TEA Dólares mínima'],
        ['tea_dolares_max', 'TEA Dólares máxima'],
        ['periodo_gracia_min', 'Periodo de Gracia mínima'],
        ['periodo_gracia_max', 'Periodo de Gracia máxima'],
        ['plazo_maximo', 'Plazo máximo'],
        ['costos_notariales', 'Costes Notariales'],
        ['costos_registrales', 'Costes Registrales'],
        ['gps_mensual', 'Comisión GPS mensual'],
        ['portes_mensual', 'Portes mensuales'],
        ['gastos_admin', 'Gastos de Administración'],
        ['seguro_desgravamen', 'Seguro Desgravamen mensual'],
      ];
      if (!usaTramos) camposNoNegativos.push(['tea_soles_min', 'TEA Soles mínima'], ['tea_soles_max', 'TEA Soles máxima']);
      for (const [campo, etiqueta] of camposNoNegativos) {
        if (parseFloat(formData[campo]) < 0) {
          alert(`${etiqueta} no puede ser un valor negativo.`);
          return;
        }
      }
      if (usaTramos && formData.tramos_tea.some(t => [t.monto_min, t.monto_max, t.tea_min, t.tea_max].some(v => v !== '' && parseFloat(v) < 0))) {
        alert('Los tramos no pueden tener valores negativos.');
        return;
      }

      let tramosPayload = null;
      let teaSolesMin = parseFloat(formData.tea_soles_min);
      let teaSolesMax = parseFloat(formData.tea_soles_max);

      if (usaTramos) {
        const tramosValidos = formData.tramos_tea
          .map(t => ({
            monto_min: parseFloat(t.monto_min) || 0,
            monto_max: t.monto_max === '' || t.monto_max === null ? null : parseFloat(t.monto_max),
            tea_min: parseFloat(t.tea_min) || 0,
            tea_max: parseFloat(t.tea_max) || 0
          }))
          .filter(t => t.tea_min > 0);

        if (tramosValidos.length === 0) {
          alert('Agrega al menos un tramo válido (con TEA mínima mayor a 0).');
          return;
        }
        tramosPayload = tramosValidos;
        // La TEA soles mín/máx se derivan de los tramos, para mantener el campo NOT NULL sin pedirlo dos veces.
        teaSolesMin = Math.min(...tramosValidos.map(t => t.tea_min));
        teaSolesMax = Math.max(...tramosValidos.map(t => t.tea_max));
      }

      const payload = {
        nombre: formData.nombre,
        tea_soles_min: teaSolesMin,
        tea_soles_max: teaSolesMax,
        tea_dolares_min: usaTramos ? (parseFloat(formData.tea_dolares_min) || 0) : parseFloat(formData.tea_dolares_min),
        tea_dolares_max: usaTramos ? (parseFloat(formData.tea_dolares_max) || 0) : parseFloat(formData.tea_dolares_max),
        periodo_gracia_min: parseInt(formData.periodo_gracia_min),
        periodo_gracia_max: parseInt(formData.periodo_gracia_max),
        plazo_maximo: parseInt(formData.plazo_maximo),
        costos_notariales: parseFloat(formData.costos_notariales) || 0,
        costos_registrales: parseFloat(formData.costos_registrales) || 0,
        gps_mensual: parseFloat(formData.gps_mensual) || 0,
        portes_mensual: parseFloat(formData.portes_mensual) || 0,
        gastos_admin: parseFloat(formData.gastos_admin) || 0,
        seguro_desgravamen: parseFloat(formData.seguro_desgravamen) || 0,
        tramos_tea: tramosPayload,
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
                  <td>
                    {Array.isArray(entidad.tramos_tea) && entidad.tramos_tea.length > 0
                      ? `Por tramos (${entidad.tramos_tea.length}): ${entidad.tea_soles_min} - ${entidad.tea_soles_max}`
                      : `${entidad.tea_soles_min} - ${entidad.tea_soles_max}`}
                  </td>
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
            <form onSubmit={handleSubmit}>
              <div className="modal-body">
                <div className="form-group full-width">
                  <label>Nombre de la entidad*</label>
                  <input required type="text" name="nombre" value={formData.nombre} onChange={handleInputChange} />
                </div>
                
                <div className="form-group full-width">
                  <label className="toggle-switch-row">
                    <span className="toggle-switch">
                      <input type="checkbox" checked={usaTramos} onChange={(e) => handleUsaTramosChange(e.target.checked)} />
                      <span className="toggle-switch-track"><span className="toggle-switch-thumb"></span></span>
                    </span>
                    <span className="toggle-switch-text">Esta entidad tiene tasas por tramos de monto a financiar (en vez de una TEA única)</span>
                    <FieldTip tip="Actívalo si el banco cobra distinta TEA según el monto (ej. BCP). Si lo dejas apagado, se usa una sola TEA para toda entidad (ej. Interbank)." />
                  </label>
                </div>

                {!usaTramos && (
                  <div className="form-row">
                    <div className="form-group half-width">
                      <label>TEA Soles mínima (%)* <FieldTip tip="Tasa que el Simulador sugiere automáticamente al elegir este banco con moneda en soles." /></label>
                      <input required type="number" step="0.01" min="0" name="tea_soles_min" value={formData.tea_soles_min} onChange={handleInputChange} />
                    </div>
                    <div className="form-group half-width">
                      <label>TEA Soles máxima (%)* <FieldTip tip="Tope del rango de tasas en soles que ofrece este banco (dato referencial)." /></label>
                      <input required type="number" step="0.01" min="0" name="tea_soles_max" value={formData.tea_soles_max} onChange={handleInputChange} />
                    </div>
                  </div>
                )}

                {usaTramos && (
                  <div className="form-group full-width">
                    <label>Tramos de TEA por monto a financiar (S/)* <FieldTip tip="Para cada tramo: monto mínimo, monto máximo (vacío = sin tope) y el rango de TEA de ese tramo. El Simulador sugerirá la TEA mínima del tramo que corresponda al monto del vehículo." /></label>
                    {formData.tramos_tea.map((tramo, i) => (
                      <div key={i} style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', marginBottom: '0.5rem' }}>
                        <input required type="number" step="0.01" min="0" placeholder="Monto mín." style={{ flex: 1 }} value={tramo.monto_min} onChange={(e) => updateTramo(i, 'monto_min', e.target.value)} />
                        <input type="number" step="0.01" min="0" placeholder="Monto máx. (vacío = sin tope)" style={{ flex: 1 }} value={tramo.monto_max} onChange={(e) => updateTramo(i, 'monto_max', e.target.value)} />
                        <input required type="number" step="0.01" min="0" placeholder="TEA mín. %" style={{ flex: 1 }} value={tramo.tea_min} onChange={(e) => updateTramo(i, 'tea_min', e.target.value)} />
                        <input required type="number" step="0.01" min="0" placeholder="TEA máx. %" style={{ flex: 1 }} value={tramo.tea_max} onChange={(e) => updateTramo(i, 'tea_max', e.target.value)} />
                        <button type="button" className="btn-icon text-danger" onClick={() => removeTramo(i)} disabled={formData.tramos_tea.length === 1}>
                          <Trash2 size={16} />
                        </button>
                      </div>
                    ))}
                    <button type="button" className="btn-outline" onClick={addTramo}>
                      <Plus size={16} /> Agregar tramo
                    </button>
                  </div>
                )}

                <div className="form-row">
                  <div className="form-group half-width">
                    <label>TEA Dólares mínima (%){!usaTramos && '*'} <FieldTip tip="Tasa que el Simulador sugiere automáticamente al elegir este banco con moneda en dólares. No aplica si la entidad usa tramos en soles." /></label>
                    <input required={!usaTramos} type="number" step="0.01" min="0" name="tea_dolares_min" value={formData.tea_dolares_min} onChange={handleInputChange} />
                  </div>
                  <div className="form-group half-width">
                    <label>TEA Dólares máxima (%){!usaTramos && '*'} <FieldTip tip="Tope del rango de tasas en dólares que ofrece este banco (dato referencial). No aplica si la entidad usa tramos en soles." /></label>
                    <input required={!usaTramos} type="number" step="0.01" min="0" name="tea_dolares_max" value={formData.tea_dolares_max} onChange={handleInputChange} />
                  </div>
                </div>

                <div className="form-row">
                  <div className="form-group half-width">
                    <label>Periodo de Gracia mínima (meses)* <FieldTip tip="Meses de gracia mínimos que ofrece este banco (dato referencial)." /></label>
                    <input required type="number" min="0" name="periodo_gracia_min" value={formData.periodo_gracia_min} onChange={handleInputChange} />
                  </div>
                  <div className="form-group half-width">
                    <label>Periodo de Gracia máxima (meses)* <FieldTip tip="Meses de gracia máximos que ofrece este banco (dato referencial)." /></label>
                    <input required type="number" min="0" name="periodo_gracia_max" value={formData.periodo_gracia_max} onChange={handleInputChange} />
                  </div>
                </div>

                <div className="form-row">
                  <div className="form-group half-width">
                    <label>Plazo máximo (meses)* <FieldTip tip="Al elegir este banco, el Simulador precarga este plazo como N." /></label>
                    <input required type="number" min="1" name="plazo_maximo" value={formData.plazo_maximo} onChange={handleInputChange} />
                  </div>
                  <div className="form-group half-width">
                    <label>Estado <FieldTip tip="Indica si la entidad está operativa en el sistema." /></label>
                    <select name="estado" value={formData.estado} onChange={handleInputChange}>
                      <option value="Activo">Activo</option>
                      <option value="Inactivo">Inactivo</option>
                    </select>
                  </div>
                </div>

                {/* Nuevos campos de costos financieros */}
                <div className="form-row">
                  <div className="form-group half-width">
                    <label>Costes Notariales (S/)* <FieldTip tip="Costos notariales que se sugieren automáticamente para esta entidad." /></label>
                    <input required type="number" step="0.01" min="0" name="costos_notariales" value={formData.costos_notariales} onChange={handleInputChange} />
                  </div>
                  <div className="form-group half-width">
                    <label>Costes Registrales (S/)* <FieldTip tip="Costos registrales que se sugieren automáticamente para esta entidad." /></label>
                    <input required type="number" step="0.01" min="0" name="costos_registrales" value={formData.costos_registrales} onChange={handleInputChange} />
                  </div>
                </div>

                <div className="form-row">
                  <div className="form-group half-width">
                    <label>Comisión GPS mensual (S/)* <FieldTip tip="Costo periódico mensual del GPS que se sugiere para esta entidad." /></label>
                    <input required type="number" step="0.01" min="0" name="gps_mensual" value={formData.gps_mensual} onChange={handleInputChange} />
                  </div>
                  <div className="form-group half-width">
                    <label>Portes mensuales (S/)* <FieldTip tip="Portes de envío de estado de cuenta mensual sugerido para esta entidad." /></label>
                    <input required type="number" step="0.01" min="0" name="portes_mensual" value={formData.portes_mensual} onChange={handleInputChange} />
                  </div>
                </div>

                <div className="form-row">
                  <div className="form-group half-width">
                    <label>Gastos de Administración (S/)* <FieldTip tip="Gastos de administración mensuales sugeridos para esta entidad." /></label>
                    <input required type="number" step="0.01" min="0" name="gastos_admin" value={formData.gastos_admin} onChange={handleInputChange} />
                  </div>
                  <div className="form-group half-width">
                    <label>Seguro Desgravamen mensual (%)* <FieldTip tip="Tasa del seguro de desgravamen sugerido para esta entidad." /></label>
                    <input required type="number" step="0.001" min="0" name="seguro_desgravamen" value={formData.seguro_desgravamen} onChange={handleInputChange} />
                  </div>
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
