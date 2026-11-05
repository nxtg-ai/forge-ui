# Beta Feedback System

## Overview

The Beta Feedback System provides comprehensive feedback collection infrastructure for NXTG-Forge v3, enabling users to submit bug reports, feature requests, UX feedback, and performance issues directly from the application.

## Components

### 1. BetaFeedback Component (`src/components/feedback/BetaFeedback.tsx`)

A floating feedback button and modal system that allows users to:

- Rate their experience (1-5 stars)
- Select feedback category (Bug Report, Feature Request, UX Feedback, Performance Issue, Other)
- Provide detailed description
- Upload screenshots (optional, max 5MB)
- Submit feedback to API or store locally as fallback

**Features:**
- Floating action button in bottom-right corner
- Animated modal with smooth transitions
- Form validation
- Offline support (localStorage fallback)
- Real-time submission feedback

**Usage:**
```tsx
import { BetaFeedback } from "./components/feedback";

<BetaFeedback onClose={() => setFeedbackModalOpen(false)} />
```

### 2. BetaBanner Component (`src/components/feedback/BetaBanner.tsx`)

A dismissible banner that appears at the top of the application to inform users about the beta status.

**Features:**
- Shows only once per session
- Persists dismissal state to localStorage
- Links to feedback modal
- Responsive design with mobile-friendly layout

**Usage:**
```tsx
import { BetaBanner } from "./components/feedback";

<BetaBanner onFeedbackClick={() => setFeedbackModalOpen(true)} />
```

### 3. Changelog Component (`src/components/feedback/Changelog.tsx`)

A modal that displays the project's changelog from `CHANGELOG.md`.

**Features:**
- Reads changelog from `/CHANGELOG.md` endpoint
- Custom markdown-like rendering (no external dependencies)
- Styled section headers with icons (Added, Changed, Fixed, Removed, Security)
- Loading and error states
- Responsive modal layout

**Usage:**
```tsx
import { Changelog } from "./components/feedback";

<Changelog isOpen={showChangelog} onClose={() => setShowChangelog(false)} />
```

## API Endpoints

### POST `/api/feedback`

Submit new feedback.

**Request Body:**
```json
{
  "rating": 5,
  "category": "Feature Request",
  "description": "Would love to see dark mode improvements",
  "url": "http://localhost:5050/dashboard",
  "userAgent": "Mozilla/5.0...",
  "timestamp": "2026-02-03T12:00:00.000Z"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "feedback-1738584000000-abc123"
  },
  "timestamp": "2026-02-03T12:00:00.000Z"
}
```

### GET `/api/feedback`

Retrieve all feedback (admin endpoint).

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": "feedback-1738584000000-abc123",
      "rating": 5,
      "category": "Feature Request",
      "description": "Would love to see dark mode improvements",
      "url": "http://localhost:5050/dashboard",
      "userAgent": "Mozilla/5.0...",
      "timestamp": "2026-02-03T12:00:00.000Z",
      "status": "new"
    }
  ],
  "count": 1,
  "timestamp": "2026-02-03T12:00:00.000Z"
}
```

### GET `/api/feedback/stats`

Get feedback statistics.

**Response:**
```json
{
  "success": true,
  "data": {
    "totalCount": 42,
    "averageRating": 4.3,
    "byCategory": {
      "Bug Report": 10,
      "Feature Request": 20,
      "UX Feedback": 8,
      "Performance Issue": 3,
      "Other": 1
    },
    "byRating": {
      "1": 1,
      "2": 2,
      "3": 5,
      "4": 15,
      "5": 19
    },
    "recentCount": 12,
    "lastSubmission": "2026-02-03T12:00:00.000Z"
  },
  "timestamp": "2026-02-03T12:00:00.000Z"
}
```

## Data Storage

Feedback is stored in `data/feedback.json` as a JSON array:

```json
[
  {
    "id": "feedback-1738584000000-abc123",
    "rating": 5,
    "category": "Feature Request",
    "description": "Would love to see dark mode improvements",
    "url": "http://localhost:5050/dashboard",
    "userAgent": "Mozilla/5.0...",
    "timestamp": "2026-02-03T12:00:00.000Z",
    "status": "new"
  }
]
```

## Integration

The beta feedback system is integrated into `App.tsx`:

1. **State Management:**
```tsx
const [showChangelog, setShowChangelog] = useState(false);
const [feedbackModalOpen, setFeedbackModalOpen] = useState(false);
```

2. **Component Rendering:**
```tsx
{/* Beta Banner */}
<BetaBanner onFeedbackClick={() => setFeedbackModalOpen(true)} />

{/* Floating Feedback Button */}
{!feedbackModalOpen && currentView !== "infinity-terminal" && (
  <BetaFeedback onClose={() => setFeedbackModalOpen(false)} />
)}

{/* Changelog Modal */}
<Changelog isOpen={showChangelog} onClose={() => setShowChangelog(false)} />
```

## Offline Support

The feedback system includes automatic fallback to localStorage when the API is unavailable:

1. Feedback is stored in `localStorage` under key `nxtg-beta-feedback`
2. When the API becomes available again, stored feedback can be manually submitted
3. This ensures no feedback is lost due to network issues

## Styling

All components use the project's Tailwind dark theme with:

- Surface colors from `tailwind.config.js`
- Framer Motion animations for smooth transitions
- Gradient accents (purple-to-blue) for brand consistency
- Responsive design for mobile and desktop

## Future Enhancements

- [ ] Screenshot annotation tools
- [ ] Sentiment analysis on feedback
- [ ] Admin dashboard for feedback management
- [ ] Email notifications for critical feedback
- [ ] Integration with issue tracking systems
- [ ] Anonymous feedback option
- [ ] Feedback voting/prioritization

## Testing

To test the feedback system:

1. Start the API server: `npm run dev:server`
2. Start the UI: `npm run dev`
3. Click the "Beta Feedback" floating button
4. Fill out the form and submit
5. Check `data/feedback.json` for the stored feedback
6. Access `http://localhost:5051/api/feedback` to retrieve all feedback
7. Access `http://localhost:5051/api/feedback/stats` for statistics

## Accessibility

All components include:

- ARIA labels for buttons
- Keyboard navigation support
- Focus management in modals
- Screen reader friendly text
- High contrast mode support
