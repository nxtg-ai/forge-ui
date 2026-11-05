# AppHeader Architecture Diagram

## Component Tree

```
AppHeader (703 lines)
│
├─ Skip to Content Link (<a>)
│  └─ "Skip to main content" (screen reader accessible)
│
├─ Header Element (<header role="banner">)
│  │
│  ├─ Left Side Container
│  │  │
│  │  ├─ Mobile Hamburger Button (md:hidden)
│  │  │  └─ <Menu /> icon
│  │  │
│  │  ├─ NXTG-Forge Branding (<h1>)
│  │  │  └─ Gradient text: blue-400 → purple-500
│  │  │
│  │  ├─ ProjectSwitcher (hidden md:block)
│  │  │  ├─ Dropdown trigger
│  │  │  ├─ Project list
│  │  │  └─ Actions (New, Manage)
│  │  │
│  │  ├─ Page Title (optional, hidden lg:flex)
│  │  │  ├─ Icon (optional)
│  │  │  ├─ Title (<h2>)
│  │  │  └─ Badge (optional)
│  │  │
│  │  └─ Navigation Tabs (hidden md:flex)
│  │     ├─ Dashboard
│  │     ├─ Vision
│  │     ├─ Terminal
│  │     ├─ Command
│  │     ├─ Architect
│  │     ├─ Demo
│  │     └─ YOLO
│  │
│  └─ Right Side Container
│     │
│     ├─ Actions Slot (hidden md:flex)
│     │  └─ <YourCustomButtons />
│     │
│     ├─ EngagementModeSelector (hidden md:block)
│     │  ├─ Trigger button
│     │  └─ Dropdown (AnimatePresence)
│     │     ├─ CEO
│     │     ├─ VP
│     │     ├─ Engineer
│     │     ├─ Builder
│     │     └─ Founder
│     │
│     ├─ PanelToggles (hidden md:flex)
│     │  ├─ Context Panel Toggle
│     │  └─ Governance Panel Toggle
│     │
│     └─ ConnectionStatus (hidden lg:block)
│        ├─ Status dot (green/red pulse)
│        ├─ Text (Connected/Disconnected)
│        └─ Mode badge (CEO/VP/etc.)
│
└─ MobileDrawer (AnimatePresence, md:hidden)
   │
   ├─ Backdrop (fixed inset-0, black/60)
   │  └─ Click to close
   │
   └─ Drawer Panel (fixed left, w-80)
      │
      ├─ Header
      │  ├─ NXTG-Forge branding
      │  └─ Close button (<X />)
      │
      ├─ ProjectSwitcher Section
      │  └─ Full project dropdown
      │
      ├─ EngagementModeSelector Section
      │  └─ Mode dropdown
      │
      ├─ Navigation Links (<nav>)
      │  ├─ Dashboard
      │  ├─ Vision
      │  ├─ Terminal
      │  ├─ Command
      │  ├─ Architect
      │  ├─ Demo
      │  └─ YOLO
      │
      └─ Footer
         └─ Keyboard shortcuts hint (Cmd+K)
```

## State Management

```
AppHeader State
│
├─ Local State
│  └─ mobileMenuOpen: boolean
│
├─ EngagementModeSelector State
│  ├─ showModeSelector: boolean
│  ├─ selectedModeIndex: number
│  └─ refs: modeSelectorButtonRef, modeDropdownRef
│
├─ ConnectionStatus State
│  └─ (reads from EngagementContext)
│
└─ MobileDrawer State
   └─ (controlled by mobileMenuOpen)
```

## Props Flow

```
App.tsx
  │
  ├─ currentView ────────────────┐
  ├─ onNavigate ─────────────────┤
  ├─ currentRunspace ────────────┤
  ├─ runspaces ──────────────────┤
  ├─ onRunspaceSwitch ───────────┤
  ├─ onNewProject ───────────────┤
  ├─ onManageProjects ───────────┤
  ├─ isConnected ────────────────┤
  ├─ showEngagementSelector ─────┤
  ├─ showPanelToggles ───────────┤
  ├─ onToggleContextPanel ───────┤
  ├─ onToggleGovernancePanel ────┤
  ├─ contextPanelVisible ────────┤
  └─ governancePanelVisible ─────┤
                                 │
                                 ↓
                            AppHeader
                                 │
                    ┌────────────┼────────────┐
                    ↓            ↓            ↓
            ProjectSwitcher  Navigation  ConnectionStatus
                    │            │            │
                    │            │            └─→ EngagementContext
                    │            │
                    │            └─→ NAVIGATION_ROUTES
                    │
                    └─→ Runspace[]
```

## Responsive Breakpoints

```
┌─────────────────────────────────────────────────────────────────┐
│ Mobile (<768px)                                                 │
│                                                                 │
│ ┌────────────────────────────────────────────────────────────┐ │
│ │ [☰] NXTG-Forge                              [●] Connected  │ │
│ └────────────────────────────────────────────────────────────┘ │
│                                                                 │
│ Drawer (slide-out):                                             │
│ ┌─────────────────────┐                                         │
│ │ NXTG-Forge      [×] │                                         │
│ │ ─────────────────── │                                         │
│ │ 🚀 Project          │                                         │
│ │ ─────────────────── │                                         │
│ │ [Engineer ▼]        │                                         │
│ │ ─────────────────── │                                         │
│ │ Dashboard           │                                         │
│ │ Vision              │                                         │
│ │ Terminal            │                                         │
│ │ Command             │                                         │
│ │ Architect           │                                         │
│ │ Demo                │                                         │
│ │ YOLO                │                                         │
│ │ ─────────────────── │                                         │
│ │ ⌘+K shortcuts       │                                         │
│ └─────────────────────┘                                         │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│ Tablet (768px-1023px)                                           │
│                                                                 │
│ ┌────────────────────────────────────────────────────────────┐ │
│ │ NXTG [Proj ▼] [Dashboard][Vision][Terminal]  [Eng ▼][●]   │ │
│ └────────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│ Desktop (≥1024px)                                               │
│                                                                 │
│ ┌────────────────────────────────────────────────────────────┐ │
│ │ NXTG-Forge  [Project ▼]  Page Title  [Nav Tabs...]          │ │
│ │                                                              │ │
│ │ [Dashboard][Vision][Terminal][Command][Architect][Demo][YOLO]│ │
│ │                                                              │ │
│ │          [Actions] [Engineer ▼] [🔲][🔲] [●] Connected     │ │
│ └────────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────────┘
```

## Event Flow

### Navigation Click
```
User clicks "Dashboard"
  ↓
onNavigate("dashboard")
  ↓
App.tsx updates currentView
  ↓
AppHeader highlights active route
  ↓
App.tsx renders Dashboard component
```

### Engagement Mode Change
```
User clicks "Engineer" mode
  ↓
EngagementModeSelector.handleModeChange()
  ↓
useEngagement().setMode("engineer")
  ↓
EngagementContext updates localStorage
  ↓
EngagementContext sends WebSocket message
  ↓
ConnectionStatus re-renders with new mode
```

### Mobile Navigation
```
User clicks hamburger menu
  ↓
setMobileMenuOpen(true)
  ↓
MobileDrawer animates in (Framer Motion)
  ↓
Body scroll locked
  ↓
User clicks "Dashboard"
  ↓
onNavigate("dashboard")
  ↓
setMobileMenuOpen(false)
  ↓
MobileDrawer animates out
  ↓
Body scroll unlocked
```

### Panel Toggle
```
User clicks context panel toggle
  ↓
onToggleContextPanel()
  ↓
App.tsx/Page updates contextPanelVisible
  ↓
AppHeader updates toggle button state
  ↓
Layout shows/hides context panel
```

## Accessibility Tree

```
Skip to content (a)
  ↓
Header (header role="banner")
  ↓
Navigation (nav role="navigation" aria-label="Main navigation")
  ↓
├─ Dashboard (button aria-current="page")
├─ Vision (button)
├─ Terminal (button)
├─ Command (button)
├─ Architect (button)
├─ Demo (button)
└─ YOLO (button)
  ↓
Engagement Mode (button aria-haspopup="listbox" aria-expanded="false")
  ↓
Listbox (div role="listbox" aria-label="Engagement mode options")
  ↓
├─ CEO (button role="option" aria-selected="false")
├─ VP (button role="option" aria-selected="false")
├─ Engineer (button role="option" aria-selected="true")
├─ Builder (button role="option" aria-selected="false")
└─ Founder (button role="option" aria-selected="false")
  ↓
Panel Toggles
  ↓
├─ Context Panel (button aria-pressed="false")
└─ Governance Panel (button aria-pressed="true")
```

## Animation Timeline (Mobile Drawer)

```
Time: 0ms                              300ms
      │                                  │
Open: [Hidden] ──────── [Animating] ──→ [Visible]
      Backdrop:  opacity 0 → 1
      Drawer:    x: -100% → 0
      Body:      overflow: auto → hidden

Time: 0ms                              300ms
      │                                  │
Close:[Visible] ──────── [Animating] ──→ [Hidden]
      Drawer:    x: 0 → -100%
      Backdrop:  opacity 1 → 0
      Body:      overflow: hidden → auto
```

## Z-Index Hierarchy

```
                                    ↑ Higher
                           ┌──────────────────┐
                           │ Skip Link (200)  │
                           └──────────────────┘
                           ┌──────────────────┐
                           │ Drawer (100)     │
                           │ Dropdown (100)   │
                           └──────────────────┘
                           ┌──────────────────┐
                           │ Backdrop (90)    │
                           └──────────────────┘
                           ┌──────────────────┐
                           │ Header (40)      │
                           └──────────────────┘
                                    ↓ Lower
```

## CSS Classes Breakdown

### Header
- `border-b border-gray-800` - Bottom border
- `bg-gray-900/50` - Semi-transparent background
- `backdrop-blur-sm` - Blur effect
- `sticky top-0 z-40` - Sticky positioning

### Branding
- `bg-gradient-to-r from-blue-400 to-purple-500` - Gradient text
- `bg-clip-text text-transparent` - Clip gradient to text

### Navigation Tabs
- Active: `bg-gray-800 text-white`
- Inactive: `text-gray-400 hover:text-white hover:bg-gray-800/50`

### Mobile Drawer
- `fixed top-0 left-0 bottom-0 w-80` - Full-height sidebar
- `bg-gray-900 border-r border-gray-800` - Background and border
- `overflow-y-auto` - Scrollable content

### Engagement Mode Dropdown
- Open: `bg-purple-500/20 border-purple-500/50 text-purple-400`
- Closed: `bg-gray-800/50 border-gray-700 text-gray-300`
- Selected: `bg-purple-500/20 border border-purple-500/30`

---

**Visual Complexity:** Medium-High
**Component Count:** 4 main sub-components
**Props Complexity:** High (20+ optional props)
**State Complexity:** Low (1 state variable in main component)
**Accessibility Score:** 10/10 (full ARIA support)
