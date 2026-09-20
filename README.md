# Business Transformation AI

This is the foundational setup for Business Transformation AI — an AI consulting platform built with Next.js 14, Tailwind CSS, shadcn/ui, Prisma, next-auth, and Vitest.

## Prerequisites
- Node.js (v18+)
- Docker (for PostgreSQL)

## Setup

1. **Install dependencies**
   ```bash
   npm install
   ```

2. **Environment Variables**
   ```bash
   cp .env.example .env
   ```
   Update `.env` with your actual local variables.

3. **Start Database**
   ```bash
   docker compose up -d
   ```

4. **Initialize Database**
   ```bash
   npm run db:migrate
   ```

5. **Start Development Server**
   ```bash
   npm run dev
   ```

## Available Scripts
- `npm run dev` - Start development server
- `npm run build` - Build the application
- `npm run lint` - Lint the codebase
- `npm run typecheck` - Run TypeScript type checking
- `npm run test` - Run Vitest tests
- `npm run db:migrate` - Run Prisma migrations
- `npm run db:seed` - Seed the database
- `npm run db:studio` - Open Prisma Studio
