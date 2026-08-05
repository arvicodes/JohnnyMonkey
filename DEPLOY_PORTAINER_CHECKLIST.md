# JohnnyMonkey Deploy Kurzcheck (Portainer)

## Pflichtzustand

- Stack `johnnymonkey` muss `running` sein.
- Container `johnnymonkey-app` muss `running`/`healthy` sein.
- Container `webserver` muss gestoppt sein (sonst kollidiert Port 80).

## Pflicht-Mapping

Bei `johnnymonkey-app` muss in den Container-Details stehen:

- `0.0.0.0:80 -> 3000/tcp`
- optional zusätzlich: `:::80 -> 3000/tcp`

In der Compose-Datei:

```yaml
ports:
  - "0.0.0.0:80:3000"
environment:
  - PORT=3000
```

## DB-Volume (wichtig)

Nicht `prisma/` als Volume mounten (überschreibt `schema.prisma`).

```yaml
volumes:
  - johnnymonkey_db:/app/server/data
environment:
  - DATABASE_URL=file:/app/server/data/dev.db
```

## Neustart-Reihenfolge (wichtig)

**Nicht** über `Containers → Recreate` (pullt oft `johnnymonkey:latest` von Docker Hub).

1. `webserver` stoppen.
2. Stacks → `johnnymonkey`
3. Advanced configuration → Reference: `refs/heads/Juli-2026`
4. **Pull and redeploy**
   - Rebuild = **AN**
   - Re-pull image = **AUS**
5. Prüfen: `healthy`, Mapping `80 -> 3000`, Logs: `running on port 3000`

## Korrekte URL (genau so)

- `http://192.168.8.1/dashboard`
- Basis: `http://192.168.8.1`
- nur `http`, kein `https`, kein `www`, kein Port

## Warum es klappt

- Container neu gebaut (`Rebuild`), aktuelle Git-Änderungen.
- `webserver` blockiert Port 80 nicht.
- App intern auf `3000`, Portainer/Docker leitet `80 -> 3000`.
- `J-M-Reihen` aus dem Image; DB unter `/app/server/data/dev.db`.

## Wenn nur VPN und Safari „Verbindung abgelehnt“

Portainer `:9443` geht, Port `80` nicht → Firewall/VPN lässt 80 nicht durch.
Die Checkliste gilt für Zugriff im Schul-LAN (bzw. wenn TCP 80 freigegeben ist).
