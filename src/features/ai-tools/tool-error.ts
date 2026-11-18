import type { ToolResult, ToolStatus } from './types';

const messages = {
  unauthorized: 'Authentication required.',
  forbidden: 'This action is forbidden.',
  invalid_input: 'Invalid tool input.',
  not_found: 'Tool or record not found.',
  rate_limited: 'Tool rate limit reached.',
  timeout: 'Tool timed out.',
  unavailable: 'Tool unavailable.',
} satisfies Record<Exclude<ToolStatus, 'ok'>, string>;

export class ToolError extends Error {
  constructor(readonly code: 'forbidden' | 'not_found') {
    super(messages[code]);
  }
}

export function failure(code: keyof typeof messages, issuePaths?: string): ToolResult {
  return { ok: false, error: { code, message: issuePaths || messages[code] } };
}
