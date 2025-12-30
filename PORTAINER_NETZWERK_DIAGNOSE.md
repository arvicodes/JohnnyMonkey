# Netzwerk-Diagnose - Port-Mapping korrekt, aber nicht erreichbar

## ✅ Status

- ✅ Container läuft: `healthy`
- ✅ Port-Mapping: `80:80` (korrekt)
- ✅ Health-Check im Container: funktioniert
- ❌ Von außen nicht erreichbar

## 🔍 Mögliche Ursachen

### 1. IP-Adresse prüfen

**Frage**: Ist `192.168.8.1` wirklich die Server-IP?

**Prüfen:**
- Portainer läuft auf `https://192.168.8.1:9443` → Das sollte die richtige IP sein
- **Aber**: Vielleicht ist die IP anders?

**Test:**
- Vom Server aus: `curl http://192.168.8.1/health`
- Vom Mac aus: `curl http://192.168.8.1/health`

### 2. Firewall prüfen

**Server-Firewall** (nicht Sophos, sondern die Server-Firewall):
- Port 80 muss offen sein
- Falls `ufw` aktiv: `sudo ufw allow 80/tcp`
- Falls `iptables`: Regeln prüfen

**Prüfen (falls SSH-Zugriff):**
```bash
# Ubuntu/Debian
sudo ufw status
sudo ufw allow 80/tcp

# Oder iptables
sudo iptables -L -n | grep 80
```

### 3. Docker-Netzwerk prüfen

Der Container hat die IP `172.19.0.2` (interne Docker-IP). Das ist normal.

**Port-Mapping sollte funktionieren:**
- Host-Port 80 → Container-Port 80
- Von außen: `http://192.168.8.1` → sollte zu Container-Port 80 weiterleiten

### 4. Nginx/Reverse Proxy prüfen

Falls auf dem Server ein Nginx oder Reverse Proxy läuft:
- Prüfe, ob dieser Port 80 blockiert
- Oder: Konfiguriere Nginx als Reverse Proxy für die App

## 🧪 Tests

### Test 1: Vom Server aus (intern)

Falls du SSH-Zugriff hast:
```bash
# Teste localhost
curl http://localhost/health

# Teste Server-IP
curl http://192.168.8.1/health

# Teste Docker-IP
curl http://172.19.0.2/health
```

### Test 2: Vom Mac aus (extern)

```bash
# Teste die Verbindung
curl http://192.168.8.1/health

# Oder mit verbose für mehr Infos
curl -v http://192.168.8.1/health
```

### Test 3: Port-Scan (falls möglich)

```bash
# Prüfe, ob Port 80 offen ist
nmap -p 80 192.168.8.1

# Oder mit telnet
telnet 192.168.8.1 80
```

## 🔧 Lösungen

### Lösung 1: Firewall öffnen

Falls eine Server-Firewall blockiert:

```bash
# Ubuntu/Debian
sudo ufw allow 80/tcp
sudo ufw reload

# Oder iptables
sudo iptables -A INPUT -p tcp --dport 80 -j ACCEPT
sudo iptables-save
```

### Lösung 2: Nginx als Reverse Proxy

Falls Nginx Port 80 nutzt, konfiguriere ihn als Reverse Proxy:

```nginx
server {
    listen 80;
    server_name 192.168.8.1;

    location / {
        proxy_pass http://172.19.0.2:80;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }
}
```

### Lösung 3: IP-Adresse prüfen

Falls `192.168.8.1` nicht die richtige IP ist:

1. Prüfe die tatsächliche Server-IP:
   ```bash
   # Auf dem Server
   ip addr show
   # Oder
   hostname -I
   ```

2. Teste mit der korrekten IP

### Lösung 4: Portainer Network prüfen

Prüfe, ob der Container im richtigen Netzwerk ist:

1. **Portainer** → **Containers** → `johnnymonkey-app` → **"Inspect"**
2. Scrolle zu **"Network"**
3. Prüfe, ob Container im Netzwerk `johnnymonkey-network` ist
4. Prüfe, ob Port-Mapping korrekt ist

## 🎯 Nächste Schritte

1. ✅ **Port-Mapping prüfen**: `80:80` (bereits korrekt)
2. ⏳ **Firewall prüfen**: Port 80 öffnen
3. ⏳ **IP-Adresse prüfen**: Ist `192.168.8.1` korrekt?
4. ⏳ **Vom Server testen**: `curl http://localhost/health`
5. ⏳ **Vom Mac testen**: `curl http://192.168.8.1/health`

## 📞 Was du mir sagen solltest

Falls es immer noch nicht funktioniert:

1. **Firewall**: Gibt es eine Server-Firewall? Kannst du sie prüfen?
2. **IP-Adresse**: Ist `192.168.8.1` wirklich die Server-IP?
3. **Test vom Server**: Funktioniert `curl http://localhost/health` vom Server aus?
4. **Test vom Mac**: Was passiert, wenn du `curl http://192.168.8.1/health` vom Mac aus ausführst?

Dann kann ich dir gezielt helfen! 🚀


