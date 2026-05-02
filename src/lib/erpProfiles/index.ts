import { parse as parseYaml } from "yaml";
import { NEBIM_V3_YAML } from "./profiles/nebim_v3";

const PROFILE_YAMLS: Record<string, string> = {
  nebim_v3: NEBIM_V3_YAML,
};

export interface ErpColumnDef {
  name: string;
  type?: string;
  meaning?: string;
  values?: Record<string, string>;
  default?: string;
}

export interface ErpRelation {
  with: string;
  on: string;
  type?: "one_to_one" | "one_to_many" | "many_to_one" | "many_to_many";
}

export interface ErpTableDef {
  description: string;
  aliases?: string[];
  important_columns: ErpColumnDef[];
  relationships?: ErpRelation[];
  primary_key?: string;
}

export interface ErpQueryPattern {
  q_pattern: string[];
  sql: string;
  explanation?: string;
}

export interface ErpProfile {
  name: string;
  slug: string;
  version_range?: string;
  language?: string;
  locale?: string;
  currency_default?: string;
  description?: string;
  canonical_tables: Record<string, ErpTableDef>;
  common_queries?: ErpQueryPattern[];
  glossary?: Record<string, string>;
  conventions?: string[];
}

const cache = new Map<string, ErpProfile>();

export function loadProfile(slug: string): ErpProfile | null {
  if (cache.has(slug)) return cache.get(slug)!;

  const text = PROFILE_YAMLS[slug];
  if (!text) return null;

  try {
    const profile = parseYaml(text) as ErpProfile;
    cache.set(slug, profile);
    return profile;
  } catch {
    return null;
  }
}

export function listProfiles(): string[] {
  return Object.keys(PROFILE_YAMLS);
}

export function profileToPromptContext(profile: ErpProfile): string {
  const lines: string[] = [];

  lines.push(`# ${profile.name} ERP Profile`);
  if (profile.description) lines.push(profile.description.trim(), "");

  if (profile.conventions && profile.conventions.length > 0) {
    lines.push("## ÖNEMLI KURALLAR");
    for (const c of profile.conventions) lines.push(`- ${c}`);
    lines.push("");
  }

  if (profile.glossary && Object.keys(profile.glossary).length > 0) {
    lines.push("## TÜRKÇE → TABLO/KOLON SÖZLÜK");
    for (const [k, v] of Object.entries(profile.glossary)) {
      lines.push(`- ${k}: ${v}`);
    }
    lines.push("");
  }

  lines.push("## ÖNEMLİ TABLOLAR");
  for (const [tableName, def] of Object.entries(profile.canonical_tables)) {
    lines.push(`### ${tableName} — ${def.description}`);
    if (def.aliases && def.aliases.length > 0) {
      lines.push(`Eş anlam: ${def.aliases.join(", ")}`);
    }
    lines.push("Kolonlar:");
    for (const col of def.important_columns) {
      const meaning = col.meaning ? ` — ${col.meaning}` : "";
      const values =
        col.values && Object.keys(col.values).length > 0
          ? ` { ${Object.entries(col.values).map(([k, v]) => `${k}=${v}`).join(", ")} }`
          : "";
      lines.push(`  - ${col.name} (${col.type ?? "?"})${meaning}${values}`);
    }
    if (def.relationships && def.relationships.length > 0) {
      lines.push("İlişkiler:");
      for (const r of def.relationships) {
        lines.push(`  - ${r.with} ON ${r.on} (${r.type ?? "ref"})`);
      }
    }
    lines.push("");
  }

  if (profile.common_queries && profile.common_queries.length > 0) {
    lines.push("## SIK SORULAN KALIPLAR (örnekler — yapı benzeri sorularda referans al)");
    for (const q of profile.common_queries) {
      lines.push(`Soru: ${q.q_pattern.join(" / ")}`);
      lines.push("```sql");
      lines.push(q.sql.trim());
      lines.push("```");
      if (q.explanation) lines.push(`Açıklama: ${q.explanation}`);
      lines.push("");
    }
  }

  return lines.join("\n");
}
