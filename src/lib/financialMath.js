/**
 * Convert TEA to TEM
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
 * Calculate the French Amortization Schedule
 */
export const calcularCronograma = ({
  precioVehiculo,
  cuotaInicial,
  tasaInteres, // percentage, e.g. 12.5
  tipoTasa, // 'Efectiva Anual (TEA)' or 'Nominal Anual (TNA)'
  capitalizacion,
  plazo,
  periodoGracia,
  tipoGracia, // 'Total' or 'Parcial'
  seguroDesgravamenAnual, // percentage
  seguroVehiculoAnual, // percentage
  gastosIniciales
}) => {
  
  const tasaDecimal = tasaInteres / 100;
  const seguroDesgDecimal = (seguroDesgravamenAnual || 0) / 100;
  const seguroVehDecimal = (seguroVehiculoAnual || 0) / 100;

  // 1. Convert rate to TEM
  let tem = 0;
  if (tipoTasa === 'Efectiva Anual (TEA)') {
    tem = teaToTem(tasaDecimal);
  } else {
    const m = getCapitalizacionFrecuencia(capitalizacion);
    tem = tnaToTem(tasaDecimal, m);
  }

  const temDesgravamen = seguroDesgDecimal / 12;
  const seguroVehiculoMensualFijo = (precioVehiculo * seguroVehDecimal) / 12;

  // 2. Net to finance
  let saldoInicial = precioVehiculo - cuotaInicial;
  
  const cronograma = [];
  let saldo = saldoInicial;
  let cuotaFijaSinSeguros = 0;

  // Calculate Grace Periods Effects to find Cuota
  if (periodoGracia > 0 && tipoGracia === 'Total') {
    saldo = saldo * Math.pow(1 + tem + temDesgravamen, periodoGracia);
  }

  const mesesEfectivosPago = plazo - periodoGracia;
  const temAjustado = tem + temDesgravamen;
  
  if (mesesEfectivosPago > 0) {
    cuotaFijaSinSeguros = saldo * (temAjustado * Math.pow(1 + temAjustado, mesesEfectivosPago)) / (Math.pow(1 + temAjustado, mesesEfectivosPago) - 1);
  }

  // Generate schedule
  saldo = saldoInicial;
  let sumaFlujos = [];

  // CF0 from bank perspective to calculate IRR: Outflow is negative, Inflows are positive
  // The bank gives: saldoInicial
  // But wait, the user pays gastosIniciales upfront. So the effective loan from the perspective of the cost is:
  // We received the car (precioVehiculo), we paid cuotaInicial + gastosIniciales. 
  // Net received = precioVehiculo - cuotaInicial - gastosIniciales = saldoInicial - gastosIniciales
  // Therefore, for IRR, CF0 = -(saldoInicial - gastosIniciales)
  sumaFlujos.push(-(saldoInicial - gastosIniciales));

  for (let t = 1; t <= plazo; t++) {
    let interes = saldo * tem;
    let seguroDesg = saldo * temDesgravamen;
    let seguroVeh = seguroVehiculoMensualFijo;
    let amortizacion = 0;
    let cuota = 0;

    if (t <= periodoGracia) {
      if (tipoGracia === 'Total') {
        amortizacion = 0;
        cuota = 0;
        saldo = saldo + interes + seguroDesg;
      } else { // Parcial
        amortizacion = 0;
        cuota = interes + seguroDesg + seguroVeh;
      }
    } else {
      cuota = cuotaFijaSinSeguros + seguroVeh;
      interes = saldo * tem;
      seguroDesg = saldo * temDesgravamen;
      amortizacion = cuota - interes - seguroDesg - seguroVeh;
      saldo = saldo - amortizacion;
    }

    if (t === plazo && Math.abs(saldo) < 0.1) {
      saldo = 0;
    }

    cronograma.push({
      periodo: t,
      cuota: cuota,
      interes: interes,
      amortizacion: amortizacion,
      seguro: seguroDesg + seguroVeh,
      saldo: Math.max(0, saldo)
    });

    sumaFlujos.push(cuota);
  }

  const tirMensual = calculateIRR(sumaFlujos);
  const tcea = (Math.pow(1 + tirMensual, 12) - 1) * 100;
  
  const cokAnual = 0.15; // 15% discount rate assumption
  const cokMensual = Math.pow(1 + cokAnual, 1/12) - 1;
  const van = calculateNPV(cokMensual, sumaFlujos);

  return {
    cronograma,
    tem: tem * 100,
    cuotaMensual: cronograma.length > 0 ? cronograma[cronograma.length - 1].cuota : 0,
    tcea: tcea,
    van: van,
    tir: tcea, // TIR anualizada es igual a la TCEA matemáticamente para préstamos estándar sin distorsiones
    totalIntereses: cronograma.reduce((acc, c) => acc + c.interes, 0),
    totalAmortizacion: cronograma.reduce((acc, c) => acc + c.amortizacion, 0),
    totalSeguros: cronograma.reduce((acc, c) => acc + c.seguro, 0),
  };
};

function calculateNPV(rate, cashFlows) {
  let npv = 0;
  // Perspectiva del deudor: Recibe CF0 (positivo), paga CF_t (negativo)
  // cashFlows[0] is negative in our array, so -cashFlows[0] is positive.
  for (let t = 0; t < cashFlows.length; t++) {
    const cf = -cashFlows[t]; 
    npv += cf / Math.pow(1 + rate, t);
  }
  return npv;
}

function calculateIRR(cashFlows, guess = 0.05) {
  const maxTries = 1000;
  const epsilon = 1e-7;
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
  return Math.max(0, rate); // return 0 if failed
}
