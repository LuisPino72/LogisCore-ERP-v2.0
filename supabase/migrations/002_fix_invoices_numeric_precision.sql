-- =============================================================================
-- Migración: Fix invoices numeric precision (v6.5 → v6.6)
-- Fecha: 2026-04-17
-- Objetivo: Corregir precisión de columnas monetarias en tabla invoices
-- Regla: #6 - Precisión Fiscal (NUMERIC(19,4))
-- Estado: ✅ DESPLEGADO via MCP Supabase
-- =============================================================================

-- Fix: Set NUMERIC(19,4) precision for money columns in invoices table
-- Required by Regla #6: Precisión Fiscal

ALTER TABLE invoices 
ALTER COLUMN subtotal TYPE NUMERIC(19,4),
ALTER COLUMN tax_total TYPE NUMERIC(19,4),
ALTER COLUMN discount_total TYPE NUMERIC(19,4),
ALTER COLUMN igtf_amount TYPE NUMERIC(19,4),
ALTER COLUMN total TYPE NUMERIC(19,4);

-- Verificación post-migración:
-- SELECT column_name, numeric_precision, numeric_scale 
-- FROM information_schema.columns 
-- WHERE table_name = 'invoices' 
-- AND column_name IN ('subtotal', 'tax_total', 'discount_total', 'igtf_amount', 'total');