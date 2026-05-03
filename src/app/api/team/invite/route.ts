import { createHash, randomBytes } from "node:crypto";
import { z } from "zod";
import { getAuth } from "@/lib/auth/dual";
import { prisma } from "@/lib/db/prisma";
import { sendEmail } from "@/lib/notifications/email";
import { getPlan } from "@/lib/plans";
import { childLogger } from "@/lib/observability/logger";

const PostSchema = z.object({
  email: z.string().email(),
  role: z.enum(["viewer", "admin"]),
});

export async function POST(req: Request) {
  const session = await getAuth(req);
  if (!session?.user) return Response.json({ error: "Yetkisiz." }, { status: 401 });
  if (session.user.role !== "owner" && session.user.role !== "admin") {
    return Response.json({ error: "Yalnızca admin." }, { status: 403 });
  }

  const body = PostSchema.safeParse(await req.json());
  if (!body.success) return Response.json({ error: body.error.issues[0].message }, { status: 400 });

  const { email, role } = body.data;
  const log = childLogger({ component: "invite", tenantId: session.user.tenantId });

  const tenant = await prisma.tenant.findUnique({
    where: { id: session.user.tenantId },
    select: { plan: true, name: true, _count: { select: { users: true } } },
  });
  if (!tenant) return Response.json({ error: "Tenant bulunamadı." }, { status: 404 });

  const planLimits = getPlan(tenant.plan);
  const pendingCount = await prisma.invitation.count({
    where: { tenantId: session.user.tenantId, acceptedAt: null, expiresAt: { gt: new Date() } },
  });
  if (tenant._count.users + pendingCount >= planLimits.maxUsers) {
    return Response.json({
      error: `${tenant.plan} planında ${planLimits.maxUsers} kullanıcı limiti var. Plan yükseltin.`,
    }, { status: 402 });
  }

  const existing = await prisma.user.findUnique({ where: { email }, select: { id: true } });
  if (existing) return Response.json({ error: "Bu email kayıtlı." }, { status: 409 });

  const rawToken = randomBytes(32).toString("base64url");
  const tokenHash = createHash("sha256").update(rawToken).digest("hex");
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60_000);

  const invitation = await prisma.invitation.upsert({
    where: { tenantId_email: { tenantId: session.user.tenantId, email } },
    create: {
      tenantId: session.user.tenantId,
      email,
      role,
      invitedBy: session.user.id,
      tokenHash,
      expiresAt,
    },
    update: {
      role,
      tokenHash,
      expiresAt,
      acceptedAt: null,
    },
  });

  const acceptUrl = `${process.env.NEXTAUTH_URL ?? "https://erpaio.vercel.app"}/accept-invite?token=${rawToken}`;

  void sendEmail({
    to: email,
    subject: `${tenant.name} ekibine katılın · ERPAIO`,
    html: `<!doctype html><html><body style="margin:0;padding:24px;background:#07090F;color:#E8EDF5;font-family:monospace">
      <div style="max-width:480px;margin:0 auto;background:#0C1018;border:1px solid #131A26;border-radius:12px;padding:32px">
        <div style="color:#00E5FF;font-size:11px;letter-spacing:3px;margin-bottom:8px">ERPAIO</div>
        <h2 style="font-size:18px;margin:0 0 12px">${escapeHtml(tenant.name)} sizi davet etti</h2>
        <p style="color:#9AA5B4;font-size:13px;line-height:1.6">
          Rol: <strong style="color:#E8EDF5">${role}</strong><br>
          Davet 7 gün geçerli.
        </p>
        <a href="${acceptUrl}" style="display:inline-block;margin:20px 0;background:#00E5FF;color:#07090F;padding:12px 24px;border-radius:8px;text-decoration:none;font-weight:600;font-size:13px">Daveti kabul et →</a>
      </div>
    </body></html>`,
  });

  log.info({ invitationId: invitation.id, role }, "Invitation sent");
  return Response.json({ ok: true, invitationId: invitation.id });
}

function escapeHtml(s: string): string {
  return s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]!));
}
