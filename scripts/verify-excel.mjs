// Verificación numérica de financialMath.js contra el Excel modelo
// "Trabajo final - Ordinario - Compra Inteligente IB - Modelo.xlsx" (hoja Frances)
import { calcularCronograma } from '../src/lib/financialMath.js';

const r = calcularCronograma({
  precioVehiculo: 16000,
  cuotaInicial: 3200,            // 20%
  porcentajeCuotaFinal: 40,      // cuotón 6400
  tasaInteres: 15,
  tipoTasa: 'Nominal Anual (TNA)',
  capitalizacion: 'Diario',
  plazo: 36,
  graciaTotal: 3,
  graciaParcial: 3,
  seguroDesgravamen: 0.049,
  periodoSeguroDesgravamen: 'Mensual',
  seguroVehiculoAnual: 0.3,
  gastosIniciales: 175,          // notariales 100 + registrales 75
  gpsMensual: 20,
  portesMensual: 3.5,
  gastosAdmMensual: 3.5,
  cokAnual: 50,
});

let fails = 0;
const chk = (name, got, want, tol = 1e-6) => {
  const ok = Math.abs(got - want) <= tol * Math.max(1, Math.abs(want));
  if (!ok) fails++;
  console.log(`${ok ? 'OK  ' : 'FAIL'} ${name}: got=${got} want=${want}`);
};

// Resultados del financiamiento (celdas J4..J27)
chk('TEA (J4)', r.tea, 16.17979460574055);
chk('TEM (J5)', r.tem, 1.2575815353265574);
chk('NCxA (J6)', r.ncxa, 12);
chk('N (J7)', r.totalCuotas, 36);
chk('CI (J8)', r.cuotaInicial, 3200);
chk('CF (J9)', r.cuotaFinal, 6400);
chk('Prestamo (J10)', r.prestamo, 12975);
chk('Saldo (J11)', r.saldoRegularInicial, 9015.99070298918);
chk('pSegDesPer (J13)', r.pSegDesPer, 0.049);
chk('SegRiePer (J14)', r.segRiePer, 4);
chk('Tot Intereses (J16)', r.totalIntereses, 2264.739270855885);
chk('Tot Amortizacion (J17)', r.totalAmortizacion, 15760.43660503218);
chk('Tot SegDes (J18)', r.totalSegDes, 102.72250756438616);
chk('Tot SegRie (J19)', r.totalSegRie, 148);
chk('Tot GPS (J20)', r.totalGPS, 740);
chk('Tot Portes (J21)', r.totalPortes, 129.5);
chk('Tot GasAdm (J22)', r.totalGasAdm, 129.5);
chk('COKi (J24)', r.cokMensual, 3.436608313191658);
chk('TIR (J25)', r.tirMensual, 1.586174852778721);
chk('TCEA (J26)', r.tcea, 20.7856362664806);
chk('VAN (J27)', r.van, 4436.183165604902);

// VP del cuotón
chk('VP cuoton (C32)', r.saldoCuotonInicial, 3959.009297010821);
chk('Cuota francesa (J38)', r.cuotaRegular, 379.15843387799924);

// Fila 1 (mes 1, gracia total) — fila 32 del Excel
const c1 = r.cronograma[0];
chk('m1 SICF', c1.siCuoton, 3959.009297010821);
chk('m1 ICF', c1.iCuoton, 49.78776990106982);
chk('m1 SegDesCF', c1.segDesCuoton, 1.9399145555353021);
chk('m1 SFCF', c1.sfCuoton, 4010.7369814674257);
chk('m1 SI', c1.saldoInicial, 9015.99070298918);
chk('m1 I', c1.interes, 113.383434307551);
chk('m1 SegDes', c1.seguroDesgravamen, 4.417835444464698);
chk('m1 SF', c1.saldo, 9129.37413729673);
chk('m1 Flujo', c1.flujo, -35.4178354444647);

// Fila mes 4 (gracia parcial) — fila 35
const c4 = r.cronograma[3];
chk('m4 Cuota (=interes)', c4.cuota, 117.71512237083311);
chk('m4 SF (no cambia)', c4.saldo, 9360.436605032208);
chk('m4 Flujo', c4.flujo, -153.3017363072989);

// Fila mes 7 (primera cuota S) — fila 38
const c7 = r.cronograma[6];
chk('m7 Cuota', c7.cuota, 379.15843387799924);
chk('m7 A', c7.amortizacion, 256.85669757070036);
chk('m7 SF', c7.saldo, 9103.579907461508);
chk('m7 Flujo', c7.flujo, -410.15843387799924);

// Fila mes 36 (última cuota) — fila 67
const c36 = r.cronograma[35];
chk('m36 SF = 0', c36.saldo, 0, 1e-6);

// Fila mes 37 (cuotón) — fila 68
const c37 = r.cronograma[36];
chk('m37 SICF', c37.siCuoton, 6317.4573, 1e-4);
chk('m37 ICF', c37.iCuoton, 79.4472, 1e-4);
chk('m37 SegDesCF', c37.segDesCuoton, 3.0956, 1e-4);
chk('m37 ACF (=CF)', c37.amortCuoton, 6400);
chk('m37 SFCF', c37.sfCuoton, 0);
chk('m37 Cuota regular', c37.cuota, 0);
chk('m37 Flujo', c37.flujo, -6431.0);

// Flujo mes 0
chk('m0 Flujo (+Prestamo)', r.flujos[0], 12975);
chk('totalPeriodos', r.totalPeriodos, 37);

console.log(fails === 0 ? '\nTODOS LOS CHECKS PASAN ✔' : `\n${fails} CHECKS FALLAN ✘`);
process.exit(fails === 0 ? 0 : 1);
