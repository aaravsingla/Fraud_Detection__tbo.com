const overrides = [];

export function recordOverride(override) {
  overrides.push({
    id: `OVR-${String(overrides.length + 1).padStart(4, "0")}`,
    createdAt: new Date().toISOString(),
    ...override,
  });
  return overrides.at(-1);
}

export function listOverrides({ limit = 50 } = {}) {
  return overrides.slice(-limit).reverse();
}
