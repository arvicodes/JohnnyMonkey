# Portainer Container-Konflikt lösen

## ❌ Problem

Fehler: `Conflict. The container name "/portainer" is already in use`

**Ursache**: Portainer läuft bereits als Container, und die docker-compose.yml versucht, einen weiteren Portainer-Container zu erstellen.

## ✅ Lösung

Portainer wurde aus der docker-compose.yml entfernt, da es bereits läuft.

### Warum?

- Portainer läuft bereits separat
- Es ist nicht nötig, Portainer über docker-compose zu verwalten
- Portainer kann Portainer selbst verwalten (wenn es läuft)

## 📋 Was du jetzt tun musst

### Option 1: Aktualisierte docker-compose.yml verwenden (Empfohlen)

Die `docker-compose.yml` wurde aktualisiert und enthält jetzt **nur noch** die JohnnyMonkey App.

1. **In Portainer**: Stacks → Dein Stack → **"Editor"**
2. **Lösche** den alten Inhalt
3. **Kopiere** den Inhalt der aktualisierten `docker-compose.yml`
4. **Füge** ihn ein
5. **"Update the stack"** klicken

### Option 2: Stack neu erstellen

1. **Stacks** → Dein Stack → **"Remove"**
2. **"Add stack"** → Name: `johnnymonkey`
3. **Build method**: "Repository"
4. **Repository URL**: `https://github.com/arvicodes/JohnnyMonkey.git`
5. **Branch**: `main`
6. **Compose path**: `docker-compose.yml`
7. **"Deploy the stack"**

## 🔍 Portainer-Status prüfen

Portainer sollte weiterhin laufen:

1. **Containers** → Suche nach `portainer`
2. Sollte einen **grünen Punkt** haben (läuft)
3. Falls nicht: Container → `portainer` → **"Start"**

## 💡 Wichtig

- **Portainer** läuft separat (nicht über docker-compose)
- **JohnnyMonkey** läuft über docker-compose Stack
- Beide können parallel laufen
- Portainer kann die JohnnyMonkey Container verwalten

## ✅ Nach dem Update

Nach dem Update solltest du sehen:

- **Containers** → `johnnymonkey-app` (läuft)
- **Containers** → `portainer` (läuft separat)
- **Stacks** → `johnnymonkey` (aktiv)

## 🎯 Zusammenfassung

**Problem**: Portainer-Container existiert bereits
**Lösung**: Portainer aus docker-compose.yml entfernt
**Ergebnis**: Nur JohnnyMonkey wird über Stack verwaltet, Portainer läuft separat

Viel Erfolg! 🚀

