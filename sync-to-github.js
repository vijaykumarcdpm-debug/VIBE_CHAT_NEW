#!/usr/bin/env node
const { execSync } = require('child_process');
const path = require('path');
const fs = require('fs');

const projectRoot = 'c:\\Users\\HP\\Final VibeChat ADMIN\\remix_-vibechat (18)';

try {
  process.chdir(projectRoot);
  
  console.log('=== GIT SYNC TO GITHUB ===\n');
  
  // Force remove nested duplicate from git tracking if present
  console.log('1. Removing nested duplicate from Git tracking...');
  try {
    execSync('git rm -r --cached "remix_-vibechat (18)/remix_-vibechat (18)/" --force 2>/dev/null || true', { stdio: 'inherit' });
  } catch (e) {
    console.log('   (Folder not in git index or already removed)');
  }
  
  // Stage active source files
  console.log('2. Staging active source files...');
  execSync('git add -f src/', { stdio: 'inherit' });
  execSync('git add -f package.json', { stdio: 'inherit' });
  execSync('git add -f vite.config.ts', { stdio: 'inherit' });
  execSync('git add -f tsconfig.json', { stdio: 'inherit' });
  execSync('git add -f index.html', { stdio: 'inherit' });
  execSync('git add -f .gitignore', { stdio: 'inherit' });
  execSync('git add -f server.ts', { stdio: 'inherit' });
  execSync('git add -f server-db.ts', { stdio: 'inherit' });
  
  // Show git status
  console.log('\n3. Git Status:');
  execSync('git status', { stdio: 'inherit' });
  
  // Commit
  console.log('\n4. Committing changes...');
  const commitMsg = 'Fix: Sync active source tree to GitHub, remove stale nested duplicate folder, update navigation labels to TEST variants';
  execSync(`git commit -m "${commitMsg}"`, { stdio: 'inherit' });
  
  // Push to origin main
  console.log('\n5. Pushing to GitHub...');
  execSync('git push origin main', { stdio: 'inherit' });
  
  // Show remote status
  console.log('\n6. Verifying push...');
  execSync('git log --oneline -5', { stdio: 'inherit' });
  
  console.log('\n=== SYNC COMPLETE ===');
  
} catch (error) {
  console.error('ERROR:', error.message);
  process.exit(1);
}
