# 🔍 Datenbank prüfen ohne sqlite3

## ⚠️ Problem

sqlite3 ist im Container nicht installiert. Verwende stattdessen Node.js/Prisma.

## ✅ Lösung: Datenbank über Prisma prüfen

### Schritt 1: Container-Console öffnen

**In Portainer.io:**

1. **Containers** → **johnnymonkey-app**
2. Klicke auf **Console** Tab
3. Wähle Shell: `sh` oder `bash`
4. Klicke auf **Connect**

### Schritt 2: Alle Benutzer anzeigen

**In der Console:**

```bash
cd /app/server
node -e "const { PrismaClient } = require('@prisma/client'); const prisma = new PrismaClient(); prisma.user.findMany().then(users => { console.log('\\n📋 Anzahl Benutzer:', users.length); console.log('\\n📋 Alle Benutzer:'); users.forEach(u => console.log(\`- \${u.name} (LoginCode: '\${u.loginCode}', Role: \${u.role})\`)); prisma.\$disconnect(); }).catch(e => { console.error('❌ Fehler:', e.message); prisma.\$disconnect(); });"
```

### Schritt 3: Speziell nach Login-Code "1" suchen

**In der Console:**

```bash
cd /app/server
node -e "const { PrismaClient } = require('@prisma/client'); const prisma = new PrismaClient(); prisma.user.findUnique({ where: { loginCode: '1' } }).then(user => { if (user) { console.log('✅ Benutzer gefunden:'); console.log('  Name:', user.name); console.log('  LoginCode:', user.loginCode); console.log('  Role:', user.role); } else { console.log('❌ Kein Benutzer mit LoginCode \"1\" gefunden'); } prisma.\$disconnect(); }).catch(e => { console.error('❌ Fehler:', e.message); prisma.\$disconnect(); });"
```

### Schritt 4: Alle Login-Codes anzeigen

**In der Console:**

```bash
cd /app/server
node -e "const { PrismaClient } = require('@prisma/client'); const prisma = new PrismaClient(); prisma.user.findMany({ select: { name: true, loginCode: true, role: true } }).then(users => { console.log('\\n📋 Alle Login-Codes:'); users.forEach(u => console.log(\`- '\${u.loginCode}' -> \${u.name} (\${u.role})\`)); prisma.\$disconnect(); }).catch(e => { console.error('❌ Fehler:', e.message); prisma.\$disconnect(); });"
```

## 🔍 Was du prüfen solltest

1. **Anzahl Benutzer:** Wie viele Benutzer sind in der Datenbank?
   - Wenn 0 → Datenbank ist leer, Benutzer muss erstellt werden
   - Wenn > 0 → Prüfe Login-Codes

2. **Login-Code "1":** Existiert ein Benutzer mit Login-Code "1"?
   - Wenn ja → Problem liegt woanders
   - Wenn nein → Benutzer muss erstellt werden

3. **Alle Login-Codes:** Welche Login-Codes existieren?
   - Prüfe ob "1" dabei ist
   - Prüfe ob es Leerzeichen oder andere Zeichen gibt

## 🐛 Wenn Datenbank leer ist

**Benutzer erstellen:**

```bash
cd /app/server
node -e "const { PrismaClient } = require('@prisma/client'); const prisma = new PrismaClient(); prisma.user.create({ data: { id: '01ed6e10-397e-446c-9254-2ad7fd4ec777', name: 'Frau Christ', loginCode: '1', role: 'TEACHER', avatarEmoji: '😊' } }).then(user => { console.log('✅ Benutzer erstellt:', user.name, 'mit LoginCode:', user.loginCode); prisma.\$disconnect(); }).catch(e => { console.error('❌ Fehler:', e.message); prisma.\$disconnect(); });"
```

## 📋 Schnellprüfung

**Ein Befehl für alles:**

```bash
cd /app/server && node -e "const { PrismaClient } = require('@prisma/client'); const prisma = new PrismaClient(); Promise.all([prisma.user.findMany(), prisma.user.findUnique({ where: { loginCode: '1' } })]).then(([allUsers, user1]) => { console.log('\\n📊 Datenbank-Status:'); console.log('  Anzahl Benutzer:', allUsers.length); console.log('  LoginCode \"1\" gefunden:', user1 ? '✅ Ja (' + user1.name + ')' : '❌ Nein'); console.log('\\n📋 Alle Login-Codes:'); allUsers.forEach(u => console.log(\`  - '\${u.loginCode}' -> \${u.name}\`)); prisma.\$disconnect(); }).catch(e => { console.error('❌ Fehler:', e.message); prisma.\$disconnect(); });"
```

## ✅ Nach der Prüfung

**Teile mir mit:**
1. Wie viele Benutzer sind in der Datenbank?
2. Existiert ein Benutzer mit Login-Code "1"?
3. Was zeigen die Container-Logs beim Login-Versuch?

Mit diesen Informationen kann ich das Problem genau identifizieren!

---

**Wichtig:** Verwende Node.js/Prisma statt sqlite3 - das ist bereits im Container verfügbar!


