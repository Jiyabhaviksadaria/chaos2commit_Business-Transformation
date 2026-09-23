# Business Transformation AI

This is the foundational setup for Business Transformation AI — an AI consulting platform built with Next.js 14, Tailwind CSS, shadcn/ui, Prisma, next-auth, and Vitest.

## Prerequisites
- Node.js 24 (`.nvmrc` is included)
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

## Production deployment

`localhost` is only valid while `npm run dev` is running. A hosted deployment must use a reachable PostgreSQL connection string and its own public HTTPS origin.

### Vercel

1. Import this GitHub repository in Vercel.
2. Add `DATABASE_URL`, `NEXTAUTH_SECRET`, and `NEXTAUTH_URL` (for example, `https://your-project.vercel.app`).
3. Add any AI provider variables required by the app.
4. Deploy with `npm run build` and start with `npm start` (the included `vercel.json` already uses these defaults).

### Render

1. Create a Blueprint from this repository, or use the included `render.yaml`.
2. Render creates the web service and PostgreSQL database and wires `DATABASE_URL` automatically.
3. Set `NEXTAUTH_URL` to the resulting `https://<service>.onrender.com` URL and provide a strong `NEXTAUTH_SECRET`.
4. The free-tier build command initializes the Prisma schema with `npm run db:deploy` before building.

The included Render database is on the free tier and expires after 30 days. Upgrade it before the expiry date for a persistent production database.

After either deployment is live, open a project in the Visual Editor and press **Publish & Get Link**. The returned link uses the current public origin and opens `/site/<slug>`; it will not use localhost after the editor itself is opened from the deployed URL.
