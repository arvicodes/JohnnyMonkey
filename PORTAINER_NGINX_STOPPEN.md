# 🛑 nginx-Container stoppen - Port-Konflikt lösen

## ⚠️ Problem: nginx blockiert Port 80

Du siehst die nginx-Willkommensseite statt der JohnnyMonkey App.

**Ursache:** Der nginx-Container ("webserver") läuft noch und blockiert Port 80!

## ✅ Lösung: nginx-Container stoppen

### Schritt 1: nginx-Container finden

1. **Portainer.io öffnen**: `https://192.168.8.1:9443`
2. Navigiere zu **Containers** (linke Seitenleiste)
3. Suche nach **webserver** (oder nginx-Container)

### Schritt 2: nginx-Container stoppen

1. Klicke auf den Container **webserver**
2. Klicke auf **Stop** (Button oben rechts)
3. Warte 5-10 Sekunden
4. Status sollte jetzt **Stopped** sein

### Schritt 3: JohnnyMonkey Container prüfen

1. Suche nach **johnnymonkey-app**
2. Prüfe den Status:
   - ✅ Sollte **Running** sein
   - ✅ Port-Mapping: `80:3000`

### Schritt 4: App testen

1. Öffne Safari
2. Gehe zu: `http://192.168.8.1`
3. Du solltest jetzt die **JohnnyMonkey App** sehen, nicht nginx!

## 🔍 Alternative: nginx-Container löschen (optional)

Wenn der nginx-Container nicht mehr benötigt wird:

1. **Containers** → **webserver** → **Stop**
2. Warte bis Status **Stopped** ist
3. Klicke auf **Delete**
4. Bestätige die Löschung

**⚠️ Achtung:** Nur löschen, wenn der Container wirklich nicht mehr benötigt wird!

## 📋 Schritt-für-Schritt Anleitung

### Option A: Über Portainer.io UI

1. **Portainer.io öffnen**: `https://192.168.8.1:9443`
2. **Containers** → Suche **webserver**
3. Klicke auf **webserver**
4. Klicke auf **Stop** (oben rechts)
5. Warte 10 Sekunden
6. Teste: `http://192.168.8.1`

### Option B: Über Container-Liste

1. **Containers** → Liste aller Container
2. Finde **webserver** (nginx)
3. Klicke auf **Stop** Icon (⏸️) neben dem Container
4. Warte bis Status **Stopped** ist
5. Teste: `http://192.168.8.1`

## ✅ Nach dem Stoppen

**Was passiert:**

1. ✅ nginx-Container ist gestoppt
2. ✅ Port 80 ist jetzt frei
3. ✅ JohnnyMonkey Container kann Port 80 nutzen
4. ✅ App ist erreichbar unter `http://192.168.8.1`

**Prüfe:**

1. **Containers** → **webserver** → Status: **Stopped** ✅
2. **Containers** → **johnnymonkey-app** → Status: **Running** ✅
3. Browser → `http://192.168.8.1` → JohnnyMonkey App ✅

## 🐛 Falls es nicht funktioniert

### Problem: Container startet automatisch neu

**Lösung:**
1. Prüfe **Restart Policy** des nginx-Containers
2. Ändere zu **Never** oder **Unless stopped**
3. Oder lösche den Container komplett

### Problem: Port 80 immer noch belegt

**Lösung:**
1. Prüfe alle Container auf Port 80:
   - **Containers** → Filter nach Port 80
2. Stoppe alle Container, die Port 80 verwenden
3. Starte johnnymonkey-app neu

### Problem: JohnnyMonkey Container läuft nicht

**Lösung:**
1. **Containers** → **johnnymonkey-app** → **Start**
2. Prüfe Logs auf Fehler
3. Prüfe Port-Mapping: Muss `80:3000` sein

## 📊 Port-Status prüfen

**In Portainer.io:**

1. **Containers** → Liste aller Container
2. Prüfe **Published Ports**:
   - **webserver**: Sollte **keine** Ports haben (gestoppt)
   - **johnnymonkey-app**: Sollte `80:3000` haben

## 🎯 Zusammenfassung

| Container | Status | Port | Aktion |
|-----------|--------|------|--------|
| **webserver** (nginx) | Stopped | - | ✅ Fertig |
| **johnnymonkey-app** | Running | 80:3000 | ✅ Läuft |

## ✅ Checkliste

- [ ] nginx-Container ("webserver") gestoppt
- [ ] JohnnyMonkey Container läuft
- [ ] Port-Mapping korrekt (80:3000)
- [ ] App erreichbar: `http://192.168.8.1`
- [ ] Keine nginx-Willkommensseite mehr

## 🚀 Nach erfolgreichem Stoppen

1. **Teste die App**: `http://192.168.8.1`
2. **Health Check**: `http://192.168.8.1/health`
3. **App sollte geladen werden** ✅

---

**Wichtig:** Port 80 kann nur von **einem** Container verwendet werden!


