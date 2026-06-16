Set objShell = CreateObject("WScript.Shell")
Set objFSO = CreateObject("Scripting.FileSystemObject")

projectRoot = "c:\Users\HP\Final VibeChat ADMIN\remix_-vibechat (18)"

' Change to project directory
objShell.CurrentDirectory = projectRoot

WScript.Echo "========== SYNCING ACTIVE SOURCE TO GITHUB =========="
WScript.Echo "Project Root: " & projectRoot
WScript.Echo ""

' Remove nested duplicate from git
WScript.Echo "[1] Removing nested folder from Git..."
objShell.Run "cmd /c git rm -r --cached ""remix_-vibechat (18)"" --force 2>nul || echo skipped", 0, True

' Delete nested folder
WScript.Echo "[2] Deleting nested folder from disk..."
nestedPath = projectRoot & "\remix_-vibechat (18)"
If objFSO.FolderExists(nestedPath) Then
  objFSO.DeleteFolder nestedPath, True
  WScript.Echo "    Deleted: " & nestedPath
End If

' Verify active source
WScript.Echo "[3] Verifying active source files..."
If objFSO.FileExists(projectRoot & "\src\App.tsx") Then
  WScript.Echo "    OK: src/App.tsx"
Else
  WScript.Echo "    ERROR: src/App.tsx missing"
  WScript.Quit 1
End If

' Stage files
WScript.Echo "[4] Staging active source files..."
objShell.Run "cmd /c git add -f src/ && git add -f package.json && git add -f vite.config.ts && git add -f .gitignore", 0, True

' Show status
WScript.Echo "[5] Git Status..."
objShell.Run "cmd /c git status", 0, True

' Commit
WScript.Echo "[6] Committing..."
objShell.Run "cmd /c git commit -m ""Fix: Sync active source to GitHub, remove nested duplicate, ensure TEST labels deployed""", 0, True

' Push
WScript.Echo "[7] Pushing to GitHub..."
objShell.Run "cmd /c git push origin main", 0, True

WScript.Echo "[8] Done!"
WScript.Echo "========== SYNC COMPLETE =========="
