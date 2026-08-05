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

**Nicht** über `Containers → johnnymonkey-app → Recreate` gehen  
(das pullt weiter `johnnymonkey:latest` von Docker Hub → Fehler).

Stattdessen:

1. `webserver` stoppen.
2. Links **Stacks** → Stack **`johnnymonkey`** öffnen.
3. Branch/Reference: **`Juli-2026`**, Compose path: `docker-compose.yml`.
4. **Pull and redeploy** / **Update the stack**:
   - ✅ **Re-pull image** = **AUS**
   - ✅ **Rebuild** / Build image = **AN**
5. Warten bis Build fertig ist.
6. Prüfen: Logs zeigen `running on port 80`, Status `healthy`.

Falls der Stack noch `image: johnnymonkey:latest` zeigt: im Editor diese Zeile löschen, speichern, dann Update mit Rebuild.

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
