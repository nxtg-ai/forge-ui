/**
 * AppShell Usage Examples
 *
 * Demonstrates various configurations of the AppShell component
 */

import React, { useState } from "react";
import { AppShell } from "../components/layout/AppShell";
import {
  Terminal,
  BarChart3,
  Zap,
  RefreshCw,
  Brain,
  Layers,
  Play,
  FileText,
  CheckCircle,
  Activity,
} from "lucide-react";
import type { OracleMessage } from "../components/infinity-terminal/OracleFeedMarquee";
import type { KeyboardShortcut } from "../components/ui/KeyboardShortcutsHelp";

/**
 * Example 1: Basic AppShell with just content
 */
export const BasicExample: React.FC = () => {
  return (
    <AppShell
      title="Basic Example"
      icon={<Terminal className="w-6 h-6" />}
    >
      <div className="p-6">
        <h2 className="text-2xl font-bold mb-4">Welcome to AppShell</h2>
        <p className="text-gray-400">
          This is a basic example with no panels or footer.
        </p>
      </div>
    </AppShell>
  );
};

/**
 * Example 2: AppShell with left and right panels
 */
export const WithPanelsExample: React.FC = () => {
  const [leftPanelVisible, setLeftPanelVisible] = useState(true);
  const [rightPanelVisible, setRightPanelVisible] = useState(true);

  return (
    <AppShell
      title="Command Center"
      icon={<Zap className="w-6 h-6" />}
      badge="Active"
      headerActions={
        <button className="px-4 py-2 bg-purple-500 hover:bg-purple-600 rounded-lg transition-colors flex items-center gap-2">
          <Play className="w-4 h-4" />
          Execute
        </button>
      }
      // Left panel
      leftPanel={
        <div className="p-4 h-full overflow-auto">
          <h3 className="text-lg font-semibold mb-4">Command History</h3>
          <div className="space-y-2">
            {[1, 2, 3, 4, 5].map((i) => (
              <div
                key={i}
                className="p-3 bg-gray-800 rounded-lg hover:bg-gray-700 cursor-pointer transition-colors"
              >
                <div className="text-sm font-mono text-green-400">
                  npm install example-{i}
                </div>
                <div className="text-xs text-gray-500 mt-1">2 minutes ago</div>
              </div>
            ))}
          </div>
        </div>
      }
      leftPanelTitle="History"
      showLeftPanel={leftPanelVisible}
      // Right panel
      rightPanel={
        <div className="p-4 h-full overflow-auto">
          <h3 className="text-lg font-semibold mb-4">Execution Status</h3>
          <div className="space-y-3">
            <StatusItem
              label="Dependencies"
              status="complete"
              icon={<CheckCircle className="w-4 h-4 text-green-500" />}
            />
            <StatusItem
              label="Build"
              status="complete"
              icon={<CheckCircle className="w-4 h-4 text-green-500" />}
            />
            <StatusItem
              label="Tests"
              status="running"
              icon={<Activity className="w-4 h-4 text-blue-500 animate-pulse" />}
            />
          </div>
        </div>
      }
      rightPanelTitle="Status"
      showRightPanel={rightPanelVisible}
    >
      <div className="p-6">
        <h2 className="text-2xl font-bold mb-4">Command Builder</h2>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-400 mb-2">
              Command
            </label>
            <input
              type="text"
              className="w-full px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
              placeholder="Enter command..."
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-400 mb-2">
              Arguments
            </label>
            <textarea
              className="w-full px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
              rows={4}
              placeholder="Enter arguments..."
            />
          </div>
        </div>
      </div>
    </AppShell>
  );
};

/**
 * Example 3: AppShell with footer
 */
export const WithFooterExample: React.FC = () => {
  const [contextVisible, setContextVisible] = useState(false);
  const [governanceVisible, setGovernanceVisible] = useState(false);

  const oracleMessages: OracleMessage[] = [
    { id: "1", type: "info", message: "Build completed successfully", timestamp: new Date() },
    { id: "2", type: "warning", message: "3 tests pending review", timestamp: new Date() },
    { id: "3", type: "success", message: "Deployment ready", timestamp: new Date() },
  ];

  return (
    <AppShell
      title="Infinity Terminal"
      icon={<Terminal className="w-6 h-6" />}
      showFooter={true}
      sessionName="main-terminal"
      isConnected={true}
      oracleMessages={oracleMessages}
      onToggleContext={() => setContextVisible(!contextVisible)}
      onToggleGovernance={() => setGovernanceVisible(!governanceVisible)}
      contextVisible={contextVisible}
      governanceVisible={governanceVisible}
    >
      <div className="p-6">
        <h2 className="text-2xl font-bold mb-4">Terminal View</h2>
        <div className="bg-gray-900 rounded-lg p-4 font-mono text-sm">
          <div className="text-green-500">$ npm install</div>
          <div className="text-gray-400 mt-2">Installing dependencies...</div>
          <div className="text-gray-400">✓ Installed 247 packages</div>
          <div className="text-green-500 mt-2">$ npm run dev</div>
          <div className="text-gray-400">Server running on http://localhost:5050</div>
        </div>
      </div>
    </AppShell>
  );
};

/**
 * Example 4: Dashboard with all features
 */
export const DashboardExample: React.FC = () => {
  const [refreshing, setRefreshing] = useState(false);

  const handleRefresh = () => {
    setRefreshing(true);
    setTimeout(() => setRefreshing(false), 2000);
  };

  const customShortcuts: KeyboardShortcut[] = [
    {
      key: "r",
      description: "Refresh dashboard",
      category: "actions",
      modifiers: ["ctrl"],
    },
    {
      key: "d",
      description: "Toggle debug mode",
      category: "mode",
    },
  ];

  const oracleMessages: OracleMessage[] = [
    { id: "1", type: "success", message: "All systems operational", timestamp: new Date() },
    { id: "2", type: "info", message: "3 agents active", timestamp: new Date() },
    { id: "3", type: "warning", message: "1 pending review", timestamp: new Date() },
  ];

  return (
    <AppShell
      title="Dashboard"
      icon={<BarChart3 className="w-6 h-6" />}
      badge="Live"
      headerActions={
        <button
          onClick={handleRefresh}
          disabled={refreshing}
          className="px-4 py-2 bg-gray-800 hover:bg-gray-700 rounded-lg transition-colors flex items-center gap-2 disabled:opacity-50"
        >
          <RefreshCw className={`w-4 h-4 ${refreshing ? "animate-spin" : ""}`} />
          Refresh
        </button>
      }
      leftPanel={
        <div className="p-4 h-full overflow-auto">
          <h3 className="text-lg font-semibold mb-4">Project Health</h3>
          <div className="space-y-3">
            <MetricCard label="Test Coverage" value="87%" status="good" />
            <MetricCard label="Security Score" value="92%" status="good" />
            <MetricCard label="Build Time" value="2.3s" status="normal" />
            <MetricCard label="Bundle Size" value="245KB" status="warning" />
          </div>
        </div>
      }
      leftPanelTitle="Health"
      rightPanel={
        <div className="p-4 h-full overflow-auto">
          <h3 className="text-lg font-semibold mb-4">Agent Activity</h3>
          <div className="space-y-2">
            {[
              { agent: "Builder", action: "Compiling components", time: "Just now" },
              { agent: "Tester", action: "Running unit tests", time: "1m ago" },
              { agent: "Reviewer", action: "Code review completed", time: "5m ago" },
            ].map((activity, i) => (
              <div key={i} className="p-3 bg-gray-800 rounded-lg">
                <div className="text-sm font-semibold text-purple-400">
                  {activity.agent}
                </div>
                <div className="text-xs text-gray-300 mt-1">{activity.action}</div>
                <div className="text-xs text-gray-500 mt-1">{activity.time}</div>
              </div>
            ))}
          </div>
        </div>
      }
      rightPanelTitle="Activity"
      showFooter={true}
      sessionName="dashboard-live"
      isConnected={true}
      oracleMessages={oracleMessages}
      customShortcuts={customShortcuts}
    >
      <div className="p-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
          <DashboardCard title="Total Projects" value="12" icon={<FileText />} />
          <DashboardCard title="Active Agents" value="3" icon={<Brain />} />
          <DashboardCard title="Success Rate" value="94%" icon={<CheckCircle />} />
          <DashboardCard title="Avg. Response" value="1.2s" icon={<Zap />} />
        </div>

        <div className="bg-gray-900 rounded-lg p-6">
          <h3 className="text-lg font-semibold mb-4">Recent Activity</h3>
          <div className="space-y-2">
            {[1, 2, 3, 4, 5].map((i) => (
              <div
                key={i}
                className="flex items-start gap-3 p-3 bg-gray-800 rounded-lg hover:bg-gray-750 transition-colors"
              >
                <div className="w-2 h-2 bg-green-500 rounded-full mt-1.5 animate-pulse" />
                <div className="flex-1">
                  <div className="text-sm font-medium">Agent Activity #{i}</div>
                  <div className="text-xs text-gray-400 mt-1">
                    Completed task in 2.3 seconds
                  </div>
                </div>
                <div className="text-xs text-gray-500">
                  {i} min{i > 1 ? "s" : ""} ago
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </AppShell>
  );
};

// Helper components
const StatusItem: React.FC<{
  label: string;
  status: "complete" | "running" | "pending";
  icon: React.ReactNode;
}> = ({ label, status, icon }) => (
  <div className="flex items-center justify-between p-3 bg-gray-800 rounded-lg">
    <span className="text-sm text-gray-300">{label}</span>
    <div className="flex items-center gap-2">
      {icon}
      <span className="text-xs text-gray-500 capitalize">{status}</span>
    </div>
  </div>
);

const MetricCard: React.FC<{
  label: string;
  value: string;
  status: "good" | "normal" | "warning";
}> = ({ label, value, status }) => {
  const statusColor =
    status === "good"
      ? "text-green-500"
      : status === "warning"
        ? "text-yellow-500"
        : "text-blue-500";

  return (
    <div className="p-3 bg-gray-800 rounded-lg">
      <div className="text-xs text-gray-500 mb-1">{label}</div>
      <div className={`text-lg font-bold ${statusColor}`}>{value}</div>
    </div>
  );
};

const DashboardCard: React.FC<{
  title: string;
  value: string;
  icon: React.ReactNode;
}> = ({ title, value, icon }) => (
  <div className="bg-gray-900 rounded-lg p-6 border border-gray-800 hover:border-purple-500/30 transition-colors">
    <div className="flex items-center justify-between mb-4">
      <div className="text-gray-400">{icon}</div>
      <div className="text-3xl font-bold text-white">{value}</div>
    </div>
    <div className="text-sm text-gray-500">{title}</div>
  </div>
);

/**
 * Example Router to switch between examples
 */
export const AppShellExamples: React.FC = () => {
  const [currentExample, setCurrentExample] = useState<
    "basic" | "panels" | "footer" | "dashboard"
  >("basic");

  const examples = {
    basic: <BasicExample />,
    panels: <WithPanelsExample />,
    footer: <WithFooterExample />,
    dashboard: <DashboardExample />,
  };

  return (
    <div className="min-h-screen bg-gray-950">
      {/* Example Selector */}
      <div className="fixed top-4 right-4 z-50 bg-gray-900 border border-gray-700 rounded-lg p-2 flex gap-2">
        <ExampleButton
          label="Basic"
          active={currentExample === "basic"}
          onClick={() => setCurrentExample("basic")}
        />
        <ExampleButton
          label="Panels"
          active={currentExample === "panels"}
          onClick={() => setCurrentExample("panels")}
        />
        <ExampleButton
          label="Footer"
          active={currentExample === "footer"}
          onClick={() => setCurrentExample("footer")}
        />
        <ExampleButton
          label="Dashboard"
          active={currentExample === "dashboard"}
          onClick={() => setCurrentExample("dashboard")}
        />
      </div>

      {/* Render selected example */}
      {examples[currentExample]}
    </div>
  );
};

const ExampleButton: React.FC<{
  label: string;
  active: boolean;
  onClick: () => void;
}> = ({ label, active, onClick }) => (
  <button
    onClick={onClick}
    className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
      active
        ? "bg-purple-500 text-white"
        : "bg-gray-800 text-gray-400 hover:bg-gray-700 hover:text-white"
    }`}
  >
    {label}
  </button>
);

export default AppShellExamples;
