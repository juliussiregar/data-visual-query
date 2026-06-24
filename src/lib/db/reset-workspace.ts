import { getPrisma } from "@/lib/db/prisma";

/** Hapus semua data workspace (project, sheet, layout, DB) — akun login tetap ada. */
export async function resetUserWorkspace(userId: string) {
  const prisma = getPrisma();
  await prisma.$transaction([
    prisma.project.deleteMany({ where: { userId } }),
    prisma.userSheetConnection.deleteMany({ where: { userId } }),
    prisma.userLayout.deleteMany({ where: { userId } }),
    prisma.userDbConnection.deleteMany({ where: { userId } }),
  ]);
}

export async function resetAllWorkspaces() {
  const prisma = getPrisma();
  await prisma.$transaction([
    prisma.project.deleteMany(),
    prisma.userSheetConnection.deleteMany(),
    prisma.userLayout.deleteMany(),
    prisma.userDbConnection.deleteMany(),
  ]);
}
