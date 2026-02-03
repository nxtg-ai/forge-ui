/**
 * InfinityTerminal Resize Tests
 * Verifies terminal properly recalculates width when panels are toggled
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, waitFor, act } from "@testing-library/react";
import { InfinityTerminal } from "../InfinityTerminal";

// Storage for mock instances - populated in beforeEach
const mocks = {
  fitAddon: null as any,
  terminal: null as any,
  resizeObserver: null as any,
  resizeObserverCallback: null as any,
};

// Mock xterm.js with proper constructor functions
vi.mock("@xterm/xterm", () => ({
  // Must use function() not arrow function to work as constructor
  Terminal: function Terminal() {
    return mocks.terminal;
  },
}));

vi.mock("@xterm/addon-fit", () => ({
  FitAddon: function FitAddon() {
    return mocks.fitAddon;
  },
}));

vi.mock("@xterm/addon-web-links", () => ({
  WebLinksAddon: function WebLinksAddon() {
    return {};
  },
}));

// Mock session persistence hook
vi.mock("../hooks/useSessionPersistence", () => ({
  useSessionPersistence: vi.fn(() => ({
    state: {
      sessionId: "test-session",
      sessionName: "test-session",
      connected: true,
      connecting: false,
      reconnectAttempts: 0,
      error: null,
    },
    connect: vi.fn(),
    disconnect: vi.fn(),
    resetReconnect: vi.fn(),
    restoreSession: vi.fn(),
    getAvailableSessions: vi.fn(() => []),
    getWebSocket: vi.fn(() => ({
      readyState: WebSocket.OPEN,
      send: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    })),
    getTtydUrl: vi.fn(() => "ws://localhost:5050/terminal"),
  })),
}));

describe("InfinityTerminal - Resize on Panel Toggle", () => {
  let originalResizeObserver: typeof ResizeObserver;
  let originalRAF: typeof requestAnimationFrame;

  beforeEach(() => {
    // Reset all mocks
    vi.clearAllMocks();

    // Create mock FitAddon
    mocks.fitAddon = {
      fit: vi.fn(),
    };

    // Create mock Terminal
    mocks.terminal = {
      loadAddon: vi.fn(),
      open: vi.fn(),
      writeln: vi.fn(),
      write: vi.fn(),
      onData: vi.fn(() => ({ dispose: vi.fn() })),
      onResize: vi.fn(() => ({ dispose: vi.fn() })),
      cols: 80,
      rows: 24,
      dispose: vi.fn(),
    };

    // Create mock ResizeObserver instance
    mocks.resizeObserver = {
      observe: vi.fn(),
      disconnect: vi.fn(),
      unobserve: vi.fn(),
    };

    // Save originals
    originalResizeObserver = global.ResizeObserver;
    originalRAF = global.requestAnimationFrame;

    // Mock ResizeObserver using a proper constructor function
    function MockResizeObserver(
      this: any,
      callback: ResizeObserverCallback
    ): ResizeObserver {
      mocks.resizeObserverCallback = callback;
      return mocks.resizeObserver;
    }
    global.ResizeObserver = MockResizeObserver as any;

    // Mock requestAnimationFrame
    global.requestAnimationFrame = function (cb: FrameRequestCallback): number {
      cb(0);
      return 0;
    };
  });

  afterEach(() => {
    // Restore originals
    global.ResizeObserver = originalResizeObserver;
    global.requestAnimationFrame = originalRAF;
    vi.restoreAllMocks();
  });

  it("should create ResizeObserver on mount", () => {
    render(<InfinityTerminal />);

    expect(mocks.resizeObserver.observe).toHaveBeenCalled();
  });

  it("should call fit() when terminal container resizes", async () => {
    render(<InfinityTerminal />);

    // Wait for initialization
    await waitFor(() => {
      expect(mocks.fitAddon.fit).toHaveBeenCalled();
    });

    const initialFitCalls = mocks.fitAddon.fit.mock.calls.length;

    // Trigger ResizeObserver callback
    act(() => {
      if (mocks.resizeObserverCallback) {
        mocks.resizeObserverCallback(
          [
            {
              target: document.createElement("div"),
              contentRect: { width: 800, height: 600 } as DOMRectReadOnly,
              borderBoxSize: [],
              contentBoxSize: [],
              devicePixelContentBoxSize: [],
            },
          ],
          mocks.resizeObserver
        );
      }
    });

    // Should call fit() again via requestAnimationFrame
    await waitFor(() => {
      expect(mocks.fitAddon.fit).toHaveBeenCalledTimes(initialFitCalls + 1);
    });
  });

  it("should call fit() when window resize event fires", async () => {
    render(<InfinityTerminal />);

    await waitFor(() => {
      expect(mocks.fitAddon.fit).toHaveBeenCalled();
    });

    const initialFitCalls = mocks.fitAddon.fit.mock.calls.length;

    // Trigger window resize
    act(() => {
      window.dispatchEvent(new Event("resize"));
    });

    await waitFor(() => {
      expect(mocks.fitAddon.fit).toHaveBeenCalledTimes(initialFitCalls + 1);
    });
  });

  it("should disconnect ResizeObserver on unmount", () => {
    const { unmount } = render(<InfinityTerminal />);

    expect(mocks.resizeObserver.observe).toHaveBeenCalled();

    unmount();

    expect(mocks.resizeObserver.disconnect).toHaveBeenCalled();
  });

  it("should use requestAnimationFrame for resize handling", async () => {
    const rafSpy = vi.spyOn(global, "requestAnimationFrame");

    render(<InfinityTerminal />);

    await waitFor(() => {
      expect(mocks.fitAddon.fit).toHaveBeenCalled();
    });

    // Trigger ResizeObserver
    act(() => {
      if (mocks.resizeObserverCallback) {
        mocks.resizeObserverCallback(
          [
            {
              target: document.createElement("div"),
              contentRect: { width: 800, height: 600 } as DOMRectReadOnly,
              borderBoxSize: [],
              contentBoxSize: [],
              devicePixelContentBoxSize: [],
            },
          ],
          mocks.resizeObserver
        );
      }
    });

    // Should have called requestAnimationFrame
    expect(rafSpy).toHaveBeenCalled();
  });

  it("should handle multiple rapid resize events gracefully", async () => {
    render(<InfinityTerminal />);

    await waitFor(() => {
      expect(mocks.fitAddon.fit).toHaveBeenCalled();
    });

    const initialFitCalls = mocks.fitAddon.fit.mock.calls.length;

    // Trigger multiple resize events rapidly
    act(() => {
      for (let i = 0; i < 5; i++) {
        if (mocks.resizeObserverCallback) {
          mocks.resizeObserverCallback(
            [
              {
                target: document.createElement("div"),
                contentRect: {
                  width: 800 + i * 10,
                  height: 600,
                } as DOMRectReadOnly,
                borderBoxSize: [],
                contentBoxSize: [],
                devicePixelContentBoxSize: [],
              },
            ],
            mocks.resizeObserver
          );
        }
      }
    });

    // Each should trigger fit() via RAF
    await waitFor(() => {
      expect(mocks.fitAddon.fit.mock.calls.length).toBeGreaterThan(
        initialFitCalls
      );
    });
  });
});
