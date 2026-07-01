import { createCipheriv, createDecipheriv, randomBytes } from "crypto";

const ALGO = "aes-256-gcm";

function parseKey(raw: string, label: string): Buffer {
  if (!/^[0-9a-fA-F]{64}$/.test(raw)) {
    throw new Error(`${label} 64-char hex (32 byte) formatında olmalı.`);
  }
  return Buffer.from(raw, "hex");
}

/**
 * Keys in decrypt-preference order: the current key first, then any previous
 * keys kept during a rotation window (ENCRYPTION_KEY_PREVIOUS, comma-separated
 * hex). encrypt() always uses the current key; decrypt() falls back through the
 * rest so ciphertext written before a rotation stays readable until it is
 * re-encrypted. Without ENCRYPTION_KEY_PREVIOUS this is identical to the
 * single-key behavior.
 */
function loadKeys(): Buffer[] {
  const current = process.env.ENCRYPTION_KEY;
  if (!current) {
    throw new Error("ENCRYPTION_KEY environment değişkeni tanımlı değil.");
  }
  const keys = [parseKey(current, "ENCRYPTION_KEY")];
  const previous = process.env.ENCRYPTION_KEY_PREVIOUS;
  if (previous) {
    for (const p of previous.split(",").map((s) => s.trim()).filter(Boolean)) {
      keys.push(parseKey(p, "ENCRYPTION_KEY_PREVIOUS"));
    }
  }
  return keys;
}

const KEYS = loadKeys();

export function encrypt(text: string): string {
  const iv = randomBytes(16);
  const cipher = createCipheriv(ALGO, KEYS[0], iv);
  const encrypted = Buffer.concat([cipher.update(text, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return [iv.toString("hex"), tag.toString("hex"), encrypted.toString("hex")].join(":");
}

export function decrypt(stored: string): string {
  const parts = stored.split(":");
  // Split-length guard: a plain/corrupt string with no ":" would otherwise
  // produce undefined iv/tag and a cryptic error. (Empty ciphertext IS valid —
  // encrypting "" yields an empty third part — so only the part COUNT is checked.)
  if (parts.length !== 3) {
    throw new Error("Şifreli veri formatı geçersiz (iv:tag:ciphertext bekleniyor).");
  }
  const [ivHex, tagHex, encHex] = parts;
  const iv = Buffer.from(ivHex, "hex");
  const tag = Buffer.from(tagHex, "hex");
  const enc = Buffer.from(encHex, "hex");

  // Try the current key first, then any rotation-window fallbacks. A wrong key
  // fails the GCM auth tag at final(), so we advance to the next candidate.
  for (const key of KEYS) {
    try {
      const decipher = createDecipheriv(ALGO, key, iv);
      decipher.setAuthTag(tag);
      return decipher.update(enc) + decipher.final("utf8");
    } catch {
      // try next key
    }
  }
  throw new Error(
    `Şifre çözme başarısız — anahtar rotasyonu yapıldıysa eski anahtar ` +
      `ENCRYPTION_KEY_PREVIOUS içinde tutulmalı (${KEYS.length} anahtar denendi).`,
  );
}
