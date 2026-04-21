import { describe, expect, it } from "vitest";
import fs from "node:fs";
import path from "node:path";

describe("architecture guard", () => {
  it("hooks y componentes no importan lib/db o lib/supabase y restringen imports cruzados runtime", () => {
    const featuresRoot = path.resolve(process.cwd(), "apps/web/src/features");
    const allowRuntimeCrossFeature = new Set([
      path.resolve(
        process.cwd(),
        "apps/web/src/features/tenant/components/TenantBootstrapGate.tsx"
      ),
      path.resolve(
        process.cwd(),
        "apps/web/src/features/products/components/ProductsCatalog.tsx"
      ),
      // Allowlist para SalesPanel: necesario para cargar productos y warehouses internamente
      // en el flujo de venta POS. Ver Hallazgo B - UI fixes.
      path.resolve(
        process.cwd(),
        "apps/web/src/features/sales/components/SalesPanel.tsx"
      )
    ]);

    const collectSourceFiles = (directory: string): string[] => {
      const entries = fs.readdirSync(directory, { withFileTypes: true });
      const files: string[] = [];
      for (const entry of entries) {
        const fullPath = path.join(directory, entry.name);
        if (entry.isDirectory()) {
          files.push(...collectSourceFiles(fullPath));
          continue;
        }
        if (entry.name.endsWith(".ts") || entry.name.endsWith(".tsx")) {
          files.push(fullPath);
        }
      }
      return files;
    };

    const featureDirs = fs.readdirSync(featuresRoot);
    const filesToCheck: string[] = [];

    for (const featureDir of featureDirs) {
      const componentsDir = path.join(featuresRoot, featureDir, "components");
      const hooksDir = path.join(featuresRoot, featureDir, "hooks");

      for (const directory of [componentsDir, hooksDir]) {
        if (!fs.existsSync(directory)) continue;
        filesToCheck.push(...collectSourceFiles(directory));
      }
    }

    const crossFeatureRegex = /import\s+(type\s+)?[^;]*from\s+["']@\/features\/([^/"']+)/g;

    for (const filePath of filesToCheck) {
      const content = fs.readFileSync(filePath, "utf8");
      expect(content).not.toContain("lib/db");
      expect(content).not.toContain("lib/supabase");

      const relative = path.relative(featuresRoot, filePath);
      const currentFeature = relative.split(path.sep)[0];

      crossFeatureRegex.lastIndex = 0;
      let match: RegExpExecArray | null;
      while ((match = crossFeatureRegex.exec(content)) !== null) {
        const isTypeOnly = Boolean(match[1]);
        const targetFeature = match[2];
        const isCrossFeature = targetFeature !== currentFeature;
        if (!isCrossFeature) continue;
        if (isTypeOnly) continue;
        if (allowRuntimeCrossFeature.has(filePath)) continue;

        throw new Error(
          `Import runtime cruzado no permitido: ${filePath} -> ${targetFeature}`
        );
      }
    }
  });
});
