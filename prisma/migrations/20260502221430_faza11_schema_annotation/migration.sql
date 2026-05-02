-- CreateTable
CREATE TABLE "SchemaAnnotation" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "tableName" TEXT NOT NULL,
    "columnName" TEXT,
    "description" TEXT,
    "hidden" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SchemaAnnotation_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "SchemaAnnotation_tenantId_idx" ON "SchemaAnnotation"("tenantId");

-- CreateIndex
CREATE UNIQUE INDEX "SchemaAnnotation_tenantId_tableName_columnName_key" ON "SchemaAnnotation"("tenantId", "tableName", "columnName");
