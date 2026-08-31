import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { Pool } from "pg";
import { EMPLOYEES } from "./data/employees";

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
  const migrationsDir = join(process.cwd(), "db/migrations");
  for (const file of readdirSync(migrationsDir).sort()) {
    await pool.query(readFileSync(join(migrationsDir, file), "utf8"));
  }
  await pool.query(
    "TRUNCATE refund_requests, kyc_cases, feature_flags, employees, audit_log RESTART IDENTITY",
  );

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

  const kycValues: unknown[] = [];
  const kycTuples: string[] = [];
  const COUNTRIES = ["PT", "DE", "IE", "FR", "NL", "ES"];
  const FLAGS = [
    "Document mismatch", "Sanctions list near-match", "High-velocity signups",
    "PEP screening hit", "Address verification failed",
  ];
  const KYC_STATUS = ["pending", "pending", "pending", "escalated", "cleared", "rejected"] as const;
  for (let i = 0; i < 400; i++) {
    const name = NAMES[(i * 3) % NAMES.length];
    const score = 10 + ((i * 37) % 90);
    const base = kycValues.length;
    kycValues.push(
      name,
      `${name.toLowerCase().replace(/[^a-z]+/g, ".")}@example.com`,
      `P${String(10000000 + i * 991).slice(0, 8)}`,
      COUNTRIES[i % COUNTRIES.length],
      score,
      score >= 70 ? "high" : score >= 40 ? "medium" : "low",
      FLAGS[i % FLAGS.length],
      KYC_STATUS[i % KYC_STATUS.length],
      new Date(Date.now() - i * 53 * 60 * 1000).toISOString(),
    );
    kycTuples.push(
      `($${base + 1},$${base + 2},$${base + 3},$${base + 4},$${base + 5},$${base + 6},$${base + 7},$${base + 8},$${base + 9})`,
    );
  }
  await pool.query(
    `INSERT INTO kyc_cases
       (customer_name, customer_email, document_number, country, risk_score, risk_band, flag_reason, status, submitted_at)
     VALUES ${kycTuples.join(",")}`,
    kycValues,
  );

  const FLAGS_SEED: Array<[string, string, string, string, string]> = [
    ["new-onboarding-flow", "Redesigned onboarding funnel", "prod", "off", "growth-team"],
    ["instant-payouts", "Instant payout rail for verified users", "prod", "on", "payments-team"],
    ["instant-payouts", "Instant payout rail for verified users", "staging", "on", "payments-team"],
    ["dark-mode", "Dark mode UI", "dev", "on", "web-team"],
    ["risk-engine-v2", "Second-generation risk scoring", "staging", "off", "compliance-team"],
    ["sepa-transfers", "SEPA credit transfers", "prod", "on", "payments-team"],
  ];
  for (const [key, description, environment, enabled, owner] of FLAGS_SEED) {
    await pool.query(
      `INSERT INTO feature_flags (flag_key, description, environment, enabled, owner_team, updated_by)
       VALUES ($1, $2, $3, $4, $5, 'seed')`,
      [key, description, environment, enabled, owner],
    );
  }

  await seedEmployees(pool);

  for (const table of ["refund_requests", "kyc_cases", "feature_flags", "employees"]) {
    const { rows } = await pool.query(`SELECT COUNT(*)::int AS n FROM ${table}`);
    console.log(`Seeded ${rows[0].n} rows into ${table}`);
  }
  await pool.end();
}

/**
 * The employee directory is seeded from a fixed roster so the app looks like
 * one that has been in use for a while: staggered start dates, alumni rows,
 * and an audit trail of the lifecycle changes People Ops already made.
 */
async function seedEmployees(pool: Pool) {
  const monthsAgo = (months: number) => {
    const date = new Date();
    date.setMonth(date.getMonth() - months);
    date.setHours(9, 0, 0, 0);
    return date.toISOString();
  };
  const slugify = (name: string) =>
    name.toLowerCase().normalize("NFD").replace(/[^a-z]+/g, ".").replace(/^\.|\.$/g, "");

  for (const [index, employee] of EMPLOYEES.entries()) {
    const handle = slugify(employee.name);
    const changed = employee.status !== "active";
    const { rows } = await pool.query(
      `INSERT INTO employees
         (employee_number, full_name, work_email, personal_email, phone, job_title,
          department, team, manager, location, employment_type, status,
          start_date, end_date, salary, equity_options, note, updated_by, updated_at)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19)
       RETURNING id`,
      [
        `E-${String(1001 + index)}`,
        employee.name,
        `${handle}@example.com`,
        `${handle}${index}@personalmail.com`,
        `+351 9${String(10000000 + index * 137).slice(0, 8)}`,
        employee.title,
        employee.department,
        employee.team,
        employee.manager,
        employee.location,
        employee.employmentType,
        employee.status,
        monthsAgo(employee.tenureMonths),
        employee.endMonths === undefined ? null : monthsAgo(employee.endMonths),
        employee.salary,
        employee.equityOptions,
        employee.note ?? null,
        changed ? "Ana Sousa" : null,
        changed ? monthsAgo(1) : null,
      ],
    );

    const id = String(rows[0].id);
    await pool.query(
      `INSERT INTO audit_log (app, row_id, actor_id, actor_name, event, detail, created_at)
       VALUES ('employee-directory', $1, 'u-lead', 'Ana Sousa', 'create', $2, $3)`,
      [id, JSON.stringify({ job_title: employee.title, department: employee.department }), monthsAgo(employee.tenureMonths)],
    );

    const lifecycle =
      employee.status === "on-leave"
        ? { event: "start_leave", months: 1 }
        : employee.status === "notice-period" || employee.status === "departed"
          ? { event: "offboard", months: (employee.endMonths ?? 0) + 2 }
          : null;

    if (lifecycle) {
      await pool.query(
        `INSERT INTO audit_log (app, row_id, actor_id, actor_name, event, detail, created_at)
         VALUES ('employee-directory', $1, 'u-lead', 'Ana Sousa', $2, $3, $4)`,
        [id, lifecycle.event, JSON.stringify({ note: employee.note }), monthsAgo(lifecycle.months)],
      );
    }
  }
}

void main();
