@echo off
chcp 65001 >nul
title CRU Smart Farm - Public Internet Tunnel (4G/5G Anywhere)
color 0B

echo ============================================================================
echo    🌐 CRU Smart Farm - เปิดลิงก์สาธารณะ (เข้าจากเน็ต 4G/5G นอกวง WiFi ได้ทั่วโลก)
echo ============================================================================
echo.
echo ระบบกำลังสร้าง HTTPS Tunnel เชื่อมต่อเข้ากับพอร์ต 5173 (รวมทั้ง Frontend + API)...
echo เมื่อเชื่อมต่อสำเร็จ จะมีลิงก์ https://...lhr.life และ QR Code แสดงขึ้นมาด้านล่าง
echo สามารถส่งลิงก์หรือให้อาจารย์สแกน QR Code จากมือถือ (เน็ต 4G/5G อื่น) เข้าดูได้ทันที!
echo ============================================================================
echo.

:loop
ssh -o StrictHostKeyChecking=no -o ServerAliveInterval=30 -R 80:127.0.0.1:5173 nokey@localhost.run
echo [Tunnel] Reconnecting in 2 seconds...
timeout /t 2 >nul
goto loop

