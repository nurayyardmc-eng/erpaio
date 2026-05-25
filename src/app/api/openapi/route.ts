import { readFile } from "node:fs/promises";
import path from "node:path";
import { parse as parseYaml } from "yaml";
import { wantsYamlFormat } from "@/lib/http/contentNegotiation";

export const runtime = "nodejs";
// force-dynamic: post-deploy YAML değişikliklerini anında yansıt (ISR cache
// yerine her request'te oku). Cache-Control: public, max-age=300 ile edge
// cache 5 dakika tutar — bu kabul edilebilir staleness.
export const dynamic = "force-dynamic";

/**
 * Public OpenAPI 3.0 spec — third-party developers + Postman/Insomnia import için.
 *
 * Canonical source: public/openapi.yaml (human-edited).
 * Bu endpoint default'ta JSON döner; `?format=yaml` query ile YAML alır.
 * `Accept: text/yaml` ya da `Accept: application/yaml` da YAML döndürür.
 */
export async function GET(req: Request) {
  let yaml: string;
  try {
    const filePath = path.join(process.cwd(), "public", "openapi.yaml");
    yaml = await readFile(filePath, "utf-8");
  } catch {
    return Response.json({ error: "OpenAPI spec not available." }, { status: 500 });
  }

  if (wantsYamlFormat(req)) {
    return new Response(yaml, {
      headers: {
        "Content-Type": "application/yaml; charset=utf-8",
        "Cache-Control": "public, max-age=300",
        "Access-Control-Allow-Origin": "*",
      },
    });
  }

  try {
    const spec = parseYaml(yaml) as unknown;
    return Response.json(spec, {
      headers: {
        "Cache-Control": "public, max-age=300",
        "Access-Control-Allow-Origin": "*",
      },
    });
  } catch {
    return Response.json({ error: "Failed to parse OpenAPI spec." }, { status: 500 });
  }
}
