/* eslint-disable @typescript-eslint/no-explicit-any */
import type { WebsiteSpecData } from "@/modules/deliverables/website-spec"

export interface TemplateDefinition {
  id: string
  name: string
  description: string
  pages: string[]
  components: string[]
  features: string[]
  optionalFeatures: string[]
  configurableFields: string[]
  theme: {
    primary: string
    secondary?: string
    style: "MODERN" | "CLASSIC" | "BOLD"
  }
  aiCapableFeatures: string[]
  requiredBackendServices: string[]
  configs: {
    business: Record<string, any>
    content: Record<string, any>
    theme: Record<string, any>
    navigation: Record<string, any>
    features: Record<string, boolean>
  }
}

// In-memory registry of the 8 business starter templates
const templates: Record<string, TemplateDefinition> = {
  clinic: {
    id: "clinic",
    name: "Medical & Dental Clinic",
    description: "Comprehensive healthcare, dental, and medical practice starter template with online appointment booking.",
    pages: ["home", "about", "doctors", "services", "appointment", "contact"],
    components: ["hero", "about", "services", "testimonials", "faq", "contact", "footer"],
    features: ["doctor_profiles", "services", "contact_form", "appointment_form"],
    optionalFeatures: ["patient_login", "online_consultation", "payments"],
    configurableFields: ["businessName", "phone", "email", "address", "primaryColor"],
    theme: { primary: "#0D9488", secondary: "#0284C7", style: "MODERN" },
    aiCapableFeatures: ["symptom_checker", "ai_receptionist"],
    requiredBackendServices: ["appointment_api", "contact_api"],
    configs: {
      business: {
        name: "Apex Dental & Healthcare Clinic",
        phone: "+1 (555) 234-5678",
        email: "care@apexdentalclinic.com",
        address: "450 Health Avenue, Suite 100, Medical District",
        operatingHours: "Mon - Sat: 8:00 AM - 7:00 PM",
        tagline: "Compassionate & Advanced Care For Your Entire Family"
      },
      content: {
        hero: {
          headline: "Modern Healthcare & Smile Care Excellence",
          subheadline: "State-of-the-art medical diagnostics, painless dental treatments, and dedicated family healthcare professionals.",
          ctaLabel: "Book Appointment"
        },
        about: {
          title: "About Apex Clinic",
          body: "Apex Clinic brings over 15 years of medical excellence. Our board-certified specialists utilize painless laser technologies, digital X-rays, and personalized care plans."
        },
        services: [
          { title: "General Dentistry & Cleaning", description: "Routine checkups, scaling, fluoride treatments, and preventative oral hygiene." },
          { title: "Orthodontics & Clear Aligners", description: "Invisible aligners, traditional braces, and bite correction for teens and adults." },
          { title: "Cosmetic Smile Makeover", description: "Teeth whitening, porcelain veneers, and bonding for a radiant, confident smile." },
          { title: "Preventative Health Screening", description: "Comprehensive blood panels, cardiac health checks, and routine wellness exams." }
        ],
        testimonials: [
          { name: "Sarah Jenkins", quote: "The cleanest clinic and kindest staff! My dental anxiety vanished completely." },
          { name: "David Ross", quote: "Booking an appointment was instant, and Dr. Apex took time to explain every step." }
        ],
        faq: [
          { q: "Do you accept major health insurance?", a: "Yes, we partner with PPO, HMO, and national dental/medical coverage plans." },
          { q: "Are emergency appointments available?", a: "Same-day emergency appointments are available for severe tooth pain or injury." }
        ]
      },
      theme: {
        primary: "#0D9488",
        secondary: "#0284C7",
        backgroundColor: "#FFFFFF",
        textColor: "#0F172A",
        accentColor: "#F59E0B",
        style: "MODERN",
        font: "Inter"
      },
      navigation: {
        logoText: "Apex Dental Clinic",
        items: [
          { label: "Home", target: "#home" },
          { label: "About", target: "#about" },
          { label: "Services", target: "#services" },
          { label: "Testimonials", target: "#testimonials" },
          { label: "FAQ", target: "#faq" },
          { label: "Contact", target: "#contact" }
        ]
      },
      features: {
        doctor_profiles: true,
        services: true,
        contact_form: true,
        appointment_form: true,
        patient_login: false,
        online_consultation: false,
        payments: false
      }
    }
  },

  hr_consultancy: {
    id: "hr_consultancy",
    name: "HR Consultancy & Executive Search",
    description: "Strategic talent acquisition, HR compliance, and organizational advisory platform.",
    pages: ["home", "about", "services", "case-studies", "contact"],
    components: ["hero", "about", "services", "process", "testimonials", "contact", "footer"],
    features: ["consultation_booking", "service_catalog", "contact_form"],
    optionalFeatures: ["resume_upload", "client_portal"],
    configurableFields: ["businessName", "phone", "email", "address", "primaryColor"],
    theme: { primary: "#1E3A8A", secondary: "#3B82F6", style: "CLASSIC" },
    aiCapableFeatures: ["ai_candidate_screening", "policy_generator"],
    requiredBackendServices: ["contact_api"],
    configs: {
      business: {
        name: "Vanguard HR Advisors",
        phone: "+1 (800) 456-7890",
        email: "info@vanguardhr.com",
        address: "100 Financial Plaza, 24th Floor",
        operatingHours: "Mon - Fri: 9:00 AM - 6:00 PM",
        tagline: "Empowering Workforce Growth & Executive Talent Strategy"
      },
      content: {
        hero: {
          headline: "Transforming Talent Strategy & Corporate Culture",
          subheadline: "Full-service human resource advisory, leadership recruiting, and labor compliance solutions for scaling enterprises.",
          ctaLabel: "Schedule Consultation"
        },
        about: {
          title: "Strategic HR Leadership",
          body: "Vanguard HR Advisors helps high-growth startups and established corporations build high-performing teams, optimize payroll structures, and mitigate compliance risks."
        },
        services: [
          { title: "Executive Search & Placement", description: "Targeted C-suite recruitment and leadership headhunting." },
          { title: "HR Compliance & Audits", description: "Comprehensive audits of employment policies, safety protocols, and payroll compliance." },
          { title: "Performance Management", description: "Designing KPI frameworks, 360-degree reviews, and employee retention programs." }
        ],
        process: {
          title: "Our Advisory Workflow",
          steps: [
            { title: "Discovery & Audit", description: "Analyzing your current workforce structure and compliance risks." },
            { title: "Strategy Design", description: "Drafting customized talent acquisition and organizational roadmaps." },
            { title: "Implementation", description: "Deploying ATS tools, policy guidelines, and leadership coaching." }
          ]
        },
        testimonials: [
          { name: "Elena Rostova, CEO at TechCorp", quote: "Vanguard restructured our engineering hiring process, reducing time-to-hire by 40%." }
        ]
      },
      theme: {
        primary: "#1E3A8A",
        secondary: "#3B82F6",
        backgroundColor: "#F8FAFC",
        textColor: "#0F172A",
        accentColor: "#D97706",
        style: "CLASSIC",
        font: "Georgia"
      },
      navigation: {
        logoText: "Vanguard HR Advisors",
        items: [
          { label: "Home", target: "#home" },
          { label: "About", target: "#about" },
          { label: "Services", target: "#services" },
          { label: "Process", target: "#process" },
          { label: "Contact", target: "#contact" }
        ]
      },
      features: {
        consultation_booking: true,
        service_catalog: true,
        contact_form: true,
        resume_upload: false,
        client_portal: false
      }
    }
  },

  retail_store: {
    id: "retail_store",
    name: "Retail Store & Modern Boutique",
    description: "E-commerce and retail storefront showcase with product catalog and store locations.",
    pages: ["home", "about", "products", "stores", "contact"],
    components: ["hero", "about", "services", "testimonials", "contact", "footer"],
    features: ["product_catalog", "store_locator", "contact_form"],
    optionalFeatures: ["online_cart", "stripe_payments", "inventory_sync"],
    configurableFields: ["businessName", "phone", "email", "address", "primaryColor"],
    theme: { primary: "#BE185D", secondary: "#F43F5E", style: "BOLD" },
    aiCapableFeatures: ["ai_product_recommender", "virtual_tryon"],
    requiredBackendServices: ["catalog_api", "contact_api"],
    configs: {
      business: {
        name: "Velvet & Vine Boutique",
        phone: "+1 (888) 990-1122",
        email: "orders@velvetvine.shop",
        address: "720 Fashion Boulevard, Soho Ward",
        operatingHours: "Mon - Sun: 10:00 AM - 9:00 PM",
        tagline: "Curated Apparel, Artisan Home Decor & Modern Lifestyle Essentials"
      },
      content: {
        hero: {
          headline: "Elevate Your Style With Modern Luxury",
          subheadline: "Discover sustainable fabrics, bespoke fashion, and hand-crafted lifestyle accessories designed for timeless elegance.",
          ctaLabel: "Explore Collection"
        },
        about: {
          title: "Crafted With Intention",
          body: "Velvet & Vine partners directly with independent artisans across Europe and Asia to bring ethically crafted, luxury fashion pieces to your wardrobe."
        },
        services: [
          { title: "Artisan Women Fashion", description: "Silk dresses, tailored blazers, and sustainable knitwear." },
          { title: "Bespoke Accessories", description: "Handcrafted leather handbags, fine jewelry, and cashmere scarves." },
          { title: "Home & Fragrance", description: "Organic soy candles, botanical diffusers, and linen textiles." }
        ],
        testimonials: [
          { name: "Chloe Vance", quote: "The quality of the silk blouse is unmatched! Shipping was remarkably fast." }
        ]
      },
      theme: {
        primary: "#BE185D",
        secondary: "#F43F5E",
        backgroundColor: "#FFF1F2",
        textColor: "#881337",
        accentColor: "#FBBF24",
        style: "BOLD",
        font: "Outfit"
      },
      navigation: {
        logoText: "Velvet & Vine",
        items: [
          { label: "Home", target: "#home" },
          { label: "About Us", target: "#about" },
          { label: "Collections", target: "#services" },
          { label: "Testimonials", target: "#testimonials" },
          { label: "Contact", target: "#contact" }
        ]
      },
      features: {
        product_catalog: true,
        store_locator: true,
        contact_form: true,
        online_cart: false,
        stripe_payments: false,
        inventory_sync: false
      }
    }
  },

  school_coaching: {
    id: "school_coaching",
    name: "Academy & Coaching Institute",
    description: "Educational platform for schools, entrance exam coaching, and skill academies.",
    pages: ["home", "about", "courses", "faculty", "admissions", "contact"],
    components: ["hero", "about", "services", "process", "testimonials", "faq", "contact", "footer"],
    features: ["course_catalog", "faculty_directory", "inquiry_form"],
    optionalFeatures: ["lms_integration", "online_fee_payment", "student_portal"],
    configurableFields: ["businessName", "phone", "email", "address", "primaryColor"],
    theme: { primary: "#4F46E5", secondary: "#6366F1", style: "MODERN" },
    aiCapableFeatures: ["ai_tutor", "study_planner"],
    requiredBackendServices: ["inquiry_api"],
    configs: {
      business: {
        name: "Horizon Academy & STEM Institute",
        phone: "+1 (800) 112-3344",
        email: "admissions@horizonacademy.edu",
        address: "500 Education Way, University District",
        operatingHours: "Mon - Sat: 7:30 AM - 8:00 PM",
        tagline: "Empowering Future Leaders Through STEM Excellence & Holistic Coaching"
      },
      content: {
        hero: {
          headline: "Unlock Your Academic & Career Potential",
          subheadline: "Top-ranked coaching programs for SAT, AP Courses, Robotics, Coding, and Competitive Entrance Examinations.",
          ctaLabel: "Apply for Admission"
        },
        about: {
          title: "Excellence in Education",
          body: "Horizon Academy provides rigorous interactive learning environments, small class sizes, and personalized mentorship from Ivy-League educators."
        },
        services: [
          { title: "Competitive Exam Prep (SAT/ACT)", description: "Structured practice tests, test-taking strategies, and subject mastery." },
          { title: "Full-Stack Coding & AI Bootcamp", description: "Hands-on software development, Python algorithms, and web development for teens." },
          { title: "AP Mathematics & Physics", description: "Advanced placement tutoring with guaranteed score improvements." }
        ],
        process: {
          title: "Admissions Steps",
          steps: [
            { title: "Skill Diagnostic Test", description: "Evaluate student baseline strengths and learning style." },
            { title: "Custom Curriculum", description: "Tailored study path matching targets and schedules." },
            { title: "Mentorship & Exams", description: "Weekly mock exams, score feedback, and college counseling." }
          ]
        },
        testimonials: [
          { name: "Marcus Sterling (Parent)", quote: "My daughter improved her SAT score by 230 points thanks to Horizon's mentors!" }
        ]
      },
      theme: {
        primary: "#4F46E5",
        secondary: "#6366F1",
        backgroundColor: "#EEF2FF",
        textColor: "#1E1B4B",
        accentColor: "#10B981",
        style: "MODERN",
        font: "Inter"
      },
      navigation: {
        logoText: "Horizon Academy",
        items: [
          { label: "Home", target: "#home" },
          { label: "About", target: "#about" },
          { label: "Courses", target: "#services" },
          { label: "Admissions", target: "#process" },
          { label: "Contact", target: "#contact" }
        ]
      },
      features: {
        course_catalog: true,
        faculty_directory: true,
        inquiry_form: true,
        lms_integration: false,
        online_fee_payment: false,
        student_portal: false
      }
    }
  },

  logistics: {
    id: "logistics",
    name: "Global Logistics & Freight Forwarding",
    description: "Supply chain, ocean freight, air cargo, and warehousing solutions platform.",
    pages: ["home", "about", "services", "tracking", "quote", "contact"],
    components: ["hero", "about", "services", "process", "testimonials", "contact", "footer"],
    features: ["shipment_tracking", "rate_calculator", "quote_form"],
    optionalFeatures: ["realtime_gps", "customs_brokerage_portal", "warehouse_wms"],
    configurableFields: ["businessName", "phone", "email", "address", "primaryColor"],
    theme: { primary: "#0F172A", secondary: "#2563EB", style: "BOLD" },
    aiCapableFeatures: ["ai_route_optimizer", "automated_customs_doc"],
    requiredBackendServices: ["tracking_api", "quote_api"],
    configs: {
      business: {
        name: "Apex Global Logistics",
        phone: "+1 (800) 776-5432",
        email: "cargo@apexlogistics.com",
        address: "1200 Portside Terminal Way, Gateway Hub",
        operatingHours: "24/7 Global Dispatch & Support Operations",
        tagline: "Seamless Air, Ocean & Land Cargo Solutions Worldwide"
      },
      content: {
        hero: {
          headline: "Reliable Freight & Supply Chain Management",
          subheadline: "Full-container sea freight, express air cargo, cold storage, and end-to-end customs clearance.",
          ctaLabel: "Request Instant Quote"
        },
        about: {
          title: "Global Reach, Local Precision",
          body: "Apex Logistics operates across 140 countries with over 500 distribution hubs, providing real-time telemetry and guaranteed transit times."
        },
        services: [
          { title: "Ocean Freight Forwarding", description: "FCL & LCL container shipments across transatlantic and transpacific trade lanes." },
          { title: "Express Air Cargo", description: "Time-critical air freight chartering with guaranteed same-day customs clearance." },
          { title: "Warehousing & Fulfillment", description: "Climate-controlled storage, pick & pack, and last-mile retail distribution." }
        ],
        process: {
          title: "Cargo Journey",
          steps: [
            { title: "Freight Booking", description: "Instant rate calculation and cargo manifest creation." },
            { title: "Transit & GPS Tracking", description: "24/7 container temperature and location telemetry." },
            { title: "Customs & Delivery", description: "Automated customs duty clearance and last-mile dropoff." }
          ]
        },
        testimonials: [
          { name: "Global Trade Corp", quote: "Apex reduced our supply chain lead time by 5 days across Asia-Pacific routes." }
        ]
      },
      theme: {
        primary: "#0F172A",
        secondary: "#2563EB",
        backgroundColor: "#F8FAFC",
        textColor: "#020617",
        accentColor: "#F59E0B",
        style: "BOLD",
        font: "Inter"
      },
      navigation: {
        logoText: "Apex Logistics",
        items: [
          { label: "Home", target: "#home" },
          { label: "About", target: "#about" },
          { label: "Services", target: "#services" },
          { label: "Workflow", target: "#process" },
          { label: "Contact", target: "#contact" }
        ]
      },
      features: {
        shipment_tracking: true,
        rate_calculator: true,
        quote_form: true,
        realtime_gps: false,
        customs_brokerage_portal: false,
        warehouse_wms: false
      }
    }
  },

  restaurant: {
    id: "restaurant",
    name: "Artisan Restaurant & Bistro",
    description: "Fine dining, gourmet menu showcase, table reservation, and food takeaway platform.",
    pages: ["home", "about", "menu", "reservations", "location", "contact"],
    components: ["hero", "about", "services", "testimonials", "faq", "contact", "footer"],
    features: ["digital_menu", "table_reservation", "contact_form"],
    optionalFeatures: ["online_ordering", "doorstep_delivery", "loyalty_rewards"],
    configurableFields: ["businessName", "phone", "email", "address", "primaryColor"],
    theme: { primary: "#991B1B", secondary: "#D97706", style: "CLASSIC" },
    aiCapableFeatures: ["ai_dish_pairing", "voice_order_taking"],
    requiredBackendServices: ["reservation_api", "contact_api"],
    configs: {
      business: {
        name: "Bella Vista Trattoria & Wine Bar",
        phone: "+1 (555) 789-0123",
        email: "reserve@bellavista.restaurant",
        address: "88 Culinary Square, Old Town Heritage District",
        operatingHours: "Tue - Sun: 5:00 PM - 11:00 PM (Closed Mondays)",
        tagline: "Authentic Wood-Fired Italian Cuisine & Vintage Wine Cellar"
      },
      content: {
        hero: {
          headline: "A Taste of Authentic Italian Craftsmanship",
          subheadline: "Handcrafted pasta, wood-fired Neapolitan pizzas, imported truffles, and sommelier-curated vintage wines.",
          ctaLabel: "Reserve A Table"
        },
        about: {
          title: "Passionate Culinary Tradition",
          body: "Founded by Chef Marco Rossi, Bella Vista honors recipes passed down through three generations of Tuscan cooks, using organic farm-to-table ingredients."
        },
        services: [
          { title: "Handcrafted Fresh Pasta", description: "Tagliatelle al Tartufo, Pappardelle al Cinghiale, and homemade Ricotta Ravioli." },
          { title: "Wood-Fired Neapolitan Pizza", description: "Baked in a 900°F volcanic stone oven with San Marzano tomatoes and Buffalo Mozzarella." },
          { title: "Private Dining & Events", description: "Exclusive wine room for private celebrations, corporate dinners, and tasting menus." }
        ],
        testimonials: [
          { name: "Gourmet Magazine", quote: "Bella Vista serves the single best Osso Buco outside of Milan. Unforgettable dining experience!" }
        ],
        faq: [
          { q: "Do you accommodate gluten-free and vegan diets?", a: "Yes, we offer gluten-free pasta and dairy-free mozzarella choices upon request." }
        ]
      },
      theme: {
        primary: "#991B1B",
        secondary: "#D97706",
        backgroundColor: "#FEF2F2",
        textColor: "#450A0A",
        accentColor: "#B45309",
        style: "CLASSIC",
        font: "Georgia"
      },
      navigation: {
        logoText: "Bella Vista",
        items: [
          { label: "Home", target: "#home" },
          { label: "Story", target: "#about" },
          { label: "Menu", target: "#services" },
          { label: "Reviews", target: "#testimonials" },
          { label: "Reservations", target: "#contact" }
        ]
      },
      features: {
        digital_menu: true,
        table_reservation: true,
        contact_form: true,
        online_ordering: false,
        doorstep_delivery: false,
        loyalty_rewards: false
      }
    }
  },

  real_estate: {
    id: "real_estate",
    name: "Luxury Real Estate & Property Advisory",
    description: "High-end residential, commercial real estate listings, and property valuation portal.",
    pages: ["home", "about", "properties", "agents", "valuation", "contact"],
    components: ["hero", "about", "services", "process", "testimonials", "contact", "footer"],
    features: ["property_listings", "valuation_calculator", "agent_contact"],
    optionalFeatures: ["3d_virtual_tour", "mortgage_calculator", "client_portal"],
    configurableFields: ["businessName", "phone", "email", "address", "primaryColor"],
    theme: { primary: "#064E3B", secondary: "#059669", style: "MODERN" },
    aiCapableFeatures: ["ai_property_matching", "automated_home_valuation"],
    requiredBackendServices: ["listings_api", "valuation_api"],
    configs: {
      business: {
        name: "Prestige Premier Realty",
        phone: "+1 (800) 333-8899",
        email: "inquiries@prestigerealty.com",
        address: "900 Ocean Drive, Penthouse Suite, Financial Heights",
        operatingHours: "Mon - Sat: 9:00 AM - 7:00 PM",
        tagline: "Curating Exquisite Waterfront Estates & Luxury Penthouses"
      },
      content: {
        hero: {
          headline: "Find Your Dream Waterfront Estate",
          subheadline: "Exclusive luxury villas, architectural masterpieces, and high-yield commercial property portfolios.",
          ctaLabel: "Explore Listings"
        },
        about: {
          title: "Bespoke Real Estate Advisory",
          body: "With over $2 Billion in successful luxury transactions, Prestige Premier Realty provides confidential, high-touch advisory services to private wealth clients globally."
        },
        services: [
          { title: "Luxury Residential Sales", description: "Oceanfront estates, private islands, and city penthouses." },
          { title: "Commercial & Investment Advisory", description: "Office towers, boutique hotels, and multi-family residential developments." },
          { title: "Property Valuation & Portfolio Management", description: "Data-driven comparative market analysis and asset optimization." }
        ],
        process: {
          title: "Buying & Selling Experience",
          steps: [
            { title: "Private Consultation", description: "Defining your architectural preferences and investment objectives." },
            { title: "Curated VIP Showings", description: "Off-market previews and private helicopter tour viewings." },
            { title: "Seamless Legal Closing", description: "End-to-end escrow, legal structuring, and concierge relocation." }
          ]
        },
        testimonials: [
          { name: "Arthur Sterling, Investor", quote: "Prestige secured an off-market penthouse for us within 72 hours. Outstanding service!" }
        ]
      },
      theme: {
        primary: "#064E3B",
        secondary: "#059669",
        backgroundColor: "#F0FDF4",
        textColor: "#022C22",
        accentColor: "#D97706",
        style: "MODERN",
        font: "Inter"
      },
      navigation: {
        logoText: "Prestige Realty",
        items: [
          { label: "Home", target: "#home" },
          { label: "About", target: "#about" },
          { label: "Properties", target: "#services" },
          { label: "Process", target: "#process" },
          { label: "Contact", target: "#contact" }
        ]
      },
      features: {
        property_listings: true,
        valuation_calculator: true,
        agent_contact: true,
        "3d_virtual_tour": false,
        mortgage_calculator: false,
        client_portal: false
      }
    }
  },

  startup: {
    id: "startup",
    name: "SaaS Startup & AI Product",
    description: "High-conversion landing page and product showcase for AI & B2B SaaS startups.",
    pages: ["home", "about", "features", "pricing", "blog", "contact"],
    components: ["hero", "about", "services", "process", "testimonials", "faq", "contact", "footer"],
    features: ["feature_showcase", "pricing_table", "waitlist_form"],
    optionalFeatures: ["user_auth", "stripe_subscription", "api_docs"],
    configurableFields: ["businessName", "phone", "email", "address", "primaryColor"],
    theme: { primary: "#6366F1", secondary: "#8B5CF6", style: "MODERN" },
    aiCapableFeatures: ["copilot_assistant", "analytics_prediction"],
    requiredBackendServices: ["auth_api", "waitlist_api"],
    configs: {
      business: {
        name: "NexusAI Platform",
        phone: "+1 (800) 555-0199",
        email: "hello@nexusai.io",
        address: "400 Silicon Avenue, Innovation Hub, Tech District",
        operatingHours: "24/7 Cloud Platform Operations & Live Support",
        tagline: "Autonomous AI Engineering & Digital Product Builder Infrastructure"
      },
      content: {
        hero: {
          headline: "Turn Product Ideas Into Live Production Apps in Minutes",
          subheadline: "Starter templates, deterministic configuration engine, schema-driven visual customization, and instant Vercel/Render deployments.",
          ctaLabel: "Start Free Trial"
        },
        about: {
          title: "Built For Modern Product Teams",
          body: "NexusAI empowers non-technical founders and product architects to build, customize, and deploy robust web applications with complete version control."
        },
        services: [
          { title: "Schema Engine & Configuration", description: "Separate code from content and styling. Update themes, nav, and copy without code rewrites." },
          { title: "AI Request Router", description: "Level 0 config updates bypass LLMs entirely. Use AI only for complex new functionality." },
          { title: "Automated QA & Repair", description: "Continuous linting, typechecking, route testing, and self-healing repair agents." }
        ],
        process: {
          title: "Ship Fast Workflow",
          steps: [
            { title: "Choose Template", description: "Select from 8 business starter blueprints." },
            { title: "Customize & Preview", description: "Instant visual editor and cloud preview environments." },
            { title: "Deploy Production", description: "One-click deployment to Vercel and Render." }
          ]
        },
        testimonials: [
          { name: "Samantha Wu, CTO at LaunchPad", quote: "NexusAI saved our engineering team 3 months of frontend development." }
        ]
      },
      theme: {
        primary: "#6366F1",
        secondary: "#8B5CF6",
        backgroundColor: "#0F172A",
        textColor: "#F8FAFC",
        accentColor: "#10B981",
        style: "MODERN",
        font: "Inter"
      },
      navigation: {
        logoText: "NexusAI",
        items: [
          { label: "Home", target: "#home" },
          { label: "Features", target: "#services" },
          { label: "Workflow", target: "#process" },
          { label: "Reviews", target: "#testimonials" },
          { label: "Contact", target: "#contact" }
        ]
      },
      features: {
        feature_showcase: true,
        pricing_table: true,
        waitlist_form: true,
        user_auth: false,
        stripe_subscription: false,
        api_docs: false
      }
    }
  }
}

export function getAllTemplates(): TemplateDefinition[] {
  return Object.values(templates)
}

export function getTemplateById(templateId: string): TemplateDefinition | null {
  const key = templateId.toLowerCase()
  return templates[key] || null
}

/**
 * Deterministically constructs a WebsiteSpecData baseline from a template JSON configuration WITHOUT calling an LLM.
 */
export function buildWebsiteSpecFromTemplate(templateId: string, customBusinessName?: string): WebsiteSpecData {
  const tmpl = getTemplateById(templateId) || templates.clinic
  const b = tmpl.configs.business
  const c = tmpl.configs.content
  const t = tmpl.configs.theme
  const n = tmpl.configs.navigation

  const siteName = customBusinessName || b.name || tmpl.name

  const sections: any[] = [
    {
      id: "hero",
      type: "hero",
      order: 1,
      visible: true,
      headline: c.hero?.headline || `Welcome to ${siteName}`,
      subheadline: c.hero?.subheadline || b.tagline || tmpl.description,
      ctaLabel: c.hero?.ctaLabel || "Get Started"
    },
    {
      id: "about",
      type: "about",
      order: 2,
      visible: true,
      title: c.about?.title || `About ${siteName}`,
      body: c.about?.body || `${siteName} provides premium professional services.`
    },
    {
      id: "services",
      type: "services",
      order: 3,
      visible: true,
      title: "Our Services & Capabilities",
      items: c.services || []
    }
  ]

  if (c.process) {
    sections.push({
      id: "process",
      type: "process",
      order: 4,
      visible: true,
      title: c.process.title || "How It Works",
      steps: c.process.steps || []
    })
  }

  if (c.testimonials && c.testimonials.length > 0) {
    sections.push({
      id: "testimonials",
      type: "testimonials",
      order: 5,
      visible: true,
      title: "Client Testimonials",
      items: c.testimonials
    })
  }

  if (c.faq && c.faq.length > 0) {
    sections.push({
      id: "faq",
      type: "faq",
      order: 6,
      visible: true,
      title: "Frequently Asked Questions",
      items: c.faq
    })
  }

  sections.push({
    id: "contact",
    type: "contact",
    order: 7,
    visible: true,
    title: "Contact Us",
    body: `${b.address || ""} | Phone: ${b.phone || ""} | Email: ${b.email || ""}`
  })

  sections.push({
    id: "footer",
    type: "footer",
    order: 8,
    visible: true,
    text: `© ${new Date().getFullYear()} ${siteName}. All rights reserved.`
  })

  return {
    siteName,
    language: "en",
    dir: "ltr",
    theme: {
      primary: t.primary,
      secondaryColor: t.secondary,
      backgroundColor: t.backgroundColor,
      textColor: t.textColor,
      accentColor: t.accentColor,
      style: t.style || "MODERN"
    },
    nav: (n.items || []).map((i: any) => i.label || i),
    sections,
    seo: {
      title: siteName,
      description: tmpl.description
    }
  }
}
