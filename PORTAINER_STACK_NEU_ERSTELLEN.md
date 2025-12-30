# Portainer Stack komplett neu erstellen

## 🎯 Ziel: Stack löschen und neu erstellen

## 📋 Schritt-für-Schritt Anleitung

### Schritt 1: Portainer öffnen
1. Browser: **http://localhost:9000**
2. Logge dich ein (falls nötig)

### Schritt 2: Alten Stack löschen
1. **Links im Menü**: Klicke auf **"Stacks"**
2. Du siehst eine Liste aller Stacks
3. Suche nach **"johnnymonkey"** (oder wie du ihn genannt hast)
4. **Rechts** neben dem Stack-Namen siehst du:
   - Drei Punkte (⋮) oder
   - Ein **"Remove"** Button oder
   - Ein **"Delete"** Button
5. **Klicke** darauf
6. **Bestätige** die Löschung (falls gefragt)

⚠️ **WICHTIG**: Die Container werden gestoppt, aber die **Volumes bleiben erhalten** (Datenbank bleibt!)

### Schritt 3: docker-compose.yml kopieren
1. **Öffne** die Datei `docker-compose.yml` in deinem Projekt
2. **Markiere alles** (Cmd+A / Ctrl+A)
3. **Kopiere** (Cmd+C / Ctrl+C)

### Schritt 4: Neuen Stack erstellen
1. In Portainer: **"Stacks"** → **"Add stack"** (oder "Stack hinzufügen")
2. Du siehst jetzt ein Formular

### Schritt 5: Stack konfigurieren

#### Option A: Repository-Methode (Empfohlen)
1. **Name**: `johnnymonkey`
2. **Build method**: Wähle **"Repository"**
3. **Repository URL**: `https://github.com/arvicodes/JohnnyMonkey.git`
4. **Branch**: `main`
5. **Compose path**: `docker-compose.yml`
6. **"Deploy the stack"** klicken

#### Option B: Web Editor-Methode
1. **Name**: `johnnymonkey`
2. **Build method**: Wähle **"Web editor"**
3. **Im Editor**: Füge die kopierte docker-compose.yml ein (Cmd+V)
4. **"Deploy the stack"** klicken

### Schritt 6: Warten
1. Portainer baut jetzt das Image
2. Das kann **5-10 Minuten** dauern
3. Du siehst den Fortschritt

### Schritt 7: Prüfen
1. **Stacks** → `johnnymonkey` sollte jetzt da sein
2. **Containers** → `johnnymonkey-app` sollte laufen (grüner Punkt)
3. Browser: **http://localhost:3001** → App sollte laufen

## 🔄 Falls der alte Stack nicht gelöscht werden kann

### Container manuell stoppen:
1. **Containers** → Suche nach `johnnymonkey-app`
2. **Drei Punkte** (⋮) → **"Stop"**
3. **Drei Punkte** (⋮) → **"Remove"**

### Dann Stack löschen:
1. **Stacks** → `johnnymonkey` → **"Remove"**

## ✅ Checkliste

- [ ] Portainer geöffnet
- [ ] Alten Stack gefunden
- [ ] Alten Stack gelöscht
- [ ] docker-compose.yml kopiert
- [ ] "Add stack" geklickt
- [ ] Name vergeben: `johnnymonkey`
- [ ] Build method gewählt (Repository oder Web editor)
- [ ] docker-compose.yml eingefügt (bei Web editor)
- [ ] "Deploy the stack" geklickt
- [ ] Warten auf Build
- [ ] Container läuft
- [ ] App getestet (http://localhost:3001)

## 🎯 Empfohlene Methode

**Repository-Methode** ist am einfachsten:
- Portainer lädt den Code automatisch
- Baut das Image automatisch
- Kein manuelles Kopieren nötig

## 💡 Tipp

Falls der Build fehlschlägt:
- Prüfe die **Build-Logs** in Portainer
- Stelle sicher, dass alle Dateien im GitHub Repository sind
- Prüfe, ob der Branch `main` aktuell ist

Viel Erfolg! 🚀


