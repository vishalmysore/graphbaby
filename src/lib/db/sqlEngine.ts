// In-browser SQLite via sql.js (SQLite compiled to WASM). This is the
// "JavaScript-based database" layer: it can open an uploaded .sqlite/.db file
// or build a fresh database from SQL text, entirely client-side — no backend,
// matching GraphBaby's design. The WASM binary is resolved as a same-origin
// asset URL by Vite (`?url`), which is safe under the app's COEP header.
import initSqlJs, { type Database, type SqlJsStatic, type QueryExecResult } from 'sql.js';
import wasmUrl from 'sql.js/dist/sql-wasm.wasm?url';

export interface DbColumn {
  name: string;
  type: string;
  pk: boolean;
  notnull: boolean;
}

export interface DbForeignKey {
  from: string; // local column
  table: string; // referenced table
  to: string; // referenced column
}

export interface DbTable {
  name: string;
  columns: DbColumn[];
  foreignKeys: DbForeignKey[];
  rowCount: number;
}

export interface DbSchema {
  tables: DbTable[];
}

let sqlPromise: Promise<SqlJsStatic> | null = null;

function getSql(): Promise<SqlJsStatic> {
  if (!sqlPromise) sqlPromise = initSqlJs({ locateFile: () => wasmUrl });
  return sqlPromise;
}

/** Open a database from raw bytes (an uploaded file) or create an empty one. */
export async function openDatabase(bytes?: Uint8Array | null): Promise<Database> {
  const SQL = await getSql();
  return new SQL.Database(bytes ?? null);
}

const q = (s: string) => s.replace(/'/g, "''");

/** Read tables, columns, primary keys and foreign keys from a live database. */
export function introspect(db: Database): DbSchema {
  const res = db.exec(
    "SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%' ORDER BY name",
  );
  const names = res.length ? res[0].values.map((r) => String(r[0])) : [];

  const tables: DbTable[] = names.map((name) => {
    const info = db.exec(`PRAGMA table_info('${q(name)}')`);
    // table_info columns: cid, name, type, notnull, dflt_value, pk
    const columns: DbColumn[] = info.length
      ? info[0].values.map((r) => ({
          name: String(r[1]),
          type: String(r[2] ?? ''),
          notnull: Number(r[3]) === 1,
          pk: Number(r[5]) > 0,
        }))
      : [];

    const fk = db.exec(`PRAGMA foreign_key_list('${q(name)}')`);
    // foreign_key_list columns: id, seq, table, from, to, ...
    const foreignKeys: DbForeignKey[] = fk.length
      ? fk[0].values.map((r) => ({
          table: String(r[2]),
          from: String(r[3]),
          to: String(r[4]),
        }))
      : [];

    const cnt = db.exec(`SELECT COUNT(*) FROM '${q(name)}'`);
    const rowCount = cnt.length ? Number(cnt[0].values[0][0]) : 0;

    return { name, columns, foreignKeys, rowCount };
  });

  return { tables };
}

/** Read up to `limit` rows of a table. */
export function readRows(db: Database, table: string, limit: number): QueryExecResult {
  const res = db.exec(`SELECT * FROM '${q(table)}' LIMIT ${Math.max(0, Math.floor(limit))}`);
  return res.length ? res[0] : { columns: [], values: [] };
}
