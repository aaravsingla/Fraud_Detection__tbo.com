# Intelligent Fraud Prevention Dashboard - System Architecture

## Overview
This is an enterprise-grade fraud prevention dashboard built strictly following EDIPT UI Design Principles for B2B travel fraud detection. The system uses explainable multi-agent AI with human-in-the-loop learning.

## EDIPT Principles Implementation

### E — Effectiveness
- ✅ High-risk bookings immediately visible with clear visual hierarchy
- ✅ Risk explanations accessible via expandable panels
- ✅ Primary actions (approve/reject/review) are unambiguous
- ✅ Alerts clearly indicate urgency via color coding and severity badges

### D — Efficiency
- ✅ Most frequent tasks placed in top navigation and sidebar
- ✅ Real-time KPIs in fixed header
- ✅ Keyboard navigation supported throughout
- ✅ Quick filters and search reduce time-to-decision

### I — Engagement (Error Tolerance)
- ✅ Confirmation feedback for all actions via toast notifications
- ✅ Clear loading states during processing
- ✅ Autosave for in-progress reviews
- ✅ Visual feedback for success/failure states

### P — Ease of Learning
- ✅ Clear visual hierarchy with consistent iconography
- ✅ Tooltips explain complex metrics
- ✅ Progressive disclosure: overview → detail pattern
- ✅ Consistent interaction patterns across views

### T — Truthfulness (Transparency)
- ✅ Every risk score is explainable via SHAP-based breakdown
- ✅ Agent confidence levels always visible
- ✅ Formula transparency in credit simulator
- ✅ No black-box decisions

## Core Innovations Implemented

### 1. Multi-Agent Swarm Intelligence
Location: `/src/app/components/AgentCard.tsx`
- Four specialized AI agents: Financial, Behavioral, Network, Benchmark
- Individual risk assessments with confidence levels
- Transparent reasoning for each agent
- Visual consensus representation

### 2. Network Graph Visualization
Location: `/src/app/components/NetworkGraph.tsx`
- Force-directed graph layout
- Real-time fraud ring detection
- Interactive node selection
- Trust level visualization via color and size

### 3. SHAP-Style Explainability
Location: `/src/app/components/ExplainabilityPanel.tsx`
- Factor contribution breakdown
- Interactive tooltips with detailed descriptions
- Visual bar representations
- Positive/negative contribution indicators

### 4. Trust Score Evolution
Location: `/src/app/pages/TrustEvolution.tsx`
- 90-day historical tracking
- Annotated behavioral events
- Trend analysis with threshold lines
- Declining pattern detection

### 5. Adaptive Credit Limit Simulator
Location: `/src/app/pages/CreditSimulator.tsx`
- Real-time what-if analysis
- Transparent formula display
- Interactive parameter sliders
- Impact analysis for each factor

### 6. Human-AI Learning Loop
Location: `/src/app/pages/LearningLoop.tsx`
- Queue of uncertain cases
- Human override with mandatory reasoning
- Learning impact visualization
- Feedback collection for model improvement

### 7. Real-Time Alert System
Location: `/src/app/pages/AlertsView.tsx`
- Severity-based categorization (Critical, Warning, Info)
- Action-required badges
- Immediate response options
- Related booking references

## Technology Stack

- **Framework**: React 18.3.1
- **Routing**: React Router 7.13.0
- **Styling**: Tailwind CSS 4.1.12
- **UI Components**: Radix UI + shadcn/ui
- **Charts**: Recharts 2.15.2
- **Icons**: Lucide React 0.487.0
- **Animations**: Motion (Framer Motion) 12.23.24
- **Notifications**: Sonner 2.0.3
- **Type Safety**: TypeScript

## File Structure

```
/src/app/
├── components/
│   ├── AgentCard.tsx           # Multi-agent display
│   ├── BookingCard.tsx         # Live booking feed item
│   ├── ExplainabilityPanel.tsx # SHAP-style factor breakdown
│   ├── Header.tsx              # KPIs, search, alerts
│   ├── NetworkGraph.tsx        # Force-directed graph
│   ├── Sidebar.tsx             # Navigation menu
│   └── ui/                     # Reusable UI components
├── pages/
│   ├── Dashboard.tsx           # Main overview
│   ├── NetworkView.tsx         # Network analysis
│   ├── TrustEvolution.tsx      # Trust score timeline
│   ├── CreditSimulator.tsx     # What-if calculator
│   ├── LearningLoop.tsx        # Human feedback queue
│   ├── AlertsView.tsx          # Alert management
│   └── NotFound.tsx            # 404 page
├── layouts/
│   └── RootLayout.tsx          # Main layout wrapper
├── data/
│   └── mockData.ts             # Demonstration data
├── types.ts                    # TypeScript definitions
├── routes.tsx                  # Route configuration
└── App.tsx                     # Application entry
```

## Color System (Enterprise Professional)

| Purpose | Color | Usage |
|---------|-------|-------|
| Primary Blue | `#003366` | Brand, navigation, primary actions |
| Accent Orange | `#FF6600` | Warnings, uncertain states |
| Success Green | `#2E7D32` | Approvals, positive trends |
| Warning Yellow | `#F57C00` | Medium risk, attention needed |
| Alert Red | `#C62828` | Critical risk, rejections |
| Neutral Grays | Various | Text, borders, backgrounds |

**Note**: Color is never the sole indicator — always paired with text, icons, or patterns for accessibility.

## Accessibility Features (WCAG 2.1 AA)

- ✅ Contrast ratio ≥ 4.5:1 for all text
- ✅ Visible focus states on all interactive elements
- ✅ ARIA labels for icon-only buttons
- ✅ Semantic HTML structure
- ✅ Keyboard navigation support
- ✅ Touch targets ≥ 44×44px

## Mock Data Scenarios

### Scenario 1: Normal Booking (Low Risk)
- **Booking ID**: BK-2026-002, BK-2026-004
- **Risk Score**: 15-23%
- **Outcome**: Auto-approved
- **Trust Impact**: Slight increase

### Scenario 2: Suspicious Booking (High Risk)
- **Booking ID**: BK-2026-001
- **Risk Score**: 89%
- **Outcome**: Requires manual review
- **Key Factors**: Shared device, IP reputation, unusual amount

### Scenario 3: Fraud Ring Detection
- **Network**: Device DEV-789
- **Connected Agencies**: 3 flagged entities
- **Action**: Entire ring blocked
- **Prevented Loss**: ₹24.5L

### Scenario 4: Human Override & Learning
- **Location**: Learning Loop page
- **Purpose**: Capture expert judgment for edge cases
- **Impact**: Improves model accuracy by 12.3%

## Performance Considerations

- Components use React.memo where appropriate
- Virtual scrolling for large lists (booking feed)
- Lazy loading for heavy visualizations
- Optimized re-renders with proper dependency arrays
- Canvas-based graph for better performance

## Future Enhancements

1. Real-time WebSocket integration for live updates
2. Advanced filtering and search with fuzzy matching
3. Export functionality for reports
4. Role-based access control
5. Multi-language support
6. Dark mode theme toggle
7. Mobile-responsive tablet view
8. Batch operations for bulk actions

## Design Philosophy

The dashboard prioritizes **explainability over complexity**, ensuring that:
- Every decision can be traced to specific factors
- Analysts understand WHY, not just WHAT
- Confidence is clearly communicated
- Human judgment remains central
- Learning happens transparently

---

**Built with EDIPT principles** | **Designed for fraud analysts** | **Enterprise-ready**
