/**
 * Agent Disagreement Detection & Escalation Engine
 *
 * Detects when AI agent risk assessments diverge beyond a configurable
 * threshold (default >20 points) and manages an escalation queue for
 * senior analyst / manager review.
 */

const DISAGREEMENT_THRESHOLD = 20; // pairwise point spread
const escalations = [];

// ─── Disagreement Detection ─────────────────────────────────────────────────

/**
 * Detect whether any two agent scores disagree beyond the threshold.
 * @param {Array<{agentId: string, agentName: string, score: number}>} agentScores
 * @returns {{ disagreementDetected: boolean, maxSpread: number, ... }}
 */
export function detectAgentDisagreement(agentScores) {
  if (!Array.isArray(agentScores) || agentScores.length < 2) {
    return {
      disagreementDetected: false,
      maxSpread: 0,
      agentA: null,
      agentB: null,
      allScores: agentScores ?? [],
    };
  }

  let maxSpread = 0;
  let agentA = null;
  let agentB = null;

  for (let i = 0; i < agentScores.length; i++) {
    for (let j = i + 1; j < agentScores.length; j++) {
      const spread = Math.abs(agentScores[i].score - agentScores[j].score);
      if (spread > maxSpread) {
        maxSpread = spread;
        agentA = agentScores[i];
        agentB = agentScores[j];
      }
    }
  }

  return {
    disagreementDetected: maxSpread > DISAGREEMENT_THRESHOLD,
    maxSpread,
    agentA,
    agentB,
    allScores: agentScores,
  };
}

// ─── Escalation Store ───────────────────────────────────────────────────────

export function createEscalation({ bookingId, reason, agentScores }) {
  const detection = detectAgentDisagreement(agentScores ?? []);
  const escalation = {
    id: `ESC-${String(escalations.length + 1).padStart(4, "0")}`,
    bookingId: bookingId ?? null,
    reason: reason ?? "agent_disagreement",
    agentScores: agentScores ?? [],
    maxSpread: detection.maxSpread,
    assignedTo: null,
    status: "pending",
    createdAt: new Date().toISOString(),
    resolvedAt: null,
    resolution: null,
  };
  escalations.push(escalation);
  return escalation;
}

export function listEscalations({ status, limit = 50 } = {}) {
  let result = escalations;
  if (status) {
    result = result.filter((e) => e.status === status);
  }
  return result.slice(-limit).reverse();
}

export function resolveEscalation({ escalationId, resolution, resolvedBy }) {
  const esc = escalations.find((e) => e.id === escalationId);
  if (!esc) return null;
  esc.status = "resolved";
  esc.resolution = resolution ?? "unknown";
  esc.resolvedAt = new Date().toISOString();
  if (resolvedBy) esc.assignedTo = resolvedBy;
  return esc;
}

export function assignEscalation({ escalationId, assignedTo }) {
  const esc = escalations.find((e) => e.id === escalationId);
  if (!esc) return null;
  esc.assignedTo = assignedTo;
  esc.status = "assigned";
  return esc;
}

export function getEscalation(escalationId) {
  return escalations.find((e) => e.id === escalationId) ?? null;
}
