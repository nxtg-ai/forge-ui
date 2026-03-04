'use client';

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

export function FlowDiagram() {
  return (
    <div className="relative flex items-center justify-between gap-8 w-full max-w-6xl mx-auto py-8">
      {/* Left Cards */}
      <div className="flex flex-col gap-4 z-10">
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

      {/* Center Kernel Placeholder - Will be replaced with 3D */}
      <div className="flex-1 flex items-center justify-center relative">
        <motion.div
          className="relative w-[320px] h-[320px] flex items-center justify-center"
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.3, duration: 0.5 }}
        >
          {/* Outer glow ring */}
          <div className="absolute inset-0 rounded-full bg-gradient-to-r from-cyan-500/20 via-orange-500/20 to-cyan-500/20 blur-2xl animate-pulse-scale" />

          {/* Rotating rings - CSS fallback */}
          <div className="absolute w-[280px] h-[280px] rounded-full border-2 border-cyan-500/40 animate-spin-slow" />
          <div className="absolute w-[240px] h-[240px] rounded-full border-2 border-cyan-400/30 animate-spin-reverse" style={{ transform: 'rotateX(60deg)' }} />
          <div className="absolute w-[200px] h-[200px] rounded-full border border-orange-500/30 animate-spin-slow" style={{ animationDuration: '25s' }} />

          {/* Central core */}
          <div className="absolute w-[140px] h-[140px] rounded-full bg-gradient-to-br from-orange-500 via-amber-500 to-orange-600 animate-pulse-scale shadow-[0_0_60px_rgba(255,140,0,0.5)]" />

          {/* Inner glow */}
          <div className="absolute w-[100px] h-[100px] rounded-full bg-gradient-to-br from-yellow-400 to-orange-500 opacity-80" />

          {/* Text overlay */}
          <div className="relative z-10 text-center">
            <div className="text-lg font-bold text-white tracking-wider drop-shadow-lg">Dx3</div>
            <div className="text-sm font-semibold text-cyan-200 tracking-widest">KERNEL</div>
            <div className="text-xs text-slate-300 mt-1">AI CORE</div>
          </div>
        </motion.div>
      </div>

      {/* Right Cards */}
      <div className="flex flex-col gap-4 z-10">
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
    </div>
  );
}
