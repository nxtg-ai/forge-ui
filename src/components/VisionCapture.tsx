import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Sparkles,
  Brain,
  Target,
  Zap,
  ChevronRight,
  Command,
} from "lucide-react";

interface VisionCaptureProps {
  onVisionSubmit: (vision: VisionData) => void;
  existingVision?: VisionData;
  mode: "initial" | "update";
}

interface VisionData {
  mission: string;
  goals: string[];
  constraints: string[];
  successMetrics: string[];
  timeframe: string;
  engagementMode: "ceo" | "vp" | "engineer" | "builder" | "founder";
}

export const VisionCapture: React.FC<VisionCaptureProps> = ({
  onVisionSubmit,
  existingVision,
  mode,
}) => {
  const [vision, setVision] = useState<VisionData>(
    existingVision || {
      mission: "",
      goals: [],
      constraints: [],
      successMetrics: [],
      timeframe: "",
      engagementMode: "ceo",
    },
  );

  const [currentStep, setCurrentStep] = useState(0);
  const [inputValue, setInputValue] = useState("");

  const steps = [
    {
      id: "mission",
      icon: <Target className="w-5 h-5" />,
      title: "What are we building?",
      subtitle: "Describe your vision in one powerful sentence",
      placeholder:
        'e.g., "A platform that eliminates developer burnout through intelligent automation"',
      field: "mission",
    },
    {
      id: "goals",
      icon: <Sparkles className="w-5 h-5" />,
      title: "Key objectives",
      subtitle: "What must this achieve? (Press Enter after each)",
      placeholder: 'e.g., "Reduce cognitive load by 80%"',
      field: "goals",
      isArray: true,
    },
    {
      id: "constraints",
      icon: <Brain className="w-5 h-5" />,
      title: "Constraints & requirements",
      subtitle: "What are the boundaries? (Press Enter after each)",
      placeholder: 'e.g., "Must integrate with existing CI/CD"',
      field: "constraints",
      isArray: true,
    },
    {
      id: "metrics",
      icon: <Zap className="w-5 h-5" />,
      title: "Success looks like...",
      subtitle: "How will we measure victory? (Press Enter after each)",
      placeholder: 'e.g., "Development velocity increases 3x"',
      field: "successMetrics",
      isArray: true,
    },
    {
      id: "timeframe",
      icon: <Command className="w-5 h-5" />,
      title: "Timeframe",
      subtitle: "When do you need this?",
      placeholder: 'e.g., "2 weeks for MVP, 2 months for production"',
      field: "timeframe",
    },
  ];

  const currentStepData = steps[currentStep];

  const handleInputSubmit = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && inputValue.trim()) {
      e.preventDefault();

      if (currentStepData.isArray) {
        setVision((prev) => ({
          ...prev,
          [currentStepData.field]: [
            ...(prev[currentStepData.field as keyof VisionData] as string[]),
            inputValue,
          ],
        }));
        setInputValue("");
      } else {
        setVision((prev) => ({
          ...prev,
          [currentStepData.field]: inputValue,
        }));
        handleNext();
      }
    }
  };

  const handleNext = () => {
    if (currentStep < steps.length - 1) {
      setCurrentStep(currentStep + 1);
      setInputValue("");
    } else {
      onVisionSubmit(vision);
    }
  };

  const engagementModes = [
    {
      id: "ceo",
      label: "CEO",
      description: "High-level vision only",
      color: "bg-purple-500/10 border-purple-500/20 hover:border-purple-500/40",
    },
    {
      id: "vp",
      label: "VP",
      description: "Strategic oversight",
      color: "bg-blue-500/10 border-blue-500/20 hover:border-blue-500/40",
    },
    {
      id: "engineer",
      label: "Engineer",
      description: "Technical deep-dives",
      color: "bg-green-500/10 border-green-500/20 hover:border-green-500/40",
    },
    {
      id: "builder",
      label: "Builder",
      description: "Hands-on implementation",
      color: "bg-orange-500/10 border-orange-500/20 hover:border-orange-500/40",
    },
    {
      id: "founder",
      label: "Founder",
      description: "Everything mode",
      color: "bg-red-500/10 border-red-500/20 hover:border-red-500/40",
    },
  ];

  return (
    <motion.div
      className="min-h-screen bg-gray-950 text-gray-100 flex items-center justify-center p-8"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.6 }}
      data-testid="vision-capture-container"
    >
      <div className="w-full max-w-4xl" data-testid="vision-capture-main">
        {/* Header */}
        <motion.div
          className="mb-12 text-center"
          initial={{ y: -20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.2 }}
          data-testid="vision-capture-header"
        >
          <div
            className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-purple-500/10 border border-purple-500/20 mb-6"
            data-testid="vision-capture-status-badge"
          >
            <Sparkles className="w-4 h-4 text-purple-400" />
            <span
              className="text-sm font-medium text-purple-300"
              data-testid="vision-capture-mode-label"
            >
              {mode === "initial"
                ? "Initializing Chief of Staff"
                : "Updating Vision"}
            </span>
          </div>

          <h1
            className="text-5xl font-bold bg-gradient-to-r from-purple-400 to-blue-400 bg-clip-text text-transparent mb-4"
            data-testid="vision-capture-title"
          >
            Define Your Vision
          </h1>
          <p
            className="text-gray-400 text-lg"
            data-testid="vision-capture-subtitle"
          >
            Your AI Chief of Staff needs to understand your mission
          </p>
        </motion.div>

        {/* Progress Bar */}
        <div className="mb-8" data-testid="vision-capture-progress">
          <div className="flex items-center justify-between mb-2">
            {steps.map((step, idx) => (
              <div
                key={step.id}
                className={`flex items-center gap-2 ${
                  idx <= currentStep ? "text-purple-400" : "text-gray-600"
                }`}
                data-testid={`vision-capture-step-${step.id}`}
              >
                <div
                  className={`
                  w-8 h-8 rounded-full border flex items-center justify-center
                  transition-all duration-300
                  ${
                    idx < currentStep
                      ? "bg-purple-500 border-purple-500"
                      : idx === currentStep
                        ? "border-purple-400 bg-purple-500/20"
                        : "border-gray-700"
                  }
                `}
                  data-testid={`vision-capture-step-indicator-${step.id}`}
                >
                  {idx < currentStep ? "✓" : idx + 1}
                </div>
                {idx < steps.length - 1 && (
                  <div
                    className={`
                    w-full h-0.5 transition-all duration-500
                    ${idx < currentStep ? "bg-purple-500" : "bg-gray-800"}
                  `}
                  />
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Current Step */}
        <AnimatePresence mode="wait">
          <motion.div
            key={currentStep}
            initial={{ x: 20, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: -20, opacity: 0 }}
            transition={{ duration: 0.3 }}
            className="mb-8"
            data-testid={`vision-capture-step-content-${currentStepData.id}`}
          >
            <div
              className="bg-gray-900/50 backdrop-blur-sm rounded-2xl border border-gray-800 p-8"
              data-testid="vision-capture-step-card"
            >
              <div className="flex items-start gap-4 mb-6">
                <div className="w-12 h-12 rounded-xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center">
                  {currentStepData.icon}
                </div>
                <div>
                  <h2
                    className="text-2xl font-semibold mb-1"
                    data-testid="vision-capture-step-title"
                  >
                    {currentStepData.title}
                  </h2>
                  <p
                    className="text-gray-400"
                    data-testid="vision-capture-step-subtitle"
                  >
                    {currentStepData.subtitle}
                  </p>
                </div>
              </div>

              {/* Input Field */}
              <div className="relative">
                <input
                  type="text"
                  value={inputValue}
                  onChange={(e) => setInputValue(e.target.value)}
                  onKeyDown={handleInputSubmit}
                  placeholder={currentStepData.placeholder}
                  className="w-full px-6 py-4 bg-gray-900 border border-gray-800 rounded-xl
                           focus:border-purple-500 focus:ring-2 focus:ring-purple-500/20
                           outline-none transition-all text-gray-100 placeholder-gray-500"
                  autoFocus
                  data-testid={`vision-capture-input-${currentStepData.id}`}
                />
                {!currentStepData.isArray && (
                  <button
                    onClick={() => {
                      // Save current input to vision before proceeding
                      if (inputValue.trim()) {
                        setVision((prev) => ({
                          ...prev,
                          [currentStepData.field]: inputValue,
                        }));
                      }
                      handleNext();
                    }}
                    className="absolute right-2 top-1/2 -translate-y-1/2 p-2 rounded-lg
                             bg-purple-500/10 hover:bg-purple-500/20 border border-purple-500/20
                             transition-all cursor-pointer"
                    title="Continue to next step"
                    data-testid="vision-capture-next-btn"
                  >
                    <ChevronRight className="w-5 h-5 text-purple-400" />
                  </button>
                )}
              </div>

              {/* Array Items Display */}
              {currentStepData.isArray &&
                (vision[currentStepData.field as keyof VisionData] as string[])
                  .length > 0 && (
                  <div
                    className="mt-4 space-y-2"
                    data-testid={`vision-capture-list-${currentStepData.id}`}
                  >
                    {(
                      vision[
                        currentStepData.field as keyof VisionData
                      ] as string[]
                    ).map((item, idx) => (
                      <motion.div
                        key={idx}
                        initial={{ opacity: 0, y: -10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="flex items-center gap-3 px-4 py-2 bg-gray-900 rounded-lg border border-gray-800"
                        data-testid={`vision-capture-item-${currentStepData.id}-${idx}`}
                      >
                        <div className="w-2 h-2 rounded-full bg-purple-400" />
                        <span className="text-gray-300">{item}</span>
                      </motion.div>
                    ))}
                    <button
                      onClick={handleNext}
                      className="mt-3 px-6 py-2 bg-purple-500 hover:bg-purple-600 rounded-lg
                             transition-all font-medium"
                      data-testid="vision-capture-continue-btn"
                    >
                      Continue
                    </button>
                  </div>
                )}
            </div>
          </motion.div>
        </AnimatePresence>

        {/* Engagement Mode Selector (shown at the end) */}
        {currentStep === steps.length - 1 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="mt-8"
            data-testid="vision-capture-engagement-selector"
          >
            <h3
              className="text-lg font-semibold mb-4 text-gray-300"
              data-testid="vision-capture-engagement-title"
            >
              How involved do you want to be?
            </h3>
            <div
              className="grid grid-cols-5 gap-3"
              data-testid="vision-capture-engagement-modes"
            >
              {engagementModes.map((mode) => (
                <button
                  key={mode.id}
                  onClick={() =>
                    setVision((prev) => ({
                      ...prev,
                      engagementMode: mode.id as VisionData["engagementMode"],
                    }))
                  }
                  className={`
                    p-4 rounded-xl border transition-all
                    ${
                      vision.engagementMode === mode.id
                        ? mode.color + " ring-2 ring-purple-500/30"
                        : "bg-gray-900/50 border-gray-800 hover:border-gray-700"
                    }
                  `}
                  data-testid={`vision-capture-mode-${mode.id}-btn`}
                >
                  <div className="text-sm font-semibold mb-1">{mode.label}</div>
                  <div className="text-xs text-gray-500">
                    {mode.description}
                  </div>
                </button>
              ))}
            </div>
          </motion.div>
        )}
      </div>
    </motion.div>
  );
};
