import React from "react";
import {
  ChiefOfStaffDashboard,
  YoloMode,
} from "./index";
import { useEngagement } from "../contexts/EngagementContext";
import type {
  ProjectState,
  YoloStatistics,
  AutomatedAction,
  AgentActivity,
} from "./types";

// Dashboard wrapper that uses engagement context
export const DashboardWithEngagement: React.FC<{
  visionData: import('./types').VisionData;
  projectState: ProjectState;
  agentActivity: AgentActivity[];
}> = ({ visionData, projectState, agentActivity }) => {
  const { mode, setMode } = useEngagement();

  // Convert VisionData goals to string[] for ChiefOfStaffDashboard
  const normalizedVisionData = {
    mission: visionData.mission,
    goals: Array.isArray(visionData.goals)
      ? visionData.goals.map(g => typeof g === 'string' ? g : g.title)
      : [],
    constraints: visionData.constraints,
    successMetrics: Array.isArray(visionData.successMetrics)
      ? visionData.successMetrics.map(m => typeof m === 'string' ? m : m.name)
      : [],
    timeframe: visionData.timeframe,
  };

  return (
    <ChiefOfStaffDashboard
      visionData={normalizedVisionData}
      projectState={projectState}
      agentActivity={agentActivity}
      onModeChange={setMode}
      currentMode={mode}
    />
  );
};

// YOLO Mode wrapper that uses engagement context
export const YoloModeWithEngagement: React.FC<{
  onToggle: (active: boolean) => void;
  statistics: YoloStatistics;
  recentActions: AutomatedAction[];
}> = ({ onToggle, statistics, recentActions }) => {
  const { mode, automationLevel, setMode, setAutomationLevel } = useEngagement();

  const isActive = mode === "founder" && automationLevel === "aggressive";

  const handleToggle = (active: boolean) => {
    if (active) {
      setMode("founder");
      setAutomationLevel("aggressive");
    } else {
      setMode("engineer");
      setAutomationLevel("conservative");
    }
    onToggle(active);
  };

  return (
    <YoloMode
      enabled={isActive}
      onToggle={handleToggle}
      automationLevel={automationLevel}
      onLevelChange={setAutomationLevel}
      statistics={statistics}
      recentActions={recentActions}
    />
  );
};
