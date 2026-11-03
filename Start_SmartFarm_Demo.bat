@echo off
chcp 65001 >nul
title CRU Smart Farm - University Demo Launcher
color 0A

set "FARM_DIR=c:\Smart Farm"

echo ============================================================================
echo    🌱 CRU Smart Farm AIoT System - One-Click Demo Launcher
echo ============================================================================
echo.

:: 1. ตรวจสอบว่าตั้งค่า Windows Firewall (Public + Private) แล้วหรือยัง
powershell -NoProfile -Command "if (-not (Get-NetFirewallRule -DisplayName 'SmartFarm_Backend_8000' -ErrorAction SilentlyContinue)) { exit 1 } else { exit 0 }"
if %errorlevel% neq 0 (
    echo [1/4] กำลังเปิดสิทธิ์ Windows Firewall สำหรับพอร์ต 8000, 5173 และ mDNS ^(Public/Hotspot^)...
    echo       ^(กรุณากด Yes บนหน้าต่างขอสิทธิ์ Administrator ที่เด้งขึ้นมา^)
    powershell -NoProfile -ExecutionPolicy Bypass -File "%FARM_DIR%\fix_firewall.ps1"
) else (
    echo [1/4] Windows Firewall ^(Public ^& Private Profile^) เปิดพร้อมใช้งานแล้ว [OK]
)

echo.
:: 2. อัปเดต IP ปัจจุบันเข้า DuckDNS (olmy.duckdns.org) อัตโนมัติ
echo [2/4] กำลังอัปเดต IP ปัจจุบันของโน้ตบุ๊กเข้ากับโดเมน olmy.duckdns.org ...
powershell -NoProfile -ExecutionPolicy Bypass -File "%FARM_DIR%\update_duckdns.ps1" -Mode local

echo.
:: 3. ตรวจสอบและเปิด PHP Backend Server (Port 8000)
netstat -ano | findstr ":8000 " | findstr "LISTENING" >nul
if %errorlevel% neq 0 (
    echo [3/4] กำลังเริ่มรัน PHP REST Backend Server ^(0.0.0.0:8000^)...
    start "SmartFarm PHP Backend (Port 8000)" /D "%FARM_DIR%\backend" cmd /k "php -S 0.0.0.0:8000"
) else (
    echo [3/4] PHP REST Backend Server ^(พอร์ต 8000^) กำลังทำงานอยู่แล้ว [OK]
)

echo.
:: 4. ตรวจสอบและเปิด React Vite Frontend (Port 5173)
netstat -ano | findstr ":5173 " | findstr "LISTENING" >nul
if %errorlevel% neq 0 (
    echo [4/4] กำลังเริ่มรัน React Dashboard Frontend ^(0.0.0.0:5173^)...
    start "SmartFarm Frontend UI (Port 5173)" /D "%FARM_DIR%\frontend" cmd /k "npm run dev -- --host 0.0.0.0"
    timeout /t 4 /nobreak >nul
) else (
    echo [4/4] React Dashboard Frontend ^(พอร์ต 5173^) กำลังทำงานอยู่แล้ว [OK]
)

echo.
echo ============================================================================
echo   ✅ ระบบพร้อมสาธิตแล้ว! กำลังเปิดหน้าเว็บ Dashboard...
echo ============================================================================
echo   • เข้าผ่านโดเมน DuckDNS        : http://olmy.duckdns.org:5173
echo   • เข้าจากโน้ตบุ๊กเครื่องนี้      : http://localhost:5173
echo   • เข้าผ่านชื่อเครื่อง (mDNS)   : http://DESKTOP-P4UNEON.local:5173
echo   • URL ซิงค์สำหรับ Raspberry Pi : http://olmy.duckdns.org:8000/api/sync.php
echo   • บัญชีเข้าสู่ระบบ (Super Admin): olm22@gmail.com
echo ============================================================================
echo.

:: เปิดเบราว์เซอร์เข้าหน้า Dashboard ผ่านโดเมน DuckDNS อัตโนมัติ
start http://olmy.duckdns.org:5173

echo แสดงรายการ IP ปัจจุบันของโน้ตบุ๊ก:
ipconfig | findstr /i "IPv4"
echo.
echo กดปุ่มใดก็ได้เพื่อปิดหน้าต่าง Launcher นี้ ^(ตัว Server จะยังทำงานต่อในเบื้องหลัง^)...
pause >nul
