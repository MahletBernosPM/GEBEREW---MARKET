// IndexedDB layer for Task 4: PWA offline sync
// Three stores: a write queue for listings made offline, a cache of the
// farmer's own listings (so they're viewable offline), and a cache of the
// price board data (so today's prices are viewable offline).

const DB_NAME = 'geberew-offline';
const DB_VERSION = 1;
const PENDING_STORE = 'pendingListings';
const MY_LISTINGS_STORE = 'myListings';
const PRICE_BOARD_STORE = 'priceBoardCache';

function openDb() {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(PENDING_STORE)) {
        db.createObjectStore(PENDING_STORE, { keyPath: 'id' });
      }
      if (!db.objectStoreNames.contains(MY_LISTINGS_STORE)) {
        db.createObjectStore(MY_LISTINGS_STORE, { keyPath: 'id' });
      }
      if (!db.objectStoreNames.contains(PRICE_BOARD_STORE)) {
        db.createObjectStore(PRICE_BOARD_STORE, { keyPath: 'key' });
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

async function putRecord(storeName, record) {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(storeName, 'readwrite');
    tx.objectStore(storeName).put(record);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

async function deleteRecord(storeName, key) {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(storeName, 'readwrite');
    tx.objectStore(storeName).delete(key);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

async function getAllRecords(storeName) {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(storeName, 'readonly');
    const req = tx.objectStore(storeName).getAll();
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

// Generates a client-side ID so a listing keeps the same identity through
// offline queueing, retries, and eventual sync — the server upserts by this
// id, so retried syncs never create duplicates.
export function generateListingId() {
  return crypto.randomUUID
    ? crypto.randomUUID()
    : `${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

// --- Write queue: listings made while offline, waiting to sync ---
export async function queueListing(listing) {
  await putRecord(PENDING_STORE, listing);
}

export async function getQueuedListings() {
  return getAllRecords(PENDING_STORE);
}

export async function syncQueuedListings() {
  const pending = await getQueuedListings();
  for (const listing of pending) {
    try {
      const res = await fetch('/api/listings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(listing),
      });
      if (res.ok) {
        await deleteRecord(PENDING_STORE, listing.id);
        await putRecord(MY_LISTINGS_STORE, { ...listing, synced: true });
      }
    } catch {
      break; // still offline — stop and retry on the next 'online' event
    }
  }
}

// --- Farmer's own listings cache (viewable offline) ---
export async function cacheMyListing(listing) {
  await putRecord(MY_LISTINGS_STORE, listing);
}

export async function getMyListings() {
  return getAllRecords(MY_LISTINGS_STORE);
}

// --- Price board cache (viewable offline) ---
export async function cachePriceBoard(data) {
  await putRecord(PRICE_BOARD_STORE, {
    key: 'latest',
    data,
    cachedAt: new Date().toISOString(),
  });
}

export async function getCachedPriceBoard() {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(PRICE_BOARD_STORE, 'readonly');
    const req = tx.objectStore(PRICE_BOARD_STORE).get('latest');
    req.onsuccess = () => resolve(req.result ? req.result.data : null);
    req.onerror = () => reject(req.error);
  });
}