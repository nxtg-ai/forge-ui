/**
 * Icon Mapper Utility
 * Maps icon names from API to Lucide React components
 */

import React from "react";
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

const ICON_MAP: Record<string, React.ElementType> = {
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
  Command: CommandIcon,
  HelpCircle,
};

export interface IconProps {
  className?: string;
}

/**
 * Get icon component by name
 * Returns HelpCircle as fallback if icon not found
 */
export function getIconByName(
  iconName: string | undefined,
): React.ElementType {
  if (!iconName) return HelpCircle;
  return ICON_MAP[iconName] || HelpCircle;
}

/**
 * Render icon component from name
 */
export function renderIcon(
  iconName: string | undefined,
  props?: IconProps,
): React.ReactNode {
  const Icon = getIconByName(iconName);
  return <Icon {...props} />;
}
