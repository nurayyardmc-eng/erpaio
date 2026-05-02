import { TOTP, Secret } from "otpauth";
import { encrypt, decrypt } from "@/lib/crypto/encrypt";

const ISSUER = "ERPAIO";
const PERIOD = 30;
const DIGITS = 6;

export function generateSecret(): { base32: string; encrypted: string } {
  const secret = new Secret({ size: 20 });
  return { base32: secret.base32, encrypted: encrypt(secret.base32) };
}

export function provisioningUri(email: string, base32: string): string {
  const totp = new TOTP({
    issuer: ISSUER,
    label: email,
    algorithm: "SHA1",
    digits: DIGITS,
    period: PERIOD,
    secret: Secret.fromBase32(base32),
  });
  return totp.toString();
}

export function verifyCode(secretEncrypted: string, code: string): boolean {
  if (!/^\d{6}$/.test(code)) return false;
  try {
    const base32 = decrypt(secretEncrypted);
    const totp = new TOTP({
      issuer: ISSUER,
      algorithm: "SHA1",
      digits: DIGITS,
      period: PERIOD,
      secret: Secret.fromBase32(base32),
    });
    const delta = totp.validate({ token: code, window: 1 });
    return delta !== null;
  } catch {
    return false;
  }
}
