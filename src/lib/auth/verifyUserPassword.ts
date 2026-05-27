/**
 * Verify a plaintext password against the DB hash for a user.
 *
 * Track XXXXXXXXXXX — me/password + tenant/delete AYNI lookup + compare
 * pattern yapiyordu:
 *   const user = await prisma.user.findUnique({
 *     where: { id }, select: { passwordHash: true },
 *   });
 *   if (!user) return userNotFoundError(req);
 *   const valid = await bcrypt.compare(plain, user.passwordHash);
 *   if (!valid) return <message>;
 *
 * SECURITY: bcrypt.compare + lookup tek noktada — timing-attack
 * surface aynı (bcrypt zaten constant-time). Future iyilestirme
 * (hash algoritmasi guncellemesi, argon2 migration vb) tek dosyada.
 *
 * Return type sentinel string'lerle: caller her sonuca farkli HTTP
 * status / mesaj donmek isteyebilir. Generic Response factory
 * yapmak yerine durum kodu doneriz, caller localized response uretir.
 */
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/db/prisma";

export type VerifyPasswordResult = "ok" | "not_found" | "wrong";

export async function verifyUserPassword(
  userId: string,
  plainPassword: string,
): Promise<VerifyPasswordResult> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { passwordHash: true },
  });
  if (!user) return "not_found";
  const valid = await bcrypt.compare(plainPassword, user.passwordHash);
  return valid ? "ok" : "wrong";
}
