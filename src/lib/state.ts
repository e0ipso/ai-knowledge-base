import { atomicWriteJson, readJsonValidated } from './fs-atomic.js';
import { StateFileSchema, type StateFile } from './schemas.js';

export const STATE_LOCK_OPTIONS = { stale: 30 * 60 * 1000, realpath: false } as const;

export function readState(file: string): StateFile {
  return readJsonValidated(file, StateFileSchema, { schema_version: 1 });
}

export function writeState(file: string, state: StateFile): void {
  atomicWriteJson(file, state);
}
