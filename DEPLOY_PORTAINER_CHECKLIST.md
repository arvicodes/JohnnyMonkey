# JohnnyMonkey Deploy Kurzcheck (Portainer)

## Pflichtzustand

- Stack `johnnymonkey` muss `running` sein.
- Container `johnnymonkey-app` muss `running`/`healthy` sein.
- Container `webserver` muss gestoppt sein (sonst kollidiert Port 80).

## Pflicht-Config (Host-Netz)

Compose nutzt jetzt `network_mode: host` und `PORT=80`.

Dadurch lauscht Node **direkt** auf Host-Port `80` (kein `80→3000`-Proxy mehr).

In Portainer kann unter Published ports ggf. nichts stehen — das ist bei Host-Netz normal.
Entscheidend: Container `healthy`, Logs zeigen `Server is running on port 80`.

```yaml
network_mode: host
environment:
  - PORT=80
```

## Neustart-Reihenfolge (wichtig)

1. `webserver` stoppen.
2. `johnnymonkey-app` stoppen und entfernen (kill + remove).
3. Stack `johnnymonkey` neu deployen (`Pull and redeploy` / `Recreate`).
4. **Wichtig bei Recreate/Update:**
   - **Rebuild** / Build aktivieren
   - **Re-pull image** / „Pull latest image“ **deaktivieren**
   - Sonst versucht Docker Hub `johnnymonkey` zu pullen → `pull access denied`
5. Prüfen, dass `johnnymonkey-app` wieder `healthy` ist.
6. In den Logs: `running on port 80`.

## Korrekte URL (genau so)

- App aufrufen mit: `http://192.168.8.1/dashboard`
- Basisaufruf: `http://192.168.8.1`
- Nur `http://192.168.8.1` verwenden:
  - ohne `https`
  - ohne `www`
  - ohne Port

## Wenn Safari „Verbindung abgelehnt“ zeigt

Portainer (`:9443`) erreichbar, App-Port `80` aber refused → oft VPN-/Host-Firewall.
Dann muss TCP `80` für VPN-Clients auf `192.168.8.1` wirklich durchkommen
(nicht nur Allow-Regel ohne Listener/DNAT).

## Warum Host-Netz

- Umgeht den Docker-Port-Proxy (`80→3000`), der Mapping anzeigen kann, obwohl von außen nichts antwortet.
- `webserver` darf Port `80` nicht belegen.
- DB und `J-M-Reihen` bleiben wie bisher über Volumes/Image verfügbar.
