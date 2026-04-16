// backend/src/prisma/fixExistingUsers.ts
// Run this ONCE to mark all existing users as verified
// so they don't get locked out after the update
// Command: npx ts-node src/prisma/fixExistingUsers.ts

import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const result = await prisma.user.updateMany({
    where: { isVerified: false },
    data:  { isVerified: true },
  });

  console.log(`✅ Marked ${result.count} existing users as verified.`);
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());