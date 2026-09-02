import {
  pgTable,
  text,
  integer,
  boolean,
  timestamp,
  jsonb,
  serial,
  varchar,
} from "drizzle-orm/pg-core";

// Single admin user
export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  email: varchar("email", { length: 255 }).notNull().unique(),
  passwordHash: text("password_hash").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const mailboxes = pgTable("mailboxes", {
  id: serial("id").primaryKey(),
  smtpHost: varchar("smtp_host", { length: 255 }).notNull(),
  smtpPort: integer("smtp_port").notNull(),
  secure: boolean("secure").notNull().default(false),
  login: varchar("login", { length: 255 }).notNull(),
  passwordEncrypted: text("password_encrypted").notNull(),
  fromName: varchar("from_name", { length: 255 }).notNull(),
  fromEmail: varchar("from_email", { length: 255 }).notNull(),
  replyTo: varchar("reply_to", { length: 255 }),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const recipientLists = pgTable("recipient_lists", {
  id: serial("id").primaryKey(),
  name: varchar("name", { length: 255 }).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const recipients = pgTable("recipients", {
  id: serial("id").primaryKey(),
  listId: integer("list_id")
    .references(() => recipientLists.id, { onDelete: "cascade" })
    .notNull(),
  email: varchar("email", { length: 255 }).notNull(),
  name: varchar("name", { length: 255 }),
  company: varchar("company", { length: 255 }),
  customFields: jsonb("custom_fields").$type<Record<string, string>>().default({}),
  suppressed: boolean("suppressed").default(false).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const templates = pgTable("templates", {
  id: serial("id").primaryKey(),
  name: varchar("name", { length: 255 }).notNull(),
  subject: text("subject").notNull(),
  body: text("body").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const campaigns = pgTable("campaigns", {
  id: serial("id").primaryKey(),
  name: varchar("name", { length: 255 }).notNull(),
  templateId: integer("template_id").references(() => templates.id),
  listId: integer("list_id").references(() => recipientLists.id),
  mailboxId: integer("mailbox_id").references(() => mailboxes.id),
  mode: varchar("mode", { length: 50 }).notNull().default("spintax"), // spintax | ai | combined
  variationLevel: varchar("variation_level", { length: 20 }).notNull().default("medium"), // light | medium | strong
  delayMinSec: integer("delay_min_sec").notNull().default(30),
  delayMaxSec: integer("delay_max_sec").notNull().default(90),
  dailyLimit: integer("daily_limit").notNull().default(300),
  sendWindowStart: varchar("send_window_start", { length: 5 }), // "09:00"
  sendWindowEnd: varchar("send_window_end", { length: 5 }), // "18:00"
  status: varchar("status", { length: 20 }).notNull().default("draft"), // draft | running | paused | completed | cancelled
  createdAt: timestamp("created_at").defaultNow().notNull(),
  scheduledAt: timestamp("scheduled_at"),
  pausedAt: timestamp("paused_at"),
});

export const campaignRecipients = pgTable("campaign_recipients", {
  id: serial("id").primaryKey(),
  campaignId: integer("campaign_id")
    .references(() => campaigns.id, { onDelete: "cascade" })
    .notNull(),
  recipientId: integer("recipient_id")
    .references(() => recipients.id, { onDelete: "cascade" })
    .notNull(),
  status: varchar("status", { length: 20 }).notNull().default("queued"), // queued | sent | error | unsubscribed | skipped
  sentSubject: text("sent_subject"),
  sentBody: text("sent_body"),
  sentAt: timestamp("sent_at"),
  errorMessage: text("error_message"),
});

export const suppressionList = pgTable("suppression_list", {
  id: serial("id").primaryKey(),
  email: varchar("email", { length: 255 }).notNull().unique(),
  reason: varchar("reason", { length: 255 }),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const globalSettings = pgTable("global_settings", {
  id: serial("id").primaryKey(),
  stopAll: boolean("stop_all").default(false).notNull(),
  footerAddress: text("footer_address"),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});
