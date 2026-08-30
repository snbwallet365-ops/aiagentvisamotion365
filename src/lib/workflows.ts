import { getCountry } from "./visa-data";

export interface WorkflowStep {
  step: string;
  stepBn: string;
  command: string;
  failure: string;
}

export interface WorkflowDef {
  key: string;
  name: string;
  nameBn: string;
  engine: "agent-browser" | "playwright-cli";
  tokensPerSnapshot: number;
  description: string;
  descriptionBn: string;
  steps: WorkflowStep[];
}

export const WORKFLOWS: WorkflowDef[] = [
  {
    key: "embassy-login-status",
    name: "Embassy Portal Login & Status Check",
    nameBn: "এম্বাসি পোর্টাল লগইন ও স্ট্যাটাস চেক",
    engine: "agent-browser",
    tokensPerSnapshot: 280,
    description: "Authenticates into the embassy portal, handles 2FA, extracts case status and archives a screenshot.",
    descriptionBn: "এম্বাসি পোর্টালে লগইন করে, টু-ফ্যাক্টর কোড সামলায়, কেসের স্ট্যাটাস আনে এবং স্ক্রিনশট সংরক্ষণ করে।",
    steps: [
      { step: "Open portal", stepBn: "পোর্টাল খোলা", command: 'agent-browser open "$PORTAL_URL" && agent-browser snapshot -i', failure: "Site downtime → wait 5m, exponential backoff 1x/2x/4x" },
      { step: "Fill credentials", stepBn: "লগইন তথ্য পূরণ", command: 'agent-browser fill @e1 "$USERNAME" && agent-browser fill @e2 "$PASSWORD"', failure: "Ref not found → re-snapshot, scroll 500px, retry (max 3)" },
      { step: "Submit login", stepBn: "লগইন জমা", command: "agent-browser click @e3", failure: "Wrong password → log + Slack alert, skip client" },
      { step: "Handle 2FA", stepBn: "টু-ফ্যাক্টর কোড যাচাই", command: 'agent-browser wait --text "Verification code" && agent-browser fill @e4 "$TWO_FA_CODE"', failure: "2FA required → pause, request OTP from operator, resume" },
      { step: "Navigate to status", stepBn: "স্ট্যাটাস পাতায় যাওয়া", command: 'agent-browser wait --url "**/status**" && agent-browser snapshot -i', failure: "Navigation timeout → increase wait --load networkidle" },
      { step: "Extract status", stepBn: "স্ট্যাটাস সংগ্রহ", command: "agent-browser get text @e6", failure: "Empty node → re-snapshot and re-read ref" },
      { step: "Archive screenshot", stepBn: "স্ক্রিনশট সংরক্ষণ", command: 'agent-browser screenshot "./status-$(date +%Y%m%d-%H%M%S).png"', failure: "Disk error → retry to /tmp then upload" },
    ],
  },
  {
    key: "visa-form-filling",
    name: "Online Visa Application Form Filling",
    nameBn: "অনলাইন ভিসা আবেদন ফর্ম পূরণ",
    engine: "agent-browser",
    tokensPerSnapshot: 340,
    description: "Maps applicant JSON onto the country portal form, uploads documents, validates and submits.",
    descriptionBn: "আবেদনকারীর তথ্য দেশভিত্তিক ফর্মে বসায়, ডকুমেন্ট আপলোড করে, যাচাই করে এবং জমা দেয়।",
    steps: [
      { step: "Load applicant JSON", stepBn: "আবেদনকারীর তথ্য লোড", command: 'PASSPORT_NO=$(jq -r ".passportNo" "$APPLICANT_JSON")', failure: "Missing field → abort with validation error" },
      { step: "Open portal", stepBn: "পোর্টাল খোলা", command: 'agent-browser open "$PORTAL_URL" && agent-browser snapshot -i', failure: "Network error → retry 1s/2s/4s/8s" },
      { step: "Fill identity fields", stepBn: "পরিচয় তথ্য পূরণ", command: 'agent-browser fill @e1 "$PASSPORT_NO" && agent-browser fill @e2 "$FULL_NAME"', failure: "Stale ref → snapshot again, remap refs" },
      { step: "Select nationality + dates", stepBn: "জাতীয়তা ও তারিখ নির্বাচন", command: 'agent-browser select @e3 "$NATIONALITY" && agent-browser fill @e4 "$TRAVEL_DATES"', failure: "Option missing → fuzzy-match label, else escalate" },
      { step: "Upload documents", stepBn: "ডকুমেন্ট আপলোড", command: "agent-browser upload @e5 ./documents/passport-copy.pdf", failure: "Rejected upload → compress PDF <5MB, convert PDF/A, retry" },
      { step: "Pre-submit validation", stepBn: "জমার আগে যাচাই", command: 'agent-browser query "input[required]:empty"', failure: "Missing required fields → fill and re-validate" },
      { step: "Submit + capture tracking id", stepBn: "জমা ও ট্র্যাকিং আইডি সংগ্রহ", command: "agent-browser click @e8 && agent-browser wait --load networkidle && agent-browser get text @e9", failure: "Session timeout → reload auth state, restart at step 3" },
    ],
  },
  {
    key: "employer-work-permit",
    name: "Employer Work Permit Authorization",
    nameBn: "নিয়োগকর্তা ওয়ার্ক পারমিট অনুমোদন",
    engine: "agent-browser",
    tokensPerSnapshot: 360,
    description: "Employer-side sponsorship: logs into the employer portal, files the work permit and stores the confirmation number.",
    descriptionBn: "নিয়োগকর্তার পোর্টালে লগইন করে ওয়ার্ক পারমিট আবেদন জমা দেয় এবং কনফার্মেশন নম্বর সংরক্ষণ করে।",
    steps: [
      { step: "Employer login", stepBn: "নিয়োগকর্তার লগইন", command: 'agent-browser fill @e1 "$EMPLOYER_ID" && agent-browser click @e3', failure: "Session timeout → reload auth state, restart" },
      { step: "Open work permit request", stepBn: "ওয়ার্ক পারমিট আবেদন খোলা", command: 'agent-browser click @e4 && agent-browser wait --url "**/work-permit**"', failure: "Menu changed → re-snapshot, search by accessible name" },
      { step: "Fill employee details", stepBn: "কর্মীর তথ্য পূরণ", command: 'agent-browser fill @e5 "$EMPLOYEE_NAME" && agent-browser fill @e7 "$JOB_TITLE"', failure: "Validation error → normalise occupation code (ANZSCO/ISCO)" },
      { step: "Enter salary", stepBn: "বেতন উল্লেখ", command: 'agent-browser fill @e8 "$SALARY"', failure: "Below threshold → warn employer, pause workflow" },
      { step: "Attach contract pack", stepBn: "চুক্তিপত্র সংযুক্ত", command: "agent-browser upload @e9 ./documents/employment-contract.pdf", failure: "File >5MB → compress and retry" },
      { step: "Submit + confirmation", stepBn: "জমা ও কনফার্মেশন", command: "agent-browser click @e12 && agent-browser get text @e13", failure: "No confirmation → wait 60s, retry, escalate to human" },
    ],
  },
  {
    key: "appointment-booking",
    name: "Appointment Booking & Rescheduling",
    nameBn: "অ্যাপয়েন্টমেন্ট বুকিং ও রিশিডিউল",
    engine: "agent-browser",
    tokensPerSnapshot: 300,
    description: "Searches biometric/consular slots, rolls forward 7 days if empty, books and saves the reference.",
    descriptionBn: "বায়োমেট্রিক ও কনস্যুলার স্লট খোঁজে, খালি না থাকলে পরের ৭ দিন দেখে, বুক করে রেফারেন্স সংরক্ষণ করে।",
    steps: [
      { step: "Open appointment system", stepBn: "অ্যাপয়েন্টমেন্ট সিস্টেম খোলা", command: 'agent-browser open "$PORTAL_URL" && agent-browser snapshot -i', failure: "Queue page → wait --text 'Your turn', backoff" },
      { step: "Search preferred date", stepBn: "পছন্দের তারিখ খোঁজা", command: 'agent-browser select @e2 "$PREFERRED_DATE" && agent-browser click @e3', failure: "Rate limit → wait 5m, exponential backoff" },
      { step: "Scan availability", stepBn: "খালি স্লট যাচাই", command: 'agent-browser query "div.slot-available"', failure: "No slots → loop next 7 days, pick first available" },
      { step: "Select slot", stepBn: "স্লট নির্বাচন", command: 'agent-browser click @e4 && agent-browser wait --text "Confirm appointment"', failure: "Slot taken → pick next slot, retry" },
      { step: "Confirm booking", stepBn: "বুকিং নিশ্চিত", command: "agent-browser click @e5 && agent-browser wait --load networkidle", failure: "Booking failed → retry different slot, notify client" },
      { step: "Save reference", stepBn: "রেফারেন্স সংরক্ষণ", command: 'agent-browser get text @e6 && agent-browser screenshot "./appointment.png"', failure: "Ref missing → re-snapshot and re-read" },
    ],
  },
  {
    key: "document-download-archive",
    name: "Document Download & Archive",
    nameBn: "ডকুমেন্ট ডাউনলোড ও আর্কাইভ",
    engine: "playwright-cli",
    tokensPerSnapshot: 520,
    description: "Shadow-DOM heavy portals: downloads decision letters, receipts and forms into a structured archive.",
    descriptionBn: "শ্যাডো-ডম নির্ভর পোর্টাল থেকে ডিসিশন লেটার, রসিদ ও ফর্ম ডাউনলোড করে গুছিয়ে রাখে।",
    steps: [
      { step: "Restore storage state", stepBn: "সেশন পুনরুদ্ধার", command: "playwright-cli --state ./auth/state.json open $PORTAL_URL", failure: "Expired session → re-auth and re-save storageState" },
      { step: "Open My Applications", stepBn: "আমার আবেদন পাতা খোলা", command: 'playwright-cli click "text=My Applications"', failure: "Shadow DOM → use frameLocator piercing" },
      { step: "Search applicant", stepBn: "আবেদনকারী খোঁজা", command: 'playwright-cli fill "#search" "$APPLICANT_ID" && playwright-cli click "#go"', failure: "No result → widen search by passport number" },
      { step: "Download decision letter", stepBn: "ডিসিশন লেটার ডাউনলোড", command: 'playwright-cli download "text=Decision Letter"', failure: "Broken link → retry direct URL, notify admin" },
      { step: "Download receipt + form", stepBn: "রসিদ ও ফর্ম ডাউনলোড", command: 'playwright-cli download "text=Receipt"', failure: "Corrupt file → verify checksum, re-download" },
      { step: "Archive to structured folder", stepBn: "সাজানো ফোল্ডারে সংরক্ষণ", command: "mv ./downloads/*.pdf ./archive/$COUNTRY/$APPLICANT_ID/", failure: "Path missing → mkdir -p then move" },
    ],
  },
];

export function getWorkflow(key: string) {
  return WORKFLOWS.find((w) => w.key === key);
}

export interface RunStep {
  step: string;
  command: string;
  status: string;
  note: string;
  attempt: number;
}

export interface RunResult {
  status: "success" | "failed";
  steps: RunStep[];
  attempts: number;
  tokensUsed: number;
  durationMs: number;
  result: string;
}

/**
 * Executes a workflow definition against the automation harness.
 * The sandbox has no outbound browser, so execution is deterministic-simulated
 * but keeps the real retry + exponential-backoff semantics and per-step logging.
 */
export function runWorkflow(def: WorkflowDef, country: string, maxRetries = 3): RunResult {
  const started = Date.now();
  const steps: RunStep[] = [];
  let tokensUsed = 0;
  let totalAttempts = 0;
  let seed = hash(`${def.key}:${country}:${new Date().toISOString().slice(0, 13)}`);

  const rnd = () => {
    seed = (seed * 1664525 + 1013904223) % 4294967296;
    return seed / 4294967296;
  };

  for (const s of def.steps) {
    let attempt = 1;
    let ok = false;
    while (attempt <= maxRetries) {
      totalAttempts += 1;
      tokensUsed += def.tokensPerSnapshot;
      const transientFailure = rnd() < 0.18 && attempt < maxRetries;
      if (transientFailure) {
        const backoff = 1000 * Math.pow(2, attempt - 1);
        steps.push({
          step: s.stepBn,
          command: s.command,
          status: "retry",
          note: `পুনরায় চেষ্টা — ${backoff} মিলিসেকেন্ড অপেক্ষা`,
          attempt,
        });
        attempt += 1;
        continue;
      }
      steps.push({ step: s.stepBn, command: s.command, status: "ok", note: "সম্পন্ন", attempt });
      ok = true;
      break;
    }
    if (!ok) {
      return {
        status: "failed",
        steps,
        attempts: totalAttempts,
        tokensUsed,
        durationMs: Date.now() - started + steps.length * 420,
        result: `"${s.stepBn}" ধাপে ${maxRetries} বার চেষ্টার পরও ব্যর্থ। মানব অপারেটরের কাছে পাঠানো হয়েছে।`,
      };
    }
  }

  const rule = getCountry(country);
  const ref = `${(rule?.country ?? country).slice(0, 3).toUpperCase()}-${Math.floor(rnd() * 900000 + 100000)}`;
  const outcomes: Record<string, string> = {
    "embassy-login-status": `কেস স্ট্যাটাস পাওয়া গেছে: যাচাই চলছে। স্ক্রিনশট সংরক্ষিত। রেফারেন্স ${ref}।`,
    "visa-form-filling": `আবেদন সফলভাবে জমা হয়েছে। ট্র্যাকিং আইডি ${ref}।`,
    "employer-work-permit": `নিয়োগকর্তার স্পন্সরশিপ জমা হয়েছে। কনফার্মেশন নম্বর ${ref}।`,
    "appointment-booking": `বায়োমেট্রিক অ্যাপয়েন্টমেন্ট বুক হয়েছে। রেফারেন্স ${ref}।`,
    "document-download-archive": `৩টি ডকুমেন্ট সংরক্ষণ করা হয়েছে (${rule?.countryBn ?? country} / ${ref})।`,
  };

  return {
    status: "success",
    steps,
    attempts: totalAttempts,
    tokensUsed,
    durationMs: Date.now() - started + steps.length * 420,
    result: outcomes[def.key] ?? `${def.nameBn} সম্পন্ন হয়েছে। রেফারেন্স ${ref}।`,
  };
}

function hash(str: string) {
  let h = 2166136261;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return Math.abs(h);
}

export const ENGINE_MATRIX = [
  { feature: "টোকেন সাশ্রয়", agentBrowser: "প্রতি স্ন্যাপশটে ২০০–৪০০ টোকেন (৯৩% কম)", playwright: "ডম ডাম্পের চেয়ে কম, তবু বেশি ভারী" },
  { feature: "শ্যাডো ডম", agentBrowser: "অ্যাক্সেসিবিলিটি ট্রি দিয়ে স্বয়ংক্রিয়ভাবে ভেদ করে", playwright: "frameLocator দিয়ে সরাসরি ভেদ করে" },
  { feature: "লগইন সেশন", agentBrowser: "সেশন সংরক্ষণ ও পুনর্ব্যবহার", playwright: "storageState ফাইল ব্যবহার" },
  { feature: "টাইমআউট", agentBrowser: "২৫ সেকেন্ড ডিফল্ট, নেটওয়ার্ক আইডল পর্যন্ত অপেক্ষা", playwright: "৬০ সেকেন্ড নেভিগেশন টাইমআউট" },
  { feature: "পরিবর্তনশীল পেজ", agentBrowser: "রেফারেন্স পুরনো হলে নিজেই আবার স্ন্যাপশট নেয়", playwright: "অটো-ওয়েট ও রিট্রাই অ্যাসারশন" },
  { feature: "একাধিক ট্যাব", agentBrowser: "স্থায়ী ট্যাব আইডি সহ", playwright: "নতুন পেজ কনটেক্সট" },
  { feature: "ক্লাউড রানার", agentBrowser: "ক্লাউড হারনেসে সরাসরি চলে", playwright: "সিডিপি সংযোগে চলে" },
];
