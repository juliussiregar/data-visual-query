import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const [projects, sheets, layouts, dbs] = await prisma.$transaction([
    prisma.project.deleteMany(),
    prisma.userSheetConnection.deleteMany(),
    prisma.userLayout.deleteMany(),
    prisma.userDbConnection.deleteMany(),
  ]);

  console.log("Workspace data direset:");
  console.log(`  - ${projects.count} project`);
  console.log(`  - ${sheets.count} sheet tersimpan`);
  console.log(`  - ${layouts.count} layout dashboard`);
  console.log(`  - ${dbs.count} koneksi database`);
  console.log("");
  console.log("Akun login (admin/superadmin) tidak dihapus.");
  console.log("Setelah ini: hard refresh browser (Cmd+Shift+R) untuk bersihkan cache lokal.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
