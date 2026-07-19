/**
 * Tests for ProjectContextCard
 *
 * Targets branch coverage: every conditional render, ternary, `??`/`&&` guard,
 * null-guard early return, loading/empty state, and threshold boundary in
 * src/components/governance/ProjectContextCard.tsx.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, waitFor, fireEvent } from "@testing-library/react";
import { ProjectContextCard } from "../ProjectContextCard";
import { wsManager } from "../../../services/ws-manager";

// Mock framer-motion (per project convention, see ChiefOfStaffDashboard.test.tsx)
vi.mock("framer-motion", () => ({
  motion: {
    div: ({ children, className, ...props }: any) => (
      <div className={className} {...props}>
        {children}
      </div>
    ),
  },
}));

// Mock SafeAnimatePresence as a transparent passthrough
vi.mock("../../ui/SafeAnimatePresence", () => ({
  SafeAnimatePresence: ({ children }: any) => <>{children}</>,
}));

// Mock wsManager so we can capture + trigger the runspace.activated handler
vi.mock("../../../services/ws-manager", () => ({
  wsManager: {
    subscribe: vi.fn(() => () => {}),
  },
}));

const TESTID = "project-context-card";

const defaultGit = {
  branch: "main",
  lastCommit: {
    hash: "abc1234",
    message: "Initial commit",
    date: new Date(Date.now() - 5_000).toISOString(),
    author: "dev",
  },
  uncommittedCount: 0,
  ahead: 0,
  behind: 0,
};

const defaultTests = {
  passing: 10,
  failing: 0,
  skipped: 0,
  lastRun: null as string | null,
};

const defaultHealth = {
  score: 90,
  factors: [{ label: "Coverage", value: 80, max: 100 }],
};

function buildData(opts: {
  git?: Partial<typeof defaultGit> | null;
  tests?: Partial<typeof defaultTests> | null;
  health?: Partial<typeof defaultHealth> | null;
  omitTests?: boolean;
  omitHealth?: boolean;
} = {}) {
  const data: any = {
    git: opts.git === null ? null : { ...defaultGit, ...opts.git },
    timestamp: new Date().toISOString(),
  };
  if (!opts.omitTests) {
    data.tests = opts.tests === null ? null : { ...defaultTests, ...opts.tests };
  }
  if (!opts.omitHealth) {
    data.health = opts.health === null ? null : { ...defaultHealth, ...opts.health };
  }
  return data;
}

function mockFetchResolved(body: any, ok = true) {
  global.fetch = vi.fn().mockResolvedValue({
    ok,
    json: () => Promise.resolve(body),
  }) as any;
}

function mockFetchSuccessData(data: any) {
  mockFetchResolved({ success: true, data });
}

async function settle() {
  // Flush the microtask chain inside fetchContext (fetch -> res.json -> setCtx)
  await new Promise((r) => setTimeout(r, 0));
}

let runspaceHandler: (() => void) | undefined;

beforeEach(() => {
  vi.clearAllMocks();
  runspaceHandler = undefined;
  vi.mocked(wsManager.subscribe).mockImplementation((event: string, handler: any) => {
    if (event === "runspace.activated") {
      runspaceHandler = handler;
    }
    return () => {};
  });
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe("ProjectContextCard", () => {
  describe("loading / null-guard branches", () => {
    it("renders nothing while the fetch is still pending", () => {
      global.fetch = vi.fn(() => new Promise(() => {})) as any; // never resolves
      render(<ProjectContextCard />);
      expect(screen.queryByTestId(TESTID)).not.toBeInTheDocument();
    });

    it("stays null when ctx.tests is missing, then renders once a valid refetch arrives", async () => {
      mockFetchSuccessData(buildData({ omitTests: true }));
      render(<ProjectContextCard />);
      await waitFor(() => expect(global.fetch).toHaveBeenCalledTimes(1));
      await settle();
      expect(screen.queryByTestId(TESTID)).not.toBeInTheDocument();

      // Trigger a refetch with complete data via the runspace.activated subscription
      mockFetchSuccessData(buildData());
      expect(runspaceHandler).toBeDefined();
      runspaceHandler!();
      await waitFor(() => expect(screen.getByTestId(TESTID)).toBeInTheDocument());
    });

    it("stays null when ctx.health is missing, then renders once a valid refetch arrives", async () => {
      mockFetchSuccessData(buildData({ omitHealth: true }));
      render(<ProjectContextCard />);
      await waitFor(() => expect(global.fetch).toHaveBeenCalledTimes(1));
      await settle();
      expect(screen.queryByTestId(TESTID)).not.toBeInTheDocument();

      mockFetchSuccessData(buildData());
      runspaceHandler!();
      await waitFor(() => expect(screen.getByTestId(TESTID)).toBeInTheDocument());
    });

    it("does not update state when the HTTP response is not ok", async () => {
      mockFetchResolved({}, false);
      render(<ProjectContextCard />);
      await waitFor(() => expect(global.fetch).toHaveBeenCalledTimes(1));
      await settle();
      expect(screen.queryByTestId(TESTID)).not.toBeInTheDocument();
    });

    it("does not update state when json.success is false", async () => {
      mockFetchResolved({ success: false, data: buildData() });
      render(<ProjectContextCard />);
      await waitFor(() => expect(global.fetch).toHaveBeenCalledTimes(1));
      await settle();
      expect(screen.queryByTestId(TESTID)).not.toBeInTheDocument();
    });

    it("does not update state when json.data is null", async () => {
      mockFetchResolved({ success: true, data: null });
      render(<ProjectContextCard />);
      await waitFor(() => expect(global.fetch).toHaveBeenCalledTimes(1));
      await settle();
      expect(screen.queryByTestId(TESTID)).not.toBeInTheDocument();
    });

    it("degrades silently when fetch throws", async () => {
      global.fetch = vi.fn().mockRejectedValue(new Error("network down")) as any;
      render(<ProjectContextCard />);
      await waitFor(() => expect(global.fetch).toHaveBeenCalledTimes(1));
      await settle();
      expect(screen.queryByTestId(TESTID)).not.toBeInTheDocument();
    });
  });

  describe("happy path render + className prop", () => {
    it("renders the full card with default className when data is valid", async () => {
      mockFetchSuccessData(buildData());
      const { container } = render(<ProjectContextCard />);
      await waitFor(() => expect(screen.getByTestId(TESTID)).toBeInTheDocument());
      expect(screen.getByText("Project Context")).toBeInTheDocument();
      expect(screen.getByText("90/100")).toBeInTheDocument();
      const root = screen.getByTestId(TESTID);
      expect(root.className).not.toContain("custom-class");
      expect(container).toBeTruthy();
    });

    it("applies a custom className to the root element", async () => {
      mockFetchSuccessData(buildData());
      render(<ProjectContextCard className="custom-class" />);
      const root = await screen.findByTestId(TESTID);
      expect(root.className).toContain("custom-class");
    });
  });

  describe("health score color thresholds (healthColor + healthBarColor)", () => {
    it("renders green when score >= 80", async () => {
      mockFetchSuccessData(buildData({ health: { score: 80, factors: [] } }));
      render(<ProjectContextCard />);
      const scoreEl = await screen.findByText("80/100");
      expect(scoreEl.className).toContain("text-green-400");
      const bar = document.querySelector(".h-full.rounded-full");
      expect(bar?.className).toContain("bg-green-500");
    });

    it("renders yellow when 50 <= score < 80", async () => {
      mockFetchSuccessData(buildData({ health: { score: 60, factors: [] } }));
      render(<ProjectContextCard />);
      const scoreEl = await screen.findByText("60/100");
      expect(scoreEl.className).toContain("text-yellow-400");
      const bar = document.querySelector(".h-full.rounded-full");
      expect(bar?.className).toContain("bg-yellow-500");
    });

    it("renders red when score < 50", async () => {
      mockFetchSuccessData(buildData({ health: { score: 30, factors: [] } }));
      render(<ProjectContextCard />);
      const scoreEl = await screen.findByText("30/100");
      expect(scoreEl.className).toContain("text-red-400");
      const bar = document.querySelector(".h-full.rounded-full");
      expect(bar?.className).toContain("bg-red-500");
    });
  });

  describe("expand/collapse toggle (ChevronDown rotation + AnimatePresence body)", () => {
    it("shows the expanded panel by default and hides it after clicking the header", async () => {
      mockFetchSuccessData(buildData());
      render(<ProjectContextCard />);
      await screen.findByTestId(TESTID);
      expect(screen.getByText("Health")).toBeInTheDocument();

      const header = screen.getByText("Project Context").closest("button")!;
      fireEvent.click(header);
      expect(screen.queryByText("Health")).not.toBeInTheDocument();

      fireEvent.click(header);
      expect(screen.getByText("Health")).toBeInTheDocument();
    });
  });

  describe("git ahead/behind indicator", () => {
    it("shows nothing when ahead and behind are both 0", async () => {
      mockFetchSuccessData(buildData({ git: { ahead: 0, behind: 0 } }));
      render(<ProjectContextCard />);
      await screen.findByTestId(TESTID);
      expect(document.querySelector('[class*="gap-0.5"]')).not.toBeInTheDocument();
    });

    it("shows +N only when ahead > 0 and behind is 0", async () => {
      mockFetchSuccessData(buildData({ git: { ahead: 3, behind: 0 } }));
      render(<ProjectContextCard />);
      await screen.findByTestId(TESTID);
      const el = document.querySelector('[class*="gap-0.5"]');
      expect(el?.textContent).toBe("+3");
    });

    it("shows -N only when behind > 0 and ahead is 0", async () => {
      mockFetchSuccessData(buildData({ git: { ahead: 0, behind: 4 } }));
      render(<ProjectContextCard />);
      await screen.findByTestId(TESTID);
      const el = document.querySelector('[class*="gap-0.5"]');
      expect(el?.textContent).toBe("-4");
    });

    it("shows +N/-N when both ahead and behind are > 0", async () => {
      mockFetchSuccessData(buildData({ git: { ahead: 2, behind: 5 } }));
      render(<ProjectContextCard />);
      await screen.findByTestId(TESTID);
      const el = document.querySelector('[class*="gap-0.5"]');
      expect(el?.textContent).toBe("+2/-5");
    });
  });

  describe("last commit block", () => {
    it("does not render the commit block when lastCommit is null", async () => {
      mockFetchSuccessData(buildData({ git: { lastCommit: null } }));
      render(<ProjectContextCard />);
      await screen.findByTestId(TESTID);
      expect(document.querySelector('[class*="shrink-0"]')).not.toBeInTheDocument();
    });

    it("renders the full message when it is 50 chars or fewer", async () => {
      const message = "a".repeat(50);
      mockFetchSuccessData(
        buildData({ git: { lastCommit: { ...defaultGit.lastCommit, message } } }),
      );
      render(<ProjectContextCard />);
      await screen.findByTestId(TESTID);
      expect(screen.getByText(message)).toBeInTheDocument();
    });

    it("truncates the message with an ellipsis when longer than 50 chars", async () => {
      const message = "b".repeat(60);
      const truncated = "b".repeat(50) + "...";
      mockFetchSuccessData(
        buildData({ git: { lastCommit: { ...defaultGit.lastCommit, message } } }),
      );
      render(<ProjectContextCard />);
      await screen.findByTestId(TESTID);
      expect(screen.getByText(truncated)).toBeInTheDocument();
      expect(screen.queryByText(message)).not.toBeInTheDocument();
    });

    it("renders 'just now' when the commit is under a minute old", async () => {
      const date = new Date(Date.now() - 30_000).toISOString();
      mockFetchSuccessData(
        buildData({
          git: { lastCommit: { ...defaultGit.lastCommit, date } },
          tests: { lastRun: null },
        }),
      );
      render(<ProjectContextCard />);
      await screen.findByTestId(TESTID);
      expect(screen.getByText("just now")).toBeInTheDocument();
    });

    it("renders 'Nm ago' when the commit is under an hour old", async () => {
      const date = new Date(Date.now() - 5 * 60_000).toISOString();
      mockFetchSuccessData(
        buildData({
          git: { lastCommit: { ...defaultGit.lastCommit, date } },
          tests: { lastRun: null },
        }),
      );
      render(<ProjectContextCard />);
      await screen.findByTestId(TESTID);
      expect(screen.getByText("5m ago")).toBeInTheDocument();
    });

    it("renders 'Nh ago' when the commit is under a day old", async () => {
      const date = new Date(Date.now() - 3 * 3_600_000).toISOString();
      mockFetchSuccessData(
        buildData({
          git: { lastCommit: { ...defaultGit.lastCommit, date } },
          tests: { lastRun: null },
        }),
      );
      render(<ProjectContextCard />);
      await screen.findByTestId(TESTID);
      expect(screen.getByText("3h ago")).toBeInTheDocument();
    });

    it("renders 'Nd ago' when the commit is a day or older", async () => {
      const date = new Date(Date.now() - 2 * 86_400_000).toISOString();
      mockFetchSuccessData(
        buildData({
          git: { lastCommit: { ...defaultGit.lastCommit, date } },
          tests: { lastRun: null },
        }),
      );
      render(<ProjectContextCard />);
      await screen.findByTestId(TESTID);
      expect(screen.getByText("2d ago")).toBeInTheDocument();
    });
  });

  describe("uncommitted changes line", () => {
    it("renders nothing when uncommittedCount is 0", async () => {
      mockFetchSuccessData(buildData({ git: { uncommittedCount: 0 } }));
      render(<ProjectContextCard />);
      await screen.findByTestId(TESTID);
      expect(document.querySelector('[class*="yellow-500/80"]')).not.toBeInTheDocument();
    });

    it("uses singular 'change' when uncommittedCount is 1", async () => {
      mockFetchSuccessData(buildData({ git: { uncommittedCount: 1 } }));
      render(<ProjectContextCard />);
      await screen.findByTestId(TESTID);
      const el = document.querySelector('[class*="yellow-500/80"]');
      expect(el?.textContent?.replace(/\s+/g, " ").trim()).toBe("1 uncommitted change");
    });

    it("uses plural 'changes' when uncommittedCount is greater than 1", async () => {
      mockFetchSuccessData(buildData({ git: { uncommittedCount: 5 } }));
      render(<ProjectContextCard />);
      await screen.findByTestId(TESTID);
      const el = document.querySelector('[class*="yellow-500/80"]');
      expect(el?.textContent?.replace(/\s+/g, " ").trim()).toBe("5 uncommitted changes");
    });
  });

  describe("test summary block", () => {
    it("shows the lastRun timeAgo when tests.lastRun is set", async () => {
      const lastRun = new Date(Date.now() - 10 * 60_000).toISOString();
      mockFetchSuccessData(
        buildData({ git: { lastCommit: null }, tests: { lastRun } }),
      );
      render(<ProjectContextCard />);
      await screen.findByTestId(TESTID);
      expect(screen.getByText("10m ago")).toBeInTheDocument();
    });

    it("shows no timeAgo text when tests.lastRun is null", async () => {
      mockFetchSuccessData(
        buildData({ git: { lastCommit: null }, tests: { lastRun: null } }),
      );
      render(<ProjectContextCard />);
      await screen.findByTestId(TESTID);
      expect(screen.queryByText(/ago/)).not.toBeInTheDocument();
    });

    it("shows 'No cached results' when total tests is 0", async () => {
      mockFetchSuccessData(
        buildData({ tests: { passing: 0, failing: 0, skipped: 0 } }),
      );
      render(<ProjectContextCard />);
      await screen.findByTestId(TESTID);
      expect(screen.getByText("No cached results")).toBeInTheDocument();
      expect(screen.queryByText(/pass/)).not.toBeInTheDocument();
    });

    it("shows pass count and hides fail/skip when only passing tests exist", async () => {
      mockFetchSuccessData(
        buildData({ tests: { passing: 7, failing: 0, skipped: 0 } }),
      );
      render(<ProjectContextCard />);
      await screen.findByTestId(TESTID);
      expect(screen.getByText("7 pass")).toBeInTheDocument();
      expect(screen.queryByText(/fail/)).not.toBeInTheDocument();
      expect(screen.queryByText(/skip/)).not.toBeInTheDocument();
      expect(screen.queryByText("No cached results")).not.toBeInTheDocument();
    });

    it("shows the fail count when failing > 0", async () => {
      mockFetchSuccessData(
        buildData({ tests: { passing: 4, failing: 3, skipped: 0 } }),
      );
      render(<ProjectContextCard />);
      await screen.findByTestId(TESTID);
      expect(screen.getByText("3 fail")).toBeInTheDocument();
    });

    it("shows the skip count when skipped > 0", async () => {
      mockFetchSuccessData(
        buildData({ tests: { passing: 4, failing: 0, skipped: 2 } }),
      );
      render(<ProjectContextCard />);
      await screen.findByTestId(TESTID);
      expect(screen.getByText("2 skip")).toBeInTheDocument();
    });
  });

  describe("health factors grid thresholds", () => {
    it("colors each factor by its value/max ratio (green >= .7, yellow >= .4, red below)", async () => {
      mockFetchSuccessData(
        buildData({
          health: {
            factors: [
              { label: "GreenBoundary", value: 70, max: 100 },
              { label: "YellowJustBelowGreen", value: 69, max: 100 },
              { label: "YellowBoundary", value: 40, max: 100 },
              { label: "RedJustBelowYellow", value: 39, max: 100 },
            ],
          },
        }),
      );
      render(<ProjectContextCard />);
      await screen.findByTestId(TESTID);

      const green = screen.getByText("70/100");
      expect(green.className).toContain("text-green-400");

      const yellowHigh = screen.getByText("69/100");
      expect(yellowHigh.className).toContain("text-yellow-400");

      const yellowLow = screen.getByText("40/100");
      expect(yellowLow.className).toContain("text-yellow-400");

      const red = screen.getByText("39/100");
      expect(red.className).toContain("text-red-400");
    });
  });

  describe("runspace.activated resubscription", () => {
    it("re-fetches live context when the runspace.activated event fires", async () => {
      const fetchMock = vi
        .fn()
        .mockResolvedValueOnce({
          ok: true,
          json: () =>
            Promise.resolve({ success: true, data: buildData({ git: { branch: "main" } }) }),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: () =>
            Promise.resolve({
              success: true,
              data: buildData({ git: { branch: "feature/x" } }),
            }),
        });
      global.fetch = fetchMock as any;

      render(<ProjectContextCard />);
      await screen.findByTestId(TESTID);
      expect(screen.getByText("main")).toBeInTheDocument();
      expect(fetchMock).toHaveBeenCalledTimes(1);

      expect(runspaceHandler).toBeDefined();
      runspaceHandler!();

      await waitFor(() => expect(screen.getByText("feature/x")).toBeInTheDocument());
      expect(fetchMock).toHaveBeenCalledTimes(2);
    });
  });
});
