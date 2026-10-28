New-NetFirewallRule -DisplayName "Allow MQTT Port 1883" -Direction Inbound -Action Allow -Protocol TCP -LocalPort 1883
