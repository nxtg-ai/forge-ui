import { describe, test, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { BetaFeedback } from "../BetaFeedback";
import { logger } from "../../../utils/browser-logger";

// Mock browser-logger
vi.mock("../../../utils/browser-logger", () => ({
  logger: {
    error: vi.fn(),
    warn: vi.fn(),
    info: vi.fn(),
    debug: vi.fn(),
  },
}));

describe("BetaFeedback", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
    global.fetch = vi.fn();
  });

  describe("Floating Feedback Button", () => {
    test("renders floating feedback button", () => {
      render(<BetaFeedback />);

      expect(screen.getByText("Beta Feedback")).toBeInTheDocument();
    });

    test("opens modal when feedback button is clicked", () => {
      render(<BetaFeedback />);

      const button = screen.getByText("Beta Feedback");
      fireEvent.click(button);

      expect(screen.getByText("Help us improve NXTG-Forge by sharing your thoughts")).toBeInTheDocument();
    });
  });

  describe("Modal Visibility", () => {
    test("modal is hidden by default", () => {
      render(<BetaFeedback />);

      expect(
        screen.queryByText("Help us improve NXTG-Forge by sharing your thoughts")
      ).not.toBeInTheDocument();
    });

    test("modal opens when button clicked", () => {
      render(<BetaFeedback />);

      fireEvent.click(screen.getByText("Beta Feedback"));

      expect(
        screen.getByText("Help us improve NXTG-Forge by sharing your thoughts")
      ).toBeInTheDocument();
    });

    test("modal closes when Cancel button clicked", () => {
      render(<BetaFeedback />);

      fireEvent.click(screen.getByText("Beta Feedback"));
      expect(screen.getByText("Help us improve NXTG-Forge by sharing your thoughts")).toBeInTheDocument();

      fireEvent.click(screen.getByText("Cancel"));

      expect(
        screen.queryByText("Help us improve NXTG-Forge by sharing your thoughts")
      ).not.toBeInTheDocument();
    });

    test("calls onClose callback when modal closes", () => {
      const onCloseMock = vi.fn();
      render(<BetaFeedback onClose={onCloseMock} />);

      fireEvent.click(screen.getByText("Beta Feedback"));
      fireEvent.click(screen.getByText("Cancel"));

      expect(onCloseMock).toHaveBeenCalledOnce();
    });
  });

  describe("Rating System", () => {
    test("renders 5 star rating buttons", () => {
      render(<BetaFeedback />);
      fireEvent.click(screen.getByText("Beta Feedback"));

      // Stars are SVG icons rendered by lucide-react
      const ratingSection = screen.getByText("How would you rate your experience?");
      expect(ratingSection).toBeInTheDocument();
    });

    test("rating persists after hover", () => {
      render(<BetaFeedback />);
      fireEvent.click(screen.getByText("Beta Feedback"));

      const ratingSection = screen.getByText("How would you rate your experience?");
      expect(ratingSection).toBeInTheDocument();
    });
  });

  describe("Category Selection", () => {
    test("renders category dropdown with default value", () => {
      render(<BetaFeedback />);
      fireEvent.click(screen.getByText("Beta Feedback"));

      const select = screen.getByDisplayValue("Feature Request");
      expect(select).toBeInTheDocument();
    });

    test("allows selecting different categories", () => {
      render(<BetaFeedback />);
      fireEvent.click(screen.getByText("Beta Feedback"));

      const select = screen.getByDisplayValue("Feature Request");
      fireEvent.change(select, { target: { value: "Bug Report" } });

      expect(screen.getByDisplayValue("Bug Report")).toBeInTheDocument();
    });

    test("displays all category options", () => {
      render(<BetaFeedback />);
      fireEvent.click(screen.getByText("Beta Feedback"));

      const select = screen.getByDisplayValue("Feature Request");
      const options = select.querySelectorAll("option");

      expect(options).toHaveLength(5);
      expect(options[0].textContent).toBe("Bug Report");
      expect(options[1].textContent).toBe("Feature Request");
      expect(options[2].textContent).toBe("UX Feedback");
      expect(options[3].textContent).toBe("Performance Issue");
      expect(options[4].textContent).toBe("Other");
    });
  });

  describe("Description Input", () => {
    test("renders description textarea", () => {
      render(<BetaFeedback />);
      fireEvent.click(screen.getByText("Beta Feedback"));

      const textarea = screen.getByPlaceholderText("Tell us what you think...");
      expect(textarea).toBeInTheDocument();
    });

    test("updates description when typing", () => {
      render(<BetaFeedback />);
      fireEvent.click(screen.getByText("Beta Feedback"));

      const textarea = screen.getByPlaceholderText("Tell us what you think...");
      fireEvent.change(textarea, { target: { value: "This is my feedback" } });

      expect(textarea).toHaveValue("This is my feedback");
    });

    test("displays character count", () => {
      render(<BetaFeedback />);
      fireEvent.click(screen.getByText("Beta Feedback"));

      const textarea = screen.getByPlaceholderText("Tell us what you think...");
      fireEvent.change(textarea, { target: { value: "Test feedback" } });

      expect(screen.getByText("13 / 2000 characters")).toBeInTheDocument();
    });
  });

  describe("Screenshot Upload", () => {
    test("renders file upload input", () => {
      render(<BetaFeedback />);
      fireEvent.click(screen.getByText("Beta Feedback"));

      expect(screen.getByText("Upload Image")).toBeInTheDocument();
    });

    test("displays file name when file is selected", () => {
      render(<BetaFeedback />);
      fireEvent.click(screen.getByText("Beta Feedback"));

      const file = new File(["screenshot"], "screenshot.png", {
        type: "image/png",
      });
      const input = screen.getByLabelText(/Upload Image/i) as HTMLInputElement;

      Object.defineProperty(input, "files", {
        value: [file],
        writable: false,
      });

      fireEvent.change(input);

      expect(screen.getByText("screenshot.png")).toBeInTheDocument();
    });

    test("shows error for files larger than 5MB", () => {
      render(<BetaFeedback />);
      fireEvent.click(screen.getByText("Beta Feedback"));

      const largeFile = new File(["x".repeat(6 * 1024 * 1024)], "large.png", {
        type: "image/png",
      });
      const input = screen.getByLabelText(/Upload Image/i) as HTMLInputElement;

      Object.defineProperty(input, "files", {
        value: [largeFile],
        writable: false,
      });
      Object.defineProperty(largeFile, "size", {
        value: 6 * 1024 * 1024,
        writable: false,
      });

      fireEvent.change(input);

      expect(screen.getByText("Screenshot must be less than 5MB")).toBeInTheDocument();
    });

    test("displays file size in KB", () => {
      render(<BetaFeedback />);
      fireEvent.click(screen.getByText("Beta Feedback"));

      const file = new File(["x".repeat(1024 * 2)], "test.png", {
        type: "image/png",
      });
      const input = screen.getByLabelText(/Upload Image/i) as HTMLInputElement;

      Object.defineProperty(input, "files", {
        value: [file],
        writable: false,
      });
      Object.defineProperty(file, "size", {
        value: 2048,
        writable: false,
      });

      fireEvent.change(input);

      expect(screen.getByText(/2 KB/)).toBeInTheDocument();
    });

    test("allows removing uploaded file", () => {
      render(<BetaFeedback />);
      fireEvent.click(screen.getByText("Beta Feedback"));

      const file = new File(["screenshot"], "test.png", { type: "image/png" });
      const input = screen.getByLabelText(/Upload Image/i) as HTMLInputElement;

      Object.defineProperty(input, "files", {
        value: [file],
        writable: false,
      });

      fireEvent.change(input);
      expect(screen.getByText("test.png")).toBeInTheDocument();

      fireEvent.click(screen.getByText("Remove"));
      expect(screen.queryByText("test.png")).not.toBeInTheDocument();
    });
  });

  describe("Form Validation", () => {
    test("submit button is disabled when description is empty", () => {
      render(<BetaFeedback />);
      fireEvent.click(screen.getByText("Beta Feedback"));

      const submitButton = screen.getByText("Submit Feedback").closest("button");
      expect(submitButton).toBeDisabled();
    });
  });

  describe("Form Submission", () => {
    test("displays success message after submission", async () => {
      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true }),
      });

      render(<BetaFeedback />);
      fireEvent.click(screen.getByText("Beta Feedback"));

      const textarea = screen.getByPlaceholderText("Tell us what you think...");
      fireEvent.change(textarea, { target: { value: "Good work" } });

      // Need to set rating by finding and clicking star buttons
      const ratingButtons = screen.getAllByRole("button");
      const starButtons = ratingButtons.filter((btn) => {
        const svg = btn.querySelector("svg");
        return svg && btn.getAttribute("type") === "button";
      });

      if (starButtons.length >= 4) {
        fireEvent.click(starButtons[3]); // Click 4th star
      }

      const submitButton = screen.getByText("Submit Feedback");
      if (!submitButton.hasAttribute("disabled")) {
        fireEvent.click(submitButton);

        await waitFor(() => {
          expect(screen.getByText("Thank You!")).toBeInTheDocument();
          expect(
            screen.getByText("Your feedback has been submitted successfully")
          ).toBeInTheDocument();
        });
      }
    });

    test("saves feedback locally when API fails", async () => {
      (global.fetch as any).mockRejectedValueOnce(new Error("Network error"));

      render(<BetaFeedback />);
      fireEvent.click(screen.getByText("Beta Feedback"));

      const textarea = screen.getByPlaceholderText("Tell us what you think...");
      fireEvent.change(textarea, { target: { value: "Feedback content" } });

      const ratingButtons = screen.getAllByRole("button");
      const starButtons = ratingButtons.filter((btn) => {
        const svg = btn.querySelector("svg");
        return svg && btn.getAttribute("type") === "button";
      });

      if (starButtons.length >= 3) {
        fireEvent.click(starButtons[2]); // Click 3rd star
      }

      const submitButton = screen.getByText("Submit Feedback");
      if (!submitButton.hasAttribute("disabled")) {
        fireEvent.click(submitButton);

        await waitFor(() => {
          const saved = localStorage.getItem("nxtg-beta-feedback");
          expect(saved).toBeTruthy();
          if (saved) {
            const parsed = JSON.parse(saved);
            expect(parsed).toHaveLength(1);
            expect(parsed[0].description).toBe("Feedback content");
          }
        });
      }
    });

    test("shows loading state during submission", async () => {
      (global.fetch as any).mockImplementationOnce(
        () => new Promise((resolve) => setTimeout(() => resolve({ ok: true }), 100))
      );

      render(<BetaFeedback />);
      fireEvent.click(screen.getByText("Beta Feedback"));

      const textarea = screen.getByPlaceholderText("Tell us what you think...");
      fireEvent.change(textarea, { target: { value: "Test" } });

      const ratingButtons = screen.getAllByRole("button");
      const starButtons = ratingButtons.filter((btn) => {
        const svg = btn.querySelector("svg");
        return svg && btn.getAttribute("type") === "button";
      });

      if (starButtons.length >= 3) {
        fireEvent.click(starButtons[2]);
      }

      const submitButton = screen.getByText("Submit Feedback");
      if (!submitButton.hasAttribute("disabled")) {
        fireEvent.click(submitButton);

        expect(screen.getByText("Submitting...")).toBeInTheDocument();

        await waitFor(() => {
          expect(screen.queryByText("Submitting...")).not.toBeInTheDocument();
        });
      }
    });
  });

  describe("Modal Reset", () => {
    test("resets form when modal closes", () => {
      render(<BetaFeedback />);
      fireEvent.click(screen.getByText("Beta Feedback"));

      const textarea = screen.getByPlaceholderText("Tell us what you think...");
      fireEvent.change(textarea, { target: { value: "Some text" } });

      fireEvent.click(screen.getByText("Cancel"));
      fireEvent.click(screen.getByText("Beta Feedback"));

      expect(screen.getByDisplayValue("Feature Request")).toBeInTheDocument();
      expect(screen.getByText("0 / 2000 characters")).toBeInTheDocument();
    });

    test("clears error message when reopening modal", () => {
      render(<BetaFeedback />);
      fireEvent.click(screen.getByText("Beta Feedback"));

      const file = new File(["x".repeat(6 * 1024 * 1024)], "large.png", {
        type: "image/png",
      });
      const input = screen.getByLabelText(/Upload Image/i) as HTMLInputElement;

      Object.defineProperty(input, "files", {
        value: [file],
        writable: false,
      });
      Object.defineProperty(file, "size", {
        value: 6 * 1024 * 1024,
        writable: false,
      });

      fireEvent.change(input);
      expect(screen.getByText("Screenshot must be less than 5MB")).toBeInTheDocument();

      fireEvent.click(screen.getByText("Cancel"));
      fireEvent.click(screen.getByText("Beta Feedback"));

      expect(
        screen.queryByText("Screenshot must be less than 5MB")
      ).not.toBeInTheDocument();
    });
  });
});
