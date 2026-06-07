// Sprint P29 — connection config export (backup).
//
// Returns the tenant's connection metadata as a JSON backup. SECURITY:
// passwordEnc is never selected, so credentials cannot leak into the
// backup file. Restore re-prompts for the password client-side.

import { getAuth } from "@/lib/auth/dual";
import { jsonError } from "@/lib/i18n/server";
import { prisma } from "@/lib/db/prisma";
import { buildConfigExport } from "@/lib/connections/configExport";

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
  return new Response(JSON.stringify(payload, null, 2), {
    status: 200,
    headers: {
      "Content-Type": "application/json",
      "Content-Disposition": 'attachment; filename="erpaio-connections.json"',
    },
  });
}
