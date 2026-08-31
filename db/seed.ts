import { readFileSync } from "node:fs";
import { join } from "node:path";
import { Pool } from "pg";

const NAMES = [
  "Maria Ferreira", "Ken Adachi", "Ana Sousa", "Liam Byrne", "Priya Nair",
  "Tomas Novak", "Chloe Martin", "Yusuf Demir", "Elena Rossi", "Jonas Weber",
  "Aisha Bello", "Diego Alvarez", "Hana Kim", "Noor Haddad", "Sven Lindqvist",
];
const REASONS = [
  "Duplicate charge", "Item not received", "Service cancelled",
  "Unauthorised transaction", "Billing error", "Subscription not used",
];
const RISK = ["low", "low", "low", "medium", "medium", "high"] as const;
const STATUS = ["pending", "pending", "pending", "approved", "declined"] as const;

/** Seeds enough rows that pagination and server-side counting are visible. */
async function main() {
  const pool = new Pool({
    connectionString:
      process.env.DATABASE_URL ??
      "postgres://postgres:postgres@localhost:5432/internal_tools",
  });

  await pool.query(readFileSync(join(process.cwd(), "db/schema.sql"), "utf8"));
  await pool.query("TRUNCATE refund_requests, audit_log RESTART IDENTITY");

  const values: unknown[] = [];
  const tuples: string[] = [];
  for (let i = 0; i < 1200; i++) {
    const name = NAMES[i % NAMES.length];
    const status = STATUS[i % STATUS.length];
    const base = values.length;
    values.push(
      name,
      `${name.toLowerCase().replace(/[^a-z]+/g, ".")}@example.com`,
      (Math.round((15 + Math.random() * 4800) * 100) / 100).toFixed(2),
      i % 7 === 0 ? "EUR" : "USD",
      REASONS[i % REASONS.length],
      status,
      RISK[i % RISK.length],
      new Date(Date.now() - i * 37 * 60 * 1000).toISOString(),
      status === "pending" ? null : "Adrian Leung",
    );
    tuples.push(
      `($${base + 1},$${base + 2},$${base + 3},$${base + 4},$${base + 5},$${base + 6},$${base + 7},$${base + 8},$${base + 9})`,
    );
  }

  await pool.query(
    `INSERT INTO refund_requests
       (customer_name, customer_email, amount, currency, reason, status, risk_flag, requested_at, decided_by)
     VALUES ${tuples.join(",")}`,
    values,
  );

  const { rows } = await pool.query("SELECT COUNT(*)::int AS n FROM refund_requests");
  console.log(`Seeded ${rows[0].n} refund requests`);
  await pool.end();
}

void main();
