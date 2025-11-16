import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// Hilfsfunktion: Aktuelles Datum in CET (Central European Time)
const getCurrentDateCET = () => {
  const now = new Date();
  // CET ist UTC+1 (Winter) oder UTC+2 (Sommer)
  // Für Dezember nehmen wir UTC+1 an
  const cetOffset = 1;
  const cetTime = new Date(now.getTime() + (cetOffset * 60 * 60 * 1000));
  return {
    year: cetTime.getUTCFullYear(),
    month: cetTime.getUTCMonth() + 1, // 0-indexed
    day: cetTime.getUTCDate()
  };
};

// Alle Türchen für ein Jahr abrufen
export const getDoors = async (req: Request, res: Response) => {
  try {
    const rawYear = parseInt(req.query.year as string) || new Date().getFullYear();
    const theme = (req.query.theme as string) || (req.headers['x-advent-theme'] as string) || '';
    const themes = [
      'Mathe Basics','Informatik','Tiere','Weltraum','Natur & Umwelt',
      'Weihnachten','Spiele & Rätsel','Geografie','Musik & Rhythmus','Essen & Küche'
    ];
    // Korrektes Mapping: -1 wenn Thema unbekannt
    const idx = themes.indexOf(theme);
    const themeIndex = theme ? (idx >= 0 ? idx : -1) : -1;
    // Virtuelles Jahr für Thema; ohne Thema normales Jahr
    let year = themeIndex >= 0 ? rawYear * 100 + (themeIndex + 1) : rawYear;
    const studentId = req.user?.id || null;

    console.log('getDoors aufgerufen - year:', year, 'studentId:', studentId, 'theme:', theme || 'none');

    // Prüfe, ob für das angeforderte Jahr Türchen existieren
    let doors = await prisma.adventCalendarDoor.findMany({
      where: { year },
      orderBy: { day: 'asc' },
      include: {
        submissions: studentId ? {
          where: { studentId },
          select: {
            id: true,
            answer: true,
            isCorrect: true,
            submittedAt: true
          }
        } : false
      }
    });

    // Falls keine Türchen gefunden wurden:
    // - mit Thema: versuche aus Basisjahr (neueste vorhandene 24) zu klonen und thematisch anzureichern
    // - ohne Thema: fallback auf neuestes Jahr wie zuvor
    if (doors.length === 0) {
      if (themeIndex >= 0) {
        // Bestimme das neueste vollständige Jahr (mit genau 24 Türchen)
        const latestYearWith24 = await prisma.adventCalendarDoor.groupBy({
          by: ['year'],
          _count: { year: true },
          orderBy: { year: 'desc' },
        }).then(groups => groups.find(g => g._count.year === 24));

        const latestYear = latestYearWith24
          ? latestYearWith24.year
          : (await prisma.adventCalendarDoor.findFirst({
              orderBy: { year: 'desc' },
              select: { year: true }
            }))?.year;

        const base = latestYear
          ? await prisma.adventCalendarDoor.findMany({
              where: { year: latestYear },
              orderBy: { day: 'asc' }
            })
          : [];
        if (base.length === 24) {
          console.log('Erzeuge thematische Türchen für', theme, 'in Jahr', year, 'basierend auf Jahr', latestYear);
          // einfache thematische Anreicherung ohne Schemaänderung
        const prefix = (fun: string) => {
            switch (theme) {
              case 'Mathe Basics': return `Mathe-Tipp: ${fun}`;
              case 'Informatik': return `Informatik-Fakt: ${fun}`;
              case 'Tiere': return `Tier-Fakt: ${fun}`;
              case 'Weltraum': return `Weltraum-Fakt: ${fun}`;
              case 'Natur & Umwelt': return `Natur-Fakt: ${fun}`;
              case 'Weihnachten': return `Weihnachts-Fakt: ${fun}`;
              case 'Spiele & Rätsel': return `Rätsel-Fakt: ${fun}`;
              case 'Geografie': return `Geo-Fakt: ${fun}`;
              case 'Musik & Rhythmus': return `Musik-Fakt: ${fun}`;
              case 'Essen & Küche': return `Küchen-Fakt: ${fun}`;
              default: return fun;
            }
          };
        // Kuratierte Aufgabenpools (24 Stück je Thema)
        const curatedMath: Array<{funFact:string;question:string;correctAnswer:string;explanation?:string}> = [
          { funFact: 'Zahlen kann man auf viele Arten zerlegen.', question: 'Rechne: 9 + 6 = ?', correctAnswer: '15', explanation: '9 + 6 = 15.' },
          { funFact: 'Zehner und Einer helfen beim Kopfrechnen.', question: 'Rechne: 27 − 8 = ?', correctAnswer: '19', explanation: '27 − 8 = 19.' },
          { funFact: 'Malnehmen ist wiederholtes Plus.', question: 'Rechne: 4 × 6 = ?', correctAnswer: '24', explanation: '4 mal 6 = 24.' },
          { funFact: 'Teilen ist gerechtes Aufteilen.', question: '20 Bonbons auf 5 Kinder. Wieviele pro Kind?', correctAnswer: '4', explanation: '20 ÷ 5 = 4.' },
          { funFact: 'Verdoppeln ist oft leichter als Malnehmen.', question: 'Verdopple 13.', correctAnswer: '26' },
          { funFact: 'Hälfte ist das Gegenteil von Verdoppeln.', question: 'Die Hälfte von 18 ist ...?', correctAnswer: '9' },
          { funFact: 'Runden hilft beim Überschlagen.', question: 'Runde 47 auf den nächsten Zehner.', correctAnswer: '50' },
          { funFact: 'Ein Dutzend sind 12 Stück.', question: 'Wie viele Eier sind 2 Dutzend?', correctAnswer: '24' },
          { funFact: '1 Stunde hat 60 Minuten.', question: 'Wie viele Minuten sind 2½ Stunden?', correctAnswer: '150', explanation: '2,5 × 60 = 150.' },
          { funFact: 'Rechtecke: Fläche = Länge × Breite.', question: '8 cm × 3 cm = Fläche?', correctAnswer: '24', explanation: '8 × 3 = 24 cm².' },
          { funFact: 'Perimeter ist der Umfang.', question: 'Ein Quadrat hat Seite 5 cm. Umfang?', correctAnswer: '20', explanation: '4 × 5 = 20 cm.' },
          { funFact: 'Zahlengeraden helfen beim Minus.', question: 'Rechne: 100 − 35 = ?', correctAnswer: '65' },
          { funFact: 'Malnehmen mit 10 endet auf 0.', question: 'Rechne: 7 × 10 = ?', correctAnswer: '70' },
          { funFact: '3 × 4 = 12 ist ein Klassiker.', question: 'Was ist 3 × 8?', correctAnswer: '24' },
          { funFact: 'Tausender, Hunderter, Zehner, Einer.', question: 'Zerlege 1 204 in H/Z/E.', correctAnswer: '1204', explanation: '1T 2H 0Z 4E → 1204.' },
          { funFact: 'Geteilt durch 10 verschiebt die Stelle.', question: '120 ÷ 10 = ?', correctAnswer: '12' },
          { funFact: 'Brüche: 1/2 ist die Hälfte.', question: 'Wie viel ist 1/2 von 18?', correctAnswer: '9' },
          { funFact: 'Drittel: 1/3 von 15.', question: '1/3 von 15 = ?', correctAnswer: '5' },
          { funFact: 'Vierfach heißt ×4.', question: 'Vierfach von 7 = ?', correctAnswer: '28' },
          { funFact: 'Plus und Minus sind Gegensätze.', question: 'Rechne: 36 − 19 = ?', correctAnswer: '17' },
          { funFact: '12 + 12 + 12 ist 3 × 12.', question: '3 × 12 = ?', correctAnswer: '36' },
          { funFact: 'Für 0 gilt: a + 0 = a.', question: '45 + 0 = ?', correctAnswer: '45' },
          { funFact: 'Kommutativ: 6 + 9 = 9 + 6.', question: 'Wieviel ist 9 + 6?', correctAnswer: '15' },
          { funFact: 'Verteile 24 fair auf 6.', question: '24 ÷ 6 = ?', correctAnswer: '4' }
        ];
        const curatedCS: Array<{funFact:string;question:string;correctAnswer:string;explanation?:string}> = [
          { funFact: 'Binärzahlen nutzen nur 0 und 1.', question: 'Schreibe 5 in Binär.', correctAnswer: '101', explanation: '4+1=5 → 101.' },
          { funFact: 'Ein Byte hat 8 Bits.', question: 'Wie viele Werte kann 1 Byte darstellen?', correctAnswer: '256', explanation: '2^8=256.' },
          { funFact: 'Algorithmen sind Rezepte.', question: 'Sortieren: Was kommt zuerst? 8, 3, 5', correctAnswer: '3', explanation: 'Kleinste Zahl zuerst.' },
          { funFact: 'Dateiendungen verraten den Typ.', question: 'Welche Endung ist ein Bild? .png/.mp3/.txt', correctAnswer: '.png' },
          { funFact: '0/1 stehen oft für Aus/Ein.', question: 'Ein Schalter ist an (1). Ist er aus, ist das ...?', correctAnswer: '0' },
          { funFact: 'Hex nutzt 0-9 A-F.', question: 'Welche Ziffern hat Hex neben 0-9?', correctAnswer: 'A B C D E F' },
          { funFact: 'Im Binär ist 2 → 10.', question: 'Schreibe 2 im Binärsystem.', correctAnswer: '10' },
          { funFact: 'Computer rechnen schnell, exakt.', question: '8 + 8 im Binär (1000 + 1000) = ?', correctAnswer: '10000', explanation: '8+8=16 → 10000.' },
          { funFact: 'Ordnung ist wichtig in Listen.', question: 'In [2,4,1] ist die kleinste Zahl ...?', correctAnswer: '1' },
          { funFact: 'Wir zählen ab 0 (Index).', question: 'Erster Index in Arrays?', correctAnswer: '0' },
          { funFact: 'true/false sind Wahrheitswerte.', question: 'Ist 3 > 2 wahr oder falsch?', correctAnswer: 'wahr' },
          { funFact: 'Das Binärsystem ist Basis 2.', question: 'Wie heißt unser Alltags-System?', correctAnswer: 'Dezimalsystem' },
          { funFact: 'ASCII kodiert Zeichen.', question: 'Welches Zeichen ist eine Ziffer? A/7/?', correctAnswer: '7' },
          { funFact: 'Summe einer Liste kann man falten.', question: 'Summe von 1,2,3,4?', correctAnswer: '10' },
          { funFact: 'Ein Schritt nach rechts verdoppelt binär.', question: '4 binär (100). 100 << 1 = ?', correctAnswer: '1000' },
          { funFact: 'Dateigrößen wachsen mit 2er‑Potenzen.', question: '2 KB sind wie viele Bytes?', correctAnswer: '2048' },
          { funFact: 'Farben in RGB sind 3 Zahlen.', question: 'Wie viele Kanäle hat RGB?', correctAnswer: '3' },
          { funFact: '1 und 0 bilden Logik.', question: 'AND: 1 AND 0 = ?', correctAnswer: '0' },
          { funFact: 'ODER (OR) gibt 1, wenn eins 1 ist.', question: 'OR: 1 OR 0 = ?', correctAnswer: '1' },
          { funFact: 'NOT kehrt um.', question: 'NOT 0 = ?', correctAnswer: '1' },
          { funFact: 'Datei .mp3 ist Audio.', question: '.mp3 ist ...?', correctAnswer: 'Audio' },
          { funFact: 'Cursor zeigt, wo man tippt.', question: 'Wie heißt der blinkende Strich?', correctAnswer: 'Cursor' },
          { funFact: 'Eine App ist ein Programm.', question: 'Programm, das man nutzt: ...?', correctAnswer: 'App' },
          { funFact: 'Eine Maus steuert Zeiger.', question: 'Eingabegerät: Maus oder Lautsprecher?', correctAnswer: 'Maus' }
        ];
        const curatedAnimals: Array<{funFact:string;question:string;correctAnswer:string;explanation?:string}> = [
          { funFact: 'Katzen haben scharfe Krallen.', question: 'Wie viele Beine hat eine Katze?', correctAnswer: '4' },
          { funFact: 'Vögel haben Federn.', question: 'Wie viele Flügel hat ein Vogel?', correctAnswer: '2' },
          { funFact: 'Fische atmen mit Kiemen.', question: 'Wie nennt man die „Lungen“ der Fische?', correctAnswer: 'Kiemen' },
          { funFact: 'Spinnen sind keine Insekten.', question: 'Wie viele Beine hat eine Spinne?', correctAnswer: '8' },
          { funFact: 'Elefanten haben Rüssel.', question: 'Wie viele Stoßzähne hat ein Elefant meistens?', correctAnswer: '2' },
          { funFact: 'Hunde haben feine Nasen.', question: 'Zähle: 2 Hunde + 2 Katzen = Beine?', correctAnswer: '16', explanation: '4 Tiere × 4 Beine = 16.' },
          { funFact: 'Bienen machen Honig.', question: 'Wie viele Beine hat eine Biene?', correctAnswer: '6' },
          { funFact: 'Fledermäuse fliegen nachts.', question: 'Sind Fledermäuse Vögel? ja/nein', correctAnswer: 'nein' },
          { funFact: 'Pinguine sind gute Schwimmer.', question: 'Können Pinguine fliegen? ja/nein', correctAnswer: 'nein' },
          { funFact: 'Kängurus springen weit.', question: 'Wie viele Hinterbeine nutzen Kängurus zum Springen?', correctAnswer: '2' },
          { funFact: 'Schnecken tragen Häuser.', question: 'Wie viele Beine hat eine Schnecke?', correctAnswer: '0' },
          { funFact: 'Frösche können hüpfen.', question: 'Wieviel ist 3 Frösche + 3 Frösche?', correctAnswer: '6' },
          { funFact: 'Ameisen sind stark.', question: 'Beine von 3 Ameisen?', correctAnswer: '18' },
          { funFact: 'Löwen leben im Rudel.', question: 'Wie viele Mähnen hat ein weiblicher Löwe?', correctAnswer: '0' },
          { funFact: 'Eulen sind nachtaktiv.', question: 'Wie viele Augen hat eine Eule?', correctAnswer: '2' },
          { funFact: 'Krabben laufen seitwärts.', question: 'Wie viele Scheren haben die meisten Krabben?', correctAnswer: '2' },
          { funFact: 'Giraffen sind sehr hoch.', question: 'Länger: Hals oder Beine?', correctAnswer: 'Hals' },
          { funFact: 'Wale sind Säugetiere.', question: 'Atmen Wale Luft? ja/nein', correctAnswer: 'ja' },
          { funFact: 'Delfine sind verspielt.', question: 'Wie nennt man ihre Rückenflosse?', correctAnswer: 'Finne' },
          { funFact: 'Tintenfische spritzen Tinte.', question: 'Wie viele Arme hat ein Oktopus?', correctAnswer: '8' },
          { funFact: 'Kröten und Frösche sind Amphibien.', question: 'Leben Amphibien auch an Land? ja/nein', correctAnswer: 'ja' },
          { funFact: 'Pferde sind Herdentiere.', question: 'Wie viele Beine hat ein Fohlen?', correctAnswer: '4' },
          { funFact: 'Schmetterlinge schmecken mit Füßen.', question: 'Wie viele Flügel hat ein Schmetterling?', correctAnswer: '4' }
        ];
        // Erzeuge pro Thema wirklich unterschiedliche Aufgabeninhalte
        const buildThemedDoor = (day: number) => {
          const n1 = (day % 7) + 3;
          const n2 = (day % 5) + 2;
          const n3 = (day % 4) + 1;
          switch (theme) {
            case 'Mathe Basics': {
              const item = curatedMath[day - 1];
              return item || curatedMath[(day - 1) % curatedMath.length];
            }
            case 'Informatik': {
              const item = curatedCS[day - 1];
              return item || curatedCS[(day - 1) % curatedCS.length];
            }
            case 'Tiere': {
              const item = curatedAnimals[day - 1];
              return item || curatedAnimals[(day - 1) % curatedAnimals.length];
            }
            case 'Weltraum': {
              const stars = 10 + day;
              const minus = n2;
              return {
                funFact: 'Im Weltraum gibt es unzählige Sterne.',
                question: `Du siehst ${stars} Sterne und eine Wolke verdeckt ${minus}. Wie viele siehst du noch?`,
                correctAnswer: String(stars - minus),
                explanation: `${stars} − ${minus} = ${stars - minus}.`
              };
            }
            case 'Natur & Umwelt': {
              const bottles = 5 + n1;
              const per = 3;
              const trips = Math.ceil(bottles / per);
              return {
                funFact: 'Recycling schont die Umwelt.',
                question: `Du sammelst ${bottles} Flaschen. In eine Tüte passen ${per}. Wie viele Tüten brauchst du mindestens?`,
                correctAnswer: String(trips),
                explanation: `${bottles} ÷ ${per} = ${(bottles / per).toFixed(2)} → mindestens ${trips} Tüten.`
              };
            }
            case 'Weihnachten': {
              const gifts = 12 + n1;
              const kids = 3 + (day % 4);
              const each = Math.floor(gifts / kids);
              return {
                funFact: 'Teilen macht Freude!',
                question: `${gifts} Geschenke werden gerecht auf ${kids} Kinder verteilt. Wie viele bekommt jedes Kind (ohne Rest)?`,
                correctAnswer: String(each),
                explanation: `${gifts} ÷ ${kids} = ${each} (Rest wird später verteilt).`
              };
            }
            case 'Spiele & Rätsel': {
              const a = n1 + day % 6;
              const b = n2 + 1;
              const sum = a + b;
              return {
                funFact: 'Zahlenrätsel trainieren das Gehirn.',
                question: `Denke dir zwei Zahlen: ${a} und ${b}. Welche Summe ergibt sich?`,
                correctAnswer: String(sum),
                explanation: `${a} + ${b} = ${sum}.`
              };
            }
            case 'Geografie': {
              const cities = 7 + (day % 6);
              const buses = 2 + (day % 3);
              const seats = 20;
              const total = buses * seats;
              return {
                funFact: 'Städte sind über Straßen und Busse verbunden.',
                question: `${buses} Busse fahren in eine Stadt. Jeder Bus hat ${seats} Plätze. Wie viele Plätze sind es insgesamt?`,
                correctAnswer: String(total),
                explanation: `${buses} × ${seats} = ${total} Plätze.`
              };
            }
            case 'Musik & Rhythmus': {
              const beats = 4 + (day % 4);
              const bars = 3 + (day % 3);
              const total = beats * bars;
              return {
                funFact: 'Takte bestehen aus gleichmäßigen Schlägen.',
                question: `Ein Lied hat ${bars} Takte mit je ${beats} Schlägen. Wie viele Schläge sind das insgesamt?`,
                correctAnswer: String(total),
                explanation: `${bars} × ${beats} = ${total} Schläge.`
              };
            }
            case 'Essen & Küche': {
              const apples = 5 + n2;
              const people = 2 + (day % 5);
              const per = Math.floor(apples / people);
              return {
                funFact: 'Beim Kochen wird viel gerechnet.',
                question: `Du hast ${apples} Äpfel und ${people} Personen. Wie viele ganze Äpfel bekommt jede Person (ohne Rest)?`,
                correctAnswer: String(per),
                explanation: `${apples} ÷ ${people} = ${per} pro Person (Rest bleibt übrig).`
              };
            }
            default: {
              return {
                funFact: base[day - 1].funFact,
                question: base[day - 1].question,
                correctAnswer: base[day - 1].correctAnswer,
                explanation: base[day - 1].explanation || undefined
              };
            }
          }
        };
          for (const d of base) {
            const themed = buildThemedDoor(d.day);
            await prisma.adventCalendarDoor.upsert({
              where: { day_year: { day: d.day, year } },
              update: {
              funFact: prefix(themed.funFact),
              question: themed.question,
              correctAnswer: themed.correctAnswer,
              explanation: themed.explanation
              },
              create: {
                day: d.day,
                year,
              funFact: prefix(themed.funFact),
              question: themed.question,
              correctAnswer: themed.correctAnswer,
              explanation: themed.explanation
              }
            });
          }
          doors = await prisma.adventCalendarDoor.findMany({
            where: { year },
            orderBy: { day: 'asc' },
            include: {
              submissions: studentId ? {
                where: { studentId },
                select: { id: true, answer: true, isCorrect: true, submittedAt: true }
              } : false
            }
          });
        }
      } else {
        const latestYear = await prisma.adventCalendarDoor.findFirst({
          orderBy: { year: 'desc' },
          select: { year: true }
        });
        if (latestYear) {
          console.log('Keine Türchen für Jahr', year, 'gefunden, verwende Jahr', latestYear.year);
          year = latestYear.year;
          doors = await prisma.adventCalendarDoor.findMany({
            where: { year },
            orderBy: { day: 'asc' },
            include: {
              submissions: studentId ? {
                where: { studentId },
                select: { id: true, answer: true, isCorrect: true, submittedAt: true }
              } : false
            }
          });
        }
      }
    }

    console.log('Gefundene Türchen:', doors.length, 'für Jahr', year);

    // Markiere, welche Türchen geöffnet werden können
    // SIMULATION: Alle Türchen bis Tag 24 sind öffnenbar (unabhängig vom aktuellen Monat)
    const currentDate = getCurrentDateCET();
    const isDecember = currentDate.month === 12;
    const today = currentDate.day;
    // Für Simulation: Wenn nicht Dezember, erlaube alle Türchen bis Tag 24
    const simulationMode = !isDecember;
    const maxOpenableDay = simulationMode ? 24 : today;

    const doorsWithStatus = doors.map(door => {
      const isOpenable = (simulationMode || isDecember) && door.day <= maxOpenableDay;
      const hasSubmission = door.submissions && door.submissions.length > 0;
      const isOpened = hasSubmission;

      return {
        ...door,
        isOpenable,
        isOpened,
        hasSubmission,
        mySubmission: door.submissions && door.submissions.length > 0 ? door.submissions[0] : null,
        submissions: undefined // Entferne submissions aus der Antwort
      };
    });

    // AUTO-HEAL: Falls Thema gewählt und Inhalte nicht thematisch aussehen, korrigiere automatisch
    if (themeIndex >= 0 && doorsWithStatus.length === 24) {
      const themeName = themes[themeIndex];
      const expectedPrefix = (() => {
        switch (themeName) {
          case 'Mathe Basics': return 'Mathe-Tipp: ';
          case 'Informatik': return 'Informatik-Fakt: ';
          case 'Tiere': return 'Tier-Fakt: ';
          case 'Weltraum': return 'Weltraum-Fakt: ';
          case 'Natur & Umwelt': return 'Natur-Fakt: ';
          case 'Weihnachten': return 'Weihnachts-Fakt: ';
          case 'Spiele & Rätsel': return 'Rätsel-Fakt: ';
          case 'Geografie': return 'Geo-Fakt: ';
          case 'Musik & Rhythmus': return 'Musik-Fakt: ';
          case 'Essen & Küche': return 'Küchen-Fakt: ';
          default: return '';
        }
      })();
      // Prüfe streng: Für bestimmte Themen muss Frage/Prefix exakt passen
      let needsFix = doorsWithStatus.some(d => typeof d.funFact === 'string' && expectedPrefix && !d.funFact.startsWith(expectedPrefix));
      // Für Informatik/Tiere validiere die Frage exakt gegen kuratierten Inhalt
      if (!needsFix && (themeName === 'Informatik' || themeName === 'Tiere' || themeName === 'Mathe Basics')) {
        // Kuratierte Sätze (Kurzfassung – identisch zur späteren Erzeugung)
        const curatedCS = [
          { question: 'Schreibe 5 in Binär.' },
          { question: 'Wie viele Werte kann 1 Byte darstellen?' },
          { question: 'Sortieren: Was kommt zuerst? 8, 3, 5' },
          { question: 'Welche Endung ist ein Bild? .png/.mp3/.txt' },
          { question: 'Ein Schalter ist an (1). Ist er aus, ist das ...?' },
          { question: 'Welche Ziffern hat Hex neben 0-9?' },
          { question: 'Schreibe 2 im Binärsystem.' },
          { question: '8 + 8 im Binär (1000 + 1000) = ?' },
          { question: 'In [2,4,1] ist die kleinste Zahl ...?' },
          { question: 'Erster Index in Arrays?' },
          { question: 'Ist 3 > 2 wahr oder falsch?' },
          { question: 'Wie heißt unser Alltags-System?' },
          { question: 'Welches Zeichen ist eine Ziffer? A/7/?' },
          { question: 'Summe von 1,2,3,4?' },
          { question: '4 binär (100). 100 << 1 = ?' },
          { question: '2 KB sind wie viele Bytes?' },
          { question: 'Wie viele Kanäle hat RGB?' },
          { question: 'AND: 1 AND 0 = ?' },
          { question: 'OR: 1 OR 0 = ?' },
          { question: 'NOT 0 = ?' },
          { question: '.mp3 ist ...?' },
          { question: 'Wie heißt der blinkende Strich?' },
          { question: 'Programm, das man nutzt: ...?' },
          { question: 'Eingabegerät: Maus oder Lautsprecher?' }
        ];
        const curatedAnimals = [
          { question: 'Wie viele Beine hat eine Katze?' },
          { question: 'Wie viele Flügel hat ein Vogel?' },
          { question: 'Wie nennt man die „Lungen“ der Fische?' },
          { question: 'Wie viele Beine hat eine Spinne?' },
          { question: 'Wie viele Stoßzähne hat ein Elefant meistens?' },
          { question: 'Zähle: 2 Hunde + 2 Katzen = Beine?' },
          { question: 'Wie viele Beine hat eine Biene?' },
          { question: 'Sind Fledermäuse Vögel? ja/nein' },
          { question: 'Können Pinguine fliegen? ja/nein' },
          { question: 'Wie viele Hinterbeine nutzen Kängurus zum Springen?' },
          { question: 'Wie viele Beine hat eine Schnecke?' },
          { question: 'Wieviel ist 3 Frösche + 3 Frösche?' },
          { question: 'Beine von 3 Ameisen?' },
          { question: 'Wie viele Mähnen hat ein weiblicher Löwe?' },
          { question: 'Wie viele Augen hat eine Eule?' },
          { question: 'Wie viele Scheren haben die meisten Krabben?' },
          { question: 'Länger: Hals oder Beine?' },
          { question: 'Atmen Wale Luft? ja/nein' },
          { question: 'Wie nennt man ihre Rückenflosse?' },
          { question: 'Wie viele Arme hat ein Oktopus?' },
          { question: 'Leben Amphibien auch an Land? ja/nein' },
          { question: 'Wie viele Beine hat ein Fohlen?' },
          { question: 'Wie viele Flügel hat ein Schmetterling?' },
        ];
        const curatedMath = [
          { question: 'Rechne: 9 + 6 = ?' },
          { question: 'Rechne: 27 − 8 = ?' },
          { question: 'Rechne: 4 × 6 = ?' },
          { question: '20 Bonbons auf 5 Kinder. Wieviele pro Kind?' },
          { question: 'Verdopple 13.' },
          { question: 'Die Hälfte von 18 ist ...?' },
          { question: 'Runde 47 auf den nächsten Zehner.' },
          { question: 'Wie viele Eier sind 2 Dutzend?' },
          { question: 'Wie viele Minuten sind 2½ Stunden?' },
          { question: '8 cm × 3 cm = Fläche?' },
          { question: 'Ein Quadrat hat Seite 5 cm. Umfang?' },
          { question: 'Rechne: 100 − 35 = ?' },
          { question: 'Rechne: 7 × 10 = ?' },
          { question: 'Was ist 3 × 8?' },
          { question: 'Zerlege 1 204 in H/Z/E.' },
          { question: '120 ÷ 10 = ?' },
          { question: 'Wie viel ist 1/2 von 18?' },
          { question: '1/3 von 15 = ?' },
          { question: 'Vierfach von 7 = ?' },
          { question: 'Rechne: 36 − 19 = ?' },
          { question: '3 × 12 = ?' },
          { question: '45 + 0 = ?' },
          { question: 'Wieviel ist 9 + 6?' },
          { question: '24 ÷ 6 = ?' },
        ];
        const mapByTheme = (day: number): string | null => {
          if (themeName === 'Informatik') return curatedCS[day - 1]?.question || null;
          if (themeName === 'Tiere') return curatedAnimals[day - 1]?.question || null;
          if (themeName === 'Mathe Basics') return curatedMath[day - 1]?.question || null;
          return null;
        };
        for (const d of doorsWithStatus) {
          const expectedQ = mapByTheme(d.day);
          if (expectedQ && d.question !== expectedQ) {
            needsFix = true;
            break;
          }
        }
      }
      if (needsFix) {
        // Bestimme Basisjahr (24 volle)
        const latestYearWith24 = await prisma.adventCalendarDoor.groupBy({
          by: ['year'],
          _count: { year: true },
          orderBy: { year: 'desc' },
        }).then(groups => groups.find(g => g._count.year === 24));
        const latestYear = latestYearWith24
          ? latestYearWith24.year
          : (await prisma.adventCalendarDoor.findFirst({ orderBy: { year: 'desc' }, select: { year: true } }))?.year;
        const base = latestYear
          ? await prisma.adventCalendarDoor.findMany({ where: { year: latestYear }, orderBy: { day: 'asc' } })
          : [];
        if (base.length === 24) {
          // Kuratierte Sets (wie oben)
          const curatedMath = [
            { funFact: 'Zahlen kann man auf viele Arten zerlegen.', question: 'Rechne: 9 + 6 = ?', correctAnswer: '15', explanation: '9 + 6 = 15.' },
            { funFact: 'Zehner und Einer helfen beim Kopfrechnen.', question: 'Rechne: 27 − 8 = ?', correctAnswer: '19', explanation: '27 − 8 = 19.' },
            { funFact: 'Malnehmen ist wiederholtes Plus.', question: 'Rechne: 4 × 6 = ?', correctAnswer: '24', explanation: '4 mal 6 = 24.' },
            { funFact: 'Teilen ist gerechtes Aufteilen.', question: '20 Bonbons auf 5 Kinder. Wieviele pro Kind?', correctAnswer: '4', explanation: '20 ÷ 5 = 4.' },
            { funFact: 'Verdoppeln ist oft leichter als Malnehmen.', question: 'Verdopple 13.', correctAnswer: '26' },
            { funFact: 'Hälfte ist das Gegenteil von Verdoppeln.', question: 'Die Hälfte von 18 ist ...?', correctAnswer: '9' },
            { funFact: 'Runden hilft beim Überschlagen.', question: 'Runde 47 auf den nächsten Zehner.', correctAnswer: '50' },
            { funFact: 'Ein Dutzend sind 12 Stück.', question: 'Wie viele Eier sind 2 Dutzend?', correctAnswer: '24' },
            { funFact: '1 Stunde hat 60 Minuten.', question: 'Wie viele Minuten sind 2½ Stunden?', correctAnswer: '150', explanation: '2,5 × 60 = 150.' },
            { funFact: 'Rechtecke: Fläche = Länge × Breite.', question: '8 cm × 3 cm = Fläche?', correctAnswer: '24', explanation: '8 × 3 = 24 cm².' },
            { funFact: 'Perimeter ist der Umfang.', question: 'Ein Quadrat hat Seite 5 cm. Umfang?', correctAnswer: '20', explanation: '4 × 5 = 20 cm.' },
            { funFact: 'Zahlengeraden helfen beim Minus.', question: 'Rechne: 100 − 35 = ?', correctAnswer: '65' },
            { funFact: 'Malnehmen mit 10 endet auf 0.', question: 'Rechne: 7 × 10 = ?', correctAnswer: '70' },
            { funFact: '3 × 4 = 12 ist ein Klassiker.', question: 'Was ist 3 × 8?', correctAnswer: '24' },
            { funFact: 'Tausender, Hunderter, Zehner, Einer.', question: 'Zerlege 1 204 in H/Z/E.', correctAnswer: '1204', explanation: '1T 2H 0Z 4E → 1204.' },
            { funFact: 'Geteilt durch 10 verschiebt die Stelle.', question: '120 ÷ 10 = ?', correctAnswer: '12' },
            { funFact: 'Brüche: 1/2 ist die Hälfte.', question: 'Wie viel ist 1/2 von 18?', correctAnswer: '9' },
            { funFact: 'Drittel: 1/3 von 15.', question: '1/3 von 15 = ?', correctAnswer: '5' },
            { funFact: 'Vierfach heißt ×4.', question: 'Vierfach von 7 = ?', correctAnswer: '28' },
            { funFact: 'Plus und Minus sind Gegensätze.', question: 'Rechne: 36 − 19 = ?', correctAnswer: '17' },
            { funFact: '12 + 12 + 12 ist 3 × 12.', question: '3 × 12 = ?', correctAnswer: '36' },
            { funFact: 'Für 0 gilt: a + 0 = a.', question: '45 + 0 = ?', correctAnswer: '45' },
            { funFact: 'Kommutativ: 6 + 9 = 9 + 6.', question: 'Wieviel ist 9 + 6?', correctAnswer: '15' },
            { funFact: 'Verteile 24 fair auf 6.', question: '24 ÷ 6 = ?', correctAnswer: '4' }
          ];
          const curatedCS = [
            { funFact: 'Binärzahlen nutzen nur 0 und 1.', question: 'Schreibe 5 in Binär.', correctAnswer: '101', explanation: '4+1=5 → 101.' },
            { funFact: 'Ein Byte hat 8 Bits.', question: 'Wie viele Werte kann 1 Byte darstellen?', correctAnswer: '256', explanation: '2^8=256.' },
            { funFact: 'Algorithmen sind Rezepte.', question: 'Sortieren: Was kommt zuerst? 8, 3, 5', correctAnswer: '3', explanation: 'Kleinste Zahl zuerst.' },
            { funFact: 'Dateiendungen verraten den Typ.', question: 'Welche Endung ist ein Bild? .png/.mp3/.txt', correctAnswer: '.png' },
            { funFact: '0/1 stehen oft für Aus/Ein.', question: 'Ein Schalter ist an (1). Ist er aus, ist das ...?', correctAnswer: '0' },
            { funFact: 'Hex nutzt 0-9 A-F.', question: 'Welche Ziffern hat Hex neben 0-9?', correctAnswer: 'A B C D E F' },
            { funFact: 'Im Binär ist 2 → 10.', question: 'Schreibe 2 im Binärsystem.', correctAnswer: '10' },
            { funFact: 'Computer rechnen schnell, exakt.', question: '8 + 8 im Binär (1000 + 1000) = ?', correctAnswer: '10000', explanation: '8+8=16 → 10000.' },
            { funFact: 'Ordnung ist wichtig in Listen.', question: 'In [2,4,1] ist die kleinste Zahl ...?', correctAnswer: '1' },
            { funFact: 'Wir zählen ab 0 (Index).', question: 'Erster Index in Arrays?', correctAnswer: '0' },
            { funFact: 'true/false sind Wahrheitswerte.', question: 'Ist 3 > 2 wahr oder falsch?', correctAnswer: 'wahr' },
            { funFact: 'Das Binärsystem ist Basis 2.', question: 'Wie heißt unser Alltags-System?', correctAnswer: 'Dezimalsystem' },
            { funFact: 'ASCII kodiert Zeichen.', question: 'Welches Zeichen ist eine Ziffer? A/7/?', correctAnswer: '7' },
            { funFact: 'Summe einer Liste kann man falten.', question: 'Summe von 1,2,3,4?', correctAnswer: '10' },
            { funFact: 'Ein Schritt nach rechts verdoppelt binär.', question: '4 binär (100). 100 << 1 = ?', correctAnswer: '1000' },
            { funFact: 'Dateigrößen wachsen mit 2er‑Potenzen.', question: '2 KB sind wie viele Bytes?', correctAnswer: '2048' },
            { funFact: 'Farben in RGB sind 3 Zahlen.', question: 'Wie viele Kanäle hat RGB?', correctAnswer: '3' },
            { funFact: '1 und 0 bilden Logik.', question: 'AND: 1 AND 0 = ?', correctAnswer: '0' },
            { funFact: 'ODER (OR) gibt 1, wenn eins 1 ist.', question: 'OR: 1 OR 0 = ?', correctAnswer: '1' },
            { funFact: 'NOT kehrt um.', question: 'NOT 0 = ?', correctAnswer: '1' },
            { funFact: 'Datei .mp3 ist Audio.', question: '.mp3 ist ...?', correctAnswer: 'Audio' },
            { funFact: 'Cursor zeigt, wo man tippt.', question: 'Wie heißt der blinkende Strich?', correctAnswer: 'Cursor' },
            { funFact: 'Eine App ist ein Programm.', question: 'Programm, das man nutzt: ...?', correctAnswer: 'App' },
            { funFact: 'Eine Maus steuert Zeiger.', question: 'Eingabegerät: Maus oder Lautsprecher?', correctAnswer: 'Maus' }
          ];
          const curatedAnimals = [
            { funFact: 'Katzen haben scharfe Krallen.', question: 'Wie viele Beine hat eine Katze?', correctAnswer: '4' },
            { funFact: 'Vögel haben Federn.', question: 'Wie viele Flügel hat ein Vogel?', correctAnswer: '2' },
            { funFact: 'Fische atmen mit Kiemen.', question: 'Wie nennt man die „Lungen“ der Fische?', correctAnswer: 'Kiemen' },
            { funFact: 'Spinnen sind keine Insekten.', question: 'Wie viele Beine hat eine Spinne?', correctAnswer: '8' },
            { funFact: 'Elefanten haben Rüssel.', question: 'Wie viele Stoßzähne hat ein Elefant meistens?', correctAnswer: '2' },
            { funFact: 'Hunde haben feine Nasen.', question: 'Zähle: 2 Hunde + 2 Katzen = Beine?', correctAnswer: '16', explanation: '4 Tiere × 4 Beine = 16.' },
            { funFact: 'Bienen machen Honig.', question: 'Wie viele Beine hat eine Biene?', correctAnswer: '6' },
            { funFact: 'Fledermäuse fliegen nachts.', question: 'Sind Fledermäuse Vögel? ja/nein', correctAnswer: 'nein' },
            { funFact: 'Pinguine sind gute Schwimmer.', question: 'Können Pinguine fliegen? ja/nein', correctAnswer: 'nein' },
            { funFact: 'Kängurus springen weit.', question: 'Wie viele Hinterbeine nutzen Kängurus zum Springen?', correctAnswer: '2' },
            { funFact: 'Schnecken tragen Häuser.', question: 'Wie viele Beine hat eine Schnecke?', correctAnswer: '0' },
            { funFact: 'Frösche können hüpfen.', question: 'Wieviel ist 3 Frösche + 3 Frösche?', correctAnswer: '6' },
            { funFact: 'Ameisen sind stark.', question: 'Beine von 3 Ameisen?', correctAnswer: '18' },
            { funFact: 'Löwen leben im Rudel.', question: 'Wie viele Mähnen hat ein weiblicher Löwe?', correctAnswer: '0' },
            { funFact: 'Eulen sind nachtaktiv.', question: 'Wie viele Augen hat eine Eule?', correctAnswer: '2' },
            { funFact: 'Krabben laufen seitwärts.', question: 'Wie viele Scheren haben die meisten Krabben?', correctAnswer: '2' },
            { funFact: 'Giraffen sind sehr hoch.', question: 'Länger: Hals oder Beine?', correctAnswer: 'Hals' },
            { funFact: 'Wale sind Säugetiere.', question: 'Atmen Wale Luft? ja/nein', correctAnswer: 'ja' },
            { funFact: 'Delfine sind verspielt.', question: 'Wie nennt man ihre Rückenflosse?', correctAnswer: 'Finne' },
            { funFact: 'Tintenfische spritzen Tinte.', question: 'Wie viele Arme hat ein Oktopus?', correctAnswer: '8' },
            { funFact: 'Kröten und Frösche sind Amphibien.', question: 'Leben Amphibien auch an Land? ja/nein', correctAnswer: 'ja' },
            { funFact: 'Pferde sind Herdentiere.', question: 'Wie viele Beine hat ein Fohlen?', correctAnswer: '4' },
            { funFact: 'Schmetterlinge schmecken mit Füßen.', question: 'Wie viele Flügel hat ein Schmetterling?', correctAnswer: '4' }
          ];
          const buildThemedDoor = (day: number) => {
            const n1 = (day % 7) + 3;
            const n2 = (day % 5) + 2;
            switch (themeName) {
              case 'Mathe Basics': {
                const item = curatedMath[day - 1];
                return item || curatedMath[(day - 1) % curatedMath.length];
              }
              case 'Informatik': {
                const item = curatedCS[day - 1];
                return item || curatedCS[(day - 1) % curatedCS.length];
              }
              case 'Tiere': {
                const item = curatedAnimals[day - 1];
                return item || curatedAnimals[(day - 1) % curatedAnimals.length];
              }
              case 'Weltraum': {
                const stars = 10 + day;
                const minus = n2;
                return {
                  funFact: 'Im Weltraum gibt es unzählige Sterne.',
                  question: `Du siehst ${stars} Sterne und eine Wolke verdeckt ${minus}. Wie viele siehst du noch?`,
                  correctAnswer: String(stars - minus),
                  explanation: `${stars} − ${minus} = ${stars - minus}.`
                };
              }
              case 'Natur & Umwelt': {
                const bottles = 5 + n1;
                const per = 3;
                const trips = Math.ceil(bottles / per);
                return {
                  funFact: 'Recycling schont die Umwelt.',
                  question: `Du sammelst ${bottles} Flaschen. In eine Tüte passen ${per}. Wie viele Tüten brauchst du mindestens?`,
                  correctAnswer: String(trips),
                  explanation: `${bottles} ÷ ${per} = ${(bottles / per).toFixed(2)} → mindestens ${trips} Tüten.`
                };
              }
              case 'Weihnachten': {
                const gifts = 12 + n1;
                const kids = 3 + (day % 4);
                const each = Math.floor(gifts / kids);
                return {
                  funFact: 'Teilen macht Freude!',
                  question: `${gifts} Geschenke werden gerecht auf ${kids} Kinder verteilt. Wie viele bekommt jedes Kind (ohne Rest)?`,
                  correctAnswer: String(each),
                  explanation: `${gifts} ÷ ${kids} = ${each} (Rest wird später verteilt).`
                };
              }
              case 'Spiele & Rätsel': {
                const a = n1 + day % 6;
                const b = n2 + 1;
                const sum = a + b;
                return {
                  funFact: 'Zahlenrätsel trainieren das Gehirn.',
                  question: `Denke dir zwei Zahlen: ${a} und ${b}. Welche Summe ergibt sich?`,
                  correctAnswer: String(sum),
                  explanation: `${a} + ${b} = ${sum}.`
                };
              }
              case 'Geografie': {
                const buses = 2 + (day % 3);
                const seats = 20;
                const total = buses * seats;
                return {
                  funFact: 'Städte sind über Straßen und Busse verbunden.',
                  question: `${buses} Busse fahren in eine Stadt. Jeder Bus hat ${seats} Plätze. Wie viele Plätze sind es insgesamt?`,
                  correctAnswer: String(total),
                  explanation: `${buses} × ${seats} = ${total} Plätze.`
                };
              }
              case 'Musik & Rhythmus': {
                const beats = 4 + (day % 4);
                const bars = 3 + (day % 3);
                const total = beats * bars;
                return {
                  funFact: 'Takte bestehen aus gleichmäßigen Schlägen.',
                  question: `Ein Lied hat ${bars} Takte mit je ${beats} Schlägen. Wie viele Schläge sind das insgesamt?`,
                  correctAnswer: String(total),
                  explanation: `${bars} × ${beats} = ${total} Schläge.`
                };
              }
              case 'Essen & Küche': {
                const apples = 5 + n2;
                const people = 2 + (day % 5);
                const per = Math.floor(apples / people);
                return {
                  funFact: 'Beim Kochen wird viel gerechnet.',
                  question: `Du hast ${apples} Äpfel und ${people} Personen. Wie viele ganze Äpfel bekommt jede Person (ohne Rest)?`,
                  correctAnswer: String(per),
                  explanation: `${apples} ÷ ${people} = ${per} pro Person (Rest bleibt übrig).`
                };
              }
              default: {
                return {
                  funFact: base[day - 1].funFact,
                  question: base[day - 1].question,
                  correctAnswer: base[day - 1].correctAnswer,
                  explanation: base[day - 1].explanation || undefined
                };
              }
            }
          };
          await prisma.$transaction(
            base.map((d) => {
              const themed = buildThemedDoor(d.day);
              return prisma.adventCalendarDoor.upsert({
                where: { day_year: { day: d.day, year } },
                update: {
                  funFact: expectedPrefix + (themed.funFact.startsWith(expectedPrefix) ? themed.funFact.slice(expectedPrefix.length) : themed.funFact.replace(/^.*?:\s*/, '')),
                  question: themed.question,
                  correctAnswer: themed.correctAnswer,
                  explanation: themed.explanation || null
                },
                create: {
                  day: d.day,
                  year,
                  funFact: expectedPrefix + themed.funFact,
                  question: themed.question,
                  correctAnswer: themed.correctAnswer,
                  explanation: themed.explanation || null
                }
              });
            })
          );
          // Nach Korrektur neu laden
          const refreshed = await prisma.adventCalendarDoor.findMany({
            where: { year },
            orderBy: { day: 'asc' },
            include: {
              submissions: studentId ? {
                where: { studentId },
                select: { id: true, answer: true, isCorrect: true, submittedAt: true }
              } : false
            }
          });
          const fixed = refreshed.map(door => {
            const isOpenable2 = (simulationMode || isDecember) && door.day <= maxOpenableDay;
            const hasSubmission2 = door.submissions && door.submissions.length > 0;
            return {
              ...door,
              isOpenable: isOpenable2,
              isOpened: hasSubmission2,
              hasSubmission: hasSubmission2,
              mySubmission: hasSubmission2 ? door.submissions![0] : null,
              submissions: undefined
            };
          });
          return res.json(fixed);
        }
      }
    }

    res.json(doorsWithStatus);
  } catch (error: any) {
    console.error('Fehler beim Abrufen der Türchen:', error);
    res.status(500).json({ 
      error: 'Interner Serverfehler',
      message: error?.message || 'Unbekannter Fehler'
    });
  }
};

// Leaderboard: Korrekte Antworten pro Schüler (Jahres-weit)
export const getLeaderboard = async (req: Request, res: Response) => {
  try {
    const rawYear = parseInt(req.query.year as string) || new Date().getFullYear();
    const theme = (req.query.theme as string) || (req.headers['x-advent-theme'] as string) || '';
    const themes = [
      'Mathe Basics','Informatik','Tiere','Weltraum','Natur & Umwelt',
      'Weihnachten','Spiele & Rätsel','Geografie','Musik & Rhythmus','Essen & Küche'
    ];
    const idx = themes.indexOf(theme);
    const themeIndex = theme ? (idx >= 0 ? idx : -1) : -1;
    const yearParam = themeIndex >= 0 ? rawYear * 100 + (themeIndex + 1) : rawYear;
    // Hole alle Einsendungen für Türen eines Jahres inkl. Student
    const submissions = await prisma.adventCalendarSubmission.findMany({
      where: {
        door: { year: yearParam }
      },
      select: {
        isCorrect: true,
        submittedAt: true,
        studentId: true,
        student: {
          select: { id: true, name: true, avatarEmoji: true }
        }
      }
    });

    const studentIdToStats: Record<string, {
      studentId: string;
      studentName: string;
      avatarEmoji: string | null;
      totalSubmissions: number;
      correctSubmissions: number;
      lastSubmissionAt?: Date;
    }> = {};

    for (const s of submissions) {
      const key = s.studentId;
      if (!studentIdToStats[key]) {
        studentIdToStats[key] = {
          studentId: key,
          studentName: s.student?.name || 'Unbekannt',
          avatarEmoji: s.student?.avatarEmoji || null,
          totalSubmissions: 0,
          correctSubmissions: 0,
          lastSubmissionAt: undefined
        };
      }
      const st = studentIdToStats[key];
      st.totalSubmissions += 1;
      if (s.isCorrect) st.correctSubmissions += 1;
      if (!st.lastSubmissionAt || new Date(s.submittedAt) > st.lastSubmissionAt) {
        st.lastSubmissionAt = new Date(s.submittedAt);
      }
    }

    const entries = Object.values(studentIdToStats);
    const maxCorrect = entries.reduce((m, e) => Math.max(m, e.correctSubmissions), 0);

    // Sortierung: korrekt desc, dann frühere letzte Abgabe (wer schneller war, vorne), dann Name
    entries.sort((a, b) => {
      if (b.correctSubmissions !== a.correctSubmissions) {
        return b.correctSubmissions - a.correctSubmissions;
      }
      const at = a.lastSubmissionAt ? a.lastSubmissionAt.getTime() : Number.MAX_SAFE_INTEGER;
      const bt = b.lastSubmissionAt ? b.lastSubmissionAt.getTime() : Number.MAX_SAFE_INTEGER;
      if (at !== bt) return at - bt;
      return a.studentName.localeCompare(b.studentName, 'de');
    });

    const me = req.user?.id;
    // Sichtbarkeit verbessern: Falls der aktuelle Nutzer keine Submission hat, füge ihn mit 0 Werten hinzu
    if (me && !entries.find(e => e.studentId === me)) {
      entries.unshift({
        studentId: me,
        studentName: (req.user as any)?.name || 'Du',
        avatarEmoji: '🎓',
        totalSubmissions: 0,
        correctSubmissions: 0,
        lastSubmissionAt: undefined
      });
    }
    const leaderboard = entries.map((e, idx) => ({
      rank: idx + 1,
      studentId: e.studentId,
      studentName: e.studentName,
      avatarEmoji: e.avatarEmoji || '🎓',
      totalSubmissions: e.totalSubmissions,
      correctSubmissions: e.correctSubmissions,
      progressPercent: maxCorrect > 0 ? Math.round((e.correctSubmissions / maxCorrect) * 100) : 0,
      isMe: me ? e.studentId === me : false
    }));

    res.json({
      year: yearParam,
      totalStudents: leaderboard.length,
      maxCorrect,
      leaderboard
    });
  } catch (error: any) {
    console.error('Fehler beim Abrufen des Leaderboards:', error);
    res.status(500).json({
      error: 'Interner Serverfehler',
      message: error?.message || 'Unbekannter Fehler'
    });
  }
};

// Einzelnes Türchen abrufen (mit Fun Fact und Frage)
export const getDoor = async (req: Request, res: Response) => {
  try {
    const { doorId } = req.params;
    const studentId = req.user?.id || null;

    const door = await prisma.adventCalendarDoor.findUnique({
      where: { id: doorId },
      include: {
        submissions: studentId ? {
          where: { studentId },
          select: {
            id: true,
            answer: true,
            isCorrect: true,
            submittedAt: true
          }
        } : false
      }
    });

    if (!door) {
      return res.status(404).json({ error: 'Türchen nicht gefunden' });
    }

    // Falls es sich um ein Themenjahr handelt (yyyyTT mit TT in 1..10), prüfe und korrigiere das einzelne Türchen bei Abweichung
    const themeSuffix = door.year % 100;
    if (themeSuffix >= 1 && themeSuffix <= 10) {
      const themes = [
        'Mathe Basics','Informatik','Tiere','Weltraum','Natur & Umwelt',
        'Weihnachten','Spiele & Rätsel','Geografie','Musik & Rhythmus','Essen & Küche'
      ];
      const themeName = themes[themeSuffix - 1];
      const expectedPrefix = (() => {
        switch (themeName) {
          case 'Mathe Basics': return 'Mathe-Tipp: ';
          case 'Informatik': return 'Informatik-Fakt: ';
          case 'Tiere': return 'Tier-Fakt: ';
          case 'Weltraum': return 'Weltraum-Fakt: ';
          case 'Natur & Umwelt': return 'Natur-Fakt: ';
          case 'Weihnachten': return 'Weihnachts-Fakt: ';
          case 'Spiele & Rätsel': return 'Rätsel-Fakt: ';
          case 'Geografie': return 'Geo-Fakt: ';
          case 'Musik & Rhythmus': return 'Musik-Fakt: ';
          case 'Essen & Küche': return 'Küchen-Fakt: ';
          default: return '';
        }
      })();
      // Kuratierte Kurz-Checks
      const shortQuestions: Record<string, string[]> = {
        'Informatik': [
          'Schreibe 5 in Binär.',
          'Wie viele Werte kann 1 Byte darstellen?',
          'Sortieren: Was kommt zuerst? 8, 3, 5',
          'Welche Endung ist ein Bild? .png/.mp3/.txt',
          'Ein Schalter ist an (1). Ist er aus, ist das ...?',
          'Welche Ziffern hat Hex neben 0-9?',
          'Schreibe 2 im Binärsystem.',
          '8 + 8 im Binär (1000 + 1000) = ?',
          'In [2,4,1] ist die kleinste Zahl ...?',
          'Erster Index in Arrays?',
          'Ist 3 > 2 wahr oder falsch?',
          'Wie heißt unser Alltags-System?',
          'Welches Zeichen ist eine Ziffer? A/7/?',
          'Summe von 1,2,3,4?',
          '4 binär (100). 100 << 1 = ?',
          '2 KB sind wie viele Bytes?',
          'Wie viele Kanäle hat RGB?',
          'AND: 1 AND 0 = ?',
          'OR: 1 OR 0 = ?',
          'NOT 0 = ?',
          '.mp3 ist ...?',
          'Wie heißt der blinkende Strich?',
          'Programm, das man nutzt: ...?',
          'Eingabegerät: Maus oder Lautsprecher?'
        ],
        'Tiere': [
          'Wie viele Beine hat eine Katze?',
          'Wie viele Flügel hat ein Vogel?',
          'Wie nennt man die „Lungen“ der Fische?',
          'Wie viele Beine hat eine Spinne?',
          'Wie viele Stoßzähne hat ein Elefant meistens?',
          'Zähle: 2 Hunde + 2 Katzen = Beine?',
          'Wie viele Beine hat eine Biene?',
          'Sind Fledermäuse Vögel? ja/nein',
          'Können Pinguine fliegen? ja/nein',
          'Wie viele Hinterbeine nutzen Kängurus zum Springen?',
          'Wie viele Beine hat eine Schnecke?',
          'Wieviel ist 3 Frösche + 3 Frösche?',
          'Beine von 3 Ameisen?',
          'Wie viele Mähnen hat ein weiblicher Löwe?',
          'Wie viele Augen hat eine Eule?',
          'Wie viele Scheren haben die meisten Krabben?',
          'Länger: Hals oder Beine?',
          'Atmen Wale Luft? ja/nein',
          'Wie nennt man ihre Rückenflosse?',
          'Wie viele Arme hat ein Oktopus?',
          'Leben Amphibien auch an Land? ja/nein',
          'Wie viele Beine hat ein Fohlen?',
          'Wie viele Flügel hat ein Schmetterling?',
        ],
        'Mathe Basics': [
          'Rechne: 9 + 6 = ?',
          'Rechne: 27 − 8 = ?',
          'Rechne: 4 × 6 = ?',
          '20 Bonbons auf 5 Kinder. Wieviele pro Kind?',
          'Verdopple 13.',
          'Die Hälfte von 18 ist ...?',
          'Runde 47 auf den nächsten Zehner.',
          'Wie viele Eier sind 2 Dutzend?',
          'Wie viele Minuten sind 2½ Stunden?',
          '8 cm × 3 cm = Fläche?',
          'Ein Quadrat hat Seite 5 cm. Umfang?',
          'Rechne: 100 − 35 = ?',
          'Rechne: 7 × 10 = ?',
          'Was ist 3 × 8?',
          'Zerlege 1 204 in H/Z/E.',
          '120 ÷ 10 = ?',
          'Wie viel ist 1/2 von 18?',
          '1/3 von 15 = ?',
          'Vierfach von 7 = ?',
          'Rechne: 36 − 19 = ?',
          '3 × 12 = ?',
          '45 + 0 = ?',
          'Wieviel ist 9 + 6?',
          '24 ÷ 6 = ?',
        ]
      };
      const expectedQ = shortQuestions[themeName]?.[door.day - 1];
      const wrongPrefix = expectedPrefix && (typeof door.funFact === 'string') && !door.funFact.startsWith(expectedPrefix);
      const wrongQuestion = expectedQ && door.question !== expectedQ;
      if (wrongPrefix || wrongQuestion) {
        // Repariere durch Re-Gen der Inhalte dieses Tages via getDoors-Logik (einfacherer Weg: delegiere an thematisches Jahr Regeneration für einen Tag)
        // Zur Einfachheit aktualisieren wir nur Prefix, wenn expectedQ unbekannt ist.
        const fixedFunFact = expectedPrefix
          ? expectedPrefix + String(door.funFact || '').replace(/^.*?:\s*/, '')
          : door.funFact;
        await prisma.adventCalendarDoor.update({
          where: { id: door.id },
          data: {
            funFact: fixedFunFact || undefined,
            question: expectedQ || door.question
          }
        });
        // neu laden
        const reloaded = await prisma.adventCalendarDoor.findUnique({
          where: { id: doorId },
          include: {
            submissions: studentId ? {
              where: { studentId },
              select: { id: true, answer: true, isCorrect: true, submittedAt: true }
            } : false
          }
        });
        if (reloaded) {
          const hasSubmission2 = reloaded.submissions && reloaded.submissions.length > 0;
          return res.json({
            ...reloaded,
            mySubmission: hasSubmission2 ? reloaded.submissions![0] : null,
            submissions: undefined
          });
        }
      }
    }

    // Prüfe, ob das Türchen heute geöffnet werden kann
    // SIMULATION: Alle Türchen bis Tag 24 sind öffnenbar
    const currentDate = getCurrentDateCET();
    const isDecember = currentDate.month === 12;
    const today = currentDate.day;
    const simulationMode = !isDecember;
    const maxOpenableDay = simulationMode ? 24 : today;

    if ((!simulationMode && !isDecember) || door.day > maxOpenableDay) {
      return res.status(403).json({ 
        error: 'Dieses Türchen kann noch nicht geöffnet werden',
        day: door.day,
        today,
        maxOpenableDay
      });
    }

    const hasSubmission = door.submissions && door.submissions.length > 0;
    const mySubmission = hasSubmission ? door.submissions[0] : null;

    res.json({
      ...door,
      mySubmission,
      submissions: undefined
    });
  } catch (error: any) {
    console.error('Fehler beim Abrufen des Türchens:', error);
    res.status(500).json({ 
      error: 'Interner Serverfehler',
      message: error?.message || 'Unbekannter Fehler'
    });
  }
};

// Antwort einreichen
export const submitAnswer = async (req: Request, res: Response) => {
  try {
    const { doorId } = req.params;
    const { answer } = req.body;
    const studentId = req.user?.id;

    if (!studentId) {
      return res.status(401).json({ error: 'Nicht authentifiziert. Bitte melden Sie sich an.' });
    }

    if (!answer || answer.trim() === '') {
      return res.status(400).json({ error: 'Antwort ist erforderlich' });
    }

    // Hole das Türchen
    const door = await prisma.adventCalendarDoor.findUnique({
      where: { id: doorId }
    });

    if (!door) {
      return res.status(404).json({ error: 'Türchen nicht gefunden' });
    }

    // Prüfe, ob das Türchen heute geöffnet werden kann
    // SIMULATION: Alle Türchen bis Tag 24 sind öffnenbar
    const currentDate = getCurrentDateCET();
    const isDecember = currentDate.month === 12;
    const today = currentDate.day;
    const simulationMode = !isDecember;
    const maxOpenableDay = simulationMode ? 24 : today;

    if ((!simulationMode && !isDecember) || door.day > maxOpenableDay) {
      return res.status(403).json({ 
        error: 'Dieses Türchen kann noch nicht geöffnet werden'
      });
    }

    // Prüfe, ob bereits eine Antwort eingereicht wurde
    const existingSubmission = await prisma.adventCalendarSubmission.findUnique({
      where: {
        doorId_studentId: {
          doorId,
          studentId
        }
      }
    });

    if (existingSubmission) {
      return res.status(400).json({ error: 'Du hast bereits eine Antwort eingereicht' });
    }

    // Normalisiere die Antworten für Vergleich (case-insensitive, trim)
    const normalizedAnswer = answer.trim().toLowerCase();
    const normalizedCorrect = door.correctAnswer.trim().toLowerCase();
    const isCorrect = normalizedAnswer === normalizedCorrect;

    // Erstelle die Submission
    const submission = await prisma.adventCalendarSubmission.create({
      data: {
        doorId,
        studentId,
        answer: answer.trim(),
        isCorrect
      },
      include: {
        student: {
          select: {
            id: true,
            name: true,
            avatarEmoji: true
          }
        }
      }
    });

    res.status(201).json(submission);
  } catch (error: any) {
    console.error('Fehler beim Einreichen der Antwort:', error);
    res.status(500).json({ 
      error: 'Interner Serverfehler',
      message: error?.message || 'Unbekannter Fehler'
    });
  }
};

// Ergebnisse anderer Schüler für ein Türchen abrufen (kooperatives Spiel)
export const getDoorResults = async (req: Request, res: Response) => {
  try {
    const { doorId } = req.params;
    const studentId = req.user?.id || null;

    // Hole das Türchen
    const door = await prisma.adventCalendarDoor.findUnique({
      where: { id: doorId }
    });

    if (!door) {
      return res.status(404).json({ error: 'Türchen nicht gefunden' });
    }

    // Prüfe, ob das Türchen heute geöffnet werden kann
    // SIMULATION: Alle Türchen bis Tag 24 sind öffnenbar
    const currentDate = getCurrentDateCET();
    const isDecember = currentDate.month === 12;
    const today = currentDate.day;
    const simulationMode = !isDecember;
    const maxOpenableDay = simulationMode ? 24 : today;

    if ((!simulationMode && !isDecember) || door.day > maxOpenableDay) {
      return res.status(403).json({ 
        error: 'Dieses Türchen kann noch nicht geöffnet werden'
      });
    }

    // Hole alle Submissions für dieses Türchen
    const submissions = await prisma.adventCalendarSubmission.findMany({
      where: { doorId },
      include: {
        student: {
          select: {
            id: true,
            name: true,
            avatarEmoji: true
          }
        }
      },
      orderBy: { submittedAt: 'asc' }
    });

    // Statistiken berechnen
    const totalSubmissions = submissions.length;
    const correctSubmissions = submissions.filter(s => s.isCorrect).length;
    const correctPercentage = totalSubmissions > 0 
      ? Math.round((correctSubmissions / totalSubmissions) * 100) 
      : 0;

    // Eigene Submission markieren
    const results = submissions.map(submission => ({
      id: submission.id,
      studentName: submission.student.name,
      avatarEmoji: submission.student.avatarEmoji || '👤',
      isCorrect: submission.isCorrect,
      submittedAt: submission.submittedAt,
      isMine: submission.studentId === studentId,
      // Zeige die Antwort nur, wenn es die eigene ist oder wenn sie korrekt ist
      answer: submission.studentId === studentId || submission.isCorrect 
        ? submission.answer 
        : '❓'
    }));

    res.json({
      door: {
        id: door.id,
        day: door.day,
        funFact: door.funFact,
        question: door.question,
        explanation: door.explanation
      },
      statistics: {
        totalSubmissions,
        correctSubmissions,
        incorrectSubmissions: totalSubmissions - correctSubmissions,
        correctPercentage
      },
      results
    });
  } catch (error: any) {
    console.error('Fehler beim Abrufen der Ergebnisse:', error);
    res.status(500).json({ 
      error: 'Interner Serverfehler',
      message: error?.message || 'Unbekannter Fehler'
    });
  }
};

// Türchen erstellen (Admin/Teacher Funktion)
export const createDoor = async (req: Request, res: Response) => {
  try {
    const { day, year, funFact, question, correctAnswer, explanation } = req.body;

    if (!day || !year || !funFact || !question || !correctAnswer) {
      return res.status(400).json({ 
        error: 'day, year, funFact, question und correctAnswer sind erforderlich' 
      });
    }

    if (day < 1 || day > 24) {
      return res.status(400).json({ error: 'day muss zwischen 1 und 24 liegen' });
    }

    const door = await prisma.adventCalendarDoor.create({
      data: {
        day,
        year,
        funFact,
        question,
        correctAnswer,
        explanation
      }
    });

    res.status(201).json(door);
  } catch (error: any) {
    if (error.code === 'P2002') {
      return res.status(400).json({ 
        error: 'Ein Türchen für diesen Tag und Jahr existiert bereits' 
      });
    }
    console.error('Fehler beim Erstellen des Türchens:', error);
    res.status(500).json({ error: 'Interner Serverfehler' });
  }
};

// Alle Türchen für ein Jahr erstellen (Bulk Create)
export const createDoorsForYear = async (req: Request, res: Response) => {
  try {
    const { year, doors } = req.body;

    if (!year || !doors || !Array.isArray(doors)) {
      return res.status(400).json({ 
        error: 'year und doors (Array) sind erforderlich' 
      });
    }

    if (doors.length !== 24) {
      return res.status(400).json({ 
        error: 'Es müssen genau 24 Türchen erstellt werden' 
      });
    }

    // Validiere alle Türchen
    for (let i = 0; i < doors.length; i++) {
      const door = doors[i];
      if (!door.day || !door.funFact || !door.question || !door.correctAnswer) {
        return res.status(400).json({ 
          error: `Türchen ${i + 1} ist unvollständig` 
        });
      }
      if (door.day < 1 || door.day > 24) {
        return res.status(400).json({ 
          error: `Türchen ${i + 1} hat einen ungültigen Tag (muss 1-24 sein)` 
        });
      }
    }

    // Erstelle alle Türchen in einer Transaktion
    const createdDoors = await prisma.$transaction(
      doors.map(door =>
        prisma.adventCalendarDoor.upsert({
          where: {
            day_year: {
              day: door.day,
              year: year
            }
          },
          update: {
            funFact: door.funFact,
            question: door.question,
            correctAnswer: door.correctAnswer,
            explanation: door.explanation || null
          },
          create: {
            day: door.day,
            year,
            funFact: door.funFact,
            question: door.question,
            correctAnswer: door.correctAnswer,
            explanation: door.explanation || null
          }
        })
      )
    );

    res.status(201).json({ 
      message: `${createdDoors.length} Türchen erfolgreich erstellt/aktualisiert`,
      doors: createdDoors 
    });
  } catch (error: any) {
    console.error('Fehler beim Erstellen der Türchen:', error);
    res.status(500).json({ 
      error: 'Interner Serverfehler',
      message: error?.message || 'Unbekannter Fehler'
    });
  }
};

// Admin: Themenjahr-Inhalte gezielt korrigieren/überschreiben (ohne Submissions zu löschen)
export const fixThemeYear = async (req: Request, res: Response) => {
  try {
    const rawYear = parseInt(req.body.year as string) || new Date().getFullYear();
    const theme = String(req.body.theme || '');
    const themes = [
      'Mathe Basics','Informatik','Tiere','Weltraum','Natur & Umwelt',
      'Weihnachten','Spiele & Rätsel','Geografie','Musik & Rhythmus','Essen & Küche'
    ];
    const idx = themes.indexOf(theme);
    if (idx < 0) {
      return res.status(400).json({ error: 'Unbekanntes Thema' });
    }
    const yearParam = rawYear * 100 + (idx + 1);

    // Basisjahr bestimmen (neueste vollständige 24)
    const latestYearWith24 = await prisma.adventCalendarDoor.groupBy({
      by: ['year'],
      _count: { year: true },
      orderBy: { year: 'desc' },
    }).then(groups => groups.find(g => g._count.year === 24));

    const latestYear = latestYearWith24
      ? latestYearWith24.year
      : (await prisma.adventCalendarDoor.findFirst({
          orderBy: { year: 'desc' },
          select: { year: true }
        }))?.year;

    const base = latestYear
      ? await prisma.adventCalendarDoor.findMany({
          where: { year: latestYear },
          orderBy: { day: 'asc' }
        })
      : [];

    if (base.length !== 24) {
      return res.status(400).json({ error: 'Kein vollständiges Basisjahr mit 24 Türchen gefunden' });
    }

    const prefix = (fun: string) => {
      switch (theme) {
        case 'Mathe Basics': return `Mathe-Tipp: ${fun}`;
        case 'Informatik': return `Informatik-Fakt: ${fun}`;
        case 'Tiere': return `Tier-Fakt: ${fun}`;
        case 'Weltraum': return `Weltraum-Fakt: ${fun}`;
        case 'Natur & Umwelt': return `Natur-Fakt: ${fun}`;
        case 'Weihnachten': return `Weihnachts-Fakt: ${fun}`;
        case 'Spiele & Rätsel': return `Rätsel-Fakt: ${fun}`;
        case 'Geografie': return `Geo-Fakt: ${fun}`;
        case 'Musik & Rhythmus': return `Musik-Fakt: ${fun}`;
        case 'Essen & Küche': return `Küchen-Fakt: ${fun}`;
        default: return fun;
      }
    };

    // Kuratierte Sets wiederverwenden: extrahiere Generator aus getDoors
    const curatedMath = [
      { funFact: 'Zahlen kann man auf viele Arten zerlegen.', question: 'Rechne: 9 + 6 = ?', correctAnswer: '15', explanation: '9 + 6 = 15.' },
      { funFact: 'Zehner und Einer helfen beim Kopfrechnen.', question: 'Rechne: 27 − 8 = ?', correctAnswer: '19', explanation: '27 − 8 = 19.' },
      { funFact: 'Malnehmen ist wiederholtes Plus.', question: 'Rechne: 4 × 6 = ?', correctAnswer: '24', explanation: '4 mal 6 = 24.' },
      { funFact: 'Teilen ist gerechtes Aufteilen.', question: '20 Bonbons auf 5 Kinder. Wieviele pro Kind?', correctAnswer: '4', explanation: '20 ÷ 5 = 4.' },
      { funFact: 'Verdoppeln ist oft leichter als Malnehmen.', question: 'Verdopple 13.', correctAnswer: '26' },
      { funFact: 'Hälfte ist das Gegenteil von Verdoppeln.', question: 'Die Hälfte von 18 ist ...?', correctAnswer: '9' },
      { funFact: 'Runden hilft beim Überschlagen.', question: 'Runde 47 auf den nächsten Zehner.', correctAnswer: '50' },
      { funFact: 'Ein Dutzend sind 12 Stück.', question: 'Wie viele Eier sind 2 Dutzend?', correctAnswer: '24' },
      { funFact: '1 Stunde hat 60 Minuten.', question: 'Wie viele Minuten sind 2½ Stunden?', correctAnswer: '150', explanation: '2,5 × 60 = 150.' },
      { funFact: 'Rechtecke: Fläche = Länge × Breite.', question: '8 cm × 3 cm = Fläche?', correctAnswer: '24', explanation: '8 × 3 = 24 cm².' },
      { funFact: 'Perimeter ist der Umfang.', question: 'Ein Quadrat hat Seite 5 cm. Umfang?', correctAnswer: '20', explanation: '4 × 5 = 20 cm.' },
      { funFact: 'Zahlengeraden helfen beim Minus.', question: 'Rechne: 100 − 35 = ?', correctAnswer: '65' },
      { funFact: 'Malnehmen mit 10 endet auf 0.', question: 'Rechne: 7 × 10 = ?', correctAnswer: '70' },
      { funFact: '3 × 4 = 12 ist ein Klassiker.', question: 'Was ist 3 × 8?', correctAnswer: '24' },
      { funFact: 'Tausender, Hunderter, Zehner, Einer.', question: 'Zerlege 1 204 in H/Z/E.', correctAnswer: '1204', explanation: '1T 2H 0Z 4E → 1204.' },
      { funFact: 'Geteilt durch 10 verschiebt die Stelle.', question: '120 ÷ 10 = ?', correctAnswer: '12' },
      { funFact: 'Brüche: 1/2 ist die Hälfte.', question: 'Wie viel ist 1/2 von 18?', correctAnswer: '9' },
      { funFact: 'Drittel: 1/3 von 15.', question: '1/3 von 15 = ?', correctAnswer: '5' },
      { funFact: 'Vierfach heißt ×4.', question: 'Vierfach von 7 = ?', correctAnswer: '28' },
      { funFact: 'Plus und Minus sind Gegensätze.', question: 'Rechne: 36 − 19 = ?', correctAnswer: '17' },
      { funFact: '12 + 12 + 12 ist 3 × 12.', question: '3 × 12 = ?', correctAnswer: '36' },
      { funFact: 'Für 0 gilt: a + 0 = a.', question: '45 + 0 = ?', correctAnswer: '45' },
      { funFact: 'Kommutativ: 6 + 9 = 9 + 6.', question: 'Wieviel ist 9 + 6?', correctAnswer: '15' },
      { funFact: 'Verteile 24 fair auf 6.', question: '24 ÷ 6 = ?', correctAnswer: '4' }
    ];
    const curatedCS = [
      { funFact: 'Binärzahlen nutzen nur 0 und 1.', question: 'Schreibe 5 in Binär.', correctAnswer: '101', explanation: '4+1=5 → 101.' },
      { funFact: 'Ein Byte hat 8 Bits.', question: 'Wie viele Werte kann 1 Byte darstellen?', correctAnswer: '256', explanation: '2^8=256.' },
      { funFact: 'Algorithmen sind Rezepte.', question: 'Sortieren: Was kommt zuerst? 8, 3, 5', correctAnswer: '3', explanation: 'Kleinste Zahl zuerst.' },
      { funFact: 'Dateiendungen verraten den Typ.', question: 'Welche Endung ist ein Bild? .png/.mp3/.txt', correctAnswer: '.png' },
      { funFact: '0/1 stehen oft für Aus/Ein.', question: 'Ein Schalter ist an (1). Ist er aus, ist das ...?', correctAnswer: '0' },
      { funFact: 'Hex nutzt 0-9 A-F.', question: 'Welche Ziffern hat Hex neben 0-9?', correctAnswer: 'A B C D E F' },
      { funFact: 'Im Binär ist 2 → 10.', question: 'Schreibe 2 im Binärsystem.', correctAnswer: '10' },
      { funFact: 'Computer rechnen schnell, exakt.', question: '8 + 8 im Binär (1000 + 1000) = ?', correctAnswer: '10000', explanation: '8+8=16 → 10000.' },
      { funFact: 'Ordnung ist wichtig in Listen.', question: 'In [2,4,1] ist die kleinste Zahl ...?', correctAnswer: '1' },
      { funFact: 'Wir zählen ab 0 (Index).', question: 'Erster Index in Arrays?', correctAnswer: '0' },
      { funFact: 'true/false sind Wahrheitswerte.', question: 'Ist 3 > 2 wahr oder falsch?', correctAnswer: 'wahr' },
      { funFact: 'Das Binärsystem ist Basis 2.', question: 'Wie heißt unser Alltags-System?', correctAnswer: 'Dezimalsystem' },
      { funFact: 'ASCII kodiert Zeichen.', question: 'Welches Zeichen ist eine Ziffer? A/7/?', correctAnswer: '7' },
      { funFact: 'Summe einer Liste kann man falten.', question: 'Summe von 1,2,3,4?', correctAnswer: '10' },
      { funFact: 'Ein Schritt nach rechts verdoppelt binär.', question: '4 binär (100). 100 << 1 = ?', correctAnswer: '1000' },
      { funFact: 'Dateigrößen wachsen mit 2er‑Potenzen.', question: '2 KB sind wie viele Bytes?', correctAnswer: '2048' },
      { funFact: 'Farben in RGB sind 3 Zahlen.', question: 'Wie viele Kanäle hat RGB?', correctAnswer: '3' },
      { funFact: '1 und 0 bilden Logik.', question: 'AND: 1 AND 0 = ?', correctAnswer: '0' },
      { funFact: 'ODER (OR) gibt 1, wenn eins 1 ist.', question: 'OR: 1 OR 0 = ?', correctAnswer: '1' },
      { funFact: 'NOT kehrt um.', question: 'NOT 0 = ?', correctAnswer: '1' },
      { funFact: 'Datei .mp3 ist Audio.', question: '.mp3 ist ...?', correctAnswer: 'Audio' },
      { funFact: 'Cursor zeigt, wo man tippt.', question: 'Wie heißt der blinkende Strich?', correctAnswer: 'Cursor' },
      { funFact: 'Eine App ist ein Programm.', question: 'Programm, das man nutzt: ...?', correctAnswer: 'App' },
      { funFact: 'Eine Maus steuert Zeiger.', question: 'Eingabegerät: Maus oder Lautsprecher?', correctAnswer: 'Maus' }
    ];
    const curatedAnimals = [
      { funFact: 'Katzen haben scharfe Krallen.', question: 'Wie viele Beine hat eine Katze?', correctAnswer: '4' },
      { funFact: 'Vögel haben Federn.', question: 'Wie viele Flügel hat ein Vogel?', correctAnswer: '2' },
      { funFact: 'Fische atmen mit Kiemen.', question: 'Wie nennt man die „Lungen“ der Fische?', correctAnswer: 'Kiemen' },
      { funFact: 'Spinnen sind keine Insekten.', question: 'Wie viele Beine hat eine Spinne?', correctAnswer: '8' },
      { funFact: 'Elefanten haben Rüssel.', question: 'Wie viele Stoßzähne hat ein Elefant meistens?', correctAnswer: '2' },
      { funFact: 'Hunde haben feine Nasen.', question: 'Zähle: 2 Hunde + 2 Katzen = Beine?', correctAnswer: '16', explanation: '4 Tiere × 4 Beine = 16.' },
      { funFact: 'Bienen machen Honig.', question: 'Wie viele Beine hat eine Biene?', correctAnswer: '6' },
      { funFact: 'Fledermäuse fliegen nachts.', question: 'Sind Fledermäuse Vögel? ja/nein', correctAnswer: 'nein' },
      { funFact: 'Pinguine sind gute Schwimmer.', question: 'Können Pinguine fliegen? ja/nein', correctAnswer: 'nein' },
      { funFact: 'Kängurus springen weit.', question: 'Wie viele Hinterbeine nutzen Kängurus zum Springen?', correctAnswer: '2' },
      { funFact: 'Schnecken tragen Häuser.', question: 'Wie viele Beine hat eine Schnecke?', correctAnswer: '0' },
      { funFact: 'Frösche können hüpfen.', question: 'Wieviel ist 3 Frösche + 3 Frösche?', correctAnswer: '6' },
      { funFact: 'Ameisen sind stark.', question: 'Beine von 3 Ameisen?', correctAnswer: '18' },
      { funFact: 'Löwen leben im Rudel.', question: 'Wie viele Mähnen hat ein weiblicher Löwe?', correctAnswer: '0' },
      { funFact: 'Eulen sind nachtaktiv.', question: 'Wie viele Augen hat eine Eule?', correctAnswer: '2' },
      { funFact: 'Krabben laufen seitwärts.', question: 'Wie viele Scheren haben die meisten Krabben?', correctAnswer: '2' },
      { funFact: 'Giraffen sind sehr hoch.', question: 'Länger: Hals oder Beine?', correctAnswer: 'Hals' },
      { funFact: 'Wale sind Säugetiere.', question: 'Atmen Wale Luft? ja/nein', correctAnswer: 'ja' },
      { funFact: 'Delfine sind verspielt.', question: 'Wie nennt man ihre Rückenflosse?', correctAnswer: 'Finne' },
      { funFact: 'Tintenfische spritzen Tinte.', question: 'Wie viele Arme hat ein Oktopus?', correctAnswer: '8' },
      { funFact: 'Kröten und Frösche sind Amphibien.', question: 'Leben Amphibien auch an Land? ja/nein', correctAnswer: 'ja' },
      { funFact: 'Pferde sind Herdentiere.', question: 'Wie viele Beine hat ein Fohlen?', correctAnswer: '4' },
      { funFact: 'Schmetterlinge schmecken mit Füßen.', question: 'Wie viele Flügel hat ein Schmetterling?', correctAnswer: '4' }
    ];

    const buildThemedDoor = (day: number) => {
      const n1 = (day % 7) + 3;
      const n2 = (day % 5) + 2;
      switch (theme) {
        case 'Mathe Basics': {
          const item = curatedMath[day - 1];
          return item || curatedMath[(day - 1) % curatedMath.length];
        }
        case 'Informatik': {
          const item = curatedCS[day - 1];
          return item || curatedCS[(day - 1) % curatedCS.length];
        }
        case 'Tiere': {
          const item = curatedAnimals[day - 1];
          return item || curatedAnimals[(day - 1) % curatedAnimals.length];
        }
        case 'Weltraum': {
          const stars = 10 + day;
          const minus = n2;
          return {
            funFact: 'Im Weltraum gibt es unzählige Sterne.',
            question: `Du siehst ${stars} Sterne und eine Wolke verdeckt ${minus}. Wie viele siehst du noch?`,
            correctAnswer: String(stars - minus),
            explanation: `${stars} − ${minus} = ${stars - minus}.`
          };
        }
        case 'Natur & Umwelt': {
          const bottles = 5 + n1;
          const per = 3;
          const trips = Math.ceil(bottles / per);
          return {
            funFact: 'Recycling schont die Umwelt.',
            question: `Du sammelst ${bottles} Flaschen. In eine Tüte passen ${per}. Wie viele Tüten brauchst du mindestens?`,
            correctAnswer: String(trips),
            explanation: `${bottles} ÷ ${per} = ${(bottles / per).toFixed(2)} → mindestens ${trips} Tüten.`
          };
        }
        case 'Weihnachten': {
          const gifts = 12 + n1;
          const kids = 3 + (day % 4);
          const each = Math.floor(gifts / kids);
          return {
            funFact: 'Teilen macht Freude!',
            question: `${gifts} Geschenke werden gerecht auf ${kids} Kinder verteilt. Wie viele bekommt jedes Kind (ohne Rest)?`,
            correctAnswer: String(each),
            explanation: `${gifts} ÷ ${kids} = ${each} (Rest wird später verteilt).`
          };
        }
        case 'Spiele & Rätsel': {
          const a = n1 + day % 6;
          const b = n2 + 1;
          const sum = a + b;
          return {
            funFact: 'Zahlenrätsel trainieren das Gehirn.',
            question: `Denke dir zwei Zahlen: ${a} und ${b}. Welche Summe ergibt sich?`,
            correctAnswer: String(sum),
            explanation: `${a} + ${b} = ${sum}.`
          };
        }
        case 'Geografie': {
          const buses = 2 + (day % 3);
          const seats = 20;
          const total = buses * seats;
          return {
            funFact: 'Städte sind über Straßen und Busse verbunden.',
            question: `${buses} Busse fahren in eine Stadt. Jeder Bus hat ${seats} Plätze. Wie viele Plätze sind es insgesamt?`,
            correctAnswer: String(total),
            explanation: `${buses} × ${seats} = ${total} Plätze.`
          };
        }
        case 'Musik & Rhythmus': {
          const beats = 4 + (day % 4);
          const bars = 3 + (day % 3);
          const total = beats * bars;
          return {
            funFact: 'Takte bestehen aus gleichmäßigen Schlägen.',
            question: `Ein Lied hat ${bars} Takte mit je ${beats} Schlägen. Wie viele Schläge sind das insgesamt?`,
            correctAnswer: String(total),
            explanation: `${bars} × ${beats} = ${total} Schläge.`
          };
        }
        case 'Essen & Küche': {
          const apples = 5 + n2;
          const people = 2 + (day % 5);
          const per = Math.floor(apples / people);
          return {
            funFact: 'Beim Kochen wird viel gerechnet.',
            question: `Du hast ${apples} Äpfel und ${people} Personen. Wie viele ganze Äpfel bekommt jede Person (ohne Rest)?`,
            correctAnswer: String(per),
            explanation: `${apples} ÷ ${people} = ${per} pro Person (Rest bleibt übrig).`
          };
        }
        default: {
          return {
            funFact: base[day - 1].funFact,
            question: base[day - 1].question,
            correctAnswer: base[day - 1].correctAnswer,
            explanation: base[day - 1].explanation || undefined
          };
        }
      }
    };

    // Upsert 24 Einträge für das Themenjahr
    await prisma.$transaction(
      base.map((d) => {
        const themed = buildThemedDoor(d.day);
        return prisma.adventCalendarDoor.upsert({
          where: { day_year: { day: d.day, year: yearParam } },
          update: {
            funFact: prefix(themed.funFact),
            question: themed.question,
            correctAnswer: themed.correctAnswer,
            explanation: themed.explanation || null
          },
          create: {
            day: d.day,
            year: yearParam,
            funFact: prefix(themed.funFact),
            question: themed.question,
            correctAnswer: themed.correctAnswer,
            explanation: themed.explanation || null
          }
        });
      })
    );

    return res.json({ message: `Themenjahr ${yearParam} (${theme}) aktualisiert` });
  } catch (error: any) {
    console.error('Fehler bei fixThemeYear:', error);
    res.status(500).json({ error: 'Interner Serverfehler', message: error?.message || 'Unbekannter Fehler' });
  }
};

