# Portainer - Erste Schritte Anleitung

## 🎯 Schritt 1: Portainer starten

Öffne ein Terminal und führe aus:

```bash
cd /Users/verachrist/Documents/MEINE_APP/JohnnyMonkey
docker-compose up -d portainer
```

Warte ein paar Sekunden, bis der Container gestartet ist.

## 🌐 Schritt 2: Portainer im Browser öffnen

1. Öffne deinen Browser (Chrome, Firefox, Safari, etc.)
2. Gehe zu: **http://localhost:9000**
3. Du siehst jetzt die Portainer-Anmeldeseite

## 🔐 Schritt 3: Admin-Konto erstellen (nur beim ersten Start)

Beim ersten Besuch wirst du aufgefordert, ein Admin-Passwort zu erstellen:

1. **Username**: Lass es auf "admin" oder wähle einen eigenen Namen
2. **Password**: Wähle ein sicheres Passwort (mindestens 12 Zeichen)
   - Beispiel: `MeinSicheresPasswort123!`
3. **Confirm Password**: Passwort wiederholen
4. Klicke auf **"Create the user"**

⚠️ **WICHTIG**: Notiere dir das Passwort sicher! Du brauchst es bei jedem Login.

## 🐳 Schritt 4: Docker-Umgebung auswählen

Nach dem Login siehst du eine Auswahl:

1. Klicke auf **"Docker"** (nicht "Kubernetes")
2. Portainer verbindet sich jetzt mit deinem lokalen Docker

## 📊 Schritt 5: Dashboard erkunden

Du siehst jetzt das **Dashboard** mit:

- **Containers**: Liste aller Container
- **Images**: Alle Docker-Images
- **Volumes**: Persistente Speicher
- **Networks**: Netzwerke

## 🚀 Schritt 6: JohnnyMonkey App starten

### Option A: Über Portainer (empfohlen)

1. Klicke links im Menü auf **"Containers"**
2. Du siehst eine Liste aller Container
3. Suche nach **"johnnymonkey-app"** (oder "johnnymonkey")
4. Falls der Container gestoppt ist:
   - Klicke auf den Container-Namen
   - Oder klicke auf die **drei Punkte (⋮)** rechts
   - Wähle **"Start"**

### Option B: Über Terminal

```bash
docker-compose up -d johnnymonkey
```

Dann in Portainer aktualisieren (F5 oder Reload-Button).

## ✅ Schritt 7: Container-Status prüfen

In der Container-Liste siehst du jetzt:

- **Grüner Punkt** = Container läuft ✅
- **Roter Punkt** = Container gestoppt ❌
- **Gelber Punkt** = Container startet gerade ⏳

**johnnymonkey-app** sollte einen grünen Punkt haben.

## 🌐 Schritt 8: App im Browser öffnen

1. Klicke auf **"johnnymonkey-app"** in der Liste
2. Du siehst jetzt die Container-Details
3. Scrolle nach unten zu **"Published ports"**
4. Du siehst: `3001:3001`
5. Öffne in deinem Browser: **http://localhost:3001**

Die JohnnyMonkey App sollte jetzt laufen! 🎉

## 📋 Schritt 9: Nützliche Features kennenlernen

### Logs ansehen

1. Klicke auf **"johnnymonkey-app"**
2. Klicke oben auf den Tab **"Logs"**
3. Du siehst jetzt alle Logs in Echtzeit
4. Nützlich für Debugging!

### Container neu starten

1. Klicke auf **"johnnymonkey-app"**
2. Klicke oben rechts auf **"Restart"**
3. Oder: Container-Liste → drei Punkte → **"Restart"**

### Container stoppen

1. Container-Liste → drei Punkte → **"Stop"**
2. Oder: Container-Details → **"Stop"** Button oben

### Console (Shell-Zugriff)

1. Klicke auf **"johnnymonkey-app"**
2. Klicke oben auf **"Console"**
3. Wähle **"sh"** oder **"bash"**
4. Klicke auf **"Connect"**
5. Du hast jetzt eine Shell im Container!

### Stats (CPU, RAM, etc.)

1. Klicke auf **"johnnymonkey-app"**
2. Klicke oben auf **"Stats"**
3. Du siehst:
   - CPU-Nutzung
   - RAM-Verbrauch
   - Netzwerk-Traffic
   - In Echtzeit aktualisiert

## 🔍 Schritt 10: Volumes verwalten

### Datenbank-Backup erstellen

1. Klicke links auf **"Volumes"**
2. Suche nach **"johnnymonkey_database"**
3. Klicke auf den Volume-Namen
4. Klicke auf **"Backup"**
5. Die Backup-Datei wird heruntergeladen

### Volume-Inhalt ansehen

1. Volumes → **"johnnymonkey_database"**
2. Klicke auf **"Inspect"**
3. Du siehst Details über den Volume

## 🖼️ Schritt 11: Images verwalten

1. Klicke links auf **"Images"**
2. Du siehst alle Docker-Images
3. **johnnymonkey** sollte dort sein (lokal gebaut)
4. **portainer/portainer-ce** sollte auch da sein

### Image neu bauen

Wenn du Code-Änderungen gemacht hast:

```bash
# Im Terminal
docker-compose build johnnymonkey
docker-compose up -d johnnymonkey
```

Dann in Portainer: Images → Refresh (F5)

## 📊 Schritt 12: Dashboard-Übersicht

Das Dashboard zeigt dir auf einen Blick:

- **Running Containers**: Anzahl laufender Container
- **Stopped Containers**: Anzahl gestoppter Container
- **Total Images**: Anzahl Images
- **Total Volumes**: Anzahl Volumes
- **Total Networks**: Anzahl Netzwerke

## 🎨 Schritt 13: Container-Labels sehen

1. Klicke auf **"johnnymonkey-app"**
2. Scrolle zu **"Labels"**
3. Du siehst die Labels, die wir gesetzt haben:
   - `com.portainer.io.name=JohnnyMonkey`
   - `com.portainer.io.description=Educational Learning Platform`
   - `com.portainer.io.category=Application`

Diese helfen bei der Organisation!

## 🔄 Schritt 14: Regelmäßige Aufgaben

### App aktualisieren (nach Code-Änderungen)

```bash
# 1. Code-Änderungen machen
# 2. Im Terminal:
docker-compose build johnnymonkey
docker-compose up -d johnnymonkey

# 3. In Portainer: Logs prüfen ob alles läuft
```

### Logs regelmäßig prüfen

1. Containers → **johnnymonkey-app** → **Logs**
2. Prüfe auf Fehler (rot markiert)
3. Alles grün = alles OK ✅

### Backup regelmäßig erstellen

1. Volumes → **johnnymonkey_database** → **Backup**
2. Am besten täglich oder wöchentlich
3. Backup-Dateien sicher aufbewahren

## 🆘 Hilfe bei Problemen

### Container startet nicht

1. Containers → **johnnymonkey-app** → **Logs**
2. Lies die Fehlermeldung
3. Oft hilft: Container → **Restart**

### Port bereits belegt

1. Prüfe in Portainer: Containers → suche nach anderen Containers auf Port 3001
2. Oder im Terminal: `lsof -i :3001`
3. Stoppe den anderen Container oder ändere Port in docker-compose.yml

### Datenbank-Probleme

1. Container → **johnnymonkey-app** → **Console**
2. Verbinde mit Shell
3. Führe aus:
```bash
cd /app/server
npx prisma studio
```
4. Prisma Studio öffnet sich (falls Port verfügbar)

## ✅ Checkliste - Hast du alles gemacht?

- [ ] Portainer gestartet (`docker-compose up -d portainer`)
- [ ] Portainer geöffnet (http://localhost:9000)
- [ ] Admin-Konto erstellt
- [ ] Docker-Umgebung ausgewählt
- [ ] JohnnyMonkey App gestartet
- [ ] App im Browser geöffnet (http://localhost:3001)
- [ ] Logs angesehen
- [ ] Stats angesehen
- [ ] Backup erstellt

## 🎓 Nächste Schritte

Jetzt kannst du:

1. **Container überwachen**: Immer im Blick haben, ob alles läuft
2. **Logs analysieren**: Probleme schnell finden
3. **Backups erstellen**: Daten sicher aufbewahren
4. **Updates durchführen**: App einfach aktualisieren

Viel Erfolg mit Portainer! 🚀

