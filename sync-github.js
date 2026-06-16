const cp = require('child_process');
const path = require('path');
const fs = require('fs');
const os = require('os');

const projectRoot = path.normalize('c:\\Users\\HP\\Final VibeChat ADMIN\\remix_-vibechat (18)');

function exec(cmd, cwd = projectRoot) {
  try {
    console.log(`\n> ${cmd}`);
    const result = cp.execSync(cmd, { 
      cwd, 
      stdio: 'pipe',
      shell: true,
      encoding: 'utf8',
      windowsHide: true
    });
    console.log(result);
    return true;
  } catch (e) {
    console.error(`ERROR: ${e.message}`);
    if (e.stdout) console.log(e.stdout);
    if (e.stderr) console.log(e.stderr);
    return false;
  }
}

console.log('========== GITHUB SYNC: ACTIVE SOURCE ONLY ==========\n');

// Change to project root
process.chdir(projectRoot);

console.log(`Project Root: ${projectRoot}\n`);

// Step 1: Remove nested duplicate from git tracking
console.log('[1] Removing nested duplicate from Git...');
exec('git rm -r --cached "remix_-vibechat (18)" --force 2>nul || echo Folder not in git');

// Step 2: Delete nested folder from disk
console.log('\n[2] Deleting nested duplicate folder...');
const nestedPath = path.join(projectRoot, 'remix_-vibechat (18)');
if (fs.existsSync(nestedPath)) {
  try {
    cp.execSync(`rmdir /s /q "${nestedPath}"`, { shell: 'cmd.exe' });
    console.log(`✓ Deleted: ${nestedPath}`);
  } catch (e) {
    console.log(`Note: ${e.message}`);
  }
}

// Step 3: Verify active source
console.log('\n[3] Verifying active source...');
const files = [
  'src/App.tsx',
  'src/main.tsx',
  'src/components/HomePage.tsx',
  'package.json'
];
files.forEach(f => {
  if (fs.existsSync(path.join(projectRoot, f))) {
    console.log(`✓ ${f}`);
  } else {
    console.error(`✗ MISSING: ${f}`);
    process.exit(1);
  }
});

// Step 4: Verify TEST labels in App.tsx
console.log('\n[4] Verifying TEST labels in App.tsx...');
const appContent = fs.readFileSync(path.join(projectRoot, 'src/App.tsx'), 'utf8');
['PEOPLE_TEST', 'CHAT_TEST', 'MATCHING_TEST', 'VIP_TEST'].forEach(label => {
  if (appContent.includes(label)) {
    console.log(`✓ ${label}`);
  } else {
    console.error(`✗ MISSING: ${label}`);
    process.exit(1);
  }
});

// Step 5: Stage files
console.log('\n[5] Staging active source files...');
const toStage = [
  'src',
  'package.json',
  'vite.config.ts',
  'tsconfig.json',
  'index.html',
  '.gitignore',
  'server.ts',
  'server-db.ts'
];
toStage.forEach(f => {
  exec(`git add -f "${f}"`);
});

// Step 6: Git status
console.log('\n[6] Git Status:');
exec('git status');

// Step 7: Commit
console.log('\n[7] Committing...');
const msg = 'Fix: Sync active source to GitHub, remove nested duplicate, ensure TEST labels deployed';
if (!exec(`git commit -m "${msg}"`)) {
  console.log('(No changes to commit or commit failed)');
}

// Step 8: Push
console.log('\n[8] Pushing to GitHub...');
exec('git push origin main');

// Step 9: Verify
console.log('\n[9] Verifying...');
exec('git log --oneline -3');

console.log('\n========== SYNC COMPLETE ==========');
