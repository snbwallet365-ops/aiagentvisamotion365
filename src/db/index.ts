import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";

// Keep the module importable during `next build`; database access still requires
// DATABASE_URL at runtime. This is especially important for Next.js route analysis.
const databaseUrl = process.env.DATABASE_URL ?? "postgresql://localhost:5432/visamotion";

const globalForDb = globalThis as typeof globalThis & {
  __arenaNextJsPostgresqlPool?: Pool;
};

export const pool =
  globalForDb.__arenaNextJsPostgresqlPool ??
  new Pool({
    connectionString: databaseUrl,
  });

if (process.env.NODE_ENV !== "production") {
  globalForDb.__arenaNextJsPostgresqlPool = pool;
}

export const db = drizzle(pool);
