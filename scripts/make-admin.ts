/**
 * Promote a user to admin.
 * Usage: bun run scripts/make-admin.ts <email-or-username>
 */
import { PrismaClient } from '@prisma/client'

const db = new PrismaClient()

async function main() {
  const target = process.argv[2]
  if (!target) {
    console.log('Usage: bun run scripts/make-admin.ts <email-or-username>')
    process.exit(1)
  }

  const user = await db.user.findFirst({
    where: {
      OR: [{ email: target.toLowerCase() }, { username: target.toLowerCase() }],
    },
  })

  if (!user) {
    console.log(`User "${target}" not found`)
    process.exit(1)
  }

  const updated = await db.user.update({
    where: { id: user.id },
    data: { isAdmin: true },
  })

  console.log(`✓ ${updated.name} (@${updated.username}) is now admin`)
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(() => db.$disconnect())
