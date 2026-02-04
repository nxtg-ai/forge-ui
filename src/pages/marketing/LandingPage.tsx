/**
 * Marketing Landing Page
 * Standalone React component showcasing NXTG-Forge features
 *
 * Features:
 * - Hero section with branding and CTA
 * - Features grid showcasing core capabilities
 * - Stats section highlighting key metrics
 * - Agent showcase with categorized grid
 * - Architecture diagram
 * - Footer with links
 * - Scroll-triggered animations using Framer Motion
 */

import React, { useEffect, useRef, useState } from "react";
import { motion, useInView } from "framer-motion";
import {
  Infinity,
  Users,
  Activity,
  Zap,
  Terminal,
  Brain,
  Shield,
  Code2,
  Database,
  Server,
  GitBranch,
  TestTube,
  FileText,
  RefreshCw,
  Lock,
  TrendingUp,
  Cloud,
  BarChart3,
  FileCheck,
  GraduationCap,
  Rocket,
  CheckCircle,
  ArrowRight,
  Sparkles,
  Target,
  Layers,
} from "lucide-react";

// Animation variants
const fadeInUp = {
  hidden: { opacity: 0, y: 30 },
  visible: { opacity: 1, y: 0 },
};

const staggerContainer = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1,
    },
  },
};

const scaleIn = {
  hidden: { opacity: 0, scale: 0.9 },
  visible: { opacity: 1, scale: 1 },
};

// Animated section wrapper
const AnimatedSection: React.FC<{
  children: React.ReactNode;
  className?: string;
}> = ({ children, className = "" }) => {
  const ref = useRef<HTMLDivElement>(null);
  const isInView = useInView(ref, { once: true, margin: "-100px" });

  return (
    <motion.section
      ref={ref}
      initial="hidden"
      animate={isInView ? "visible" : "hidden"}
      variants={fadeInUp}
      transition={{ duration: 0.6, ease: "easeOut" }}
      className={className}
    >
      {children}
    </motion.section>
  );
};

// Feature card component
interface FeatureCardProps {
  icon: React.ReactNode;
  title: string;
  description: string;
  color: string;
}

const FeatureCard: React.FC<FeatureCardProps> = ({
  icon,
  title,
  description,
  color,
}) => (
  <motion.div
    variants={scaleIn}
    whileHover={{ scale: 1.05, y: -5 }}
    className="bg-gradient-to-br from-gray-900 to-gray-950 border border-gray-800 rounded-xl p-6 hover:border-gray-700 transition-colors"
  >
    <div className={`inline-flex items-center justify-center w-12 h-12 rounded-lg bg-gradient-to-br ${color} mb-4`}>
      {icon}
    </div>
    <h3 className="text-xl font-bold text-white mb-2">{title}</h3>
    <p className="text-gray-400 leading-relaxed">{description}</p>
  </motion.div>
);

// Agent card component
interface AgentCardProps {
  name: string;
  icon: React.ReactNode;
  color: string;
}

const AgentCard: React.FC<AgentCardProps> = ({ name, icon, color }) => (
  <motion.div
    variants={scaleIn}
    whileHover={{ scale: 1.05 }}
    className="bg-gray-900 border border-gray-800 rounded-lg p-4 hover:border-gray-700 transition-colors flex items-center space-x-3"
  >
    <div className={`flex-shrink-0 w-10 h-10 rounded-lg bg-gradient-to-br ${color} flex items-center justify-center`}>
      {icon}
    </div>
    <span className="text-sm font-semibold text-white">{name}</span>
  </motion.div>
);

// Stat card component
interface StatCardProps {
  value: string;
  label: string;
}

const StatCard: React.FC<StatCardProps> = ({ value, label }) => (
  <motion.div
    variants={scaleIn}
    className="text-center"
  >
    <div className="text-4xl md:text-5xl font-bold bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent mb-2">
      {value}
    </div>
    <div className="text-gray-400 text-sm font-medium">{label}</div>
  </motion.div>
);

export const LandingPage: React.FC = () => {
  const [scrollY, setScrollY] = useState(0);

  useEffect(() => {
    const handleScroll = () => setScrollY(window.scrollY);
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const handleGetStarted = () => {
    window.location.href = "https://github.com/NXTG-Forge/v3";
  };

  return (
    <div className="min-h-screen bg-black text-white overflow-x-hidden">
      {/* Hero Section */}
      <section className="relative min-h-screen flex items-center justify-center px-4 overflow-hidden">
        {/* Animated background gradient */}
        <div className="absolute inset-0 bg-gradient-to-br from-gray-950 via-black to-gray-950">
          <div
            className="absolute inset-0 opacity-30"
            style={{
              background: `radial-gradient(circle at ${50 + scrollY * 0.1}% ${50 + scrollY * 0.05}%, rgba(59, 130, 246, 0.15), transparent 50%)`,
            }}
          />
        </div>

        {/* Content */}
        <div className="relative z-10 max-w-5xl mx-auto text-center">
          <motion.div
            initial={{ opacity: 0, y: 50 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, ease: "easeOut" }}
          >
            <div className="inline-flex items-center space-x-3 mb-6 px-4 py-2 bg-gray-900/50 border border-gray-800 rounded-full backdrop-blur-sm">
              <Sparkles className="w-5 h-5 text-blue-400" />
              <span className="text-sm text-gray-300">AI-Powered Development Platform</span>
            </div>

            <h1 className="text-5xl md:text-7xl font-bold mb-6 bg-gradient-to-r from-white via-blue-100 to-purple-200 bg-clip-text text-transparent">
              NXTG-Forge
            </h1>

            <p className="text-2xl md:text-3xl font-semibold text-gray-300 mb-4">
              The Invisible Intelligence Layer for Claude Code
            </p>

            <p className="text-lg md:text-xl text-gray-400 mb-8 max-w-3xl mx-auto leading-relaxed">
              AI-powered development platform with 22 specialized agents working seamlessly
              to accelerate your development workflow. Zero configuration. Maximum productivity.
            </p>

            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={handleGetStarted}
              className="inline-flex items-center space-x-2 px-8 py-4 bg-gradient-to-r from-blue-600 to-purple-600 text-white font-semibold rounded-xl hover:from-blue-500 hover:to-purple-500 transition-all shadow-lg shadow-blue-500/25"
            >
              <span>Get Started</span>
              <ArrowRight className="w-5 h-5" />
            </motion.button>
          </motion.div>

          {/* Scroll indicator */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 1, duration: 1 }}
            className="absolute bottom-8 left-1/2 transform -translate-x-1/2"
          >
            <motion.div
              animate={{ y: [0, 10, 0] }}
              transition={{ repeat: Number.POSITIVE_INFINITY, duration: 2 }}
              className="w-6 h-10 border-2 border-gray-700 rounded-full flex items-start justify-center p-2"
            >
              <div className="w-1 h-2 bg-blue-400 rounded-full" />
            </motion.div>
          </motion.div>
        </div>
      </section>

      {/* Stats Section */}
      <AnimatedSection className="py-16 px-4 border-t border-gray-900">
        <motion.div
          variants={staggerContainer}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true }}
          className="max-w-6xl mx-auto grid grid-cols-2 md:grid-cols-4 gap-8"
        >
          <StatCard value="22" label="Agents" />
          <StatCard value="474+" label="Tests" />
          <StatCard value="100%" label="Type Safe" />
          <StatCard value="Multi-Device" label="Access" />
        </motion.div>
      </AnimatedSection>

      {/* Features Grid */}
      <AnimatedSection className="py-20 px-4">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-4xl md:text-5xl font-bold mb-4">
              Built for{" "}
              <span className="bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent">
                Modern Development
              </span>
            </h2>
            <p className="text-gray-400 text-lg max-w-2xl mx-auto">
              Everything you need to build, test, and deploy exceptional software
            </p>
          </div>

          <motion.div
            variants={staggerContainer}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            className="grid md:grid-cols-2 lg:grid-cols-4 gap-6"
          >
            <FeatureCard
              icon={<Infinity className="w-6 h-6 text-white" />}
              title="Infinity Terminal"
              description="Persistent terminal sessions that survive browser close. Multi-device access with seamless reconnection."
              color="from-blue-600 to-cyan-600"
            />
            <FeatureCard
              icon={<Brain className="w-6 h-6 text-white" />}
              title="Agent Ecosystem"
              description="22 specialized AI agents for every development task. From planning to deployment."
              color="from-purple-600 to-pink-600"
            />
            <FeatureCard
              icon={<Activity className="w-6 h-6 text-white" />}
              title="Governance HUD"
              description="Real-time monitoring and strategic oversight. Health scores, progress tracking, and insights."
              color="from-green-600 to-emerald-600"
            />
            <FeatureCard
              icon={<Zap className="w-6 h-6 text-white" />}
              title="Zero-Config"
              description="Auto-detects project structure, language, and frameworks. No setup required. Just start building."
              color="from-orange-600 to-yellow-600"
            />
          </motion.div>
        </div>
      </AnimatedSection>

      {/* Agent Showcase */}
      <AnimatedSection className="py-20 px-4 bg-gradient-to-b from-black via-gray-950 to-black">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-4xl md:text-5xl font-bold mb-4">
              Meet Your{" "}
              <span className="bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent">
                Agent Team
              </span>
            </h2>
            <p className="text-gray-400 text-lg max-w-2xl mx-auto">
              22 specialized agents working in harmony to accelerate your workflow
            </p>
          </div>

          {/* Core Agents */}
          <div className="mb-12">
            <h3 className="text-2xl font-bold text-white mb-6 flex items-center">
              <Target className="w-6 h-6 mr-3 text-blue-400" />
              Core Agents
            </h3>
            <motion.div
              variants={staggerContainer}
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true }}
              className="grid md:grid-cols-2 lg:grid-cols-3 gap-4"
            >
              <AgentCard name="Builder" icon={<Code2 className="w-5 h-5 text-white" />} color="from-blue-600 to-cyan-600" />
              <AgentCard name="Guardian" icon={<Shield className="w-5 h-5 text-white" />} color="from-green-600 to-emerald-600" />
              <AgentCard name="Detective" icon={<Activity className="w-5 h-5 text-white" />} color="from-purple-600 to-pink-600" />
              <AgentCard name="Planner" icon={<Target className="w-5 h-5 text-white" />} color="from-orange-600 to-yellow-600" />
              <AgentCard name="Orchestrator" icon={<Layers className="w-5 h-5 text-white" />} color="from-indigo-600 to-blue-600" />
              <AgentCard name="Oracle" icon={<Brain className="w-5 h-5 text-white" />} color="from-pink-600 to-purple-600" />
            </motion.div>
          </div>

          {/* Development Agents */}
          <div className="mb-12">
            <h3 className="text-2xl font-bold text-white mb-6 flex items-center">
              <Code2 className="w-6 h-6 mr-3 text-purple-400" />
              Development Agents
            </h3>
            <motion.div
              variants={staggerContainer}
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true }}
              className="grid md:grid-cols-2 lg:grid-cols-4 gap-4"
            >
              <AgentCard name="Testing" icon={<TestTube className="w-5 h-5 text-white" />} color="from-green-600 to-emerald-600" />
              <AgentCard name="Docs" icon={<FileText className="w-5 h-5 text-white" />} color="from-blue-600 to-cyan-600" />
              <AgentCard name="Refactor" icon={<RefreshCw className="w-5 h-5 text-white" />} color="from-purple-600 to-pink-600" />
              <AgentCard name="Security" icon={<Lock className="w-5 h-5 text-white" />} color="from-red-600 to-orange-600" />
              <AgentCard name="Performance" icon={<TrendingUp className="w-5 h-5 text-white" />} color="from-yellow-600 to-orange-600" />
              <AgentCard name="Database" icon={<Database className="w-5 h-5 text-white" />} color="from-indigo-600 to-blue-600" />
              <AgentCard name="API" icon={<Server className="w-5 h-5 text-white" />} color="from-cyan-600 to-blue-600" />
              <AgentCard name="UI" icon={<Sparkles className="w-5 h-5 text-white" />} color="from-pink-600 to-purple-600" />
            </motion.div>
          </div>

          {/* Operations Agents */}
          <div>
            <h3 className="text-2xl font-bold text-white mb-6 flex items-center">
              <Cloud className="w-6 h-6 mr-3 text-green-400" />
              Operations Agents
            </h3>
            <motion.div
              variants={staggerContainer}
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true }}
              className="grid md:grid-cols-2 lg:grid-cols-4 gap-4"
            >
              <AgentCard name="DevOps" icon={<GitBranch className="w-5 h-5 text-white" />} color="from-blue-600 to-cyan-600" />
              <AgentCard name="Analytics" icon={<BarChart3 className="w-5 h-5 text-white" />} color="from-purple-600 to-pink-600" />
              <AgentCard name="Integration" icon={<Layers className="w-5 h-5 text-white" />} color="from-green-600 to-emerald-600" />
              <AgentCard name="Compliance" icon={<FileCheck className="w-5 h-5 text-white" />} color="from-orange-600 to-yellow-600" />
              <AgentCard name="Learning" icon={<GraduationCap className="w-5 h-5 text-white" />} color="from-indigo-600 to-blue-600" />
            </motion.div>
          </div>
        </div>
      </AnimatedSection>

      {/* Architecture Diagram */}
      <AnimatedSection className="py-20 px-4">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-4xl md:text-5xl font-bold mb-4">
              Simple{" "}
              <span className="bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent">
                Architecture
              </span>
            </h2>
            <p className="text-gray-400 text-lg">
              Powerful technology, elegantly designed
            </p>
          </div>

          <motion.div
            variants={fadeInUp}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            className="bg-gradient-to-br from-gray-900 to-gray-950 border border-gray-800 rounded-2xl p-8 md:p-12"
          >
            <pre className="text-gray-300 text-sm md:text-base overflow-x-auto">
{`┌─────────────────────────────────────────────┐
│          NXTG-Forge Architecture            │
├─────────────────────────────────────────────┤
│                                             │
│  ┌─────────────┐      ┌──────────────┐    │
│  │   Browser   │◄────►│  WebSocket   │    │
│  │  (React UI) │      │    Bridge    │    │
│  └─────────────┘      └──────────────┘    │
│         │                     │            │
│         │              ┌──────▼──────┐    │
│         │              │   Agent     │    │
│         │              │ Ecosystem   │    │
│         │              │  (22 Agents)│    │
│         │              └──────┬──────┘    │
│         │                     │            │
│  ┌──────▼──────┐      ┌──────▼──────┐    │
│  │  Infinity   │      │   Claude    │    │
│  │  Terminal   │◄────►│    Code     │    │
│  │  (Sessions) │      │    API      │    │
│  └─────────────┘      └─────────────┘    │
│                                             │
└─────────────────────────────────────────────┘`}
            </pre>
          </motion.div>
        </div>
      </AnimatedSection>

      {/* CTA Section */}
      <AnimatedSection className="py-20 px-4 bg-gradient-to-b from-black to-gray-950">
        <div className="max-w-4xl mx-auto text-center">
          <motion.div
            variants={fadeInUp}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
          >
            <h2 className="text-4xl md:text-5xl font-bold mb-6">
              Ready to{" "}
              <span className="bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent">
                Transform
              </span>
              {" "}Your Workflow?
            </h2>
            <p className="text-gray-400 text-lg mb-8 max-w-2xl mx-auto">
              Join developers who are building faster with AI-powered assistance
            </p>

            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={handleGetStarted}
                className="inline-flex items-center space-x-2 px-8 py-4 bg-gradient-to-r from-blue-600 to-purple-600 text-white font-semibold rounded-xl hover:from-blue-500 hover:to-purple-500 transition-all shadow-lg shadow-blue-500/25"
              >
                <Rocket className="w-5 h-5" />
                <span>Get Started</span>
              </motion.button>

              <motion.a
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                href="https://github.com/NXTG-Forge/v3"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center space-x-2 px-8 py-4 bg-gray-900 text-white font-semibold rounded-xl border border-gray-700 hover:bg-gray-800 transition-all"
              >
                <GitBranch className="w-5 h-5" />
                <span>View on GitHub</span>
              </motion.a>
            </div>
          </motion.div>
        </div>
      </AnimatedSection>

      {/* Footer */}
      <footer className="border-t border-gray-900 py-12 px-4">
        <div className="max-w-6xl mx-auto">
          <div className="grid md:grid-cols-4 gap-8 mb-8">
            {/* Brand */}
            <div className="col-span-2">
              <h3 className="text-xl font-bold mb-2">NXTG-Forge</h3>
              <p className="text-gray-400 mb-4">
                The invisible intelligence layer for Claude Code
              </p>
              <div className="flex items-center space-x-2 text-sm text-gray-500">
                <CheckCircle className="w-4 h-4" />
                <span>Built with Claude Code</span>
              </div>
            </div>

            {/* Quick Links */}
            <div>
              <h4 className="font-semibold mb-4">Product</h4>
              <ul className="space-y-2 text-gray-400">
                <li><a href="#features" className="hover:text-white transition-colors">Features</a></li>
                <li><a href="#agents" className="hover:text-white transition-colors">Agents</a></li>
                <li><a href="#architecture" className="hover:text-white transition-colors">Architecture</a></li>
                <li><a href="#docs" className="hover:text-white transition-colors">Documentation</a></li>
              </ul>
            </div>

            {/* Resources */}
            <div>
              <h4 className="font-semibold mb-4">Resources</h4>
              <ul className="space-y-2 text-gray-400">
                <li><a href="https://github.com/NXTG-Forge/v3" className="hover:text-white transition-colors">GitHub</a></li>
                <li><a href="#community" className="hover:text-white transition-colors">Community</a></li>
                <li><a href="#support" className="hover:text-white transition-colors">Support</a></li>
                <li><a href="#changelog" className="hover:text-white transition-colors">Changelog</a></li>
              </ul>
            </div>
          </div>

          {/* Copyright */}
          <div className="border-t border-gray-900 pt-8 text-center text-gray-500 text-sm">
            <p>&copy; {new Date().getFullYear()} NXTG-Forge. Open source under MIT License.</p>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default LandingPage;
