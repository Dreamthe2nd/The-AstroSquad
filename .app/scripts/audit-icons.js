const fs = require('fs');
const path = require('path');

function checkDir(dir) {
  let issues = 0;
  const files = fs.readdirSync(dir);
  for (const f of files) {
    const full = path.join(dir, f);
    if (fs.statSync(full).isDirectory()) {
      issues += checkDir(full);
    } else if (f.endsWith('.tsx') || f.endsWith('.ts')) {
      const code = fs.readFileSync(full, 'utf-8');
      const lucideMatch = code.match(/import\s*\{([^}]+)\}\s*from\s*['"]lucide-react['"]/);
      const imported = new Set(
        lucideMatch
          ? lucideMatch[1].split(',').map((s) => {
              const parts = s.trim().split(/\s+as\s+/);
              return parts[parts.length - 1].trim();
            }).filter(Boolean)
          : []
      );

      // Match actual JSX elements: e.g. <IconName className=... or <IconName />
      // Ignore TypeScript generics: React.FC<...>, useState<...>, useRef<...>, etc.
      const tagMatches = code.matchAll(/(?<!(?:React\.FC|useState|useRef|Array|Record|Promise|Map|Set))<([A-Z][a-zA-Z0-9]+)(\s+[a-zA-Z0-9_-]+|\s*\/?>)/g);
      for (const m of tagMatches) {
        const tag = m[1];
        const knownGlobals = [
          'App', 'AuthScreen', 'FlightDeckHub', 'Workspace', 'Toast',
          'ErrorBoundary', 'FileSidebar', 'TopActionBar', 'SettingsModal', 'PdfViewer',
          'PptxViewer', 'MarkdownViewer', 'ImageViewer', 'CsvViewer', 'CodeViewer',
          'DopplerWavesBackground',
          'ReactMarkdown', 'Fragment', 'React', 'Component'
        ];
        if (!knownGlobals.includes(tag) && !tag.endsWith('Props') && !tag.endsWith('State') && !tag.endsWith('Type')) {
          if (!imported.has(tag) && !code.includes('const ' + tag) && !code.includes('function ' + tag) && !code.includes(tag + ' } from')) {
            console.error(`[ICON ISSUE] In ${f}: <${tag}> is NOT imported from lucide-react or declared!`);
            issues++;
          }
        }
      }
    }
  }
  return issues;
}

const totalIssues = checkDir(path.join(__dirname, '../src/renderer/src'));
if (totalIssues === 0) {
  console.log('✅ ALL JSX icons across the entire renderer are properly imported and resolved!');
} else {
  console.error(`❌ Found ${totalIssues} icon import issues!`);
  process.exit(1);
}
