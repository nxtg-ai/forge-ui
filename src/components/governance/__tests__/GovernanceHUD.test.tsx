/**
 * Tests for GovernanceHUD
 *
 * Targets branch coverage: loading/error/null-state guards, the initial-fetch
 * try/catch/finally paths (ok-false, missing-data, thrown Error, thrown
 * non-Error), the WebSocket governance.update + runspace.activated + onStateChange
 * subscriptions (including the isMountedRef guard on each), the 4-way
 * connectionStatus ternary chain (dot class/title + label text), and every
 * conditional child render (`state.workstreams && state.sentinelLog`,
 * `state.constitution`, `state.workstreams`, `state.sentinelLog`) in
 * src/components/governance/GovernanceHUD.tsx.
 *
 * NOTE: the wsManager mock path below is `../../../services/ws-manager`
 * (three levels up from this __tests__ dir to src/, then into services/) —
 * it must match the module GovernanceHUD.tsx itself resolves
 * (`../../services/ws-manager` from src/components/governance/), otherwise
 * vi.mock silently fails to intercept and every ws-driven assertion becomes
 * hollow (the previous version of this file had this bug).
 */
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, waitFor, act } from "@testing-library/react";

// Mock apiFetch so we control every response the initial fetch sees.
vi.mock("../../../utils/api-fetch", () => ({
  apiFetch: vi.fn(),
}));

// Mock wsManager using vi.hoisted() so handlers are capturable during module init.
const { mockSubscribe, mockOnStateChange, mockUnsubMessage, mockUnsubRunspace, mockUnsubState } =
  vi.hoisted(() => ({
    mockSubscribe: vi.fn(),
    mockOnStateChange: vi.fn(),
    mockUnsubMessage: vi.fn(),
    mockUnsubRunspace: vi.fn(),
    mockUnsubState: vi.fn(),
  }));

vi.mock("../../../services/ws-manager", () => ({
  wsManager: {
    subscribe: mockSubscribe,
    onStateChange: mockOnStateChange,
  },
}));

// Stub every sub-card so GovernanceHUD's OWN conditional-render branches are
// isolated from each child's internal fetch/ws behavior.
vi.mock("../ConstitutionCard", () => ({
  ConstitutionCard: (props: any) => (
    <div data-testid="stub-constitution">{props.constitution?.directive}</div>
  ),
}));
vi.mock("../ImpactMatrix", () => ({
  ImpactMatrix: (props: any) => (
    <div data-testid="stub-impact">{props.workstreams?.length}</div>
  ),
}));
vi.mock("../OracleFeed", () => ({
  OracleFeed: (props: any) => <div data-testid="stub-oracle">{props.logs?.length}</div>,
}));
vi.mock("../StrategicAdvisor", () => ({
  StrategicAdvisor: () => <div data-testid="stub-strategic" />,
}));
vi.mock("../WorkerPoolMetrics", () => ({
  WorkerPoolMetrics: () => <div data-testid="stub-worker" />,
}));
vi.mock("../ProjectContextCard", () => ({
  ProjectContextCard: () => <div data-testid="stub-projectctx" />,
}));
vi.mock("../AgentActivityFeed", () => ({
  AgentActivityFeed: (props: any) => (
    <div data-testid="stub-agentfeed">{props.maxEntries}</div>
  ),
}));
vi.mock("../MemoryInsightsCard", () => ({
  MemoryInsightsCard: () => <div data-testid="stub-memory" />,
}));
vi.mock("../BlockingDecisionsCard", () => ({
  BlockingDecisionsCard: () => <div data-testid="stub-blocking" />,
}));

import { GovernanceHUD } from "../GovernanceHUD";
import { apiFetch } from "../../../utils/api-fetch";

const mockApiFetch = apiFetch as ReturnType<typeof vi.fn>;

let messageHandler: ((data: any) => void) | null = null;
let runspaceHandler: (() => void) | null = null;
let stateHandler: ((wsState: any) => void) | null = null;

function makeState(overrides: any = {}) {
  return {
    version: 1,
    timestamp: "2026-01-01T00:00:00.000Z",
    constitution: undefined,
    workstreams: undefined,
    sentinelLog: undefined,
    metadata: { lastSync: "2026-01-01T00:00:00.000Z" },
    ...overrides,
  };
}

function okResponse(data: any) {
  return { ok: true, json: async () => ({ data }) };
}

describe("GovernanceHUD", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    messageHandler = null;
    runspaceHandler = null;
    stateHandler = null;

    mockSubscribe.mockImplementation((eventType: string, handler: any) => {
      if (eventType === "governance.update") {
        messageHandler = handler;
        return mockUnsubMessage;
      }
      if (eventType === "runspace.activated") {
        runspaceHandler = handler;
        return mockUnsubRunspace;
      }
      return vi.fn();
    });
    mockOnStateChange.mockImplementation((handler: any) => {
      stateHandler = handler;
      return mockUnsubState;
    });
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe("initial fetch — loading / error / success branches", () => {
    it("renders the loading state before the initial fetch resolves", () => {
      mockApiFetch.mockImplementation(() => new Promise(() => {}));
      render(<GovernanceHUD />);
      expect(screen.getByTestId("governance-hud-loading")).toBeInTheDocument();
      expect(screen.getByText("Loading governance...")).toBeInTheDocument();
    });

    it("renders the error state with status+body when res.ok is false", async () => {
      mockApiFetch.mockResolvedValueOnce({
        ok: false,
        status: 500,
        text: async () => "Server broke",
      });
      render(<GovernanceHUD />);
      await waitFor(() =>
        expect(screen.getByTestId("governance-hud-error")).toBeInTheDocument(),
      );
      expect(screen.getByText("API returned 500: Server broke")).toBeInTheDocument();
    });

    it("renders the error state when response.data is missing", async () => {
      mockApiFetch.mockResolvedValueOnce({ ok: true, json: async () => ({}) });
      render(<GovernanceHUD />);
      await waitFor(() =>
        expect(screen.getByTestId("governance-hud-error")).toBeInTheDocument(),
      );
      expect(
        screen.getByText("Invalid response structure - missing data property"),
      ).toBeInTheDocument();
    });

    it("renders the error state with the Error message when fetch throws an Error", async () => {
      mockApiFetch.mockRejectedValueOnce(new Error("network down"));
      render(<GovernanceHUD />);
      await waitFor(() =>
        expect(screen.getByTestId("governance-hud-error")).toBeInTheDocument(),
      );
      expect(screen.getByText("network down")).toBeInTheDocument();
    });

    it("renders the error state with a generic message when a non-Error is thrown", async () => {
      mockApiFetch.mockRejectedValueOnce("string failure");
      render(<GovernanceHUD />);
      await waitFor(() =>
        expect(screen.getByTestId("governance-hud-error")).toBeInTheDocument(),
      );
      expect(screen.getByText("Unknown error occurred")).toBeInTheDocument();
    });

    it("renders the HUD container once the fetch succeeds", async () => {
      mockApiFetch.mockResolvedValueOnce(okResponse(makeState()));
      render(<GovernanceHUD />);
      await waitFor(() =>
        expect(screen.getByTestId("governance-hud-container")).toBeInTheDocument(),
      );
      expect(screen.queryByTestId("governance-hud-loading")).not.toBeInTheDocument();
      expect(screen.queryByTestId("governance-hud-error")).not.toBeInTheDocument();
    });
  });

  describe("null-state guard via WebSocket governance.update", () => {
    it("returns null (no container/loading/error) when a ws update delivers falsy data", async () => {
      mockApiFetch.mockResolvedValueOnce(okResponse(makeState()));
      const { container } = render(<GovernanceHUD />);
      await waitFor(() =>
        expect(screen.getByTestId("governance-hud-container")).toBeInTheDocument(),
      );

      act(() => {
        messageHandler!(null);
      });

      expect(screen.queryByTestId("governance-hud-container")).not.toBeInTheDocument();
      expect(screen.queryByTestId("governance-hud-loading")).not.toBeInTheDocument();
      expect(screen.queryByTestId("governance-hud-error")).not.toBeInTheDocument();
      expect(container.firstChild).toBeNull();
    });

    it("re-populates the HUD and clears error when a ws update delivers truthy data", async () => {
      mockApiFetch.mockResolvedValueOnce(okResponse(makeState()));
      render(<GovernanceHUD />);
      await waitFor(() =>
        expect(screen.getByTestId("governance-hud-container")).toBeInTheDocument(),
      );

      act(() => {
        messageHandler!(
          makeState({
            constitution: { directive: "Ship it", vision: [], status: "active", confidence: 90 },
          }),
        );
      });

      await waitFor(() =>
        expect(screen.getByTestId("stub-constitution")).toHaveTextContent("Ship it"),
      );
    });

    it("does not update state when governance.update fires after unmount (isMountedRef guard)", async () => {
      mockApiFetch.mockResolvedValueOnce(okResponse(makeState()));
      const { unmount } = render(<GovernanceHUD />);
      await waitFor(() => expect(messageHandler).not.toBeNull());
      unmount();
      expect(() => {
        messageHandler!(makeState());
      }).not.toThrow();
    });
  });

  describe("runspace.activated re-fetch", () => {
    it("sets loading true and re-fetches, then renders the refreshed data", async () => {
      mockApiFetch.mockResolvedValueOnce(
        okResponse(
          makeState({ workstreams: [{ id: "w1" }, { id: "w2" }], sentinelLog: [{ id: "s1" }] }),
        ),
      );
      render(<GovernanceHUD />);
      await waitFor(() => expect(screen.getByTestId("stub-impact")).toHaveTextContent("2"));

      let resolveSecond!: (v: any) => void;
      mockApiFetch.mockImplementationOnce(
        () =>
          new Promise((resolve) => {
            resolveSecond = resolve;
          }),
      );

      act(() => {
        runspaceHandler!();
      });

      expect(screen.getByTestId("governance-hud-loading")).toBeInTheDocument();

      await act(async () => {
        resolveSecond(
          okResponse(
            makeState({
              workstreams: [
                { id: "w1" },
                { id: "w2" },
                { id: "w3" },
                { id: "w4" },
                { id: "w5" },
              ],
              sentinelLog: [{ id: "s1" }],
            }),
          ),
        );
        await Promise.resolve();
        await Promise.resolve();
      });

      await waitFor(() => expect(screen.getByTestId("stub-impact")).toHaveTextContent("5"));
    });

    it("does not re-fetch when runspace.activated fires after unmount (isMountedRef guard)", async () => {
      mockApiFetch.mockResolvedValueOnce(okResponse(makeState()));
      const { unmount } = render(<GovernanceHUD />);
      await waitFor(() => expect(runspaceHandler).not.toBeNull());
      unmount();
      mockApiFetch.mockClear();
      expect(() => {
        runspaceHandler!();
      }).not.toThrow();
      expect(mockApiFetch).not.toHaveBeenCalled();
    });
  });

  describe("connectionStatus — dot color/title + label ternary chain", () => {
    async function renderReady() {
      mockApiFetch.mockResolvedValueOnce(okResponse(makeState()));
      render(<GovernanceHUD />);
      await waitFor(() =>
        expect(screen.getByTestId("governance-hud-container")).toBeInTheDocument(),
      );
    }

    it("defaults to the connecting (yellow) branch before any state-change event", async () => {
      await renderReady();
      const dot = document.querySelector('[title="Connecting..."]');
      expect(dot).not.toBeNull();
      expect(dot!.className).toContain("bg-yellow-500");
      expect(dot!.className).toContain("animate-pulse");
      expect(screen.getByText("Connecting")).toBeInTheDocument();
    });

    it("renders the connected (green) branch", async () => {
      await renderReady();
      act(() => {
        stateHandler!({ status: "connected", reconnectAttempt: 0 });
      });
      const dot = document.querySelector('[title="Real-time updates active"]');
      expect(dot).not.toBeNull();
      expect(dot!.className).toContain("bg-green-500");
      expect(screen.getByText("Live")).toBeInTheDocument();
    });

    it("renders the fallback (blue, polling) branch when disconnected with reconnectAttempt >= 5", async () => {
      await renderReady();
      act(() => {
        stateHandler!({ status: "disconnected", reconnectAttempt: 5 });
      });
      const dot = document.querySelector('[title="Polling mode (5s)"]');
      expect(dot).not.toBeNull();
      expect(dot!.className).toContain("bg-blue-500");
      expect(screen.getByText("Polling")).toBeInTheDocument();
    });

    it("renders the reconnecting branch as 'connecting' (yellow)", async () => {
      await renderReady();
      act(() => {
        stateHandler!({ status: "reconnecting", reconnectAttempt: 2 });
      });
      const dot = document.querySelector('[title="Connecting..."]');
      expect(dot).not.toBeNull();
      expect(dot!.className).toContain("bg-yellow-500");
      expect(screen.getByText("Connecting")).toBeInTheDocument();
    });

    it("renders the disconnected (gray, offline) branch when reconnectAttempt is below the fallback threshold", async () => {
      await renderReady();
      act(() => {
        stateHandler!({ status: "disconnected", reconnectAttempt: 2 });
      });
      const dot = document.querySelector('[title="Disconnected"]');
      expect(dot).not.toBeNull();
      expect(dot!.className).toContain("bg-gray-500");
      expect(screen.getByText("Offline")).toBeInTheDocument();
    });

    it("does not update connectionStatus when onStateChange fires after unmount (isMountedRef guard)", async () => {
      mockApiFetch.mockResolvedValueOnce(okResponse(makeState()));
      const { unmount } = render(<GovernanceHUD />);
      await waitFor(() =>
        expect(screen.getByTestId("governance-hud-container")).toBeInTheDocument(),
      );
      unmount();
      expect(() => {
        stateHandler!({ status: "connected", reconnectAttempt: 0 });
      }).not.toThrow();
    });
  });

  describe("conditional child composition", () => {
    it("always renders ProjectContextCard, WorkerPoolMetrics, BlockingDecisionsCard, MemoryInsightsCard and AgentActivityFeed(maxEntries=15)", async () => {
      mockApiFetch.mockResolvedValueOnce(okResponse(makeState()));
      render(<GovernanceHUD />);
      await waitFor(() =>
        expect(screen.getByTestId("governance-hud-container")).toBeInTheDocument(),
      );
      expect(screen.getByTestId("stub-projectctx")).toBeInTheDocument();
      expect(screen.getByTestId("stub-worker")).toBeInTheDocument();
      expect(screen.getByTestId("stub-blocking")).toBeInTheDocument();
      expect(screen.getByTestId("stub-memory")).toBeInTheDocument();
      expect(screen.getByTestId("stub-agentfeed")).toHaveTextContent("15");
    });

    it("renders StrategicAdvisor, ImpactMatrix and OracleFeed when workstreams AND sentinelLog are both present", async () => {
      mockApiFetch.mockResolvedValueOnce(
        okResponse(
          makeState({ workstreams: [{ id: "w1" }], sentinelLog: [{ id: "s1" }, { id: "s2" }] }),
        ),
      );
      render(<GovernanceHUD />);
      await waitFor(() =>
        expect(screen.getByTestId("governance-hud-container")).toBeInTheDocument(),
      );
      expect(screen.getByTestId("stub-strategic")).toBeInTheDocument();
      expect(screen.getByTestId("stub-impact")).toHaveTextContent("1");
      expect(screen.getByTestId("stub-oracle")).toHaveTextContent("2");
    });

    it("omits StrategicAdvisor and OracleFeed but renders ImpactMatrix when only workstreams is present", async () => {
      mockApiFetch.mockResolvedValueOnce(
        okResponse(makeState({ workstreams: [{ id: "w1" }], sentinelLog: undefined })),
      );
      render(<GovernanceHUD />);
      await waitFor(() =>
        expect(screen.getByTestId("governance-hud-container")).toBeInTheDocument(),
      );
      expect(screen.queryByTestId("stub-strategic")).not.toBeInTheDocument();
      expect(screen.getByTestId("stub-impact")).toBeInTheDocument();
      expect(screen.queryByTestId("stub-oracle")).not.toBeInTheDocument();
    });

    it("omits StrategicAdvisor and ImpactMatrix but renders OracleFeed when only sentinelLog is present", async () => {
      mockApiFetch.mockResolvedValueOnce(
        okResponse(makeState({ workstreams: undefined, sentinelLog: [{ id: "s1" }] })),
      );
      render(<GovernanceHUD />);
      await waitFor(() =>
        expect(screen.getByTestId("governance-hud-container")).toBeInTheDocument(),
      );
      expect(screen.queryByTestId("stub-strategic")).not.toBeInTheDocument();
      expect(screen.queryByTestId("stub-impact")).not.toBeInTheDocument();
      expect(screen.getByTestId("stub-oracle")).toBeInTheDocument();
    });

    it("omits StrategicAdvisor, ImpactMatrix and OracleFeed when neither workstreams nor sentinelLog is present", async () => {
      mockApiFetch.mockResolvedValueOnce(
        okResponse(makeState({ workstreams: undefined, sentinelLog: undefined })),
      );
      render(<GovernanceHUD />);
      await waitFor(() =>
        expect(screen.getByTestId("governance-hud-container")).toBeInTheDocument(),
      );
      expect(screen.queryByTestId("stub-strategic")).not.toBeInTheDocument();
      expect(screen.queryByTestId("stub-impact")).not.toBeInTheDocument();
      expect(screen.queryByTestId("stub-oracle")).not.toBeInTheDocument();
    });

    it("renders ConstitutionCard when constitution is present", async () => {
      mockApiFetch.mockResolvedValueOnce(
        okResponse(
          makeState({
            constitution: {
              directive: "Win the market",
              vision: ["a"],
              status: "active",
              confidence: 80,
            },
          }),
        ),
      );
      render(<GovernanceHUD />);
      await waitFor(() =>
        expect(screen.getByTestId("stub-constitution")).toHaveTextContent("Win the market"),
      );
    });

    it("omits ConstitutionCard when constitution is absent", async () => {
      mockApiFetch.mockResolvedValueOnce(okResponse(makeState({ constitution: undefined })));
      render(<GovernanceHUD />);
      await waitFor(() =>
        expect(screen.getByTestId("governance-hud-container")).toBeInTheDocument(),
      );
      expect(screen.queryByTestId("stub-constitution")).not.toBeInTheDocument();
    });
  });

  describe("className prop", () => {
    it("falls back to an empty string when className is not provided", async () => {
      mockApiFetch.mockResolvedValueOnce(okResponse(makeState()));
      render(<GovernanceHUD />);
      const el = await screen.findByTestId("governance-hud-container");
      expect(el.className).not.toContain("undefined");
      expect(el.className).not.toContain("custom-hud-class");
      expect(el.className).toContain("rounded-xl");
    });

    it("appends a custom className when provided", async () => {
      mockApiFetch.mockResolvedValueOnce(okResponse(makeState()));
      render(<GovernanceHUD className="custom-hud-class" />);
      const el = await screen.findByTestId("governance-hud-container");
      expect(el.className).toContain("custom-hud-class");
    });
  });

  describe("unmount cleanup", () => {
    it("calls all three unsubscribe functions on unmount", async () => {
      mockApiFetch.mockResolvedValueOnce(okResponse(makeState()));
      const { unmount } = render(<GovernanceHUD />);
      await waitFor(() =>
        expect(screen.getByTestId("governance-hud-container")).toBeInTheDocument(),
      );
      unmount();
      expect(mockUnsubMessage).toHaveBeenCalledTimes(1);
      expect(mockUnsubRunspace).toHaveBeenCalledTimes(1);
      expect(mockUnsubState).toHaveBeenCalledTimes(1);
    });
  });
});
