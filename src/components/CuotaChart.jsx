import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend } from 'recharts';

/**
 * Composición del pago mensual a lo largo del cronograma.
 * Solo lee el cronograma ya calculado (no recalcula nada):
 * amortización = capital regular + capital del cuotón,
 * interés = interés regular + interés del cuotón,
 * seguros y costos = desgravamen (ambos bloques) + seguro riesgo + costos fijos.
 */
const SERIES = [
  { key: 'amortizacion', name: 'Amortización', color: '#1d68b6' },
  { key: 'interes', name: 'Interés', color: '#d97706' },
  { key: 'segurosCostos', name: 'Seguros y costos', color: '#8256d0' },
];

export default function CuotaChart({ cronograma, sym }) {
  if (!cronograma?.length) return null;

  const data = cronograma.map(c => ({
    periodo: c.periodo,
    amortizacion: c.amortizacion + c.amortCuoton,
    interes: c.interes + c.iCuoton,
    segurosCostos: c.seguroDesgravamen + c.segDesCuoton + c.seguroVehicular + c.costosFijos,
  }));

  const fmt = (n) => `${sym} ${(n ?? 0).toLocaleString('es-PE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

  return (
    <div className="cuota-chart" aria-label="Gráfico de composición del pago mensual">
      <ResponsiveContainer width="100%" height={260}>
        <BarChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: 8 }} barCategoryGap="18%">
          <CartesianGrid vertical={false} stroke="#dfe7f2" strokeDasharray="0" />
          <XAxis
            dataKey="periodo"
            tickLine={false}
            axisLine={{ stroke: '#c6d3e4' }}
            tick={{ fill: '#64748b', fontSize: 11 }}
            interval="preserveStartEnd"
            minTickGap={18}
          />
          <YAxis
            tickLine={false}
            axisLine={false}
            tick={{ fill: '#64748b', fontSize: 11 }}
            width={70}
            tickFormatter={(v) => v.toLocaleString('es-PE')}
          />
          <Tooltip
            cursor={{ fill: 'rgba(29, 104, 182, 0.06)' }}
            formatter={(value, name) => [fmt(value), name]}
            labelFormatter={(p) => `Mes ${p}`}
            contentStyle={{
              background: '#0b223f',
              border: 'none',
              borderRadius: 8,
              boxShadow: '0 12px 28px -12px rgba(11,34,63,0.4)',
              fontSize: 12,
            }}
            labelStyle={{ color: '#eaf3fb', fontWeight: 600, marginBottom: 4 }}
            itemStyle={{ color: '#eaf3fb' }}
          />
          <Legend
            iconType="circle"
            iconSize={8}
            wrapperStyle={{ fontSize: 12, color: '#64748b', paddingTop: 8 }}
          />
          {SERIES.map((s, i) => (
            <Bar
              key={s.key}
              dataKey={s.key}
              name={s.name}
              stackId="pago"
              fill={s.color}
              stroke="#ffffff"
              strokeWidth={1}
              radius={i === SERIES.length - 1 ? [3, 3, 0, 0] : 0}
            />
          ))}
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
