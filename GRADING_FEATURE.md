# Bewertungsschema Feature

## Übersicht
Das neue "Benotung festlegen" Feature ermöglicht es Lehrern, strukturierte Bewertungsschemata für ihre Lerngruppen zu erstellen, zu bearbeiten und zu verwalten.

## Funktionalitäten

### 1. Zugriff auf das Feature
- Im Lehrer-Dashboard unter "Lerngruppen"
- Drei-Punkte-Menü bei jeder Lerngruppe
- Option "Benotung festlegen" auswählen

### 2. Übersichtliche Benutzeroberfläche
- **Zweispaltiges Layout**: Bestehende Schemata links, Editor rechts
- **Bestehende Schemata**: Liste aller vorhandenen Bewertungsschemata
- **Schnelle Bearbeitung**: Ein-Klick-Bearbeitung bestehender Schemata
- **Neue Schemata**: Einfaches Erstellen neuer Bewertungsschemata

### 3. Bewertungsschema erstellen/bearbeiten
- **Name des Schemas**: Eindeutiger Name für das Bewertungsschema
- **Kategorien hinzufügen**: Verschachtelte Struktur möglich
- **Gewichtungen**: Prozentuale Gewichtung für jede Kategorie
- **Automatische Validierung**: Summe muss in jeder Ebene 100% ergeben
- **Echtzeit-Feedback**: Sofortige Anzeige der Summen und Validierung

### 4. Verschachtelung und Organisation
- **Hauptkategorien**: Top-Level Bewertungskategorien
- **Unterkategorien**: Unbegrenzte Verschachtelungstiefe
- **Expandieren/Kollabieren**: Übersichtliche Darstellung komplexer Strukturen
- **Separate Validierung**: Gewichtungsvalidierung für jede Ebene

### 5. Benutzerfreundlichkeit
- **Visuelle Validierung**: Farbkodierung für korrekte/fehlerhafte Summen
- **Intuitive Bedienung**: Klare Icons und Tooltips
- **Responsive Design**: Funktioniert auf verschiedenen Bildschirmgrößen
- **Fehlerbehandlung**: Klare Fehlermeldungen bei ungültigen Eingaben

## Technische Implementierung

### Frontend-Komponenten
- `GradingSchemaModal.tsx`: Hauptkomponente für das Modal
- Integration in `TeacherDashboard.tsx`
- Material-UI für konsistentes Design

### Datenstruktur
```typescript
interface GradeNode {
  id: string;
  name: string;
  weight: number;
  children: GradeNode[];
  isExpanded?: boolean;
}

interface GradingSchema {
  id?: string;
  name: string;
  structure: string;
  createdAt?: string;
}
```

### API-Integration
- GET `/api/grading-schemas/:groupId` - Schemata abrufen
- POST `/api/grading-schemas` - Neues Schema erstellen
- PUT `/api/grading-schemas/:id` - Schema bearbeiten
- DELETE `/api/grading-schemas/:id` - Schema löschen

## Beispiel für ein Bewertungsschema

```
Mathematik Bewertung 2024 (100%)
  Klausuren (60%)
    Schriftliche Klausur 1 (30%)
    Schriftliche Klausur 2 (30%)
  Mündliche Leistung (25%)
    Mitarbeit (15%)
    Präsentationen (10%)
  Hausaufgaben (15%)
    Regelmäßige Abgaben (10%)
    Projektarbeit (5%)
```

## Validierungsregeln
1. Jede Ebene muss eine Summe von 100% haben
2. Mindestens eine Hauptkategorie erforderlich
3. Schema-Name ist obligatorisch
4. Gewichtungen müssen positive Zahlen sein

## Neue Features (Update)

### Verbesserte Benutzeroberfläche
- **Zweispaltiges Layout**: Bessere Übersicht und Organisation
- **Bestehende Schemata**: Sofortiger Zugriff auf vorhandene Schemata
- **Bearbeitungsmodus**: Einfaches Bearbeiten bestehender Schemata
- **Löschfunktion**: Sichere Löschung von Schemata mit Bestätigung

### Erweiterte Funktionalität
- **Schema-Verwaltung**: Vollständige CRUD-Operationen
- **Automatisches Laden**: Bestehende Schemata werden automatisch geladen
- **Bearbeitungsmodus**: Umschalten zwischen Erstellen und Bearbeiten
- **Validierung**: Verbesserte Validierung mit visuellen Hinweisen

### Benutzerfreundlichkeit
- **Tooltips**: Hilfreiche Hinweise für alle Aktionen
- **Farbkodierung**: Klare visuelle Unterscheidung von Zuständen
- **Responsive Design**: Optimiert für verschiedene Bildschirmgrößen
- **Intuitive Navigation**: Einfache Bedienung ohne Schulung

## Nächste Schritte
- Integration mit Schüler-Bewertungen
- Export-Funktionalität für Bewertungsschemata
- Vorlagen für häufige Bewertungsschemata
- Statistiken und Auswertungen
- Import-Funktionalität für bestehende Schemata 