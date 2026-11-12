import 'server-only';
import { listPlayerPrograms, loadProgram } from './program-io';

// Plain server functions so server components can read programs without importing the client-heavy barrel.
export function readProgram(id: string) {
  return loadProgram(id);
}

export function readPlayerPrograms(playerId: string) {
  return listPlayerPrograms(playerId);
}
