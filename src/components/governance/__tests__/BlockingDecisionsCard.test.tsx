/**
 * Tests for BlockingDecisionsCard Component
 *
 * Test coverage:
 * - null-render guard (no data / no summary)
 * - needsAttention border + icon color branches
 * - totalIssues > 0 vs === 0 header badge
 * - expand/collapse toggle (ChevronDown rotate class + AnimatePresence)
 * - empty-state "No blockers" message vs populated sections
 * - blockedWorkstreams: absent vs present, high vs non-high risk color
 * - actionItems: absent vs present, typeColor per type (CRITICAL/ERROR/WARN/default), slice(0,5) cap
 * - pendingDecisions: absent vs present, dependencies.length > 0 vs 0 guard
 * - WebSocket runspace.activated re-fetch subscription + unsubscribe on unmount
 * - fetch failure (res.ok false) and thrown error (catch swallow) leave data null
 * - response missing json.success / json.data leaves data null
 */

import { describe, test, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";

// Mock framer-motion (project-standard pattern)
vi.mock("framer-motion", () => ({
  motion: {
    div: ({ children, className, ...props }: any) => (
      <div className={className} {...props}>
        {children}
      </div>
    ),
  },
}));

// Mock SafeAnimatePresence - render children conditionally like real AnimatePresence
vi.mock("../../ui/SafeAnimatePresence", () => ({
  SafeAnimatePresence: ({ children }: any) => <>{children}</>,
}));

// Mock apiFetch
vi.mock("../../../utils/api-fetch", () => ({
  apiFetch: vi.fn(),
}));

// Mock wsManager using vi.hoisted() so it's available during module init
const { mockSubscribe, mockUnsubscribe } = vi.hoisted(() => ({
  mockSubscribe: vi.fn(),
  mockUnsubscribe: vi.fn(),
}));

vi.mock("../../../services/ws-manager", () => ({
  wsManager: {
    subscribe: mockSubscribe,
  },
}));

import { BlockingDecisionsCard } from "../BlockingDecisionsCard";
import { apiFetch } from "../../../utils/api-fetch";

const mockApiFetch = apiFetch as ReturnType<typeof vi.fn>;

function mockResponse(data: any) {
  return {
    ok: true,
    json: async () => ({ success: true, data }),
  };
}

const emptyData = {
  blockedWorkstreams: [],
  actionItems: [],
  pendingDecisions: [],
  summary: {
    totalBlockers: 0,
    totalActionItems: 0,
    totalPending: 0,
    needsAttention: false,
  },
};

const fullData = {
  blockedWorkstreams: [
    { id: "ws-1", name: "Payments Refactor", status: "blocked", risk: "high", blockerCount: 2, progress: 42 },
    { id: "ws-2", name: "Docs Migration", status: "blocked", risk: "medium", blockerCount: 1, progress: 10 },
  ],
  actionItems: [
    { id: "a-1", type: "CRITICAL", message: "Critical msg", source: "sentinel", timestamp: 1, actionRequired: true },
    { id: "a-2", type: "ERROR", message: "Error msg", source: "sentinel", timestamp: 2, actionRequired: true },
    { id: "a-3", type: "WARN", message: "Warn msg", source: "sentinel", timestamp: 3, actionRequired: true },
    { id: "a-4", type: "INFO", message: "Default msg", source: "sentinel", timestamp: 4, actionRequired: false },
    { id: "a-5", type: "INFO", message: "Fifth msg", source: "sentinel", timestamp: 5, actionRequired: false },
    { id: "a-6", type: "INFO", message: "Sixth msg (should be sliced off)", source: "sentinel", timestamp: 6, actionRequired: false },
  ],
  pendingDecisions: [
    { id: "pd-1", name: "Decide on vendor", taskCount: 3, dependencies: ["ws-1", "ws-2"] },
    { id: "pd-2", name: "Decide on rollout", taskCount: 1, dependencies: [] },
  ],
  summary: {
    totalBlockers: 2,
    totalActionItems: 6,
    totalPending: 2,
    needsAttention: true,
  },
};

describe("BlockingDecisionsCard", () => {
  let runspaceHandler: (() => void) | null = null;

  beforeEach(() => {
    runspaceHandler = null;
    vi.clearAllMocks();
    mockSubscribe.mockImplementation((eventType: string, handler: () => void) => {
      if (eventType === "runspace.activated") {
        runspaceHandler = handler;
      }
      return mockUnsubscribe;
    });
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe("Null-render guard", () => {
    test("renders nothing before data resolves", () => {
      mockApiFetch.mockImplementation(() => new Promise(() => {}));
      const { container } = render(<BlockingDecisionsCard />);
      expect(container).toBeEmptyDOMElement();
    });

    test("renders nothing when fetch response is not ok", async () => {
      mockApiFetch.mockResolvedValueOnce({ ok: false, json: async () => ({}) });
      const { container } = render(<BlockingDecisionsCard />);
      await waitFor(() => expect(mockApiFetch).toHaveBeenCalled());
      expect(container).toBeEmptyDOMElement();
    });

    test("renders nothing when fetch throws (catch swallow)", async () => {
      mockApiFetch.mockRejectedValueOnce(new Error("network down"));
      const { container } = render(<BlockingDecisionsCard />);
      await waitFor(() => expect(mockApiFetch).toHaveBeenCalled());
      expect(container).toBeEmptyDOMElement();
    });

    test("renders nothing when json.success is false", async () => {
      mockApiFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: false, data: fullData }),
      });
      const { container } = render(<BlockingDecisionsCard />);
      await waitFor(() => expect(mockApiFetch).toHaveBeenCalled());
      expect(container).toBeEmptyDOMElement();
    });

    test("renders nothing when json.data is missing", async () => {
      mockApiFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true }),
      });
      const { container } = render(<BlockingDecisionsCard />);
      await waitFor(() => expect(mockApiFetch).toHaveBeenCalled());
      expect(container).toBeEmptyDOMElement();
    });

    test("renders nothing when data.summary is missing", async () => {
      mockApiFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true, data: { blockedWorkstreams: [], actionItems: [], pendingDecisions: [] } }),
      });
      const { container } = render(<BlockingDecisionsCard />);
      await waitFor(() => expect(mockApiFetch).toHaveBeenCalled());
      expect(container).toBeEmptyDOMElement();
    });
  });

  describe("needsAttention branch styling", () => {
    test("applies red border and red ShieldAlert when needsAttention is true", async () => {
      mockApiFetch.mockResolvedValueOnce(mockResponse(fullData));
      render(<BlockingDecisionsCard />);

      const card = await screen.findByTestId("blocking-decisions-card");
      expect(card.className).toContain("border-red-500/30");
      expect(card.querySelector("svg.text-red-400")).toBeInTheDocument();
    });

    test("applies gray border and green ShieldAlert when needsAttention is false", async () => {
      mockApiFetch.mockResolvedValueOnce(mockResponse(emptyData));
      render(<BlockingDecisionsCard />);

      const card = await screen.findByTestId("blocking-decisions-card");
      expect(card.className).toContain("border-gray-800");
      expect(card.className).not.toContain("border-red-500/30");
      expect(card.querySelector("svg.text-green-400")).toBeInTheDocument();
    });
  });

  describe("Header badge (totalIssues)", () => {
    test("shows item count badge when totalIssues > 0", async () => {
      mockApiFetch.mockResolvedValueOnce(mockResponse(fullData));
      render(<BlockingDecisionsCard />);

      // totalBlockers(2) + totalActionItems(6) + totalPending(2) = 10
      expect(await screen.findByText("10 items")).toBeInTheDocument();
      expect(screen.queryByText("Clear")).not.toBeInTheDocument();
    });

    test('shows "Clear" badge when totalIssues === 0', async () => {
      mockApiFetch.mockResolvedValueOnce(mockResponse(emptyData));
      render(<BlockingDecisionsCard />);

      expect(await screen.findByText("Clear")).toBeInTheDocument();
      expect(screen.queryByText(/items$/)).not.toBeInTheDocument();
    });
  });

  describe("Expand/collapse toggle", () => {
    test("is expanded by default and collapses on header click", async () => {
      mockApiFetch.mockResolvedValueOnce(mockResponse(fullData));
      render(<BlockingDecisionsCard />);

      await screen.findByTestId("blocking-decisions-card");
      // Expanded: content visible, chevron not rotated
      expect(screen.getByText("Blocked / High Risk")).toBeInTheDocument();
      const chevron = document.querySelector("svg.text-gray-500");
      expect(chevron?.getAttribute("class")).not.toContain("-rotate-90");

      fireEvent.click(screen.getByRole("button"));

      await waitFor(() => {
        expect(screen.queryByText("Blocked / High Risk")).not.toBeInTheDocument();
      });
      const chevronAfter = document.querySelector("svg.text-gray-500");
      expect(chevronAfter?.getAttribute("class")).toContain("-rotate-90");
    });

    test("re-expands on second click", async () => {
      mockApiFetch.mockResolvedValueOnce(mockResponse(fullData));
      render(<BlockingDecisionsCard />);

      await screen.findByTestId("blocking-decisions-card");
      const button = screen.getByRole("button");

      fireEvent.click(button); // collapse
      await waitFor(() => expect(screen.queryByText("Blocked / High Risk")).not.toBeInTheDocument());

      fireEvent.click(button); // expand again
      await waitFor(() => expect(screen.getByText("Blocked / High Risk")).toBeInTheDocument());
    });
  });

  describe("Empty vs populated body", () => {
    test('shows "No blockers or pending decisions" when totalIssues === 0', async () => {
      mockApiFetch.mockResolvedValueOnce(mockResponse(emptyData));
      render(<BlockingDecisionsCard />);

      expect(await screen.findByText("No blockers or pending decisions")).toBeInTheDocument();
      expect(screen.queryByText("Blocked / High Risk")).not.toBeInTheDocument();
      expect(screen.queryByText("Action Required")).not.toBeInTheDocument();
      expect(screen.queryByText("Pending Decisions")).not.toBeInTheDocument();
    });

    test("shows populated sections when totalIssues > 0", async () => {
      mockApiFetch.mockResolvedValueOnce(mockResponse(fullData));
      render(<BlockingDecisionsCard />);

      await screen.findByTestId("blocking-decisions-card");
      expect(screen.queryByText("No blockers or pending decisions")).not.toBeInTheDocument();
      expect(screen.getByText("Blocked / High Risk")).toBeInTheDocument();
      expect(screen.getByText("Action Required")).toBeInTheDocument();
      expect(screen.getByText("Pending Decisions")).toBeInTheDocument();
    });
  });

  describe("Blocked Workstreams section", () => {
    test("does not render section when blockedWorkstreams is empty", async () => {
      const data = { ...fullData, blockedWorkstreams: [] };
      mockApiFetch.mockResolvedValueOnce(mockResponse(data));
      render(<BlockingDecisionsCard />);

      await screen.findByTestId("blocking-decisions-card");
      expect(screen.queryByText("Blocked / High Risk")).not.toBeInTheDocument();
    });

    test("renders each workstream with name and progress", async () => {
      mockApiFetch.mockResolvedValueOnce(mockResponse(fullData));
      render(<BlockingDecisionsCard />);

      expect(await screen.findByText("Payments Refactor")).toBeInTheDocument();
      expect(screen.getByText("Docs Migration")).toBeInTheDocument();
      expect(screen.getByText("42%")).toBeInTheDocument();
      expect(screen.getByText("10%")).toBeInTheDocument();
    });

    test('applies red-400 text for "high" risk and yellow-400 for other risk levels', async () => {
      mockApiFetch.mockResolvedValueOnce(mockResponse(fullData));
      render(<BlockingDecisionsCard />);

      const highRisk = await screen.findByText("high risk");
      expect(highRisk.className).toContain("text-red-400");

      const mediumRisk = screen.getByText("medium risk");
      expect(mediumRisk.className).toContain("text-yellow-400");
    });

    test("sets progress bar width style from ws.progress", async () => {
      mockApiFetch.mockResolvedValueOnce(mockResponse(fullData));
      render(<BlockingDecisionsCard />);

      await screen.findByTestId("blocking-decisions-card");
      const bar = document.querySelector(".bg-red-500\\/50") as HTMLElement;
      expect(bar.style.width).toBe("42%");
    });
  });

  describe("Action Required section", () => {
    test("does not render section when actionItems is empty", async () => {
      const data = { ...fullData, actionItems: [] };
      mockApiFetch.mockResolvedValueOnce(mockResponse(data));
      render(<BlockingDecisionsCard />);

      await screen.findByTestId("blocking-decisions-card");
      expect(screen.queryByText("Action Required")).not.toBeInTheDocument();
    });

    test("caps rendered items at 5 (slice(0,5)) even with 6 provided", async () => {
      mockApiFetch.mockResolvedValueOnce(mockResponse(fullData));
      render(<BlockingDecisionsCard />);

      await screen.findByText("Action Required");
      expect(screen.getByText("Critical msg")).toBeInTheDocument();
      expect(screen.getByText("Fifth msg")).toBeInTheDocument();
      expect(screen.queryByText("Sixth msg (should be sliced off)")).not.toBeInTheDocument();
    });

    test("applies typeColor per item type: CRITICAL, ERROR, WARN, default", async () => {
      mockApiFetch.mockResolvedValueOnce(mockResponse(fullData));
      render(<BlockingDecisionsCard />);

      await screen.findByText("Action Required");

      expect(screen.getByText("CRITICAL").className).toContain("text-red-500");
      expect(screen.getByText("ERROR").className).toContain("text-red-400");
      expect(screen.getByText("WARN").className).toContain("text-yellow-400");
      // Two INFO items rendered (a-4, a-5) -> default branch text-gray-400
      const infoLabels = screen.getAllByText("INFO");
      expect(infoLabels).toHaveLength(2);
      infoLabels.forEach((el) => expect(el.className).toContain("text-gray-400"));
    });
  });

  describe("Pending Decisions section", () => {
    test("does not render section when pendingDecisions is empty", async () => {
      const data = { ...fullData, pendingDecisions: [] };
      mockApiFetch.mockResolvedValueOnce(mockResponse(data));
      render(<BlockingDecisionsCard />);

      await screen.findByTestId("blocking-decisions-card");
      expect(screen.queryByText("Pending Decisions")).not.toBeInTheDocument();
    });

    test("renders dependency suffix when dependencies.length > 0", async () => {
      mockApiFetch.mockResolvedValueOnce(mockResponse(fullData));
      render(<BlockingDecisionsCard />);

      expect(await screen.findByText("Decide on vendor")).toBeInTheDocument();
      expect(screen.getByText(/3 tasks/)).toBeInTheDocument();
      expect(screen.getByText(/\| depends on: ws-1, ws-2/)).toBeInTheDocument();
    });

    test("omits dependency suffix when dependencies.length === 0", async () => {
      mockApiFetch.mockResolvedValueOnce(mockResponse(fullData));
      render(<BlockingDecisionsCard />);

      const rolloutTask = await screen.findByText(/1 tasks/);
      expect(rolloutTask.textContent).toBe("1 tasks");
      expect(rolloutTask.textContent).not.toContain("depends on");
    });
  });

  describe("WebSocket runspace subscription", () => {
    test("subscribes to runspace.activated and refetches on event", async () => {
      mockApiFetch.mockResolvedValue(mockResponse(emptyData));
      render(<BlockingDecisionsCard />);

      await waitFor(() => expect(mockApiFetch).toHaveBeenCalledTimes(1));
      expect(mockSubscribe).toHaveBeenCalledWith("runspace.activated", expect.any(Function));

      runspaceHandler?.();

      await waitFor(() => expect(mockApiFetch).toHaveBeenCalledTimes(2));
    });

    test("unsubscribes and clears interval on unmount", async () => {
      mockApiFetch.mockResolvedValue(mockResponse(emptyData));
      const { unmount } = render(<BlockingDecisionsCard />);

      await waitFor(() => expect(mockApiFetch).toHaveBeenCalledTimes(1));
      unmount();

      expect(mockUnsubscribe).toHaveBeenCalledTimes(1);
    });
  });

  describe("Custom className prop", () => {
    test("applies custom className to the card container", async () => {
      mockApiFetch.mockResolvedValueOnce(mockResponse(emptyData));
      render(<BlockingDecisionsCard className="my-extra-class" />);

      const card = await screen.findByTestId("blocking-decisions-card");
      expect(card.className).toContain("my-extra-class");
    });
  });
});
