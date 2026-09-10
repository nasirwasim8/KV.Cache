@echo off
title DDN KV Cache Observatory
color 0A
echo.
echo  ============================================
echo   DDN KV Cache Observatory - Starting Up
echo   Backend  : http://localhost:8002
echo   Frontend : http://localhost:5176
echo  ============================================
echo.

REM Kill any old processes on these ports
wsl -d Ubuntu-22.04 -- bash -c "pkill -f 'uvicorn main:app' 2>/dev/null; pkill -f 'vite.*5176' 2>/dev/null; sleep 1"

REM Start backend in new WSL window
echo [1/2] Starting Backend (port 8002)...
start "KVC Backend :8002" wsl -d Ubuntu-22.04 -- bash -c "cd /mnt/c/DDN/AI-Dev/Projects/KV.Cahce/backend && venv/bin/uvicorn main:app --host 0.0.0.0 --port 8002 --reload"

timeout /t 3 /nobreak > nul

REM Start frontend in new WSL window
echo [2/2] Starting Frontend (port 5176)...
start "KVC Frontend :5176" wsl -d Ubuntu-22.04 -- bash -c "cd /mnt/c/DDN/AI-Dev/Projects/KV.Cahce/frontend && npm run dev -- --host"

timeout /t 5 /nobreak > nul

echo.
echo  ============================================
echo   App is starting up...
echo   Open browser: http://localhost:5176
echo.
echo   Other apps (untouched):
echo   DDN RAG:    http://localhost:5174
echo   DDN VSS:    http://localhost:5175
echo  ============================================
echo.

REM Open browser automatically
timeout /t 3 /nobreak > nul
start http://localhost:5176

echo  [Press any key to close this launcher window]
pause > nul
