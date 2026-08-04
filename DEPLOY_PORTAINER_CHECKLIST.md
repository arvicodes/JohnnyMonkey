# JohnnyMonkey Deploy Kurzcheck (Portainer)

## Pflichtzustand

- Stack `johnnymonkey` muss `running` sein.
- Container `johnnymonkey-app` muss `running`/`healthy` sein.
- Container `webserver` muss gestoppt sein (sonst kollidiert Port 80).

## Pflicht-Mapping

Bei `johnnymonkey-app` muss in den Container-Details stehen:

- `0.0.0.0:80 -> 3000/tcp`
- optional zusätzlich: `:::80 -> 3000/tcp`

In der Compose-Datei muss stehen:

```yaml
ports:
  - "0.0.0.0:80:3000"
```

Ohne dieses Mapping startet der Container zwar, ist aber von außen nicht erreichbar.

## Neustart-Reihenfolge (wichtig)

1. `webserver` stoppen.
2. `johnnymonkey-app` stoppen und entfernen (kill + remove).
3. Stack `johnnymonkey` neu deployen (`Pull and redeploy` / `Recreate`).
4. Prüfen, dass `johnnymonkey-app` wieder `healthy` ist.

## Korrekte URL (genau so)

- App aufrufen mit: `http://192.168.8.1/dashboard`
- Basisaufruf: `http://192.168.8.1`
- Nur `http://192.168.8.1` verwenden:
  - ohne `https`
  - ohne `www`
  - ohne Port

## Warum es jetzt klappt

- Der Container wurde wirklich neu gebaut und neu gestartet (`Recreate`), also mit den aktuellen Git-Änderungen.
- `webserver` blockiert Port `80` nicht mehr, deshalb landet die Anfrage bei JohnnyMonkey.
- Die App hört intern auf `3000`, und Portainer leitet `80 -> 3000` korrekt weiter.
- Für `J-M-Reihen` wird jetzt der Inhalt aus dem Docker-Image genutzt (kein leerer Host-Ordner mehr darüber gemountet).
- Gespeicherte Ordnerpfade wie `J-M-Reihen/...` werden im Backend auf `git-intern/...` umgebogen, deshalb werden die Inhalte wieder gefunden.
- Die Datenbank-Verbindung zeigt stabil auf `./prisma/dev.db`, daher funktionieren Login und Karteikarten wieder.
