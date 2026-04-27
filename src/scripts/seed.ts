import { prisma } from "../lib/db/prisma";
import bcrypt from "bcryptjs";

async function main() {
  const passwordHash = await bcrypt.hash("Erpaio2024", 10);

  const tenant = await prisma.tenant.create({
    data: {
      name: "Test Sirket",
      slug: "test-sirket",
      plan: "starter",
    },
  });

  const user = await prisma.user.create({
    data: {
      tenantId: tenant.id,
      email: "admin@erpaio.com",
      passwordHash,
      name: "Admin",
      role: "admin",
    },
  });

  console.log("Kullanici olusturuldu:", user.email);
  console.log("Tenant olusturuldu:", tenant.name);
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
