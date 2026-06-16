#!/usr/bin/env python3
import subprocess
import os
import sys
import shutil
from pathlib import Path

projectRoot = r'c:\Users\HP\Final VibeChat ADMIN\remix_-vibechat (18)'
os.chdir(projectRoot)

def run_cmd(cmd, ignore_error=False):
    print(f"\n> {cmd}")
    try:
        result = subprocess.run(cmd, shell=True, capture_output=True, text=True)
        if result.stdout:
            print(result.stdout)
        if result.stderr and not ignore_error:
            print(result.stderr)
        return result.returncode == 0
    except Exception as e:
        print(f"ERROR: {e}")
        return not ignore_error

print("========== GITHUB SYNC: ACTIVE SOURCE ==========\n")
print(f"Project Root: {projectRoot}\n")

# Step 1: Remove nested duplicate from git
print("[1] Removing nested folder from Git tracking...")
run_cmd('git rm -r --cached "remix_-vibechat (18)" --force 2>nul', ignore_error=True)

# Step 2: Delete nested folder
print("[2] Deleting nested folder from disk...")
nestedPath = Path(projectRoot) / 'remix_-vibechat (18)'
if nestedPath.exists():
    try:
        shutil.rmtree(nestedPath)
        print(f"    ✓ Deleted: {nestedPath}")
    except Exception as e:
        print(f"    Note: {e}")

# Step 3: Verify active source
print("\n[3] Verifying active source...")
files_to_check = [
    'src/App.tsx',
    'src/main.tsx',
    'src/components/HomePage.tsx',
]
for f in files_to_check:
    fpath = Path(projectRoot) / f
    if fpath.exists():
        print(f"    ✓ {f}")
    else:
        print(f"    ✗ MISSING: {f}")
        sys.exit(1)

# Step 4: Verify TEST labels
print("\n[4] Verifying TEST labels in App.tsx...")
app_file = Path(projectRoot) / 'src/App.tsx'
app_content = app_file.read_text()
labels = ['PEOPLE_TEST', 'CHAT_TEST', 'MATCHING_TEST', 'VIP_TEST']
for label in labels:
    if label in app_content:
        print(f"    ✓ {label}")
    else:
        print(f"    ✗ MISSING: {label}")
        sys.exit(1)

# Step 5: Stage files
print("\n[5] Staging active source files...")
files_to_add = [
    'src',
    'package.json',
    'vite.config.ts',
    'tsconfig.json',
    'index.html',
    '.gitignore',
    'server.ts',
    'server-db.ts'
]
for f in files_to_add:
    run_cmd(f'git add -f "{f}"')

# Step 6: Git status
print("\n[6] Git Status:")
run_cmd('git status')

# Step 7: Commit
print("\n[7] Committing...")
msg = 'Fix: Sync active source to GitHub, remove nested duplicate, ensure TEST labels deployed'
run_cmd(f'git commit -m "{msg}"')

# Step 8: Push
print("\n[8] Pushing to GitHub...")
run_cmd('git push origin main')

# Step 9: Verify
print("\n[9] Verifying push...")
run_cmd('git log --oneline -3')

print("\n========== SYNC COMPLETE ==========")
