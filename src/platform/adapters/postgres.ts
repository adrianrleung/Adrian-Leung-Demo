import { Pool } from "pg";
import type {
  Capabilities,
  DataSource,
  Operator,
  Page,
  Query,
  Row,
} from "../types";

let pool: Pool | null = null;

export function getPool(): Pool {
  if (!pool) {
    pool = new Pool({
      connectionString:
        process.env.DATABASE_URL ??
        "postgres://postgres:postgres@localhost:5432/internal_tools",
      max: 10,
    });
  }
  return pool;
}

const CAPABILITIES: Capabilities = {
  operators: ["eq", "neq", "gt", "gte", "lt", "lte", "contains", "in"],
  search: true,
  sort: true,
  exactCount: true,
};

const SQL_OPERATOR: Record<Exclude<Operator, "contains" | "in">, string> = {
  eq: "=",
  neq: "<>",
  gt: ">",
  gte: ">=",
  lt: "<",
  lte: "<=",
};

/** Identifiers are whitelisted against the declared column list, never interpolated blind. */
function quoteIdent(name: string, allowed: readonly string[]): string {
  if (!allowed.includes(name)) {
    throw new Error(`Unknown column "${name}"`);
  }
  return `"${name.replace(/"/g, '""')}"`;
}

interface TableOptions {
  primaryKey?: string;
  columns: readonly string[];
  searchColumns?: readonly string[];
}

export function table(tableName: string, options: TableOptions): DataSource {
  const pk = options.primaryKey ?? "id";
  const cols = options.columns;
  const ident = (c: string) => quoteIdent(c, cols);

  function buildWhere(query: Query): { sql: string; params: unknown[] } {
    const clauses: string[] = [];
    const params: unknown[] = [];

    for (const filter of query.filters) {
      const col = ident(filter.field);
      if (filter.op === "contains") {
        params.push(`%${String(filter.value)}%`);
        clauses.push(`${col} ILIKE $${params.length}`);
      } else if (filter.op === "in") {
        const values = Array.isArray(filter.value) ? filter.value : [filter.value];
        if (!values.length) {
          clauses.push("false");
          continue;
        }
        params.push(values);
        clauses.push(`${col} = ANY($${params.length})`);
      } else {
        params.push(filter.value);
        clauses.push(`${col} ${SQL_OPERATOR[filter.op]} $${params.length}`);
      }
    }

    if (query.search && options.searchColumns?.length) {
      params.push(`%${query.search}%`);
      const idx = params.length;
      const ors = options.searchColumns.map((c) => `${ident(c)} ILIKE $${idx}`);
      clauses.push(`(${ors.join(" OR ")})`);
    }

    return {
      sql: clauses.length ? `WHERE ${clauses.join(" AND ")}` : "",
      params,
    };
  }

  return {
    kind: "postgres",
    capabilities: CAPABILITIES,
    fields: cols,

    async list(query: Query): Promise<Page<Row>> {
      const db = getPool();
      const where = buildWhere(query);
      const params = [...where.params];

      const sort = query.sort[0] ?? { field: pk, direction: "asc" as const };
      const dir = sort.direction === "desc" ? "DESC" : "ASC";
      // Keyset pagination: constant cost at any depth, unlike OFFSET.
      const keyset = query.cursor ? decodeCursor(query.cursor) : null;
      let cursorClause = "";
      if (keyset) {
        const comparator = dir === "DESC" ? "<" : ">";
        params.push(keyset.sortValue, keyset.id);
        cursorClause = `${where.sql ? "AND" : "WHERE"} (${ident(sort.field)}, ${ident(pk)}) ${comparator} ($${params.length - 1}, $${params.length})`;
      }

      params.push(query.limit + 1);
      const rowsSql = `
        SELECT * FROM ${quoteIdent(tableName, [tableName])}
        ${where.sql} ${cursorClause}
        ORDER BY ${ident(sort.field)} ${dir}, ${ident(pk)} ${dir}
        LIMIT $${params.length}
      `;

      const countSql = `
        SELECT COUNT(*)::int AS total FROM ${quoteIdent(tableName, [tableName])}
        ${where.sql}
      `;

      const [rowsResult, countResult] = await Promise.all([
        db.query(rowsSql, params),
        db.query(countSql, where.params),
      ]);

      const rows = rowsResult.rows as Row[];
      const hasMore = rows.length > query.limit;
      const pageRows = hasMore ? rows.slice(0, query.limit) : rows;
      const last = pageRows[pageRows.length - 1];

      return {
        rows: pageRows,
        total: countResult.rows[0].total as number,
        nextCursor:
          hasMore && last
            ? encodeCursor({
                sortValue: last[sort.field],
                id: String(last[pk]),
              })
            : null,
      };
    },

    async get(id: string): Promise<Row | null> {
      const result = await getPool().query(
        `SELECT * FROM ${quoteIdent(tableName, [tableName])} WHERE ${ident(pk)} = $1`,
        [id],
      );
      return (result.rows[0] as Row) ?? null;
    },

    async insert(row: Row): Promise<Row> {
      const entries = Object.entries(row);
      const columns = entries.map(([col]) => ident(col));
      const placeholders = entries.map((_, i) => `$${i + 1}`);
      const result = await getPool().query(
        `INSERT INTO ${quoteIdent(tableName, [tableName])} (${columns.join(", ")})
         VALUES (${placeholders.join(", ")}) RETURNING *`,
        entries.map(([, v]) => v),
      );
      return result.rows[0] as Row;
    },

    async update(id: string, patch: Row): Promise<Row> {
      const entries = Object.entries(patch);
      if (!entries.length) {
        const existing = await this.get(id);
        if (!existing) throw new Error(`Row ${id} not found`);
        return existing;
      }
      const sets = entries.map(([col], i) => `${ident(col)} = $${i + 2}`);
      const result = await getPool().query(
        `UPDATE ${quoteIdent(tableName, [tableName])}
         SET ${sets.join(", ")} WHERE ${ident(pk)} = $1 RETURNING *`,
        [id, ...entries.map(([, v]) => v)],
      );
      return result.rows[0] as Row;
    },
  };
}

interface Cursor {
  sortValue: unknown;
  id: string;
}

function encodeCursor(cursor: Cursor): string {
  return Buffer.from(JSON.stringify(cursor)).toString("base64url");
}

function decodeCursor(raw: string): Cursor {
  return JSON.parse(Buffer.from(raw, "base64url").toString()) as Cursor;
}

export const postgres = { table, getPool };
