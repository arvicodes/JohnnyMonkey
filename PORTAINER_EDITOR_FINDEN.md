# Portainer Editor finden - Schritt für Schritt

## 🎯 Ziel: docker-compose.yml in Portainer bearbeiten

## 📋 Schritt-für-Schritt Anleitung

### Schritt 1: Portainer öffnen
1. Öffne deinen Browser
2. Gehe zu: **http://localhost:9000**
3. Logge dich ein (falls nötig)

### Schritt 2: Zu Stacks navigieren
1. **Links im Menü** siehst du verschiedene Optionen
2. Suche nach **"Stacks"** (oder "Stapel" auf Deutsch)
3. **Klicke** auf **"Stacks"**

### Schritt 3: Deinen Stack finden
1. Du siehst jetzt eine Liste aller Stacks
2. Suche nach **"johnnymonkey"** (oder wie du den Stack genannt hast)
3. **Klicke** auf den Namen des Stacks

### Schritt 4: Editor öffnen
Nachdem du auf den Stack geklickt hast, siehst du mehrere **Tabs** oben:
- **Overview** (Übersicht)
- **Containers** (Container)
- **Logs** (Protokolle)
- **Editor** ← **HIER KLICKEN!**

**Klicke auf den Tab "Editor"**

### Schritt 5: docker-compose.yml bearbeiten
1. Du siehst jetzt einen **großen Text-Editor**
2. Der aktuelle Inhalt der docker-compose.yml ist dort
3. **Markiere alles** (Cmd+A / Ctrl+A)
4. **Lösche** den Inhalt (Delete-Taste)

### Schritt 6: Neue docker-compose.yml einfügen
1. **Öffne** die Datei `docker-compose.yml` in deinem Projekt
2. **Markiere alles** (Cmd+A / Ctrl+A)
3. **Kopiere** (Cmd+C / Ctrl+C)
4. **Gehe zurück** zu Portainer (im Browser)
5. **Klicke** in den Editor
6. **Füge** ein (Cmd+V / Ctrl+V)

### Schritt 7: Stack aktualisieren
1. **Scrolle nach unten** im Editor
2. Du siehst mehrere Optionen:
   - **"Rebuild"** (Checkbox) ← **AKTIVIERE DIESE!** ✅
   - **"Pull latest image"** (optional)
3. **Aktiviere** die Checkbox **"Rebuild"**
4. **Klicke** auf den grünen Button **"Update the stack"** (oder "Stack aktualisieren")

### Schritt 8: Warten
1. Portainer baut jetzt das Image neu
2. Das kann einige Minuten dauern
3. Du siehst den Fortschritt in den Logs

## 🖼️ Visuelle Beschreibung

```
Portainer Oberfläche:

┌─────────────────────────────────────┐
│  [Stacks] [Containers] [Images] ...│  ← Links im Menü
├─────────────────────────────────────┤
│                                     │
│  Stacks                             │
│  ┌─────────────────────────────┐   │
│  │ johnnymonkey                │   │  ← Klicke hier
│  └─────────────────────────────┘   │
│                                     │
└─────────────────────────────────────┘

Nach dem Klick:

┌─────────────────────────────────────┐
│ [Overview] [Containers] [Editor] ←  │  ← Klicke auf "Editor"
├─────────────────────────────────────┤
│                                     │
│  ┌─────────────────────────────┐   │
│  │ version: '3.8'              │   │
│  │ services:                   │   │
│  │   johnnymonkey:             │   │  ← Hier ist die docker-compose.yml
│  │     ...                     │   │
│  └─────────────────────────────┘   │
│                                     │
│  ☑ Rebuild                         │  ← Aktiviere diese Checkbox
│  [Update the stack]                │  ← Klicke hier
└─────────────────────────────────────┘
```

## 🔍 Falls du "Stacks" nicht findest

### Alternative Navigation:
1. **Dashboard** → Oben siehst du Statistiken
2. Suche nach **"Stacks"** in den Zahlen/Boxen
3. **Klicke** darauf

### Oder:
1. **Links im Menü** → Suche nach einem **Stapel-Symbol** oder **"Stacks"**
2. Falls auf Deutsch: Suche nach **"Stapel"**

## ❓ Falls es immer noch nicht geht

### Option A: Stack neu erstellen
1. **Stacks** → **"Add stack"** (oder "Stack hinzufügen")
2. **Name**: `johnnymonkey`
3. **Build method**: **"Web editor"**
4. **Füge** die docker-compose.yml ein
5. **"Deploy the stack"**

### Option B: Über Terminal
Falls Portainer Probleme macht, kannst du auch im Terminal arbeiten:

```bash
cd /Users/verachrist/Documents/MEINE_APP/JohnnyMonkey
docker compose up -d --build
```

## ✅ Checkliste

- [ ] Portainer geöffnet (http://localhost:9000)
- [ ] Links: "Stacks" gefunden
- [ ] Stack "johnnymonkey" gefunden
- [ ] Auf Stack geklickt
- [ ] Tab "Editor" gefunden und geklickt
- [ ] Alten Inhalt gelöscht
- [ ] Neue docker-compose.yml eingefügt
- [ ] "Rebuild" aktiviert
- [ ] "Update the stack" geklickt

## 💡 Tipp

Falls du den Editor nicht findest:
- Der Editor-Tab ist **oben** im Stack-Detail-Bildschirm
- Er ist neben "Overview", "Containers", "Logs"
- Falls du nur einen Tab siehst, bist du vielleicht im falschen Bereich

Viel Erfolg! 🚀

