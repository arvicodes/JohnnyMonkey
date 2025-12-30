# Verbindungstest - App erreichbar?

## ✅ Server läuft

Die Logs zeigen: `🎯 Server is running on port 80` - der Server läuft!

## 🔍 Jetzt prüfen: Ist die App erreichbar?

### Schritt 1: Port-Mapping prüfen

1. **Portainer** → **Containers** → `johnnymonkey-app` → Klicke darauf
2. Scrolle zu **"Published ports"** oder **"Ports"**
3. **Sollte zeigen**: 
   - `80:80` oder
   - `0.0.0.0:80->80/tcp` oder
   - `80/tcp` mit Host-Port `80`

**Falls nicht vorhanden oder falsch:**
- Port-Mapping fehlt!
- **Stacks** → `johnnymonkey` → **"Editor"**
- Prüfe, ob `ports: - "80:80"` in der docker-compose.yml ist
- **"Update the stack"**

### Schritt 2: Health-Check direkt testen

**Option A: Über Portainer Console (falls verfügbar)**
1. **Containers** → `johnnymonkey-app` → **"Console"** oder **"Exec"**
2. Führe aus:
   ```bash
   curl http://localhost/health
   ```
3. **Sollte zurückgeben**: `{"status":"ok"}` oder ähnlich

**Option B: Vom Server aus (falls SSH-Zugriff)**
```bash
curl http://localhost/health
curl http://192.168.8.1/health
```

### Schritt 3: IP-Adresse prüfen

**Wichtig**: Ist `192.168.8.1` wirklich die Server-IP?

**Prüfen:**
- Portainer läuft auf `https://192.168.8.1:9443`
- Das bedeutet, der Server sollte auf `192.168.8.1` erreichbar sein
- **Aber**: Vielleicht ist die IP anders?

**Alternative IPs testen:**
- `http://localhost` (vom Server aus)
- `http://127.0.0.1` (vom Server aus)
- Die tatsächliche Server-IP (frage deinen Admin)

### Schritt 4: Firewall prüfen

**Server-Firewall** (nicht Sophos, sondern die Server-Firewall):
- Port 80 muss offen sein
- Falls `ufw` oder `iptables` aktiv ist, prüfe die Regeln

**Prüfen (falls SSH-Zugriff):**
```bash
# Ubuntu/Debian
sudo ufw status
sudo ufw allow 80/tcp

# Oder iptables
sudo iptables -L -n | grep 80
```

### Schritt 5: Netzwerk prüfen

**Container-Netzwerk:**
1. **Containers** → `johnnymonkey-app` → **"Inspect"**
2. Scrolle zu **"Network"**
3. Prüfe, ob Container im Netzwerk `johnnymonkey-network` ist

## 🐛 Häufige Probleme

### Problem: Port-Mapping fehlt

**Symptom**: Container läuft, aber Port 80 ist nicht gemappt

**Lösung**:
1. **Stacks** → `johnnymonkey` → **"Editor"**
2. Prüfe `docker-compose.yml`:
   ```yaml
   ports:
     - "80:80"
   ```
3. **"Update the stack"**

### Problem: Falsche IP-Adresse

**Symptom**: `192.168.8.1` funktioniert nicht

**Lösung**:
- Prüfe die tatsächliche Server-IP
- Frage deinen Admin nach der korrekten IP
- Oder: Teste `localhost` vom Server aus

### Problem: Firewall blockiert

**Symptom**: Server läuft, aber keine Verbindung möglich

**Lösung**:
- Server-Firewall prüfen
- Port 80 öffnen
- Oder: Admin fragen

### Problem: Server lauscht nur auf localhost

**Symptom**: `curl localhost` funktioniert, aber nicht von außen

**Lösung**:
- ✅ **Bereits behoben**: Server lauscht jetzt auf `0.0.0.0`
- Falls noch nicht deployed: Stack neu bauen mit Rebuild

## ✅ Test-Checkliste

- [ ] Container läuft (grüner Punkt)
- [ ] Port-Mapping vorhanden: `80:80`
- [ ] Health-Check funktioniert: `curl http://localhost/health`
- [ ] IP-Adresse korrekt: `192.168.8.1`
- [ ] Firewall erlaubt Port 80
- [ ] App erreichbar: `http://192.168.8.1`

## 🎯 Was du mir sagen solltest

Falls es immer noch nicht funktioniert:

1. **Port-Mapping**: Was steht unter "Published ports"?
2. **Health-Check**: Funktioniert `curl http://localhost/health` im Container?
3. **IP-Adresse**: Ist `192.168.8.1` wirklich die Server-IP?
4. **Firewall**: Gibt es eine Server-Firewall, die blockiert?

Dann kann ich dir gezielt helfen! 🚀


