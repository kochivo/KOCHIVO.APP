import { optionsMcp, postMcp, rejectMcpMethod } from '@/features/mcp/server';

export function POST(request: Request) {
  return postMcp(request);
}

export { optionsMcp as OPTIONS, rejectMcpMethod as GET, rejectMcpMethod as DELETE,
  rejectMcpMethod as PUT, rejectMcpMethod as PATCH, rejectMcpMethod as HEAD };
