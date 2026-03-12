# Implementation Plan: Agent Disagreement Escalation + Step-Up Verification

## TL;DR

Two interconnected features were added to the Fraud Prevention Dashboard:
1. **Agent Disagreement Escalation** — Automatic detection when AI agents disagree beyond a >20-point threshold, with a dedicated escalation queue for senior analysts.
2. **Step-Up Verification** — Identity verification via Email OTP (6-digit code) and IVR phone call using Asterisk ARI (mock by default, configurable for production).

---

## Design Decisions

| Decision | Choice | Rationale |
|---|---|---|
| Disagreement threshold | >20 point pairwise spread | Balances sensitivity vs noise; adjustable in `escalationEngine.mjs` |
| Escalation targets | Queue page + alert in AlertsView | Both passive (queue) and active (notification) coverage |
| Step-up triggers | REVIEW + IDENTITY_RISK + manual | Covers automated and analyst-initiated flows |
| Asterisk mode | Mock (default) + real via env var | Demo-ready out of the box, production-ready with config |
| OTP storage | In-memory, 5-min TTL, max 3 attempts | Sufficient for prototype; swap to Redis for production |
| OTP delivery | Console log (dev) | No SMTP dependency; production would use SendGrid/SES |

---

## Phase 1: Data Model & Type Extensions

### Step 1 — Extend `src/app/types.ts` ✅

**What**: Added core TypeScript types for both features.

**Changes**:
- `EscalationReason`: `"agent_disagreement" | "confidence_conflict" | "manual" | "identity_risk"`
- `EscalationStatus`: `"pending" | "assigned" | "resolved"`
- `VerificationMethod`: `"email_otp" | "ivr_call"`
- `VerificationStatus`: `"pending" | "sent" | "verified" | "failed" | "expired"`
- `Escalation` interface with full escalation record shape
- `StepUpVerification` interface with OTP/IVR tracking fields
- Extended `BookingStatus` to include `"escalated" | "awaiting_verification"`
- Extended `Booking` with optional `escalation?` and `verification?` fields
- Extended `Alert` with `escalationId?` and `verificationType?`

**Verify**: Open `src/app/types.ts` → search for `Escalation` and `StepUpVerification` interfaces.

---

## Phase 2: Backend — Disagreement Detection & Escalation Engine

### Step 2 — Create `server/escalationEngine.mjs` ✅

**What**: Agent disagreement detection and in-memory escalation CRUD store.

**Key functions**:
- `detectAgentDisagreement(agentScores[])` — computes pairwise max spread with >20 threshold
- `createEscalation(bookingId, reason, agentScores)` — stores new escalation
- `listEscalations(filters)` — list by status
- `resolveEscalation(id, resolution, resolvedBy)` — marks resolved
- `assignEscalation(id, assignedTo)` — assigns to analyst
- `getEscalation(id)` — single lookup

**Verify**:
```bash
# Start server
node server/server.mjs

# Create an escalation
curl -X POST http://localhost:5179/api/escalation/create \
  -H "Content-Type: application/json" \
  -d '{"bookingId":"BK-2026-001","reason":"agent_disagreement","agentScores":[{"agentId":"AG-FIN-01","agentName":"Financial","score":92},{"agentId":"AG-BEH-01","agentName":"Behavioral","score":72}]}'

# List escalations
curl http://localhost:5179/api/escalation/list
```

### Step 3 — Create `server/verificationEngine.mjs` ✅

**What**: Email OTP generation and IVR call management.

**Key functions**:
- `requestEmailOTP({ bookingId, email })` — generates 6-digit OTP via `crypto.randomInt()`, 5-min TTL, logs to console
- `requestIVRCall({ bookingId, phone })` — delegates to ARI client
- `verifyCode({ verificationId, code })` — validates OTP, max 3 attempts
- `getVerificationStatus(verificationId)` — for polling IVR/OTP status

**Verify**:
```bash
# Request OTP (check server console for the code)
curl -X POST http://localhost:5179/api/verification/request-otp \
  -H "Content-Type: application/json" \
  -d '{"bookingId":"BK-2026-001","email":"test@example.com"}'

# Verify with the code from console output
curl -X POST http://localhost:5179/api/verification/verify \
  -H "Content-Type: application/json" \
  -d '{"verificationId":"<id-from-above>","code":"<otp-from-console>"}'

# Request IVR call (mock mode)
curl -X POST http://localhost:5179/api/verification/request-ivr \
  -H "Content-Type: application/json" \
  -d '{"bookingId":"BK-2026-001","phone":"+919876543210"}'

# Poll IVR status (transitions: pending → sent → verified after ~10s)
curl http://localhost:5179/api/verification/status/<verification-id>
```

---

## Phase 3: Asterisk IVR Integration

### Step 4 — Create `server/asterisk/` directory ✅

**Files created**:
| File | Purpose |
|---|---|
| `server/asterisk/ari-client.mjs` | Dual-mode ARI client (mock default, real via `ASTERISK_ENABLED=true`) |
| `server/asterisk/dialplan.conf` | Reference Asterisk dialplan with `[fraud-verification]` context |
| `server/asterisk/extensions.conf` | PJSIP transport + trunk template + dial patterns |
| `server/asterisk/README.md` | Full setup guide: architecture, installation, config, testing |

**Mock mode behavior**: `originateVerificationCall()` simulates ringing (3s) → answered → dtmf_collected (8s) → verified using `setTimeout`.

**Real mode**: Enable with `ASTERISK_ENABLED=true` env var. Requires Asterisk with ARI enabled. HTTP POST to `POST /channels` with PJSIP endpoint.

**Verify**:
```bash
# Mock IVR (default) — request call and watch console output
curl -X POST http://localhost:5179/api/verification/request-ivr \
  -H "Content-Type: application/json" \
  -d '{"bookingId":"BK-2026-001","phone":"+919876543210"}'
# Watch server console: "[ARI-MOCK] Ringing..." → "[ARI-MOCK] Answered" → "[ARI-MOCK] DTMF collected"

# Poll status until "verified"
curl http://localhost:5179/api/verification/status/<id>
```

---

## Phase 4: Backend Integration

### Step 5 — Integrate into `server/riskEngine.mjs` ✅

**What**: After `scoreBooking()` computes 4 subscores, maps them to 0–100 scale, calls `detectAgentDisagreement()`. If disagreement detected + REVIEW/REJECT decision, adds `escalation` flag to response.

**Response addition**:
```json
{
  "escalation": {
    "required": true,
    "reason": "agent_disagreement",
    "maxSpread": 23,
    "disagreeingPair": ["Network Detector", "Behavioral Monitor"]
  }
}
```

**Verify**: Score a booking and check for escalation field:
```bash
curl -X POST http://localhost:5179/api/risk/score \
  -H "Content-Type: application/json" \
  -d '{"bookingId":"BK-TEST","signals":{"amount":500000,"daysSinceFirstBooking":5,"avgBookingAmount":50000,"bookingFrequencyLast30":25,"uniqueDestinations":8,"creditUtilization":0.95,"paymentDelayDays":15,"chargebackCount":3}}'
```

### Step 6 — Add API endpoints in `server/server.mjs` ✅

**8 new endpoints added**:
| Method | Endpoint | Purpose |
|---|---|---|
| POST | `/api/escalation/create` | Create manual escalation |
| GET | `/api/escalation/list` | List escalations (optional `?status=pending`) |
| POST | `/api/escalation/resolve` | Resolve an escalation |
| POST | `/api/escalation/assign` | Assign to analyst |
| POST | `/api/verification/request-otp` | Send email OTP |
| POST | `/api/verification/request-ivr` | Initiate IVR call |
| POST | `/api/verification/verify` | Verify OTP/IVR code |
| GET | `/api/verification/status/:id` | Poll verification status |

---

## Phase 5: Frontend — API Client

### Step 7 — Extend `src/app/services/riskApi.ts` ✅

**Types added**: `EscalationResponse`, `EscalationListResponse`, `VerificationRequestResponse`, `VerifyResult`, `VerificationStatusResponse`, `RiskEscalationFlag`

**Functions added**: `createEscalation()`, `fetchEscalations()`, `resolveEscalationApi()`, `assignEscalationApi()`, `requestEmailOTP()`, `requestIVRCall()`, `verifyCode()`, `fetchVerificationStatus()`

Extended `RiskDecision` with optional `escalation?: RiskEscalationFlag`.

### Step 8 — Update `src/app/data/mockData.ts` ✅

**Changes**:
- BK-2026-001 Behavioral agent score adjusted from 78 → 72 (creates 23-point spread with Network's 95)
- BK-2026-001 gets `escalation` field (ESC-0001, pending)
- BK-2026-003 gets `verification` field (VER-0001, email_otp, pending)
- 2 new mock alerts: agent disagreement alert (ALT-005) and verification required alert (ALT-006)
- Exported `mockEscalations` array (2 entries: pending + assigned)
- Exported `mockVerifications` array (1 entry)

---

## Phase 6: Frontend — Disagreement Escalation UI

### Step 9 — Create `src/app/components/AgentDisagreementBanner.tsx` ✅

**What**: Amber/red warning banner shown when any two agents disagree by >20 points.

**Features**:
- Computes pairwise max spread from agent assessments
- Color-coded severity: amber (21–30pt spread) / red (>30pt spread)
- Shows disagreeing agent names and spread value
- "Escalate to Manager" button (hidden when already escalated)
- Expandable "Compare Agents" section showing all 4 agent scores

**Verify**: In the dashboard, select booking BK-2026-001 → banner should appear between the AgentCards and ExplainabilityPanel showing "Δ 23 pts" with Network Detector vs Behavioral Monitor.

### Step 10 — Create `src/app/pages/EscalationQueue.tsx` ✅

**What**: Dedicated page for managing escalated bookings.

**Features**:
- Summary cards: Pending / Assigned / Resolved counts
- Filter tabs: All | Pending | Assigned | Resolved
- Each escalation card shows: ID, booking ID, reason badge, max spread, agent score pills, assigned analyst
- Actions: "Assign to Me", "Resolve", "View Booking"

**Verify**: Navigate to `/escalations` → see 2 mock escalations (ESC-0001 pending, ESC-0002 assigned). Click "Assign to Me" on ESC-0001 → status changes. Click "Resolve" → status changes to resolved.

### Step 11 — Update `Dashboard.tsx` ✅

**Changes**:
- Imports `AgentDisagreementBanner` and `StepUpVerificationModal`
- Computes pairwise agent spread for selected booking
- Renders disagreement banner when spread > 20
- Replaced "Request More Info" button with "Request Verification" (opens modal)
- `StepUpVerificationModal` wired with booking ID and auto-generated email
- Escalation handler calls `createEscalation()` API + shows toast
- Tracks escalated bookings in local state

**Verify**: Select BK-2026-001 → see amber disagreement banner → click "Escalate to Manager" → toast appears. Click "Request Verification" → modal opens with Email OTP and Phone Call tabs.

---

## Phase 7: Frontend — Step-Up Verification UI

### Step 12 — Create `src/app/components/StepUpVerificationModal.tsx` ✅

**What**: Dialog with two-tab verification interface.

**Email OTP tab**:
- Email input (pre-filled)
- "Send OTP" button → calls API
- 6-digit OTP input using shadcn `InputOTP` component
- "Verify Code" button with loading state
- 60-second resend countdown timer
- Success/failure states

**IVR Phone Call tab**:
- Phone number input
- "Initiate Call" button → calls API
- Status polling every 3 seconds
- Visual states: Initiating → Ringing (animated) → In Progress → Verified/Failed
- Retry on failure

**Verify**: From Dashboard, click "Request Verification" on any booking → modal opens → switch between Email OTP and Phone Call tabs. In Email tab: enter email → click Send OTP → check server console for code → enter code → click Verify → see success state.

---

## Phase 8: UI Integration & Wiring

### Step 13 — Update routes, Sidebar, BookingCard ✅

**`src/app/routes.tsx`**: Added `/escalations` route pointing to `EscalationQueue` page.

**`src/app/components/Sidebar.tsx`**: Added "Escalation Queue" nav item with `ShieldAlert` icon and pending count badge. Accepts new `escalationCount` prop.

**`src/app/components/BookingCard.tsx`**: Added escalation badge (amber, shows Δ spread) and verification badge (blue, shows method + status) below booking details. Added `"escalated"` and `"awaiting_verification"` status colors and icons.

**`src/app/layouts/RootLayout.tsx`**: Passes `escalationCount` from `mockEscalations` to Sidebar.

**Verify**: Check sidebar → "Escalation Queue" item should show with badge count. Click a booking with escalation (BK-2026-001) → see amber "Escalated" badge. BK-2026-003 → see blue "Email OTP" badge.

### Step 14 — Update DualStateMatrix + AlertsView ✅

**`src/app/components/DualStateMatrix.tsx`**: Added optional `onVerifyNow` prop. When quadrant is `IDENTITY_RISK` or `DUAL_RISK`, shows a "Verify Now" button that opens the verification modal.

**`src/app/pages/AlertsView.tsx`**: Alerts with `escalationId` show "View Escalation" button (navigates to `/escalations`). Alerts with `verificationType` show "Verify Identity" button (navigates to dashboard). Original Investigate/Take Action buttons shown for other actionable alerts.

**Verify**: Navigate to Alerts → see ALT-005 (agent disagreement) with "View Escalation" button → click → goes to `/escalations`. See ALT-006 (verification required) with "Verify Identity" button.

---

## Files Summary

### Created (10 files)
| File | Purpose |
|---|---|
| `server/escalationEngine.mjs` | Disagreement detection + escalation CRUD store |
| `server/verificationEngine.mjs` | Email OTP + IVR verification management |
| `server/smtp-client.mjs` | Nodemailer SMTP transport, HTML email template, dual-mode (console/SMTP) |
| `server/asterisk/ari-client.mjs` | Dual-mode Asterisk ARI client (mock/real) with WebSocket event stream |
| `server/asterisk/dialplan.conf` | Reference Asterisk dialplan |
| `server/asterisk/extensions.conf` | PJSIP transport + trunk config |
| `server/asterisk/README.md` | Full SMTP + Asterisk deployment guide |
| `src/app/components/AgentDisagreementBanner.tsx` | Disagreement warning banner |
| `src/app/components/StepUpVerificationModal.tsx` | Email OTP + IVR verification dialog |
| `src/app/pages/EscalationQueue.tsx` | Escalation management page |

### Modified (12 files)
| File | Changes |
|---|---|
| `src/app/types.ts` | 4 union types, 2 interfaces, extended Booking/Alert/BookingStatus |
| `server/riskEngine.mjs` | Disagreement detection after scoring |
| `server/server.mjs` | 8 new API endpoints, `await` async OTP, ARI init on startup |
| `src/app/services/riskApi.ts` | 6 types + 8 API functions |
| `src/app/data/mockData.ts` | Adjusted scores, added escalation/verification data, 2 new alerts |
| `src/app/pages/Dashboard.tsx` | Banner, verification modal, escalation handler |
| `src/app/components/BookingCard.tsx` | Escalation/verification badges |
| `src/app/components/DualStateMatrix.tsx` | "Verify Now" button |
| `src/app/pages/AlertsView.tsx` | Contextual escalation/verification buttons |
| `src/app/routes.tsx` | `/escalations` route |
| `src/app/components/Sidebar.tsx` | Escalation Queue nav item with badge |
| `src/app/layouts/RootLayout.tsx` | Escalation count prop |

---

## End-to-End Verification Checklist

### Backend (start server: `node server/server.mjs`)

- [ ] **Disagreement detection**: Score a booking and check for `escalation.required` in response
- [ ] **Escalation CRUD**: Create → List → Assign → Resolve an escalation via API
- [ ] **Email OTP flow**: Request OTP → see code in console → verify with correct code → success
- [ ] **OTP lockout**: Enter wrong code 3 times → verify failure with 0 attempts remaining
- [ ] **IVR mock flow**: Request call → poll status → see transitions: pending → sent → verified (~10s)
- [ ] **OTP expiry**: Wait 5+ minutes → verify → should fail with expired

### Frontend (start dev server: `npm run dev`)

- [ ] **Disagreement banner**: Select BK-2026-001 → amber banner appears with "Δ 23 pts"
- [ ] **Escalate button**: Click "Escalate to Manager" → toast appears → badge changes to "Escalated"
- [ ] **Compare agents**: Click "Compare Agents" on banner → expandable shows all 4 agent scores
- [ ] **Escalation queue**: Navigate to `/escalations` → see 2 mock escalations
- [ ] **Assign/Resolve**: Click "Assign to Me" → status changes; Click "Resolve" → resolved
- [ ] **Sidebar badge**: Escalation Queue nav shows pending count badge
- [ ] **Verification modal**: Click "Request Verification" → modal opens with 2 tabs
- [ ] **Email OTP tab**: Enter email → Send OTP → enter 6-digit code → Verify → success state
- [ ] **IVR tab**: Enter phone → Initiate Call → see ringing animation → verified state
- [ ] **Booking badges**: BK-2026-001 shows escalation badge; BK-2026-003 shows verification badge
- [ ] **DualStateMatrix**: Select BK-2026-001 → if IDENTITY_RISK quadrant, "Verify Now" button shows
- [ ] **Alerts integration**: ALT-005 shows "View Escalation"; ALT-006 shows "Verify Identity"

### Running Both Together

```bash
# Terminal 1 — Backend
node server/server.mjs
# Server running on http://localhost:5179

# Terminal 2 — Frontend
npm run dev
# Vite dev server with proxy to backend
```

---

## Scope & Limitations

**Included**:
- Full agent disagreement detection pipeline (backend + frontend)
- Escalation queue with assign/resolve workflow
- Email OTP: generation, 6-digit input, verification, lockout
- **Real SMTP email delivery** via nodemailer (Gmail, SendGrid, SES, Mailgun — any SMTP provider)
- IVR: mock call lifecycle + **production ARI client with WebSocket event streaming**
- Asterisk ARI WebSocket for real-time StasisStart, ChannelDtmfReceived, StasisEnd event handling
- Auto-reconnecting WebSocket connection with DTMF digit accumulation
- Branded HTML email template with OTP digit boxes and plain text fallback
- Asterisk reference configs (dialplan, PJSIP, audio prompts)
- UI integration across Dashboard, BookingCard, DualStateMatrix, AlertsView, Sidebar

**Production-ready components**:
- SMTP delivery: Set `SMTP_ENABLED=true` + SMTP credentials → real emails sent
- Asterisk IVR: Set `ASTERISK_ENABLED=true` + Asterisk credentials → real calls originated, DTMF collected via WebSocket
- Both features gracefully fall back to mock/console mode when env vars are not set

**Not included (future considerations)**:
- Persistent database (in-memory stores reset on restart)
- WebSocket real-time updates to frontend (polling used for IVR status)
- Rate limiting on OTP requests
- Manager notification push (toast only, no email/SMS alerts to managers)
