Add-Content "C:\Program Files\mosquitto\mosquitto.conf" "listener 1883"
Add-Content "C:\Program Files\mosquitto\mosquitto.conf" "allow_anonymous true"
Restart-Service mosquitto
