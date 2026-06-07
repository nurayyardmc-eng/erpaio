// Sprint P29 — connection config export (backup).
//
// Returns the tenant's connection metadata as a JSON backup. SECURITY:
// passwordEnc is never selected, so credentials cannot leak into the
// backup file. Restore re-prompts for the password client-side.

import { getAuth } from "@/lib/auth/dual";
import { jsonError } from "@/lib/i18n/server";
import { prisma } from "@/lib/db/prisma";
import { buildConfigExport } from "@/lib/connections/configExport";
import { jsonDownloadResponse } from "@/lib/http/download";

export async function GET(req: Request) {
  const session = await getAuth(req);
  if (!session?.user) return jsonError(req, "api.unauthorized", 401);

  const rows = await prisma.erpConnection.findMany({
    where: { tenantId: session.user.tenantId },
    select: {
      erpType: true,
      erpProfile: true,
      host: true,
      port: true,
      dbName: true,
      username: true,
      // passwordEnc deliberately excluded.
    },
    orderBy: { createdAt: "asc" },
  });

  const payload = buildConfigExport(rows);
  // no-store added via jsonDownloadResponse — a credentials-adjacent backup
  // should not be cached, matching the other export endpoints.
  return jsonDownloadResponse(payload, "erpaio-connections.json");
}
