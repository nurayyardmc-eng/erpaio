/**
 * Hash a plaintext password with bcrypt at canonical work factor.
 *
 * Track YYYYYYYYYYY — 4 site AYNI `bcrypt.hash(password, 12)` cagrisi
 * yapiyordu (signup, reset-password, me/password, team/accept-invite).
 * Work factor `12` magic number iken constant + helper'la tek noktada
 * tutuluyor — gelecekteki algoritma yukseltmesi (argon2id, vb) ya da
 * cost ayari tek dosyada uygulanir.
 *
 * 12 secimi: OWASP 2023 rehberi minimum 10, gunumuz CPU'larinda <500ms
 * (production safe). 14+ tipik signup latency'yi 1s'ye iter; 12 sweet
 * spot.
 *
 * SECURITY NOT: bcrypt-only (sha256-prefix layer yok). 72-byte limit'i
 * pratik password'lerden cok daha buyuk; zod schema'lar `.max(72)`
 * gerek tutmuyor (UI 64 char cap zaten).
 */
import bcrypt from "bcryptjs";

export const PASSWORD_HASH_ROUNDS = 12;

export async function hashPassword(plain: string): Promise<string> {
  return await bcrypt.hash(plain, PASSWORD_HASH_ROUNDS);
}
