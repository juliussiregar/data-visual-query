import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

const SEED_USERS = [
  { username: "admin", name: "Administrator", role: "admin" as const },
  { username: "superadmin", name: "Super Admin", role: "admin" as const },
] as const;

const SEED_PASSWORD = "admin123";

async function main() {
  const passwordHash = await bcrypt.hash(SEED_PASSWORD, 10);

  for (const user of SEED_USERS) {
    await prisma.user.upsert({
      where: { username: user.username },
      update: { passwordHash, name: user.name, role: user.role },
      create: {
        username: user.username,
        passwordHash,
        name: user.name,
        role: user.role,
      },
    });
  }

  console.log("Seed selesai (hanya akun app):");
  for (const user of SEED_USERS) {
    console.log(`  - ${user.username} / ${SEED_PASSWORD} (${user.role})`);
  }
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
