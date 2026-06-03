import { openDB, type IDBPDatabase } from 'idb';
import type { Ontology } from '../ontology/types';

const DB_NAME = 'graphbaby_v2';
const DB_VERSION = 1;
const STORE = 'ontologies';

let db: IDBPDatabase | null = null;

async function getDB(): Promise<IDBPDatabase> {
  if (db) return db;
  db = await openDB(DB_NAME, DB_VERSION, {
    upgrade(database) {
      database.createObjectStore(STORE, { keyPath: 'id' });
    },
  });
  return db;
}

export async function saveOntology(onto: Ontology): Promise<void> {
  const database = await getDB();
  await database.put(STORE, onto);
}

export async function loadOntologies(): Promise<Ontology[]> {
  const database = await getDB();
  return database.getAll(STORE);
}

export async function deleteOntology(id: string): Promise<void> {
  const database = await getDB();
  await database.delete(STORE, id);
}
