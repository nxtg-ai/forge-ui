/**
 * The Worker Pool panel must not say "healthy" while workers crash and
 * respawn, or when no worker runs at all. NEXUS: DIRECTIVE-NXTG-20261014-15
 * item 4 (UAT: every worker exited with code 2 and the panel said healthy).
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";

const { mockApiFetch } = vi.hoisted(() => ({ mockApiFetch: vi.fn() }));
vi.mock("../../../utils/api-fetch", () => ({ apiFetch: mockApiFetch }));

import { WorkerPoolMetrics } from "../WorkerPoolMetrics";

function metrics(overrides: Record<string, number>) {
  return {
    totalWorkers: 2,
    activeWorkers: 0,
    idleWorkers: 2,
    errorWorkers: 0,
    tasksQueued: 0,
    tasksRunning: 0,
    tasksCompleted: 0,
    tasksFailed: 0,
    avgTaskDuration: 0,
    avgQueueWaitTime: 0,
    utilization: 0,
    uptime: 1000,
    recentCrashes: 0,
    ...overrides,
  };
}

function serve(m: ReturnType<typeof metrics>) {
  mockApiFetch.mockResolvedValue({
    ok: true,
    json: async () => ({ success: true, data: { status: "running", metrics: m } }),
  });
}

describe("WorkerPoolMetrics health", () => {
  beforeEach(() => mockApiFetch.mockReset());

  it("says healthy for running workers with no crashes", async () => {
    serve(metrics({}));
    render(<WorkerPoolMetrics />);
    await waitFor(() => expect(screen.getByText("Health: healthy")).toBeInTheDocument());
  });

  it("does not say healthy while workers keep crashing", async () => {
    serve(metrics({ totalWorkers: 0, idleWorkers: 0, recentCrashes: 5 }));
    render(<WorkerPoolMetrics />);
    await waitFor(() => expect(screen.getByText("Health: unhealthy: workers keep crashing")).toBeInTheDocument());
    expect(screen.queryByText("Health: healthy")).not.toBeInTheDocument();
  });

  it("does not say healthy with no workers running", async () => {
    serve(metrics({ totalWorkers: 0, idleWorkers: 0 }));
    render(<WorkerPoolMetrics />);
    await waitFor(() => expect(screen.getByText("Health: no workers running")).toBeInTheDocument());
  });

  it("is degraded after a single recent crash", async () => {
    serve(metrics({ recentCrashes: 1 }));
    render(<WorkerPoolMetrics />);
    await waitFor(() => expect(screen.getByText("Health: degraded")).toBeInTheDocument());
  });
});
