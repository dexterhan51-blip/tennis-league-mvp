import { z } from 'zod';

// --- Sync helpers (for localStorage simple values) ---

export function safeGetJSON<T>(key: string, schema: z.ZodType<T>): T | undefined {
  try {
    const raw = localStorage.getItem(key);
    if (raw === null) return undefined;
    const parsed = JSON.parse(raw);
    const result = schema.safeParse(parsed);
    if (result.success) return result.data;
    console.warn(`[storage] Validation failed for key "${key}":`, result.error.issues);
    return undefined;
  } catch (e) {
    console.warn(`[storage] Failed to read key "${key}":`, e);
    return undefined;
  }
}

export function safeSetJSON(key: string, value: unknown): boolean {
  try {
    localStorage.setItem(key, JSON.stringify(value));
    return true;
  } catch (e) {
    console.warn(`[storage] Failed to write key "${key}":`, e);
    return false;
  }
}

export function safeGetString(key: string): string | undefined {
  try {
    return localStorage.getItem(key) ?? undefined;
  } catch {
    return undefined;
  }
}

export function safeSetString(key: string, value: string): boolean {
  try {
    localStorage.setItem(key, value);
    return true;
  } catch {
    return false;
  }
}

export function safeRemove(key: string): boolean {
  try {
    localStorage.removeItem(key);
    return true;
  } catch {
    return false;
  }
}

// --- Async helpers (for IndexedDB) ---

import { idbGet, idbSet, idbDelete } from './idb';

export async function safeGetAsync<T>(key: string, schema: z.ZodType<T>): Promise<T | undefined> {
  try {
    const value = await idbGet<unknown>(key);
    if (value === undefined) return undefined;
    const result = schema.safeParse(value);
    if (result.success) return result.data;
    console.warn(`[storage:idb] Validation failed for key "${key}":`, result.error.issues);
    return undefined;
  } catch (e) {
    console.warn(`[storage:idb] Failed to read key "${key}":`, e);
    return undefined;
  }
}

export async function safeSetAsync(key: string, value: unknown): Promise<boolean> {
  try {
    await idbSet(key, value);
    return true;
  } catch (e) {
    console.warn(`[storage:idb] Failed to write key "${key}":`, e);
    return false;
  }
}

export async function safeRemoveAsync(key: string): Promise<boolean> {
  try {
    await idbDelete(key);
    return true;
  } catch (e) {
    console.warn(`[storage:idb] Failed to delete key "${key}":`, e);
    return false;
  }
}
