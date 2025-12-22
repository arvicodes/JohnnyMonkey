# Port 80 bereits belegt - Lösung

## 🚨 Problem

```
Error: Bind for 0.0.0.0:80 failed: port is already allocated
```

Port 80 ist bereits von einem anderen Container oder Prozess belegt.

## 🔍 Lösung: Port 80 belegenden Container finden

### Schritt 1: In Portainer prüfen

1. **Portainer** → **Containers**
2. Schaue in der Liste nach Containers, die Port 80 verwenden
3. Du siehst in der Spalte **"Published ports"** z.B. `80:80` oder `80:xxx`

### Schritt 2: Container stoppen

**Option A: Über Portainer**
1. **Containers** → Finde den Container, der Port 80 nutzt
2. Klicke auf den Container-Namen
3. Klicke auf **"Stop"** Button
4. Oder: Drei Punkte (⋮) → **"Stop"**

**Option B: Container löschen (wenn nicht mehr benötigt)**
1. **Containers** → Finde den Container
2. Drei Punkte (⋮) → **"Remove"**
3. ⚠️ **Vorsicht**: Stelle sicher, dass du den Container nicht mehr brauchst!

### Schritt 3: JohnnyMonkey Stack erneut deployen

1. **Stacks** → `johnnymonkey` → Klicke darauf
2. Klicke auf **"Editor"** Tab
3. Klicke auf **"Update the stack"**
4. Oder: Lösche den Stack und erstelle ihn neu

## 🔧 Alternative: Anderen Port verwenden (nicht empfohlen)

⚠️ **Warnung**: Wenn du einen anderen Port verwendest, funktioniert die Sophos Firewall nicht automatisch!

Falls du trotzdem einen anderen Port verwenden musst:

1. **Stacks** → `johnnymonkey` → **"Editor"**
2. Ändere in der `docker-compose.yml`:
   ```yaml
   ports:
     - "8080:80"  # Statt "80:80"
   ```
3. **"Update the stack"**
4. App ist dann erreichbar über: `http://192.168.8.1:8080`
5. **Sophos Firewall** muss dann manuell auf Port 8080 konfiguriert werden

## 🔍 Erweiterte Lösung: Über Terminal prüfen

Falls du SSH-Zugriff auf den Server hast:

```bash
# Prüfe, welcher Prozess Port 80 nutzt
sudo lsof -i :80

# Oder mit netstat
sudo netstat -tulpn | grep :80

# Docker Container prüfen
docker ps | grep :80
```

## 📋 Häufige Ursachen

1. **Nginx-Container** läuft bereits auf Port 80
2. **Apache-Container** läuft bereits auf Port 80
3. **Anderer Webserver** nutzt Port 80
4. **Vorheriger JohnnyMonkey-Container** läuft noch

## ✅ Checkliste

- [ ] Portainer → Containers geöffnet
- [ ] Container gefunden, der Port 80 nutzt
- [ ] Container gestoppt (oder gelöscht)
- [ ] JohnnyMonkey Stack erneut deployed
- [ ] Container läuft jetzt erfolgreich
- [ ] App erreichbar über http://192.168.8.1

## 🎯 Empfohlene Lösung

**Am besten**: Den anderen Container stoppen, der Port 80 nutzt, damit JohnnyMonkey Port 80 verwenden kann. So funktioniert die Sophos Firewall automatisch.

Falls der andere Container wichtig ist:
- Prüfe, ob er auf einen anderen Port verschoben werden kann
- Oder: Nutze einen Reverse Proxy (Nginx) vor beiden Containers

Viel Erfolg! 🚀

