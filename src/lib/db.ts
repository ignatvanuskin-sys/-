import { drizzle as drizzleNeon } from "drizzle-orm/neon-http";
import { drizzle as drizzlePg } from "drizzle-orm/node-postgres";
import { neon } from "@neondatabase/serverless";
import { Pool } from "pg";
import * as schema from "./schema";

// We support both Neon (serverless) and regular pg.
// If DATABASE_URL is missing, we return a mock that throws gracefully – but build must succeed.
// In production, DATABASE_URL must be set, otherwise UI will show a setup warning.

let dbInstance: any = null;

function getDb() {
  const url = process.env.DATABASE_URL;
  if (!url) {
    // Return a proxy that throws on query but allows import
    return new Proxy(
      {},
      {
        get() {
          throw new Error("DATABASE_URL is not set. Please configure it in .env");
        },
      }
    ) as any;
  }
  if (dbInstance) return dbInstance;
  // Neon URLs contain "neon.tech"
  if (url.includes("neon.tech")) {
    const sql = neon(url);
    dbInstance = drizzleNeon(sql as any, { schema } as any);
  } else {
    const pool = new Pool({ connectionString: url });
    dbInstance = drizzlePg(pool, { schema });
  }
  return dbInstance;
}

// Lazy proxy so `import { db } ...` works at build time without DATABASE_URL
export const db: any = new Proxy(
  {},
  {
    get(_target, prop) {
      const real = getDb();
      const val = real[prop];
      if (typeof val === "function") return val.bind(real);
      return val;
    },
  }
);

export function isDbConfigured() {
  return !!process.env.DATABASE_URL;
}
