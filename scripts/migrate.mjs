// Applies supabase/schema.sql using the direct Postgres URL from .env.local
// Usage: node --env-file=.env.local scripts/migrate.mjs
import { readFileSync } from "node:fs";
import pg from "pg";

const url = process.env.POSTGRES_URL_NON_POOLING || process.env.POSTGRES_URL;
if (!url) throw new Error("POSTGRES_URL_NON_POOLING is not set");
const client = new pg.Client({ connectionString: url.replace(/[?&]sslmode=[^&]*/, ""), ssl: { rejectUnauthorized: false } });
await client.connect();
await client.query(readFileSync(new URL("../supabase/schema.sql", import.meta.url), "utf8"));
const { rows } = await client.query(
  "select table_name from information_schema.tables where table_schema='public' order by 1",
);
console.log("OK:", rows.map((r) => r.table_name).join(", "));
await client.end();
