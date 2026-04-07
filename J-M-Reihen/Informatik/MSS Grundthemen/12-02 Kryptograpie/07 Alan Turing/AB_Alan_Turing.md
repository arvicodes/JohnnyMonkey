# Arbeitsblatt – Alan Turing & Kryptoanalyse (Toy-Beispiel mit „Crib“)

Name: _________________________  Datum: _______________  Kurs: ____________

## A) Kurzinfo (lese, markiere Schlüsselwörter)
**Kryptographie**: Nachrichten so verändern, dass sie ohne Schlüssel nicht verstanden werden.  
**Kryptoanalyse**: Angreifen/Entschlüsseln – man versucht, den Schlüssel zu finden oder die Nachricht ohne Schlüssel zu lesen.  
Bei der **Enigma** gab es sehr viele mögliche Einstellungen (Schlüssel). Ein kompletter **Brute-Force**-Test aller Möglichkeiten ist extrem aufwendig. Turings Idee (vereinfacht): **Möglichkeiten systematisch ausschließen**, z.B. mithilfe von typischen Textstellen oder bekanntem Klartext (**Crib**).

---

## B) Warm-up: Warum hilft ein „Crib“?
1. Erkläre in 2–3 Sätzen: Warum macht ein bekannter Klartext-Teil („Crib“) das Knacken leichter?

______________________________________________________________________________

______________________________________________________________________________

---

## C) Toy-Kryptoanalyse 1: Caesar mit Crib (Partnerarbeit)
Wir benutzen eine **Caesar-Verschiebung**: Jeder Buchstabe wird um \(k\) Stellen verschoben.  
Hinweis: Bei Caesar gilt: **Gleiche Verschiebung für alle Buchstaben**.

### Gegeben
- **Ciphertext (verschlüsselt)**:  
  `ZJYYJW FZK IJW FQFS YZWNSL`
- Wir wissen (Crib): Der Text enthält das Wort **TURING**.

### Aufgaben
1. Finde die Verschiebung \(k\). Beschreibe kurz deinen Weg.  

Tipp: Vergleiche ein Ciphertext-Wort der Länge 6 mit **TURING** und teste, ob die Verschiebung für alle Buchstaben gleich ist.

Vorgehen / Notizen:

______________________________________________________________________________

______________________________________________________________________________

2. Entschlüssele den gesamten Text.

Klartext: ____________________________________________________________________

3. Markiere im Klartext die Stelle, die dein **Crib** war.

---

## D) Toy-Kryptoanalyse 2: Suchraum & Ausschließen (Denken wie Turing)
Angenommen, du weißt nur: „Es ist Caesar“ (aber nicht \(k\)).  
Dann gibt es **26** mögliche Schlüssel.

1. Wie viele Schlüssel musst du **ohne Crib** im schlimmsten Fall testen? _______

2. Wie verändert sich das Testen **mit Crib**?
- Kreuze an und begründe kurz:
  - [ ] Ich muss trotzdem (fast) alle testen.
  - [ ] Ich kann viele sofort ausschließen.

Begründung:

______________________________________________________________________________

______________________________________________________________________________

3. Übertrage die Idee auf Enigma (in 2–4 Sätzen, ohne Technikdetails):  
Warum ist „Ausschließen“ dort noch wichtiger als bei Caesar?

______________________________________________________________________________

______________________________________________________________________________

---

## E) Reflexion (Exit)
1 Satz: „Turings Beitrag zur Kryptoanalyse war vor allem …“

______________________________________________________________________________

