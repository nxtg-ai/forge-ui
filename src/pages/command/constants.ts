/**
 * Command View Constants
 * Default commands, categories, colors, and keyboard shortcuts
 */

import React from "react";
import {
  Sparkles,
  Activity,
  Plus,
  Search,
  Settings,
  GitBranch,
  FileCode,
  Clock,
  Shield,
  Play,
  BarChart3,
  Rocket,
  TrendingUp,
  Package,
  Database,
} from "lucide-react";

import type { KeyboardShortcut } from "../../components/ui/KeyboardShortcutsHelp";
import type { CommandCategory } from "./types";

export const COMMAND_SHORTCUTS: KeyboardShortcut[] = [
  { key: "/", description: "Focus search / Open command palette", category: "navigation" },
  { key: "Enter", description: "Execute selected command", category: "actions" },
  { key: "Escape", description: "Close panels / Cancel", category: "general" },
  { key: "1-9", description: "Quick action shortcuts", category: "actions" },
];

export const DEFAULT_COMMANDS: CommandCategory[] = [
  {
    id: "forge",
    name: "Forge",
    icon: React.createElement(Sparkles, { className: "w-4 h-4" }),
    color: "purple",
    commands: [
      { id: "frg-status", name: "Status Report", description: "Get current project status", category: "forge", icon: React.createElement(Activity, { className: "w-4 h-4" }) },
      { id: "frg-feature", name: "New Feature", description: "Start implementing a new feature", category: "forge", requiresConfirmation: true, icon: React.createElement(Plus, { className: "w-4 h-4" }) },
      { id: "frg-gap-analysis", name: "Gap Analysis", description: "Analyze test, doc, and security gaps", category: "forge", icon: React.createElement(Search, { className: "w-4 h-4" }) },
      { id: "system-info", name: "System Info", description: "Node, npm, git versions, memory, disk", category: "forge", icon: React.createElement(Settings, { className: "w-4 h-4" }) },
    ],
  },
  {
    id: "git",
    name: "Git",
    icon: React.createElement(GitBranch, { className: "w-4 h-4" }),
    color: "green",
    commands: [
      { id: "git-status", name: "Git Status", description: "Branch, changed files, recent commits", category: "git", icon: React.createElement(GitBranch, { className: "w-4 h-4" }) },
      { id: "git-diff", name: "Git Diff", description: "Show staged and unstaged changes", category: "git", icon: React.createElement(FileCode, { className: "w-4 h-4" }) },
      { id: "git-log", name: "Git Log", description: "Commit graph (last 20 commits)", category: "git", icon: React.createElement(Clock, { className: "w-4 h-4" }) },
    ],
  },
  {
    id: "test",
    name: "Test",
    icon: React.createElement(Shield, { className: "w-4 h-4" }),
    color: "blue",
    commands: [
      { id: "frg-test", name: "Run All Tests", description: "Execute full vitest suite", category: "test", icon: React.createElement(Play, { className: "w-4 h-4" }) },
      { id: "test-coverage", name: "Coverage Report", description: "Run tests with coverage analysis", category: "test", icon: React.createElement(BarChart3, { className: "w-4 h-4" }) },
    ],
  },
  {
    id: "deploy",
    name: "Deploy",
    icon: React.createElement(Rocket, { className: "w-4 h-4" }),
    color: "orange",
    commands: [
      { id: "frg-deploy", name: "Build & Deploy", description: "Type-check then vite build", category: "deploy", requiresConfirmation: true, icon: React.createElement(Rocket, { className: "w-4 h-4" }) },
    ],
  },
  {
    id: "analyze",
    name: "Analyze",
    icon: React.createElement(TrendingUp, { className: "w-4 h-4" }),
    color: "cyan",
    commands: [
      { id: "analyze-types", name: "Type Check", description: "Run tsc --noEmit", category: "analyze", icon: React.createElement(FileCode, { className: "w-4 h-4" }) },
      { id: "analyze-lint", name: "Lint", description: "Run ESLint on src/", category: "analyze", icon: React.createElement(Shield, { className: "w-4 h-4" }) },
      { id: "analyze-deps", name: "Outdated Deps", description: "Check for outdated npm packages", category: "analyze", icon: React.createElement(Package, { className: "w-4 h-4" }) },
      { id: "analyze-bundle", name: "Bundle Size", description: "Production build with size report", category: "analyze", icon: React.createElement(Database, { className: "w-4 h-4" }) },
    ],
  },
];

export const CATEGORY_COLORS: Record<string, string> = {
  forge: "text-purple-400 bg-purple-500/10 border-purple-500/20",
  git: "text-green-400 bg-green-500/10 border-green-500/20",
  test: "text-blue-400 bg-blue-500/10 border-blue-500/20",
  deploy: "text-orange-400 bg-orange-500/10 border-orange-500/20",
  analyze: "text-cyan-400 bg-cyan-500/10 border-cyan-500/20",
};
