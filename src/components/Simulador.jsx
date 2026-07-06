import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { Calculator, Info, Save, Download } from 'lucide-react';
import { calcularCronograma } from '../lib/financialMath';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
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
  const [pctCuotaInicial, setPctCuotaInicial] = useState('');       // pCI (% del precio)
  const [porcentajeCuotaFinal, setPorcentajeCuotaFinal] = useState(''); // pCF (% del precio)

  const [tipoTasa, setTipoTasa] = useState('Efectiva Anual (TEA)');
  const [tasaInteres, setTasaInteres] = useState('');
  const [moneda, setMoneda] = useState('Soles (S/)');
  const [monedaBloqueada, setMonedaBloqueada] = useState(false);    // fijada por el vehículo
  const [capitalizacion, setCapitalizacion] = useState('Mensual');
  const [plazo, setPlazo] = useState('');
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

  useEffect(() => {
    const fetchData = async () => {
      const [resClientes, resVehiculos, resEntidades, resCfg] = await Promise.all([
        supabase.from('clientes').select('id, nombre_completo, dni'),
        supabase.from('vehiculos').select('*'),
        supabase.from('entidades_financieras').select('id, nombre, tea_soles_min, tea_dolares_min, plazo_maximo, periodo_gracia_min'),
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
        if (cfg.plazo_maximo) setPlazo(cfg.plazo_maximo);
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
      setPrecioVehiculo(veh.precio);
      // La moneda de la operación es la del vehículo (sin conversión de tipo de cambio)
      if (veh.moneda) {
        setMoneda(veh.moneda);
        setMonedaBloqueada(true);
        aplicarTasaEntidad(entidadId, veh.moneda);
      } else {
        setMonedaBloqueada(false);
      }
    } else {
      setPrecioVehiculo('');
      setMonedaBloqueada(false);
    }
  };

  const aplicarTasaEntidad = (id, monedaSel) => {
    const ent = entidades.find(ent => ent.id === id);
    if (ent) {
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
      setPlazo(ent.plazo_maximo);
    } else {
      setTasaInteres('');
      setPlazo('');
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

  const montoCuotaInicial = (parseFloat(precioVehiculo) || 0) * ((parseFloat(pctCuotaInicial) || 0) / 100);
  const montoCuotaFinal = (parseFloat(precioVehiculo) || 0) * ((parseFloat(porcentajeCuotaFinal) || 0) / 100);

  const validar = () => {
    const errs = [];
    const pv = parseFloat(precioVehiculo);
    const pCI = parseFloat(pctCuotaInicial) || 0;
    const pCF = parseFloat(porcentajeCuotaFinal) || 0;
    const n = parseInt(plazo);
    const gT = parseInt(graciaTotal) || 0;
    const gP = parseInt(graciaParcial) || 0;
    const tasa = parseFloat(tasaInteres);

    if (!pv || pv <= 0) errs.push('Selecciona un vehículo con precio válido.');
    if (!tasa || tasa <= 0 || tasa > 200) errs.push('La tasa de interés debe ser mayor a 0.');
    if (!n || n <= 0 || !Number.isInteger(n)) errs.push('El plazo debe ser un número entero de meses mayor a 0.');
    if (pCI < 0 || pCF < 0) errs.push('Los porcentajes de cuota inicial y final no pueden ser negativos.');
    if (pCI + pCF >= 100) errs.push('La suma de % cuota inicial y % cuota final debe ser menor a 100%.');
    if (gT < 0 || gP < 0) errs.push('Los meses de gracia no pueden ser negativos.');
    if (n && gT + gP >= n) errs.push('La gracia total + parcial debe ser menor al plazo (deben quedar meses con cuota).');
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
      porcentajeCuotaFinal: parseFloat(porcentajeCuotaFinal) || 0,
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

    setResultado(result);
  };

  const handleSave = async () => {
    if (!resultado || !clienteId || !vehiculoId || !entidadId) {
      alert("Debes seleccionar cliente, vehículo, entidad y calcular la simulación antes de guardar.");
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
      porcentaje_cuota_inicial: parseFloat(pctCuotaInicial) || 0,
      porcentaje_cuota_final: parseFloat(porcentajeCuotaFinal) || 0,
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
        console.warn('Columnas extendidas no disponibles, guardando payload base. Ejecuta supabase-migration.sql. Detalle:', error.message);
        ({ error } = await supabase.from('simulaciones').insert([basePayload]));
        if (!error) alert('Simulación guardada en modo compatible. Ejecuta supabase-migration.sql en Supabase para guardar también cuotón, gracia T/P, COK y costos periódicos.');
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

  const handleExport = () => {
    if (!resultado) {
      alert("Primero calcula una simulación antes de exportar.");
      return;
    }

    const sym = currencySymbol;
    const clienteObj = clientes.find(c => c.id === clienteId);
    const vehiculoObj = vehiculos.find(v => v.id.toString() === vehiculoId.toString());
    const entidadObj  = entidades.find(e => e.id === entidadId);

    const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
    const pageW = doc.internal.pageSize.getWidth();
    const margin = 12;

    // ── Header band ──────────────────────────────────────────────
    doc.setFillColor(29, 104, 182);
    doc.rect(0, 0, pageW, 24, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(15);
    doc.setFont('helvetica', 'bold');
    doc.text('FinanSystem', margin, 11);
    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    doc.text('Compra Inteligente — Crédito Vehicular (método francés vencido ordinario)', margin, 17);
    doc.text(`Generado: ${new Date().toLocaleDateString('es-PE')}`, pageW - margin, 17, { align: 'right' });

    let y = 31;
    const sectionTitle = (title) => {
      doc.setFillColor(239, 246, 255);
      doc.rect(margin, y, pageW - margin * 2, 6, 'F');
      doc.setTextColor(29, 104, 182);
      doc.setFontSize(8.5);
      doc.setFont('helvetica', 'bold');
      doc.text(title, margin + 2, y + 4.2);
      doc.setTextColor(30, 41, 59);
      doc.setFont('helvetica', 'normal');
      y += 9;
    };

    const row3col = (pairs) => {
      doc.setFontSize(7.5);
      const colW = (pageW - margin * 2) / 3;
      pairs.forEach(([label, val], i) => {
        if (!label) return;
        const x = margin + i * colW;
        doc.setTextColor(100, 116, 139);
        doc.text(label, x, y);
        doc.setTextColor(30, 41, 59);
        doc.setFont('helvetica', 'bold');
        doc.text(String(val ?? '—'), x + 40, y);
        doc.setFont('helvetica', 'normal');
      });
      y += 5;
    };

    sectionTitle('1. Datos Principales');
    row3col([['Cliente:', clienteObj?.nombre_completo || '—'], ['DNI:', clienteObj?.dni || '—'], ['Entidad:', entidadObj?.nombre || '—']]);
    row3col([['Vehículo:', vehiculoObj ? `${vehiculoObj.marca} ${vehiculoObj.modelo}` : '—'], ['Moneda:', moneda], ['Frecuencia de pago:', '30 días (360 días/año)']]);
    y += 2;

    sectionTitle('2. Datos del Crédito');
    row3col([
      ['Precio de venta (PV):', `${sym} ${fmt(parseFloat(precioVehiculo))}`],
      ['% Cuota inicial (pCI):', `${pctCuotaInicial || 0} % = ${sym} ${fmt(montoCuotaInicial)}`],
      ['% Cuota final (pCF):', `${porcentajeCuotaFinal || 0} % = ${sym} ${fmt(resultado.cuotaFinal)}`],
    ]);
    row3col([
      ['Tipo de tasa:', tipoTasa],
      ['Tasa de interés:', `${tasaInteres} %`],
      ['Capitalización:', tipoTasa === 'Nominal Anual (TNA)' ? capitalizacion : 'No aplica (TEA)'],
    ]);
    row3col([
      ['Plazo (N):', `${plazo} meses (${(parseInt(plazo) / 12).toFixed(1)} años)`],
      ['Gracia:', `Total: ${graciaTotal || 0} / Parcial: ${graciaParcial || 0} meses`],
      ['COK:', `${resultado.cokAnual} % anual (COKi ${fmt(resultado.cokMensual, 5)} %)`],
    ]);
    row3col([
      ['Seg. desgravamen:', `${seguroDesgravamen || 0} % ${periodoSegDes.toLowerCase()} (per. ${fmt(resultado.pSegDesPer, 4)} %)`],
      ['Seg. riesgo:', `${seguroRiesgo || 0} % anual (${sym} ${fmt(resultado.segRiePer)} /mes)`],
      ['GPS / Portes / G.Adm:', `${sym} ${fmt(parseFloat(gpsMensual) || 0)} / ${fmt(parseFloat(portesMensual) || 0)} / ${fmt(parseFloat(gastosAdmMensual) || 0)} mensual`],
    ]);
    row3col([
      ['Gastos iniciales:', `${sym} ${fmt(getTotalGastos())} (financiados)`],
      ['Monto del préstamo:', `${sym} ${fmt(resultado.prestamo)}`],
      ['Saldo a financiar c/ cuotas:', `${sym} ${fmt(resultado.saldoRegularInicial)}`],
    ]);
    y += 2;

    sectionTitle('3. Resultados e Indicadores');
    const cards = [
      { label: 'Cuota Mensual Total', value: `${sym} ${fmt(resultado.cuotaMensual)}` },
      { label: 'Cuotón Final (CF)', value: `${sym} ${fmt(resultado.cuotaFinal)}` },
      { label: 'TEA', value: `${fmt(resultado.tea, 4)} %` },
      { label: 'TEM', value: `${fmt(resultado.tem, 4)} %` },
      { label: 'TIR Mensual', value: `${fmt(resultado.tirMensual, 4)} %` },
      { label: 'TCEA', value: `${fmt(resultado.tcea, 4)} %` },
      { label: `VAN (COK ${resultado.cokAnual}%)`, value: `${sym} ${fmt(resultado.van)}` },
    ];
    const cardW = (pageW - margin * 2) / cards.length;
    cards.forEach((card, i) => {
      const cx = margin + i * cardW;
      doc.setFillColor(224, 242, 254);
      doc.roundedRect(cx, y, cardW - 2, 13, 2, 2, 'F');
      doc.setTextColor(100, 116, 139);
      doc.setFontSize(6.5);
      doc.text(card.label, cx + (cardW - 2) / 2, y + 4.2, { align: 'center' });
      doc.setTextColor(29, 104, 182);
      doc.setFontSize(7.5);
      doc.setFont('helvetica', 'bold');
      doc.text(card.value, cx + (cardW - 2) / 2, y + 9.8, { align: 'center' });
      doc.setFont('helvetica', 'normal');
    });
    y += 17;

    const totalPago = resultado.cronograma.reduce((acc, c) => acc - c.flujo, 0);
    row3col([
      ['Total Intereses:', `${sym} ${fmt(resultado.totalIntereses)}`],
      ['Total Amortización:', `${sym} ${fmt(resultado.totalAmortizacion)}`],
      ['Total Seg. Desgravamen:', `${sym} ${fmt(resultado.totalSegDes)}`],
    ]);
    row3col([
      ['Total Seg. Riesgo:', `${sym} ${fmt(resultado.totalSegRie)}`],
      ['Total GPS:', `${sym} ${fmt(resultado.totalGPS)}`],
      ['Total Portes:', `${sym} ${fmt(resultado.totalPortes)}`],
    ]);
    row3col([
      ['Total Gastos Adm.:', `${sym} ${fmt(resultado.totalGasAdm)}`],
      ['Monto Total a Pagar:', `${sym} ${fmt(totalPago)}`],
      ['', ''],
    ]);
    y += 3;

    sectionTitle('4. Cronograma de Pagos (Cuotón + Cuota Regular)');

    const n2 = (v) => (v === 0 ? '0.00' : v.toFixed(2));
    const tableRows = [
      ['0', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', resultado.prestamo.toFixed(2)],
      ...resultado.cronograma.map(c => [
        c.periodo,
        c.gracia,
        n2(c.siCuoton), n2(c.iCuoton), n2(c.amortCuoton), n2(c.segDesCuoton), n2(c.sfCuoton),
        n2(c.saldoInicial), n2(c.interes), n2(c.cuota), n2(c.amortizacion), n2(c.seguroDesgravamen),
        n2(c.seguroVehicular), n2(c.gps), n2(c.portes), n2(c.gastosAdm),
        n2(c.saldo),
        c.flujo.toFixed(2)
      ])
    ];

    autoTable(doc, {
      startY: y,
      head: [['Nº', 'PG', 'SICF', 'ICF', 'ACF', 'SegDesCF', 'SFCF', 'SI', 'Interés', 'Cuota', 'Amort.', 'SegDes', 'SegRie', 'GPS', 'Portes', 'GasAdm', 'SF', 'Flujo']],
      body: tableRows,
      margin: { left: margin, right: margin },
      styles: { fontSize: 5.8, cellPadding: 1.1, halign: 'right' },
      headStyles: { fillColor: [29, 104, 182], textColor: 255, fontStyle: 'bold', halign: 'center' },
      alternateRowStyles: { fillColor: [248, 250, 252] },
      columnStyles: { 0: { halign: 'center' }, 1: { halign: 'center' } },
    });

    const pageCount = doc.internal.getNumberOfPages();
    for (let i = 1; i <= pageCount; i++) {
      doc.setPage(i);
      doc.setFontSize(7);
      doc.setTextColor(148, 163, 184);
      doc.text(
        `FinanSystem — Simulación referencial (Compra Inteligente). Pág. ${i}/${pageCount}`,
        pageW / 2,
        doc.internal.pageSize.getHeight() - 5,
        { align: 'center' }
      );
    }

    doc.save('simulacion_compra_inteligente.pdf');
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
                <label>Cliente</label>
                <select required value={clienteId} onChange={(e) => setClienteId(e.target.value)}>
                  <option value="">Selecciona un cliente</option>
                  {clientes.map(c => (
                    <option key={c.id} value={c.id}>{c.nombre_completo} (DNI {c.dni})</option>
                  ))}
                </select>
              </div>
              <div className="form-group">
                <label>Vehículo</label>
                <select required value={vehiculoId} onChange={handleVehiculoChange}>
                  <option value="">Selecciona un vehículo</option>
                  {vehiculos.map(v => (
                    <option key={v.id} value={v.id}>{v.marca} {v.modelo}{v.moneda === 'Dólares (US$)' ? ' (US$)' : ''}</option>
                  ))}
                </select>
              </div>
              <div className="form-group">
                <label>Entidad Financiera</label>
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
                <label>Precio de venta del activo — PV ({currencySymbol})</label>
                <input type="number" readOnly value={precioVehiculo} />
              </div>
              <div className="form-group">
                <label>Moneda</label>
                <select value={moneda} onChange={handleMonedaChange} disabled={monedaBloqueada}>
                  <option value="Soles (S/)">Soles (S/)</option>
                  <option value="Dólares (US$)">Dólares (US$)</option>
                </select>
                {monedaBloqueada && <span className="help-text">Definida por la moneda del vehículo seleccionado</span>}
              </div>

              <div className="form-group">
                <label>% Cuota inicial — pCI</label>
                <div className="input-with-addon">
                  <input type="number" step="0.01" min="0" max="99" value={pctCuotaInicial} onChange={(e) => setPctCuotaInicial(e.target.value)} />
                  <span className="addon">{currencySymbol} {fmt(montoCuotaInicial)}</span>
                </div>
              </div>
              <div className="form-group">
                <label>% Cuota final (cuotón) — pCF</label>
                <div className="input-with-addon">
                  <input type="number" step="0.01" min="0" max="99" value={porcentajeCuotaFinal} onChange={(e) => setPorcentajeCuotaFinal(e.target.value)} />
                  <span className="addon">{currencySymbol} {fmt(montoCuotaFinal)}</span>
                </div>
                <span className="help-text">Se paga un mes después de la última cuota (mes N+1)</span>
              </div>

              <div className="form-group">
                <label>Tipo de tasa de interés</label>
                <select value={tipoTasa} onChange={(e) => setTipoTasa(e.target.value)}>
                  <option value="Efectiva Anual (TEA)">Efectiva Anual (TEA)</option>
                  <option value="Nominal Anual (TNA)">Nominal Anual (TNA)</option>
                </select>
              </div>
              <div className="form-group">
                <label>Tasa de interés (%)</label>
                <div className="input-with-addon">
                  <input type="number" step="0.0001" required value={tasaInteres} onChange={(e) => setTasaInteres(e.target.value)} />
                  <span className="addon">%</span>
                </div>
              </div>

              <div className="form-group">
                <label>Periodo de capitalización (solo TNA)</label>
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
              <div className="form-group">
                <label>Plazo — N (meses)</label>
                <div className="input-with-addon">
                  <input type="number" required min="1" value={plazo} onChange={(e) => setPlazo(e.target.value)} />
                  <span className="addon">{plazo ? `${(parseInt(plazo) / 12).toFixed(1)} años` : '—'}</span>
                </div>
                <span className="help-text">Frecuencia de pago: 30 días · Año de 360 días · 12 cuotas/año</span>
              </div>

              <div className="form-group">
                <label>Gracia Total — T (meses)</label>
                <input type="number" min="0" value={graciaTotal} onChange={(e) => setGraciaTotal(e.target.value)} />
                <span className="help-text">Sin cuota; el interés se capitaliza</span>
              </div>
              <div className="form-group">
                <label>Gracia Parcial — P (meses)</label>
                <input type="number" min="0" value={graciaParcial} onChange={(e) => setGraciaParcial(e.target.value)} />
                <span className="help-text">Paga solo interés y seguros; el saldo no cambia</span>
              </div>
            </div>
          </div>

          <div className="section-card">
            <div className="section-title"><span className="circle-number">3</span> Seguros</div>
            <div className="form-grid">
              <div className="form-group">
                <label>% Seguro de desgravamen — pSegDes</label>
                <div style={{display: 'flex', gap: '0.5rem'}}>
                  <input type="number" step="0.001" min="0" style={{flex: 1}} value={seguroDesgravamen} onChange={(e) => setSeguroDesgravamen(e.target.value)} />
                  <select style={{width: '110px'}} value={periodoSegDes} onChange={(e) => setPeriodoSegDes(e.target.value)}>
                    <option value="Anual">Anual</option>
                    <option value="Mensual">Mensual</option>
                  </select>
                </div>
                <span className="help-text">Sobre el saldo deudor. Ej: 0.049% mensual (= 0.588% anual)</span>
              </div>
              <div className="form-group">
                <label>% Seguro de riesgo — pSegRie (% anual)</label>
                <input type="number" step="0.001" min="0" value={seguroRiesgo} onChange={(e) => setSeguroRiesgo(e.target.value)} />
                <span className="help-text">Seguro vehicular contra todo riesgo, sobre el precio del vehículo</span>
              </div>
            </div>
          </div>

          <div className="section-card">
            <div className="section-title"><span className="circle-number">4</span> Costes/Gastos iniciales (se financian en el préstamo)</div>
            <div className="form-grid-3">
              <div className="form-group">
                <label>Costes Notariales ({currencySymbol})</label>
                <input type="number" step="0.01" min="0" value={costesNotariales} onChange={(e) => setCostesNotariales(e.target.value)} />
              </div>
              <div className="form-group">
                <label>Costes Registrales ({currencySymbol})</label>
                <input type="number" step="0.01" min="0" value={costesRegistrales} onChange={(e) => setCostesRegistrales(e.target.value)} />
              </div>
              <div className="form-group">
                <label>Tasación ({currencySymbol})</label>
                <input type="number" step="0.01" min="0" value={tasacion} onChange={(e) => setTasacion(e.target.value)} />
              </div>
              <div className="form-group">
                <label>Comisión de estudio ({currencySymbol})</label>
                <input type="number" step="0.01" min="0" value={comisionEstudio} onChange={(e) => setComisionEstudio(e.target.value)} />
              </div>
              <div className="form-group">
                <label>Comisión de activación ({currencySymbol})</label>
                <input type="number" step="0.01" min="0" value={comisionActivacion} onChange={(e) => setComisionActivacion(e.target.value)} />
              </div>
            </div>
            <div style={{marginTop: '1rem', color: '#1d68b6', fontWeight: '600', fontSize: '0.9rem'}}>
              Total Gastos Iniciales: {currencySymbol} {fmt(getTotalGastos())} (se suman al monto del préstamo)
            </div>
          </div>

          <div className="section-card">
            <div className="section-title"><span className="circle-number">5</span> Costes/Gastos periódicos y COK</div>
            <div className="form-grid">
              <div className="form-group">
                <label>GPS ({currencySymbol} mensual)</label>
                <input type="number" step="0.01" min="0" value={gpsMensual} onChange={(e) => setGpsMensual(e.target.value)} />
              </div>
              <div className="form-group">
                <label>Portes ({currencySymbol} mensual)</label>
                <input type="number" step="0.01" min="0" value={portesMensual} onChange={(e) => setPortesMensual(e.target.value)} />
              </div>
              <div className="form-group">
                <label>Gastos de Administración ({currencySymbol} mensual)</label>
                <input type="number" step="0.01" min="0" value={gastosAdmMensual} onChange={(e) => setGastosAdmMensual(e.target.value)} />
              </div>
              <div className="form-group">
                <label>Tasa de descuento — COK (% anual)</label>
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
          <div className="section-card" style={{flex: 1}}>
            <h3 style={{fontSize: '1.1rem', marginBottom: '1.5rem', color: '#1e293b'}}>Resultados del financiamiento</h3>

            <div className="resultados-grid">
              <div className="resultado-box">
                <h4>Cuota mensual total</h4>
                <div className="val">{resultado ? `${currencySymbol} ${fmt(resultado.cuotaMensual)}` : '--'}</div>
              </div>
              <div className="resultado-box">
                <h4>Cuotón final (CF)</h4>
                <div className="val">{resultado ? `${currencySymbol} ${fmt(resultado.cuotaFinal)}` : '--'}</div>
              </div>
              <div className="resultado-box">
                <h4>TEA</h4>
                <div className="val">{resultado ? `${fmt(resultado.tea, 4)} %` : '--'}</div>
              </div>
              <div className="resultado-box">
                <h4>TEM</h4>
                <div className="val">{resultado ? `${fmt(resultado.tem, 4)} %` : '--'}</div>
              </div>
              <div className="resultado-box">
                <h4>TIR mensual</h4>
                <div className="val">{resultado ? `${fmt(resultado.tirMensual, 4)} %` : '--'}</div>
              </div>
              <div className="resultado-box">
                <h4>TCEA</h4>
                <div className="val">{resultado ? `${fmt(resultado.tcea, 4)} %` : '--'}</div>
              </div>
              <div className="resultado-box">
                <h4>{resultado ? `VAN (COK ${resultado.cokAnual}%)` : 'VAN'}</h4>
                <div className="val">{resultado ? `${currencySymbol} ${fmt(resultado.van)}` : '--'}</div>
              </div>
              <div className="resultado-box">
                <h4>TIR / COKi periodo</h4>
                <div className="val" style={{fontSize: '0.95rem'}}>{resultado ? `${fmt(resultado.tirMensual, 3)}% / ${fmt(resultado.cokMensual, 3)}%` : '--'}</div>
              </div>
            </div>

            {resultado && (
              <div className="detalle-financiamiento">
                <div><span>Cuota inicial (CI)</span><strong>{currencySymbol} {fmt(resultado.cuotaInicial)}</strong></div>
                <div><span>Monto del préstamo</span><strong>{currencySymbol} {fmt(resultado.prestamo)}</strong></div>
                <div><span>Saldo a financiar con cuotas</span><strong>{currencySymbol} {fmt(resultado.saldoRegularInicial)}</strong></div>
                <div><span>VP del cuotón</span><strong>{currencySymbol} {fmt(resultado.saldoCuotonInicial)}</strong></div>
                <div><span>Nº cuotas por año (NCxA)</span><strong>{resultado.ncxa}</strong></div>
                <div><span>Nº total de cuotas (N)</span><strong>{resultado.totalCuotas}{resultado.totalPeriodos > resultado.totalCuotas ? ` + cuotón en mes ${resultado.totalPeriodos}` : ''}</strong></div>
                <div><span>% Seg. desgravamen periódico</span><strong>{fmt(resultado.pSegDesPer, 4)} %</strong></div>
                <div><span>Seguro riesgo periódico</span><strong>{currencySymbol} {fmt(resultado.segRiePer)}</strong></div>
                <div><span>Cuota francesa (inc. SegDes)</span><strong>{currencySymbol} {fmt(resultado.cuotaRegular)}</strong></div>
                <div><span>Tasa de descuento periódica (COKi)</span><strong>{fmt(resultado.cokMensual, 5)} %</strong></div>
              </div>
            )}

            <h3 style={{fontSize: '1.1rem', margin: '2rem 0 1rem', color: '#1e293b'}}>Cronograma de pagos</h3>
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
                    <tr><td colSpan="18" style={{padding: '2rem'}}>Realiza una simulación para ver el cronograma</td></tr>
                  ) : (
                    <>
                      <tr className="fila-cero">
                        <td>0</td>
                        <td colSpan="16" style={{textAlign: 'left', color: '#64748b'}}>Desembolso del préstamo</td>
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

            <div style={{display: 'flex', alignItems: 'center', gap: '0.5rem', marginTop: '2rem', marginBottom: '1rem', color: '#1d68b6', fontWeight: 'bold'}}>
              <span className="circle-number" style={{width: '20px', height: '20px', fontSize: '0.75rem'}}>6</span>
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
                <div className="desglose-label"><Info size={16}/> {label}</div>
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
                DURANTE<br/>
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
          <button className="btn-secondary" onClick={handleSave} style={{display: 'flex', alignItems: 'center', gap: '0.5rem'}}>
            <Save size={18} /> Guardar simulación
          </button>
          <button className="btn-secondary" style={{display: 'flex', alignItems: 'center', gap: '0.5rem'}} onClick={handleExport}>
            <Download size={18} /> Exportar
          </button>
        </div>
      </div>
    </div>
  );
}
