import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  console.log('--- Phase 4 Data Structure Fix (Account-Led SaaS Bridge) ---')

  // 1. Create a Primary System Account if none exists
  // We need at least one account to link old data to.
  const adminEmail = process.env.SUPER_ADMIN_EMAIL || "admin@crm.com"
  const superAdmin = await prisma.user.findUnique({ where: { email: adminEmail } })

  if (!superAdmin) {
    console.log('❌ Super Admin not found. Please run seed-superadmin.ts first.')
    return
  }

  let systemAccount = await (prisma as any).subscriptionAccount.findFirst({
    where: { ownerId: superAdmin.id }
  })

  if (!systemAccount) {
    systemAccount = await (prisma as any).subscriptionAccount.create({
      data: {
        name: 'Legacy System Account',
        ownerId: superAdmin.id,
        planTier: 'ENTERPRISE',
        activeSeats: 1000,
        hasPaymentSetup: true
      }
    })
    console.log(`✅ Created Primary Account: ${systemAccount.name}`)
  }

  // 2. Link all existing Users without an account to this System Account
  const usersUpdated = await (prisma as any).user.updateMany({
    where: { accountId: null },
    data: { 
        accountId: systemAccount.id,
        isAccountOwner: false // Only SuperAdmin is the true system owner
    }
  })
  console.log(`✅ Linked ${usersUpdated.count} users to the primary account.`)

  // Ensure Super Admin is marked as owner
  await prisma.user.update({
    where: { id: superAdmin.id },
    data: { isAccountOwner: true }
  })

  // 3. Link all existing Workspaces without an account
  const workspacesUpdated = await (prisma as any).workspace.updateMany({
    where: { accountId: null },
    data: { accountId: systemAccount.id }
  })
  console.log(`✅ Linked ${workspacesUpdated.count} workspaces to the primary account.`)

  // 4. Fix "Creator" fields for Leads, Deals, Organizations
  // If createdById is null, we set it to the ownerId so users can still edit their records.
  
  // Leads
  const leadsToFix = await prisma.lead.findMany({ where: { createdById: null } })
  for (const lead of leadsToFix) {
    await prisma.lead.update({
      where: { id: lead.id },
      data: { createdById: lead.ownerId }
    })
  }
  console.log(`✅ Patched ${leadsToFix.length} Leads with creator IDs.`)

  // Deals
  const dealsToFix = await prisma.deal.findMany({ where: { createdById: null } })
  for (const deal of dealsToFix) {
    await prisma.deal.update({
      where: { id: deal.id },
      data: { createdById: deal.ownerId }
    })
  }
  console.log(`✅ Patched ${dealsToFix.length} Deals with creator IDs.`)

  // Organizations
  const orgsToFix = await prisma.organization.findMany({ where: { createdById: null } })
  for (const org of orgsToFix) {
    await prisma.organization.update({
      where: { id: org.id },
      data: { createdById: org.ownerId }
    })
  }
  console.log(`✅ Patched ${orgsToFix.length} Organizations with creator IDs.`)

  console.log('--- DATA FIX COMPLETE ---')
  console.log('Historical data is now compatible with Phase 4 (Account-Led) architecture.')
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
