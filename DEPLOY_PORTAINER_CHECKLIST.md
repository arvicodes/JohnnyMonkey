# JohnnyMonkey Deploy Kurzcheck (Portainer)

## Pflichtzustand

- Stack `johnnymonkey` muss `running` sein.
- Container `johnnymonkey-app` muss `running`/`healthy` sein.
- Container `webserver` muss gestoppt sein (sonst kollidiert Port 80).

## Pflicht-Mapping

Bei `johnnymonkey-app` muss in den Container-Details stehen:

- `0.0.0.0:80 -> 3000/tcp`
- `:::80 -> 3000/tcp`

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

- JohnnyMonkey läuft intern auf `3000` und wird sauber auf Host-Port `80` veröffentlicht.
- Der störende `webserver` ist raus aus dem Weg.
- Der Aufruf geht auf den richtigen Dienst und das richtige Protokoll (`http`).
