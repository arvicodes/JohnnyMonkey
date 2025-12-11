# Portainer - Container über Web-Oberfläche einrichten

## 🎯 Ziel: Container komplett in Portainer erstellen

Du möchtest alles über die Portainer Web-Oberfläche machen - das geht! Hier ist die Schritt-für-Schritt-Anleitung:

## 📋 Schritt 1: docker-compose.yml Datei öffnen

1. Öffne die Datei `docker-compose.yml` in deinem Projekt
2. **Kopiere den gesamten Inhalt** (Cmd+A, dann Cmd+C)

## 🌐 Schritt 2: Portainer öffnen

1. Gehe zu: **http://localhost:9000**
2. Logge dich ein (falls nötig)

## 📦 Schritt 3: Stack erstellen

1. **Links im Menü**: Klicke auf **"Stacks"**
2. Du siehst eine Liste aller Stacks (wahrscheinlich noch leer)
3. Klicke oben rechts auf **"Add stack"** oder **"Add"**

## ✏️ Schritt 4: Stack konfigurieren

### 4.1 Name vergeben
- **Name**: `johnnymonkey` (oder wie du willst)
- **Description**: Optional, z.B. "JohnnyMonkey Learning Platform"

### 4.2 Build-Methode wählen
- **Build method**: Wähle **"Web editor"** (nicht "Upload" oder "Repository")
- Das öffnet einen Text-Editor direkt in Portainer

### 4.3 docker-compose.yml einfügen
1. **Öffne** deine `docker-compose.yml` Datei in einem Text-Editor
2. **Markiere alles** (Cmd+A / Ctrl+A)
3. **Kopiere** (Cmd+C / Ctrl+C)
4. **Füge** den Inhalt in den Portainer Web-Editor ein (Cmd+V / Ctrl+V)

### 4.4 Prüfen
- Stelle sicher, dass der gesamte Inhalt da ist
- Prüfe, dass beide Services drin sind:
  - `johnnymonkey` (deine App)
  - `portainer` (Portainer selbst)

## 🚀 Schritt 5: Stack deployen

1. Scrolle nach unten
2. Klicke auf **"Deploy the stack"** (grüner Button)
3. Warte, bis Portainer den Stack erstellt hat
4. Du siehst eine Erfolgsmeldung

## ✅ Schritt 6: Container prüfen

1. **Links im Menü**: Klicke auf **"Containers"**
2. Du solltest jetzt sehen:
   - `johnnymonkey-app` (oder ähnlicher Name)
   - `portainer` (falls noch nicht vorhanden)

3. **Status prüfen**:
   - Grüner Punkt = läuft ✅
   - Roter Punkt = gestoppt ❌

## 🔧 Schritt 7: Container starten (falls nötig)

Falls ein Container gestoppt ist:

1. **Containers** → Klicke auf den Container-Namen
2. Oder: Drei Punkte (⋮) rechts → **"Start"**

## 🌐 Schritt 8: App testen

1. **Containers** → `johnnymonkey-app` → Klicke darauf
2. Scrolle zu **"Published ports"**
3. Du siehst: `3001:3001`
4. Öffne im Browser: **http://localhost:3001**

Die App sollte jetzt laufen! 🎉

## 📊 Schritt 9: Stack verwalten

### Stack-Übersicht
- **Stacks** → `johnnymonkey` → Klicke darauf
- Du siehst:
  - Alle Services des Stacks
  - Status jedes Containers
  - Logs
  - Environment-Variablen

### Stack neu starten
1. **Stacks** → `johnnymonkey`
2. Klicke auf **"Editor"** Tab
3. Ändere die docker-compose.yml falls nötig
4. Klicke auf **"Update the stack"**

### Stack stoppen
1. **Stacks** → `johnnymonkey`
2. Klicke auf **"Stop"** Button
3. Alle Container werden gestoppt

### Stack löschen
1. **Stacks** → `johnnymonkey`
2. Klicke auf **"Remove"** (⚠️ Vorsicht!)
3. Bestätige die Löschung

## 🔄 Schritt 10: Code-Änderungen deployen

Wenn du Code geändert hast:

### Option A: Über Portainer (ohne Rebuild)
1. **Stacks** → `johnnymonkey` → **"Editor"**
2. Ändere die docker-compose.yml falls nötig
3. **"Update the stack"**

### Option B: Mit Rebuild (wenn Code geändert)
1. **Stacks** → `johnnymonkey` → **"Editor"**
2. Ändere die docker-compose.yml falls nötig
3. **"Rebuild"** aktivieren (Checkbox)
4. **"Update the stack"**

⚠️ **WICHTIG**: Für Code-Änderungen musst du das Image neu bauen. Das geht am besten über:
- Terminal: `docker compose build` dann in Portainer updaten
- Oder: Portainer → Images → Build Image (komplizierter)

## 🐛 Troubleshooting

### Problem: "Failed to deploy stack"
- **Lösung**: Prüfe die docker-compose.yml auf Syntax-Fehler
- Klicke auf **"Logs"** Tab um Fehlermeldungen zu sehen

### Problem: Container startet nicht
1. **Containers** → Container-Name → **"Logs"**
2. Lies die Fehlermeldung
3. Oft hilft: Container → **"Restart"**

### Problem: Port bereits belegt
1. **Containers** → Prüfe, ob ein anderer Container Port 3001 nutzt
2. **Lösung**: Anderen Container stoppen oder Port ändern

### Problem: Image nicht gefunden
- **Lösung**: Stack → **"Editor"** → Aktiviere **"Always pull the image"**
- Oder: Terminal → `docker compose build` ausführen

## 📝 Wichtige Hinweise

### Volumes
- Die Volumes werden automatisch erstellt
- Daten bleiben erhalten, auch wenn Container gestoppt wird
- Backup: **Volumes** → Volume-Name → **"Backup"**

### Netzwerke
- Das Netzwerk `johnnymonkey-network` wird automatisch erstellt
- Alle Container können sich darüber erreichen

### Labels
- Die Labels helfen bei der Organisation
- Du siehst sie unter: Container → **"Labels"** Tab

## ✅ Checkliste

- [ ] docker-compose.yml kopiert
- [ ] Portainer geöffnet (http://localhost:9000)
- [ ] Stacks → Add stack geklickt
- [ ] Name vergeben: `johnnymonkey`
- [ ] Build method: "Web editor" gewählt
- [ ] docker-compose.yml eingefügt
- [ ] "Deploy the stack" geklickt
- [ ] Container in "Containers" sichtbar
- [ ] Container gestartet (falls nötig)
- [ ] App getestet (http://localhost:3001)

## 🎓 Nächste Schritte

Jetzt kannst du:
- ✅ Container komplett über Portainer verwalten
- ✅ Logs direkt in Portainer ansehen
- ✅ Container starten/stoppen/neustarten
- ✅ Volumes verwalten
- ✅ Alles über die Web-Oberfläche machen!

Viel Erfolg! 🚀

