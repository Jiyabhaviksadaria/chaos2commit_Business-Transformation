# Deployment Guide

## Quick Local Demo
```bash
cp .env.example .env
# Edit .env: set DATABASE_URL, NEXTAUTH_SECRET, NEXTAUTH_URL
# Set AI_MOCK=true for offline mode

npm install
npx prisma migrate dev --name init
npm run db:seed
npm run build
npm start
# Open http://localhost:3000
```

## Environment Variables
| Variable | Required | Description |
|---|---|---|
| DATABASE_URL | ✅ | PostgreSQL connection string |
| NEXTAUTH_SECRET | ✅ | Random 32+ char string (generate with `openssl rand -base64 32`) |
| NEXTAUTH_URL | ✅ | Your app URL e.g. https://yourapp.vercel.app |
| GROQ_API_KEY | Optional | General Groq API key (get from console.groq.com) |
| GROQ_MODEL | Optional | General Groq AI model (Default: openai/gpt-oss-120b) |
| GROQ_QWEN_API_KEY | Optional | Groq API key dedicated to Qwen tasks |
| GROQ_WEBSITE_MODEL | Optional | Multilingual website generation model (Default: qwen/qwen3.8-27b) |
| GROQ_ASSISTANT_MODEL | Optional | AI Design Assistant model (Default: qwen/qwen3.8-27b) |
| GEMINI_MODEL | Optional | Default: gemini-1.5-flash |
| AI_MOCK | Optional | Set "true" for mock AI (demo/dev mode) |

## Vercel + Neon Postgres (Recommended)

1. **Database**: Create a free database at https://neon.tech
   - Copy the connection string to `DATABASE_URL`

2. **Deploy to Vercel**:
   ```bash
   npx vercel --prod
   ```
   Or connect your GitHub repo at vercel.com

3. **Set environment variables** in Vercel dashboard → Settings → Environment Variables

4. **Run migrations** (one-time):
   ```bash
   DATABASE_URL="your-neon-url" npx prisma migrate deploy
   DATABASE_URL="your-neon-url" npm run db:seed
   ```

## Docker
```bash
docker-compose up -d  # starts PostgreSQL
cp .env.example .env  # edit DATABASE_URL to point to docker postgres
npm run db:migrate
npm run db:seed
npm run build && npm start
```

## Demo Credentials (after seed)
| Email | Password | Role |
|---|---|---|
| admin@demo.com | admin123 | Platform Admin |
| demo@demo.com | demo123 | User |

## Security Headers
The `next.config.mjs` includes CSP, X-Frame-Options, and other security headers.

## AI Keys for Production
Set `AI_MOCK=false` and add real API keys.
- Groq: https://console.groq.com (free tier: ~30 RPM)  
- Gemini: https://aistudio.google.com (free tier: 15 RPM)
- The orchestrator auto-falls back: Groq → Gemini → mock
