import fs from 'fs';
import path from 'path';

const REDIS_URL = process.env.UPSTASH_REDIS_REST_URL || process.env.KV_REST_API_URL;
const REDIS_TOKEN = process.env.UPSTASH_REDIS_REST_TOKEN || process.env.KV_REST_API_TOKEN;
const HAS_KV = !!(REDIS_URL && REDIS_TOKEN);

const ENTRIES_KEY = 'fort-trails:entries';
const TRIPS_KEY = 'fort-trails:trips';
const CATEGORIES_KEY = 'fort-trails:categories';

const LOCAL_DIR = path.join(process.cwd(), '.local-data');
const LOCAL_FILE = path.join(LOCAL_DIR, 'db.json');

function readLocal() {
  try {
    if (!fs.existsSync(LOCAL_FILE)) return { entries: [], trips: [], categories: [] };
    const data = JSON.parse(fs.readFileSync(LOCAL_FILE, 'utf-8'));
    if (!data.categories) data.categories = [];
    return data;
  } catch {
    return { entries: [], trips: [], categories: [] };
  }
}

function writeLocal(data) {
  if (!fs.existsSync(LOCAL_DIR)) fs.mkdirSync(LOCAL_DIR, { recursive: true });
  fs.writeFileSync(LOCAL_FILE, JSON.stringify(data, null, 2));
}

let _redis = null;
async function getKv() {
  if (_redis) return _redis;
  const { Redis } = await import('@upstash/redis');
  _redis = new Redis({
    url: REDIS_URL,
    token: REDIS_TOKEN
  });
  return _redis;
}

export async function getEntries() {
  if (HAS_KV) {
    const kv = await getKv();
    const data = await kv.get(ENTRIES_KEY);
    return data || [];
  }
  return readLocal().entries;
}

export async function setEntries(entries) {
  if (HAS_KV) {
    const kv = await getKv();
    await kv.set(ENTRIES_KEY, entries);
    return;
  }
  const data = readLocal();
  data.entries = entries;
  writeLocal(data);
}

export async function getTrips() {
  if (HAS_KV) {
    const kv = await getKv();
    const data = await kv.get(TRIPS_KEY);
    return data || [];
  }
  return readLocal().trips;
}

export async function setTrips(trips) {
  if (HAS_KV) {
    const kv = await getKv();
    await kv.set(TRIPS_KEY, trips);
    return;
  }
  const data = readLocal();
  data.trips = trips;
  writeLocal(data);
}

export async function getCategories() {
  if (HAS_KV) {
    const kv = await getKv();
    const data = await kv.get(CATEGORIES_KEY);
    return data || [];
  }
  return readLocal().categories || [];
}

export async function setCategories(categories) {
  if (HAS_KV) {
    const kv = await getKv();
    await kv.set(CATEGORIES_KEY, categories);
    return;
  }
  const data = readLocal();
  data.categories = categories;
  writeLocal(data);
}

export function newId(prefix = 'id') {
  return prefix + '_' + Math.random().toString(36).slice(2, 10) + Date.now().toString(36);
}
