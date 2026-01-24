# RuntimeValidationDashboard Extraction Plan

**Date**: 2026-01-23
**Component**: RuntimeValidationDashboard from 3db Platform
**Target**: @nxtg-forge/ui package
**Status**: 🟢 Ready for Extraction

---

## Component Overview

### What We're Extracting
- **Source**: 3db platform's production RuntimeValidationDashboard
- **Size**: 700+ lines of production-tested React/TypeScript
- **Features**: Real-time error monitoring, pattern detection, WebSocket streaming
- **Design**: Neon/cyberpunk aesthetic (needs theming layer)

### Why This Component First
1. **Production-proven**: Already validated by real users
2. **Self-contained**: Minimal external dependencies
3. **High value**: Catches 15-30% more bugs than unit tests
4. **Reusable**: Every Forge project needs runtime validation

---

## Extraction Steps

### Step 1: Component Isolation (2 hours)

```bash
# Create component structure
mkdir -p packages/ui/src/monitoring/RuntimeValidation
cd packages/ui/src/monitoring/RuntimeValidation

# Files to create
touch index.ts
touch RuntimeValidationDashboard.tsx
touch ErrorCard.tsx
touch MetricsGrid.tsx
touch ErrorStream.tsx
touch PatternView.tsx
touch TimelineView.tsx
touch HealthBadge.tsx
touch NeuralBackground.tsx
touch types.ts
touch hooks.ts
touch utils.ts
```

**Key Tasks**:
1. Copy core component code from 3db
2. Remove 3db-specific imports
3. Extract sub-components
4. Isolate TypeScript types

### Step 2: Dependency Abstraction (2 hours)

**Current Dependencies** (to abstract):
```typescript
// Before (3db-specific)
import { useWebSocket } from '@3db/websocket';
import { ValidationError } from '@3db/types';
import { API_ENDPOINTS } from '@3db/config';

// After (generic)
import { useWebSocket } from './hooks';
import { ValidationError } from './types';
import { useConfig } from './context';
```

**Configuration Interface**:
```typescript
interface RuntimeValidationConfig {
  // Connection
  wsUrl?: string;              // WebSocket URL
  apiUrl?: string;             // REST API fallback
  polling?: boolean;           // Use polling if no WebSocket
  pollingInterval?: number;    // Default: 5000ms

  // Display
  maxErrors?: number;          // Max errors to display (default: 100)
  groupSimilar?: boolean;      // Group similar errors (default: true)
  autoScroll?: boolean;        // Auto-scroll on new errors (default: true)

  // Theme
  theme?: 'neon' | 'minimal' | 'corporate';
  customTheme?: ThemeConfig;

  // Features
  enablePatternDetection?: boolean;
  enableQuickActions?: boolean;
  enableExport?: boolean;

  // Callbacks
  onError?: (error: ValidationError) => void;
  onPattern?: (pattern: ErrorPattern) => void;
  onAction?: (action: string, error: ValidationError) => void;
}
```

### Step 3: Theme System Implementation (3 hours)

**Theme Architecture**:
```typescript
// Base theme interface
interface Theme {
  name: string;
  colors: {
    primary: string;
    surface: string;
    error: string;
    warning: string;
    success: string;
    info: string;
  };
  shadows: {
    sm: string;
    md: string;
    lg: string;
    glow?: string;  // For neon theme
  };
  animations: {
    pulse: string;
    shimmer: string;
    fadeIn: string;
  };
}

// Theme variants using CVA
const dashboardVariants = cva(
  "rounded-lg border p-6 transition-all duration-200",
  {
    variants: {
      theme: {
        neon: `
          bg-surface-900/95 border-surface-700/50
          backdrop-blur-md shadow-2xl
        `,
        minimal: `
          bg-white border-gray-200
          shadow-sm hover:shadow-md
        `,
        corporate: `
          bg-gray-50 border-gray-300
          shadow-md
        `
      }
    }
  }
);

// Error card variants
const errorCardVariants = cva(
  "rounded-md border p-3 mb-2 transition-all duration-200",
  {
    variants: {
      theme: {
        neon: "bg-surface-800/50 border-surface-700/50 hover:border-error-500/50",
        minimal: "bg-white border-gray-200 hover:border-red-400",
        corporate: "bg-gray-50 border-gray-200 hover:bg-gray-100"
      },
      severity: {
        error: "",
        warning: "",
        info: ""
      }
    },
    compoundVariants: [
      {
        theme: "neon",
        severity: "error",
        class: "border-red-500/50 shadow-red-500/20 shadow-lg"
      },
      {
        theme: "neon",
        severity: "warning",
        class: "border-amber-500/50 shadow-amber-500/20"
      },
      // ... more compound variants
    ]
  }
);
```

### Step 4: Adapter System (2 hours)

**Create adapters for different validation libraries**:

```typescript
// Base adapter interface
interface ValidationAdapter {
  name: string;
  parseError(error: any): ValidationError;
  formatError(error: ValidationError): string;
  getSeverity(error: any): 'error' | 'warning' | 'info';
  getFieldPath(error: any): string[];
}

// Pydantic adapter (Python)
class PydanticAdapter implements ValidationAdapter {
  name = 'pydantic';

  parseError(error: any): ValidationError {
    return {
      id: generateId(),
      timestamp: new Date().toISOString(),
      type: 'validation_error',
      field: error.loc?.join('.') || 'unknown',
      message: error.msg,
      value: error.input,
      severity: this.getSeverity(error),
      context: {
        model: error.model,
        validator: error.type
      }
    };
  }

  getSeverity(error: any): 'error' | 'warning' | 'info' {
    // Logic to determine severity from Pydantic error
    if (error.type === 'value_error') return 'error';
    if (error.type === 'type_error') return 'error';
    return 'warning';
  }
}

// Zod adapter (TypeScript)
class ZodAdapter implements ValidationAdapter {
  name = 'zod';

  parseError(error: any): ValidationError {
    return {
      id: generateId(),
      timestamp: new Date().toISOString(),
      type: 'validation_error',
      field: error.path.join('.'),
      message: error.message,
      value: error.received,
      severity: 'error',
      context: {
        expected: error.expected,
        received: error.received
      }
    };
  }
}

// Generic JSON Schema adapter
class JSONSchemaAdapter implements ValidationAdapter {
  name = 'jsonschema';

  parseError(error: any): ValidationError {
    // Parse JSON Schema validation errors
  }
}
```

### Step 5: WebSocket Abstraction (2 hours)

```typescript
// Generic WebSocket hook
export function useValidationWebSocket(config: RuntimeValidationConfig) {
  const [errors, setErrors] = useState<ValidationError[]>([]);
  const [connected, setConnected] = useState(false);
  const [stats, setStats] = useState<ValidationStats>({
    total: 0,
    errorRate: 0,
    health: 100
  });

  useEffect(() => {
    if (!config.wsUrl) {
      // Fall back to polling
      if (config.polling && config.apiUrl) {
        const interval = setInterval(() => {
          fetch(config.apiUrl)
            .then(res => res.json())
            .then(data => {
              setErrors(data.errors);
              setStats(data.stats);
            });
        }, config.pollingInterval || 5000);

        return () => clearInterval(interval);
      }
      return;
    }

    // WebSocket connection
    const ws = new WebSocket(config.wsUrl);

    ws.onopen = () => setConnected(true);
    ws.onclose = () => setConnected(false);
    ws.onerror = (error) => console.error('WebSocket error:', error);

    ws.onmessage = (event) => {
      const data = JSON.parse(event.data);

      switch (data.type) {
        case 'error':
          setErrors(prev => [data.error, ...prev].slice(0, config.maxErrors || 100));
          config.onError?.(data.error);
          break;

        case 'stats':
          setStats(data.stats);
          break;

        case 'pattern':
          config.onPattern?.(data.pattern);
          break;
      }
    };

    return () => ws.close();
  }, [config]);

  return { errors, connected, stats };
}
```

### Step 6: Package Structure (1 hour)

```typescript
// packages/ui/package.json
{
  "name": "@nxtg-forge/ui",
  "version": "0.1.0",
  "main": "dist/index.js",
  "types": "dist/index.d.ts",
  "exports": {
    ".": {
      "import": "./dist/index.esm.js",
      "require": "./dist/index.js"
    },
    "./monitoring": {
      "import": "./dist/monitoring/index.esm.js",
      "require": "./dist/monitoring/index.js"
    },
    "./themes/*": "./dist/themes/*"
  },
  "peerDependencies": {
    "react": ">=17.0.0",
    "react-dom": ">=17.0.0"
  },
  "dependencies": {
    "class-variance-authority": "^0.7.0",
    "clsx": "^2.0.0",
    "tailwind-merge": "^2.0.0"
  },
  "devDependencies": {
    "@types/react": "^18.2.0",
    "typescript": "^5.0.0",
    "vite": "^5.0.0",
    "@vitejs/plugin-react": "^4.0.0"
  }
}
```

```typescript
// packages/ui/src/index.ts
// Main exports
export * from './monitoring';
export * from './core';
export * from './state';
export * from './themes';

// packages/ui/src/monitoring/index.ts
export { RuntimeValidationDashboard } from './RuntimeValidation';
export type { RuntimeValidationConfig, ValidationError } from './RuntimeValidation/types';
```

### Step 7: Integration Examples (1 hour)

**Standalone Usage**:
```typescript
import { RuntimeValidationDashboard } from '@nxtg-forge/ui/monitoring';

function App() {
  return (
    <RuntimeValidationDashboard
      config={{
        wsUrl: 'ws://localhost:8000/validation',
        theme: 'neon',
        maxErrors: 50,
        onError: (error) => console.log('Error:', error)
      }}
    />
  );
}
```

**With Forge Project**:
```typescript
// In .claude/hooks/session-start.js
import { RuntimeValidationDashboard } from '@nxtg-forge/ui/monitoring';

export function onSessionStart() {
  // Auto-inject validation dashboard
  if (process.env.FORGE_VALIDATION === 'true') {
    return {
      component: RuntimeValidationDashboard,
      config: {
        wsUrl: process.env.VALIDATION_WS_URL,
        theme: 'minimal'
      }
    };
  }
}
```

**In CI/CD Pipeline**:
```yaml
# .github/workflows/test.yml
- name: Start Validation Monitor
  run: |
    npx @nxtg-forge/ui serve-validation \
      --port 3000 \
      --theme corporate \
      --api-url http://localhost:8000/api/validation
```

---

## Testing Plan

### Unit Tests
```typescript
describe('RuntimeValidationDashboard', () => {
  it('should render without errors', () => {
    render(<RuntimeValidationDashboard config={{}} />);
  });

  it('should connect to WebSocket when URL provided', () => {
    const mockWs = new MockWebSocket();
    render(<RuntimeValidationDashboard config={{ wsUrl: 'ws://test' }} />);
    expect(mockWs.connect).toHaveBeenCalled();
  });

  it('should group similar errors when enabled', () => {
    // Test error grouping logic
  });

  it('should apply theme correctly', () => {
    const { container } = render(
      <RuntimeValidationDashboard config={{ theme: 'neon' }} />
    );
    expect(container.firstChild).toHaveClass('bg-surface-900/95');
  });
});
```

### Integration Tests
- Test with real WebSocket server
- Test with different validation libraries
- Test theme switching
- Test export functionality

### Visual Tests
- Storybook stories for all themes
- Chromatic visual regression tests
- Accessibility audit with axe-core

---

## Migration Guide (for 3db users)

### Before (3db-specific)
```typescript
import { RuntimeValidationDashboard } from '@3db/components';

<RuntimeValidationDashboard
  apiClient={api}
  userId={currentUser.id}
/>
```

### After (generic @nxtg-forge/ui)
```typescript
import { RuntimeValidationDashboard } from '@nxtg-forge/ui/monitoring';

<RuntimeValidationDashboard
  config={{
    wsUrl: `${API_BASE}/validation/ws`,
    theme: 'neon',
    onError: (error) => trackError(error)
  }}
/>
```

---

## Documentation Structure

```
docs/
├── getting-started.md
├── configuration.md
├── themes.md
├── adapters.md
├── api-reference.md
├── examples/
│   ├── standalone.md
│   ├── with-nextjs.md
│   ├── with-remix.md
│   └── with-vite.md
└── migration/
    └── from-3db.md
```

---

## Success Metrics

### Technical Metrics
- [ ] Zero 3db dependencies
- [ ] <5KB gzipped core (without themes)
- [ ] 100% TypeScript coverage
- [ ] Works with React 17+
- [ ] SSR compatible

### User Metrics
- [ ] Setup time <5 minutes
- [ ] Works out of box with default config
- [ ] Clear error messages
- [ ] Smooth 60fps animations

### Quality Metrics
- [ ] 90%+ test coverage
- [ ] 0 accessibility violations
- [ ] Lighthouse performance >95
- [ ] Bundle size <50KB total

---

## Timeline

### Day 1 (Today)
- Morning: Component isolation (2 hours)
- Afternoon: Dependency abstraction (2 hours)
- Evening: Theme system (3 hours)

### Day 2
- Morning: Adapter system (2 hours)
- Afternoon: WebSocket abstraction (2 hours)
- Evening: Package structure (1 hour)

### Day 3
- Morning: Integration examples (1 hour)
- Afternoon: Testing (3 hours)
- Evening: Documentation (2 hours)

### Day 4
- Morning: Final polish
- Afternoon: npm publish
- Evening: Announce to team

---

## Risks & Mitigations

### Risk: Hidden 3db Dependencies
**Mitigation**: Thorough grep for imports, test in clean environment

### Risk: Performance Issues
**Mitigation**: Virtual scrolling for error list, memoization, profiling

### Risk: Theme System Complexity
**Mitigation**: Start with 3 themes, expand based on feedback

### Risk: WebSocket Compatibility
**Mitigation**: Polling fallback, clear connection status

---

## Next Steps

1. **Get 3db source code access** (if needed)
2. **Set up packages/ui directory**
3. **Begin component isolation**
4. **Create proof-of-concept**
5. **Review with team**

---

**Extraction Status**: 🟢 Ready to Begin
**Estimated Time**: 4 days total
**First Deliverable**: Working POC by end of Day 2