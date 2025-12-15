# 👤 Benutzer anlegen - Login-Code Problem lösen

## ⚠️ Problem

Die Datenbank wurde neu initialisiert und hat keine Benutzer. Deshalb funktioniert der Login-Code "1" nicht.

## ✅ Lösung: Benutzer über Container-Console anlegen

### Schritt 1: Container-Console öffnen

**In Portainer.io:**

1. **Containers** → **johnnymonkey-app**
2. Klicke auf **Console** Tab
3. Wähle **sh** oder **bash** als Shell
4. Klicke auf **Connect**

### Schritt 2: Benutzer erstellen

**In der Console:**

```bash
# Zum Server-Verzeichnis wechseln
cd /app/server

# Prisma Studio öffnen (optional - GUI für Datenbank)
# Oder direkt SQL-Befehl ausführen:

# Node.js REPL starten
node
```

**Dann im Node.js REPL:**

```javascript
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

// Benutzer mit Login-Code "1" erstellen
prisma.user.create({
  data: {
    id: '01ed6e10-397e-446c-9254-2ad7fd4ec777',
    name: 'Frau Christ',
    loginCode: '1',
    role: 'TEACHER',
    avatarEmoji: '😊'
  }
}).then(user => {
  console.log('✅ Benutzer erstellt:', user);
  process.exit(0);
}).catch(error => {
  console.error('❌ Fehler:', error);
  process.exit(1);
});
```

**Oder einfacher - direkt SQL:**

```bash
# SQLite-Datenbank direkt bearbeiten
cd /app/server/prisma
sqlite3 dev.db
```

**Dann im SQLite:**

```sql
INSERT INTO User (id, name, "loginCode", role, "createdAt", "updatedAt", "avatarEmoji") 
VALUES ('01ed6e10-397e-446c-9254-2ad7fd4ec777', 'Frau Christ', '1', 'TEACHER', datetime('now'), datetime('now'), '😊');

-- Prüfen ob erstellt wurde
SELECT * FROM User WHERE "loginCode" = '1';
```

## 🚀 Schnelllösung: Node.js Script

**In Container-Console:**

```bash
cd /app/server
node -e "
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

prisma.user.create({
  data: {
    id: '01ed6e10-397e-446c-9254-2ad7fd4ec777',
    name: 'Frau Christ',
    loginCode: '1',
    role: 'TEACHER',
    avatarEmoji: '😊'
  }
}).then(user => {
  console.log('✅ Benutzer erstellt:', user);
  prisma.\$disconnect();
}).catch(error => {
  console.error('❌ Fehler:', error);
  prisma.\$disconnect();
});
"
```

## 📋 Alternative: Mehrere Benutzer erstellen

**Für mehrere Benutzer:**

```bash
cd /app/server
node -e "
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function createUsers() {
  // Lehrer
  await prisma.user.create({
    data: {
      id: '01ed6e10-397e-446c-9254-2ad7fd4ec777',
      name: 'Frau Christ',
      loginCode: '1',
      role: 'TEACHER',
      avatarEmoji: '😊'
    }
  });
  
  await prisma.user.create({
    data: {
      id: 'f67649b5-cfd0-4bcb-b22c-e5daa558b03d',
      name: 'Herr Kowalski',
      loginCode: 'TEACH002',
      role: 'TEACHER'
    }
  });
  
  // Beispiel-Schüler
  await prisma.user.create({
    data: {
      id: '4b09f68d-a1cd-4a5a-9cf8-e30d2732942e',
      name: 'Jakob Ackermann',
      loginCode: 'STUD001',
      role: 'STUDENT',
      avatarEmoji: '👨‍🎤'
    }
  });
  
  console.log('✅ Benutzer erstellt');
  await prisma.\$disconnect();
}

createUsers().catch(console.error);
"
```

## 🔍 Benutzer prüfen

**Nach dem Erstellen:**

```bash
cd /app/server
node -e "
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

prisma.user.findMany().then(users => {
  console.log('Benutzer in der Datenbank:');
  users.forEach(u => console.log(\`- \${u.name} (\${u.loginCode}) - \${u.role}\`));
  prisma.\$disconnect();
});
"
```

## ✅ Nach dem Erstellen

1. **Benutzer wurde erstellt** ✅
2. **Login-Code "1" sollte jetzt funktionieren** ✅
3. **Teste Login** in der App

## 🎯 Login testen

1. Öffne die App: `http://192.168.8.1`
2. Gib Login-Code **1** ein
3. Du solltest dich jetzt einloggen können ✅

## 📝 Wichtige Login-Codes

Nach dem Erstellen:

- **Login-Code "1"**: Frau Christ (TEACHER) ✅
- **Login-Code "TEACH002"**: Herr Kowalski (TEACHER)
- **Login-Code "STUD001"**: Jakob Ackermann (STUDENT)

## 🐛 Falls es nicht funktioniert

### Problem: Prisma Client nicht gefunden

**Lösung:**
```bash
cd /app/server
npx prisma generate
```

### Problem: Datenbank-Datei nicht gefunden

**Lösung:**
```bash
cd /app/server/prisma
ls -la
# Prüfe ob dev.db existiert
```

### Problem: Berechtigungsfehler

**Lösung:**
- Prüfe Volume-Berechtigungen
- Container neu starten

---

**Wichtig:** Nach dem Erstellen des Benutzers sollte Login-Code "1" funktionieren!

