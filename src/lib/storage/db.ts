import { openDB, type IDBPDatabase } from 'idb';
import type { Ontology } from '../ontology/types';
import type { GraphChunk } from '../ai/rag';

const DB_NAME = 'graphbaby_v2';
const DB_VERSION = 2;
const STORE = 'ontologies';
const CHUNKS = 'chunks';
const CHUNK_META = 'chunk_meta';

export interface ChunkMeta {
  ontologyId: string;
  ontologyUpdatedAt: number;
  count: number;
}

let db: IDBPDatabase | null = null;

async function getDB(): Promise<IDBPDatabase> {
  if (db) return db;
  db = await openDB(DB_NAME, DB_VERSION, {
    upgrade(database, oldVersion) {
      if (oldVersion < 1) {
        database.createObjectStore(STORE, { keyPath: 'id' });
      }
      if (oldVersion < 2) {
        const cs = database.createObjectStore(CHUNKS, { keyPath: 'key' });
        cs.createIndex('byOntology', 'ontologyId');
        database.createObjectStore(CHUNK_META, { keyPath: 'ontologyId' });
      }
    },
  });
  return db;
}

// ── Ontologies ───────────────────────────────────────────────────────────────

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
  await deleteChunks(id);
}

// ── RAG chunk index ──────────────────────────────────────────────────────────

export async function saveChunks(
  ontologyId: string,
  chunks: GraphChunk[],
  ontologyUpdatedAt: number,
): Promise<void> {
  const database = await getDB();
  const oldKeys = await database.getAllKeysFromIndex(CHUNKS, 'byOntology', ontologyId);
  const tx = database.transaction(CHUNKS, 'readwrite');
  await Promise.all([
    ...oldKeys.map((k) => tx.store.delete(k)),
    ...chunks.map((c) => tx.store.put(c)),
  ]);
  await tx.done;
  await database.put(CHUNK_META, { ontologyId, ontologyUpdatedAt, count: chunks.length });
}

export async function loadChunks(ontologyId: string): Promise<GraphChunk[]> {
  const database = await getDB();
  return database.getAllFromIndex(CHUNKS, 'byOntology', ontologyId) as Promise<GraphChunk[]>;
}

export async function getChunkMeta(ontologyId: string): Promise<ChunkMeta | undefined> {
  const database = await getDB();
  return database.get(CHUNK_META, ontologyId) as Promise<ChunkMeta | undefined>;
}

export async function deleteChunks(ontologyId: string): Promise<void> {
  const database = await getDB();
  const keys = await database.getAllKeysFromIndex(CHUNKS, 'byOntology', ontologyId);
  const tx = database.transaction(CHUNKS, 'readwrite');
  await Promise.all(keys.map((k) => tx.store.delete(k)));
  await tx.done;
  await database.delete(CHUNK_META, ontologyId);
}
