# 🔍 Port-Mapping prüfen - Container läuft, aber nicht erreichbar

## ✅ Gute Nachricht: Container läuft!

Die Logs zeigen:
- ✅ Container startet erfolgreich
- ✅ Server läuft auf Port 3000 (intern)
- ✅ Datenbank initialisiert
- ✅ Health check verfügbar

## ⚠️ Problem: Port-Mapping prüfen

Der Server läuft **intern** auf Port 3000, aber muss **extern** auf Port 80 erreichbar sein.

## Schritt-für-Schritt Prüfung

### Schritt 1: Port-Mapping in Portainer.io prüfen

1. **Portainer.io öffnen**: `https://<server-ip>:9443`
2. **Containers** → **johnnymonkey-app** klicken
3. **Details** oder **Inspect** Tab öffnen
4. **Published Ports** prüfen:

**✅ RICHTIG:**
```
80/tcp -> 0.0.0.0:80
```
oder
```
0.0.0.0:80->3000/tcp
```

**❌ FALSCH:**
```
3000/tcp -> 0.0.0.0:3000
```
oder
```
(keine Ports)
```

### Schritt 2: Port-Mapping korrigieren (falls falsch)

**Option A: Über Stack-Editor**

1. **Stacks** → **johnnymonkey** → **Editor**
2. Prüfe die `docker-compose.yml`:
   ```yaml
   services:
     johnnymonkey:
       ports:
         - "80:3000"  # Muss genau so sein!
   ```
3. Wenn falsch, korrigiere zu `"80:3000"`
4. **Update the stack** klicken
5. Warte auf Neustart

**Option B: Container neu erstellen**

1. **Containers** → **johnnymonkey-app** → **Stop**
2. **Containers** → **johnnymonkey-app** → **Delete** (⚠️ Volumes bleiben erhalten)
3. **Stacks** → **johnnymonkey** → **Editor**
4. Prüfe Port-Mapping: `"80:3000"`
5. **Update the stack**

### Schritt 3: URL in Safari prüfen

**Verwende diese URLs:**

1. **Mit Port 80 (Standard HTTP):**
   ```
   http://<server-ip>
   ```
   oder
   ```
   http://<server-ip>:80
   ```

2. **Health Check testen:**
   ```
   http://<server-ip>/health
   ```

**❌ NICHT verwenden:**
```
http://<server-ip>:3000  # Falsch! Port 3000 ist nur intern
```

### Schritt 4: Netzwerk-Test

**Falls du SSH-Zugriff hast:**

```bash
# Prüfe, ob Port 80 gemappt ist
docker port johnnymonkey-app

# Sollte zeigen:
# 3000/tcp -> 0.0.0.0:80

# Teste lokal
curl http://localhost
curl http://localhost/health

# Prüfe Container-Status
docker ps | grep johnnymonkey
```

## Häufige Probleme

### Problem 1: Port-Mapping fehlt oder falsch

**Symptom:** Container läuft, aber nicht erreichbar

**Lösung:**
- Prüfe Published Ports in Portainer.io
- Muss `80:3000` sein
- Korrigiere in docker-compose.yml

### Problem 2: Port 80 noch belegt

**Symptom:** Container startet nicht oder Port-Mapping fehlt

**Lösung:**
1. Prüfe, ob nginx-Container ("webserver") noch läuft
2. Stoppe ihn: **Containers** → **webserver** → **Stop**
3. Starte johnnymonkey-app neu

### Problem 3: Falsche IP-Adresse

**Symptom:** Verbindung funktioniert nicht

**Lösung:**
- Verwende die richtige Server-IP
- Nicht `localhost` oder `127.0.0.1` von außen
- Prüfe in Portainer.io: **Home** → Server-IP

### Problem 4: Firewall blockiert

**Symptom:** Verbindung funktioniert lokal, aber nicht von außen

**Lösung:**
- Prüfe Server-Firewall
- Stelle sicher, dass Port 80 offen ist
- Kontaktiere Schulserververwaltung

## Schnelllösung: Port-Mapping korrigieren

### Wenn Port-Mapping falsch ist:

1. **Stacks** → **johnnymonkey** → **Editor**

2. **Prüfe diese Zeilen:**
   ```yaml
   services:
     johnnymonkey:
       ports:
         - "80:3000"  # Host:Container
   ```

3. **Wenn anders, ändere zu:**
   ```yaml
   ports:
     - "80:3000"
   ```

4. **Entferne andere Port-Mappings:**
   ```yaml
   # ENTFERNEN falls vorhanden:
   ports:
     - "3000:3000"  # ❌ Falsch!
   ```

5. **Update the stack**

6. **Warte 1-2 Minuten**

7. **Teste erneut:**
   ```
   http://<server-ip>
   ```

## Prüf-Checkliste

- [ ] Container läuft (Status: Running) ✅ (aus deinen Logs)
- [ ] Port-Mapping: `80:3000`?
- [ ] nginx-Container gestoppt?
- [ ] Richtige Server-IP verwendet?
- [ ] URL ohne Port-Nummer: `http://<server-ip>`?
- [ ] Health Check funktioniert: `http://<server-ip>/health`?

## Nächste Schritte

1. **Prüfe Port-Mapping** in Portainer.io (Details/Inspect)
2. **Korrigiere falls nötig** (Stack-Editor → `"80:3000"`)
3. **Teste Health Check**: `http://<server-ip>/health`
4. **Teste App**: `http://<server-ip>`

---

**Wichtig:** Der Server läuft intern auf Port 3000, aber muss extern über Port 80 erreichbar sein!

