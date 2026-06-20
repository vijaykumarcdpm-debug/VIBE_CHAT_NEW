const ts = require('./node_modules/typescript');
const fs = require('fs');
const path = require('path');
const file = path.join(process.cwd(), 'src', 'App.tsx');
const text = fs.readFileSync(file, 'utf8');
const source = ts.createSourceFile(file, text, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
for (const d of source.parseDiagnostics) {
  const start = d.start;
  const end = start + (d.length || 1);
  const loc = d.file.getLineAndCharacterOfPosition(start);
  console.log(d.file.fileName + ':' + (loc.line + 1) + ':' + (loc.character + 1));
  console.log(ts.flattenDiagnosticMessageText(d.messageText, '\n'));
  console.log('----');
  const snippet = text.slice(Math.max(0, start - 80), Math.min(text.length, end + 80));
  console.log(snippet.replace(/\r\n/g, '\\n').replace(/\n/g, '\\n'));
  console.log('====');
}
