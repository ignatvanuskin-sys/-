import { drizzle as drizzleNeon } from "drizzle-orm/neon-http";
import { drizzle as drizzlePg } from "drizzle-orm/node-postgres";
import { neon } from "@neondatabase/serverless";
import { Pool } from "pg";
import * as schema from "./schema";
import { memoryDb, eq as memEq, and as memAnd, desc as memDesc } from "./db-memory";
import { eq as drizzleEq, and as drizzleAnd, desc as drizzleDesc } from "drizzle-orm";

let dbInstance: any = null;
let usingMemory = false;

function getDbType(): "neon" | "pg" | "memory" {
  if (!process.env.DATABASE_URL) return "memory";
  if (process.env.DATABASE_URL.includes("neon.tech")) return "neon";
  return "pg";
}

function getDb() {
  const type = getDbType();
  if (type === "memory") {
    usingMemory = true;
    return memoryDb;
  }
  if (dbInstance) return dbInstance;
  const url = process.env.DATABASE_URL!;
  if (url.includes("neon.tech")) {
    const sql = neon(url);
    dbInstance = drizzleNeon(sql as any, { schema } as any);
  } else {
    const pool = new Pool({ connectionString: url });
    dbInstance = drizzlePg(pool, { schema });
  }
  return dbInstance;
}

export const db: any = new Proxy({} as any, {
  get(_t, prop) {
    const real = getDb();
    const v = real[prop as string];
    if (typeof v === "function") return v.bind(real);
    return v;
  },
});

export function isDbConfigured() { return true; }
export function isUsingMemoryDb() { return getDbType() === "memory" || usingMemory; }
export { getDbType };

// Wrapper eq/and/desc that work for both memory and pg
export function eq(column: any, value: any) {
  if (getDbType() === "memory") return memEq(column, value);
  return drizzleEq(column, value);
}
export function and(...conds: any[]) {
  if (getDbType() === "memory") return memAnd(...conds);
  return drizzleAnd(...conds);
}
export function desc(column: any) {
  if (getDbType() === "memory") return memDesc(column);
  return drizzleDesc(column);
}
