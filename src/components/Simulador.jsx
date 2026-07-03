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
  const [cuotaInicial, setCuotaInicial] = useState('');
  
  const [tipoTasa, setTipoTasa] = useState('Efectiva Anual (TEA)');
  const [tasaInteres, setTasaInteres] = useState('');
  const [moneda, setMoneda] = useState('Soles (S/)');
  const [capitalizacion, setCapitalizacion] = useState('Mensual');
  const [plazo, setPlazo] = useState('');
  const [graciaTotal, setGraciaTotal] = useState('');
  const [graciaParcial, setGraciaParcial] = useState('');
  const [porcentajeCuotaFinal, setPorcentajeCuotaFinal] = useState('');

  const [seguroDesgravamen, setSeguroDesgravamen] = useState('');
  const [periodoSegDes, setPeriodoSegDes] = useState('Anual');
  const [seguroVehicular, setSeguroVehicular] = useState('');

  const [tasacion, setTasacion] = useState('');
  const [estudioTitulos, setEstudioTitulos] = useState('');
  const [notaria, setNotaria] = useState('');
  const [certificadoRegistro, setCertificadoRegistro] = useState('');
  const [impresionContrato, setImpresionContrato] = useState('');

  // Costos periódicos: afectan el flujo de caja, la TIR y la TCEA
  const [gpsMensual, setGpsMensual] = useState('');
  const [portesMensual, setPortesMensual] = useState('');
  const [gastosAdmMensual, setGastosAdmMensual] = useState('');
  const [cok, setCok] = useState('50');

  // Results State
  const [resultado, setResultado] = useState(null);

  useEffect(() => {
    const fetchData = async () => {
      const [resClientes, resVehiculos, resEntidades, resCfg] = await Promise.all([
        supabase.from('clientes').select('id, nombre_completo, dni'),
        supabase.from('vehiculos').select('id, marca, modelo, precio'),
        supabase.from('entidades_financieras').select('id, nombre, tea_soles_min, plazo_maximo, periodo_gracia_min'),
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
        setSeguroVehicular(cfg.seguro_vehiculo ?? '');
        setGastosAdmMensual(cfg.gastos_administrativos ?? '');
        if (cfg.plazo_maximo) setPlazo(cfg.plazo_maximo);
        if (cfg.periodo_gracia_max) setGraciaTotal(cfg.periodo_gracia_max);
      }
    };
    fetchData();
  }, []);

  const handleVehiculoChange = (e) => {
    const id = e.target.value;
    setVehiculoId(id);
    const veh = vehiculos.find(v => v.id.toString() === id);
    if (veh) {
      setPrecioVehiculo(veh.precio);
    } else {
      setPrecioVehiculo('');
    }
  };

  const handleEntidadChange = (e) => {
    const id = e.target.value;
    setEntidadId(id);
    const ent = entidades.find(ent => ent.id === id);
    if (ent) {
      setTasaInteres(ent.tea_soles_min);
      setPlazo(ent.plazo_maximo);
      setGraciaTotal(ent.periodo_gracia_min);
    } else {
      setTasaInteres('');
      setPlazo('');
      setGraciaTotal('');
    }
  };

  const getTotalGastos = () => {
    return (parseFloat(tasacion) || 0) + 
           (parseFloat(estudioTitulos) || 0) + 
           (parseFloat(notaria) || 0) + 
           (parseFloat(certificadoRegistro) || 0) + 
           (parseFloat(impresionContrato) || 0);
  };

  const handleCalculate = (e) => {
    e.preventDefault();
    if (!precioVehiculo || !tasaInteres || !plazo) {
      alert("Por favor completa los datos básicos (Precio, Tasa y Plazo)");
      return;
    }

    const result = calcularCronograma({
      precioVehiculo: parseFloat(precioVehiculo),
      cuotaInicial: parseFloat(cuotaInicial) || 0,
      porcentajeCuotaFinal: parseFloat(porcentajeCuotaFinal) || 0,
      tasaInteres: parseFloat(tasaInteres),
      tipoTasa,
      capitalizacion,
      plazo: parseInt(plazo),
      graciaTotal: parseInt(graciaTotal) || 0,
      graciaParcial: parseInt(graciaParcial) || 0,
      seguroDesgravamen: parseFloat(seguroDesgravamen) || 0,
      periodoSeguroDesgravamen: periodoSegDes,
      seguroVehiculoAnual: parseFloat(seguroVehicular) || 0,
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

    try {
      const { error } = await supabase.from('simulaciones').insert([{
        cliente_id: clienteId,
        vehiculo_id: parseInt(vehiculoId),
        entidad_id: entidadId,
        precio_vehiculo: parseFloat(precioVehiculo),
        cuota_inicial: parseFloat(cuotaInicial) || 0,
        tipo_tasa: tipoTasa,
        tasa_interes: parseFloat(tasaInteres),
        capitalizacion: tipoTasa === 'Nominal Anual (TNA)' ? capitalizacion : null,
        moneda: moneda,
        plazo: parseInt(plazo),
        periodo_gracia: (parseInt(graciaTotal) || 0) + (parseInt(graciaParcial) || 0),
        tipo_gracia: `T:${parseInt(graciaTotal) || 0} P:${parseInt(graciaParcial) || 0}`,
        seguro_desgravamen: parseFloat(seguroDesgravamen) || 0,
        seguro_vehicular: parseFloat(seguroVehicular) || 0,
        gastos_iniciales: getTotalGastos(),
        cuota_mensual: resultado.cuotaMensual,
        tcea: resultado.tcea,
        van: resultado.van,
        tir: resultado.tirMensual
      }]);

      if (error) throw error;

      // Fire notification
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

  const handleExport = () => {
    if (!resultado) {
      alert("Primero calcula una simulación antes de exportar.");
      return;
    }

    const clienteObj = clientes.find(c => c.id === clienteId);
    const vehiculoObj = vehiculos.find(v => v.id.toString() === vehiculoId.toString());
    const entidadObj  = entidades.find(e => e.id === entidadId);

    const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
    const pageW = doc.internal.pageSize.getWidth();
    const margin = 14;

    // ── Header band ──────────────────────────────────────────────
    doc.setFillColor(29, 104, 182);
    doc.rect(0, 0, pageW, 28, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(16);
    doc.setFont('helvetica', 'bold');
    doc.text('FinanSystem', margin, 12);
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.text('Simulador de Crédito Vehicular', margin, 19);
    doc.setFontSize(9);
    doc.text(`Generado: ${new Date().toLocaleDateString('es-PE')}`, pageW - margin, 19, { align: 'right' });

    // ── Section helper ────────────────────────────────────────────
    let y = 36;
    const sectionTitle = (title) => {
      doc.setFillColor(239, 246, 255);
      doc.rect(margin, y, pageW - margin * 2, 7, 'F');
      doc.setTextColor(29, 104, 182);
      doc.setFontSize(9);
      doc.setFont('helvetica', 'bold');
      doc.text(title, margin + 2, y + 5);
      doc.setTextColor(30, 41, 59);
      doc.setFont('helvetica', 'normal');
      y += 10;
    };

    const row2col = (label1, val1, label2, val2) => {
      doc.setFontSize(8);
      doc.setTextColor(100, 116, 139);
      doc.text(label1, margin, y);
      doc.setTextColor(30, 41, 59);
      doc.setFont('helvetica', 'bold');
      doc.text(String(val1), margin + 42, y);
      if (label2) {
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(100, 116, 139);
        doc.text(label2, pageW / 2, y);
        doc.setTextColor(30, 41, 59);
        doc.setFont('helvetica', 'bold');
        doc.text(String(val2 ?? '—'), pageW / 2 + 42, y);
      }
      doc.setFont('helvetica', 'normal');
      y += 6;
    };

    // ── Section 1: Datos principales ─────────────────────────────
    sectionTitle('1. Datos Principales');
    row2col('Cliente:', clienteObj?.nombre_completo || '—', 'DNI:', clienteObj?.dni || '—');
    row2col('Vehículo:', vehiculoObj ? `${vehiculoObj.marca} ${vehiculoObj.modelo}` : '—', 'Entidad:', entidadObj?.nombre || '—');
    y += 3;

    // ── Section 2: Configuración ──────────────────────────────────
    sectionTitle('2. Configuración del Crédito');
    row2col('Precio vehículo:', `S/ ${parseFloat(precioVehiculo).toFixed(2)}`, 'Cuota inicial:', `S/ ${parseFloat(cuotaInicial || 0).toFixed(2)} (${pctInicial} %)`);
    row2col('Cuota final (cuotón):', `${porcentajeCuotaFinal || 0} % = S/ ${resultado.cuotaFinal.toFixed(2)}`, 'Monto del préstamo:', `S/ ${resultado.prestamo.toFixed(2)}`);
    row2col('Tipo de tasa:', tipoTasa, 'Tasa de interés:', `${tasaInteres} %`);
    row2col('Moneda:', moneda, 'Capitalización:', capitalizacion);
    row2col('Plazo:', `${plazo} meses`, 'Gracia:', `Total: ${graciaTotal || 0} / Parcial: ${graciaParcial || 0} meses`);
    row2col('Seguro Desgravamen:', `${seguroDesgravamen || 0} % ${periodoSegDes.toLowerCase()}`, 'Seguro Vehicular:', `${seguroVehicular || 0} % anual`);
    row2col('Gastos Iniciales (financiados):', `S/ ${getTotalGastos().toFixed(2)}`, 'GPS / Portes / G.Adm:', `S/ ${(parseFloat(gpsMensual) || 0).toFixed(2)} / ${(parseFloat(portesMensual) || 0).toFixed(2)} / ${(parseFloat(gastosAdmMensual) || 0).toFixed(2)} mensual`);
    row2col('COK (VAN):', `${resultado.cokAnual} % anual`, 'Saldo regular / VP cuotón:', `S/ ${resultado.saldoRegularInicial.toFixed(2)} / ${resultado.saldoCuotonInicial.toFixed(2)}`);
    y += 3;

    // ── Section 3: Resultados ─────────────────────────────────────
    sectionTitle('3. Resultados de la Simulación');

    // Result cards as a row
    const cards = [
      { label: 'Cuota Mensual', value: `S/ ${resultado.cuotaMensual.toFixed(2)}` },
      { label: 'Cuotón Final', value: `S/ ${resultado.cuotaFinal.toFixed(2)}` },
      { label: 'TEM', value: `${resultado.tem.toFixed(4)} %` },
      { label: 'TIR Mensual', value: `${resultado.tirMensual.toFixed(4)} %` },
      { label: 'TCEA', value: `${resultado.tcea.toFixed(4)} %` },
      { label: `VAN (COK ${resultado.cokAnual}%)`, value: `S/ ${resultado.van.toFixed(2)}` },
    ];
    const cardW = (pageW - margin * 2) / cards.length;
    cards.forEach((card, i) => {
      const cx = margin + i * cardW;
      doc.setFillColor(224, 242, 254);
      doc.roundedRect(cx, y, cardW - 2, 14, 2, 2, 'F');
      doc.setTextColor(100, 116, 139);
      doc.setFontSize(7);
      doc.setFont('helvetica', 'normal');
      doc.text(card.label, cx + (cardW - 2) / 2, y + 4.5, { align: 'center' });
      doc.setTextColor(29, 104, 182);
      doc.setFontSize(8);
      doc.setFont('helvetica', 'bold');
      doc.text(card.value, cx + (cardW - 2) / 2, y + 10.5, { align: 'center' });
    });
    doc.setFont('helvetica', 'normal');
    y += 19;

    // Desglose
    const totalPago = resultado.cronograma.reduce((acc, c) => acc - c.flujo, 0);
    row2col('Total Intereses:', `S/ ${resultado.totalIntereses.toFixed(2)}`, 'Total Seguros:', `S/ ${resultado.totalSeguros.toFixed(2)}`);
    row2col('Total Amortización:', `S/ ${resultado.totalAmortizacion.toFixed(2)}`, 'Total Costos Periódicos:', `S/ ${resultado.totalCostosFijos.toFixed(2)}`);
    row2col('Monto Total a Pagar:', `S/ ${totalPago.toFixed(2)}`, '', '');
    y += 4;

    // ── Section 4: Cronograma ─────────────────────────────────────
    sectionTitle('4. Cronograma de Pagos');

    const tableRows = resultado.cronograma.map(c => [
      c.periodo,
      c.gracia,
      c.cuota.toFixed(2),
      c.interes.toFixed(2),
      c.amortizacion.toFixed(2),
      c.seguroDesgravamen.toFixed(2),
      c.seguroVehicular.toFixed(2),
      c.costosFijos.toFixed(2),
      c.saldo.toFixed(2),
      c.saldoCuoton.toFixed(2),
      c.flujo.toFixed(2)
    ]);

    autoTable(doc, {
      startY: y,
      head: [['N°', 'P.G.', 'Cuota', 'Interés', 'Amort.', 'Seg.Desg.', 'Seg.Veh.', 'Costos', 'Saldo Reg.', 'Saldo Cuotón', 'Flujo']],
      body: tableRows,
      margin: { left: margin, right: margin },
      styles: { fontSize: 6.5, cellPadding: 1.5 },
      headStyles: { fillColor: [29, 104, 182], textColor: 255, fontStyle: 'bold' },
      alternateRowStyles: { fillColor: [248, 250, 252] },
      columnStyles: { 0: { halign: 'center' }, 1: { halign: 'center' } },
    });

    // Footer
    const pageCount = doc.internal.getNumberOfPages();
    for (let i = 1; i <= pageCount; i++) {
      doc.setPage(i);
      doc.setFontSize(7.5);
      doc.setTextColor(148, 163, 184);
      doc.text(
        `FinanSystem — Simulación referencial. Pág. ${i}/${pageCount}`,
        pageW / 2,
        doc.internal.pageSize.getHeight() - 6,
        { align: 'center' }
      );
    }

    doc.save('simulacion_credito_vehicular.pdf');
  };

  const pctInicial = precioVehiculo && cuotaInicial ? ((parseFloat(cuotaInicial) / parseFloat(precioVehiculo)) * 100).toFixed(2) : "0.00";
  const montoCuotaFinal = precioVehiculo && porcentajeCuotaFinal ? (parseFloat(precioVehiculo) * parseFloat(porcentajeCuotaFinal) / 100).toFixed(2) : "0.00";

  return (
    <div className="simulador-container">
      <div className="simulador-header">
        <h1>Simulador de Crédito Vehicular</h1>
        <p>Calcula y analiza tu crédito vehicular de forma rápida y precisa.</p>
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
                    <option key={v.id} value={v.id}>{v.marca} {v.modelo}</option>
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
            <div className="section-title"><span className="circle-number">2</span> Configuración del crédito</div>
            <div className="form-grid">
              <div className="form-group">
                <label>Valor de vehículo (S/)</label>
                <input type="number" readOnly value={precioVehiculo} />
              </div>
              <div className="form-group">
                <label>Cuota inicial (S/)</label>
                <div className="input-with-addon">
                  <input type="number" step="0.01" value={cuotaInicial} onChange={(e) => setCuotaInicial(e.target.value)} />
                  <span className="addon">{pctInicial} %</span>
                </div>
              </div>

              <div className="form-group">
                <label>Cuota final / Cuotón (% del precio)</label>
                <div className="input-with-addon">
                  <input type="number" step="0.01" min="0" value={porcentajeCuotaFinal} onChange={(e) => setPorcentajeCuotaFinal(e.target.value)} />
                  <span className="addon">S/ {montoCuotaFinal}</span>
                </div>
                <span className="help-text">Se paga al final del crédito (Compra Inteligente)</span>
              </div>

              <div className="form-group">
                <label>Tipo de tasa</label>
                <select value={tipoTasa} onChange={(e) => setTipoTasa(e.target.value)}>
                  <option value="Efectiva Anual (TEA)">Efectiva Anual (TEA)</option>
                  <option value="Nominal Anual (TNA)">Nominal Anual (TNA)</option>
                </select>
              </div>
              <div className="form-group">
                <label>% de tipo de tasa</label>
                <div className="input-with-addon">
                  <input type="number" step="0.01" required value={tasaInteres} onChange={(e) => setTasaInteres(e.target.value)} />
                  <span className="addon">%</span>
                </div>
              </div>

              <div className="form-group">
                <label>Moneda</label>
                <select value={moneda} onChange={(e) => setMoneda(e.target.value)}>
                  <option value="Soles (S/)">Soles (S/)</option>
                  <option value="Dólares ($)">Dólares ($)</option>
                </select>
              </div>
              <div className="form-group">
                <label>Capitalización (Solo para TNA)</label>
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
                <label>Plazo (meses)</label>
                <input type="number" required value={plazo} onChange={(e) => setPlazo(e.target.value)} />
              </div>
              <div className="form-group">
                <label>Gracia Total (meses)</label>
                <input type="number" min="0" value={graciaTotal} onChange={(e) => setGraciaTotal(e.target.value)} />
                <span className="help-text">Sin cuota; el interés se capitaliza</span>
              </div>
              <div className="form-group">
                <label>Gracia Parcial (meses)</label>
                <input type="number" min="0" value={graciaParcial} onChange={(e) => setGraciaParcial(e.target.value)} />
                <span className="help-text">Paga solo interés y seguros; el saldo no cambia</span>
              </div>
            </div>
          </div>

          <div className="section-card">
            <div className="section-title"><span className="circle-number">3</span> Seguros (Vehiculares)</div>
            <div className="form-grid">
              <div className="form-group">
                <label>Seguro de Desgravamen (%)</label>
                <div style={{display: 'flex', gap: '0.5rem'}}>
                  <input type="number" step="0.001" style={{flex: 1}} value={seguroDesgravamen} onChange={(e) => setSeguroDesgravamen(e.target.value)} />
                  <select style={{width: '110px'}} value={periodoSegDes} onChange={(e) => setPeriodoSegDes(e.target.value)}>
                    <option value="Anual">Anual</option>
                    <option value="Mensual">Mensual</option>
                  </select>
                </div>
                <span className="help-text">Sobre el saldo deudor. Ej: 0.588% anual = 0.049% mensual</span>
              </div>
              <div className="form-group">
                <label>Seguro de Vehículo (% anual)</label>
                <input type="number" step="0.01" value={seguroVehicular} onChange={(e) => setSeguroVehicular(e.target.value)} />
                <span className="help-text">Protege el vehículo ante siniestros o daños</span>
              </div>
            </div>
          </div>

          <div className="section-card">
            <div className="section-title"><span className="circle-number">4</span> Gastos Iniciales</div>
            <div className="form-grid-3">
              <div className="form-group">
                <label>Tasación (S/)</label>
                <input type="number" step="0.01" value={tasacion} onChange={(e) => setTasacion(e.target.value)} />
              </div>
              <div className="form-group">
                <label>Estudio de Títulos (S/)</label>
                <input type="number" step="0.01" value={estudioTitulos} onChange={(e) => setEstudioTitulos(e.target.value)} />
              </div>
              <div className="form-group">
                <label>Notaría (S/)</label>
                <input type="number" step="0.01" value={notaria} onChange={(e) => setNotaria(e.target.value)} />
              </div>
              <div className="form-group">
                <label>Certificado Vehicular (S/)</label>
                <input type="number" step="0.01" value={certificadoRegistro} onChange={(e) => setCertificadoRegistro(e.target.value)} />
              </div>
              <div className="form-group">
                <label>Impresión de Contrato (S/)</label>
                <input type="number" step="0.01" value={impresionContrato} onChange={(e) => setImpresionContrato(e.target.value)} />
              </div>
            </div>
            <div style={{marginTop: '1rem', color: '#1d68b6', fontWeight: '600', fontSize: '0.9rem'}}>
              Total Gastos Iniciales: S/ {getTotalGastos().toFixed(2)} (se financian dentro del préstamo)
            </div>
          </div>

          <div className="section-card">
            <div className="section-title"><span className="circle-number">5</span> Costos Periódicos y COK</div>
            <div className="form-grid">
              <div className="form-group">
                <label>GPS (S/ mensual)</label>
                <input type="number" step="0.01" value={gpsMensual} onChange={(e) => setGpsMensual(e.target.value)} />
              </div>
              <div className="form-group">
                <label>Portes (S/ mensual)</label>
                <input type="number" step="0.01" value={portesMensual} onChange={(e) => setPortesMensual(e.target.value)} />
              </div>
              <div className="form-group">
                <label>Gastos Administrativos (S/ mensual)</label>
                <input type="number" step="0.01" value={gastosAdmMensual} onChange={(e) => setGastosAdmMensual(e.target.value)} />
              </div>
              <div className="form-group">
                <label>COK (% anual)</label>
                <div className="input-with-addon">
                  <input type="number" step="0.01" value={cok} onChange={(e) => setCok(e.target.value)} />
                  <span className="addon">%</span>
                </div>
                <span className="help-text">Tasa de descuento para calcular el VAN</span>
              </div>
            </div>
          </div>

          <button type="submit" className="btn-calculate">
            <Calculator size={20} /> Calcular simulación
          </button>
        </form>

        <div className="right-panel">
          <div className="section-card" style={{flex: 1}}>
            <h3 style={{fontSize: '1.1rem', marginBottom: '1.5rem', color: '#1e293b'}}>Resultados de la simulación</h3>
            
            <div className="resultados-grid">
              <div className="resultado-box">
                <h4>Cuota mensual</h4>
                <div className="val">
                  {resultado ? `S/ ${resultado.cuotaMensual.toLocaleString('es-PE', {minimumFractionDigits:2, maximumFractionDigits:2})}` : '--'}
                </div>
              </div>
              <div className="resultado-box">
                <h4>Cuotón final</h4>
                <div className="val">
                  {resultado ? `S/ ${resultado.cuotaFinal.toLocaleString('es-PE', {minimumFractionDigits:2, maximumFractionDigits:2})}` : '--'}
                </div>
              </div>
              <div className="resultado-box">
                <h4>TEM</h4>
                <div className="val">
                  {resultado ? `${resultado.tem.toFixed(4)} %` : '--'}
                </div>
              </div>
              <div className="resultado-box">
                <h4>TIR mensual</h4>
                <div className="val">
                  {resultado ? `${resultado.tirMensual.toFixed(4)} %` : '--'}
                </div>
              </div>
              <div className="resultado-box">
                <h4>TCEA</h4>
                <div className="val">
                  {resultado ? `${resultado.tcea.toFixed(4)} %` : '--'}
                </div>
              </div>
              <div className="resultado-box">
                <h4>{resultado ? `VAN (COK ${resultado.cokAnual}%)` : 'VAN'}</h4>
                <div className="val">
                  {resultado ? `S/ ${resultado.van.toLocaleString('es-PE', {minimumFractionDigits:2, maximumFractionDigits:2})}` : '--'}
                </div>
              </div>
            </div>

            {resultado && (
              <div style={{marginTop: '1rem', fontSize: '0.85rem', color: '#475569'}}>
                Préstamo: <strong>S/ {resultado.prestamo.toLocaleString('es-PE', {minimumFractionDigits:2, maximumFractionDigits:2})}</strong>
                {' · '}Saldo regular: <strong>S/ {resultado.saldoRegularInicial.toLocaleString('es-PE', {minimumFractionDigits:2, maximumFractionDigits:2})}</strong>
                {' · '}VP cuotón: <strong>S/ {resultado.saldoCuotonInicial.toLocaleString('es-PE', {minimumFractionDigits:2, maximumFractionDigits:2})}</strong>
                {' · '}Cuota regular (sin costos): <strong>S/ {resultado.cuotaRegular.toLocaleString('es-PE', {minimumFractionDigits:2, maximumFractionDigits:2})}</strong>
              </div>
            )}

            <h3 style={{fontSize: '1.1rem', margin: '2rem 0 1rem', color: '#1e293b'}}>Cronograma de pagos</h3>
            <div className="cronograma-wrapper">
              <table className="cronograma-table">
                <thead>
                  <tr>
                    <th>Periodo</th>
                    <th>P.G.</th>
                    <th>Cuota</th>
                    <th>Interés</th>
                    <th>Amortización</th>
                    <th>Seg. Desg.</th>
                    <th>Seg. Veh.</th>
                    <th>Costos</th>
                    <th>Saldo regular</th>
                    <th>Saldo cuotón</th>
                    <th>Flujo</th>
                  </tr>
                </thead>
                <tbody>
                  {!resultado ? (
                    <tr><td colSpan="11" style={{padding: '2rem'}}>Realiza una simulación para ver el cronograma</td></tr>
                  ) : (
                    resultado.cronograma.map(c => (
                      <tr key={c.periodo}>
                        <td>{c.periodo}</td>
                        <td>{c.gracia}</td>
                        <td>{c.cuota.toLocaleString('es-PE', {minimumFractionDigits:2, maximumFractionDigits:2})}</td>
                        <td>{c.interes.toLocaleString('es-PE', {minimumFractionDigits:2, maximumFractionDigits:2})}</td>
                        <td>{c.amortizacion.toLocaleString('es-PE', {minimumFractionDigits:2, maximumFractionDigits:2})}</td>
                        <td>{c.seguroDesgravamen.toLocaleString('es-PE', {minimumFractionDigits:2, maximumFractionDigits:2})}</td>
                        <td>{c.seguroVehicular.toLocaleString('es-PE', {minimumFractionDigits:2, maximumFractionDigits:2})}</td>
                        <td>{c.costosFijos.toLocaleString('es-PE', {minimumFractionDigits:2, maximumFractionDigits:2})}</td>
                        <td>{c.saldo.toLocaleString('es-PE', {minimumFractionDigits:2, maximumFractionDigits:2})}</td>
                        <td>{c.saldoCuoton.toLocaleString('es-PE', {minimumFractionDigits:2, maximumFractionDigits:2})}</td>
                        <td>{c.flujo.toLocaleString('es-PE', {minimumFractionDigits:2, maximumFractionDigits:2})}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            <div style={{display: 'flex', alignItems: 'center', gap: '0.5rem', marginTop: '2rem', marginBottom: '1rem', color: '#1d68b6', fontWeight: 'bold'}}>
              <span className="circle-number" style={{width: '20px', height: '20px', fontSize: '0.75rem'}}>5</span>
              Desglose completo de todos los costos asociados
            </div>

            <div className="desglose-item">
              <div className="desglose-label"><Info size={16}/> Total Intereses</div>
              <div className="desglose-value">
                <strong>{resultado ? `S/ ${resultado.totalIntereses.toLocaleString('es-PE', {minimumFractionDigits:2, maximumFractionDigits:2})}` : '--'}</strong>
                <span>Costo del financiamiento</span>
              </div>
            </div>
            <div className="desglose-item">
              <div className="desglose-label"><Info size={16}/> Total Seguros</div>
              <div className="desglose-value">
                <strong>{resultado ? `S/ ${resultado.totalSeguros.toLocaleString('es-PE', {minimumFractionDigits:2, maximumFractionDigits:2})}` : '--'}</strong>
                <span>Desgravamen + Vehículo</span>
              </div>
            </div>
            <div className="desglose-item">
              <div className="desglose-label"><Info size={16}/> Total Amortización</div>
              <div className="desglose-value">
                <strong>{resultado ? `S/ ${resultado.totalAmortizacion.toLocaleString('es-PE', {minimumFractionDigits:2, maximumFractionDigits:2})}` : '--'}</strong>
                <span>Pago a capital (incluye cuotón)</span>
              </div>
            </div>
            <div className="desglose-item">
              <div className="desglose-label"><Info size={16}/> Total Costos Periódicos</div>
              <div className="desglose-value">
                <strong>{resultado ? `S/ ${resultado.totalCostosFijos.toLocaleString('es-PE', {minimumFractionDigits:2, maximumFractionDigits:2})}` : '--'}</strong>
                <span>GPS + Portes + Gastos Adm.</span>
              </div>
            </div>

            <div className="total-box">
              <div>
                <div className="total-label">Monto total a pagar</div>
                <div className="total-value">
                  {resultado ? `S/ ${resultado.cronograma.reduce((acc, c) => acc - c.flujo, 0).toLocaleString('es-PE', {minimumFractionDigits:2, maximumFractionDigits:2})}` : '--'}
                </div>
              </div>
              <div className="total-plazo">
                DURANTE<br/>
                <strong>{resultado ? resultado.cronograma.length : (plazo || '--')} meses</strong>
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
