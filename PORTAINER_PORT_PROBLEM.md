# Portainer - Port-Verbindungsproblem lösen

## ❌ Problem

Sowohl `localhost:3001` als auch `127.0.0.1:3001` funktionieren nicht - Verbindung wird abgelehnt.

## 🔍 Schritt 1: Container-Status prüfen

### In Portainer:
1. **Containers** → `johnnymonkey-app`
2. **Prüfe**:
   - **Status**: Sollte "Running" sein
   - **Health**: Sollte "Healthy" sein
   - **Uptime**: Wie lange läuft der Container?

### Falls Container gestoppt ist:
- **"Start"** klicken
- Warte 30 Sekunden
- Versuche es erneut

## 🔍 Schritt 2: Port-Mapping prüfen

### In Portainer:
1. **Containers** → `johnnymonkey-app` → **"Inspect"** oder Details
2. Scrolle zu **"Network"** oder **"Ports"**
3. **Prüfe**: Ist `3001:3001` richtig gemappt?

### Sollte sein:
- **Host Port**: `3001`
- **Container Port**: `3001`
- **Protocol**: `tcp`

## 🔍 Schritt 3: Im Container testen

### Console öffnen:
1. **Containers** → `johnnymonkey-app` → **"Console"**
2. **Wähle** "sh" oder "bash"
3. **"Connect"** klicken

### Im Container testen:
```bash
curl http://localhost:3001/health
```

### Falls das funktioniert:
- Die App läuft im Container
- Problem ist das Port-Mapping

### Falls das nicht funktioniert:
- Die App läuft nicht richtig
- Prüfe die Logs

## 🔧 Lösung 1: Container neu erstellen

Falls Port-Mapping falsch ist:

1. **Containers** → `johnnymonkey-app` → **"Remove"**
2. **Stacks** → `johnnymonkey` → **"Editor"**
3. **Prüfe** die Port-Konfiguration:
   ```yaml
   ports:
     - "3001:3001"
   ```
4. **"Update the stack"**

## 🔧 Lösung 2: Port ändern

Falls Port 3001 belegt ist:

1. **Stacks** → `johnnymonkey` → **"Editor"**
2. **Ändere** Port:
   ```yaml
   ports:
     - "3002:3001"  # Host-Port ändern
   ```
3. **"Update the stack"**
4. **Versuche**: `http://localhost:3002`

## 🔧 Lösung 3: Port prüfen (Terminal)

Öffne ein Terminal und prüfe:

```bash
# Prüfe, ob Port 3001 belegt ist
lsof -i :3001

# Oder
netstat -an | grep 3001
```

Falls Port belegt:
- Anderen Prozess stoppen
- Oder Port ändern

## 🔧 Lösung 4: Logs genau prüfen

### In Portainer:
1. **Containers** → `johnnymonkey-app` → **"Logs"**
2. **Suche** nach:
   - `Server is running on port 3001` ✅
   - `Error` ❌
   - `Port already in use` ❌
   - `Cannot bind to port` ❌

## 🔧 Lösung 5: Network prüfen

Falls Container im falschen Netzwerk ist:

1. **Containers** → `johnnymonkey-app` → **"Inspect"**
2. **Network** prüfen
3. Sollte: `johnnymonkey-network` sein

## 📋 Checkliste

- [ ] Container läuft (Status: Running)?
- [ ] Health Check: Healthy?
- [ ] Port-Mapping: 3001:3001?
- [ ] Im Container getestet (curl)?
- [ ] Port 3001 frei?
- [ ] Logs zeigen "Server is running"?

## 🎯 Nächste Schritte

**WICHTIG**: Teile mir mit:
1. Was zeigt der **Container-Status**? (Running/Stopped)
2. Was zeigt **Health**? (Healthy/Unhealthy)
3. Was steht in den **Logs**? (Letzte 10 Zeilen)
4. Funktioniert `curl` im Container?

Dann kann ich dir genau sagen, was das Problem ist!

Viel Erfolg! 🚀

