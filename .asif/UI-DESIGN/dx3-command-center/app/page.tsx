'use client';

import dynamic from 'next/dynamic';
import { AnimatedBackground } from '@/components/ui/AnimatedBackground';
import { TopProductBar } from '@/components/layout/TopProductBar';
import { LeftSidebar } from '@/components/layout/LeftSidebar';
import { RuntimeOrchestrator } from '@/components/dashboard/RuntimeOrchestrator';
import { FlowDiagram } from '@/components/dashboard/FlowDiagram';
import { ActionBar } from '@/components/dashboard/ActionBar';
import { IntegrationBar } from '@/components/dashboard/IntegrationBar';
import { WorkflowSteps } from '@/components/dashboard/WorkflowSteps';

// Dynamic import for 3D component to avoid SSR issues
const CentralKernel = dynamic(
  () => import('@/components/3d/CentralKernel').then((mod) => mod.CentralKernel),
  {
    ssr: false,
    loading: () => (
      <div className="w-full h-full flex items-center justify-center">
        <div className="w-32 h-32 rounded-full bg-gradient-to-br from-orange-500 to-amber-500 animate-pulse shadow-[0_0_60px_rgba(255,140,0,0.5)]" />
      </div>
    )
  }
);

export default function DashboardPage() {
  return (
    <div className="min-h-screen relative">
      {/* Animated Background */}
      <AnimatedBackground />

      {/* Main Layout */}
      <div className="relative z-10 flex flex-col min-h-screen">
        {/* Top Product Bar */}
        <TopProductBar />

        {/* Content Area */}
        <div className="flex flex-1">
          {/* Left Sidebar */}
          <LeftSidebar />

          {/* Main Content */}
          <main className="flex-1 px-8 py-8 overflow-auto">
            {/* Runtime Orchestrator Header */}
            <div className="mb-12">
              <RuntimeOrchestrator />
            </div>

            {/* Flow Diagram with Kernel */}
            <div className="relative mb-12 flex-1">
              {/* Flow cards and connections */}
              <FlowDiagramWithKernel />
            </div>

            {/* Action Bar */}
            <div className="mb-8">
              <ActionBar />
            </div>

            {/* Integration Bar */}
            <div className="mb-8">
              <IntegrationBar />
            </div>

            {/* Workflow Steps */}
            <div className="mb-6">
              <WorkflowSteps />
            </div>
          </main>
        </div>
      </div>
    </div>
  );
}

// Separate component for the flow diagram with integrated 3D kernel
function FlowDiagramWithKernel() {
  return (
    <div className="relative flex items-center justify-center gap-12 w-full max-w-[1600px] mx-auto min-h-[650px]">
      {/* SVG Connection Lines */}
      <ConnectionLinesSVG />

      {/* Left Cards */}
      <LeftFlowCards />

      {/* Center: 3D Kernel - LARGER CONTAINER */}
      <div className="w-[650px] h-[650px] flex-shrink-0 relative">
        <CentralKernel />
      </div>

      {/* Right Cards */}
      <RightFlowCards />
    </div>
  );
}

// Connection lines SVG overlay
function ConnectionLinesSVG() {
  return (
    <svg
      className="absolute inset-0 w-full h-full pointer-events-none z-0"
      viewBox="0 0 1400 650"
      preserveAspectRatio="xMidYMid meet"
    >
      <defs>
        <linearGradient id="goldGradient" x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stopColor="#ff8c00" stopOpacity="0.3" />
          <stop offset="50%" stopColor="#ff8c00" stopOpacity="0.8" />
          <stop offset="100%" stopColor="#ff8c00" stopOpacity="0.3" />
        </linearGradient>
        <linearGradient id="cyanGradient" x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stopColor="#00ffff" stopOpacity="0.3" />
          <stop offset="50%" stopColor="#00ffff" stopOpacity="0.8" />
          <stop offset="100%" stopColor="#00ffff" stopOpacity="0.3" />
        </linearGradient>
        <filter id="glowFilter" x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur stdDeviation="4" result="coloredBlur" />
          <feMerge>
            <feMergeNode in="coloredBlur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>

      {/* Left connections (gold) */}
      {[130, 325, 520].map((y, i) => (
        <g key={`left-${i}`}>
          <motion.path
            d={`M 260 ${y} Q 480 ${y} 600 325`}
            stroke="url(#goldGradient)"
            strokeWidth="3"
            fill="none"
            strokeDasharray="10 5"
            filter="url(#glowFilter)"
            initial={{ pathLength: 0 }}
            animate={{ pathLength: 1 }}
            transition={{ delay: 0.5 + i * 0.15, duration: 1.2 }}
            className="animate-dash"
          />
          <motion.circle
            cx={260}
            cy={y}
            r="6"
            fill="#ff8c00"
            filter="url(#glowFilter)"
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ delay: 0.8 + i * 0.15 }}
          />
        </g>
      ))}

      {/* Right connections (cyan/gold) */}
      {[130, 325, 520].map((y, i) => (
        <g key={`right-${i}`}>
          <motion.path
            d={`M 800 325 Q 920 ${y} 1140 ${y}`}
            stroke={i === 2 ? 'url(#goldGradient)' : 'url(#cyanGradient)'}
            strokeWidth="3"
            fill="none"
            strokeDasharray="10 5"
            filter="url(#glowFilter)"
            initial={{ pathLength: 0 }}
            animate={{ pathLength: 1 }}
            transition={{ delay: 0.5 + i * 0.15, duration: 1.2 }}
            className="animate-dash"
            style={{ animationDirection: 'reverse' }}
          />
          <motion.circle
            cx={1140}
            cy={y}
            r="6"
            fill={i === 2 ? '#ff8c00' : '#00ffff'}
            filter="url(#glowFilter)"
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ delay: 0.8 + i * 0.15 }}
          />
        </g>
      ))}
    </svg>
  );
}

import { motion } from 'framer-motion';
import {
  CheckSquare,
  Box,
  Share2,
  Clock,
  Brain,
  Link,
} from 'lucide-react';
import { GlassCard } from '@/components/ui/GlassCard';

const leftCards = [
  {
    id: 'intent',
    icon: <CheckSquare size={24} />,
    title: 'Intent & Plan',
    description: 'Goal & Constraints, Approvals Needed, Dynamic Node Graph',
    accentColor: 'gold' as const,
  },
  {
    id: 'artifacts-left',
    icon: <Box size={24} />,
    title: 'Artifacts & Memory',
    description: 'Generated Code, Models, Context, Long-term Storage',
    accentColor: 'gold' as const,
  },
  {
    id: 'entities',
    icon: <Share2 size={24} />,
    title: 'Entities & Graph',
    description: 'Semantic Connections, Relationships, Knowledge Base',
    accentColor: 'gold' as const,
  },
];

const rightCards = [
  {
    id: 'timeline',
    icon: <Clock size={24} />,
    title: 'Run Timeline',
    description: 'Step Execution, Diffs & Artifacts, Status Monitoring',
    accentColor: 'cyan' as const,
  },
  {
    id: 'artifacts-right',
    icon: <Brain size={24} />,
    title: 'Artifacts & Memory',
    description: 'Outputs, Reports, Logs, Version Control',
    accentColor: 'cyan' as const,
  },
  {
    id: 'provenance',
    icon: <Link size={24} />,
    title: 'Provenance',
    description: 'Traceability, Audit Trail, Source Tracking, Lineage',
    accentColor: 'gold' as const,
  },
];

function LeftFlowCards() {
  return (
    <div className="flex flex-col gap-8 z-10">
      {leftCards.map((card, index) => (
        <motion.div
          key={card.id}
          initial={{ opacity: 0, x: -30 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.2 + index * 0.1 }}
        >
          <GlassCard
            icon={card.icon}
            title={card.title}
            description={card.description}
            accentColor={card.accentColor}
            className="w-[240px]"
          />
        </motion.div>
      ))}
    </div>
  );
}

function RightFlowCards() {
  return (
    <div className="flex flex-col gap-8 z-10">
      {rightCards.map((card, index) => (
        <motion.div
          key={card.id}
          initial={{ opacity: 0, x: 30 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.2 + index * 0.1 }}
        >
          <GlassCard
            icon={card.icon}
            title={card.title}
            description={card.description}
            accentColor={card.accentColor}
            className="w-[240px]"
          />
        </motion.div>
      ))}
    </div>
  );
}
