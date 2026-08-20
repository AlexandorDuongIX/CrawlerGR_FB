@echo off
title NEO-BOT Launcher

echo.
echo  ==========================================
echo    NEO-BOT  -  FB Command Center
echo  ==========================================
echo.
echo  Starting Backend  (port 8000)...
echo  Starting Frontend (port 3000)...
echo.

set "PROJECT_DIR=%~dp0FacebookGroupScraper"

start "NEO-BOT_Backend" /min cmd /k "cd /d %PROJECT_DIR% && python -m uvicorn BE.main:app --port 8000"

timeout /t 3 /nobreak >nul

start "NEO-BOT_Frontend" /min cmd /k "cd /d %PROJECT_DIR%\FE && npm run dev"

timeout /t 4 /nobreak >nul

echo  Servers started! Opening browser...
echo.
echo  Backend:  http://127.0.0.1:8000
echo  Frontend: http://localhost:3000
echo.
start "" http://localhost:3000

echo  ------------------------------------------
echo  Press any key to STOP all servers...
echo  ------------------------------------------
pause >nul

echo.
echo  Shutting down...
taskkill /fi "WINDOWTITLE eq NEO-BOT_Backend*" /f >nul 2>&1
taskkill /fi "WINDOWTITLE eq NEO-BOT_Frontend*" /f >nul 2>&1
echo  All servers stopped. Goodbye!
timeout /t 2 /nobreak >nul
