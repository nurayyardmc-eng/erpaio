import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db/prisma";
import { getSchema } from "@/lib/cache/schema";
import { validateSQL, detectInjection } from "@/lib/validators/sql";
import { queryERP } from "@/lib/db/connector";
import Anthropic from "@anthropic-ai/sdk";
import { z } from "zod";

const client = new Anthropic();

const BodySchema = z.object({
  question: z.string().min(1).max(500),
  connectionId: z.string(),
  sessionId: z.string().optional(),
});

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user) return Response.json({ error: "Yetkisiz." }, { status: 401 });

  const body = BodySchema.safeParse(await req.json());
  if (!body.success) return Response.json({ error: body.error.issues[0].message }, { status: 400 });

  const { question, connectionId, sessionId } = body.data;

  if (detectInjection(question)) return Response.json({ error: "Geçersiz soru." }, { status: 400 });

  const conn = await prisma.erpConnection.findFirst({
    where: { id: connectionId, tenantId: session.user.tenantId, status: "active" },
  });
  if (!conn) return Response.json({ error: "Aktif bağlantı bulunamadı." }, { status: 404 });

  const t0 = Date.now();
  let sql = "";

  try {
    const schema = await getSchema(connectionId);

    const msg = await client.messages.create({
      model: "claude-sonnet-4-20250514",
      max_tokens: 1024,
      system: `Sen bir SQL Server uzmanısın. Nebim V3 ERP veritabanı şemasına göre kullanıcının sorusunu SQL SELECT sorgusuna çevir.
KURAL: Sadece SQL döndür. Açıklama yazma. DROP/DELETE/UPDATE/INSERT yasak.
Türkçe karakterler için NVARCHAR ve N prefix kullan.

ŞEMA:
${schema}`,
      messages: [{ role: "user", content: question }],
    });

    const block = msg.content.find((b) => b.type === "text");
sql = (block && "text" in block ? block.text : "")?.trim() ?? "";

    validateSQL(sql);

    const rows = await queryERP(connectionId, sql);
    const columns = rows.length > 0 ? Object.keys(rows[0]) : [];
    const latencyMs = Date.now() - t0;

    // Geçmişe kaydet
    let sid = sessionId;
    if (!sid) {
      const s = await prisma.chatSession.create({
        data: { tenantId: session.user.tenantId, userId: session.user.id },
      });
      sid = s.id;
    }
    await prisma.chatMessage.createMany({
      data: [
        { sessionId: sid, role: "user", content: question },
        { sessionId: sid, role: "assistant", content: sql, sqlQuery: sql, rowCount: rows.length, latencyMs, success: true },
      ],
    });

    return Response.json({ sql, results: rows.slice(0, 500), columns, total: rows.length, latencyMs, sessionId: sid });

  } catch (e: any) {
    if (e.name === "SQLValidationError") return Response.json({ error: e.message, sql }, { status: 400 });
    if (e.name === "AIError") return Response.json({ error: "Soru SQL'e çevrilemedi." }, { status: 502 });
    return Response.json({ error: "Sorgu çalıştırılamadı.", detail: e.message }, { status: 500 });
  }
}