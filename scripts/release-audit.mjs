import { execFileSync } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';
import { scanFile, scanRoutes } from './release-audit-rules.mjs';

const paths = execFileSync('git', ['ls-files', '-z'], { encoding: 'utf8' }).split('\0').filter(Boolean);
const files = new Map();
const findings = [];
for (const file of paths) {
  // Report forbidden env paths without opening potentially sensitive local files.
  const forbiddenEnv = /(^|\/)\.env[^/]*$/.test(file) && file !== '.env.example';
  // A path deleted in the working tree but not yet committed has nothing left to scan.
  const bytes = forbiddenEnv || !existsSync(file) ? Buffer.alloc(0) : readFileSync(file);
  const content = bytes.includes(0) ? '' : bytes.toString('utf8');
  files.set(file, content);
  findings.push(...scanFile(file, content));
}
findings.push(...scanRoutes(files));
for (const { file, line, rule } of findings) process.stderr.write(`${file}:${line} ${rule}\n`);
process.stdout.write(`Release audit: ${paths.length} tracked files, ${findings.length} findings\n`);
process.exitCode = findings.length ? 1 : 0;
