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
    { type: "testimonials", title: "What Our Clients Say", items: [
      { name: "Rahul Mehta, CEO - TechCorp India", quote: "TalentBridge found us 5 senior engineers in 3 weeks. Exceptional service." },
      { name: "Priya Shah, HR Director - FinServ Ltd", quote: "Their structured onboarding process saved us 2 weeks per new hire." }
    ]},
    { type: "contact", title: "Get In Touch", body: "Ready to transform your HR processes? Contact us today for a free consultation." },
    { type: "footer", text: "© 2024 TalentBridge HR. All rights reserved. AI-generated content — please verify before publishing." }
  ],
  seo: {
    title: "TalentBridge HR - Expert HR Consultancy Services",
    description: "End-to-end HR consultancy specializing in recruitment, placement, and workforce management."
  }
}
