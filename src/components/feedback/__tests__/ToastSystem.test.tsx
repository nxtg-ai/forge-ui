import { describe, test, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor, act } from "@testing-library/react";
import React from "react";
import { ToastProvider, useToast } from "../ToastSystem";

// Test component that uses the toast hook
const TestComponent = () => {
  const { toast, dismiss, dismissAll } = useToast();

  return (
    <div>
      <button onClick={() => toast.success("Success message")}>
        Success Toast
      </button>
      <button
        onClick={() =>
          toast.error("Error message", {
            message: "Error details",
            details: "Stack trace here",
          })
        }
      >
        Error Toast
      </button>
      <button
        onClick={() =>
          toast.warning("Warning message", { duration: 3000 })
        }
      >
        Warning Toast
      </button>
      <button onClick={() => toast.info("Info message", { persistent: true })}>
        Info Toast
      </button>
      <button
        onClick={() =>
          toast.success("With actions", {
            actions: [
              { label: "Action 1", onClick: vi.fn() },
              { label: "Action 2", onClick: vi.fn() },
            ],
          })
        }
      >
        Toast With Actions
      </button>
      <button onClick={() => dismiss("test-id")}>Dismiss</button>
      <button onClick={dismissAll}>Dismiss All</button>
    </div>
  );
};

describe("ToastSystem", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("ToastProvider", () => {
    test("renders children correctly", () => {
      render(
        <ToastProvider>
          <div>Test child</div>
        </ToastProvider>
      );

      expect(screen.getByText("Test child")).toBeInTheDocument();
    });

    test("renders toast container", () => {
      render(
        <ToastProvider>
          <div>Content</div>
        </ToastProvider>
      );

      expect(screen.getByTestId("toast-container")).toBeInTheDocument();
    });

    test("provides toast context to children", () => {
      render(
        <ToastProvider>
          <TestComponent />
        </ToastProvider>
      );

      expect(screen.getByText("Success Toast")).toBeInTheDocument();
    });
  });

  describe("useToast hook", () => {
    test("throws error when used outside provider", () => {
      const TestComponentOutsideProvider = () => {
        const { toast } = useToast();
        return <div>{toast ? "Has context" : "No context"}</div>;
      };

      // Suppress console error for this test
      const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});

      expect(() => {
        render(<TestComponentOutsideProvider />);
      }).toThrow("useToast must be used within a ToastProvider");

      consoleSpy.mockRestore();
    });
  });

  describe("toast.success", () => {
    test("creates success toast with title", () => {
      render(
        <ToastProvider>
          <TestComponent />
        </ToastProvider>
      );

      fireEvent.click(screen.getByText("Success Toast"));

      expect(screen.getByText("Success message")).toBeInTheDocument();
    });

    test("creates toast with default configuration", () => {
      render(
        <ToastProvider>
          <TestComponent />
        </ToastProvider>
      );

      fireEvent.click(screen.getByText("Success Toast"));
      expect(screen.getByText("Success message")).toBeInTheDocument();
    });
  });

  describe("toast.error", () => {
    test("creates error toast with title and message", () => {
      render(
        <ToastProvider>
          <TestComponent />
        </ToastProvider>
      );

      fireEvent.click(screen.getByText("Error Toast"));

      expect(screen.getByText("Error message")).toBeInTheDocument();
      expect(screen.getByText("Error details")).toBeInTheDocument();
    });

    test("displays expandable details section", () => {
      render(
        <ToastProvider>
          <TestComponent />
        </ToastProvider>
      );

      fireEvent.click(screen.getByText("Error Toast"));

      const showDetailsButton = screen.getByText("Show details");
      expect(showDetailsButton).toBeInTheDocument();

      fireEvent.click(showDetailsButton);
      expect(screen.getByText("Stack trace here")).toBeInTheDocument();
      expect(screen.getByText("Hide details")).toBeInTheDocument();
    });

    test("toggles details visibility", () => {
      render(
        <ToastProvider>
          <TestComponent />
        </ToastProvider>
      );

      fireEvent.click(screen.getByText("Error Toast"));

      const showButton = screen.getByText("Show details");
      fireEvent.click(showButton);
      expect(screen.getByText("Stack trace here")).toBeInTheDocument();

      const hideButton = screen.getByText("Hide details");
      fireEvent.click(hideButton);
      expect(screen.queryByText("Stack trace here")).not.toBeInTheDocument();
    });
  });

  describe("toast.warning", () => {
    test("creates warning toast", () => {
      render(
        <ToastProvider>
          <TestComponent />
        </ToastProvider>
      );

      fireEvent.click(screen.getByText("Warning Toast"));

      expect(screen.getByText("Warning message")).toBeInTheDocument();
    });

    test("creates warning toast with custom duration", () => {
      render(
        <ToastProvider>
          <TestComponent />
        </ToastProvider>
      );

      fireEvent.click(screen.getByText("Warning Toast"));
      expect(screen.getByText("Warning message")).toBeInTheDocument();
    });
  });

  describe("toast.info", () => {
    test("creates info toast", () => {
      render(
        <ToastProvider>
          <TestComponent />
        </ToastProvider>
      );

      fireEvent.click(screen.getByText("Info Toast"));

      expect(screen.getByText("Info message")).toBeInTheDocument();
    });

    test("creates persistent toast", () => {
      render(
        <ToastProvider>
          <TestComponent />
        </ToastProvider>
      );

      fireEvent.click(screen.getByText("Info Toast"));
      expect(screen.getByText("Info message")).toBeInTheDocument();
    });
  });

  describe("toast actions", () => {
    test("renders toast with action buttons", () => {
      render(
        <ToastProvider>
          <TestComponent />
        </ToastProvider>
      );

      fireEvent.click(screen.getByText("Toast With Actions"));

      expect(screen.getByText("With actions")).toBeInTheDocument();
      expect(screen.getByText("Action 1")).toBeInTheDocument();
      expect(screen.getByText("Action 2")).toBeInTheDocument();
    });

    test("action buttons are clickable", () => {
      const actionMock = vi.fn();

      const CustomTestComponent = () => {
        const { toast } = useToast();
        return (
          <button
            onClick={() =>
              toast.success("Test", {
                actions: [{ label: "Click me", onClick: actionMock }],
              })
            }
          >
            Create Toast
          </button>
        );
      };

      render(
        <ToastProvider>
          <CustomTestComponent />
        </ToastProvider>
      );

      fireEvent.click(screen.getByText("Create Toast"));

      const actionButton = screen.getByText("Click me");
      fireEvent.click(actionButton);

      expect(actionMock).toHaveBeenCalledOnce();
    });
  });

  describe("dismiss functionality", () => {
    test("dismissAll removes all toasts", () => {
      render(
        <ToastProvider>
          <TestComponent />
        </ToastProvider>
      );

      fireEvent.click(screen.getByText("Success Toast"));
      fireEvent.click(screen.getByText("Error Toast"));
      fireEvent.click(screen.getByText("Warning Toast"));

      expect(screen.getByText("Success message")).toBeInTheDocument();
      expect(screen.getByText("Error message")).toBeInTheDocument();
      expect(screen.getByText("Warning message")).toBeInTheDocument();

      fireEvent.click(screen.getByText("Dismiss All"));

      expect(screen.queryByText("Success message")).not.toBeInTheDocument();
      expect(screen.queryByText("Error message")).not.toBeInTheDocument();
      expect(screen.queryByText("Warning message")).not.toBeInTheDocument();
    });
  });

  describe("toast limits", () => {
    test("limits to maximum 5 toasts", () => {
      const ManyToastsComponent = () => {
        const { toast } = useToast();
        return (
          <button
            onClick={() => {
              for (let i = 1; i <= 7; i++) {
                toast.info(`Toast ${i}`);
              }
            }}
          >
            Create Many Toasts
          </button>
        );
      };

      render(
        <ToastProvider>
          <ManyToastsComponent />
        </ToastProvider>
      );

      fireEvent.click(screen.getByText("Create Many Toasts"));

      // Should only show the first 5 toasts
      expect(screen.getByText("Toast 7")).toBeInTheDocument();
      expect(screen.getByText("Toast 6")).toBeInTheDocument();
      expect(screen.getByText("Toast 5")).toBeInTheDocument();
      expect(screen.getByText("Toast 4")).toBeInTheDocument();
      expect(screen.getByText("Toast 3")).toBeInTheDocument();
      expect(screen.queryByText("Toast 2")).not.toBeInTheDocument();
      expect(screen.queryByText("Toast 1")).not.toBeInTheDocument();
    });
  });

  describe("toast styling", () => {
    test("success toast renders with title", () => {
      render(
        <ToastProvider>
          <TestComponent />
        </ToastProvider>
      );

      fireEvent.click(screen.getByText("Success Toast"));

      const toastTitle = screen.getByText("Success message");
      expect(toastTitle).toBeInTheDocument();
      expect(toastTitle.className).toContain("text-green");
    });

    test("error toast renders with title", () => {
      render(
        <ToastProvider>
          <TestComponent />
        </ToastProvider>
      );

      fireEvent.click(screen.getByText("Error Toast"));

      const toastTitle = screen.getByText("Error message");
      expect(toastTitle).toBeInTheDocument();
      expect(toastTitle.className).toContain("text-red");
    });
  });

  describe("toast unique IDs", () => {
    test("generates unique IDs for each toast", () => {
      const IdsComponent = () => {
        const { toast } = useToast();
        return (
          <button
            onClick={() => {
              toast.success("First");
              toast.success("Second");
            }}
          >
            Create Toasts
          </button>
        );
      };

      render(
        <ToastProvider>
          <IdsComponent />
        </ToastProvider>
      );

      fireEvent.click(screen.getByText("Create Toasts"));

      const toastItems = screen.getAllByText(/First|Second/);
      expect(toastItems).toHaveLength(2);
    });
  });

  describe("toast container", () => {
    test("renders in correct position", () => {
      render(
        <ToastProvider>
          <div>Content</div>
        </ToastProvider>
      );

      const container = screen.getByTestId("toast-container");
      expect(container.className).toContain("fixed");
      expect(container.className).toContain("top-4");
      expect(container.className).toContain("right-4");
      expect(container.className).toContain("z-50");
    });
  });
});
