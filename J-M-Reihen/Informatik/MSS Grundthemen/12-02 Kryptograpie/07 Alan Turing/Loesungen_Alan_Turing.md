# Lösungen – Alan Turing & Kryptoanalyse (Toy-Beispiel)

## B) Warm-up (Beispielantwort)
Ein Crib liefert **zusätzliche Information** (bekannter Klartext). Damit kann man Kandidaten-Schlüssel **prüfen und schnell verwerfen**: Passt das Crib nicht, ist der Schlüssel unmöglich. So wird der Suchraum effektiv kleiner, weil viele Möglichkeiten sofort ausscheiden.

---

## C) Toy-Kryptoanalyse 1: Caesar mit Crib

### Gegeben
Ciphertext: `ZJYYJW FZK IJW FQFS YZWNSL`  
Crib: **TURING**

### 1) Verschiebung \(k\)
Man testet ein 6-Buchstaben-Wort aus dem Ciphertext gegen **TURING**.  
Das letzte Wort ist `YZWNSL` (6 Zeichen). Vergleiche z.B.:
- Cipher `Y` → Klar `T`  
Alphabetpositionen: \(Y(24)\) nach \(T(19)\) ist \(-5\) (mod 26).  
Also: **Entschlüsselung = um 5 nach links** (oder Verschlüsselung = \(k=+5\)).

Damit ist \(k = 5\) (Verschiebung nach rechts beim Verschlüsseln).

### 2) Gesamter Klartext
Mit \(-5\) (entschlüsseln) ergibt sich:
- `ZJYYJW` → **EODDOE**
- `FZK` → **AUE**
- `IJW` → **DER**
- `FQFS` → **ALAN**
- `YZWNSL` → **TURING**

Klartext: **EODDOE AUE DER ALAN TURING**

Hinweis: Der erste Block ist absichtlich „kaputt“/ungewöhnlich (Toy-Beispiel). Didaktischer Fokus ist die Methode (Crib ⇒ \(k\) finden), nicht ein perfekter deutscher Satz.

### 3) Crib markieren
Crib ist **TURING** (letztes Wort).

---

## D) Suchraum & Ausschließen
1) Ohne Crib: Im schlimmsten Fall **26** Schlüssel testen.  
2) Mit Crib: Man kann **viele sofort ausschließen**, weil die Entschlüsselung an der Crib-Stelle keinen sinnvollen Treffer ergibt.  
3) Enigma-Transfer: Bei Enigma ist der Suchraum extrem groß (viele Einstellungen). Reines Durchprobieren ist unpraktisch; man braucht **Struktur/Annahmen/Prüfkriterien** (z.B. Cribs, typische Formate), um Kandidaten systematisch auszuschließen.

