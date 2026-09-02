import { NextResponse } from "next/server";
import { neon } from "@neondatabase/serverless";
import { Pool } from "pg";

const CREATE_SQL = `
CREATE TABLE IF NOT EXISTS users (id SERIAL PRIMARY KEY, email VARCHAR(255) NOT NULL UNIQUE, password_hash TEXT NOT NULL, created_at TIMESTAMP DEFAULT NOW() NOT NULL);
CREATE TABLE IF NOT EXISTS mailboxes (id SERIAL PRIMARY KEY, smtp_host VARCHAR(255) NOT NULL, smtp_port INTEGER NOT NULL, secure BOOLEAN NOT NULL DEFAULT false, login VARCHAR(255) NOT NULL, password_encrypted TEXT NOT NULL, from_name VARCHAR(255) NOT NULL, from_email VARCHAR(255) NOT NULL, reply_to VARCHAR(255), created_at TIMESTAMP DEFAULT NOW() NOT NULL, updated_at TIMESTAMP DEFAULT NOW() NOT NULL);
CREATE TABLE IF NOT EXISTS recipient_lists (id SERIAL PRIMARY KEY, name VARCHAR(255) NOT NULL, created_at TIMESTAMP DEFAULT NOW() NOT NULL);
CREATE TABLE IF NOT EXISTS recipients (id SERIAL PRIMARY KEY, list_id INTEGER NOT NULL REFERENCES recipient_lists(id) ON DELETE CASCADE, email VARCHAR(255) NOT NULL, name VARCHAR(255), company VARCHAR(255), custom_fields JSONB DEFAULT '{}', suppressed BOOLEAN DEFAULT false NOT NULL, created_at TIMESTAMP DEFAULT NOW() NOT NULL);
CREATE TABLE IF NOT EXISTS templates (id SERIAL PRIMARY KEY, name VARCHAR(255) NOT NULL, subject TEXT NOT NULL, body TEXT NOT NULL, created_at TIMESTAMP DEFAULT NOW() NOT NULL, updated_at TIMESTAMP DEFAULT NOW() NOT NULL);
CREATE TABLE IF NOT EXISTS campaigns (id SERIAL PRIMARY KEY, name VARCHAR(255) NOT NULL, template_id INTEGER REFERENCES templates(id), list_id INTEGER REFERENCES recipient_lists(id), mailbox_id INTEGER REFERENCES mailboxes(id), mode VARCHAR(50) NOT NULL DEFAULT 'spintax', variation_level VARCHAR(20) NOT NULL DEFAULT 'medium', delay_min_sec INTEGER NOT NULL DEFAULT 30, delay_max_sec INTEGER NOT NULL DEFAULT 90, daily_limit INTEGER NOT NULL DEFAULT 300, send_window_start VARCHAR(5), send_window_end VARCHAR(5), status VARCHAR(20) NOT NULL DEFAULT 'draft', created_at TIMESTAMP DEFAULT NOW() NOT NULL, scheduled_at TIMESTAMP, paused_at TIMESTAMP);
CREATE TABLE IF NOT EXISTS campaign_recipients (id SERIAL PRIMARY KEY, campaign_id INTEGER NOT NULL REFERENCES campaigns(id) ON DELETE CASCADE, recipient_id INTEGER NOT NULL REFERENCES recipients(id) ON DELETE CASCADE, status VARCHAR(20) NOT NULL DEFAULT 'queued', sent_subject TEXT, sent_body TEXT, sent_at TIMESTAMP, error_message TEXT);
CREATE TABLE IF NOT EXISTS suppression_list (id SERIAL PRIMARY KEY, email VARCHAR(255) NOT NULL UNIQUE, reason VARCHAR(255), created_at TIMESTAMP DEFAULT NOW() NOT NULL);
CREATE TABLE IF NOT EXISTS global_settings (id SERIAL PRIMARY KEY, stop_all BOOLEAN DEFAULT false NOT NULL, footer_address TEXT, updated_at TIMESTAMP DEFAULT NOW() NOT NULL);
`;

export async function GET() {
  const url = process.env.DATABASE_URL;
  if (!url) return NextResponse.json({ error: "DATABASE_URL не задан — используется in-memory (данные не сохраняются). Задайте Neon URL для сохранения." }, { status: 400 });
  try {
    if (url.includes("neon.tech")) {
      const sql = neon(url);
      // neon http: need to split and exec each
      for (const stmt of CREATE_SQL.split(";").map(s=>s.trim()).filter(Boolean)) {
        await sql.query(stmt);
      }
    } else {
      const pool = new Pool({ connectionString: url });
      await pool.query(CREATE_SQL);
      await pool.end();
    }
    return NextResponse.json({ ok: true, message: "Таблицы созданы/проверены (CREATE IF NOT EXISTS). Теперь сохраняй — всё будет в БД." });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

export async function POST() { return GET(); }
