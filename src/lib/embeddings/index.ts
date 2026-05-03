import { createHash } from "node:crypto";
import { vecToHex } from "./cosine";

const VEC_DIM = 64;

export function deterministicEmbed(text: string): number[] {
  const normalized = text.toLowerCase().normalize("NFD").replace(/\s+/g, " ").trim();
  const tokens = normalized.split(/[^a-z0-9çğıöşü_]+/).filter((t) => t.length > 1);

  const vec = new Array<number>(VEC_DIM).fill(0);
  for (const t of tokens) {
    const h = createHash("sha256").update(t).digest();
    for (let i = 0; i < VEC_DIM; i++) {
      vec[i] += (h[i % 32] / 128) - 1;
    }
  }
  const norm = Math.sqrt(vec.reduce((a, b) => a + b * b, 0));
  if (norm > 0) {
    for (let i = 0; i < VEC_DIM; i++) vec[i] /= norm;
  }
  return vec;
}

export function embedAndStore(text: string): string {
  return vecToHex(deterministicEmbed(text));
}
