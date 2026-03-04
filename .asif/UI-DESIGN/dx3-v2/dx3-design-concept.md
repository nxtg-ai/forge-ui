# Dx3 Command Center - Complete Build Specification

## Project Overview
Build a Next.js dashboard that recreates the Dx3 Command Center interface shown in the reference image. This is a command center for an AI orchestration platform combining multiple products (FORGE, ORACULUS, GO PMO, SECOND BRAIN) into a unified runtime orchestrator.

---

## Tech Stack

### Required Dependencies
```json
{
  "dependencies": {
    "next": "^15.0.0",
    "react": "^19.0.0",
    "react-dom": "^19.0.0",
    "typescript": "^5.0.0",
    "tailwindcss": "^3.4.0",
    "framer-motion": "^11.0.0",
    "@react-three/fiber": "^8.15.0",
    "@react-three/drei": "^9.92.0",
    "three": "^0.160.0",
    "lucide-react": "^0.300.0",
    "zustand": "^4.4.0"
  }
}
```

### Architecture
- Next.js 15 App Router
- TypeScript (strict mode)
- Tailwind CSS with custom utilities
- Client-side rendering for 3D components

---

## Visual Analysis & Layout

### Overall Structure (3-Zone Layout)

```
┌─────────────────────────────────────────────────────────────────┐
│  [FORGE] [ORACULUS] [GO PMO] [SECOND BRAIN]  ← Top Product Bar │
├──────────┬──────────────────────────────────────────────────────┤
│ Projects │                                                       │
│ Runs     │         RUNTIME ORCHESTRATOR HEADER                  │
│ Memory   │   [Agent Coord][Tool Route][Policy][Stream Proc]     │
│ Integr.. │                                                       │
│ Agents   │  ┌────────┐                    ┌────────────┐       │
│ Evidence │  │Intent &│    ╱───────────╲   │Run Timeline│       │
│ Market.. │  │Plan    │───○   [3D KERNEL]  │            │       │
│ Settings │  └────────┘    ╲    ●  ●   ╱   └────────────┘       │
│          │  ┌────────┐     ╲  Dx3   ╱    ┌────────────┐       │
│  LEFT    │  │Artifact│───────○─────○─────│Artifacts & │       │
│  NAV     │  │& Memory│      KERNEL       │Memory      │       │
│  SIDEBAR │  └────────┘    ╱  CORE   ╲    └────────────┘       │
│          │  ┌────────┐   ○           ○   ┌────────────┐       │
│  240px   │  │Entities│──╱             ╲──│Provenance  │       │
│          │  │& Graph │                   └────────────┘       │
│          │  └────────┘                                         │
│          │  [Ingest][Plan][Run][Graph][Search][Checks][Publish]│
│          │  [GitHub][Discord][Browser][API Integrations]       │
│          │  COMPOSE → EXECUTE → ASSURE                          │
└──────────┴──────────────────────────────────────────────────────┘
```

### Measurements
- **Left Sidebar**: 240px fixed width
- **Top Bar**: ~80px height
- **Card Padding**: 20px
- **Card Border Radius**: 12px
- **Card Spacing**: 16px gaps
- **Icon Size**: 24px for nav, 32px for main cards

---

## Color Palette

```css
/* Primary Colors */
--primary-cyan: #00ffff
--primary-gold: #ff8c00
--primary-orange: #ff6b00

/* Background */
--bg-dark: #0a0e1a
--bg-darker: #050810
--card-bg: rgba(15, 23, 42, 0.6)

/* Text */
--text-primary: #e2e8f0
--text-secondary: #94a3b8
--text-muted: #64748b

/* Borders */
--border-cyan: rgba(0, 255, 255, 0.2)
--border-cyan-hover: rgba(0, 255, 255, 0.4)
--border-gold: rgba(255, 140, 0, 0.2)
```

---

## Component Breakdown

### 1. Layout Components

#### `app/page.tsx` - Main Dashboard Container
```typescript
- <TopProductBar />
- <div className="flex">
    - <LeftSidebar />
    - <MainContent />
  </div>
```

#### `components/layout/LeftSidebar.tsx`
**8 Navigation Items:**
1. Projects (folder icon)
2. Runs (play icon)
3. Memory (brain icon)
4. Integrations (plug icon)
5. Agents (bot icon)
6. Evidence (search icon)
7. Marketplace (shopping-cart icon)
8. Settings (settings icon)

**Styling:** Glassmorphic buttons, cyan/gold icon colors

#### `components/layout/TopProductBar.tsx`
**4 Product Cards:**
1. **FORGE** - Developer Studio (hammer icon, gold)
2. **ORACULUS** - PM Suite (eye icon, cyan)
3. **GO PMO** - Enterprise (rocket icon, gold)
4. **SECOND BRAIN** - Knowledge OS (brain icon, cyan)

### 2. Main Orchestrator Section

#### `components/dashboard/RuntimeOrchestrator.tsx`
**Header:** "Runtime Orchestrator" (white → cyan gradient)

**4 Feature Pills:**
1. Agent Coordination (network icon)
2. Tool Routing (shuffle icon)
3. Policy & Escalation (shield icon)
4. Stream Processing (activity icon)

Each pill: icon + title + description text

#### `components/dashboard/FlowDiagram.tsx`
**6 Process Cards Connected to Center:**

**Left Side:**
1. **Intent & Plan** (checklist icon, gold)
   - "Goal & Constraints, Approvals Needed, Dynamic Node Graph"
2. **Artifacts & Memory** (box icon, gold)
   - "Generated Code, Models, Context, Long-term Storage"
3. **Entities & Graph** (share-2 icon, gold)
   - "Semantic Connections, Relationships, Knowledge Base"

**Right Side:**
4. **Run Timeline** (clock icon, cyan)
   - "Step Execution, Diffs & Artifacts, Status Monitoring"
5. **Artifacts & Memory** (brain icon, cyan)
   - "Outputs, Reports, Logs, Version Control"
6. **Provenance** (link icon, gold)
   - "Traceability, Audit Trail, Source Tracking, Lineage"

**Connection Lines:**
- SVG paths connecting each card to center kernel
- Small circular nodes at connection points
- Animated stroke-dashoffset for "flow" effect

#### `components/3d/CentralKernel.tsx` - THE CENTERPIECE
**3D Elements:**
- Central glowing sphere (orange/gold gradient)
- 2 rotating cyan torus rings (different rotation speeds)
- Particle field (floating dots)
- Lens flare/glow effects
- Text overlay: "Dx3 KERNEL" / "AI CORE"

**Animation:**
- Sphere: subtle scale pulse (1.0 → 1.05 → 1.0)
- Ring 1: rotate 360deg clockwise over 20s
- Ring 2: rotate 360deg counter-clockwise over 15s
- Particles: gentle float/drift
- Overall glow: pulsing opacity

### 3. Action Bars

#### `components/dashboard/ActionBar.tsx`
**7 Glassmorphic Buttons:**
1. Ingest (download icon)
2. Plan (network icon)
3. Run (play icon)
4. Graph (share-2 icon)
5. Search (search icon)
6. Checks (check-circle icon)
7. Publish (upload-cloud icon)

#### `components/dashboard/IntegrationBar.tsx`
**4 Integration Badges:**
1. GitHub & CI (github icon, cyan)
2. Discord & Chats (message-circle icon, cyan)
3. Browser Tools (chrome icon, cyan)
4. API Integrations (settings icon, cyan)

#### `components/dashboard/WorkflowSteps.tsx`
**3 Progressive Steps:**
1. COMPOSE - Define & Plan (document icon, gold)
2. EXECUTE - Deploy & Run (settings icon, gold)
3. ASSURE - Verify & Audit (shield icon, gold)

---

## Reusable Components

### `components/ui/GlassCard.tsx`
Base glassmorphic card component used everywhere.

**Props:**
```typescript
interface GlassCardProps {
  icon?: React.ReactNode;
  title?: string;
  description?: string;
  accentColor?: 'cyan' | 'gold';
  children?: React.ReactNode;
  className?: string;
  onClick?: () => void;
}
```

**Base Styling:**
```css
.glass-card {
  background: rgba(15, 23, 42, 0.6);
  backdrop-filter: blur(12px) saturate(180%);
  border: 1px solid rgba(100, 255, 255, 0.2);
  border-radius: 12px;
  padding: 20px;
  box-shadow: 
    0 8px 32px rgba(0, 0, 0, 0.4),
    inset 0 1px 0 rgba(255, 255, 255, 0.1);
  transition: all 0.3s ease;
}

.glass-card:hover {
  border-color: rgba(100, 255, 255, 0.4);
  box-shadow: 
    0 8px 40px rgba(0, 255, 255, 0.3),
    inset 0 1px 0 rgba(255, 255, 255, 0.2);
  transform: translateY(-2px);
}

.glass-card-gold {
  border-color: rgba(255, 140, 0, 0.2);
}

.glass-card-gold:hover {
  border-color: rgba(255, 140, 0, 0.4);
  box-shadow: 0 8px 40px rgba(255, 140, 0, 0.3);
}
```

### `components/ui/NavButton.tsx`
Sidebar navigation button variant.

### `components/ui/ProductCard.tsx`
Top bar product card variant.

---

## Visual Effects Implementation

### 1. Glassmorphism Effect

**Tailwind Custom Utilities** (add to `tailwind.config.js`):
```javascript
module.exports = {
  theme: {
    extend: {
      backdropBlur: {
        'xs': '2px',
        'sm': '4px',
        'md': '8px',
        'lg': '12px',
        'xl': '16px',
        '2xl': '24px',
      },
    },
  },
  plugins: [
    function({ addUtilities }) {
      addUtilities({
        '.glass': {
          'background': 'rgba(15, 23, 42, 0.6)',
          'backdrop-filter': 'blur(12px) saturate(180%)',
          'border': '1px solid rgba(100, 255, 255, 0.2)',
        },
        '.glass-hover': {
          'border-color': 'rgba(100, 255, 255, 0.4)',
          'box-shadow': '0 8px 40px rgba(0, 255, 255, 0.3)',
        },
      });
    },
  ],
}
```

### 2. 3D Kernel Implementation

**File:** `components/3d/CentralKernel.tsx`

**Key Elements:**
```typescript
// Use @react-three/fiber and @react-three/drei

<Canvas camera={{ position: [0, 0, 5], fov: 75 }}>
  {/* Lighting */}
  <ambientLight intensity={0.3} />
  <pointLight position={[10, 10, 10]} intensity={1} color="#ff8c00" />
  <pointLight position={[-10, -10, -10]} intensity={0.5} color="#00ffff" />
  
  {/* Central Sphere */}
  <Sphere args={[1.2, 64, 64]}>
    <MeshDistortMaterial
      color="#ff8c00"
      emissive="#ff6b00"
      emissiveIntensity={0.6}
      metalness={0.9}
      roughness={0.1}
      distort={0.1}
      speed={2}
    />
  </Sphere>
  
  {/* Rotating Ring 1 (Outer, Clockwise) */}
  <Torus args={[2, 0.05, 16, 100]} rotation={[Math.PI/2, 0, 0]}>
    <meshStandardMaterial 
      color="#00ffff" 
      emissive="#00ffff"
      emissiveIntensity={0.8}
    />
  </Torus>
  
  {/* Rotating Ring 2 (Inner, Counter-clockwise) */}
  <Torus args={[1.6, 0.04, 16, 100]} rotation={[Math.PI/3, 0, 0]}>
    <meshStandardMaterial 
      color="#00ffff" 
      emissive="#00ffff"
      emissiveIntensity={0.6}
    />
  </Torus>
  
  {/* Particle Field */}
  <Stars radius={100} depth={50} count={5000} factor={4} saturation={0} />
  
  {/* Text Overlay */}
  <Text
    position={[0, 0, 0]}
    fontSize={0.2}
    color="#ffffff"
    anchorX="center"
    anchorY="middle"
  >
    Dx3 KERNEL
    {'\n'}
    AI CORE
  </Text>
  
  {/* Bloom Effect */}
  <EffectComposer>
    <Bloom luminanceThreshold={0.2} luminanceSmoothing={0.9} height={300} />
  </EffectComposer>
</Canvas>
```

**Animation (use useFrame from @react-three/fiber):**
```typescript
useFrame((state) => {
  // Rotate rings
  ring1Ref.current.rotation.z += 0.003; // clockwise
  ring2Ref.current.rotation.z -= 0.004; // counter-clockwise
  
  // Pulse sphere
  const scale = 1 + Math.sin(state.clock.elapsedTime * 2) * 0.05;
  sphereRef.current.scale.set(scale, scale, scale);
});
```

### 3. Connection Lines (SVG)

**File:** `components/dashboard/ConnectionLines.tsx`

```tsx
// Calculate positions of cards and center
// Draw SVG paths with animated strokes

<svg className="absolute inset-0 pointer-events-none">
  <defs>
    <linearGradient id="lineGradient">
      <stop offset="0%" stopColor="#00ffff" stopOpacity="0" />
      <stop offset="50%" stopColor="#00ffff" stopOpacity="1" />
      <stop offset="100%" stopColor="#00ffff" stopOpacity="0" />
    </linearGradient>
  </defs>
  
  {connections.map((conn, i) => (
    <g key={i}>
      <path
        d={`M ${conn.start.x} ${conn.start.y} L ${conn.end.x} ${conn.end.y}`}
        stroke="url(#lineGradient)"
        strokeWidth="2"
        fill="none"
        strokeDasharray="5 5"
        className="animate-dash"
      />
      <circle cx={conn.end.x} cy={conn.end.y} r="4" fill="#00ffff" />
    </g>
  ))}
</svg>
```

**Animation CSS:**
```css
@keyframes dash {
  to {
    stroke-dashoffset: -10;
  }
}

.animate-dash {
  animation: dash 1s linear infinite;
}
```

### 4. Background Effects

**File:** `components/ui/AnimatedBackground.tsx`

```typescript
// Canvas-based particle field OR CSS gradient overlay

// Option A: CSS Gradients (simpler)
<div className="fixed inset-0 -z-10">
  <div className="absolute inset-0 bg-gradient-radial from-cyan-900/20 via-transparent to-transparent" />
  <div className="absolute inset-0 bg-gradient-radial from-orange-900/10 via-transparent to-transparent" />
  
  {/* Corner light rays */}
  <div className="absolute top-0 left-0 w-1/3 h-1/3 bg-gradient-to-br from-cyan-500/10 to-transparent blur-3xl" />
  <div className="absolute bottom-0 right-0 w-1/3 h-1/3 bg-gradient-to-tl from-orange-500/10 to-transparent blur-3xl" />
</div>

// Option B: Canvas Particles (richer)
// Use canvas to draw animated star field similar to reference image
```

### 5. Gradient Text

```css
.gradient-text {
  background: linear-gradient(90deg, #ffffff 0%, #00ffff 100%);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
}
```

---

## Animation Specifications

### Timing Functions
- **Card Hover**: `transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1)`
- **3D Rotation**: `linear` for continuous rotation
- **Pulse**: `ease-in-out` for organic feel
- **Line Animation**: `linear` for consistent flow

### Key Animations

```css
/* Glow Pulse */
@keyframes glow-pulse {
  0%, 100% { box-shadow: 0 0 20px rgba(0, 255, 255, 0.3); }
  50% { box-shadow: 0 0 40px rgba(0, 255, 255, 0.6); }
}

/* Float */
@keyframes float {
  0%, 100% { transform: translateY(0px); }
  50% { transform: translateY(-10px); }
}

/* Shimmer */
@keyframes shimmer {
  0% { background-position: -200% center; }
  100% { background-position: 200% center; }
}
```

---

## State Management (Zustand)

```typescript
// stores/dashboardStore.ts

interface DashboardState {
  activeProduct: 'forge' | 'oraculus' | 'gopmo' | 'secondbrain';
  activeNav: string;
  isKernelActive: boolean;
  flowData: FlowNode[];
  setActiveProduct: (product: string) => void;
  setActiveNav: (nav: string) => void;
  toggleKernel: () => void;
}

export const useDashboardStore = create<DashboardState>((set) => ({
  activeProduct: 'forge',
  activeNav: 'projects',
  isKernelActive: true,
  flowData: [],
  setActiveProduct: (product) => set({ activeProduct: product }),
  setActiveNav: (nav) => set({ activeNav: nav }),
  toggleKernel: () => set((state) => ({ isKernelActive: !state.isKernelActive })),
}));
```

---

## Project Structure

```
dx3-command-center/
├── app/
│   ├── layout.tsx
│   ├── page.tsx (main dashboard)
│   ├── globals.css
│   └── providers.tsx
├── components/
│   ├── 3d/
│   │   ├── CentralKernel.tsx
│   │   ├── ParticleField.tsx
│   │   └── RotatingRing.tsx
│   ├── dashboard/
│   │   ├── RuntimeOrchestrator.tsx
│   │   ├── FlowDiagram.tsx
│   │   ├── ConnectionLines.tsx
│   │   ├── ActionBar.tsx
│   │   ├── IntegrationBar.tsx
│   │   └── WorkflowSteps.tsx
│   ├── layout/
│   │   ├── LeftSidebar.tsx
│   │   ├── TopProductBar.tsx
│   │   └── MainContent.tsx
│   └── ui/
│       ├── GlassCard.tsx
│       ├── NavButton.tsx
│       ├── ProductCard.tsx
│       ├── AnimatedBackground.tsx
│       └── GradientText.tsx
├── lib/
│   ├── hooks/
│   │   ├── useParticles.ts
│   │   └── useConnectionPaths.ts
│   ├── utils/
│   │   └── positions.ts
│   └── stores/
│       └── dashboardStore.ts
├── public/
│   └── icons/
├── tailwind.config.js
├── tsconfig.json
└── package.json
```

---

## Build Steps

### Phase 1: Foundation (30 min)
1. Initialize Next.js 15 project with TypeScript
2. Install all dependencies
3. Configure Tailwind with custom utilities
4. Create base layout structure
5. Build GlassCard component
6. Add AnimatedBackground

### Phase 2: Layout & Navigation (30 min)
7. Build LeftSidebar with 8 nav items
8. Build TopProductBar with 4 product cards
9. Create MainContent container
10. Add all icons from lucide-react
11. Implement glassmorphic styling

### Phase 3: Main Dashboard (45 min)
12. Build RuntimeOrchestrator header with 4 feature pills
13. Create FlowDiagram with 6 process cards
14. Position cards in proper layout
15. Add ActionBar with 7 buttons
16. Add IntegrationBar
17. Add WorkflowSteps footer

### Phase 4: 3D Kernel (45 min)
18. Set up React Three Fiber Canvas
19. Create central glowing sphere
20. Add 2 rotating torus rings
21. Implement particle field
22. Add text overlay
23. Configure lighting and materials
24. Add bloom/glow effects

### Phase 5: Connections & Animation (30 min)
25. Calculate card positions
26. Draw SVG connection lines
27. Add animated dots at connection points
28. Implement line flow animation
29. Add hover effects to all cards
30. Fine-tune all animations

### Phase 6: Polish (30 min)
31. Add responsive breakpoints
32. Perfect glass effects
33. Optimize 3D performance
34. Add loading states
35. Test all interactions
36. Final visual refinement

---

## Performance Considerations

1. **3D Rendering**: Use `<Canvas dpr={[1, 2]}>` to limit pixel ratio
2. **Lazy Load**: Use dynamic imports for 3D components
3. **Memoization**: Wrap expensive components with `React.memo`
4. **Throttle**: Throttle scroll/mouse events for particle effects
5. **GPU Acceleration**: Use `transform` and `opacity` for animations

---

## Responsive Behavior

**Desktop (1920px+)**: Full layout as shown
**Laptop (1440px)**: Slightly tighter spacing
**Tablet (1024px)**: Sidebar collapses to icons only
**Mobile (768px)**: Stack layout, hide 3D kernel, show simplified view

---

## Success Criteria

✅ Glass effect looks professional (blur + transparency + borders)
✅ 3D kernel rotates smoothly with glow
✅ All 6 process cards properly positioned
✅ Connection lines animate with flowing dots
✅ Action buttons have hover states
✅ Layout matches reference image proportions
✅ Performance: 60fps on modern hardware
✅ No layout shift or jank
✅ Responsive across breakpoints

---

## Notes for Claude Code

- Refer to the uploaded image frequently
- Build progressively: layout → styling → 3D → animations
- Test 3D performance early and optimize if needed
- Use TypeScript strictly for all components
- Keep components modular and reusable
- Don't over-complicate - match the visual, not more

---

END OF SPECIFICATION
