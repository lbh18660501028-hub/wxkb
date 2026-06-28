@echo off
chcp 65001 >nul
title WXKB Dev Server (port 3001)

echo ============================================
echo   WXKB 开发服务器重启工具
echo ============================================
echo.

REM ---- 杀掉占用 3001 端口的旧进程 ----
echo [1/2] 正在关闭旧的开发服务器 (端口 3001)...
for /f "tokens=5" %%a in ('netstat -ano ^| findstr ":3001" ^| findstr "LISTENING"') do (
    echo       -> 终止进程 PID: %%a
    taskkill /F /PID %%a >nul 2>&1
)
echo       完成。
echo.

REM ---- 启动新的开发服务器 ----
echo [2/2] 正在启动开发服务器...
echo       地址: http://localhost:3001
echo       按 Ctrl+C 可停止服务器
echo.

cd /d f:\1\fangzhi\wxkb
npm run dev

pause
