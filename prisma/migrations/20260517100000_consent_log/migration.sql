-- CreateTable
CREATE TABLE "ConsentLog" (
    "id" TEXT NOT NULL,
    "userId" TEXT,
    "tenantId" TEXT,
    "email" TEXT,
    "consentType" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "documentVer" TEXT,
    "ipAddress" TEXT,
    "userAgent" TEXT,
    "context" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ConsentLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ConsentLog_userId_createdAt_idx" ON "ConsentLog"("userId", "createdAt");

-- CreateIndex
CREATE INDEX "ConsentLog_tenantId_createdAt_idx" ON "ConsentLog"("tenantId", "createdAt");

-- CreateIndex
CREATE INDEX "ConsentLog_consentType_createdAt_idx" ON "ConsentLog"("consentType", "createdAt");

-- AddForeignKey
ALTER TABLE "ConsentLog" ADD CONSTRAINT "ConsentLog_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ConsentLog" ADD CONSTRAINT "ConsentLog_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE SET NULL ON UPDATE CASCADE;
