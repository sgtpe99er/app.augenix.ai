export function getEnvVar(varValue: string | undefined, varName: string): string {
  if (varValue === undefined) throw new ReferenceError(`Reference to undefined env var: ${varName}`);
  return varValue;
}

// Optional env var - returns empty string if not set (useful for optional services like Stripe)
export function getOptionalEnvVar(varValue: string | undefined, fallback: string = ''): string {
  return varValue ?? fallback;
}
