export interface Finding { file: string; line: number; rule: string }
export function scanFile(file: string, content: string): Finding[];
export function scanRoutes(files: Map<string, string>): Finding[];
