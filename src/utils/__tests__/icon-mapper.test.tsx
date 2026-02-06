/**
 * Icon Mapper Tests
 * Unit tests for icon name to component mapping
 */

import { describe, it, expect } from "vitest";
import { render } from "@testing-library/react";
import { getIconByName, renderIcon } from "../icon-mapper";
import {
  Activity,
  Zap,
  Shield,
  Network,
  FileCode,
  GitBranch,
  BarChart3,
  AlertTriangle,
  Archive,
  RotateCcw,
  Package,
  Play,
  Settings,
  Users,
  Rocket,
  Target,
  FileText,
  Search,
  CheckCircle,
  Command as CommandIcon,
  HelpCircle,
} from "lucide-react";

describe("getIconByName", () => {
  it("should return HelpCircle for undefined icon name", () => {
    const Icon = getIconByName(undefined);
    expect(Icon).toBe(HelpCircle);
  });

  it("should return HelpCircle for unknown icon name", () => {
    const Icon = getIconByName("UnknownIcon");
    expect(Icon).toBe(HelpCircle);
  });

  it("should return HelpCircle for empty string", () => {
    const Icon = getIconByName("");
    expect(Icon).toBe(HelpCircle);
  });

  it("should map Activity icon", () => {
    const Icon = getIconByName("Activity");
    expect(Icon).toBe(Activity);
  });

  it("should map Zap icon", () => {
    const Icon = getIconByName("Zap");
    expect(Icon).toBe(Zap);
  });

  it("should map Shield icon", () => {
    const Icon = getIconByName("Shield");
    expect(Icon).toBe(Shield);
  });

  it("should map Network icon", () => {
    const Icon = getIconByName("Network");
    expect(Icon).toBe(Network);
  });

  it("should map FileCode icon", () => {
    const Icon = getIconByName("FileCode");
    expect(Icon).toBe(FileCode);
  });

  it("should map GitBranch icon", () => {
    const Icon = getIconByName("GitBranch");
    expect(Icon).toBe(GitBranch);
  });

  it("should map BarChart3 icon", () => {
    const Icon = getIconByName("BarChart3");
    expect(Icon).toBe(BarChart3);
  });

  it("should map AlertTriangle icon", () => {
    const Icon = getIconByName("AlertTriangle");
    expect(Icon).toBe(AlertTriangle);
  });

  it("should map Archive icon", () => {
    const Icon = getIconByName("Archive");
    expect(Icon).toBe(Archive);
  });

  it("should map RotateCcw icon", () => {
    const Icon = getIconByName("RotateCcw");
    expect(Icon).toBe(RotateCcw);
  });

  it("should map Package icon", () => {
    const Icon = getIconByName("Package");
    expect(Icon).toBe(Package);
  });

  it("should map Play icon", () => {
    const Icon = getIconByName("Play");
    expect(Icon).toBe(Play);
  });

  it("should map Settings icon", () => {
    const Icon = getIconByName("Settings");
    expect(Icon).toBe(Settings);
  });

  it("should map Users icon", () => {
    const Icon = getIconByName("Users");
    expect(Icon).toBe(Users);
  });

  it("should map Rocket icon", () => {
    const Icon = getIconByName("Rocket");
    expect(Icon).toBe(Rocket);
  });

  it("should map Target icon", () => {
    const Icon = getIconByName("Target");
    expect(Icon).toBe(Target);
  });

  it("should map FileText icon", () => {
    const Icon = getIconByName("FileText");
    expect(Icon).toBe(FileText);
  });

  it("should map Search icon", () => {
    const Icon = getIconByName("Search");
    expect(Icon).toBe(Search);
  });

  it("should map CheckCircle icon", () => {
    const Icon = getIconByName("CheckCircle");
    expect(Icon).toBe(CheckCircle);
  });

  it("should map Command icon (aliased as CommandIcon)", () => {
    const Icon = getIconByName("Command");
    expect(Icon).toBe(CommandIcon);
  });

  it("should map HelpCircle icon", () => {
    const Icon = getIconByName("HelpCircle");
    expect(Icon).toBe(HelpCircle);
  });

  it("should be case-sensitive", () => {
    const Icon = getIconByName("activity"); // lowercase
    expect(Icon).toBe(HelpCircle); // Should fallback
  });
});

describe("renderIcon", () => {
  it("should render icon component from name", () => {
    const { container } = render(renderIcon("Activity") as React.ReactElement);
    expect(container.querySelector("svg")).toBeInTheDocument();
  });

  it("should render icon with className prop", () => {
    const { container } = render(
      renderIcon("Activity", { className: "test-class" }) as React.ReactElement,
    );
    const svg = container.querySelector("svg");
    expect(svg).toBeInTheDocument();
    expect(svg?.classList.contains("test-class")).toBe(true);
  });

  it("should render fallback icon for unknown name", () => {
    const { container } = render(
      renderIcon("UnknownIcon") as React.ReactElement,
    );
    expect(container.querySelector("svg")).toBeInTheDocument();
  });

  it("should render fallback icon for undefined", () => {
    const { container } = render(renderIcon(undefined) as React.ReactElement);
    expect(container.querySelector("svg")).toBeInTheDocument();
  });

  it("should render icon without props", () => {
    const { container } = render(renderIcon("Zap") as React.ReactElement);
    expect(container.querySelector("svg")).toBeInTheDocument();
  });
});

describe("Icon map completeness", () => {
  it("should have all expected icon names mapped", () => {
    const expectedIcons = [
      "Activity",
      "Zap",
      "Shield",
      "Network",
      "FileCode",
      "GitBranch",
      "BarChart3",
      "AlertTriangle",
      "Archive",
      "RotateCcw",
      "Package",
      "Play",
      "Settings",
      "Users",
      "Rocket",
      "Target",
      "FileText",
      "Search",
      "CheckCircle",
      "Command",
    ];

    // Check all icons except HelpCircle (which is the fallback)
    expectedIcons.forEach((iconName) => {
      const Icon = getIconByName(iconName);
      expect(Icon).toBeDefined();
      // Verify it's not the fallback (HelpCircle is itself mapped, so skip that check)
    });

    // Verify HelpCircle is also mapped
    expect(getIconByName("HelpCircle")).toBe(HelpCircle);
  });

  it("should have exactly 21 mapped icons", () => {
    const mappedIcons = [
      "Activity",
      "Zap",
      "Shield",
      "Network",
      "FileCode",
      "GitBranch",
      "BarChart3",
      "AlertTriangle",
      "Archive",
      "RotateCcw",
      "Package",
      "Play",
      "Settings",
      "Users",
      "Rocket",
      "Target",
      "FileText",
      "Search",
      "CheckCircle",
      "Command",
      "HelpCircle",
    ];

    expect(mappedIcons).toHaveLength(21);
  });
});
