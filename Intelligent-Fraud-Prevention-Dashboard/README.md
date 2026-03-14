Here is a highly detailed, up-to-date `README.md` that synthesizes your current system architecture, the new advanced frontend routes, the expanded Node.js backend API, and the integration of automated verification systems (like Twilio IVR and OTP).

You can use this as your new comprehensive `README.md`.

---

# 🛡️ Intelligent Fraud Prevention Dashboard

An enterprise-grade, B2B travel fraud detection and prevention platform. Built with a focus on explainable AI (XAI), human-in-the-loop (HITL) learning, and automated verification, this system provides fraud analysts with real-time insights, multi-agent swarm intelligence, and actionable mitigation workflows.


## 🚀 Overview

This dashboard moves beyond traditional black-box fraud detection by employing **Explainable Multi-Agent AI**. It features specialized analytical engines (Network, Behavioral, Financial) that collaborate to score bookings.

Recent system upgrades have introduced **Advanced Risk Signals** (like Velocity Cliff and Behavioral Entropy), **Automated Verification Workflows** (Twilio IVR & Email OTP), and **Simulation Environments** (Digital Twin & Actor-Critic models) to proactively combat emerging fraud topologies in the travel sector.

---

## ✨ Core Innovations & Features

### 1. Multi-Agent Swarm Intelligence & Explainability

* **Specialized AI Agents:** Financial, Behavioral, Network, and Benchmark agents independently assess risk and calculate consensus.
* **SHAP-Style Explainability:** Transparent breakdowns of risk factors (e.g., IP reputation, device sharing) so analysts understand *why* a score was given.
* **Dual-State Risk Matrix:** Evaluates intent vs. capability to identify sophisticated fraud rings.

### 2. Advanced Threat Detection

* **Velocity Cliff Analysis:** Detects sudden drop-offs or spikes in booking velocities characteristic of bust-out fraud.
* **Behavioral Entropy:** Analyzes user interaction unpredictability and navigation anomalies.
* **Credit Card & Refund Intelligence:** Deep-dive analytics into chargeback contagion and refund abuse patterns.
* **Network Graph Visualization:** Force-directed graphs to map device-sharing, IP links, and uncover hidden fraud rings.

### 3. Automated Verification & Escalation

* **Twilio IVR Integration:** Automated voice calls to travelers/agencies with DTMF gathering to verify high-risk bookings.
* **Email OTP Verification:** Automated multi-factor authentication routing.
* **Escalation Queue:** A dedicated workflow for human analysts to review uncertain cases, resolve tickets, and feedback into the AI.

### 4. Proactive Simulation

* **Adaptive Credit Simulator:** Real-time "what-if" analysis for adjusting agency credit lines safely.
* **Digital Twin & Actor-Critic Pages:** Simulated environments to model agency behavior and test fraud defense policies before deployment.

---

## 🏗 System Architecture

The project consists of a **React 18 frontend** powered by Vite, communicating with a lightweight **Node.js (ESM) API backend**.

* **Frontend:** Utilizes a modern component architecture with React Router v7, styling via Tailwind CSS v4, and accessible components built on Radix UI. Data is visualized using Recharts and D3/Force-directed graphs.
* **Backend (`server/server.mjs`):** A custom HTTP server handling risk scoring, OTP/SMTP generation, Twilio Webhooks (TwiML generation), and mock data stores for escalations and overrides.
* **Human-AI Loop:** The system actively records human overrides (`/api/review/override`) to re-weight agent confidence, creating a continuous learning loop.

---

## 🛠 Tech Stack

**Frontend Interface**

* **Core:** React 18, TypeScript, Vite
* **Routing:** React Router v7
* **Styling:** Tailwind CSS v4, Framer Motion
* **UI Library:** Radix UI primitives, shadcn/ui patterns
* **Visualizations:** Recharts, Canvas-based Force Graphs

**Backend API & Services**

* **Server:** Node.js (ESM module environment)
* **Communications:** Nodemailer (SMTP), Twilio (Voice IVR & TwiML)
* **Architecture:** In-memory stores for Escalation Engines, Verification Engines, and Risk Engines.

---

## 💻 Getting Started

### Prerequisites

* **Node.js**: v18.0.0 or higher
* **npm**: v9.0.0 or higher (or pnpm)

### 1. Installation

Clone the repository and install dependencies:

```bash
git clone <repository-url>
cd Intelligent-Fraud-Prevention-Dashboard
npm install

```

### 2. Environment Configuration

Create a `.env` file in the root directory. This is required for the backend server to function properly, especially for the verification engines.

```env
PORT=5179
TWILIO_ACCOUNT_SID=your_twilio_sid
TWILIO_AUTH_TOKEN=your_twilio_token
SMTP_HOST=your_smtp_host
SMTP_USER=your_smtp_user
SMTP_PASS=your_smtp_password

```

### 3. Running the Application

You will need two terminal windows to run the full stack locally.

**Terminal 1: Start the Risk API (Backend)**

```bash
npm run server

```

*Starts the Node HTTP server on `http://localhost:5179`.*

**Terminal 2: Start the Frontend Dev Server**

```bash
npm run dev

```

*Starts the Vite development server. API requests matching `/api/*` are automatically proxied to the backend.*

---

## 📂 Project Structure

```text
/
├── server/                       # Node.js Backend Services
│   ├── server.mjs                # Main HTTP server & routing
│   ├── advancedEngine.mjs        # Entropy, Dual-State, Velocity logic
│   ├── escalationEngine.mjs      # Human queue management
│   ├── verificationEngine.mjs    # OTP & IVR orchestrator
│   └── twilio-ivr.mjs            # TwiML payload generation
├── src/                          
│   ├── app/
│   │   ├── components/           # Reusable UI (AgentCard, Graphs, Explainability)
│   │   │   └── ui/               # Base Radix/Tailwind components
│   │   ├── pages/                # Route components (Dashboard, NetworkView, etc.)
│   │   ├── data/                 # Mock timelines and seed data
│   │   ├── services/             # API clients and signal adapters
│   │   ├── layouts/              # Root layout wrappers
│   │   └── routes.tsx            # Application routing configuration
│   ├── styles/                   # Global CSS, Theme, Tailwind config
│   └── main.tsx                  # Application entry point
├── package.json
└── vite.config.ts                # Vite config (includes API proxy rules)

```

---

## 🔌 API Reference

The backend provides several key REST endpoints used by the dashboard:

**Risk & AI Analysis**

* `POST /api/risk/score`: Basic risk scoring.
* `POST /api/agency/risk-profile`: Comprehensive risk profile (aggregates velocity, entropy, dual-state).
* `POST /api/velocity/cliff`: Detects booking velocity drop-offs.
* `POST /api/behavior/entropy`: Calculates user interaction unpredictability.

**Escalation & Review**

* `POST /api/escalation/create`: Push a booking to the human review queue.
* `GET /api/escalation/list`: Fetch pending manual reviews.
* `POST /api/review/override`: Submit human analyst feedback to adjust AI thresholds.

**Automated Verification (Twilio/Email)**

* `POST /api/verification/request-otp`: Triggers email verification.
* `POST /api/verification/request-ivr`: Triggers a Twilio voice call.
* `POST /api/twilio/gather`: Twilio Webhook to capture DTMF digits from the user.

---

## 🎨 Design Philosophy (EDIPT)

This system is built strictly following **EDIPT UI Design Principles** tailored for B2B fraud analysts:

* **E — Effectiveness:** High-risk warnings are immediate. Primary actions (Approve/Reject/Step-up) are unambiguous.
* **D — Efficiency:** Essential tasks are one click away. Real-time KPIs sit in a fixed header.
* **I — Engagement (Error Tolerance):** Toast notifications confirm all actions. Granular human-overrides prevent systemic AI blockages.
* **P — Ease of Learning:** Progressive disclosure—users see top-level risk first, and can expand "Explainability Panels" to see deep SHAP-style math.
* **T — Truthfulness (Transparency):** **Zero black-box decisions.** Every risk score displays its sub-agent consensus and feature contribution.