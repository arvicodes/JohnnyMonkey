# 🔍 Login-Code Problem debuggen

## ⚠️ Problem

Benutzer existiert in der Datenbank, aber Login-Code "1" wird als "Ungültiger Login-Code" zurückgegeben.

## 🔍 Debugging-Schritte

### Schritt 1: Container-Logs prüfen

**In Portainer.io:**

1. **Containers** → **johnnymonkey-app** → **Logs**
2. Suche nach Login-Versuchen:
   ```
   🔐 Login attempt with code: 1
   🔍 Searching for user with loginCode: 1
   ❌ Invalid login code: 1
   ```

**Was du sehen solltest:**
- Welcher Wert wird gesucht?
- Wird der loginCode als String oder Zahl gesucht?

### Schritt 2: Datenbank prüfen

**In Container-Console:**

```bash
cd /app/server/prisma
sqlite3 dev.db
```

**Dann:**

```sql
-- Alle Benutzer anzeigen
SELECT id, name, "loginCode", role FROM User;

-- Speziell nach Login-Code "1" suchen
SELECT * FROM User WHERE "loginCode" = '1';
SELECT * FROM User WHERE "loginCode" = 1;
SELECT * FROM User WHERE CAST("loginCode" AS TEXT) = '1';
```

**Prüfe:**
- Existiert der Benutzer?
- Wie ist der loginCode gespeichert? (String oder Zahl?)
- Gibt es Leerzeichen oder andere Zeichen?

### Schritt 3: Prisma Query testen

**In Container-Console:**

```bash
cd /app/server
node -e "
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

// Test 1: Als String suchen
prisma.user.findUnique({
  where: { loginCode: '1' }
}).then(user => {
  console.log('✅ Als String gefunden:', user);
  return prisma.\$disconnect();
}).catch(e => {
  console.log('❌ Als String nicht gefunden');
  
  // Test 2: Als Zahl suchen
  return prisma.user.findUnique({
    where: { loginCode: String(1) }
  });
}).then(user => {
  if (user) console.log('✅ Als String(1) gefunden:', user);
  prisma.\$disconnect();
}).catch(e => {
  console.error('❌ Fehler:', e.message);
  prisma.\$disconnect();
});
"
```

### Schritt 4: Alle Benutzer anzeigen

**In Container-Console:**

```bash
cd /app/server
node -e "
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

prisma.user.findMany().then(users => {
  console.log('\\n📋 Alle Benutzer in der Datenbank:');
  users.forEach(u => {
    console.log(\`- Name: \${u.name}\`);
    console.log(\`  LoginCode: '\${u.loginCode}' (Type: \${typeof u.loginCode})\`);
    console.log(\`  Role: \${u.role}\\n\`);
  });
  prisma.\$disconnect();
}).catch(e => {
  console.error('❌ Fehler:', e.message);
  prisma.\$disconnect();
});
"
```

## 🐛 Häufige Probleme

### Problem 1: Type-Mismatch

**Symptom:** loginCode ist als Zahl gespeichert, wird aber als String gesucht (oder umgekehrt)

**Lösung:**
- Prüfe wie loginCode gespeichert ist
- Stelle sicher, dass Suche den gleichen Typ verwendet

### Problem 2: Leerzeichen oder unsichtbare Zeichen

**Symptom:** loginCode hat Leerzeichen oder andere Zeichen

**Lösung:**
```sql
-- Prüfe auf Leerzeichen
SELECT * FROM User WHERE TRIM("loginCode") = '1';
```

### Problem 3: Datenbank-Verbindungsproblem

**Symptom:** Prisma kann nicht auf Datenbank zugreifen

**Lösung:**
- Prüfe Datenbank-Pfad
- Prüfe Volume-Mapping
- Container neu starten

## 🔧 Schnelllösung: Login-Code prüfen

**In Container-Console:**

```bash
cd /app/server
node -e "
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

// Alle Benutzer mit Login-Code ähnlich '1'
prisma.user.findMany({
  where: {
    loginCode: {
      contains: '1'
    }
  }
}).then(users => {
  console.log('\\n🔍 Benutzer mit Login-Code ähnlich \"1\":');
  users.forEach(u => {
    console.log(\`- \${u.name}: '\${u.loginCode}' (Länge: \${u.loginCode.length})\`);
    console.log(\`  Bytes: \${Buffer.from(u.loginCode).toString('hex')}\\n\`);
  });
  prisma.\$disconnect();
}).catch(e => {
  console.error('❌ Fehler:', e.message);
  prisma.\$disconnect();
});
"
```

## 📋 Was ich brauche

Bitte führe diese Schritte aus und teile die Ergebnisse:

1. **Container-Logs** beim Login-Versuch (was wird geloggt?)
2. **Datenbank-Abfrage**: `SELECT * FROM User WHERE "loginCode" = '1';`
3. **Prisma Query**: Was gibt `prisma.user.findUnique({ where: { loginCode: '1' } })` zurück?

Mit diesen Informationen kann ich das Problem genau identifizieren!

---

**Wichtig:** Der Benutzer existiert, aber wird nicht gefunden - das deutet auf ein Type-Mismatch oder Format-Problem hin!


