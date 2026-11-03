# ============================================================================
# Smart Farm - DuckDNS Automatic Updater (olmy.duckdns.org)
# ============================================================================
param (
    [ValidateSet("local", "public")]
    [string]$Mode = "local"
)

$Domain = "olmy"
$Token  = "cd4515aa-fc7f-4623-9308-ff7b4eeb1454"

# ค้นหา IP ปัจจุบันของโน้ตบุ๊ก (Wi-Fi หรือ Ethernet ที่เชื่อมต่ออยู่)
$LocalIP = (Get-NetIPAddress -AddressFamily IPv4 | Where-Object {
    $_.IPAddress -notmatch "^127\." -and
    $_.IPAddress -notmatch "^169\.254\." -and
    $_.PrefixOrigin -in @("Dhcp", "Manual")
} | Select-Object -First 1).IPAddress

if ($Mode -eq "local" -and $LocalIP) {
    $TargetIP = $LocalIP
    $Url = "https://www.duckdns.org/update?domains=$Domain&token=$Token&ip=$TargetIP"
    Write-Host "[DuckDNS] Updating $Domain.duckdns.org -> Local/Hotspot IP ($TargetIP)..." -ForegroundColor Cyan
} else {
    $Url = "https://www.duckdns.org/update?domains=$Domain&token=$Token&ip="
    Write-Host "[DuckDNS] Updating $Domain.duckdns.org -> Public WAN IP..." -ForegroundColor Cyan
}

try {
    $Response = Invoke-RestMethod -Uri $Url -Method Get -TimeoutSec 10
    if ($Response -eq "OK") {
        Write-Host "[DuckDNS] SUCCESS! http://$Domain.duckdns.org:5173 is now active!" -ForegroundColor Green
    } else {
        Write-Host "[DuckDNS] Warning: DuckDNS returned '$Response'" -ForegroundColor Yellow
    }
} catch {
    Write-Host "[DuckDNS] Error updating DuckDNS: $($_.Exception.Message)" -ForegroundColor Red
}

