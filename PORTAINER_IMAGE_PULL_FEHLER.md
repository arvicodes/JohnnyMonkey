# Portainer Image Pull Fehler beheben

## ❌ Problem

Fehler: `Pull image error docker.io/library/johnnymonkey-johnnymonkey:latest: Error response from daemon: pull access denied`

**Ursache**: Portainer versucht, ein Image zu pullen, das nicht existiert, statt es zu bauen.

## ✅ Lösung 1: docker-compose.yml verbessert (bereits gemacht)

Die `docker-compose.yml` wurde aktualisiert mit:
- `image: johnnymonkey:latest` - gibt dem Image einen Namen
- `pull_policy: build` - zwingt Portainer, das Image zu bauen statt zu pullen

## ✅ Lösung 2: In Portainer Stack aktualisieren

### Schritt 1: Stack Editor öffnen
1. **Stacks** → Dein Stack (`johnnymonkey`) → **"Editor"**

### Schritt 2: docker-compose.yml aktualisieren
1. **Lösche** den alten Inhalt
2. **Kopiere** den Inhalt der aktualisierten `docker-compose.yml`
3. **Füge** ihn ein
4. **WICHTIG**: Aktiviere **"Rebuild"** (Checkbox)
5. **"Update the stack"** klicken

Portainer sollte jetzt das Image **bauen** statt zu pullen.

## ✅ Lösung 3: Image vorher bauen (Alternative)

Falls Lösung 2 nicht funktioniert:

### Schritt 1: Image lokal bauen
```bash
cd /Users/verachrist/Documents/MEINE_APP/JohnnyMonkey
docker build -t johnnymonkey:latest .
```

### Schritt 2: Vereinfachte docker-compose.yml verwenden
1. **Stacks** → Dein Stack → **"Editor"**
2. Verwende den Inhalt von `docker-compose.portainer-simple.yml`
3. Diese Version verwendet `image:` statt `build:`
4. **"Update the stack"**

## 🔍 Warum passiert das?

Portainer versucht manchmal, Images zu pullen statt sie zu bauen, wenn:
- Der Build-Kontext nicht verfügbar ist
- Die Repository-Methode verwendet wird, aber der Build fehlschlägt
- `pull_policy` nicht gesetzt ist

## 📋 Checkliste

- [ ] docker-compose.yml aktualisiert (mit `pull_policy: build`)
- [ ] Stack in Portainer aktualisiert
- [ ] "Rebuild" aktiviert beim Update
- [ ] Build-Logs geprüft (falls weiterhin Fehler)

## 🎯 Empfohlene Vorgehensweise

1. **Stack Editor** öffnen
2. **docker-compose.yml** aktualisieren (mit `pull_policy: build`)
3. **"Rebuild"** aktivieren
4. **"Update the stack"** klicken
5. **Build-Logs** prüfen, ob der Build erfolgreich ist

## 💡 Tipp

Wenn der Build weiterhin fehlschlägt:
- Prüfe die **Build-Logs** in Portainer
- Stelle sicher, dass alle Dateien im Repository sind
- Prüfe, ob der Dockerfile korrekt ist

Viel Erfolg! 🚀

