const BASE_DELAYS_MS = [1000, 2000, 4000, 8000, 16000, 30000, 60000];

export const MAX_ATTEMPTS = 7;

export function calculateBackoff(attempt: number): number {
  const idx = Math.min(attempt, BASE_DELAYS_MS.length - 1);
  const cap = BASE_DELAYS_MS[idx];
  return Math.floor(Math.random() * (cap + 1));
}

export function isWithinMaxAttempts(attempt: number): boolean {
  return attempt < MAX_ATTEMPTS;
}
