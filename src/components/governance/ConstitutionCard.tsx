import React from "react";
import { motion } from "framer-motion";
import { Shield, Target, Activity } from "lucide-react";
import type { Constitution } from "../../types/governance.types";

interface ConstitutionCardProps {
  constitution: Constitution;
}

export const ConstitutionCard: React.FC<ConstitutionCardProps> = ({
  constitution,
}) => {
  const getStatusColor = (status: string) => {
    switch (status) {
      case "PLANNING":
        return "bg-violet-500/20 text-violet-400 border-violet-500/30";
      case "EXECUTION":
        return "bg-blue-500/20 text-blue-400 border-blue-500/30";
      case "REVIEW":
        return "bg-green-500/20 text-green-400 border-green-500/30";
      case "BLOCKED":
        return "bg-red-500/20 text-red-400 border-red-500/30";
      default:
        return "bg-gray-500/20 text-gray-400 border-gray-500/30";
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-gradient-to-br from-gray-800 to-gray-950 rounded-lg border border-purple-500/30 p-4"
      data-testid="governance-constitution-card"
    >
      {/* Header */}
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-2">
          <Shield className="w-5 h-5 text-purple-400" />
          <h3 className="font-semibold text-sm">Constitution</h3>
        </div>
        <div
          className={`px-2 py-0.5 rounded text-xs border ${getStatusColor(constitution.status)}`}
        >
          {constitution.status}
        </div>
      </div>

      {/* Directive */}
      <div className="mb-4 p-3 bg-gray-950/50 rounded-md border-l-2 border-purple-500">
        <p className="text-xs text-gray-400 mb-1">Current Directive</p>
        <p className="text-sm font-medium text-gray-200">
          {constitution.directive}
        </p>
      </div>

      {/* Vision Points */}
      <div className="space-y-2 mb-4">
        <p className="text-xs text-gray-500 mb-2">Strategic Vision</p>
        {constitution.vision.map((item, idx) => (
          <motion.div
            key={idx}
            initial={{ x: -20, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            transition={{ delay: idx * 0.1 }}
            className="flex items-start gap-2"
            data-testid={`constitution-vision-item-${idx}`}
          >
            <Target className="w-3 h-3 text-blue-400 mt-0.5 flex-shrink-0" />
            <span className="text-xs text-gray-300">{item}</span>
          </motion.div>
        ))}
      </div>

      {/* Confidence Meter */}
      <div>
        <div className="flex justify-between text-xs mb-1">
          <span className="text-gray-500">Confidence</span>
          <span className="text-purple-400">{constitution.confidence ?? 0}%</span>
        </div>
        <div className="h-1 bg-gray-800 rounded-full overflow-hidden">
          <motion.div
            className="h-full bg-gradient-to-r from-purple-500 to-blue-500"
            initial={{ width: 0 }}
            animate={{ width: `${constitution.confidence ?? 0}%` }}
            transition={{ duration: 1, ease: [0.16, 1, 0.3, 1] }}
          />
        </div>
      </div>
    </motion.div>
  );
};
