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
 * Plan de pagos - Compra Inteligente (método francés vencido ordinario)
 *
 * El préstamo se separa en dos saldos:
 *  - Saldo regular: se amortiza con cuota francesa (tasa TEM + desgravamen)
 *    durante los meses sin gracia.
 *  - Saldo cuotón: valor presente de la cuota final, crece cada mes con
 *    interés + desgravamen y se paga completo en el mes N+1.
 *
 * Gracia total (T): cuota 0, solo el interés capitaliza; el cliente paga
 * desgravamen, seguro vehicular y costos fijos del mes.
 * Gracia parcial (P): cuota = interés; el saldo no cambia.
 */
export const calcularCronograma = ({
  precioVehiculo,
  cuotaInicial,                 // S/
  porcentajeCuotaFinal = 0,     // % del precio del vehículo (cuotón)
  tasaInteres,                  // %
  tipoTasa,                     // 'Efectiva Anual (TEA)' | 'Nominal Anual (TNA)'
  capitalizacion,
  plazo,                        // N meses
  graciaTotal = 0,              // meses tipo T
  graciaParcial = 0,            // meses tipo P (después de los T)
  seguroDesgravamen = 0,        // %
  periodoSeguroDesgravamen = 'Anual', // 'Anual' (se divide /12) | 'Mensual'
  seguroVehiculoAnual = 0,      // % anual sobre el precio del vehículo
  gastosIniciales = 0,          // S/ financiados dentro del préstamo
  gpsMensual = 0,               // S/ por mes
  portesMensual = 0,            // S/ por mes
  gastosAdmMensual = 0,         // S/ por mes
  cokAnual = 50,                // % anual, tasa de descuento del VAN
}) => {

  // 1. Tasas del periodo
  let tem;
  if (tipoTasa === 'Efectiva Anual (TEA)') {
    tem = teaToTem(tasaInteres / 100);
  } else {
    tem = tnaToTem(tasaInteres / 100, getCapitalizacionFrecuencia(capitalizacion));
  }

  const pSegDes = periodoSeguroDesgravamen === 'Anual'
    ? (seguroDesgravamen / 100) / 12
    : seguroDesgravamen / 100;
  const iCuota = tem + pSegDes; // tasa de la cuota: incluye el desgravamen
  const seguroVehMensual = precioVehiculo * ((seguroVehiculoAnual || 0) / 100) / 12;
  const costosFijos = (Number(gpsMensual) || 0) + (Number(portesMensual) || 0) + (Number(gastosAdmMensual) || 0);

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

    // Bloque cuotón: crece con interés + desgravamen; se paga en el mes N+1
    let pagoCuoton = 0;
    if (saldoCuoton > 0) {
      saldoCuoton = saldoCuoton * (1 + iCuota);
      if (esPeriodoCuoton) {
        pagoCuoton = saldoCuoton;
        saldoCuoton = 0;
      }
    }

    // Bloque regular
    let interes = saldo * tem;
    let segDes = saldo * pSegDes;
    let cuota = 0;
    let amortizacion = 0;
    let pagoMes;

    if (esPeriodoCuoton) {
      interes = 0;
      segDes = 0;
      pagoMes = pagoCuoton + seguroVehMensual + costosFijos;
    } else if (esGraciaTotal) {
      cuota = 0;
      saldo = saldo + interes; // solo el interés capitaliza
      pagoMes = segDes + seguroVehMensual + costosFijos;
    } else if (esGraciaParcial) {
      cuota = interes; // paga solo el interés, el saldo no cambia
      pagoMes = interes + segDes + seguroVehMensual + costosFijos;
    } else {
      if (!cuotaRegular) {
        cuotaRegular = saldo * (iCuota * Math.pow(1 + iCuota, mesesConCuota)) / (Math.pow(1 + iCuota, mesesConCuota) - 1);
      }
      cuota = cuotaRegular; // incluye el desgravamen (tasa iCuota)
      amortizacion = cuota - interes - segDes;
      saldo = saldo - amortizacion;
      if (t === N && Math.abs(saldo) < 0.01) saldo = 0;
      pagoMes = cuota + seguroVehMensual + costosFijos; // desgravamen ya va dentro de la cuota
    }

    cronograma.push({
      periodo: t,
      gracia: esPeriodoCuoton ? 'CF' : esGraciaTotal ? 'T' : esGraciaParcial ? 'P' : 'S',
      cuota: esPeriodoCuoton ? pagoCuoton : cuota,
      interes,
      amortizacion,
      seguroDesgravamen: segDes,
      seguroVehicular: seguroVehMensual,
      costosFijos,
      saldo: Math.max(0, saldo),
      saldoCuoton,
      flujo: -pagoMes,
    });

    flujos.push(-pagoMes);
  }

  // 4. Indicadores
  const tirMensual = calculateIRR(flujos, 0.01);
  const tcea = (Math.pow(1 + tirMensual, 12) - 1) * 100;

  const cokPct = Number.isFinite(Number(cokAnual)) && Number(cokAnual) > 0 ? Number(cokAnual) : 50;
  const cokMensual = Math.pow(1 + cokPct / 100, 30 / 360) - 1;
  const van = calculateNPV(cokMensual, flujos);

  const cuotaPromedioMes = cuotaRegular + seguroVehMensual + costosFijos;

  return {
    cronograma,
    prestamo,
    saldoRegularInicial,
    saldoCuotonInicial,
    cuotaFinal,
    tem: tem * 100,
    cuotaMensual: cuotaPromedioMes,        // cuota + seguro vehicular + costos fijos
    cuotaRegular,                          // cuota francesa (incluye desgravamen)
    tirMensual: tirMensual * 100,
    tcea,
    van,
    cokAnual: cokPct,
    // Misma definición del Excel: suma de cuotas - amortización - desgravamen
    totalIntereses: cronograma.reduce((acc, c) => acc + (c.gracia !== 'CF' ? c.cuota : 0) - c.amortizacion - c.seguroDesgravamen, 0),
    totalAmortizacion: cronograma.reduce((acc, c) => acc + c.amortizacion, 0) + cuotaFinal,
    totalSeguros: cronograma.reduce((acc, c) => acc + c.seguroDesgravamen + c.seguroVehicular, 0),
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

    if (Math.abs(npvDerivative) < epsilon) break;

    const newRate = rate - npv / npvDerivative;
    if (Math.abs(newRate - rate) < epsilon) {
      return newRate;
    }
    rate = newRate;
  }
  return rate;
}
