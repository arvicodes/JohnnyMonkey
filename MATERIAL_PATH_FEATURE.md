# Materialpfad-Verwaltung für Lehrer

## Übersicht

Diese neue Funktionalität ermöglicht es Lehrern, einen zentralen Ordner für alle Unterrichtsmaterialien zu konfigurieren. Das System erkennt automatisch alle verfügbaren Materialien und Quizze in diesem Verzeichnis.

## Features

### 1. Materialpfad-Konfiguration
- **Permanente Speicherung**: Der Materialpfad wird in der Datenbank gespeichert und bleibt auch nach dem Neustart der Anwendung erhalten
- **Warnungen bei Änderungen**: Bei Änderungen des Materialpfads werden Warnungen angezeigt, da bestehende Materialzuordnungen betroffen sein könnten
- **Benutzerfreundliche Eingabe**: Einfache Texteingabe mit Verzeichnisauswahl-Dialog

### 2. Automatische Materialerkennung
- **Intelligente Erkennung**: Das System erkennt automatisch, ob eine Datei ein Quiz oder Unterrichtsmaterial ist
- **Dateityp-Analyse**: Unterstützt gängige Formate wie PDF, DOCX, TXT, HTML, PPTX, Bilder
- **Schlüsselwort-Erkennung**: Erkennt Quizze anhand von Schlüsselwörtern wie "quiz", "test", "aufgabe"
- **Verzeichnisstruktur**: Zeigt die komplette Verzeichnisstruktur mit Unterordnern an

### 3. Materialvorschau
- **Übersichtliche Darstellung**: Alle erkannten Materialien werden übersichtlich aufgelistet
- **Kategorisierung**: Automatische Einordnung in Quizze, Materialien und Verzeichnisse
- **Metadaten**: Anzeige von Dateigröße, Änderungsdatum und Dateityp
- **Zusammenfassung**: Übersicht über Anzahl und Typ der gefundenen Materialien

## Technische Implementierung

### Backend
- **Neue Datenbank-Spalte**: `materialPath` in der `User`-Tabelle
- **TeacherSettingsController**: Verwaltet Lehrer-Einstellungen und Materialpfad
- **MaterialDiscoveryService**: Erkennt und analysiert Materialien im Verzeichnis
- **REST-API**: Neue Endpunkte für die Materialpfad-Verwaltung

### Frontend
- **MaterialPathManager**: Neue React-Komponente für die Materialpfad-Verwaltung
- **Integration**: Eingebettet in den "Material & Quiz" Tab des Lehrerdashboards
- **React Query**: Für effiziente Datenverwaltung und Caching
- **Material-UI**: Moderne und benutzerfreundliche Oberfläche

## Verwendung

### 1. Materialpfad konfigurieren
1. Öffnen Sie den "Material & Quiz" Tab im Lehrerdashboard
2. Geben Sie den vollständigen Pfad zu Ihrem Materialordner ein
3. Klicken Sie auf "Pfad speichern"

### 2. Materialien automatisch erkennen
- Nach dem Speichern des Pfads werden alle Materialien automatisch erkannt
- Das System zeigt eine Übersicht aller gefundenen Dateien und Verzeichnisse
- Materialien werden automatisch als Quizze oder Unterrichtsmaterialien kategorisiert

### 3. Materialien verwalten
- Alle erkannten Materialien werden übersichtlich aufgelistet
- Verzeichnisse können aufgeklappt werden, um den Inhalt anzuzeigen
- Die Anzeige kann mit dem "Aktualisieren" Button aktualisiert werden

## Unterstützte Dateiformate

### Quizze
- **Dokumente**: DOCX, DOC, TXT, HTML
- **Schlüsselwörter**: quiz, test, aufgabe, frage, antwort

### Unterrichtsmaterialien
- **Dokumente**: PDF, DOCX, DOC, TXT, HTML, PPTX, PPT
- **Bilder**: JPG, JPEG, PNG, GIF
- **Schlüsselwörter**: material, inhalt, lektion, stunde, unterricht

## Sicherheitshinweise

- **Pfad-Validierung**: Das System prüft, ob der angegebene Pfad existiert
- **Warnungen**: Bei Änderungen des Materialpfads werden Warnungen angezeigt
- **Fehlerbehandlung**: Robuste Fehlerbehandlung bei ungültigen Pfaden oder Berechtigungsproblemen

## Vorteile

1. **Zeitersparnis**: Kein manuelles Hochladen einzelner Materialien mehr nötig
2. **Automatisierung**: Materialien werden automatisch erkannt und kategorisiert
3. **Zentralisierung**: Alle Materialien befinden sich in einem übersichtlichen Verzeichnis
4. **Konsistenz**: Einheitliche Struktur für alle Unterrichtsmaterialien
5. **Wartbarkeit**: Einfache Verwaltung und Aktualisierung des Materialbestands

## Zukunftsvision

- **Automatische Synchronisation**: Regelmäßige Überprüfung auf neue Materialien
- **Intelligente Kategorisierung**: Verbesserte Erkennung basierend auf Dateiinhalt
- **Metadaten-Extraktion**: Automatische Extraktion von Titel, Beschreibung und Tags
- **Integration**: Nahtlose Integration mit bestehenden Quiz- und Materialfunktionen
