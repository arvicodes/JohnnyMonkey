import type { AnnouncementLayoutId } from '../../lib/announcementTypes';

export type AnnouncementTextTemplateCategory = 'schule' | 'verein';

export type AnnouncementTextTemplate = {
  id: string;
  category: AnnouncementTextTemplateCategory;
  name: string;
  description: string;
  suggestedTitle: string;
  bodyHtml: string;
  suggestedLayoutId?: AnnouncementLayoutId;
};

export const ANNOUNCEMENT_TEXT_TEMPLATE_CATEGORIES: {
  id: AnnouncementTextTemplateCategory;
  label: string;
}[] = [
  { id: 'schule', label: 'Schule' },
  { id: 'verein', label: 'Verein' },
];

/** Textvorlagen orientiert an bestehenden Elternbriefen & Vereinsprotokollen. */
export const ANNOUNCEMENT_TEXT_TEMPLATES: AnnouncementTextTemplate[] = [
  {
    id: 'schule-wandertag',
    category: 'schule',
    name: 'Elternbrief – Wandertag / Ausflug',
    description: 'Tagesablauf, Hinweise, optional Sponsoring',
    suggestedTitle: 'Wandertag – Klasse …',
    suggestedLayoutId: 'magazine',
    bodyHtml: `<p><strong>Lahnstein, [Datum]</strong></p>
<p>Liebe Eltern der Klasse [Klasse],</p>
<p>am [Wochentag], den [Datum], findet unser Wandertag statt. [Kurzbeschreibung der Route / des Ziels.]</p>
<p><strong>Grober Tagesablauf:</strong></p>
<ul>
<li><strong>[Uhrzeit]</strong> — Start an der Schule</li>
<li><strong>[Uhrzeit]</strong> — Ankunft am Ziel / Pause</li>
<li><strong>[Uhrzeit]</strong> — Rückfahrt; Ankunft in Lahnstein gegen [Uhrzeit]</li>
</ul>
<p><strong>Bitte beachten:</strong></p>
<ul>
<li><strong>Sicherheit:</strong> [z. B. Fahrradhelm tragen]</li>
<li><strong>Wetter:</strong> passende Kleidung, Sonnenschutz, Regenjacke</li>
<li><strong>Proviant:</strong> ausreichend Trinken (mind. … Liter) und Verpflegung fürs Picknick</li>
</ul>
<p>[Optional: Hinweise zu Sponsorengeldern / Überweisung auf das Schulkonto.]</p>
<p>Bei Fragen melden Sie sich gerne.</p>
<p>Mit freundlichen Grüßen<br/>[Name, Funktion]</p>`,
  },
  {
    id: 'schule-klassenfahrt',
    category: 'schule',
    name: 'Elternbrief – Klassenfahrt (1. Info)',
    description: 'Reisepreis, Überweisung, Datenbogen',
    suggestedTitle: 'Klassenfahrt [Klasse] – Informationen',
    suggestedLayoutId: 'magazine',
    bodyHtml: `<p>Liebe Eltern der Klasse [Klasse],</p>
<p>vom [Datum] bis [Datum] findet unsere Klassenfahrt nach [Ort] statt. Mit diesem Schreiben erhalten Sie Vorabinformationen, Regelungen und bitten um Ihr Einverständnis.</p>
<p><strong>Reisepreis</strong><br/>
Der Reisepreis beträgt <strong>[Betrag] €</strong> und beinhaltet [Leistungen, z. B. Bahn, Unterkunft, Verpflegung, Programm]. Eine Reiserücktrittsversicherung ist nicht enthalten und muss bei Bedarf selbst abgeschlossen werden.</p>
<p>Bitte überweisen Sie den Betrag bis spätestens <strong>[Datum]</strong> auf folgendes Konto:</p>
<p>Kontoinhaber: [Name]<br/>
IBAN: [IBAN]<br/>
BIC: [BIC]<br/>
Verwendungszweck: Klassenfahrt [Klasse] [Vorname] [Name]</p>
<p><strong>Datenbogen &amp; Einverständnis</strong><br/>
Beiliegend finden Sie den Datenbogen zur Klassenfahrt sowie die Regelungen. Bitte füllen Sie alles gewissenhaft aus und senden Sie es bis <strong>[Datum]</strong> zurück.</p>
<p>Genauere Informationen (Abfahrtszeiten, Programmpunkte …) folgen in einem zweiten Elternbrief kurz vor der Fahrt.</p>
<p>Liebe Grüße<br/>[Name, Klassenleitung]</p>`,
  },
  {
    id: 'schule-mint-praktikum',
    category: 'schule',
    name: 'Elternbrief – MINT-Praktikum / Fahrt',
    description: 'Außerschulischer Lernort, Programm, Begleitung',
    suggestedTitle: 'MINT-Praktikum – [Ort / Thema]',
    suggestedLayoutId: 'hero',
    bodyHtml: `<p><strong>Lahnstein, [Datum]</strong></p>
<p>Sehr geehrte Eltern, liebe Schülerinnen und Schüler der Klassen [Klassen],</p>
<p>wir bieten ein MINT-Praktikum / eine MINT-Fahrt nach <strong>[Ort]</strong> vom <strong>[Datum]</strong> bis <strong>[Datum]</strong> an (ca. [Anzahl] Plätze).</p>
<p><strong>Ziel:</strong> Vertiefung naturwissenschaftlichen Interesses und Förderung von MINT-Aktivitäten — verstanden als Unterricht an einem außerschulischen Lernort.</p>
<p><strong>Organisation:</strong></p>
<ul>
<li>An- und Abreise: [z. B. Deutsche Bahn ab Koblenz Hbf]</li>
<li>Unterkunft: [Unterkunft, Ort]</li>
<li>Begleitung: [Lehrkräfte / Namen]</li>
</ul>
<p><strong>Geplanter Ablauf (vorläufig):</strong></p>
<ul>
<li><strong>[Tag, Datum]:</strong> [Programmpunkt]</li>
<li><strong>[Tag, Datum]:</strong> [Programmpunkt]</li>
<li><strong>[Tag, Datum]:</strong> [Programmpunkt]</li>
</ul>
<p>Weitere Unterlagen (Kosten, Einverständniserklärung) folgen gesondert.</p>
<p>Mit freundlichen Grüßen<br/>[Name, Funktion]</p>`,
  },
  {
    id: 'schule-erasmus-teaching',
    category: 'schule',
    name: 'Elternbrief – Erasmus / Teaching Assignment',
    description: 'Workshop, Gastfamilien, optional Rückaustausch',
    suggestedTitle: 'Erasmus+ Projekt mit [Land / Partnerschule]',
    suggestedLayoutId: 'magazine',
    bodyHtml: `<p><strong>Lahnstein, [Datum]</strong></p>
<p>Liebe Eltern und Erziehungsberechtigte der Klassen [Klassen],</p>
<p>im Rahmen unserer internationalen Erasmus-Aktivitäten planen wir ein Projekt mit unserer Partnerschule in <strong>[Land / Ort]</strong>. Im Mittelpunkt steht ein praxisnahes Unterrichtsprojekt zum Thema „<strong>[Thema]</strong>“.</p>
<p><strong>Teaching Assignment / Workshop</strong><br/>
Geplant sind [Anzahl] Unterrichtsstunden innerhalb einer Woche, täglich etwa [Stundenzahl]. Teilnehmen können ca. [Anzahl] interessierte Schülerinnen und Schüler. Verpasster Fachunterricht ist eigenständig nachzuholen.</p>
<p><strong>Gastfamilien gesucht</strong><br/>
Für die Begleitgruppe suchen wir [Anzahl] Familien, die für diese Woche ein Gastkind aufnehmen würden. Die Begegnung schafft echte Sprechanlässe in Englisch und ermöglicht interkulturelles Lernen im Alltag.</p>
<p><strong>Möglicher Rückaustausch</strong><br/>
Unverbindlich fragen wir ab, wer grundsätzlich Interesse an einem Rückaustausch hätte. Kosten müssten anteilig selbst getragen werden; eine genaue Berechnung liegt noch nicht vor.</p>
<p><strong>Warum lohnt sich die Teilnahme?</strong></p>
<ul>
<li>Informatik / Fachinhalt praktisch erleben</li>
<li>Kreativität und Medienbildung stärken</li>
<li>Englisch in echten Situationen anwenden</li>
<li>Europa im Schulalltag erfahren</li>
</ul>
<p>Bei Interesse oder Fragen melden Sie sich bitte bis <strong>[Datum]</strong>.</p>
<p>Herzliche Grüße<br/>[Name, Funktion]</p>`,
  },
  {
    id: 'verein-protokoll-vorstand',
    category: 'verein',
    name: 'Protokoll – Vorstandssitzung',
    description: 'TOP-Struktur wie im Vereinsprotokoll',
    suggestedTitle: 'Protokoll Vorstandssitzung vom [Datum]',
    suggestedLayoutId: 'accent',
    bodyHtml: `<p><strong>[Vereinsname]</strong><br/>
[Vereinsadresse]</p>
<p><strong>Vorstandssitzung [Datum] um [Uhrzeit]</strong><br/>
[Ort der Sitzung]</p>
<p><strong>Anwesende:</strong><br/>
[Name]<br/>
[Name]<br/>
[Name]</p>
<p><strong>Entschuldigt:</strong><br/>
[Name]</p>
<p><strong>Protokoll:</strong> [Name]</p>
<p><strong>TOP 1 — Begrüßung</strong><br/>
[Inhalt, z. B. Begrüßung und Dank fürs Erscheinen.]</p>
<p><strong>TOP 2 — Genehmigung des Protokolls der letzten Sitzung</strong><br/>
Das Protokoll wurde von allen Anwesenden genehmigt.</p>
<p><strong>TOP 3 — [Thema, z. B. Mitgliedsverwaltung und Kasse]</strong><br/>
[Inhalt]</p>
<p><strong>TOP 4 — Informationen aus den Abteilungen</strong><br/>
[Inhalt]</p>
<p><strong>TOP 5 — [Thema, z. B. Anschaffungen / Zuschüsse]</strong><br/>
[Inhalt]</p>
<p><strong>TOP 6 — [Thema, z. B. Wandertag / Ausflug]</strong><br/>
[Inhalt]</p>
<p><strong>TOP 7 — Sonstiges</strong><br/>
Keine sonstigen Themen. / [Inhalt]</p>
<p><strong>Ende der Sitzung:</strong> [Uhrzeit]<br/>
<strong>Nächste Vorstandssitzung:</strong> [Termin / wird bekannt gegeben]</p>
<p>[Ort], [Datum]<br/>
[Name] (Protokollführer/in)</p>`,
  },
  {
    id: 'verein-terminankuendigung',
    category: 'verein',
    name: 'Verein – Termin & Ausflug',
    description: 'Mitgliederinfo zu Wandertag, Freizeit, Kurs',
    suggestedTitle: '[Termin] – [Vereinsname]',
    suggestedLayoutId: 'hero',
    bodyHtml: `<p>Liebe Mitglieder des <strong>[Vereinsname]</strong>,</p>
<p>hiermit laden wir Sie herzlich ein:</p>
<p><strong>Was?</strong> [z. B. Vereinswandertag / Jugendfreizeit / neuer Kurs]<br/>
<strong>Wann?</strong> [Datum], [Uhrzeit]<br/>
<strong>Wo?</strong> [Treffpunkt / Ort]<br/>
<strong>Für wen?</strong> [Zielgruppe, z. B. alle Mitglieder / Jugend]</p>
<p><strong>Bitte mitbringen:</strong></p>
<ul>
<li>[z. B. wetterfeste Kleidung]</li>
<li>[z. B. Verpflegung / Getränke]</li>
<li>[optional: Beitrag / Anmeldehinweis]</li>
</ul>
<p>Anmeldung bis <strong>[Datum]</strong> bei [Kontakt / E-Mail / Abteilungsleitung].</p>
<p>Wir freuen uns auf zahlreiche Teilnahme!</p>
<p>Sportliche Grüße<br/>
[Name / Vorstand / Abteilung]</p>`,
  },
  {
    id: 'verein-kurs-neu',
    category: 'verein',
    name: 'Verein – Neues Kursangebot',
    description: 'Kursstart, Gebühren, Anmeldung',
    suggestedTitle: 'Neues Kursangebot: [Kursname]',
    suggestedLayoutId: 'accent',
    bodyHtml: `<p>Liebe Mitglieder und Interessierte,</p>
<p>ab <strong>[Datum]</strong> startet in unserem Verein ein neues Angebot:</p>
<p><strong>[Kursname]</strong><br/>
Leitung: [Name]<br/>
Termin: [Wochentag], [Uhrzeit]<br/>
Ort: [Halle / Raum]</p>
<p><strong>Kursgebühr:</strong> [Betrag] € für Mitglieder / [Betrag] € für Nichtmitglieder ([Anzahl] Einheiten à [Dauer]).</p>
<p>Probeltraining / Schnupperstunde: [optional]</p>
<p>Anmeldung bei [Kontakt] oder per E-Mail an [Adresse].</p>
<p>Herzliche Grüße<br/>
[Vorstand / Abteilungsleitung]</p>`,
  },
];

export function getAnnouncementTextTemplatesByCategory(category: AnnouncementTextTemplateCategory) {
  return ANNOUNCEMENT_TEXT_TEMPLATES.filter((t) => t.category === category);
}

export function getAnnouncementTextTemplateById(id: string): AnnouncementTextTemplate | undefined {
  return ANNOUNCEMENT_TEXT_TEMPLATES.find((t) => t.id === id);
}
