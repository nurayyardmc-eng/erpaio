/**
 * Assemble all chat prompt context strings in parallel.
 *
 * Track VVVVVVVVVV — chat/route ve chat/stream/route AYNI 5-satirlik
 * context-building blogu yapiyordu (cache-miss path):
 *   const schema = await getSchema(connectionId);
 *   const profileContext = erpProfile ? profileToPromptContext(erpProfile) : "";
 *   const sampleContext = erpProfile
 *     ? sampleRowsToPromptContext(await getSampleRows(connectionId, erpProfile))
 *     : "";
 *   const annotationsContext = annotationsToPromptContext(await getAnnotations(tenantId));
 *   const erpName = erpProfile?.name ?? "ERP";
 *
 * Sequential await yerine Promise.all ile parallelize: schema +
 * sampleRows + annotations bagimsiz I/O. Cache-warm durumunda fark
 * etmez ama cold-cache'de (yeni tenant) gozle gorulur latency tasarrufu.
 *
 * `erpProfile` null oldugunda profile/sample context bos string —
 * caller'in dialect rules + canonical tables yine de sistem prompt'una
 * yazmasi gerektigi varsayilir.
 */
import { getSchema } from "@/lib/cache/schema";
import { getSampleRows, sampleRowsToPromptContext } from "@/lib/cache/sampleRows";
import { getAnnotations, annotationsToPromptContext } from "@/lib/cache/annotations";
import { profileToPromptContext, type ErpProfile } from "@/lib/erpProfiles";

export interface ChatPromptContext {
  /** ERP DB schema dump (`getSchema` returns string). */
  schema: string;
  /** ERP profile canonical-tables/columns/relations block — empty if profile is null. */
  profileContext: string;
  /** Sample rows from profile-marked tables — empty if profile is null. */
  sampleContext: string;
  /** Tenant-specific annotations block. */
  annotationsContext: string;
  /** Human-readable ERP name for system prompt ("Nebim V3", etc.). Falls back to "ERP". */
  erpName: string;
}

export async function buildChatPromptContext(
  connectionId: string,
  erpProfile: ErpProfile | null,
  tenantId: string,
): Promise<ChatPromptContext> {
  const [schema, sampleRows, annotations] = await Promise.all([
    getSchema(connectionId),
    erpProfile ? getSampleRows(connectionId, erpProfile) : Promise.resolve(null),
    getAnnotations(tenantId),
  ]);

  return {
    schema,
    profileContext: erpProfile ? profileToPromptContext(erpProfile) : "",
    sampleContext: sampleRows ? sampleRowsToPromptContext(sampleRows) : "",
    annotationsContext: annotationsToPromptContext(annotations),
    erpName: erpProfile?.name ?? "ERP",
  };
}
