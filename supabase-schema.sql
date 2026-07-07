-- Crear la tabla de entidades financieras
CREATE TABLE IF NOT EXISTS entidades_financieras (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  nombre TEXT NOT NULL,
  tea_soles_min NUMERIC(5,2) NOT NULL,
  tea_soles_max NUMERIC(5,2) NOT NULL,
  tea_dolares_min NUMERIC(5,2) NOT NULL,
  tea_dolares_max NUMERIC(5,2) NOT NULL,
  periodo_gracia_min INTEGER NOT NULL,
  periodo_gracia_max INTEGER NOT NULL,
  plazo_maximo INTEGER NOT NULL,
  estado TEXT DEFAULT 'Activo' CHECK (estado IN ('Activo', 'Inactivo')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Políticas de Seguridad de Nivel de Fila (RLS) para entidades_financieras
ALTER TABLE entidades_financieras ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Permitir lectura a usuarios autenticados (entidades)" ON entidades_financieras FOR SELECT TO authenticated USING (true);
CREATE POLICY "Permitir inserción a usuarios autenticados (entidades)" ON entidades_financieras FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Permitir actualización a usuarios autenticados (entidades)" ON entidades_financieras FOR UPDATE TO authenticated USING (true);
CREATE POLICY "Permitir eliminación a usuarios autenticados (entidades)" ON entidades_financieras FOR DELETE TO authenticated USING (true);


-- Crear la tabla de clientes
CREATE TABLE IF NOT EXISTS clientes (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  nombre_completo TEXT NOT NULL,
  dni TEXT NOT NULL,
  edad INTEGER NOT NULL,
  ocupacion TEXT NOT NULL,
  ingreso_mensual NUMERIC(12,2) NOT NULL,
  dependencias INTEGER NOT NULL,
  estado TEXT DEFAULT 'Activo' CHECK (estado IN ('Activo', 'Inactivo')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Políticas de Seguridad de Nivel de Fila (RLS) para clientes
ALTER TABLE clientes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Permitir lectura a usuarios autenticados (clientes)" ON clientes FOR SELECT TO authenticated USING (true);
CREATE POLICY "Permitir inserción a usuarios autenticados (clientes)" ON clientes FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Permitir actualización a usuarios autenticados (clientes)" ON clientes FOR UPDATE TO authenticated USING (true);
CREATE POLICY "Permitir eliminación a usuarios autenticados (clientes)" ON clientes FOR DELETE TO authenticated USING (true);


-- Crear la tabla de vehículos
CREATE TABLE IF NOT EXISTS vehiculos (
  id SERIAL PRIMARY KEY,
  marca TEXT NOT NULL,
  modelo TEXT NOT NULL,
  anio INTEGER NOT NULL,
  tipo_vehiculo TEXT NOT NULL,
  precio NUMERIC(12,2) NOT NULL,
  moneda TEXT DEFAULT 'Soles (S/)' CHECK (moneda IN ('Soles (S/)', 'Dólares (US$)')),
  imagen_url TEXT,
  estado TEXT DEFAULT 'Activo' CHECK (estado IN ('Activo', 'Inactivo')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Políticas de Seguridad de Nivel de Fila (RLS) para vehiculos
ALTER TABLE vehiculos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Permitir lectura a usuarios autenticados (vehiculos)" ON vehiculos FOR SELECT TO authenticated USING (true);
CREATE POLICY "Permitir inserción a usuarios autenticados (vehiculos)" ON vehiculos FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Permitir actualización a usuarios autenticados (vehiculos)" ON vehiculos FOR UPDATE TO authenticated USING (true);
CREATE POLICY "Permitir eliminación a usuarios autenticados (vehiculos)" ON vehiculos FOR DELETE TO authenticated USING (true);


-- Crear la tabla de simulaciones
CREATE TABLE IF NOT EXISTS simulaciones (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  cliente_id UUID REFERENCES clientes(id) ON DELETE CASCADE,
  vehiculo_id INTEGER REFERENCES vehiculos(id) ON DELETE CASCADE,
  entidad_id UUID REFERENCES entidades_financieras(id) ON DELETE CASCADE,
  precio_vehiculo NUMERIC(12,2) NOT NULL,
  cuota_inicial NUMERIC(12,2) NOT NULL,
  porcentaje_cuota_inicial NUMERIC(5,2) DEFAULT 0,
  porcentaje_cuota_final NUMERIC(5,2) DEFAULT 0,
  cuota_final NUMERIC(12,2) DEFAULT 0,
  tipo_tasa TEXT NOT NULL,
  tasa_interes NUMERIC(8,4) NOT NULL,
  capitalizacion TEXT,
  moneda TEXT NOT NULL,
  plazo INTEGER NOT NULL,
  periodo_gracia INTEGER NOT NULL,
  tipo_gracia TEXT NOT NULL,
  gracia_total INTEGER DEFAULT 0,
  gracia_parcial INTEGER DEFAULT 0,
  seguro_desgravamen NUMERIC(5,3) DEFAULT 0,
  seguro_vehicular NUMERIC(5,2) DEFAULT 0,
  gastos_iniciales NUMERIC(12,2) DEFAULT 0,
  gps_mensual NUMERIC(10,2) DEFAULT 0,
  portes_mensual NUMERIC(10,2) DEFAULT 0,
  gastos_adm_mensual NUMERIC(10,2) DEFAULT 0,
  cok NUMERIC(6,2) DEFAULT 50,
  cuota_mensual NUMERIC(12,2) NOT NULL,
  tea NUMERIC(8,4),
  tem NUMERIC(8,5),
  tcea NUMERIC(8,4) NOT NULL,
  van NUMERIC(12,2) NOT NULL,
  tir NUMERIC(8,4) NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Políticas de Seguridad de Nivel de Fila (RLS) para simulaciones
ALTER TABLE simulaciones ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Permitir lectura a usuarios autenticados (simulaciones)" ON simulaciones FOR SELECT TO authenticated USING (true);
CREATE POLICY "Permitir inserción a usuarios autenticados (simulaciones)" ON simulaciones FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Permitir actualización a usuarios autenticados (simulaciones)" ON simulaciones FOR UPDATE TO authenticated USING (true);
CREATE POLICY "Permitir eliminación a usuarios autenticados (simulaciones)" ON simulaciones FOR DELETE TO authenticated USING (true);


-- Tabla de configuración del sistema (una fila por instalación).
-- Valores por defecto que precarga el Simulador y límites que valida
-- (plazo máximo y gracia total+parcial máxima).
CREATE TABLE IF NOT EXISTS configuracion (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  seguro_desgravamen NUMERIC(6,4) DEFAULT 0.055,
  seguro_vehiculo NUMERIC(5,2) DEFAULT 1.20,
  plazo_maximo INTEGER DEFAULT 60,
  periodo_gracia_max INTEGER DEFAULT 6,
  moneda_predeterminada TEXT DEFAULT 'Soles (S/)',
  tipo_tasa_predeterminada TEXT DEFAULT 'Efectiva Anual (TEA)',
  capitalizacion_predeterminada TEXT DEFAULT 'Mensual',
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

ALTER TABLE configuracion ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Lectura config autenticados" ON configuracion FOR SELECT TO authenticated USING (true);
CREATE POLICY "Inserción config autenticados" ON configuracion FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Actualización config autenticados" ON configuracion FOR UPDATE TO authenticated USING (true);
