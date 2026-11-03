# ============================================================================
# Smart Farm - Windows Firewall Configuration Script (Private + Public + Domain)
# เปิดพอร์ต 8000 (PHP API), 5173 (React UI), และ 5353 (mDNS) สำหรับทุกวงเครือข่าย
# รองรับการเปลี่ยนไปใช้ Mobile Hotspot (Public Network) ตอนสาธิตที่มหาวิทยาลัย
# ============================================================================

$isAdmin = ([Security.Principal.WindowsPrincipal][Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)

if (-not $isAdmin) {
    Write-Host "Requesting Administrator privileges to configure Windows Firewall..." -ForegroundColor Yellow
    Start-Process powershell.exe -ArgumentList "-NoProfile -ExecutionPolicy Bypass -File `"$PSCommandPath`"" -Verb RunAs -Wait
    exit
}

Write-Host "==========================================================" -ForegroundColor Cyan
Write-Host "  Configuring Windows Firewall for CRU Smart Farm Demo" -ForegroundColor Cyan
Write-Host "==========================================================" -ForegroundColor Cyan

# ลบ Rule เก่าถ้ามีเพื่อไม่ให้ซ้ำซ้อน
Remove-NetFirewallRule -DisplayName "SmartFarm_Backend_8000" -ErrorAction SilentlyContinue
Remove-NetFirewallRule -DisplayName "SmartFarm_Frontend_5173" -ErrorAction SilentlyContinue
Remove-NetFirewallRule -DisplayName "SmartFarm_mDNS_5353" -ErrorAction SilentlyContinue

# 1. เปิดพอร์ต 8000 (PHP REST API Server) ทุก Profile (Domain, Private, Public)
New-NetFirewallRule -DisplayName "SmartFarm_Backend_8000" `
    -Direction Inbound `
    -Action Allow `
    -Protocol TCP `
    -LocalPort 8000 `
    -Profile Any `
    -Description "Allow Raspberry Pi Gateway to sync sensor data to PHP Backend on port 8000 (WiFi & Hotspot)" | Out-Null
Write-Host "[OK] Allowed TCP Port 8000 (PHP Backend API) on ALL profiles (Private & Public)" -ForegroundColor Green

# 2. เปิดพอร์ต 5173 (Vite React Frontend Dashboard) ทุก Profile
New-NetFirewallRule -DisplayName "SmartFarm_Frontend_5173" `
    -Direction Inbound `
    -Action Allow `
    -Protocol TCP `
    -LocalPort 5173 `
    -Profile Any `
    -Description "Allow Dashboard UI access on port 5173 across WiFi & Mobile Hotspot" | Out-Null
Write-Host "[OK] Allowed TCP Port 5173 (React Frontend UI) on ALL profiles (Private & Public)" -ForegroundColor Green

# 3. เปิดพอร์ต UDP 5353 (mDNS สำหรับชื่อเครื่อง DESKTOP-P4UNEON.local) ทุก Profile
New-NetFirewallRule -DisplayName "SmartFarm_mDNS_5353" `
    -Direction Inbound `
    -Action Allow `
    -Protocol UDP `
    -LocalPort 5353 `
    -Profile Any `
    -Description "Allow mDNS hostname resolution (DESKTOP-P4UNEON.local) on Mobile Hotspot" | Out-Null
Write-Host "[OK] Allowed UDP Port 5353 (mDNS Hostname Resolution) on ALL profiles (Private & Public)" -ForegroundColor Green

Write-Host "`nFirewall setup complete! Ready for University Mobile Hotspot Demo." -ForegroundColor Cyan
Start-Sleep -Seconds 2
