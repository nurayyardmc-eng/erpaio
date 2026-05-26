import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/lib/db/prisma", () => ({
  prisma: {
    tenantIntegration: {
      findMany: vi.fn(),
      update: vi.fn(),
    },
  },
}));
vi.mock("@/lib/crypto/encrypt", () => ({
  decrypt: vi.fn((s: string) => s.replace(/^enc:/, "")),
}));
vi.mock("./slack", () => ({ sendSlack: vi.fn().mockResolvedValue({ ok: true }) }));
vi.mock("./teams", () => ({ sendTeams: vi.fn().mockResolvedValue({ ok: true }) }));
vi.mock("./genericWebhook", () => ({ sendWebhook: vi.fn().mockResolvedValue({ ok: true }) }));

import { dispatchAlert } from "./integrations";
import { prisma } from "@/lib/db/prisma";
import { sendSlack } from "./slack";
import { sendTeams } from "./teams";
import { sendWebhook } from "./genericWebhook";

const sampleAlert = {
  id: "a_1",
  type: "anomaly",
  severity: "high",
  title: "Sample alert",
  description: "desc",
};

describe("notifications/integrations/dispatchAlert", () => {
  beforeEach(() => {
    vi.mocked(prisma.tenantIntegration.findMany).mockReset();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    vi.mocked(prisma.tenantIntegration.update).mockReset().mockResolvedValue({} as any);
    vi.mocked(sendSlack).mockReset().mockResolvedValue({ ok: true });
    vi.mocked(sendTeams).mockReset().mockResolvedValue({ ok: true });
    vi.mocked(sendWebhook).mockReset().mockResolvedValue({ ok: true });
  });

  it("no integrations → no-op", async () => {
    vi.mocked(prisma.tenantIntegration.findMany).mockResolvedValueOnce([]);
    await dispatchAlert("t_1", sampleAlert);
    expect(sendSlack).not.toHaveBeenCalled();
    expect(sendTeams).not.toHaveBeenCalled();
    expect(sendWebhook).not.toHaveBeenCalled();
  });

  it("scoped to tenant + enabled (multi-tenant boundary)", async () => {
    vi.mocked(prisma.tenantIntegration.findMany).mockResolvedValueOnce([]);
    await dispatchAlert("t_1", sampleAlert);
    expect(prisma.tenantIntegration.findMany).toHaveBeenCalledWith({
      where: { tenantId: "t_1", enabled: true },
      select: expect.any(Object),
    });
  });

  it("dispatches to slack integration", async () => {
    vi.mocked(prisma.tenantIntegration.findMany).mockResolvedValueOnce([
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      { id: "i_1", kind: "slack", endpointEnc: "enc:https://slack.test/x", secretEnc: null } as any,
    ]);
    await dispatchAlert("t_1", sampleAlert);
    expect(sendSlack).toHaveBeenCalledWith({
      webhookUrl: "https://slack.test/x",
      severity: "high",
      title: "Sample alert",
      description: "desc",
    });
  });

  it("dispatches to teams integration", async () => {
    vi.mocked(prisma.tenantIntegration.findMany).mockResolvedValueOnce([
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      { id: "i_2", kind: "teams", endpointEnc: "enc:https://teams.test/y", secretEnc: null } as any,
    ]);
    await dispatchAlert("t_1", sampleAlert);
    expect(sendTeams).toHaveBeenCalledTimes(1);
  });

  it("dispatches to generic webhook with decrypted secret", async () => {
    vi.mocked(prisma.tenantIntegration.findMany).mockResolvedValueOnce([
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      { id: "i_3", kind: "webhook", endpointEnc: "enc:https://wh.test/z", secretEnc: "enc:s3cret" } as any,
    ]);
    await dispatchAlert("t_1", sampleAlert);
    expect(sendWebhook).toHaveBeenCalledWith({
      url: "https://wh.test/z",
      secret: "s3cret",
      event: "alert.created",
      data: expect.any(Object),
    });
  });

  it("success → updates lastSuccessAt + clears lastError", async () => {
    vi.mocked(prisma.tenantIntegration.findMany).mockResolvedValueOnce([
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      { id: "i_1", kind: "slack", endpointEnc: "enc:url", secretEnc: null } as any,
    ]);
    vi.mocked(sendSlack).mockResolvedValueOnce({ ok: true });
    await dispatchAlert("t_1", sampleAlert);
    const call = vi.mocked(prisma.tenantIntegration.update).mock.calls[0][0];
    expect(call.data.lastSuccessAt).toBeInstanceOf(Date);
    expect(call.data.lastError).toBeNull();
  });

  it("failure → updates lastError + lastErrorAt", async () => {
    vi.mocked(prisma.tenantIntegration.findMany).mockResolvedValueOnce([
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      { id: "i_1", kind: "slack", endpointEnc: "enc:url", secretEnc: null } as any,
    ]);
    vi.mocked(sendSlack).mockResolvedValueOnce({ ok: false });
    await dispatchAlert("t_1", sampleAlert);
    const call = vi.mocked(prisma.tenantIntegration.update).mock.calls[0][0];
    expect(call.data.lastError).toBe("non-2xx");
    expect(call.data.lastErrorAt).toBeInstanceOf(Date);
  });

  it("decrypt throw → silently logged, no crash", async () => {
    vi.mocked(prisma.tenantIntegration.findMany).mockResolvedValueOnce([
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      { id: "i_1", kind: "slack", endpointEnc: "enc:url", secretEnc: null } as any,
    ]);
    vi.mocked(sendSlack).mockRejectedValueOnce(new Error("network"));
    // Should not throw; Promise.allSettled catches each
    await expect(dispatchAlert("t_1", sampleAlert)).resolves.toBeUndefined();
  });

  it("unknown kind → silently skipped", async () => {
    vi.mocked(prisma.tenantIntegration.findMany).mockResolvedValueOnce([
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      { id: "i_x", kind: "imaginary" as never, endpointEnc: "enc:url", secretEnc: null } as any,
    ]);
    await dispatchAlert("t_1", sampleAlert);
    expect(sendSlack).not.toHaveBeenCalled();
    expect(sendTeams).not.toHaveBeenCalled();
    expect(sendWebhook).not.toHaveBeenCalled();
  });
});
