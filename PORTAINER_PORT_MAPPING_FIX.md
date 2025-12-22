# Portainer - Port-Mapping Problem lösen

## ✅ Gute Nachricht!

Die App läuft perfekt im Container! Der `curl`-Test funktioniert.

## ❌ Problem

Das Port-Mapping vom Container zum Host funktioniert nicht. Der Port wird nicht richtig weitergeleitet.

## 🔧 Lösung 1: Port prüfen (Host)

Prüfe, ob Port 3001 auf dem Host belegt ist:

```bash
lsof -i :3001
```

Falls Port belegt:
- Anderen Prozess stoppen
- Oder Port ändern

## 🔧 Lösung 2: Container neu erstellen

Falls Port-Mapping falsch ist:

1. **Containers** → `johnnymonkey-app` → **"Remove"**
2. **Stacks** → `johnnymonkey` → **"Editor"**
3. **Prüfe** Port-Konfiguration:
   ```yaml
   ports:
     - "3001:3001"
   ```
4. **"Update the stack"** (mit Rebuild aktiviert)

## 🔧 Lösung 3: Anderen Port verwenden

Falls Port 3001 Probleme macht:

1. **Stacks** → `johnnymonkey` → **"Editor"**
2. **Ändere** Port:
   ```yaml
   ports:
     - "3002:3001"  # Host-Port ändern
   ```
3. **"Update the stack"**
4. **Versuche**: `http://localhost:3002`

## 🔧 Lösung 4: Port-Mapping explizit setzen

Manchmal hilft es, das Port-Mapping explizit zu setzen:

```yaml
ports:
  - "127.0.0.1:3001:3001"  # Nur localhost, nicht 0.0.0.0
```

## 🔧 Lösung 5: Docker Desktop prüfen

Falls du Docker Desktop verwendest:

1. **Docker Desktop** öffnen
2. **Settings** → **Resources** → **Network**
3. Prüfe Netzwerk-Einstellungen
4. **Apply & Restart**

## 📋 Checkliste

- [ ] Port 3001 auf Host frei?
- [ ] Port-Mapping: 3001:3001?
- [ ] Container neu erstellt?
- [ ] Anderen Port versucht?
- [ ] Docker Desktop neu gestartet?

## 🎯 Empfohlene Vorgehensweise

1. **Zuerst**: Port 3001 prüfen (lsof)
2. **Dann**: Container neu erstellen
3. **Falls nicht**: Anderen Port verwenden (3002)

## 💡 Warum funktioniert curl im Container?

- Die App läuft **im Container** auf Port 3001 ✅
- Aber der Port wird **nicht zum Host** weitergeleitet ❌
- Das ist ein Docker Port-Mapping Problem

Viel Erfolg! 🚀

