/**
 * Convert TEA to TEM (mes de 30 días, año de 360 días)
 */
export const teaToTem = (tea) => {
  return Math.pow(1 + tea, 30 / 360) - 1;
};

/**
 * Convert TNA to TEM directly if monthly cap, otherwise TNA -> TEA -> TEM
 */
export const tnaToTem = (tna, m) => {
  if (m === 12) {
    return tna / 12;
  }
  const tea = Math.pow(1 + tna / m, m) - 1;
  return teaToTem(tea);
};

export const getCapitalizacionFrecuencia = (cap) => {
  switch (cap) {
    case 'Diario': return 360;
    case 'Mensual': return 12;
    case 'Bimestral': return 6;
    case 'Trimestral': return 4;
    case 'Cuatrimestral': return 3;
    case 'Semestral': return 2;
    case 'Anual': return 1;
    default: return 12;
  }
};

/**
 * Plan de pagos - Compra Inteligente (método francés vencido ordinario,
 * meses de 30 días / año de 360 días).
 *
 * El préstamo se separa en dos saldos:
 *  - Saldo regular ("Saldo a financiar con cuotas"): se amortiza con cuota
 *    francesa (tasa TEM + desgravamen) durante los meses sin gracia.
 *  - Saldo cuotón (CF): valor presente de la cuota final descontado a N+1
 *    periodos; crece cada mes con interés + desgravamen y se paga completo
 *    (su valor nominal CF) en el mes N+1.
 *
 * Gracia total (T): cuota 0, solo el interés capitaliza; el cliente paga
 * desgravamen, seguro de riesgo y costos fijos del mes.
 * Gracia parcial (P): cuota = interés; el saldo no cambia.
 */
export const calcularCronograma = ({
  precioVehiculo,
  cuotaInicial,                 // monto en la moneda de la operación
  porcentajeCuotaFinal = 0,     // % del precio del vehículo (cuotón)
  tasaInteres,                  // %
  tipoTasa,                     // 'Efectiva Anual (TEA)' | 'Nominal Anual (TNA)'
  capitalizacion,
  plazo,                        // N meses
  graciaTotal = 0,              // meses tipo T
  graciaParcial = 0,            // meses tipo P (después de los T)
  seguroDesgravamen = 0,        // %
  periodoSeguroDesgravamen = 'Anual', // 'Anual' (se divide /12) | 'Mensual'
  seguroVehiculoAnual = 0,      // % anual sobre el precio del vehículo (seguro de riesgo)
  gastosIniciales = 0,          // financiados dentro del préstamo
  gpsMensual = 0,
  portesMensual = 0,
  gastosAdmMensual = 0,
  cokAnual = 50,                // % anual, tasa de descuento del VAN
}) => {

  // 1. Tasas del periodo
  let tem;
  if (tipoTasa === 'Efectiva Anual (TEA)') {
    tem = teaToTem(tasaInteres / 100);
  } else {
    tem = tnaToTem(tasaInteres / 100, getCapitalizacionFrecuencia(capitalizacion));
  }
  const tea = Math.pow(1 + tem, 12) - 1;

  const pSegDes = periodoSeguroDesgravamen === 'Anual'
    ? (seguroDesgravamen / 100) / 12
    : seguroDesgravamen / 100;
  const iCuota = tem + pSegDes; // tasa de la cuota: incluye el desgravamen
  const segRiePer = precioVehiculo * ((seguroVehiculoAnual || 0) / 100) / 12;
  const gps = Number(gpsMensual) || 0;
  const portes = Number(portesMensual) || 0;
  const gasAdm = Number(gastosAdmMensual) || 0;
  const costosFijos = gps + portes + gasAdm;

  // 2. Préstamo y separación de saldos
  const N = plazo;
  const cuotaFinal = precioVehiculo * ((porcentajeCuotaFinal || 0) / 100);
  const prestamo = precioVehiculo - cuotaInicial + gastosIniciales;
  const saldoCuotonInicial = cuotaFinal > 0 ? cuotaFinal / Math.pow(1 + iCuota, N + 1) : 0;
  const saldoRegularInicial = prestamo - saldoCuotonInicial;

  const mesesConCuota = N - graciaTotal - graciaParcial;
  const totalPeriodos = cuotaFinal > 0 ? N + 1 : N;

  // 3. Cronograma y flujos del deudor (mes 0 positivo, pagos negativos)
  const cronograma = [];
  const flujos = [prestamo];
  let saldo = saldoRegularInicial;
  let saldoCuoton = saldoCuotonInicial;
  let cuotaRegular = 0;

  for (let t = 1; t <= totalPeriodos; t++) {
    const esGraciaTotal = t <= graciaTotal;
    const esGraciaParcial = !esGraciaTotal && t <= graciaTotal + graciaParcial;
    const esPeriodoCuoton = t === N + 1;

    // Bloque cuotón: crece con interés + desgravamen; se paga (CF) en el mes N+1
    const siCuoton = saldoCuoton;
    let iCuoton = 0;
    let segDesCuoton = 0;
    let amortCuoton = 0;
    let pagoCuoton = 0;
    if (saldoCuoton > 0) {
      iCuoton = siCuoton * tem;
      segDesCuoton = siCuoton * pSegDes;
      saldoCuoton = siCuoton + iCuoton + segDesCuoton;
      if (esPeriodoCuoton) {
        pagoCuoton = saldoCuoton; // = CF nominal
        amortCuoton = pagoCuoton;
        saldoCuoton = 0;
      }
    }

    // Bloque regular
    const saldoInicial = esPeriodoCuoton ? 0 : saldo;
    let interes = saldo * tem;
    let segDes = saldo * pSegDes;
    let cuota = 0;
    let amortizacion = 0;
    let pagoMes;

    if (esPeriodoCuoton) {
      interes = 0;
      segDes = 0;
      pagoMes = pagoCuoton + segRiePer + costosFijos;
    } else if (esGraciaTotal) {
      cuota = 0;
      saldo = saldo + interes; // solo el interés capitaliza
      pagoMes = segDes + segRiePer + costosFijos;
    } else if (esGraciaParcial) {
      cuota = interes; // paga solo el interés, el saldo no cambia
      pagoMes = interes + segDes + segRiePer + costosFijos;
    } else {
      if (!cuotaRegular) {
        cuotaRegular = saldo * (iCuota * Math.pow(1 + iCuota, mesesConCuota)) / (Math.pow(1 + iCuota, mesesConCuota) - 1);
      }
      cuota = cuotaRegular; // incluye el desgravamen (tasa iCuota)
      amortizacion = cuota - interes - segDes;
      saldo = saldo - amortizacion;
      if (t === N && Math.abs(saldo) < 0.01) saldo = 0;
      pagoMes = cuota + segRiePer + costosFijos; // desgravamen ya va dentro de la cuota
    }

    cronograma.push({
      periodo: t,
      gracia: esPeriodoCuoton ? 'S' : esGraciaTotal ? 'T' : esGraciaParcial ? 'P' : 'S',
      esPeriodoCuoton,
      // Bloque cuotón (columnas SICF / ICF / ACF / SegDesCF / SFCF del Excel)
      siCuoton,
      iCuoton,
      amortCuoton,
      segDesCuoton,
      sfCuoton: saldoCuoton,
      // Bloque regular (SI / I / Cuota / A / SegDes / SF)
      saldoInicial,
      interes,
      cuota,
      amortizacion,
      seguroDesgravamen: segDes,
      saldo: Math.max(0, saldo),
      // Costes de operación (SegRie / GPS / Portes / GasAdm)
      seguroVehicular: segRiePer,
      gps,
      portes,
      gastosAdm: gasAdm,
      costosFijos,
      saldoCuoton,
      flujo: -pagoMes,
    });

    flujos.push(-pagoMes);
  }

  // 4. Indicadores
  const tirPeriodica = calculateIRR(flujos, 0.01); // null si no converge
  const tirValida = tirPeriodica !== null;
  const tcea = tirValida ? (Math.pow(1 + tirPeriodica, 12) - 1) * 100 : null;

  const cokPct = Number.isFinite(Number(cokAnual)) && Number(cokAnual) > 0 ? Number(cokAnual) : 50;
  const cokMensual = Math.pow(1 + cokPct / 100, 30 / 360) - 1;
  const van = calculateNPV(cokMensual, flujos);

  const cuotaPromedioMes = cuotaRegular + segRiePer + costosFijos;

  // Totales por concepto (mismas definiciones del Excel)
  const totalSegDes = cronograma.reduce((acc, c) => acc + c.seguroDesgravamen, 0);
  const totalSegRie = segRiePer * totalPeriodos;

  return {
    cronograma,
    flujos,                                // incluye el mes 0 (= +Prestamo)
    prestamo,
    saldoRegularInicial,                   // "Saldo a financiar con cuotas"
    saldoCuotonInicial,
    cuotaInicial,                          // CI (monto)
    cuotaFinal,                            // CF (monto)
    tea: tea * 100,
    tem: tem * 100,
    ncxa: 12,                              // Nº cuotas por año (mes de 30 días)
    totalCuotas: N,                        // Nº total de cuotas N
    totalPeriodos,                         // N+1 si hay cuotón
    pSegDesPer: pSegDes * 100,             // % seguro desgravamen del periodo
    segRiePer,                             // seguro de riesgo del periodo (monto)
    cuotaMensual: cuotaPromedioMes,        // cuota + seguro riesgo + costos fijos
    cuotaRegular,                          // cuota francesa (incluye desgravamen)
    tirMensual: tirValida ? tirPeriodica * 100 : null, // null si Newton-Raphson no convergió
    tcea,                                  // null si tirMensual es null
    van,
    cokAnual: cokPct,
    cokMensual: cokMensual * 100,          // COKi (tasa de descuento del periodo)
    // Misma definición del Excel: suma de cuotas - amortización - desgravamen
    totalIntereses: cronograma.reduce((acc, c) => acc + (!c.esPeriodoCuoton ? c.cuota : 0) - c.amortizacion - c.seguroDesgravamen, 0),
    totalAmortizacion: cronograma.reduce((acc, c) => acc + c.amortizacion, 0) + cronograma.reduce((acc, c) => acc + c.amortCuoton, 0),
    totalSegDes,
    totalSegRie,
    totalGPS: gps * totalPeriodos,
    totalPortes: portes * totalPeriodos,
    totalGasAdm: gasAdm * totalPeriodos,
    totalSeguros: totalSegDes + totalSegRie,
    totalCostosFijos: costosFijos * totalPeriodos,
  };
};

function calculateNPV(rate, cashFlows) {
  // Flujos del deudor: mes 0 positivo (préstamo), pagos negativos.
  let npv = 0;
  for (let t = 0; t < cashFlows.length; t++) {
    npv += cashFlows[t] / Math.pow(1 + rate, t);
  }
  return npv;
}

// Devuelve la TIR periódica, o null si Newton-Raphson no converge a una tasa válida
function calculateIRR(cashFlows, guess = 0.01) {
  const maxTries = 1000;
  const epsilon = 1e-10;
  let rate = guess;

  for (let i = 0; i < maxTries; i++) {
    let npv = 0;
    let npvDerivative = 0;

    for (let t = 0; t < cashFlows.length; t++) {
      npv += cashFlows[t] / Math.pow(1 + rate, t);
      if (t > 0) {
        npvDerivative -= (t * cashFlows[t]) / Math.pow(1 + rate, t + 1);
      }
    }

    if (Math.abs(npvDerivative) < epsilon) return null;

    const newRate = rate - npv / npvDerivative;

    // Tasa por debajo de -100% (o no finita) no tiene sentido económico; evita seguir iterando sobre NaN/Infinity
    if (!Number.isFinite(newRate) || newRate <= -0.999999) return null;

    if (Math.abs(newRate - rate) < epsilon) {
      return newRate;
    }
    rate = newRate;
  }
  return null; // no convergió en maxTries iteraciones
}
