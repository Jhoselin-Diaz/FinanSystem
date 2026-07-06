import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

const fmt = (n, dec = 2) => (n ?? 0).toLocaleString('es-PE', { minimumFractionDigits: dec, maximumFractionDigits: dec });
// Para TIR/TCEA: pueden venir en null si Newton-Raphson no convergió (ver financialMath.js)
const fmtTir = (n, dec = 2) => (n === null ? 'No calculable' : `${fmt(n, dec)} %`);

/**
 * Genera el PDF del cronograma de pagos (Compra Inteligente).
 * `datos.resultado` debe ser la salida de calcularCronograma().
 */
export function exportCronogramaPDF(datos) {
  const {
    sym,
    clienteNombre, clienteDni, entidadNombre, vehiculoNombre,
    moneda,
    precioVehiculo,
    pctCuotaInicial, montoCuotaInicial, pctCuotaFinal,
    tipoTasa, tasaInteres, capitalizacion,
    plazo, graciaTotal, graciaParcial,
    seguroDesgravamen, periodoSegDes, seguroRiesgo,
    gpsMensual, portesMensual, gastosAdmMensual, gastosIniciales,
    resultado,
    fileName = 'simulacion_compra_inteligente.pdf',
  } = datos;

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
  row3col([['Cliente:', clienteNombre || '—'], ['DNI:', clienteDni || '—'], ['Entidad:', entidadNombre || '—']]);
  row3col([['Vehículo:', vehiculoNombre || '—'], ['Moneda:', moneda], ['Frecuencia de pago:', '30 días (360 días/año)']]);
  y += 2;

  sectionTitle('2. Datos del Crédito');
  row3col([
    ['Precio de venta (PV):', `${sym} ${fmt(precioVehiculo)}`],
    ['% Cuota inicial (pCI):', `${fmt(pctCuotaInicial, 2)} % = ${sym} ${fmt(montoCuotaInicial)}`],
    ['% Cuota final (pCF):', `${fmt(pctCuotaFinal, 2)} % = ${sym} ${fmt(resultado.cuotaFinal)}`],
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
    ['Seg. desgravamen:', `${seguroDesgravamen || 0} % ${(periodoSegDes || 'Anual').toLowerCase()} (per. ${fmt(resultado.pSegDesPer, 4)} %)`],
    ['Seg. riesgo:', `${seguroRiesgo || 0} % anual (${sym} ${fmt(resultado.segRiePer)} /mes)`],
    ['GPS / Portes / G.Adm:', `${sym} ${fmt(parseFloat(gpsMensual) || 0)} / ${fmt(parseFloat(portesMensual) || 0)} / ${fmt(parseFloat(gastosAdmMensual) || 0)} mensual`],
  ]);
  row3col([
    ['Gastos iniciales:', `${sym} ${fmt(gastosIniciales)} (financiados)`],
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
    { label: 'TIR Mensual', value: fmtTir(resultado.tirMensual, 4) },
    { label: 'TCEA', value: fmtTir(resultado.tcea, 4) },
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

  doc.save(fileName);
}
