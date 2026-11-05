const testFile = /(?:^|\/)(?:tests?|__tests__)\/|\.(?:test|spec)\.[cm]?[jt]sx?$/;

function pathRules(file) {
  if (/(^|\/)\.env[^/]*$/.test(file) && file !== '.env.example') return 'tracked-env';
  if (/\.(log|bak|orig|tmp)$|^[^/]+\.(png|jpg)$|^(playwright-report|test-results|supabase\/\.temp)\//i.test(file)) return 'stray-file';
}

function secretRule(line) {
  return /\beyJ[\w-]{10,}\.[\w-]{16,}\.[\w-]{16,}|\b(?:sb_secret_|sk_live_|sk_test_)[\w-]+|-----BEGIN [A-Z ]*PRIVATE KEY|\bAKIA[A-Z0-9]{16}|\b(?:ghp_|github_pat_|sntrys_)[\w-]{20,}|\bre_[\w]{20,}|\b0x4AAAAAAA[\w-]{20,}/.test(line);
}

function exampleRule(file, line) {
  if (file !== '.env.example') return false;
  const match = line.match(/^\s*(?:export\s+)?([\w]+)\s*=\s*(.*?)\s*(?:#.*)?$/);
  return Boolean(match && /SECRET|SERVICE_ROLE|PRIVATE|PASSWORD|TOKEN/i.test(match[1]) && !/^(?:""|'')?$/.test(match[2]));
}

function sourceRule(file, line) {
  if (!file.startsWith('src/') || testFile.test(file)) return;
  if (/\bconsole\s*\.\s*log\s*\(/.test(line)) return 'console-log';
  if (/\bdebugger\b/.test(line)) return 'debugger';
  if (/[\w-]+\.supabase\.co\b/.test(line)) return 'supabase-url';
  if (file.endsWith('.tsx') && /#[\da-f]{3,8}\b/i.test(line) && !(file === 'src/app/[locale]/layout.tsx' && /themeColor|theme-color/.test(line))) return 'hex-color';
}

export function scanFile(file, content) {
  const findings = [];
  const pathRule = pathRules(file);
  if (pathRule) findings.push({ file, line: 1, rule: pathRule });
  const themeBlock = file === 'src/app/[locale]/layout.tsx' ? content.match(/themeColor:\s*\[[\s\S]*?\]/)?.[0] : undefined;
  content.split(/\r?\n/).forEach((line, index) => {
    const rules = [secretRule(line) && 'secret', exampleRule(file, line) && 'example-secret', sourceRule(file, line), testFile.test(file) && /\b(?:it|test|describe)\s*\.\s*only\s*\(/.test(line) && 'focused-test'];
    for (const rule of rules.filter(Boolean)) {
      if (rule === 'hex-color' && themeBlock?.split(/\r?\n/).includes(line)) continue;
      findings.push({ file, line: index + 1, rule });
    }
  });
  return findings;
}

const devGuard = /if\s*\(process\.env\.NODE_ENV\s*!==\s*['"]development['"]\)\s*\{?\s*notFound\(\)/;

export function scanRoutes(files) {
  const findings = [];
  for (const [file, content] of files) {
    if (!/^src\/app\/.*\/(?:page|route)\.[jt]sx?$/.test(file)) continue;
    const parts = file.split('/');
    const restricted = parts.slice(2, -1).some(part => /^(dev|debug|test|playground)$/.test(part));
    // Layouts render in parallel with pages, so a layout guard alone still ships the page payload.
    if (restricted && !devGuard.test(content)) findings.push({ file, line: 1, rule: 'unguarded-route' });
  }
  return findings;
}
