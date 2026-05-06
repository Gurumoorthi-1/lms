@echo off
title XyzonLMS CodeLab
color 0A
echo.
echo  ========================================
echo   XyzonLMS CodeLab - MERN Stack
echo  ========================================
echo.

where node >nul 2>&1 || (echo [ERROR] Node.js not found. Install: https://nodejs.org & pause & exit /b 1)
echo [OK] Node.js found: && node --version

where python >nul 2>&1 && (echo [OK] Python found) || echo [WARN] Python not found - Python challenges wont work
where javac >nul 2>&1 && (echo [OK] javac found) || echo [WARN] javac not found - Java challenges wont work
where g++ >nul 2>&1 && (echo [OK] G++ found) || echo [INFO] G++ not found - C++ wont work

echo.
echo Installing backend dependencies...
cd /d "%~dp0backend"
call npm install
if errorlevel 1 (echo [ERROR] Backend npm install failed & pause & exit /b 1)

echo.
echo Installing frontend dependencies...
cd /d "%~dp0frontend"
call npm install
if errorlevel 1 (echo [ERROR] Frontend npm install failed & pause & exit /b 1)

echo.
echo Starting Backend on http://localhost:5000
cd /d "%~dp0backend"
start "XyzonLMS Backend" cmd /k "node server.js"

echo Waiting for backend...
timeout /t 3 /nobreak >nul

echo Starting Frontend on http://localhost:5173
cd /d "%~dp0frontend"
start "XyzonLMS Frontend" cmd /k "npm run dev"

timeout /t 3 /nobreak >nul
start http://localhost:5173

echo.
echo  [STARTED] Backend:  http://localhost:5000
echo  [STARTED] Frontend: http://localhost:5173
echo.
echo  Close the backend and frontend windows to stop.
echo.
pause
