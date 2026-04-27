const ALLOWED = /^\s*(SELECT|WITH)/i;
const BLOCKED = [
  /\b(DROP|DELETE|UPDATE|INSERT|TRUNCATE|ALTER|CREATE|EXEC|EXECUTE|MERGE)\b/i,
  /;\s*\w/,
  /--/,
  /\/\*/,
  /xp_/i,
  /OPENROWSET/i,
  /BULK\s+INSERT/i,
];

const INJECTION = [
  /ignore (previous|above|all) instructions/i,
  /forget (your|the) (system|previous)/i,
  /you are now/i,
  /new (role|persona|character)/i,
];

export function validateSQL(sql: string): void {
  if (!ALLOWED.test(sql)) {
    throw Object.assign(
      new Error("Sadece SELECT sorguları çalıştırılabilir."),
      { name: "SQLValidationError" }
    );
  }
  for (const p of BLOCKED) {
    if (p.test(sql)) {
      throw Object.assign(
        new Error("Güvensiz SQL tespit edildi."),
        { name: "SQLValidationError" }
      );
    }
  }
}

export function detectInjection(question: string): boolean {
  return INJECTION.some((p) => p.test(question));
}
