// Inverse of dbToOntology: turn the ontology back into relational tables.
//   • class            → table
//   • data property    → column  (xsd → SQL type)
//   • object property  → foreign-key column (references the range class's table)
//   • individual       → row
// Produces either a single .sql script (DDL + INSERTs) or one CSV per table.
import type { Ontology } from '../ontology/types';

interface ExportColumn {
  name: string;
  sqlType: string;
  xsd: string;
  isFk: boolean;
  refTable?: string;
  propId: string;
}

interface ExportTable {
  tableName: string;
  columns: ExportColumn[];
  rows: (string | null)[][]; // aligned with [id, ...columns]
}

function sqlFromXsd(xsd: string): string {
  const t = (xsd || '').toLowerCase();
  if (t.includes('bool')) return 'INTEGER';
  if (/(integer|int|long)/.test(t)) return 'INTEGER';
  if (/(decimal|float|double)/.test(t)) return 'REAL';
  return 'TEXT';
}

function isNumericXsd(xsd: string): boolean {
  const t = (xsd || '').toLowerCase();
  return /(integer|int|long|decimal|float|double)/.test(t);
}

/** Column name for a property: strip the "<classId>_" prefix when present. */
function columnName(propId: string, classId: string, label: string): string {
  if (propId.startsWith(`${classId}_`)) return propId.slice(classId.length + 1);
  return (label || propId).trim().replace(/\s+/g, '_').replace(/[^A-Za-z0-9_]/g, '') || propId;
}

function buildTables(onto: Ontology): ExportTable[] {
  const classes = Object.values(onto.classes).filter((c) => c.id !== 'owl_Thing');
  const tables: ExportTable[] = [];

  for (const cls of classes) {
    const dps = Object.values(onto.dataProperties).filter((p) => p.domain.includes(cls.id));
    const ops = Object.values(onto.objectProperties).filter((p) => p.domain.includes(cls.id));
    const inds = Object.values(onto.individuals).filter((i) => i.types.includes(cls.id));
    if (dps.length === 0 && ops.length === 0 && inds.length === 0) continue;

    // "id" is reserved for the synthetic primary key; dedupe any collisions
    // (e.g. an original PK column also named "id", or two props → same name).
    const used = new Set<string>(['id']);
    const uniq = (base: string): string => {
      if (!used.has(base)) { used.add(base); return base; }
      let i = 2;
      while (used.has(`${base}_${i}`)) i++;
      const name = `${base}_${i}`;
      used.add(name);
      return name;
    };

    const columns: ExportColumn[] = [];
    for (const dp of dps) {
      columns.push({
        name: uniq(columnName(dp.id, cls.id, dp.label)),
        sqlType: sqlFromXsd(dp.range[0] ?? 'xsd:string'),
        xsd: dp.range[0] ?? 'xsd:string',
        isFk: false,
        propId: dp.id,
      });
    }
    for (const op of ops) {
      columns.push({
        name: uniq(columnName(op.id, cls.id, op.label)),
        sqlType: 'TEXT',
        xsd: 'xsd:string',
        isFk: true,
        refTable: op.range[0],
        propId: op.id,
      });
    }

    const rows = inds.map((ind) => {
      const cells: (string | null)[] = [ind.id];
      for (const col of columns) {
        if (col.isFk) {
          const a = ind.objectPropertyAssertions.find((x) => x.property === col.propId);
          cells.push(a ? a.target : null);
        } else {
          const a = ind.dataPropertyAssertions.find((x) => x.property === col.propId);
          cells.push(a ? a.value : null);
        }
      }
      return cells;
    });

    tables.push({ tableName: cls.id, columns, rows });
  }

  return tables;
}

// ── SQL ──────────────────────────────────────────────────────────────────────
const qIdent = (s: string) => `"${s.replace(/"/g, '""')}"`;

function sqlValue(raw: string | null, xsd: string): string {
  if (raw === null) return 'NULL';
  if (isNumericXsd(xsd) && raw.trim() !== '' && !Number.isNaN(Number(raw))) return raw.trim();
  return `'${raw.replace(/'/g, "''")}'`;
}

export function ontologyToSql(onto: Ontology): string {
  const tables = buildTables(onto);
  if (tables.length === 0) return '-- No classes with data to export.\n';

  const out: string[] = [
    `-- Relational export of "${onto.label}"`,
    `-- ${onto.iri}`,
    'PRAGMA foreign_keys = ON;',
    '',
  ];

  for (const t of tables) {
    const defs = [`  ${qIdent('id')} TEXT PRIMARY KEY`];
    for (const c of t.columns) defs.push(`  ${qIdent(c.name)} ${c.sqlType}`);
    for (const c of t.columns) {
      if (c.isFk && c.refTable) {
        defs.push(`  FOREIGN KEY (${qIdent(c.name)}) REFERENCES ${qIdent(c.refTable)}(${qIdent('id')})`);
      }
    }
    out.push(`CREATE TABLE ${qIdent(t.tableName)} (\n${defs.join(',\n')}\n);`);
  }
  out.push('');

  for (const t of tables) {
    if (t.rows.length === 0) continue;
    const colNames = ['id', ...t.columns.map((c) => c.name)].map(qIdent).join(', ');
    for (const row of t.rows) {
      const vals = row
        .map((cell, i) => (i === 0 ? sqlValue(cell, 'xsd:string') : sqlValue(cell, t.columns[i - 1].xsd)))
        .join(', ');
      out.push(`INSERT INTO ${qIdent(t.tableName)} (${colNames}) VALUES (${vals});`);
    }
    out.push('');
  }

  return out.join('\n');
}

// ── CSV ──────────────────────────────────────────────────────────────────────
function csvCell(v: string | null): string {
  if (v === null) return '';
  return /[",\n\r]/.test(v) ? `"${v.replace(/"/g, '""')}"` : v;
}

export interface CsvFile {
  name: string;
  content: string;
}

export function ontologyToCsv(onto: Ontology): CsvFile[] {
  return buildTables(onto).map((t) => {
    const header = ['id', ...t.columns.map((c) => c.name)].map(csvCell).join(',');
    const lines = t.rows.map((row) => row.map(csvCell).join(','));
    return { name: `${t.tableName}.csv`, content: [header, ...lines].join('\r\n') + '\r\n' };
  });
}
