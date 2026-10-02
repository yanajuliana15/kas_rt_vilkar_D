const { PrismaClient } = require("@prisma/client");
const { PrismaClient: SQLiteClient } = require("../node_modules/.prisma/sqlite-client");

const neon = new PrismaClient();
const sqlite = new SQLiteClient();

async function main() {
  const users = await sqlite.adminUser.findMany();

  console.log("Jumlah akun dari database lama:", users.length);

  for (const user of users) {
    await neon.adminUser.upsert({
      where: {
        username: user.username,
      },
      update: {
        password: user.password,
        role: user.role,
        nama: user.nama,
        aktif: user.aktif,
      },
      create: {
        id: user.id,
        username: user.username,
        password: user.password,
        role: user.role,
        nama: user.nama,
        aktif: user.aktif,
        createdAt: user.createdAt,
        updatedAt: user.updatedAt,
      },
    });

    console.log("Berhasil dipindahkan:", user.username);
  }

  console.log("SELESAI");
}

main()
  .catch((error) => {
    console.error("ERROR:", error);
    process.exit(1);
  })
  .finally(async () => {
    await sqlite.$disconnect();
    await neon.$disconnect();
  });
