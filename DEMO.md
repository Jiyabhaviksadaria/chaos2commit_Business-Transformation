# Demo Script — Business Transformation AI (5-minute run)

## Setup (before demo)
1. `npm run db:migrate && npm run db:seed` — creates admin@demo.com + demo@demo.com
2. Set `AI_MOCK=true` in .env for offline demo
3. `npm run build && npm start` — start on localhost:3000

---

## Demo Flow

### 1. Login (30s)
- Go to http://localhost:3000
- Login as **demo@demo.com** / **demo123**

### 2. Load Demo Project — Safety Net (30s)
- Go to Projects → click **"Load Demo Project"** button
- Instantly creates a fully-populated HR Consultancy project (NO AI calls)
- Opens project automatically

### 3. Discovery Q&A (45s)
- Click **Discovery & Build** tab
- Show the AI analysis: business summary, detected language, known entities
- Show 4 pre-selected systems (Website, CRM, Attendance, Onboarding)
- Show "Challenge this" button on any system card
- Point out "Build my system(s)" button at bottom

### 4. Workable System — CRM (60s)
- Click **System** tab → opens /projects/[id]/system
- Show 4 module cards with record counts
- Click **Candidates** → table view with 5 sample candidates
- Switch to **Kanban view** — show candidates in pipeline stages (Applied → Placed)
- Move a card to a different stage using the "Move to" dropdown
- Click **Add Record** — fill in name/email/stage → save
- Click **CSV** export

### 5. Attendance Check-in (20s)
- Navigate back to system home
- Click **Attendance** module
- Click **Check In / Out** button — records a check-in for today

### 6. Website Preview (30s)
- Go back to project → click **Website** tab
- Show the rendered TalentBridge HR website: hero, services, process, contact form
- Toggle between Desktop / Tablet / Mobile
- Click **Publish Site** — generates a public URL

### 7. Intake — New Project (45s)
- Go to Projects → **New Project**
- Type in the idea box: "I run a dental clinic with patients, appointments and staff"
- Click a starter chip (Clinic) to show prefill
- Select output language: Hindi
- Show voice input button (if supported)
- Submit → project created

### 8. Credits (30s)
- Go to /app/billing
- Show credit balance (30 starting credits)
- Show cost table (Build = 5 credits)
- Click **Add 50 credits (Demo)**
- Show transaction ledger

### 9. Export (20s)
- On any project, navigate to /api/projects/[id]/export?format=docx&type=SYSTEM_SPEC
- Download triggers automatically

### 10. Admin (20s)
- Sign out → login as **admin@demo.com** / **admin123**
- Navigate to /admin → show 403 guard works for non-admins
- (Admin page: coming soon — marked in PROGRESS.md)

---

## What Works
- ✅ Universal intake (idea, URL with SSRF guard, voice, starter chips, language selector)
- ✅ Discovery Q&A with recommended systems + Challenge-this
- ✅ Build orchestration (SYSTEM_SPEC + WEBSITE_SPEC + sample data)
- ✅ Workable system runtime: table view, kanban view, attendance check-in/out
- ✅ Add/edit/delete records with field-type-aware form
- ✅ CSV export per module
- ✅ Website renderer with device toggle (desktop/tablet/mobile)
- ✅ Public site publishing (/site/[slug])
- ✅ Credits system: atomic deduction, refund on failure, demo top-up
- ✅ Load Demo Project — instant HR Consultancy fixture, zero AI calls
- ✅ DOCX/XLSX/HTML/JSON/CSV export
- ✅ Auth (email/password), multi-tenancy, RBAC (Owner/Admin/Editor/Viewer)
- ✅ Prisma schema with all required models

## What Is Mocked / Stubbed
- ⚠️ AI calls use mock provider when AI_MOCK=true (set real GROQ_API_KEY for live AI)
- ⚠️ Admin page (/admin) — coming soon state
- ⚠️ Consulting modules (Step 7) — schema/registry stubs only, no UI
- ⚠️ Collaboration features (comments, approvals, notifications) — schema exists, no UI
- ⚠️ Modify with AI / version history UI — API exists, no UI yet
- ⚠️ PPTX export — coming soon (docx/xlsx/html/json/csv work)
- ⚠️ Dashboard metrics (Step 8) — placeholder charts
- ⚠️ Multilingual AI output — works if AI key set, mock returns English

## Known Limitations
- Database must be set up before running (PostgreSQL required)
- AI rate limits: free Groq/Gemini = ~30 RPM, use AI_MOCK=true for demos
- System spec fetched via double API call on system home page (optimization pending)
