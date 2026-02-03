/**
 * AppHeader Integration Example
 *
 * This file demonstrates how to integrate the unified AppHeader
 * into your application, replacing the old dual-header architecture.
 */

import React, { useState } from "react";
import { AppHeader } from "../components/layout";
import { EngagementProvider } from "../contexts/EngagementContext";
import type { Runspace } from "../core/runspace";
import { BarChart3, Download } from "lucide-react";

/**
 * Example 1: App-Level Integration
 * Replace the header in App.tsx with this pattern
 */
export function AppLevelExample() {
  const [currentView, setCurrentView] = useState("dashboard");
  const [isConnected, setIsConnected] = useState(true);

  // Mock runspace data - replace with real data
  const [runspaces] = useState<Runspace[]>([
    {
      id: "rs-1",
      name: "nxtg-forge",
      displayName: "NXTG-Forge v3",
      path: "/home/user/projects/NXTG-Forge/v3",
      backendType: "wsl",
      status: "active",
      icon: "🚀",
      color: "#6366f1",
      tags: ["main", "production"],
      lastActive: new Date(),
      createdAt: new Date(),
    },
  ]);

  const [activeRunspace] = useState<Runspace | null>(runspaces[0]);

  const handleRunspaceSwitch = (runspaceId: string) => {
    console.log("Switching to runspace:", runspaceId);
    // Implement runspace switching logic
  };

  const handleNewProject = () => {
    console.log("Creating new project");
    // Implement new project creation
  };

  const handleManageProjects = () => {
    console.log("Managing projects");
    // Implement project management
  };

  return (
    <EngagementProvider>
      <div className="min-h-screen bg-gray-950 text-white">
        <AppHeader
          currentView={currentView}
          onNavigate={setCurrentView}
          isConnected={isConnected}
          showConnectionStatus
          showNavigation
          showProjectSwitcher
          currentRunspace={activeRunspace}
          runspaces={runspaces}
          onRunspaceSwitch={handleRunspaceSwitch}
          onNewProject={handleNewProject}
          onManageProjects={handleManageProjects}
        />

        <main id="main-content" className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <h2 className="text-2xl font-bold mb-4">Current View: {currentView}</h2>
          <p className="text-gray-400">
            Click navigation tabs in the header to switch views.
          </p>
        </main>
      </div>
    </EngagementProvider>
  );
}

/**
 * Example 2: Dashboard Page with Custom Actions
 * Shows how to use page-specific features like engagement selector,
 * panel toggles, and custom action buttons
 */
export function DashboardPageExample() {
  const [currentView] = useState("dashboard");
  const [contextPanelVisible, setContextPanelVisible] = useState(false);
  const [governancePanelVisible, setGovernancePanelVisible] = useState(true);

  const handleExportReport = () => {
    console.log("Exporting dashboard report");
    // Implement export logic
  };

  return (
    <EngagementProvider>
      <div className="min-h-screen bg-gray-950 text-white flex flex-col">
        <AppHeader
          title="Chief of Staff Dashboard"
          icon={<BarChart3 className="w-6 h-6" />}
          badge="Live"
          currentView={currentView}
          showEngagementSelector
          showPanelToggles
          showConnectionStatus
          isConnected
          onToggleContextPanel={() => setContextPanelVisible(!contextPanelVisible)}
          onToggleGovernancePanel={() => setGovernancePanelVisible(!governancePanelVisible)}
          contextPanelVisible={contextPanelVisible}
          governancePanelVisible={governancePanelVisible}
          actions={
            <div className="flex items-center gap-2">
              <button
                onClick={handleExportReport}
                className="flex items-center gap-2 px-4 py-2 bg-purple-600 hover:bg-purple-700 rounded-lg transition-colors text-sm font-medium"
              >
                <Download className="w-4 h-4" />
                Export Report
              </button>
            </div>
          }
        />

        <main id="main-content" className="flex-1 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="space-y-4">
            <div className="p-6 bg-gray-900 border border-gray-800 rounded-lg">
              <h2 className="text-xl font-bold mb-2">Dashboard Content</h2>
              <p className="text-gray-400">
                Context Panel: {contextPanelVisible ? "Visible" : "Hidden"}
              </p>
              <p className="text-gray-400">
                Governance Panel: {governancePanelVisible ? "Visible" : "Hidden"}
              </p>
            </div>
          </div>
        </main>
      </div>
    </EngagementProvider>
  );
}

/**
 * Example 3: Minimal Header for Focused Views
 * Terminal or full-screen views that need minimal chrome
 */
export function MinimalHeaderExample() {
  const [currentView] = useState("infinity-terminal");

  const handleNewSession = () => {
    console.log("Creating new terminal session");
    // Implement new session logic
  };

  return (
    <EngagementProvider>
      <div className="min-h-screen bg-gray-950 text-white flex flex-col">
        <AppHeader
          title="Infinity Terminal"
          currentView={currentView}
          showNavigation={false} // Hide main navigation for focused experience
          showConnectionStatus
          isConnected
          actions={
            <button
              onClick={handleNewSession}
              className="px-3 py-1.5 bg-gray-800 hover:bg-gray-700 rounded-lg text-sm transition-colors"
            >
              New Session
            </button>
          }
        />

        <main id="main-content" className="flex-1 bg-black">
          <div className="h-full flex items-center justify-center">
            <p className="text-gray-500">Terminal content goes here</p>
          </div>
        </main>
      </div>
    </EngagementProvider>
  );
}

/**
 * Example 4: Without Project Switcher
 * For standalone pages that don't need project management
 */
export function NoProjectSwitcherExample() {
  const [currentView, setCurrentView] = useState("vision-display");

  return (
    <EngagementProvider>
      <div className="min-h-screen bg-gray-950 text-white">
        <AppHeader
          currentView={currentView}
          onNavigate={setCurrentView}
          showNavigation
          showProjectSwitcher={false} // Hide project switcher
          showConnectionStatus
          isConnected
        />

        <main id="main-content" className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <h2 className="text-2xl font-bold mb-4">Vision Display</h2>
          <p className="text-gray-400">
            This page doesn't show the project switcher.
          </p>
        </main>
      </div>
    </EngagementProvider>
  );
}

/**
 * Example 5: Mobile-First Design
 * Shows how the header adapts to mobile devices
 */
export function MobileResponsiveExample() {
  const [currentView, setCurrentView] = useState("dashboard");

  return (
    <EngagementProvider>
      <div className="min-h-screen bg-gray-950 text-white">
        <AppHeader
          currentView={currentView}
          onNavigate={setCurrentView}
          showNavigation
          showConnectionStatus
          showEngagementSelector
          isConnected
        />

        <main id="main-content" className="px-4 py-6">
          <div className="bg-gray-900 border border-gray-800 rounded-lg p-6">
            <h2 className="text-xl font-bold mb-2">Mobile Responsive</h2>
            <p className="text-gray-400 text-sm mb-4">
              Resize your browser to see the header adapt:
            </p>
            <ul className="text-gray-400 text-sm space-y-2">
              <li>• Desktop (≥768px): Full navigation visible</li>
              <li>• Mobile (&lt;768px): Hamburger menu with drawer</li>
              <li>• All features accessible on both layouts</li>
            </ul>
          </div>
        </main>
      </div>
    </EngagementProvider>
  );
}

/**
 * How to use these examples:
 *
 * 1. App-Level Integration:
 *    - Copy AppLevelExample pattern to App.tsx
 *    - Replace old header (lines 619-670)
 *    - Remove AppHeaderStatus component
 *
 * 2. Page-Specific Features:
 *    - Use DashboardPageExample for pages with panel toggles
 *    - Use actions prop for custom page buttons
 *    - Remove page-specific headers
 *
 * 3. Focused Views:
 *    - Use MinimalHeaderExample for terminal/full-screen
 *    - Set showNavigation={false} to hide main nav
 *
 * 4. Testing:
 *    - Test all navigation routes work
 *    - Test mobile drawer opens/closes
 *    - Test engagement mode switching
 *    - Test keyboard navigation (Tab, Enter, Escape)
 *    - Test screen reader with NVDA/VoiceOver
 */
