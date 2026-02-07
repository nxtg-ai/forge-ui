/**
 * API Fetch Tests
 * Comprehensive tests for 429 rate-limit backoff wrapper
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { apiFetch } from "../api-fetch";
import { logger } from "../browser-logger";

describe("apiFetch", () => {
  let fetchMock: ReturnType<typeof vi.fn>;
  let loggerWarnSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    // Mock global fetch
    fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);

    // Mock logger.warn to verify retry logging
    loggerWarnSpy = vi.spyOn(logger, "warn").mockImplementation(() => {});

    // Mock timers for testing delays
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.useRealTimers();
  });

  describe("Successful requests", () => {
    it("should return response on successful fetch", async () => {
      const mockResponse = new Response("success", { status: 200 });
      fetchMock.mockResolvedValueOnce(mockResponse);

      const result = apiFetch("/api/test");
      await vi.runAllTimersAsync();
      const response = await result;

      expect(response).toBe(mockResponse);
      expect(response.status).toBe(200);
      expect(fetchMock).toHaveBeenCalledOnce();
      expect(fetchMock).toHaveBeenCalledWith("/api/test", undefined);
    });

    it("should pass through RequestInit options", async () => {
      const mockResponse = new Response("success", { status: 200 });
      fetchMock.mockResolvedValueOnce(mockResponse);

      const init: RequestInit = {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ data: "test" }),
      };

      const result = apiFetch("/api/test", init);
      await vi.runAllTimersAsync();
      await result;

      expect(fetchMock).toHaveBeenCalledWith("/api/test", init);
    });

    it("should handle URL objects", async () => {
      const mockResponse = new Response("success", { status: 200 });
      fetchMock.mockResolvedValueOnce(mockResponse);

      const url = new URL("https://example.com/api/test");
      const result = apiFetch(url);
      await vi.runAllTimersAsync();
      await result;

      expect(fetchMock).toHaveBeenCalledWith(url, undefined);
    });

    it("should return response for non-429 error codes", async () => {
      const mockResponse = new Response("not found", { status: 404 });
      fetchMock.mockResolvedValueOnce(mockResponse);

      const result = apiFetch("/api/test");
      await vi.runAllTimersAsync();
      const response = await result;

      expect(response.status).toBe(404);
      expect(fetchMock).toHaveBeenCalledOnce();
      expect(loggerWarnSpy).not.toHaveBeenCalled();
    });

    it("should return response for 500 errors without retry", async () => {
      const mockResponse = new Response("server error", { status: 500 });
      fetchMock.mockResolvedValueOnce(mockResponse);

      const result = apiFetch("/api/test");
      await vi.runAllTimersAsync();
      const response = await result;

      expect(response.status).toBe(500);
      expect(fetchMock).toHaveBeenCalledOnce();
      expect(loggerWarnSpy).not.toHaveBeenCalled();
    });
  });

  describe("429 Rate Limiting - Retry-After header", () => {
    it("should retry on 429 with Retry-After header (seconds)", async () => {
      const mock429 = new Response("rate limited", {
        status: 429,
        headers: { "Retry-After": "3" },
      });
      const mockSuccess = new Response("success", { status: 200 });

      fetchMock
        .mockResolvedValueOnce(mock429)
        .mockResolvedValueOnce(mockSuccess);

      const resultPromise = apiFetch("/api/test");

      // Wait for first fetch to complete
      await Promise.resolve();

      expect(loggerWarnSpy).toHaveBeenCalledWith(
        expect.stringContaining("[apiFetch] 429 on /api/test"),
      );
      expect(loggerWarnSpy).toHaveBeenCalledWith(
        expect.stringContaining("retry 1/3 in 3s"),
      );

      // Advance timers by 3 seconds
      await vi.advanceTimersByTimeAsync(3000);

      // Second fetch returns success
      const response = await resultPromise;
      expect(response.status).toBe(200);
      expect(fetchMock).toHaveBeenCalledTimes(2);
    });

    it("should handle invalid Retry-After header (non-numeric)", async () => {
      const mock429 = new Response("rate limited", {
        status: 429,
        headers: { "Retry-After": "invalid" },
      });
      const mockSuccess = new Response("success", { status: 200 });

      fetchMock
        .mockResolvedValueOnce(mock429)
        .mockResolvedValueOnce(mockSuccess);

      const resultPromise = apiFetch("/api/test");

      await vi.runAllTimersAsync();
      expect(loggerWarnSpy).toHaveBeenCalledWith(
        expect.stringContaining("retry 1/3 in 2s"),
      );

      // Should fall back to BASE_DELAY_MS (2000ms)
      await vi.advanceTimersByTimeAsync(2000);

      const response = await resultPromise;
      expect(response.status).toBe(200);
    });

    it("should handle Retry-After with 0 seconds", async () => {
      const mock429 = new Response("rate limited", {
        status: 429,
        headers: { "Retry-After": "0" },
      });
      const mockSuccess = new Response("success", { status: 200 });

      fetchMock
        .mockResolvedValueOnce(mock429)
        .mockResolvedValueOnce(mockSuccess);

      const resultPromise = apiFetch("/api/test");

      await vi.runAllTimersAsync();
      expect(loggerWarnSpy).toHaveBeenCalledWith(
        expect.stringContaining("retry 1/3 in 0s"),
      );

      // Should wait 0ms
      await vi.advanceTimersByTimeAsync(0);

      const response = await resultPromise;
      expect(response.status).toBe(200);
    });

    it("should handle large Retry-After values", async () => {
      const mock429 = new Response("rate limited", {
        status: 429,
        headers: { "Retry-After": "60" },
      });
      const mockSuccess = new Response("success", { status: 200 });

      fetchMock
        .mockResolvedValueOnce(mock429)
        .mockResolvedValueOnce(mockSuccess);

      const resultPromise = apiFetch("/api/test");

      await vi.runAllTimersAsync();
      expect(loggerWarnSpy).toHaveBeenCalledWith(
        expect.stringContaining("retry 1/3 in 60s"),
      );

      await vi.advanceTimersByTimeAsync(60000);

      const response = await resultPromise;
      expect(response.status).toBe(200);
    });
  });

  describe("429 Rate Limiting - X-RateLimit-Reset header", () => {
    it("should retry on 429 with X-RateLimit-Reset header", async () => {
      const resetTime = new Date(Date.now() + 5000).toISOString();
      const mock429 = new Response("rate limited", {
        status: 429,
        headers: { "X-RateLimit-Reset": resetTime },
      });
      const mockSuccess = new Response("success", { status: 200 });

      fetchMock
        .mockResolvedValueOnce(mock429)
        .mockResolvedValueOnce(mockSuccess);

      const resultPromise = apiFetch("/api/test");

      await vi.runAllTimersAsync();
      expect(loggerWarnSpy).toHaveBeenCalledWith(
        expect.stringContaining("retry 1/3 in 5s"),
      );

      await vi.advanceTimersByTimeAsync(5000);

      const response = await resultPromise;
      expect(response.status).toBe(200);
    });

    it("should handle X-RateLimit-Reset in the past", async () => {
      const resetTime = new Date(Date.now() - 1000).toISOString();
      const mock429 = new Response("rate limited", {
        status: 429,
        headers: { "X-RateLimit-Reset": resetTime },
      });
      const mockSuccess = new Response("success", { status: 200 });

      fetchMock
        .mockResolvedValueOnce(mock429)
        .mockResolvedValueOnce(mockSuccess);

      const resultPromise = apiFetch("/api/test");

      await vi.runAllTimersAsync();
      // Should fall back to BASE_DELAY_MS when reset is in past
      expect(loggerWarnSpy).toHaveBeenCalledWith(
        expect.stringContaining("retry 1/3 in 2s"),
      );

      await vi.advanceTimersByTimeAsync(2000);

      const response = await resultPromise;
      expect(response.status).toBe(200);
    });

    it("should prefer Retry-After over X-RateLimit-Reset", async () => {
      const resetTime = new Date(Date.now() + 10000).toISOString();
      const mock429 = new Response("rate limited", {
        status: 429,
        headers: {
          "Retry-After": "2",
          "X-RateLimit-Reset": resetTime,
        },
      });
      const mockSuccess = new Response("success", { status: 200 });

      fetchMock
        .mockResolvedValueOnce(mock429)
        .mockResolvedValueOnce(mockSuccess);

      const resultPromise = apiFetch("/api/test");

      await vi.runAllTimersAsync();
      // Should use Retry-After (2s) instead of X-RateLimit-Reset (10s)
      expect(loggerWarnSpy).toHaveBeenCalledWith(
        expect.stringContaining("retry 1/3 in 2s"),
      );

      await vi.advanceTimersByTimeAsync(2000);

      const response = await resultPromise;
      expect(response.status).toBe(200);
    });
  });

  describe("429 Rate Limiting - Exponential backoff", () => {
    it("should use exponential backoff when no headers present", async () => {
      const mock429_1 = new Response("rate limited", { status: 429 });
      const mock429_2 = new Response("rate limited", { status: 429 });
      const mockSuccess = new Response("success", { status: 200 });

      fetchMock
        .mockResolvedValueOnce(mock429_1)
        .mockResolvedValueOnce(mock429_2)
        .mockResolvedValueOnce(mockSuccess);

      const resultPromise = apiFetch("/api/test");

      // First retry: 2s (BASE_DELAY_MS * 2^0)
      await vi.runAllTimersAsync();
      expect(loggerWarnSpy).toHaveBeenNthCalledWith(
        1,
        expect.stringContaining("retry 1/3 in 2s"),
      );

      await vi.advanceTimersByTimeAsync(2000);

      // Second retry: 4s (BASE_DELAY_MS * 2^1)
      await vi.runAllTimersAsync();
      expect(loggerWarnSpy).toHaveBeenNthCalledWith(
        2,
        expect.stringContaining("retry 2/3 in 4s"),
      );

      await vi.advanceTimersByTimeAsync(4000);

      const response = await resultPromise;
      expect(response.status).toBe(200);
      expect(fetchMock).toHaveBeenCalledTimes(3);
    });

    it("should follow exponential backoff pattern: 2s, 4s, 8s", async () => {
      const mock429_1 = new Response("rate limited", { status: 429 });
      const mock429_2 = new Response("rate limited", { status: 429 });
      const mock429_3 = new Response("rate limited", { status: 429 });
      const mockSuccess = new Response("success", { status: 200 });

      fetchMock
        .mockResolvedValueOnce(mock429_1)
        .mockResolvedValueOnce(mock429_2)
        .mockResolvedValueOnce(mock429_3)
        .mockResolvedValueOnce(mockSuccess);

      const resultPromise = apiFetch("/api/test");

      // First retry: 2s
      await vi.runAllTimersAsync();
      expect(loggerWarnSpy).toHaveBeenNthCalledWith(
        1,
        expect.stringContaining("retry 1/3 in 2s"),
      );
      await vi.advanceTimersByTimeAsync(2000);

      // Second retry: 4s
      await vi.runAllTimersAsync();
      expect(loggerWarnSpy).toHaveBeenNthCalledWith(
        2,
        expect.stringContaining("retry 2/3 in 4s"),
      );
      await vi.advanceTimersByTimeAsync(4000);

      // Third retry: 8s
      await vi.runAllTimersAsync();
      expect(loggerWarnSpy).toHaveBeenNthCalledWith(
        3,
        expect.stringContaining("retry 3/3 in 8s"),
      );
      await vi.advanceTimersByTimeAsync(8000);

      const response = await resultPromise;
      expect(response.status).toBe(200);
      expect(fetchMock).toHaveBeenCalledTimes(4);
    });
  });

  describe("Max retries exhausted", () => {
    it("should return final 429 response after MAX_RETRIES", async () => {
      const mock429 = new Response("rate limited", { status: 429 });

      fetchMock.mockResolvedValue(mock429);

      const resultPromise = apiFetch("/api/test");

      // Attempt 0 (initial)
      await vi.runAllTimersAsync();

      // Retry 1
      await vi.advanceTimersByTimeAsync(2000);
      await vi.runAllTimersAsync();

      // Retry 2
      await vi.advanceTimersByTimeAsync(4000);
      await vi.runAllTimersAsync();

      // Retry 3
      await vi.advanceTimersByTimeAsync(8000);
      await vi.runAllTimersAsync();

      const response = await resultPromise;
      expect(response.status).toBe(429);
      expect(fetchMock).toHaveBeenCalledTimes(4); // Initial + 3 retries
      expect(loggerWarnSpy).toHaveBeenCalledTimes(3); // Log on retries, not final
    });

    it("should not log warning after final retry", async () => {
      const mock429 = new Response("rate limited", { status: 429 });

      fetchMock.mockResolvedValue(mock429);

      const resultPromise = apiFetch("/api/test");

      await vi.runAllTimersAsync();
      await vi.advanceTimersByTimeAsync(2000);
      await vi.runAllTimersAsync();
      await vi.advanceTimersByTimeAsync(4000);
      await vi.runAllTimersAsync();
      await vi.advanceTimersByTimeAsync(8000);
      await vi.runAllTimersAsync();

      await resultPromise;

      // Should log exactly 3 times (for retries 1, 2, 3)
      expect(loggerWarnSpy).toHaveBeenCalledTimes(3);
      expect(loggerWarnSpy).toHaveBeenNthCalledWith(
        1,
        expect.stringContaining("retry 1/3"),
      );
      expect(loggerWarnSpy).toHaveBeenNthCalledWith(
        2,
        expect.stringContaining("retry 2/3"),
      );
      expect(loggerWarnSpy).toHaveBeenNthCalledWith(
        3,
        expect.stringContaining("retry 3/3"),
      );
    });
  });

  describe("Mixed success and failure scenarios", () => {
    it("should succeed on first retry", async () => {
      const mock429 = new Response("rate limited", { status: 429 });
      const mockSuccess = new Response("success", { status: 200 });

      fetchMock
        .mockResolvedValueOnce(mock429)
        .mockResolvedValueOnce(mockSuccess);

      const resultPromise = apiFetch("/api/test");

      await vi.runAllTimersAsync();
      await vi.advanceTimersByTimeAsync(2000);

      const response = await resultPromise;
      expect(response.status).toBe(200);
      expect(fetchMock).toHaveBeenCalledTimes(2);
      expect(loggerWarnSpy).toHaveBeenCalledTimes(1);
    });

    it("should succeed on second retry", async () => {
      const mock429_1 = new Response("rate limited", { status: 429 });
      const mock429_2 = new Response("rate limited", { status: 429 });
      const mockSuccess = new Response("success", { status: 200 });

      fetchMock
        .mockResolvedValueOnce(mock429_1)
        .mockResolvedValueOnce(mock429_2)
        .mockResolvedValueOnce(mockSuccess);

      const resultPromise = apiFetch("/api/test");

      await vi.runAllTimersAsync();
      await vi.advanceTimersByTimeAsync(2000);
      await vi.runAllTimersAsync();
      await vi.advanceTimersByTimeAsync(4000);

      const response = await resultPromise;
      expect(response.status).toBe(200);
      expect(fetchMock).toHaveBeenCalledTimes(3);
      expect(loggerWarnSpy).toHaveBeenCalledTimes(2);
    });

    it("should succeed on third (final) retry", async () => {
      const mock429_1 = new Response("rate limited", { status: 429 });
      const mock429_2 = new Response("rate limited", { status: 429 });
      const mock429_3 = new Response("rate limited", { status: 429 });
      const mockSuccess = new Response("success", { status: 200 });

      fetchMock
        .mockResolvedValueOnce(mock429_1)
        .mockResolvedValueOnce(mock429_2)
        .mockResolvedValueOnce(mock429_3)
        .mockResolvedValueOnce(mockSuccess);

      const resultPromise = apiFetch("/api/test");

      await vi.runAllTimersAsync();
      await vi.advanceTimersByTimeAsync(2000);
      await vi.runAllTimersAsync();
      await vi.advanceTimersByTimeAsync(4000);
      await vi.runAllTimersAsync();
      await vi.advanceTimersByTimeAsync(8000);

      const response = await resultPromise;
      expect(response.status).toBe(200);
      expect(fetchMock).toHaveBeenCalledTimes(4);
      expect(loggerWarnSpy).toHaveBeenCalledTimes(3);
    });
  });

  describe("Request types and URL formats", () => {
    it("should handle GET request (default)", async () => {
      const mockResponse = new Response("success", { status: 200 });
      fetchMock.mockResolvedValueOnce(mockResponse);

      const result = apiFetch("/api/users");
      await vi.runAllTimersAsync();
      await result;

      expect(fetchMock).toHaveBeenCalledWith("/api/users", undefined);
    });

    it("should handle POST request with body", async () => {
      const mockResponse = new Response("created", { status: 201 });
      fetchMock.mockResolvedValueOnce(mockResponse);

      const init: RequestInit = {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: "Test User" }),
      };

      const result = apiFetch("/api/users", init);
      await vi.runAllTimersAsync();
      const response = await result;

      expect(response.status).toBe(201);
      expect(fetchMock).toHaveBeenCalledWith("/api/users", init);
    });

    it("should handle PUT request", async () => {
      const mockResponse = new Response("updated", { status: 200 });
      fetchMock.mockResolvedValueOnce(mockResponse);

      const init: RequestInit = {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: "Updated User" }),
      };

      const result = apiFetch("/api/users/123", init);
      await vi.runAllTimersAsync();
      await result;

      expect(fetchMock).toHaveBeenCalledWith("/api/users/123", init);
    });

    it("should handle DELETE request", async () => {
      const mockResponse = new Response(null, { status: 204 });
      fetchMock.mockResolvedValueOnce(mockResponse);

      const init: RequestInit = { method: "DELETE" };

      const result = apiFetch("/api/users/123", init);
      await vi.runAllTimersAsync();
      await result;

      expect(fetchMock).toHaveBeenCalledWith("/api/users/123", init);
    });

    it("should handle relative URLs", async () => {
      const mockResponse = new Response("success", { status: 200 });
      fetchMock.mockResolvedValueOnce(mockResponse);

      const result = apiFetch("/api/test");
      await vi.runAllTimersAsync();
      await result;

      expect(fetchMock).toHaveBeenCalledWith("/api/test", undefined);
    });

    it("should handle absolute URLs", async () => {
      const mockResponse = new Response("success", { status: 200 });
      fetchMock.mockResolvedValueOnce(mockResponse);

      const result = apiFetch("https://api.example.com/test");
      await vi.runAllTimersAsync();
      await result;

      expect(fetchMock).toHaveBeenCalledWith(
        "https://api.example.com/test",
        undefined,
      );
    });

    it("should handle URLs with query parameters", async () => {
      const mockResponse = new Response("success", { status: 200 });
      fetchMock.mockResolvedValueOnce(mockResponse);

      const result = apiFetch("/api/users?page=1&limit=10");
      await vi.runAllTimersAsync();
      await result;

      expect(fetchMock).toHaveBeenCalledWith(
        "/api/users?page=1&limit=10",
        undefined,
      );
    });

    it("should handle URLs with fragments", async () => {
      const mockResponse = new Response("success", { status: 200 });
      fetchMock.mockResolvedValueOnce(mockResponse);

      const result = apiFetch("/api/docs#section");
      await vi.runAllTimersAsync();
      await result;

      expect(fetchMock).toHaveBeenCalledWith("/api/docs#section", undefined);
    });

    it("should handle Request objects", async () => {
      const mockResponse = new Response("success", { status: 200 });
      fetchMock.mockResolvedValueOnce(mockResponse);

      const request = new Request("https://example.com/api/test", {
        method: "GET",
      });
      const result = apiFetch(request);
      await vi.runAllTimersAsync();
      await result;

      expect(fetchMock).toHaveBeenCalledWith(request, undefined);
    });
  });

  describe("Logger integration", () => {
    it("should log URL string on 429 retry", async () => {
      const mock429 = new Response("rate limited", { status: 429 });
      const mockSuccess = new Response("success", { status: 200 });

      fetchMock
        .mockResolvedValueOnce(mock429)
        .mockResolvedValueOnce(mockSuccess);

      const resultPromise = apiFetch("/api/test");

      await vi.runAllTimersAsync();

      expect(loggerWarnSpy).toHaveBeenCalledWith(
        "[apiFetch] 429 on /api/test, retry 1/3 in 2s",
      );

      await vi.advanceTimersByTimeAsync(2000);
      await resultPromise;
    });

    it("should log 'request' for non-string input on 429 retry", async () => {
      const mock429 = new Response("rate limited", { status: 429 });
      const mockSuccess = new Response("success", { status: 200 });

      fetchMock
        .mockResolvedValueOnce(mock429)
        .mockResolvedValueOnce(mockSuccess);

      const url = new URL("https://example.com/api/test");
      const resultPromise = apiFetch(url);

      await vi.runAllTimersAsync();

      expect(loggerWarnSpy).toHaveBeenCalledWith(
        "[apiFetch] 429 on request, retry 1/3 in 2s",
      );

      await vi.advanceTimersByTimeAsync(2000);
      await resultPromise;
    });

    it("should log Request objects as 'request'", async () => {
      const mock429 = new Response("rate limited", { status: 429 });
      const mockSuccess = new Response("success", { status: 200 });

      fetchMock
        .mockResolvedValueOnce(mock429)
        .mockResolvedValueOnce(mockSuccess);

      const request = new Request("https://example.com/api/test");
      const resultPromise = apiFetch(request);

      await vi.runAllTimersAsync();

      expect(loggerWarnSpy).toHaveBeenCalledWith(
        "[apiFetch] 429 on request, retry 1/3 in 2s",
      );

      await vi.advanceTimersByTimeAsync(2000);
      await resultPromise;
    });
  });

  describe("Response body handling", () => {
    it("should preserve response body for successful requests", async () => {
      const mockResponse = new Response(JSON.stringify({ data: "test" }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
      fetchMock.mockResolvedValueOnce(mockResponse);

      const result = apiFetch("/api/test");
      await vi.runAllTimersAsync();
      const response = await result;

      const json = await response.json();
      expect(json).toEqual({ data: "test" });
    });

    it("should preserve response body for error responses", async () => {
      const mockResponse = new Response(
        JSON.stringify({ error: "Not found" }),
        {
          status: 404,
          headers: { "Content-Type": "application/json" },
        },
      );
      fetchMock.mockResolvedValueOnce(mockResponse);

      const result = apiFetch("/api/test");
      await vi.runAllTimersAsync();
      const response = await result;

      const json = await response.json();
      expect(json).toEqual({ error: "Not found" });
    });

    it("should preserve response headers", async () => {
      const mockResponse = new Response("success", {
        status: 200,
        headers: {
          "Content-Type": "application/json",
          "X-Custom-Header": "test-value",
        },
      });
      fetchMock.mockResolvedValueOnce(mockResponse);

      const result = apiFetch("/api/test");
      await vi.runAllTimersAsync();
      const response = await result;

      expect(response.headers.get("Content-Type")).toBe("application/json");
      expect(response.headers.get("X-Custom-Header")).toBe("test-value");
    });
  });

  describe("Edge cases", () => {
    it("should handle empty response body", async () => {
      const mockResponse = new Response(null, { status: 204 });
      fetchMock.mockResolvedValueOnce(mockResponse);

      const result = apiFetch("/api/test");
      await vi.runAllTimersAsync();
      const response = await result;

      expect(response.status).toBe(204);
      expect(response.body).toBeNull();
    });

    it("should handle very large response bodies", async () => {
      const largeBody = "x".repeat(1_000_000);
      const mockResponse = new Response(largeBody, { status: 200 });
      fetchMock.mockResolvedValueOnce(mockResponse);

      const result = apiFetch("/api/test");
      await vi.runAllTimersAsync();
      const response = await result;

      const text = await response.text();
      expect(text.length).toBe(1_000_000);
    });

    it("should handle network errors (fetch throws)", async () => {
      fetchMock.mockRejectedValueOnce(new Error("Network error"));

      const result = apiFetch("/api/test");

      await expect(result).rejects.toThrow("Network error");
      expect(fetchMock).toHaveBeenCalledOnce();
      expect(loggerWarnSpy).not.toHaveBeenCalled();
    });

    it("should not retry on network errors", async () => {
      fetchMock.mockRejectedValueOnce(new Error("Network error"));

      await expect(apiFetch("/api/test")).rejects.toThrow("Network error");
      expect(fetchMock).toHaveBeenCalledOnce();
    });

    it("should handle simultaneous multiple apiFetch calls", async () => {
      const mockResponse1 = new Response("response1", { status: 200 });
      const mockResponse2 = new Response("response2", { status: 200 });

      fetchMock
        .mockResolvedValueOnce(mockResponse1)
        .mockResolvedValueOnce(mockResponse2);

      const [response1Promise, response2Promise] = [
        apiFetch("/api/test1"),
        apiFetch("/api/test2"),
      ];

      await vi.runAllTimersAsync();

      const [response1, response2] = await Promise.all([
        response1Promise,
        response2Promise,
      ]);

      expect(response1.status).toBe(200);
      expect(response2.status).toBe(200);
      expect(fetchMock).toHaveBeenCalledTimes(2);
    });

    it("should handle multiple concurrent 429s independently", async () => {
      const mock429_1 = new Response("rate limited", { status: 429 });
      const mock429_2 = new Response("rate limited", { status: 429 });
      const mockSuccess1 = new Response("success1", { status: 200 });
      const mockSuccess2 = new Response("success2", { status: 200 });

      fetchMock
        .mockResolvedValueOnce(mock429_1)
        .mockResolvedValueOnce(mock429_2)
        .mockResolvedValueOnce(mockSuccess1)
        .mockResolvedValueOnce(mockSuccess2);

      const [result1Promise, result2Promise] = [
        apiFetch("/api/test1"),
        apiFetch("/api/test2"),
      ];

      await vi.runAllTimersAsync();
      await vi.advanceTimersByTimeAsync(2000);

      const [response1, response2] = await Promise.all([
        result1Promise,
        result2Promise,
      ]);

      expect(response1.status).toBe(200);
      expect(response2.status).toBe(200);
      expect(fetchMock).toHaveBeenCalledTimes(4);
      expect(loggerWarnSpy).toHaveBeenCalledTimes(2);
    });
  });

  describe("Constants validation", () => {
    it("should have MAX_RETRIES set to 3", async () => {
      const mock429 = new Response("rate limited", { status: 429 });
      fetchMock.mockResolvedValue(mock429);

      const resultPromise = apiFetch("/api/test");

      // Wait for initial fetch
      await Promise.resolve();

      // Advance through all 3 retries
      await vi.advanceTimersByTimeAsync(2000); // Retry 1
      await vi.runAllTimersAsync();

      await vi.advanceTimersByTimeAsync(4000); // Retry 2
      await vi.runAllTimersAsync();

      await vi.advanceTimersByTimeAsync(8000); // Retry 3
      await vi.runAllTimersAsync();

      const response = await resultPromise;

      // Should have made 4 fetch calls (initial + 3 retries)
      expect(fetchMock).toHaveBeenCalledTimes(4);
      expect(response.status).toBe(429);
    });

    it("should use BASE_DELAY_MS of 2000ms", async () => {
      const mock429 = new Response("rate limited", { status: 429 });
      const mockSuccess = new Response("success", { status: 200 });

      fetchMock
        .mockResolvedValueOnce(mock429)
        .mockResolvedValueOnce(mockSuccess);

      const resultPromise = apiFetch("/api/test");

      // Wait for first fetch
      await Promise.resolve();

      // First retry should be 2s (2000ms)
      expect(loggerWarnSpy).toHaveBeenCalledWith(
        expect.stringContaining("retry 1/3 in 2s"),
      );

      await vi.advanceTimersByTimeAsync(2000);
      await resultPromise;
    });
  });
});
