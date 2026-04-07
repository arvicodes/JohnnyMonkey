# 12-02 Kryptograpie – 07 Alan Turing  
## Unterrichtsstunde: „Alan Turing, Enigma und die Idee der Kryptoanalyse“

### Kurzüberblick
- **Klasse/Stufe**: MSS (anpassbar ab Kl. 9/10)
- **Dauer**: 45 Minuten (optional: Erweiterung auf 90 Minuten)
- **Vorkenntnisse**: Grundidee von Verschlüsselung/Entschlüsselung; ideal nach Caesar/Skytale
- **Material**: `AB_Alan_Turing.md`, `Loesungen_Alan_Turing.md`, optional Beamer (Folien-Storyboard)

### Lernziele (kompetenzorientiert)
Die Schüler:innen …
- **erklären** den Unterschied zwischen *Kryptographie* (Verschlüsseln) und *Kryptoanalyse* (Angreifen/Entschlüsseln).
- **beschreiben** Enigma auf Konzept-Ebene (Rotore(n), Steckbrett, tägliche Einstellung) ohne Technik-Overload.
- **verstehen** am Toy-Beispiel, wie *Suchraum* und *Information (Crib/known plaintext)* zusammenhängen.
- **begründen**, warum Turings Ansatz vor allem ein Beitrag zur **systematischen Reduktion** von Möglichkeiten ist (Algorithmik/Logik statt „Glück“).
- **reflektieren**: Sicherheitsannahmen (Geheimhaltung des Schlüssels vs. Geheimhaltung des Verfahrens).

### Begriffe (Tafel/Wortliste)
Kryptographie, Kryptoanalyse, Schlüssel, Verfahren, Suchraum, Brute Force, Crib (bekannter Klartext), Enigma, Rotor, Steckbrett, Turing, „Bombe“ (als Hilfsmaschine)

---

## Stundenverlauf (45 Minuten)

### 1) Einstieg – Rätselimpuls (5 Min)
- **Impuls** (an die Tafel / Folie):  
  „Eine Nachricht ist verschlüsselt. Wir wissen nur: Sie beginnt mit *WETTER*.“  
  Kurze Frage: **Warum** hilft dieses Wissen beim Knacken?
- **Ziel**: Brücke zu „Crib“ und Suchraumreduktion.

### 2) Mini-Input: Wer war Alan Turing? (7 Min)
- 2–3 Kernpunkte:
  - Mathematiker/Logiker, Arbeit in Bletchley Park im 2. WK
  - Beitrag: Kryptoanalyse Enigma (methodisch + maschinelle Unterstützung)
  - Nachkrieg: Grundlagen der Informatik (Algorithmus-/Berechenbarkeitsdenken), Turing-Test (optional als Ausblick)
- **Didaktischer Fokus**: Nicht Biografie-Lexikon, sondern **Idee**: „systematisch denken, Möglichkeiten reduzieren“.

### 3) Enigma auf Konzept-Ebene (8 Min)
- **Modell**:
  - Tastendruck → Steckbrett (Buchstabentausch) → Rotoren (Substitution) → Reflektor → zurück → Lampe
  - Nach jedem Tastendruck drehen Rotoren: **Polyalphabetisch** (gleicher Buchstabe kann anders verschlüsselt werden)
- **Sicherheitsidee**: Tägliche Schlüssel + viele Einstellungen ⇒ riesiger Suchraum
- **Übergang**: Wenn Brute Force zu groß ist, braucht man **Struktur/Information**.

### 4) Arbeitsphase: Toy-Kryptoanalyse mit „Crib“ (15 Min)
- Ausgabe `AB_Alan_Turing.md`
- Partnerarbeit, dann kurzer Abgleich.
- **Leitfragen**:
  - Welche Informationen sind „geschenkt“ (Crib)?
  - Wie reduziert man damit den Suchraum?
  - Wo steckt hier „Algorithmus“ (klarer Ablauf)?

### 5) Sicherung/Transfer (8 Min)
- Ergebnissicherung an Tafel:
  - **Suchraum** \(N\) (alle Schlüssel) vs. **Prüfung** (passt Crib?)
  - Ein Crib macht viele Schlüssel sofort unmöglich.
  - Turings Maschine ist (vereinfacht) ein *Automat zum Ausschließen*.
- Transferfrage:
  - „Was ist gefährlicher: ein geheimes Verfahren oder ein geheimes Passwort?“  
    → Kerckhoffs’ Prinzip (nur nennen, wenn passend): Sicherheit hängt am Schlüssel.

### 6) Exit Ticket (2 Min)
- Jede:r schreibt 1–2 Sätze:
  - „Ein Crib hilft, weil …“
  - „Der wichtigste Trick bei Kryptoanalyse ist …“

---

## Erweiterung auf 90 Minuten (optional)
- **Vertiefung A (20–25 Min)**: Vergleich Caesar vs. (Toy-)polyalphabetisch: Warum wird es schwerer?
- **Vertiefung B (20–25 Min)**: Kurzer Block „Turing-Maschine als Denkmodell“ (nur Idee: „Ein Algorithmus als mechanischer Ablauf“).
- **Vertiefung C (20–25 Min)**: Ethische Reflexion (Wissenschaft, Krieg, Verantwortung; historische Einordnung Turings Verfolgung).

---

## Differenzierung
- **Unterstützung**:
  - Vorgehensplan in 3 Schritten (im AB)
  - Hilfekärtchen: „So findest du die Caesar-Verschiebung mit Crib“
- **Herausforderung**:
  - Zusatzaufgabe: „Wie viele Schlüssel müssten wir ohne Crib prüfen?“ (grobe Abschätzung)
  - Zusatz: „Welche Alltags-‚Cribs‘ gibt es in echten Protokollen?“ (z.B. Header/Formate)

---

## Hausaufgabe (optional)
- Kurzer Text: „Warum ist das Prinzip *Schlüssel geheim, Verfahren bekannt* sinnvoll?“ (5–8 Sätze)
- Oder: Mini-Recherche (max. 10 Min): „Bletchley Park“ / „Turing-Test“ (1 Fact + 1 Frage mitbringen)

