/**
 * cn (className utility) Tests
 * Unit tests for Tailwind class merging and conditional classes
 */

import { describe, it, expect } from "vitest";
import { cn } from "../cn";

describe("cn utility", () => {
  describe("Basic class merging", () => {
    it("should merge single class", () => {
      expect(cn("text-red-500")).toBe("text-red-500");
    });

    it("should merge multiple classes", () => {
      expect(cn("text-red-500", "bg-blue-200")).toBe("text-red-500 bg-blue-200");
    });

    it("should merge multiple class strings", () => {
      expect(cn("px-4 py-2", "rounded-md")).toBe("px-4 py-2 rounded-md");
    });

    it("should handle empty strings", () => {
      expect(cn("text-red-500", "", "bg-blue-200")).toBe(
        "text-red-500 bg-blue-200",
      );
    });

    it("should handle no arguments", () => {
      expect(cn()).toBe("");
    });

    it("should handle undefined and null", () => {
      expect(cn(undefined, "text-red-500", null, "bg-blue-200")).toBe(
        "text-red-500 bg-blue-200",
      );
    });
  });

  describe("Conditional classes (clsx)", () => {
    it("should handle object with truthy values", () => {
      expect(cn({ "text-red-500": true, "bg-blue-200": true })).toBe(
        "text-red-500 bg-blue-200",
      );
    });

    it("should handle object with falsy values", () => {
      expect(cn({ "text-red-500": true, "bg-blue-200": false })).toBe(
        "text-red-500",
      );
    });

    it("should handle mixed conditionals", () => {
      const isActive = true;
      const isDisabled = false;
      expect(cn("base-class", { active: isActive, disabled: isDisabled })).toBe(
        "base-class active",
      );
    });

    it("should handle arrays", () => {
      expect(cn(["text-red-500", "bg-blue-200"])).toBe(
        "text-red-500 bg-blue-200",
      );
    });

    it("should handle nested arrays", () => {
      expect(cn(["text-red-500", ["bg-blue-200", "rounded"]])).toBe(
        "text-red-500 bg-blue-200 rounded",
      );
    });

    it("should handle complex conditionals", () => {
      const variant = "primary";
      expect(
        cn("btn", {
          "btn-primary": variant === "primary",
          "btn-secondary": variant === "secondary",
        }),
      ).toBe("btn btn-primary");
    });
  });

  describe("Tailwind class deduplication (twMerge)", () => {
    it("should deduplicate same classes", () => {
      expect(cn("text-red-500", "text-red-500")).toBe("text-red-500");
    });

    it("should override conflicting Tailwind classes (last wins)", () => {
      expect(cn("text-red-500", "text-blue-500")).toBe("text-blue-500");
    });

    it("should override padding classes", () => {
      expect(cn("p-4", "p-8")).toBe("p-8");
    });

    it("should override margin classes", () => {
      expect(cn("m-2", "m-4")).toBe("m-4");
    });

    it("should override background classes", () => {
      expect(cn("bg-red-500", "bg-blue-500")).toBe("bg-blue-500");
    });

    it("should handle directional overrides", () => {
      expect(cn("px-4", "px-8")).toBe("px-8");
      expect(cn("py-4", "py-8")).toBe("py-8");
    });

    it("should not merge non-conflicting classes", () => {
      expect(cn("px-4", "py-2")).toBe("px-4 py-2");
    });

    it("should handle complex Tailwind merging", () => {
      expect(cn("rounded-sm", "rounded-lg")).toBe("rounded-lg");
    });

    it("should merge responsive variants correctly", () => {
      expect(cn("text-sm", "md:text-lg")).toBe("text-sm md:text-lg");
    });

    it("should override with responsive variants", () => {
      expect(cn("text-sm md:text-lg", "md:text-xl")).toBe("text-sm md:text-xl");
    });
  });

  describe("Real-world component patterns", () => {
    it("should handle button variants", () => {
      const variant = "primary";
      const size = "md";

      expect(
        cn(
          "btn",
          {
            "bg-blue-500 text-white": variant === "primary",
            "bg-gray-200 text-gray-800": variant === "secondary",
          },
          {
            "px-4 py-2": size === "md",
            "px-2 py-1": size === "sm",
          },
        ),
      ).toBe("btn bg-blue-500 text-white px-4 py-2");
    });

    it("should handle active and disabled states", () => {
      const isActive = true;
      const isDisabled = false;

      expect(
        cn(
          "nav-item",
          isActive && "bg-blue-100 text-blue-700",
          isDisabled && "opacity-50 cursor-not-allowed",
        ),
      ).toBe("nav-item bg-blue-100 text-blue-700");
    });

    it("should handle form input states", () => {
      const hasError = true;

      expect(
        cn(
          "input",
          "border",
          hasError ? "border-red-500" : "border-gray-300",
          "rounded",
        ),
      ).toBe("input border border-red-500 rounded");
    });

    it("should handle card with dynamic classes", () => {
      const isHovered = false;
      const isPadded = true;

      expect(
        cn(
          "bg-white rounded-lg shadow",
          isPadded && "p-6",
          isHovered && "shadow-lg scale-105",
        ),
      ).toBe("bg-white rounded-lg shadow p-6");
    });
  });

  describe("Edge cases", () => {
    it("should handle boolean false", () => {
      expect(cn(false, "text-red-500")).toBe("text-red-500");
    });

    it("should handle boolean true", () => {
      expect(cn(true, "text-red-500")).toBe("text-red-500");
    });

    it("should handle number 0", () => {
      expect(cn(0, "text-red-500")).toBe("text-red-500");
    });

    it("should handle number 1", () => {
      // clsx converts numbers to strings
      expect(cn(1, "text-red-500")).toBe("1 text-red-500");
    });

    it("should handle whitespace", () => {
      expect(cn("  ", "text-red-500", "  ")).toBe("text-red-500");
    });

    it("should trim extra spaces", () => {
      expect(cn("text-red-500  ", "  bg-blue-200")).toBe(
        "text-red-500 bg-blue-200",
      );
    });

    it("should handle very long class lists", () => {
      const result = cn(
        "class1",
        "class2",
        "class3",
        "class4",
        "class5",
        "class6",
        "class7",
        "class8",
        "class9",
        "class10",
      );
      expect(result).toBe(
        "class1 class2 class3 class4 class5 class6 class7 class8 class9 class10",
      );
    });
  });
});
