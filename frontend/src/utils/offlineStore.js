/**
 * Offline data store using IndexedDB.
 *
 * - Data is stored under a key that includes the user's ID
 *   ("<userId>:shifts"), so one user can never read another user's cache.
 * - clearUserData() is called on logout to remove everything for that user.
 * - Sensitive API responses are NOT cached by the service worker; only the
 *   data the app explicitly chooses to keep for offline viewing is stored here.
 */
const DB_NAME = "shiftmanager-offline";
const STORE = "cache";
const VERSION = 1;

function openDb() {
  return new Promise((resolve, reject) => {
    if (typeof indexedDB === "undefined") {
      reject(new Error("IndexedDB not supported"));
      return;
    }
    const request = indexedDB.open(DB_NAME, VERSION);
    request.onupgradeneeded = () => request.result.createObjectStore(STORE);
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

async function withStore(mode, action) {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, mode);
    const store = tx.objectStore(STORE);
    const result = action(store);
    tx.oncomplete = () => {
      db.close();
      resolve(result?.result);
    };
    tx.onerror = () => {
      db.close();
      reject(tx.error);
    };
  });
}

const keyFor = (userId, name) => `${userId}:${name}`;

export async function saveOffline(userId, name, data) {
  try {
    await withStore("readwrite", (store) =>
      store.put({ data, savedAt: new Date().toISOString() }, keyFor(userId, name))
    );
  } catch (error) {
    console.warn("[offline] save failed:", error.message);
  }
}

export async function loadOffline(userId, name) {
  try {
    return (await withStore("readonly", (store) => store.get(keyFor(userId, name)))) || null;
  } catch (error) {
    console.warn("[offline] load failed:", error.message);
    return null;
  }
}

export async function clearUserData(userId) {
  try {
    const db = await openDb();
    await new Promise((resolve, reject) => {
      const tx = db.transaction(STORE, "readwrite");
      const store = tx.objectStore(STORE);
      const range = IDBKeyRange.bound(`${userId}:`, `${userId}:\uffff`);
      store.delete(range);
      tx.oncomplete = () => { db.close(); resolve(); };
      tx.onerror = () => { db.close(); reject(tx.error); };
    });
  } catch (error) {
    console.warn("[offline] clear failed:", error.message);
  }
}
