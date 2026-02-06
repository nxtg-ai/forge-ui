/** @vitest-environment jsdom */

/**
 * Tests for Input Component
 *
 * Test coverage:
 * - Rendering with different variants
 * - Different sizes
 * - Label and helper text
 * - Error and success states
 * - Left and right icons
 * - Disabled state
 * - Accessibility attributes (aria-invalid, aria-describedby)
 * - Input interactions
 */

import { describe, test, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { Input } from "../Input";

// Mock lucide-react icons
vi.mock("lucide-react", () => ({
  AlertCircle: ({ className }: any) => (
    <div data-testid="alert-icon" className={className} />
  ),
  CheckCircle2: ({ className }: any) => (
    <div data-testid="check-icon" className={className} />
  ),
}));

describe("Input", () => {
  describe("Rendering", () => {
    test("renders input element", () => {
      render(<Input />);
      expect(screen.getByRole("textbox")).toBeInTheDocument();
    });

    test("renders with placeholder", () => {
      render(<Input placeholder="Enter text..." />);
      expect(screen.getByPlaceholderText("Enter text...")).toBeInTheDocument();
    });

    test("renders with default type text", () => {
      render(<Input />);
      const input = screen.getByRole("textbox");
      expect(input).toHaveAttribute("type", "text");
    });

    test("renders with custom type", () => {
      render(<Input type="email" />);
      const input = screen.getByRole("textbox");
      expect(input).toHaveAttribute("type", "email");
    });

    test("applies custom className to input", () => {
      render(<Input className="custom-class" />);
      const input = screen.getByRole("textbox");
      expect(input).toHaveClass("custom-class");
    });
  });

  describe("Variants", () => {
    test("renders default variant", () => {
      render(<Input variant="default" />);
      const input = screen.getByRole("textbox");
      expect(input).toHaveClass("border-surface-4");
      expect(input).toHaveClass("focus:border-nxtg-purple-600");
    });

    test("renders error variant", () => {
      render(<Input variant="error" />);
      const input = screen.getByRole("textbox");
      expect(input).toHaveClass("border-nxtg-error-DEFAULT");
      expect(input).toHaveClass("text-nxtg-error-light");
    });

    test("renders success variant", () => {
      render(<Input variant="success" />);
      const input = screen.getByRole("textbox");
      expect(input).toHaveClass("border-nxtg-success-DEFAULT");
    });
  });

  describe("Sizes", () => {
    test("renders sm size", () => {
      render(<Input inputSize="sm" />);
      const input = screen.getByRole("textbox");
      expect(input).toHaveClass("h-8");
      expect(input).toHaveClass("px-3");
      expect(input).toHaveClass("text-sm");
    });

    test("renders md size (default)", () => {
      render(<Input inputSize="md" />);
      const input = screen.getByRole("textbox");
      expect(input).toHaveClass("h-10");
      expect(input).toHaveClass("px-4");
      expect(input).toHaveClass("text-base");
    });

    test("renders lg size", () => {
      render(<Input inputSize="lg" />);
      const input = screen.getByRole("textbox");
      expect(input).toHaveClass("h-12");
      expect(input).toHaveClass("px-5");
      expect(input).toHaveClass("text-lg");
    });
  });

  describe("Label", () => {
    test("renders label when provided", () => {
      render(<Input label="Username" />);
      expect(screen.getByText("Username")).toBeInTheDocument();
    });

    test("label has correct classes", () => {
      render(<Input label="Email" />);
      const label = screen.getByText("Email");
      expect(label).toHaveClass("text-sm");
      expect(label).toHaveClass("font-medium");
      expect(label).toHaveClass("text-nxtg-gray-200");
    });

    test("does not render label when not provided", () => {
      const { container } = render(<Input />);
      expect(container.querySelector("label")).not.toBeInTheDocument();
    });
  });

  describe("Error State", () => {
    test("displays error message", () => {
      render(<Input error="This field is required" />);
      expect(screen.getByText("This field is required")).toBeInTheDocument();
    });

    test("shows error icon", () => {
      render(<Input error="Error message" />);
      expect(screen.getByTestId("alert-icon")).toBeInTheDocument();
    });

    test("applies error variant when error prop is set", () => {
      render(<Input error="Error" />);
      const input = screen.getByRole("textbox");
      expect(input).toHaveClass("border-nxtg-error-DEFAULT");
    });

    test("error message has correct id for aria-describedby", () => {
      render(<Input error="Error message" />);
      const errorMessage = screen.getByText("Error message");
      expect(errorMessage).toHaveAttribute("id", "error-message");
    });

    test("input has aria-invalid when error is present", () => {
      render(<Input error="Error" />);
      const input = screen.getByRole("textbox");
      expect(input).toHaveAttribute("aria-invalid", "true");
    });

    test("input has aria-describedby pointing to error message", () => {
      render(<Input error="Error message" />);
      const input = screen.getByRole("textbox");
      expect(input).toHaveAttribute("aria-describedby", "error-message");
    });

    test("error message has correct styling", () => {
      render(<Input error="Error" />);
      const errorMessage = screen.getByText("Error");
      expect(errorMessage).toHaveClass("text-sm");
      expect(errorMessage).toHaveClass("text-nxtg-error-light");
    });
  });

  describe("Success State", () => {
    test("displays success message", () => {
      render(<Input success="Valid input" />);
      expect(screen.getByText("Valid input")).toBeInTheDocument();
    });

    test("shows success icon", () => {
      render(<Input success="Success message" />);
      expect(screen.getByTestId("check-icon")).toBeInTheDocument();
    });

    test("applies success variant when success prop is set", () => {
      render(<Input success="Success" />);
      const input = screen.getByRole("textbox");
      expect(input).toHaveClass("border-nxtg-success-DEFAULT");
    });

    test("success message has correct id for aria-describedby", () => {
      render(<Input success="Success message" />);
      const successMessage = screen.getByText("Success message");
      expect(successMessage).toHaveAttribute("id", "success-message");
    });

    test("input has aria-describedby pointing to success message", () => {
      render(<Input success="Success message" />);
      const input = screen.getByRole("textbox");
      expect(input).toHaveAttribute("aria-describedby", "success-message");
    });

    test("success message has correct styling", () => {
      render(<Input success="Success" />);
      const successMessage = screen.getByText("Success");
      expect(successMessage).toHaveClass("text-sm");
      expect(successMessage).toHaveClass("text-nxtg-success-light");
    });

    test("error takes precedence over success", () => {
      render(<Input error="Error" success="Success" />);
      expect(screen.getByText("Error")).toBeInTheDocument();
      expect(screen.queryByText("Success")).not.toBeInTheDocument();
    });
  });

  describe("Helper Text", () => {
    test("displays helper text", () => {
      render(<Input helperText="This is a hint" />);
      expect(screen.getByText("This is a hint")).toBeInTheDocument();
    });

    test("helper text has correct id for aria-describedby", () => {
      render(<Input helperText="Helper text" />);
      const helperText = screen.getByText("Helper text");
      expect(helperText).toHaveAttribute("id", "helper-text");
    });

    test("input has aria-describedby pointing to helper text", () => {
      render(<Input helperText="Helper text" />);
      const input = screen.getByRole("textbox");
      expect(input).toHaveAttribute("aria-describedby", "helper-text");
    });

    test("helper text has correct styling", () => {
      render(<Input helperText="Helper" />);
      const helperText = screen.getByText("Helper");
      expect(helperText).toHaveClass("text-sm");
      expect(helperText).toHaveClass("text-nxtg-gray-500");
    });

    test("error message hides helper text", () => {
      render(<Input error="Error" helperText="Helper" />);
      expect(screen.getByText("Error")).toBeInTheDocument();
      expect(screen.queryByText("Helper")).not.toBeInTheDocument();
    });

    test("success message hides helper text", () => {
      render(<Input success="Success" helperText="Helper" />);
      expect(screen.getByText("Success")).toBeInTheDocument();
      expect(screen.queryByText("Helper")).not.toBeInTheDocument();
    });
  });

  describe("Left Icon", () => {
    test("renders left icon when provided", () => {
      const icon = <span data-testid="left-icon">Icon</span>;
      render(<Input leftIcon={icon} />);
      expect(screen.getByTestId("left-icon")).toBeInTheDocument();
    });

    test("applies padding when left icon is present", () => {
      const icon = <span>Icon</span>;
      render(<Input leftIcon={icon} />);
      const input = screen.getByRole("textbox");
      expect(input).toHaveClass("pl-10");
    });

    test("left icon wrapper has correct positioning classes", () => {
      const icon = <span data-testid="left-icon">Icon</span>;
      const { container } = render(<Input leftIcon={icon} />);
      const iconWrapper = screen.getByTestId("left-icon").parentElement;
      expect(iconWrapper).toHaveClass("absolute");
      expect(iconWrapper).toHaveClass("left-3");
      expect(iconWrapper).toHaveClass("text-nxtg-gray-500");
    });
  });

  describe("Right Icon", () => {
    test("renders right icon when provided", () => {
      const icon = <span data-testid="right-icon">Icon</span>;
      render(<Input rightIcon={icon} />);
      expect(screen.getByTestId("right-icon")).toBeInTheDocument();
    });

    test("applies padding when right icon is present", () => {
      const icon = <span>Icon</span>;
      render(<Input rightIcon={icon} />);
      const input = screen.getByRole("textbox");
      expect(input).toHaveClass("pr-10");
    });

    test("right icon is replaced by error icon when error is present", () => {
      const icon = <span data-testid="custom-icon">Icon</span>;
      render(<Input rightIcon={icon} error="Error" />);
      expect(screen.queryByTestId("custom-icon")).not.toBeInTheDocument();
      expect(screen.getByTestId("alert-icon")).toBeInTheDocument();
    });

    test("right icon is replaced by success icon when success is present", () => {
      const icon = <span data-testid="custom-icon">Icon</span>;
      render(<Input rightIcon={icon} success="Success" />);
      expect(screen.queryByTestId("custom-icon")).not.toBeInTheDocument();
      expect(screen.getByTestId("check-icon")).toBeInTheDocument();
    });
  });

  describe("Disabled State", () => {
    test("disables input when disabled prop is true", () => {
      render(<Input disabled />);
      const input = screen.getByRole("textbox");
      expect(input).toBeDisabled();
    });

    test("applies disabled styling", () => {
      render(<Input disabled />);
      const input = screen.getByRole("textbox");
      expect(input).toHaveClass("disabled:cursor-not-allowed");
      expect(input).toHaveClass("disabled:opacity-50");
    });
  });

  describe("Input Interactions", () => {
    test("handles value changes", () => {
      const onChange = vi.fn();
      render(<Input onChange={onChange} />);
      const input = screen.getByRole("textbox");
      fireEvent.change(input, { target: { value: "test value" } });
      expect(onChange).toHaveBeenCalled();
    });

    test("handles focus", () => {
      const onFocus = vi.fn();
      render(<Input onFocus={onFocus} />);
      const input = screen.getByRole("textbox");
      fireEvent.focus(input);
      expect(onFocus).toHaveBeenCalled();
    });

    test("handles blur", () => {
      const onBlur = vi.fn();
      render(<Input onBlur={onBlur} />);
      const input = screen.getByRole("textbox");
      fireEvent.blur(input);
      expect(onBlur).toHaveBeenCalled();
    });

    test("handles keyboard input", () => {
      render(<Input />);
      const input = screen.getByRole("textbox") as HTMLInputElement;
      fireEvent.change(input, { target: { value: "typing" } });
      expect(input.value).toBe("typing");
    });
  });

  describe("Combined Props", () => {
    test("renders with all props combined", () => {
      const leftIcon = <span data-testid="left-icon">Left</span>;
      const onChange = vi.fn();

      render(
        <Input
          label="Email Address"
          placeholder="you@example.com"
          type="email"
          inputSize="lg"
          leftIcon={leftIcon}
          helperText="We'll never share your email"
          onChange={onChange}
          className="custom-class"
        />
      );

      expect(screen.getByText("Email Address")).toBeInTheDocument();
      expect(screen.getByPlaceholderText("you@example.com")).toBeInTheDocument();
      expect(screen.getByTestId("left-icon")).toBeInTheDocument();
      expect(screen.getByText("We'll never share your email")).toBeInTheDocument();

      const input = screen.getByRole("textbox");
      expect(input).toHaveClass("h-12");
      expect(input).toHaveClass("pl-10");
      expect(input).toHaveClass("custom-class");
    });
  });

  describe("Forwarded Ref", () => {
    test("forwards ref to input element", () => {
      const ref = vi.fn();
      render(<Input ref={ref} />);
      expect(ref).toHaveBeenCalled();
    });
  });
});
