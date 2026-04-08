import { describe, expect, it } from "vitest";
import fs from "node:fs";
import path from "node:path";

describe("sync mass assignment guard", () => {
  it("usa payload sanitizado en create y update", () => {
    const syncFunctionPath = path.resolve(
      process.cwd(),
      "supabase/functions/sync_table_item/index.ts"
    );
    const content = fs.readFileSync(syncFunctionPath, "utf8");

    expect(content).toContain("const sanitizeMutationPayload");
    expect(content).toContain("const sanitizedPayload = sanitizeMutationPayload(payload);");
    expect(content).toContain("...sanitizedPayload");

    expect(content).toContain("\"tenant_id\"");
    expect(content).toContain("\"local_id\"");
    expect(content).toContain("\"created_at\"");
    expect(content).toContain("\"updated_at\"");
  });
});
