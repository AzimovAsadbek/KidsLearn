/**
 * Deterministic shuffling.
 *
 * A session stores its seed, so replaying the same seed reproduces the same
 * board — which is what lets the server grade an attempt against exactly what
 * the child was shown, and makes game bugs reproducible from a session id.
 */
export function seededRandom(seed: number): () => number {
  let state = seed >>> 0 || 1;
  return () => {
    state ^= state << 13;
    state ^= state >>> 17;
    state ^= state << 5;
    return ((state >>> 0) % 100000) / 100000;
  };
}

export function seededShuffle<T>(items: readonly T[], seed: number): T[] {
  const random = seededRandom(seed);
  const output = [...items];
  for (let i = output.length - 1; i > 0; i -= 1) {
    const j = Math.floor(random() * (i + 1));
    [output[i], output[j]] = [output[j], output[i]];
  }
  return output;
}
