import { openDB, type IDBPDatabase } from 'idb';
import type { KGGraph } from '../types';

const DB_NAME = 'graphbaby';
const DB_VERSION = 1;
const STORE_GRAPHS = 'graphs';

let db: IDBPDatabase | null = null;

async function getDB(): Promise<IDBPDatabase> {
  if (db) return db;
  db = await openDB(DB_NAME, DB_VERSION, {
    upgrade(database) {
      database.createObjectStore(STORE_GRAPHS, { keyPath: 'id' });
    },
  });
  return db;
}

export async function saveGraph(graph: KGGraph): Promise<string> {
  const database = await getDB();
  const id = graph.id ?? `graph_${Date.now()}`;
  const record = { ...graph, id, createdAt: graph.createdAt ?? Date.now() };
  await database.put(STORE_GRAPHS, record);
  return id;
}

export async function loadGraphs(): Promise<KGGraph[]> {
  const database = await getDB();
  return database.getAll(STORE_GRAPHS);
}

export async function deleteGraph(id: string): Promise<void> {
  const database = await getDB();
  await database.delete(STORE_GRAPHS, id);
}

export async function loadGraph(id: string): Promise<KGGraph | undefined> {
  const database = await getDB();
  return database.get(STORE_GRAPHS, id);
}
