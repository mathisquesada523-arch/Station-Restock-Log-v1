@echo off
setlocal
cd /d "%~dp0"

where npm.cmd >nul 2>&1
if errorlevel 1 (
  echo Node.js and npm are needed to start Station Restock Log.
  pause
  exit /b 1
)

set "NEED_INSTALL="
if not exist "node_modules\.package-lock.json" set "NEED_INSTALL=1"
if not exist "node_modules\vite\bin\vite.js" set "NEED_INSTALL=1"
if not exist "node_modules\.bin\vite.cmd" set "NEED_INSTALL=1"

if defined NEED_INSTALL (
  call npm.cmd ci
  if errorlevel 1 (
    pause
    exit /b 1
  )
)

call npm.cmd run dev -- --host 127.0.0.1 --port 5173 --strictPort --open
if errorlevel 1 pause
