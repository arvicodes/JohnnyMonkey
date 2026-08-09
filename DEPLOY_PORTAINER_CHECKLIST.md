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

Zusätzlich: Container `johnnymonkey-tunnel` (Cloudflare quick tunnel) für VPN-Zugriff,
weil die Firewall Port 80 per VPN blockiert. URL in den Tunnel-Logs (`*.trycloudflare.com`).

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
6. Tunnel-Logs: `johnnymonkey-tunnel` → `https://….trycloudflare.com`

## Korrekte URLs

- Schul-LAN: `http://192.168.8.1/dashboard` (http, kein https/www/Port)
- VPN: Cloudflare-URL aus Tunnel-Logs (`*.trycloudflare.com/dashboard`)
- Portainer: `https://192.168.8.1:9443`

## Warum es klappt

- Container neu gebaut (`Rebuild`), aktuelle Git-Änderungen.
- `webserver` blockiert Port 80 nicht.
- App mit Host-Netz direkt auf Port `80` (kein Docker-Port-Proxy).
- VPN: Outbound-Tunnel über Cloudflare, weil TCP 80 eingehend blockiert ist.
- `J-M-Reihen` aus dem Image; DB unter `/app/server/data/dev.db`.

## Wenn nur VPN und Safari „Verbindung abgelehnt“

Portainer `:9443` geht, Port `80` nicht → Firewall/VPN lässt 80 nicht durch.
Dann die `trycloudflare.com`-URL aus den Tunnel-Logs verwenden (nicht `192.168.8.1`).
