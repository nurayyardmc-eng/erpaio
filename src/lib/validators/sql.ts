const ALLOWED = /^\s*(SELECT|WITH)/i;

const BLOCKED = [
  /\b(DROP|DELETE|UPDATE|INSERT|TRUNCATE|ALTER|CREATE|EXEC|EXECUTE|MERGE|GRANT|REVOKE|DENY|BACKUP|RESTORE|SHUTDOWN|RECONFIGURE|DBCC)\b/i,
  /\bWAITFOR\s+(DELAY|TIME)\b/i,
  /\bsp_(executesql|configure|trace|password|adduser|addlogin|addrole|delete_alert|cmdshell|OACreate|OAMethod)\b/i,
  /\bxp_/i,
  /\bsys\.fn_/i,
  /;\s*\w/,
  /--/,
  /\/\*/,
  /\bOPENROWSET\b/i,
  /\bOPENDATASOURCE\b/i,
  /\bOPENQUERY\b/i,
  /\bBULK\s+INSERT\b/i,
  /\bINTO\s+OUTFILE\b/i,
  /\bLOAD_FILE\b/i,
];

const INJECTION = [
  /ignore (previous|above|all) instructions/i,
  /forget (your|the) (system|previous)/i,
  /you are now/i,
  /new (role|persona|character)/i,
  /disregard (previous|prior)/i,
  /override (your|the) instructions/i,
  /\bjailbreak\b/i,
  /\bDAN mode\b/i,

  /önceki (talimatları|yönergeleri|kuralları)/i,
  /(talimatları|yönergeleri|kuralları) (yok\s*say|unut|sil|gör\s*ardı\s*et)/i,
  /(sistem|asistan)\s+(mesaj|prompt|talimat)/i,
  /\b(artık|bundan böyle|şu andan itibaren)\s+(bir|sen)\b/i,
  /yeni\s+(rol|kişilik|karakter|kimlik)/i,
  /görevini\s+(unut|değiştir|yok\s*say)/i,
  /şu\s+anki\s+rolünü/i,
];

export function validateSQL(sql: string): void {
  if (!ALLOWED.test(sql)) {
    throw Object.assign(
      new Error("Sadece SELECT sorguları çalıştırılabilir."),
      { name: "SQLValidationError" },
    );
  }
  for (const p of BLOCKED) {
    if (p.test(sql)) {
      throw Object.assign(
        new Error("Güvensiz SQL tespit edildi."),
        { name: "SQLValidationError" },
      );
    }
  }
}

export function detectInjection(question: string): boolean {
  return INJECTION.some((p) => p.test(question));
}
