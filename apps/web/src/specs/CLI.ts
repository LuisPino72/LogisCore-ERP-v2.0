/**
 * Spec-Driven Development CLI
 * Commands: validate, generate, docs
 * 
 * Usage:
 *   npx tsx apps/web/src/specs/CLI.ts validate
 *   npx tsx apps/web/src/specs/CLI.ts generate
 *   npx tsx apps/web/src/specs/CLI.ts docs
 */

import { readFileSync, writeFileSync, mkdirSync, existsSync } from "fs";
import { join, relative, dirname } from "path";
import { fileURLToPath } from "url";

type Command = "validate" | "generate" | "docs" | "all";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

interface SpecMetadata {
  $id?: string;
  entity: string;
  version: string;
  description?: string;
  fields: Record<string, unknown>;
  business_rules?: Record<string, unknown>;
  error_codes?: Record<string, unknown>;
  references?: Record<string, string>;
}

const SPECS_DIR = join(__dirname, "..", "specs");
const PRODUCTS_SPEC = join(SPECS_DIR, "products", "schema.json");
const OUTPUT_DIR = join(__dirname, "..", "..", "generated");

function loadSpec(path: string): SpecMetadata {
  const content = readFileSync(path, "utf-8");
  return JSON.parse(content);
}

function log(message: string, type: "info" | "success" | "error" | "warn" = "info") {
  const prefix = {
    info: "[INFO]",
    success: "[SUCCESS]",
    error: "[ERROR]",
    warn: "[WARN]",
  };
  console.log(`${prefix[type]} ${message}`);
}

function validateProductsSpec(): boolean {
  log("Validating Products spec...", "info");
  
  try {
    const spec = loadSpec(PRODUCTS_SPEC);
    
    const requiredFields = ["entity", "version", "fields", "business_rules", "error_codes"];
    for (const field of requiredFields) {
      if (!(field in spec)) {
        log(`Missing required field: ${field}`, "error");
        return false;
      }
    }
    
    const requiredFieldsList = ["local_id", "tenant_id", "name", "sku", "is_weighted", "unit_of_measure"];
    for (const field of requiredFieldsList) {
      if (!(field in spec.fields)) {
        log(`Missing required field in spec: ${field}`, "error");
        return false;
      }
    }
    
    const fields = spec.fields as Record<string, { required?: boolean; type?: string }>;
    if (!fields.tenant_id?.required) {
      log("Field tenant_id should be required", "warn");
    }
    
    const businessRules = spec.business_rules as Record<string, { condition: string; error: string }>;
    if (!businessRules.weighted_precision) {
      log("Missing business rule: weighted_precision", "warn");
    }
    if (!businessRules.tenant_is_slug) {
      log("Missing business rule: tenant_is_slug", "warn");
    }
    
    log(`Products spec validated: ${spec.entity} v${spec.version}`, "success");
    return true;
  } catch (error) {
    log(`Failed to validate: ${error}`, "error");
    return false;
  }
}

function generateTypes(): boolean {
  log("Generating TypeScript types from specs...", "info");
  
  try {
    if (!existsSync(OUTPUT_DIR)) {
      mkdirSync(OUTPUT_DIR, { recursive: true });
    }
    
    const spec = loadSpec(PRODUCTS_SPEC);
    
    const typesContent = `/**
 * Auto-generated from specs/products/schema.json
 * DO NOT EDIT - This file is generated automatically
 * 
 * Entity: ${spec.entity}
 * Version: ${spec.version}
 * Generated: ${new Date().toISOString()}
 */

export interface GeneratedProduct {
  local_id: string;
  tenant_id: string;
  name: string;
  sku: string;
  description: string | null;
  category_id: string | null;
  is_weighted: boolean;
  unit_of_measure: "kg" | "lb" | "gr" | "un";
  is_taxable: boolean;
  is_serialized: boolean;
  default_presentation_id: string | null;
  visible: boolean;
  deleted_at: string | null;
  created_at: string;
}

export interface GeneratedPresentation {
  id?: string;
  product_local_id: string;
  name: string;
  factor: number;
  price: number;
  barcode: string | null;
  is_default: boolean;
}

export type DecimalPrecision = {
  type: "NUMERIC(19,4)";
  calculation: number;
  display: number;
};

export const DECIMAL_PRECISION: Record<string, DecimalPrecision> = {
  money: { type: "NUMERIC(19,4)", calculation: 4, display: 2 },
  weighted_quantity: { type: "NUMERIC(19,4)", calculation: 4, display: 4 },
  non_weighted_quantity: { type: "INTEGER", calculation: 0, display: 0 },
};
`;
    
    const outputPath = join(OUTPUT_DIR, "products.types.Generated.ts");
    writeFileSync(outputPath, typesContent);
    
    log(`Generated: ${relative(process.cwd(), outputPath)}`, "success");
    return true;
  } catch (error) {
    log(`Failed to generate types: ${error}`, "error");
    return false;
  }
}

function generateDocs(): boolean {
  log("Generating documentation from specs...", "info");
  
  try {
    const spec = loadSpec(PRODUCTS_SPEC);
    
    const fieldsTable = Object.entries(spec.fields as Record<string, { 
      type?: string; 
      required?: boolean; 
      description?: string;
      pattern?: string;
      enum?: string[];
    }>)
      .map(([name, def]) => `| ${name} | ${def.type || "any"} | ${def.required ? "✅" : "❌"} | ${def.description || "-"} |`)
      .join("\n");
    
    const businessRulesTable = Object.entries(spec.business_rules as Record<string, { 
      condition: string; 
      error: string;
      enforcement?: string;
    }>)
      .map(([name, def]) => `| ${name} | ${def.condition} | ${def.error} | ${def.enforcement || "-"} |`)
      .join("\n");
    
    const errorCodesTable = Object.entries(spec.error_codes as Record<string, { 
      code: string; 
      message: string;
      retryable: boolean;
    }>)
      .map(([_name, def]) => `| ${def.code} | ${def.message} | ${def.retryable ? "Yes" : "No"} |`)
      .join("\n");
    
    const markdown = `# ${spec.entity} Specification

> **Única Fuente de Verdad (SSoT)**  
> Version: ${spec.version}  
> Generated: ${new Date().toISOString()}

${spec.description || ""}

## Fields

| Field | Type | Required | Description |
|-------|------|----------|-------------|
${fieldsTable}

## Business Rules

| Rule | Condition | Error Code | Enforcement |
|------|-----------|------------|-------------|
${businessRulesTable}

## Error Codes

| Code | Message | Retryable |
|------|---------|-----------|
${errorCodesTable}

## Decimal Precision

| Type | Calculation | Display |
|------|-------------|---------|
| Money | 4 | 2 |
| Weighted Quantity | 4 | 4 |
| Non-Weighted Quantity | 0 | 0 |

## References

- Architecture: ${spec.references?.architecture_doc || "N/A"}
- Section: ${spec.references?.section || "N/A"}
`;
    
    const docsPath = join(SPECS_DIR, "products", "README.md");
    writeFileSync(docsPath, markdown);
    
    log(`Generated: ${relative(process.cwd(), docsPath)}`, "success");
    return true;
  } catch (error) {
    log(`Failed to generate docs: ${error}`, "error");
    return false;
  }
}

function runCommand(command: Command): void {
  const commands: Record<Command, () => boolean> = {
    validate: validateProductsSpec,
    generate: generateTypes,
    docs: generateDocs,
    all: () => {
      const results = [
        validateProductsSpec(),
        generateTypes(),
        generateDocs(),
      ];
      return results.every(Boolean);
    },
  };
  
  const start = Date.now();
  const success = commands[command]();
  const elapsed = Date.now() - start;
  
  if (success) {
    log(`Command "${command}" completed in ${elapsed}ms`, "success");
    process.exit(0);
  } else {
    log(`Command "${command}" failed`, "error");
    process.exit(1);
  }
}

const args = process.argv.slice(2);
const command = args[0] as Command | undefined;

if (!command || !["validate", "generate", "docs", "all"].includes(command)) {
  console.log(`
SDD CLI - Spec-Driven Development

Usage:
  sdd <command> [options]

Commands:
  validate    Validate specs against architecture rules
  generate    Generate TypeScript types from specs
  docs        Generate documentation from specs
  all         Run all commands

Examples:
  npx tsx apps/web/src/specs/CLI.ts validate
  npx tsx apps/web/src/specs/CLI.ts generate
  npx tsx apps/web/src/specs/CLI.ts docs
  npx tsx apps/web/src/specs/CLI.ts all
`);
  process.exit(1);
}

runCommand(command);
