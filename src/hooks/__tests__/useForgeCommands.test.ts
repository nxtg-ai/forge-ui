/**
 * Tests for useForgeCommands Hook
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import { useForgeCommands } from "../useForgeCommands";
import { apiFetch } from "../../utils/api-fetch";

// Mock apiFetch module
vi.mock("../../utils/api-fetch", () => ({
  apiFetch: vi.fn(),
}));

const mockApiFetch = apiFetch as ReturnType<typeof vi.fn>;

// Mock icon mapper - return a React element
vi.mock("../../utils/icon-mapper", () => ({
  renderIcon: (iconName: string, props: any) => {
    // Return a mock React element that can be tested
    return {
      type: "MockIcon",
      props: { name: iconName, ...props },
    };
  },
}));

describe("useForgeCommands", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("should initialize with loading state", () => {
    mockApiFetch.mockImplementation(() => new Promise(() => {}));

    const { result } = renderHook(() => useForgeCommands());

    expect(result.current.isLoading).toBe(true);
    expect(result.current.commands).toEqual([]);
    expect(result.current.error).toBe(null);
  });

  it("should fetch commands successfully", async () => {
    const mockCommands = [
      {
        id: "frg-status",
        name: "Status Report",
        description: "Generate project status",
        category: "forge",
        iconName: "status",
      },
      {
        id: "frg-test",
        name: "Run Tests",
        description: "Execute test suite",
        category: "test",
        hotkey: "t",
        iconName: "test",
      },
    ];

    mockApiFetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({
        success: true,
        data: mockCommands,
        timestamp: new Date().toISOString(),
      }),
    });

    const { result } = renderHook(() => useForgeCommands());

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.commands).toHaveLength(2);
    expect(result.current.commands[0].id).toBe("frg-status");
    expect(result.current.commands[0].name).toBe("Status Report");
    expect(result.current.commands[1].hotkey).toBe("t");
    expect(result.current.error).toBe(null);
  });

  it("should handle HTTP error responses", async () => {
    mockApiFetch.mockResolvedValue({
      ok: false,
      status: 500,
      statusText: "Internal Server Error",
    });

    const { result } = renderHook(() => useForgeCommands());

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.commands).toEqual([]);
    expect(result.current.error).toContain("500");
  });

  it("should handle network errors", async () => {
    mockApiFetch.mockRejectedValue(new Error("Network failure"));

    const { result } = renderHook(() => useForgeCommands());

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.commands).toEqual([]);
    expect(result.current.error).toBe("Network failure");
  });

  it("should handle API error response", async () => {
    mockApiFetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({
        success: false,
        data: [],
        error: "Commands not found",
      }),
    });

    const { result } = renderHook(() => useForgeCommands());

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.commands).toEqual([]);
    expect(result.current.error).toBe("Commands not found");
  });

  it("should map icon names to React components", async () => {
    const mockCommands = [
      {
        id: "frg-status",
        name: "Status",
        description: "Status",
        category: "forge",
        iconName: "chart",
      },
    ];

    mockApiFetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({
        success: true,
        data: mockCommands,
      }),
    });

    const { result } = renderHook(() => useForgeCommands());

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.commands[0].icon).toBeDefined();
    expect(result.current.commands[0].icon).toEqual({
      type: "MockIcon",
      props: expect.objectContaining({ name: "chart" }),
    });
  });

  it("should preserve command properties", async () => {
    const mockCommands = [
      {
        id: "frg-deploy",
        name: "Deploy",
        description: "Deploy application",
        category: "deploy",
        hotkey: "d",
        requiresConfirmation: true,
        iconName: "rocket",
      },
    ];

    mockApiFetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({
        success: true,
        data: mockCommands,
      }),
    });

    const { result } = renderHook(() => useForgeCommands());

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    const command = result.current.commands[0];
    expect(command.id).toBe("frg-deploy");
    expect(command.name).toBe("Deploy");
    expect(command.description).toBe("Deploy application");
    expect(command.category).toBe("deploy");
    expect(command.hotkey).toBe("d");
    expect(command.requiresConfirmation).toBe(true);
  });

  it("should handle commands without optional fields", async () => {
    const mockCommands = [
      {
        id: "frg-status",
        name: "Status",
        description: "Status",
        category: "forge",
        iconName: "status",
      },
    ];

    mockApiFetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({
        success: true,
        data: mockCommands,
      }),
    });

    const { result } = renderHook(() => useForgeCommands());

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    const command = result.current.commands[0];
    expect(command.hotkey).toBeUndefined();
    expect(command.requiresConfirmation).toBeUndefined();
  });

  it("should fetch from correct API endpoint", async () => {
    mockApiFetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({
        success: true,
        data: [],
      }),
    });

    renderHook(() => useForgeCommands());

    await waitFor(() => {
      expect(mockApiFetch).toHaveBeenCalled();
    });

    expect(mockApiFetch).toHaveBeenCalledWith("/api/commands");
  });

  it("should only fetch once on mount", async () => {
    mockApiFetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({
        success: true,
        data: [],
      }),
    });

    const { rerender } = renderHook(() => useForgeCommands());

    await waitFor(() => {
      expect(mockApiFetch).toHaveBeenCalledTimes(1);
    });

    // Rerender should not trigger another fetch
    rerender();

    await waitFor(() => {
      expect(mockApiFetch).toHaveBeenCalledTimes(1);
    });
  });

  it("should handle empty command list", async () => {
    mockApiFetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({
        success: true,
        data: [],
      }),
    });

    const { result } = renderHook(() => useForgeCommands());

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.commands).toEqual([]);
    expect(result.current.error).toBe(null);
  });

  it("should handle malformed JSON response", async () => {
    mockApiFetch.mockResolvedValue({
      ok: true,
      json: () => Promise.reject(new Error("Invalid JSON")),
    });

    const { result } = renderHook(() => useForgeCommands());

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.commands).toEqual([]);
    expect(result.current.error).toBeTruthy();
  });
});
