import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

async function main() {
  const email = 'admin@crm.com' // Adjust if your admin email is different
  const newPassword = 'password123'
  const hashedPassword = await bcrypt.hash(newPassword, 10)

  const user = await prisma.user.upsert({
    where: { email },
    update: {
      password: hashedPassword,
    },
    create: {
      email,
      name: 'Super Admin',
      password: hashedPassword,
      role: 'ADMIN',
    },
  })
  
  console.log(`Password reset successfully for: ${email}`)
  console.log(`New Password is: ${newPassword}`)
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
