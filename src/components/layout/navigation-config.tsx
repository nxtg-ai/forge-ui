import React from "react";
import {
  BarChart3,
  Mountain,
  Terminal,
  Command,
  Building2,
} from "lucide-react";

// Navigation route configuration - icons must match page AppShell icons
export const NAVIGATION_ROUTES = [
  { id: "dashboard", label: "Dashboard", icon: <BarChart3 className="w-4 h-4" />, testId: "dashboard" },
  { id: "vision-display", label: "Vision", icon: <Mountain className="w-4 h-4" />, testId: "vision-display" },
  { id: "infinity-terminal", label: "Terminal", icon: <Terminal className="w-4 h-4" />, testId: "infinity-terminal" },
  { id: "command", label: "Command", icon: <Command className="w-4 h-4" />, testId: "command" },
  { id: "architect", label: "Architect", icon: <Building2 className="w-4 h-4" />, testId: "architect" },
] as const;
