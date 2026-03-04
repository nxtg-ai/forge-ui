# Dx3 Command Center - Pixel-Perfect Implementation Specification

> **For Claude Code / Cursor / IDE Development**
> Reference Image: `Gemini-Dx3-Command-Center-LOVE-IT.png`

---

## 🎯 CLAUDE CODE PROMPT

```
Build a pixel-perfect implementation of the Dx3 Command Center dashboard from the reference image. This is NOT a mockup - it must be production-ready with:

1. Real Three.js 3D torus kernel with proper shaders, lighting, and volumetric glow
2. True glassmorphism (backdrop-filter blur, not fake transparency)
3. Proper z-indexing and layering
4. Animated connection lines with particle flow
5. Light beam effects with bloom
6. Every pixel matching the reference

Tech Stack: Next.js 14+ (App Router), React 18, TypeScript, Tailwind CSS, Three.js + React Three Fiber, Framer Motion

The centerpiece torus must have:
- 3D geometry with proper depth/perspective
- Cyan outer glow ring
- Orange/amber inner energy spiral
- Concentric wave patterns
- Particle field
- Bloom/glow post-processing
- Center text overlay: "Dx3 KERNEL AI CORE"

Follow the SPEC.md exactly for layout, colors, components, and visual effects.
```

---

## 📐 LAYOUT ARCHITECTURE

### Overall Structure
```
┌─────────────────────────────────────────────────────────────────────┐
│                         TOP NAVIGATION BAR                          │
│  [FORGE] [ORACULUS] [GO PMO] [SECOND BRAIN]                        │
├────────┬────────────────────────────────────────────────────────────┤
│        │                    MAIN CONTENT                            │
│  SIDE  │  ┌─────────── Runtime Orchestrator ───────────┐           │
│  BAR   │  │  [Agent Coord] [Tool Route] [Policy] [Stream]│          │
│        │  ├─────────────────────────────────────────────┤           │
│ Projects│  │   INPUT        3D TORUS         OUTPUT     │           │
│ Runs    │  │   NODES        KERNEL           NODES      │           │
│ Memory  │  │   [Intent]  ╭─────────────╮    [Timeline]  │           │
│ Integr. │  │   [Artifacts]│   Dx3      │    [Artifacts] │           │
│ Agents  │  │   [Entities] │  KERNEL    │    [Provenance]│           │
│ Evidence│  │              ╰─────────────╯                │           │
│ Market  │  ├─────────────────────────────────────────────┤           │
│ Settings│  │  [Ingest][Plan][Run][Graph][Search][Checks][Publish]   │
│        │  │  [GitHub & CI][Discord][Browser][API Integrations]      │
│        │  │  COMPOSE ──→ EXECUTE ──→ ASSURE                         │
│        │  └─────────────────────────────────────────────────────────┘│
└────────┴────────────────────────────────────────────────────────────┘
```

### Viewport & Responsive
- Design target: 1440px × 900px (standard dashboard)
- Minimum supported: 1280px width
- Container max-width: 1600px, centered

---

## 🎨 DESIGN TOKENS

### Colors
```typescript
const colors = {
  // Primary Cyan Spectrum
  cyan: {
    50: '#ecfeff',
    100: '#cffafe',
    200: '#a5f3fc',
    300: '#67e8f9',
    400: '#22d3ee',
    500: '#06b6d4',  // PRIMARY
    600: '#0891b2',
    700: '#0e7490',
    glow: 'rgba(6, 182, 212, 0.6)',
    glowSoft: 'rgba(6, 182, 212, 0.2)',
  },
  
  // Amber/Orange Spectrum
  amber: {
    300: '#fcd34d',
    400: '#fbbf24',
    500: '#f59e0b',
    600: '#d97706',
    orange: '#f97316',  // PRIMARY ACCENT
    glow: 'rgba(249, 115, 22, 0.5)',
  },
  
  // Background Layers (darkest to lightest)
  bg: {
    base: '#050810',      // Deepest background
    primary: '#0a0f1a',   // Main background
    secondary: '#0f172a', // Elevated surfaces
    tertiary: '#1e293b',  // Cards/panels
    card: 'rgba(15, 23, 42, 0.6)',  // Glassmorphism base
    cardHover: 'rgba(30, 41, 59, 0.7)',
  },
  
  // Borders
  border: {
    default: 'rgba(51, 65, 85, 0.5)',
    subtle: 'rgba(71, 85, 105, 0.3)',
    glow: 'rgba(6, 182, 212, 0.4)',
    glowAmber: 'rgba(249, 115, 22, 0.3)',
  },
  
  // Text
  text: {
    primary: '#ffffff',
    secondary: '#cbd5e1',   // slate-300
    muted: '#94a3b8',       // slate-400
    subtle: '#64748b',      // slate-500
  }
};
```

### Typography
```typescript
const typography = {
  fontFamily: {
    display: '"Inter", "SF Pro Display", system-ui, sans-serif',
    body: '"Inter", system-ui, sans-serif',
    mono: '"JetBrains Mono", "Fira Code", monospace',
  },
  
  fontSize: {
    xs: '0.625rem',    // 10px - descriptions
    sm: '0.75rem',     // 12px - labels
    base: '0.875rem',  // 14px - body
    lg: '1rem',        // 16px - subheadings
    xl: '1.25rem',     // 20px - headings
    '2xl': '1.5rem',   // 24px - section titles
    '3xl': '1.875rem', // 30px - main title
  },
  
  fontWeight: {
    normal: 400,
    medium: 500,
    semibold: 600,
    bold: 700,
  }
};
```

### Spacing
```typescript
const spacing = {
  sidebarWidth: '200px',
  topNavHeight: '64px',
  cardPadding: '16px',
  cardGap: '12px',
  sectionGap: '24px',
};
```

### Effects
```typescript
const effects = {
  glassmorphism: {
    background: 'rgba(15, 23, 42, 0.6)',
    backdropFilter: 'blur(12px) saturate(180%)',
    border: '1px solid rgba(51, 65, 85, 0.5)',
    borderRadius: '12px',
  },
  
  glowCyan: {
    boxShadow: '0 0 20px rgba(6, 182, 212, 0.3), 0 0 40px rgba(6, 182, 212, 0.1)',
  },
  
  glowAmber: {
    boxShadow: '0 0 15px rgba(249, 115, 22, 0.3)',
  },
  
  cardShadow: '0 4px 24px rgba(0, 0, 0, 0.4)',
};
```

---

## 🧩 COMPONENT SPECIFICATIONS

### 1. Top Navigation Bar

```typescript
interface TopNavTab {
  id: string;
  icon: IconComponent;
  title: string;
  subtitle: string;
  accentColor?: 'cyan' | 'amber' | 'green';
}

const tabs: TopNavTab[] = [
  { id: 'forge', icon: Hammer, title: 'FORGE', subtitle: 'Developer Studio' },
  { id: 'oraculus', icon: Eye, title: 'ORACULUS', subtitle: 'PM Suite' },
  { id: 'gopmo', icon: LayoutGrid, title: 'GO PMO', subtitle: 'Enterprise' },
  { id: 'brain', icon: Brain, title: 'SECOND BRAIN', subtitle: 'Knowledge OS', accentColor: 'green' },
];
```

**Styles:**
```css
.top-nav {
  display: flex;
  justify-content: center;
  gap: 0;
  padding: 0 24px;
}

.top-nav-tab {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px 24px;
  background: rgba(15, 23, 42, 0.4);
  backdrop-filter: blur(8px);
  border: 1px solid rgba(51, 65, 85, 0.3);
  border-bottom: 2px solid transparent;
  transition: all 0.3s ease;
}

.top-nav-tab:hover {
  background: rgba(30, 41, 59, 0.5);
  border-bottom-color: rgba(6, 182, 212, 0.5);
}

.top-nav-tab.active {
  border-bottom-color: #06b6d4;
  background: linear-gradient(180deg, rgba(6, 182, 212, 0.1) 0%, transparent 100%);
}

.top-nav-tab .icon {
  width: 20px;
  height: 20px;
  color: #fbbf24; /* amber-400 for icons */
}

.top-nav-tab .title {
  font-size: 14px;
  font-weight: 600;
  color: #ffffff;
  letter-spacing: 0.05em;
}

.top-nav-tab .subtitle {
  font-size: 10px;
  color: #64748b;
}
```

**Light Beams (Top Decoration):**
```css
.light-beam {
  position: absolute;
  top: 0;
  width: 2px;
  height: 120px;
  background: linear-gradient(180deg, 
    rgba(6, 182, 212, 0.8) 0%,
    rgba(6, 182, 212, 0.3) 50%,
    transparent 100%
  );
  filter: blur(1px);
  box-shadow: 0 0 20px 4px rgba(6, 182, 212, 0.4);
}

.light-beam-left { left: 25%; }
.light-beam-right { right: 25%; }

.horizontal-glow {
  position: absolute;
  top: 0;
  left: 50%;
  transform: translateX(-50%);
  width: 400px;
  height: 1px;
  background: linear-gradient(90deg, 
    transparent 0%,
    rgba(6, 182, 212, 0.6) 50%,
    transparent 100%
  );
  box-shadow: 0 0 10px 2px rgba(6, 182, 212, 0.3);
}
```

---

### 2. Left Sidebar

```typescript
interface SidebarItem {
  id: string;
  icon: IconComponent;
  label: string;
}

const sidebarItems: SidebarItem[] = [
  { id: 'projects', icon: FolderOpen, label: 'Projects' },
  { id: 'runs', icon: Play, label: 'Runs' },
  { id: 'memory', icon: Brain, label: 'Memory' },
  { id: 'integrations', icon: Puzzle, label: 'Integrations' },
  { id: 'agents', icon: Bot, label: 'Agents' },
  { id: 'evidence', icon: SearchCheck, label: 'Evidence' },
  { id: 'marketplace', icon: ShoppingBag, label: 'Marketplace' },
  { id: 'settings', icon: Settings, label: 'Settings' },
];
```

**Styles:**
```css
.sidebar {
  width: 200px;
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding: 12px;
}

.sidebar-item {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px 16px;
  
  /* Glassmorphism */
  background: rgba(15, 23, 42, 0.5);
  backdrop-filter: blur(12px);
  border: 1px solid rgba(51, 65, 85, 0.4);
  border-radius: 10px;
  
  cursor: pointer;
  transition: all 0.2s ease;
}

.sidebar-item:hover {
  background: rgba(30, 41, 59, 0.6);
  border-color: rgba(6, 182, 212, 0.3);
  transform: translateX(4px);
}

.sidebar-item.active {
  background: rgba(6, 182, 212, 0.1);
  border-color: rgba(6, 182, 212, 0.5);
  box-shadow: 0 0 15px rgba(6, 182, 212, 0.2);
}

.sidebar-item .icon {
  width: 18px;
  height: 18px;
  color: #94a3b8;
}

.sidebar-item.active .icon {
  color: #22d3ee;
}

.sidebar-item .label {
  font-size: 14px;
  font-weight: 500;
  color: #cbd5e1;
}

.sidebar-item.active .label {
  color: #ffffff;
}
```

---

### 3. Main Content Area - Runtime Orchestrator Title

```css
.orchestrator-title-container {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 24px;
  margin-bottom: 24px;
}

.title-line {
  flex: 1;
  height: 1px;
  background: linear-gradient(90deg, 
    transparent 0%,
    rgba(51, 65, 85, 0.8) 50%,
    rgba(6, 182, 212, 0.5) 100%
  );
}

.title-line.right {
  background: linear-gradient(90deg, 
    rgba(6, 182, 212, 0.5) 0%,
    rgba(51, 65, 85, 0.8) 50%,
    transparent 100%
  );
}

.orchestrator-title {
  font-size: 32px;
  font-weight: 700;
  letter-spacing: 0.02em;
  background: linear-gradient(135deg, #06b6d4 0%, #22d3ee 50%, #67e8f9 100%);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
  filter: drop-shadow(0 0 30px rgba(6, 182, 212, 0.5));
}
```

---

### 4. Capabilities Row

```typescript
interface Capability {
  icon: IconComponent;
  title: string;
  description: string;
}

const capabilities: Capability[] = [
  {
    icon: Users,
    title: 'Agent Coordination',
    description: 'Intelligent task delegation & synchronization across multi-agent systems.'
  },
  {
    icon: Route,
    title: 'Tool Routing',
    description: 'Dynamic selection and execution of tools based on context and capabilities.'
  },
  {
    icon: ShieldAlert,
    title: 'Policy & Escalation',
    description: 'Enforcing guardrails, compliance, and human-in-the-loop approvals.'
  },
  {
    icon: Zap,
    title: 'Stream Processing',
    description: 'Real-time data handling, filtering, and transformation for immediate insights.'
  }
];
```

**Styles:**
```css
.capabilities-row {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 0;
  
  /* Container glassmorphism */
  background: rgba(15, 23, 42, 0.3);
  backdrop-filter: blur(8px);
  border: 1px solid rgba(51, 65, 85, 0.3);
  border-radius: 12px;
  overflow: hidden;
  margin-bottom: 24px;
}

.capability-card {
  display: flex;
  align-items: flex-start;
  gap: 12px;
  padding: 16px;
  border-right: 1px solid rgba(51, 65, 85, 0.3);
}

.capability-card:last-child {
  border-right: none;
}

.capability-icon-wrapper {
  padding: 8px;
  background: rgba(6, 182, 212, 0.1);
  border: 1px solid rgba(6, 182, 212, 0.2);
  border-radius: 8px;
}

.capability-icon {
  width: 16px;
  height: 16px;
  color: #22d3ee;
}

.capability-title {
  font-size: 13px;
  font-weight: 600;
  color: #ffffff;
  margin-bottom: 4px;
}

.capability-description {
  font-size: 11px;
  line-height: 1.4;
  color: #94a3b8;
}
```

---

### 5. 🔥 THE 3D TORUS KERNEL (Critical Component)

This is the centerpiece. Must be real Three.js with proper shading.

#### Geometry & Structure
```typescript
// Torus parameters
const torusConfig = {
  radius: 1.5,           // Main radius
  tube: 0.5,             // Tube thickness
  radialSegments: 64,    // Smoothness around tube
  tubularSegments: 128,  // Smoothness around torus
  
  // Inner spiral
  spiralTurns: 3,
  spiralRadius: 0.8,
  
  // Particle field
  particleCount: 200,
  particleSpread: 3,
};
```

#### Shader Materials
```glsl
// Vertex Shader for Torus
varying vec3 vNormal;
varying vec3 vPosition;
varying vec2 vUv;

void main() {
  vNormal = normalize(normalMatrix * normal);
  vPosition = position;
  vUv = uv;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}

// Fragment Shader for Torus with Cyan-Orange Gradient
uniform float time;
uniform vec3 colorCyan;
uniform vec3 colorOrange;

varying vec3 vNormal;
varying vec3 vPosition;
varying vec2 vUv;

void main() {
  // Fresnel effect for edge glow
  vec3 viewDirection = normalize(cameraPosition - vPosition);
  float fresnel = pow(1.0 - dot(viewDirection, vNormal), 3.0);
  
  // Angle-based color gradient
  float angle = atan(vPosition.y, vPosition.x);
  float colorMix = sin(angle * 2.0 + time * 0.5) * 0.5 + 0.5;
  
  vec3 baseColor = mix(colorCyan, colorOrange, colorMix);
  
  // Add glow at edges
  vec3 finalColor = baseColor + fresnel * colorCyan * 0.5;
  
  // Emission for bloom
  float emission = fresnel * 0.8 + 0.2;
  
  gl_FragColor = vec4(finalColor * emission, 1.0);
}
```

#### React Three Fiber Implementation
```typescript
import { Canvas, useFrame } from '@react-three/fiber';
import { 
  EffectComposer, 
  Bloom, 
  ChromaticAberration 
} from '@react-three/postprocessing';
import { Float, Trail } from '@react-three/drei';

const TorusKernel = () => {
  const torusRef = useRef();
  const spiralRef = useRef();
  
  useFrame((state) => {
    const t = state.clock.elapsedTime;
    torusRef.current.rotation.x = Math.sin(t * 0.3) * 0.2;
    torusRef.current.rotation.y = t * 0.2;
    spiralRef.current.rotation.z = t * 0.5;
  });
  
  return (
    <group>
      {/* Main Torus */}
      <mesh ref={torusRef}>
        <torusGeometry args={[1.5, 0.5, 64, 128]} />
        <torusShaderMaterial />
      </mesh>
      
      {/* Inner Energy Spiral */}
      <mesh ref={spiralRef}>
        <tubeGeometry args={[spiralCurve, 100, 0.05, 8, false]} />
        <meshBasicMaterial color="#f97316" transparent opacity={0.8} />
      </mesh>
      
      {/* Concentric Rings */}
      {[0.6, 0.8, 1.0, 1.2].map((radius, i) => (
        <mesh key={i} rotation={[Math.PI / 2, 0, 0]}>
          <ringGeometry args={[radius - 0.01, radius + 0.01, 64]} />
          <meshBasicMaterial 
            color="#06b6d4" 
            transparent 
            opacity={0.3 - i * 0.05} 
          />
        </mesh>
      ))}
      
      {/* Particle Field */}
      <Points positions={particlePositions}>
        <pointsMaterial 
          size={0.02} 
          color="#67e8f9" 
          transparent 
          opacity={0.6}
          sizeAttenuation
        />
      </Points>
      
      {/* Post Processing */}
      <EffectComposer>
        <Bloom 
          intensity={1.5}
          luminanceThreshold={0.2}
          luminanceSmoothing={0.9}
        />
      </EffectComposer>
    </group>
  );
};
```

#### Center Text Overlay (HTML)
```css
.kernel-text-overlay {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  text-align: center;
  pointer-events: none;
  z-index: 10;
}

.kernel-title {
  font-size: 36px;
  font-weight: 700;
  color: #ffffff;
  text-shadow: 
    0 0 20px rgba(6, 182, 212, 0.8),
    0 0 40px rgba(6, 182, 212, 0.4),
    0 0 60px rgba(6, 182, 212, 0.2);
  letter-spacing: 0.1em;
}

.kernel-subtitle {
  font-size: 14px;
  font-weight: 600;
  color: #22d3ee;
  letter-spacing: 0.3em;
  margin-top: 4px;
}

.kernel-label {
  font-size: 10px;
  color: rgba(103, 232, 249, 0.7);
  letter-spacing: 0.4em;
  margin-top: 2px;
}
```

---

### 6. Input/Output Node Cards

```typescript
interface NodeCard {
  icon: IconComponent;
  title: string;
  description: string;
  side: 'input' | 'output';
}

const inputNodes: NodeCard[] = [
  { 
    icon: Target, 
    title: 'Intent & Plan', 
    description: 'Goal & Constraints, Approvals Needed, Dynamic Node Graph',
    side: 'input'
  },
  { 
    icon: FileText, 
    title: 'Artifacts & Memory', 
    description: 'Generated Code, Models, Context, Long-term Storage',
    side: 'input'
  },
  { 
    icon: Network, 
    title: 'Entities & Graph', 
    description: 'Semantic Connections, Relationships, Knowledge Base',
    side: 'input'
  },
];

const outputNodes: NodeCard[] = [
  { 
    icon: Clock, 
    title: 'Run Timeline', 
    description: 'Step Execution, Diffs & Artifacts, Status Monitoring',
    side: 'output'
  },
  { 
    icon: Brain, 
    title: 'Artifacts & Memory', 
    description: 'Outputs, Reports, Logs, Version Control',
    side: 'output'
  },
  { 
    icon: Shield, 
    title: 'Provenance', 
    description: 'Traceability, Audit Trail, Source Tracking, Lineage',
    side: 'output'
  },
];
```

**Styles:**
```css
.node-card {
  width: 220px;
  padding: 14px;
  
  /* Glassmorphism with glow */
  background: rgba(15, 23, 42, 0.6);
  backdrop-filter: blur(12px);
  border: 1px solid rgba(51, 65, 85, 0.5);
  border-radius: 10px;
  
  /* Subtle glow */
  box-shadow: 
    0 0 15px rgba(6, 182, 212, 0.1),
    inset 0 1px 0 rgba(255, 255, 255, 0.05);
    
  transition: all 0.3s ease;
}

.node-card:hover {
  border-color: rgba(6, 182, 212, 0.4);
  box-shadow: 0 0 25px rgba(6, 182, 212, 0.2);
  transform: translateY(-2px);
}

.node-card.input .icon-wrapper {
  background: linear-gradient(135deg, rgba(6, 182, 212, 0.2), rgba(59, 130, 246, 0.2));
  border: 1px solid rgba(6, 182, 212, 0.3);
}

.node-card.output .icon-wrapper {
  background: linear-gradient(135deg, rgba(249, 115, 22, 0.2), rgba(251, 191, 36, 0.2));
  border: 1px solid rgba(249, 115, 22, 0.3);
}

.node-card .icon-wrapper {
  padding: 8px;
  border-radius: 8px;
  display: inline-flex;
}

.node-card.input .icon {
  color: #22d3ee;
}

.node-card.output .icon {
  color: #fbbf24;
}

.node-card .title {
  font-size: 14px;
  font-weight: 600;
  color: #ffffff;
  margin-bottom: 4px;
}

.node-card .description {
  font-size: 11px;
  line-height: 1.4;
  color: #94a3b8;
}
```

#### Connection Lines (SVG)
```css
.connection-lines {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  pointer-events: none;
  z-index: 1;
}

.connection-line {
  fill: none;
  stroke-width: 1.5;
  stroke-dasharray: 6, 4;
  animation: flowDash 2s linear infinite;
}

.connection-line.input {
  stroke: rgba(6, 182, 212, 0.4);
}

.connection-line.output {
  stroke: rgba(249, 115, 22, 0.4);
}

@keyframes flowDash {
  to {
    stroke-dashoffset: -20;
  }
}

/* Connection dots at endpoints */
.connection-dot {
  fill: currentColor;
  filter: drop-shadow(0 0 4px currentColor);
}

.connection-dot.cyan {
  color: #06b6d4;
}

.connection-dot.amber {
  color: #f97316;
}
```

---

### 7. Action Bar

```typescript
const actions = [
  { icon: Download, label: 'Ingest' },
  { icon: GitBranch, label: 'Plan' },
  { icon: Play, label: 'Run' },
  { icon: Network, label: 'Graph' },
  { icon: Search, label: 'Search' },
  { icon: CheckCircle, label: 'Checks' },
  { icon: Upload, label: 'Publish' },
];
```

**Styles:**
```css
.action-bar {
  display: flex;
  justify-content: center;
  gap: 10px;
  margin-bottom: 16px;
}

.action-button {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 10px 18px;
  
  /* Glassmorphism */
  background: rgba(15, 23, 42, 0.5);
  backdrop-filter: blur(10px);
  border: 1px solid rgba(51, 65, 85, 0.4);
  border-radius: 8px;
  
  cursor: pointer;
  transition: all 0.2s ease;
}

.action-button:hover {
  background: rgba(30, 41, 59, 0.6);
  border-color: rgba(6, 182, 212, 0.4);
  transform: translateY(-1px);
}

.action-button .icon {
  width: 16px;
  height: 16px;
  color: #94a3b8;
}

.action-button:hover .icon {
  color: #22d3ee;
}

.action-button .label {
  font-size: 13px;
  font-weight: 500;
  color: #cbd5e1;
}
```

---

### 8. Integrations Row

```typescript
const integrations = [
  { icon: Github, label: 'GitHub & CI' },
  { icon: MessageCircle, label: 'Discord & Chats' },
  { icon: Globe, label: 'Browser Tools' },
  { icon: Settings, label: 'API Integrations' },
];
```

**Styles:**
```css
.integrations-row {
  display: flex;
  justify-content: center;
  gap: 12px;
  margin-bottom: 20px;
}

.integration-chip {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 10px 20px;
  
  background: rgba(30, 41, 59, 0.5);
  backdrop-filter: blur(8px);
  border: 1px solid rgba(51, 65, 85, 0.4);
  border-radius: 8px;
  
  cursor: pointer;
  transition: all 0.2s ease;
}

.integration-chip:hover {
  border-color: rgba(249, 115, 22, 0.4);
  background: rgba(249, 115, 22, 0.05);
}

.integration-chip .icon {
  width: 18px;
  height: 18px;
  color: #fbbf24;
}

.integration-chip .label {
  font-size: 13px;
  font-weight: 500;
  color: #cbd5e1;
}
```

---

### 9. Workflow Stages (Bottom)

```typescript
const workflowStages = [
  { icon: FileEdit, title: 'COMPOSE', subtitle: 'Define & Plan' },
  { icon: PlayCircle, title: 'EXECUTE', subtitle: 'Deploy & Run' },
  { icon: ShieldCheck, title: 'ASSURE', subtitle: 'Verify & Audit' },
];
```

**Styles:**
```css
.workflow-stages {
  display: flex;
  justify-content: center;
  align-items: center;
  gap: 24px;
  padding-top: 20px;
  border-top: 1px solid rgba(51, 65, 85, 0.3);
}

.workflow-stage {
  display: flex;
  align-items: center;
  gap: 12px;
}

.workflow-stage .icon-wrapper {
  padding: 10px;
  background: rgba(30, 41, 59, 0.5);
  border: 1px solid rgba(51, 65, 85, 0.4);
  border-radius: 10px;
}

.workflow-stage .icon {
  width: 20px;
  height: 20px;
  color: #94a3b8;
}

.workflow-stage .title {
  font-size: 14px;
  font-weight: 600;
  color: #ffffff;
}

.workflow-stage .subtitle {
  font-size: 10px;
  color: #64748b;
}

.workflow-arrow {
  display: flex;
  align-items: center;
  gap: 8px;
  color: #475569;
}

.workflow-arrow .line {
  width: 40px;
  height: 1px;
  background: linear-gradient(90deg, #475569, #334155);
}

.workflow-arrow .symbol {
  font-size: 18px;
}

/* Bottom right shield */
.assure-badge {
  position: absolute;
  bottom: 16px;
  right: 16px;
}

.assure-badge .icon {
  width: 24px;
  height: 24px;
  color: #fbbf24;
  filter: drop-shadow(0 0 8px rgba(251, 191, 36, 0.4));
}
```

---

## 📁 FILE STRUCTURE

```
dx3-command-center/
├── app/
│   ├── layout.tsx
│   ├── page.tsx
│   └── globals.css
├── components/
│   ├── layout/
│   │   ├── TopNavigation.tsx
│   │   ├── Sidebar.tsx
│   │   └── MainContent.tsx
│   ├── orchestrator/
│   │   ├── OrchestratorTitle.tsx
│   │   ├── CapabilitiesRow.tsx
│   │   ├── OrchestrationCore.tsx
│   │   ├── NodeCard.tsx
│   │   ├── ConnectionLines.tsx
│   │   ├── ActionBar.tsx
│   │   ├── IntegrationsRow.tsx
│   │   └── WorkflowStages.tsx
│   ├── kernel/
│   │   ├── TorusKernel.tsx        # Main 3D component
│   │   ├── TorusShader.ts         # Custom shader
│   │   ├── SpiralEnergy.tsx       # Inner spiral
│   │   ├── ParticleField.tsx      # Surrounding particles
│   │   └── KernelOverlay.tsx      # Text overlay
│   └── ui/
│       ├── GlassCard.tsx
│       ├── GlowButton.tsx
│       └── LightBeam.tsx
├── lib/
│   ├── constants.ts               # All config values
│   ├── colors.ts                  # Design tokens
│   └── shaders/
│       ├── torus.vert
│       └── torus.frag
├── hooks/
│   └── useTorusAnimation.ts
├── types/
│   └── index.ts
└── public/
    └── fonts/
```

---

## 📦 DEPENDENCIES

```json
{
  "dependencies": {
    "next": "^14.0.0",
    "react": "^18.2.0",
    "react-dom": "^18.2.0",
    "@react-three/fiber": "^8.15.0",
    "@react-three/drei": "^9.88.0",
    "@react-three/postprocessing": "^2.15.0",
    "three": "^0.158.0",
    "framer-motion": "^10.16.0",
    "lucide-react": "^0.294.0",
    "tailwindcss": "^3.4.0",
    "clsx": "^2.0.0",
    "tailwind-merge": "^2.0.0"
  },
  "devDependencies": {
    "@types/react": "^18.2.0",
    "@types/three": "^0.158.0",
    "typescript": "^5.3.0"
  }
}
```

---

## ✅ ACCEPTANCE CRITERIA

### Visual Fidelity
- [ ] Layout matches reference within 2% tolerance
- [ ] Colors match extracted values exactly
- [ ] Glassmorphism has real backdrop blur (not fake)
- [ ] 3D torus has proper depth, lighting, and glow
- [ ] All animations run at 60fps

### 3D Kernel Requirements
- [ ] Uses Three.js with React Three Fiber
- [ ] Real torus geometry with proper shading
- [ ] Cyan-to-orange gradient based on angle
- [ ] Fresnel edge glow effect
- [ ] Inner orange spiral with animation
- [ ] Concentric ring waves
- [ ] Particle field with depth
- [ ] Bloom post-processing
- [ ] Center text with glow shadow

### Interactions
- [ ] Tab switching with state
- [ ] Sidebar selection with active states
- [ ] Hover effects on all interactive elements
- [ ] Smooth transitions (300ms ease)

### Code Quality
- [ ] TypeScript strict mode
- [ ] Proper component composition
- [ ] Performance optimized (memo, useMemo)
- [ ] Accessible (ARIA labels)

---

## 🚀 IMPLEMENTATION ORDER

1. **Project Setup** - Next.js, Tailwind, Three.js deps
2. **Design Tokens** - Colors, typography, spacing
3. **Layout Shell** - Top nav, sidebar, main area
4. **Glassmorphism Components** - Card, button primitives
5. **Static Content** - Capabilities, action bar, integrations, workflow
6. **Node Cards** - Input/output with connection lines
7. **3D Torus Kernel** - The hero component
8. **Post Processing** - Bloom, glow effects
9. **Animations** - Hover states, transitions
10. **Polish** - Light beams, final touches

---

## 🎬 FINAL NOTES

This is not a throwaway prototype. Build it like it's shipping to production tomorrow. Every shadow, every glow, every pixel matters.

The 3D torus is the soul of this interface. It needs to feel alive, powerful, and technically impressive. Use proper Three.js patterns, custom shaders, and post-processing.

Glassmorphism must be REAL - `backdrop-filter: blur()` with proper fallbacks, not transparent overlays pretending to be glass.

Reference the image constantly /home/axw/projects/NXTG-Forge/v3/.asif/UI-DESIGN/Dx3-UI-DESIGN-MOCKUP.png. If something looks different, fix it.
