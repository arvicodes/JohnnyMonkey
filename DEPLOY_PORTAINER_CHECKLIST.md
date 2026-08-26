# JohnnyMonkey Deploy Kurzcheck (Portainer)

## Pflichtzustand

- Stack `johnnymonkey` muss `running` sein.
- Container `johnnymonkey-app` muss `running`/`healthy` sein.
- Container `webserver` muss gestoppt sein (sonst kollidiert Port 80).

## Pflicht-Mapping / Netz

`johnnymonkey-app` nutzt **Host-Netz** (nicht Bridge-Port-Mapping):

- `network_mode: host`
- `PORT=80` (App lauscht direkt auf dem Host)
- Healthcheck: `http://127.0.0.1:80/health`

Zugriff für Unterricht und von außen läuft über Sophos-HTTPS (nicht über Cloudflare).

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
5. Prüfen: `johnnymonkey-app` = `healthy`, Logs: `running on port 80`
6. App-URL: `https://mnsplusdocker:44443/` (Schulnetz) bzw. `https://rpl-50147-0.dn.mnsnet.de:44443/` (außen)

## Korrekte URLs

- Schul-LAN / Unterricht: `https://mnsplusdocker:44443/` (HTTPS über Sophos)
- Von zu Hause / unterwegs: `https://rpl-50147-0.dn.mnsnet.de:44443/`
- Portainer: `https://192.168.8.1:9443`
- Nicht mehr: `http://192.168.8.1` (Klartext) und nicht `*.trycloudflare.com`

## Warum es klappt

- Container neu gebaut (`Rebuild`), aktuelle Git-Änderungen.
- `webserver` blockiert Port 80 nicht.
- App mit Host-Netz direkt auf Port `80` (kein Docker-Port-Proxy).
- Von außen: `https://rpl-50147-0.dn.mnsnet.de:44443/` (Sophos, nicht Port 80).
- `J-M-Reihen` aus dem Image; DB unter `/app/server/data/dev.db`.

## Wenn nur VPN und Safari „Verbindung abgelehnt“

Portainer `:9443` geht, Port `80` nicht → Firewall blockiert HTTP auf 80.
Dann die externe HTTPS-Adresse verwenden: `https://rpl-50147-0.dn.mnsnet.de:44443/` (nicht die IP, nicht Cloudflare).
