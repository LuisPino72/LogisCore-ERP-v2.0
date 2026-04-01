import { describe, expect, it } from "vitest";
import { err, ok } from "../src/result";

describe("Result", () => {
  it("crea un resultado exitoso tipado", () => {
    const result = ok({ value: 10 });
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.data.value).toBe(10);
    }
  });

  it("crea un resultado de error tipado", () => {
    const result = err({
      code: "TEST_ERROR",
      message: "fallo",
      retryable: false
    });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.code).toBe("TEST_ERROR");
    }
  });
});
