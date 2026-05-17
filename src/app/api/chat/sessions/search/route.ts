import { z } from "zod";
import { getAuth } from "@/lib/auth/dual";
import { prisma } from "@/lib/db/prisma";
import { jsonError } from "@/lib/i18n/server";
import { parseQuery, zNumber } from "@/lib/http/searchParams";
import { extractSnippet, normalizeSearchQuery } from "@/lib/chat/searchSnippet";

/**
 * Sohbet geçmişi arama — tenant + userId scope'lu (yalnızca kullanıcının
 * KENDİ sohbetleri). Arama hem ChatSession.title hem ChatMessage.content
 * üzerinde yapılır; eşleşen mesaj snippet olarak döner (UI highlight için
 * matchStart + matchLength dahil).
 *
 * Boş veya <2 char query → 400. Max 80 char (DoS guard).
 * Postgres ILIKE (Prisma `mode: insensitive`) — büyük tablolar için ileride
 * pg_trgm GIN index düşünülebilir; şimdilik per-user mesaj sayısı düşük.
 */
const QuerySchema = z.object({
  q: z.string().min(1).max(120),
  limit: zNumber({ min: 1, max: 50, default: 20, int: true }),
});

export async function GET(req: Request) {
  const session = await getAuth(req);
  if (!session?.user) return jsonError(req, "api.unauthorized", 401);

  const parsed = parseQuery(req, QuerySchema);
  if (parsed instanceof Response) return parsed;

  const norm = normalizeSearchQuery(parsed.q);
  if (!norm) {
    return Response.json({ q: parsed.q, results: [] });
  }

  // İlk olarak title match: sessions ←→ kendi userId.
  // Sonra body match: ChatMessage.content içinde geçen → session'a katla.
  // Her iki sonucu dedupe ederek tek listede dönüyoruz, en yeni updatedAt'e
  // göre sıralı.

  const tenantUserScope = {
    tenantId: session.user.tenantId,
    userId: session.user.id,
  } as const;

  // 1) Title match
  const titleHits = await prisma.chatSession.findMany({
    where: {
      ...tenantUserScope,
      title: { contains: norm, mode: "insensitive" },
    },
    orderBy: { createdAt: "desc" },
    take: parsed.limit,
    select: {
      id: true,
      title: true,
      createdAt: true,
      archivedAt: true,
      _count: { select: { messages: true } },
    },
  });

  // 2) Body match — message içinde geçen → session id'sini topla.
  // Aynı session için birden fazla mesaj eşleşirse SADECE EN ESKİ user
  // mesajını snippet olarak alıyoruz (deterministik + UI'da en bağlamlı).
  const bodyHitMessages = await prisma.chatMessage.findMany({
    where: {
      content: { contains: norm, mode: "insensitive" },
      session: tenantUserScope,
    },
    orderBy: { createdAt: "asc" },
    take: parsed.limit * 4, // birden fazla mesaj aynı session'a katlanabilir
    select: {
      id: true,
      content: true,
      sessionId: true,
      role: true,
      createdAt: true,
      session: {
        select: {
          id: true,
          title: true,
          createdAt: true,
          archivedAt: true,
          _count: { select: { messages: true } },
        },
      },
    },
  });

  // Dedupe — title hit ve body hit aynı session id'siyle çakışabilir.
  // Title hit önceliklidir (kullanıcı session adında geçeni daha kolay görür).
  const seen = new Set<string>();
  type SearchResult = {
    id: string;
    title: string | null;
    createdAt: Date;
    archivedAt: Date | null;
    messageCount: number;
    matchType: "title" | "body";
    snippet: string | null;
    matchStart: number;
    matchLength: number;
  };
  const results: SearchResult[] = [];

  for (const s of titleHits) {
    seen.add(s.id);
    results.push({
      id: s.id,
      title: s.title,
      createdAt: s.createdAt,
      archivedAt: s.archivedAt,
      messageCount: s._count.messages,
      matchType: "title",
      snippet: null, // title eşleşmesi — body snippet'a gerek yok
      matchStart: -1,
      matchLength: 0,
    });
  }

  for (const m of bodyHitMessages) {
    if (seen.has(m.sessionId)) continue;
    seen.add(m.sessionId);
    const snip = extractSnippet(m.content, norm);
    results.push({
      id: m.sessionId,
      title: m.session.title,
      createdAt: m.session.createdAt,
      archivedAt: m.session.archivedAt,
      messageCount: m.session._count.messages,
      matchType: "body",
      snippet: snip.text,
      matchStart: snip.matchStart,
      matchLength: snip.matchLength,
    });
    if (results.length >= parsed.limit) break;
  }

  return Response.json({
    q: norm,
    results: results.slice(0, parsed.limit),
  });
}
