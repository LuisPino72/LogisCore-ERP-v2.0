import { describe, expect, it } from "vitest";
import { createAppError } from "../src/errors";

describe("AppError", () => {
  it("conserva todos los campos requeridos", () => {
    const appError = createAppError({
      code: "E1",
      message: "mensaje",
      retryable: true,
      context: { step: "bootstrap" },
      cause: new Error("original")
    });

    expect(appError.code).toBe("E1");
    expect(appError.retryable).toBe(true);
    expect(appError.context?.step).toBe("bootstrap");
    expect(appError.cause).toBeInstanceOf(Error);
  });
});
