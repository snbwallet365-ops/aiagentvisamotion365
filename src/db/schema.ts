import {
  pgTable,
  text,
  timestamp,
  integer,
  jsonb,
  boolean,
  serial,
  real,
} from "drizzle-orm/pg-core";

export const clients = pgTable("clients", {
  id: serial("id").primaryKey(),
  fullName: text("full_name").notNull(),
  email: text("email").notNull(),
  phone: text("phone").notNull().default(""),
  nationality: text("nationality").notNull().default("Bangladesh"),
  passportNo: text("passport_no").notNull().default(""),
  passportValidityMonths: integer("passport_validity_months").notNull().default(12),
  age: integer("age").notNull().default(28),
  education: text("education").notNull().default(""),
  jobTitle: text("job_title").notNull().default(""),
  employerName: text("employer_name").notNull().default(""),
  salary: integer("salary").notNull().default(0),
  bankBalance: integer("bank_balance").notNull().default(0),
  jobOffer: boolean("job_offer").notNull().default(false),
  travelHistory: boolean("travel_history").notNull().default(false),
  previousRejections: integer("previous_rejections").notNull().default(0),
  languageProficiency: text("language_proficiency").notNull().default(""),
  preferredLanguage: text("preferred_language").notNull().default("bn"),
  notes: text("notes").notNull().default(""),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const applications = pgTable("applications", {
  id: serial("id").primaryKey(),
  clientId: integer("client_id").notNull(),
  country: text("country").notNull(),
  visaType: text("visa_type").notNull(),
  status: text("status").notNull().default("intake"),
  trackingId: text("tracking_id").notNull().default(""),
  eligibilityScore: integer("eligibility_score").notNull().default(0),
  riskScore: integer("risk_score").notNull().default(0),
  successProbability: integer("success_probability").notNull().default(0),
  feeAmount: real("fee_amount").notNull().default(0),
  feeCurrency: text("fee_currency").notNull().default("USD"),
  processingEstimate: text("processing_estimate").notNull().default(""),
  checklist: jsonb("checklist").$type<{ item: string; done: boolean }[]>().notNull().default([]),
  redFlags: jsonb("red_flags").$type<string[]>().notNull().default([]),
  recommendations: jsonb("recommendations").$type<string[]>().notNull().default([]),
  deadline: timestamp("deadline", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const conversations = pgTable("conversations", {
  id: serial("id").primaryKey(),
  title: text("title").notNull().default("New chat"),
  language: text("language").notNull().default("en"),
  modelUsed: text("model_used").notNull().default(""),
  tokenCount: integer("token_count").notNull().default(0),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const messages = pgTable("messages", {
  id: serial("id").primaryKey(),
  conversationId: integer("conversation_id").notNull(),
  role: text("role").notNull(),
  content: text("content").notNull(),
  model: text("model").notNull().default(""),
  taskType: text("task_type").notNull().default("general-chat"),
  attachments: jsonb("attachments").$type<{ name: string; size: number; type: string }[]>().notNull().default([]),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const documents = pgTable("documents", {
  id: serial("id").primaryKey(),
  clientId: integer("client_id"),
  applicationId: integer("application_id"),
  kind: text("kind").notNull(),
  title: text("title").notNull(),
  format: text("format").notNull().default("pdf"),
  body: text("body").notNull().default(""),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const workflowRuns = pgTable("workflow_runs", {
  id: serial("id").primaryKey(),
  workflowKey: text("workflow_key").notNull(),
  country: text("country").notNull().default(""),
  applicationId: integer("application_id"),
  engine: text("engine").notNull().default("agent-browser"),
  status: text("status").notNull().default("queued"),
  attempts: integer("attempts").notNull().default(0),
  tokensUsed: integer("tokens_used").notNull().default(0),
  durationMs: integer("duration_ms").notNull().default(0),
  steps: jsonb("steps").$type<
    { step: string; command: string; status: string; note: string; attempt: number }[]
  >().notNull().default([]),
  result: text("result").notNull().default(""),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const scheduledTasks = pgTable("scheduled_tasks", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  cron: text("cron").notNull(),
  channel: text("channel").notNull().default("email"),
  enabled: boolean("enabled").notNull().default(true),
  lastRunAt: timestamp("last_run_at", { withTimezone: true }),
  lastResult: text("last_result").notNull().default(""),
  runCount: integer("run_count").notNull().default(0),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const socialPosts = pgTable("social_posts", {
  id: serial("id").primaryKey(),
  platform: text("platform").notNull(),
  topic: text("topic").notNull(),
  caption: text("caption").notNull(),
  hashtags: jsonb("hashtags").$type<string[]>().notNull().default([]),
  callToAction: text("call_to_action").notNull().default(""),
  scheduledFor: timestamp("scheduled_for", { withTimezone: true }),
  status: text("status").notNull().default("draft"),
  likes: integer("likes").notNull().default(0),
  comments: integer("comments").notNull().default(0),
  shares: integer("shares").notNull().default(0),
  impressions: integer("impressions").notNull().default(0),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const modelUsage = pgTable("model_usage", {
  id: serial("id").primaryKey(),
  modelId: text("model_id").notNull(),
  taskType: text("task_type").notNull().default("general-chat"),
  inputTokens: integer("input_tokens").notNull().default(0),
  outputTokens: integer("output_tokens").notNull().default(0),
  latencyMs: integer("latency_ms").notNull().default(0),
  ok: boolean("ok").notNull().default(true),
  source: text("source").notNull().default("openrouter"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const commsLog = pgTable("comms_log", {
  id: serial("id").primaryKey(),
  clientId: integer("client_id"),
  channel: text("channel").notNull(),
  direction: text("direction").notNull().default("outbound"),
  subject: text("subject").notNull().default(""),
  body: text("body").notNull().default(""),
  status: text("status").notNull().default("sent"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export type Client = typeof clients.$inferSelect;
export type Application = typeof applications.$inferSelect;
export type Conversation = typeof conversations.$inferSelect;
export type Message = typeof messages.$inferSelect;
export type DocumentRow = typeof documents.$inferSelect;
export type WorkflowRun = typeof workflowRuns.$inferSelect;
export type ScheduledTask = typeof scheduledTasks.$inferSelect;
export type SocialPost = typeof socialPosts.$inferSelect;
export type ModelUsage = typeof modelUsage.$inferSelect;
export type CommsLog = typeof commsLog.$inferSelect;

/* ─────────────────  PDF Space (RAG)  ───────────────── */

export const pdfDocs = pgTable("pdf_docs", {
  id: serial("id").primaryKey(),
  filename: text("filename").notNull(),
  sizeBytes: integer("size_bytes").notNull().default(0),
  pages: integer("pages").notNull().default(0),
  chars: integer("chars").notNull().default(0),
  chunkCount: integer("chunk_count").notNull().default(0),
  status: text("status").notNull().default("processing"),
  summary: text("summary").notNull().default(""),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const pdfChunks = pgTable("pdf_chunks", {
  id: serial("id").primaryKey(),
  docId: integer("doc_id").notNull(),
  chunkIndex: integer("chunk_index").notNull().default(0),
  page: integer("page").notNull().default(1),
  content: text("content").notNull(),
  embedding: jsonb("embedding").$type<number[]>().notNull().default([]),
  norm: real("norm").notNull().default(0),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export type PdfDoc = typeof pdfDocs.$inferSelect;
export type PdfChunk = typeof pdfChunks.$inferSelect;
