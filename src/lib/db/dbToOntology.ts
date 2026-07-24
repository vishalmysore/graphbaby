// Deterministic relational-database → ontology mapping (a "direct mapping",
// in the spirit of W3C R2RML / Ontop). No AI model required:
//   • table            → OWL Class
//   • plain column     → Data Property   (domain = table's class, range = xsd type)
//   • foreign-key col  → Object Property  (domain = table, range = referenced table)
//   • row (optional)   → Individual, with column values as data/object assertions
import type { Database } from 'sql.js';
import type { OWLClass, ObjectProperty, DataProperty, Individual } from '../ontology/types';
import { introspect, readRows, type DbTable } from './sqlEngine';

export interface DbToGraphOptions {
  includeRows: boolean;
  maxRowsPerTable: number;
}

export interface DbGraphResult {
  classes: OWLClass[];
  objectProperties: ObjectProperty[];
  dataProperties: DataProperty[];
  individuals: Individual[];
  stats: { tables: number; dataProperties: number; objectProperties: number; individuals: number };
}

function slug(s: string): string {
  return (
    String(s).trim().toLowerCase().replace(/\s+/g, '_').replace(/[^a-z0-9_]/g, '') || '_'
  );
}

function humanize(s: string): string {
  return s.replace(/_/g, ' ').replace(/\bid\b/i, 'ID').trim();
}

const iri = (base: string, id: string) => `${base}#${id}`;

/** Map a SQLite declared column type to an xsd datatype. */
export function xsdFromSqlType(type: string): string {
  const t = type.toUpperCase();
  if (/(DATETIME|TIMESTAMP)/.test(t)) return 'xsd:dateTime';
  if (/DATE/.test(t)) return 'xsd:date';
  if (/BOOL/.test(t)) return 'xsd:boolean';
  if (/INT/.test(t)) return 'xsd:integer';
  if (/(REAL|FLOA|DOUB)/.test(t)) return 'xsd:double';
  if (/(NUMERIC|DEC)/.test(t)) return 'xsd:decimal';
  return 'xsd:string';
}

function pickLabelColumn(table: DbTable): string | null {
  const prefer = ['name', 'title', 'label', 'fullname', 'full_name'];
  for (const p of prefer) {
    const c = table.columns.find((col) => col.name.toLowerCase() === p);
    if (c) return c.name;
  }
  return null;
}

/**
 * Build ontology entities from a live database. Reads rows only when
 * `opts.includeRows` is set. Ids are stable/deterministic so re-running merges
 * cleanly rather than duplicating.
 */
export function mapDatabaseToGraph(
  db: Database,
  base: string,
  opts: DbToGraphOptions,
): DbGraphResult {
  const schema = introspect(db);

  const classes: OWLClass[] = [];
  const objectProperties: ObjectProperty[] = [];
  const dataProperties: DataProperty[] = [];
  const individuals: Individual[] = [];

  for (const table of schema.tables) {
    const classId = slug(table.name);
    const fkByCol = new Map(table.foreignKeys.map((fk) => [fk.from, fk]));

    // table → class
    classes.push({
      id: classId,
      iri: iri(base, classId),
      label: humanize(table.name),
      subClassOf: ['owl_Thing'],
      equivalentClasses: [],
      disjointWith: [],
      annotations: [{ property: 'rdfs:comment', value: `Mapped from SQL table "${table.name}".` }],
    });

    for (const col of table.columns) {
      const fk = fkByCol.get(col.name);
      if (fk) {
        // foreign-key column → object property
        const opId = `${classId}_${slug(col.name)}`;
        objectProperties.push({
          id: opId,
          iri: iri(base, opId),
          label: humanize(col.name.replace(/_?id$/i, '') || col.name),
          subPropertyOf: [],
          domain: [classId],
          range: [slug(fk.table)],
          characteristics: col.pk ? [] : ['Functional'],
          annotations: [],
        });
      } else {
        // plain column → data property
        const dpId = `${classId}_${slug(col.name)}`;
        dataProperties.push({
          id: dpId,
          iri: iri(base, dpId),
          label: humanize(col.name),
          subPropertyOf: [],
          domain: [classId],
          range: [xsdFromSqlType(col.type)],
          characteristics: ['Functional'],
          annotations: [],
        });
      }
    }
  }

  // rows → individuals
  if (opts.includeRows) {
    for (const table of schema.tables) {
      const classId = slug(table.name);
      const fkByCol = new Map(table.foreignKeys.map((fk) => [fk.from, fk]));
      const pkCol = table.columns.find((c) => c.pk)?.name ?? null;
      const labelCol = pickLabelColumn(table);

      const { columns, values } = readRows(db, table.name, opts.maxRowsPerTable);
      const idx = new Map(columns.map((c, i) => [c, i]));

      values.forEach((row, rowNum) => {
        const keyVal = pkCol != null ? row[idx.get(pkCol)!] : rowNum + 1;
        const indId = `${classId}_${slug(String(keyVal))}`;
        const labelVal = labelCol != null ? row[idx.get(labelCol)!] : null;
        const label =
          labelVal != null && String(labelVal).trim()
            ? String(labelVal)
            : `${humanize(table.name)} ${keyVal}`;

        const dataPropertyAssertions = [];
        const objectPropertyAssertions = [];

        for (const col of table.columns) {
          const value = row[idx.get(col.name)!];
          if (value === null || value === undefined || value === '') continue;
          const fk = fkByCol.get(col.name);
          if (fk) {
            objectPropertyAssertions.push({
              property: `${classId}_${slug(col.name)}`,
              target: `${slug(fk.table)}_${slug(String(value))}`,
            });
          } else {
            dataPropertyAssertions.push({
              property: `${classId}_${slug(col.name)}`,
              value: String(value),
              type: xsdFromSqlType(col.type),
            });
          }
        }

        individuals.push({
          id: indId,
          iri: iri(base, indId),
          label,
          types: [classId],
          sameAs: [],
          differentFrom: [],
          objectPropertyAssertions,
          dataPropertyAssertions,
          annotations: [],
        });
      });
    }
  }

  return {
    classes,
    objectProperties,
    dataProperties,
    individuals,
    stats: {
      tables: classes.length,
      dataProperties: dataProperties.length,
      objectProperties: objectProperties.length,
      individuals: individuals.length,
    },
  };
}
