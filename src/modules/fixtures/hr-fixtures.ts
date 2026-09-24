/**
 * HR Consultancy demo fixtures — no registry imports, no Zod schemas.
 * Used by the demo loader to avoid circular dependency chains.
 */
import type { IntakeAnalysisData } from "@/modules/deliverables/intake-analysis"
import type { SystemSpecData } from "@/modules/deliverables/system-spec"
import type { WebsiteSpecData } from "@/modules/deliverables/website-spec"

export const HR_INTAKE_FIXTURE: IntakeAnalysisData = {
  detectedLanguage: "en",
  businessSummary: "An HR consultancy managing companies, candidates, and clients, providing recruitment, placement, and workforce management services.",
  industry: "Human Resources & Staffing",
  businessType: "B2B Services",
  knownEntities: ["companies", "candidates", "clients", "jobs", "placements"],
  userStatedNeeds: ["company website", "CRM", "attendance system", "client onboarding system"],
  mode: "USER_SPECIFIED",
  missingInformation: [
    {
      id: "q1",
      question: "How many consultants will use the system simultaneously?",
      whyItMatters: "Determines database and infrastructure sizing requirements",
      suggestedAnswers: ["1-5 users", "5-20 users", "20-100 users", "100+ users"]
    }
  ],
  recommendedSystems: [
    { id: "sys-website", kind: "WEBSITE", name: "Corporate Website", whyRecommended: "Essential for credibility and lead generation", priority: "MUST", confidence: 95, evidence: ["User explicitly stated 'company website'"] },
    { id: "sys-crm", kind: "CRM", name: "Recruitment CRM", whyRecommended: "Manage companies, candidates, and clients in one place", priority: "MUST", confidence: 98, evidence: ["User mentioned companies, candidates, clients"] },
    { id: "sys-attendance", kind: "ATTENDANCE", name: "Attendance System", whyRecommended: "Track consultant attendance and placed employee check-ins", priority: "MUST", confidence: 90, evidence: ["User explicitly requested attendance system"] },
    { id: "sys-onboarding", kind: "ONBOARDING", name: "Client Onboarding Portal", whyRecommended: "Streamline new client intake", priority: "MUST", confidence: 92, evidence: ["User explicitly requested client onboarding system"] }
  ],
  readyToBuild: true,
  disclaimer: "AI-generated recommendations are advisory. Please validate with your business stakeholders before implementation."
}

export const HR_SYSTEM_FIXTURE: SystemSpecData = {
  appName: "HR Connect",
  tagline: "Manage your talent pipeline end-to-end",
  theme: { primary: "#6366f1", style: "MODERN" },
  modules: [
    {
      key: "candidates",
      name: "Candidates",
      description: "Track all candidates in your talent pipeline",
      icon: "Users",
      kind: "CRM",
      fields: [
        { key: "name", label: "Full Name", type: "text", required: true, showInTable: true },
        { key: "email", label: "Email", type: "email", required: true, showInTable: true },
        { key: "phone", label: "Phone", type: "phone", required: false, showInTable: true },
        { key: "stage", label: "Stage", type: "select", required: true, options: ["Applied", "Screening", "Interview", "Offer", "Placed", "Rejected"], showInTable: true },
        { key: "expected_salary", label: "Expected Salary", type: "currency", required: false, showInTable: true },
        { key: "notes", label: "Notes", type: "textarea", required: false, showInTable: false }
      ],
      views: ["table", "kanban"],
      kanbanField: "stage"
    },
    {
      key: "clients",
      name: "Clients",
      description: "Manage client companies and contacts",
      icon: "Building2",
      kind: "CRM",
      fields: [
        { key: "company_name", label: "Company Name", type: "text", required: true, showInTable: true },
        { key: "contact_name", label: "Contact Name", type: "text", required: true, showInTable: true },
        { key: "email", label: "Email", type: "email", required: true, showInTable: true },
        { key: "phone", label: "Phone", type: "phone", required: false, showInTable: true },
        { key: "status", label: "Status", type: "select", required: true, options: ["Prospect", "Active", "On Hold", "Closed"], showInTable: true },
        { key: "requirements", label: "Open Requirements", type: "textarea", required: false, showInTable: false }
      ],
      views: ["table", "kanban"],
      kanbanField: "status"
    },
    {
      key: "attendance",
      name: "Attendance",
      description: "Daily attendance tracking with check-in/check-out",
      icon: "Calendar",
      kind: "ATTENDANCE",
      fields: [
        { key: "employee_name", label: "Employee Name", type: "text", required: true, showInTable: true },
        { key: "date", label: "Date", type: "date", required: true, showInTable: true },
        { key: "check_in", label: "Check In", type: "datetime", required: false, showInTable: true },
        { key: "check_out", label: "Check Out", type: "datetime", required: false, showInTable: true },
        { key: "status", label: "Status", type: "select", required: true, options: ["Present", "Absent", "Half Day", "On Leave"], showInTable: true }
      ],
      views: ["table"],
      quickActions: ["CHECK_IN_OUT"]
    },
    {
      key: "onboarding",
      name: "Client Onboarding",
      description: "Structured onboarding pipeline for new clients",
      icon: "ClipboardList",
      kind: "ONBOARDING",
      fields: [
        { key: "client_name", label: "Client Name", type: "text", required: true, showInTable: true },
        { key: "onboarding_stage", label: "Stage", type: "select", required: true, options: ["Agreement", "KYC", "Requirements Gathering", "Setup", "Go Live", "Complete"], showInTable: true },
        { key: "assigned_consultant", label: "Assigned Consultant", type: "text", required: false, showInTable: true },
        { key: "start_date", label: "Start Date", type: "date", required: false, showInTable: true },
        { key: "notes", label: "Notes", type: "textarea", required: false, showInTable: false }
      ],
      views: ["table", "kanban"],
      kanbanField: "onboarding_stage"
    }
  ],
  workflows: [
    { name: "Candidate Placement", trigger: "Candidate moves to Placed stage", steps: ["Notify client", "Create placement record", "Send offer letter", "Start onboarding"] }
  ],
  roles: [
    { name: "Admin", permissions: ["read", "write", "delete", "manage_users"] },
    { name: "Consultant", permissions: ["read", "write"] },
    { name: "Viewer", permissions: ["read"] }
  ]
}

export const HR_WEBSITE_FIXTURE: WebsiteSpecData = {
  siteName: "TalentBridge HR",
  language: "en",
  theme: { primary: "#6366f1", style: "MODERN" },
  nav: ["Home", "About", "Services", "Process", "Contact"],
  sections: [
    { type: "hero", headline: "Connect the Right Talent with the Right Opportunity", subheadline: "End-to-end HR consultancy services — from recruitment to onboarding, we handle your talent pipeline.", ctaLabel: "Get Started Today" },
    { type: "about", title: "About TalentBridge HR", body: "We are a specialized HR consultancy with deep expertise in talent acquisition, workforce management, and organizational development." },
    { type: "services", title: "Our Services", items: [
      { title: "Recruitment & Placement", description: "End-to-end talent acquisition from sourcing to placement" },
      { title: "HR Consulting", description: "Strategic HR advice to align your people strategy with business goals" },
      { title: "Workforce Management", description: "Attendance, compliance, and employee lifecycle management" },
      { title: "Client Onboarding", description: "Structured onboarding process to get new clients up to speed quickly" }
    ]},
    { type: "process", title: "How We Work", steps: [
      { title: "Discovery", description: "We understand your requirements and company culture" },
      { title: "Sourcing", description: "We identify and screen the best-fit candidates" },
      { title: "Evaluation", description: "Structured interviews and assessments to verify fit" },
      { title: "Placement", description: "Seamless onboarding and post-placement support" }
    ]},
    { type: "contact", title: "Get In Touch", body: "Ready to transform your HR processes? Contact us today for a free consultation." },
    { type: "footer", text: "© 2024 TalentBridge HR. All rights reserved. AI-generated content — please verify before publishing." }
  ],
  seo: {
    title: "TalentBridge HR - Expert HR Consultancy Services",
    description: "End-to-end HR consultancy specializing in recruitment, placement, and workforce management."
  }
}

export const HR_REQUIREMENTS_FIXTURE = {
  functionalRequirements: [
    { id: "FR-01", title: "Candidate Management", description: "Centralized talent pipeline with stage tracking, resume parsing, and skill tagging.", priority: "CRITICAL" },
    { id: "FR-02", title: "Client Portal & Vacancy Intake", description: "Self-service portal for client companies to post job openings and review candidate shortlists.", priority: "HIGH" },
    { id: "FR-03", title: "Attendance & Shift Verification", description: "Daily check-in and check-out tracking for placed contractors and internal consultants.", priority: "HIGH" },
    { id: "FR-04", title: "Automated AI Matching", description: "AI algorithm matching candidate profiles against job requirements with confidence scoring.", priority: "MEDIUM" }
  ],
  nonFunctionalRequirements: [
    { category: "Performance", requirement: "API sub-500ms latency under 1,000 concurrent active users." },
    { category: "Security", requirement: "AES-256 encryption at rest, TLS 1.3 in transit, and role-based access control (RBAC)." },
    { category: "Compliance", requirement: "GDPR and ISO 27001 data privacy compliance for candidate personal information." }
  ],
  integrations: ["SendGrid Email Service", "Twilio WhatsApp API", "Stripe Client Invoicing"]
}

export const HR_SOLUTION_RECOMMENDATION_FIXTURE = {
  recommendedSolutions: [
    {
      id: "sol-1",
      title: "AI Talent Pipeline & Recruitment CRM",
      category: "Core Operational System",
      businessValue: "Reduces time-to-hire by 65% and doubles consultant placement capacity.",
      estimatedCost: "$18,000",
      estimatedDuration: "5 Weeks",
      priority: "MUST_HAVE",
      roi: "340%"
    },
    {
      id: "sol-2",
      title: "Client & Candidate Self-Service Portal",
      category: "Customer Engagement",
      businessValue: "Eliminates back-and-forth status emails and increases client satisfaction.",
      estimatedCost: "$12,000",
      estimatedDuration: "3 Weeks",
      priority: "HIGH_PRIORITY",
      roi: "210%"
    },
    {
      id: "sol-3",
      title: "Automated Attendance & Time-Tracking Module",
      category: "Workforce Management",
      businessValue: "Automates monthly contractor billing and prevents attendance disputes.",
      estimatedCost: "$10,000",
      estimatedDuration: "2.5 Weeks",
      priority: "HIGH_PRIORITY",
      roi: "280%"
    }
  ],
  keyDecisionDrivers: ["Speed to Market", "User Experience", "Data Security", "Scalability"]
}

export const HR_ARCHITECTURE_HLD_FIXTURE = {
  architectureStyle: "Modern Cloud-Native Micro-frontend & API Architecture",
  coreComponents: [
    { name: "Frontend Web Layer", technology: "Next.js 14 App Router, Tailwind CSS, Lucide Icons", purpose: "Responsive web portal for candidates, clients, and consultants." },
    { name: "API Gateway & Serverless Backend", technology: "Node.js TypeScript, Prisma ORM", purpose: "Handles REST APIs, authentication, and database transactions." },
    { name: "Database Engine", technology: "PostgreSQL (Hosted on Render / Neon)", purpose: "Relational store for candidate profiles, placements, and attendance logs." },
    { name: "AI Processing Engine", technology: "Google Gemini 1.5 Flash / OpenAI GPT-4o", purpose: "Resume parsing, candidate matching, and intelligent intake analysis." }
  ],
  securityModel: {
    authentication: "NextAuth.js JWT Sessions with OAuth 2.0 support",
    authorization: "Role-Based Access Control (Admin, Consultant, Client, Candidate)",
    dataProtection: "Field-level encryption for sensitive PII data (phone, salary, background notes)."
  }
}

export const HR_PROCESS_MAP_FIXTURE = {
  currentProcessSummary: "Manual spreadsheets, delayed email responses, unstructured candidate tracking causing 14-day placement delays.",
  targetProcessSummary: "Fully automated AI-assisted pipeline from candidate application to client placement and attendance tracking.",
  processPhases: [
    { phase: "Phase 1: Candidate Sourcing & Intake", steps: ["Resume Upload", "AI Attribute Extraction", "Automated Screening Score", "Talent Pool Insertion"] },
    { phase: "Phase 2: Client Vacancy & Shortlisting", steps: ["Client Requirement Intake", "Automated AI Candidate Matching", "Client Review & Feedback"] },
    { phase: "Phase 3: Interview & Offer", steps: ["Interview Scheduling", "Feedback Log", "Digital Offer Letter Issue", "Status Update to Placed"] },
    { phase: "Phase 4: Onboarding & Shift Attendance", steps: ["Client Onboarding Setup", "Daily Check-in Log", "Monthly Automated Billing Report"] }
  ],
  identifiedBottlenecks: ["48-hour delay in getting client interview feedback", "Manual resume data entry by consultants"]
}

export const HR_WIREFRAMES_FIXTURE = {
  screenConcepts: [
    { name: "Executive Dashboard", description: "High-level overview of active placements, revenue forecasts, candidate pipeline health, and urgent tasks." },
    { name: "Candidate Kanban Board", description: "Interactive drag-and-drop board tracking candidates across Applied, Screening, Interview, Offer, and Placed stages." },
    { name: "Client Portal & Job Posting", description: "Clean client interface to view assigned candidate shortlists, approve hires, and submit new job requests." },
    { name: "Attendance & Shift Log", description: "Real-time daily attendance grid showing consultant check-in times, statuses, and monthly summary stats." }
  ],
  designTokens: {
    theme: "Cream Pastel Aesthetic",
    colors: { primary: "#18181C", accentYellow: "#FEE895", accentPink: "#F8B4D9", accentGreen: "#B8DF9E", background: "#F7F4EB" },
    typography: "Inter / Sans-serif modern font hierarchy"
  }
}

export const HR_DATABASE_DESIGN_FIXTURE = {
  databaseType: "Relational PostgreSQL",
  schemaTables: [
    {
      tableName: "candidates",
      primaryKey: "id (cuid)",
      columns: [
        { name: "name", type: "VARCHAR(255)", nullable: false },
        { name: "email", type: "VARCHAR(255)", nullable: false },
        { name: "phone", type: "VARCHAR(50)", nullable: true },
        { name: "stage", type: "ENUM('Applied', 'Screening', 'Interview', 'Offer', 'Placed')", nullable: false },
        { name: "expected_salary", type: "NUMERIC(10,2)", nullable: true },
        { name: "notes", type: "TEXT", nullable: true }
      ]
    },
    {
      tableName: "clients",
      primaryKey: "id (cuid)",
      columns: [
        { name: "company_name", type: "VARCHAR(255)", nullable: false },
        { name: "contact_name", type: "VARCHAR(255)", nullable: false },
        { name: "email", type: "VARCHAR(255)", nullable: false },
        { name: "phone", type: "VARCHAR(50)", nullable: true },
        { name: "status", type: "ENUM('Prospect', 'Active', 'On Hold', 'Closed')", nullable: false }
      ]
    },
    {
      tableName: "attendance",
      primaryKey: "id (cuid)",
      columns: [
        { name: "employee_name", type: "VARCHAR(255)", nullable: false },
        { name: "date", type: "DATE", nullable: false },
        { name: "check_in", type: "TIMESTAMP", nullable: true },
        { name: "check_out", type: "TIMESTAMP", nullable: true },
        { name: "status", type: "ENUM('Present', 'Absent', 'Half Day', 'On Leave')", nullable: false }
      ]
    }
  ]
}

export const HR_API_DESIGN_FIXTURE = {
  baseUrl: "https://api.talentbridge.com/v1",
  endpoints: [
    { method: "GET", path: "/api/candidates", description: "Fetch list of candidates with stage and skill filtering.", authRequired: true },
    { method: "POST", path: "/api/candidates", description: "Create a new candidate profile in the pipeline.", authRequired: true },
    { method: "POST", path: "/api/candidates/:id/match", description: "Trigger AI matching between candidate and active job postings.", authRequired: true },
    { method: "GET", path: "/api/clients", description: "Fetch client accounts and active requirements.", authRequired: true },
    { method: "POST", path: "/api/attendance/check-in", description: "Log daily attendance check-in for a consultant.", authRequired: true }
  ]
}

export const HR_ESTIMATION_FIXTURE = {
  totalDurationWeeks: 12,
  totalEstimatedBudgetUSD: 40000,
  teamComposition: [
    { role: "Lead Solutions Architect", allocation: "50%", hoursPerWeek: 20 },
    { role: "Full-Stack Senior Engineer", allocation: "100%", hoursPerWeek: 40 },
    { role: "UI/UX Designer", allocation: "50%", hoursPerWeek: 20 },
    { role: "QA Engineer", allocation: "50%", hoursPerWeek: 20 }
  ],
  phaseEstimates: [
    { phase: "Phase 1: Architecture & Data Modeling", durationWeeks: 2, costUSD: 7000 },
    { phase: "Phase 2: Core CRM & AI Pipeline", durationWeeks: 5, costUSD: 17000 },
    { phase: "Phase 3: Client Portal & Attendance", durationWeeks: 3, costUSD: 10000 },
    { phase: "Phase 4: Integration, QA & Go-Live", durationWeeks: 2, costUSD: 6000 }
  ]
}

export const HR_ROADMAP_FIXTURE = {
  strategicGoal: "Transform HR operations from spreadsheet-based tracking to an intelligent, automated recruitment platform.",
  quarters: [
    {
      quarter: "Q1 2026",
      theme: "Foundation & Intake Automation",
      initiatives: [
        { title: "Intelly AI Platform Deployment", status: "COMPLETED", impact: "High" },
        { title: "Candidate & Client Database Migration", status: "IN_PROGRESS", impact: "High" }
      ]
    },
    {
      quarter: "Q2 2026",
      theme: "AI Matching & Recruitment CRM",
      initiatives: [
        { title: "Launch HR Connect Candidate Pipeline", status: "PLANNED", impact: "Critical" },
        { title: "AI Skill Matching Engine Rollout", status: "PLANNED", impact: "High" }
      ]
    },
    {
      quarter: "Q3 2026",
      theme: "Client Portal & Attendance",
      initiatives: [
        { title: "Self-Service Client Portal", status: "PLANNED", impact: "Medium" },
        { title: "Automated Attendance & Shift Tracker", status: "PLANNED", impact: "High" }
      ]
    },
    {
      quarter: "Q4 2026",
      theme: "Scale & Analytics",
      initiatives: [
        { title: "Advanced Predictive Hiring Analytics", status: "PLANNED", impact: "Medium" },
        { title: "Multi-Location Enterprise Scaling", status: "PLANNED", impact: "High" }
      ]
    }
  ]
}

export const HR_GAP_ANALYSIS_FIXTURE = {
  currentState: "Spreadsheet-based records, fragmented communication, 14-day average placement cycle time.",
  targetState: "Integrated cloud platform, AI-driven candidate matching, sub-4-day placement cycle time.",
  gapsIdentified: [
    { area: "Technology", gap: "No central database for candidate profiles.", risk: "HIGH", mitigation: "Deploy Postgres relational CRM." },
    { area: "Process", gap: "Manual attendance logging by email/SMS.", risk: "MEDIUM", mitigation: "Implement single-click check-in module." },
    { area: "Customer Experience", gap: "Clients lack visibility into recruitment candidate status.", risk: "HIGH", mitigation: "Provide client portal login." }
  ]
}

