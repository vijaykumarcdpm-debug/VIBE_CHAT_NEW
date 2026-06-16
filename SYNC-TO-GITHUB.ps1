$ErrorActionPreference = "Stop"

# Project root
$root = "c:\Users\HP\Final VibeChat ADMIN\remix_-vibechat (18)"
cd $root

Write-Host "====== GIT SYNC TO GITHUB (Active Source Only) ======" -ForegroundColor Green

# Step 1: Remove nested duplicate from git if tracked
Write-Host "`n[1] Removing nested duplicate from Git index..." -ForegroundColor Yellow
try {
    git rm -r --cached "remix_-vibechat (18)" --force 2>$null
    Write-Host "    ✓ Removed from git index" -ForegroundColor Green
} catch {
    Write-Host "    ✓ Not in git index (skipped)" -ForegroundColor Gray
}

# Step 2: Delete nested duplicate folder completely
Write-Host "`n[2] Deleting nested duplicate folder from disk..." -ForegroundColor Yellow
$nestedFolder = Join-Path $root "remix_-vibechat (18)"
if (Test-Path $nestedFolder) {
    Remove-Item $nestedFolder -Recurse -Force
    Write-Host "    ✓ Deleted: $nestedFolder" -ForegroundColor Green
} else {
    Write-Host "    ✓ Folder already deleted" -ForegroundColor Gray
}

# Step 3: Verify active source exists
Write-Host "`n[3] Verifying active source files..." -ForegroundColor Yellow
$srcApp = Join-Path $root "src/App.tsx"
$srcMain = Join-Path $root "src/main.tsx"
$srcHome = Join-Path $root "src/components/HomePage.tsx"

@($srcApp, $srcMain, $srcHome) | ForEach-Object {
    if (Test-Path $_) {
        Write-Host "    ✓ $_" -ForegroundColor Green
    } else {
        Write-Host "    ✗ MISSING: $_" -ForegroundColor Red
        exit 1
    }
}

# Step 4: Verify App.tsx contains TEST labels
Write-Host "`n[4] Verifying App.tsx has TEST labels..." -ForegroundColor Yellow
$appContent = Get-Content $srcApp -Raw
$testLabels = @("PEOPLE_TEST", "CHAT_TEST", "MATCHING_TEST", "VIP_TEST")
foreach ($label in $testLabels) {
    if ($appContent -match $label) {
        Write-Host "    ✓ Found: $label" -ForegroundColor Green
    } else {
        Write-Host "    ✗ MISSING: $label" -ForegroundColor Red
        exit 1
    }
}

# Step 5: Stage active source files
Write-Host "`n[5] Staging active source files..." -ForegroundColor Yellow
$filesToStage = @(
    "src/",
    "package.json",
    "vite.config.ts",
    "tsconfig.json",
    "index.html",
    ".gitignore",
    "server.ts",
    "server-db.ts"
)

foreach ($file in $filesToStage) {
    git add -f $file
    Write-Host "    ✓ Staged: $file" -ForegroundColor Green
}

# Step 6: Check git status
Write-Host "`n[6] Git Status:" -ForegroundColor Yellow
git status

# Step 7: Commit changes
Write-Host "`n[7] Committing to Git..." -ForegroundColor Yellow
$commitMsg = "Fix: Sync active source to GitHub, remove nested duplicate folder, ensure latest TEST labels deployed"
git commit -m $commitMsg
Write-Host "    ✓ Committed" -ForegroundColor Green

# Step 8: Push to GitHub
Write-Host "`n[8] Pushing to GitHub (origin/main)..." -ForegroundColor Yellow
git push origin main
Write-Host "    ✓ Pushed to origin/main" -ForegroundColor Green

# Step 9: Verify push
Write-Host "`n[9] Verifying push..." -ForegroundColor Yellow
git log --oneline -3

Write-Host "`n====== SYNC COMPLETE ======" -ForegroundColor Green
Write-Host "✓ Active source synced to GitHub" -ForegroundColor Green
Write-Host "✓ Nested duplicate removed" -ForegroundColor Green
Write-Host "✓ Latest code (with TEST labels) now live in GitHub" -ForegroundColor Green
