Title: Dexie Normalization & Migration Design
Date: 2026-04-19
Author: OpenCode (assistant)

Summary
-------
Small, concrete design to normalize nested arrays stored in Dexie (items/payments/ingredients) into dedicated Dexie stores and provide a safe upgrade migration that preserves offline behavior and maps localId ↔ server id when available.

Scope
-----
- Modify apps/web/src/lib/db/dexie.ts: add normalized stores, deduplicate existing store definitions, implement a version(15).upgrade migration that extracts arrays into normalized stores.
- Keep original arrays on parent records until server-side migration and verification are completed.
- Provide a short verification checklist and rollback guidance.

Design Principles
-----------------
- Minimal changes: only touch dexie.ts for this iteration.
- Preserve backward compatibility by keeping arrays until full verification and by adding helper adapters later to reconstitute objects for callers.
- Store both localId (saleLocalId) and server id (saleId) on normalized rows when server id exists.

Dexie Changes Implemented
-------------------------
1. Deduplicated repeated store declarations in version 14.
2. Added optional id/local/server id fields to normalized record interfaces (SaleItemRecord, SalePaymentRecord, PurchaseItemRecord, PurchaseReceivedItemRecord, ReceivingItemRecord, RecipeIngredientRecord, ProductionIngredientRecord, InvoiceItemRecord, InvoicePaymentRecord).
3. Declared new EntityTable fields on LogisCoreDexie for the normalized stores.
4. Added this.version(15).stores(...) definitions and a migration routine:
   - Scans existing tables: sales, invoices, purchases, receivings, recipes, production_logs
   - For each parent record, extracts nested arrays (items/payments/ingredients)
   - Inserts rows into normalized stores with generated UUIDs (crypto.randomUUID()) and includes saleLocalId and saleId when available
   - Logs errors to console but continues migration for other tables

Why this approach
------------------
- Avoids refactoring dozens of service files at once by introducing normalized stores and leaving parent arrays intact. Services can be migrated incrementally or use a small adapter to read normalized stores and recompose objects.
- Storing both localId and server id gives maximal flexibility for joins to server-side tables and offline operations.

Verification Plan
-----------------
After SQL migration on server (staging), run:
- Compare counts: sum(jsonb_array_length(items)) FROM public.sales vs SELECT count(*) FROM public.sale_items.
- Spot-check sample records, ensuring numeric fields cast correctly (qty, unit_price, amounts) and null-handling for missing fields.
- Run frontend workflows in staging build: POS flow, create invoice from sale, receive purchase, production order.

Rollback / Safety
-----------------
- Dexie: The upgrade writes only to new stores and does not delete parent arrays. Rolling back is safe by opening the DB without applying version 15 (or restoring a local DB backup if needed).
- Server: Must take a snapshot / pg_dump before applying SQL migration. If migration causes issues, restore from snapshot.

Next Implementation Steps (proposed)
----------------------------------
1. Apply SQL migration to a staging Supabase instance (create snapshot first). (Requires your approval)
2. Implement a small adapter helper (e.g., apps/web/src/lib/db/normalized.ts) with functions like getSaleWithItems(saleLocalId) that recompose objects from normalized stores. Use this to update a small set of critical services (sales, invoicing, purchases) incrementally.
3. Run unit & E2E tests in CI, adjust code as needed.
4. After verification, drop original JSONB columns via an additional SQL migration.

Files changed in this iteration
-----------------------------
- apps/web/src/lib/db/dexie.ts (normalized stores + upgrade migration)

Questions for you
-----------------
Do you want me to apply the server SQL migration to a staging database now? If yes, I will: 1) create a pg_dump snapshot, 2) run the SQL in supabase/migrations/20260419000000_normalize_jsonb_items.sql against staging, and 3) run the verification queries and report results.
