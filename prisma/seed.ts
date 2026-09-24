import { PrismaClient, PlatformRole, OrgRole, ProjectStatus } from '@prisma/client'
import * as bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

async function main() {
  const adminPassword = await bcrypt.hash('admin123', 10)
  const demoPassword = await bcrypt.hash('demo123', 10)

  console.log('Seeding users...')
  const admin = await prisma.user.upsert({
    where: { email: 'admin@demo.com' },
    update: { emailVerified: new Date(), companyRole: 'CTO / CIO' },
    create: {
      email: 'admin@demo.com',
      name: 'Platform Admin',
      passwordHash: adminPassword,
      emailVerified: new Date(),
      companyRole: 'CTO / CIO',
      role: PlatformRole.PLATFORM_ADMIN,
    },
  })

  const demoUser = await prisma.user.upsert({
    where: { email: 'demo@demo.com' },
    update: { emailVerified: new Date(), companyRole: 'Founder / Co-Founder' },
    create: {
      email: 'demo@demo.com',
      name: 'Demo User',
      passwordHash: demoPassword,
      emailVerified: new Date(),
      companyRole: 'Founder / Co-Founder',
      role: PlatformRole.USER,
    },
  })

  console.log('Seeding organization...')
  const org = await prisma.organization.upsert({
    where: { slug: 'demo-org' },
    update: {},
    create: {
      name: 'Demo Organization',
      slug: 'demo-org',
    },
  })

  console.log('Seeding memberships...')
  await prisma.membership.upsert({
    where: {
      userId_organizationId: {
        userId: admin.id,
        organizationId: org.id,
      },
    },
    update: {},
    create: {
      userId: admin.id,
      organizationId: org.id,
      role: OrgRole.OWNER,
    },
  })

  await prisma.membership.upsert({
    where: {
      userId_organizationId: {
        userId: demoUser.id,
        organizationId: org.id,
      },
    },
    update: {},
    create: {
      userId: demoUser.id,
      organizationId: org.id,
      role: OrgRole.ADMIN,
    },
  })

  console.log('Seeding workspace...')
  const workspace = await prisma.workspace.findFirst({
    where: { organizationId: org.id, name: 'Main Workspace' }
  }) || await prisma.workspace.create({
    data: {
      organizationId: org.id,
      name: 'Main Workspace',
      description: 'Default workspace for demo org',
    }
  })

  console.log('Seeding project...')
  await prisma.project.findFirst({
    where: { workspaceId: workspace.id, name: 'Retail Chain Digital Transformation' }
  }) || await prisma.project.create({
    data: {
      workspaceId: workspace.id,
      name: 'Retail Chain Digital Transformation',
      industry: 'Retail',
      businessGoal: 'Modernize the legacy in-store POS and inventory management systems to enable real-time omnichannel fulfillment and drastically reduce operational overhead. The goal is to connect online and offline customer journeys seamlessly.',
      status: ProjectStatus.ACTIVE,
      language: 'en',
    }
  })

  console.log('Seed completed successfully.')
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
