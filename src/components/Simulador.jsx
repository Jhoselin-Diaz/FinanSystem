import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { Calculator, Info, Save, Download, BarChart3, FileSearch } from 'lucide-react';
import { calcularCronograma } from '../lib/financialMath';
import { exportCronogramaPDF } from '../lib/exportPdf';
import CuotaChart from './CuotaChart';
import FieldTip from './FieldTip';
import './Simulador.css';

export default function Simulador({ addNotification }) {
  const [clientes, setClientes] = useState([]);
  const [vehiculos, setVehiculos] = useState([]);
  const [entidades, setEntidades] = useState([]);

  // Form State
  const [clienteId, setClienteId] = useState('');
  const [vehiculoId, setVehiculoId] = useState('');
  const [entidadId, setEntidadId] = useState('');

  const [precioVehiculo, setPrecioVehiculo] = useState('');
  // Cuota inicial (pCI): dos campos sincronizados, monto y %; editar cualquiera actualiza el otro
  const [pctCuotaInicial, setPctCuotaInicial] = useState('');
  const [montoCuotaInicialStr, setMontoCuotaInicialStr] = useState('');
  // Cuota final / cuotón (pCF): dos campos sincronizados, monto y %
  const [porcentajeCuotaFinal, setPorcentajeCuotaFinal] = useState('');
  const [montoCuotaFinalStr, setMontoCuotaFinalStr] = useState('');
  // Unidad visible para cada campo compuesto (monto/%, meses/años): el otro valor sigue
  // sincronizado por dentro, solo cambia cuál casilla se muestra.
  const [unidadCI, setUnidadCI] = useState('pct');
  const [unidadCF, setUnidadCF] = useState('pct');
  const [unidadPlazo, setUnidadPlazo] = useState('meses');

  const [tipoTasa, setTipoTasa] = useState('Efectiva Anual (TEA)');
  const [tasaInteres, setTasaInteres] = useState('');
  const [moneda, setMoneda] = useState('Soles (S/)');
  const [monedaBloqueada, setMonedaBloqueada] = useState(false);    // fijada por el vehículo
  const [capitalizacion, setCapitalizacion] = useState('Mensual');
  const [plazo, setPlazo] = useState('');           // N en meses (canónico, usado en el cálculo)
  const [plazoAniosStr, setPlazoAniosStr] = useState(''); // N en años, sincronizado con plazo
  const [graciaTotal, setGraciaTotal] = useState('');
  const [graciaParcial, setGraciaParcial] = useState('');

  const [seguroDesgravamen, setSeguroDesgravamen] = useState('');
  const [periodoSegDes, setPeriodoSegDes] = useState('Anual');
  const [seguroRiesgo, setSeguroRiesgo] = useState('');

  // Costes/gastos iniciales (mismos conceptos del modelo, se financian en el préstamo)
  const [costesNotariales, setCostesNotariales] = useState('');
  const [costesRegistrales, setCostesRegistrales] = useState('');
  const [tasacion, setTasacion] = useState('');
  const [comisionEstudio, setComisionEstudio] = useState('');
  const [comisionActivacion, setComisionActivacion] = useState('');

  // Costos periódicos: afectan el flujo de caja, la TIR y la TCEA
  const [gpsMensual, setGpsMensual] = useState('');
  const [portesMensual, setPortesMensual] = useState('');
  const [gastosAdmMensual, setGastosAdmMensual] = useState('');
  const [cok, setCok] = useState('50');

  // Results State
  const [resultado, setResultado] = useState(null);
  const [errores, setErrores] = useState([]);
  const [graciaMax, setGraciaMax] = useState(null); // límite de Configuración (gracia total + parcial)

  useEffect(() => {
    const fetchData = async () => {
      const [resClientes, resVehiculos, resEntidades, resCfg] = await Promise.all([
        supabase.from('clientes').select('id, nombre_completo, dni'),
        supabase.from('vehiculos').select('*').eq('estado', 'Activo'),
        supabase.from('entidades_financieras').select('id, nombre, tea_soles_min, tea_dolares_min, plazo_maximo, periodo_gracia_min, costos_notariales, costos_registrales, gps_mensual, portes_mensual, gastos_admin, seguro_desgravamen, tramos_tea'),
        supabase.from('configuracion').select('*').limit(1).single()
      ]);

      if (resClientes.data) setClientes(resClientes.data);
      if (resVehiculos.data) setVehiculos(resVehiculos.data);
      if (resEntidades.data) setEntidades(resEntidades.data);

      // Apply defaults from configuracion
      if (resCfg.data) {
        const cfg = resCfg.data;
        setTipoTasa(cfg.tipo_tasa_predeterminada || 'Efectiva Anual (TEA)');
        setMoneda(cfg.moneda_predeterminada || 'Soles (S/)');
        setCapitalizacion(cfg.capitalizacion_predeterminada || 'Mensual');
        setSeguroDesgravamen(cfg.seguro_desgravamen ?? '');
        setSeguroRiesgo(cfg.seguro_vehiculo ?? '');
        if (cfg.periodo_gracia_max != null) setGraciaMax(parseInt(cfg.periodo_gracia_max));
        if (cfg.plazo_maximo) {
          setPlazo(cfg.plazo_maximo);
          setPlazoAniosStr(String(Math.round(parseFloat(cfg.plazo_maximo) / 12)));
        }
      }
    };
    fetchData();
  }, []);

  const esUSD = moneda === 'Dólares (US$)';
  const currencySymbol = esUSD ? 'US$' : 'S/';

  const handleVehiculoChange = (e) => {
    const id = e.target.value;
    setVehiculoId(id);
    const veh = vehiculos.find(v => v.id.toString() === id);
    if (veh) {
      const precio = parseFloat(veh.precio) || 0;
      setPrecioVehiculo(veh.precio);
      // Al cambiar de vehículo, recalcula los montos manteniendo los % ya ingresados
      const pctCI = parseFloat(pctCuotaInicial) || 0;
      const pctCF = parseFloat(porcentajeCuotaFinal) || 0;
      setMontoCuotaInicialStr(precio > 0 && pctCI > 0 ? (precio * pctCI / 100).toFixed(2) : '');
      setMontoCuotaFinalStr(precio > 0 && pctCF > 0 ? (precio * pctCF / 100).toFixed(2) : '');
      // La moneda de la operación es la del vehículo (sin conversión de tipo de cambio)
      if (veh.moneda) {
        setMoneda(veh.moneda);
        setMonedaBloqueada(true);
        aplicarTasaEntidad(entidadId, veh.moneda, { precio });
      } else {
        setMonedaBloqueada(false);
      }
    } else {
      setPrecioVehiculo('');
      setMonedaBloqueada(false);
    }
  };

  // Cuota inicial y cuota final (cuotón): campos de monto y % sincronizados entre sí
  // Si la entidad elegida tiene tramos de TEA (ej. BCP), la cuota inicial cambia el monto a
  // financiar y por lo tanto puede cambiar el tramo sugerido. Para entidades sin tramos (ej.
  // Interbank) esto no hace nada, igual que antes.
  const reevaluarTramoSiAplica = (montoCI) => {
    const ent = entidades.find(e => e.id === entidadId);
    if (ent && Array.isArray(ent.tramos_tea) && ent.tramos_tea.length > 0) {
      aplicarTasaEntidad(entidadId, null, { cuotaInicial: montoCI });
    }
  };

  const handleMontoCIChange = (value) => {
    setMontoCuotaInicialStr(value);
    const pv0 = parseFloat(precioVehiculo) || 0;
    const monto = parseFloat(value) || 0;
    setPctCuotaInicial(pv0 > 0 && value !== '' ? (monto / pv0 * 100).toFixed(4) : '');
    reevaluarTramoSiAplica(monto);
  };

  const handlePctCIChange = (value) => {
    setPctCuotaInicial(value);
    const pv0 = parseFloat(precioVehiculo) || 0;
    const pct = parseFloat(value) || 0;
    const monto = pv0 > 0 && value !== '' ? pv0 * pct / 100 : 0;
    setMontoCuotaInicialStr(pv0 > 0 && value !== '' ? monto.toFixed(2) : '');
    reevaluarTramoSiAplica(monto);
  };

  const handleMontoCFChange = (value) => {
    setMontoCuotaFinalStr(value);
    const pv0 = parseFloat(precioVehiculo) || 0;
    const monto = parseFloat(value) || 0;
    setPorcentajeCuotaFinal(pv0 > 0 && value !== '' ? (monto / pv0 * 100).toFixed(4) : '');
  };

  const handlePctCFChange = (value) => {
    setPorcentajeCuotaFinal(value);
    const pv0 = parseFloat(precioVehiculo) || 0;
    const pct = parseFloat(value) || 0;
    setMontoCuotaFinalStr(pv0 > 0 && value !== '' ? (pv0 * pct / 100).toFixed(2) : '');
  };

  // Plazo: meses y años sincronizados entre sí (meses es el valor canónico usado en el cálculo).
  // Los años siempre son un número entero.
  const setPlazoMeses = (value) => {
    setPlazo(value);
    const meses = parseFloat(value) || 0;
    setPlazoAniosStr(value !== '' ? String(Math.round(meses / 12)) : '');
  };

  const handlePlazoAniosChange = (value) => {
    if (value === '') {
      setPlazoAniosStr('');
      setPlazo('');
      return;
    }
    const anios = Math.max(0, Math.round(parseFloat(value) || 0));
    setPlazoAniosStr(String(anios));
    setPlazo(String(anios * 12));
  };

  // Busca el tramo de TEA (por monto a financiar) que le corresponde a un banco tipo BCP.
  // Si la entidad no tiene tramos (ej. Interbank, tramos_tea vacío), esta función no se usa.
  const buscarTramoTea = (tramos, monto) => {
    if (!Array.isArray(tramos) || tramos.length === 0) return null;
    const match = tramos.find(t => {
      const min = Number(t.monto_min) || 0;
      const max = (t.monto_max === null || t.monto_max === undefined) ? Infinity : Number(t.monto_max);
      return monto >= min && monto <= max;
    });
    return match || tramos[0];
  };

  const aplicarTasaEntidad = (id, monedaSel, overrides = {}) => {
    const ent = entidades.find(ent => ent.id === id);
    if (!ent) return;
    if (Array.isArray(ent.tramos_tea) && ent.tramos_tea.length > 0) {
      const pv = overrides.precio != null ? overrides.precio : (parseFloat(precioVehiculo) || 0);
      const ci = overrides.cuotaInicial != null ? overrides.cuotaInicial : (parseFloat(montoCuotaInicialStr) || 0);
      const montoFinanciar = Math.max(pv - ci, 0);
      const tramo = buscarTramoTea(ent.tramos_tea, montoFinanciar);
      if (tramo) setTasaInteres(tramo.tea_min);
    } else {
      const isUSD = (monedaSel || moneda) === 'Dólares (US$)';
      setTasaInteres((isUSD ? ent.tea_dolares_min : ent.tea_soles_min) || ent.tea_soles_min);
    }
  };

  const handleEntidadChange = (e) => {
    const id = e.target.value;
    setEntidadId(id);
    const ent = entidades.find(ent => ent.id === id);
    if (ent) {
      aplicarTasaEntidad(id);
      setPlazoMeses(ent.plazo_maximo);
      
      // Auto-populate new financial cost fields
      setCostesNotariales(ent.costos_notariales !== null && ent.costos_notariales !== undefined ? String(ent.costos_notariales) : '');
      setCostesRegistrales(ent.costos_registrales !== null && ent.costos_registrales !== undefined ? String(ent.costos_registrales) : '');
      setGpsMensual(ent.gps_mensual !== null && ent.gps_mensual !== undefined ? String(ent.gps_mensual) : '');
      setPortesMensual(ent.portes_mensual !== null && ent.portes_mensual !== undefined ? String(ent.portes_mensual) : '');
      setGastosAdmMensual(ent.gastos_admin !== null && ent.gastos_admin !== undefined ? String(ent.gastos_admin) : '');
      setSeguroDesgravamen(ent.seguro_desgravamen !== null && ent.seguro_desgravamen !== undefined ? String(ent.seguro_desgravamen) : '');
      setPeriodoSegDes('Mensual');
    } else {
      setTasaInteres('');
      setPlazoMeses('');
      
      // Clear fields if entity is unselected
      setCostesNotariales('');
      setCostesRegistrales('');
      setGpsMensual('');
      setPortesMensual('');
      setGastosAdmMensual('');
      setSeguroDesgravamen('');
    }
  };

  const handleMonedaChange = (e) => {
    setMoneda(e.target.value);
    if (entidadId) aplicarTasaEntidad(entidadId, e.target.value);
  };

  const getTotalGastos = () => {
    return (parseFloat(costesNotariales) || 0) +
      (parseFloat(costesRegistrales) || 0) +
      (parseFloat(tasacion) || 0) +
      (parseFloat(comisionEstudio) || 0) +
      (parseFloat(comisionActivacion) || 0);
  };

  const montoCuotaInicial = parseFloat(montoCuotaInicialStr) || 0;
  const pctCuotaInicialEfectivo = parseFloat(pctCuotaInicial) || 0;
  const pctCuotaFinalEfectivo = parseFloat(porcentajeCuotaFinal) || 0;

  // Tramo de TEA aplicado (solo entidades con tramos_tea, ej. BCP), para mostrarlo como referencia.
  const entidadSeleccionada = entidades.find(e => e.id === entidadId);
  const tramoAplicado = (entidadSeleccionada && Array.isArray(entidadSeleccionada.tramos_tea) && entidadSeleccionada.tramos_tea.length > 0)
    ? buscarTramoTea(entidadSeleccionada.tramos_tea, Math.max((parseFloat(precioVehiculo) || 0) - montoCuotaInicial, 0))
    : null;

  const validar = () => {
    const errs = [];
    const pvVal = parseFloat(precioVehiculo);
    const pCI = pctCuotaInicialEfectivo;
    const pCF = pctCuotaFinalEfectivo;
    const n = parseInt(plazo);
    const gT = parseInt(graciaTotal) || 0;
    const gP = parseInt(graciaParcial) || 0;
    const tasa = parseFloat(tasaInteres);

    if (!pvVal || pvVal <= 0) errs.push('Selecciona un vehículo con precio válido.');
    if (!tasa || tasa <= 0 || tasa > 200) errs.push('La tasa de interés debe ser mayor a 0.');
    if (!n || n <= 0 || !Number.isInteger(n)) errs.push('El plazo debe ser un número entero de meses mayor a 0.');
    if (pCI < 0 || pCF < 0) errs.push('Los porcentajes de cuota inicial y final no pueden ser negativos.');
    if (pCI + pCF >= 100) errs.push('La suma de % cuota inicial y % cuota final debe ser menor a 100%.');
    if (gT < 0 || gP < 0) errs.push('Los meses de gracia no pueden ser negativos.');
    if (n && gT + gP >= n) errs.push('La gracia total + parcial debe ser menor al plazo (deben quedar meses con cuota).');
    if (graciaMax != null && gT + gP > graciaMax) errs.push(`La gracia total + parcial no puede superar el máximo permitido en Configuración (${graciaMax} meses).`);
    if ((parseFloat(seguroDesgravamen) || 0) < 0 || (parseFloat(seguroRiesgo) || 0) < 0) errs.push('Los seguros no pueden ser negativos.');
    if ((parseFloat(cok) || 0) <= 0) errs.push('El COK debe ser mayor a 0.');
    return errs;
  };

  const handleCalculate = (e) => {
    e.preventDefault();
    const errs = validar();
    setErrores(errs);
    if (errs.length > 0) {
      setResultado(null);
      return;
    }

    const result = calcularCronograma({
      precioVehiculo: parseFloat(precioVehiculo),
      cuotaInicial: montoCuotaInicial,
      porcentajeCuotaFinal: pctCuotaFinalEfectivo,
      tasaInteres: parseFloat(tasaInteres),
      tipoTasa,
      capitalizacion,
      plazo: parseInt(plazo),
      graciaTotal: parseInt(graciaTotal) || 0,
      graciaParcial: parseInt(graciaParcial) || 0,
      seguroDesgravamen: parseFloat(seguroDesgravamen) || 0,
      periodoSeguroDesgravamen: periodoSegDes,
      seguroVehiculoAnual: parseFloat(seguroRiesgo) || 0,
      gastosIniciales: getTotalGastos(),
      gpsMensual: parseFloat(gpsMensual) || 0,
      portesMensual: parseFloat(portesMensual) || 0,
      gastosAdmMensual: parseFloat(gastosAdmMensual) || 0,
      cokAnual: parseFloat(cok) || 50
    });

    if (result.tirMensual === null) {
      setErrores(['No se pudo calcular la TIR con estos datos (el método de Newton-Raphson no convergió). Revisa la tasa, el plazo y los periodos de gracia ingresados.']);
    }
    setResultado(result);
  };

  const handleSave = async () => {
    if (!resultado || !clienteId || !vehiculoId || !entidadId) {
      alert("Debes seleccionar cliente, vehículo, entidad y calcular la simulación antes de guardar.");
      return;
    }
    if (resultado.tirMensual === null || resultado.tcea === null) {
      alert("No se puede guardar: la TIR/TCEA no se pudo calcular con estos datos. Ajusta la tasa, el plazo o los periodos de gracia y vuelve a calcular.");
      return;
    }

    const basePayload = {
      cliente_id: clienteId,
      vehiculo_id: parseInt(vehiculoId),
      entidad_id: entidadId,
      precio_vehiculo: parseFloat(precioVehiculo),
      cuota_inicial: montoCuotaInicial,
      tipo_tasa: tipoTasa,
      tasa_interes: parseFloat(tasaInteres),
      capitalizacion: tipoTasa === 'Nominal Anual (TNA)' ? capitalizacion : null,
      moneda: moneda,
      plazo: parseInt(plazo),
      periodo_gracia: (parseInt(graciaTotal) || 0) + (parseInt(graciaParcial) || 0),
      tipo_gracia: `T:${parseInt(graciaTotal) || 0} P:${parseInt(graciaParcial) || 0}`,
      seguro_desgravamen: parseFloat(seguroDesgravamen) || 0,
      seguro_vehicular: parseFloat(seguroRiesgo) || 0,
      gastos_iniciales: getTotalGastos(),
      cuota_mensual: resultado.cuotaMensual,
      tcea: resultado.tcea,
      van: resultado.van,
      tir: resultado.tirMensual
    };

    const extendido = {
      ...basePayload,
      porcentaje_cuota_inicial: pctCuotaInicialEfectivo,
      porcentaje_cuota_final: pctCuotaFinalEfectivo,
      cuota_final: resultado.cuotaFinal,
      gracia_total: parseInt(graciaTotal) || 0,
      gracia_parcial: parseInt(graciaParcial) || 0,
      cok: parseFloat(cok) || 50,
      gps_mensual: parseFloat(gpsMensual) || 0,
      portes_mensual: parseFloat(portesMensual) || 0,
      gastos_adm_mensual: parseFloat(gastosAdmMensual) || 0,
      tea: resultado.tea,
      tem: resultado.tem
    };

    try {
      let { error } = await supabase.from('simulaciones').insert([extendido]);

      // Compatibilidad: si la BD aún no tiene las columnas nuevas, guarda lo básico
      if (error && /column|schema/i.test(error.message)) {
        console.warn('Columnas extendidas no disponibles, guardando payload base. Actualiza la BD con supabase-schema.sql. Detalle:', error.message);
        ({ error } = await supabase.from('simulaciones').insert([basePayload]));
        if (!error) alert('Simulación guardada en modo compatible. Actualiza la base de datos con supabase-schema.sql para guardar también cuotón, gracia T/P, COK y costos periódicos.');
      }

      if (error) throw error;

      const clienteObj = clientes.find(c => c.id === clienteId);
      const vehiculoObj = vehiculos.find(v => v.id.toString() === vehiculoId.toString());
      const entidadObj = entidades.find(e => e.id === entidadId);
      if (addNotification) {
        addNotification({
          title: '¡Simulación guardada exitosamente!',
          description: `Cliente: ${clienteObj?.nombre_completo || '—'} (DNI: ${clienteObj?.dni || '—'}) | Vehículo: ${vehiculoObj?.marca} ${vehiculoObj?.modelo} | Banco: ${entidadObj?.nombre}`,
        });
      }
    } catch (err) {
      alert("Error al guardar: " + err.message);
    }
  };

  const fmt = (n, dec = 2) => (n ?? 0).toLocaleString('es-PE', { minimumFractionDigits: dec, maximumFractionDigits: dec });
  // Para TIR/TCEA: pueden venir en null si Newton-Raphson no convergió (ver financialMath.js)
  const fmtTir = (n, dec = 2) => (n === null ? 'No calculable' : `${fmt(n, dec)} %`);

  const handleExport = () => {
    if (!resultado) {
      alert("Primero calcula una simulación antes de exportar.");
      return;
    }

    const clienteObj = clientes.find(c => c.id === clienteId);
    const vehiculoObj = vehiculos.find(v => v.id.toString() === vehiculoId.toString());
    const entidadObj = entidades.find(e => e.id === entidadId);

    exportCronogramaPDF({
      sym: currencySymbol,
      clienteNombre: clienteObj?.nombre_completo,
      clienteDni: clienteObj?.dni,
      entidadNombre: entidadObj?.nombre,
      vehiculoNombre: vehiculoObj ? `${vehiculoObj.marca} ${vehiculoObj.modelo}` : null,
      moneda,
      precioVehiculo: parseFloat(precioVehiculo),
      pctCuotaInicial: pctCuotaInicialEfectivo,
      montoCuotaInicial,
      pctCuotaFinal: pctCuotaFinalEfectivo,
      tipoTasa,
      tasaInteres,
      capitalizacion,
      plazo,
      graciaTotal: parseInt(graciaTotal) || 0,
      graciaParcial: parseInt(graciaParcial) || 0,
      seguroDesgravamen,
      periodoSegDes,
      seguroRiesgo,
      gpsMensual,
      portesMensual,
      gastosAdmMensual,
      gastosIniciales: getTotalGastos(),
      resultado,
    });
  };

  return (
    <div className="simulador-container">
      <div className="simulador-header">
        <h1>Simulador Compra Inteligente</h1>
        <p>Crédito vehicular con cuotas reducidas y cuota final (cuotón) — método francés vencido ordinario, meses de 30 días.</p>
      </div>

      <div className="simulador-layout">
        <form className="left-panel" onSubmit={handleCalculate}>

          <div className="section-card">
            <div className="section-title"><span className="circle-number">1</span> Selección de datos principales</div>
            <div className="form-grid-3">
              <div className="form-group">
                <label>Cliente <FieldTip tip="Persona que solicita el crédito. Se registra y administra en la pestaña Clientes." /></label>
                <select required value={clienteId} onChange={(e) => setClienteId(e.target.value)}>
                  <option value="">Selecciona un cliente</option>
                  {clientes.map(c => (
                    <option key={c.id} value={c.id}>{c.nombre_completo} (DNI {c.dni})</option>
                  ))}
                </select>
              </div>
              <div className="form-group">
                <label>Vehículo <FieldTip tip="Vehículo a financiar. Al seleccionarlo se cargan automáticamente su precio y su moneda." /></label>
                <select required value={vehiculoId} onChange={handleVehiculoChange}>
                  <option value="">Selecciona un vehículo</option>
                  {vehiculos.map(v => (
                    <option key={v.id} value={v.id}>{v.marca} {v.modelo}{v.moneda === 'Dólares (US$)' ? ' (US$)' : ''}</option>
                  ))}
                </select>
              </div>
              <div className="form-group">
                <label>Entidad Financiera <FieldTip tip="Banco o financiera que otorga el crédito. Al seleccionarla se sugieren su TEA mínima y su plazo máximo." /></label>
                <select required value={entidadId} onChange={handleEntidadChange}>
                  <option value="">Selecciona un banco</option>
                  {entidades.map(e => (
                    <option key={e.id} value={e.id}>{e.nombre}</option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          <div className="section-card">
            <div className="section-title"><span className="circle-number">2</span> Datos del crédito</div>
            <div className="form-grid">
              <div className="form-group">
                <label>Precio de venta del activo — PV ({currencySymbol}) <FieldTip tip="Precio del vehículo (PV), base de todo el cálculo. Se llena solo al elegir el vehículo; no se edita aquí." /></label>
                <input type="number" readOnly value={precioVehiculo} />
              </div>
              <div className="form-group">
                <label>Moneda <FieldTip tip="Moneda de la operación (soles o dólares). Si el vehículo tiene moneda propia, queda fijada por él." /></label>
                <select value={moneda} onChange={handleMonedaChange} disabled={monedaBloqueada}>
                  <option value="Soles (S/)">Soles (S/)</option>
                  <option value="Dólares (US$)">Dólares (US$)</option>
                </select>
                {monedaBloqueada && <span className="help-text">Definida por la moneda del vehículo seleccionado</span>}
              </div>

              <div className="form-group form-group-span2">
                <label>Cuota inicial — pCI <FieldTip tip="Parte del precio que se paga al contado al inicio. Cambia entre % y monto con el selector; el otro valor se calcula solo." /></label>
                <div className="unit-input">
                  <div className="unit-toggle">
                    <button type="button" className={`unit-toggle-btn ${unidadCI === 'pct' ? 'active' : ''}`} onClick={() => setUnidadCI('pct')}>%</button>
                    <button type="button" className={`unit-toggle-btn ${unidadCI === 'monto' ? 'active' : ''}`} onClick={() => setUnidadCI('monto')}>{currencySymbol}</button>
                  </div>
                  {unidadCI === 'pct' ? (
                    <input type="number" step="0.01" min="0" max="99" value={pctCuotaInicial} onChange={(e) => handlePctCIChange(e.target.value)} placeholder="0" />
                  ) : (
                    <input type="number" step="0.01" min="0" value={montoCuotaInicialStr} onChange={(e) => handleMontoCIChange(e.target.value)} placeholder="0.00" />
                  )}
                </div>
              </div>
              <div className="form-group form-group-span2">
                <label>Cuota final (cuotón) — pCF <FieldTip tip="Cuota extraordinaria que se paga al final del crédito (mes N+1). Al reservar parte del precio para el final, las cuotas mensuales bajan." /></label>
                <div className="unit-input">
                  <div className="unit-toggle">
                    <button type="button" className={`unit-toggle-btn ${unidadCF === 'pct' ? 'active' : ''}`} onClick={() => setUnidadCF('pct')}>%</button>
                    <button type="button" className={`unit-toggle-btn ${unidadCF === 'monto' ? 'active' : ''}`} onClick={() => setUnidadCF('monto')}>{currencySymbol}</button>
                  </div>
                  {unidadCF === 'pct' ? (
                    <input type="number" step="0.01" min="0" max="99" value={porcentajeCuotaFinal} onChange={(e) => handlePctCFChange(e.target.value)} placeholder="0" />
                  ) : (
                    <input type="number" step="0.01" min="0" value={montoCuotaFinalStr} onChange={(e) => handleMontoCFChange(e.target.value)} placeholder="0.00" />
                  )}
                </div>
                <span className="help-text">Se paga un mes después de la última cuota (mes N+1)</span>
              </div>

              <div className="form-group">
                <label>Tipo de tasa de interés <FieldTip tip="TEA: tasa efectiva anual, ya incluye la capitalización. TNA: tasa nominal anual, requiere indicar el periodo de capitalización." /></label>
                <select value={tipoTasa} onChange={(e) => setTipoTasa(e.target.value)}>
                  <option value="Efectiva Anual (TEA)">Efectiva Anual (TEA)</option>
                  <option value="Nominal Anual (TNA)">Nominal Anual (TNA)</option>
                </select>
              </div>
              <div className="form-group">
                <label>Tasa de interés (%) <FieldTip tip="Tasa anual del crédito. Se sugiere la tasa mínima del banco elegido, pero puedes modificarla." /></label>
                <div className="input-with-addon">
                  <input type="number" step="0.0001" required value={tasaInteres} onChange={(e) => setTasaInteres(e.target.value)} />
                  <span className="addon">%</span>
                </div>
                {tramoAplicado && (
                  <span className="help-text">
                    Tramo aplicado (monto a financiar ≈ {currencySymbol} {fmt(Math.max((parseFloat(precioVehiculo) || 0) - montoCuotaInicial, 0))}): TEA {fmt(tramoAplicado.tea_min, 2)}% - {fmt(tramoAplicado.tea_max, 2)}%
                  </span>
                )}
              </div>

              <div className="form-group">
                <label>Periodo de capitalización (solo TNA) <FieldTip tip="Frecuencia con la que capitaliza la tasa nominal (TNA) para convertirla en efectiva. Solo se usa cuando el tipo de tasa es TNA." /></label>
                <select value={capitalizacion} onChange={(e) => setCapitalizacion(e.target.value)} disabled={tipoTasa !== 'Nominal Anual (TNA)'}>
                  <option value="Diario">Diario</option>
                  <option value="Mensual">Mensual</option>
                  <option value="Bimestral">Bimestral</option>
                  <option value="Trimestral">Trimestral</option>
                  <option value="Cuatrimestral">Cuatrimestral</option>
                  <option value="Semestral">Semestral</option>
                  <option value="Anual">Anual</option>
                </select>
              </div>
              <div className="form-group form-group-span2">
                <label>Plazo — N <FieldTip tip="Duración del crédito. Cambia entre meses y años con el selector; el cálculo usa el número de meses (N)." /></label>
                <div className="unit-input">
                  <div className="unit-toggle">
                    <button type="button" className={`unit-toggle-btn ${unidadPlazo === 'meses' ? 'active' : ''}`} onClick={() => setUnidadPlazo('meses')}>Meses</button>
                    <button type="button" className={`unit-toggle-btn ${unidadPlazo === 'anios' ? 'active' : ''}`} onClick={() => setUnidadPlazo('anios')}>Años</button>
                  </div>
                  {unidadPlazo === 'meses' ? (
                    <input type="number" required min="1" step="1" value={plazo} onChange={(e) => setPlazoMeses(e.target.value)} placeholder="0" />
                  ) : (
                    <input type="number" min="0" step="1" value={plazoAniosStr} onChange={(e) => handlePlazoAniosChange(e.target.value)} onKeyDown={(e) => { if (e.key === '.' || e.key === ',') e.preventDefault(); }} placeholder="0" />
                  )}
                </div>
                <span className="help-text">Frecuencia de pago: 30 días · Año de 360 días · 12 cuotas/año</span>
              </div>

              <div className="form-group">
                <label>Gracia Total — T (meses) <FieldTip tip="Meses iniciales en los que no se paga nada: el interés no pagado se suma al saldo (se capitaliza)." /></label>
                <input type="number" min="0" value={graciaTotal} onChange={(e) => setGraciaTotal(e.target.value)} />
                <span className="help-text">Sin cuota; el interés se capitaliza</span>
              </div>
              <div className="form-group">
                <label>Gracia Parcial — P (meses) <FieldTip tip="Meses en los que solo se pagan intereses y seguros: el saldo del préstamo no baja, pero tampoco crece." /></label>
                <input type="number" min="0" value={graciaParcial} onChange={(e) => setGraciaParcial(e.target.value)} />
                <span className="help-text">
                  Paga solo interés y seguros; el saldo no cambia
                  {graciaMax != null ? ` · Máximo T+P: ${graciaMax} meses (Configuración)` : ''}
                </span>
              </div>
            </div>
          </div>

          <div className="section-card">
            <div className="section-title"><span className="circle-number">3</span> Seguros</div>
            <div className="form-grid">
              <div className="form-group">
                <label>% Seguro de desgravamen — pSegDes <FieldTip tip="Seguro que cancela la deuda si el titular fallece. Se cobra como % sobre el saldo deudor de cada mes." /></label>
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                  <input type="number" step="0.001" min="0" style={{ flex: 1 }} value={seguroDesgravamen} onChange={(e) => setSeguroDesgravamen(e.target.value)} />
                  <select style={{ width: '110px' }} value={periodoSegDes} onChange={(e) => setPeriodoSegDes(e.target.value)}>
                    <option value="Anual">Anual</option>
                    <option value="Mensual">Mensual</option>
                  </select>
                </div>
                <span className="help-text">Sobre el saldo deudor. Ej: 0.049% mensual (= 0.588% anual)</span>
              </div>
              <div className="form-group">
                <label>% Seguro de riesgo — pSegRie (% anual) <FieldTip tip="Seguro vehicular contra todo riesgo (choque, robo). Es un % anual sobre el precio del vehículo, cobrado en partes cada mes." /></label>
                <input type="number" step="0.001" min="0" value={seguroRiesgo} onChange={(e) => setSeguroRiesgo(e.target.value)} />
                <span className="help-text">Seguro vehicular contra todo riesgo, sobre el precio del vehículo</span>
              </div>
            </div>
          </div>

          <div className="section-card">
            <div className="section-title"><span className="circle-number">4</span> Costes/Gastos iniciales (se financian en el préstamo)</div>
            <div className="form-grid-3">
              <div className="form-group">
                <label>Costes Notariales ({currencySymbol}) <FieldTip tip="Gastos de notaría por la firma del contrato. Se financian: se suman al monto del préstamo." /></label>
                <input type="number" step="0.01" min="0" value={costesNotariales} onChange={(e) => setCostesNotariales(e.target.value)} />
              </div>
              <div className="form-group">
                <label>Costes Registrales ({currencySymbol}) <FieldTip tip="Costo de inscribir la garantía vehicular en Registros Públicos. Se financia en el préstamo." /></label>
                <input type="number" step="0.01" min="0" value={costesRegistrales} onChange={(e) => setCostesRegistrales(e.target.value)} />
              </div>
              <div className="form-group">
                <label>Tasación ({currencySymbol}) <FieldTip tip="Costo de valorizar el vehículo que servirá de garantía. Se financia en el préstamo." /></label>
                <input type="number" step="0.01" min="0" value={tasacion} onChange={(e) => setTasacion(e.target.value)} />
              </div>
              <div className="form-group">
                <label>Comisión de estudio ({currencySymbol}) <FieldTip tip="Comisión del banco por evaluar y aprobar el crédito. Se financia en el préstamo." /></label>
                <input type="number" step="0.01" min="0" value={comisionEstudio} onChange={(e) => setComisionEstudio(e.target.value)} />
              </div>
              <div className="form-group">
                <label>Comisión de activación ({currencySymbol}) <FieldTip tip="Comisión del banco por desembolsar (activar) el crédito. Se financia en el préstamo." /></label>
                <input type="number" step="0.01" min="0" value={comisionActivacion} onChange={(e) => setComisionActivacion(e.target.value)} />
              </div>
            </div>
            <div style={{ marginTop: '1rem', color: 'var(--brand-700)', fontWeight: '600', fontSize: '0.9rem' }}>
              Total Gastos Iniciales: {currencySymbol} {fmt(getTotalGastos())} (se suman al monto del préstamo)
            </div>
          </div>

          <div className="section-card">
            <div className="section-title"><span className="circle-number">5</span> Costes/Gastos periódicos y COK</div>
            <div className="form-grid">
              <div className="form-group">
                <label>GPS ({currencySymbol} mensual) <FieldTip tip="Costo mensual del dispositivo de rastreo que exige el banco. No cambia la cuota francesa, pero sí el flujo, la TIR y la TCEA." /></label>
                <input type="number" step="0.01" min="0" value={gpsMensual} onChange={(e) => setGpsMensual(e.target.value)} />
              </div>
              <div className="form-group">
                <label>Portes ({currencySymbol} mensual) <FieldTip tip="Cobro mensual por el envío de estados de cuenta. Afecta el flujo, la TIR y la TCEA." /></label>
                <input type="number" step="0.01" min="0" value={portesMensual} onChange={(e) => setPortesMensual(e.target.value)} />
              </div>
              <div className="form-group">
                <label>Gastos de Administración ({currencySymbol} mensual) <FieldTip tip="Cobro administrativo mensual de la entidad. Afecta el flujo, la TIR y la TCEA." /></label>
                <input type="number" step="0.01" min="0" value={gastosAdmMensual} onChange={(e) => setGastosAdmMensual(e.target.value)} />
              </div>
              <div className="form-group">
                <label>Tasa de descuento — COK (% anual) <FieldTip tip="Costo de oportunidad del capital: la rentabilidad mínima que le exiges a tu dinero. Con él se descuentan los flujos para calcular el VAN." /></label>
                <div className="input-with-addon">
                  <input type="number" step="0.01" min="0" value={cok} onChange={(e) => setCok(e.target.value)} />
                  <span className="addon">%</span>
                </div>
                <span className="help-text">Costo de oportunidad del capital, para calcular el VAN</span>
              </div>
            </div>
          </div>

          {errores.length > 0 && (
            <div className="errores-box">
              {errores.map((err, i) => <div key={i}>• {err}</div>)}
            </div>
          )}

          <button type="submit" className="btn-calculate">
            <Calculator size={20} /> Calcular simulación
          </button>
        </form>

        <div className="right-panel">
          <div className="section-card" style={{ flex: 1 }}>
            <h3 style={{ fontSize: '1.1rem', marginBottom: '1.5rem' }}>Resultados del financiamiento</h3>

            <div className="resultado-hero">
              <div>
                <div className="hero-label">Cuota mensual total <FieldTip className="on-dark" tip="Lo que se paga cada mes: cuota francesa (con seguro de desgravamen) + seguro vehicular + GPS, portes y gastos administrativos." /></div>
                <div className="hero-value">{resultado ? `${currencySymbol} ${fmt(resultado.cuotaMensual)}` : '--'}</div>
                <div className="hero-sub">Incluye cuota francesa, seguro de riesgo y costos fijos</div>
              </div>
              <div className="hero-side">
                <div className="hero-label">Cuotón final (CF) <FieldTip className="on-dark" tip="Pago único al final del crédito (mes N+1). Gracias a él, las cuotas mensuales son más bajas." /></div>
                <div className="hero-side-value">{resultado ? `${currencySymbol} ${fmt(resultado.cuotaFinal)}` : '--'}</div>
              </div>
            </div>

            <div className="resultados-grid">
              <div className="resultado-box">
                <h4 className="fs-tip" data-tip="Tasa Efectiva Anual: la tasa de interés real del crédito en un año.">TEA</h4>
                <div className="val">{resultado ? `${fmt(resultado.tea, 4)} %` : '--'}</div>
              </div>
              <div className="resultado-box">
                <h4 className="fs-tip" data-tip="Tasa Efectiva Mensual: la TEA convertida al periodo de 30 días.">TEM</h4>
                <div className="val">{resultado ? `${fmt(resultado.tem, 4)} %` : '--'}</div>
              </div>
              <div className="resultado-box">
                <h4 className="fs-tip" data-tip="Tasa Interna de Retorno mensual del flujo del deudor, calculada con el método de Newton-Raphson.">TIR mensual</h4>
                <div className="val">{resultado ? fmtTir(resultado.tirMensual, 4) : '--'}</div>
              </div>
              <div className="resultado-box">
                <h4 className="fs-tip" data-tip="Tasa de Costo Efectivo Anual: el costo total real del crédito por año, incluyendo seguros y gastos.">TCEA</h4>
                <div className="val">{resultado ? fmtTir(resultado.tcea, 4) : '--'}</div>
              </div>
              <div className="resultado-box">
                <h4 className="fs-tip" data-tip="Valor Actual Neto de los flujos, descontados al COK. Positivo = conviene frente al costo de oportunidad.">{resultado ? `VAN (COK ${resultado.cokAnual}%)` : 'VAN'}</h4>
                <div className="val">{resultado ? `${currencySymbol} ${fmt(resultado.van)}` : '--'}</div>
              </div>
              <div className="resultado-box">
                <h4 className="fs-tip" data-tip="Comparación entre la TIR del crédito y el costo de oportunidad del capital (COK) en el mismo periodo.">TIR / COKi periodo</h4>
                <div className="val" style={{ fontSize: '0.95rem' }}>{resultado ? `${resultado.tirMensual === null ? 'N/D' : fmt(resultado.tirMensual, 3) + '%'} / ${fmt(resultado.cokMensual, 3)}%` : '--'}</div>
              </div>
            </div>

            {resultado && (
              <div className="detalle-financiamiento">
                <div><span>Cuota inicial (CI) <FieldTip tip="Pago al contado del inicio: precio del vehículo × % de cuota inicial." /></span><strong>{currencySymbol} {fmt(resultado.cuotaInicial)}</strong></div>
                <div><span>Monto del préstamo <FieldTip tip="Lo que realmente se financia: precio del vehículo − cuota inicial + gastos iniciales financiados." /></span><strong>{currencySymbol} {fmt(resultado.prestamo)}</strong></div>
                <div><span>Saldo a financiar con cuotas <FieldTip tip="Parte del préstamo que se paga con las cuotas mensuales: préstamo − valor presente del cuotón." /></span><strong>{currencySymbol} {fmt(resultado.saldoRegularInicial)}</strong></div>
                <div><span>VP del cuotón <FieldTip tip="El cuotón (CF) traído a valor presente: CF ÷ (1+i)^(N+1). Esta parte del préstamo se cubre con el pago final, no con las cuotas." /></span><strong>{currencySymbol} {fmt(resultado.saldoCuotonInicial)}</strong></div>
                <div><span>Nº cuotas por año (NCxA) <FieldTip tip="Cuotas por año: 12, porque el modelo usa meses de 30 días y año de 360 días." /></span><strong>{resultado.ncxa}</strong></div>
                <div><span>Nº total de cuotas (N) <FieldTip tip="Cantidad de cuotas mensuales del cronograma. El cuotón se paga aparte, un mes después de la última cuota." /></span><strong>{resultado.totalCuotas}{resultado.totalPeriodos > resultado.totalCuotas ? ` + cuotón en mes ${resultado.totalPeriodos}` : ''}</strong></div>
                <div><span>% Seg. desgravamen periódico <FieldTip tip="El % de desgravamen convertido al mes. Se suma a la TEM para calcular la cuota, por eso la cuota ya incluye este seguro." /></span><strong>{fmt(resultado.pSegDesPer, 4)} %</strong></div>
                <div><span>Seguro riesgo periódico <FieldTip tip="El seguro vehicular anual repartido en 12 pagos: monto fijo que se suma a cada cuota mensual." /></span><strong>{currencySymbol} {fmt(resultado.segRiePer)}</strong></div>
                <div><span>Cuota francesa (inc. SegDes) <FieldTip tip="Cuota constante del método francés sobre el saldo a financiar, con tasa TEM + %SegDes. Es la columna «Cuota» del cronograma." /></span><strong>{currencySymbol} {fmt(resultado.cuotaRegular)}</strong></div>
                <div><span>Tasa de descuento periódica (COKi) <FieldTip tip="El COK anual convertido al mes. Con esta tasa se descuentan los flujos para obtener el VAN." /></span><strong>{fmt(resultado.cokMensual, 5)} %</strong></div>
              </div>
            )}

            {resultado && (
              <>
                <h3 style={{ fontSize: '1.1rem', margin: '2rem 0 1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <BarChart3 size={18} style={{ color: 'var(--brand-600)' }} /> Composición del pago mensual
                </h3>
                <CuotaChart cronograma={resultado.cronograma} sym={currencySymbol} />
              </>
            )}

            <h3 style={{ fontSize: '1.1rem', margin: '2rem 0 1rem' }}>Cronograma de pagos</h3>
            <div className="cronograma-wrapper">
              <table className="cronograma-table">
                <thead>
                  <tr>
                    <th rowSpan="2">Nº</th>
                    <th rowSpan="2">P.G.</th>
                    <th colSpan="5" className="th-group">Cronograma del Cuotón (CF)</th>
                    <th colSpan="6" className="th-group">Cronograma de la Cuota Regular</th>
                    <th colSpan="4" className="th-group">Costes de operación</th>
                    <th rowSpan="2">Flujo</th>
                  </tr>
                  <tr>
                    <th title="Saldo Inicial Cuota Final">SICF</th>
                    <th title="Interés Cuota Final">ICF</th>
                    <th title="Amortización Cuota Final">ACF</th>
                    <th title="Seguro desgravamen Cuota Final">SegDesCF</th>
                    <th title="Saldo Final Cuota Final">SFCF</th>
                    <th title="Saldo Inicial">SI</th>
                    <th title="Interés">I</th>
                    <th title="Cuota (incluye seguro desgravamen)">Cuota</th>
                    <th title="Amortización">A</th>
                    <th title="Seguro desgravamen">SegDes</th>
                    <th title="Saldo Final para Cuota">SF</th>
                    <th title="Seguro de riesgo">SegRie</th>
                    <th>GPS</th>
                    <th>Portes</th>
                    <th title="Gastos administrativos">GasAdm</th>
                  </tr>
                </thead>
                <tbody>
                  {!resultado ? (
                    <tr>
                      <td colSpan="18" style={{ padding: 0 }}>
                        <div className="fs-empty">
                          <FileSearch />
                          <strong>Aún no hay cronograma</strong>
                          <p>Completa los datos del crédito y presiona «Calcular simulación» para generar el plan de pagos mes a mes.</p>
                        </div>
                      </td>
                    </tr>
                  ) : (
                    <>
                      <tr className="fila-cero">
                        <td>0</td>
                        <td colSpan="16" style={{ textAlign: 'left', color: 'var(--ink-500)' }}>Desembolso del préstamo</td>
                        <td className="flujo-positivo">{fmt(resultado.prestamo)}</td>
                      </tr>
                      {resultado.cronograma.map(c => (
                        <tr key={c.periodo}>
                          <td>{c.periodo}</td>
                          <td>{c.gracia}</td>
                          <td>{fmt(c.siCuoton)}</td>
                          <td>{fmt(c.iCuoton)}</td>
                          <td>{fmt(c.amortCuoton)}</td>
                          <td>{fmt(c.segDesCuoton)}</td>
                          <td>{fmt(c.sfCuoton)}</td>
                          <td>{fmt(c.saldoInicial)}</td>
                          <td>{fmt(c.interes)}</td>
                          <td>{fmt(c.cuota)}</td>
                          <td>{fmt(c.amortizacion)}</td>
                          <td>{fmt(c.seguroDesgravamen)}</td>
                          <td>{fmt(c.saldo)}</td>
                          <td>{fmt(c.seguroVehicular)}</td>
                          <td>{fmt(c.gps)}</td>
                          <td>{fmt(c.portes)}</td>
                          <td>{fmt(c.gastosAdm)}</td>
                          <td className="flujo-negativo">{fmt(c.flujo)}</td>
                        </tr>
                      ))}
                    </>
                  )}
                </tbody>
              </table>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginTop: '2rem', marginBottom: '1rem', color: 'var(--brand-700)', fontWeight: 'bold' }}>
              <span className="circle-number" style={{ width: '20px', height: '20px', fontSize: '0.75rem' }}>6</span>
              Totales por concepto (transparencia de información)
            </div>

            {[
              ['Total Intereses', resultado?.totalIntereses, 'Costo del financiamiento'],
              ['Total Amortización del capital', resultado?.totalAmortizacion, 'Incluye el cuotón (CF)'],
              ['Total Seguro de Desgravamen', resultado?.totalSegDes, 'Sobre el saldo deudor'],
              ['Total Seguro contra todo riesgo', resultado?.totalSegRie, 'Seguro vehicular'],
              ['Total GPS', resultado?.totalGPS, 'Costo periódico'],
              ['Total Portes', resultado?.totalPortes, 'Costo periódico'],
              ['Total Gastos Administrativos', resultado?.totalGasAdm, 'Costo periódico'],
            ].map(([label, value, sub]) => (
              <div className="desglose-item" key={label}>
                <div className="desglose-label"><Info size={16} /> {label}</div>
                <div className="desglose-value">
                  <strong>{resultado ? `${currencySymbol} ${fmt(value)}` : '--'}</strong>
                  <span>{sub}</span>
                </div>
              </div>
            ))}

            <div className="total-box">
              <div>
                <div className="total-label">Monto total a pagar</div>
                <div className="total-value">
                  {resultado ? `${currencySymbol} ${fmt(resultado.cronograma.reduce((acc, c) => acc - c.flujo, 0))}` : '--'}
                </div>
              </div>
              <div className="total-plazo">
                DURANTE<br />
                <strong>{resultado ? resultado.totalPeriodos : (plazo || '--')} meses</strong>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="simulador-footer">
        <div className="footer-info">
          <Info size={18} /> La simulación mostrada es referencial. Los resultados pueden variar según las condiciones de la entidad financiera.
        </div>
        <div className="footer-actions">
          <button className="btn-secondary" onClick={handleSave} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Save size={18} /> Guardar simulación
          </button>
          <button className="btn-secondary" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }} onClick={handleExport}>
            <Download size={18} /> Exportar
          </button>
        </div>
      </div>
    </div>
  );
}
