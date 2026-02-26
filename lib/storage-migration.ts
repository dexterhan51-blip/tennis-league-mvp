import { idbGet, idbSet } from './idb';

const MIGRATION_FLAG = 'idb-migration-done';

// Keys that should be migrated from localStorage to IndexedDB
const IDB_KEYS = [
  'tennis-players',
  'current-league',
  'league-slot-1',
  'league-slot-2',
  'league-slot-3',
  'previous-rankings',
  'finished-dates',
];

// Keys that stay in localStorage (simple strings)
// 'tennis-app-theme', 'tennis-app-font-size', 'current-slot-index'

export async function runStorageMigration(): Promise<void> {
  try {
    // Check if migration already done
    const done = await idbGet<boolean>(MIGRATION_FLAG);
    if (done) return;

    for (const key of IDB_KEYS) {
      const raw = localStorage.getItem(key);
      if (raw !== null) {
        try {
          const parsed = JSON.parse(raw);
          await idbSet(key, parsed);
        } catch {
          // If not valid JSON, store as-is
          await idbSet(key, raw);
        }
      }
    }

    // Mark migration as done
    await idbSet(MIGRATION_FLAG, true);

    // Clean up migrated keys from localStorage
    for (const key of IDB_KEYS) {
      localStorage.removeItem(key);
    }
  } catch (e) {
    console.warn('[migration] Failed to migrate to IndexedDB:', e);
  }
}
