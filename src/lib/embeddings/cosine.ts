export function hexToVec(hex: string): number[] {
  const buf = Buffer.from(hex, "hex");
  const out = new Array<number>(buf.length / 4);
  for (let i = 0; i < out.length; i++) {
    out[i] = buf.readFloatLE(i * 4);
  }
  return out;
}

export function vecToHex(v: number[]): string {
  const buf = Buffer.allocUnsafe(v.length * 4);
  for (let i = 0; i < v.length; i++) {
    buf.writeFloatLE(v[i], i * 4);
  }
  return buf.toString("hex");
}

export function cosineSim(a: number[], b: number[]): number {
  if (a.length !== b.length) return 0;
  let dot = 0;
  let normA = 0;
  let normB = 0;
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }
  if (normA === 0 || normB === 0) return 0;
  return dot / (Math.sqrt(normA) * Math.sqrt(normB));
}

export function topK(
  query: number[],
  candidates: Array<{ id: string; vec: number[] }>,
  k = 10,
): Array<{ id: string; score: number }> {
  return candidates
    .map((c) => ({ id: c.id, score: cosineSim(query, c.vec) }))
    .sort((a, b) => b.score - a.score)
    .slice(0, k);
}
