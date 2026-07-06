-- ============================================================
-- Migración: Compra Inteligente — moneda en vehículos, imagen,
-- y campos completos de la simulación (cuotón, gracia T/P, COK,
-- costos periódicos, TEA/TEM).
-- Ejecutar en el SQL Editor de Supabase. Es idempotente.
-- ============================================================

-- Vehículos: precio en soles o dólares + imagen opcional
ALTER TABLE vehiculos
  ADD COLUMN IF NOT EXISTS moneda TEXT DEFAULT 'Soles (S/)' CHECK (moneda IN ('Soles (S/)', 'Dólares (US$)')),
  ADD COLUMN IF NOT EXISTS imagen_url TEXT;

UPDATE vehiculos SET moneda = 'Soles (S/)' WHERE moneda IS NULL;

-- Simulaciones: campos del modelo Compra Inteligente
ALTER TABLE simulaciones
  ADD COLUMN IF NOT EXISTS porcentaje_cuota_inicial NUMERIC(5,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS porcentaje_cuota_final NUMERIC(5,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS cuota_final NUMERIC(12,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS gracia_total INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS gracia_parcial INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS cok NUMERIC(6,2) DEFAULT 50,
  ADD COLUMN IF NOT EXISTS gps_mensual NUMERIC(10,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS portes_mensual NUMERIC(10,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS gastos_adm_mensual NUMERIC(10,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS tea NUMERIC(8,4),
  ADD COLUMN IF NOT EXISTS tem NUMERIC(8,5);

-- La tasa guardada puede tener más precisión que NUMERIC(5,2)
ALTER TABLE simulaciones ALTER COLUMN tasa_interes TYPE NUMERIC(8,4);
