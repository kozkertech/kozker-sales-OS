let _id = 1000;
const nextId = () => String(++_id);
const now = () => new Date().toISOString();
const minsAgo = (m) => new Date(Date.now() - m * 60000).toISOString();
const hoursAgo = (h) => new Date(Date.now() - h * 3600000).toISOString();
const daysAgo = (d) => new Date(Date.now() - d * 86400000).toISOString();

const DEMO_USER = {
  id: "u_demo_1",
  name: "Alex Morgan",
  email: "alex@salesmind.ai",
  role: "manager",
  workspace_id: "ws_demo",
  workspace_name: "Morgan Ventures",
};

const FIELDS = {
  contact: [
    { id: "f1", key: "name", label: "Name", type: "text", core: true, ai_generated: false, ai_prompt: null, options: [] },
    { id: "f2", key: "email", label: "Email", type: "email", core: true, ai_generated: false, ai_prompt: null, options: [] },
    { id: "f3", key: "phone", label: "Phone", type: "text", core: true, ai_generated: false, ai_prompt: null, options: [] },
    { id: "f4", key: "company", label: "Company", type: "text", core: true, ai_generated: false, ai_prompt: null, options: [] },
    { id: "f5", key: "title", label: "Title", type: "text", core: true, ai_generated: false, ai_prompt: null, options: [] },
    { id: "f6", key: "status", label: "Status", type: "select", core: true, ai_generated: false, ai_prompt: null, options: ["Lead", "Qualified", "Customer", "Churned"] },
    { id: "f7", key: "linkedin", label: "LinkedIn URL", type: "url", core: false, ai_generated: true, ai_prompt: "Social presence for outreach", options: [] },
  ],
  company: [
    { id: "f10", key: "name", label: "Company", type: "text", core: true, ai_generated: false, ai_prompt: null, options: [] },
    { id: "f11", key: "domain", label: "Domain", type: "text", core: true, ai_generated: false, ai_prompt: null, options: [] },
    { id: "f12", key: "industry", label: "Industry", type: "text", core: true, ai_generated: false, ai_prompt: null, options: [] },
    { id: "f13", key: "size", label: "Employees", type: "number", core: true, ai_generated: false, ai_prompt: null, options: [] },
    { id: "f14", key: "revenue", label: "Est. Revenue", type: "number", core: false, ai_generated: true, ai_prompt: "Revenue for scoring", options: [] },
  ],
  deal: [
    { id: "f20", key: "title", label: "Deal", type: "text", core: true, ai_generated: false, ai_prompt: null, options: [] },
    { id: "f21", key: "value", label: "Value", type: "number", core: true, ai_generated: false, ai_prompt: null, options: [] },
    { id: "f22", key: "stage", label: "Stage", type: "select", core: true, ai_generated: false, ai_prompt: null, options: ["Lead", "Contacted", "Proposal", "Won", "Lost"] },
    { id: "f23", key: "contact", label: "Contact", type: "text", core: true, ai_generated: false, ai_prompt: null, options: [] },
  ],
};

const RECORDS = [
  // Contacts
  { id: "r1", object_type: "contact", owner_id: "u_demo_1", workspace_id: "ws_demo", data: { name: "Sarah Chen", email: "sarah@techflow.io", phone: "+1 415-555-0142", company: "TechFlow", title: "VP Engineering", status: "Qualified", linkedin: "linkedin.com/in/sarahchen" } },
  { id: "r2", object_type: "contact", owner_id: "u_demo_1", workspace_id: "ws_demo", data: { name: "Marcus Reid", email: "marcus@brightlabs.com", phone: "+1 212-555-0198", company: "Bright Labs", title: "CTO", status: "Lead", linkedin: "linkedin.com/in/marcusreid" } },
  { id: "r3", object_type: "contact", owner_id: "u_demo_1", workspace_id: "ws_demo", data: { name: "Emily Watson", email: "emily@cloudpeak.co", phone: "+1 206-555-0177", company: "CloudPeak", title: "Head of Sales", status: "Customer", linkedin: "linkedin.com/in/emilywatson" } },
  { id: "r4", object_type: "contact", owner_id: "u_demo_1", workspace_id: "ws_demo", data: { name: "James Park", email: "james@datavision.ai", phone: "+1 312-555-0153", company: "DataVision", title: "CEO", status: "Qualified", linkedin: "linkedin.com/in/jamespark" } },
  { id: "r5", object_type: "contact", owner_id: "u_demo_1", workspace_id: "ws_demo", data: { name: "Priya Sharma", email: "priya@finovate.io", phone: "+1 646-555-0124", company: "Finovate", title: "VP Product", status: "Lead", linkedin: "linkedin.com/in/priyasharma" } },
  { id: "r6", object_type: "contact", owner_id: "u_demo_1", workspace_id: "ws_demo", data: { name: "David Liu", email: "david@scaleup.dev", phone: "+1 408-555-0188", company: "ScaleUp", title: "Founder", status: "Customer", linkedin: "linkedin.com/in/davidliu" } },
  { id: "r7", object_type: "contact", owner_id: "u_demo_1", workspace_id: "ws_demo", data: { name: "Nina Costa", email: "nina@apexgrid.com", phone: "+1 713-555-0166", company: "ApexGrid", title: "Director of Ops", status: "Churned", linkedin: "linkedin.com/in/ninacosta" } },

  // Companies
  { id: "r20", object_type: "company", owner_id: "u_demo_1", workspace_id: "ws_demo", data: { name: "TechFlow", domain: "techflow.io", industry: "SaaS", size: 85, revenue: 12000000 } },
  { id: "r21", object_type: "company", owner_id: "u_demo_1", workspace_id: "ws_demo", data: { name: "Bright Labs", domain: "brightlabs.com", industry: "AI/ML", size: 42, revenue: 6500000 } },
  { id: "r22", object_type: "company", owner_id: "u_demo_1", workspace_id: "ws_demo", data: { name: "CloudPeak", domain: "cloudpeak.co", industry: "Cloud Infrastructure", size: 210, revenue: 45000000 } },
  { id: "r23", object_type: "company", owner_id: "u_demo_1", workspace_id: "ws_demo", data: { name: "DataVision", domain: "datavision.ai", industry: "Data Analytics", size: 28, revenue: 4200000 } },
  { id: "r24", object_type: "company", owner_id: "u_demo_1", workspace_id: "ws_demo", data: { name: "Finovate", domain: "finovate.io", industry: "FinTech", size: 150, revenue: 28000000 } },

  // Deals
  { id: "r30", object_type: "deal", owner_id: "u_demo_1", workspace_id: "ws_demo", data: { title: "TechFlow — Enterprise Plan", value: 48000, stage: "Proposal", contact: "Sarah Chen", _score: 82, _next_action: "Send pricing comparison and schedule demo with procurement." } },
  { id: "r31", object_type: "deal", owner_id: "u_demo_1", workspace_id: "ws_demo", data: { title: "Bright Labs — Pilot", value: 12000, stage: "Contacted", contact: "Marcus Reid", _score: 65, _next_action: "Follow up on technical integration questions." } },
  { id: "r32", object_type: "deal", owner_id: "u_demo_1", workspace_id: "ws_demo", data: { title: "CloudPeak — Annual Renewal", value: 95000, stage: "Won", contact: "Emily Watson", _score: 95, _next_action: "Schedule onboarding kickoff call." } },
  { id: "r33", object_type: "deal", owner_id: "u_demo_1", workspace_id: "ws_demo", data: { title: "DataVision — Platform License", value: 24000, stage: "Lead", contact: "James Park", _score: 48, _next_action: "Send case study relevant to their use case." } },
  { id: "r34", object_type: "deal", owner_id: "u_demo_1", workspace_id: "ws_demo", data: { title: "Finovate — Multi-seat", value: 67000, stage: "Proposal", contact: "Priya Sharma", _score: 71, _next_action: "Address security review questionnaire." } },
  { id: "r35", object_type: "deal", owner_id: "u_demo_1", workspace_id: "ws_demo", data: { title: "ScaleUp — Growth Tier", value: 18000, stage: "Contacted", contact: "David Liu", _score: 58, _next_action: "Share ROI calculator and customer testimonials." } },
  { id: "r36", object_type: "deal", owner_id: "u_demo_1", workspace_id: "ws_demo", data: { title: "ApexGrid — Legacy", value: 8000, stage: "Lost", contact: "Nina Costa", _score: 12, _next_action: "No action — deal marked lost." } },
];

const ACTIVITIES = {};
function getActivities(recordId) {
  if (!ACTIVITIES[recordId]) {
    const record = RECORDS.find((r) => r.id === recordId);
    const name = record?.data?.name || record?.data?.title || "Record";
    ACTIVITIES[recordId] = [
      { id: nextId(), type: "note", content: `Initial outreach to ${name}. Scheduled discovery call.`, created_at: daysAgo(5) },
      { id: nextId(), type: "ai", content: "AI enriched company info: industry classification and employee count estimated.", created_at: daysAgo(3) },
      { id: nextId(), type: "note", content: "Follow-up email sent. Awaiting response on timeline.", created_at: daysAgo(2) },
      { id: nextId(), type: "ai", content: "Lead score updated to 82 based on engagement signals and deal velocity.", created_at: hoursAgo(6) },
    ];
  }
  return ACTIVITIES[recordId];
}

const SEQUENCES = [
  {
    id: "seq1",
    name: "Warm Lead Nurture",
    status: "active",
    autonomy: "approval",
    trigger_type: "manual",
    trigger_config: {},
    active_enrollments: 4,
    enrolled: 6,
    steps: [
      { channel: "email", delay_days: 0, subject: "Quick intro", ai_prompt: "Write a warm introduction email referencing their company" },
      { channel: "email", delay_days: 3, subject: "Following up", ai_prompt: "Follow up with a relevant case study" },
      { channel: "whatsapp", delay_days: 7, subject: "", ai_prompt: "Short WhatsApp check-in message" },
    ],
  },
  {
    id: "seq2",
    name: "Post-Demo Follow-up",
    status: "paused",
    autonomy: "auto",
    trigger_type: "stage",
    trigger_config: { stage: "Proposal" },
    active_enrollments: 0,
    enrolled: 2,
    steps: [
      { channel: "email", delay_days: 0, subject: "Thanks for the demo!", ai_prompt: "Thank them and share next steps" },
      { channel: "email", delay_days: 2, subject: "Pricing details", ai_prompt: "Share pricing and ROI comparison" },
    ],
  },
];

const SEQUENCE_ENROLLMENTS = {
  seq1: [
    { id: "enr1", contact_name: "Marcus Reid", current_step: 1, steps_total: 3, status: "active", next_run_at: daysAgo(-2) },
    { id: "enr2", contact_name: "Priya Sharma", current_step: 2, steps_total: 3, status: "active", next_run_at: daysAgo(-1) },
    { id: "enr3", contact_name: "James Park", current_step: 3, steps_total: 3, status: "completed", next_run_at: null },
  ],
  seq2: [],
};

const AGENT_ACTIONS = [
  { id: "aa1", type: "create_task", description: "Create a follow-up task for Sarah Chen — call within 2 days to discuss enterprise pricing.", created_at: hoursAgo(3) },
  { id: "aa2", type: "move_deal", description: "Move deal 'Bright Labs — Pilot' from Contacted to Proposal based on recent email engagement.", created_at: hoursAgo(8) },
  { id: "aa3", type: "enroll_sequence", description: "Enroll Priya Sharma into the 'Post-Demo Follow-up' sequence after proposal stage change.", created_at: daysAgo(1) },
];

const PENDING_MESSAGES = [
  { id: "msg1", channel: "email", contact_name: "Sarah Chen", to: "sarah@techflow.io", subject: "Enterprise pricing for TechFlow", body: "Hi Sarah,\n\nThanks for the great conversation yesterday. As discussed, here's a summary of our enterprise plan pricing tailored for TechFlow's team of 85:\n\n• Annual license: $48,000\n• Includes: Unlimited seats, priority support, custom integrations\n• Onboarding: 2-week guided setup\n\nWould you like me to set up a call with procurement this week?\n\nBest,\nAlex", sequence_name: "Warm Lead Nurture" },
  { id: "msg2", channel: "whatsapp", contact_name: "Marcus Reid", to: "+1 212-555-0198", subject: "", body: "Hi Marcus! Following up on our chat about Bright Labs' data pipeline needs. Have you had a chance to review the technical doc I sent? Happy to jump on a quick call to walk through any questions. — Alex", sequence_name: "Warm Lead Nurture" },
  { id: "msg3", channel: "email", contact_name: "Priya Sharma", to: "priya@finovate.io", subject: "Security review — answers inside", body: "Hi Priya,\n\nThanks for sending over the security questionnaire. I've completed all the responses and attached the updated document. A few highlights:\n\n• SOC 2 Type II certified\n• Data encrypted at rest (AES-256) and in transit (TLS 1.3)\n• Annual penetration testing by third party\n\nLet me know if anything needs more detail!\n\nBest,\nAlex", sequence_name: "Post-Demo Follow-up" },
];

const TEAM_MEMBERS = [
  { id: "u_demo_1", name: "Alex Morgan", email: "alex@salesmind.ai", role: "manager" },
  { id: "u_demo_2", name: "Jordan Lee", email: "jordan@salesmind.ai", role: "rep" },
  { id: "u_demo_3", name: "Taylor Brooks", email: "taylor@salesmind.ai", role: "rep" },
];

const INVITES = [
  { id: "inv1", email: "casey@salesmind.ai", role: "rep", status: "pending" },
  { id: "inv2", email: "sam@salesmind.ai", role: "rep", status: "accepted" },
];

const AUDIT_LOGS = [
  { id: "al1", created_at: minsAgo(12), actor_name: "Alex Morgan", action: "record.enrich", detail: "AI enriched 'industry' field for CloudPeak from model knowledge", ai_model: "gemini-2.5-flash" },
  { id: "al2", created_at: minsAgo(45), actor_name: "Alex Morgan", action: "chat.query", detail: "Asked: 'What's my hottest deal in proposal stage?'", ai_model: "gemini-2.5-pro" },
  { id: "al3", created_at: hoursAgo(2), actor_name: "Alex Morgan", action: "field.create", detail: "AI-suggested field 'LinkedIn URL' added to contacts", ai_model: "gemini-2.5-flash" },
  { id: "al4", created_at: hoursAgo(5), actor_name: "Jordan Lee", action: "record.enrich", detail: "AI enriched 'revenue' field for DataVision", ai_model: "gemini-2.5-flash" },
  { id: "al5", created_at: hoursAgo(9), actor_name: "Alex Morgan", action: "chat.query", detail: "Asked: 'Score all my deals and tell me the top 3 priorities'", ai_model: "gemini-2.5-pro" },
  { id: "al6", created_at: daysAgo(1), actor_name: "Taylor Brooks", action: "field.create", detail: "Created manual field 'Est. Revenue' for companies", ai_model: null },
  { id: "al7", created_at: daysAgo(2), actor_name: "Alex Morgan", action: "record.enrich", detail: "Bulk enriched 5 contacts with LinkedIn URLs", ai_model: "gemini-2.5-flash" },
  { id: "al8", created_at: daysAgo(3), actor_name: "Alex Morgan", action: "chat.query", detail: "Asked: 'Which contacts haven't been contacted in 2 weeks?'", ai_model: "gemini-2.5-pro" },
];

function sleep(ms) { return new Promise((r) => setTimeout(r, ms)); }

const enrichValues = {
  linkedin: "linkedin.com/in/auto-discovered",
  revenue: Math.floor(Math.random() * 50000000 + 2000000),
  industry: ["SaaS", "FinTech", "AI/ML", "Cloud Infrastructure", "Data Analytics", "DevTools"][Math.floor(Math.random() * 6)],
  size: Math.floor(Math.random() * 300 + 10),
  title: ["VP Sales", "Head of Growth", "Director of Engineering", "COO", "VP Marketing"][Math.floor(Math.random() * 5)],
};

export async function mockRequest(method, path, body) {
  await sleep(200 + Math.random() * 300);

  // Auth
  if (path === "/auth/login" && method === "post") return DEMO_USER;
  if (path === "/auth/register" && method === "post") return { ...DEMO_USER, name: body.name, email: body.email, workspace_name: body.workspace_name || `${body.name.split(" ")[0]}'s Workspace` };
  if (path === "/auth/me" && method === "get") return DEMO_USER;
  if (path === "/auth/logout" && method === "post") return { ok: true };

  // Stats
  if (path === "/stats" && method === "get") {
    const deals = RECORDS.filter((r) => r.object_type === "deal");
    return {
      pipeline_value: deals.filter((d) => !["Won", "Lost"].includes(d.data.stage)).reduce((s, d) => s + (d.data.value || 0), 0),
      won_value: deals.filter((d) => d.data.stage === "Won").reduce((s, d) => s + (d.data.value || 0), 0),
      contacts: RECORDS.filter((r) => r.object_type === "contact").length,
      companies: RECORDS.filter((r) => r.object_type === "company").length,
      stage_counts: {
        Lead: deals.filter((d) => d.data.stage === "Lead").length,
        Contacted: deals.filter((d) => d.data.stage === "Contacted").length,
        Proposal: deals.filter((d) => d.data.stage === "Proposal").length,
        Won: deals.filter((d) => d.data.stage === "Won").length,
        Lost: deals.filter((d) => d.data.stage === "Lost").length,
      },
      ai_fields: FIELDS.contact.filter((f) => f.ai_generated).length + FIELDS.company.filter((f) => f.ai_generated).length,
    };
  }

  // Timeline
  if (path === "/timeline" && method === "get") {
    return [
      { id: nextId(), type: "ai", content: "Lead score updated for TechFlow — Enterprise Plan (82/100)", created_at: hoursAgo(2) },
      { id: nextId(), type: "note", content: "Discovery call completed with Sarah Chen from TechFlow", created_at: hoursAgo(5) },
      { id: nextId(), type: "ai", content: "AI enriched LinkedIn profile for 5 contacts", created_at: hoursAgo(8) },
      { id: nextId(), type: "note", content: "Sent follow-up email to Marcus Reid at Bright Labs", created_at: hoursAgo(12) },
      { id: nextId(), type: "ai", content: "Bulk deal scoring completed — 7 deals scored", created_at: daysAgo(1) },
      { id: nextId(), type: "note", content: "CloudPeak deal moved to Won — $95,000", created_at: daysAgo(1) },
      { id: nextId(), type: "ai", content: "AI suggested new field: LinkedIn URL for contacts", created_at: daysAgo(2) },
      { id: nextId(), type: "note", content: "New sequence 'Post-Demo Follow-up' created", created_at: daysAgo(2) },
      { id: nextId(), type: "ai", content: "Finovate deal score updated to 71 — recommend addressing security review", created_at: daysAgo(3) },
      { id: nextId(), type: "note", content: "Onboarded Taylor Brooks to the workspace", created_at: daysAgo(4) },
    ];
  }

  // Fields
  if (path.startsWith("/fields") && method === "get") {
    const url = new URL(path, "http://mock");
    const ot = url.searchParams.get("object_type");
    return FIELDS[ot] || [];
  }
  if (path === "/fields" && method === "post") {
    const f = { id: nextId(), key: body.label.toLowerCase().replace(/\s+/g, "_"), ...body, options: body.options || [] };
    if (!FIELDS[body.object_type]) FIELDS[body.object_type] = [];
    FIELDS[body.object_type].push(f);
    return f;
  }
  if (path.startsWith("/fields/") && method === "delete") {
    const id = path.split("/")[1];
    for (const ot of Object.keys(FIELDS)) FIELDS[ot] = FIELDS[ot].filter((f) => f.id !== id);
    return { ok: true };
  }
  if (path === "/fields/ai-build" && method === "post") {
    return {
      fields: [
        { label: "Funding Stage", type: "select", options: ["Pre-seed", "Seed", "Series A", "Series B", "Series C+"], reason: "Helps prioritize outreach based on company maturity and budget." },
        { label: "Tech Stack", type: "text", options: [], reason: "Knowing their stack helps tailor integration talking points." },
      ],
      model: "gemini-2.5-flash",
    };
  }
  if (path === "/fields/ai-suggest" && method === "post") {
    return {
      fields: [
        { label: "Decision Timeline", type: "text", reason: "Capture when they plan to make a purchasing decision." },
        { label: "Budget Range", type: "text", reason: "Qualify leads by understanding their budget constraints." },
      ],
    };
  }

  // Records
  if (path.startsWith("/records") && method === "get") {
    const url = new URL(path, "http://mock");
    const ot = url.searchParams.get("object_type");
    return RECORDS.filter((r) => r.object_type === ot).map((r) => ({ id: r.id, data: r.data }));
  }
  if (path === "/records" && method === "post") {
    const rec = { id: nextId(), object_type: body.object_type, owner_id: "u_demo_1", workspace_id: "ws_demo", data: body.data };
    RECORDS.push(rec);
    return { id: rec.id, data: rec.data };
  }
  if (path.startsWith("/records/") && method === "put") {
    const id = path.split("/")[1];
    const rec = RECORDS.find((r) => r.id === id);
    if (rec) rec.data = { ...rec.data, ...body.data };
    return { id, data: rec?.data || body.data };
  }
  if (path.startsWith("/records/") && method === "delete") {
    const id = path.split("/")[1];
    const idx = RECORDS.findIndex((r) => r.id === id);
    if (idx >= 0) RECORDS.splice(idx, 1);
    return { ok: true };
  }
  if (path.includes("/enrich") && method === "post") {
    const id = path.split("/")[1];
    const rec = RECORDS.find((r) => r.id === id);
    const fk = body.field_key;
    const val = enrichValues[fk] !== undefined ? enrichValues[fk] : "AI-generated insight";
    if (rec) rec.data[fk] = val;
    return { value: String(val), model: "gemini-2.5-flash" };
  }

  // Activities
  if (path.includes("/activities") && method === "get") {
    const id = path.split("/")[1];
    return getActivities(id);
  }
  if (path === "/activities" && method === "post") {
    const act = { id: nextId(), type: body.type, content: body.content, created_at: now() };
    if (!ACTIVITIES[body.record_id]) ACTIVITIES[body.record_id] = [];
    ACTIVITIES[body.record_id].unshift(act);
    return act;
  }

  // Deals scoring
  if (path === "/deals/score-all" && method === "post") {
    const deals = RECORDS.filter((r) => r.object_type === "deal");
    deals.forEach((d) => {
      const base = d.data.stage === "Won" ? 95 : d.data.stage === "Proposal" ? 75 : d.data.stage === "Contacted" ? 55 : d.data.stage === "Lead" ? 40 : 10;
      d.data._score = Math.min(100, base + Math.floor(Math.random() * 15));
      d.data._next_action = d.data.stage === "Won" ? "Schedule onboarding." : d.data.stage === "Lost" ? "No action needed." : "Follow up within 48 hours with personalized outreach.";
    });
    return { scored: deals.length };
  }

  // Sequences
  if (path === "/sequences" && method === "get") return SEQUENCES;
  if (path === "/sequences" && method === "post") {
    const seq = { id: nextId(), active_enrollments: 0, enrolled: 0, ...body, status: "paused" };
    SEQUENCES.push(seq);
    SEQUENCE_ENROLLMENTS[seq.id] = [];
    return seq;
  }
  if (path.match(/^\/sequences\/[^/]+\/toggle$/) && method === "put") {
    const id = path.split("/")[1];
    const seq = SEQUENCES.find((s) => s.id === id);
    if (seq) seq.status = seq.status === "active" ? "paused" : "active";
    return seq;
  }
  if (path.match(/^\/sequences\/[^/]+$/) && method === "delete") {
    const id = path.split("/")[1];
    const idx = SEQUENCES.findIndex((s) => s.id === id);
    if (idx >= 0) SEQUENCES.splice(idx, 1);
    return { ok: true };
  }
  if (path.match(/^\/sequences\/[^/]+\/enrollments$/) && method === "get") {
    const id = path.split("/")[1];
    return SEQUENCE_ENROLLMENTS[id] || [];
  }
  if (path.match(/^\/sequences\/[^/]+\/enroll$/) && method === "post") {
    const id = path.split("/")[1];
    const seq = SEQUENCES.find((s) => s.id === id);
    const contact = RECORDS.find((r) => r.id === body.contact_record_id);
    if (seq && contact) {
      seq.enrolled++;
      seq.active_enrollments++;
      if (!SEQUENCE_ENROLLMENTS[id]) SEQUENCE_ENROLLMENTS[id] = [];
      SEQUENCE_ENROLLMENTS[id].push({ id: nextId(), contact_name: contact.data.name, current_step: 1, steps_total: seq.steps.length, status: "active", next_run_at: now() });
    }
    return { ok: true };
  }

  // Scheduler
  if (path === "/scheduler/run" && method === "post") return { processed: Math.floor(Math.random() * 3) };

  // Agent actions
  if (path === "/agent/actions" && method === "get") return AGENT_ACTIONS;
  if (path === "/agent/plan" && method === "post") {
    return {
      actions: [
        { id: nextId(), type: "create_task", description: `Based on your message, create a follow-up task for your top 3 deals in proposal stage.` },
        { id: nextId(), type: "send_email", description: `Draft a check-in email to contacts who haven't been contacted in 14 days.` },
      ],
      model: "gemini-2.5-pro",
    };
  }
  if (path.match(/^\/agent\/actions\/[^/]+\/approve$/) && method === "post") {
    return { result: "Action approved and executed. Task created and assigned." };
  }
  if (path.match(/^\/agent\/actions\/[^/]+\/reject$/) && method === "post") {
    return { ok: true };
  }

  // Messages
  if (path === "/messages/pending" && method === "get") return PENDING_MESSAGES;
  if (path.match(/^\/messages\/[^/]+\/approve$/) && method === "post") {
    const id = path.split("/")[1];
    const idx = PENDING_MESSAGES.findIndex((m) => m.id === id);
    if (idx >= 0) PENDING_MESSAGES.splice(idx, 1);
    return { delivery: "Message sent successfully via email." };
  }
  if (path.match(/^\/messages\/[^/]+\/reject$/) && method === "post") {
    const id = path.split("/")[1];
    const idx = PENDING_MESSAGES.findIndex((m) => m.id === id);
    if (idx >= 0) PENDING_MESSAGES.splice(idx, 1);
    return { ok: true };
  }

  // Team
  if (path === "/team" && method === "get") return TEAM_MEMBERS;
  if (path === "/invites" && method === "get") return INVITES;
  if (path === "/invites" && method === "post") {
    const inv = { id: nextId(), email: body.email, role: body.role, status: "pending" };
    INVITES.push(inv);
    return { email_sent: true };
  }
  if (path.startsWith("/invites/") && method === "delete") {
    const id = path.split("/")[1];
    const idx = INVITES.findIndex((i) => i.id === id);
    if (idx >= 0) INVITES.splice(idx, 1);
    return { ok: true };
  }
  if (path.startsWith("/invites/verify") && method === "get") {
    return { workspace_name: "Morgan Ventures", role: "rep", email: "newbie@salesmind.ai" };
  }
  if (path === "/invites/accept" && method === "post") {
    return { ok: true };
  }

  // Audit
  if (path === "/audit" && method === "get") return AUDIT_LOGS;

  console.warn(`[mock] Unhandled: ${method.toUpperCase()} ${path}`);
  return {};
}

const CHAT_RESPONSES = [
  "Based on your pipeline, your hottest deal is **TechFlow — Enterprise Plan** ($48,000) with a lead score of 82/100. It's currently in the Proposal stage.\n\nHere's what I'd recommend:\n1. **Send pricing comparison** — Sarah Chen is evaluating options, so a clear ROI breakdown will help.\n2. **Schedule a procurement call** — Get the buying committee involved early.\n3. **Loop in a technical resource** — Address any integration questions proactively.\n\nYour next best action is to follow up within 48 hours to keep momentum.",
  "Looking at your contacts, **3 contacts** haven't been reached in over 2 weeks:\n\n• **James Park** (DataVision) — Last contacted 16 days ago\n• **Nina Costa** (ApexGrid) — Marked as churned, consider re-engagement\n• **Marcus Reid** (Bright Labs) — In active sequence, step 2 of 3\n\nWould you like me to draft a re-engagement email for James Park? I can also enroll him in the Warm Lead Nurture sequence.",
  "Your pipeline is looking strong! Here's a quick summary:\n\n• **Total pipeline value**: $154,000 across 5 active deals\n• **Won this quarter**: $95,000 (CloudPeak)\n• **Deals in Proposal**: 2 (TechFlow, Finovate) — total $115K\n\nThe **Finovate** deal ($67K) has a score of 71. The next best action is to address their security review questionnaire — this is a common blocker at this stage. I can draft a response if you'd like.",
  "I analyzed your deal velocity and here's what stands out:\n\n**Fast-moving deals** (high velocity):\n• CloudPeak — moved from Lead to Won in 12 days\n\n**Stalled deals** (need attention):\n• Bright Labs — in Contacted for 18 days, score 65\n• ScaleUp — in Contacted for 14 days, score 58\n\n**Recommendation**: For Bright Labs, the next step is to address their technical integration questions. For ScaleUp, share the ROI calculator to re-energize the conversation.",
];

export async function mockChat(message) {
  const response = CHAT_RESPONSES[Math.floor(Math.random() * CHAT_RESPONSES.length)];
  const words = response.split(" ");
  return {
    async *[Symbol.asyncIterator]() {
      for (let i = 0; i < words.length; i++) {
        await sleep(20 + Math.random() * 40);
        yield (i === 0 ? "" : " ") + words[i];
      }
    },
  };
}
