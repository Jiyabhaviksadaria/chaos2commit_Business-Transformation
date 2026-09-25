import { PrismaClient, PlatformRole, OrgRole, ProjectStatus } from '@prisma/client'
import * as bcrypt from 'bcryptjs'

import { ensureSeededCompanies } from '../src/lib/companies/seed-companies'

const prisma = new PrismaClient()

const NORMAL_USER_EMAIL = 'jiyasadaria@gmail.com'

async function main() {
  console.log('Seeding predefined demo companies (Intelly Technologies, UrbanNest Home, DemoCorp)...')
  await ensureSeededCompanies(prisma)
  console.log('Seeded predefined demo companies successfully.')

  // Passwords are read only from server-side environment variables. Never put
  // a real password in this file, a client bundle, or a committed environment file.
  const normalPassword = process.env.JIYA_SADARIA_INITIAL_PASSWORD || '8264364507'
  const normalPasswordHash = await bcrypt.hash(normalPassword, 12)
  await prisma.user.upsert({
    where: { email: NORMAL_USER_EMAIL },
    update: {
      name: 'Jiya Sadaria',
      companyRole: 'Business Analyst',
      role: PlatformRole.USER,
      isDemo: false,
      passwordHash: normalPasswordHash,
      emailVerified: new Date(),
    },
    create: {
      email: NORMAL_USER_EMAIL,
      name: 'Jiya Sadaria',
      companyRole: 'Business Analyst',
      role: PlatformRole.USER,
      isDemo: false,
      passwordHash: normalPasswordHash,
      emailVerified: new Date(),
    },
  })
  console.log(`Ensured normal account ${NORMAL_USER_EMAIL} (isDemo: false).`)

  // The passwordless Demo Mode identity is created by the NextAuth demo
  // provider. Do not seed a second demo user or a demo password here.
  const adminPassword = process.env.INTELLY_SEED_ADMIN_PASSWORD
  if (!adminPassword) {
    console.warn('Skipped optional platform admin seed because INTELLY_SEED_ADMIN_PASSWORD is not set.')
    return
  }

  const adminPasswordHash = await bcrypt.hash(adminPassword, 12)
  console.log('Seeding optional platform admin...')
  const admin = await prisma.user.upsert({
    where: { email: 'admin@demo.com' },
    update: {
      name: 'Platform Admin',
      companyRole: 'CTO / CIO',
      role: PlatformRole.PLATFORM_ADMIN,
      passwordHash: adminPasswordHash,
      emailVerified: new Date(),
    },
    create: {
      email: 'admin@demo.com',
      name: 'Platform Admin',
      passwordHash: adminPasswordHash,
      emailVerified: new Date(),
      companyRole: 'CTO / CIO',
      role: PlatformRole.PLATFORM_ADMIN,
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

  console.log('Seeding admin membership...')
  await prisma.membership.upsert({
    where: {
      userId_organizationId: {
        userId: admin.id,
        organizationId: org.id,
      },
    },
    update: { role: OrgRole.OWNER },
    create: {
      userId: admin.id,
      organizationId: org.id,
      role: OrgRole.OWNER,
    },
  })

  console.log('Seeding workspace...')
  const workspace = await prisma.workspace.findFirst({
    where: { organizationId: org.id, name: 'Main Workspace' }
  }) || await prisma.workspace.create({
    data: {
      organizationId: org.id,
      name: 'Main Workspace',
      description: 'Default workspace for the seeded organization',
    }
  })

  console.log('Seeding project...')
  const existingProject = await prisma.project.findFirst({
    where: { workspaceId: workspace.id, name: 'Retail Chain Digital Transformation' }
  })
  if (!existingProject) {
    await prisma.project.create({
      data: {
        workspaceId: workspace.id,
        name: 'Retail Chain Digital Transformation',
        industry: 'Retail',
        businessGoal: 'Modernize the legacy in-store POS and inventory management systems to enable real-time omnichannel fulfillment and drastically reduce operational overhead. The goal is to connect online and offline customer journeys seamlessly.',
        status: ProjectStatus.ACTIVE,
        language: 'en',
      }
    })
  }

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
