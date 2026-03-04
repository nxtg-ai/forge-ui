'use client';

import { motion } from 'framer-motion';
import { Network, Shuffle, Shield, Activity } from 'lucide-react';

const featurePills = [
  {
    icon: <Network size={18} />,
    title: 'Agent Coordination',
    description: 'Intelligent task delegation & synchronization across multi-agent systems.',
  },
  {
    icon: <Shuffle size={18} />,
    title: 'Tool Routing',
    description: 'Dynamic selection and execution of tools based on context and capabilities.',
  },
  {
    icon: <Shield size={18} />,
    title: 'Policy & Escalation',
    description: 'Enforcing guardrails, compliance, and human-in-the-loop approvals.',
  },
  {
    icon: <Activity size={18} />,
    title: 'Stream Processing',
    description: 'Real-time data handling, filtering, and transformation for immediate insights.',
  },
];

export function RuntimeOrchestrator() {
  return (
    <div className="w-full">
      {/* Header */}
      <motion.h1
        className="text-5xl font-bold text-center mb-10"
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <span className="text-white">Runtime </span>
        <span className="gradient-text">Orchestrator</span>
      </motion.h1>

      {/* Feature Pills - Grid of 4 */}
      <div className="grid grid-cols-4 gap-5 max-w-6xl mx-auto">
        {featurePills.map((pill, index) => (
          <motion.div
            key={pill.title}
            className="glass px-5 py-4 flex items-start gap-3 hover:glow-cyan transition-all-300"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.1 }}
            whileHover={{ y: -2 }}
          >
            <span className="icon-cyan flex-shrink-0 mt-1">{pill.icon}</span>
            <div>
              <h3 className="font-semibold text-sm text-cyan-100 mb-1">{pill.title}</h3>
              <p className="text-xs text-slate-400 leading-relaxed">{pill.description}</p>
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  );
}
