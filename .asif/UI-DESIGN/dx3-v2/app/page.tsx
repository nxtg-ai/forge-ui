'use client';

import dynamic from 'next/dynamic';
import { TopNavigation } from '@/components/layout/TopNavigation';
import { Sidebar } from '@/components/layout/Sidebar';
import { OrchestratorTitle } from '@/components/orchestrator/OrchestratorTitle';
import { CapabilitiesRow } from '@/components/orchestrator/CapabilitiesRow';
import { NodeCard } from '@/components/orchestrator/NodeCard';
import { ConnectionLines } from '@/components/orchestrator/ConnectionLines';
import { ActionBar } from '@/components/orchestrator/ActionBar';
import { IntegrationsRow } from '@/components/orchestrator/IntegrationsRow';
import { WorkflowStages } from '@/components/orchestrator/WorkflowStages';
import {
  Target,
  FileText,
  Network,
  Clock,
  Brain,
  Shield,
} from 'lucide-react';

// Dynamic import for 3D component
const TorusKernel = dynamic(
  () => import('@/components/kernel/TorusKernel').then((mod) => mod.TorusKernel),
  {
    ssr: false,
    loading: () => (
      <div className="w-full h-full flex items-center justify-center">
        <div className="w-24 h-24 rounded-full bg-cyan-500/20 animate-pulse" />
      </div>
    ),
  }
);

const inputNodes = [
  {
    icon: <Target size={20} />,
    title: 'Intent & Plan',
    description: 'Goal & Constraints, Approvals Needed, Dynamic Node Graph',
  },
  {
    icon: <FileText size={20} />,
    title: 'Artifacts & Memory',
    description: 'Generated Code, Models, Context, Long-term Storage',
  },
  {
    icon: <Network size={20} />,
    title: 'Entities & Graph',
    description: 'Semantic Connections, Relationships, Knowledge Base',
  },
];

const outputNodes = [
  {
    icon: <Clock size={20} />,
    title: 'Run Timeline',
    description: 'Step Execution, Diffs & Artifacts, Status Monitoring',
  },
  {
    icon: <Brain size={20} />,
    title: 'Artifacts & Memory',
    description: 'Outputs, Reports, Logs, Version Control',
  },
  {
    icon: <Shield size={20} />,
    title: 'Provenance',
    description: 'Traceability, Audit Trail, Source Tracking, Lineage',
  },
];

export default function DashboardPage() {
  return (
    <div className="min-h-screen flex flex-col bg-grid">
      {/* Top Navigation */}
      <TopNavigation />

      {/* Main Layout */}
      <div className="flex flex-1">
        {/* Left Sidebar */}
        <Sidebar />

        {/* Main Content */}
        <main className="flex-1 p-6 overflow-auto">
          {/* Orchestrator Title */}
          <OrchestratorTitle />

          {/* Capabilities Row */}
          <CapabilitiesRow />

          {/* Orchestration Core - Node Diagram */}
          <div className="relative mb-6">
            {/* Connection Lines */}
            <ConnectionLines />

            {/* Flow Diagram */}
            <div className="relative flex items-center justify-center gap-8 min-h-[500px]">
              {/* Left Input Nodes */}
              <div className="flex flex-col gap-6 z-10">
                {inputNodes.map((node) => (
                  <NodeCard
                    key={node.title}
                    icon={node.icon}
                    title={node.title}
                    description={node.description}
                    side="input"
                  />
                ))}
              </div>

              {/* Central 3D Kernel */}
              <div className="w-[500px] h-[500px] flex-shrink-0 relative z-10">
                <TorusKernel />
              </div>

              {/* Right Output Nodes */}
              <div className="flex flex-col gap-6 z-10">
                {outputNodes.map((node) => (
                  <NodeCard
                    key={node.title}
                    icon={node.icon}
                    title={node.title}
                    description={node.description}
                    side="output"
                  />
                ))}
              </div>
            </div>
          </div>

          {/* Action Bar */}
          <ActionBar />

          {/* Integrations Row */}
          <IntegrationsRow />

          {/* Workflow Stages */}
          <WorkflowStages />
        </main>
      </div>
    </div>
  );
}
