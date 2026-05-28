-- Feature 7 — iyzico (TR market) provider IDs + paymentProvider discriminator.
ALTER TABLE "Tenant" ADD COLUMN "iyzicoCustomerId" TEXT;
ALTER TABLE "Tenant" ADD COLUMN "iyzicoSubscriptionId" TEXT;
ALTER TABLE "Tenant" ADD COLUMN "paymentProvider" TEXT;

CREATE UNIQUE INDEX "Tenant_iyzicoCustomerId_key" ON "Tenant"("iyzicoCustomerId");
CREATE UNIQUE INDEX "Tenant_iyzicoSubscriptionId_key" ON "Tenant"("iyzicoSubscriptionId");
