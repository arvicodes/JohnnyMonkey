# 🔄 Schema-Update: Container neu starten

## ⚠️ Problem

Nach `prisma db push` ist das Schema aktualisiert, aber der Server verwendet noch den alten Prisma Client.

## ✅ Lösung: Container neu starten

**In Portainer.io:**

1. **Containers** → **johnnymonkey-app**
2. Klicke auf **Restart** (oder **Stop** → dann **Start**)
3. Warte 30-60 Sekunden
4. Der Server lädt den neu generierten Prisma Client

## 🔍 Was passiert beim Neustart

1. Container startet neu
2. `docker-start.sh` wird ausgeführt
3. `npx prisma generate` wird ausgeführt (generiert neuen Client)
4. Server startet mit aktuellem Schema

## ✅ Nach dem Neustart

Die Fehler sollten verschwunden sein:
- ✅ `FlashcardDeck` Tabelle verfügbar
- ✅ `DocumentProcessingHistory` Tabelle verfügbar
- ✅ `LearningGroup.period1Hours` Spalte verfügbar

## 🐛 Falls Fehler bleiben

**Prüfe Container-Logs:**

1. **Containers** → **johnnymonkey-app** → **Logs**
2. Suche nach:
   - `✅ PrismaClient created successfully`
   - `✅ Database file exists`
   - `🔄 Ensuring database schema is up to date...`

**Falls Schema-Fehler bleiben:**

```bash
cd /app/server
npx prisma generate
npx prisma db push --force-reset  # ⚠️ Vorsicht: Löscht Daten!
```

---

**Wichtig:** Nach Schema-Updates immer Container neu starten!


