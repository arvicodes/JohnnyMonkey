# Portainer - Web Editor Methode (Einfachste Lösung)

## ✅ Diese Methode funktioniert immer!

Da Portainer Probleme mit dem Repository-Zugriff hat, verwende einfach die **Web Editor** Methode:

## 📋 Schritt-für-Schritt

### Schritt 1: docker-compose.yml öffnen
1. Öffne die Datei `docker-compose.yml` in deinem Projekt
2. **Markiere alles** (Cmd+A)
3. **Kopiere** (Cmd+C)

### Schritt 2: In Portainer
1. Gehe zu: **http://localhost:9000**
2. Links: **"Stacks"**
3. Klicke auf **"Add stack"**

### Schritt 3: Stack konfigurieren
1. **Name**: `johnnymonkey`
2. **Build method**: Wähle **"Web editor"**
3. **WICHTIG**: Stelle sicher, dass du **"Web editor"** gewählt hast (nicht "Repository" oder "Upload")

### Schritt 4: docker-compose.yml einfügen
1. Im Editor: **Füge** den kopierten Inhalt ein (Cmd+V)
2. Prüfe, dass alles da ist

### Schritt 5: WICHTIG - Build-Kontext anpassen

Da Portainer den Build-Kontext nicht hat, musst du das Image **vorher bauen**:

#### Option A: Image vorher bauen (Empfohlen)

1. **Terminal öffnen**:
   ```bash
   cd /Users/verachrist/Documents/MEINE_APP/JohnnyMonkey
   docker build -t johnnymonkey:latest .
   ```

2. **In Portainer**: Ändere die docker-compose.yml:
   - Suche nach: `build:`
   - Ersetze durch: `image: johnnymonkey:latest`
   
   Oder verwende die Datei `docker-compose.portainer-simple.yml` die ich erstellt habe!

#### Option B: Build-Kontext über Volume mounten

Ändere in der docker-compose.yml den build context:
```yaml
build:
  context: /Users/verachrist/Documents/MEINE_APP/JohnnyMonkey
  dockerfile: Dockerfile
```

Aber das funktioniert nur, wenn Portainer Zugriff auf dein lokales Dateisystem hat.

### Schritt 6: Deploy
1. Scrolle nach unten
2. Klicke auf **"Deploy the stack"**
3. Warte, bis Portainer den Stack erstellt hat

## 🎯 Empfohlene Vorgehensweise

**Am einfachsten**: 

1. **Image vorher bauen** (Terminal):
   ```bash
   docker build -t johnnymonkey:latest .
   ```

2. **Vereinfachte docker-compose.yml verwenden**:
   - Öffne `docker-compose.portainer-simple.yml`
   - Kopiere den Inhalt
   - In Portainer einfügen
   - Deploy!

## ✅ Fertig!

Die Container sollten jetzt laufen! 🎉

