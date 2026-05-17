// MFA recovery codes — bcrypt-hashed, single-use
//
// Format: XXXX-XXXX (8 chars, A-Z + 2-9 to avoid O/0/I/L/1 confusion)
// Generated once, displayed once. Server only stores bcrypt hashes.
// Verified against codeHash list; first match wins and marks usedAt.

import bcrypt from "bcryptjs";
import { randomBytes } from "node:crypto";
import { prisma } from "@/lib/db/prisma";

const ALPHABET = "ABCDEFGHJKMNPQRSTUVWXYZ23456789"; // skip O/0/I/L/1 — 31 chars
const CODE_LEN = 8; // 8 chars => 31^8 ≈ 8.5e11 combos
const CODE_COUNT = 10;

// Strict char class — matches ALPHABET exactly (no O/I/L/1/0).
const ALPHABET_CHAR = "[ABCDEFGHJKMNPQRSTUVWXYZ23456789]";
const CODE_RE = new RegExp(`^${ALPHABET_CHAR}{4}-?${ALPHABET_CHAR}{4}$`);
const STRIP_RE = /[^ABCDEFGHJKMNPQRSTUVWXYZ23456789]/g;

export function looksLikeRecoveryCode(input: string): boolean {
  return CODE_RE.test(input.toUpperCase().trim());
}

export function normalizeRecoveryCode(input: string): string {
  return input.toUpperCase().replace(STRIP_RE, "");
}

function randomCode(): string {
  const buf = randomBytes(CODE_LEN);
  let out = "";
  for (let i = 0; i < CODE_LEN; i++) {
    out += ALPHABET[buf[i] % ALPHABET.length];
  }
  return `${out.slice(0, 4)}-${out.slice(4)}`;
}

/**
 * Generate a fresh set of recovery codes for a user.
 * Replaces any existing codes (used or unused).
 * Returns plaintext codes — caller MUST display once, never store.
 */
export async function generateRecoveryCodes(userId: string): Promise<string[]> {
  const codes = Array.from({ length: CODE_COUNT }, () => randomCode());
  const hashed = await Promise.all(
    codes.map(async (code) => ({
      userId,
      codeHash: await bcrypt.hash(normalizeRecoveryCode(code), 10),
    })),
  );

  await prisma.$transaction([
    prisma.mfaRecoveryCode.deleteMany({ where: { userId } }),
    prisma.mfaRecoveryCode.createMany({ data: hashed }),
  ]);

  return codes;
}

/**
 * Verify a recovery code against a user's stored hashes.
 * If a match is found, the code is marked used and `true` returned.
 * Constant-ish: walks all candidate hashes regardless of early match.
 */
export async function consumeRecoveryCode(
  userId: string,
  input: string,
): Promise<boolean> {
  const normalized = normalizeRecoveryCode(input);
  if (normalized.length !== CODE_LEN) return false;

  const candidates = await prisma.mfaRecoveryCode.findMany({
    where: { userId, usedAt: null },
    select: { id: true, codeHash: true },
  });

  let matchedId: string | null = null;
  for (const c of candidates) {
    // bcrypt.compare is constant-time per hash
    // eslint-disable-next-line no-await-in-loop
    const ok = await bcrypt.compare(normalized, c.codeHash);
    if (ok && !matchedId) matchedId = c.id;
  }

  if (!matchedId) return false;

  await prisma.mfaRecoveryCode.update({
    where: { id: matchedId },
    data: { usedAt: new Date() },
  });
  return true;
}

/** Status for the security page — count of unused / used codes. */
export async function recoveryCodeStatus(userId: string): Promise<{
  total: number;
  remaining: number;
  generatedAt: Date | null;
}> {
  const codes = await prisma.mfaRecoveryCode.findMany({
    where: { userId },
    select: { usedAt: true, createdAt: true },
    orderBy: { createdAt: "asc" },
  });
  if (codes.length === 0) {
    return { total: 0, remaining: 0, generatedAt: null };
  }
  const remaining = codes.filter((c) => !c.usedAt).length;
  return {
    total: codes.length,
    remaining,
    generatedAt: codes[0].createdAt,
  };
}
