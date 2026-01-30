/**
 * Result Type Tests
 * Unit tests for functional error handling
 */

import { describe, it, expect } from "vitest";
import {
  Result,
  Ok,
  Err,
  isOk,
  isErr,
  IntegrationError,
  ValidationError,
} from "../result";

describe("Result Type", () => {
  describe("Ok", () => {
    it("should create an Ok result", () => {
      const result = new Ok(42);
      expect(result.isOk()).toBe(true);
      expect(result.isErr()).toBe(false);
      expect(result.value).toBe(42);
    });

    it("should map Ok values", () => {
      const result = new Ok(10);
      const mapped = result.map((x) => x * 2);

      expect(mapped.isOk()).toBe(true);
      expect(mapped.unwrap()).toBe(20);
    });

    it("should chain Ok operations", () => {
      const result = new Ok(5);
      const chained = result.andThen((x) => new Ok(x + 10));

      expect(chained.isOk()).toBe(true);
      expect(chained.unwrap()).toBe(15);
    });

    it("should unwrap Ok values", () => {
      const result = new Ok("success");
      expect(result.unwrap()).toBe("success");
      expect(result.unwrapOr("default")).toBe("success");
      expect(result.unwrapOrElse(() => "computed")).toBe("success");
    });

    it("should match on Ok", () => {
      const result = new Ok(100);
      const matched = result.match({
        ok: (value) => value * 2,
        err: () => 0,
      });
      expect(matched).toBe(200);
    });
  });

  describe("Err", () => {
    it("should create an Err result", () => {
      const error = new Error("test error");
      const result = new Err(error);

      expect(result.isOk()).toBe(false);
      expect(result.isErr()).toBe(true);
      expect(result.error).toBe(error);
    });

    it("should not map Err values", () => {
      const error = new Error("original");
      const result = new Err(error);
      const mapped = result.map((x) => x * 2);

      expect(mapped.isErr()).toBe(true);
      expect(mapped.error).toBe(error);
    });

    it("should map error values", () => {
      const result = new Err("error");
      const mapped = result.mapErr((err) => new Error(err));

      expect(mapped.isErr()).toBe(true);
      expect(mapped.error).toBeInstanceOf(Error);
      expect(mapped.error.message).toBe("error");
    });

    it("should not chain Err operations", () => {
      const error = new Error("test");
      const result = new Err(error);
      const chained = result.andThen((x) => new Ok(x + 10));

      expect(chained.isErr()).toBe(true);
      expect(chained.error).toBe(error);
    });

    it("should handle unwrap for Err", () => {
      const result = new Err(new Error("fail"));

      expect(() => result.unwrap()).toThrow("fail");
      expect(result.unwrapOr("default")).toBe("default");
      expect(result.unwrapOrElse(() => "computed")).toBe("computed");
    });

    it("should match on Err", () => {
      const result = new Err("error");
      const matched = result.match({
        ok: () => "success",
        err: (error) => `failed: ${error}`,
      });
      expect(matched).toBe("failed: error");
    });
  });

  describe("Result helpers", () => {
    it("should create Ok result with helper", () => {
      const result = Result.ok(42);
      expect(result.isOk()).toBe(true);
      expect(result.value).toBe(42);
    });

    it("should create Err result with helper", () => {
      const result = Result.err("error");
      expect(result.isErr()).toBe(true);
      expect(result.error).toBe("error");
    });

    it("should wrap throwing functions", () => {
      const success = Result.from(() => 42);
      expect(success.isOk()).toBe(true);
      expect(success.unwrap()).toBe(42);

      const failure = Result.from(() => {
        throw new Error("boom");
      });
      expect(failure.isErr()).toBe(true);
      expect(failure.error.message).toBe("boom");
    });

    it("should wrap async functions", async () => {
      const success = await Result.fromAsync(async () => 42);
      expect(success.isOk()).toBe(true);
      expect(success.unwrap()).toBe(42);

      const failure = await Result.fromAsync(async () => {
        throw new Error("async boom");
      });
      expect(failure.isErr()).toBe(true);
      expect(failure.error.message).toBe("async boom");
    });

    it("should combine multiple Results with all", () => {
      const results = [Result.ok(1), Result.ok(2), Result.ok(3)];

      const combined = Result.all(results);
      expect(combined.isOk()).toBe(true);
      expect(combined.unwrap()).toEqual([1, 2, 3]);

      const withError = [
        Result.ok(1),
        Result.err(new Error("fail")),
        Result.ok(3),
      ];

      const combinedError = Result.all(withError);
      expect(combinedError.isErr()).toBe(true);
      expect(combinedError.error.message).toBe("fail");
    });

    it("should get first Ok with any", () => {
      const results = [
        Result.err(new Error("fail1")),
        Result.ok(42),
        Result.ok(100),
      ];

      const first = Result.any(results);
      expect(first.isOk()).toBe(true);
      expect(first.unwrap()).toBe(42);

      const allErrors = [
        Result.err(new Error("fail1")),
        Result.err(new Error("fail2")),
      ];

      const noSuccess = Result.any(allErrors);
      expect(noSuccess.isErr()).toBe(true);
      expect(noSuccess.error.message).toBe("fail2");
    });
  });

  describe("Type guards", () => {
    it("should identify Ok results", () => {
      const ok = Result.ok("success");
      const err = Result.err("error");

      expect(isOk(ok)).toBe(true);
      expect(isOk(err)).toBe(false);
    });

    it("should identify Err results", () => {
      const ok = Result.ok("success");
      const err = Result.err("error");

      expect(isErr(ok)).toBe(false);
      expect(isErr(err)).toBe(true);
    });
  });

  describe("Custom error types", () => {
    it("should create IntegrationError", () => {
      const error = new IntegrationError("Integration failed", "INT_ERROR", {
        detail: "test",
      });

      expect(error).toBeInstanceOf(Error);
      expect(error).toBeInstanceOf(IntegrationError);
      expect(error.message).toBe("Integration failed");
      expect(error.code).toBe("INT_ERROR");
      expect(error.details).toEqual({ detail: "test" });
    });

    it("should create ValidationError", () => {
      const error = new ValidationError("Validation failed", {
        field: "email",
      });

      expect(error).toBeInstanceOf(IntegrationError);
      expect(error.code).toBe("VALIDATION_ERROR");
      expect(error.details).toEqual({ field: "email" });
    });
  });

  describe("Complex scenarios", () => {
    it("should chain multiple operations", () => {
      const result = Result.ok(10)
        .map((x) => x * 2)
        .andThen((x) => (x > 15 ? Result.ok(x) : Result.err("Too small")))
        .map((x) => x + 5);

      expect(result.isOk()).toBe(true);
      expect(result.unwrap()).toBe(25);
    });

    it("should handle error propagation", () => {
      const divide = (a: number, b: number): Result<number, string> =>
        b === 0 ? Result.err("Division by zero") : Result.ok(a / b);

      const calculate = (x: number): Result<number, string> =>
        divide(10, x)
          .andThen((result) => divide(result, 2))
          .map((result) => result * 100);

      const success = calculate(5);
      expect(success.isOk()).toBe(true);
      expect(success.unwrap()).toBe(100);

      const failure = calculate(0);
      expect(failure.isErr()).toBe(true);
      expect(failure.error).toBe("Division by zero");
    });

    it("should recover from errors", () => {
      const fallback = 100;

      const result = Result.err<number, string>("error").unwrapOr(fallback);

      expect(result).toBe(fallback);

      const computed = Result.err<number, string>("error").unwrapOrElse(
        (error) => error.length,
      );

      expect(computed).toBe(5);
    });
  });
});
